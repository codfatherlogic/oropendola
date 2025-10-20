const { apiClient } = require('./client');

/**
 * Inline Completion API
 * @typedef {import('../types/api').InlineCompletion} InlineCompletion
 * @typedef {import('../types/api').ApiResponse} ApiResponse
 */

class InlineAPI {
    static BASE = '/api/method/ai_assistant.api.inline';

    /**
     * Get inline code completions
     * @param {string} filePath - File path
     * @param {number} line - Line number
     * @param {number} column - Column number
     * @param {string} textBeforeCursor - Text before cursor
     * @param {string} textAfterCursor - Text after cursor
     * @param {string} language - Programming language
     * @returns {Promise<ApiResponse<{completions: InlineCompletion[], count: number}>>}
     */
    static async getCompletion(filePath, line, column, textBeforeCursor, textAfterCursor, language) {
        try {
            const response = await apiClient.post(`${this.BASE}.get_completion`, {
                file_path: filePath,
                line,
                column,
                text_before_cursor: textBeforeCursor,
                text_after_cursor: textAfterCursor,
                language
            });
            return response;
        } catch (error) {
            console.error('Failed to get inline completion:', error);
            return {
                success: false,
                error: error.message,
                data: {
                    completions: [],
                    count: 0
                }
            };
        }
    }

    /**
     * Clear completion cache
     * @returns {Promise<ApiResponse>}
     */
    static async clearCache() {
        try {
            const response = await apiClient.post(`${this.BASE}.clear_cache`, {});
            return response;
        } catch (error) {
            console.error('Failed to clear cache:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get cache statistics
     * @returns {Promise<ApiResponse<{stats: any}>>}
     */
    static async getCacheStats() {
        try {
            const response = await apiClient.get(`${this.BASE}.get_cache_stats`);
            return response;
        } catch (error) {
            console.error('Failed to get cache stats:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = { InlineAPI };
