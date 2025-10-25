/**
 * Terminal History Provider
 *
 * Tracks terminal commands and syncs to cloud history.
 * Provides local caching with backend sync for command history.
 *
 * Week 7: Enhanced Terminal
 */

import * as vscode from 'vscode';
import { TerminalManager } from './TerminalManager';
import { TerminalCommand, TerminalHistoryOptions } from '../types';

export class TerminalHistoryProvider {
    private static instance: TerminalHistoryProvider;
    private terminalManager: TerminalManager;
    private localHistory: TerminalCommand[] = [];
    private maxLocalHistory: number = 1000;
    private syncEnabled: boolean = true;
    private disposables: vscode.Disposable[] = [];

    private constructor() {
        this.terminalManager = TerminalManager.getInstance();
        this.initializeTerminalTracking();
    }

    public static getInstance(): TerminalHistoryProvider {
        if (!TerminalHistoryProvider.instance) {
            TerminalHistoryProvider.instance = new TerminalHistoryProvider();
        }
        return TerminalHistoryProvider.instance;
    }

    /**
     * Initialize terminal command tracking
     */
    private initializeTerminalTracking(): void {
        // Track terminal lifecycle
        this.disposables.push(
            vscode.window.onDidOpenTerminal((terminal) => {
                console.log(`Terminal opened: ${terminal.name}`);
            })
        );

        this.disposables.push(
            vscode.window.onDidCloseTerminal((terminal) => {
                console.log(`Terminal closed: ${terminal.name}`);
            })
        );

        // Note: VS Code doesn't provide direct command tracking API
        // Commands need to be tracked when sent via extension
        // See sendCommand() method for actual tracking
    }

    /**
     * Get workspace ID for current workspace
     */
    private getWorkspaceId(): string | undefined {
        const workspace = vscode.workspace.workspaceFolders?.[0];
        return workspace?.uri.fsPath;
    }

    /**
     * Get current working directory
     */
    private getCurrentCwd(): string {
        const workspace = vscode.workspace.workspaceFolders?.[0];
        return workspace?.uri.fsPath || process.cwd();
    }

    /**
     * Detect shell type
     */
    private detectShell(): string {
        const platform = process.platform;
        if (platform === 'win32') {
            return process.env.COMSPEC?.includes('powershell') ? 'powershell' : 'cmd';
        } else if (platform === 'darwin') {
            return process.env.SHELL?.includes('zsh') ? 'zsh' : 'bash';
        } else {
            return process.env.SHELL?.split('/').pop() || 'bash';
        }
    }

    /**
     * Track a command execution
     */
    public async trackCommand(
        command: string,
        options: {
            cwd?: string;
            shell?: string;
            exitCode?: number;
            durationMs?: number;
            output?: string;
            error?: string;
        } = {}
    ): Promise<void> {
        const terminalCommand: TerminalCommand = {
            command,
            workspaceId: this.getWorkspaceId(),
            cwd: options.cwd || this.getCurrentCwd(),
            shell: options.shell || this.detectShell(),
            exitCode: options.exitCode,
            durationMs: options.durationMs,
            output: options.output,
            error: options.error,
            timestamp: new Date()
        };

        // Add to local history
        this.localHistory.unshift(terminalCommand);
        if (this.localHistory.length > this.maxLocalHistory) {
            this.localHistory = this.localHistory.slice(0, this.maxLocalHistory);
        }

        // Sync to backend if enabled
        if (this.syncEnabled) {
            try {
                const result = await this.terminalManager.saveCommand(terminalCommand);
                if (result.success && result.id) {
                    terminalCommand.id = result.id;
                }
            } catch (error) {
                console.error('Failed to sync command to backend:', error);
                // Continue - local history still works
            }
        }
    }

    /**
     * Get local command history
     */
    public getLocalHistory(limit: number = 100): TerminalCommand[] {
        return this.localHistory.slice(0, limit);
    }

    /**
     * Get command history (local + cloud)
     */
    public async getHistory(options: TerminalHistoryOptions = {}): Promise<TerminalCommand[]> {
        try {
            // Get from backend
            const result = await this.terminalManager.getHistory(options);
            if (result.success) {
                return result.commands;
            }
        } catch (error) {
            console.error('Failed to get cloud history:', error);
        }

        // Fallback to local history
        let history = [...this.localHistory];

        // Apply filters
        if (options.workspaceId) {
            history = history.filter((cmd) => cmd.workspaceId === options.workspaceId);
        }
        if (options.shell) {
            history = history.filter((cmd) => cmd.shell === options.shell);
        }
        if (options.exitCode !== undefined) {
            history = history.filter((cmd) => cmd.exitCode === options.exitCode);
        }
        if (options.search) {
            const searchLower = options.search.toLowerCase();
            history = history.filter((cmd) =>
                cmd.command.toLowerCase().includes(searchLower)
            );
        }

        // Apply pagination
        const offset = options.offset || 0;
        const limit = options.limit || 100;
        return history.slice(offset, offset + limit);
    }

    /**
     * Search command history
     */
    public async searchHistory(query: string, limit: number = 20): Promise<TerminalCommand[]> {
        return this.getHistory({ search: query, limit });
    }

    /**
     * Get recent commands (last N)
     */
    public getRecentCommands(count: number = 10): string[] {
        return this.localHistory
            .slice(0, count)
            .map((cmd) => cmd.command)
            .filter((cmd) => cmd.trim().length > 0);
    }

    /**
     * Get successful commands only
     */
    public async getSuccessfulCommands(limit: number = 50): Promise<TerminalCommand[]> {
        return this.getHistory({ exitCode: 0, limit });
    }

    /**
     * Get failed commands
     */
    public async getFailedCommands(limit: number = 50): Promise<TerminalCommand[]> {
        const history = await this.getHistory({ limit: 500 });
        return history
            .filter((cmd) => cmd.exitCode !== undefined && cmd.exitCode !== 0)
            .slice(0, limit);
    }

    /**
     * Clear local history
     */
    public clearLocalHistory(): void {
        this.localHistory = [];
    }

    /**
     * Clear cloud history
     */
    public async clearCloudHistory(options: {
        workspaceId?: string;
        beforeDate?: Date;
    } = {}): Promise<number> {
        try {
            const result = await this.terminalManager.clearHistory(options);
            if (result.success) {
                return result.deletedCount;
            }
        } catch (error) {
            console.error('Failed to clear cloud history:', error);
        }
        return 0;
    }

    /**
     * Enable/disable cloud sync
     */
    public setSyncEnabled(enabled: boolean): void {
        this.syncEnabled = enabled;
    }

    /**
     * Check if sync is enabled
     */
    public isSyncEnabled(): boolean {
        return this.syncEnabled;
    }

    /**
     * Get command statistics
     */
    public getStatistics(): {
        totalCommands: number;
        successfulCommands: number;
        failedCommands: number;
        uniqueCommands: number;
        mostUsedCommand?: string;
        averageDuration?: number;
    } {
        const history = this.localHistory;
        const successful = history.filter((cmd) => cmd.exitCode === 0).length;
        const failed = history.filter((cmd) => cmd.exitCode !== undefined && cmd.exitCode !== 0).length;

        // Get unique commands
        const commandCounts = new Map<string, number>();
        let totalDuration = 0;
        let durationCount = 0;

        for (const cmd of history) {
            commandCounts.set(cmd.command, (commandCounts.get(cmd.command) || 0) + 1);
            if (cmd.durationMs) {
                totalDuration += cmd.durationMs;
                durationCount++;
            }
        }

        // Find most used command
        let mostUsedCommand: string | undefined;
        let maxCount = 0;
        for (const [command, count] of commandCounts.entries()) {
            if (count > maxCount) {
                maxCount = count;
                mostUsedCommand = command;
            }
        }

        return {
            totalCommands: history.length,
            successfulCommands: successful,
            failedCommands: failed,
            uniqueCommands: commandCounts.size,
            mostUsedCommand,
            averageDuration: durationCount > 0 ? totalDuration / durationCount : undefined
        };
    }

    /**
     * Export history to JSON
     */
    public exportHistory(options: { limit?: number; format?: 'json' | 'csv' } = {}): string {
        const limit = options.limit || this.localHistory.length;
        const history = this.localHistory.slice(0, limit);

        if (options.format === 'csv') {
            // CSV format
            const headers = ['Command', 'Workspace', 'CWD', 'Shell', 'Exit Code', 'Duration (ms)', 'Timestamp'];
            const rows = history.map((cmd) => [
                `"${cmd.command.replace(/"/g, '""')}"`,
                cmd.workspaceId || '',
                cmd.cwd || '',
                cmd.shell || '',
                cmd.exitCode !== undefined ? cmd.exitCode.toString() : '',
                cmd.durationMs !== undefined ? cmd.durationMs.toString() : '',
                cmd.timestamp?.toISOString() || ''
            ]);

            return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
        } else {
            // JSON format (default)
            return JSON.stringify(history, null, 2);
        }
    }

    /**
     * Import history from JSON
     */
    public importHistory(data: string): number {
        try {
            const commands = JSON.parse(data) as TerminalCommand[];
            if (!Array.isArray(commands)) {
                throw new Error('Invalid format: expected array');
            }

            // Add imported commands to local history
            for (const cmd of commands) {
                // Convert timestamp string to Date
                if (typeof cmd.timestamp === 'string') {
                    cmd.timestamp = new Date(cmd.timestamp);
                }
                this.localHistory.push(cmd);
            }

            // Sort by timestamp (newest first)
            this.localHistory.sort((a, b) => {
                const timeA = a.timestamp?.getTime() || 0;
                const timeB = b.timestamp?.getTime() || 0;
                return timeB - timeA;
            });

            // Trim to max size
            if (this.localHistory.length > this.maxLocalHistory) {
                this.localHistory = this.localHistory.slice(0, this.maxLocalHistory);
            }

            return commands.length;
        } catch (error) {
            console.error('Failed to import history:', error);
            throw new Error(`Import failed: ${error}`);
        }
    }

    /**
     * Dispose resources
     */
    public dispose(): void {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables = [];
    }
}

export function getInstance(): TerminalHistoryProvider {
    return TerminalHistoryProvider.getInstance();
}
