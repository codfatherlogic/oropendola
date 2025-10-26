/**
 * Unit Tests for CostTracker Service
 * 
 * Tests cost tracking, aggregation, and budget alerts.
 */

import { CostTracker } from '../CostTracker';
import { TokenCounter } from '../TokenCounter';

describe('CostTracker', () => {
    let costTracker: CostTracker;
    let tokenCounter: TokenCounter;

    beforeEach(() => {
        tokenCounter = new TokenCounter();
        costTracker = new CostTracker(tokenCounter);
    });

    describe('trackMessage', () => {
        it('should track message cost correctly', async () => {
            const message = {
                type: 'ask',
                text: 'Hello world'
            };

            const metrics = {
                tokensIn: 1000,
                tokensOut: 500,
                cacheWrites: 200,
                cacheReads: 100
            };

            await costTracker.trackMessage('task1', 'msg1', message, metrics);
            
            const taskCost = costTracker.getTaskCost('task1');
            expect(taskCost).toBeDefined();
            expect(taskCost!.totalMessages).toBe(1);
        });

        it('should aggregate costs across multiple messages', async () => {
            const message1 = { type: 'ask', text: 'Message 1' };
            const message2 = { type: 'say', text: 'Message 2' };

            await costTracker.trackMessage('task1', 'msg1', message1, {
                tokensIn: 1000,
                tokensOut: 500
            });

            await costTracker.trackMessage('task1', 'msg2', message2, {
                tokensIn: 2000,
                tokensOut: 1000
            });

            const taskCost = costTracker.getTaskCost('task1');
            expect(taskCost!.totalMessages).toBe(2);
            expect(taskCost!.totalTokens.input).toBe(3000);
            expect(taskCost!.totalTokens.output).toBe(1500);
        });

        it('should track cache metrics separately', async () => {
            await costTracker.trackMessage('task1', 'msg1', { text: 'test' }, {
                tokensIn: 1000,
                tokensOut: 500,
                cacheWrites: 200,
                cacheReads: 100
            });

            const taskCost = costTracker.getTaskCost('task1');
            expect(taskCost!.totalTokens.cacheWrite).toBe(200);
            expect(taskCost!.totalTokens.cacheRead).toBe(100);
        });
    });

    describe('getTaskCost', () => {
        it('should return undefined for non-existent task', () => {
            const taskCost = costTracker.getTaskCost('non-existent');
            expect(taskCost).toBeUndefined();
        });

        it('should calculate costs correctly', async () => {
            await costTracker.trackMessage('task1', 'msg1', { text: 'test' }, {
                tokensIn: 1_000_000, // 1M tokens = $3
                tokensOut: 1_000_000 // 1M tokens = $15
            });

            const taskCost = costTracker.getTaskCost('task1');
            expect(taskCost!.totalCost.totalCost).toBeCloseTo(18.0, 2);
        });

        it('should calculate cache hit rate', async () => {
            await costTracker.trackMessage('task1', 'msg1', { text: 'test' }, {
                tokensIn: 1000,
                tokensOut: 500,
                cacheWrites: 200,
                cacheReads: 800 // 80% hit rate
            });

            const summary = costTracker.getSummary();
            expect(summary.cacheHitRate).toBeGreaterThan(0);
        });

        it('should return 0 cache hit rate when no cache used', async () => {
            await costTracker.trackMessage('task1', 'msg1', { text: 'test' }, {
                tokensIn: 1000,
                tokensOut: 500
            });

            const summary = costTracker.getSummary();
            expect(summary.cacheHitRate).toBe(0);
        });
    });

    describe('getSummary', () => {
        it('should aggregate across all tasks', async () => {
            await costTracker.trackMessage('task1', 'msg1', { text: 'test' }, {
                tokensIn: 1000,
                tokensOut: 500
            });

            await costTracker.trackMessage('task2', 'msg2', { text: 'test' }, {
                tokensIn: 2000,
                tokensOut: 1000
            });

            const summary = costTracker.getSummary();
            expect(summary.totalTasks).toBe(2);
            expect(summary.totalTokens).toBeGreaterThan(0);
        });

        it('should return zero summary when empty', () => {
            const summary = costTracker.getSummary();
            expect(summary.totalTasks).toBe(0);
            expect(summary.totalCost).toBe(0);
        });
    });

    describe('getDailyTrend', () => {
        it('should return 7 days by default', () => {
            const trend = costTracker.getDailyTrend(7);
            expect(trend).toHaveLength(7);
            expect(trend[0]).toHaveProperty('date');
            expect(trend[0]).toHaveProperty('cost');
            expect(trend[0]).toHaveProperty('tokens');
        });

        it('should group costs by day', async () => {
            await costTracker.trackMessage('task1', 'msg1', { text: 'test' }, {
                tokensIn: 1000,
                tokensOut: 500
            });

            const trend = costTracker.getDailyTrend(7);
            expect(trend.length).toBe(7);
            expect(trend[0]).toHaveProperty('date');
            expect(trend[0]).toHaveProperty('cost');
            expect(trend[0]).toHaveProperty('tokens');
            // Today should have costs
            const today = trend[trend.length - 1];
            expect(today.cost).toBeGreaterThan(0);
        });
    });

    describe('exportData', () => {
        it('should export all cost data', async () => {
            await costTracker.trackMessage('task1', 'msg1', { text: 'test' }, {
                tokensIn: 1000,
                tokensOut: 500
            });

            const data = costTracker.exportData();
            expect(data).toHaveProperty('tasks');
            expect(data).toHaveProperty('summary');
            expect(data).toHaveProperty('exportedAt');
            expect(data.tasks).toHaveLength(1);
        });

        it('should include summary in export', async () => {
            await costTracker.trackMessage('task1', 'msg1', { text: 'test' }, {
                tokensIn: 1000,
                tokensOut: 500
            });

            const data = costTracker.exportData();
            expect(data.summary.totalTasks).toBe(1);
        });
    });
});
