/**
 * Cost Calculator Service
 *
 * Calculates costs and tracks token usage for AI conversations.
 */

import { ClineMessage, ClineApiReqInfo } from '../../../src/shared/interfaces'
import { ContextMetrics, CostBreakdown } from '../types/context-intelligence'

// Model pricing (per 1M tokens)
const MODEL_PRICING: Record<
  string,
  { input: number; output: number; cacheRead?: number; cacheWrite?: number }
> = {
  'claude-opus-4-20250514': {
    input: 15.0,
    output: 75.0,
    cacheRead: 1.5,
    cacheWrite: 18.75,
  },
  'claude-sonnet-4-20250514': {
    input: 3.0,
    output: 15.0,
    cacheRead: 0.3,
    cacheWrite: 3.75,
  },
  'claude-sonnet-3-5-20241022': {
    input: 3.0,
    output: 15.0,
    cacheRead: 0.3,
    cacheWrite: 3.75,
  },
  'claude-3-5-haiku-20241022': {
    input: 1.0,
    output: 5.0,
    cacheRead: 0.1,
    cacheWrite: 1.25,
  },
  'claude-haiku-3-20240307': {
    input: 0.25,
    output: 1.25,
  },
}

class CostCalculatorImpl {
  /**
   * Calculate metrics for a conversation
   */
  calculateMetrics(messages: ClineMessage[], modelId?: string): ContextMetrics {
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let totalCacheReadTokens = 0
    let totalCacheWriteTokens = 0

    // Extract token info from api_req_finished messages
    messages.forEach((msg) => {
      if (msg.type === 'api_req_finished' && msg.apiMetrics) {
        totalInputTokens += msg.apiMetrics.inputTokens || 0
        totalOutputTokens += msg.apiMetrics.outputTokens || 0
        totalCacheReadTokens += msg.apiMetrics.cacheReadTokens || 0
        totalCacheWriteTokens += msg.apiMetrics.cacheWriteTokens || 0
      }
    })

    const totalTokens = totalInputTokens + totalOutputTokens

    // Calculate cost
    const totalCost = this.calculateCost({
      model: modelId || 'claude-sonnet-3-5-20241022',
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      cacheReadTokens: totalCacheReadTokens,
      cacheWriteTokens: totalCacheWriteTokens,
    })

    // Context limits (approximate)
    const contextLimit = 200000 // 200k tokens for Claude
    const contextUsagePercent = (totalTokens / contextLimit) * 100
    const remainingCapacity = Math.max(0, contextLimit - totalTokens)

    return {
      totalTokens,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      cacheReadTokens: totalCacheReadTokens,
      cacheWriteTokens: totalCacheWriteTokens,
      totalCost,
      contextUsagePercent,
      remainingCapacity,
    }
  }

  /**
   * Calculate cost breakdown
   */
  calculateCostBreakdown(messages: ClineMessage[], modelId?: string): CostBreakdown {
    const perMessage: Array<{ messageId: number; cost: number; tokens: number }> = []
    const byModel: Record<string, number> = {}
    const timeline: Array<{ timestamp: number; cost: number; cumulativeCost: number }> = []

    let cumulativeCost = 0

    messages.forEach((msg) => {
      if (msg.type === 'api_req_finished' && msg.apiMetrics) {
        const model = msg.apiMetrics.model || modelId || 'claude-sonnet-3-5-20241022'
        const cost = this.calculateCost({
          model,
          inputTokens: msg.apiMetrics.inputTokens || 0,
          outputTokens: msg.apiMetrics.outputTokens || 0,
          cacheReadTokens: msg.apiMetrics.cacheReadTokens,
          cacheWriteTokens: msg.apiMetrics.cacheWriteTokens,
        })

        const tokens =
          (msg.apiMetrics.inputTokens || 0) +
          (msg.apiMetrics.outputTokens || 0)

        perMessage.push({
          messageId: msg.ts,
          cost,
          tokens,
        })

        byModel[model] = (byModel[model] || 0) + cost
        cumulativeCost += cost

        timeline.push({
          timestamp: msg.ts,
          cost,
          cumulativeCost,
        })
      }
    })

    const inputCost = this.calculateInputCost(messages, modelId)
    const outputCost = this.calculateOutputCost(messages, modelId)

    return {
      inputCost,
      outputCost,
      perMessage,
      byModel,
      timeline,
    }
  }

  /**
   * Calculate cost for API usage
   */
  private calculateCost(usage: {
    model: string
    inputTokens: number
    outputTokens: number
    cacheReadTokens?: number
    cacheWriteTokens?: number
  }): number {
    const pricing = MODEL_PRICING[usage.model]
    if (!pricing) {
      // Default to Sonnet pricing if model not found
      return (
        (usage.inputTokens * 3.0) / 1_000_000 + (usage.outputTokens * 15.0) / 1_000_000
      )
    }

    let cost = 0

    // Input tokens
    cost += (usage.inputTokens * pricing.input) / 1_000_000

    // Output tokens
    cost += (usage.outputTokens * pricing.output) / 1_000_000

    // Cache read tokens
    if (usage.cacheReadTokens && pricing.cacheRead) {
      cost += (usage.cacheReadTokens * pricing.cacheRead) / 1_000_000
    }

    // Cache write tokens
    if (usage.cacheWriteTokens && pricing.cacheWrite) {
      cost += (usage.cacheWriteTokens * pricing.cacheWrite) / 1_000_000
    }

    return cost
  }

  /**
   * Calculate total input cost
   */
  private calculateInputCost(messages: ClineMessage[], modelId?: string): number {
    let totalCost = 0

    messages.forEach((msg) => {
      if (msg.type === 'api_req_finished' && msg.apiMetrics) {
        const model = msg.apiMetrics.model || modelId || 'claude-sonnet-3-5-20241022'
        const pricing = MODEL_PRICING[model]
        if (pricing) {
          totalCost += ((msg.apiMetrics.inputTokens || 0) * pricing.input) / 1_000_000

          if (msg.apiMetrics.cacheReadTokens && pricing.cacheRead) {
            totalCost += (msg.apiMetrics.cacheReadTokens * pricing.cacheRead) / 1_000_000
          }

          if (msg.apiMetrics.cacheWriteTokens && pricing.cacheWrite) {
            totalCost += (msg.apiMetrics.cacheWriteTokens * pricing.cacheWrite) / 1_000_000
          }
        }
      }
    })

    return totalCost
  }

  /**
   * Calculate total output cost
   */
  private calculateOutputCost(messages: ClineMessage[], modelId?: string): number {
    let totalCost = 0

    messages.forEach((msg) => {
      if (msg.type === 'api_req_finished' && msg.apiMetrics) {
        const model = msg.apiMetrics.model || modelId || 'claude-sonnet-3-5-20241022'
        const pricing = MODEL_PRICING[model]
        if (pricing) {
          totalCost += ((msg.apiMetrics.outputTokens || 0) * pricing.output) / 1_000_000
        }
      }
    })

    return totalCost
  }

  /**
   * Format cost as USD string
   */
  formatCost(cost: number): string {
    if (cost < 0.01) {
      return `$${cost.toFixed(4)}`
    }
    return `$${cost.toFixed(2)}`
  }

  /**
   * Format token count with K/M suffix
   */
  formatTokens(tokens: number): string {
    if (tokens >= 1_000_000) {
      return `${(tokens / 1_000_000).toFixed(1)}M`
    }
    if (tokens >= 1_000) {
      return `${(tokens / 1_000).toFixed(1)}K`
    }
    return tokens.toString()
  }

  /**
   * Get model display name
   */
  getModelName(modelId: string): string {
    const names: Record<string, string> = {
      'claude-opus-4-20250514': 'Claude Opus 4',
      'claude-sonnet-4-20250514': 'Claude Sonnet 4',
      'claude-sonnet-3-5-20241022': 'Claude 3.5 Sonnet',
      'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku',
      'claude-haiku-3-20240307': 'Claude 3 Haiku',
    }

    return names[modelId] || modelId
  }
}

export const costCalculator = new CostCalculatorImpl()
