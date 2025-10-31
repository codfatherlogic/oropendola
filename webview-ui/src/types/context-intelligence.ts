/**
 * Context Intelligence Types
 *
 * Smart context management, condensing, and cost tracking.
 */

import { ClineMessage } from './cline-message'

export interface ContextMetrics {
  /** Total tokens used */
  totalTokens: number

  /** Input tokens */
  inputTokens: number

  /** Output tokens */
  outputTokens: number

  /** Cache read tokens */
  cacheReadTokens?: number

  /** Cache write tokens */
  cacheWriteTokens?: number

  /** Total cost in USD */
  totalCost: number

  /** Context window used (percentage) */
  contextUsagePercent: number

  /** Estimated remaining capacity */
  remainingCapacity: number
}

export interface CondenseOptions {
  /** Target token count after condensing */
  targetTokens?: number

  /** Messages to preserve (don't condense) */
  preserveMessageIds?: number[]

  /** Strategy: aggressive | balanced | conservative */
  strategy?: 'aggressive' | 'balanced' | 'conservative'

  /** Whether to preserve code blocks */
  preserveCode?: boolean

  /** Whether to preserve reasoning */
  preserveReasoning?: boolean
}

export interface CondenseResult {
  /** Condensed messages */
  messages: ClineMessage[]

  /** Original message count */
  originalCount: number

  /** Condensed message count */
  condensedCount: number

  /** Token reduction */
  tokensSaved: number

  /** Summary of what was condensed */
  summary: string
}

export interface CostBreakdown {
  /** Input cost */
  inputCost: number

  /** Output cost */
  outputCost: number

  /** Cache read cost */
  cacheReadCost?: number

  /** Cache write cost */
  cacheWriteCost?: number

  /** Cost per message */
  perMessage: Array<{
    messageId: number
    cost: number
    tokens: number
  }>

  /** Cost by model */
  byModel: Record<string, number>

  /** Cost over time */
  timeline: Array<{
    timestamp: number
    cost: number
    cumulativeCost: number
  }>
}

export interface ContextIntelligence {
  /** Get current context metrics */
  getMetrics: () => ContextMetrics

  /** Condense conversation context */
  condense: (messages: ClineMessage[], options?: CondenseOptions) => Promise<CondenseResult>

  /** Get detailed cost breakdown */
  getCostBreakdown: () => CostBreakdown

  /** Estimate tokens for text */
  estimateTokens: (text: string) => number

  /** Check if context is near limit */
  isNearLimit: (threshold?: number) => boolean

  /** Get optimization suggestions */
  getSuggestions: () => string[]
}
