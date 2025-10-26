/**
 * ContextManager Service
 * 
 * Manages context window usage and triggers auto-condensing.
 * Monitors token usage and ensures we stay within Claude's limits.
 * 
 * Features:
 * - Real-time context monitoring
 * - Auto-condensing at 80% threshold
 * - Manual condensing support
 * - Context preservation strategies
 * - Warning system for approaching limits
 */

import { TokenCounter } from './TokenCounter';
import { MessageCondenser } from './MessageCondenser';

export interface ContextStatus {
    currentTokens: number;
    maxTokens: number;
    percentUsed: number;
    remainingTokens: number;
    needsCondensing: boolean;
    nearLimit: boolean;
}

export interface CondensingResult {
    success: boolean;
    originalMessages: number;
    condensedMessages: number;
    tokensBefore: number;
    tokensAfter: number;
    tokensSaved: number;
    percentReduction: number;
    error?: string;
}

export interface ContextConfig {
    maxTokens?: number;
    autoCondensingThreshold?: number;  // Default: 80%
    criticalThreshold?: number;         // Default: 90%
    reservedOutputTokens?: number;      // Default: 4096
    preserveRecent?: number;            // Keep last N messages uncondensed
}

const DEFAULT_CONFIG: Required<ContextConfig> = {
    maxTokens: 200_000,
    autoCondensingThreshold: 80,
    criticalThreshold: 90,
    reservedOutputTokens: 4096,
    preserveRecent: 5
};

export class ContextManager {
    private tokenCounter: TokenCounter;
    private messageCondenser: MessageCondenser;
    private config: Required<ContextConfig>;
    private listeners: Array<(status: ContextStatus) => void> = [];

    constructor(
        tokenCounter: TokenCounter,
        messageCondenser: MessageCondenser,
        config?: ContextConfig
    ) {
        this.tokenCounter = tokenCounter;
        this.messageCondenser = messageCondenser;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Get current context status
     */
    async getStatus(messages: any[]): Promise<ContextStatus> {
        const tokenCount = await this.tokenCounter.countMessageTokens(messages);
        const currentTokens = tokenCount.total;
        const availableTokens = this.config.maxTokens - this.config.reservedOutputTokens;
        const percentUsed = (currentTokens / availableTokens) * 100;

        const status: ContextStatus = {
            currentTokens,
            maxTokens: this.config.maxTokens,
            percentUsed,
            remainingTokens: availableTokens - currentTokens,
            needsCondensing: percentUsed >= this.config.autoCondensingThreshold,
            nearLimit: percentUsed >= this.config.criticalThreshold
        };

        // Notify listeners
        this.notifyListeners(status);

        return status;
    }

    /**
     * Auto-condense messages if threshold reached
     */
    async autoCondense(messages: any[]): Promise<CondensingResult> {
        const status = await this.getStatus(messages);

        if (!status.needsCondensing) {
            return {
                success: true,
                originalMessages: messages.length,
                condensedMessages: messages.length,
                tokensBefore: status.currentTokens,
                tokensAfter: status.currentTokens,
                tokensSaved: 0,
                percentReduction: 0,
                error: 'No condensing needed - under threshold'
            };
        }

        console.log(`[ContextManager] Auto-condensing triggered at ${status.percentUsed.toFixed(1)}%`);
        return this.condenseMessages(messages);
    }

    /**
     * Manually condense messages
     */
    async condenseMessages(messages: any[]): Promise<CondensingResult> {
        try {
            const tokensBefore = (await this.tokenCounter.countMessageTokens(messages)).total;
            
            // Preserve recent messages
            const preserveCount = this.config.preserveRecent;
            const messagesToCondense = messages.slice(0, -preserveCount);
            const recentMessages = messages.slice(-preserveCount);

            if (messagesToCondense.length === 0) {
                return {
                    success: false,
                    originalMessages: messages.length,
                    condensedMessages: messages.length,
                    tokensBefore,
                    tokensAfter: tokensBefore,
                    tokensSaved: 0,
                    percentReduction: 0,
                    error: 'No messages to condense - all are preserved'
                };
            }

            // Condense older messages
            const condensed = await this.messageCondenser.condenseMessages(messagesToCondense);

            // Combine condensed + preserved messages
            const finalMessages = [...condensed, ...recentMessages];
            const tokensAfter = (await this.tokenCounter.countMessageTokens(finalMessages)).total;
            const tokensSaved = tokensBefore - tokensAfter;
            const percentReduction = (tokensSaved / tokensBefore) * 100;

            console.log(`[ContextManager] Condensed ${messagesToCondense.length} → ${condensed.length} messages`);
            console.log(`[ContextManager] Tokens: ${tokensBefore} → ${tokensAfter} (saved ${tokensSaved}, ${percentReduction.toFixed(1)}%)`);

            return {
                success: true,
                originalMessages: messages.length,
                condensedMessages: finalMessages.length,
                tokensBefore,
                tokensAfter,
                tokensSaved,
                percentReduction
            };

        } catch (error) {
            console.error('[ContextManager] Condensing failed:', error);
            return {
                success: false,
                originalMessages: messages.length,
                condensedMessages: messages.length,
                tokensBefore: 0,
                tokensAfter: 0,
                tokensSaved: 0,
                percentReduction: 0,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Check if condensing should be triggered
     */
    async shouldCondense(messages: any[]): Promise<boolean> {
        const status = await this.getStatus(messages);
        return status.needsCondensing;
    }

    /**
     * Check if at critical limit
     */
    async isCritical(messages: any[]): Promise<boolean> {
        const status = await this.getStatus(messages);
        return status.nearLimit;
    }

    /**
     * Update configuration
     */
    updateConfig(config: Partial<ContextConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Get current configuration
     */
    getConfig(): Required<ContextConfig> {
        return { ...this.config };
    }

    /**
     * Subscribe to context status updates
     */
    onStatusChange(callback: (status: ContextStatus) => void): () => void {
        this.listeners.push(callback);
        // Return unsubscribe function
        return () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    /**
     * Notify all listeners of status change
     */
    private notifyListeners(status: ContextStatus): void {
        this.listeners.forEach(listener => {
            try {
                listener(status);
            } catch (error) {
                console.error('[ContextManager] Listener error:', error);
            }
        });
    }

    /**
     * Calculate optimal condensing target
     * Returns target token count to achieve after condensing
     */
    calculateCondensingTarget(_currentTokens: number): number {
        const availableTokens = this.config.maxTokens - this.config.reservedOutputTokens;
        // Target 50% usage after condensing to avoid immediate re-condensing
        return Math.floor(availableTokens * 0.5);
    }

    /**
     * Estimate messages to remove to reach target
     */
    async estimateMessagesToRemove(messages: any[], targetTokens: number): Promise<number> {
        const currentTokens = (await this.tokenCounter.countMessageTokens(messages)).total;
        const tokensToRemove = currentTokens - targetTokens;

        if (tokensToRemove <= 0) {
            return 0;
        }

        // Estimate avg tokens per message
        const avgTokensPerMessage = currentTokens / messages.length;
        const messagesToRemove = Math.ceil(tokensToRemove / avgTokensPerMessage);

        // Don't remove more than half the messages (keep context)
        return Math.min(messagesToRemove, Math.floor(messages.length / 2));
    }
}

/**
 * Singleton instance for global use
 */
let globalContextManager: ContextManager | null = null;

export function getContextManager(
    tokenCounter: TokenCounter,
    messageCondenser: MessageCondenser,
    config?: ContextConfig
): ContextManager {
    if (!globalContextManager) {
        globalContextManager = new ContextManager(tokenCounter, messageCondenser, config);
    }
    return globalContextManager;
}

export function resetContextManager(): void {
    globalContextManager = null;
}
