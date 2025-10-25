import React, { useState } from 'react'
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react'
import type { TaskStatus } from '../../types/task'
import './TaskStateControls.css'

export interface TaskStateControlsProps {
  taskId: string
  currentStatus: TaskStatus
  disabled?: boolean
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void
}

/**
 * TaskStateControls Component
 *
 * Provides UI controls for managing task lifecycle states:
 * - Pause/Resume active tasks
 * - Complete tasks
 * - Terminate tasks
 * - Resume completed tasks
 */
export const TaskStateControls: React.FC<TaskStateControlsProps> = ({
  taskId,
  currentStatus,
  disabled = false,
  onStatusChange
}) => {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleStateChange = (newStatus: TaskStatus) => {
    if (isProcessing || disabled) return

    setIsProcessing(true)

    // Send message to extension
    window.vscode.postMessage({
      type: 'setTaskStatus',
      taskId,
      status: newStatus
    })

    // Call optional callback
    if (onStatusChange) {
      onStatusChange(taskId, newStatus)
    }

    // Reset processing state after delay
    setTimeout(() => {
      setIsProcessing(false)
    }, 500)
  }

  const handlePause = () => handleStateChange('terminated')
  const handleResume = () => handleStateChange('active')
  const handleComplete = () => handleStateChange('completed')
  const handleTerminate = () => handleStateChange('terminated')

  const isDisabled = disabled || isProcessing

  // Render different controls based on current status
  switch (currentStatus) {
    case 'active':
      return (
        <div className="task-state-controls">
          <VSCodeButton
            appearance="secondary"
            onClick={handlePause}
            disabled={isDisabled}
            title="Pause task (can be resumed later)"
          >
            <span className="codicon codicon-debug-pause"></span>
            Pause
          </VSCodeButton>

          <VSCodeButton
            appearance="primary"
            onClick={handleComplete}
            disabled={isDisabled}
            title="Mark task as completed"
          >
            <span className="codicon codicon-check"></span>
            Complete
          </VSCodeButton>

          <VSCodeButton
            appearance="secondary"
            onClick={handleTerminate}
            disabled={isDisabled}
            title="Stop and terminate task"
          >
            <span className="codicon codicon-stop"></span>
            Stop
          </VSCodeButton>
        </div>
      )

    case 'completed':
      return (
        <div className="task-state-controls">
          <div className="task-state-badge task-state-completed">
            <span className="codicon codicon-pass-filled"></span>
            Completed
          </div>

          <VSCodeButton
            appearance="secondary"
            onClick={handleResume}
            disabled={isDisabled}
            title="Resume this completed task"
          >
            <span className="codicon codicon-debug-restart"></span>
            Resume
          </VSCodeButton>
        </div>
      )

    case 'failed':
      return (
        <div className="task-state-controls">
          <div className="task-state-badge task-state-failed">
            <span className="codicon codicon-error"></span>
            Failed
          </div>

          <VSCodeButton
            appearance="primary"
            onClick={handleResume}
            disabled={isDisabled}
            title="Retry this failed task"
          >
            <span className="codicon codicon-debug-restart"></span>
            Retry
          </VSCodeButton>
        </div>
      )

    case 'terminated':
      return (
        <div className="task-state-controls">
          <div className="task-state-badge task-state-terminated">
            <span className="codicon codicon-debug-stop"></span>
            Stopped
          </div>

          <VSCodeButton
            appearance="secondary"
            onClick={handleResume}
            disabled={isDisabled}
            title="Resume this stopped task"
          >
            <span className="codicon codicon-debug-continue"></span>
            Resume
          </VSCodeButton>
        </div>
      )

    default:
      return null
  }
}

/**
 * Compact version of TaskStateControls for use in lists/tables
 */
export const TaskStateControlsCompact: React.FC<TaskStateControlsProps> = ({
  taskId,
  currentStatus,
  disabled = false,
  onStatusChange
}) => {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleStateChange = (newStatus: TaskStatus) => {
    if (isProcessing || disabled) return

    setIsProcessing(true)

    window.vscode.postMessage({
      type: 'setTaskStatus',
      taskId,
      status: newStatus
    })

    if (onStatusChange) {
      onStatusChange(taskId, newStatus)
    }

    setTimeout(() => {
      setIsProcessing(false)
    }, 500)
  }

  const isDisabled = disabled || isProcessing

  return (
    <div className="task-state-controls-compact">
      {currentStatus === 'active' && (
        <>
          <VSCodeButton
            appearance="icon"
            onClick={() => handleStateChange('completed')}
            disabled={isDisabled}
            title="Complete"
          >
            <span className="codicon codicon-check"></span>
          </VSCodeButton>
          <VSCodeButton
            appearance="icon"
            onClick={() => handleStateChange('terminated')}
            disabled={isDisabled}
            title="Stop"
          >
            <span className="codicon codicon-stop"></span>
          </VSCodeButton>
        </>
      )}

      {(currentStatus === 'completed' || currentStatus === 'terminated' || currentStatus === 'failed') && (
        <VSCodeButton
          appearance="icon"
          onClick={() => handleStateChange('active')}
          disabled={isDisabled}
          title="Resume"
        >
          <span className="codicon codicon-debug-restart"></span>
        </VSCodeButton>
      )}
    </div>
  )
}

/**
 * Get display name for task status
 */
export function getStatusDisplayName(status: TaskStatus): string {
  switch (status) {
    case 'active':
      return 'Active'
    case 'completed':
      return 'Completed'
    case 'failed':
      return 'Failed'
    case 'terminated':
      return 'Stopped'
    default:
      return status
  }
}

/**
 * Get icon for task status
 */
export function getStatusIcon(status: TaskStatus): string {
  switch (status) {
    case 'active':
      return 'codicon-loading codicon-modifier-spin'
    case 'completed':
      return 'codicon-pass-filled'
    case 'failed':
      return 'codicon-error'
    case 'terminated':
      return 'codicon-debug-stop'
    default:
      return 'codicon-circle-outline'
  }
}

/**
 * Get color class for task status
 */
export function getStatusColorClass(status: TaskStatus): string {
  switch (status) {
    case 'active':
      return 'status-active'
    case 'completed':
      return 'status-completed'
    case 'failed':
      return 'status-failed'
    case 'terminated':
      return 'status-terminated'
    default:
      return ''
  }
}
