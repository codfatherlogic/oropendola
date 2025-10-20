const { apiClient } = require('./client');

/**
 * Enhanced Chat API
 * @typedef {import('../types/api').ChatMessage} ChatMessage
 * @typedef {import('../types/api').ChatContext} ChatContext
 * @typedef {import('../types/api').ChatResponse} ChatResponse
 * @typedef {import('../types/api').ApiResponse} ApiResponse
 */

class ChatAPI {
    static BASE = '/api/method/ai_assistant.api';

    /**
     * Send chat message with enhanced context
     * @param {ChatMessage[]} messages - Array of messages
     * @param {string|null} conversationId - Conversation ID for context
     * @param {'agent'|'chat'} mode - Chat mode
     * @param {ChatContext} context - Enhanced context
     * @returns {Promise<ChatResponse>}
     */
    static async chatCompletion(messages, conversationId, mode, context) {
        try {
            const response = await apiClient.post(`${this.BASE}.chat_completion`, {
                messages,
                conversation_id: conversationId,
                mode,
                context
            });
            
            // Ensure response has required structure
            if (!response.success) {
                return this.getEmptyResponse(conversationId, response.error);
            }
            
            return response;
        } catch (error) {
            console.error('Chat completion error:', error);
            return this.getEmptyResponse(conversationId, error.message);
        }
    }

    /**
     * Get conversation history
     * @param {string} conversationId - Conversation ID
     * @returns {Promise<ApiResponse<{messages: ChatMessage[]}>>}
     */
    static async getConversationHistory(conversationId) {
        try {
            const response = await apiClient.get(`${this.BASE}.get_conversation_history`, {
                conversation_id: conversationId
            });
            return response;
        } catch (error) {
            console.error('Failed to get conversation history:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get empty error response
     * @private
     * @param {string|null} conversationId - Conversation ID
     * @param {string} [errorMessage='Unknown error'] - Error message
     * @returns {ChatResponse}
     */
    static getEmptyResponse(conversationId, errorMessage = 'Unknown error') {
        return {
            success: false,
            role: 'assistant',
            content: '',
            response: '',
            conversation_id: conversationId || '',
            message_count: 0,
            tool_calls: [],
            tool_results: [],
            file_changes: {
                created: [],
                modified: [],
                deleted: [],
                commands: []
            },
            todos: [],
            todos_stats: {
                total: 0,
                completed: 0,
                active: 0
            },
            error: errorMessage
        };
    }
}

module.exports = { ChatAPI };
