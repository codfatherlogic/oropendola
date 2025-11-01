/**
 * Tool Settings Component
 *
 * Comprehensive tool configuration including:
 * - Tool enable/disable toggles
 * - Auto-approval settings per tool
 * - Tool-specific configurations
 * - File size/line count limits
 * - Command timeout settings
 * - Command allowlist editor
 * - Browser automation settings
 * - Image generation settings
 * - MCP server configuration
 */

import React, { useState } from 'react'
import './ToolSettings.css'

interface ToolSettingsProps {
  settings: {
    tools: {
      [key: string]: {
        enabled: boolean
        autoApprove: boolean
      }
    }
    fileOperations: {
      maxFileSize: number
      maxLineCount: number
      protectedPatterns: string[]
    }
    commandExecution: {
      timeout: number
      allowedCommands: string[]
      deniedCommands: string[]
      requireApproval: boolean
    }
    browserAutomation: {
      enabled: boolean
      headless: boolean
      timeout: number
      maxSessions: number
    }
    imageGeneration: {
      enabled: boolean
      provider: string
      apiKey: string
      maxImages: number
    }
    mcpServers: {
      enabled: boolean
      autoConnect: boolean
      reconnectAttempts: number
    }
  }
  onUpdate: (key: string, value: any) => void
}

const AVAILABLE_TOOLS = [
  { id: 'read_file', name: 'Read File', description: 'Read file contents with line range support', category: 'File Operations' },
  { id: 'write_to_file', name: 'Write to File', description: 'Create or modify files with safety checks', category: 'File Operations' },
  { id: 'list_files', name: 'List Files', description: 'List directory contents with glob patterns', category: 'File Operations' },
  { id: 'search_files', name: 'Search Files', description: 'Search file contents using regex', category: 'File Operations' },
  { id: 'execute_command', name: 'Execute Command', description: 'Run terminal commands with output capture', category: 'System' },
  { id: 'browser_action', name: 'Browser Action', description: 'Automate browser interactions', category: 'Browser' },
  { id: 'generate_image', name: 'Generate Image', description: 'Create images using AI', category: 'Media' },
  { id: 'run_slash_command', name: 'Run Slash Command', description: 'Execute custom slash commands', category: 'System' },
  { id: 'use_mcp_tool', name: 'Use MCP Tool', description: 'Execute MCP server tools', category: 'MCP' },
  { id: 'access_mcp_resource', name: 'Access MCP Resource', description: 'Access MCP server resources', category: 'MCP' },
  { id: 'get_mcp_prompt', name: 'Get MCP Prompt', description: 'Retrieve MCP prompt templates', category: 'MCP' },
  { id: 'save_checkpoint', name: 'Save Checkpoint', description: 'Save conversation state', category: 'Checkpoints' },
  { id: 'restore_checkpoint', name: 'Restore Checkpoint', description: 'Restore conversation state', category: 'Checkpoints' },
  { id: 'list_checkpoints', name: 'List Checkpoints', description: 'View saved checkpoints', category: 'Checkpoints' },
  { id: 'get_checkpoint_diff', name: 'Get Checkpoint Diff', description: 'Compare checkpoint states', category: 'Checkpoints' }
]

const IMAGE_PROVIDERS = [
  { id: 'dall-e', name: 'DALL-E (OpenAI)', description: 'High-quality image generation' },
  { id: 'stable-diffusion', name: 'Stable Diffusion', description: 'Open-source image generation' },
  { id: 'midjourney', name: 'Midjourney', description: 'Artistic image generation' }
]

export const ToolSettings: React.FC<ToolSettingsProps> = ({ settings, onUpdate }) => {
  const [commandInput, setCommandInput] = useState('')
  const [deniedCommandInput, setDeniedCommandInput] = useState('')
  const [protectedPatternInput, setProtectedPatternInput] = useState('')
  const [expandedCategory, setExpandedCategory] = useState<string | null>('File Operations')

  const groupedTools = AVAILABLE_TOOLS.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = []
    }
    acc[tool.category].push(tool)
    return acc
  }, {} as Record<string, typeof AVAILABLE_TOOLS>)

  const handleToggleTool = (toolId: string, enabled: boolean) => {
    const newTools = { ...settings.tools }
    if (!newTools[toolId]) {
      newTools[toolId] = { enabled: true, autoApprove: false }
    }
    newTools[toolId].enabled = enabled
    onUpdate('tools', newTools)
  }

  const handleToggleAutoApprove = (toolId: string, autoApprove: boolean) => {
    const newTools = { ...settings.tools }
    if (!newTools[toolId]) {
      newTools[toolId] = { enabled: true, autoApprove: false }
    }
    newTools[toolId].autoApprove = autoApprove
    onUpdate('tools', newTools)
  }

  const addAllowedCommand = () => {
    if (commandInput.trim()) {
      const newCommands = [...settings.commandExecution.allowedCommands, commandInput.trim()]
      onUpdate('commandExecution', { ...settings.commandExecution, allowedCommands: newCommands })
      setCommandInput('')
    }
  }

  const removeAllowedCommand = (index: number) => {
    const newCommands = settings.commandExecution.allowedCommands.filter((_, i) => i !== index)
    onUpdate('commandExecution', { ...settings.commandExecution, allowedCommands: newCommands })
  }

  const addDeniedCommand = () => {
    if (deniedCommandInput.trim()) {
      const newCommands = [...settings.commandExecution.deniedCommands, deniedCommandInput.trim()]
      onUpdate('commandExecution', { ...settings.commandExecution, deniedCommands: newCommands })
      setDeniedCommandInput('')
    }
  }

  const removeDeniedCommand = (index: number) => {
    const newCommands = settings.commandExecution.deniedCommands.filter((_, i) => i !== index)
    onUpdate('commandExecution', { ...settings.commandExecution, deniedCommands: newCommands })
  }

  const addProtectedPattern = () => {
    if (protectedPatternInput.trim()) {
      const newPatterns = [...settings.fileOperations.protectedPatterns, protectedPatternInput.trim()]
      onUpdate('fileOperations', { ...settings.fileOperations, protectedPatterns: newPatterns })
      setProtectedPatternInput('')
    }
  }

  const removeProtectedPattern = (index: number) => {
    const newPatterns = settings.fileOperations.protectedPatterns.filter((_, i) => i !== index)
    onUpdate('fileOperations', { ...settings.fileOperations, protectedPatterns: newPatterns })
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <section className="settings-section tool-settings">
      <h3 className="section-title">🔧 Tool Settings</h3>

      {/* 1. Tool Enable/Disable Toggles */}
      <div className="setting-group tools-grid-section">
        <label className="setting-label">Available Tools</label>
        <p className="setting-description">
          Enable or disable specific tools to control what AI can do
        </p>

        {Object.entries(groupedTools).map(([category, tools]) => (
          <div key={category} className="tool-category">
            <button
              className="category-header"
              onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
            >
              <span className="category-icon">{expandedCategory === category ? '▼' : '▶'}</span>
              <span className="category-name">{category}</span>
              <span className="category-count">({tools.length} tools)</span>
            </button>

            {expandedCategory === category && (
              <div className="tools-grid">
                {tools.map(tool => {
                  const toolSettings = settings.tools[tool.id] || { enabled: true, autoApprove: false }
                  return (
                    <div key={tool.id} className={`tool-card ${toolSettings.enabled ? 'enabled' : 'disabled'}`}>
                      <div className="tool-header">
                        <div className="tool-info">
                          <div className="tool-name">{tool.name}</div>
                          <div className="tool-description">{tool.description}</div>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={toolSettings.enabled}
                            onChange={(e) => handleToggleTool(tool.id, e.target.checked)}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>

                      {/* 2. Auto-approval per tool */}
                      {toolSettings.enabled && (
                        <div className="tool-auto-approve">
                          <label className="auto-approve-label">
                            <input
                              type="checkbox"
                              checked={toolSettings.autoApprove}
                              onChange={(e) => handleToggleAutoApprove(tool.id, e.target.checked)}
                            />
                            <span>Auto-approve this tool</span>
                          </label>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 3. File Operations Settings (File size & line count limits) */}
      <div className="setting-group file-operations-section">
        <h4 className="subsection-title">📁 File Operations</h4>

        {/* 4. File Size Limit */}
        <div className="setting-row">
          <div className="setting-info">
            <label className="setting-label">Max File Size</label>
            <p className="setting-description">
              Maximum file size that can be read or written
            </p>
          </div>
          <div className="file-size-input-wrapper">
            <input
              type="number"
              className="file-size-input"
              min="1024"
              max="104857600"
              step="1024"
              value={settings.fileOperations.maxFileSize}
              onChange={(e) => onUpdate('fileOperations', {
                ...settings.fileOperations,
                maxFileSize: parseInt(e.target.value, 10)
              })}
            />
            <span className="size-label">{formatBytes(settings.fileOperations.maxFileSize)}</span>
          </div>
        </div>

        <div className="size-presets">
          <button
            className={`preset-btn ${settings.fileOperations.maxFileSize === 524288 ? 'active' : ''}`}
            onClick={() => onUpdate('fileOperations', { ...settings.fileOperations, maxFileSize: 524288 })}
          >
            512 KB
          </button>
          <button
            className={`preset-btn ${settings.fileOperations.maxFileSize === 1048576 ? 'active' : ''}`}
            onClick={() => onUpdate('fileOperations', { ...settings.fileOperations, maxFileSize: 1048576 })}
          >
            1 MB
          </button>
          <button
            className={`preset-btn ${settings.fileOperations.maxFileSize === 5242880 ? 'active' : ''}`}
            onClick={() => onUpdate('fileOperations', { ...settings.fileOperations, maxFileSize: 5242880 })}
          >
            5 MB
          </button>
          <button
            className={`preset-btn ${settings.fileOperations.maxFileSize === 10485760 ? 'active' : ''}`}
            onClick={() => onUpdate('fileOperations', { ...settings.fileOperations, maxFileSize: 10485760 })}
          >
            10 MB
          </button>
        </div>

        {/* 5. Line Count Limit */}
        <div className="setting-row" style={{ marginTop: '20px' }}>
          <div className="setting-info">
            <label className="setting-label">Max Line Count</label>
            <p className="setting-description">
              Maximum number of lines that can be read from a file
            </p>
          </div>
          <div className="line-count-input-wrapper">
            <input
              type="number"
              className="line-count-input"
              min="100"
              max="100000"
              step="100"
              value={settings.fileOperations.maxLineCount}
              onChange={(e) => onUpdate('fileOperations', {
                ...settings.fileOperations,
                maxLineCount: parseInt(e.target.value, 10)
              })}
            />
            <span className="lines-label">lines</span>
          </div>
        </div>

        <div className="line-presets">
          <button
            className={`preset-btn ${settings.fileOperations.maxLineCount === 1000 ? 'active' : ''}`}
            onClick={() => onUpdate('fileOperations', { ...settings.fileOperations, maxLineCount: 1000 })}
          >
            1K lines
          </button>
          <button
            className={`preset-btn ${settings.fileOperations.maxLineCount === 5000 ? 'active' : ''}`}
            onClick={() => onUpdate('fileOperations', { ...settings.fileOperations, maxLineCount: 5000 })}
          >
            5K lines
          </button>
          <button
            className={`preset-btn ${settings.fileOperations.maxLineCount === 10000 ? 'active' : ''}`}
            onClick={() => onUpdate('fileOperations', { ...settings.fileOperations, maxLineCount: 10000 })}
          >
            10K lines
          </button>
          <button
            className={`preset-btn ${settings.fileOperations.maxLineCount === 50000 ? 'active' : ''}`}
            onClick={() => onUpdate('fileOperations', { ...settings.fileOperations, maxLineCount: 50000 })}
          >
            50K lines
          </button>
        </div>

        {/* Protected File Patterns */}
        <div className="setting-group" style={{ marginTop: '20px' }}>
          <label className="setting-label">Protected File Patterns</label>
          <p className="setting-description">
            File patterns that require manual approval (e.g., *.env, package.json)
          </p>

          <div className="list-editor">
            <div className="list-input-wrapper">
              <input
                type="text"
                className="list-input"
                placeholder="Add pattern (e.g., *.key, .env*)"
                value={protectedPatternInput}
                onChange={(e) => setProtectedPatternInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addProtectedPattern()}
              />
              <button className="add-btn" onClick={addProtectedPattern}>Add</button>
            </div>

            <div className="list-items">
              {settings.fileOperations.protectedPatterns.map((pattern, index) => (
                <div key={index} className="list-item">
                  <span className="item-text">{pattern}</span>
                  <button className="remove-btn" onClick={() => removeProtectedPattern(index)}>×</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 6. Command Execution Settings */}
      <div className="setting-group command-execution-section">
        <h4 className="subsection-title">⚡ Command Execution</h4>

        {/* Command Timeout */}
        <div className="setting-row">
          <div className="setting-info">
            <label className="setting-label">Command Timeout</label>
            <p className="setting-description">
              Maximum time (in seconds) before a command is terminated
            </p>
          </div>
          <div className="timeout-input-wrapper">
            <input
              type="number"
              className="timeout-input"
              min="1"
              max="600"
              value={settings.commandExecution.timeout}
              onChange={(e) => onUpdate('commandExecution', {
                ...settings.commandExecution,
                timeout: parseInt(e.target.value, 10)
              })}
            />
            <span className="timeout-label">seconds</span>
          </div>
        </div>

        <div className="timeout-presets">
          <button
            className={`preset-btn ${settings.commandExecution.timeout === 30 ? 'active' : ''}`}
            onClick={() => onUpdate('commandExecution', { ...settings.commandExecution, timeout: 30 })}
          >
            30s
          </button>
          <button
            className={`preset-btn ${settings.commandExecution.timeout === 60 ? 'active' : ''}`}
            onClick={() => onUpdate('commandExecution', { ...settings.commandExecution, timeout: 60 })}
          >
            1 min
          </button>
          <button
            className={`preset-btn ${settings.commandExecution.timeout === 120 ? 'active' : ''}`}
            onClick={() => onUpdate('commandExecution', { ...settings.commandExecution, timeout: 120 })}
          >
            2 min
          </button>
          <button
            className={`preset-btn ${settings.commandExecution.timeout === 300 ? 'active' : ''}`}
            onClick={() => onUpdate('commandExecution', { ...settings.commandExecution, timeout: 300 })}
          >
            5 min
          </button>
        </div>

        {/* Require Approval Toggle */}
        <div className="setting-row" style={{ marginTop: '20px' }}>
          <div className="setting-info">
            <label className="setting-label">Require Approval</label>
            <p className="setting-description">
              Always ask before executing commands (recommended for safety)
            </p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.commandExecution.requireApproval}
              onChange={(e) => onUpdate('commandExecution', {
                ...settings.commandExecution,
                requireApproval: e.target.checked
              })}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        {/* 7. Command Allowlist Editor */}
        <div className="setting-group" style={{ marginTop: '20px' }}>
          <label className="setting-label">Allowed Commands</label>
          <p className="setting-description">
            Whitelist of commands that can be executed without approval (leave empty to allow all)
          </p>

          <div className="list-editor">
            <div className="list-input-wrapper">
              <input
                type="text"
                className="list-input"
                placeholder="Add command (e.g., npm install, git status)"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addAllowedCommand()}
              />
              <button className="add-btn" onClick={addAllowedCommand}>Add</button>
            </div>

            <div className="list-items">
              {settings.commandExecution.allowedCommands.map((cmd, index) => (
                <div key={index} className="list-item">
                  <code className="item-text">{cmd}</code>
                  <button className="remove-btn" onClick={() => removeAllowedCommand(index)}>×</button>
                </div>
              ))}
              {settings.commandExecution.allowedCommands.length === 0 && (
                <div className="empty-list-message">All commands allowed (subject to approval setting)</div>
              )}
            </div>
          </div>
        </div>

        {/* Denied Commands */}
        <div className="setting-group" style={{ marginTop: '20px' }}>
          <label className="setting-label">Denied Commands</label>
          <p className="setting-description">
            Blacklist of dangerous commands that should never be executed
          </p>

          <div className="list-editor">
            <div className="list-input-wrapper">
              <input
                type="text"
                className="list-input"
                placeholder="Add denied command (e.g., rm -rf *, sudo rm)"
                value={deniedCommandInput}
                onChange={(e) => setDeniedCommandInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addDeniedCommand()}
              />
              <button className="add-btn danger" onClick={addDeniedCommand}>Add</button>
            </div>

            <div className="list-items">
              {settings.commandExecution.deniedCommands.map((cmd, index) => (
                <div key={index} className="list-item danger">
                  <code className="item-text">{cmd}</code>
                  <button className="remove-btn" onClick={() => removeDeniedCommand(index)}>×</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 8. Browser Automation Settings */}
      <div className="setting-group browser-automation-section">
        <h4 className="subsection-title">🌐 Browser Automation</h4>

        <div className="setting-row">
          <div className="setting-info">
            <label className="setting-label">Enable Browser Automation</label>
            <p className="setting-description">
              Allow AI to control browser for testing and automation
            </p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.browserAutomation.enabled}
              onChange={(e) => onUpdate('browserAutomation', {
                ...settings.browserAutomation,
                enabled: e.target.checked
              })}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        {settings.browserAutomation.enabled && (
          <>
            <div className="setting-row">
              <div className="setting-info">
                <label className="setting-label">Headless Mode</label>
                <p className="setting-description">
                  Run browser without visible UI (faster but harder to debug)
                </p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.browserAutomation.headless}
                  onChange={(e) => onUpdate('browserAutomation', {
                    ...settings.browserAutomation,
                    headless: e.target.checked
                  })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <label className="setting-label">Browser Timeout</label>
                <p className="setting-description">
                  Maximum time for browser operations (seconds)
                </p>
              </div>
              <div className="timeout-input-wrapper">
                <input
                  type="number"
                  className="timeout-input"
                  min="5"
                  max="300"
                  value={settings.browserAutomation.timeout}
                  onChange={(e) => onUpdate('browserAutomation', {
                    ...settings.browserAutomation,
                    timeout: parseInt(e.target.value, 10)
                  })}
                />
                <span className="timeout-label">seconds</span>
              </div>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <label className="setting-label">Max Concurrent Sessions</label>
                <p className="setting-description">
                  Maximum number of browser sessions running simultaneously
                </p>
              </div>
              <input
                type="number"
                className="sessions-input"
                min="1"
                max="10"
                value={settings.browserAutomation.maxSessions}
                onChange={(e) => onUpdate('browserAutomation', {
                  ...settings.browserAutomation,
                  maxSessions: parseInt(e.target.value, 10)
                })}
              />
            </div>
          </>
        )}
      </div>

      {/* 9. Image Generation Settings */}
      <div className="setting-group image-generation-section">
        <h4 className="subsection-title">🎨 Image Generation</h4>

        <div className="setting-row">
          <div className="setting-info">
            <label className="setting-label">Enable Image Generation</label>
            <p className="setting-description">
              Allow AI to generate images using external APIs
            </p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.imageGeneration.enabled}
              onChange={(e) => onUpdate('imageGeneration', {
                ...settings.imageGeneration,
                enabled: e.target.checked
              })}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        {settings.imageGeneration.enabled && (
          <>
            <div className="setting-group">
              <label className="setting-label">Image Provider</label>
              <p className="setting-description">
                Choose which service to use for image generation
              </p>

              <div className="provider-selector">
                {IMAGE_PROVIDERS.map(provider => (
                  <div
                    key={provider.id}
                    className={`provider-card ${settings.imageGeneration.provider === provider.id ? 'selected' : ''}`}
                    onClick={() => onUpdate('imageGeneration', {
                      ...settings.imageGeneration,
                      provider: provider.id
                    })}
                  >
                    <div className="provider-name">{provider.name}</div>
                    <div className="provider-description">{provider.description}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="setting-group">
              <label className="setting-label">API Key</label>
              <p className="setting-description">
                API key for {IMAGE_PROVIDERS.find(p => p.id === settings.imageGeneration.provider)?.name}
              </p>

              <input
                type="password"
                className="api-key-input"
                value={settings.imageGeneration.apiKey}
                onChange={(e) => onUpdate('imageGeneration', {
                  ...settings.imageGeneration,
                  apiKey: e.target.value
                })}
                placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <label className="setting-label">Max Images per Request</label>
                <p className="setting-description">
                  Maximum number of images to generate at once
                </p>
              </div>
              <input
                type="number"
                className="max-images-input"
                min="1"
                max="10"
                value={settings.imageGeneration.maxImages}
                onChange={(e) => onUpdate('imageGeneration', {
                  ...settings.imageGeneration,
                  maxImages: parseInt(e.target.value, 10)
                })}
              />
            </div>
          </>
        )}
      </div>

      {/* 10. MCP Server Configuration */}
      <div className="setting-group mcp-server-section">
        <h4 className="subsection-title">🔌 MCP Server Configuration</h4>

        <div className="setting-row">
          <div className="setting-info">
            <label className="setting-label">Enable MCP Servers</label>
            <p className="setting-description">
              Connect to Model Context Protocol servers for extended capabilities
            </p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.mcpServers.enabled}
              onChange={(e) => onUpdate('mcpServers', {
                ...settings.mcpServers,
                enabled: e.target.checked
              })}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        {settings.mcpServers.enabled && (
          <>
            <div className="setting-row">
              <div className="setting-info">
                <label className="setting-label">Auto-Connect on Startup</label>
                <p className="setting-description">
                  Automatically connect to configured MCP servers when VS Code starts
                </p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.mcpServers.autoConnect}
                  onChange={(e) => onUpdate('mcpServers', {
                    ...settings.mcpServers,
                    autoConnect: e.target.checked
                  })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <label className="setting-label">Reconnection Attempts</label>
                <p className="setting-description">
                  Number of times to attempt reconnection if server crashes
                </p>
              </div>
              <input
                type="number"
                className="reconnect-input"
                min="0"
                max="10"
                value={settings.mcpServers.reconnectAttempts}
                onChange={(e) => onUpdate('mcpServers', {
                  ...settings.mcpServers,
                  reconnectAttempts: parseInt(e.target.value, 10)
                })}
              />
            </div>

            <button
              className="button-secondary"
              onClick={() => {
                // This would open MCP config editor
                console.log('Open MCP config editor')
              }}
            >
              Configure MCP Servers
            </button>
          </>
        )}
      </div>
    </section>
  )
}
