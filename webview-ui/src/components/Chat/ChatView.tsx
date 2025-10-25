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
import { processMessagesForDisplay, shouldAutoApprove, isApprovalMessage } from '../../utils/message-combining'
import { SimpleTaskHeader } from './SimpleTaskHeader'
import { RooStyleTextArea } from './RooStyleTextArea'
import { ChatRow } from './ChatRow'
import './ChatView.css'
import './SimpleTaskHeader.css'

interface ChatViewProps {
  // Message data
  messages: ClineMessage[]
  taskMessage?: ClineMessage  // The first message that started the task
  todos?: TodoItem[]

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
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  taskMessage,
  todos = [],
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
  const [mode, setMode] = useState('architect')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageListRef = useRef<HTMLDivElement>(null)

  // Process messages for display (combining, filtering)
  const visibleMessages = processMessagesForDisplay(messages)

  // Calculate metrics from all messages
  const metrics = getApiMetrics(messages)

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
      onApproveMessage(lastApprovalMessage.ts)
    }
  }, [lastApprovalMessage, onApproveMessage])

  // Handle reject
  const handleReject = useCallback(() => {
    if (lastApprovalMessage && onRejectMessage) {
      onRejectMessage(lastApprovalMessage.ts)
    }
  }, [lastApprovalMessage, onRejectMessage])

  // Determine button text based on message type
  const getButtonText = (message: ClineMessage | undefined): { approve: string, reject: string } => {
    if (!message) return { approve: 'Approve', reject: 'Reject' }

    if (message.ask === 'command') {
      return { approve: 'Run Command', reject: 'Reject' }
    }

    if (message.ask === 'tool') {
      try {
        const tool = JSON.parse(message.text || '{}')
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

  return (
    <div className="chat-view">
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
        </div>
      )}

      {/* Message list */}
      <div className="chat-view-messages" ref={messageListRef}>
        {visibleMessages.length === 0 ? (
          <div className="chat-view-empty">
            <p>Start a conversation with Oropendola AI...</p>
          </div>
        ) : (
          visibleMessages.map((message, index) => (
            <ChatRow
              key={message.ts}
              message={message}
              isExpanded={expandedRows[message.ts] || false}
              isLast={index === visibleMessages.length - 1}
              isStreaming={message.partial || false}
              onToggleExpand={handleToggleExpand}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area - Roo-Code style */}
      <div className="chat-view-input">
        {/* Approval buttons if needed */}
        {lastApprovalMessage && (
          <div className="chat-view-approval-buttons">
            <button
              className="chat-view-button chat-view-button-primary"
              onClick={handleApprove}
            >
              {buttonText.approve}
            </button>
            <button
              className="chat-view-button chat-view-button-secondary"
              onClick={handleReject}
            >
              {buttonText.reject}
            </button>
          </div>
        )}

        {/* Roo-Code style text area */}
        <RooStyleTextArea
          inputValue={inputValue}
          setInputValue={setInputValue}
          placeholderText="Plan and build autonomously..."
          selectedImages={selectedImages}
          setSelectedImages={setSelectedImages}
          onSend={handleSendMessage}
          onSelectImages={handleSelectImages}
          shouldDisableImages={false}
          mode={mode}
          setMode={setMode}
          autoApprovalEnabled={autoApprovalEnabled}
          autoApproveToggles={autoApproveToggles}
          onAutoApprovalEnabledChange={onAutoApprovalEnabledChange || (() => {})}
          onAutoApproveToggleChange={onAutoApproveToggleChange || (() => {})}
        />
      </div>
    </div>
  )
}
