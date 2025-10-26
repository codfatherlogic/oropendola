const axios = require('axios');

/**
 * Oropendola AI Provider with real-time streaming
 * Supports GPT-4, Claude, Gemini, and local models
 */
class OropendolaProvider {
    constructor(config) {
        this.apiUrl = config.apiUrl || 'https://oropendola.ai';
        this.apiKey = config.apiKey;
        this.apiSecret = config.apiSecret;
        this.modelPreference = config.modelPreference || 'auto';
        this.temperature = config.temperature || 0.7;
        this.maxTokens = config.maxTokens || 4096;

        // Subscription status
        this.subscriptionStatus = null;
        this.remainingRequests = null;

        // Validate configuration
        if (!this.apiKey || !this.apiSecret) {
            throw new Error('Oropendola API credentials not configured');
        }
    }

    /**
     * Send chat message with streaming support
     * @param {string} message - User message
     * @param {Object} context - Conversation context
     * @param {Function} onToken - Callback for each token received
     * @returns {Promise<string>} Complete AI response
     */
    async chat(message, context = {}, onToken = null) {
        const endpoint = `${this.apiUrl}/api/method/ai_assistant.api.streaming_chat_completion`;

        // Get mode context from mode manager if available
        let modeContext = { mode: 'code', mode_settings: {} };
        if (this.modeManager) {
            const apiContext = require('../../core/modes').ModeIntegrationService.prepareApiContext(this.modeManager);
            modeContext = {
                mode: apiContext.mode,
                mode_settings: apiContext.modeSettings
            };
        }

        // Override with explicitly provided context
        if (context.mode) {
            modeContext.mode = context.mode;
        }
        if (context.modeSettings) {
            modeContext.mode_settings = context.modeSettings;
        }

        const requestBody = {
            message: this.buildPromptWithContext(message, context),
            stream: !!onToken,
            model_preference: this.modelPreference,
            temperature: this.temperature,
            max_tokens: this.maxTokens,
            // Add mode context
            mode: modeContext.mode,
            mode_settings: modeContext.mode_settings
        };

        try {
            if (onToken) {
                // Streaming response
                return await this.streamingRequest(endpoint, requestBody, onToken);
            } else {
                // Non-streaming response
                return await this.nonStreamingRequest(endpoint, requestBody);
            }
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Make streaming API request
     * @param {string} endpoint - API endpoint
     * @param {Object} requestBody - Request payload
     * @param {Function} onToken - Token callback
     * @returns {Promise<string>} Complete response
     */
    streamingRequest(endpoint, requestBody, onToken) {
        return new Promise((resolve, reject) => {
            let fullResponse = '';

            axios({
                method: 'POST',
                url: endpoint,
                data: requestBody,
                headers: this.getHeaders(),
                responseType: 'stream',
                timeout: 60000
            }).then(response => {

                response.data.on('data', chunk => {
                    const chunkStr = chunk.toString();
                    const lines = chunkStr.split('\n').filter(line => line.trim());

                    for (const line of lines) {
                        try {
                            // Handle SSE format
                            if (line.startsWith('data: ')) {
                                const jsonStr = line.substring(6);

                                if (jsonStr === '[DONE]') {
                                    continue;
                                }

                                const data = JSON.parse(jsonStr);

                                // Extract token from response
                                let token = '';
                                if (data.choices?.[0]?.delta?.content) {
                                    token = data.choices[0].delta.content;
                                } else if (data.token) {
                                    token = data.token;
                                } else if (data.content) {
                                    token = data.content;
                                }

                                if (token) {
                                    fullResponse += token;
                                    onToken(token);
                                }

                                // Update subscription info if provided
                                if (data.remaining_requests !== undefined) {
                                    this.remainingRequests = data.remaining_requests;
                                    this.updateStatusBar();
                                }
                            }
                        } catch (parseError) {
                            console.error('Error parsing chunk:', parseError);
                        }
                    }
                });

                response.data.on('end', () => {
                    resolve(fullResponse);
                });

                response.data.on('error', error => {
                    reject(error);
                });

            }).catch(error => {
                // Enhance error messages for common network issues
                if (error.code === 'ENOTFOUND') {
                    reject(new Error(`Cannot connect to ${this.apiUrl}. Please check your network connection and API URL configuration.`));
                } else if (error.code === 'ETIMEDOUT') {
                    reject(new Error('Request timed out. The backend may be experiencing issues. Please try again or contact support.'));
                } else if (error.code === 'ECONNREFUSED') {
                    reject(new Error('Connection refused. The Oropendola backend may be offline.'));
                } else {
                    reject(error);
                }
            });
        });
    }

    /**
     * Make non-streaming API request
     * @param {string} endpoint - API endpoint
     * @param {Object} requestBody - Request payload
     * @returns {Promise<string>} AI response
     */
    async nonStreamingRequest(endpoint, requestBody) {
        const response = await axios.post(
            endpoint,
            { ...requestBody, stream: false },
            {
                headers: this.getHeaders(),
                timeout: 60000,
                validateStatus: status => status < 500
            }
        );

        // Update subscription info
        if (response.data.remaining_requests !== undefined) {
            this.remainingRequests = response.data.remaining_requests;
            this.updateStatusBar();
        }

        // Extract response content
        if (response.data.message) {
            return response.data.message;
        } else if (response.data.choices?.[0]?.message?.content) {
            return response.data.choices[0].message.content;
        } else if (response.data.content) {
            return response.data.content;
        } else {
            return JSON.stringify(response.data);
        }
    }

    /**
     * Build prompt with context
     * @param {string} message - User message
     * @param {Object} context - Context information
     * @returns {string} Enhanced prompt
     */
    buildPromptWithContext(message, context) {
        let prompt = message;

        // Add context information
        const contextParts = [];

        if (context.workspace) {
            contextParts.push(`Workspace: ${context.workspace}`);
        }

        if (context.activeFile) {
            contextParts.push(`Active File: ${context.activeFile.path} (${context.activeFile.language})`);

            if (context.activeFile.content) {
                const content = context.activeFile.content.length > 3000
                    ? context.activeFile.content.substring(0, 3000) + '\n...[truncated]'
                    : context.activeFile.content;
                contextParts.push(`
File Content:
\`\`\`${context.activeFile.language}
${content}
\`\`\``);
            }
        }

        if (context.selection) {
            contextParts.push(`
Selected Code:
\`\`\`
${context.selection}
\`\`\``);
        }

        if (contextParts.length > 0) {
            prompt = `${contextParts.join('\n\n')}\n\n---\n\nQuestion: ${message}`;
        }

        return prompt;
    }

    /**
     * Get request headers with authentication
     * @returns {Object} Headers object
     */
    getHeaders() {
        return {
            'Authorization': `token ${this.apiKey}:${this.apiSecret}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Oropendola-VSCode/1.0.0'
        };
    }

    /**
     * Check subscription status
     * @returns {Promise<Object>} Subscription information
     */
    async checkSubscription() {
        const maxRetries = 2;
        const timeout = 5000; // 5 second timeout

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔍 Checking subscription (attempt ${attempt}/${maxRetries})...`);

                const response = await axios.get(
                    `${this.apiUrl}/api/method/ai_assistant.api.subscription_status`,
                    {
                        headers: this.getHeaders(),
                        timeout,
                        validateStatus: status => status < 500 // Don't throw on 4xx errors
                    }
                );

                this.subscriptionStatus = response.data;
                this.remainingRequests = response.data.remaining_requests;

                return {
                    tier: response.data.tier || 'unknown',
                    remainingRequests: response.data.remaining_requests,
                    totalRequests: response.data.total_requests,
                    expiresAt: response.data.expires_at,
                    isActive: response.data.is_active
                };
            } catch (error) {
                const isLastAttempt = attempt === maxRetries;
                const isNetworkError = error.code === 'ENOTFOUND' ||
                                      error.code === 'ETIMEDOUT' ||
                                      error.code === 'ECONNREFUSED' ||
                                      error.code === 'ECONNRESET';

                console.warn(`⚠️ Subscription check attempt ${attempt} failed: ${error.message}`);

                if (isLastAttempt) {
                    // On final attempt, throw a user-friendly error
                    if (isNetworkError) {
                        throw new Error(`Network issue detected. Cannot reach ${this.apiUrl}. Please check your internet connection and firewall settings.`);
                    } else if (error.response?.status === 401) {
                        throw new Error('Authentication failed. Please sign in again.');
                    } else if (error.response?.status === 402) {
                        throw new Error('Subscription expired or request limit reached.');
                    } else {
                        throw new Error(`Failed to check subscription: ${error.message}`);
                    }
                }

                // Wait before retry (exponential backoff)
                const waitTime = attempt * 1000;
                console.log(`⏳ Network issue detected. Retrying in ${waitTime/1000}s... (attempt ${attempt})`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }

    /**
     * Update status bar with subscription info
     */
    updateStatusBar() {
        if (this.statusBarItem && this.remainingRequests !== null) {
            const percentage = this.subscriptionStatus?.total_requests
                ? (this.remainingRequests / this.subscriptionStatus.total_requests) * 100
                : 100;

            let icon = '🟢';
            if (percentage < 10) {
                icon = '🔴';
            } else if (percentage < 30) {
                icon = '🟡';
            }

            this.statusBarItem.text = `${icon} Oropendola: ${this.remainingRequests} requests`;
            this.statusBarItem.tooltip = `${this.remainingRequests} requests remaining\nTier: ${this.subscriptionStatus?.tier || 'Unknown'}`;
            this.statusBarItem.show();
        }
    }

    /**
     * Set status bar item reference
     * @param {vscode.StatusBarItem} statusBarItem - Status bar item
     */
    setStatusBarItem(statusBarItem) {
        this.statusBarItem = statusBarItem;
    }

    /**
     * Set mode manager for mode-aware requests
     * @param {ModeManager} modeManager - Mode manager instance
     */
    setModeManager(modeManager) {
        this.modeManager = modeManager;
    }

    /**
     * Handle API errors
     * @param {Error} error - Error object
     * @returns {Error} Formatted error
     */
    handleError(error) {
        if (error.response) {
            const status = error.response.status;
            const data = error.response.data;

            if (status === 401) {
                return new Error('Invalid API credentials. Please check your API key and secret.');
            } else if (status === 402) {
                return new Error('Subscription expired or request limit reached. Please upgrade your plan.');
            } else if (status === 429) {
                return new Error('Rate limit exceeded. Please try again later.');
            } else if (status === 503) {
                return new Error('AI service temporarily unavailable. Trying fallback model...');
            } else {
                return new Error(data?.message || data?.error || 'API request failed');
            }
        } else if (error.request) {
            return new Error('Network error. Please check your internet connection.');
        } else {
            return new Error(error.message || 'Unknown error occurred');
        }
    }

    /**
     * Get available models
     * @returns {Array<string>} Available models
     */
    getAvailableModels() {
        return ['auto', 'gpt', 'claude', 'gemini', 'local'];
    }

    /**
     * Set model preference
     * @param {string} model - Model preference
     */
    setModelPreference(model) {
        if (this.getAvailableModels().includes(model)) {
            this.modelPreference = model;
        } else {
            throw new Error(`Invalid model: ${model}`);
        }
    }

    /**
     * Get provider capabilities
     * @returns {Object}
     */
    get supportsStreaming() {
        return true;
    }

    /**
     * Get model information
     * @returns {Object}
     */
    get modelInfo() {
        return {
            provider: 'oropendola',
            model: this.modelPreference,
            maxTokens: this.maxTokens,
            temperature: this.temperature,
            streaming: true,
            remainingRequests: this.remainingRequests
        };
    }

    /**
     * Fast completion endpoint for autocomplete
     * Optimized for speed with lower temperature and smaller token limits
     * @param {string} prompt - Code completion prompt
     * @param {Object} options - Completion options
     * @returns {Promise<string>} Completion text
     */
    async complete(prompt, options = {}) {
        const endpoint = `${this.apiUrl}/api/method/ai_assistant.api.chat_completion`;

        const requestBody = {
            message: prompt,
            stream: false,
            model_preference: options.model || 'fast', // Use fast model for autocomplete
            temperature: options.temperature || 0.2, // Lower temperature for deterministic results
            max_tokens: options.maxTokens || 100 // Shorter completions
        };

        try {
            const response = await axios.post(
                endpoint,
                requestBody,
                {
                    headers: this.getHeaders(),
                    timeout: 5000 // Shorter timeout for autocomplete
                }
            );

            // Extract completion
            if (response.data.message) {
                return response.data.message;
            } else if (response.data.choices?.[0]?.message?.content) {
                return response.data.choices[0].message.content;
            } else if (response.data.content) {
                return response.data.content;
            } else {
                return '';
            }
        } catch (error) {
            // Don't throw errors for autocomplete failures - just return empty
            console.warn('Autocomplete request failed:', error.message);
            return '';
        }
    }
}

module.exports = OropendolaProvider;
