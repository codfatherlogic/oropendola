/**
 * Keyboard Shortcuts Hook
 *
 * Manages keyboard shortcut registration and execution.
 */

import { useEffect, useCallback, useRef } from 'react'
import {
  ShortcutAction,
  ShortcutHandler,
  KeyboardShortcut,
  KeyBinding,
} from '../types/keyboard-shortcuts'
import { getPlatformBinding } from '../config/default-shortcuts'

/**
 * Check if a keyboard event matches a key binding
 */
function matchesBinding(event: KeyboardEvent, binding: KeyBinding): boolean {
  // Check key match
  if (event.key.toLowerCase() !== binding.key.toLowerCase()) {
    return false
  }

  // Check modifiers
  const requiredModifiers = binding.modifiers || []
  const hasCtrl = event.ctrlKey
  const hasAlt = event.altKey
  const hasShift = event.shiftKey
  const hasMeta = event.metaKey

  const needsCtrl = requiredModifiers.includes('ctrl')
  const needsAlt = requiredModifiers.includes('alt')
  const needsShift = requiredModifiers.includes('shift')
  const needsMeta = requiredModifiers.includes('meta') || requiredModifiers.includes('cmd')

  // Exact modifier match required
  return (
    hasCtrl === needsCtrl &&
    hasAlt === needsAlt &&
    hasShift === needsShift &&
    hasMeta === needsMeta
  )
}

/**
 * Hook for registering a keyboard shortcut handler
 */
export function useKeyboardShortcut(
  action: ShortcutAction,
  handler: (event: KeyboardEvent) => void | Promise<void>,
  options: {
    enabled?: boolean
    condition?: () => boolean
    preventDefault?: boolean
  } = {}
) {
  const { enabled = true, condition, preventDefault = true } = options
  const handlerRef = useRef(handler)

  // Update handler ref when it changes
  useEffect(() => {
    handlerRef.current = handler
  }, [handler])

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = async (event: KeyboardEvent) => {
      // Check condition if provided
      if (condition && !condition()) {
        return
      }

      // Get shortcuts from localStorage or defaults
      const shortcuts = getShortcuts()
      const shortcut = shortcuts.find((s) => s.action === action && s.enabled)

      if (!shortcut) return

      const binding = getPlatformBinding(shortcut)

      if (matchesBinding(event, binding)) {
        if (preventDefault) {
          event.preventDefault()
          event.stopPropagation()
        }

        await handlerRef.current(event)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [action, enabled, condition, preventDefault])
}

/**
 * Hook for bulk shortcut registration
 */
export function useShortcutHandlers(handlers: ShortcutHandler[]) {
  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      const shortcuts = getShortcuts()

      for (const handler of handlers) {
        // Check condition if provided
        if (handler.condition && !handler.condition()) {
          continue
        }

        const shortcut = shortcuts.find((s) => s.action === handler.action && s.enabled)
        if (!shortcut) continue

        const binding = getPlatformBinding(shortcut)

        if (matchesBinding(event, binding)) {
          event.preventDefault()
          event.stopPropagation()
          await handler.handler(event)
          break // Only execute first matching handler
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlers])
}

/**
 * Get shortcuts from localStorage or defaults
 */
function getShortcuts(): KeyboardShortcut[] {
  try {
    const stored = localStorage.getItem('keyboardShortcuts')
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (err) {
    console.error('[Shortcuts] Failed to load from localStorage:', err)
  }

  // Return defaults from config
  const { DEFAULT_SHORTCUTS } = require('../config/default-shortcuts')
  return DEFAULT_SHORTCUTS
}

/**
 * Save shortcuts to localStorage
 */
export function saveShortcuts(shortcuts: KeyboardShortcut[]): void {
  try {
    localStorage.setItem('keyboardShortcuts', JSON.stringify(shortcuts))
  } catch (err) {
    console.error('[Shortcuts] Failed to save to localStorage:', err)
  }
}

/**
 * Reset shortcuts to defaults
 */
export function resetShortcuts(): void {
  localStorage.removeItem('keyboardShortcuts')
}

/**
 * Update a specific shortcut binding
 */
export function updateShortcutBinding(
  action: ShortcutAction,
  binding: KeyBinding
): void {
  const shortcuts = getShortcuts()
  const index = shortcuts.findIndex((s) => s.action === action)

  if (index !== -1) {
    shortcuts[index].binding = binding
    saveShortcuts(shortcuts)
  }
}

/**
 * Toggle a shortcut on/off
 */
export function toggleShortcut(action: ShortcutAction, enabled: boolean): void {
  const shortcuts = getShortcuts()
  const index = shortcuts.findIndex((s) => s.action === action)

  if (index !== -1) {
    shortcuts[index].enabled = enabled
    saveShortcuts(shortcuts)
  }
}

/**
 * Get a specific shortcut
 */
export function getShortcut(action: ShortcutAction): KeyboardShortcut | undefined {
  const shortcuts = getShortcuts()
  return shortcuts.find((s) => s.action === action)
}

/**
 * Get all shortcuts grouped by category
 */
export function getShortcutsByCategory(): Record<
  KeyboardShortcut['category'],
  KeyboardShortcut[]
> {
  const shortcuts = getShortcuts()
  const grouped: Record<string, KeyboardShortcut[]> = {}

  shortcuts.forEach((shortcut) => {
    if (!grouped[shortcut.category]) {
      grouped[shortcut.category] = []
    }
    grouped[shortcut.category].push(shortcut)
  })

  return grouped as Record<KeyboardShortcut['category'], KeyboardShortcut[]>
}

// Legacy export for backward compatibility
export const useKeyboardShortcuts = useShortcutHandlers
export default useKeyboardShortcuts
