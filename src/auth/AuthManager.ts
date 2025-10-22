import * as vscode from 'vscode';
import * as keytar from 'keytar';
import axios from 'axios';

export class EnhancedAuthManager implements vscode.Disposable {
    private static readonly SERVICE_NAME = 'oropendola-vscode';
    private static readonly ACCOUNT_NAME = 'api-token';
    private context: vscode.ExtensionContext;
    private statusBarItem: vscode.StatusBarItem;
    private refreshTimer?: ReturnType<typeof setInterval>;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.updateStatusBar(false, '');
    }

    async authenticate(): Promise<boolean> {
        try {
            const serverUrl = await vscode.window.showInputBox({
                prompt: 'Enter Oropendola server URL',
                placeHolder: 'https://your-server.com',
                value: this.context.globalState.get('serverUrl', ''),
                validateInput: (value) => {
                    try { new URL(value); return null; } catch { return 'Please enter a valid URL'; }
                }
            });

            if (!serverUrl) return false;

            const username = await vscode.window.showInputBox({ prompt: 'Enter your username/email', placeHolder: 'user@example.com' });
            if (!username) return false;

            const password = await vscode.window.showInputBox({ prompt: 'Enter your password', password: true });
            if (!password) return false;

            const response = await axios.post(`${serverUrl}/api/method/ai_assistant.api.endpoints.session_login`, {
                usr: username,
                pwd: password
            }, { timeout: 10000, withCredentials: true });

            if (response.data && response.data.success) {
                await keytar.setPassword(EnhancedAuthManager.SERVICE_NAME, EnhancedAuthManager.ACCOUNT_NAME, JSON.stringify({
                    serverUrl,
                    sessionId: response.data.session_id,
                    user: response.data.user,
                    timestamp: Date.now()
                }));

                await this.context.globalState.update('serverUrl', serverUrl);
                await this.context.globalState.update('currentUser', response.data.user);

                this.updateStatusBar(true, response.data.user?.full_name || response.data.user?.name || username);
                this.startTokenRefresh(serverUrl, response.data.session_id);

                vscode.window.showInformationMessage(`✅ Successfully authenticated as ${response.data.user?.full_name || username}`);
                return true;
            } else {
                throw new Error(response.data?.error || 'Authentication failed');
            }

        } catch (error: any) {
            vscode.window.showErrorMessage(`❌ Authentication failed: ${error?.message || error}`);
            return false;
        }
    }

    async getAuthToken(): Promise<string | null> {
        try {
            const stored = await keytar.getPassword(EnhancedAuthManager.SERVICE_NAME, EnhancedAuthManager.ACCOUNT_NAME);
            if (!stored) return null;
            const credentials = JSON.parse(stored);

            const now = Date.now();
            const tokenAge = now - (credentials.timestamp || 0);
            const MAX_AGE = 24 * 60 * 60 * 1000;

            if (tokenAge > MAX_AGE) {
                await this.logout();
                return null;
            }

            return credentials.sessionId;
        } catch (error) {
            console.error('Failed to get auth token:', error);
            return null;
        }
    }

    private async refreshToken(serverUrl: string, oldToken: string): Promise<boolean> {
        try {
            const response = await axios.post(`${serverUrl}/api/method/ai_assistant.api.endpoints.refresh_session`, { session_id: oldToken }, { timeout: 5000 });
            if (response.data && response.data.success) {
                const stored = await keytar.getPassword(EnhancedAuthManager.SERVICE_NAME, EnhancedAuthManager.ACCOUNT_NAME);
                if (stored) {
                    const credentials = JSON.parse(stored);
                    credentials.sessionId = response.data.new_session_id;
                    credentials.timestamp = Date.now();
                    await keytar.setPassword(EnhancedAuthManager.SERVICE_NAME, EnhancedAuthManager.ACCOUNT_NAME, JSON.stringify(credentials));
                }
                return true;
            }
            return false;
        } catch (error) {
            console.error('Token refresh failed:', error);
            return false;
        }
    }

    private startTokenRefresh(serverUrl: string, sessionId: string) {
        this.refreshTimer = setInterval(async () => {
            const success = await this.refreshToken(serverUrl, sessionId);
            if (!success) {
                this.updateStatusBar(false, '');
                const selection = await vscode.window.showWarningMessage('Session expired. Please re-authenticate.', 'Login');
                if (selection === 'Login') {
                    await this.authenticate();
                }
            }
        }, 6 * 60 * 60 * 1000);
    }

    async logout(): Promise<void> {
        try {
            await keytar.deletePassword(EnhancedAuthManager.SERVICE_NAME, EnhancedAuthManager.ACCOUNT_NAME);
            await this.context.globalState.update('serverUrl', undefined);
            await this.context.globalState.update('currentUser', undefined);
        if (this.refreshTimer) { clearInterval(this.refreshTimer as unknown as number); }
            this.updateStatusBar(false, '');
            vscode.window.showInformationMessage('✅ Logged out successfully');
        } catch (error) { console.error('Logout failed:', error); }
    }

    private updateStatusBar(authenticated: boolean, userName: string) {
        if (authenticated) {
            this.statusBarItem.text = `$(account) ${userName}`;
            this.statusBarItem.tooltip = 'Oropendola: Connected';
            this.statusBarItem.command = 'oropendola.showAccountMenu';
        } else {
            this.statusBarItem.text = '$(account) Sign in';
            this.statusBarItem.tooltip = 'Oropendola: Not connected';
            this.statusBarItem.command = 'oropendola.authenticate';
        }
        this.statusBarItem.show();
    }

    async isAuthenticated(): Promise<boolean> {
        const token = await this.getAuthToken();
        return token !== null;
    }

    dispose(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer as unknown as number);
        this.statusBarItem.dispose();
    }
}
