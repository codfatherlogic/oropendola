/**
 * Context Condenser Service
 *
 * Intelligently condenses conversation context to manage token limits.
 */

import { ClineMessage } from '../../../src/shared/interfaces'
import { CondenseOptions, CondenseResult } from '../types/context-intelligence'

class ContextCondenserImpl {
  /**
   * Condense messages to fit within token budget
   */
  async condense(
    messages: ClineMessage[],
    options: CondenseOptions = {}
  ): Promise<CondenseResult> {
    const {
      targetTokens,
      preserveMessageIds = [],
      strategy = 'balanced',
      preserveCode = true,
      preserveReasoning = false,
    } = options

    const originalCount = messages.length
    let condensed = [...messages]

    // Estimate current tokens
    const currentTokens = this.estimateTokens(condensed)

    if (!targetTokens || currentTokens <= targetTokens) {
      return {
        messages: condensed,
        originalCount,
        condensedCount: condensed.length,
        tokensSaved: 0,
        summary: 'No condensing needed',
      }
    }

    // Apply condensing strategy
    switch (strategy) {
      case 'aggressive':
        condensed = this.aggressiveCondense(condensed, preserveMessageIds, targetTokens)
        break
      case 'conservative':
        condensed = this.conservativeCondense(condensed, preserveMessageIds, targetTokens)
        break
      case 'balanced':
      default:
        condensed = this.balancedCondense(condensed, preserveMessageIds, targetTokens, {
          preserveCode,
          preserveReasoning,
        })
        break
    }

    const condensedTokens = this.estimateTokens(condensed)
    const tokensSaved = currentTokens - condensedTokens

    return {
      messages: condensed,
      originalCount,
      condensedCount: condensed.length,
      tokensSaved,
      summary: this.generateSummary(originalCount, condensed.length, tokensSaved, strategy),
    }
  }

  /**
   * Aggressive condensing - removes most messages except key ones
   */
  private aggressiveCondense(
    messages: ClineMessage[],
    preserveIds: number[],
    targetTokens: number
  ): ClineMessage[] {
    // Keep first message (system/context), last N messages, and preserved messages
    const firstMessage = messages[0]
    const lastMessages = messages.slice(-5) // Keep last 5

    const preserved = messages.filter((msg) => preserveIds.includes(msg.ts))

    const result = [firstMessage, ...preserved, ...lastMessages]

    // Remove duplicates by timestamp
    const unique = result.filter(
      (msg, idx, arr) => arr.findIndex((m) => m.ts === msg.ts) === idx
    )

    return unique.sort((a, b) => a.ts - b.ts)
  }

  /**
   * Conservative condensing - keeps most messages, only removes obvious redundancy
   */
  private conservativeCondense(
    messages: ClineMessage[],
    preserveIds: number[],
    targetTokens: number
  ): ClineMessage[] {
    let result = [...messages]
    let currentTokens = this.estimateTokens(result)

    // Remove long thinking blocks first
    if (currentTokens > targetTokens) {
      result = result.map((msg) => {
        if (msg.type === 'ask' && msg.text && msg.text.includes('<thinking>')) {
          // Keep first 500 chars of thinking
          const shortened = msg.text.replace(
            /<thinking>[\s\S]*?<\/thinking>/g,
            '<thinking>[Condensed...]</thinking>'
          )
          return { ...msg, text: shortened }
        }
        return msg
      })
      currentTokens = this.estimateTokens(result)
    }

    // Remove intermediate tool use details
    if (currentTokens > targetTokens) {
      result = result.filter((msg, idx) => {
        // Keep preserved messages
        if (preserveIds.includes(msg.ts)) return true

        // Keep say messages (user input and assistant responses)
        if (msg.type === 'say') return true

        // Keep ask messages
        if (msg.type === 'ask') return true

        // For tool messages, keep only first and last few
        const toolMessages = result.filter((m) => m.type !== 'say' && m.type !== 'ask')
        const toolIndex = toolMessages.findIndex((m) => m.ts === msg.ts)

        return toolIndex < 3 || toolIndex >= toolMessages.length - 3
      })
    }

    return result
  }

  /**
   * Balanced condensing - smart removal of less important content
   */
  private balancedCondense(
    messages: ClineMessage[],
    preserveIds: number[],
    targetTokens: number,
    options: { preserveCode: boolean; preserveReasoning: boolean }
  ): ClineMessage[] {
    let result = [...messages]
    let currentTokens = this.estimateTokens(result)

    // Step 1: Condense thinking blocks
    if (currentTokens > targetTokens && !options.preserveReasoning) {
      result = result.map((msg) => {
        if (msg.type === 'ask' && msg.text && msg.text.includes('<thinking>')) {
          const shortened = msg.text.replace(
            /<thinking>[\s\S]*?<\/thinking>/g,
            '<thinking>[Reasoning condensed]</thinking>'
          )
          return { ...msg, text: shortened }
        }
        return msg
      })
      currentTokens = this.estimateTokens(result)
    }

    // Step 2: Summarize long tool outputs
    if (currentTokens > targetTokens) {
      result = result.map((msg) => {
        if (msg.type === 'ask' && msg.text && msg.text.length > 2000) {
          const hasCode = options.preserveCode && this.containsCode(msg.text)
          if (!hasCode && !preserveIds.includes(msg.ts)) {
            return {
              ...msg,
              text: msg.text.substring(0, 1000) + '\n\n[... content condensed ...]',
            }
          }
        }
        return msg
      })
      currentTokens = this.estimateTokens(result)
    }

    // Step 3: Remove intermediate messages
    if (currentTokens > targetTokens) {
      const keepFirst = 2
      const keepLast = 10

      result = result.filter((msg, idx) => {
        if (preserveIds.includes(msg.ts)) return true
        if (idx < keepFirst) return true
        if (idx >= result.length - keepLast) return true
        if (msg.type === 'say') return true // Always keep user/assistant says

        return false
      })
    }

    return result
  }

  /**
   * Check if text contains code blocks
   */
  private containsCode(text: string): boolean {
    return /```|`[^`]+`|function |class |const |let |var /.test(text)
  }

  /**
   * Estimate token count (rough approximation)
   * Rule of thumb: ~4 characters per token
   */
  estimateTokens(messages: ClineMessage[]): number {
    const totalChars = messages.reduce((sum, msg) => {
      let chars = 0
      if (msg.text) chars += msg.text.length
      if (msg.partial) chars += msg.partial.length
      return sum + chars
    }, 0)

    return Math.ceil(totalChars / 4)
  }

  /**
   * Generate summary of condensing operation
   */
  private generateSummary(
    originalCount: number,
    condensedCount: number,
    tokensSaved: number,
    strategy: string
  ): string {
    const removed = originalCount - condensedCount
    const percentage = Math.round((tokensSaved / (tokensSaved + this.estimateTokens([]))) * 100)

    return `Condensed conversation using ${strategy} strategy: removed ${removed} messages, saved ~${tokensSaved} tokens (${percentage}%)`
  }
}

export const contextCondenser = new ContextCondenserImpl()
