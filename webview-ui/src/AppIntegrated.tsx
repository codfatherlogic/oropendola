/**
 * App Component - Integrated Roo-Code Style Interface
 *
 * This is the new integrated version using ChatView and ChatProvider.
 * To enable, rename this file to App.tsx and rename the old App.tsx to AppOld.tsx
 */

import React from 'react'
import { ChatProvider, useChatContext } from './context/ChatContext'
import { ChatView } from './components/Chat/ChatView'
import './AppIntegrated.css'

/**
 * Main chat interface using the integrated ChatView
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

      {/* Main chat view */}
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
  )
}

/**
 * App root component with providers
 */
const AppIntegrated: React.FC = () => {
  return (
    <ChatProvider>
      <ChatInterface />
    </ChatProvider>
  )
}

export default AppIntegrated
