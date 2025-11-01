const vscode = require('vscode');

class SettingsProvider {
    constructor() {
        this.config = vscode.workspace.getConfiguration('oropendola');

        // Watch for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('oropendola')) {
                this.config = vscode.workspace.getConfiguration('oropendola');
                this.onConfigChanged();
            }
        });
    }

    onConfigChanged() {
        // Notify listeners or trigger actions based on settings changes
        console.log('Oropendola settings updated');
    }

    // Server settings
    getServerUrl() {
        return this.config.get('serverUrl', 'http://localhost:8000');
    }

    setServerUrl(url) {
        return this.config.update('serverUrl', url, vscode.ConfigurationTarget.Global);
    }

    // Authentication
    getAutoLogin() {
        return this.config.get('auth.autoLogin', false);
    }

    getRememberCredentials() {
        return this.config.get('auth.rememberCredentials', true);
    }

    // Inline completions
    getInlineCompletionsEnabled() {
        return this.config.get('inlineCompletions.enabled', true);
    }

    getCompletionDelay() {
        return this.config.get('inlineCompletions.delay', 75);
    }

    getCompletionMaxSuggestions() {
        return this.config.get('inlineCompletions.maxSuggestions', 3);
    }

    // Diagnostics
    getDiagnosticsEnabled() {
        return this.config.get('diagnostics.enabled', true);
    }

    getDiagnosticsOnSave() {
        return this.config.get('diagnostics.runOnSave', true);
    }

    // Telemetry
    getTelemetryEnabled() {
        return this.config.get('telemetry.enabled', true);
    }

    setTelemetryEnabled(enabled) {
        return this.config.update('telemetry.enabled', enabled, vscode.ConfigurationTarget.Global);
    }

    // Workspace indexing
    getIndexingEnabled() {
        return this.config.get('indexing.enabled', true);
    }

    getIndexingOnStartup() {
        return this.config.get('indexing.onStartup', false);
    }

    getIndexingExcludePatterns() {
        return this.config.get('indexing.excludePatterns', [
            '**/node_modules/**',
            '**/.git/**',
            '**/__pycache__/**',
            '**/dist/**',
            '**/build/**'
        ]);
    }

    // Chat settings
    getChatModel() {
        return this.config.get('chat.model', 'gpt-4');
    }

    getChatTemperature() {
        return this.config.get('chat.temperature', 0.7);
    }

    getChatMaxTokens() {
        return this.config.get('chat.maxTokens', 2000);
    }

    // Code actions
    getCodeActionsEnabled() {
        return this.config.get('codeActions.enabled', true);
    }

    getAutoFixOnSave() {
        return this.config.get('codeActions.autoFixOnSave', false);
    }

    // Debug mode
    getDebugMode() {
        return this.config.get('debug', false);
    }

    // Auto-Approve settings
    getAutoApproveEnabled() {
        return this.config.get('autoApprove.enabled', false);
    }

    setAutoApproveEnabled(enabled) {
        return this.config.update('autoApprove.enabled', enabled, vscode.ConfigurationTarget.Global);
    }

    getAutoApproveReadOnly() {
        return this.config.get('autoApprove.readOnly', false);
    }

    getAutoApproveReadOnlyOutsideWorkspace() {
        return this.config.get('autoApprove.readOnlyOutsideWorkspace', false);
    }

    getAutoApproveWrite() {
        return this.config.get('autoApprove.write', false);
    }

    getAutoApproveWriteOutsideWorkspace() {
        return this.config.get('autoApprove.writeOutsideWorkspace', false);
    }

    getAutoApproveWriteProtected() {
        return this.config.get('autoApprove.writeProtected', false);
    }

    getAutoApproveExecute() {
        return this.config.get('autoApprove.execute', false);
    }

    getAutoApproveBrowser() {
        return this.config.get('autoApprove.browser', false);
    }

    getAutoApproveMcp() {
        return this.config.get('autoApprove.mcp', false);
    }

    getAutoApproveModeSwitch() {
        return this.config.get('autoApprove.modeSwitch', true);
    }

    getAutoApproveSubtasks() {
        return this.config.get('autoApprove.subtasks', false);
    }

    getAutoApproveFollowupQuestions() {
        return this.config.get('autoApprove.followupQuestions', false);
    }

    getAutoApproveUpdateTodoList() {
        return this.config.get('autoApprove.updateTodoList', true);
    }

    getAutoApproveResubmit() {
        return this.config.get('autoApprove.resubmit', false);
    }

    getAutoApproveAllowedCommands() {
        return this.config.get('autoApprove.allowedCommands', []);
    }

    getAutoApproveDeniedCommands() {
        return this.config.get('autoApprove.deniedCommands', [
            'rm -rf *',
            'rm -rf /',
            'dd if=*',
            'mkfs.*',
            ':(){ :|:& };:',
            '> /dev/sda',
            'mv * /dev/null'
        ]);
    }

    getAutoApproveMaxRequests() {
        return this.config.get('autoApprove.maxRequests', 0);
    }

    getAutoApproveMaxCost() {
        return this.config.get('autoApprove.maxCost', 0);
    }

    getAutoApproveRequestDelay() {
        return this.config.get('autoApprove.requestDelay', 0);
    }

    getAutoApproveFollowupTimeout() {
        return this.config.get('autoApprove.followupTimeout', 30000);
    }

    // Get all auto-approve settings as object
    getAllAutoApproveSettings() {
        return {
            enabled: this.getAutoApproveEnabled(),
            readOnly: this.getAutoApproveReadOnly(),
            readOnlyOutsideWorkspace: this.getAutoApproveReadOnlyOutsideWorkspace(),
            write: this.getAutoApproveWrite(),
            writeOutsideWorkspace: this.getAutoApproveWriteOutsideWorkspace(),
            writeProtected: this.getAutoApproveWriteProtected(),
            execute: this.getAutoApproveExecute(),
            browser: this.getAutoApproveBrowser(),
            mcp: this.getAutoApproveMcp(),
            modeSwitch: this.getAutoApproveModeSwitch(),
            subtasks: this.getAutoApproveSubtasks(),
            followupQuestions: this.getAutoApproveFollowupQuestions(),
            updateTodoList: this.getAutoApproveUpdateTodoList(),
            resubmit: this.getAutoApproveResubmit(),
            allowedCommands: this.getAutoApproveAllowedCommands(),
            deniedCommands: this.getAutoApproveDeniedCommands(),
            maxRequests: this.getAutoApproveMaxRequests(),
            maxCost: this.getAutoApproveMaxCost(),
            requestDelay: this.getAutoApproveRequestDelay(),
            followupTimeout: this.getAutoApproveFollowupTimeout()
        };
    }

    // Get all settings as object
    getAllSettings() {
        return {
            serverUrl: this.getServerUrl(),
            auth: {
                autoLogin: this.getAutoLogin(),
                rememberCredentials: this.getRememberCredentials()
            },
            inlineCompletions: {
                enabled: this.getInlineCompletionsEnabled(),
                delay: this.getCompletionDelay(),
                maxSuggestions: this.getCompletionMaxSuggestions()
            },
            diagnostics: {
                enabled: this.getDiagnosticsEnabled(),
                runOnSave: this.getDiagnosticsOnSave()
            },
            telemetry: {
                enabled: this.getTelemetryEnabled()
            },
            indexing: {
                enabled: this.getIndexingEnabled(),
                onStartup: this.getIndexingOnStartup(),
                excludePatterns: this.getIndexingExcludePatterns()
            },
            chat: {
                model: this.getChatModel(),
                temperature: this.getChatTemperature(),
                maxTokens: this.getChatMaxTokens()
            },
            codeActions: {
                enabled: this.getCodeActionsEnabled(),
                autoFixOnSave: this.getAutoFixOnSave()
            },
            autoApprove: this.getAllAutoApproveSettings(),
            debug: this.getDebugMode()
        };
    }
}

module.exports = { SettingsProvider };
