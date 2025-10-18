const axios = require('axios');

/**
 * Custom AI Provider for custom API endpoints
 */
class CustomProvider {
    constructor(config) {
        this.apiKey = config.apiKey;
        this.model = config.model || 'default';
        this.temperature = config.temperature || 0.7;
        this.endpoint = config.endpoint || 'http://localhost:11434/api/chat';
        this.maxTokens = config.maxTokens || 2000;
    }

    async chat(message, context = {}) {
        if (!this.endpoint) {
            throw new Error('Custom API endpoint not configured');
        }

        try {
            const response = await axios.post(
                this.endpoint,
                {
                    model: this.model,
                    messages: [
                        {
                            role: 'system',
                            content: this.buildSystemPrompt(context)
                        },
                        {
                            role: 'user',
                            content: message
                        }
                    ],
                    temperature: this.temperature,
                    max_tokens: this.maxTokens
                },
                {
                    headers: {
                        'Authorization': this.apiKey ? `Bearer ${this.apiKey}` : undefined,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.message?.content || response.data.response || JSON.stringify(response.data);
        } catch (error) {
            throw new Error(`Custom API error: ${error.message}`);
        }
    }

    buildSystemPrompt(_context) {
        return 'You are Oropendola AI, a coding assistant. Help with code analysis and programming questions.';
    }

    get supportsStreaming() {
        return false;
    }

    get modelInfo() {
        return {
            provider: 'custom',
            model: this.model,
            endpoint: this.endpoint
        };
    }
}

module.exports = CustomProvider;
