const axios = require('axios');
const vscode = require('vscode');

/**
 * API Client with retry logic and error handling
 * Implements authentication methods from Oropendola.ai backend API v2.0
 * @class ApiClient
 */
class ApiClient {
    constructor() {
        this.retryCount = 0;
        this.maxRetries = 3;

        // Get configuration
        const config = vscode.workspace.getConfiguration('oropendola');
        const baseUrl = config.get('api.url') || config.get('serverUrl') || 'https://oropendola.ai';
        const timeout = config.get('apiTimeout') || 1200000; // 20 minutes for AI requests (complex tasks need time)

        // API Key authentication (preferred for extensions)
        this.apiKey = config.get('api.key');
        this.apiSecret = config.get('api.secret');

        // Session cookies (alternative authentication)
        this.sessionCookies = config.get('session.cookies');

        this.client = axios.create({
            baseURL: baseUrl,
            timeout,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        // Request interceptor - add authentication
        this.client.interceptors.request.use(
            config => {
                console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);

                // Add authentication headers
                if (this.apiKey && this.apiSecret) {
                    // Preferred: API Key/Secret authentication
                    config.headers['Authorization'] = `token ${this.apiKey}:${this.apiSecret}`;
                } else if (this.sessionCookies) {
                    // Fallback: Session cookie authentication
                    config.headers['Cookie'] = this.sessionCookies;
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
     * Update API credentials
     * @param {Object} credentials - API credentials
     * @param {string} [credentials.apiKey] - API key
     * @param {string} [credentials.apiSecret] - API secret
     * @param {string} [credentials.sessionCookies] - Session cookies
     */
    updateCredentials({ apiKey, apiSecret, sessionCookies }) {
        if (apiKey) {this.apiKey = apiKey;}
        if (apiSecret) {this.apiSecret = apiSecret;}
        if (sessionCookies) {this.sessionCookies = sessionCookies;}
    }

    /**
     * Handle errors with retry logic
     * @private
     * @param {Error} error - Axios error
     * @returns {Promise}
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
            console.log(`[API] Retry ${this.retryCount}/${this.maxRetries}`);

            // Exponential backoff
            await this.sleep(Math.pow(2, this.retryCount) * 1000);

            return this.client.request(config);
        }

        // Log error (as warning for optional APIs)
        console.warn('[API] Error:', {
            url: config?.url,
            message: error.message
        });

        // Transform to ApiException
        throw this.createApiException(error);
    }

    /**
     * Check if error should be retried
     * @private
     * @param {Error} error - Axios error
     * @returns {boolean}
     */
    shouldRetry(error) {
        if (!error.response) {return true;} // Network error
        const status = error.response.status;
        return status >= 500 && status < 600; // Server errors
    }

    /**
     * Sleep utility for retry backoff
     * @private
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise<void>}
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Create API exception from error
     * @private
     * @param {Error} error - Axios error
     * @returns {Error}
     */
    createApiException(error) {
        const apiError = new Error(error.message);
        apiError.code = error.code || 'UNKNOWN_ERROR';
        apiError.details = error.response?.data;
        apiError.status = error.response?.status;
        return apiError;
    }

    /**
     * POST request
     * @template T
     * @param {string} endpoint - API endpoint
     * @param {*} data - Request data
     * @returns {Promise<T>}
     */
    async post(endpoint, data) {
        try {
            const response = await this.client.post(endpoint, data);
            return response.data;
        } catch (error) {
            // Return error response if available
            if (error.response?.data) {
                return error.response.data;
            }
            throw error;
        }
    }

    /**
     * GET request
     * @template T
     * @param {string} endpoint - API endpoint
     * @param {*} [params] - Query parameters
     * @returns {Promise<T>}
     */
    async get(endpoint, params) {
        try {
            const response = await this.client.get(endpoint, { params });
            return response.data;
        } catch (error) {
            // Return error response if available
            if (error.response?.data) {
                return error.response.data;
            }
            throw error;
        }
    }

    /**
     * PUT request
     * @template T
     * @param {string} endpoint - API endpoint
     * @param {*} data - Request data
     * @returns {Promise<T>}
     */
    async put(endpoint, data) {
        try {
            const response = await this.client.put(endpoint, data);
            return response.data;
        } catch (error) {
            // Return error response if available
            if (error.response?.data) {
                return error.response.data;
            }
            throw error;
        }
    }

    /**
     * DELETE request
     * @template T
     * @param {string} endpoint - API endpoint
     * @returns {Promise<T>}
     */
    async delete(endpoint) {
        try {
            const response = await this.client.delete(endpoint);
            return response.data;
        } catch (error) {
            // Return error response if available
            if (error.response?.data) {
                return error.response.data;
            }
            throw error;
        }
    }

    // ========================================
    // Oropendola.ai Backend API v2.0 Methods
    // ========================================

    /**
     * Chat completion - Primary AI endpoint
     * @param {Object} params - Chat parameters
     * @param {Array} params.messages - Message array with role/content
     * @param {string} [params.mode='chat'] - Mode: 'chat', 'agent', or 'code'
     * @param {string} [params.model='auto'] - Model selection or 'auto'
     * @param {number} [params.temperature=0.7] - Response creativity (0.0-1.0)
     * @param {number} [params.max_tokens=4096] - Maximum response tokens
     * @param {boolean} [params.stream=false] - Enable streaming
     * @param {string} [params.conversation_id] - UUID for conversation tracking
     * @param {boolean} [params.enable_todo_extraction=false] - Extract todos
     * @param {Object} [params.context] - Additional context
     * @returns {Promise<Object>} Response with AI message and metadata
     */
    async chatCompletion(params) {
        const endpoint = '/api/method/ai_assistant.api.chat_completion';
        const response = await this.post(endpoint, params);

        // Extract from Frappe response format: { message: { ... } }
        return response.message || response;
    }

    /**
     * Get conversation history
     * @param {string} conversationId - Conversation UUID
     * @param {number} [limit=50] - Maximum messages to return
     * @returns {Promise<Object>} Conversation data with messages
     */
    async getConversationHistory(conversationId, limit = 50) {
        const endpoint = '/api/method/ai_assistant.api.chat.get_conversation_history';
        const response = await this.get(endpoint, { conversation_id: conversationId, limit });
        return response.message || response;
    }

    /**
     * List all conversations
     * @param {number} [limit=20] - Maximum conversations to return
     * @param {number} [offset=0] - Pagination offset
     * @param {string} [status='active'] - Filter by status
     * @returns {Promise<Object>} List of conversations
     */
    async listConversations(limit = 20, offset = 0, status = 'active') {
        const endpoint = '/api/method/ai_assistant.api.chat.list_conversations';
        const response = await this.get(endpoint, { limit, offset, status });
        return response.message || response;
    }

    /**
     * Extract todos from text
     * @param {string} text - Text to extract todos from
     * @param {string} [context] - Additional context
     * @param {boolean} [autoCreate=true] - Auto-create todo items
     * @returns {Promise<Object>} Extracted todos
     */
    async extractTodos(text, context = '', autoCreate = true) {
        const endpoint = '/api/method/ai_assistant.api.todo.extract_todos';
        const response = await this.post(endpoint, { text, context, auto_create: autoCreate });
        return response.message || response;
    }

    /**
     * Get todo list
     * @param {string} [status] - Filter by status ('Open', 'Completed', etc.)
     * @param {string} [priority] - Filter by priority
     * @param {number} [limit=50] - Maximum todos to return
     * @returns {Promise<Object>} List of todos
     */
    async getTodos(status = null, priority = null, limit = 50) {
        const endpoint = '/api/method/ai_assistant.api.todo.get_todos';
        const params = { limit };
        if (status) {params.status = status;}
        if (priority) {params.priority = priority;}

        const response = await this.get(endpoint, params);
        return response.message || response;
    }

    /**
     * Update todo status
     * @param {string} todoId - Todo ID
     * @param {Object} updates - Fields to update
     * @param {string} [updates.status] - New status
     * @param {string} [updates.priority] - New priority
     * @returns {Promise<Object>} Updated todo
     */
    async updateTodo(todoId, updates) {
        const endpoint = '/api/method/ai_assistant.api.todo.update_todo';
        const response = await this.post(endpoint, { todo_id: todoId, ...updates });
        return response.message || response;
    }

    /**
     * Get API usage statistics
     * @param {number} [days=7] - Number of days to retrieve
     * @param {string} [provider='all'] - Filter by provider
     * @returns {Promise<Object>} Usage statistics
     */
    async getUsageStats(days = 7, provider = 'all') {
        const endpoint = '/api/method/ai_assistant.api.analytics.get_usage_stats';
        const response = await this.get(endpoint, { days, provider });
        return response.message || response;
    }
}

// Singleton instance
const apiClient = new ApiClient();

module.exports = { apiClient, ApiClient };
