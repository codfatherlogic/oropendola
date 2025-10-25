/**
 * App Component - Integrated Roo-Code Style Interface
 *
 * Complete Roo-Code UI with ChatView, TaskHeader, auto-approval, and SSE streaming.
 * Communicates directly with backend at https://oropendola.ai
 *
 * Now includes Navigation between Chat and History views (Sprint 1-2 Task Persistence)
 */

import React, { useState, useEffect, useMemo } from 'react'
import { ChatProvider, useChatContext } from './context/ChatContext'
import { ChatView } from './components/Chat/ChatView'
import { HistoryView } from './components/History/HistoryView'
import { TerminalView } from './components/Terminal/TerminalView'
import { BrowserView } from './components/Browser/BrowserView'
import { MarketplaceView } from './components/Marketplace/MarketplaceView'
import { VectorView } from './components/Vector/VectorView'
import { SettingsView } from './components/Settings/SettingsView'
import { ViewNavigation, ViewType } from './components/Navigation/ViewNavigation'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import vscode from './vscode-api'
import './AppIntegrated.css'

/**
 * Main interface with navigation between Chat and History views
 * Sprint 1-2: Added view switching for Task Persistence feature
 */
const ChatInterface: React.FC = () => {
  const {
    messages,
    taskMessage,
    todos,
    isLoading,
    error,
    autoApprovalEnabled,
    autoApproveToggles,
    sendMessage,
    approveMessage,
    rejectMessage,
    setAutoApprovalEnabled,
    setAutoApproveToggle,
    clearError,
  } = useChatContext()

  // View state management - Sprint 1-2: Navigation between Chat and History
  const [currentView, setCurrentView] = useState<ViewType>('chat')

  // Task statistics for badge
  const [taskStats, setTaskStats] = useState<{ total: number }>({ total: 0 })

  // Request task stats on mount
  useEffect(() => {
    // Request stats from extension
    vscode.postMessage({ type: 'getTaskStats' })

    // Listen for stats response
    const handleMessage = (event: MessageEvent) => {
      const message = event.data
      if (message.type === 'taskStats') {
        setTaskStats(message.stats)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Keyboard shortcuts for view switching
  const shortcuts = useMemo(() => [
    {
      key: '1',
      ctrl: true,
      description: 'Switch to Chat view',
      handler: () => setCurrentView('chat')
    },
    {
      key: '2',
      ctrl: true,
      description: 'Switch to History view',
      handler: () => setCurrentView('history')
    },
    {
      key: '3',
      ctrl: true,
      description: 'Switch to Terminal view',
      handler: () => setCurrentView('terminal')
    },
    {
      key: '4',
      ctrl: true,
      description: 'Switch to Browser view',
      handler: () => setCurrentView('browser')
    },
    {
      key: '5',
      ctrl: true,
      description: 'Switch to Marketplace view',
      handler: () => setCurrentView('marketplace')
    },
    {
      key: '6',
      ctrl: true,
      description: 'Switch to Vector view',
      handler: () => setCurrentView('vector')
    },
    {
      key: '7',
      ctrl: true,
      description: 'Switch to Settings view',
      handler: () => setCurrentView('settings')
    },
    {
      key: 'h',
      ctrl: true,
      shift: true,
      description: 'Toggle between Chat and History',
      handler: () => setCurrentView(prev => prev === 'chat' ? 'history' : 'chat')
    }
  ], [])

  useKeyboardShortcuts(shortcuts)

  return (
    <div className="app-container">
      {/* Navigation tabs - Sprint 1-2 */}
      <ViewNavigation
        currentView={currentView}
        onViewChange={setCurrentView}
        taskCount={taskStats.total}
      />

      {/* Error banner */}
      {error && (
        <div className="error-banner">
          <span className="error-banner-message">{error}</span>
          <button className="error-banner-close" onClick={clearError}>
            ✕
          </button>
        </div>
      )}

      {/* Loading overlay (only for chat view) */}
      {isLoading && messages.length === 0 && currentView === 'chat' && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <p>Connecting to Oropendola AI...</p>
        </div>
      )}

      {/* View switcher - Sprint 1-2 + Week 6 + Week 7 */}
      <div className="view-container">
        {currentView === 'chat' && (
          /* Chat view */
          <ChatView
            messages={messages}
            taskMessage={taskMessage || undefined}
            todos={todos}
            autoApprovalEnabled={autoApprovalEnabled}
            autoApproveToggles={autoApproveToggles}
            onSendMessage={sendMessage}
            onApproveMessage={approveMessage}
            onRejectMessage={rejectMessage}
            onAutoApprovalEnabledChange={setAutoApprovalEnabled}
            onAutoApproveToggleChange={setAutoApproveToggle}
          />
        )}
        {currentView === 'history' && (
          /* History view - Sprint 1-2: Task Persistence */
          <HistoryView />
        )}
        {currentView === 'terminal' && (
          /* Terminal view - Week 7: Enhanced Terminal */
          <TerminalView />
        )}
        {currentView === 'browser' && (
          /* Browser view - Week 6: Browser Automation */
          <BrowserView />
        )}
        {currentView === 'marketplace' && (
          /* Marketplace view - Week 8: Extension Marketplace */
          <MarketplaceView />
        )}
        {currentView === 'vector' && (
          /* Vector view - Week 8: Semantic Search */
          <VectorView />
        )}
        {currentView === 'settings' && (
          /* Settings view - I18n & App Settings */
          <SettingsView />
        )}
      </div>
    </div>
  )
}

/**
 * App root component with providers
 */
const App: React.FC = () => {
  return (
    <ChatProvider>
      <ChatInterface />
    </ChatProvider>
  )
}

export default App
