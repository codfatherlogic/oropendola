const vscode = require('vscode');

/**
 * Oropendola Settings WebView Provider
 * Provides settings interface similar to Qoder Settings
 * Shows user profile, subscription info, preferences, and sign-out option
 */
class OropendolaSettingsProvider {
    constructor(context, authManager) {
        this._context = context;
        this._authManager = authManager;
        this._view = undefined;
    }

    /**
     * Resolve the webview view
     * @param {vscode.WebviewView} webviewView
     */
    resolveWebviewView(webviewView) {
        console.log('🔍 SettingsProvider: resolveWebviewView called');
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._context.extensionUri]
        };

        // Show settings HTML
        webviewView.webview.html = this._getSettingsHtml(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'signOut':
                    await this._handleSignOut();
                    break;
                case 'signIn':
                    // Open the chat view for login
                    await vscode.commands.executeCommand('oropendola.login');
                    break;
                case 'openApiSettings':
                    await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:oropendola.oropendola-ai-assistant');
                    break;
                case 'checkSubscription':
                    await this._handleCheckSubscription();
                    break;
                case 'renewSubscription':
                    await this._handleRenewSubscription();
                    break;
                case 'refreshSettings':
                    await this._refreshSettings();
                    break;
                case 'openUrl':
                    if (message.url) {
                        await vscode.env.openExternal(vscode.Uri.parse(message.url));
                    }
                    break;
            }
        });
    }

    /**
     * Handle sign out
     */
    async _handleSignOut() {
        // No confirmation dialog needed (webview sandbox blocks modals anyway)
        // Clear stored credentials
        const config = vscode.workspace.getConfiguration('oropendola');
        await config.update('api.key', undefined, vscode.ConfigurationTarget.Global);
        await config.update('api.secret', undefined, vscode.ConfigurationTarget.Global);
        await config.update('user.email', undefined, vscode.ConfigurationTarget.Global);
        await config.update('user.token', undefined, vscode.ConfigurationTarget.Global);

        vscode.window.showInformationMessage('✅ Signed out successfully. Please use the Chat tab to sign in again.');

        // Refresh the view to show signed-out state
        if (this._view) {
            this._view.webview.html = this._getSettingsHtml(this._view.webview);
        }

        // Trigger the chat sidebar to also logout and show login screen
        await vscode.commands.executeCommand('oropendola.logout');
    }

    /**
     * Handle check subscription
     */
    async _handleCheckSubscription() {
        await vscode.commands.executeCommand('oropendola.checkSubscription');
    }

    /**
     * Handle renew subscription
     */
    async _handleRenewSubscription() {
        const config = vscode.workspace.getConfiguration('oropendola');
        const apiUrl = config.get('api.url', 'https://oropendola.ai');
        const renewUrl = `${apiUrl}/subscription/renew`;
        await vscode.env.openExternal(vscode.Uri.parse(renewUrl));
    }

    /**
     * Refresh settings view
     */
    async _refreshSettings() {
        if (this._view) {
            this._view.webview.html = this._getSettingsHtml(this._view.webview);
        }
    }

    /**
     * Public method to refresh settings (called from extension.js)
     */
    async refreshSettings() {
        await this._refreshSettings();
    }

    /**
     * Get user info from configuration
     */
    _getUserInfo() {
        const config = vscode.workspace.getConfiguration('oropendola');
        const email = config.get('user.email', '');
        const apiKey = config.get('api.key', '');

        // Extract username from email
        const username = email ? email.split('@')[0] : 'Guest';

        return {
            isSignedIn: !!apiKey,
            email: email,
            username: username,
            displayName: email ? username.charAt(0).toUpperCase() + username.slice(1) : 'Guest User'
        };
    }

    /**
     * Get settings HTML content
     */
    _getSettingsHtml(_webview) {
        const userInfo = this._getUserInfo();
        const config = vscode.workspace.getConfiguration('oropendola');

        // Get configuration values
        const apiUrl = config.get('api.url', 'https://oropendola.ai');
        const temperature = config.get('ai.temperature', 0.7);
        const maxTokens = config.get('ai.maxTokens', 4096);
        const autoAnalyze = config.get('analysis.autoAnalyze', true);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Oropendola Settings</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-sideBar-background);
            padding: 0;
            line-height: 1.6;
            overflow-y: auto;
        }
        
        .settings-container {
            padding: 16px;
        }
        
        /* Header with user profile */
        .settings-header {
            padding: 20px 0;
            border-bottom: 1px solid var(--vscode-panel-border);
            margin-bottom: 20px;
        }
        
        .user-profile {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
        }
        
        .user-avatar {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 20px;
            font-weight: 600;
            flex-shrink: 0;
        }
        
        .user-info {
            flex: 1;
            min-width: 0;
        }
        
        .user-name {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 2px;
            color: var(--vscode-foreground);
        }
        
        .user-email {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .sign-out-button {
            width: 100%;
            padding: 10px 16px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            transition: background 0.2s;
        }
        
        .sign-out-button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        .sign-in-prompt {
            text-align: center;
            padding: 20px 0;
        }
        
        .sign-in-button {
            width: 100%;
            padding: 12px 16px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            margin-top: 12px;
        }
        
        .sign-in-button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        /* Settings sections */
        .settings-section {
            margin-bottom: 24px;
        }
        
        .section-title {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 12px;
            color: var(--vscode-foreground);
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .settings-item {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 12px 14px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .settings-item:hover {
            background: var(--vscode-list-hoverBackground);
            border-color: var(--vscode-focusBorder);
        }
        
        .settings-item-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .settings-item-title {
            font-size: 13px;
            font-weight: 500;
            color: var(--vscode-foreground);
        }
        
        .settings-item-value {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-top: 4px;
        }
        
        .settings-item-icon {
            font-size: 16px;
            color: var(--vscode-descriptionForeground);
        }
        
        /* Subscription badge */
        .subscription-badge {
            display: inline-flex;
            align-items: center;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .subscription-badge.pro {
            background: #dcfce7;
            color: #166534;
        }
        
        .subscription-badge.trial {
            background: #fef3c7;
            color: #92400e;
        }
        
        .subscription-badge.expired {
            background: #fee2e2;
            color: #991b1b;
        }
        
        /* Action buttons */
        .action-button {
            width: 100%;
            padding: 10px 16px;
            background: transparent;
            color: var(--vscode-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            margin-top: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            transition: all 0.2s;
        }
        
        .action-button:hover {
            background: var(--vscode-button-secondaryHoverBackground);
            border-color: var(--vscode-focusBorder);
        }
        
        .action-button.primary {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
        }
        
        .action-button.primary:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        /* Footer */
        .settings-footer {
            margin-top: 32px;
            padding-top: 16px;
            border-top: 1px solid var(--vscode-panel-border);
            text-align: center;
            color: var(--vscode-descriptionForeground);
            font-size: 11px;
        }
        
        .footer-links {
            display: flex;
            justify-content: center;
            gap: 12px;
            margin-top: 8px;
        }
        
        .footer-link {
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
            cursor: pointer;
        }
        
        .footer-link:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="settings-container">
        ${userInfo.isSignedIn ? `
        <!-- Signed In State -->
        <div class="settings-header">
            <div class="user-profile">
                <div class="user-avatar">
                    ${userInfo.username.charAt(0).toUpperCase()}
                </div>
                <div class="user-info">
                    <div class="user-name">${userInfo.displayName}</div>
                    <div class="user-email">${userInfo.email}</div>
                </div>
            </div>
            <button class="sign-out-button" onclick="signOut()">
                <span>🚪</span>
                <span>Sign Out</span>
            </button>
        </div>
        
        <!-- Subscription Section -->
        <div class="settings-section">
            <div class="section-title">
                <span>💎</span>
                <span>Subscription</span>
            </div>
            <div class="settings-item" onclick="checkSubscription()">
                <div class="settings-item-header">
                    <div>
                        <div class="settings-item-title">Current Plan</div>
                        <div class="settings-item-value">
                            <span class="subscription-badge pro">Pro</span>
                        </div>
                    </div>
                    <div class="settings-item-icon">→</div>
                </div>
            </div>
            <button class="action-button" onclick="renewSubscription()">
                <span>🔄</span>
                <span>Renew Subscription</span>
            </button>
        </div>
        
        <!-- AI Settings Section -->
        <div class="settings-section">
            <div class="section-title">
                <span>🤖</span>
                <span>AI Configuration</span>
            </div>
            <div class="settings-item" onclick="openSettings()">
                <div class="settings-item-header">
                    <div>
                        <div class="settings-item-title">Temperature</div>
                        <div class="settings-item-value">${temperature} (Creativity level)</div>
                    </div>
                    <div class="settings-item-icon">→</div>
                </div>
            </div>
            <div class="settings-item" onclick="openSettings()">
                <div class="settings-item-header">
                    <div>
                        <div class="settings-item-title">Max Tokens</div>
                        <div class="settings-item-value">${maxTokens} tokens</div>
                    </div>
                    <div class="settings-item-icon">→</div>
                </div>
            </div>
        </div>
        
        <!-- Preferences Section -->
        <div class="settings-section">
            <div class="section-title">
                <span>⚙️</span>
                <span>Preferences</span>
            </div>
            <div class="settings-item" onclick="openSettings()">
                <div class="settings-item-header">
                    <div>
                        <div class="settings-item-title">API Settings</div>
                        <div class="settings-item-value">Configure API URL and credentials</div>
                    </div>
                    <div class="settings-item-icon">→</div>
                </div>
            </div>
            <div class="settings-item" onclick="openSettings()">
                <div class="settings-item-header">
                    <div>
                        <div class="settings-item-title">Auto Analysis</div>
                        <div class="settings-item-value">${autoAnalyze ? 'Enabled' : 'Disabled'}</div>
                    </div>
                    <div class="settings-item-icon">→</div>
                </div>
            </div>
            <div class="settings-item" onclick="openSettings()">
                <div class="settings-item-header">
                    <div>
                        <div class="settings-item-title">GitHub Integration</div>
                        <div class="settings-item-value">Repository operations settings</div>
                    </div>
                    <div class="settings-item-icon">→</div>
                </div>
            </div>
        </div>
        
        <button class="action-button primary" onclick="openSettings()">
            <span>⚙️</span>
            <span>Open Full Settings</span>
        </button>
        
        <button class="action-button" onclick="refreshSettings()">
            <span>🔄</span>
            <span>Refresh Settings</span>
        </button>
        
        ` : `
        <!-- Signed Out State -->
        <div class="sign-in-prompt">
            <div style="font-size: 48px; margin-bottom: 16px;">🔒</div>
            <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">Not Signed In</div>
            <div style="font-size: 13px; color: var(--vscode-descriptionForeground); margin-bottom: 20px; line-height: 1.6;">
                Please sign in using the <strong>Chat tab</strong> to access settings.<br/>
                The Chat tab provides the full authentication experience.
            </div>
            <button class="action-button primary" onclick="openChatForLogin()" style="margin-top: 0;">
                <span>🐦</span>
                <span>Go to Chat Tab to Sign In</span>
            </button>
        </div>
        `}
        
        <!-- Footer -->
        <div class="settings-footer">
            <div>Oropendola AI Assistant v2.0.0</div>
            <div class="footer-links">
                <a class="footer-link" onclick="openUrl('${apiUrl}')">Website</a>
                <a class="footer-link" onclick="openUrl('${apiUrl}/docs')">Documentation</a>
                <a class="footer-link" onclick="openUrl('${apiUrl}/support')">Support</a>
            </div>
        </div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        function signOut() {
            vscode.postMessage({ type: 'signOut' });
        }
        
        function signIn() {
            // Open the chat view which has login functionality
            vscode.postMessage({ type: 'signIn' });
        }
        
        function openSettings() {
            vscode.postMessage({ type: 'openApiSettings' });
        }
        
        function checkSubscription() {
            vscode.postMessage({ type: 'checkSubscription' });
        }
        
        function renewSubscription() {
            vscode.postMessage({ type: 'renewSubscription' });
        }
        
        function refreshSettings() {
            vscode.postMessage({ type: 'refreshSettings' });
        }
        
        function openUrl(url) {
            vscode.postMessage({ type: 'openUrl', url: url });
        }
        
        function openChatForLogin() {
            // Open the chat tab for login
            vscode.postMessage({ type: 'signIn' });
        }
    </script>
</body>
</html>`;
    }
}

module.exports = OropendolaSettingsProvider;
