/**
 * Keyboard Shortcuts Types
 *
 * Defines the keyboard shortcut system for the extension.
 */

export type KeyModifier = 'ctrl' | 'alt' | 'shift' | 'meta' | 'cmd'

export interface KeyBinding {
  /** Primary key (e.g., 'k', 'Enter', 'Escape') */
  key: string

  /** Modifier keys */
  modifiers?: KeyModifier[]

  /** Alternative key combination for same action */
  alt?: {
    key: string
    modifiers?: KeyModifier[]
  }
}

export type ShortcutAction =
  // Chat actions
  | 'send_message'
  | 'new_conversation'
  | 'clear_chat'
  | 'cancel_request'
  | 'focus_input'

  // Navigation
  | 'open_history'
  | 'open_settings'
  | 'toggle_sidebar'
  | 'next_message'
  | 'prev_message'

  // Editing
  | 'copy_last_response'
  | 'retry_last'
  | 'edit_last_message'

  // Tool actions
  | 'approve_tool'
  | 'reject_tool'
  | 'approve_all'
  | 'reject_all'

  // Context
  | 'condense_context'
  | 'show_context'
  | 'toggle_reasoning'

  // Branching
  | 'create_fork'
  | 'switch_branch'
  | 'show_branches'

  // Misc
  | 'show_shortcuts'
  | 'toggle_auto_approve'
  | 'show_cost'

export interface KeyboardShortcut {
  /** Unique action identifier */
  action: ShortcutAction

  /** Key binding configuration */
  binding: KeyBinding

  /** Human-readable description */
  description: string

  /** Category for grouping in help UI */
  category: 'chat' | 'navigation' | 'editing' | 'tools' | 'context' | 'branching' | 'misc'

  /** Whether this shortcut is enabled */
  enabled: boolean

  /** Whether this shortcut is customizable */
  customizable: boolean

  /** Platform-specific override (if different on mac/windows) */
  platforms?: {
    mac?: KeyBinding
    windows?: KeyBinding
    linux?: KeyBinding
  }
}

export interface ShortcutHandler {
  action: ShortcutAction
  handler: (event: KeyboardEvent) => void | Promise<void>
  condition?: () => boolean
}

export type ShortcutRegistry = Map<ShortcutAction, ShortcutHandler>

export interface ShortcutContextValue {
  /** All registered shortcuts */
  shortcuts: KeyboardShortcut[]

  /** Register a shortcut handler */
  registerHandler: (handler: ShortcutHandler) => void

  /** Unregister a shortcut handler */
  unregisterHandler: (action: ShortcutAction) => void

  /** Update a shortcut binding */
  updateBinding: (action: ShortcutAction, binding: KeyBinding) => void

  /** Enable/disable a shortcut */
  toggleShortcut: (action: ShortcutAction, enabled: boolean) => void

  /** Check if a shortcut is enabled */
  isEnabled: (action: ShortcutAction) => boolean

  /** Get shortcut for an action */
  getShortcut: (action: ShortcutAction) => KeyboardShortcut | undefined
}
