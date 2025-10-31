const path = require('path');
const vscode = require('vscode');

/**
 * AutoApproveManager - Manages auto-approval logic for tool operations
 *
 * Provides granular control over which operations should be auto-approved
 * based on operation type, file locations, command patterns, and safety limits.
 */
class AutoApproveManager {
    constructor(settingsProvider) {
        this.settingsProvider = settingsProvider;

        // Track requests and costs per task
        this.taskMetrics = new Map(); // taskId -> { requestCount, totalCost }

        // Protected file patterns
        this.protectedPatterns = [
            '.env',
            '.env.*',
            'credentials.json',
            'credentials.yml',
            '*.key',
            '*.pem',
            '*.crt',
            '*.pfx',
            'id_rsa',
            'id_dsa',
            'id_ecdsa',
            'id_ed25519',
            'config/secrets',
            'secrets.*',
            'password.*'
        ];
    }

    /**
     * Initialize task metrics for a new task
     */
    initializeTask(taskId) {
        this.taskMetrics.set(taskId, {
            requestCount: 0,
            totalCost: 0,
            lastRequestTime: null
        });
    }

    /**
     * Clean up task metrics
     */
    cleanupTask(taskId) {
        this.taskMetrics.delete(taskId);
    }

    /**
     * Get task metrics
     */
    getTaskMetrics(taskId) {
        return this.taskMetrics.get(taskId) || { requestCount: 0, totalCost: 0, lastRequestTime: null };
    }

    /**
     * Increment request count for a task
     */
    incrementRequestCount(taskId, cost = 0) {
        const metrics = this.getTaskMetrics(taskId);
        metrics.requestCount++;
        metrics.totalCost += cost;
        metrics.lastRequestTime = Date.now();
        this.taskMetrics.set(taskId, metrics);
    }

    /**
     * Check if a file is protected (sensitive)
     */
    isProtectedFile(filePath) {
        const fileName = path.basename(filePath);
        const relativePath = filePath;

        return this.protectedPatterns.some(pattern => {
            // Convert glob pattern to regex
            const regexPattern = pattern
                .replace(/\./g, '\\.')
                .replace(/\*/g, '.*')
                .replace(/\?/g, '.');

            const regex = new RegExp(`^${regexPattern}$`, 'i');

            return regex.test(fileName) || relativePath.includes(pattern);
        });
    }

    /**
     * Check if a file is outside workspace
     */
    isOutsideWorkspace(filePath) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return true;
        }

        const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);

        return !workspaceFolders.some(folder => {
            const folderPath = folder.uri.fsPath;
            return absolutePath.startsWith(folderPath);
        });
    }

    /**
     * Check if a command matches a pattern (supports wildcards)
     */
    matchesCommandPattern(command, pattern) {
        // Convert glob pattern to regex
        const regexPattern = pattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars except *
            .replace(/\*/g, '.*'); // Convert * to .*

        const regex = new RegExp(`^${regexPattern}$`, 'i');
        return regex.test(command.trim());
    }

    /**
     * Check if a command is in the denied list
     */
    isCommandDenied(command) {
        const deniedCommands = this.settingsProvider.getAutoApproveDeniedCommands();
        return deniedCommands.some(pattern => this.matchesCommandPattern(command, pattern));
    }

    /**
     * Check if a command is in the allowed list
     */
    isCommandAllowed(command) {
        const allowedCommands = this.settingsProvider.getAutoApproveAllowedCommands();

        // If no allowlist is defined, all commands are potentially allowed
        if (!allowedCommands || allowedCommands.length === 0) {
            return true;
        }

        return allowedCommands.some(pattern => this.matchesCommandPattern(command, pattern));
    }

    /**
     * Check if request limits have been exceeded
     */
    hasExceededLimits(taskId) {
        const metrics = this.getTaskMetrics(taskId);
        const maxRequests = this.settingsProvider.getAutoApproveMaxRequests();
        const maxCost = this.settingsProvider.getAutoApproveMaxCost();

        // Check request limit (0 = unlimited)
        if (maxRequests > 0 && metrics.requestCount >= maxRequests) {
            return {
                exceeded: true,
                reason: `Max requests (${maxRequests}) exceeded`,
                metric: 'requests',
                value: metrics.requestCount
            };
        }

        // Check cost limit (0 = unlimited)
        if (maxCost > 0 && metrics.totalCost >= maxCost) {
            return {
                exceeded: true,
                reason: `Max cost ($${maxCost}) exceeded`,
                metric: 'cost',
                value: metrics.totalCost
            };
        }

        return { exceeded: false };
    }

    /**
     * Check if request delay has been satisfied
     */
    async checkRequestDelay(taskId) {
        const metrics = this.getTaskMetrics(taskId);
        const requestDelay = this.settingsProvider.getAutoApproveRequestDelay();

        if (requestDelay > 0 && metrics.lastRequestTime) {
            const elapsed = Date.now() - metrics.lastRequestTime;
            const delayMs = requestDelay * 1000;

            if (elapsed < delayMs) {
                const remainingMs = delayMs - elapsed;
                await new Promise(resolve => setTimeout(resolve, remainingMs));
            }
        }
    }

    /**
     * Main method to check if an operation should be auto-approved
     *
     * @param {Object} options - Operation details
     * @param {string} options.operation - Type of operation (read, write, execute, browser, mcp, etc.)
     * @param {string} options.filePath - File path (for read/write operations)
     * @param {string} options.command - Command to execute (for execute operations)
     * @param {string} options.taskId - Task ID for tracking metrics
     * @param {number} options.cost - Estimated cost of operation
     * @returns {Object} - { approved: boolean, reason: string }
     */
    async shouldAutoApprove(options) {
        const {
            operation,
            filePath,
            command,
            taskId,
            cost = 0
        } = options;

        // Check if auto-approve is globally enabled
        const enabled = this.settingsProvider.getAutoApproveEnabled();
        if (!enabled) {
            return { approved: false, reason: 'Auto-approve disabled' };
        }

        // Initialize task metrics if needed
        if (taskId && !this.taskMetrics.has(taskId)) {
            this.initializeTask(taskId);
        }

        // Check limits
        if (taskId) {
            const limitCheck = this.hasExceededLimits(taskId);
            if (limitCheck.exceeded) {
                return { approved: false, reason: limitCheck.reason, limitExceeded: true };
            }
        }

        // Check request delay
        if (taskId) {
            await this.checkRequestDelay(taskId);
        }

        // Check operation-specific approval
        let operationApproved = false;
        let reason = '';

        switch (operation) {
            case 'read':
            case 'read_file':
                if (filePath) {
                    const isOutside = this.isOutsideWorkspace(filePath);
                    if (isOutside) {
                        operationApproved = this.settingsProvider.getAutoApproveReadOnlyOutsideWorkspace();
                        reason = operationApproved ? 'Read outside workspace auto-approved' : 'Read outside workspace requires approval';
                    } else {
                        operationApproved = this.settingsProvider.getAutoApproveReadOnly();
                        reason = operationApproved ? 'Read operation auto-approved' : 'Read operation requires approval';
                    }
                }
                break;

            case 'write':
            case 'write_file':
            case 'create_file':
            case 'edit_file':
            case 'apply_diff':
                if (filePath) {
                    const isProtected = this.isProtectedFile(filePath);
                    const isOutside = this.isOutsideWorkspace(filePath);

                    if (isProtected) {
                        operationApproved = this.settingsProvider.getAutoApproveWriteProtected();
                        reason = operationApproved ? 'Protected file write auto-approved (risky!)' : 'Protected file requires manual approval';
                    } else if (isOutside) {
                        operationApproved = this.settingsProvider.getAutoApproveWriteOutsideWorkspace();
                        reason = operationApproved ? 'Write outside workspace auto-approved' : 'Write outside workspace requires approval';
                    } else {
                        operationApproved = this.settingsProvider.getAutoApproveWrite();
                        reason = operationApproved ? 'Write operation auto-approved' : 'Write operation requires approval';
                    }
                }
                break;

            case 'execute':
            case 'run_command':
                if (command) {
                    // Check denied list first (highest priority)
                    if (this.isCommandDenied(command)) {
                        operationApproved = false;
                        reason = 'Command is in denied list';
                        break;
                    }

                    // Check allowed list
                    if (!this.isCommandAllowed(command)) {
                        operationApproved = false;
                        reason = 'Command not in allowed list';
                        break;
                    }

                    // Check execute permission
                    operationApproved = this.settingsProvider.getAutoApproveExecute();
                    reason = operationApproved ? 'Command execution auto-approved' : 'Command execution requires approval';
                } else {
                    operationApproved = false;
                    reason = 'No command provided';
                }
                break;

            case 'browser':
            case 'browser_action':
                operationApproved = this.settingsProvider.getAutoApproveBrowser();
                reason = operationApproved ? 'Browser action auto-approved' : 'Browser action requires approval';
                break;

            case 'mcp':
            case 'use_mcp_tool':
            case 'access_mcp_resource':
                operationApproved = this.settingsProvider.getAutoApproveMcp();
                reason = operationApproved ? 'MCP operation auto-approved' : 'MCP operation requires approval';
                break;

            case 'mode_switch':
            case 'switch_mode':
                operationApproved = this.settingsProvider.getAutoApproveModeSwitch();
                reason = operationApproved ? 'Mode switch auto-approved' : 'Mode switch requires approval';
                break;

            case 'subtask':
            case 'new_task':
                operationApproved = this.settingsProvider.getAutoApproveSubtasks();
                reason = operationApproved ? 'Subtask creation auto-approved' : 'Subtask creation requires approval';
                break;

            case 'followup_question':
                operationApproved = this.settingsProvider.getAutoApproveFollowupQuestions();
                reason = operationApproved ? 'Followup question auto-approved' : 'Followup question requires approval';
                break;

            case 'update_todo_list':
                operationApproved = this.settingsProvider.getAutoApproveUpdateTodoList();
                reason = operationApproved ? 'Todo list update auto-approved' : 'Todo list update requires approval';
                break;

            case 'resubmit':
                operationApproved = this.settingsProvider.getAutoApproveResubmit();
                reason = operationApproved ? 'Resubmit auto-approved' : 'Resubmit requires approval';
                break;

            default:
                operationApproved = false;
                reason = `Unknown operation type: ${operation}`;
        }

        // If approved, increment metrics
        if (operationApproved && taskId) {
            this.incrementRequestCount(taskId, cost);
        }

        return {
            approved: operationApproved,
            reason,
            metrics: taskId ? this.getTaskMetrics(taskId) : null
        };
    }

    /**
     * Get auto-approve status summary for UI
     */
    getStatusSummary() {
        const enabled = this.settingsProvider.getAutoApproveEnabled();
        const settings = this.settingsProvider.getAllAutoApproveSettings();

        const enabledOperations = [];
        if (settings.readOnly) enabledOperations.push('read');
        if (settings.write) enabledOperations.push('write');
        if (settings.execute) enabledOperations.push('execute');
        if (settings.browser) enabledOperations.push('browser');
        if (settings.mcp) enabledOperations.push('mcp');
        if (settings.modeSwitch) enabledOperations.push('mode_switch');
        if (settings.subtasks) enabledOperations.push('subtasks');
        if (settings.updateTodoList) enabledOperations.push('todo');

        return {
            enabled,
            enabledOperations,
            hasAllowlist: settings.allowedCommands.length > 0,
            hasDenylist: settings.deniedCommands.length > 0,
            hasLimits: settings.maxRequests > 0 || settings.maxCost > 0,
            requestDelay: settings.requestDelay
        };
    }
}

module.exports = { AutoApproveManager };
