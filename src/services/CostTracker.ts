/**
 * CostTracker Service
 * 
 * Tracks and aggregates API costs per task.
 * Integrates with TokenCounter for cost calculations.
 * Stores cost data in TaskStorage for persistence.
 * 
 * Features:
 * - Per-task cost aggregation
 * - Per-message cost tracking
 * - Cache hit/miss analytics
 * - Cost history and trends
 * - Budget alerts
 */

import { TokenCounter, TokenCount, CostEstimate } from './TokenCounter';

export interface MessageCost {
    messageId: string;
    timestamp: number;
    type: 'ask' | 'say' | 'tool';
    tokens: TokenCount;
    cost: CostEstimate;
}

export interface TaskCost {
    taskId: string;
    totalMessages: number;
    totalTokens: TokenCount;
    totalCost: CostEstimate;
    messageCosts: MessageCost[];
    startTime: number;
    lastUpdated: number;
}

export interface CostSummary {
    totalTasks: number;
    totalCost: number;
    totalTokens: number;
    avgCostPerTask: number;
    avgTokensPerTask: number;
    cacheHitRate: number;
}

export interface CostAlert {
    type: 'warning' | 'critical';
    message: string;
    currentCost: number;
    threshold: number;
}

export class CostTracker {
    private tokenCounter: TokenCounter;
    private taskCosts: Map<string, TaskCost> = new Map();
    private budgetLimit?: number;
    private warningThreshold: number = 0.8; // 80% of budget

    constructor(tokenCounter: TokenCounter, budgetLimit?: number) {
        this.tokenCounter = tokenCounter;
        this.budgetLimit = budgetLimit;
    }

    /**
     * Track cost for a single message
     */
    async trackMessage(
        taskId: string,
        messageId: string,
        message: any,
        apiMetrics?: {
            tokensIn?: number;
            tokensOut?: number;
            cacheWrites?: number;
            cacheReads?: number;
        }
    ): Promise<MessageCost> {
        // Get or create task cost entry
        let taskCost = this.taskCosts.get(taskId);
        if (!taskCost) {
            taskCost = {
                taskId,
                totalMessages: 0,
                totalTokens: { input: 0, output: 0, total: 0 },
                totalCost: {
                    inputCost: 0,
                    outputCost: 0,
                    cacheWriteCost: 0,
                    cacheReadCost: 0,
                    totalCost: 0
                },
                messageCosts: [],
                startTime: Date.now(),
                lastUpdated: Date.now()
            };
            this.taskCosts.set(taskId, taskCost);
        }

        // Calculate tokens for this message
        const text = this.extractMessageText(message);
        const messageTokens = await this.tokenCounter.countTokens(text);

        // Build token count with API metrics if available
        const tokens: TokenCount = {
            input: apiMetrics?.tokensIn || (message.type === 'ask' ? messageTokens : 0),
            output: apiMetrics?.tokensOut || (message.type === 'say' ? messageTokens : 0),
            total: messageTokens,
            cacheWrite: apiMetrics?.cacheWrites,
            cacheRead: apiMetrics?.cacheReads
        };

        // Calculate cost
        const cost = this.tokenCounter.calculateCost(tokens);

        // Create message cost record
        const messageCost: MessageCost = {
            messageId,
            timestamp: Date.now(),
            type: message.type || 'say',
            tokens,
            cost
        };

        // Update task totals
        taskCost.totalMessages++;
        taskCost.totalTokens.input += tokens.input;
        taskCost.totalTokens.output += tokens.output;
        taskCost.totalTokens.total += tokens.total;
        if (tokens.cacheWrite) {
            taskCost.totalTokens.cacheWrite = (taskCost.totalTokens.cacheWrite || 0) + tokens.cacheWrite;
        }
        if (tokens.cacheRead) {
            taskCost.totalTokens.cacheRead = (taskCost.totalTokens.cacheRead || 0) + tokens.cacheRead;
        }

        taskCost.totalCost.inputCost += cost.inputCost;
        taskCost.totalCost.outputCost += cost.outputCost;
        taskCost.totalCost.cacheWriteCost += cost.cacheWriteCost;
        taskCost.totalCost.cacheReadCost += cost.cacheReadCost;
        taskCost.totalCost.totalCost += cost.totalCost;
        taskCost.lastUpdated = Date.now();

        taskCost.messageCosts.push(messageCost);

        // Check for budget alerts
        this.checkBudgetAlerts(taskCost);

        return messageCost;
    }

    /**
     * Get cost breakdown for a task
     */
    getTaskCost(taskId: string): TaskCost | undefined {
        return this.taskCosts.get(taskId);
    }

    /**
     * Get all tracked tasks
     */
    getAllTaskCosts(): TaskCost[] {
        return Array.from(this.taskCosts.values());
    }

    /**
     * Get summary across all tasks
     */
    getSummary(): CostSummary {
        const tasks = this.getAllTaskCosts();
        
        if (tasks.length === 0) {
            return {
                totalTasks: 0,
                totalCost: 0,
                totalTokens: 0,
                avgCostPerTask: 0,
                avgTokensPerTask: 0,
                cacheHitRate: 0
            };
        }

        const totalCost = tasks.reduce((sum, task) => sum + task.totalCost.totalCost, 0);
        const totalTokens = tasks.reduce((sum, task) => sum + task.totalTokens.total, 0);
        
        // Calculate cache hit rate
        let totalCacheReads = 0;
        let totalCacheWrites = 0;
        tasks.forEach(task => {
            totalCacheReads += task.totalTokens.cacheRead || 0;
            totalCacheWrites += task.totalTokens.cacheWrite || 0;
        });
        const cacheHitRate = totalCacheWrites > 0 
            ? (totalCacheReads / (totalCacheReads + totalCacheWrites)) * 100
            : 0;

        return {
            totalTasks: tasks.length,
            totalCost,
            totalTokens,
            avgCostPerTask: totalCost / tasks.length,
            avgTokensPerTask: totalTokens / tasks.length,
            cacheHitRate
        };
    }

    /**
     * Get cost for a specific time period
     */
    getCostInPeriod(startTime: number, endTime: number): CostSummary {
        const tasks = this.getAllTaskCosts().filter(
            task => task.startTime >= startTime && task.startTime <= endTime
        );

        if (tasks.length === 0) {
            return {
                totalTasks: 0,
                totalCost: 0,
                totalTokens: 0,
                avgCostPerTask: 0,
                avgTokensPerTask: 0,
                cacheHitRate: 0
            };
        }

        const totalCost = tasks.reduce((sum, task) => sum + task.totalCost.totalCost, 0);
        const totalTokens = tasks.reduce((sum, task) => sum + task.totalTokens.total, 0);

        return {
            totalTasks: tasks.length,
            totalCost,
            totalTokens,
            avgCostPerTask: totalCost / tasks.length,
            avgTokensPerTask: totalTokens / tasks.length,
            cacheHitRate: 0 // Would need to track cache metrics separately
        };
    }

    /**
     * Check if budget limit is approaching or exceeded
     */
    checkBudgetAlerts(_taskCost: TaskCost): CostAlert[] {
        const alerts: CostAlert[] = [];

        if (!this.budgetLimit) {
            return alerts;
        }

        const summary = this.getSummary();
        const currentCost = summary.totalCost;
        const percentUsed = (currentCost / this.budgetLimit) * 100;

        if (percentUsed >= 100) {
            alerts.push({
                type: 'critical',
                message: 'Budget limit exceeded!',
                currentCost,
                threshold: this.budgetLimit
            });
        } else if (percentUsed >= this.warningThreshold * 100) {
            alerts.push({
                type: 'warning',
                message: `Budget at ${percentUsed.toFixed(1)}% of limit`,
                currentCost,
                threshold: this.budgetLimit * this.warningThreshold
            });
        }

        return alerts;
    }

    /**
     * Set budget limit
     */
    setBudget(limit: number, warningThreshold: number = 0.8): void {
        this.budgetLimit = limit;
        this.warningThreshold = warningThreshold;
    }

    /**
     * Get remaining budget
     */
    getRemainingBudget(): number | null {
        if (!this.budgetLimit) {
            return null;
        }

        const summary = this.getSummary();
        return Math.max(0, this.budgetLimit - summary.totalCost);
    }

    /**
     * Clear cost data for a specific task
     */
    clearTask(taskId: string): boolean {
        return this.taskCosts.delete(taskId);
    }

    /**
     * Clear all cost data
     */
    clearAll(): void {
        this.taskCosts.clear();
    }

    /**
     * Export cost data for analysis
     */
    exportData(): {
        summary: CostSummary;
        tasks: TaskCost[];
        exportedAt: number;
    } {
        return {
            summary: this.getSummary(),
            tasks: this.getAllTaskCosts(),
            exportedAt: Date.now()
        };
    }

    /**
     * Get cost trend (daily breakdown)
     */
    getDailyTrend(days: number = 7): Array<{ date: string; cost: number; tokens: number }> {
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        const trend: Array<{ date: string; cost: number; tokens: number }> = [];

        for (let i = days - 1; i >= 0; i--) {
            const dayStart = now - (i * oneDayMs);
            const dayEnd = dayStart + oneDayMs;
            const daySummary = this.getCostInPeriod(dayStart, dayEnd);
            
            trend.push({
                date: new Date(dayStart).toISOString().split('T')[0],
                cost: daySummary.totalCost,
                tokens: daySummary.totalTokens
            });
        }

        return trend;
    }

    /**
     * Extract text from various message formats
     */
    private extractMessageText(msg: any): string {
        if (typeof msg === 'string') return msg;
        
        if (msg.text) return msg.text;
        if (msg.ask) return msg.ask;
        if (msg.say) return msg.say;
        if (msg.content) {
            return typeof msg.content === 'string' 
                ? msg.content 
                : JSON.stringify(msg.content);
        }
        
        return JSON.stringify(msg);
    }
}

/**
 * Singleton instance for global use
 */
let globalCostTracker: CostTracker | null = null;

export function getCostTracker(tokenCounter: TokenCounter, budgetLimit?: number): CostTracker {
    if (!globalCostTracker) {
        globalCostTracker = new CostTracker(tokenCounter, budgetLimit);
    }
    return globalCostTracker;
}

export function resetCostTracker(): void {
    globalCostTracker = null;
}
