const axios = require('axios');
const vscode = require('vscode');

/**
 * Agent Mode API Client
 * 
 * Provides integration with Oropendola's Agent Mode API where the backend
 * automatically selects the best AI model based on:
 * - Cost Weight (from user's plan)
 * - Performance Score (model capability)
 * - Availability (health status)
 * - Latency (response time)
 * - Success Rate (reliability)
 * 
 * Users don't select models - Oropendola does it automatically.
 * 
 * @class AgentClient
 */
class AgentClient {
    constructor() {
        this.retryCount = 0;
        this.maxRetries = 3;

        // Get configuration
        const config = vscode.workspace.getConfiguration('oropendola');
        const baseUrl = config.get('api.url') || config.get('serverUrl') || 'https://oropendola.ai';
        const timeout = config.get('apiTimeout') || 1200000; // 20 minutes for AI requests

        // Authentication - prefer session cookies over API key
        this.apiKey = config.get('api.key');
        this.sessionCookies = null; // Will be set by updateSessionCookies()

        // Base API endpoint
        this.baseEndpoint = '/api/method/oropendola_ai.oropendola_ai.api.vscode_extension';

        this.client = axios.create({
            baseURL: baseUrl,
            timeout,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            withCredentials: true, // Enable credentials for cross-origin requests
            maxRedirects: 5
        });

        // Request interceptor - add authentication
        this.client.interceptors.request.use(
            config => {
                console.log(`[AgentAPI] ${config.method?.toUpperCase()} ${config.url}`);

                // Add session cookie authentication if available
                // Note: API key is added in each method's payload, not here
                if (this.sessionCookies) {
                    // Ensure Cookie header is set properly
                    if (!config.headers) {
                        config.headers = {};
                    }
                    config.headers['Cookie'] = this.sessionCookies;
                    config.headers['cookie'] = this.sessionCookies; // Try lowercase too
                    console.log('[AgentAPI] Using session cookie authentication');
                    console.log('[AgentAPI] Cookie header length:', this.sessionCookies.length);
                    console.log('[AgentAPI] Cookie preview:', this.sessionCookies.substring(0, 50) + '...');
                } else if (this.apiKey) {
                    console.log('[AgentAPI] Using API key authentication (in payload)');
                } else {
                    console.warn('[AgentAPI] ⚠️ No authentication credentials available!');
                }

                return config;
            },
            error => Promise.reject(error)
        );

        // Response interceptor with retry logic
        this.client.interceptors.response.use(
            response => {
                this.retryCount = 0; // Reset on success
                return response;
            },
            async error => {
                return this.handleError(error);
            }
        );
    }

    /**
     * Update session cookies for authentication
     * @param {string} sessionCookies - Session cookies from login
     */
    updateSessionCookies(sessionCookies) {
        this.sessionCookies = sessionCookies;
        console.log('[AgentAPI] Session cookies updated');
    }

    /**
     * Update API credentials
     * @param {string} apiKey - API key (optional, session cookies preferred)
     */
    updateCredentials(apiKey) {
        this.apiKey = apiKey;
    }

    /**
     * Check if user is authenticated (either session or API key)
     * @returns {boolean}
     */
    isAuthenticated() {
        return !!(this.sessionCookies || this.apiKey);
    }

    /**
     * Handle errors with retry logic
     * @private
     */
    async handleError(error) {
        const config = error.config;

        // Retry on network errors or 5xx errors
        if (
            config &&
            this.retryCount < this.maxRetries &&
            this.shouldRetry(error)
        ) {
            this.retryCount++;
            console.log(`[AgentAPI] Retry ${this.retryCount}/${this.maxRetries}`);

            // Exponential backoff
            await this.sleep(Math.pow(2, this.retryCount) * 1000);

            return this.client.request(config);
        }

        // Log error
        console.warn('[AgentAPI] Error:', {
            url: config?.url,
            message: error.message,
            status: error.response?.status
        });

        // Transform to ApiException
        throw this.createApiException(error);
    }

    /**
     * Check if error should be retried
     * @private
     */
    shouldRetry(error) {
        if (!error.response) return true; // Network error
        const status = error.response.status;
        return status >= 500 && status < 600; // Server errors
    }

    /**
     * Sleep utility for retry backoff
     * @private
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Create API exception from error
     * @private
     */
    createApiException(error) {
        const apiError = new Error(error.message);
        apiError.code = error.code || 'UNKNOWN_ERROR';
        apiError.details = error.response?.data;
        apiError.status = error.response?.status;
        return apiError;
    }

    // ========================================
    // Agent Mode API Methods
    // ========================================

    /**
     * General AI query using Agent Mode
     * The backend automatically selects the best model
     * 
     * @param {Object} params - Query parameters
     * @param {string} params.prompt - The question or task
     * @param {string} [params.conversation_id] - Optional conversation ID for context
     * @param {number} [params.temperature] - Optional temperature override
     * @param {number} [params.max_tokens] - Optional max tokens override
     * @param {Object} [params.context] - Additional context for the AI
     * @returns {Promise<Object>} Response with auto-selected model info
     * @example
     * {
     *   status: 200,
     *   model: "Claude",
     *   agent_mode: true,
     *   selection_reason: "Optimized for cost, performance, and availability",
     *   response: { content: "..." }
     * }
     */
    async agent(params) {
        if (!this.isAuthenticated()) {
            throw new Error('Please sign in to use Oropendola AI. Click the "Sign In" button in the sidebar.');
        }

        const endpoint = `${this.baseEndpoint}.agent`;
        const payload = {
            ...params
        };

        // Only add api_key to payload if using API key auth (not session cookies)
        if (!this.sessionCookies && this.apiKey) {
            payload.api_key = this.apiKey;
        }

        const response = await this.client.post(endpoint, payload);
        
        // Log model selection for transparency
        if (response.data?.model) {
            console.log(`[AgentAPI] Auto-selected model: ${response.data.model}`);
            if (response.data.selection_reason) {
                console.log(`[AgentAPI] Reason: ${response.data.selection_reason}`);
            }
        }

        return response.data;
    }

    /**
     * Code completion using Agent Mode
     * 
     * @param {Object} params - Completion parameters
     * @param {string} params.code - Partial code to complete
     * @param {string} params.language - Programming language
     * @param {string} [params.context] - Additional context
     * @param {string} [params.file_path] - File path for better context
     * @returns {Promise<Object>} Completion response with auto-selected model
     */
    async codeCompletion(params) {
        if (!this.isAuthenticated()) {
            throw new Error('Please sign in to use Oropendola AI. Click the "Sign In" button in the sidebar.');
        }

        const endpoint = `${this.baseEndpoint}.code_completion`;
        const payload = { ...params };
        
        if (!this.sessionCookies && this.apiKey) {
            payload.api_key = this.apiKey;
        }

        const response = await this.client.post(endpoint, payload);
        
        if (response.data?.model) {
            console.log(`[AgentAPI] Code completion model: ${response.data.model}`);
        }

        return response.data;
    }

    /**
     * Code explanation using Agent Mode
     * 
     * @param {Object} params - Explanation parameters
     * @param {string} params.code - Code to explain
     * @param {string} params.language - Programming language
     * @param {string} [params.detail_level] - 'brief' | 'detailed' | 'comprehensive'
     * @returns {Promise<Object>} Explanation response with auto-selected model
     */
    async codeExplanation(params) {
        if (!this.isAuthenticated()) {
            throw new Error('Please sign in to use Oropendola AI. Click the "Sign In" button in the sidebar.');
        }

        const endpoint = `${this.baseEndpoint}.code_explanation`;
        const payload = { ...params };
        
        if (!this.sessionCookies && this.apiKey) {
            payload.api_key = this.apiKey;
        }

        const response = await this.client.post(endpoint, payload);
        
        if (response.data?.model) {
            console.log(`[AgentAPI] Code explanation model: ${response.data.model}`);
        }

        return response.data;
    }

    /**
     * Code refactoring using Agent Mode
     * 
     * @param {Object} params - Refactoring parameters
     * @param {string} params.code - Code to refactor
     * @param {string} params.language - Programming language
     * @param {string} [params.refactor_goal] - What to improve (e.g., 'performance', 'readability')
     * @param {string} [params.style_guide] - Preferred style guide
     * @returns {Promise<Object>} Refactored code with auto-selected model
     */
    async codeRefactor(params) {
        if (!this.isAuthenticated()) {
            throw new Error('Please sign in to use Oropendola AI. Click the "Sign In" button in the sidebar.');
        }

        const endpoint = `${this.baseEndpoint}.code_refactor`;
        const payload = { ...params };
        
        if (!this.sessionCookies && this.apiKey) {
            payload.api_key = this.apiKey;
        }

        const response = await this.client.post(endpoint, payload);
        
        if (response.data?.model) {
            console.log(`[AgentAPI] Code refactor model: ${response.data.model}`);
        }

        return response.data;
    }

    /**
     * Generate an image using Agent Mode
     *
     * @param {Object} params - Image generation parameters
     * @param {string} params.prompt - Image description/prompt
     * @param {string} [params.size] - Image size (e.g., '1024x1024', '512x512')
     * @param {string} [params.style] - Style preference (e.g., 'realistic', 'artistic')
     * @param {number} [params.quality] - Quality level (1-100)
     * @returns {Promise<Object>} Image generation response with auto-selected model
     */
    async generateImage(params) {
        if (!this.isAuthenticated()) {
            throw new Error('Please sign in to use Oropendola AI. Click the "Sign In" button in the sidebar.');
        }

        const endpoint = `${this.baseEndpoint}.generate_image`;
        const payload = { ...params };

        if (!this.sessionCookies && this.apiKey) {
            payload.api_key = this.apiKey;
        }

        const response = await this.client.post(endpoint, payload);

        if (response.data?.model) {
            console.log(`[AgentAPI] Image generation model: ${response.data.model}`);
        }

        return response.data;
    }

    /**
     * Health check endpoint
     * @returns {Promise<Object>} Health status
     */
    async healthCheck() {
        const endpoint = `${this.baseEndpoint}.health_check`;
        const response = await this.client.get(endpoint);
        return response.data;
    }

    /**
     * Validate API key
     * @param {string} [apiKey] - API key to validate (uses stored key if not provided)
     * @returns {Promise<Object>} Validation result
     */
    async validateApiKey(apiKey = null) {
        const endpoint = `${this.baseEndpoint}.validate_api_key`;
        const key = apiKey || this.apiKey;

        if (!key) {
            throw new Error('API key is required');
        }

        const response = await this.client.post(endpoint, { api_key: key });
        return response.data;
    }

    /**
     * Get usage statistics
     * @returns {Promise<Object>} Usage stats including limits and current usage
     */
    async getUsageStats() {
        if (!this.isAuthenticated()) {
            throw new Error('Please sign in to use Oropendola AI. Click the "Sign In" button in the sidebar.');
        }

        const endpoint = `${this.baseEndpoint}.get_usage_stats`;
        const payload = {};
        
        if (!this.sessionCookies && this.apiKey) {
            payload.api_key = this.apiKey;
        }
        
        const response = await this.client.post(endpoint, payload);
        return response.data;
    }

    /**
     * Stream agent response (for long-running tasks)
     * 
     * @param {Object} params - Query parameters
     * @param {Function} onChunk - Callback for each chunk: (chunk) => void
     * @param {Function} onComplete - Callback on completion: (fullResponse) => void
     * @param {Function} onError - Callback on error: (error) => void
     * @returns {Promise<void>}
     */
    async streamAgent(params, onChunk, onComplete, onError) {
        if (!this.isAuthenticated()) {
            const error = new Error('Please sign in to use Oropendola AI. Click the "Sign In" button in the sidebar.');
            if (onError) onError(error);
            throw error;
        }

        const endpoint = `${this.baseEndpoint}.agent`;
        const payload = {
            stream: true,
            ...params
        };
        
        if (!this.sessionCookies && this.apiKey) {
            payload.api_key = this.apiKey;
        }

        try {
            const response = await this.client.post(endpoint, payload, {
                responseType: 'stream'
            });

            let fullResponse = '';
            let modelInfo = null;

            response.data.on('data', (chunk) => {
                const text = chunk.toString();
                
                // Parse SSE format
                const lines = text.split('\n').filter(line => line.trim());
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.substring(6));
                            
                            // Store model info from first chunk
                            if (data.model && !modelInfo) {
                                modelInfo = {
                                    model: data.model,
                                    selection_reason: data.selection_reason
                                };
                                console.log(`[AgentAPI] Streaming with model: ${data.model}`);
                            }

                            // Accumulate content
                            if (data.content) {
                                fullResponse += data.content;
                                if (onChunk) onChunk(data);
                            }
                        } catch (e) {
                            console.warn('[AgentAPI] Failed to parse SSE chunk:', e);
                        }
                    }
                }
            });

            response.data.on('end', () => {
                if (onComplete) {
                    onComplete({
                        content: fullResponse,
                        ...modelInfo
                    });
                }
            });

            response.data.on('error', (error) => {
                console.error('[AgentAPI] Stream error:', error);
                if (onError) onError(error);
            });
        } catch (error) {
            console.error('[AgentAPI] Failed to start stream:', error);
            if (onError) onError(error);
            throw error;
        }
    }
}

// Singleton instance
const agentClient = new AgentClient();

module.exports = { agentClient, AgentClient };
