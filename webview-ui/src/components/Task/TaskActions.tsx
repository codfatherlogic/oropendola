/**
 * Task Actions Component
 * Action buttons for task management (Share, Delete, Export, etc.)
 * Simplified for Phase 1
 */

import React from 'react'

export interface TaskActionsProps {
  onShare?: () => void
  onDelete?: () => void
  onExport?: () => void
  buttonsDisabled?: boolean
}

export const TaskActions: React.FC<TaskActionsProps> = ({
  onShare,
  onDelete,
  onExport,
  buttonsDisabled = false,
}) => {
  return (
    <div className="flex items-center gap-2 pt-2">
      {onShare && (
        <button
          onClick={onShare}
          disabled={buttonsDisabled}
          className="px-3 py-1.5 text-xs bg-vscode-button-background text-vscode-button-foreground rounded hover:bg-vscode-button-hoverBackground disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Share
        </button>
      )}

      {onDelete && (
        <button
          onClick={onDelete}
          disabled={buttonsDisabled}
          className="px-3 py-1.5 text-xs bg-vscode-button-secondaryBackground text-vscode-button-secondaryForeground border border-vscode-panel-border rounded hover:bg-vscode-button-secondaryHoverBackground disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Delete
        </button>
      )}

      {onExport && (
        <button
          onClick={onExport}
          disabled={buttonsDisabled}
          className="px-3 py-1.5 text-xs bg-vscode-button-secondaryBackground text-vscode-button-secondaryForeground border border-vscode-panel-border rounded hover:bg-vscode-button-secondaryHoverBackground disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Export
        </button>
      )}
    </div>
  )
}

export default TaskActions
