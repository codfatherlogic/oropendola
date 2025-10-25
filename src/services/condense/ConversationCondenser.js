/**
 * Conversation Auto-Condense System
 * Automatically condenses long conversations to manage context window
 * Uses Oropendola AI's exclusive API for summarization
 */

const axios = require('axios');

class ConversationCondenser {
    constructor(sessionCookies = '') {
        // LOCKED to Oropendola AI API only - no custom APIs allowed
        this.apiUrl = 'https://oropendola.ai/api/method/ai_assistant.api.summarize';
        this.sessionCookies = sessionCookies;
        this.maxMessagesBeforeCondense = 20; // Condense after 20 messages
        this.maxTokensBeforeCondense = 50000; // Condense after ~50K tokens
        this.condensedHistory = [];
        this.enabled = true;
    }

    /**
     * Check if conversation should be condensed
     * @param {Array} messages - Conversation messages
     * @returns {boolean} True if condensing is needed
     */
    shouldCondense(messages) {
        if (!this.enabled) {
            return false;
        }

        // Count user + assistant messages (exclude system)
        const conversationMessages = messages.filter(m => m.role !== 'system');

        // Trigger 1: Too many messages
        if (conversationMessages.length >= this.maxMessagesBeforeCondense) {
            console.log('📉 [Condense] Triggered by message count:', conversationMessages.length);
            return true;
        }

        // Trigger 2: Estimated token count too high
        const estimatedTokens = this._estimateTokenCount(messages);
        if (estimatedTokens >= this.maxTokensBeforeCondense) {
            console.log('📉 [Condense] Triggered by token count:', estimatedTokens);
            return true;
        }

        return false;
    }

    /**
     * Condense conversation messages
     * @param {Array} messages - Original messages
     * @returns {Promise<Array>} Condensed messages
     */
    async condense(messages) {
        console.log('🔄 [Condense] Starting conversation condensation...');

        // Separate system messages, tool results, and conversation
        const systemMessages = messages.filter(m => m.role === 'system');
        const toolMessages = messages.filter(m => m.toolName);
        const conversationMessages = messages.filter(m => m.role !== 'system' && !m.toolName);

        if (conversationMessages.length < 10) {
            console.log('⚠️ [Condense] Too few messages to condense, skipping');
            return messages;
        }

        // Keep recent messages (last 5 exchanges = 10 messages)
        const recentMessages = conversationMessages.slice(-10);

        // Condense older messages
        const olderMessages = conversationMessages.slice(0, -10);

        if (olderMessages.length === 0) {
            console.log('ℹ️ [Condense] No older messages to condense');
            return messages;
        }

        try {
            // Summarize older conversation
            const summary = await this._summarizeMessages(olderMessages);

            // Create condensed summary message
            const summaryMessage = {
                role: 'system',
                content: `**CONVERSATION SUMMARY (Auto-condensed)**\n\n${summary}\n\n---\n\n**Recent conversation continues below:**`,
                timestamp: new Date(),
                condensed: true
            };

            // Store in condensed history
            this.condensedHistory.push({
                originalMessages: olderMessages,
                summary: summary,
                condensedAt: new Date()
            });

            // Return: system messages + summary + recent messages + tool results
            const condensedMessages = [
                ...systemMessages,
                summaryMessage,
                ...recentMessages,
                ...toolMessages
            ];

            console.log('✅ [Condense] Condensed', olderMessages.length, 'messages into summary');
            console.log('📊 [Condense] Token reduction:', {
                before: this._estimateTokenCount(messages),
                after: this._estimateTokenCount(condensedMessages),
                saved: this._estimateTokenCount(messages) - this._estimateTokenCount(condensedMessages)
            });

            return condensedMessages;

        } catch (error) {
            console.error('❌ [Condense] Failed to condense conversation:', error.message);
            // On error, return original messages
            return messages;
        }
    }

    /**
     * Summarize messages using LLM API
     * @param {Array} messages - Messages to summarize
     * @returns {Promise<string>} Summary text
     * @private
     */
    async _summarizeMessages(messages) {
        // Format conversation for summarization
        const conversationText = messages.map(m => {
            const role = m.role === 'user' ? 'User' : 'Assistant';
            return `${role}: ${m.content}`;
        }).join('\\n\\n');

        // Call Oropendola AI summarization API (exclusive)
        try {
            const response = await axios.post(this.apiUrl, {
                text: conversationText,
                max_length: 500, // Summary should be ~500 words
                instruction: 'Summarize this conversation between a user and AI assistant. Focus on: 1) User\'s goals and requests, 2) Key decisions made, 3) Important context established, 4) Current state of the work. Be concise but preserve critical details.'
            }, {
                headers: {
                    'Cookie': this.sessionCookies,
                    'Content-Type': 'application/json'
                },
                timeout: 30000 // 30 second timeout
            });

            // Extract summary from Oropendola AI response
            const summary = response.data.summary || response.data.text || response.data;

            if (typeof summary !== 'string') {
                throw new Error('Invalid API response format');
            }

            return summary;

        } catch (error) {
            console.error('❌ [Condense] Oropendola AI API call failed:', error.message);

            // Fallback: Generate simple summary without API
            return this._generateFallbackSummary(messages);
        }
    }

    /**
     * Generate simple summary without API (fallback)
     * @param {Array} messages - Messages to summarize
     * @returns {string} Basic summary
     * @private
     */
    _generateFallbackSummary(messages) {
        const userMessages = messages.filter(m => m.role === 'user');
        const assistantMessages = messages.filter(m => m.role === 'assistant');

        // Extract key topics from user messages
        const topics = userMessages
            .map(m => m.content.substring(0, 100))
            .slice(0, 5);

        return `Previous conversation covered ${userMessages.length} user requests and ${assistantMessages.length} responses. Key topics included:\\n${topics.map((t, i) => `${i + 1}. ${t}...`).join('\\n')}`;
    }

    /**
     * Estimate token count (rough approximation)
     * @param {Array} messages - Messages
     * @returns {number} Estimated token count
     * @private
     */
    _estimateTokenCount(messages) {
        // Rough estimate: 1 token ≈ 4 characters
        const totalChars = messages.reduce((sum, m) => sum + (m.content?.length || 0), 0);
        return Math.ceil(totalChars / 4);
    }

    /**
     * Get condensed history
     * @returns {Array} Condensed history entries
     */
    getHistory() {
        return this.condensedHistory;
    }

    /**
     * Clear condensed history
     */
    clearHistory() {
        this.condensedHistory = [];
    }

    /**
     * Enable/disable auto-condensing
     * @param {boolean} enabled - Enable flag
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        console.log(`🔄 [Condense] Auto-condense ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Configure thresholds
     * @param {Object} thresholds - Configuration
     */
    configure(thresholds) {
        if (thresholds.maxMessages) {
            this.maxMessagesBeforeCondense = thresholds.maxMessages;
        }
        if (thresholds.maxTokens) {
            this.maxTokensBeforeCondense = thresholds.maxTokens;
        }
        console.log('⚙️ [Condense] Configured:', {
            maxMessages: this.maxMessagesBeforeCondense,
            maxTokens: this.maxTokensBeforeCondense
        });
    }
}

module.exports = ConversationCondenser;
