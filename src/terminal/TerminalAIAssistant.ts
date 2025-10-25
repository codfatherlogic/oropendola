/**
 * Terminal AI Assistant
 *
 * AI-powered terminal features: suggestions, explanations, fixes, and output analysis.
 *
 * Week 7: Enhanced Terminal
 */

import * as vscode from 'vscode';
import { TerminalManager } from './TerminalManager';
import { TerminalHistoryProvider } from './TerminalHistoryProvider';
import {
    TerminalSuggestion,
    CommandExplanation,
    CommandFix,
    OutputAnalysis,
    TerminalContext
} from '../types';

export class TerminalAIAssistant {
    private static instance: TerminalAIAssistant;
    private terminalManager: TerminalManager;
    private historyProvider: TerminalHistoryProvider;

    private constructor() {
        this.terminalManager = TerminalManager.getInstance();
        this.historyProvider = TerminalHistoryProvider.getInstance();
    }

    public static getInstance(): TerminalAIAssistant {
        if (!TerminalAIAssistant.instance) {
            TerminalAIAssistant.instance = new TerminalAIAssistant();
        }
        return TerminalAIAssistant.instance;
    }

    /**
     * Get current terminal context
     */
    private getCurrentContext(): TerminalContext {
        const workspace = vscode.workspace.workspaceFolders?.[0];
        const platform = process.platform;

        // Detect shell
        let shell = 'bash';
        if (platform === 'win32') {
            shell = process.env.COMSPEC?.includes('powershell') ? 'powershell' : 'cmd';
        } else if (platform === 'darwin') {
            shell = process.env.SHELL?.includes('zsh') ? 'zsh' : 'bash';
        } else {
            shell = process.env.SHELL?.split('/').pop() || 'bash';
        }

        // Get OS type
        let os = 'linux';
        if (platform === 'win32') {
            os = 'windows';
        } else if (platform === 'darwin') {
            os = 'macos';
        }

        return {
            cwd: workspace?.uri.fsPath || process.cwd(),
            shell,
            os,
            recentCommands: this.historyProvider.getRecentCommands(5)
        };
    }

    /**
     * Get command suggestions from natural language
     */
    public async suggestCommand(prompt: string): Promise<TerminalSuggestion[]> {
        return vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Getting AI command suggestions...',
                cancellable: false
            },
            async () => {
                const context = this.getCurrentContext();
                const result = await this.terminalManager.suggestCommand(prompt, context);

                if (!result.success || result.suggestions.length === 0) {
                    vscode.window.showWarningMessage('No command suggestions available');
                    return [];
                }

                return result.suggestions;
            }
        );
    }

    /**
     * Show command suggestions in Quick Pick
     */
    public async showCommandSuggestions(prompt: string): Promise<string | undefined> {
        const suggestions = await this.suggestCommand(prompt);

        if (suggestions.length === 0) {
            return undefined;
        }

        const items = suggestions.map((sug) => ({
            label: sug.command,
            description: `Confidence: ${(sug.confidence * 100).toFixed(0)}%`,
            detail: sug.explanation,
            suggestion: sug
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a command to execute',
            matchOnDescription: true,
            matchOnDetail: true
        });

        return selected?.label;
    }

    /**
     * Explain a command
     */
    public async explainCommand(command: string): Promise<CommandExplanation | undefined> {
        return vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Explaining command...',
                cancellable: false
            },
            async () => {
                const result = await this.terminalManager.explainCommand(command);

                if (!result.success || !result.explanation) {
                    vscode.window.showWarningMessage('Could not explain command');
                    return undefined;
                }

                return result.explanation;
            }
        );
    }

    /**
     * Show command explanation in modal
     */
    public async showCommandExplanation(command: string): Promise<void> {
        const explanation = await this.explainCommand(command);

        if (!explanation) {
            return;
        }

        // Format explanation as markdown
        let message = `## Command: \`${command}\`\n\n`;
        message += `${explanation.summary}\n\n`;

        if (explanation.breakdown && explanation.breakdown.length > 0) {
            message += '### Breakdown\n\n';
            for (const part of explanation.breakdown) {
                message += `- **\`${part.part}\`**: ${part.meaning}\n`;
            }
        }

        // Show in modal
        const action = await vscode.window.showInformationMessage(
            message,
            { modal: true },
            'Copy Command'
        );

        if (action === 'Copy Command') {
            await vscode.env.clipboard.writeText(command);
            vscode.window.showInformationMessage('Command copied to clipboard');
        }
    }

    /**
     * Fix a failed command
     */
    public async fixCommand(
        command: string,
        errorMessage: string,
        exitCode: number
    ): Promise<CommandFix | undefined> {
        return vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'AI is analyzing the error...',
                cancellable: false
            },
            async () => {
                const context = this.getCurrentContext();
                const result = await this.terminalManager.fixCommand(
                    command,
                    errorMessage,
                    exitCode,
                    context.shell
                );

                if (!result.success || !result.fix) {
                    vscode.window.showWarningMessage('Could not fix command');
                    return undefined;
                }

                return result.fix;
            }
        );
    }

    /**
     * Show command fix suggestion
     */
    public async showCommandFix(
        command: string,
        errorMessage: string,
        exitCode: number
    ): Promise<string | undefined> {
        const fix = await this.fixCommand(command, errorMessage, exitCode);

        if (!fix) {
            return undefined;
        }

        // Show suggestion
        const message = `**Original:** \`${fix.originalCommand}\`\n\n**Fixed:** \`${fix.fixedCommand}\`\n\n**Explanation:** ${fix.explanation}`;

        const action = await vscode.window.showInformationMessage(
            message,
            { modal: true },
            'Execute Fixed Command',
            'Copy Command'
        );

        if (action === 'Execute Fixed Command') {
            return fix.fixedCommand;
        } else if (action === 'Copy Command') {
            await vscode.env.clipboard.writeText(fix.fixedCommand);
            vscode.window.showInformationMessage('Fixed command copied to clipboard');
        }

        return undefined;
    }

    /**
     * Analyze command output
     */
    public async analyzeOutput(
        command: string,
        output: string,
        exitCode: number
    ): Promise<OutputAnalysis | undefined> {
        return vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Analyzing output...',
                cancellable: false
            },
            async () => {
                const result = await this.terminalManager.analyzeOutput(command, output, exitCode);

                if (!result.success || !result.analysis) {
                    vscode.window.showWarningMessage('Could not analyze output');
                    return undefined;
                }

                return result.analysis;
            }
        );
    }

    /**
     * Show output analysis
     */
    public async showOutputAnalysis(
        command: string,
        output: string,
        exitCode: number
    ): Promise<void> {
        const analysis = await this.analyzeOutput(command, output, exitCode);

        if (!analysis) {
            return;
        }

        // Format analysis as markdown
        let message = `## Command: \`${command}\`\n\n`;
        message += `**Summary:** ${analysis.summary}\n\n`;

        if (analysis.errors.length > 0) {
            message += '### Errors\n\n';
            for (const error of analysis.errors) {
                message += `- ❌ ${error}\n`;
            }
            message += '\n';
        }

        if (analysis.warnings.length > 0) {
            message += '### Warnings\n\n';
            for (const warning of analysis.warnings) {
                message += `- ⚠️  ${warning}\n`;
            }
            message += '\n';
        }

        if (analysis.suggestions.length > 0) {
            message += '### Suggestions\n\n';
            for (const suggestion of analysis.suggestions) {
                message += `- 💡 ${suggestion}\n`;
            }
        }

        await vscode.window.showInformationMessage(message, { modal: true });
    }

    /**
     * Natural language command input
     */
    public async naturalLanguageCommand(): Promise<string | undefined> {
        const prompt = await vscode.window.showInputBox({
            prompt: 'Describe what you want to do (e.g., "find all JavaScript files modified today")',
            placeHolder: 'Natural language command...',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Please enter a description';
                }
                return null;
            }
        });

        if (!prompt) {
            return undefined;
        }

        return this.showCommandSuggestions(prompt);
    }

    /**
     * Interactive command builder
     */
    public async buildCommand(): Promise<string | undefined> {
        // Step 1: What do you want to do?
        const action = await vscode.window.showQuickPick(
            [
                { label: 'Find files', value: 'find' },
                { label: 'Search content', value: 'grep' },
                { label: 'Git operations', value: 'git' },
                { label: 'Package management', value: 'npm' },
                { label: 'Process management', value: 'ps' },
                { label: 'System info', value: 'system' },
                { label: 'Other...', value: 'other' }
            ],
            { placeHolder: 'What do you want to do?' }
        );

        if (!action) {
            return undefined;
        }

        if (action.value === 'other') {
            return this.naturalLanguageCommand();
        }

        // Step 2: Get specific details
        const details = await vscode.window.showInputBox({
            prompt: `Describe the ${action.label.toLowerCase()} operation`,
            placeHolder: 'e.g., "all .js files modified in last 24 hours"'
        });

        if (!details) {
            return undefined;
        }

        const prompt = `${action.label}: ${details}`;
        return this.showCommandSuggestions(prompt);
    }
}

export function getInstance(): TerminalAIAssistant {
    return TerminalAIAssistant.getInstance();
}
