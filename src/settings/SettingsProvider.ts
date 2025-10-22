import * as vscode from 'vscode';

export class SettingsProvider {
    private config: vscode.WorkspaceConfiguration;

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

    private onConfigChanged(): void {
        // Notify listeners or trigger actions based on settings changes
        vscode.window.showInformationMessage('Oropendola settings updated');
    }

    // Server settings
    getServerUrl(): string {
        return this.config.get('serverUrl', 'http://localhost:8000');
    }

    setServerUrl(url: string): Thenable<void> {
        return this.config.update('serverUrl', url, vscode.ConfigurationTarget.Global);
    }

    // Authentication
    getAutoLogin(): boolean {
        return this.config.get('auth.autoLogin', false);
    }

    getRememberCredentials(): boolean {
        return this.config.get('auth.rememberCredentials', true);
    }

    // Inline completions
    getInlineCompletionsEnabled(): boolean {
        return this.config.get('inlineCompletions.enabled', true);
    }

    getCompletionDelay(): number {
        return this.config.get('inlineCompletions.delay', 75);
    }

    getCompletionMaxSuggestions(): number {
        return this.config.get('inlineCompletions.maxSuggestions', 3);
    }

    // Diagnostics
    getDiagnosticsEnabled(): boolean {
        return this.config.get('diagnostics.enabled', true);
    }

    getDiagnosticsOnSave(): boolean {
        return this.config.get('diagnostics.runOnSave', true);
    }

    // Telemetry
    getTelemetryEnabled(): boolean {
        return this.config.get('telemetry.enabled', true);
    }

    setTelemetryEnabled(enabled: boolean): Thenable<void> {
        return this.config.update('telemetry.enabled', enabled, vscode.ConfigurationTarget.Global);
    }

    // Workspace indexing
    getIndexingEnabled(): boolean {
        return this.config.get('indexing.enabled', true);
    }

    getIndexingOnStartup(): boolean {
        return this.config.get('indexing.onStartup', false);
    }

    getIndexingExcludePatterns(): string[] {
        return this.config.get('indexing.excludePatterns', [
            '**/node_modules/**',
            '**/.git/**',
            '**/__pycache__/**',
            '**/dist/**',
            '**/build/**'
        ]);
    }

    // Chat settings
    getChatModel(): string {
        return this.config.get('chat.model', 'gpt-4');
    }

    getChatTemperature(): number {
        return this.config.get('chat.temperature', 0.7);
    }

    getChatMaxTokens(): number {
        return this.config.get('chat.maxTokens', 2000);
    }

    // Code actions
    getCodeActionsEnabled(): boolean {
        return this.config.get('codeActions.enabled', true);
    }

    getAutoFixOnSave(): boolean {
        return this.config.get('codeActions.autoFixOnSave', false);
    }

    // Debug mode
    getDebugMode(): boolean {
        return this.config.get('debug', false);
    }

    // Get all settings as object
    getAllSettings(): Record<string, any> {
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
            debug: this.getDebugMode()
        };
    }
}
