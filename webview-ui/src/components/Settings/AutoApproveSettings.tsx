import React, { useState } from 'react'
import './SettingsView.css'

interface AutoApproveSettingsProps {
  settings: {
    enabled: boolean
    readOnly: boolean
    readOnlyOutsideWorkspace: boolean
    write: boolean
    writeOutsideWorkspace: boolean
    writeProtected: boolean
    execute: boolean
    browser: boolean
    mcp: boolean
    modeSwitch: boolean
    subtasks: boolean
    followupQuestions: boolean
    updateTodoList: boolean
    resubmit: boolean
    allowedCommands: string[]
    deniedCommands: string[]
    maxRequests: number
    maxCost: number
    requestDelay: number
    followupTimeout: number
  }
  onUpdate: (key: string, value: any) => void
}

export const AutoApproveSettings: React.FC<AutoApproveSettingsProps> = ({ settings, onUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleToggle = (key: string) => {
    onUpdate(`autoApprove.${key}`, !settings[key as keyof typeof settings])
  }

  const handleArrayUpdate = (key: string, value: string) => {
    const items = value.split('\n').filter(line => line.trim())
    onUpdate(`autoApprove.${key}`, items)
  }

  const handleNumberUpdate = (key: string, value: number) => {
    onUpdate(`autoApprove.${key}`, value)
  }

  // Count enabled operations
  const enabledCount = [
    settings.readOnly,
    settings.write,
    settings.execute,
    settings.browser,
    settings.mcp,
    settings.subtasks
  ].filter(Boolean).length

  return (
    <section className="settings-section">
      <div className="section-header" onClick={() => setIsExpanded(!isExpanded)} style={{ cursor: 'pointer' }}>
        <h3 className="section-title">
          ⚡ Auto-Approve System
          {settings.enabled && (
            <span className="badge" style={{ marginLeft: '8px', fontSize: '12px' }}>
              {enabledCount} enabled
            </span>
          )}
        </h3>
        <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
      </div>

      <p className="setting-description">
        Automatically approve specific operations without manual confirmation.
        <strong> Use with caution!</strong> Granular controls help balance convenience and safety.
      </p>

      {isExpanded && (
        <>
          {/* Master Toggle */}
          <div className="setting-group">
            <div className="setting-row">
              <label className="setting-label">
                <strong>Enable Auto-Approve</strong>
                <span className="setting-hint">Master toggle for all auto-approvals</span>
              </label>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={() => handleToggle('enabled')}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          {settings.enabled && (
            <>
              {/* File Operations */}
              <div className="setting-group">
                <h4 className="group-title">📁 File Operations</h4>

                <div className="setting-row">
                  <label className="setting-label">
                    Read Files (Workspace)
                    <span className="setting-hint">Auto-approve reading files within workspace</span>
                  </label>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.readOnly}
                      onChange={() => handleToggle('readOnly')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="setting-row">
                  <label className="setting-label">
                    Read Files (Outside Workspace)
                    <span className="setting-hint">⚠️ Auto-approve reading files outside workspace</span>
                  </label>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.readOnlyOutsideWorkspace}
                      onChange={() => handleToggle('readOnlyOutsideWorkspace')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="setting-row">
                  <label className="setting-label">
                    Write Files (Workspace)
                    <span className="setting-hint">Auto-approve creating/editing files within workspace</span>
                  </label>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.write}
                      onChange={() => handleToggle('write')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="setting-row">
                  <label className="setting-label">
                    Write Files (Outside Workspace)
                    <span className="setting-hint">⚠️ Auto-approve writing files outside workspace</span>
                  </label>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.writeOutsideWorkspace}
                      onChange={() => handleToggle('writeOutsideWorkspace')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="setting-row">
                  <label className="setting-label">
                    Write Protected Files
                    <span className="setting-hint">🚨 Auto-approve editing .env, credentials, etc. <strong>Very risky!</strong></span>
                  </label>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.writeProtected}
                      onChange={() => handleToggle('writeProtected')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              {/* Execution & External */}
              <div className="setting-group">
                <h4 className="group-title">⚙️ Execution & External</h4>

                <div className="setting-row">
                  <label className="setting-label">
                    Execute Commands
                    <span className="setting-hint">Auto-approve terminal command execution</span>
                  </label>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.execute}
                      onChange={() => handleToggle('execute')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="setting-row">
                  <label className="setting-label">
                    Browser Automation
                    <span className="setting-hint">Auto-approve browser actions</span>
                  </label>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.browser}
                      onChange={() => handleToggle('browser')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="setting-row">
                  <label className="setting-label">
                    MCP Operations
                    <span className="setting-hint">Auto-approve MCP tool and resource access</span>
                  </label>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.mcp}
                      onChange={() => handleToggle('mcp')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              {/* Safe Operations */}
              <div className="setting-group">
                <h4 className="group-title">✅ Safe Operations</h4>

                <div className="setting-row">
                  <label className="setting-label">
                    Mode Switching
                    <span className="setting-hint">Auto-approve switching between modes (safe)</span>
                  </label>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.modeSwitch}
                      onChange={() => handleToggle('modeSwitch')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="setting-row">
                  <label className="setting-label">
                    Todo List Updates
                    <span className="setting-hint">Auto-approve todo list modifications (safe)</span>
                  </label>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.updateTodoList}
                      onChange={() => handleToggle('updateTodoList')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="setting-row">
                  <label className="setting-label">
                    Subtask Creation
                    <span className="setting-hint">Auto-approve creating subtasks</span>
                  </label>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.subtasks}
                      onChange={() => handleToggle('subtasks')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="setting-row">
                  <label className="setting-label">
                    Followup Questions
                    <span className="setting-hint">Auto-approve after timeout</span>
                  </label>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.followupQuestions}
                      onChange={() => handleToggle('followupQuestions')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                <div className="setting-row">
                  <label className="setting-label">
                    Resubmit After Errors
                    <span className="setting-hint">Auto-approve resubmitting failed operations</span>
                  </label>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={settings.resubmit}
                      onChange={() => handleToggle('resubmit')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="setting-group">
                <button
                  className="button-secondary"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  style={{ width: '100%', marginBottom: '12px' }}
                >
                  {showAdvanced ? '▼ Hide' : '▶ Show'} Advanced Settings
                </button>

                {showAdvanced && (
                  <>
                    {/* Command Filters */}
                    <h4 className="group-title">🔐 Command Filters</h4>

                    <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                      <label className="setting-label">
                        Allowed Commands (Whitelist)
                        <span className="setting-hint">One pattern per line. Empty = allow all. Example: git *, npm test</span>
                      </label>
                      <textarea
                        className="settings-textarea"
                        rows={4}
                        value={settings.allowedCommands.join('\n')}
                        onChange={(e) => handleArrayUpdate('allowedCommands', e.target.value)}
                        placeholder="git status&#10;npm test&#10;ls *"
                        style={{ width: '100%', fontFamily: 'monospace', fontSize: '13px' }}
                      />
                    </div>

                    <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'flex-start', marginTop: '12px' }}>
                      <label className="setting-label">
                        Denied Commands (Blacklist)
                        <span className="setting-hint">One pattern per line. These will NEVER be auto-approved</span>
                      </label>
                      <textarea
                        className="settings-textarea"
                        rows={6}
                        value={settings.deniedCommands.join('\n')}
                        onChange={(e) => handleArrayUpdate('deniedCommands', e.target.value)}
                        placeholder="rm -rf *&#10;dd if=*"
                        style={{ width: '100%', fontFamily: 'monospace', fontSize: '13px', backgroundColor: '#ffe6e6' }}
                      />
                    </div>

                    {/* Safety Limits */}
                    <h4 className="group-title" style={{ marginTop: '24px' }}>🛡️ Safety Limits</h4>

                    <div className="setting-row">
                      <label className="setting-label">
                        Max Requests Per Task
                        <span className="setting-hint">0 = unlimited (not recommended)</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="1000"
                        value={settings.maxRequests}
                        onChange={(e) => handleNumberUpdate('maxRequests', parseInt(e.target.value))}
                        style={{ width: '100px' }}
                      />
                    </div>

                    <div className="setting-row">
                      <label className="setting-label">
                        Max Cost Per Task (USD)
                        <span className="setting-hint">0 = unlimited (not recommended)</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={settings.maxCost}
                        onChange={(e) => handleNumberUpdate('maxCost', parseFloat(e.target.value))}
                        style={{ width: '100px' }}
                      />
                    </div>

                    <div className="setting-row">
                      <label className="setting-label">
                        Request Delay (seconds)
                        <span className="setting-hint">Delay between auto-approved operations</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.5"
                        value={settings.requestDelay}
                        onChange={(e) => handleNumberUpdate('requestDelay', parseFloat(e.target.value))}
                        style={{ width: '100px' }}
                      />
                    </div>

                    <div className="setting-row">
                      <label className="setting-label">
                        Followup Question Timeout (ms)
                        <span className="setting-hint">Auto-answer after this delay</span>
                      </label>
                      <input
                        type="number"
                        min="1000"
                        max="300000"
                        step="1000"
                        value={settings.followupTimeout}
                        onChange={(e) => handleNumberUpdate('followupTimeout', parseInt(e.target.value))}
                        style={{ width: '120px' }}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Warning Box */}
              {(settings.writeProtected || settings.writeOutsideWorkspace || settings.readOnlyOutsideWorkspace) && (
                <div className="warning-box" style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px' }}>
                  <strong>⚠️ Warning:</strong> You have enabled risky auto-approvals. Make sure you trust the AI and understand the potential consequences.
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  )
}
