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
import { TodoItem, useChatContext } from '../../context/ChatContext'
import { getApiMetrics } from '../../utils/api-metrics'
import { getTaskMetrics, getTotalTokens } from '../../utils/getApiMetrics'
import { processMessagesForDisplay, shouldAutoApprove, isApprovalMessage } from '../../utils/message-combining'
import { SimpleTaskHeader } from './SimpleTaskHeader'
import { RooStyleTextArea } from './RooStyleTextArea'
import { ChatRow } from './ChatRow'
import { TaskMetrics } from './TaskMetrics'
import vscode from '../../vscode-api'
import { ContextWindowProgress } from './ContextWindowProgress'
import { EnhancePromptButton } from './EnhancePromptButton'
import { FollowupQuestionPrompt } from './FollowupQuestionPrompt'
import { BranchSelector } from '../Fork'
import { ShortcutsPanel } from '../Shortcuts'
import { ContextPanel } from '../Context'
import { CommandAutocomplete } from '../Commands'
import { MentionAutocomplete } from '../Mentions'
import { SubscriptionBanner } from './SubscriptionBanner'
import { useShortcutHandlers } from '../../hooks/useKeyboardShortcuts'
import { useAutoCondense } from '../../hooks/useAutoCondense'
import { useSoundNotifications } from '../../hooks/useSoundNotifications'
import { commandService } from '../../services/CommandService'
import { mentionService } from '../../services/MentionService'
import { initializeBuiltInCommands } from '../../services/initializeCommands'
import { Command } from '../../types/commands'
import { MentionSuggestion } from '../../types/mentions'
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
  onFollowupAnswer?: (answer: string) => void

  // Followup question state
  followupQuestion?: {
    question: string
    suggestedAnswers?: string[]
    timeout?: number
  }

  // Navigation callbacks (Roo Code pattern)
  onOpenAccount?: () => void
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
  onFollowupAnswer,
  followupQuestion,
  onOpenAccount,
}) => {
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({})
  const [inputValue, setInputValue] = useState('')
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [mode, setMode] = useState('agent')
  const [didClickCancel, setDidClickCancel] = useState(false)

  // Feature panels state
  const [showShortcutsPanel, setShowShortcutsPanel] = useState(false)
  const [showContextPanel, setShowContextPanel] = useState(false)

  // Autocomplete state
  const [commandSuggestions, setCommandSuggestions] = useState<Command[]>([])
  const [mentionSuggestions, setMentionSuggestions] = useState<MentionSuggestion[]>([])
  const [cursorPosition, setCursorPosition] = useState(0)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageListRef = useRef<HTMLDivElement>(null)
  const userRespondedRef = useRef(false)
  const prevMessagesLengthRef = useRef(messages.length)
  const prevApprovalMessageRef = useRef<number | null>(null)

  // Sound notifications
  const soundNotifications = useSoundNotifications({ enabled: true, volume: 0.3 })

  // Get fork state and subscription from context
  const {
    allBranches,
    activeBranch,
    hasForks,
    subscription,
    createFork,
    switchBranch,
    renameBranch,
    deleteBranch,
    getChildBranches,
  } = useChatContext()

  // Process messages for display (moved up for use in effects)
  const visibleMessages = processMessagesForDisplay(messages)

  // Find the last message that needs approval (moved up to fix hoisting issue)
  const lastApprovalMessage = visibleMessages
    .slice()
    .reverse()
    .find(msg => isApprovalMessage(msg) && !shouldAutoApprove(msg, {
      autoApprovalEnabled,
      ...autoApproveToggles
    }))

  // Initialize built-in commands once
  useEffect(() => {
    initializeBuiltInCommands({
      onClear: () => {
        setInputValue('')
        setSelectedImages([])
      },
      onReset: () => {
        setInputValue('')
        setSelectedImages([])
      },
      onShowShortcuts: () => setShowShortcutsPanel(true),
      onShowCost: () => setShowContextPanel(true),
      onShowContext: () => setShowContextPanel(true),
      onCondense: () => setShowContextPanel(true),
      onCreateFork: (name?: string) => {
        if (messages.length > 0) {
          const lastMessage = messages[messages.length - 1]
          createFork(lastMessage.ts, name)
        }
      },
      onShowBranches: () => {
        console.log('[Commands] Branches are shown in the UI when available')
      },
      onToggleAutoApprove: () => {
        if (onAutoApprovalEnabledChange) {
          onAutoApprovalEnabledChange(!autoApprovalEnabled)
        }
      },
      onApprove: () => {
        if (lastApprovalMessage && onApproveMessage) {
          onApproveMessage(lastApprovalMessage.ts)
        }
      },
      onReject: () => {
        if (lastApprovalMessage && onRejectMessage) {
          onRejectMessage(lastApprovalMessage.ts)
        }
      },
    })
  }, [
    autoApprovalEnabled,
    createFork,
    lastApprovalMessage,
    messages,
    onApproveMessage,
    onAutoApprovalEnabledChange,
    onRejectMessage,
  ])

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

  // Detect if AI is currently streaming a response
  const isStreaming = visibleMessages.some(msg => msg.partial === true)

  // Calculate metrics from all messages
  const metrics = getApiMetrics(messages)

  // Calculate task-specific metrics (Roo-Code pattern)
  const taskMetrics = getTaskMetrics(messages, taskMessage?.ts)
  const totalTokens = getTotalTokens(taskMetrics)
  const contextLimit = 200000 // Default context window (can be made configurable)

  // Auto-condense when approaching context limit
  const autoCondense = useAutoCondense(totalTokens, {
    contextLimit,
    threshold: 0.75, // Trigger at 75% usage
    enabled: true,
    onCondense: onCondenseContext,
  })

  // Listen for images selected from extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data
      if (message.type === 'imagesSelected' && message.images) {
        setSelectedImages(prev => [...prev, ...message.images].slice(0, 5))
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

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

  // Play sound when new approval message arrives
  useEffect(() => {
    if (lastApprovalMessage && lastApprovalMessage.ts !== prevApprovalMessageRef.current) {
      soundNotifications.playSound('approvalNeeded')
      prevApprovalMessageRef.current = lastApprovalMessage.ts
    }
  }, [lastApprovalMessage?.ts, soundNotifications])

  // Play sound when AI completes a response (new message added and not streaming)
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current && !isStreaming) {
      const lastMessage = messages[messages.length - 1]
      // Play sound if it's an assistant message (not user message)
      if (lastMessage.type === 'say' && lastMessage.say === 'assistant') {
        soundNotifications.playSound('taskComplete')
      }
    }
    prevMessagesLengthRef.current = messages.length
  }, [messages.length, isStreaming, messages, soundNotifications])

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
  const handleSendMessage = useCallback(async () => {
    const trimmedInput = inputValue.trim()

    if (!trimmedInput && selectedImages.length === 0) {
      return
    }

    // Check if it's a command (starts with /)
    if (trimmedInput.startsWith('/')) {
      const executed = await commandService.execute(trimmedInput)
      if (executed) {
        // Command was executed, clear input
        setInputValue('')
        setCommandSuggestions([])
        return
      }
      // If command not found, continue to send as regular message
    }

    // Resolve @mentions in the message
    let messageToSend = trimmedInput
    if (trimmedInput.includes('@')) {
      try {
        messageToSend = await mentionService.replaceMentions(trimmedInput)
      } catch (error) {
        console.error('[ChatView] Failed to resolve mentions:', error)
        // Continue with original message if mention resolution fails
      }
    }

    // Send the message
    if (onSendMessage) {
      onSendMessage(messageToSend, selectedImages)
      setInputValue('')
      setSelectedImages([])
      setMentionSuggestions([])
    }
  }, [inputValue, selectedImages, onSendMessage])

  // Handle select images
  const handleSelectImages = useCallback(() => {
    // Send message to extension to open file picker
    window.postMessage({
      type: 'selectImages',
      maxImages: 5
    }, '*')
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

  // Handle enhance prompt
  const handleEnhancePrompt = useCallback(() => {
    if (!inputValue.trim()) return

    // Simple local enhancement - add context if prompt is short
    if (inputValue.length < 100) {
      const enhanced = `${inputValue}

Please provide a detailed response with:
- Clear explanations
- Code examples if relevant
- Best practices and considerations`
      setInputValue(enhanced)
    }
  }, [inputValue])

  // Handle input change for autocomplete
  const handleInputChange = useCallback(async (value: string, cursor: number) => {
    setInputValue(value)
    setCursorPosition(cursor)

    // Check for command autocomplete (starts with /)
    if (value.startsWith('/')) {
      const suggestions = commandService.getSuggestions(value)
      setCommandSuggestions(suggestions)
      setMentionSuggestions([])
    }
    // Check for mention autocomplete (contains @)
    else if (value.includes('@')) {
      const suggestions = await mentionService.getSuggestions(value, cursor)
      setMentionSuggestions(suggestions)
      setCommandSuggestions([])
    }
    // Clear autocomplete
    else {
      setCommandSuggestions([])
      setMentionSuggestions([])
    }
  }, [])

  // Handle command selection
  const handleCommandSelect = useCallback((command: Command) => {
    // Replace /command with the selected command
    setInputValue(`/${command.name} `)
    setCommandSuggestions([])
  }, [])

  // Handle mention selection
  const handleMentionSelect = useCallback((mention: MentionSuggestion) => {
    // Find the @ position and replace with the selected mention
    const lastAtIndex = inputValue.lastIndexOf('@', cursorPosition)
    if (lastAtIndex !== -1) {
      const before = inputValue.slice(0, lastAtIndex)
      const after = inputValue.slice(cursorPosition)
      setInputValue(before + mention.text + ' ' + after)
    }
    setMentionSuggestions([])
  }, [inputValue, cursorPosition])

  // Handle context condensing
  const handleCondenseFromPanel = useCallback((condensedMessages: ClineMessage[]) => {
    // This would need to be integrated with the extension
    console.log('Context condensed:', condensedMessages.length, 'messages')
    setShowContextPanel(false)
  }, [])

  // Handle subscription renewal
  const handleRenewSubscription = useCallback(() => {
    vscode.postMessage({ type: 'openPricingPage' })
  }, [])

  // Keyboard shortcuts
  useShortcutHandlers([
    {
      action: 'show_shortcuts',
      handler: () => setShowShortcutsPanel(true),
      enabled: true,
    },
    {
      action: 'show_context',
      handler: () => setShowContextPanel(true),
      enabled: true,
    },
    {
      action: 'send_message',
      handler: () => {
        if (inputValue.trim() || selectedImages.length > 0) {
          handleSendMessage()
        }
      },
      enabled: true,
    },
    {
      action: 'new_conversation',
      handler: () => {
        // Clear conversation
        setInputValue('')
        setSelectedImages([])
      },
      enabled: true,
    },
    {
      action: 'create_fork',
      handler: () => {
        if (messages.length > 0) {
          const lastMessage = messages[messages.length - 1]
          createFork(lastMessage.ts)
        }
      },
      enabled: true,
    },
    {
      action: 'approve_tool',
      handler: () => {
        if (lastApprovalMessage) {
          handleApprove()
        }
      },
      enabled: !!lastApprovalMessage,
    },
    {
      action: 'reject_tool',
      handler: () => {
        if (lastApprovalMessage) {
          handleReject()
        }
      },
      enabled: !!lastApprovalMessage,
    },
  ])

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
          <div className="chat-view-header-top">
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

            {/* Branch Selector - Show when multiple branches exist */}
            {hasForks && (
              <div className="chat-view-branch-selector">
                <BranchSelector
                  branches={allBranches}
                  activeBranchId={activeBranch?.id || 'root'}
                  onSwitchBranch={switchBranch}
                  onRenameBranch={renameBranch}
                  onDeleteBranch={deleteBranch}
                  getChildBranches={getChildBranches}
                />
              </div>
            )}
          </div>

          {/* Task Metrics Display - Roo-Code pattern */}
          {taskMetrics && (
            <div className="chat-view-metrics">
              <TaskMetrics metrics={taskMetrics} />
            </div>
          )}
        </div>
      )}

      {/* Subscription Banner - Show when subscription/trial expired */}
      <SubscriptionBanner
        subscription={subscription}
        onRenew={handleRenewSubscription}
      />

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
        
        {/* Followup question prompt */}
        {followupQuestion && onFollowupAnswer && (
          <FollowupQuestionPrompt
            question={followupQuestion.question}
            suggestedAnswers={followupQuestion.suggestedAnswers}
            timeout={followupQuestion.timeout}
            autoApproveEnabled={autoApprovalEnabled}
            onAnswer={onFollowupAnswer}
          />
        )}

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
          onInputChange={handleInputChange}
          onEnhance={handleEnhancePrompt}
        />

        {/* Command Autocomplete */}
        {commandSuggestions.length > 0 && (
          <CommandAutocomplete
            input={inputValue}
            commands={commandSuggestions}
            onSelect={handleCommandSelect}
            onClose={() => setCommandSuggestions([])}
          />
        )}

        {/* Mention Autocomplete */}
        {mentionSuggestions.length > 0 && (
          <MentionAutocomplete
            input={inputValue}
            cursorPosition={cursorPosition}
            suggestions={mentionSuggestions}
            onSelect={handleMentionSelect}
            onClose={() => setMentionSuggestions([])}
          />
        )}
      </div>

      {/* Shortcuts Panel */}
      <ShortcutsPanel
        isOpen={showShortcutsPanel}
        onClose={() => setShowShortcutsPanel(false)}
      />

      {/* Context Intelligence Panel */}
      <ContextPanel
        messages={messages}
        modelId="claude-sonnet-3-5-20241022"
        isOpen={showContextPanel}
        onClose={() => setShowContextPanel(false)}
        onCondense={handleCondenseFromPanel}
      />
    </div>
  )
}
