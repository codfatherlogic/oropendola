/**
 * Unsaved Changes Hook
 *
 * Tracks when there are unsaved changes and warns users before they navigate away.
 * Prevents data loss by showing confirmation dialogs.
 */

import { useState, useEffect, useCallback, useRef } from 'react'

export interface UseUnsavedChangesOptions {
  /** Whether to enable unsaved changes tracking */
  enabled?: boolean
  /** Custom message to show in confirmation dialog */
  message?: string
  /** Callback when user tries to leave with unsaved changes */
  onBeforeUnload?: (event: BeforeUnloadEvent) => void
}

export interface UseUnsavedChangesResult {
  /** Whether there are currently unsaved changes */
  hasUnsavedChanges: boolean
  /** Mark that changes have been made */
  markAsChanged: () => void
  /** Mark that changes have been saved */
  markAsSaved: () => void
  /** Reset unsaved changes state */
  reset: () => void
  /** Show confirmation dialog if there are unsaved changes */
  confirmIfUnsaved: (action: () => void) => void
}

/**
 * Hook for tracking unsaved changes and preventing accidental navigation
 */
export function useUnsavedChanges(
  options: UseUnsavedChangesOptions = {}
): UseUnsavedChangesResult {
  const {
    enabled = true,
    message = 'You have unsaved changes. Are you sure you want to leave?',
    onBeforeUnload,
  } = options

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const messageRef = useRef(message)

  // Update message ref when it changes
  useEffect(() => {
    messageRef.current = message
  }, [message])

  /**
   * Handle beforeunload event to warn about unsaved changes
   */
  const handleBeforeUnload = useCallback(
    (event: BeforeUnloadEvent) => {
      if (!enabled || !hasUnsavedChanges) {
        return
      }

      // Call custom handler if provided
      if (onBeforeUnload) {
        onBeforeUnload(event)
      }

      // Standard way to show confirmation dialog
      event.preventDefault()
      event.returnValue = messageRef.current
      return messageRef.current
    },
    [enabled, hasUnsavedChanges, onBeforeUnload]
  )

  /**
   * Register beforeunload handler
   */
  useEffect(() => {
    if (!enabled) {
      return
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [enabled, handleBeforeUnload])

  /**
   * Mark that changes have been made
   */
  const markAsChanged = useCallback(() => {
    setHasUnsavedChanges(true)
  }, [])

  /**
   * Mark that changes have been saved
   */
  const markAsSaved = useCallback(() => {
    setHasUnsavedChanges(false)
  }, [])

  /**
   * Reset unsaved changes state
   */
  const reset = useCallback(() => {
    setHasUnsavedChanges(false)
  }, [])

  /**
   * Show confirmation dialog if there are unsaved changes, then execute action
   */
  const confirmIfUnsaved = useCallback(
    (action: () => void) => {
      if (!hasUnsavedChanges || !enabled) {
        action()
        return
      }

      const confirmed = window.confirm(messageRef.current)
      if (confirmed) {
        setHasUnsavedChanges(false)
        action()
      }
    },
    [hasUnsavedChanges, enabled]
  )

  return {
    hasUnsavedChanges,
    markAsChanged,
    markAsSaved,
    reset,
    confirmIfUnsaved,
  }
}

/**
 * Hook to track changes to a specific value
 *
 * Automatically marks as changed when value differs from initial value,
 * and marks as saved when they match again.
 */
export function useUnsavedValueChanges<T>(
  currentValue: T,
  initialValue: T,
  options: UseUnsavedChangesOptions = {}
): UseUnsavedChangesResult {
  const unsavedChanges = useUnsavedChanges(options)
  const initialValueRef = useRef(initialValue)

  // Update initial value ref when it changes externally
  useEffect(() => {
    initialValueRef.current = initialValue
  }, [initialValue])

  // Track changes to current value
  useEffect(() => {
    const hasChanges = !deepEqual(currentValue, initialValueRef.current)

    if (hasChanges) {
      unsavedChanges.markAsChanged()
    } else {
      unsavedChanges.markAsSaved()
    }
  }, [currentValue, unsavedChanges])

  return unsavedChanges
}

/**
 * Deep equality check for comparing values
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true

  if (a == null || b == null) return false

  if (typeof a !== typeof b) return false

  if (typeof a !== 'object') return a === b

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false
    }
    return true
  }

  // Handle objects
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)

  if (keysA.length !== keysB.length) return false

  for (const key of keysA) {
    if (!keysB.includes(key)) return false
    if (!deepEqual(a[key], b[key])) return false
  }

  return true
}
