const axios = require('axios');

/**
 * Anthropic Provider for Claude AI models
 */
class AnthropicProvider {
    constructor(config) {
        this.apiKey = config.apiKey;
        this.model = config.model || 'claude-3-sonnet-20240229';
        this.temperature = config.temperature || 0.7;
        this.endpoint = config.endpoint || 'https://api.anthropic.com/v1/messages';
        this.maxTokens = config.maxTokens || 2000;
    }

    /**
     * Send chat message to Anthropic API
     * @param {string} message - User message
     * @param {Object} context - Conversation context
     * @returns {Promise<string>} AI response
     */
    async chat(message, context = {}) {
        const systemPrompt = this.buildSystemPrompt(context);

        try {
            const response = await axios.post(
                this.endpoint,
                {
                    model: this.model,
                    max_tokens: this.maxTokens,
                    temperature: this.temperature,
                    system: systemPrompt,
                    messages: [
                        {
                            role: 'user',
                            content: message
                        }
                    ]
                },
                {
                    headers: {
                        'x-api-key': this.apiKey,
                        'anthropic-version': '2023-06-01',
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.content[0].text;
        } catch (error) {
            throw new Error(`Anthropic API error: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    /**
     * Build system prompt with context
     * @param {Object} context - Context information
     * @returns {string} System prompt
     */
    buildSystemPrompt(context) {
        let prompt = 'You are Oropendola AI, an intelligent coding assistant built into VS Code. You help developers with code analysis, repository understanding, and programming questions.';

        if (context.workspace) {
            prompt += `\n\nWorkspace: ${context.workspace}`;
        }

        if (context.activeFile) {
            prompt += `\n\nActive file: ${context.activeFile.path}`;
            if (context.activeFile.content) {
                prompt += `\n\nContent:\n${context.activeFile.content.substring(0, 3000)}`;
            }
        }

        return prompt;
    }

    get supportsStreaming() {
        return true;
    }

    get modelInfo() {
        return {
            provider: 'anthropic',
            model: this.model,
            maxTokens: this.maxTokens,
            temperature: this.temperature
        };
    }
}

module.exports = AnthropicProvider;
