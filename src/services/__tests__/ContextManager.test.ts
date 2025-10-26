/**
 * Unit Tests for ContextManager Service
 * 
 * Tests context monitoring, auto-condensing, and event system.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContextManager } from '../ContextManager';
import { TokenCounter } from '../TokenCounter';
import { MessageCondenser } from '../MessageCondenser';

describe('ContextManager', () => {
    let contextManager: ContextManager;
    let mockTokenCounter: TokenCounter;
    let mockMessageCondenser: MessageCondenser;

    beforeEach(() => {
        // Create mock TokenCounter
        mockTokenCounter = {
            countMessageTokens: vi.fn().mockResolvedValue({
                total: 1000,
                input: 800,
                output: 200
            })
        } as any;

        // Create mock MessageCondenser
        mockMessageCondenser = {
            condenseMessages: vi.fn().mockResolvedValue([
                { 
                    type: 'summary', 
                    text: 'Condensed summary',
                    originalCount: 10
                }
            ])
        } as any;

        contextManager = new ContextManager(
            mockTokenCounter,
            mockMessageCondenser,
            {
                maxTokens: 200_000,
                autoCondensingThreshold: 80,
                criticalThreshold: 90,
                reservedOutputTokens: 4096,
                preserveRecent: 5
            }
        );
    });

    describe('getStatus', () => {
        it('should calculate context status correctly', async () => {
            const messages = [
                { type: 'ask', text: 'Question' },
                { type: 'say', text: 'Answer' }
            ];

            const status = await contextManager.getStatus(messages);

            expect(status).toBeDefined();
            expect(status.currentTokens).toBe(1000);
            expect(status.maxTokens).toBe(200_000);
            expect(status.percentUsed).toBeCloseTo(0.51, 1);
            expect(status.remainingTokens).toBe(195904 - 1000);
            expect(status.needsCondensing).toBe(false);
            expect(status.nearLimit).toBe(false);
        });

        it('should flag needsCondensing at 80% threshold', async () => {
            // Mock 80.1% usage to ensure we're above threshold
            mockTokenCounter.countMessageTokens = vi.fn().mockResolvedValue({
                total: 157_000,
                input: 157_000,
                output: 0
            });

            const messages = Array(100).fill({ type: 'ask', text: 'Test' });
            const status = await contextManager.getStatus(messages);

            expect(status.percentUsed).toBeGreaterThan(80);
            expect(status.needsCondensing).toBe(true);
        });

        it('should flag nearLimit at 90% threshold', async () => {
            // Mock 90.1% usage to ensure we're above threshold
            mockTokenCounter.countMessageTokens = vi.fn().mockResolvedValue({
                total: 177_000,
                input: 177_000,
                output: 0
            });

            const messages = Array(100).fill({ type: 'ask', text: 'Test' });
            const status = await contextManager.getStatus(messages);

            expect(status.percentUsed).toBeGreaterThan(90);
            expect(status.nearLimit).toBe(true);
        });
    });

    describe('autoCondense', () => {
        it('should skip condensing when under threshold', async () => {
            const messages = [
                { type: 'ask', text: 'Q1' },
                { type: 'say', text: 'A1' }
            ];

            const result = await contextManager.autoCondense(messages);

            expect(result.success).toBe(true);
            expect(result.tokensSaved).toBe(0);
            expect(result.error).toContain('No condensing needed');
            expect(mockMessageCondenser.condenseMessages).not.toHaveBeenCalled();
        });

        it('should condense when over threshold', async () => {
            // Mock 85% usage to trigger auto-condense
            mockTokenCounter.countMessageTokens = vi.fn()
                .mockResolvedValueOnce({ total: 166_518, input: 166_518, output: 0 })  // getStatus
                .mockResolvedValueOnce({ total: 166_518, input: 166_518, output: 0 })  // Before condensing
                .mockResolvedValueOnce({ total: 80_000, input: 80_000, output: 0 });    // After condensing

            const messages = Array(15).fill({ type: 'ask', text: 'Test message' });
            const result = await contextManager.autoCondense(messages);

            expect(result.success).toBe(true);
            expect(mockMessageCondenser.condenseMessages).toHaveBeenCalled();
            expect(result.tokensSaved).toBeGreaterThan(0);
        });
    });

    describe('condenseMessages', () => {
        it('should condense and preserve recent messages', async () => {
            mockTokenCounter.countMessageTokens = vi.fn()
                .mockResolvedValueOnce({ total: 10_000, input: 10_000, output: 0 })  // Before
                .mockResolvedValueOnce({ total: 5_000, input: 5_000, output: 0 });    // After

            const messages = Array(20).fill({ type: 'ask', text: 'Message' });
            const result = await contextManager.condenseMessages(messages);

            expect(result.success).toBe(true);
            expect(result.originalMessages).toBe(20);
            expect(result.tokensBefore).toBe(10_000);
            expect(result.tokensAfter).toBe(5_000);
            expect(result.tokensSaved).toBe(5_000);
            expect(result.percentReduction).toBe(50);

            // Should preserve last 5 messages
            expect(mockMessageCondenser.condenseMessages).toHaveBeenCalledWith(
                expect.arrayContaining([expect.objectContaining({ type: 'ask' })])
            );
        });

        it('should not condense when all messages are preserved', async () => {
            const messages = [
                { type: 'ask', text: 'Q1' },
                { type: 'say', text: 'A1' },
                { type: 'ask', text: 'Q2' }
            ];  // Only 3 messages, preserveRecent = 5

            mockTokenCounter.countMessageTokens = vi.fn().mockResolvedValue({
                total: 100,
                input: 100,
                output: 0
            });

            const result = await contextManager.condenseMessages(messages);

            expect(result.success).toBe(false);
            expect(result.error).toContain('No messages to condense');
        });

        it('should handle condensing errors gracefully', async () => {
            mockMessageCondenser.condenseMessages = vi.fn().mockRejectedValue(
                new Error('API error')
            );

            mockTokenCounter.countMessageTokens = vi.fn().mockResolvedValue({
                total: 10_000,
                input: 10_000,
                output: 0
            });

            const messages = Array(20).fill({ type: 'ask', text: 'Test' });
            const result = await contextManager.condenseMessages(messages);

            expect(result.success).toBe(false);
            expect(result.error).toContain('API error');
        });
    });

    describe('shouldCondense', () => {
        it('should return true when over threshold', async () => {
            mockTokenCounter.countMessageTokens = vi.fn().mockResolvedValue({
                total: 160_000,
                input: 160_000,
                output: 0
            });

            const messages = Array(100).fill({ type: 'ask', text: 'Test' });
            const should = await contextManager.shouldCondense(messages);

            expect(should).toBe(true);
        });

        it('should return false when under threshold', async () => {
            mockTokenCounter.countMessageTokens = vi.fn().mockResolvedValue({
                total: 50_000,
                input: 50_000,
                output: 0
            });

            const messages = Array(20).fill({ type: 'ask', text: 'Test' });
            const should = await contextManager.shouldCondense(messages);

            expect(should).toBe(false);
        });
    });

    describe('isCritical', () => {
        it('should return true when near limit', async () => {
            mockTokenCounter.countMessageTokens = vi.fn().mockResolvedValue({
                total: 180_000,
                input: 180_000,
                output: 0
            });

            const messages = Array(100).fill({ type: 'ask', text: 'Test' });
            const critical = await contextManager.isCritical(messages);

            expect(critical).toBe(true);
        });

        it('should return false when not critical', async () => {
            mockTokenCounter.countMessageTokens = vi.fn().mockResolvedValue({
                total: 50_000,
                input: 50_000,
                output: 0
            });

            const messages = Array(20).fill({ type: 'ask', text: 'Test' });
            const critical = await contextManager.isCritical(messages);

            expect(critical).toBe(false);
        });
    });

    describe('configuration', () => {
        it('should update configuration', () => {
            contextManager.updateConfig({
                autoCondensingThreshold: 75
            });

            const config = contextManager.getConfig();
            expect(config.autoCondensingThreshold).toBe(75);
            expect(config.maxTokens).toBe(200_000);  // Unchanged
        });

        it('should get current configuration', () => {
            const config = contextManager.getConfig();

            expect(config.maxTokens).toBe(200_000);
            expect(config.autoCondensingThreshold).toBe(80);
            expect(config.criticalThreshold).toBe(90);
            expect(config.preserveRecent).toBe(5);
        });
    });

    describe('event system', () => {
        it('should notify listeners on status change', async () => {
            const listener = vi.fn();
            contextManager.onStatusChange(listener);

            const messages = [{ type: 'ask', text: 'Test' }];
            await contextManager.getStatus(messages);

            expect(listener).toHaveBeenCalled();
            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({
                    currentTokens: expect.any(Number),
                    percentUsed: expect.any(Number)
                })
            );
        });

        it('should allow unsubscribing from status updates', async () => {
            const listener = vi.fn();
            const unsubscribe = contextManager.onStatusChange(listener);

            const messages = [{ type: 'ask', text: 'Test' }];
            await contextManager.getStatus(messages);
            expect(listener).toHaveBeenCalledTimes(1);

            // Unsubscribe
            unsubscribe();

            await contextManager.getStatus(messages);
            expect(listener).toHaveBeenCalledTimes(1);  // Not called again
        });

        it('should handle listener errors gracefully', async () => {
            const errorListener = vi.fn().mockImplementation(() => {
                throw new Error('Listener error');
            });
            const goodListener = vi.fn();

            contextManager.onStatusChange(errorListener);
            contextManager.onStatusChange(goodListener);

            const messages = [{ type: 'ask', text: 'Test' }];
            await contextManager.getStatus(messages);

            // Both should be called despite error
            expect(errorListener).toHaveBeenCalled();
            expect(goodListener).toHaveBeenCalled();
        });
    });

    describe('utility methods', () => {
        it('should calculate condensing target', () => {
            const target = contextManager.calculateCondensingTarget(150_000);

            // Target should be 50% of available tokens
            const available = 200_000 - 4096;
            const expectedTarget = Math.floor(available * 0.5);
            expect(target).toBe(expectedTarget);
        });

        it('should estimate messages to remove', async () => {
            mockTokenCounter.countMessageTokens = vi.fn().mockResolvedValue({
                total: 10_000,
                input: 10_000,
                output: 0
            });

            const messages = Array(100).fill({ type: 'ask', text: 'Test' });
            const toRemove = await contextManager.estimateMessagesToRemove(messages, 5_000);

            expect(toRemove).toBeGreaterThan(0);
            expect(toRemove).toBeLessThanOrEqual(50);  // Max half the messages
        });

        it('should return 0 when already under target', async () => {
            mockTokenCounter.countMessageTokens = vi.fn().mockResolvedValue({
                total: 5_000,
                input: 5_000,
                output: 0
            });

            const messages = Array(50).fill({ type: 'ask', text: 'Test' });
            const toRemove = await contextManager.estimateMessagesToRemove(messages, 10_000);

            expect(toRemove).toBe(0);
        });
    });

    describe('singleton access', () => {
        it('should provide global instance', async () => {
            const { getContextManager, resetContextManager } = 
                await import('../ContextManager');
            
            resetContextManager();
            const instance1 = getContextManager(mockTokenCounter, mockMessageCondenser);
            const instance2 = getContextManager(mockTokenCounter, mockMessageCondenser);
            
            expect(instance1).toBe(instance2);
        });
    });
});
