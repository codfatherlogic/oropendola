/**
 * Settings View Component
 *
 * Application settings including language selection, theme, and preferences
 */

import React, { useState, useEffect, useCallback } from 'react'
import vscode from '../../vscode-api'
import './SettingsView.css'

interface Language {
  code: string
  name: string
  nativeName: string
  rtl: boolean
  enabled: boolean
}

interface AppSettings {
  language: string
  autoSave: boolean
  notifications: boolean
  telemetry: boolean
  theme: 'system' | 'light' | 'dark'
}

// Roo Code pattern: onDone callback to return to chat
interface SettingsViewProps {
  onDone: () => void
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onDone }) => {
  const [languages, setLanguages] = useState<Language[]>([])
  const [currentLanguage, setCurrentLanguage] = useState('en')
  const [settings, setSettings] = useState<AppSettings>({
    language: 'en',
    autoSave: true,
    notifications: true,
    telemetry: false,
    theme: 'system'
  })
  const [saving, setSaving] = useState(false)

  // Load settings on mount
  useEffect(() => {
    vscode.postMessage({ type: 'getAppSettings' })
    vscode.postMessage({ type: 'getAvailableLanguages' })

    // Listen for messages from extension
    const handleMessage = (event: MessageEvent) => {
      const message = event.data

      switch (message.type) {
        case 'appSettings':
          setSettings(message.settings)
          setCurrentLanguage(message.settings.language)
          break

        case 'availableLanguages':
          setLanguages(message.languages)
          break

        case 'settingsSaved':
          setSaving(false)
          break

        case 'languageChanged':
          setCurrentLanguage(message.language)
          // Apply RTL if needed
          if (message.rtl) {
            document.body.setAttribute('dir', 'rtl')
          } else {
            document.body.removeAttribute('dir')
          }
          break
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Change language
  const changeLanguage = useCallback((languageCode: string) => {
    vscode.postMessage({
      type: 'changeLanguage',
      language: languageCode
    })
  }, [])

  // Update setting
  const updateSetting = useCallback(<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)

    setSaving(true)
    vscode.postMessage({
      type: 'updateSettings',
      settings: newSettings
    })
  }, [settings])

  // Reset settings
  const resetSettings = useCallback(() => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      vscode.postMessage({ type: 'resetSettings' })
    }
  }, [])

  return (
    <div className="settings-view">
      <div className="settings-header">
        <h2>⚙️ Settings</h2>
        <div className="settings-header-actions">
          {saving && <span className="saving-indicator">Saving...</span>}
          <button
            className="done-btn"
            onClick={onDone}
            title="Return to Chat"
          >
            Done
          </button>
        </div>
      </div>

      <div className="settings-content">
        {/* Language Section */}
        <section className="settings-section">
          <h3 className="section-title">🌐 Language & Region</h3>

          <div className="setting-group">
            <label className="setting-label">Display Language</label>
            <p className="setting-description">
              Choose your preferred language for the interface
            </p>

            <div className="language-grid">
              {languages.map(lang => (
                <button
                  key={lang.code}
                  className={`language-card ${currentLanguage === lang.code ? 'active' : ''} ${!lang.enabled ? 'disabled' : ''}`}
                  onClick={() => lang.enabled && changeLanguage(lang.code)}
                  disabled={!lang.enabled}
                >
                  <div className="language-info">
                    <span className="language-name">{lang.name}</span>
                    <span className="language-native">{lang.nativeName}</span>
                  </div>
                  {currentLanguage === lang.code && (
                    <span className="language-check">✓</span>
                  )}
                  {!lang.enabled && (
                    <span className="coming-soon">Coming Soon</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="setting-group">
            <div className="setting-row">
              <div className="setting-info">
                <label className="setting-label">
                  Right-to-Left (RTL) Support
                </label>
                <p className="setting-description">
                  Automatically enabled for languages like Arabic
                </p>
              </div>
              <div className="rtl-status">
                {languages.find(l => l.code === currentLanguage)?.rtl ? (
                  <span className="status-badge enabled">Enabled</span>
                ) : (
                  <span className="status-badge">Disabled</span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* General Settings */}
        <section className="settings-section">
          <h3 className="section-title">🔧 General</h3>

          <div className="setting-group">
            <div className="setting-row">
              <div className="setting-info">
                <label className="setting-label">Auto-save</label>
                <p className="setting-description">
                  Automatically save your work as you type
                </p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.autoSave}
                  onChange={(e) => updateSetting('autoSave', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div className="setting-group">
            <div className="setting-row">
              <div className="setting-info">
                <label className="setting-label">Notifications</label>
                <p className="setting-description">
                  Show desktop notifications for important events
                </p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={(e) => updateSetting('notifications', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div className="setting-group">
            <div className="setting-row">
              <div className="setting-info">
                <label className="setting-label">Theme</label>
                <p className="setting-description">
                  Choose your preferred color theme
                </p>
              </div>
              <select
                className="theme-select"
                value={settings.theme}
                onChange={(e) => updateSetting('theme', e.target.value as any)}
              >
                <option value="system">System Default</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </div>
        </section>

        {/* Privacy & Data */}
        <section className="settings-section">
          <h3 className="section-title">🔒 Privacy & Data</h3>

          <div className="setting-group">
            <div className="setting-row">
              <div className="setting-info">
                <label className="setting-label">Usage Telemetry</label>
                <p className="setting-description">
                  Help improve Oropendola by sending anonymous usage data
                </p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.telemetry}
                  onChange={(e) => updateSetting('telemetry', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div className="setting-group">
            <button className="button-secondary" onClick={() => {
              if (confirm('Clear all local data including cache and preferences?')) {
                vscode.postMessage({ type: 'clearLocalData' })
              }
            }}>
              Clear Local Data
            </button>
          </div>
        </section>

        {/* About */}
        <section className="settings-section">
          <h3 className="section-title">ℹ️ About</h3>

          <div className="about-info">
            <div className="about-row">
              <span className="about-label">Version</span>
              <span className="about-value">3.5.0+</span>
            </div>
            <div className="about-row">
              <span className="about-label">Backend</span>
              <span className="about-value">
                <a href="https://oropendola.ai" target="_blank" rel="noopener noreferrer">
                  oropendola.ai
                </a>
              </span>
            </div>
            <div className="about-row">
              <span className="about-label">License</span>
              <span className="about-value">Proprietary</span>
            </div>
          </div>

          <div className="about-actions">
            <button className="button-link" onClick={() => {
              vscode.postMessage({ type: 'openDocs' })
            }}>
              📚 Documentation
            </button>
            <button className="button-link" onClick={() => {
              vscode.postMessage({ type: 'openChangelog' })
            }}>
              📋 Changelog
            </button>
            <button className="button-link" onClick={() => {
              vscode.postMessage({ type: 'reportIssue' })
            }}>
              🐛 Report Issue
            </button>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="settings-section danger-zone">
          <h3 className="section-title">⚠️ Danger Zone</h3>

          <div className="setting-group">
            <button className="button-danger" onClick={resetSettings}>
              Reset All Settings
            </button>
            <p className="setting-description">
              This will restore all settings to their default values
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
