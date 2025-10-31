/**
 * ModesView Component
 *
 * Custom mode management interface for creating, editing, and deleting AI assistant modes.
 * Includes export/import functionality for sharing custom modes.
 */

import React, { useState, useRef, useMemo, useEffect } from 'react'
import { VSCodeButton, VSCodeTextField, VSCodeTextArea } from '@vscode/webview-ui-toolkit/react'
import { fuzzySearchMultiField } from '../../utils/fuzzySearch'
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges'
import './ModesView.css'

interface Mode {
  id: string
  name: string
  description: string
  icon: string
  roleDefinition?: string
  whenToUse?: string
  customInstructions?: string
  canModifyFiles: boolean
  canExecuteCommands: boolean
  enabled: boolean
  isCustom?: boolean
}

interface ModesViewProps {
  /** Available modes */
  modes: Mode[]

  /** Currently active mode */
  currentMode?: string

  /** Callback when mode is switched */
  onModeSwitch?: (modeId: string) => void

  /** Callback when mode is created */
  onModeCreate?: (mode: Partial<Mode>) => void

  /** Callback when mode is updated */
  onModeUpdate?: (modeId: string, updates: Partial<Mode>) => void

  /** Callback when mode is deleted */
  onModeDelete?: (modeId: string) => void

  /** Callback to close the view */
  onClose?: () => void
}

export const ModesView: React.FC<ModesViewProps> = ({
  modes,
  currentMode,
  onModeSwitch,
  onModeCreate,
  onModeUpdate,
  onModeDelete,
  onClose,
}) => {
  const [selectedMode, setSelectedMode] = useState<Mode | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [editingMode, setEditingMode] = useState<Mode | null>(null)

  // New mode form state
  const [newModeName, setNewModeName] = useState('')
  const [newModeDescription, setNewModeDescription] = useState('')
  const [newModeRoleDefinition, setNewModeRoleDefinition] = useState('')
  const [newModeWhenToUse, setNewModeWhenToUse] = useState('')
  const [newModeCustomInstructions, setNewModeCustomInstructions] = useState('')

  // Search state
  const [searchQuery, setSearchQuery] = useState('')

  // File input ref for import
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Track unsaved changes
  const unsavedChanges = useUnsavedChanges({
    enabled: isCreating || editingMode !== null,
    message: 'You have unsaved changes to your mode. Are you sure you want to discard them?',
  })

  // Mark as changed when form inputs change
  useEffect(() => {
    if (isCreating && (newModeName || newModeDescription || newModeRoleDefinition || newModeWhenToUse || newModeCustomInstructions)) {
      unsavedChanges.markAsChanged()
    } else if (!isCreating) {
      unsavedChanges.markAsSaved()
    }
  }, [isCreating, newModeName, newModeDescription, newModeRoleDefinition, newModeWhenToUse, newModeCustomInstructions, unsavedChanges])

  useEffect(() => {
    if (editingMode) {
      unsavedChanges.markAsChanged()
    } else if (!isCreating) {
      unsavedChanges.markAsSaved()
    }
  }, [editingMode, isCreating, unsavedChanges])

  const handleCreateMode = () => {
    if (!newModeName.trim()) {
      alert('Please enter a mode name')
      return
    }

    const newMode: Partial<Mode> = {
      id: `custom-${Date.now()}`,
      name: newModeName.trim(),
      description: newModeDescription.trim() || 'Custom mode',
      icon: 'tools',
      roleDefinition: newModeRoleDefinition.trim(),
      whenToUse: newModeWhenToUse.trim(),
      customInstructions: newModeCustomInstructions.trim(),
      canModifyFiles: true,
      canExecuteCommands: true,
      enabled: true,
      isCustom: true,
    }

    if (onModeCreate) {
      onModeCreate(newMode)
    }

    // Reset form
    setNewModeName('')
    setNewModeDescription('')
    setNewModeRoleDefinition('')
    setNewModeWhenToUse('')
    setNewModeCustomInstructions('')
    unsavedChanges.markAsSaved()
    setIsCreating(false)
  }

  const handleCancelCreate = () => {
    unsavedChanges.confirmIfUnsaved(() => {
      setNewModeName('')
      setNewModeDescription('')
      setNewModeRoleDefinition('')
      setNewModeWhenToUse('')
      setNewModeCustomInstructions('')
      unsavedChanges.markAsSaved()
      setIsCreating(false)
    })
  }

  const handleUpdateMode = () => {
    if (!editingMode) return

    const updates: Partial<Mode> = {
      name: editingMode.name,
      description: editingMode.description,
      roleDefinition: editingMode.roleDefinition,
      whenToUse: editingMode.whenToUse,
      customInstructions: editingMode.customInstructions,
    }

    if (onModeUpdate) {
      onModeUpdate(editingMode.id, updates)
    }

    unsavedChanges.markAsSaved()
    setEditingMode(null)
  }

  const handleCancelEdit = () => {
    unsavedChanges.confirmIfUnsaved(() => {
      unsavedChanges.markAsSaved()
      setEditingMode(null)
    })
  }

  const handleClose = () => {
    unsavedChanges.confirmIfUnsaved(() => {
      if (onClose) {
        onClose()
      }
    })
  }

  const handleDeleteMode = (modeId: string) => {
    if (window.confirm('Are you sure you want to delete this custom mode?')) {
      if (onModeDelete) {
        onModeDelete(modeId)
      }
      if (selectedMode?.id === modeId) {
        setSelectedMode(null)
      }
    }
  }

  const handleExportMode = (mode: Mode) => {
    try {
      // Create a clean export object (remove id and timestamps)
      const exportData = {
        name: mode.name,
        description: mode.description,
        icon: mode.icon,
        roleDefinition: mode.roleDefinition,
        whenToUse: mode.whenToUse,
        customInstructions: mode.customInstructions,
        canModifyFiles: mode.canModifyFiles,
        canExecuteCommands: mode.canExecuteCommands,
        version: '1.0',
        exportedAt: new Date().toISOString(),
      }

      // Convert to JSON
      const json = JSON.stringify(exportData, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)

      // Trigger download
      const a = document.createElement('a')
      a.href = url
      a.download = `${mode.name.replace(/\s+/g, '-').toLowerCase()}-mode.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export mode:', error)
      alert('Failed to export mode. Please try again.')
    }
  }

  const handleExportAllModes = () => {
    try {
      const customModesData = customModes.map(mode => ({
        name: mode.name,
        description: mode.description,
        icon: mode.icon,
        roleDefinition: mode.roleDefinition,
        whenToUse: mode.whenToUse,
        customInstructions: mode.customInstructions,
        canModifyFiles: mode.canModifyFiles,
        canExecuteCommands: mode.canExecuteCommands,
      }))

      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        modes: customModesData,
      }

      const json = JSON.stringify(exportData, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `custom-modes-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export modes:', error)
      alert('Failed to export modes. Please try again.')
    }
  }

  const handleImportMode = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      // Validate single mode import
      if (data.name && typeof data.name === 'string') {
        const importedMode: Partial<Mode> = {
          id: `custom-${Date.now()}`,
          name: data.name,
          description: data.description || 'Imported mode',
          icon: data.icon || 'tools',
          roleDefinition: data.roleDefinition,
          whenToUse: data.whenToUse,
          customInstructions: data.customInstructions,
          canModifyFiles: data.canModifyFiles !== false,
          canExecuteCommands: data.canExecuteCommands !== false,
          enabled: true,
          isCustom: true,
        }

        if (onModeCreate) {
          onModeCreate(importedMode)
          alert(`Successfully imported mode: ${importedMode.name}`)
        }
      }
      // Validate multi-mode import
      else if (data.modes && Array.isArray(data.modes)) {
        let importedCount = 0
        for (const modeData of data.modes) {
          if (modeData.name) {
            const importedMode: Partial<Mode> = {
              id: `custom-${Date.now()}-${importedCount}`,
              name: modeData.name,
              description: modeData.description || 'Imported mode',
              icon: modeData.icon || 'tools',
              roleDefinition: modeData.roleDefinition,
              whenToUse: modeData.whenToUse,
              customInstructions: modeData.customInstructions,
              canModifyFiles: modeData.canModifyFiles !== false,
              canExecuteCommands: modeData.canExecuteCommands !== false,
              enabled: true,
              isCustom: true,
            }

            if (onModeCreate) {
              onModeCreate(importedMode)
              importedCount++
            }
          }
        }
        alert(`Successfully imported ${importedCount} mode(s)`)
      } else {
        throw new Error('Invalid mode format')
      }
    } catch (error) {
      console.error('Failed to import mode:', error)
      alert('Failed to import mode. Please ensure the file is a valid mode export.')
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const customModes = modes.filter(m => m.isCustom)
  const builtInModes = modes.filter(m => !m.isCustom)

  // Fuzzy search filtering
  const filteredBuiltInModes = useMemo(() => {
    if (!searchQuery.trim()) {
      return builtInModes
    }
    const results = fuzzySearchMultiField(
      searchQuery,
      builtInModes,
      (mode) => [mode.name, mode.description, mode.roleDefinition || '', mode.whenToUse || ''],
      { threshold: 0 }
    )
    return results.map(r => r.item)
  }, [builtInModes, searchQuery])

  const filteredCustomModes = useMemo(() => {
    if (!searchQuery.trim()) {
      return customModes
    }
    const results = fuzzySearchMultiField(
      searchQuery,
      customModes,
      (mode) => [mode.name, mode.description, mode.roleDefinition || '', mode.whenToUse || ''],
      { threshold: 0 }
    )
    return results.map(r => r.item)
  }, [customModes, searchQuery])

  return (
    <div className="modes-view">
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      <div className="modes-view-header">
        <h2>Modes Management</h2>
        <div className="modes-view-header-actions">
          <button
            className="modes-header-button"
            onClick={handleImportMode}
            title="Import mode from JSON file"
          >
            <span className="codicon codicon-cloud-upload" />
          </button>
          {customModes.length > 0 && (
            <button
              className="modes-header-button"
              onClick={handleExportAllModes}
              title="Export all custom modes"
            >
              <span className="codicon codicon-cloud-download" />
            </button>
          )}
          <button className="modes-view-close" onClick={handleClose}>
            <span className="codicon codicon-close" />
          </button>
        </div>
      </div>

      <div className="modes-view-content">
        {/* Sidebar: Mode List */}
        <div className="modes-sidebar">
          {/* Search input */}
          <div className="modes-search">
            <VSCodeTextField
              value={searchQuery}
              onInput={(e: any) => setSearchQuery(e.target.value)}
              placeholder="Search modes..."
              style={{ width: '100%' }}
            >
              <span slot="start" className="codicon codicon-search" />
            </VSCodeTextField>
          </div>

          <div className="modes-section">
            <h3>Built-in Modes</h3>
            <div className="modes-list">
              {filteredBuiltInModes.length === 0 && searchQuery.trim() ? (
                <div className="modes-empty">No matching modes</div>
              ) : (
                filteredBuiltInModes.map(mode => (
                  <div
                    key={mode.id}
                    className={`mode-item ${selectedMode?.id === mode.id ? 'selected' : ''} ${currentMode === mode.id ? 'active' : ''}`}
                    onClick={() => setSelectedMode(mode)}
                  >
                    <span className={`codicon codicon-${mode.icon} mode-item-icon`} />
                    <span className="mode-item-name">{mode.name}</span>
                    {currentMode === mode.id && <span className="mode-item-badge">Active</span>}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="modes-section">
            <div className="modes-section-header">
              <h3>Custom Modes</h3>
              <button
                className="modes-create-button"
                onClick={() => {
                  setIsCreating(true)
                  setSelectedMode(null)
                }}
              >
                <span className="codicon codicon-add" />
              </button>
            </div>
            <div className="modes-list">
              {customModes.length === 0 ? (
                <div className="modes-empty">No custom modes yet</div>
              ) : filteredCustomModes.length === 0 && searchQuery.trim() ? (
                <div className="modes-empty">No matching modes</div>
              ) : (
                filteredCustomModes.map(mode => (
                  <div
                    key={mode.id}
                    className={`mode-item ${selectedMode?.id === mode.id ? 'selected' : ''} ${currentMode === mode.id ? 'active' : ''}`}
                    onClick={() => setSelectedMode(mode)}
                  >
                    <span className={`codicon codicon-${mode.icon} mode-item-icon`} />
                    <span className="mode-item-name">{mode.name}</span>
                    {currentMode === mode.id && <span className="mode-item-badge">Active</span>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Main Content: Mode Details or Create Form */}
        <div className="modes-main">
          {isCreating ? (
            // Create Mode Form
            <div className="modes-form">
              <h3>Create Custom Mode</h3>

              <div className="modes-form-field">
                <label>Mode Name *</label>
                <VSCodeTextField
                  value={newModeName}
                  onInput={(e: any) => setNewModeName(e.target.value)}
                  placeholder="e.g., Code Reviewer, API Designer"
                />
              </div>

              <div className="modes-form-field">
                <label>Description</label>
                <VSCodeTextArea
                  value={newModeDescription}
                  onInput={(e: any) => setNewModeDescription(e.target.value)}
                  placeholder="Brief description of what this mode does"
                  rows={2}
                />
              </div>

              <div className="modes-form-field">
                <label>Role Definition</label>
                <VSCodeTextArea
                  value={newModeRoleDefinition}
                  onInput={(e: any) => setNewModeRoleDefinition(e.target.value)}
                  placeholder="Define the AI's role and expertise in this mode"
                  rows={4}
                />
              </div>

              <div className="modes-form-field">
                <label>When to Use</label>
                <VSCodeTextArea
                  value={newModeWhenToUse}
                  onInput={(e: any) => setNewModeWhenToUse(e.target.value)}
                  placeholder="When should this mode be used?"
                  rows={3}
                />
              </div>

              <div className="modes-form-field">
                <label>Custom Instructions</label>
                <VSCodeTextArea
                  value={newModeCustomInstructions}
                  onInput={(e: any) => setNewModeCustomInstructions(e.target.value)}
                  placeholder="Additional instructions for the AI in this mode"
                  rows={4}
                />
              </div>

              <div className="modes-form-actions">
                <VSCodeButton appearance="secondary" onClick={handleCancelCreate}>
                  Cancel
                </VSCodeButton>
                <VSCodeButton onClick={handleCreateMode}>
                  Create Mode
                </VSCodeButton>
              </div>
            </div>
          ) : editingMode ? (
            // Edit Mode Form
            <div className="modes-form">
              <h3>Edit Mode: {editingMode.name}</h3>

              <div className="modes-form-field">
                <label>Mode Name</label>
                <VSCodeTextField
                  value={editingMode.name}
                  onInput={(e: any) => setEditingMode({ ...editingMode, name: e.target.value })}
                />
              </div>

              <div className="modes-form-field">
                <label>Description</label>
                <VSCodeTextArea
                  value={editingMode.description}
                  onInput={(e: any) => setEditingMode({ ...editingMode, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="modes-form-field">
                <label>Role Definition</label>
                <VSCodeTextArea
                  value={editingMode.roleDefinition || ''}
                  onInput={(e: any) => setEditingMode({ ...editingMode, roleDefinition: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="modes-form-field">
                <label>When to Use</label>
                <VSCodeTextArea
                  value={editingMode.whenToUse || ''}
                  onInput={(e: any) => setEditingMode({ ...editingMode, whenToUse: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="modes-form-field">
                <label>Custom Instructions</label>
                <VSCodeTextArea
                  value={editingMode.customInstructions || ''}
                  onInput={(e: any) => setEditingMode({ ...editingMode, customInstructions: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="modes-form-actions">
                <VSCodeButton appearance="secondary" onClick={handleCancelEdit}>
                  Cancel
                </VSCodeButton>
                <VSCodeButton onClick={handleUpdateMode}>
                  Save Changes
                </VSCodeButton>
              </div>
            </div>
          ) : selectedMode ? (
            // Mode Details
            <div className="modes-details">
              <div className="modes-details-header">
                <div className="modes-details-title">
                  <span className={`codicon codicon-${selectedMode.icon} modes-details-icon`} />
                  <h3>{selectedMode.name}</h3>
                </div>
                <div className="modes-details-actions">
                  {onModeSwitch && currentMode !== selectedMode.id && (
                    <VSCodeButton onClick={() => onModeSwitch(selectedMode.id)}>
                      Switch to This Mode
                    </VSCodeButton>
                  )}
                  {selectedMode.isCustom && (
                    <>
                      <VSCodeButton
                        appearance="secondary"
                        onClick={() => handleExportMode(selectedMode)}
                        title="Export this mode"
                      >
                        Export
                      </VSCodeButton>
                      <VSCodeButton
                        appearance="secondary"
                        onClick={() => setEditingMode(selectedMode)}
                      >
                        Edit
                      </VSCodeButton>
                      <VSCodeButton
                        appearance="secondary"
                        onClick={() => handleDeleteMode(selectedMode.id)}
                      >
                        Delete
                      </VSCodeButton>
                    </>
                  )}
                </div>
              </div>

              <div className="modes-details-content">
                <div className="modes-details-section">
                  <h4>Description</h4>
                  <p>{selectedMode.description}</p>
                </div>

                {selectedMode.roleDefinition && (
                  <div className="modes-details-section">
                    <h4>Role Definition</h4>
                    <p>{selectedMode.roleDefinition}</p>
                  </div>
                )}

                {selectedMode.whenToUse && (
                  <div className="modes-details-section">
                    <h4>When to Use</h4>
                    <p>{selectedMode.whenToUse}</p>
                  </div>
                )}

                {selectedMode.customInstructions && (
                  <div className="modes-details-section">
                    <h4>Custom Instructions</h4>
                    <p>{selectedMode.customInstructions}</p>
                  </div>
                )}

                <div className="modes-details-section">
                  <h4>Capabilities</h4>
                  <div className="modes-capabilities">
                    <div className={`modes-capability ${selectedMode.canModifyFiles ? 'enabled' : 'disabled'}`}>
                      <span className={`codicon codicon-${selectedMode.canModifyFiles ? 'check' : 'close'}`} />
                      <span>Edit files</span>
                    </div>
                    <div className={`modes-capability ${selectedMode.canExecuteCommands ? 'enabled' : 'disabled'}`}>
                      <span className={`codicon codicon-${selectedMode.canExecuteCommands ? 'check' : 'close'}`} />
                      <span>Run commands</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // No selection
            <div className="modes-no-selection">
              <span className="codicon codicon-info modes-no-selection-icon" />
              <p>Select a mode to view details or create a new custom mode</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
