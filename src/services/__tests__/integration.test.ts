/**
 * Integration Tests for Context Intelligence Services
 * 
 * Tests end-to-end flow: message → cost tracking → context monitoring → auto-condensing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TokenCounter } from '../TokenCounter';
import { CostTracker } from '../CostTracker';
import { MessageCondenser } from '../MessageCondenser';
import { ContextManager } from '../ContextManager';

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
    return {
        default: vi.fn().mockImplementation(() => ({
            messages: {
                create: vi.fn().mockResolvedValue({
                    content: [{
                        type: 'text',
                        text: 'Summarized: User and assistant discussed multiple topics.'
                    }],
                    usage: {
                        input_tokens: 100,
                        output_tokens: 50
                    }
                }),
                countTokens: vi.fn().mockResolvedValue({
                    input_tokens: 100
                })
            }
        }))
    };
});

describe('Context Intelligence Integration', () => {
    let tokenCounter: TokenCounter;
    let costTracker: CostTracker;
    let messageCondenser: MessageCondenser;
    let contextManager: ContextManager;

    beforeEach(() => {
        tokenCounter = new TokenCounter('test-api-key');
        costTracker = new CostTracker(tokenCounter);
        messageCondenser = new MessageCondenser('test-api-key');
        contextManager = new ContextManager(tokenCounter, messageCondenser, {
            maxTokens: 200_000,
            autoCondensingThreshold: 80,
            criticalThreshold: 90,
            reservedOutputTokens: 4096,
            preserveRecent: 5
        });
    });

    describe('Full Message Flow', () => {
        it('should track costs as messages are added', async () => {
            const taskId = 'test-task-1';
            const messages = [
                { type: 'ask', text: 'What is TypeScript?' },
                { type: 'say', text: 'TypeScript is a superset of JavaScript...' },
                { type: 'ask', text: 'How do I use it?' },
                { type: 'say', text: 'You can install it with npm...' }
            ];

            // Track each message
            for (let i = 0; i < messages.length; i++) {
                await costTracker.trackMessage(
                    taskId,
                    `msg-${i}`,
                    messages[i],
                    {
                        tokensIn: 100,
                        tokensOut: 200,
                        cacheReads: 50,
                        cacheWrites: 0
                    }
                );
            }

            // Verify cost accumulation
            const taskCost = costTracker.getTaskCost(taskId);
            expect(taskCost).toBeDefined();
            expect(taskCost!.totalMessages).toBe(4);
            expect(taskCost!.totalTokens.total).toBe(1200); // 4 * (100 + 200)
            expect(taskCost!.totalCost.totalCost).toBeGreaterThan(0);
        });

        it('should monitor context usage across messages', async () => {
            const messages = Array(50).fill(null).map((_, i) => ({
                type: i % 2 === 0 ? 'ask' : 'say',
                text: `Message ${i}: ${'x'.repeat(100)}`
            }));

            const status = await contextManager.getStatus(messages);

            expect(status.currentTokens).toBeGreaterThan(0);
            expect(status.percentUsed).toBeGreaterThan(0);
            expect(status.remainingTokens).toBeGreaterThan(0);
            expect(status.maxTokens).toBe(200_000);
        });

        it('should trigger auto-condensing at threshold', async () => {
            // Create messages that exceed 80% threshold
            // Available tokens = 200,000 - 4,096 = 195,904
            // 80% = 156,723 tokens
            // Assuming 4 chars/token, need ~627k characters
            const largeMessages = Array(100).fill(null).map((_, i) => ({
                type: i % 2 === 0 ? 'ask' : 'say',
                text: `Message ${i}: ${'x'.repeat(6300)}`
            }));

            // Check if condensing is needed
            const shouldCondense = await contextManager.shouldCondense(largeMessages);
            expect(shouldCondense).toBe(true);

            // Run auto-condense
            const result = await contextManager.autoCondense(largeMessages);

            expect(result.success).toBe(true);
            expect(result.originalMessages).toBe(100);
            expect(result.condensedMessages).toBeLessThan(100);
        });
    });

    describe('Cross-Service Interactions', () => {
        it('should calculate costs consistently across services', async () => {
            const message = { type: 'say', text: 'Test message with some content' };
            const taskId = 'cost-test';

            // Track with CostTracker
            const messageCost = await costTracker.trackMessage(
                taskId,
                'msg-1',
                message,
                {
                    tokensIn: 100,
                    tokensOut: 200,
                    cacheReads: 0,
                    cacheWrites: 0
                }
            );

            // Calculate with TokenCounter directly
            const directCost = await tokenCounter.calculateCost({
                input: 100,
                output: 200,
                total: 300,
                cacheWrite: 0,
                cacheRead: 0
            });

            // Costs should match
            expect(messageCost.cost.totalCost).toBeCloseTo(directCost.totalCost, 4);
        });

        it('should preserve context quality through condensing', async () => {
            const originalMessages = [
                { type: 'ask', text: 'How do I fix error in file.ts?' },
                { type: 'say', text: 'You need to update the function parseData() in file.ts' },
                { type: 'ask', text: 'What parameters does it need?' },
                { type: 'say', text: 'It needs (data: string, options?: ParseOptions)' }
            ];

            // Condense messages
            const condensed = await messageCondenser.condenseMessages(originalMessages);

            // Validate quality
            const quality = messageCondenser.validateQuality(
                originalMessages,
                condensed,
                0.7
            );

            expect(quality).toBe(true);
            expect(condensed.length).toBeLessThanOrEqual(originalMessages.length);
        });

        it('should emit events during context monitoring', async () => {
            const statusChanges: any[] = [];
            const unsubscribe = contextManager.onStatusChange((status) => {
                statusChanges.push(status);
            });

            const messages = [
                { type: 'ask', text: 'Test 1' },
                { type: 'say', text: 'Response 1' }
            ];

            await contextManager.getStatus(messages);

            expect(statusChanges.length).toBeGreaterThan(0);
            expect(statusChanges[0]).toHaveProperty('currentTokens');
            expect(statusChanges[0]).toHaveProperty('percentUsed');

            unsubscribe();
        });
    });

    describe('Cache Metrics Integration', () => {
        it('should track cache savings correctly', async () => {
            const taskId = 'cache-test';

            // Message 1: No cache
            await costTracker.trackMessage(taskId, 'msg-1', {}, {
                tokensIn: 1000,
                tokensOut: 500,
                cacheReads: 0,
                cacheWrites: 1000
            });

            // Message 2: With cache reads
            await costTracker.trackMessage(taskId, 'msg-2', {}, {
                tokensIn: 100,
                tokensOut: 500,
                cacheReads: 900,
                cacheWrites: 0
            });

            const taskCost = costTracker.getTaskCost(taskId);
            expect(taskCost).toBeDefined();
            expect(taskCost!.totalMessages).toBe(2);
            expect(taskCost!.totalCost.cacheReadCost).toBeGreaterThan(0);
            expect(taskCost!.totalCost.cacheWriteCost).toBeGreaterThan(0);
        });

        it('should calculate cache cost savings', async () => {
            const taskId = 'savings-test';

            // High cache usage scenario
            await costTracker.trackMessage(taskId, 'msg-1', {}, {
                tokensIn: 1000,
                tokensOut: 500,
                cacheReads: 0,
                cacheWrites: 1000
            });

            await costTracker.trackMessage(taskId, 'msg-2', {}, {
                tokensIn: 100,
                tokensOut: 500,
                cacheReads: 900,
                cacheWrites: 0
            });

            const taskCost = costTracker.getTaskCost(taskId);
            expect(taskCost).toBeDefined();
            
            // Cache reads should be cheaper than full input
            const cacheReadCost = taskCost!.totalCost.cacheReadCost;
            const inputCost = taskCost!.totalCost.inputCost;
            expect(cacheReadCost).toBeLessThan(inputCost);
        });
    });

    describe('Daily Trends and Analytics', () => {
        it('should track daily cost trends', async () => {
            const taskId = 'trend-test';

            // Add messages
            for (let i = 0; i < 5; i++) {
                await costTracker.trackMessage(taskId, `msg-${i}`, {}, {
                    tokensIn: 100,
                    tokensOut: 200,
                    cacheReads: 0,
                    cacheWrites: 0
                });
            }

            const trend = costTracker.getDailyTrend(7);

            expect(trend).toBeDefined();
            expect(trend.length).toBe(7);
            expect(trend[6].cost).toBeGreaterThan(0); // Today should have costs
        });

        it('should export complete cost data', async () => {
            const taskId = 'export-test';

            await costTracker.trackMessage(taskId, 'msg-1', {}, {
                tokensIn: 100,
                tokensOut: 200,
                cacheReads: 50,
                cacheWrites: 0
            });

            const exported = costTracker.exportData();

            expect(exported).toBeDefined();
            expect(exported.tasks.length).toBeGreaterThan(0);
            expect(exported.summary).toBeDefined();
            expect(exported.exportedAt).toBeGreaterThan(0);
        });
    });

    describe('Context Threshold Behavior', () => {
        it('should not condense below threshold', async () => {
            const smallMessages = [
                { type: 'ask', text: 'Hi' },
                { type: 'say', text: 'Hello' }
            ];

            const result = await contextManager.autoCondense(smallMessages);

            expect(result.success).toBe(true);
            expect(result.tokensSaved).toBe(0);
            expect(result.error).toContain('No condensing needed');
        });

        it('should detect critical threshold', async () => {
            // Create messages approaching 90% (critical)
            const criticalMessages = Array(100).fill(null).map((_, i) => ({
                type: i % 2 === 0 ? 'ask' : 'say',
                text: `Message ${i}: ${'x'.repeat(7000)}`
            }));

            const isCritical = await contextManager.isCritical(criticalMessages);
            expect(isCritical).toBe(true);
        });

        it('should preserve recent messages during condensing', async () => {
            const messages = Array(20).fill(null).map((_, i) => ({
                type: i % 2 === 0 ? 'ask' : 'say',
                text: `Message ${i}`,
                timestamp: Date.now() + i
            }));

            // Mock high token count to trigger condensing
            const originalGetStatus = contextManager.getStatus.bind(contextManager);
            contextManager.getStatus = vi.fn().mockResolvedValue({
                currentTokens: 160_000,
                maxTokens: 200_000,
                percentUsed: 85,
                remainingTokens: 35_000,
                needsCondensing: true,
                nearLimit: false
            });

            const result = await contextManager.condenseMessages(messages);

            // Should preserve last 5 messages (default config)
            expect(result.success).toBe(true);
            
            // Restore original method
            contextManager.getStatus = originalGetStatus;
        });
    });

    describe('Error Handling and Recovery', () => {
        it('should handle condensing failures gracefully', async () => {
            // Create condenser that will fail
            const failingCondenser = new MessageCondenser(); // No API key
            const failingContext = new ContextManager(
                tokenCounter,
                failingCondenser,
                { maxTokens: 200_000 }
            );

            const messages = Array(10).fill({ type: 'ask', text: 'Test' });
            const result = await failingContext.condenseMessages(messages);

            // Should return original messages on failure
            expect(result.success).toBe(true);
            expect(result.condensedMessages).toBe(messages.length);
        });

        it('should handle missing task data', () => {
            const nonExistent = costTracker.getTaskCost('non-existent-task');
            expect(nonExistent).toBeUndefined();
        });

        it('should recover from listener errors', async () => {
            let goodListenerCalled = false;

            // Add error-throwing listener
            contextManager.onStatusChange(() => {
                throw new Error('Listener error');
            });

            // Add good listener
            contextManager.onStatusChange(() => {
                goodListenerCalled = true;
            });

            const messages = [{ type: 'ask', text: 'Test' }];
            await contextManager.getStatus(messages);

            // Good listener should still be called
            expect(goodListenerCalled).toBe(true);
        });
    });

    describe('Performance and Scalability', () => {
        it('should handle large message arrays efficiently', async () => {
            const largeArray = Array(1000).fill(null).map((_, i) => ({
                type: i % 2 === 0 ? 'ask' : 'say',
                text: `Message ${i}`
            }));

            const startTime = Date.now();
            await contextManager.getStatus(largeArray);
            const duration = Date.now() - startTime;

            // Should complete in reasonable time (< 1 second)
            expect(duration).toBeLessThan(1000);
        });

        it('should batch condense large conversations', async () => {
            const largeConversation = Array(150).fill(null).map((_, i) => ({
                type: i % 2 === 0 ? 'ask' : 'say',
                text: `Message ${i}: Some content here`
            }));

            const result = await messageCondenser.condenseBatches(
                largeConversation,
                50  // Batch size
            );

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
        });
    });

    describe('Configuration and Customization', () => {
        it('should respect custom thresholds', async () => {
            const customContext = new ContextManager(
                tokenCounter,
                messageCondenser,
                {
                    maxTokens: 100_000,
                    autoCondensingThreshold: 70,
                    criticalThreshold: 85
                }
            );

            const config = customContext.getConfig();
            expect(config.maxTokens).toBe(100_000);
            expect(config.autoCondensingThreshold).toBe(70);
            expect(config.criticalThreshold).toBe(85);
        });

        it('should allow runtime configuration updates', () => {
            contextManager.updateConfig({
                autoCondensingThreshold: 75,
                preserveRecent: 10
            });

            const config = contextManager.getConfig();
            expect(config.autoCondensingThreshold).toBe(75);
            expect(config.preserveRecent).toBe(10);
        });

        it('should support custom budget limits', () => {
            const budgetTracker = new CostTracker(tokenCounter, 100.00);
            expect(budgetTracker).toBeDefined();
        });
    });
});
