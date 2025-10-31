/**
 * Shortcuts Panel Component
 *
 * Displays all available keyboard shortcuts grouped by category.
 */

import React from 'react'
import { X } from 'lucide-react'
import { getShortcutsByCategory } from '../../hooks/useKeyboardShortcuts'
import { formatShortcut, getPlatformBinding } from '../../config/default-shortcuts'
import './ShortcutsPanel.css'

export interface ShortcutsPanelProps {
  isOpen: boolean
  onClose: () => void
}

const categoryTitles: Record<string, string> = {
  chat: 'Chat Actions',
  navigation: 'Navigation',
  editing: 'Editing',
  tools: 'Tool Actions',
  context: 'Context Management',
  branching: 'Conversation Branching',
  misc: 'Miscellaneous',
}

export const ShortcutsPanel: React.FC<ShortcutsPanelProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  const shortcutsByCategory = getShortcutsByCategory()

  return (
    <div className="shortcuts-panel-overlay" onClick={onClose}>
      <div className="shortcuts-panel" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-panel-header">
          <h2>Keyboard Shortcuts</h2>
          <button className="shortcuts-panel-close" onClick={onClose} title="Close">
            <X size={20} />
          </button>
        </div>

        <div className="shortcuts-panel-content">
          {Object.entries(shortcutsByCategory).map(([category, shortcuts]) => (
            <div key={category} className="shortcuts-category">
              <h3 className="shortcuts-category-title">{categoryTitles[category] || category}</h3>
              <div className="shortcuts-list">
                {shortcuts
                  .filter((s) => s.enabled)
                  .map((shortcut) => {
                    const binding = getPlatformBinding(shortcut)
                    return (
                      <div key={shortcut.action} className="shortcut-item">
                        <span className="shortcut-description">{shortcut.description}</span>
                        <kbd className="shortcut-keys">{formatShortcut(binding)}</kbd>
                      </div>
                    )
                  })}
              </div>
            </div>
          ))}
        </div>

        <div className="shortcuts-panel-footer">
          <p>Press <kbd>Cmd+/</kbd> (Mac) or <kbd>Ctrl+/</kbd> (Windows/Linux) to toggle this panel</p>
        </div>
      </div>
    </div>
  )
}

ShortcutsPanel.displayName = 'ShortcutsPanel'
