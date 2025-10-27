/**
 * API Metrics Utilities
 * 
 * Extract and aggregate API metrics from message history
 * Matches Roo-Code's metrics calculation pattern
 */

import { ClineMessage } from '../types/cline-message'
import { ApiMetrics } from '../components/Chat/TaskMetrics'

/**
 * Extract API metrics from a single message
 */
export function getMessageMetrics(message: ClineMessage): ApiMetrics | null {
  // Check if message has apiMetrics field (from backend)
  if (message.apiMetrics) {
    return {
      tokensIn: message.apiMetrics.tokensIn ?? 0,
      tokensOut: message.apiMetrics.tokensOut ?? 0,
      cacheWrites: message.apiMetrics.cacheWrites ?? 0,
      cacheReads: message.apiMetrics.cacheReads ?? 0,
      cost: message.apiMetrics.cost ?? 0,
    }
  }

  // No metrics available
  return null
}

/**
 * Aggregate metrics from multiple messages
 */
export function aggregateMetrics(messages: ClineMessage[]): ApiMetrics | null {
  const allMetrics = messages
    .map(getMessageMetrics)
    .filter((m): m is ApiMetrics => m !== null)

  if (allMetrics.length === 0) {
    return null
  }

  return allMetrics.reduce(
    (acc, metrics) => ({
      tokensIn: acc.tokensIn + metrics.tokensIn,
      tokensOut: acc.tokensOut + metrics.tokensOut,
      cacheWrites: (acc.cacheWrites ?? 0) + (metrics.cacheWrites ?? 0),
      cacheReads: (acc.cacheReads ?? 0) + (metrics.cacheReads ?? 0),
      cost: acc.cost + metrics.cost,
    }),
    {
      tokensIn: 0,
      tokensOut: 0,
      cacheWrites: 0,
      cacheReads: 0,
      cost: 0,
    }
  )
}

/**
 * Get metrics for the current task (all messages since task started)
 */
export function getTaskMetrics(
  messages: ClineMessage[],
  taskStartTs?: number
): ApiMetrics | null {
  if (!taskStartTs) {
    // No task start, aggregate all messages
    return aggregateMetrics(messages)
  }

  // Only count messages after task start
  const taskMessages = messages.filter(m => m.ts >= taskStartTs)
  return aggregateMetrics(taskMessages)
}

/**
 * Get metrics for the last N messages
 */
export function getRecentMetrics(
  messages: ClineMessage[],
  count: number = 10
): ApiMetrics | null {
  const recentMessages = messages.slice(-count)
  return aggregateMetrics(recentMessages)
}

/**
 * Calculate total tokens (in + out)
 */
export function getTotalTokens(metrics: ApiMetrics | null): number {
  if (!metrics) return 0
  return metrics.tokensIn + metrics.tokensOut
}

/**
 * Calculate cache hit ratio (reads / (reads + writes))
 */
export function getCacheHitRatio(metrics: ApiMetrics | null): number {
  if (!metrics) return 0
  
  const totalCache = (metrics.cacheReads ?? 0) + (metrics.cacheWrites ?? 0)
  if (totalCache === 0) return 0
  
  return (metrics.cacheReads ?? 0) / totalCache
}

/**
 * Estimate cost per 1K tokens
 */
export function getCostPerThousandTokens(metrics: ApiMetrics | null): number {
  if (!metrics) return 0
  
  const totalTokens = getTotalTokens(metrics)
  if (totalTokens === 0) return 0
  
  return (metrics.cost / totalTokens) * 1000
}

/**
 * Check if metrics are available in messages
 */
export function hasMetrics(messages: ClineMessage[]): boolean {
  return messages.some(m => getMessageMetrics(m) !== null)
}
