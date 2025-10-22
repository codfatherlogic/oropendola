const vscode = require('vscode');
const axios = require('axios');

class TelemetryService {
    constructor(serverUrl) {
        this.serverUrl = serverUrl;
        this.sessionId = this.generateSessionId();
        this.eventQueue = [];
        this.enabled = vscode.workspace.getConfiguration('oropendola').get('telemetry.enabled', true);
        
        // Flush events every 30 seconds
        this.flushInterval = setInterval(() => this.flush(), 30000);
    }

    generateSessionId() {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    }

    trackEvent(event, properties = {}) {
        if (!this.enabled) return;

        this.eventQueue.push({
            event,
            properties: {
                ...properties,
                sessionId: this.sessionId,
                extensionVersion: vscode.extensions.getExtension('oropendola.ai-assistant')?.packageJSON.version
            },
            timestamp: Date.now()
        });

        // Auto-flush if queue gets large
        if (this.eventQueue.length >= 50) {
            this.flush();
        }
    }

    trackCommand(commandId, success, duration) {
        this.trackEvent('command_executed', {
            commandId,
            success,
            duration
        });
    }

    trackCompletion(accepted, language, charactersCompleted) {
        this.trackEvent('inline_completion', {
            accepted,
            language,
            charactersCompleted
        });
    }

    trackError(error, context) {
        this.trackEvent('error', {
            message: error.message,
            stack: error.stack,
            context
        });
    }

    async flush() {
        if (this.eventQueue.length === 0 || !this.enabled) return;

        const eventsToSend = [...this.eventQueue];
        this.eventQueue = [];

        try {
            await axios.post(
                `${this.serverUrl}/api/method/ai_assistant.api.endpoints.track_telemetry`,
                {
                    events: eventsToSend
                },
                {
                    timeout: 5000,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        } catch (error) {
            console.error('Failed to send telemetry:', error);
            // Re-queue failed events (up to a limit)
            if (this.eventQueue.length < 100) {
                this.eventQueue.push(...eventsToSend);
            }
        }
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.eventQueue = [];
        }
    }

    async dispose() {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
        }
        await this.flush();
    }
}

module.exports = { TelemetryService };
