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

import React, { useState, useCallback, useEffect } from 'react'
import { ChatProvider, useChatContext } from './context/ChatContext'
import { ChatView } from './components/Chat/ChatView'
import { HistoryView } from './components/History/HistoryView'
import { SettingsView } from './components/Settings/SettingsView'
import { AccountSettings } from './components/Account/AccountSettings'
import { SubscribePrompt } from './components/Auth/SubscribePrompt'
import './AppIntegrated.css'

// Tab type matching Roo Code pattern - chat, history, settings, account
type Tab = 'chat' | 'history' | 'settings' | 'account'

/**
 * Main interface - Roo Code pattern
 * ChatView always rendered, overlays conditionally shown
 * Toolbar buttons in native VS Code Panel Toolbar
 */
const ChatInterface: React.FC = () => {
  const {
    messages,
    taskMessage,
    todos,
    isLoading,
    error,
    isAuthenticated,
    authMessage,
    subscription,
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

  // Determine if we should show subscription prompt
  // Show when: authenticated + (no subscription data OR subscription not active) + on chat tab
  const shouldShowSubscribePrompt =
    isAuthenticated &&
    (subscription === null || !subscription.is_active) &&
    tab === 'chat'

  console.log('🔒 [App] shouldShowSubscribePrompt:', shouldShowSubscribePrompt, {
    isAuthenticated,
    hasSubscription: subscription !== null,
    isActive: subscription?.is_active,
    tab
  })

  // Switch tab with callback - like Roo Code
  const switchTab = useCallback((newTab: Tab) => {
    setTab(newTab)
  }, [])

  // Handle subscription - open pricing page
  const handleSubscribe = useCallback(() => {
    console.log('🔒 [App] Opening pricing page')
    // @ts-ignore - vscode is available in webview
    const vscode = acquireVsCodeApi()
    vscode.postMessage({ type: 'openPricingPage' })
  }, [])

  // Listen for switchTab messages from extension (Panel Toolbar buttons)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data
      if (message.type === 'switchTab') {
        switchTab(message.tab as Tab)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [switchTab])

  return (
    <div className="app-container">
      {/* Panel Toolbar buttons are in native VS Code UI - see package.json view/title menu */}

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
      {tab === 'account' && (
        <AccountSettings
          onDone={() => switchTab('chat')}
          isAuthenticated={isAuthenticated}
        />
      )}

      {/* Subscription gate - show when authenticated but no active subscription */}
      {shouldShowSubscribePrompt && (
        <SubscribePrompt
          subscription={subscription}
          userEmail={null}
          onSubscribe={handleSubscribe}
        />
      )}

      {/* ChatView ALWAYS rendered - hidden when overlays active OR subscription prompt shown */}
      <ChatView
        isHidden={tab !== 'chat' || shouldShowSubscribePrompt}
        messages={messages}
        taskMessage={taskMessage || undefined}
        todos={todos}
        isLoading={isLoading}
        isAuthenticated={isAuthenticated}
        authMessage={authMessage}
        autoApprovalEnabled={autoApprovalEnabled}
        autoApproveToggles={autoApproveToggles}
        onSendMessage={sendMessage}
        onApproveMessage={approveMessage}
        onRejectMessage={rejectMessage}
        onAutoApprovalEnabledChange={setAutoApprovalEnabled}
        onAutoApproveToggleChange={setAutoApproveToggle}
        onOpenAccount={() => switchTab('account')}
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
