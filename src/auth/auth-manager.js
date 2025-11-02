const vscode = require('vscode');
const axios = require('axios');

/**
 * AuthManager - Full API-based authentication with OAuth-like flow
 * Implements complete authentication, subscription validation, and renewal detection
 */
class AuthManager {
    constructor(context) {
        this._context = context;
        this._isAuthenticated = false;
        this.currentUser = null;
        this.sessionToken = null;
        this.onAuthSuccess = null;
        this._webview = null; // Webview reference for sending updates

        // API configuration
        const config = vscode.workspace.getConfiguration('oropendola');
        this.apiUrl = config.get('api.url', 'https://oropendola.ai');

        // Polling intervals
        this.authPollInterval = 2000; // 2 seconds
        this.subscriptionPollInterval = 5 * 60 * 1000; // 5 minutes (slow poll)
        this.fastPollInterval = 10 * 1000; // 10 seconds (fast poll when waiting for subscription)
        this.subscriptionPollTimer = null;
        this.isFastPolling = false;

        // Last subscription check timestamp
        this.lastSubscriptionCheck = null;

        // Refresh protection
        this._isRefreshing = false;
        this._refreshAttempts = 0;
        this._maxRefreshAttempts = 3;
    }

    /**
     * Set callback for successful authentication
     */
    setAuthSuccessCallback(callback) {
        this.onAuthSuccess = callback;
    }

    /**
     * Set webview reference for sending subscription updates
     */
    setWebview(webview) {
        this._webview = webview;
        console.log('📺 Webview reference set for subscription updates');
    }

    /**
     * Authenticate user using OAuth-like flow
     * Opens browser to https://oropendola.ai/login for authentication
     */
    async authenticate() {
        try {
            // Check if already authenticated
            if (this._isAuthenticated) {
                return true;
            }

            console.log('🔐 Starting OAuth-like authentication flow');

            // Step 1: Initiate authentication
            const initResponse = await axios.get(
                `${this.apiUrl}/api/method/oropendola_ai.oropendola_ai.api.vscode_auth.initiate_auth`,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Oropendola-VSCode-Extension/3.12.0'
                    }
                }
            );

            if (!initResponse.data?.message?.success) {
                throw new Error('Failed to initiate authentication');
            }

            const { auth_request_id, login_url, poll_interval } = initResponse.data.message;
            this.authPollInterval = (poll_interval || 2) * 1000;

            console.log(`✅ Auth request created: ${auth_request_id}`);
            console.log(`🌐 Opening browser: ${login_url}`);

            // Step 2: Open browser for login
            const browserOpened = await vscode.env.openExternal(vscode.Uri.parse(login_url));

            if (!browserOpened) {
                console.warn('⚠️ Failed to open browser automatically');
            }

            console.log('🔐 Waiting for login completion in browser...');

            // Step 3: Poll for completion without notification
            const success = await this.pollForAuthCompletion(auth_request_id);

            if (success) {
                // Start subscription polling
                this.startSubscriptionPolling();

                // Call success callback
                if (this.onAuthSuccess) {
                    this.onAuthSuccess();
                }
            }

            return success;

        } catch (error) {
            console.error('❌ Authentication error:', error);

            // Check if we have stored authentication as fallback
            const hasStoredAuth = await this.checkAuthentication();
            if (hasStoredAuth) {
                console.log('✅ Using stored authentication credentials from previous session');

                // Show info message that we're using cached credentials
                if (error.response?.status === 403) {
                    vscode.window.showInformationMessage(
                        '✅ Signed in using cached credentials. (Backend authentication endpoint temporarily unavailable)'
                    );
                } else {
                    vscode.window.showInformationMessage('✅ Signed in using cached credentials.');
                }

                // Call success callback since we are authenticated
                if (this.onAuthSuccess) {
                    this.onAuthSuccess();
                }

                return true;
            }

            let errorMessage = 'Authentication failed';
            if (error.response?.status === 403) {
                errorMessage = 'Access denied by server. Please contact support if this persists.';
                console.error('🔒 Backend returned 403 for initiate_auth endpoint - possible CORS, rate limiting, or API configuration issue');
            } else if (error.response?.data?.message?.error) {
                errorMessage = error.response.data.message.error;
            } else if (error.message) {
                errorMessage = error.message;
            }

            vscode.window.showErrorMessage(`❌ ${errorMessage}`);
            return false;
        }
    }

    /**
     * Poll for authentication completion
     */
    async pollForAuthCompletion(authRequestId, cancellationToken = null) {
        const maxAttempts = 150; // 5 minutes with 2s interval
        let attempts = 0;

        console.log(`🔄 Starting authentication polling (auth_request_id: ${authRequestId})`);

        while (attempts < maxAttempts && !(cancellationToken?.isCancellationRequested)) {
            try {
                const statusResponse = await axios.get(
                    `${this.apiUrl}/api/method/oropendola_ai.oropendola_ai.api.vscode_auth.check_auth_status`,
                    {
                        params: { auth_request_id: authRequestId }
                    }
                );

                const result = statusResponse.data.message;

                // Log status every 10 attempts (every 20 seconds)
                if (attempts % 10 === 0) {
                    console.log(`🔄 Polling attempt ${attempts}/${maxAttempts} - Status: ${result.status}`);
                }

                if (result.status === 'completed') {
                    console.log(`✅ Authentication completed - processing tokens...`);
                    // Store tokens securely
                    await this._context.secrets.store('oropendola_access_token', result.access_token);
                    await this._context.secrets.store('oropendola_refresh_token', result.refresh_token);

                    // Store user info
                    const config = vscode.workspace.getConfiguration('oropendola');
                    await config.update('user.email', result.user.email, vscode.ConfigurationTarget.Global);

                    // Update internal state
                    this._isAuthenticated = true;
                    this.sessionToken = result.access_token;
                    this.currentUser = {
                        email: result.user.email,
                        name: result.user.full_name,
                        image: result.user.user_image,
                        accessToken: result.access_token,
                        refreshToken: result.refresh_token
                    };

                    console.log(`✅ Authentication successful for ${result.user.email}`);

                    // Check subscription immediately
                    await this.checkSubscription();

                    return true;
                }

                if (result.status === 'expired') {
                    vscode.window.showErrorMessage('❌ Login timeout. Please try again.');
                    return false;
                }

                // Status is 'pending', continue polling
                await new Promise(resolve => setTimeout(resolve, this.authPollInterval));
                attempts++;

            } catch (error) {
                console.error('Polling error:', error);

                // If we get 403 errors during polling, the backend is blocking the endpoint
                if (error.response?.status === 403) {
                    console.error('🔒 Backend check_auth_status endpoint blocked with 403');
                    console.error('🔧 This is a backend configuration issue that needs to be resolved');

                    // After 10 consecutive 403 errors, give up and notify user
                    attempts++;
                    if (attempts >= 10) {
                        vscode.window.showErrorMessage(
                            '❌ Authentication polling blocked by server (403). Please contact support or check your firewall/VPN settings.',
                            'Check Authentication'
                        ).then(selection => {
                            if (selection === 'Check Authentication') {
                                // Try to check if we have stored credentials
                                this.checkAuthentication();
                            }
                        });
                        return false;
                    }
                } else {
                    attempts++;
                }

                await new Promise(resolve => setTimeout(resolve, this.authPollInterval));
            }
        }

        if (cancellationToken?.isCancellationRequested) {
            console.log('❌ Login cancelled by user');
        } else {
            console.log('❌ Login timeout. Please try again.');
        }

        return false;
    }

    /**
     * Check subscription status
     */
    async checkSubscription() {
        try {
            // Safety check: ensure context is available
            if (!this._context || !this._context.secrets) {
                console.log('⚠️ No access token found');
                return null;
            }

            const accessToken = await this._context.secrets.get('oropendola_access_token');

            if (!accessToken) {
                console.log('⚠️ No access token found');
                return null;
            }

            console.log('🔍 [SUBSCRIPTION] Fetching subscription from API...');
            const response = await axios.get(
                `${this.apiUrl}/api/method/oropendola_ai.oropendola_ai.api.vscode_auth.get_subscription_status`,
                {
                    headers: {
                        'X-Access-Token': accessToken,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('🔍 [SUBSCRIPTION] API response received:', {
                hasMessage: !!response.data.message,
                hasSubscription: !!response.data.message?.subscription
            });

            const subscription = response.data.message.subscription;

            if (!subscription) {
                console.log('ℹ️ [SUBSCRIPTION] No active subscription found in API response');
                this.showSubscriptionPrompt('no_subscription');
                return null;
            }

            console.log('🔍 [SUBSCRIPTION] Raw subscription from API:', {
                status: subscription.status,
                is_active: subscription.is_active,
                plan_name: subscription.plan_name,
                end_date: subscription.end_date
            });

            // Ensure is_active field is set based on status
            if (subscription.is_active === undefined) {
                subscription.is_active = subscription.status === 'Active' || subscription.status === 'Trial';
                console.log(`🔧 [SUBSCRIPTION] Computed is_active from status: ${subscription.status} → ${subscription.is_active}`);
            }

            // Set is_trial field
            if (subscription.is_trial === undefined) {
                subscription.is_trial = subscription.status === 'Trial';
                console.log(`🔧 [SUBSCRIPTION] Computed is_trial from status: ${subscription.status} → ${subscription.is_trial}`);
            }

            console.log(`✅ [SUBSCRIPTION] Final subscription data:`, {
                status: subscription.status,
                is_active: subscription.is_active,
                is_trial: subscription.is_trial,
                plan_name: subscription.plan_name
            });

            // Store subscription in currentUser
            if (this.currentUser) {
                this.currentUser.subscription = subscription;
            }

            // Handle different subscription states
            if (subscription.status === 'Expired') {
                this.showSubscriptionPrompt('expired', subscription);
            } else if (subscription.status === 'Active' || subscription.status === 'Trial') {
                this.updateStatusBar(subscription);
            } else if (subscription.status === 'Pending') {
                vscode.window.showInformationMessage(
                    '⏳ Payment pending. Your subscription will be activated once payment is confirmed.'
                );
            }

            return subscription;

        } catch (error) {
            if (error.response?.status === 403) {
                console.log('🔒 Access forbidden (403) during subscription check - token may be invalid');
                // Clear stored tokens since they're invalid
                await this.logout();
                throw new Error('Your session has expired or is invalid. Please sign in again.');
            } else if (error.response?.status === 401) {
                console.log('🔄 Access token expired, refreshing...');
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    // Don't retry recursively to avoid infinite loops
                    // The next API call will use the refreshed token
                    console.log('✅ Token refreshed, subscription check will retry on next call');
                } else {
                    // Refresh failed, need to re-authenticate
                    console.log('❌ Token refresh failed, logging out...');
                    await this.logout();
                }
            } else {
                console.error('❌ Subscription check error:', error);
            }
            return null;
        }
    }

    /**
     * Poll for subscription changes
     */
    async pollSubscriptionChanges() {
        try {
            // Safety check: ensure context is available
            if (!this._context || !this._context.secrets) {
                return;
            }

            const accessToken = await this._context.secrets.get('oropendola_access_token');

            if (!accessToken) {
                return;
            }

            // Fetch current subscription status
            const subscription = await this.checkSubscription();

            // Check if subscription just became active
            const wasInactive = this.currentUser?.subscription && !this.currentUser.subscription.is_active;
            const isNowActive = subscription && subscription.is_active;

            if (wasInactive && isNowActive) {
                console.log('🎉 Subscription activated! Notifying webview...');

                // Update subscription in currentUser
                if (this.currentUser) {
                    this.currentUser.subscription = subscription;
                }

                // Send update to webview to switch from Subscribe Now to Chat
                if (this._webview) {
                    this._webview.postMessage({
                        type: 'subscriptionActivated',
                        subscription: subscription
                    });
                }

                // Update UI
                this.updateStatusBar(subscription);

                // Show notification
                vscode.window.showInformationMessage(
                    `🎉 Subscription activated! Welcome to Oropendola AI.`
                );

                // Switch to slow polling now that subscription is active
                if (this.isFastPolling) {
                    this.startSubscriptionPolling(); // Switch back to slow poll
                }
            } else if (subscription) {
                // Update subscription in currentUser
                if (this.currentUser) {
                    this.currentUser.subscription = subscription;
                }

                // Send update to webview
                if (this._webview) {
                    this._webview.postMessage({
                        type: 'accountData',
                        data: {
                            ...this.currentUser,
                            subscription: subscription
                        }
                    });
                }
            }

            this.lastSubscriptionCheck = new Date().toISOString();

        } catch (error) {
            if (error.response?.status === 403) {
                console.log('🔒 Access forbidden (403) during subscription polling - clearing session');
                await this.logout();
            } else if (error.response?.status === 401) {
                await this.refreshToken();
            } else {
                console.error('❌ Subscription polling error:', error);
            }
        }
    }

    /**
     * Start subscription polling (slow - every 5 minutes)
     */
    startSubscriptionPolling() {
        // Clear existing timer
        if (this.subscriptionPollTimer) {
            clearInterval(this.subscriptionPollTimer);
        }

        // Poll every 5 minutes
        this.subscriptionPollTimer = setInterval(
            () => this.pollSubscriptionChanges(),
            this.subscriptionPollInterval
        );

        this.isFastPolling = false;
        console.log('✅ Subscription polling started (every 5 minutes)');
    }

    /**
     * Start fast subscription polling (every 10 seconds)
     * Used when waiting for subscription activation
     */
    startFastSubscriptionPolling() {
        // Clear existing timer
        if (this.subscriptionPollTimer) {
            clearInterval(this.subscriptionPollTimer);
        }

        // Poll every 10 seconds
        this.subscriptionPollTimer = setInterval(
            () => this.pollSubscriptionChanges(),
            this.fastPollInterval
        );

        this.isFastPolling = true;
        console.log('🚀 Fast subscription polling started (every 10 seconds)');

        // Do an immediate check
        this.pollSubscriptionChanges();
    }

    /**
     * Stop subscription polling
     */
    stopSubscriptionPolling() {
        if (this.subscriptionPollTimer) {
            clearInterval(this.subscriptionPollTimer);
            this.subscriptionPollTimer = null;
            console.log('🛑 Subscription polling stopped');
        }
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshToken() {
        try {
            // Prevent concurrent refresh attempts
            if (this._isRefreshing) {
                console.log('⏳ Token refresh already in progress, waiting...');
                // Wait for ongoing refresh to complete
                await new Promise(resolve => setTimeout(resolve, 1000));
                return this._isAuthenticated;
            }

            // Check max attempts
            if (this._refreshAttempts >= this._maxRefreshAttempts) {
                console.log('❌ Max refresh attempts reached, need re-authentication');
                this._refreshAttempts = 0;
                await this.logout();
                return false;
            }

            this._isRefreshing = true;
            this._refreshAttempts++;

            // Safety check: ensure context is available
            if (!this._context || !this._context.secrets) {
                console.log('❌ No refresh token found');
                this._isRefreshing = false;
                return false;
            }

            const refreshToken = await this._context.secrets.get('oropendola_refresh_token');

            if (!refreshToken) {
                console.log('❌ No refresh token found');
                this._isRefreshing = false;
                return false;
            }

            console.log(`🔄 Refreshing access token... (attempt ${this._refreshAttempts}/${this._maxRefreshAttempts})`);

            const response = await axios.post(
                `${this.apiUrl}/api/method/oropendola_ai.oropendola_ai.api.vscode_auth.refresh_token`,
                { refresh_token: refreshToken },
                {
                    headers: { 'Content-Type': 'application/json' }
                }
            );

            const { access_token } = response.data.message;

            console.log(`🔧 New access token (first 20 chars): ${access_token.substring(0, 20)}...`);

            // Store new access token
            await this._context.secrets.store('oropendola_access_token', access_token);

            // Small delay to ensure token is fully persisted
            await new Promise(resolve => setTimeout(resolve, 100));

            // Update internal state
            this.sessionToken = access_token;
            if (this.currentUser) {
                this.currentUser.accessToken = access_token;
            }

            console.log('✅ Access token refreshed successfully');

            // Reset attempts on success
            this._refreshAttempts = 0;
            this._isRefreshing = false;

            return true;

        } catch (error) {
            console.error('❌ Token refresh failed:', error);
            this._isRefreshing = false;

            // If refresh failed due to invalid/revoked tokens, logout
            if (error.response?.status === 403 || error.response?.status === 401) {
                console.log('❌ Refresh token invalid or forbidden, logging out...');
                await this.logout();
            }

            return false;
        }
    }

    /**
     * Show subscription prompt based on status
     */
    showSubscriptionPrompt(type, subscription = null) {
        // NOTE: Native VS Code warning notification disabled in favor of webview SubscriptionBanner component
        // The SubscriptionBanner in the webview will display subscription/trial expiration warnings
        // This provides a better, more integrated user experience

        let message;

        switch (type) {
            case 'no_subscription':
                message = 'No active subscription detected';
                break;

            case 'expired':
                const expiredDays = subscription?.expired_days_ago || 0;
                message = `Subscription expired ${expiredDays} day(s) ago`;
                break;

            default:
                return;
        }

        // Just log - the webview banner will handle the display
        console.log(`⚠️ ${message} - displayed in webview banner`);

        // Native warning disabled - webview banner is used instead
        // vscode.window.showWarningMessage(message, action, 'Dismiss').then(selection => {
        //     if (selection === action) {
        //         vscode.env.openExternal(vscode.Uri.parse(url));
        //     }
        // });
    }

    /**
     * Update status bar with subscription info
     */
    updateStatusBar(subscription) {
        // This will be implemented by the extension's status bar manager
        // For now, just log
        console.log(`📊 Subscription: ${subscription.plan_name} (${subscription.status})`);
        if (subscription.quota) {
            console.log(`📊 Quota: ${subscription.quota.daily_remaining}/${subscription.quota.daily_limit} remaining`);
        }
    }

    /**
     * Get complete profile data including subscription, usage, and analytics
     */
    async getMyProfile(retryCount = 0) {
        try {
            // Safety check: ensure context is available
            if (!this._context || !this._context.secrets) {
                throw new Error('Not authenticated - context not available');
            }

            const accessToken = await this._context.secrets.get('oropendola_access_token');

            if (!accessToken) {
                throw new Error('Not authenticated');
            }

            console.log(`🔧 getMyProfile using token (first 20 chars): ${accessToken.substring(0, 20)}... (retry count: ${retryCount})`);

            const response = await axios.get(
                `${this.apiUrl}/api/method/oropendola_ai.oropendola_ai.api.vscode_auth.get_my_profile`,
                {
                    headers: {
                        'X-Access-Token': accessToken,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data?.message) {
                return response.data.message;
            }

            throw new Error('Invalid response from server');

        } catch (error) {
            // Handle 403 Forbidden - token is invalid/revoked
            if (error.response?.status === 403) {
                console.log('🔒 Access forbidden (403) - token may be invalid or revoked');
                // Clear stored tokens since they're invalid
                await this.logout();
                throw new Error('Your session has expired or is invalid. Please sign in again.');
            }

            // Prevent infinite retry loops
            if (error.response?.status === 401 && retryCount === 0) {
                console.log('🔄 Token expired during getMyProfile, attempting refresh...');
                // Try to refresh token only once
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    console.log('✅ Token refreshed, retrying getMyProfile...');
                    // Small delay before retry to ensure token propagation
                    await new Promise(resolve => setTimeout(resolve, 200));
                    // Retry with incremented count
                    return await this.getMyProfile(1);
                }
            }

            console.error('❌ Failed to fetch profile:', error);
            // Provide user-friendly error message
            if (error.message) {
                throw new Error(error.message);
            }
            throw error;
        }
    }

    /**
     * Check authentication state from stored tokens
     */
    async checkAuthentication() {
        try {
            // Safety check: ensure context is available
            if (!this._context || !this._context.secrets) {
                console.log('ℹ️ No stored authentication found');
                return false;
            }

            const accessToken = await this._context.secrets.get('oropendola_access_token');
            const config = vscode.workspace.getConfiguration('oropendola');
            const userEmail = config.get('user.email');

            if (accessToken && userEmail) {
                this._isAuthenticated = true;
                this.sessionToken = accessToken;
                this.currentUser = {
                    email: userEmail,
                    accessToken: accessToken
                };

                console.log('✅ Authentication state restored from storage');

                // Start polling (subscription will be checked by polling)
                this.startSubscriptionPolling();

                // Note: We don't call checkSubscription() here to avoid triggering
                // an immediate refresh loop on startup. The subscription check will
                // happen when the user interacts with the extension or via polling.

                return true;
            }

            console.log('ℹ️ No stored authentication found');
            return false;

        } catch (error) {
            console.error('❌ Authentication check failed:', error);
            return false;
        }
    }

    /**
     * Logout user and clear all tokens
     */
    async logout() {
        try {
            // Safety check: ensure context is available
            if (!this._context || !this._context.secrets) {
                console.log('✅ Logged out successfully');
                return;
            }

            const accessToken = await this._context.secrets.get('oropendola_access_token');

            // Call logout API if we have a token
            if (accessToken) {
                try {
                    await axios.post(
                        `${this.apiUrl}/api/method/oropendola_ai.oropendola_ai.api.vscode_auth.logout`,
                        {},
                        {
                            headers: {
                                'X-Access-Token': accessToken,
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                } catch (error) {
                    console.error('Logout API error:', error);
                    // Continue with local logout even if API call fails
                }
            }

            // Clear tokens
            await this._context.secrets.delete('oropendola_access_token');
            await this._context.secrets.delete('oropendola_refresh_token');

            // Clear config
            const config = vscode.workspace.getConfiguration('oropendola');
            await config.update('user.email', undefined, vscode.ConfigurationTarget.Global);
            await config.update('api.key', undefined, vscode.ConfigurationTarget.Global);
            await config.update('api.secret', undefined, vscode.ConfigurationTarget.Global);

            // Stop polling
            this.stopSubscriptionPolling();

            // Clear internal state
            this._isAuthenticated = false;
            this.currentUser = null;
            this.sessionToken = null;

            console.log('✅ Logged out successfully');

        } catch (error) {
            console.error('❌ Logout error:', error);
        }
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this._isAuthenticated === true;
    }

    /**
     * Get user email
     */
    getUserEmail() {
        return this.currentUser?.email || null;
    }

    /**
     * Get API key (for backward compatibility)
     */
    getApiKey() {
        return this.sessionToken;
    }

    /**
     * Get subscription info
     */
    getSubscription() {
        return this.currentUser?.subscription || null;
    }

    /**
     * Initiate OAuth flow (compatibility method)
     */
    async initiate() {
        const success = await this.authenticate();

        if (success) {
            return {
                authUrl: `${this.apiUrl}/login`,
                sessionToken: this.sessionToken,
                expiresIn: 0
            };
        }

        return {
            authUrl: null,
            sessionToken: null,
            expiresIn: 0
        };
    }

    /**
     * Load authentication state from storage
     */
    async loadFromStorage() {
        const isAuthenticated = await this.checkAuthentication();

        return {
            authenticated: isAuthenticated,
            apiKey: this.sessionToken,
            userEmail: this.currentUser?.email
        };
    }

    /**
     * Extract email from cookies (legacy compatibility)
     */
    _extractEmailFromCookies(cookies) {
        if (!cookies) return null;

        const match = cookies.match(/user_id=([^;]+)/);
        if (match) {
            return decodeURIComponent(match[1]);
        }

        return null;
    }
}

module.exports = AuthManager;
