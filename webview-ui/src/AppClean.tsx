/**
 * App Component - Clean Roo Code-Style Interface
 * 
 * Single-view chat interface with:
 * - Clean main chat area (no tabs at top)
 * - Bottom action bar for view switching
 * - Settings as overlay/modal
 * - History preview inline (3 tasks) + full view overlay
 */

import React, { useState, useEffect } from 'react'
import { ChatProvider, useChatContext } from './context/ChatContext'
import { ChatView } from './components/Chat/ChatView'
import { HistoryOverlay } from './components/History/HistoryOverlay'
import { SettingsOverlay } from './components/Settings/SettingsOverlay'
import { ActionBar } from './components/Navigation/ActionBar'
import vscode from './vscode-api'
import './AppIntegrated.css'
import './styles/RooClean.css'

/**
 * Main chat interface - Roo Code style
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

  // Overlay states
  const [showHistory, setShowHistory] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Task statistics
  const [taskStats, setTaskStats] = useState<{ total: number }>({ total: 0 })

  // Listen for messages from extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data
      
      switch (message.type) {
        case 'taskStats':
          setTaskStats(message.stats)
          break
        case 'openSettings':
          setShowSettings(true)
          break
        case 'openHistory':
          setShowHistory(true)
          break
      }
    }

    window.addEventListener('message', handleMessage)
    
    // Request initial stats
    vscode.postMessage({ type: 'getTaskStats' })
    
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return (
    <div className="roo-clean-container">
      {/* Error banner */}
      {error && (
        <div className="roo-error-banner">
          <span className="roo-error-message">{error}</span>
          <button 
            className="roo-error-close" 
            onClick={clearError}
            aria-label="Close error"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main chat view - single focus area */}
      <div className="roo-main-content">
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
      </div>

      {/* Bottom action bar - Roo Code style */}
      <ActionBar
        taskCount={taskStats.total}
        onHistoryClick={() => setShowHistory(true)}
        onSettingsClick={() => setShowSettings(true)}
      />

      {/* History overlay - slides over main view */}
      {showHistory && (
        <HistoryOverlay 
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* Settings overlay - slides over main view */}
      {showSettings && (
        <SettingsOverlay 
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Loading indicator */}
      {isLoading && messages.length === 0 && (
        <div className="roo-loading-overlay">
          <div className="roo-loading-spinner" />
          <p>Connecting to Oropendola AI...</p>
        </div>
      )}
    </div>
  )
}

/**
 * App root with providers
 */
const App: React.FC = () => {
  return (
    <ChatProvider>
      <ChatInterface />
    </ChatProvider>
  )
}

export default App
