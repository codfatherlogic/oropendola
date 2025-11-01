import React, { useState } from 'react'
import Toggle from '../common/Toggle'
import './PromptsAndModes.css'

interface PromptVariable {
  name: string
  description: string
  defaultValue: string
}

interface ModeTemplate {
  id: string
  name: string
  description: string
  icon: string
  systemPrompt: string
  variables: PromptVariable[]
  temperature: number
  maxTokens: number
  enabled: boolean
  isBuiltIn: boolean
}

interface PromptsAndModesProps {
  modes: ModeTemplate[]
  currentMode: string
  onModeSelect: (modeId: string) => void
  onModeCreate: (mode: ModeTemplate) => void
  onModeUpdate: (id: string, updates: Partial<ModeTemplate>) => void
  onModeDelete: (id: string) => void
  onModeDuplicate: (id: string, newName: string) => void
  onModeExport: (id: string) => void
  onModeImport: (jsonString: string) => void
  onExportAll: () => void
  onResetToDefaults: () => void
}

const PromptsAndModes: React.FC<PromptsAndModesProps> = ({
  modes,
  currentMode,
  onModeSelect,
  onModeCreate,
  onModeUpdate,
  onModeDelete,
  onModeDuplicate,
  onModeExport,
  onModeImport,
  onExportAll,
  onResetToDefaults
}) => {
  const [view, setView] = useState<'list' | 'edit' | 'create'>('list')
  const [editingMode, setEditingMode] = useState<ModeTemplate | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [duplicateName, setDuplicateName] = useState('')
  const [showDuplicateDialog, setShowDuplicateDialog] = useState<string | null>(null)
  const [importText, setImportText] = useState('')
  const [showImportDialog, setShowImportDialog] = useState(false)

  // New mode form state
  const [newMode, setNewMode] = useState<Partial<ModeTemplate>>({
    name: '',
    description: '',
    icon: '⚙️',
    systemPrompt: '',
    variables: [],
    temperature: 0.7,
    maxTokens: 4096,
    enabled: true
  })

  const [newVariable, setNewVariable] = useState<PromptVariable>({
    name: '',
    description: '',
    defaultValue: ''
  })

  const builtInModes = modes.filter(m => m.isBuiltIn)
  const customModes = modes.filter(m => !m.isBuiltIn)

  const handleEditMode = (mode: ModeTemplate) => {
    setEditingMode({ ...mode })
    setView('edit')
  }

  const handleSaveEdit = () => {
    if (editingMode) {
      onModeUpdate(editingMode.id, editingMode)
      setView('list')
      setEditingMode(null)
    }
  }

  const handleCancelEdit = () => {
    setView('list')
    setEditingMode(null)
  }

  const handleCreateMode = () => {
    const mode: ModeTemplate = {
      id: `custom_${Date.now()}`,
      name: newMode.name || 'New Mode',
      description: newMode.description || '',
      icon: newMode.icon || '⚙️',
      systemPrompt: newMode.systemPrompt || '',
      variables: newMode.variables || [],
      temperature: newMode.temperature || 0.7,
      maxTokens: newMode.maxTokens || 4096,
      enabled: newMode.enabled !== false,
      isBuiltIn: false
    }

    onModeCreate(mode)
    setView('list')
    setNewMode({
      name: '',
      description: '',
      icon: '⚙️',
      systemPrompt: '',
      variables: [],
      temperature: 0.7,
      maxTokens: 4096,
      enabled: true
    })
  }

  const handleAddVariable = (toMode: 'new' | 'edit') => {
    if (newVariable.name.trim()) {
      if (toMode === 'new') {
        setNewMode({
          ...newMode,
          variables: [...(newMode.variables || []), { ...newVariable }]
        })
      } else if (editingMode) {
        setEditingMode({
          ...editingMode,
          variables: [...editingMode.variables, { ...newVariable }]
        })
      }
      setNewVariable({ name: '', description: '', defaultValue: '' })
    }
  }

  const handleRemoveVariable = (index: number, fromMode: 'new' | 'edit') => {
    if (fromMode === 'new') {
      const vars = [...(newMode.variables || [])]
      vars.splice(index, 1)
      setNewMode({ ...newMode, variables: vars })
    } else if (editingMode) {
      const vars = [...editingMode.variables]
      vars.splice(index, 1)
      setEditingMode({ ...editingMode, variables: vars })
    }
  }

  const handleDuplicate = (modeId: string) => {
    setShowDuplicateDialog(modeId)
    const mode = modes.find(m => m.id === modeId)
    if (mode) {
      setDuplicateName(`${mode.name} (Copy)`)
    }
  }

  const confirmDuplicate = () => {
    if (showDuplicateDialog && duplicateName.trim()) {
      onModeDuplicate(showDuplicateDialog, duplicateName.trim())
      setShowDuplicateDialog(null)
      setDuplicateName('')
    }
  }

  const handleImport = () => {
    if (importText.trim()) {
      try {
        onModeImport(importText)
        setShowImportDialog(false)
        setImportText('')
      } catch (error) {
        alert(`Import failed: ${error}`)
      }
    }
  }

  const iconOptions = ['💻', '🐛', '📚', '🔍', '🧪', '♻️', '💡', '🏗️', '⚙️', '🎨', '🚀', '📝', '🔧', '📊', '🎯']

  if (view === 'create') {
    return (
      <div className="prompts-and-modes">
        <div className="page-header">
          <button className="back-btn" onClick={() => setView('list')}>
            ← Back to Modes
          </button>
          <h2>Create Custom Mode</h2>
        </div>

        <div className="mode-form">
          <div className="form-section">
            <label className="form-label">Mode Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., API Development"
              value={newMode.name || ''}
              onChange={(e) => setNewMode({ ...newMode, name: e.target.value })}
            />
          </div>

          <div className="form-section">
            <label className="form-label">Description</label>
            <input
              type="text"
              className="form-input"
              placeholder="Brief description of this mode"
              value={newMode.description || ''}
              onChange={(e) => setNewMode({ ...newMode, description: e.target.value })}
            />
          </div>

          <div className="form-section">
            <label className="form-label">Icon</label>
            <div className="icon-selector">
              {iconOptions.map(icon => (
                <button
                  key={icon}
                  className={`icon-option ${newMode.icon === icon ? 'selected' : ''}`}
                  onClick={() => setNewMode({ ...newMode, icon })}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className="form-section">
            <label className="form-label">System Prompt *</label>
            <textarea
              className="form-textarea"
              rows={12}
              placeholder="Enter the system prompt for this mode. Use {variable_name} for variables."
              value={newMode.systemPrompt || ''}
              onChange={(e) => setNewMode({ ...newMode, systemPrompt: e.target.value })}
            />
            <div className="form-hint">
              Tip: Use curly braces for variables like {'{current_file}'} or {'{selected_code}'}
            </div>
          </div>

          <div className="form-section">
            <label className="form-label">Variables</label>
            <div className="variables-editor">
              <div className="variable-input-row">
                <input
                  type="text"
                  className="variable-name-input"
                  placeholder="Variable name"
                  value={newVariable.name}
                  onChange={(e) => setNewVariable({ ...newVariable, name: e.target.value })}
                />
                <input
                  type="text"
                  className="variable-desc-input"
                  placeholder="Description"
                  value={newVariable.description}
                  onChange={(e) => setNewVariable({ ...newVariable, description: e.target.value })}
                />
                <input
                  type="text"
                  className="variable-default-input"
                  placeholder="Default value"
                  value={newVariable.defaultValue}
                  onChange={(e) => setNewVariable({ ...newVariable, defaultValue: e.target.value })}
                />
                <button className="add-variable-btn" onClick={() => handleAddVariable('new')}>
                  Add
                </button>
              </div>

              <div className="variables-list">
                {(newMode.variables || []).map((variable, index) => (
                  <div key={index} className="variable-item">
                    <div className="variable-info">
                      <code className="variable-name">{'{' + variable.name + '}'}</code>
                      <span className="variable-description">{variable.description}</span>
                      {variable.defaultValue && (
                        <span className="variable-default">Default: {variable.defaultValue}</span>
                      )}
                    </div>
                    <button className="remove-variable-btn" onClick={() => handleRemoveVariable(index, 'new')}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-row">
              <div className="form-col">
                <label className="form-label">Temperature</label>
                <input
                  type="number"
                  className="form-input-small"
                  min="0"
                  max="2"
                  step="0.1"
                  value={newMode.temperature || 0.7}
                  onChange={(e) => setNewMode({ ...newMode, temperature: parseFloat(e.target.value) })}
                />
              </div>
              <div className="form-col">
                <label className="form-label">Max Tokens</label>
                <input
                  type="number"
                  className="form-input-small"
                  min="256"
                  max="32000"
                  step="256"
                  value={newMode.maxTokens || 4096}
                  onChange={(e) => setNewMode({ ...newMode, maxTokens: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button className="cancel-btn" onClick={() => setView('list')}>
              Cancel
            </button>
            <button
              className="create-btn"
              onClick={handleCreateMode}
              disabled={!newMode.name || !newMode.systemPrompt}
            >
              Create Mode
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'edit' && editingMode) {
    return (
      <div className="prompts-and-modes">
        <div className="page-header">
          <button className="back-btn" onClick={handleCancelEdit}>
            ← Back to Modes
          </button>
          <h2>Edit Mode: {editingMode.name}</h2>
        </div>

        <div className="mode-form">
          <div className="form-section">
            <label className="form-label">Mode Name</label>
            <input
              type="text"
              className="form-input"
              value={editingMode.name}
              onChange={(e) => setEditingMode({ ...editingMode, name: e.target.value })}
              disabled={editingMode.isBuiltIn}
            />
            {editingMode.isBuiltIn && (
              <div className="form-hint warning">Built-in modes cannot be renamed. Duplicate to customize.</div>
            )}
          </div>

          <div className="form-section">
            <label className="form-label">Description</label>
            <input
              type="text"
              className="form-input"
              value={editingMode.description}
              onChange={(e) => setEditingMode({ ...editingMode, description: e.target.value })}
              disabled={editingMode.isBuiltIn}
            />
          </div>

          <div className="form-section">
            <label className="form-label">Icon</label>
            <div className="icon-selector">
              {iconOptions.map(icon => (
                <button
                  key={icon}
                  className={`icon-option ${editingMode.icon === icon ? 'selected' : ''}`}
                  onClick={() => setEditingMode({ ...editingMode, icon })}
                  disabled={editingMode.isBuiltIn}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className="form-section">
            <label className="form-label">System Prompt</label>
            <textarea
              className="form-textarea"
              rows={12}
              value={editingMode.systemPrompt}
              onChange={(e) => setEditingMode({ ...editingMode, systemPrompt: e.target.value })}
              disabled={editingMode.isBuiltIn}
            />
          </div>

          <div className="form-section">
            <label className="form-label">Variables</label>
            {!editingMode.isBuiltIn && (
              <div className="variable-input-row">
                <input
                  type="text"
                  className="variable-name-input"
                  placeholder="Variable name"
                  value={newVariable.name}
                  onChange={(e) => setNewVariable({ ...newVariable, name: e.target.value })}
                />
                <input
                  type="text"
                  className="variable-desc-input"
                  placeholder="Description"
                  value={newVariable.description}
                  onChange={(e) => setNewVariable({ ...newVariable, description: e.target.value })}
                />
                <input
                  type="text"
                  className="variable-default-input"
                  placeholder="Default value"
                  value={newVariable.defaultValue}
                  onChange={(e) => setNewVariable({ ...newVariable, defaultValue: e.target.value })}
                />
                <button className="add-variable-btn" onClick={() => handleAddVariable('edit')}>
                  Add
                </button>
              </div>
            )}

            <div className="variables-list">
              {editingMode.variables.map((variable, index) => (
                <div key={index} className="variable-item">
                  <div className="variable-info">
                    <code className="variable-name">{'{' + variable.name + '}'}</code>
                    <span className="variable-description">{variable.description}</span>
                    {variable.defaultValue && (
                      <span className="variable-default">Default: {variable.defaultValue}</span>
                    )}
                  </div>
                  {!editingMode.isBuiltIn && (
                    <button className="remove-variable-btn" onClick={() => handleRemoveVariable(index, 'edit')}>
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="form-section">
            <div className="form-row">
              <div className="form-col">
                <label className="form-label">Temperature</label>
                <input
                  type="number"
                  className="form-input-small"
                  min="0"
                  max="2"
                  step="0.1"
                  value={editingMode.temperature}
                  onChange={(e) => setEditingMode({ ...editingMode, temperature: parseFloat(e.target.value) })}
                />
              </div>
              <div className="form-col">
                <label className="form-label">Max Tokens</label>
                <input
                  type="number"
                  className="form-input-small"
                  min="256"
                  max="32000"
                  step="256"
                  value={editingMode.maxTokens}
                  onChange={(e) => setEditingMode({ ...editingMode, maxTokens: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <label className="form-label">Status</label>
            <div className="enabled-toggle">
              <Toggle
                checked={editingMode.enabled}
                onChange={(checked) => setEditingMode({ ...editingMode, enabled: checked })}
              />
              <span>{editingMode.enabled ? 'Enabled' : 'Disabled'}</span>
            </div>
          </div>

          <div className="form-actions">
            <button className="cancel-btn" onClick={handleCancelEdit}>
              Cancel
            </button>
            {!editingMode.isBuiltIn && (
              <button className="save-btn" onClick={handleSaveEdit}>
                Save Changes
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="prompts-and-modes">
      <div className="page-header">
        <h2>Prompts & Modes</h2>
        <div className="header-actions">
          <button className="action-btn secondary" onClick={() => setShowImportDialog(true)}>
            📥 Import
          </button>
          <button className="action-btn secondary" onClick={onExportAll}>
            📤 Export All
          </button>
          <button className="action-btn primary" onClick={() => setView('create')}>
            + Create Mode
          </button>
        </div>
      </div>

      <div className="modes-container">
        {/* Built-in Modes */}
        <div className="modes-section">
          <h3 className="section-title">Built-in Modes</h3>
          <div className="modes-grid">
            {builtInModes.map(mode => (
              <div
                key={mode.id}
                className={`mode-card ${currentMode === mode.id ? 'active' : ''} ${!mode.enabled ? 'disabled' : ''}`}
              >
                <div className="mode-header">
                  <div className="mode-icon">{mode.icon}</div>
                  <div className="mode-info">
                    <h4 className="mode-name">{mode.name}</h4>
                    <p className="mode-description">{mode.description}</p>
                  </div>
                </div>

                <div className="mode-stats">
                  <span className="stat">Temp: {mode.temperature}</span>
                  <span className="stat">Tokens: {mode.maxTokens}</span>
                  <span className="stat">{mode.variables.length} vars</span>
                </div>

                <div className="mode-actions">
                  <button
                    className="mode-action-btn"
                    onClick={() => onModeSelect(mode.id)}
                    disabled={!mode.enabled}
                  >
                    {currentMode === mode.id ? 'Current' : 'Select'}
                  </button>
                  <button className="mode-action-btn secondary" onClick={() => handleEditMode(mode)}>
                    View
                  </button>
                  <button className="mode-action-btn secondary" onClick={() => handleDuplicate(mode.id)}>
                    Duplicate
                  </button>
                  <button className="mode-action-btn secondary" onClick={() => onModeExport(mode.id)}>
                    Export
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Modes */}
        <div className="modes-section">
          <h3 className="section-title">Custom Modes</h3>
          {customModes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <h4>No custom modes yet</h4>
              <p>Create your own modes with custom prompts and variables</p>
              <button className="create-mode-btn" onClick={() => setView('create')}>
                Create Your First Mode
              </button>
            </div>
          ) : (
            <div className="modes-grid">
              {customModes.map(mode => (
                <div
                  key={mode.id}
                  className={`mode-card custom ${currentMode === mode.id ? 'active' : ''} ${!mode.enabled ? 'disabled' : ''}`}
                >
                  <div className="mode-header">
                    <div className="mode-icon">{mode.icon}</div>
                    <div className="mode-info">
                      <h4 className="mode-name">{mode.name}</h4>
                      <p className="mode-description">{mode.description}</p>
                    </div>
                  </div>

                  <div className="mode-stats">
                    <span className="stat">Temp: {mode.temperature}</span>
                    <span className="stat">Tokens: {mode.maxTokens}</span>
                    <span className="stat">{mode.variables.length} vars</span>
                  </div>

                  <div className="mode-actions">
                    <button
                      className="mode-action-btn"
                      onClick={() => onModeSelect(mode.id)}
                      disabled={!mode.enabled}
                    >
                      {currentMode === mode.id ? 'Current' : 'Select'}
                    </button>
                    <button className="mode-action-btn secondary" onClick={() => handleEditMode(mode)}>
                      Edit
                    </button>
                    <button className="mode-action-btn secondary" onClick={() => handleDuplicate(mode.id)}>
                      Duplicate
                    </button>
                    <button className="mode-action-btn secondary" onClick={() => onModeExport(mode.id)}>
                      Export
                    </button>
                    <button
                      className="mode-action-btn danger"
                      onClick={() => setShowDeleteConfirm(mode.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reset Section */}
      <div className="reset-section">
        <div className="reset-content">
          <h3>Reset to Defaults</h3>
          <p>Remove all custom modes and reset to built-in modes only</p>
          {!showResetConfirm ? (
            <button className="reset-btn" onClick={() => setShowResetConfirm(true)}>
              Reset to Defaults
            </button>
          ) : (
            <div className="confirm-dialog">
              <p className="confirm-message">Are you sure? This will delete all custom modes.</p>
              <div className="confirm-actions">
                <button className="confirm-btn danger" onClick={() => { onResetToDefaults(); setShowResetConfirm(false); }}>
                  Yes, Reset
                </button>
                <button className="confirm-btn" onClick={() => setShowResetConfirm(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Mode</h3>
            <p>Are you sure you want to delete this mode? This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="modal-btn danger" onClick={() => { onModeDelete(showDeleteConfirm); setShowDeleteConfirm(null); }}>
                Delete
              </button>
              <button className="modal-btn" onClick={() => setShowDeleteConfirm(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Dialog */}
      {showDuplicateDialog && (
        <div className="modal-overlay" onClick={() => setShowDuplicateDialog(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Duplicate Mode</h3>
            <label className="modal-label">New mode name:</label>
            <input
              type="text"
              className="modal-input"
              value={duplicateName}
              onChange={(e) => setDuplicateName(e.target.value)}
              autoFocus
            />
            <div className="modal-actions">
              <button className="modal-btn primary" onClick={confirmDuplicate}>
                Duplicate
              </button>
              <button className="modal-btn" onClick={() => setShowDuplicateDialog(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Dialog */}
      {showImportDialog && (
        <div className="modal-overlay" onClick={() => setShowImportDialog(false)}>
          <div className="modal-dialog large" onClick={(e) => e.stopPropagation()}>
            <h3>Import Mode(s)</h3>
            <label className="modal-label">Paste JSON data:</label>
            <textarea
              className="modal-textarea"
              rows={10}
              placeholder="Paste mode JSON here..."
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              autoFocus
            />
            <div className="modal-actions">
              <button className="modal-btn primary" onClick={handleImport}>
                Import
              </button>
              <button className="modal-btn" onClick={() => setShowImportDialog(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PromptsAndModes
