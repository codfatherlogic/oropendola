/**
 * Default Keyboard Shortcuts Configuration
 *
 * Defines the default keyboard shortcuts for the extension.
 * Based on common IDE and chat application patterns.
 */

import { KeyboardShortcut } from '../types/keyboard-shortcuts'

export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  // Chat actions
  {
    action: 'send_message',
    binding: { key: 'Enter', modifiers: ['meta'] },
    description: 'Send message',
    category: 'chat',
    enabled: true,
    customizable: true,
    platforms: {
      windows: { key: 'Enter', modifiers: ['ctrl'] },
      linux: { key: 'Enter', modifiers: ['ctrl'] },
    },
  },
  {
    action: 'new_conversation',
    binding: { key: 'n', modifiers: ['meta', 'shift'] },
    description: 'Start new conversation',
    category: 'chat',
    enabled: true,
    customizable: true,
    platforms: {
      windows: { key: 'n', modifiers: ['ctrl', 'shift'] },
      linux: { key: 'n', modifiers: ['ctrl', 'shift'] },
    },
  },
  {
    action: 'clear_chat',
    binding: { key: 'k', modifiers: ['meta', 'shift'] },
    description: 'Clear chat history',
    category: 'chat',
    enabled: true,
    customizable: true,
    platforms: {
      windows: { key: 'k', modifiers: ['ctrl', 'shift'] },
      linux: { key: 'k', modifiers: ['ctrl', 'shift'] },
    },
  },
  {
    action: 'cancel_request',
    binding: { key: 'Escape' },
    description: 'Cancel current request',
    category: 'chat',
    enabled: true,
    customizable: false,
  },
  {
    action: 'focus_input',
    binding: { key: 'i', modifiers: ['meta'] },
    description: 'Focus input field',
    category: 'chat',
    enabled: true,
    customizable: true,
    platforms: {
      windows: { key: 'i', modifiers: ['ctrl'] },
      linux: { key: 'i', modifiers: ['ctrl'] },
    },
  },

  // Navigation
  {
    action: 'open_history',
    binding: { key: 'h', modifiers: ['meta', 'shift'] },
    description: 'Open conversation history',
    category: 'navigation',
    enabled: true,
    customizable: true,
    platforms: {
      windows: { key: 'h', modifiers: ['ctrl', 'shift'] },
      linux: { key: 'h', modifiers: ['ctrl', 'shift'] },
    },
  },
  {
    action: 'open_settings',
    binding: { key: ',', modifiers: ['meta'] },
    description: 'Open settings',
    category: 'navigation',
    enabled: true,
    customizable: true,
    platforms: {
      windows: { key: ',', modifiers: ['ctrl'] },
      linux: { key: ',', modifiers: ['ctrl'] },
    },
  },
  {
    action: 'toggle_sidebar',
    binding: { key: 'b', modifiers: ['meta'] },
    description: 'Toggle sidebar',
    category: 'navigation',
    enabled: true,
    customizable: true,
    platforms: {
      windows: { key: 'b', modifiers: ['ctrl'] },
      linux: { key: 'b', modifiers: ['ctrl'] },
    },
  },
  {
    action: 'next_message',
    binding: { key: 'ArrowDown', modifiers: ['meta'] },
    description: 'Navigate to next message',
    category: 'navigation',
    enabled: true,
    customizable: true,
    platforms: {
      windows: { key: 'ArrowDown', modifiers: ['ctrl'] },
      linux: { key: 'ArrowDown', modifiers: ['ctrl'] },
    },
  },
  {
    action: 'prev_message',
    binding: { key: 'ArrowUp', modifiers: ['meta'] },
    description: 'Navigate to previous message',
    category: 'navigation',
    enabled: true,
    customizable: true,
    platforms: {
      windows: { key: 'ArrowUp', modifiers: ['ctrl'] },
      linux: { key: 'ArrowUp', modifiers: ['ctrl'] },
    },
  },

  // Editing
  {
    action: 'copy_last_response',
    binding: { key: 'c', modifiers: ['meta', 'shift'] },
    description: 'Copy last AI response',
    category: 'editing',
    enabled: true,
    customizable: true,
    platforms: {
      windows: { key: 'c', modifiers: ['ctrl', 'shift'] },
      linux: { key: 'c', modifiers: ['ctrl', 'shift'] },
    },
  },
  {
    action: 'retry_last',
    binding: { key: 'r', modifiers: ['meta', 'shift'] },
    description: 'Retry last request',
    category: 'editing',
    enabled: true,
    customizable: true,
    platforms: {
      windows: { key: 'r', modifiers: ['ctrl', 'shift'] },
      linux: { key: 'r', modifiers: ['ctrl', 'shift'] },
    },
  },
  {
    action: 'edit_last_message',
    binding: { key: 'e', modifiers: ['meta'] },
    description: 'Edit last message',
    category: 'editing',
    enabled: true,
    customizable: true,
    platforms: {
      windows: { key: 'e', modifiers: ['ctrl'] },
      linux: { key: 'e', modifiers: ['ctrl'] },
    },
  },

  // Tool actions
  {
    action: 'approve_tool',
    binding: { key: 'Enter', modifiers: ['meta', 'shift'] },
    description: 'Approve tool execution',
    category: 'tools',
    enabled: true,
    customizable: true,
    platforms: {
      windows: { key: 'Enter', modifiers: ['ctrl', 'shift'] },
      linux: { key: 'Enter', modifiers: ['ctrl', 'shift'] },
    },
  },
  {
    action: 'reject_tool',
    binding: { key: 'Backspace', modifiers: ['meta', 'shift'] },
    description: 'Reject tool execution',
    category: 'tools',
    enabled: true,
    customizable: true,
    platforms: {
      windows: { key: 'Backspace', modifiers: ['ctrl', 'shift'] },
      linux: { key: 'Backspace', modifiers: ['ctrl', 'shift'] },
    },
  },
  {
    action: 'approve_all',
    binding: { key: 'a', modifiers: ['meta', 'shift'] },
    description: 'Approve all pending tools',
    category: 'tools',
    enabled: true,
    customizable: true,
    platforms: {
      windows: { key: 'a', modifiers: ['ctrl', 'shift'] },
      linux: { key: 'a', modifiers: ['ctrl', 'shift'] },
    },
  },
  {
    action: 'reject_all',
    binding: { key: 'd', modifiers: ['meta', 'shift'] },
    description: 'Reject all pending tools',
    category: 'tools',
    enabled: true,
    customizable: true,
    platforms: {
      windows: { key: 'd', modifiers: ['ctrl', 'shift'] },
      linux: { key: 'd', modifiers: ['ctrl', 'shift'] },
    },
  },

  // Context
  {
    action: 'condense_context',
    binding: { key: 'l', modifiers: ['meta', 'shift'] },
    description: 'Condense conversation context',
    category: 'context',
    enabled: true,
    customizable: true,
    platforms: {
      windows: { key: 'l', modifiers: ['ctrl', 'shift'] },
      linux: { key: 'l', modifiers: ['ctrl', 'shift'] },
    },
  },
  {
    action: 'show_context',
    binding: { key: 'j', modifiers: ['meta', 'shift'] },
    description: 'Show context window info',
    category: 'context',
    enabled: true,
    customizable: true,
    platforms: {
      windows: { key: 'j', modifiers: ['ctrl', 'shift'] },
      linux: { key: 'j', modifiers: ['ctrl', 'shift'] },
    },
  },
  {
    action: 'toggle_reasoning',
    binding: { key: 't', modifiers: ['meta', 'shift'] },
    description: 'Toggle reasoning display',
    category: 'context',
    enabled: true,
    customizable: true,
    platforms: {
      windows: { key: 't', modifiers: ['ctrl', 'shift'] },
      linux: { key: 't', modifiers: ['ctrl', 'shift'] },
    },
  },

  // Branching
  {
    action: 'create_fork',
    binding: { key: 'f', modifiers: ['meta', 'shift'] },
    description: 'Create conversation fork',
    category: 'branching',
    enabled: true,
    customizable: true,
    platforms: {
      windows: { key: 'f', modifiers: ['ctrl', 'shift'] },
      linux: { key: 'f', modifiers: ['ctrl', 'shift'] },
    },
  },
  {
    action: 'switch_branch',
    binding: { key: 'b', modifiers: ['meta', 'shift'] },
    description: 'Switch conversation branch',
    category: 'branching',
    enabled: true,
    customizable: true,
    platforms: {
      windows: { key: 'b', modifiers: ['ctrl', 'shift'] },
      linux: { key: 'b', modifiers: ['ctrl', 'shift'] },
    },
  },
  {
    action: 'show_branches',
    binding: { key: 'g', modifiers: ['meta', 'shift'] },
    description: 'Show all branches',
    category: 'branching',
    enabled: true,
    customizable: true,
    platforms: {
      windows: { key: 'g', modifiers: ['ctrl', 'shift'] },
      linux: { key: 'g', modifiers: ['ctrl', 'shift'] },
    },
  },

  // Misc
  {
    action: 'show_shortcuts',
    binding: { key: '/', modifiers: ['meta'] },
    description: 'Show keyboard shortcuts',
    category: 'misc',
    enabled: true,
    customizable: false,
    platforms: {
      windows: { key: '/', modifiers: ['ctrl'] },
      linux: { key: '/', modifiers: ['ctrl'] },
    },
  },
  {
    action: 'toggle_auto_approve',
    binding: { key: 'p', modifiers: ['meta', 'shift'] },
    description: 'Toggle auto-approve',
    category: 'misc',
    enabled: true,
    customizable: true,
    platforms: {
      windows: { key: 'p', modifiers: ['ctrl', 'shift'] },
      linux: { key: 'p', modifiers: ['ctrl', 'shift'] },
    },
  },
  {
    action: 'show_cost',
    binding: { key: 'm', modifiers: ['meta', 'shift'] },
    description: 'Show cost breakdown',
    category: 'misc',
    enabled: true,
    customizable: true,
    platforms: {
      windows: { key: 'm', modifiers: ['ctrl', 'shift'] },
      linux: { key: 'm', modifiers: ['ctrl', 'shift'] },
    },
  },
]

/**
 * Get platform-specific key binding
 */
export function getPlatformBinding(shortcut: KeyboardShortcut): typeof shortcut.binding {
  const platform = navigator.platform.toLowerCase()

  if (platform.includes('mac') && shortcut.platforms?.mac) {
    return shortcut.platforms.mac
  } else if (platform.includes('win') && shortcut.platforms?.windows) {
    return shortcut.platforms.windows
  } else if (platform.includes('linux') && shortcut.platforms?.linux) {
    return shortcut.platforms.linux
  }

  return shortcut.binding
}

/**
 * Format shortcut for display (e.g., "Cmd+Shift+K")
 */
export function formatShortcut(binding: typeof DEFAULT_SHORTCUTS[0]['binding']): string {
  const platform = navigator.platform.toLowerCase()
  const isMac = platform.includes('mac')

  const modifierMap: Record<string, string> = {
    meta: isMac ? '⌘' : 'Ctrl',
    ctrl: isMac ? '⌃' : 'Ctrl',
    alt: isMac ? '⌥' : 'Alt',
    shift: isMac ? '⇧' : 'Shift',
    cmd: '⌘',
  }

  const parts: string[] = []

  if (binding.modifiers) {
    binding.modifiers.forEach((mod) => {
      parts.push(modifierMap[mod] || mod)
    })
  }

  // Format special keys
  const keyMap: Record<string, string> = {
    Enter: '↵',
    Escape: 'Esc',
    Backspace: '⌫',
    Delete: '⌦',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
  }

  parts.push(keyMap[binding.key] || binding.key.toUpperCase())

  return parts.join(isMac ? '' : '+')
}
