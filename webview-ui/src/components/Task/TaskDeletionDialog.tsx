import React, { useState, useEffect } from 'react'
import { VSCodeButton, VSCodeCheckbox } from '@vscode/webview-ui-toolkit/react'
import type { Task } from '../../types/task'
import './TaskDeletionDialog.css'

export interface TaskDeletionDialogProps {
  isOpen: boolean
  task: Task | null
  onClose: () => void
  onConfirm?: (taskId: string, permanent: boolean) => void
}

/**
 * TaskDeletionDialog Component
 *
 * Confirmation dialog for deleting tasks.
 * Provides option for permanent deletion (cannot be undone).
 * Shows task details to confirm correct task is being deleted.
 */
export const TaskDeletionDialog: React.FC<TaskDeletionDialogProps> = ({
  isOpen,
  task,
  onClose,
  onConfirm
}) => {
  const [permanent, setPermanent] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setPermanent(false)
      setIsDeleting(false)
      setConfirmText('')
    }
  }, [isOpen])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose()
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        handleDelete()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, permanent, confirmText, isDeleting])

  const handleDelete = () => {
    if (!task || isDeleting) return

    // Require confirmation text for permanent deletion
    if (permanent && confirmText.toLowerCase() !== 'delete') {
      return
    }

    setIsDeleting(true)

    // Send message to extension
    window.vscode.postMessage({
      type: 'deleteTask',
      taskId: task.id,
      permanent
    })

    // Call optional callback
    if (onConfirm) {
      onConfirm(task.id, permanent)
    }

    // Close after short delay
    setTimeout(() => {
      onClose()
      setIsDeleting(false)
    }, 100)
  }

  const handleCancel = () => {
    if (!isDeleting) {
      onClose()
    }
  }

  if (!isOpen || !task) return null

  // Check if permanent deletion is confirmed
  const canDelete = !permanent || confirmText.toLowerCase() === 'delete'

  return (
    <>
      {/* Backdrop */}
      <div className="task-deletion-backdrop" onClick={handleCancel} />

      {/* Dialog */}
      <div className="task-deletion-dialog">
        <div className="task-deletion-header">
          <div className="task-deletion-icon">
            <span className="codicon codicon-warning"></span>
          </div>
          <h2>Delete Task?</h2>
        </div>

        <div className="task-deletion-content">
          {/* Task Preview */}
          <div className="task-deletion-preview">
            <div className="task-deletion-preview-label">Task to delete:</div>
            <div className="task-deletion-preview-text">
              {task.text || `Task ${new Date(task.createdAt).toLocaleString()}`}
            </div>
            <div className="task-deletion-preview-meta">
              <span>
                <span className="codicon codicon-calendar"></span>
                Created {new Date(task.createdAt).toLocaleDateString()}
              </span>
              <span>
                <span className="codicon codicon-comment"></span>
                {task.messages.length} messages
              </span>
              <span>
                <span className="codicon codicon-symbol-misc"></span>
                Status: {task.status}
              </span>
            </div>
          </div>

          {/* Warning message */}
          <div className="task-deletion-warning">
            <span className="codicon codicon-info"></span>
            <span>
              This will remove the task from your task list.
              {!permanent && ' You may be able to recover it from backups.'}
            </span>
          </div>

          {/* Permanent deletion option */}
          <div className="task-deletion-option">
            <VSCodeCheckbox
              checked={permanent}
              onChange={(e: any) => setPermanent(e.target.checked)}
              disabled={isDeleting}
            >
              Permanently delete (cannot be undone)
            </VSCodeCheckbox>
          </div>

          {/* Confirmation input for permanent deletion */}
          {permanent && (
            <div className="task-deletion-confirm">
              <label htmlFor="delete-confirm-input">
                Type <strong>delete</strong> to confirm permanent deletion:
              </label>
              <input
                id="delete-confirm-input"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="delete"
                disabled={isDeleting}
                autoComplete="off"
                className="task-deletion-confirm-input"
              />
            </div>
          )}
        </div>

        <div className="task-deletion-footer">
          <VSCodeButton
            appearance="secondary"
            onClick={handleCancel}
            disabled={isDeleting}
          >
            Cancel
          </VSCodeButton>
          <VSCodeButton
            appearance="primary"
            onClick={handleDelete}
            disabled={isDeleting || !canDelete}
            className="task-deletion-delete-btn"
          >
            {isDeleting ? (
              <>
                <span className="codicon codicon-loading codicon-modifier-spin"></span>
                Deleting...
              </>
            ) : (
              <>
                <span className="codicon codicon-trash"></span>
                {permanent ? 'Permanently Delete' : 'Delete'}
              </>
            )}
          </VSCodeButton>
        </div>

        {/* Keyboard hint */}
        <div className="task-deletion-keyboard-hint">
          <kbd>ESC</kbd> to cancel
          {canDelete && (
            <>
              {' • '}
              <kbd>⌘</kbd>+<kbd>Enter</kbd> to delete
            </>
          )}
        </div>
      </div>
    </>
  )
}

/**
 * Simplified deletion confirmation (no permanent option)
 */
export const TaskDeletionConfirm: React.FC<{
  isOpen: boolean
  taskName: string
  onClose: () => void
  onConfirm: () => void
}> = ({ isOpen, taskName, onClose, onConfirm }) => {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = () => {
    setIsDeleting(true)
    onConfirm()
    setTimeout(() => {
      onClose()
      setIsDeleting(false)
    }, 100)
  }

  if (!isOpen) return null

  return (
    <>
      <div className="task-deletion-backdrop" onClick={onClose} />
      <div className="task-deletion-dialog task-deletion-simple">
        <div className="task-deletion-header">
          <h3>Delete "{taskName}"?</h3>
        </div>
        <div className="task-deletion-content">
          <p>This action cannot be undone.</p>
        </div>
        <div className="task-deletion-footer">
          <VSCodeButton appearance="secondary" onClick={onClose} disabled={isDeleting}>
            Cancel
          </VSCodeButton>
          <VSCodeButton appearance="primary" onClick={handleDelete} disabled={isDeleting}>
            Delete
          </VSCodeButton>
        </div>
      </div>
    </>
  )
}
