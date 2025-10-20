const axios = require('axios');
const vscode = require('vscode');

/**
 * API Client with retry logic and error handling
 * @class ApiClient
 */
class ApiClient {
    constructor() {
        this.retryCount = 0;
        this.maxRetries = 3;
        
        // Get configuration
        const config = vscode.workspace.getConfiguration('oropendola');
        const baseUrl = config.get('backendUrl') || 'http://localhost:8000';
        const timeout = config.get('apiTimeout') || 30000;

        this.client = axios.create({
            baseURL: baseUrl,
            timeout: timeout,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        // Request interceptor
        this.client.interceptors.request.use(
            (config) => {
                console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Response interceptor with retry logic
        this.client.interceptors.response.use(
            (response) => {
                this.retryCount = 0; // Reset on success
                return response;
            },
            async (error) => {
                return this.handleError(error);
            }
        );
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

        // Log error
        console.error('[API] Error:', {
            url: config?.url,
            status: error.response?.status,
            message: error.message,
            data: error.response?.data
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
        if (!error.response) return true; // Network error
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
}

// Singleton instance
const apiClient = new ApiClient();

module.exports = { apiClient, ApiClient };
