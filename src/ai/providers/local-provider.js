/**
 * Local AI Provider for local models (Ollama, etc.)
 */
class LocalProvider {
    constructor(config) {
        this.model = config.model || 'llama2';
        this.endpoint = config.endpoint || 'http://localhost:11434';
    }

    async chat(message, context = {}) {
        // Mock implementation - user needs to configure actual local model
        return `Local AI response (${this.model}): This is a placeholder. Configure a local AI service like Ollama and update this provider.

Your message: ${message}

Workspace: ${context.workspace || 'none'}`;
    }

    buildSystemPrompt(_context) {
        return 'You are a helpful coding assistant.';
    }

    get supportsStreaming() {
        return false;
    }

    get modelInfo() {
        return {
            provider: 'local',
            model: this.model,
            endpoint: this.endpoint
        };
    }
}

module.exports = LocalProvider;
