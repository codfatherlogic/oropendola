/**
 * AuthManager - Handles OAuth-style authentication flow with Oropendola backend
 * 
 * Flow:
 * 1. Call initiate() to get auth URL and session token
 * 2. Open browser to auth URL for user to login
 * 3. Poll status endpoint until authentication completes
 * 4. Store API key and subscription info
 */

const vscode = require('vscode');

const API_BASE = 'https://oropendola.ai';
const POLL_INTERVAL = 5000; // 5 seconds
const POLL_TIMEOUT = 600000; // 10 minutes

class AuthManager {
    constructor(context) {
        this._context = context;
        this._apiKey = null;
        this._userEmail = null;
        this._subscription = null;
    }

    /**
     * Initiate authentication flow
     * Returns auth URL for user to visit
     */
    async initiate() {
        try {
            console.log('🔐 [AuthManager] Initiating authentication flow');

            const response = await fetch(
                `${API_BASE}/api/method/oropendola_ai.oropendola_ai.api.vscode_extension.initiate_vscode_auth`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (!data.message?.success) {
                throw new Error(data.message?.error || 'Failed to initiate authentication');
            }

            console.log('✅ [AuthManager] Auth session created');
            return {
                authUrl: data.message.auth_url,
                sessionToken: data.message.session_token,
                expiresIn: data.message.expires_in
            };

        } catch (error) {
            console.error('❌ [AuthManager] Initiate error:', error);
            throw new Error(`Failed to start authentication: ${error.message}`);
        }
    }

    /**
     * Poll authentication status until complete or timeout
     */
    async pollStatus(sessionToken) {
        const startTime = Date.now();
        
        console.log('🔄 [AuthManager] Starting to poll auth status');

        return new Promise((resolve, reject) => {
            const pollInterval = setInterval(async () => {
                try {
                    // Check timeout
                    const elapsed = Date.now() - startTime;
                    if (elapsed > POLL_TIMEOUT) {
                        clearInterval(pollInterval);
                        console.log('⏱️ [AuthManager] Polling timeout reached');
                        reject(new Error('Authentication timed out'));
                        return;
                    }

                    // Poll the status endpoint
                    const response = await fetch(
                        `${API_BASE}/api/method/oropendola_ai.oropendola_ai.api.vscode_extension.check_vscode_auth_status`,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ session_token: sessionToken })
                        }
                    );

                    if (!response.ok) {
                        console.error('❌ [AuthManager] Poll request failed:', response.status);
                        return; // Continue polling
                    }

                    const data = await response.json();
                    
                    if (!data.message?.success) {
                        console.error('❌ [AuthManager] Poll response error:', data.message?.error);
                        return; // Continue polling
                    }

                    const status = data.message.status;
                    console.log(`🔍 [AuthManager] Auth status: ${status}`);

                    if (status === 'complete') {
                        clearInterval(pollInterval);
                        
                        // Store authentication data
                        this._apiKey = data.message.api_key;
                        this._userEmail = data.message.user_email;
                        this._subscription = data.message.subscription;

                        // Save to secure storage
                        await this._saveToStorage();

                        console.log('✅ [AuthManager] Authentication complete');
                        resolve({
                            apiKey: this._apiKey,
                            userEmail: this._userEmail,
                            subscription: this._subscription
                        });

                    } else if (status === 'expired') {
                        clearInterval(pollInterval);
                        console.log('⏱️ [AuthManager] Session expired');
                        reject(new Error('Authentication session expired'));
                    }
                    // Otherwise status is 'pending', keep polling

                } catch (error) {
                    console.error('❌ [AuthManager] Poll error:', error);
                    // Continue polling despite errors
                }
            }, POLL_INTERVAL);
        });
    }

    /**
     * Complete authentication flow
     * Opens browser and waits for completion
     */
    async authenticate() {
        try {
            // Step 1: Initiate authentication
            const { authUrl, sessionToken } = await this.initiate();

            // Step 2: Show message and open browser
            const selection = await vscode.window.showInformationMessage(
                'Opening browser for authentication...',
                'Open Browser',
                'Cancel'
            );

            if (selection !== 'Open Browser') {
                throw new Error('Authentication cancelled by user');
            }

            // Open browser
            await vscode.env.openExternal(vscode.Uri.parse(authUrl));

            // Show progress while polling
            return await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Waiting for authentication...',
                    cancellable: true
                },
                async (progress, token) => {
                    // Handle cancellation
                    token.onCancellationRequested(() => {
                        throw new Error('Authentication cancelled');
                    });

                    // Step 3: Poll for completion
                    const result = await this.pollStatus(sessionToken);

                    // Show success message
                    vscode.window.showInformationMessage(
                        `✓ Successfully authenticated as ${result.userEmail}!`
                    );

                    return result;
                }
            );

        } catch (error) {
            console.error('❌ [AuthManager] Authentication failed:', error);
            vscode.window.showErrorMessage(`Authentication failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Save authentication data to secure storage
     */
    async _saveToStorage() {
        if (this._apiKey) {
            await this._context.secrets.store('oropendola_api_key', this._apiKey);
        }
        if (this._userEmail) {
            await this._context.globalState.update('oropendola_user_email', this._userEmail);
        }
        if (this._subscription) {
            await this._context.globalState.update('oropendola_subscription', JSON.stringify(this._subscription));
        }
        console.log('💾 [AuthManager] Saved credentials to secure storage');
    }

    /**
     * Load authentication data from secure storage
     */
    async loadFromStorage() {
        try {
            this._apiKey = await this._context.secrets.get('oropendola_api_key');
            this._userEmail = await this._context.globalState.get('oropendola_user_email');
            
            const subJson = await this._context.globalState.get('oropendola_subscription');
            if (subJson) {
                this._subscription = JSON.parse(subJson);
            }

            const hasAuth = !!(this._apiKey && this._userEmail);
            console.log(`🔍 [AuthManager] Loaded from storage: ${hasAuth ? 'authenticated' : 'not authenticated'}`);
            
            return hasAuth;
        } catch (error) {
            console.error('❌ [AuthManager] Load error:', error);
            return false;
        }
    }

    /**
     * Clear all authentication data
     */
    async logout() {
        try {
            await this._context.secrets.delete('oropendola_api_key');
            await this._context.globalState.update('oropendola_user_email', undefined);
            await this._context.globalState.update('oropendola_subscription', undefined);
            
            this._apiKey = null;
            this._userEmail = null;
            this._subscription = null;

            console.log('🚪 [AuthManager] Logged out');
            vscode.window.showInformationMessage('Logged out successfully');
        } catch (error) {
            console.error('❌ [AuthManager] Logout error:', error);
        }
    }

    /**
     * Get current API key
     */
    getApiKey() {
        return this._apiKey;
    }

    /**
     * Get current user email
     */
    getUserEmail() {
        return this._userEmail;
    }

    /**
     * Get subscription info
     */
    getSubscription() {
        return this._subscription;
    }

    /**
     * Check if authenticated
     */
    isAuthenticated() {
        return !!(this._apiKey && this._userEmail);
    }
}

// Primary export - must be the class itself
module.exports = AuthManager;

// Secondary named export for enterprise features (backward compatibility)
module.exports.EnhancedAuthManager = AuthManager;
module.exports.AuthManager = AuthManager; // Explicit named export
