/**
 * ChatView Component
 *
 * Main container for the chat interface. Manages message display, user input,
 * and message approval workflow.
 *
 * This is a simplified version for Oropendola AI's single backend architecture.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { ClineMessage } from '../../types/cline-message'
import { AutoApproveSetting, AutoApproveToggles } from '../../types/auto-approve'
import { TodoItem } from '../../context/ChatContext'
import { getApiMetrics } from '../../utils/api-metrics'
import { getTaskMetrics, getTotalTokens } from '../../utils/getApiMetrics'
import { processMessagesForDisplay, shouldAutoApprove, isApprovalMessage } from '../../utils/message-combining'
import { SimpleTaskHeader } from './SimpleTaskHeader'
import { RooStyleTextArea } from './RooStyleTextArea'
import { ChatRow } from './ChatRow'
import { TaskMetrics } from './TaskMetrics'
import { ContextWindowProgress } from './ContextWindowProgress'
import { EnhancePromptButton } from './EnhancePromptButton'
import './ChatView.css'
import './SimpleTaskHeader.css'

interface ChatViewProps {
  // Roo Code pattern: isHidden to preserve state when overlays active
  isHidden?: boolean

  // Message data
  messages: ClineMessage[]
  taskMessage?: ClineMessage  // The first message that started the task
  todos?: TodoItem[]

  // Loading state
  isLoading?: boolean

  // Authentication
  isAuthenticated?: boolean
  authMessage?: string | null

  // Auto-approval settings
  autoApprovalEnabled: boolean
  autoApproveToggles: AutoApproveToggles

  // Callbacks
  onSendMessage?: (text: string, images?: string[]) => void
  onApproveMessage?: (messageTs: number) => void
  onRejectMessage?: (messageTs: number) => void
  onAutoApprovalEnabledChange?: (enabled: boolean) => void
  onAutoApproveToggleChange?: (key: AutoApproveSetting, value: boolean) => void
  onCondenseContext?: () => void

  // Navigation callbacks (Roo Code pattern)
  onOpenHistory?: () => void
  onOpenSettings?: () => void
}

export const ChatView: React.FC<ChatViewProps> = ({
  isHidden = false,
  messages,
  taskMessage,
  todos = [],
  isLoading = false,
  isAuthenticated = true,
  authMessage = null,
  autoApprovalEnabled,
  autoApproveToggles,
  onSendMessage,
  onApproveMessage,
  onRejectMessage,
  onAutoApprovalEnabledChange,
  onAutoApproveToggleChange,
  onCondenseContext,
}) => {
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({})
  const [inputValue, setInputValue] = useState('')
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [mode, setMode] = useState('agent')
  const [didClickCancel, setDidClickCancel] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageListRef = useRef<HTMLDivElement>(null)
  const userRespondedRef = useRef(false)

  // Dynamic placeholder based on mode
  const getPlaceholderForMode = (currentMode: string): string => {
    switch (currentMode) {
      case 'agent':
        return 'Type your task here...'
      case 'ask':
        return 'Ask me anything...'
      default:
        return 'Type your task here...'
    }
  }

  const placeholderText = getPlaceholderForMode(mode)

  // Process messages for display (combining, filtering)
  const visibleMessages = processMessagesForDisplay(messages)

  // Detect if AI is currently streaming a response
  const isStreaming = visibleMessages.some(msg => msg.partial === true)

  // Calculate metrics from all messages
  const metrics = getApiMetrics(messages)
  
  // Calculate task-specific metrics (Roo-Code pattern)
  const taskMetrics = getTaskMetrics(messages, taskMessage?.ts)
  const totalTokens = getTotalTokens(taskMetrics)
  const contextLimit = 200000 // Default context window (can be made configurable)

  // Find the last message that needs approval
  const lastApprovalMessage = visibleMessages
    .slice()
    .reverse()
    .find(msg => isApprovalMessage(msg) && !shouldAutoApprove(msg, {
      autoApprovalEnabled,
      ...autoApproveToggles
    }))

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [visibleMessages.length])

  // Reset user response flag when new approval message arrives
  useEffect(() => {
    if (lastApprovalMessage) {
      userRespondedRef.current = false
    }
  }, [lastApprovalMessage?.ts])

  // Auto-approve timeout effect (Roo Code pattern)
  useEffect(() => {
    if (!lastApprovalMessage || userRespondedRef.current) return

    // ✅ FIX: NEVER auto-approve tool actions - they MUST show approve/reject buttons
    if (lastApprovalMessage.ask === 'tool') {
      console.log('🔧 [ChatView] Tool approval message detected - waiting for user response')
      return  // Don't auto-approve tools
    }

    const shouldAutoApproveMessage = shouldAutoApprove(lastApprovalMessage, {
      autoApprovalEnabled,
      ...autoApproveToggles
    })

    if (shouldAutoApproveMessage) {
      const timeoutId = setTimeout(() => {
        if (!userRespondedRef.current && onApproveMessage) {
          onApproveMessage(lastApprovalMessage.ts)
        }
      }, 500) // 500ms delay matches Roo Code

      return () => clearTimeout(timeoutId)
    }
  }, [lastApprovalMessage, autoApprovalEnabled, autoApproveToggles, onApproveMessage])

  // Handle message expand/collapse
  const handleToggleExpand = useCallback((ts: number) => {
    setExpandedRows(prev => ({
      ...prev,
      [ts]: !prev[ts]
    }))
  }, [])

  // Handle send message
  const handleSendMessage = useCallback(() => {
    if ((inputValue.trim() || selectedImages.length > 0) && onSendMessage) {
      onSendMessage(inputValue.trim(), selectedImages)
      setInputValue('')
      setSelectedImages([])
    }
  }, [inputValue, selectedImages, onSendMessage])

  // Handle select images
  const handleSelectImages = useCallback(() => {
    // TODO: Implement image selection dialog
    console.log('Image selection not yet implemented')
  }, [])

  // Handle approve
  const handleApprove = useCallback(() => {
    if (lastApprovalMessage && onApproveMessage) {
      userRespondedRef.current = true
      onApproveMessage(lastApprovalMessage.ts)
    }
  }, [lastApprovalMessage, onApproveMessage])

  // Handle reject
  const handleReject = useCallback(() => {
    if (lastApprovalMessage && onRejectMessage) {
      userRespondedRef.current = true
      onRejectMessage(lastApprovalMessage.ts)
    }
  }, [lastApprovalMessage, onRejectMessage])

  // Handle cancel (during streaming)
  const handleCancel = useCallback(() => {
    if (!didClickCancel) {
      setDidClickCancel(true)
      // Send cancelTask message to extension
      window.postMessage({ type: 'cancelTask' }, '*')
    }
  }, [didClickCancel])

  // Handle terminate (for resume_task)
  const handleTerminate = useCallback(() => {
    if (lastApprovalMessage && onRejectMessage) {
      userRespondedRef.current = true
      onRejectMessage(lastApprovalMessage.ts)
    }
  }, [lastApprovalMessage, onRejectMessage])

  // Determine button text based on message type
  const getButtonText = (message: ClineMessage | undefined): { approve: string, reject: string } => {
    if (!message) return { approve: 'Approve', reject: 'Reject' }

    // Resume task: Resume Task / Terminate
    if (message.ask === 'resume_task') {
      return { approve: 'Resume Task', reject: 'Terminate' }
    }

    if (message.ask === 'command') {
      return { approve: 'Run Command', reject: 'Reject' }
    }

    if (message.ask === 'tool') {
      try {
        const tool = JSON.parse(message.text || '{}')
        
        // Batch file operations - Approve All / Deny All
        if (tool.tool === 'readFile' && tool.batchFiles && Array.isArray(tool.batchFiles) && tool.batchFiles.length > 1) {
          return { approve: 'Approve All', reject: 'Deny All' }
        }
        
        // Batch diff operations - Approve All / Deny All
        if (['editedExistingFile', 'appliedDiff'].includes(tool.tool) && tool.batchDiffs && Array.isArray(tool.batchDiffs) && tool.batchDiffs.length > 1) {
          return { approve: 'Approve All', reject: 'Deny All' }
        }
        
        // Single file operations - Save / Reject
        if (['editedExistingFile', 'newFileCreated', 'appliedDiff'].includes(tool.tool)) {
          return { approve: 'Save', reject: 'Reject' }
        }
      } catch {
        // Fall through to default
      }
    }

    return { approve: 'Approve', reject: 'Reject' }
  }

  const buttonText = getButtonText(lastApprovalMessage)

  // Roo Code pattern: Add className when hidden instead of conditional render
  return (
    <div className={`chat-view ${isHidden ? 'hidden' : ''}`}>
      {/* Header with task info and metrics */}
      {taskMessage && (
        <div className="chat-view-header">
          <SimpleTaskHeader
            task={taskMessage}
            tokensIn={metrics.tokensIn}
            tokensOut={metrics.tokensOut}
            totalCost={metrics.totalCost}
            contextTokens={metrics.contextTokens}
            contextWindow={200000}
            todos={todos}
            onCondenseContext={onCondenseContext}
          />
          
          {/* Task Metrics Display - Roo-Code pattern */}
          {taskMetrics && (
            <div className="chat-view-metrics">
              <TaskMetrics metrics={taskMetrics} />
            </div>
          )}
        </div>
      )}

      {/* Message list */}
      <div className="chat-view-messages" ref={messageListRef}>
        {visibleMessages.length === 0 && !isLoading ? (
          <div className="chat-view-empty">
            <p>Start a conversation with Oropendola AI...</p>
          </div>
        ) : (
          <>
            {visibleMessages.map((message, index) => (
              <ChatRow
                key={message.ts}
                message={message}
                isExpanded={expandedRows[message.ts] || false}
                isLast={index === visibleMessages.length - 1}
                isStreaming={message.partial || false}
                onToggleExpand={handleToggleExpand}
              />
            ))}
            
            {/* AI Thinking Indicator - Shows when waiting for response */}
            {isLoading && (
              <div className="chat-view-thinking-indicator">
                <div className="thinking-icon">
                  <div className="thinking-dot"></div>
                  <div className="thinking-dot"></div>
                  <div className="thinking-dot"></div>
                </div>
                <span className="thinking-text">AI is thinking...</span>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area - Roo-Code style */}
      <div className="chat-view-input">
        {/* Context Window Progress - Roo-Code pattern */}
        <ContextWindowProgress
          used={totalTokens}
          limit={contextLimit}
          className="chat-view-context-progress"
        />
        
        {/* Cancel button during streaming (even without approval message) */}
        {isStreaming && !lastApprovalMessage && (
          <div className="chat-view-approval-buttons">
            <button
              className="chat-view-button chat-view-button-secondary"
              onClick={handleCancel}
              disabled={didClickCancel}
            >
              Cancel
            </button>
          </div>
        )}
        
        {/* Approval buttons if needed */}
        {lastApprovalMessage && (
          <div className="chat-view-approval-buttons">
            <button
              className="chat-view-button chat-view-button-primary"
              onClick={handleApprove}
              disabled={isStreaming}
            >
              {buttonText.approve}
            </button>
            {/* Show Cancel during streaming, Terminate for resume_task, otherwise Reject */}
            {isStreaming ? (
              <button
                className="chat-view-button chat-view-button-secondary"
                onClick={handleCancel}
                disabled={didClickCancel}
              >
                Cancel
              </button>
            ) : lastApprovalMessage.ask === 'resume_task' ? (
              <button
                className="chat-view-button chat-view-button-secondary"
                onClick={handleTerminate}
              >
                {buttonText.reject}
              </button>
            ) : (
              <button
                className="chat-view-button chat-view-button-secondary"
                onClick={handleReject}
              >
                {buttonText.reject}
              </button>
            )}
          </div>
        )}

        {/* Enhance Prompt Button - Roo-Code pattern */}
        <div className="chat-view-input-toolbar">
          <EnhancePromptButton
            prompt={inputValue}
            onEnhanced={setInputValue}
            disabled={!inputValue.trim()}
          />
        </div>

        {/* Roo-Code style text area */}
        <RooStyleTextArea
          inputValue={inputValue}
          setInputValue={setInputValue}
          placeholderText={placeholderText}
          selectedImages={selectedImages}
          setSelectedImages={setSelectedImages}
          onSend={handleSendMessage}
          onSelectImages={handleSelectImages}
          shouldDisableImages={false}
          mode={mode}
          setMode={setMode}
          isAuthenticated={isAuthenticated}
          authMessage={authMessage}
          autoApprovalEnabled={autoApprovalEnabled}
          autoApproveToggles={autoApproveToggles}
          onAutoApprovalEnabledChange={onAutoApprovalEnabledChange || (() => {})}
          onAutoApproveToggleChange={onAutoApproveToggleChange || (() => {})}
        />
      </div>
    </div>
  )
}
