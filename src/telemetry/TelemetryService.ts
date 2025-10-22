import * as vscode from 'vscode';
import axios from 'axios';

interface TelemetryEvent {
    event: string;
    properties: Record<string, any>;
    timestamp: number;
}

export class TelemetryService {
    private enabled: boolean = true;
    private serverUrl: string;
    private eventQueue: TelemetryEvent[] = [];
    private flushInterval: ReturnType<typeof setInterval> | undefined;
    private sessionId: string;

    constructor(serverUrl: string) {
        this.serverUrl = serverUrl;
        this.sessionId = this.generateSessionId();
        this.enabled = vscode.workspace.getConfiguration('oropendola').get('telemetry.enabled', true);
        
        // Flush events every 30 seconds
        this.flushInterval = setInterval(() => this.flush(), 30000);
    }

    private generateSessionId(): string {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    }

    trackEvent(event: string, properties: Record<string, any> = {}): void {
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

    trackCommand(commandId: string, success: boolean, duration?: number): void {
        this.trackEvent('command_executed', {
            commandId,
            success,
            duration
        });
    }

    trackCompletion(accepted: boolean, language: string, charactersCompleted: number): void {
        this.trackEvent('inline_completion', {
            accepted,
            language,
            charactersCompleted
        });
    }

    trackError(error: Error, context: string): void {
        this.trackEvent('error', {
            message: error.message,
            stack: error.stack,
            context
        });
    }

    async flush(): Promise<void> {
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

    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        if (!enabled) {
            this.eventQueue = [];
        }
    }

    async dispose(): Promise<void> {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
        }
        await this.flush();
    }
}
