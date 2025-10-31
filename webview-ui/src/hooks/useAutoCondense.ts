/**
 * Auto Condense Hook
 *
 * Automatically triggers context condensing when token usage approaches limits.
 * Prevents context window overflow by proactively condensing conversation history.
 */

import { useEffect, useRef, useCallback } from 'react'

export interface AutoCondenseOptions {
  /** Context window limit (e.g., 200000 for Claude) */
  contextLimit: number
  /** Trigger condensing when reaching this percentage of limit (0-1) */
  threshold?: number
  /** Minimum interval between auto-condense operations (ms) */
  cooldown?: number
  /** Whether auto-condense is enabled */
  enabled?: boolean
  /** Callback to trigger condensing */
  onCondense?: () => void
}

export interface AutoCondenseResult {
  /** Whether auto-condense should trigger soon */
  shouldCondense: boolean
  /** Current usage percentage (0-1) */
  usagePercentage: number
  /** Tokens until threshold */
  tokensUntilThreshold: number
  /** Manually trigger condensing */
  triggerCondense: () => void
}

/**
 * Hook for automatic context condensing
 */
export function useAutoCondense(
  currentTokens: number,
  options: AutoCondenseOptions
): AutoCondenseResult {
  const {
    contextLimit,
    threshold = 0.75, // Trigger at 75% usage by default
    cooldown = 60000, // 1 minute cooldown by default
    enabled = true,
    onCondense,
  } = options

  const lastCondenseTime = useRef<number>(0)
  const hasTriggeredRef = useRef<boolean>(false)

  const usagePercentage = currentTokens / contextLimit
  const thresholdTokens = contextLimit * threshold
  const tokensUntilThreshold = thresholdTokens - currentTokens
  const shouldCondense = enabled && usagePercentage >= threshold

  /**
   * Check if enough time has passed since last condense
   */
  const canCondense = useCallback(() => {
    const now = Date.now()
    return now - lastCondenseTime.current >= cooldown
  }, [cooldown])

  /**
   * Manually trigger condensing
   */
  const triggerCondense = useCallback(() => {
    if (!onCondense) return

    if (canCondense()) {
      console.log('[AutoCondense] Manually triggering context condensing')
      onCondense()
      lastCondenseTime.current = Date.now()
      hasTriggeredRef.current = true
    } else {
      const timeUntilNext = cooldown - (Date.now() - lastCondenseTime.current)
      console.log(`[AutoCondense] Cooldown active. Next condense available in ${Math.ceil(timeUntilNext / 1000)}s`)
    }
  }, [onCondense, canCondense, cooldown])

  /**
   * Auto-trigger when threshold is reached
   */
  useEffect(() => {
    if (!enabled || !onCondense || !shouldCondense) {
      hasTriggeredRef.current = false
      return
    }

    // Don't trigger if already triggered for this threshold crossing
    if (hasTriggeredRef.current) {
      return
    }

    // Check cooldown
    if (!canCondense()) {
      const timeUntilNext = cooldown - (Date.now() - lastCondenseTime.current)
      console.log(`[AutoCondense] Threshold reached but cooldown active (${Math.ceil(timeUntilNext / 1000)}s remaining)`)
      return
    }

    console.log(`[AutoCondense] Threshold reached (${(usagePercentage * 100).toFixed(1)}% of ${contextLimit} tokens). Triggering auto-condense.`)

    onCondense()
    lastCondenseTime.current = Date.now()
    hasTriggeredRef.current = true
  }, [enabled, onCondense, shouldCondense, canCondense, cooldown, usagePercentage, contextLimit])

  /**
   * Reset triggered flag when usage drops below threshold
   */
  useEffect(() => {
    if (usagePercentage < threshold - 0.05) { // 5% hysteresis
      hasTriggeredRef.current = false
    }
  }, [usagePercentage, threshold])

  return {
    shouldCondense,
    usagePercentage,
    tokensUntilThreshold,
    triggerCondense,
  }
}

/**
 * Get recommended threshold based on context limit
 */
export function getRecommendedThreshold(contextLimit: number): number {
  // Larger context windows can use higher thresholds
  if (contextLimit >= 200000) return 0.75 // 75% for large windows
  if (contextLimit >= 100000) return 0.70 // 70% for medium windows
  return 0.65 // 65% for smaller windows
}

/**
 * Calculate estimated tokens saved by condensing
 */
export function estimateTokensSaved(
  currentTokens: number,
  compressionRatio: number = 0.3 // Assume 70% reduction
): number {
  return Math.floor(currentTokens * compressionRatio)
}
