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
        console.log('Oropendola settings updated');
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

    // Model settings
    getAiModel(): string {
        return this.config.get('ai.model', 'claude-3-5-sonnet-20241022');
    }

    setAiModel(model: string): Thenable<void> {
        return this.config.update('ai.model', model, vscode.ConfigurationTarget.Global);
    }

    getApiProvider(): string {
        return this.config.get('ai.apiProvider', 'auto');
    }

    setApiProvider(provider: string): Thenable<void> {
        return this.config.update('ai.apiProvider', provider, vscode.ConfigurationTarget.Global);
    }

    getStreamingEnabled(): boolean {
        return this.config.get('ai.streamingEnabled', true);
    }

    setStreamingEnabled(enabled: boolean): Thenable<void> {
        return this.config.update('ai.streamingEnabled', enabled, vscode.ConfigurationTarget.Global);
    }

    getCacheEnabled(): boolean {
        return this.config.get('ai.cacheEnabled', true);
    }

    setCacheEnabled(enabled: boolean): Thenable<void> {
        return this.config.update('ai.cacheEnabled', enabled, vscode.ConfigurationTarget.Global);
    }

    getApiKey(): string {
        return this.config.get('api.key', '');
    }

    setApiKey(key: string): Thenable<void> {
        return this.config.update('api.key', key, vscode.ConfigurationTarget.Global);
    }

    getApiSecret(): string {
        return this.config.get('api.secret', '');
    }

    setApiSecret(secret: string): Thenable<void> {
        return this.config.update('api.secret', secret, vscode.ConfigurationTarget.Global);
    }

    getAgentModeEnabled(): boolean {
        return this.config.get('agentMode.enabled', true);
    }

    setAgentModeEnabled(enabled: boolean): Thenable<void> {
        return this.config.update('agentMode.enabled', enabled, vscode.ConfigurationTarget.Global);
    }

    getAgentModeShowBadge(): boolean {
        return this.config.get('agentMode.showModelBadge', true);
    }

    setAgentModeShowBadge(show: boolean): Thenable<void> {
        return this.config.update('agentMode.showModelBadge', show, vscode.ConfigurationTarget.Global);
    }

    getAiTemperature(): number {
        return this.config.get('ai.temperature', 0.7);
    }

    setAiTemperature(temperature: number): Thenable<void> {
        return this.config.update('ai.temperature', temperature, vscode.ConfigurationTarget.Global);
    }

    getAiMaxTokens(): number {
        return this.config.get('ai.maxTokens', 4096);
    }

    setAiMaxTokens(maxTokens: number): Thenable<void> {
        return this.config.update('ai.maxTokens', maxTokens, vscode.ConfigurationTarget.Global);
    }

    // Cost tracking settings
    getCostTrackingEnabled(): boolean {
        return this.config.get('cost.trackingEnabled', true);
    }

    setCostTrackingEnabled(enabled: boolean): Thenable<void> {
        return this.config.update('cost.trackingEnabled', enabled, vscode.ConfigurationTarget.Global);
    }

    getCostBudgetLimit(): number {
        return this.config.get('cost.budgetLimit', 0);
    }

    setCostBudgetLimit(limit: number): Thenable<void> {
        return this.config.update('cost.budgetLimit', limit, vscode.ConfigurationTarget.Global);
    }

    getCostAlertThreshold(): number {
        return this.config.get('cost.alertThreshold', 0.8);
    }

    setCostAlertThreshold(threshold: number): Thenable<void> {
        return this.config.update('cost.alertThreshold', threshold, vscode.ConfigurationTarget.Global);
    }

    // File operations settings
    getFileMaxSize(): number {
        return this.config.get('fileOperations.maxFileSize', 1048576);
    }

    setFileMaxSize(size: number): Thenable<void> {
        return this.config.update('fileOperations.maxFileSize', size, vscode.ConfigurationTarget.Global);
    }

    getFileMaxLineCount(): number {
        return this.config.get('fileOperations.maxLineCount', 10000);
    }

    setFileMaxLineCount(count: number): Thenable<void> {
        return this.config.update('fileOperations.maxLineCount', count, vscode.ConfigurationTarget.Global);
    }

    getFileProtectedPatterns(): string[] {
        return this.config.get('fileOperations.protectedPatterns', ['*.env', '.env*', '*.key', '*.pem']);
    }

    setFileProtectedPatterns(patterns: string[]): Thenable<void> {
        return this.config.update('fileOperations.protectedPatterns', patterns, vscode.ConfigurationTarget.Global);
    }

    // Command execution settings
    getCommandTimeout(): number {
        return this.config.get('commandExecution.timeout', 120);
    }

    setCommandTimeout(timeout: number): Thenable<void> {
        return this.config.update('commandExecution.timeout', timeout, vscode.ConfigurationTarget.Global);
    }

    getCommandAllowedCommands(): string[] {
        return this.config.get('commandExecution.allowedCommands', []);
    }

    setCommandAllowedCommands(commands: string[]): Thenable<void> {
        return this.config.update('commandExecution.allowedCommands', commands, vscode.ConfigurationTarget.Global);
    }

    getCommandDeniedCommands(): string[] {
        return this.config.get('commandExecution.deniedCommands', ['rm -rf *', 'rm -rf /']);
    }

    setCommandDeniedCommands(commands: string[]): Thenable<void> {
        return this.config.update('commandExecution.deniedCommands', commands, vscode.ConfigurationTarget.Global);
    }

    getCommandRequireApproval(): boolean {
        return this.config.get('commandExecution.requireApproval', true);
    }

    setCommandRequireApproval(require: boolean): Thenable<void> {
        return this.config.update('commandExecution.requireApproval', require, vscode.ConfigurationTarget.Global);
    }

    // Browser automation settings
    getBrowserEnabled(): boolean {
        return this.config.get('browserAutomation.enabled', false);
    }

    setBrowserEnabled(enabled: boolean): Thenable<void> {
        return this.config.update('browserAutomation.enabled', enabled, vscode.ConfigurationTarget.Global);
    }

    getBrowserHeadless(): boolean {
        return this.config.get('browserAutomation.headless', true);
    }

    setBrowserHeadless(headless: boolean): Thenable<void> {
        return this.config.update('browserAutomation.headless', headless, vscode.ConfigurationTarget.Global);
    }

    getBrowserTimeout(): number {
        return this.config.get('browserAutomation.timeout', 30);
    }

    setBrowserTimeout(timeout: number): Thenable<void> {
        return this.config.update('browserAutomation.timeout', timeout, vscode.ConfigurationTarget.Global);
    }

    getBrowserMaxSessions(): number {
        return this.config.get('browserAutomation.maxSessions', 3);
    }

    setBrowserMaxSessions(max: number): Thenable<void> {
        return this.config.update('browserAutomation.maxSessions', max, vscode.ConfigurationTarget.Global);
    }

    // Image generation settings
    getImageGenEnabled(): boolean {
        return this.config.get('imageGeneration.enabled', false);
    }

    setImageGenEnabled(enabled: boolean): Thenable<void> {
        return this.config.update('imageGeneration.enabled', enabled, vscode.ConfigurationTarget.Global);
    }

    getImageGenProvider(): string {
        return this.config.get('imageGeneration.provider', 'dall-e');
    }

    setImageGenProvider(provider: string): Thenable<void> {
        return this.config.update('imageGeneration.provider', provider, vscode.ConfigurationTarget.Global);
    }

    getImageGenApiKey(): string {
        return this.config.get('imageGeneration.apiKey', '');
    }

    setImageGenApiKey(key: string): Thenable<void> {
        return this.config.update('imageGeneration.apiKey', key, vscode.ConfigurationTarget.Global);
    }

    getImageGenMaxImages(): number {
        return this.config.get('imageGeneration.maxImages', 4);
    }

    setImageGenMaxImages(max: number): Thenable<void> {
        return this.config.update('imageGeneration.maxImages', max, vscode.ConfigurationTarget.Global);
    }

    // MCP server settings
    getMcpEnabled(): boolean {
        return this.config.get('mcpServers.enabled', true);
    }

    setMcpEnabled(enabled: boolean): Thenable<void> {
        return this.config.update('mcpServers.enabled', enabled, vscode.ConfigurationTarget.Global);
    }

    getMcpAutoConnect(): boolean {
        return this.config.get('mcpServers.autoConnect', false);
    }

    setMcpAutoConnect(autoConnect: boolean): Thenable<void> {
        return this.config.update('mcpServers.autoConnect', autoConnect, vscode.ConfigurationTarget.Global);
    }

    getMcpReconnectAttempts(): number {
        return this.config.get('mcpServers.reconnectAttempts', 5);
    }

    setMcpReconnectAttempts(attempts: number): Thenable<void> {
        return this.config.update('mcpServers.reconnectAttempts', attempts, vscode.ConfigurationTarget.Global);
    }

    // UI/UX settings
    getUiTheme(): string {
        return this.config.get('ui.theme', 'system');
    }

    setUiTheme(theme: string): Thenable<void> {
        return this.config.update('ui.theme', theme, vscode.ConfigurationTarget.Global);
    }

    getUiFontSize(): number {
        return this.config.get('ui.fontSize', 14);
    }

    setUiFontSize(fontSize: number): Thenable<void> {
        return this.config.update('ui.fontSize', fontSize, vscode.ConfigurationTarget.Global);
    }

    getUiSyntaxHighlighting(): boolean {
        return this.config.get('ui.syntaxHighlighting', true);
    }

    setUiSyntaxHighlighting(enabled: boolean): Thenable<void> {
        return this.config.update('ui.syntaxHighlighting', enabled, vscode.ConfigurationTarget.Global);
    }

    getUiDiffView(): any {
        return this.config.get('ui.diffView', {
            inline: true,
            showLineNumbers: true,
            wordWrap: false,
            contextLines: 3
        });
    }

    setUiDiffView(diffView: any): Thenable<void> {
        return this.config.update('ui.diffView', diffView, vscode.ConfigurationTarget.Global);
    }

    getUiNotifications(): any {
        return this.config.get('ui.notifications', {
            enabled: true,
            taskComplete: true,
            taskError: true,
            desktop: false,
            sound: true
        });
    }

    setUiNotifications(notifications: any): Thenable<void> {
        return this.config.update('ui.notifications', notifications, vscode.ConfigurationTarget.Global);
    }

    getUiSoundEffects(): any {
        return this.config.get('ui.soundEffects', {
            enabled: true,
            volume: 0.5,
            messageReceived: true,
            taskComplete: true,
            error: true
        });
    }

    setUiSoundEffects(soundEffects: any): Thenable<void> {
        return this.config.update('ui.soundEffects', soundEffects, vscode.ConfigurationTarget.Global);
    }

    getUiPanelPosition(): string {
        return this.config.get('ui.panelPosition', 'left');
    }

    setUiPanelPosition(position: string): Thenable<void> {
        return this.config.update('ui.panelPosition', position, vscode.ConfigurationTarget.Global);
    }

    getUiKeyboardShortcuts(): any {
        return this.config.get('ui.keyboardShortcuts', {});
    }

    setUiKeyboardShortcuts(shortcuts: any): Thenable<void> {
        return this.config.update('ui.keyboardShortcuts', shortcuts, vscode.ConfigurationTarget.Global);
    }

    // Workspace settings
    getWorkspaceRooignore(): any {
        return this.config.get('workspace.rooignore', {
            enabled: true,
            patterns: [
                'node_modules/',
                '.git/',
                'dist/',
                'build/',
                '*.log',
                '.env',
                '.DS_Store',
                'coverage/',
                '__pycache__/',
                '*.pyc'
            ]
        });
    }

    setWorkspaceRooignore(rooignore: any): Thenable<void> {
        return this.config.update('workspace.rooignore', rooignore, vscode.ConfigurationTarget.Global);
    }

    getWorkspaceProtectedFiles(): any {
        return this.config.get('workspace.protectedFiles', {
            enabled: true,
            patterns: ['*.env', '.env*', '*.key', '*.pem', 'secrets/*', 'config/production.*'],
            warnBeforeEdit: true,
            requireApproval: true
        });
    }

    setWorkspaceProtectedFiles(protectedFiles: any): Thenable<void> {
        return this.config.update('workspace.protectedFiles', protectedFiles, vscode.ConfigurationTarget.Global);
    }

    getWorkspaceAutoSave(): any {
        return this.config.get('workspace.autoSave', {
            enabled: true,
            delay: 1000,
            onFocusChange: true,
            onWindowChange: false
        });
    }

    setWorkspaceAutoSave(autoSave: any): Thenable<void> {
        return this.config.update('workspace.autoSave', autoSave, vscode.ConfigurationTarget.Global);
    }

    getWorkspaceGit(): any {
        return this.config.get('workspace.git', {
            enabled: false,
            autoStage: false,
            autoCommit: false,
            commitMessageTemplate: 'feat: {description}\n\nGenerated by Oropendola AI',
            showDiffBeforeCommit: true
        });
    }

    setWorkspaceGit(git: any): Thenable<void> {
        return this.config.update('workspace.git', git, vscode.ConfigurationTarget.Global);
    }

    getWorkspaceIndexing(): any {
        return this.config.get('workspace.indexing', {
            enabled: true,
            autoIndex: true,
            indexOnSave: true,
            excludePatterns: ['test/*', '*.test.js', '*.spec.js'],
            includeFileTypes: ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'go', 'rs'],
            maxFileSize: 5242880
        });
    }

    setWorkspaceIndexing(indexing: any): Thenable<void> {
        return this.config.update('workspace.indexing', indexing, vscode.ConfigurationTarget.Global);
    }

    // Advanced settings
    getAdvancedDebug(): any {
        return this.config.get('advanced.debug', {
            enabled: false,
            verboseLogging: false,
            logToFile: false,
            logFilePath: '',
            showTimestamps: true
        });
    }

    setAdvancedDebug(debug: any): Thenable<void> {
        return this.config.update('advanced.debug', debug, vscode.ConfigurationTarget.Global);
    }

    getAdvancedLogging(): any {
        return this.config.get('advanced.logging', {
            level: 'info',
            includeSources: [],
            excludeSources: [],
            maxLogSize: 10485760,
            rotateOnSize: true
        });
    }

    setAdvancedLogging(logging: any): Thenable<void> {
        return this.config.update('advanced.logging', logging, vscode.ConfigurationTarget.Global);
    }

    getAdvancedPerformance(): any {
        return this.config.get('advanced.performance', {
            enabled: false,
            trackMemoryUsage: true,
            trackResponseTime: true,
            trackTokenUsage: true,
            displayInStatusBar: false,
            alertOnHighUsage: false,
            memoryThreshold: 524288000,
            responseTimeThreshold: 5000
        });
    }

    setAdvancedPerformance(performance: any): Thenable<void> {
        return this.config.update('advanced.performance', performance, vscode.ConfigurationTarget.Global);
    }

    getAdvancedExperimental(): any {
        return this.config.get('advanced.experimental', {
            enableAll: false,
            features: {
                enhancedCodeAnalysis: false,
                advancedRefactoring: false,
                multiFileEditing: false,
                smartSuggestions: false,
                codeGeneration: false,
                testGeneration: false,
                documentationGeneration: false,
                voiceInput: false
            }
        });
    }

    setAdvancedExperimental(experimental: any): Thenable<void> {
        return this.config.update('advanced.experimental', experimental, vscode.ConfigurationTarget.Global);
    }

    // Prompts and modes settings
    getPromptsCurrentMode(): string {
        return this.config.get('prompts.currentMode', 'code');
    }

    setPromptsCurrentMode(mode: string): Thenable<void> {
        return this.config.update('prompts.currentMode', mode, vscode.ConfigurationTarget.Global);
    }

    getPromptsCustomModes(): any[] {
        return this.config.get('prompts.customModes', []);
    }

    setPromptsCustomModes(modes: any[]): Thenable<void> {
        return this.config.update('prompts.customModes', modes, vscode.ConfigurationTarget.Global);
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
            ai: {
                model: this.getAiModel(),
                apiProvider: this.getApiProvider(),
                temperature: this.getAiTemperature(),
                maxTokens: this.getAiMaxTokens(),
                streamingEnabled: this.getStreamingEnabled(),
                cacheEnabled: this.getCacheEnabled()
            },
            agentMode: {
                enabled: this.getAgentModeEnabled(),
                showModelBadge: this.getAgentModeShowBadge()
            },
            cost: {
                trackingEnabled: this.getCostTrackingEnabled(),
                budgetLimit: this.getCostBudgetLimit(),
                alertThreshold: this.getCostAlertThreshold()
            },
            fileOperations: {
                maxFileSize: this.getFileMaxSize(),
                maxLineCount: this.getFileMaxLineCount(),
                protectedPatterns: this.getFileProtectedPatterns()
            },
            commandExecution: {
                timeout: this.getCommandTimeout(),
                allowedCommands: this.getCommandAllowedCommands(),
                deniedCommands: this.getCommandDeniedCommands(),
                requireApproval: this.getCommandRequireApproval()
            },
            browserAutomation: {
                enabled: this.getBrowserEnabled(),
                headless: this.getBrowserHeadless(),
                timeout: this.getBrowserTimeout(),
                maxSessions: this.getBrowserMaxSessions()
            },
            imageGeneration: {
                enabled: this.getImageGenEnabled(),
                provider: this.getImageGenProvider(),
                apiKey: this.getImageGenApiKey(),
                maxImages: this.getImageGenMaxImages()
            },
            mcpServers: {
                enabled: this.getMcpEnabled(),
                autoConnect: this.getMcpAutoConnect(),
                reconnectAttempts: this.getMcpReconnectAttempts()
            },
            ui: {
                theme: this.getUiTheme(),
                fontSize: this.getUiFontSize(),
                syntaxHighlighting: this.getUiSyntaxHighlighting(),
                diffView: this.getUiDiffView(),
                notifications: this.getUiNotifications(),
                soundEffects: this.getUiSoundEffects(),
                panelPosition: this.getUiPanelPosition(),
                keyboardShortcuts: this.getUiKeyboardShortcuts()
            },
            workspace: {
                rooignore: this.getWorkspaceRooignore(),
                protectedFiles: this.getWorkspaceProtectedFiles(),
                autoSave: this.getWorkspaceAutoSave(),
                git: this.getWorkspaceGit(),
                indexing: this.getWorkspaceIndexing()
            },
            advanced: {
                debug: this.getAdvancedDebug(),
                logging: this.getAdvancedLogging(),
                performance: this.getAdvancedPerformance(),
                experimental: this.getAdvancedExperimental()
            },
            prompts: {
                currentMode: this.getPromptsCurrentMode(),
                customModes: this.getPromptsCustomModes()
            },
            debug: this.getDebugMode()
        };
    }
}
