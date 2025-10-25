import React, { useState, useEffect } from 'react'
import { VSCodeButton, VSCodeTextField, VSCodeDropdown, VSCodeOption } from '@vscode/webview-ui-toolkit/react'
import './TaskCreationDialog.css'

export interface TaskCreationDialogProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * TaskCreationDialog Component
 *
 * Modal dialog for creating new tasks with optional name and mode selection.
 * Sends 'createTask' message to extension with task configuration.
 */
export const TaskCreationDialog: React.FC<TaskCreationDialogProps> = ({
  isOpen,
  onClose
}) => {
  const [taskName, setTaskName] = useState('')
  const [mode, setMode] = useState('agent')
  const [isCreating, setIsCreating] = useState(false)

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTaskName('')
      setMode('agent')
      setIsCreating(false)
    }
  }, [isOpen])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        handleCreate()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, taskName, mode])

  const handleCreate = () => {
    if (isCreating) return

    setIsCreating(true)

    // Send message to extension to create task
    window.vscode.postMessage({
      type: 'createTask',
      text: taskName.trim() || undefined, // Use undefined for auto-generated name
      mode: mode
    })

    // Close dialog after short delay
    setTimeout(() => {
      onClose()
      setIsCreating(false)
    }, 100)
  }

  const handleCancel = () => {
    if (!isCreating) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="task-dialog-backdrop" onClick={handleCancel} />

      {/* Dialog */}
      <div className="task-dialog">
        <div className="task-dialog-header">
          <h2>Create New Task</h2>
          <VSCodeButton
            appearance="icon"
            onClick={handleCancel}
            disabled={isCreating}
            aria-label="Close dialog"
          >
            <span className="codicon codicon-close"></span>
          </VSCodeButton>
        </div>

        <div className="task-dialog-content">
          {/* Task Name Input */}
          <div className="task-dialog-field">
            <label htmlFor="task-name-input">
              Task Name
              <span className="task-dialog-optional">(optional)</span>
            </label>
            <VSCodeTextField
              id="task-name-input"
              value={taskName}
              onInput={(e: any) => setTaskName(e.target.value)}
              placeholder="e.g., Implement user authentication"
              disabled={isCreating}
              autoFocus
            />
            <p className="task-dialog-hint">
              Leave blank for auto-generated name with timestamp
            </p>
          </div>

          {/* Mode Selection */}
          <div className="task-dialog-field">
            <label htmlFor="task-mode-select">Mode</label>
            <VSCodeDropdown
              id="task-mode-select"
              value={mode}
              onChange={(e: any) => setMode(e.target.value)}
              disabled={isCreating}
            >
              <VSCodeOption value="agent">Agent Mode</VSCodeOption>
              <VSCodeOption value="architect">Architect Mode</VSCodeOption>
              <VSCodeOption value="code">Code Mode</VSCodeOption>
              <VSCodeOption value="ask">Ask Mode</VSCodeOption>
            </VSCodeDropdown>
            <p className="task-dialog-hint">
              {getModeDescription(mode)}
            </p>
          </div>
        </div>

        <div className="task-dialog-footer">
          <VSCodeButton
            appearance="secondary"
            onClick={handleCancel}
            disabled={isCreating}
          >
            Cancel
          </VSCodeButton>
          <VSCodeButton
            appearance="primary"
            onClick={handleCreate}
            disabled={isCreating}
          >
            {isCreating ? (
              <>
                <span className="codicon codicon-loading codicon-modifier-spin"></span>
                Creating...
              </>
            ) : (
              'Create Task'
            )}
          </VSCodeButton>
        </div>

        {/* Keyboard hint */}
        <div className="task-dialog-keyboard-hint">
          <kbd>ESC</kbd> to cancel • <kbd>⌘</kbd>+<kbd>Enter</kbd> to create
        </div>
      </div>
    </>
  )
}

/**
 * Get description for each mode
 */
function getModeDescription(mode: string): string {
  switch (mode) {
    case 'agent':
      return 'Full autonomous mode with tool access and decision-making'
    case 'architect':
      return 'Planning and design mode without direct code changes'
    case 'code':
      return 'Focused code editing and implementation mode'
    case 'ask':
      return 'Question answering and consultation mode'
    default:
      return 'Select a mode to see description'
  }
}
