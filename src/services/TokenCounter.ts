/**
 * TokenCounter Service
 * 
 * Handles token counting and cost estimation for Claude API usage.
 * Uses Anthropic's token counting API for accurate measurements.
 * 
 * Features:
 * - Real-time token counting via Claude API
 * - Fallback estimation (4 chars/token)
 * - Cost calculation with cache metrics
 * - Batch message token counting
 */

import Anthropic from '@anthropic-ai/sdk';

export interface TokenCount {
    input: number;
    output: number;
    total: number;
    cacheWrite?: number;
    cacheRead?: number;
}

export interface CostEstimate {
    inputCost: number;
    outputCost: number;
    cacheWriteCost: number;
    cacheReadCost: number;
    totalCost: number;
}

export interface MessageTokenBreakdown {
    messageId: string;
    type: 'ask' | 'say' | 'tool';
    tokens: number;
    cost: number;
}

/**
 * Claude Sonnet 4 Pricing (as of 2025)
 */
const PRICING = {
    INPUT_PER_MTOK: 3.0,        // $3/MTok
    OUTPUT_PER_MTOK: 15.0,      // $15/MTok
    CACHE_WRITE_PER_MTOK: 3.75, // $3.75/MTok
    CACHE_READ_PER_MTOK: 0.30   // $0.30/MTok
};

const MAX_CONTEXT_TOKENS = 200_000; // Claude's context window

export class TokenCounter {
    private anthropic: Anthropic | null = null;
    private apiKeyConfigured: boolean = false;

    constructor(apiKey?: string) {
        if (apiKey) {
            this.anthropic = new Anthropic({ apiKey });
            this.apiKeyConfigured = true;
        } else {
            console.warn('[TokenCounter] No API key provided - using estimation fallback');
        }
    }

    /**
     * Count tokens in a single text string using Claude API
     * Falls back to estimation if API unavailable
     */
    async countTokens(text: string | object): Promise<number> {
        const content = typeof text === 'string' ? text : JSON.stringify(text);
        
        // Try Claude API first
        if (this.anthropic && this.apiKeyConfigured) {
            try {
                const response = await this.anthropic.messages.countTokens({
                    model: 'claude-sonnet-4-20250514',
                    messages: [{ role: 'user', content }]
                });
                return response.input_tokens;
            } catch (error) {
                console.error('[TokenCounter] Claude API error:', error);
                // Fall through to estimation
            }
        }

        // Fallback: rough estimate (4 chars per token)
        return Math.ceil(content.length / 4);
    }

    /**
     * Count tokens across multiple messages
     */
    async countMessageTokens(messages: any[]): Promise<TokenCount> {
        let inputTokens = 0;
        let outputTokens = 0;
        let cacheWrite = 0;
        let cacheRead = 0;

        for (const msg of messages) {
            // Extract text content from various message formats
            const text = this.extractMessageText(msg);
            const tokens = await this.countTokens(text);

            // Categorize by message type
            if (msg.type === 'ask' || msg.ask) {
                inputTokens += tokens;
            } else {
                outputTokens += tokens;
            }

            // Add API metrics if available (from actual API responses)
            if (msg.apiMetrics) {
                inputTokens += msg.apiMetrics.tokensIn || 0;
                outputTokens += msg.apiMetrics.tokensOut || 0;
                cacheWrite += msg.apiMetrics.cacheWrites || 0;
                cacheRead += msg.apiMetrics.cacheReads || 0;
            }
        }

        return {
            input: inputTokens,
            output: outputTokens,
            total: inputTokens + outputTokens,
            cacheWrite: cacheWrite > 0 ? cacheWrite : undefined,
            cacheRead: cacheRead > 0 ? cacheRead : undefined
        };
    }

    /**
     * Get per-message token breakdown
     */
    async getMessageBreakdown(messages: any[]): Promise<MessageTokenBreakdown[]> {
        const breakdown: MessageTokenBreakdown[] = [];

        for (const msg of messages) {
            const text = this.extractMessageText(msg);
            const tokens = await this.countTokens(text);
            const cost = this.calculateTokenCost(
                msg.type === 'ask' ? tokens : 0,
                msg.type === 'say' ? tokens : 0
            );

            breakdown.push({
                messageId: msg.ts || msg.id || Date.now().toString(),
                type: msg.type || 'say',
                tokens,
                cost
            });
        }

        return breakdown;
    }

    /**
     * Calculate cost based on token usage
     */
    calculateCost(tokens: TokenCount): CostEstimate {
        const inputCost = (tokens.input / 1_000_000) * PRICING.INPUT_PER_MTOK;
        const outputCost = (tokens.output / 1_000_000) * PRICING.OUTPUT_PER_MTOK;
        const cacheWriteCost = tokens.cacheWrite
            ? (tokens.cacheWrite / 1_000_000) * PRICING.CACHE_WRITE_PER_MTOK
            : 0;
        const cacheReadCost = tokens.cacheRead
            ? (tokens.cacheRead / 1_000_000) * PRICING.CACHE_READ_PER_MTOK
            : 0;

        return {
            inputCost,
            outputCost,
            cacheWriteCost,
            cacheReadCost,
            totalCost: inputCost + outputCost + cacheWriteCost + cacheReadCost
        };
    }

    /**
     * Calculate cost for specific token amounts (helper)
     */
    private calculateTokenCost(inputTokens: number, outputTokens: number): number {
        const inputCost = (inputTokens / 1_000_000) * PRICING.INPUT_PER_MTOK;
        const outputCost = (outputTokens / 1_000_000) * PRICING.OUTPUT_PER_MTOK;
        return inputCost + outputCost;
    }

    /**
     * Estimate remaining context capacity
     */
    estimateRemainingContext(currentTokens: number, reservedOutput: number = 4096): number {
        const available = MAX_CONTEXT_TOKENS - reservedOutput;
        const remaining = available - currentTokens;
        return Math.max(0, remaining);
    }

    /**
     * Get context usage percentage
     */
    getContextUsagePercent(currentTokens: number, reservedOutput: number = 4096): number {
        const available = MAX_CONTEXT_TOKENS - reservedOutput;
        const percent = (currentTokens / available) * 100;
        return Math.min(100, Math.max(0, percent));
    }

    /**
     * Check if context is near limit (>= 80%)
     */
    isNearLimit(currentTokens: number, threshold: number = 80): boolean {
        return this.getContextUsagePercent(currentTokens) >= threshold;
    }

    /**
     * Check if condensing is required (>= 90%)
     */
    requiresCondensing(currentTokens: number): boolean {
        return this.isNearLimit(currentTokens, 90);
    }

    /**
     * Extract text content from various message formats
     */
    private extractMessageText(msg: any): string {
        if (typeof msg === 'string') return msg;
        
        // Handle different message structures
        if (msg.text) return msg.text;
        if (msg.ask) return msg.ask;
        if (msg.say) return msg.say;
        if (msg.content) {
            return typeof msg.content === 'string' 
                ? msg.content 
                : JSON.stringify(msg.content);
        }
        
        // Fallback: stringify the whole message
        return JSON.stringify(msg);
    }

    /**
     * Estimate tokens without API call (fast but less accurate)
     */
    estimateTokens(text: string): number {
        // Rough estimate: 4 characters per token
        // More accurate estimate would use tokenizer, but this is fast
        return Math.ceil(text.length / 4);
    }

    /**
     * Get pricing information
     */
    getPricing() {
        return { ...PRICING };
    }

    /**
     * Get max context window size
     */
    getMaxContextTokens(): number {
        return MAX_CONTEXT_TOKENS;
    }
}

/**
 * Singleton instance for global use
 */
let globalTokenCounter: TokenCounter | null = null;

export function getTokenCounter(apiKey?: string): TokenCounter {
    if (!globalTokenCounter) {
        globalTokenCounter = new TokenCounter(apiKey);
    }
    return globalTokenCounter;
}

export function resetTokenCounter(): void {
    globalTokenCounter = null;
}
