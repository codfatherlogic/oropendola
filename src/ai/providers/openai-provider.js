const axios = require('axios');

/**
 * OpenAI Provider for AI chat functionality
 * Supports GPT-3.5, GPT-4, and other OpenAI models
 */
class OpenAIProvider {
    constructor(config) {
        this.apiKey = config.apiKey;
        this.model = config.model || 'gpt-4';
        this.temperature = config.temperature || 0.7;
        this.endpoint = config.endpoint || 'https://api.openai.com/v1/chat/completions';
        this.maxTokens = config.maxTokens || 2000;
    }

    /**
     * Send chat message to OpenAI API
     * @param {string} message - User message
     * @param {Object} context - Conversation context
     * @returns {Promise<string>} AI response
     */
    async chat(message, context = {}) {
        const messages = this.buildMessages(message, context);

        try {
            const response = await axios.post(
                this.endpoint,
                {
                    model: this.model,
                    messages,
                    temperature: this.temperature,
                    max_tokens: this.maxTokens
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.choices[0].message.content;
        } catch (error) {
            throw new Error(`OpenAI API error: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    /**
     * Build messages array for API request
     * @param {string} userMessage - User's message
     * @param {Object} context - Context information
     * @returns {Array} Messages array
     */
    buildMessages(userMessage, context) {
        const messages = [];

        // System message with context
        const systemPrompt = this.buildSystemPrompt(context);
        messages.push({
            role: 'system',
            content: systemPrompt
        });

        // Add conversation history if available
        if (context.conversationHistory) {
            messages.push(...context.conversationHistory);
        }

        // User message
        messages.push({
            role: 'user',
            content: userMessage
        });

        return messages;
    }

    /**
     * Build system prompt with context
     * @param {Object} context - Context information
     * @returns {string} System prompt
     */
    buildSystemPrompt(context) {
        let prompt = `You are Oropendola AI, an intelligent coding assistant integrated into VS Code.
You help developers understand code, analyze repositories, review code quality, and answer programming questions.

Your capabilities:
- Code analysis and explanation
- Repository structure understanding
- Code review and best practices
- Bug detection and suggestions
- Documentation assistance
- Programming concept explanation

Guidelines:
- Provide clear, concise answers
- Use code examples when helpful
- Explain complex concepts simply
- Suggest improvements constructively
- Reference specific files and line numbers when discussing code
`;

        // Add workspace context
        if (context.workspace) {
            prompt += `\n\nCurrent workspace: ${context.workspace}`;
        }

        // Add active file context
        if (context.activeFile) {
            prompt += `\n\nActive file: ${context.activeFile.path} (${context.activeFile.language})`;

            if (context.activeFile.content) {
                const preview = context.activeFile.content.length > 3000
                    ? context.activeFile.content.substring(0, 3000) + '\n...[truncated]'
                    : context.activeFile.content;
                prompt += `\n\nFile content:\n\`\`\`${context.activeFile.language}\n${preview}\n\`\`\``;
            }
        }

        // Add selected text context
        if (context.selection) {
            prompt += `\n\nSelected code:\n\`\`\`\n${context.selection}\n\`\`\``;
        }

        // Add repository analysis context
        if (context.analysisData) {
            prompt += '\n\nRepository analysis available:';
            if (context.analysisData.languages) {
                prompt += `\n- Languages: ${Object.keys(context.analysisData.languages).join(', ')}`;
            }
            if (context.analysisData.dependencies) {
                prompt += '\n- Dependencies detected';
            }
        }

        return prompt;
    }

    /**
     * Check if provider supports streaming
     * @returns {boolean}
     */
    get supportsStreaming() {
        return true;
    }

    /**
     * Get model information
     * @returns {Object} Model info
     */
    get modelInfo() {
        return {
            provider: 'openai',
            model: this.model,
            maxTokens: this.maxTokens,
            temperature: this.temperature
        };
    }
}

module.exports = OpenAIProvider;
