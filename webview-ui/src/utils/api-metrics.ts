/**
 * API Metrics Utilities
 * Calculate tokens, cost, and other metrics from messages
 * For Oropendola AI single backend at https://oropendola.ai
 */

import type { ClineMessage, CombinedApiMetrics } from '../types/cline-message'

/**
 * Calculate combined API metrics from all messages
 */
export function getApiMetrics(messages: ClineMessage[]): CombinedApiMetrics {
  let tokensIn = 0
  let tokensOut = 0
  let cacheWrites = 0
  let cacheReads = 0
  let totalCost = 0

  messages.forEach((message) => {
    if (message.apiMetrics) {
      tokensIn += message.apiMetrics.tokensIn || 0
      tokensOut += message.apiMetrics.tokensOut || 0
      cacheWrites += message.apiMetrics.cacheWrites || 0
      cacheReads += message.apiMetrics.cacheReads || 0
      totalCost += message.apiMetrics.cost || 0
    }
  })

  // Context tokens = total input tokens (approximation)
  const contextTokens = tokensIn

  return {
    tokensIn,
    tokensOut,
    cacheWrites,
    cacheReads,
    totalCost,
    contextTokens,
  }
}

/**
 * Format large numbers with K/M suffixes
 */
export function formatLargeNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`
  }
  return num.toString()
}

/**
 * Format token count with comma separators
 */
export function formatTokens(tokens: number): string {
  return tokens.toLocaleString()
}

/**
 * Format cost in dollars
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`
}

/**
 * Calculate cost from tokens
 * This is a fallback - the backend should provide actual costs
 */
export function calculateCost(tokensIn: number, tokensOut: number, cacheReads: number = 0): number {
  // Default pricing (backend may override based on selected model)
  const INPUT_COST_PER_1M = 3.0    // $3 per 1M input tokens
  const OUTPUT_COST_PER_1M = 15.0  // $15 per 1M output tokens
  const CACHE_READ_COST_PER_1M = 0.30 // $0.30 per 1M cache read tokens

  const inputCost = (tokensIn / 1_000_000) * INPUT_COST_PER_1M
  const outputCost = (tokensOut / 1_000_000) * OUTPUT_COST_PER_1M
  const cacheCost = (cacheReads / 1_000_000) * CACHE_READ_COST_PER_1M

  return inputCost + outputCost + cacheCost
}

/**
 * Combine sequential API request messages into single messages
 * Makes the UI cleaner by grouping related requests
 */
export function combineApiRequests(messages: ClineMessage[]): ClineMessage[] {
  const combined: ClineMessage[] = []
  let currentRequest: ClineMessage | null = null

  messages.forEach((message) => {
    // Start of a new API request
    if (message.say === 'api_req_started') {
      // Save previous request if any
      if (currentRequest) {
        combined.push(currentRequest)
      }
      currentRequest = { ...message }
    }
    // API request finished - merge metrics into started message
    else if (message.say === 'api_req_finished' && currentRequest) {
      currentRequest.apiMetrics = {
        ...currentRequest.apiMetrics,
        ...message.apiMetrics,
      }
      // Don't add the finished message separately
    }
    // API request retried - update the current request
    else if (message.say === 'api_req_retried' && currentRequest) {
      currentRequest.say = 'api_req_retried'
      currentRequest.text = message.text
    }
    // Regular message
    else {
      // Save previous request if any
      if (currentRequest) {
        combined.push(currentRequest)
        currentRequest = null
      }
      combined.push(message)
    }
  })

  // Don't forget the last request
  if (currentRequest) {
    combined.push(currentRequest)
  }

  return combined
}

/**
 * Combine sequential command messages
 * Groups command execution with its output
 */
export function combineCommandSequences(messages: ClineMessage[]): ClineMessage[] {
  const combined: ClineMessage[] = []
  let pendingCommand: ClineMessage | null = null

  messages.forEach((message) => {
    // Command execution request
    if (message.ask === 'command') {
      pendingCommand = { ...message }
    }
    // Command output - attach to pending command
    else if (message.say === 'command_output' && pendingCommand) {
      // Create a combined message
      combined.push({
        ...pendingCommand,
        say: 'command_output',
        text: `${pendingCommand.text}\n\n${message.text}`,
      })
      pendingCommand = null
    }
    // Regular message
    else {
      if (pendingCommand) {
        combined.push(pendingCommand)
        pendingCommand = null
      }
      combined.push(message)
    }
  })

  // Don't forget pending command
  if (pendingCommand) {
    combined.push(pendingCommand)
  }

  return combined
}

/**
 * Get the latest API request ID from messages
 */
export function getLatestApiRequestId(messages: ClineMessage[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.apiMetrics?.apiRequestId) {
      return msg.apiMetrics.apiRequestId
    }
  }
  return undefined
}

/**
 * Generate a unique API request ID
 * Format: lowercase hex string (like "d037")
 */
export function generateApiRequestId(): string {
  return Math.random().toString(16).substring(2, 6)
}

/**
 * Estimate context window usage percentage
 */
export function getContextUsagePercent(contextTokens: number, contextWindow: number): number {
  if (contextWindow === 0) return 0
  return Math.min(100, Math.round((contextTokens / contextWindow) * 100))
}

/**
 * Check if context window is approaching limit
 */
export function isContextNearLimit(contextTokens: number, contextWindow: number, threshold: number = 0.8): boolean {
  return contextTokens >= contextWindow * threshold
}
