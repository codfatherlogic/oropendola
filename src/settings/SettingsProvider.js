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
        vscode.window.showInformationMessage('Oropendola settings updated');
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
            debug: this.getDebugMode()
        };
    }
}

module.exports = { SettingsProvider };
