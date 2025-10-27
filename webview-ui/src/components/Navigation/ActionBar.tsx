/**
 * ActionBar Component - Roo Code-style Bottom Navigation
 * 
 * Clean bottom bar for switching between views without cluttering the main interface
 */

import React from 'react'
import { Tooltip } from '../ui'
import './ActionBar.css'

interface ActionBarProps {
  taskCount?: number
  onHistoryClick: () => void
  onSettingsClick: () => void
}

export const ActionBar: React.FC<ActionBarProps> = ({
  taskCount = 0,
  onHistoryClick,
  onSettingsClick,
}) => {
  return (
    <div className="action-bar">
      <div className="action-bar-left">
        <Tooltip content="Task History" side="top">
          <button
            className="action-bar-btn"
            onClick={onHistoryClick}
            aria-label="View history"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {taskCount > 0 && (
              <span className="action-bar-badge">{taskCount}</span>
            )}
          </button>
        </Tooltip>
      </div>

      <div className="action-bar-center">
        {/* Reserved for future actions */}
      </div>

      <div className="action-bar-right">
        <Tooltip content="Settings" side="top">
          <button
            className="action-bar-btn"
            onClick={onSettingsClick}
            aria-label="Open settings"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="3" strokeWidth="2"/>
              <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42m12.72-12.72l1.42-1.42" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </Tooltip>
      </div>
    </div>
  )
}
