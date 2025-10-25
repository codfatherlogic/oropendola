import React, { useState } from 'react'
import { VSCodeButton, VSCodeCheckbox } from '@vscode/webview-ui-toolkit/react'
import type { Task } from '../../types/task'
import { getStatusIcon, getStatusColorClass, getStatusDisplayName } from './TaskStateControls'
import { TaskDeletionDialog } from './TaskDeletionDialog'
import './TaskHistoryItem.css'

export interface TaskHistoryItemProps {
  task: Task
  selected: boolean
  onSelect: (selected: boolean) => void
  onLoad?: () => void
  onDelete?: () => void
}

/**
 * TaskHistoryItem Component
 *
 * Displays a single task in the history list.
 * Shows task metadata, status, and quick actions.
 * Supports hover preview and selection.
 */
export const TaskHistoryItem: React.FC<TaskHistoryItemProps> = ({
  task,
  selected,
  onSelect,
  onLoad,
  onDelete
}) => {
  const [showPreview, setShowPreview] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  /**
   * Format date for display
   */
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString()
  }

  /**
   * Format cost for display
   */
  const formatCost = (cost: number): string => {
    if (cost === 0) return '$0.00'
    if (cost < 0.01) return '<$0.01'
    return `$${cost.toFixed(2)}`
  }

  /**
   * Format tokens for display
   */
  const formatTokens = (tokens: number): string => {
    if (tokens < 1000) return tokens.toString()
    if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}K`
    return `${(tokens / 1000000).toFixed(1)}M`
  }

  /**
   * Get task duration
   */
  const getTaskDuration = (): string => {
    if (!task.completedAt) return 'In progress'

    const durationMs = task.completedAt - task.createdAt
    const durationMins = Math.floor(durationMs / 60000)
    const durationHours = Math.floor(durationMs / 3600000)

    if (durationMins < 1) return '<1m'
    if (durationMins < 60) return `${durationMins}m`
    if (durationHours < 24) return `${durationHours}h ${durationMins % 60}m`
    return `${Math.floor(durationHours / 24)}d ${durationHours % 24}h`
  }

  /**
   * Handle load task
   */
  const handleLoad = () => {
    window.vscode.postMessage({
      type: 'loadTask',
      taskId: task.id
    })
    onLoad?.()
  }

  /**
   * Handle delete confirmation
   */
  const handleDeleteConfirm = (taskId: string, permanent: boolean) => {
    window.vscode.postMessage({
      type: 'deleteTask',
      taskId,
      permanent
    })
    setShowDeleteDialog(false)
    onDelete?.()
  }

  /**
   * Handle export
   */
  const handleExport = (format: 'json' | 'txt' | 'md') => {
    window.vscode.postMessage({
      type: 'exportTask',
      taskId: task.id,
      format
    })
  }

  const statusIcon = getStatusIcon(task.status)
  const statusClass = getStatusColorClass(task.status)
  const totalTokens = task.apiMetrics.tokensIn + task.apiMetrics.tokensOut

  return (
    <>
      <div
        className={`task-history-item ${selected ? 'selected' : ''}`}
        onMouseEnter={() => setShowPreview(true)}
        onMouseLeave={() => setShowPreview(false)}
      >
        {/* Selection Checkbox */}
        <div className="task-item-select">
          <VSCodeCheckbox
            checked={selected}
            onChange={(e: any) => onSelect(e.target.checked)}
          />
        </div>

        {/* Main Content */}
        <div className="task-item-content" onClick={handleLoad}>
          {/* Header Row */}
          <div className="task-item-header">
            <div className="task-item-title">
              <span className={`codicon ${statusIcon} ${statusClass}`}></span>
              <span className="task-item-text">
                {task.text || `Task ${new Date(task.createdAt).toLocaleString()}`}
              </span>
            </div>
            <div className="task-item-status">
              <span className={`task-status-badge ${statusClass}`}>
                {getStatusDisplayName(task.status)}
              </span>
            </div>
          </div>

          {/* Metadata Row */}
          <div className="task-item-metadata">
            <div className="task-item-meta">
              <span className="codicon codicon-calendar"></span>
              <span>{formatDate(task.updatedAt)}</span>
            </div>

            {task.completedAt && (
              <div className="task-item-meta">
                <span className="codicon codicon-clock"></span>
                <span>{getTaskDuration()}</span>
              </div>
            )}

            <div className="task-item-meta">
              <span className="codicon codicon-comment"></span>
              <span>{task.messages.length} messages</span>
            </div>

            <div className="task-item-meta">
              <span className="codicon codicon-symbol-misc"></span>
              <span>{formatTokens(totalTokens)} tokens</span>
            </div>

            {task.apiMetrics.totalCost > 0 && (
              <div className="task-item-meta">
                <span className="codicon codicon-credit-card"></span>
                <span>{formatCost(task.apiMetrics.totalCost)}</span>
              </div>
            )}
          </div>

          {/* Preview (on hover) */}
          {showPreview && task.messages.length > 0 && (
            <div className="task-item-preview">
              <div className="task-preview-label">Last message:</div>
              <div className="task-preview-content">
                {task.messages[task.messages.length - 1].text?.substring(0, 200) || '(no text)'}
                {(task.messages[task.messages.length - 1].text?.length || 0) > 200 && '...'}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="task-item-actions">
          <VSCodeButton
            appearance="icon"
            onClick={handleLoad}
            title="Load task"
          >
            <span className="codicon codicon-go-to-file"></span>
          </VSCodeButton>

          <VSCodeButton
            appearance="icon"
            onClick={() => handleExport('json')}
            title="Export as JSON"
          >
            <span className="codicon codicon-export"></span>
          </VSCodeButton>

          <VSCodeButton
            appearance="icon"
            onClick={(e) => {
              e.stopPropagation()
              setShowDeleteDialog(true)
            }}
            title="Delete task"
          >
            <span className="codicon codicon-trash"></span>
          </VSCodeButton>
        </div>
      </div>

      {/* Delete Dialog */}
      <TaskDeletionDialog
        isOpen={showDeleteDialog}
        task={task}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  )
}
