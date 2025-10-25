/**
 * ViewNavigation Component
 *
 * Navigation tabs for switching between Chat and History views
 * Roo-Code inspired design with smooth transitions
 */

import React from 'react'
import './ViewNavigation.css'

export type ViewType = 'chat' | 'history' | 'terminal' | 'browser' | 'marketplace' | 'vector' | 'settings'

interface ViewNavigationProps {
  currentView: ViewType
  onViewChange: (view: ViewType) => void
  taskCount?: number
}

export const ViewNavigation: React.FC<ViewNavigationProps> = ({
  currentView,
  onViewChange,
  taskCount = 0
}) => {
  return (
    <nav className="view-navigation">
      <button
        className={`nav-tab ${currentView === 'chat' ? 'active' : ''}`}
        onClick={() => onViewChange('chat')}
        aria-label="Chat View (Ctrl+1)"
        title="Chat View (Ctrl+1)"
      >
        <span className="nav-icon">💬</span>
        <span className="nav-label">Chat</span>
        <span className="nav-shortcut">Ctrl+1</span>
      </button>

      <button
        className={`nav-tab ${currentView === 'history' ? 'active' : ''}`}
        onClick={() => onViewChange('history')}
        aria-label="History View (Ctrl+2)"
        title="History View (Ctrl+2)"
      >
        <span className="nav-icon">📚</span>
        <span className="nav-label">History</span>
        {taskCount > 0 && (
          <span className="task-badge">{taskCount}</span>
        )}
        <span className="nav-shortcut">Ctrl+2</span>
      </button>

      <button
        className={`nav-tab ${currentView === 'terminal' ? 'active' : ''}`}
        onClick={() => onViewChange('terminal')}
        aria-label="Terminal View (Ctrl+3)"
        title="Terminal View (Ctrl+3)"
      >
        <span className="nav-icon">🖥️</span>
        <span className="nav-label">Terminal</span>
        <span className="nav-shortcut">Ctrl+3</span>
      </button>

      <button
        className={`nav-tab ${currentView === 'browser' ? 'active' : ''}`}
        onClick={() => onViewChange('browser')}
        aria-label="Browser View (Ctrl+4)"
        title="Browser View (Ctrl+4)"
      >
        <span className="nav-icon">🌐</span>
        <span className="nav-label">Browser</span>
        <span className="nav-shortcut">Ctrl+4</span>
      </button>

      <button
        className={`nav-tab ${currentView === 'marketplace' ? 'active' : ''}`}
        onClick={() => onViewChange('marketplace')}
        aria-label="Marketplace View (Ctrl+5)"
        title="Marketplace View (Ctrl+5)"
      >
        <span className="nav-icon">🛒</span>
        <span className="nav-label">Market</span>
        <span className="nav-shortcut">Ctrl+5</span>
      </button>

      <button
        className={`nav-tab ${currentView === 'vector' ? 'active' : ''}`}
        onClick={() => onViewChange('vector')}
        aria-label="Vector Search View (Ctrl+6)"
        title="Vector Search View (Ctrl+6)"
      >
        <span className="nav-icon">🔍</span>
        <span className="nav-label">Search</span>
        <span className="nav-shortcut">Ctrl+6</span>
      </button>

      <button
        className={`nav-tab ${currentView === 'settings' ? 'active' : ''}`}
        onClick={() => onViewChange('settings')}
        aria-label="Settings View (Ctrl+7)"
        title="Settings View (Ctrl+7)"
      >
        <span className="nav-icon">⚙️</span>
        <span className="nav-label">Settings</span>
        <span className="nav-shortcut">Ctrl+7</span>
      </button>

      {/* Active indicator */}
      <div
        className="nav-indicator"
        style={{
          transform:
            currentView === 'chat' ? 'translateX(0%)' :
            currentView === 'history' ? 'translateX(100%)' :
            currentView === 'terminal' ? 'translateX(200%)' :
            currentView === 'browser' ? 'translateX(300%)' :
            currentView === 'marketplace' ? 'translateX(400%)' :
            currentView === 'vector' ? 'translateX(500%)' :
            'translateX(600%)',
          width: '14.285%'
        }}
      />
    </nav>
  )
}
