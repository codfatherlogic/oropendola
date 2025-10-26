/**
 * Unit Tests for TokenCounter Service
 * 
 * Tests token counting, cost calculation, and context management.
 */

import { TokenCounter } from '../TokenCounter';

describe('TokenCounter', () => {
    let tokenCounter: TokenCounter;

    beforeEach(() => {
        tokenCounter = new TokenCounter();
    });

    describe('estimateTokens', () => {
        it('should estimate tokens using 4 chars per token rule', () => {
            const text = 'Hello world, this is a test message';
            const estimated = tokenCounter.estimateTokens(text);
            expect(estimated).toBe(Math.ceil(text.length / 4));
        });

        it('should handle empty strings', () => {
            expect(tokenCounter.estimateTokens('')).toBe(0);
        });

        it('should handle long text', () => {
            const longText = 'a'.repeat(10000);
            expect(tokenCounter.estimateTokens(longText)).toBe(2500);
        });
    });

    describe('calculateCost', () => {
        it('should calculate input token cost correctly', () => {
            const tokens = {
                input: 1_000_000,
                output: 0,
                total: 1_000_000
            };
            const cost = tokenCounter.calculateCost(tokens);
            expect(cost.inputCost).toBe(3.0); // $3/MTok
            expect(cost.outputCost).toBe(0);
            expect(cost.totalCost).toBe(3.0);
        });

        it('should calculate output token cost correctly', () => {
            const tokens = {
                input: 0,
                output: 1_000_000,
                total: 1_000_000
            };
            const cost = tokenCounter.calculateCost(tokens);
            expect(cost.inputCost).toBe(0);
            expect(cost.outputCost).toBe(15.0); // $15/MTok
            expect(cost.totalCost).toBe(15.0);
        });

        it('should calculate cache costs correctly', () => {
            const tokens = {
                input: 1_000_000,
                output: 1_000_000,
                total: 2_000_000,
                cacheWrite: 500_000,
                cacheRead: 500_000
            };
            const cost = tokenCounter.calculateCost(tokens);
            expect(cost.cacheWriteCost).toBe(1.875); // $3.75/MTok * 0.5M
            expect(cost.cacheReadCost).toBe(0.15);   // $0.30/MTok * 0.5M
            expect(cost.totalCost).toBeCloseTo(3.0 + 15.0 + 1.875 + 0.15, 2);
        });

        it('should handle zero tokens', () => {
            const tokens = { input: 0, output: 0, total: 0 };
            const cost = tokenCounter.calculateCost(tokens);
            expect(cost.totalCost).toBe(0);
        });

        it('should handle small token counts', () => {
            const tokens = { input: 100, output: 100, total: 200 };
            const cost = tokenCounter.calculateCost(tokens);
            expect(cost.totalCost).toBeCloseTo(0.0018, 4);
        });
    });

    describe('estimateRemainingContext', () => {
        it('should calculate remaining context correctly', () => {
            const remaining = tokenCounter.estimateRemainingContext(100_000, 4096);
            const expected = 200_000 - 4096 - 100_000;
            expect(remaining).toBe(expected);
        });

        it('should return 0 if no space remaining', () => {
            const remaining = tokenCounter.estimateRemainingContext(200_000, 0);
            expect(remaining).toBe(0);
        });

        it('should handle negative remaining gracefully', () => {
            const remaining = tokenCounter.estimateRemainingContext(250_000, 0);
            expect(remaining).toBe(0); // Should not go negative
        });
    });

    describe('getContextUsagePercent', () => {
        it('should calculate usage percentage correctly', () => {
            const percent = tokenCounter.getContextUsagePercent(100_000, 4096);
            const available = 200_000 - 4096;
            const expected = (100_000 / available) * 100;
            expect(percent).toBeCloseTo(expected, 2);
        });

        it('should cap at 100%', () => {
            const percent = tokenCounter.getContextUsagePercent(250_000, 0);
            expect(percent).toBe(100);
        });

        it('should handle 0% usage', () => {
            const percent = tokenCounter.getContextUsagePercent(0, 4096);
            expect(percent).toBe(0);
        });
    });

    describe('isNearLimit', () => {
        it('should return true at 80% threshold', () => {
            const nearLimit = tokenCounter.isNearLimit(157_000, 80);
            expect(nearLimit).toBe(true);
        });

        it('should return false below threshold', () => {
            const nearLimit = tokenCounter.isNearLimit(100_000, 80);
            expect(nearLimit).toBe(false);
        });

        it('should use custom threshold', () => {
            const nearLimit = tokenCounter.isNearLimit(100_000, 50);
            expect(nearLimit).toBe(true);
        });
    });

    describe('requiresCondensing', () => {
        it('should return true at 90% threshold', () => {
            const requires = tokenCounter.requiresCondensing(177_000);
            expect(requires).toBe(true);
        });

        it('should return false below 90%', () => {
            const requires = tokenCounter.requiresCondensing(150_000);
            expect(requires).toBe(false);
        });
    });

    describe('getPricing', () => {
        it('should return current pricing', () => {
            const pricing = tokenCounter.getPricing();
            expect(pricing.INPUT_PER_MTOK).toBe(3.0);
            expect(pricing.OUTPUT_PER_MTOK).toBe(15.0);
            expect(pricing.CACHE_WRITE_PER_MTOK).toBe(3.75);
            expect(pricing.CACHE_READ_PER_MTOK).toBe(0.30);
        });
    });

    describe('getMaxContextTokens', () => {
        it('should return 200k context window', () => {
            expect(tokenCounter.getMaxContextTokens()).toBe(200_000);
        });
    });
});
