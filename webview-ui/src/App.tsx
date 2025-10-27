/**
 * App Component - Roo-Code Exact Interface Pattern
 *
 * EXACT Roo Code architecture:
 * - ChatView ALWAYS rendered (hidden when overlays active)
 * - History/Settings as full-screen overlays (not tabs)
 * - Single view - no top navigation tabs
 * - Bottom action bar handles navigation
 * - Single backend: https://oropendola.ai
 *
 * Pattern from Roo Code:
 * - tab state controls which overlay is shown
 * - ChatView never unmounts (preserves state)
 * - Overlays mount on top when tab !== 'chat'
 */

import React, { useState, useCallback } from 'react'
import { ChatProvider, useChatContext } from './context/ChatContext'
import { ChatView } from './components/Chat/ChatView'
import { HistoryView } from './components/History/HistoryView'
import { SettingsView } from './components/Settings/SettingsView'
import './AppIntegrated.css'

// Tab type matching Roo Code pattern - only chat, history, settings for now
type Tab = 'chat' | 'history' | 'settings'

/**
 * Main interface - Roo Code pattern
 * ChatView always rendered, overlays conditionally shown
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

  // Tab state - Roo Code pattern
  const [tab, setTab] = useState<Tab>('chat')

  // Switch tab with callback - like Roo Code
  const switchTab = useCallback((newTab: Tab) => {
    setTab(newTab)
  }, [])

  return (
    <div className="app-container">
      {/* Error banner */}
      {error && (
        <div className="error-banner">
          <span className="error-banner-message">{error}</span>
          <button className="error-banner-close" onClick={clearError}>
            ✕
          </button>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && messages.length === 0 && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <p>Connecting to Oropendola AI...</p>
        </div>
      )}

      {/* Roo Code pattern: Overlays mount conditionally */}
      {tab === 'history' && (
        <HistoryView onDone={() => switchTab('chat')} />
      )}
      {tab === 'settings' && (
        <SettingsView onDone={() => switchTab('chat')} />
      )}

      {/* ChatView ALWAYS rendered - hidden when overlays active */}
      <ChatView
        isHidden={tab !== 'chat'}
        messages={messages}
        taskMessage={taskMessage || undefined}
        todos={todos}
        isLoading={isLoading}
        autoApprovalEnabled={autoApprovalEnabled}
        autoApproveToggles={autoApproveToggles}
        onSendMessage={sendMessage}
        onApproveMessage={approveMessage}
        onRejectMessage={rejectMessage}
        onAutoApprovalEnabledChange={setAutoApprovalEnabled}
        onAutoApproveToggleChange={setAutoApproveToggle}
        onOpenHistory={() => switchTab('history')}
        onOpenSettings={() => switchTab('settings')}
      />
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
