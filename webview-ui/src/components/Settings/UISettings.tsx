/**
 * UI/UX Settings Component
 *
 * Comprehensive UI/UX configuration including:
 * - Theme selector
 * - Font size slider
 * - Syntax highlighting toggle
 * - Diff view preferences
 * - Notification preferences
 * - Sound effects toggle
 * - Panel position preferences
 * - Keyboard shortcuts editor
 */

import React, { useState } from 'react'
import './UISettings.css'

interface UISettingsProps {
  settings: {
    theme: 'system' | 'light' | 'dark'
    fontSize: number
    syntaxHighlighting: boolean
    diffView: {
      inlineView: boolean
      showLineNumbers: boolean
      wordWrap: boolean
      contextLines: number
    }
    notifications: {
      enabled: boolean
      taskComplete: boolean
      taskError: boolean
      desktopNotifications: boolean
      notificationSound: boolean
    }
    soundEffects: {
      enabled: boolean
      volume: number
      messageReceived: boolean
      taskComplete: boolean
      error: boolean
    }
    panelPosition: 'left' | 'right' | 'bottom'
    keyboardShortcuts: {
      [key: string]: string
    }
  }
  onUpdate: (key: string, value: any) => void
}

const DEFAULT_SHORTCUTS = [
  { id: 'openChat', name: 'Open Chat', default: 'Cmd+Shift+L', category: 'Navigation' },
  { id: 'newConversation', name: 'New Conversation', default: 'Cmd+N', category: 'Navigation' },
  { id: 'switchMode', name: 'Switch Mode', default: 'Cmd+M', category: 'Chat' },
  { id: 'sendMessage', name: 'Send Message', default: 'Cmd+Enter', category: 'Chat' },
  { id: 'cancelGeneration', name: 'Cancel Generation', default: 'Escape', category: 'Chat' },
  { id: 'clearChat', name: 'Clear Chat', default: 'Cmd+K', category: 'Chat' },
  { id: 'showHistory', name: 'Show History', default: 'Cmd+H', category: 'Navigation' },
  { id: 'showSettings', name: 'Show Settings', default: 'Cmd+,', category: 'Navigation' },
  { id: 'explainCode', name: 'Explain Code', default: 'Cmd+Shift+E', category: 'Code Actions' },
  { id: 'fixCode', name: 'Fix Code', default: 'Cmd+Shift+F', category: 'Code Actions' },
  { id: 'improveCode', name: 'Improve Code', default: 'Cmd+Shift+I', category: 'Code Actions' },
  { id: 'reviewCode', name: 'Review Code', default: 'Cmd+Shift+R', category: 'Code Actions' }
]

export const UISettings: React.FC<UISettingsProps> = ({ settings, onUpdate }) => {
  const [editingShortcut, setEditingShortcut] = useState<string | null>(null)
  const [shortcutInput, setShortcutInput] = useState('')

  const groupedShortcuts = DEFAULT_SHORTCUTS.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = []
    }
    acc[shortcut.category].push(shortcut)
    return acc
  }, {} as Record<string, typeof DEFAULT_SHORTCUTS>)

  const handleShortcutEdit = (id: string) => {
    const current = settings.keyboardShortcuts[id] || DEFAULT_SHORTCUTS.find(s => s.id === id)?.default || ''
    setEditingShortcut(id)
    setShortcutInput(current)
  }

  const handleShortcutSave = (id: string) => {
    const newShortcuts = { ...settings.keyboardShortcuts, [id]: shortcutInput }
    onUpdate('keyboardShortcuts', newShortcuts)
    setEditingShortcut(null)
    setShortcutInput('')
  }

  const handleShortcutReset = (id: string) => {
    const defaultShortcut = DEFAULT_SHORTCUTS.find(s => s.id === id)?.default
    if (defaultShortcut) {
      const newShortcuts = { ...settings.keyboardShortcuts, [id]: defaultShortcut }
      onUpdate('keyboardShortcuts', newShortcuts)
    }
  }

  return (
    <section className="settings-section ui-settings">
      <h3 className="section-title">🎨 UI/UX Settings</h3>

      {/* 1. Theme Selector */}
      <div className="setting-group theme-selector-section">
        <label className="setting-label">Theme</label>
        <p className="setting-description">
          Choose your preferred color theme (system follows VS Code theme)
        </p>

        <div className="theme-cards">
          <div
            className={`theme-card ${settings.theme === 'system' ? 'selected' : ''}`}
            onClick={() => onUpdate('theme', 'system')}
          >
            <div className="theme-preview system-preview">
              <div className="preview-section light"></div>
              <div className="preview-section dark"></div>
            </div>
            <div className="theme-name">System Default</div>
            <div className="theme-description">Follow VS Code theme</div>
          </div>

          <div
            className={`theme-card ${settings.theme === 'light' ? 'selected' : ''}`}
            onClick={() => onUpdate('theme', 'light')}
          >
            <div className="theme-preview light-preview">
              <div className="preview-section light"></div>
            </div>
            <div className="theme-name">Light</div>
            <div className="theme-description">Always use light theme</div>
          </div>

          <div
            className={`theme-card ${settings.theme === 'dark' ? 'selected' : ''}`}
            onClick={() => onUpdate('theme', 'dark')}
          >
            <div className="theme-preview dark-preview">
              <div className="preview-section dark"></div>
            </div>
            <div className="theme-name">Dark</div>
            <div className="theme-description">Always use dark theme</div>
          </div>
        </div>
      </div>

      {/* 2. Font Size Slider */}
      <div className="setting-group font-size-section">
        <label className="setting-label">
          Font Size: <span className="setting-value">{settings.fontSize}px</span>
        </label>
        <p className="setting-description">
          Adjust the base font size for the chat interface
        </p>

        <div className="font-size-slider-wrapper">
          <span className="slider-label">Small</span>
          <input
            type="range"
            className="font-size-slider"
            min="10"
            max="24"
            step="1"
            value={settings.fontSize}
            onChange={(e) => onUpdate('fontSize', parseInt(e.target.value, 10))}
          />
          <span className="slider-label">Large</span>
        </div>

        <div className="font-size-presets">
          <button
            className={`preset-btn ${settings.fontSize === 12 ? 'active' : ''}`}
            onClick={() => onUpdate('fontSize', 12)}
          >
            Small (12px)
          </button>
          <button
            className={`preset-btn ${settings.fontSize === 14 ? 'active' : ''}`}
            onClick={() => onUpdate('fontSize', 14)}
          >
            Medium (14px)
          </button>
          <button
            className={`preset-btn ${settings.fontSize === 16 ? 'active' : ''}`}
            onClick={() => onUpdate('fontSize', 16)}
          >
            Large (16px)
          </button>
          <button
            className={`preset-btn ${settings.fontSize === 18 ? 'active' : ''}`}
            onClick={() => onUpdate('fontSize', 18)}
          >
            Extra Large (18px)
          </button>
        </div>
      </div>

      {/* 3. Syntax Highlighting Toggle */}
      <div className="setting-group">
        <div className="setting-row">
          <div className="setting-info">
            <label className="setting-label">Syntax Highlighting</label>
            <p className="setting-description">
              Enable syntax highlighting for code blocks in chat
            </p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.syntaxHighlighting}
              onChange={(e) => onUpdate('syntaxHighlighting', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      {/* 4. Diff View Preferences */}
      <div className="setting-group diff-view-section">
        <h4 className="subsection-title">📋 Diff View Preferences</h4>

        <div className="setting-row">
          <div className="setting-info">
            <label className="setting-label">Inline Diff View</label>
            <p className="setting-description">
              Show diffs inline instead of side-by-side
            </p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.diffView.inlineView}
              onChange={(e) => onUpdate('diffView', {
                ...settings.diffView,
                inlineView: e.target.checked
              })}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <label className="setting-label">Show Line Numbers</label>
            <p className="setting-description">
              Display line numbers in diff view
            </p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.diffView.showLineNumbers}
              onChange={(e) => onUpdate('diffView', {
                ...settings.diffView,
                showLineNumbers: e.target.checked
              })}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <label className="setting-label">Word Wrap</label>
            <p className="setting-description">
              Wrap long lines in diff view
            </p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.diffView.wordWrap}
              onChange={(e) => onUpdate('diffView', {
                ...settings.diffView,
                wordWrap: e.target.checked
              })}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <label className="setting-label">Context Lines</label>
            <p className="setting-description">
              Number of unchanged lines to show around changes
            </p>
          </div>
          <input
            type="number"
            className="context-lines-input"
            min="0"
            max="20"
            value={settings.diffView.contextLines}
            onChange={(e) => onUpdate('diffView', {
              ...settings.diffView,
              contextLines: parseInt(e.target.value, 10)
            })}
          />
        </div>
      </div>

      {/* 5. Notification Preferences */}
      <div className="setting-group notification-section">
        <h4 className="subsection-title">🔔 Notification Preferences</h4>

        <div className="setting-row">
          <div className="setting-info">
            <label className="setting-label">Enable Notifications</label>
            <p className="setting-description">
              Show notifications for important events
            </p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.notifications.enabled}
              onChange={(e) => onUpdate('notifications', {
                ...settings.notifications,
                enabled: e.target.checked
              })}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        {settings.notifications.enabled && (
          <>
            <div className="setting-row">
              <div className="setting-info">
                <label className="setting-label">Task Complete</label>
                <p className="setting-description">
                  Notify when AI completes a task
                </p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.notifications.taskComplete}
                  onChange={(e) => onUpdate('notifications', {
                    ...settings.notifications,
                    taskComplete: e.target.checked
                  })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <label className="setting-label">Task Error</label>
                <p className="setting-description">
                  Notify when an error occurs
                </p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.notifications.taskError}
                  onChange={(e) => onUpdate('notifications', {
                    ...settings.notifications,
                    taskError: e.target.checked
                  })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <label className="setting-label">Desktop Notifications</label>
                <p className="setting-description">
                  Show OS-level desktop notifications
                </p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.notifications.desktopNotifications}
                  onChange={(e) => onUpdate('notifications', {
                    ...settings.notifications,
                    desktopNotifications: e.target.checked
                  })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <label className="setting-label">Notification Sound</label>
                <p className="setting-description">
                  Play sound with notifications
                </p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.notifications.notificationSound}
                  onChange={(e) => onUpdate('notifications', {
                    ...settings.notifications,
                    notificationSound: e.target.checked
                  })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </>
        )}
      </div>

      {/* 6. Sound Effects Toggle */}
      <div className="setting-group sound-effects-section">
        <h4 className="subsection-title">🔊 Sound Effects</h4>

        <div className="setting-row">
          <div className="setting-info">
            <label className="setting-label">Enable Sound Effects</label>
            <p className="setting-description">
              Play sounds for various events
            </p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.soundEffects.enabled}
              onChange={(e) => onUpdate('soundEffects', {
                ...settings.soundEffects,
                enabled: e.target.checked
              })}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        {settings.soundEffects.enabled && (
          <>
            <div className="setting-row">
              <div className="setting-info">
                <label className="setting-label">
                  Volume: <span className="setting-value">{Math.round(settings.soundEffects.volume * 100)}%</span>
                </label>
                <p className="setting-description">
                  Master volume for all sound effects
                </p>
              </div>
            </div>

            <div className="volume-slider-wrapper">
              <span className="slider-label">🔇</span>
              <input
                type="range"
                className="volume-slider"
                min="0"
                max="1"
                step="0.1"
                value={settings.soundEffects.volume}
                onChange={(e) => onUpdate('soundEffects', {
                  ...settings.soundEffects,
                  volume: parseFloat(e.target.value)
                })}
              />
              <span className="slider-label">🔊</span>
            </div>

            <div className="sound-checkboxes">
              <div className="sound-checkbox-row">
                <label className="sound-checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.soundEffects.messageReceived}
                    onChange={(e) => onUpdate('soundEffects', {
                      ...settings.soundEffects,
                      messageReceived: e.target.checked
                    })}
                  />
                  <span>Message Received</span>
                </label>
              </div>

              <div className="sound-checkbox-row">
                <label className="sound-checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.soundEffects.taskComplete}
                    onChange={(e) => onUpdate('soundEffects', {
                      ...settings.soundEffects,
                      taskComplete: e.target.checked
                    })}
                  />
                  <span>Task Complete</span>
                </label>
              </div>

              <div className="sound-checkbox-row">
                <label className="sound-checkbox-label">
                  <input
                    type="checkbox"
                    checked={settings.soundEffects.error}
                    onChange={(e) => onUpdate('soundEffects', {
                      ...settings.soundEffects,
                      error: e.target.checked
                    })}
                  />
                  <span>Error</span>
                </label>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 7. Panel Position Preferences */}
      <div className="setting-group panel-position-section">
        <label className="setting-label">Panel Position</label>
        <p className="setting-description">
          Choose where the chat panel appears in VS Code
        </p>

        <div className="panel-position-cards">
          <div
            className={`position-card ${settings.panelPosition === 'left' ? 'selected' : ''}`}
            onClick={() => onUpdate('panelPosition', 'left')}
          >
            <div className="position-icon">📐</div>
            <div className="position-name">Left Sidebar</div>
            <div className="position-description">Default position</div>
          </div>

          <div
            className={`position-card ${settings.panelPosition === 'right' ? 'selected' : ''}`}
            onClick={() => onUpdate('panelPosition', 'right')}
          >
            <div className="position-icon">📏</div>
            <div className="position-name">Right Sidebar</div>
            <div className="position-description">Keep code on left</div>
          </div>

          <div
            className={`position-card ${settings.panelPosition === 'bottom' ? 'selected' : ''}`}
            onClick={() => onUpdate('panelPosition', 'bottom')}
          >
            <div className="position-icon">📊</div>
            <div className="position-name">Bottom Panel</div>
            <div className="position-description">Wide view</div>
          </div>
        </div>
      </div>

      {/* 8. Keyboard Shortcuts Editor */}
      <div className="setting-group keyboard-shortcuts-section">
        <h4 className="subsection-title">⌨️ Keyboard Shortcuts</h4>
        <p className="setting-description">
          Customize keyboard shortcuts for common actions
        </p>

        <div className="shortcuts-list">
          {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
            <div key={category} className="shortcut-category">
              <div className="shortcut-category-name">{category}</div>

              {shortcuts.map(shortcut => {
                const current = settings.keyboardShortcuts[shortcut.id] || shortcut.default
                const isEditing = editingShortcut === shortcut.id

                return (
                  <div key={shortcut.id} className="shortcut-row">
                    <div className="shortcut-info">
                      <div className="shortcut-name">{shortcut.name}</div>
                    </div>

                    <div className="shortcut-actions">
                      {isEditing ? (
                        <>
                          <input
                            type="text"
                            className="shortcut-input"
                            value={shortcutInput}
                            onChange={(e) => setShortcutInput(e.target.value)}
                            placeholder="e.g., Cmd+Shift+K"
                            autoFocus
                          />
                          <button
                            className="shortcut-btn save"
                            onClick={() => handleShortcutSave(shortcut.id)}
                          >
                            Save
                          </button>
                          <button
                            className="shortcut-btn cancel"
                            onClick={() => setEditingShortcut(null)}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <kbd className="shortcut-key">{current}</kbd>
                          <button
                            className="shortcut-btn edit"
                            onClick={() => handleShortcutEdit(shortcut.id)}
                          >
                            Edit
                          </button>
                          {current !== shortcut.default && (
                            <button
                              className="shortcut-btn reset"
                              onClick={() => handleShortcutReset(shortcut.id)}
                            >
                              Reset
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        <button
          className="button-secondary reset-all-shortcuts"
          onClick={() => {
            const resetShortcuts = DEFAULT_SHORTCUTS.reduce((acc, s) => {
              acc[s.id] = s.default
              return acc
            }, {} as Record<string, string>)
            onUpdate('keyboardShortcuts', resetShortcuts)
          }}
        >
          Reset All Shortcuts to Defaults
        </button>
      </div>
    </section>
  )
}
