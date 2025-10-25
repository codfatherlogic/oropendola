/**
 * Terminal Manager
 *
 * Core terminal features manager with backend integration.
 * Provides command history sync, AI suggestions, and terminal enhancements.
 *
 * Week 7: Enhanced Terminal
 * Backend: https://oropendola.ai/
 */

import { BackendConfig, getInstance as getBackendConfig } from '../config/BackendConfig';
import {
    TerminalCommand,
    TerminalHistoryOptions,
    TerminalSuggestion,
    CommandExplanation,
    CommandFix,
    OutputAnalysis,
    TerminalContext
} from '../types';

export class TerminalManager {
    private static instance: TerminalManager;
    private backendConfig: BackendConfig;
    private csrfToken: string = '';

    private constructor() {
        this.backendConfig = getBackendConfig();
    }

    public static getInstance(): TerminalManager {
        if (!TerminalManager.instance) {
            TerminalManager.instance = new TerminalManager();
        }
        return TerminalManager.instance;
    }

    /**
     * Get CSRF token for authenticated requests
     */
    private async getCsrfToken(): Promise<string> {
        if (this.csrfToken) {
            return this.csrfToken;
        }

        try {
            const response = await fetch(
                this.backendConfig.getApiUrl('/api/method/ai_assistant.api.get_csrf_token'),
                {
                    method: 'GET',
                    credentials: 'include'
                }
            );

            const data = await response.json() as any;
            this.csrfToken = data.message || data.csrf_token || '';
            return this.csrfToken;
        } catch (error) {
            console.warn('Failed to get CSRF token:', error);
            return '';
        }
    }

    /**
     * Save command to cloud history
     */
    public async saveCommand(command: TerminalCommand): Promise<{ success: boolean; id: string }> {
        try {
            const response = await fetch(
                this.backendConfig.getApiUrl('/api/method/ai_assistant.api.terminal_save_command'),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Frappe-CSRF-Token': await this.getCsrfToken()
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        command: command.command,
                        workspace_id: command.workspaceId,
                        cwd: command.cwd,
                        shell: command.shell,
                        exit_code: command.exitCode,
                        duration_ms: command.durationMs,
                        output: command.output,
                        error: command.error
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json() as any;
            const result = data.message || data;

            return {
                success: result.success || false,
                id: result.id || ''
            };
        } catch (error) {
            console.error('Failed to save command:', error);
            return { success: false, id: '' };
        }
    }

    /**
     * Get command history from cloud
     */
    public async getHistory(options: TerminalHistoryOptions = {}): Promise<{
        success: boolean;
        commands: TerminalCommand[];
        total: number;
    }> {
        try {
            const params = new URLSearchParams();

            if (options.workspaceId) {
                params.append('workspace_id', options.workspaceId);
            }
            if (options.shell) {
                params.append('shell', options.shell);
            }
            if (options.exitCode !== undefined) {
                params.append('exit_code', options.exitCode.toString());
            }
            if (options.search) {
                params.append('search', options.search);
            }
            if (options.limit) {
                params.append('limit', options.limit.toString());
            }
            if (options.offset) {
                params.append('offset', options.offset.toString());
            }

            const url = this.backendConfig.getApiUrl(
                `/api/method/ai_assistant.api.terminal_get_history?${params.toString()}`
            );

            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json() as any;
            const result = data.message || data;

            const commands: TerminalCommand[] = (result.commands || []).map((cmd: any) => ({
                id: cmd.id,
                command: cmd.command,
                workspaceId: cmd.workspace_id,
                cwd: cmd.cwd,
                shell: cmd.shell,
                exitCode: cmd.exit_code,
                durationMs: cmd.duration_ms,
                output: cmd.output,
                error: cmd.error,
                timestamp: new Date(cmd.created_at)
            }));

            return {
                success: true,
                commands,
                total: result.total || commands.length
            };
        } catch (error) {
            console.error('Failed to get history:', error);
            return { success: false, commands: [], total: 0 };
        }
    }

    /**
     * Clear command history
     */
    public async clearHistory(options: {
        workspaceId?: string;
        beforeDate?: Date;
    } = {}): Promise<{ success: boolean; deletedCount: number }> {
        try {
            const response = await fetch(
                this.backendConfig.getApiUrl('/api/method/ai_assistant.api.terminal_clear_history'),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Frappe-CSRF-Token': await this.getCsrfToken()
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        workspace_id: options.workspaceId,
                        before_date: options.beforeDate?.toISOString()
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json() as any;
            const result = data.message || data;

            return {
                success: result.success || false,
                deletedCount: result.deleted_count || 0
            };
        } catch (error) {
            console.error('Failed to clear history:', error);
            return { success: false, deletedCount: 0 };
        }
    }

    /**
     * Get AI command suggestions from natural language
     */
    public async suggestCommand(
        prompt: string,
        context: TerminalContext
    ): Promise<{ success: boolean; suggestions: TerminalSuggestion[] }> {
        try {
            const response = await fetch(
                this.backendConfig.getApiUrl('/api/method/ai_assistant.api.terminal_suggest_command'),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Frappe-CSRF-Token': await this.getCsrfToken()
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        prompt,
                        cwd: context.cwd,
                        shell: context.shell,
                        os_type: context.os,
                        recent_commands: context.recentCommands || []
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json() as any;
            const result = data.message || data;

            const suggestions: TerminalSuggestion[] = (result.suggestions || []).map((sug: any) => ({
                command: sug.command,
                explanation: sug.explanation,
                confidence: sug.confidence || 0
            }));

            return { success: true, suggestions };
        } catch (error) {
            console.error('Failed to get suggestions:', error);
            return { success: false, suggestions: [] };
        }
    }

    /**
     * Explain what a command does
     */
    public async explainCommand(command: string): Promise<{
        success: boolean;
        explanation?: CommandExplanation;
    }> {
        try {
            const response = await fetch(
                this.backendConfig.getApiUrl('/api/method/ai_assistant.api.terminal_explain_command'),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Frappe-CSRF-Token': await this.getCsrfToken()
                    },
                    credentials: 'include',
                    body: JSON.stringify({ command })
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json() as any;
            const result = data.message || data;

            if (!result.explanation) {
                return { success: false };
            }

            const explanation: CommandExplanation = {
                summary: result.explanation,
                breakdown: (result.breakdown || []).map((part: any) => ({
                    part: part.part || part.flag,
                    meaning: part.meaning
                }))
            };

            return { success: true, explanation };
        } catch (error) {
            console.error('Failed to explain command:', error);
            return { success: false };
        }
    }

    /**
     * Fix a failed command
     */
    public async fixCommand(
        command: string,
        errorMessage: string,
        exitCode: number,
        shell: string = 'bash'
    ): Promise<{ success: boolean; fix?: CommandFix }> {
        try {
            const response = await fetch(
                this.backendConfig.getApiUrl('/api/method/ai_assistant.api.terminal_fix_command'),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Frappe-CSRF-Token': await this.getCsrfToken()
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        command,
                        error_message: errorMessage,
                        exit_code: exitCode,
                        shell
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json() as any;
            const result = data.message || data;

            if (!result.fixed_command) {
                return { success: false };
            }

            const fix: CommandFix = {
                originalCommand: command,
                fixedCommand: result.fixed_command,
                explanation: result.explanation
            };

            return { success: true, fix };
        } catch (error) {
            console.error('Failed to fix command:', error);
            return { success: false };
        }
    }

    /**
     * Analyze command output
     */
    public async analyzeOutput(
        command: string,
        output: string,
        exitCode: number
    ): Promise<{ success: boolean; analysis?: OutputAnalysis }> {
        try {
            const response = await fetch(
                this.backendConfig.getApiUrl('/api/method/ai_assistant.api.terminal_analyze_output'),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Frappe-CSRF-Token': await this.getCsrfToken()
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        command,
                        output,
                        exit_code: exitCode
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json() as any;
            const result = data.message || data;

            const analysis: OutputAnalysis = {
                summary: result.summary || '',
                warnings: result.warnings || [],
                errors: result.errors || [],
                suggestions: result.suggestions || []
            };

            return { success: true, analysis };
        } catch (error) {
            console.error('Failed to analyze output:', error);
            return { success: false };
        }
    }
}

export function getInstance(): TerminalManager {
    return TerminalManager.getInstance();
}
