const vscode = require('vscode');
const { ChatAPI } = require('../api/chat');
const { contextService } = require('./contextService');

/**
 * Enhanced Chat Handler
 * Integrates new API structure with existing ConversationTask system
 * @typedef {import('../types/api').ChatMessage} ChatMessage
 * @typedef {import('../types/api').ChatResponse} ChatResponse
 */

class EnhancedChatHandler {
    constructor() {
        /** @type {string|null} */
        this.conversationId = null;
    }

    /**
     * Send chat message with enhanced context
     * @param {string} userMessage - User message
     * @param {'agent'|'chat'} mode - Chat mode
     * @param {boolean} [includeWorkspace=true] - Include workspace context
     * @param {boolean} [includeGit=true] - Include git context
     * @returns {Promise<ChatResponse>}
     */
    async sendMessage(userMessage, mode = 'agent', includeWorkspace = true, includeGit = true) {
        try {
            // Get enriched context
            const context = await contextService.getEnrichedContext(
                mode === 'agent' ? includeWorkspace : false,
                mode === 'agent' ? includeGit : false
            );

            // Build messages array
            /** @type {ChatMessage[]} */
            const messages = [
                { role: 'user', content: userMessage }
            ];

            // Call chat API with context
            const response = await ChatAPI.chatCompletion(
                messages,
                this.conversationId,
                mode,
                context
            );

            // Update conversation ID
            if (response.success && response.conversation_id) {
                this.conversationId = response.conversation_id;
            }

            return response;
        } catch (error) {
            console.error('Enhanced chat handler error:', error);
            return ChatAPI.getEmptyResponse(this.conversationId, error.message);
        }
    }

    /**
     * Get current conversation ID
     * @returns {string|null}
     */
    getConversationId() {
        return this.conversationId;
    }

    /**
     * Set conversation ID
     * @param {string|null} conversationId - Conversation ID
     */
    setConversationId(conversationId) {
        this.conversationId = conversationId;
    }

    /**
     * Clear conversation
     */
    clearConversation() {
        this.conversationId = null;
        contextService.clearCache();
    }

    /**
     * Get workspace context
     * @returns {Promise<any>}
     */
    async getWorkspaceContext() {
        await contextService.getEnrichedContext(true, false);
        return contextService.getWorkspaceContext();
    }

    /**
     * Get git context
     * @returns {Promise<any>}
     */
    async getGitContext() {
        await contextService.getEnrichedContext(false, true);
        return contextService.getGitContext();
    }

    /**
     * Force refresh context
     * @returns {Promise<void>}
     */
    async refreshContext() {
        await contextService.forceRefresh();
    }
}

// Singleton instance
const enhancedChatHandler = new EnhancedChatHandler();

module.exports = { enhancedChatHandler, EnhancedChatHandler };
