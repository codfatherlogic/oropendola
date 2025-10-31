/**
 * CheckpointRestoreDialog Component
 *
 * Dialog shown when editing or deleting messages with available checkpoints.
 * Gives user the option to restore to a previous checkpoint or proceed without restoration.
 */

import React, { useEffect } from 'react'
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react'
import './CheckpointRestoreDialog.css'

export interface CheckpointRestoreDialogProps {
  /** Whether dialog is open */
  open: boolean

  /** Callback to change open state */
  onOpenChange: (open: boolean) => void

  /** Callback when user confirms action */
  onConfirm: (restoreCheckpoint: boolean) => void

  /** Type of action: 'edit' or 'delete' */
  type: 'edit' | 'delete'

  /** Whether a checkpoint is available */
  hasCheckpoint: boolean
}

export const CheckpointRestoreDialog: React.FC<CheckpointRestoreDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  type,
  hasCheckpoint,
}) => {
  const isEdit = type === 'edit'
  const title = isEdit ? 'Edit Message' : 'Delete Message'
  const description = hasCheckpoint
    ? isEdit
      ? 'Editing this message will discard all messages after it. Would you like to restore to a checkpoint?'
      : 'Deleting this message will remove all messages after it. Would you like to restore to a checkpoint?'
    : isEdit
    ? 'Editing this message will discard all messages after it.'
    : 'Deleting this message will remove all messages after it.'

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  if (!open) {
    return null
  }

  const handleConfirmWithRestore = () => {
    onConfirm(true)
    onOpenChange(false)
  }

  const handleConfirmWithoutRestore = () => {
    onConfirm(false)
    onOpenChange(false)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <div className="checkpoint-dialog-overlay" onClick={handleCancel}>
      <div className="checkpoint-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="checkpoint-dialog-header">
          <h2 className="checkpoint-dialog-title">{title}</h2>
        </div>

        <div className="checkpoint-dialog-content">
          <p className="checkpoint-dialog-description">{description}</p>

          {hasCheckpoint && (
            <div className="checkpoint-dialog-info">
              <span className="codicon codicon-info"></span>
              <span>
                A checkpoint is available. Restoring will revert the conversation to the saved state.
              </span>
            </div>
          )}
        </div>

        <div className="checkpoint-dialog-footer">
          <VSCodeButton appearance="secondary" onClick={handleCancel}>
            Cancel
          </VSCodeButton>

          <VSCodeButton onClick={handleConfirmWithoutRestore}>
            {isEdit ? 'Edit Only' : 'Delete Only'}
          </VSCodeButton>

          {hasCheckpoint && (
            <VSCodeButton appearance="primary" onClick={handleConfirmWithRestore}>
              Restore to Checkpoint
            </VSCodeButton>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Export convenience components for backward compatibility
 */
export const EditMessageWithCheckpointDialog: React.FC<Omit<CheckpointRestoreDialogProps, 'type'>> = (
  props
) => <CheckpointRestoreDialog {...props} type="edit" />

export const DeleteMessageWithCheckpointDialog: React.FC<Omit<CheckpointRestoreDialogProps, 'type'>> = (
  props
) => <CheckpointRestoreDialog {...props} type="delete" />
