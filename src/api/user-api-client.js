// User API Client for Oropendola
// Handles user-specific operations: API key management, subscription info
// Base: https://oropendola.ai/api/method/oropendola_ai.oropendola_ai.api.user_api

const https = require('https');
const { URL } = require('url');

class UserAPIClient {
    constructor() {
        this.baseUrl = 'https://oropendola.ai/api/method/oropendola_ai.oropendola_ai.api.user_api';
        this.sessionCookies = null;
    }

    /**
     * Update session cookies (called after login)
     * @param {Object|null} cookies - Session cookies from login
     */
    updateSessionCookies(cookies) {
        this.sessionCookies = cookies;
    }

    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    isAuthenticated() {
        return !!(this.sessionCookies && this.sessionCookies.sid);
    }

    /**
     * Make HTTP request to User API
     * @private
     * @param {string} endpoint - API endpoint (e.g., '.get_my_api_key')
     * @param {string} method - HTTP method
     * @returns {Promise<Object>}
     */
    _makeRequest(endpoint, method = 'POST') {
        return new Promise((resolve, reject) => {
            if (!this.isAuthenticated()) {
                return reject(new Error('Not authenticated. Please sign in first.'));
            }

            const url = new URL(`${this.baseUrl}${endpoint}`);
            
            // Build cookie string from session cookies
            const cookieString = Object.entries(this.sessionCookies)
                .map(([key, value]) => `${key}=${value}`)
                .join('; ');

            const options = {
                method: method,
                headers: {
                    'Cookie': cookieString,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            };

            const req = https.request(url, options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);
                        
                        if (res.statusCode === 200) {
                            resolve(jsonData);
                        } else {
                            reject(new Error(jsonData.error || jsonData.message || `HTTP ${res.statusCode}`));
                        }
                    } catch (error) {
                        reject(new Error(`Failed to parse response: ${error.message}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error(`Request failed: ${error.message}`));
            });

            req.end();
        });
    }

    /**
     * Get user's API key
     * First time: returns actual API key (store securely!)
     * Subsequent calls: returns prefix only
     * @returns {Promise<Object>}
     * @example
     * {
     *   success: true,
     *   api_key: "xyz789abc123...", // or null if already retrieved
     *   api_key_prefix: "xyz789ab",
     *   subscription_id: "SUB-2025-00001",
     *   plan: "free",
     *   status: "Active",
     *   warning: "⚠️ Store it securely - it will not be shown again!",
     *   message: "API key already retrieved..." // if api_key is null
     * }
     */
    async getMyAPIKey() {
        return this._makeRequest('.get_my_api_key');
    }

    /**
     * Get user's subscription details
     * @returns {Promise<Object>}
     * @example
     * {
     *   success: true,
     *   subscription: {
     *     id: "SUB-2025-00001",
     *     plan_id: "free",
     *     plan_title: "Free Plan",
     *     status: "Active",
     *     start_date: "2025-10-27",
     *     end_date: null,
     *     daily_quota: { limit: 100, remaining: 85 },
     *     monthly_budget: { limit: 500, used: 120, remaining: 380 }
     *   }
     * }
     */
    async getMySubscription() {
        return this._makeRequest('.get_my_subscription');
    }

    /**
     * Regenerate API key
     * WARNING: This revokes the old API key!
     * @returns {Promise<Object>}
     * @example
     * {
     *   success: true,
     *   api_key: "new_key_abc123...",
     *   api_key_prefix: "new_key_",
     *   warning: "⚠️ Store this securely!"
     * }
     */
    async regenerateAPIKey() {
        return this._makeRequest('.regenerate_api_key');
    }

    /**
     * Get complete user profile (combines subscription + API key info)
     * @returns {Promise<Object>}
     */
    async getUserProfile() {
        try {
            const [subscriptionData, apiKeyData] = await Promise.all([
                this.getMySubscription(),
                this.getMyAPIKey()
            ]);

            return {
                success: true,
                subscription: subscriptionData.subscription,
                apiKey: {
                    available: !!apiKeyData.api_key,
                    prefix: apiKeyData.api_key_prefix,
                    fullKey: apiKeyData.api_key, // null if already retrieved
                    message: apiKeyData.message,
                    warning: apiKeyData.warning
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Singleton instance
const userAPIClient = new UserAPIClient();

module.exports = userAPIClient;
