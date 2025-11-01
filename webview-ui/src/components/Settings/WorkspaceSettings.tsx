import React, { useState } from 'react'
import Toggle from '../common/Toggle'
import './WorkspaceSettings.css'

interface WorkspaceSettingsProps {
  settings: {
    rooignore: {
      enabled: boolean
      patterns: string[]
    }
    protectedFiles: {
      enabled: boolean
      patterns: string[]
      warnBeforeEdit: boolean
      requireApproval: boolean
    }
    autoSave: {
      enabled: boolean
      delay: number
      onFocusChange: boolean
      onWindowChange: boolean
    }
    git: {
      enabled: boolean
      autoStage: boolean
      autoCommit: boolean
      commitMessageTemplate: string
      showDiffBeforeCommit: boolean
    }
    indexing: {
      enabled: boolean
      autoIndex: boolean
      indexOnSave: boolean
      excludePatterns: string[]
      includeFileTypes: string[]
      maxFileSize: number
    }
  }
  onUpdate: (key: string, value: any) => void
}

const WorkspaceSettings: React.FC<WorkspaceSettingsProps> = ({ settings, onUpdate }) => {
  // .rooignore patterns
  const [rooignoreInput, setRooignoreInput] = useState('')

  // Protected files patterns
  const [protectedFileInput, setProtectedFileInput] = useState('')

  // Indexing exclude patterns
  const [excludePatternInput, setExcludePatternInput] = useState('')

  // Indexing file types
  const [fileTypeInput, setFileTypeInput] = useState('')

  // .rooignore handlers
  const addRooignorePattern = () => {
    if (rooignoreInput.trim()) {
      const newPatterns = [...settings.rooignore.patterns, rooignoreInput.trim()]
      onUpdate('rooignore', { ...settings.rooignore, patterns: newPatterns })
      setRooignoreInput('')
    }
  }

  const removeRooignorePattern = (index: number) => {
    const newPatterns = settings.rooignore.patterns.filter((_, i) => i !== index)
    onUpdate('rooignore', { ...settings.rooignore, patterns: newPatterns })
  }

  const loadDefaultRooignore = () => {
    const defaultPatterns = [
      'node_modules/',
      '.git/',
      'dist/',
      'build/',
      '*.log',
      '.env',
      '.DS_Store',
      'coverage/',
      '__pycache__/',
      '*.pyc',
      '.vscode/',
      '.idea/'
    ]
    onUpdate('rooignore', { ...settings.rooignore, patterns: defaultPatterns })
  }

  // Protected files handlers
  const addProtectedPattern = () => {
    if (protectedFileInput.trim()) {
      const newPatterns = [...settings.protectedFiles.patterns, protectedFileInput.trim()]
      onUpdate('protectedFiles', { ...settings.protectedFiles, patterns: newPatterns })
      setProtectedFileInput('')
    }
  }

  const removeProtectedPattern = (index: number) => {
    const newPatterns = settings.protectedFiles.patterns.filter((_, i) => i !== index)
    onUpdate('protectedFiles', { ...settings.protectedFiles, patterns: newPatterns })
  }

  // Indexing exclude patterns handlers
  const addExcludePattern = () => {
    if (excludePatternInput.trim()) {
      const newPatterns = [...settings.indexing.excludePatterns, excludePatternInput.trim()]
      onUpdate('indexing', { ...settings.indexing, excludePatterns: newPatterns })
      setExcludePatternInput('')
    }
  }

  const removeExcludePattern = (index: number) => {
    const newPatterns = settings.indexing.excludePatterns.filter((_, i) => i !== index)
    onUpdate('indexing', { ...settings.indexing, excludePatterns: newPatterns })
  }

  // File type handlers
  const addFileType = () => {
    if (fileTypeInput.trim()) {
      const newTypes = [...settings.indexing.includeFileTypes, fileTypeInput.trim()]
      onUpdate('indexing', { ...settings.indexing, includeFileTypes: newTypes })
      setFileTypeInput('')
    }
  }

  const removeFileType = (index: number) => {
    const newTypes = settings.indexing.includeFileTypes.filter((_, i) => i !== index)
    onUpdate('indexing', { ...settings.indexing, includeFileTypes: newTypes })
  }

  const loadDefaultFileTypes = () => {
    const defaultTypes = [
      'js', 'jsx', 'ts', 'tsx',
      'py', 'java', 'c', 'cpp', 'h',
      'cs', 'go', 'rs', 'rb',
      'php', 'swift', 'kt',
      'html', 'css', 'scss', 'sass',
      'json', 'xml', 'yaml', 'yml',
      'md', 'txt'
    ]
    onUpdate('indexing', { ...settings.indexing, includeFileTypes: defaultTypes })
  }

  // Auto-save delay presets
  const autoSavePresets = [
    { label: '500ms', value: 500 },
    { label: '1s', value: 1000 },
    { label: '2s', value: 2000 },
    { label: '5s', value: 5000 }
  ]

  // File size presets (in bytes)
  const fileSizePresets = [
    { label: '1 MB', value: 1048576 },
    { label: '5 MB', value: 5242880 },
    { label: '10 MB', value: 10485760 },
    { label: '50 MB', value: 52428800 }
  ]

  return (
    <div className="workspace-settings">
      {/* 1. .rooignore Editor */}
      <div className="setting-section">
        <div className="setting-header">
          <div className="setting-info">
            <div className="setting-label">.rooignore Configuration</div>
            <div className="setting-description">
              Define patterns for files and directories to ignore in workspace operations
            </div>
          </div>
          <Toggle
            checked={settings.rooignore.enabled}
            onChange={(checked) => onUpdate('rooignore', { ...settings.rooignore, enabled: checked })}
          />
        </div>

        {settings.rooignore.enabled && (
          <div className="setting-content">
            <div className="list-editor">
              <div className="list-header">
                <span className="list-title">Ignore Patterns</span>
                <button className="load-defaults-btn" onClick={loadDefaultRooignore}>
                  Load Defaults
                </button>
              </div>

              <div className="list-input-wrapper">
                <input
                  type="text"
                  className="list-input"
                  placeholder="Add pattern (e.g., node_modules/, *.log)"
                  value={rooignoreInput}
                  onChange={(e) => setRooignoreInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addRooignorePattern()}
                />
                <button className="add-btn" onClick={addRooignorePattern}>
                  Add
                </button>
              </div>

              <div className="list-items">
                {settings.rooignore.patterns.length === 0 ? (
                  <div className="empty-list">No patterns defined. Click "Load Defaults" to get started.</div>
                ) : (
                  settings.rooignore.patterns.map((pattern, index) => (
                    <div key={index} className="list-item">
                      <code className="item-text">{pattern}</code>
                      <button className="remove-btn" onClick={() => removeRooignorePattern(index)}>
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Protected Files */}
      <div className="setting-section">
        <div className="setting-header">
          <div className="setting-info">
            <div className="setting-label">Protected Files</div>
            <div className="setting-description">
              Define patterns for sensitive files that require extra caution when editing
            </div>
          </div>
          <Toggle
            checked={settings.protectedFiles.enabled}
            onChange={(checked) => onUpdate('protectedFiles', { ...settings.protectedFiles, enabled: checked })}
          />
        </div>

        {settings.protectedFiles.enabled && (
          <div className="setting-content">
            {/* Protected files sub-settings */}
            <div className="sub-settings">
              <div className="sub-setting-row">
                <span className="sub-setting-label">Warn before editing protected files</span>
                <Toggle
                  checked={settings.protectedFiles.warnBeforeEdit}
                  onChange={(checked) => onUpdate('protectedFiles', { ...settings.protectedFiles, warnBeforeEdit: checked })}
                />
              </div>
              <div className="sub-setting-row">
                <span className="sub-setting-label">Require approval for edits</span>
                <Toggle
                  checked={settings.protectedFiles.requireApproval}
                  onChange={(checked) => onUpdate('protectedFiles', { ...settings.protectedFiles, requireApproval: checked })}
                />
              </div>
            </div>

            <div className="list-editor">
              <div className="list-header">
                <span className="list-title">Protected File Patterns</span>
              </div>

              <div className="list-input-wrapper">
                <input
                  type="text"
                  className="list-input"
                  placeholder="Add pattern (e.g., *.env, config/production.*, secrets/*)"
                  value={protectedFileInput}
                  onChange={(e) => setProtectedFileInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addProtectedPattern()}
                />
                <button className="add-btn" onClick={addProtectedPattern}>
                  Add
                </button>
              </div>

              <div className="list-items">
                {settings.protectedFiles.patterns.length === 0 ? (
                  <div className="empty-list">No protected file patterns defined.</div>
                ) : (
                  settings.protectedFiles.patterns.map((pattern, index) => (
                    <div key={index} className="list-item">
                      <code className="item-text">{pattern}</code>
                      <button className="remove-btn" onClick={() => removeProtectedPattern(index)}>
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Auto-Save Preferences */}
      <div className="setting-section">
        <div className="setting-header">
          <div className="setting-info">
            <div className="setting-label">Auto-Save</div>
            <div className="setting-description">
              Automatically save files after AI makes changes
            </div>
          </div>
          <Toggle
            checked={settings.autoSave.enabled}
            onChange={(checked) => onUpdate('autoSave', { ...settings.autoSave, enabled: checked })}
          />
        </div>

        {settings.autoSave.enabled && (
          <div className="setting-content">
            {/* Auto-save delay */}
            <div className="setting-row">
              <div className="setting-info">
                <div className="setting-label">Auto-save delay</div>
                <div className="setting-description">Time to wait before auto-saving after changes</div>
              </div>
            </div>

            <div className="delay-input-wrapper">
              <input
                type="number"
                className="delay-input"
                min="100"
                max="10000"
                step="100"
                value={settings.autoSave.delay}
                onChange={(e) => onUpdate('autoSave', { ...settings.autoSave, delay: parseInt(e.target.value) })}
              />
              <span className="delay-label">ms</span>
            </div>

            <div className="delay-presets">
              {autoSavePresets.map((preset) => (
                <button
                  key={preset.value}
                  className={`preset-btn ${settings.autoSave.delay === preset.value ? 'active' : ''}`}
                  onClick={() => onUpdate('autoSave', { ...settings.autoSave, delay: preset.value })}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Auto-save triggers */}
            <div className="sub-settings">
              <div className="sub-setting-row">
                <span className="sub-setting-label">Save on focus change</span>
                <Toggle
                  checked={settings.autoSave.onFocusChange}
                  onChange={(checked) => onUpdate('autoSave', { ...settings.autoSave, onFocusChange: checked })}
                />
              </div>
              <div className="sub-setting-row">
                <span className="sub-setting-label">Save on window change</span>
                <Toggle
                  checked={settings.autoSave.onWindowChange}
                  onChange={(checked) => onUpdate('autoSave', { ...settings.autoSave, onWindowChange: checked })}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Git Integration */}
      <div className="setting-section">
        <div className="setting-header">
          <div className="setting-info">
            <div className="setting-label">Git Integration</div>
            <div className="setting-description">
              Automatically stage and commit changes made by AI
            </div>
          </div>
          <Toggle
            checked={settings.git.enabled}
            onChange={(checked) => onUpdate('git', { ...settings.git, enabled: checked })}
          />
        </div>

        {settings.git.enabled && (
          <div className="setting-content">
            {/* Git sub-settings */}
            <div className="sub-settings">
              <div className="sub-setting-row">
                <span className="sub-setting-label">Auto-stage modified files</span>
                <Toggle
                  checked={settings.git.autoStage}
                  onChange={(checked) => onUpdate('git', { ...settings.git, autoStage: checked })}
                />
              </div>
              <div className="sub-setting-row">
                <span className="sub-setting-label">Auto-commit changes</span>
                <Toggle
                  checked={settings.git.autoCommit}
                  onChange={(checked) => onUpdate('git', { ...settings.git, autoCommit: checked })}
                />
              </div>
              <div className="sub-setting-row">
                <span className="sub-setting-label">Show diff before committing</span>
                <Toggle
                  checked={settings.git.showDiffBeforeCommit}
                  disabled={!settings.git.autoCommit}
                  onChange={(checked) => onUpdate('git', { ...settings.git, showDiffBeforeCommit: checked })}
                />
              </div>
            </div>

            {/* Commit message template */}
            <div className="setting-row">
              <div className="setting-info">
                <div className="setting-label">Commit message template</div>
                <div className="setting-description">
                  Template for auto-generated commit messages. Use {'{'}description{'}'} for AI description.
                </div>
              </div>
            </div>

            <textarea
              className="commit-template-input"
              rows={3}
              placeholder="feat: {description}&#10;&#10;Generated by Oropendola AI"
              value={settings.git.commitMessageTemplate}
              onChange={(e) => onUpdate('git', { ...settings.git, commitMessageTemplate: e.target.value })}
            />

            <div className="template-examples">
              <div className="example-label">Examples:</div>
              <button
                className="example-btn"
                onClick={() => onUpdate('git', { ...settings.git, commitMessageTemplate: 'feat: {description}\n\nGenerated by Oropendola AI' })}
              >
                Feature
              </button>
              <button
                className="example-btn"
                onClick={() => onUpdate('git', { ...settings.git, commitMessageTemplate: 'fix: {description}\n\nGenerated by Oropendola AI' })}
              >
                Fix
              </button>
              <button
                className="example-btn"
                onClick={() => onUpdate('git', { ...settings.git, commitMessageTemplate: 'refactor: {description}\n\nGenerated by Oropendola AI' })}
              >
                Refactor
              </button>
              <button
                className="example-btn"
                onClick={() => onUpdate('git', { ...settings.git, commitMessageTemplate: '{description}' })}
              >
                Simple
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Workspace Indexing */}
      <div className="setting-section">
        <div className="setting-header">
          <div className="setting-info">
            <div className="setting-label">Workspace Indexing</div>
            <div className="setting-description">
              Index workspace files for faster code search and context retrieval
            </div>
          </div>
          <Toggle
            checked={settings.indexing.enabled}
            onChange={(checked) => onUpdate('indexing', { ...settings.indexing, enabled: checked })}
          />
        </div>

        {settings.indexing.enabled && (
          <div className="setting-content">
            {/* Indexing sub-settings */}
            <div className="sub-settings">
              <div className="sub-setting-row">
                <span className="sub-setting-label">Auto-index on workspace open</span>
                <Toggle
                  checked={settings.indexing.autoIndex}
                  onChange={(checked) => onUpdate('indexing', { ...settings.indexing, autoIndex: checked })}
                />
              </div>
              <div className="sub-setting-row">
                <span className="sub-setting-label">Re-index files on save</span>
                <Toggle
                  checked={settings.indexing.indexOnSave}
                  onChange={(checked) => onUpdate('indexing', { ...settings.indexing, indexOnSave: checked })}
                />
              </div>
            </div>

            {/* Max file size */}
            <div className="setting-row">
              <div className="setting-info">
                <div className="setting-label">Maximum file size to index</div>
                <div className="setting-description">Skip indexing files larger than this size</div>
              </div>
            </div>

            <div className="file-size-input-wrapper">
              <input
                type="number"
                className="file-size-input"
                min="1024"
                max="104857600"
                step="1024"
                value={settings.indexing.maxFileSize}
                onChange={(e) => onUpdate('indexing', { ...settings.indexing, maxFileSize: parseInt(e.target.value) })}
              />
              <span className="file-size-label">
                {(settings.indexing.maxFileSize / 1048576).toFixed(2)} MB
              </span>
            </div>

            <div className="file-size-presets">
              {fileSizePresets.map((preset) => (
                <button
                  key={preset.value}
                  className={`preset-btn ${settings.indexing.maxFileSize === preset.value ? 'active' : ''}`}
                  onClick={() => onUpdate('indexing', { ...settings.indexing, maxFileSize: preset.value })}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Include file types */}
            <div className="list-editor">
              <div className="list-header">
                <span className="list-title">Include File Types</span>
                <button className="load-defaults-btn" onClick={loadDefaultFileTypes}>
                  Load Defaults
                </button>
              </div>

              <div className="list-input-wrapper">
                <input
                  type="text"
                  className="list-input"
                  placeholder="Add file extension (e.g., js, py, tsx)"
                  value={fileTypeInput}
                  onChange={(e) => setFileTypeInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addFileType()}
                />
                <button className="add-btn" onClick={addFileType}>
                  Add
                </button>
              </div>

              <div className="list-items file-types-list">
                {settings.indexing.includeFileTypes.length === 0 ? (
                  <div className="empty-list">No file types specified. All files will be indexed.</div>
                ) : (
                  settings.indexing.includeFileTypes.map((type, index) => (
                    <div key={index} className="list-item file-type-item">
                      <code className="item-text">.{type}</code>
                      <button className="remove-btn" onClick={() => removeFileType(index)}>
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Exclude patterns */}
            <div className="list-editor">
              <div className="list-header">
                <span className="list-title">Exclude Patterns</span>
              </div>

              <div className="list-input-wrapper">
                <input
                  type="text"
                  className="list-input"
                  placeholder="Add exclude pattern (e.g., test/*, *.test.js)"
                  value={excludePatternInput}
                  onChange={(e) => setExcludePatternInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addExcludePattern()}
                />
                <button className="add-btn" onClick={addExcludePattern}>
                  Add
                </button>
              </div>

              <div className="list-items">
                {settings.indexing.excludePatterns.length === 0 ? (
                  <div className="empty-list">No exclude patterns defined.</div>
                ) : (
                  settings.indexing.excludePatterns.map((pattern, index) => (
                    <div key={index} className="list-item">
                      <code className="item-text">{pattern}</code>
                      <button className="remove-btn" onClick={() => removeExcludePattern(index)}>
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default WorkspaceSettings
