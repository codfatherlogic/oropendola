/**
 * Prompt History Hook
 *
 * Manages prompt history navigation with Arrow Up/Down keys.
 * Stores up to 100 recent prompts in localStorage.
 */

import { useState, useEffect, useCallback, useRef } from 'react'

const MAX_HISTORY = 100
const STORAGE_KEY = 'promptHistory'

export interface UsePromptHistoryOptions {
  /** Current input value */
  value: string
  /** Callback when value changes from history navigation */
  onChange: (value: string) => void
  /** Whether history navigation is enabled */
  enabled?: boolean
}

export interface UsePromptHistoryResult {
  /** Navigate to previous prompt (Arrow Up) */
  navigatePrevious: () => void
  /** Navigate to next prompt (Arrow Down) */
  navigateNext: () => void
  /** Add a prompt to history */
  addToHistory: (prompt: string) => void
  /** Clear all history */
  clearHistory: () => void
  /** Get all history items */
  getHistory: () => string[]
  /** Current position in history (-1 = not navigating) */
  currentIndex: number
}

/**
 * Hook for managing prompt history navigation
 */
export function usePromptHistory({
  value,
  onChange,
  enabled = true,
}: UsePromptHistoryOptions): UsePromptHistoryResult {
  const [history, setHistory] = useState<string[]>(() => loadHistory())
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [temporaryValue, setTemporaryValue] = useState('')

  // Load history from localStorage on mount
  useEffect(() => {
    const loaded = loadHistory()
    setHistory(loaded)
  }, [])

  // Save history to localStorage when it changes
  useEffect(() => {
    saveHistory(history)
  }, [history])

  /**
   * Navigate to previous prompt (Arrow Up)
   */
  const navigatePrevious = useCallback(() => {
    if (!enabled || history.length === 0) return

    // If not currently navigating, save current input
    if (currentIndex === -1) {
      setTemporaryValue(value)
      // Move to most recent prompt
      const newIndex = history.length - 1
      setCurrentIndex(newIndex)
      onChange(history[newIndex])
    }
    // If already navigating, move backwards
    else if (currentIndex > 0) {
      const newIndex = currentIndex - 1
      setCurrentIndex(newIndex)
      onChange(history[newIndex])
    }
  }, [enabled, history, currentIndex, value, onChange])

  /**
   * Navigate to next prompt (Arrow Down)
   */
  const navigateNext = useCallback(() => {
    if (!enabled || currentIndex === -1) return

    // If at the end of history, restore temporary value
    if (currentIndex === history.length - 1) {
      setCurrentIndex(-1)
      onChange(temporaryValue)
    }
    // Otherwise move forwards
    else {
      const newIndex = currentIndex + 1
      setCurrentIndex(newIndex)
      onChange(history[newIndex])
    }
  }, [enabled, history, currentIndex, temporaryValue, onChange])

  /**
   * Add a prompt to history
   */
  const addToHistory = useCallback((prompt: string) => {
    const trimmed = prompt.trim()
    if (!trimmed) return

    setHistory((prev) => {
      // Don't add if same as last entry
      if (prev.length > 0 && prev[prev.length - 1] === trimmed) {
        return prev
      }

      // Add to history and limit to MAX_HISTORY
      const updated = [...prev, trimmed].slice(-MAX_HISTORY)
      return updated
    })

    // Reset navigation state
    setCurrentIndex(-1)
    setTemporaryValue('')
  }, [])

  /**
   * Clear all history
   */
  const clearHistory = useCallback(() => {
    setHistory([])
    setCurrentIndex(-1)
    setTemporaryValue('')
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  /**
   * Get all history items
   */
  const getHistory = useCallback(() => {
    return [...history]
  }, [history])

  return {
    navigatePrevious,
    navigateNext,
    addToHistory,
    clearHistory,
    getHistory,
    currentIndex,
  }
}

/**
 * Load history from localStorage
 */
function loadHistory(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        return parsed.slice(-MAX_HISTORY)
      }
    }
  } catch (err) {
    console.error('[PromptHistory] Failed to load from localStorage:', err)
  }
  return []
}

/**
 * Save history to localStorage
 */
function saveHistory(history: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  } catch (err) {
    console.error('[PromptHistory] Failed to save to localStorage:', err)
  }
}
