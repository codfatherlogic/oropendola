import React, { useState } from 'react'
import Toggle from '../common/Toggle'
import './AdvancedSettings.css'

interface AdvancedSettingsProps {
  settings: {
    debug: {
      enabled: boolean
      verboseLogging: boolean
      logToFile: boolean
      logFilePath: string
      showTimestamps: boolean
    }
    logging: {
      level: string
      includeSources: string[]
      excludeSources: string[]
      maxLogSize: number
      rotateOnSize: boolean
    }
    performance: {
      enabled: boolean
      trackMemoryUsage: boolean
      trackResponseTime: boolean
      trackTokenUsage: boolean
      displayInStatusBar: boolean
      alertOnHighUsage: boolean
      memoryThreshold: number
      responseTimeThreshold: number
    }
    experimental: {
      enableAll: boolean
      features: {
        enhancedCodeAnalysis: boolean
        advancedRefactoring: boolean
        multiFileEditing: boolean
        smartSuggestions: boolean
        codeGeneration: boolean
        testGeneration: boolean
        documentationGeneration: boolean
        voiceInput: boolean
      }
    }
  }
  onUpdate: (key: string, value: any) => void
  onResetToDefaults: () => void
}

const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
  settings,
  onUpdate,
  onResetToDefaults
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [logSourceInput, setLogSourceInput] = useState('')
  const [excludeSourceInput, setExcludeSourceInput] = useState('')

  // Logging level options
  const loggingLevels = [
    { value: 'off', label: 'Off', description: 'No logging' },
    { value: 'error', label: 'Error', description: 'Only errors' },
    { value: 'warn', label: 'Warning', description: 'Errors and warnings' },
    { value: 'info', label: 'Info', description: 'General information' },
    { value: 'debug', label: 'Debug', description: 'Detailed debug info' },
    { value: 'trace', label: 'Trace', description: 'Very verbose tracing' }
  ]

  // Log size presets (in MB)
  const logSizePresets = [
    { label: '1 MB', value: 1048576 },
    { label: '5 MB', value: 5242880 },
    { label: '10 MB', value: 10485760 },
    { label: '50 MB', value: 52428800 }
  ]

  // Performance threshold presets
  const memoryPresets = [
    { label: '100 MB', value: 104857600 },
    { label: '250 MB', value: 262144000 },
    { label: '500 MB', value: 524288000 },
    { label: '1 GB', value: 1073741824 }
  ]

  const responseTimePresets = [
    { label: '1s', value: 1000 },
    { label: '3s', value: 3000 },
    { label: '5s', value: 5000 },
    { label: '10s', value: 10000 }
  ]

  // Experimental features list
  const experimentalFeatures = [
    {
      id: 'enhancedCodeAnalysis',
      name: 'Enhanced Code Analysis',
      description: 'Advanced static analysis and code quality insights',
      risk: 'low'
    },
    {
      id: 'advancedRefactoring',
      name: 'Advanced Refactoring',
      description: 'AI-powered code refactoring suggestions',
      risk: 'medium'
    },
    {
      id: 'multiFileEditing',
      name: 'Multi-File Editing',
      description: 'Edit multiple files simultaneously in one operation',
      risk: 'medium'
    },
    {
      id: 'smartSuggestions',
      name: 'Smart Suggestions',
      description: 'Context-aware code completion and suggestions',
      risk: 'low'
    },
    {
      id: 'codeGeneration',
      name: 'Code Generation',
      description: 'Generate entire functions or classes from descriptions',
      risk: 'medium'
    },
    {
      id: 'testGeneration',
      name: 'Test Generation',
      description: 'Automatically generate unit tests for your code',
      risk: 'low'
    },
    {
      id: 'documentationGeneration',
      name: 'Documentation Generation',
      description: 'Auto-generate JSDoc, docstrings, and README content',
      risk: 'low'
    },
    {
      id: 'voiceInput',
      name: 'Voice Input',
      description: 'Control the assistant using voice commands',
      risk: 'high'
    }
  ]

  // Log source handlers
  const addLogSource = () => {
    if (logSourceInput.trim()) {
      const newSources = [...settings.logging.includeSources, logSourceInput.trim()]
      onUpdate('logging', { ...settings.logging, includeSources: newSources })
      setLogSourceInput('')
    }
  }

  const removeLogSource = (index: number) => {
    const newSources = settings.logging.includeSources.filter((_, i) => i !== index)
    onUpdate('logging', { ...settings.logging, includeSources: newSources })
  }

  const addExcludeSource = () => {
    if (excludeSourceInput.trim()) {
      const newSources = [...settings.logging.excludeSources, excludeSourceInput.trim()]
      onUpdate('logging', { ...settings.logging, excludeSources: newSources })
      setExcludeSourceInput('')
    }
  }

  const removeExcludeSource = (index: number) => {
    const newSources = settings.logging.excludeSources.filter((_, i) => i !== index)
    onUpdate('logging', { ...settings.logging, excludeSources: newSources })
  }

  // Reset confirmation handler
  const handleResetClick = () => {
    setShowResetConfirm(true)
  }

  const confirmReset = () => {
    onResetToDefaults()
    setShowResetConfirm(false)
  }

  const cancelReset = () => {
    setShowResetConfirm(false)
  }

  // Toggle all experimental features
  const toggleAllExperimental = (enabled: boolean) => {
    const allFeatures = experimentalFeatures.reduce((acc, feature) => {
      acc[feature.id] = enabled
      return acc
    }, {} as Record<string, boolean>)

    onUpdate('experimental', {
      ...settings.experimental,
      enableAll: enabled,
      features: allFeatures
    })
  }

  return (
    <div className="advanced-settings">
      {/* 1. Debug Mode */}
      <div className="setting-section">
        <div className="setting-header">
          <div className="setting-info">
            <div className="setting-label">Debug Mode</div>
            <div className="setting-description">
              Enable detailed debugging information and logging
            </div>
          </div>
          <Toggle
            checked={settings.debug.enabled}
            onChange={(checked) => onUpdate('debug', { ...settings.debug, enabled: checked })}
          />
        </div>

        {settings.debug.enabled && (
          <div className="setting-content">
            {/* Debug sub-settings */}
            <div className="sub-settings">
              <div className="sub-setting-row">
                <span className="sub-setting-label">Verbose logging</span>
                <Toggle
                  checked={settings.debug.verboseLogging}
                  onChange={(checked) => onUpdate('debug', { ...settings.debug, verboseLogging: checked })}
                />
              </div>
              <div className="sub-setting-row">
                <span className="sub-setting-label">Log to file</span>
                <Toggle
                  checked={settings.debug.logToFile}
                  onChange={(checked) => onUpdate('debug', { ...settings.debug, logToFile: checked })}
                />
              </div>
              <div className="sub-setting-row">
                <span className="sub-setting-label">Show timestamps in logs</span>
                <Toggle
                  checked={settings.debug.showTimestamps}
                  onChange={(checked) => onUpdate('debug', { ...settings.debug, showTimestamps: checked })}
                />
              </div>
            </div>

            {/* Log file path */}
            {settings.debug.logToFile && (
              <div className="setting-row">
                <div className="setting-info">
                  <div className="setting-label">Log file path</div>
                  <div className="setting-description">Location to save debug logs</div>
                </div>
                <input
                  type="text"
                  className="path-input"
                  placeholder="/path/to/oropendola-debug.log"
                  value={settings.debug.logFilePath}
                  onChange={(e) => onUpdate('debug', { ...settings.debug, logFilePath: e.target.value })}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Logging Level */}
      <div className="setting-section">
        <div className="setting-header">
          <div className="setting-info">
            <div className="setting-label">Logging Configuration</div>
            <div className="setting-description">
              Configure logging level and sources
            </div>
          </div>
        </div>

        <div className="setting-content">
          {/* Logging level selector */}
          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-label">Logging level</div>
              <div className="setting-description">Control the verbosity of logs</div>
            </div>
          </div>

          <div className="log-level-cards">
            {loggingLevels.map((level) => (
              <div
                key={level.value}
                className={`log-level-card ${settings.logging.level === level.value ? 'selected' : ''}`}
                onClick={() => onUpdate('logging', { ...settings.logging, level: level.value })}
              >
                <div className="level-name">{level.label}</div>
                <div className="level-description">{level.description}</div>
              </div>
            ))}
          </div>

          {/* Include sources */}
          <div className="list-editor">
            <div className="list-header">
              <span className="list-title">Include Sources</span>
              <span className="list-subtitle">Only log from these sources</span>
            </div>

            <div className="list-input-wrapper">
              <input
                type="text"
                className="list-input"
                placeholder="Add source (e.g., ChatService, FileOperations)"
                value={logSourceInput}
                onChange={(e) => setLogSourceInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addLogSource()}
              />
              <button className="add-btn" onClick={addLogSource}>
                Add
              </button>
            </div>

            <div className="list-items">
              {settings.logging.includeSources.length === 0 ? (
                <div className="empty-list">No sources specified. All sources will be logged.</div>
              ) : (
                settings.logging.includeSources.map((source, index) => (
                  <div key={index} className="list-item">
                    <code className="item-text">{source}</code>
                    <button className="remove-btn" onClick={() => removeLogSource(index)}>
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Exclude sources */}
          <div className="list-editor">
            <div className="list-header">
              <span className="list-title">Exclude Sources</span>
              <span className="list-subtitle">Never log from these sources</span>
            </div>

            <div className="list-input-wrapper">
              <input
                type="text"
                className="list-input"
                placeholder="Add source to exclude (e.g., HeartbeatService)"
                value={excludeSourceInput}
                onChange={(e) => setExcludeSourceInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addExcludeSource()}
              />
              <button className="add-btn" onClick={addExcludeSource}>
                Add
              </button>
            </div>

            <div className="list-items">
              {settings.logging.excludeSources.length === 0 ? (
                <div className="empty-list">No excluded sources.</div>
              ) : (
                settings.logging.excludeSources.map((source, index) => (
                  <div key={index} className="list-item">
                    <code className="item-text">{source}</code>
                    <button className="remove-btn" onClick={() => removeExcludeSource(index)}>
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Max log size */}
          <div className="setting-row">
            <div className="setting-info">
              <div className="setting-label">Maximum log file size</div>
              <div className="setting-description">Rotate log files when they exceed this size</div>
            </div>
          </div>

          <div className="log-size-input-wrapper">
            <input
              type="number"
              className="log-size-input"
              min="1048576"
              max="104857600"
              step="1048576"
              value={settings.logging.maxLogSize}
              onChange={(e) => onUpdate('logging', { ...settings.logging, maxLogSize: parseInt(e.target.value) })}
            />
            <span className="log-size-label">
              {(settings.logging.maxLogSize / 1048576).toFixed(2)} MB
            </span>
          </div>

          <div className="log-size-presets">
            {logSizePresets.map((preset) => (
              <button
                key={preset.value}
                className={`preset-btn ${settings.logging.maxLogSize === preset.value ? 'active' : ''}`}
                onClick={() => onUpdate('logging', { ...settings.logging, maxLogSize: preset.value })}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="sub-setting-row">
            <span className="sub-setting-label">Rotate logs on size limit</span>
            <Toggle
              checked={settings.logging.rotateOnSize}
              onChange={(checked) => onUpdate('logging', { ...settings.logging, rotateOnSize: checked })}
            />
          </div>
        </div>
      </div>

      {/* 3. Performance Monitoring */}
      <div className="setting-section">
        <div className="setting-header">
          <div className="setting-info">
            <div className="setting-label">Performance Monitoring</div>
            <div className="setting-description">
              Track and monitor extension performance metrics
            </div>
          </div>
          <Toggle
            checked={settings.performance.enabled}
            onChange={(checked) => onUpdate('performance', { ...settings.performance, enabled: checked })}
          />
        </div>

        {settings.performance.enabled && (
          <div className="setting-content">
            {/* Performance tracking options */}
            <div className="sub-settings">
              <div className="sub-setting-row">
                <span className="sub-setting-label">Track memory usage</span>
                <Toggle
                  checked={settings.performance.trackMemoryUsage}
                  onChange={(checked) => onUpdate('performance', { ...settings.performance, trackMemoryUsage: checked })}
                />
              </div>
              <div className="sub-setting-row">
                <span className="sub-setting-label">Track response time</span>
                <Toggle
                  checked={settings.performance.trackResponseTime}
                  onChange={(checked) => onUpdate('performance', { ...settings.performance, trackResponseTime: checked })}
                />
              </div>
              <div className="sub-setting-row">
                <span className="sub-setting-label">Track token usage</span>
                <Toggle
                  checked={settings.performance.trackTokenUsage}
                  onChange={(checked) => onUpdate('performance', { ...settings.performance, trackTokenUsage: checked })}
                />
              </div>
              <div className="sub-setting-row">
                <span className="sub-setting-label">Display metrics in status bar</span>
                <Toggle
                  checked={settings.performance.displayInStatusBar}
                  onChange={(checked) => onUpdate('performance', { ...settings.performance, displayInStatusBar: checked })}
                />
              </div>
              <div className="sub-setting-row">
                <span className="sub-setting-label">Alert on high usage</span>
                <Toggle
                  checked={settings.performance.alertOnHighUsage}
                  onChange={(checked) => onUpdate('performance', { ...settings.performance, alertOnHighUsage: checked })}
                />
              </div>
            </div>

            {/* Memory threshold */}
            {settings.performance.alertOnHighUsage && (
              <>
                <div className="setting-row">
                  <div className="setting-info">
                    <div className="setting-label">Memory usage alert threshold</div>
                    <div className="setting-description">Alert when memory usage exceeds this amount</div>
                  </div>
                </div>

                <div className="threshold-input-wrapper">
                  <input
                    type="number"
                    className="threshold-input"
                    min="10485760"
                    max="2147483648"
                    step="10485760"
                    value={settings.performance.memoryThreshold}
                    onChange={(e) => onUpdate('performance', { ...settings.performance, memoryThreshold: parseInt(e.target.value) })}
                  />
                  <span className="threshold-label">
                    {(settings.performance.memoryThreshold / 1048576).toFixed(0)} MB
                  </span>
                </div>

                <div className="threshold-presets">
                  {memoryPresets.map((preset) => (
                    <button
                      key={preset.value}
                      className={`preset-btn ${settings.performance.memoryThreshold === preset.value ? 'active' : ''}`}
                      onClick={() => onUpdate('performance', { ...settings.performance, memoryThreshold: preset.value })}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Response time threshold */}
                <div className="setting-row">
                  <div className="setting-info">
                    <div className="setting-label">Response time alert threshold</div>
                    <div className="setting-description">Alert when response time exceeds this duration</div>
                  </div>
                </div>

                <div className="threshold-input-wrapper">
                  <input
                    type="number"
                    className="threshold-input"
                    min="100"
                    max="60000"
                    step="100"
                    value={settings.performance.responseTimeThreshold}
                    onChange={(e) => onUpdate('performance', { ...settings.performance, responseTimeThreshold: parseInt(e.target.value) })}
                  />
                  <span className="threshold-label">
                    {(settings.performance.responseTimeThreshold / 1000).toFixed(1)}s
                  </span>
                </div>

                <div className="threshold-presets">
                  {responseTimePresets.map((preset) => (
                    <button
                      key={preset.value}
                      className={`preset-btn ${settings.performance.responseTimeThreshold === preset.value ? 'active' : ''}`}
                      onClick={() => onUpdate('performance', { ...settings.performance, responseTimeThreshold: preset.value })}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 4. Experimental Features */}
      <div className="setting-section experimental-section">
        <div className="setting-header">
          <div className="setting-info">
            <div className="setting-label">Experimental Features</div>
            <div className="setting-description">
              Enable cutting-edge features that are still in development
              <span className="warning-badge">⚠️ Use with caution</span>
            </div>
          </div>
          <Toggle
            checked={settings.experimental.enableAll}
            onChange={(checked) => toggleAllExperimental(checked)}
          />
        </div>

        <div className="setting-content">
          <div className="experimental-notice">
            <div className="notice-icon">⚠️</div>
            <div className="notice-content">
              <div className="notice-title">Experimental Features Notice</div>
              <div className="notice-text">
                These features are experimental and may be unstable. They could change or be removed
                in future versions. Use at your own risk in production environments.
              </div>
            </div>
          </div>

          <div className="features-grid">
            {experimentalFeatures.map((feature) => (
              <div
                key={feature.id}
                className={`feature-card ${settings.experimental.features[feature.id] ? 'enabled' : ''} risk-${feature.risk}`}
              >
                <div className="feature-header">
                  <div className="feature-name">{feature.name}</div>
                  <Toggle
                    checked={settings.experimental.features[feature.id] || false}
                    onChange={(checked) => {
                      const newFeatures = { ...settings.experimental.features, [feature.id]: checked }
                      const allEnabled = Object.values(newFeatures).every(v => v === true)
                      onUpdate('experimental', {
                        ...settings.experimental,
                        enableAll: allEnabled,
                        features: newFeatures
                      })
                    }}
                  />
                </div>
                <div className="feature-description">{feature.description}</div>
                <div className={`feature-risk risk-${feature.risk}`}>
                  Risk: {feature.risk.charAt(0).toUpperCase() + feature.risk.slice(1)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Reset to Defaults */}
      <div className="setting-section reset-section">
        <div className="setting-header">
          <div className="setting-info">
            <div className="setting-label">Reset All Settings</div>
            <div className="setting-description">
              Restore all extension settings to their default values
            </div>
          </div>
        </div>

        <div className="setting-content">
          {!showResetConfirm ? (
            <button className="reset-btn" onClick={handleResetClick}>
              Reset to Defaults
            </button>
          ) : (
            <div className="reset-confirm">
              <div className="confirm-message">
                <div className="confirm-icon">⚠️</div>
                <div className="confirm-text">
                  <div className="confirm-title">Are you sure?</div>
                  <div className="confirm-description">
                    This will reset ALL settings to their default values. This action cannot be undone.
                  </div>
                </div>
              </div>
              <div className="confirm-actions">
                <button className="confirm-btn danger" onClick={confirmReset}>
                  Yes, Reset Everything
                </button>
                <button className="confirm-btn secondary" onClick={cancelReset}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdvancedSettings
