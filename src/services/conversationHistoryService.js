const { apiClient } = require('../api/client');

/**
 * Conversation History Service
 * Manages conversation persistence and retrieval using Oropendola.ai backend API v2.0
 */
class ConversationHistoryService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 60000; // 1 minute cache
    }

    /**
     * Get conversation history by ID
     * @param {string} conversationId - Conversation UUID
     * @param {number} [limit=50] - Maximum messages to return
     * @param {boolean} [useCache=true] - Use cached data if available
     * @returns {Promise<Object>} Conversation with messages
     */
    async getConversation(conversationId, limit = 50, useCache = true) {
        const cacheKey = `conv_${conversationId}_${limit}`;

        // Check cache first
        if (useCache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                console.log('📦 Using cached conversation:', conversationId);
                return cached.data;
            }
        }

        try {
            console.log('🔄 Fetching conversation from backend:', conversationId);
            const data = await apiClient.getConversationHistory(conversationId, limit);

            // Cache the result
            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });

            return data;
        } catch (error) {
            console.error('❌ Failed to fetch conversation:', error);
            throw error;
        }
    }

    /**
     * List all conversations
     * @param {Object} [options] - Query options
     * @param {number} [options.limit=20] - Maximum conversations
     * @param {number} [options.offset=0] - Pagination offset
     * @param {string} [options.status='active'] - Filter by status
     * @param {boolean} [options.useCache=true] - Use cached data
     * @returns {Promise<Object>} List of conversations
     */
    async listConversations(options = {}) {
        const {
            limit = 20,
            offset = 0,
            status = 'active',
            useCache = true
        } = options;

        const cacheKey = `list_${limit}_${offset}_${status}`;

        // Check cache
        if (useCache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                console.log('📦 Using cached conversation list');
                return cached.data;
            }
        }

        try {
            console.log('🔄 Fetching conversation list from backend');
            const data = await apiClient.listConversations(limit, offset, status);

            // Cache the result
            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });

            return data;
        } catch (error) {
            console.error('❌ Failed to list conversations:', error);
            throw error;
        }
    }

    /**
     * Get recent conversations
     * @param {number} [count=10] - Number of recent conversations
     * @returns {Promise<Array>} Recent conversations
     */
    async getRecentConversations(count = 10) {
        const result = await this.listConversations({
            limit: count,
            offset: 0,
            status: 'active'
        });

        return result.conversations || [];
    }

    /**
     * Search conversations by title or content
     * @param {string} query - Search query
     * @param {number} [limit=20] - Maximum results
     * @returns {Promise<Array>} Matching conversations
     */
    async searchConversations(query, limit = 20) {
        // Fetch all recent conversations and filter locally
        // Backend may add search endpoint in future
        const result = await this.listConversations({ limit: 100, useCache: false });
        const conversations = result.conversations || [];

        const queryLower = query.toLowerCase();
        return conversations
            .filter(conv =>
                conv.title?.toLowerCase().includes(queryLower) ||
                conv.conversation_id?.toLowerCase().includes(queryLower)
            )
            .slice(0, limit);
    }

    /**
     * Get conversation metadata
     * @param {string} conversationId - Conversation UUID
     * @returns {Promise<Object>} Metadata only (no messages)
     */
    async getConversationMetadata(conversationId) {
        const conv = await this.getConversation(conversationId, 1);
        if (!conv) {return null;}

        return {
            conversation_id: conv.conversation_id,
            title: conv.title,
            created_at: conv.metadata?.created_at,
            last_updated: conv.metadata?.last_updated,
            total_messages: conv.metadata?.total_messages,
            status: conv.status
        };
    }

    /**
     * Clear cache for a specific conversation or all
     * @param {string} [conversationId] - Specific conversation ID or null for all
     */
    clearCache(conversationId = null) {
        if (conversationId) {
            // Clear all cache entries for this conversation
            for (const key of this.cache.keys()) {
                if (key.startsWith(`conv_${conversationId}`)) {
                    this.cache.delete(key);
                }
            }
            console.log('🗑️ Cleared cache for conversation:', conversationId);
        } else {
            // Clear all cache
            this.cache.clear();
            console.log('🗑️ Cleared all conversation cache');
        }
    }

    /**
     * Export conversation to markdown format
     * @param {string} conversationId - Conversation UUID
     * @returns {Promise<string>} Markdown formatted conversation
     */
    async exportToMarkdown(conversationId) {
        const conv = await this.getConversation(conversationId, 1000);

        if (!conv || !conv.messages) {
            throw new Error('Conversation not found or has no messages');
        }

        let markdown = `# ${conv.title || 'Untitled Conversation'}\n\n`;
        markdown += `**Conversation ID**: ${conv.conversation_id}\n`;
        markdown += `**Created**: ${conv.metadata?.created_at || 'Unknown'}\n`;
        markdown += `**Total Messages**: ${conv.metadata?.total_messages || conv.messages.length}\n\n`;
        markdown += '---\n\n';

        for (const msg of conv.messages) {
            const role = msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
            const timestamp = msg.timestamp || '';
            const content = msg.content || '';

            markdown += `## ${role} ${timestamp ? `(${timestamp})` : ''}\n\n`;
            markdown += `${content}\n\n`;

            if (msg.model) {
                markdown += `*Model: ${msg.model}*\n\n`;
            }

            markdown += '---\n\n';
        }

        return markdown;
    }

    /**
     * Get conversation statistics
     * @param {string} conversationId - Conversation UUID
     * @returns {Promise<Object>} Statistics
     */
    async getConversationStats(conversationId) {
        const conv = await this.getConversation(conversationId, 1000);

        if (!conv || !conv.messages) {
            return null;
        }

        const messages = conv.messages;
        const userMessages = messages.filter(m => m.role === 'user');
        const assistantMessages = messages.filter(m => m.role === 'assistant');

        return {
            total_messages: messages.length,
            user_messages: userMessages.length,
            assistant_messages: assistantMessages.length,
            total_tokens: messages.reduce((sum, m) => sum + (m.token_count || 0), 0),
            models_used: [...new Set(assistantMessages.map(m => m.model).filter(Boolean))],
            duration: conv.metadata?.last_updated && conv.metadata?.created_at
                ? new Date(conv.metadata.last_updated) - new Date(conv.metadata.created_at)
                : null
        };
    }
}

// Singleton instance
const conversationHistoryService = new ConversationHistoryService();

module.exports = { conversationHistoryService, ConversationHistoryService };
