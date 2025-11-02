/**
 * Chat Context
 *
 * Provides global state management for the chat interface.
 * Handles message streaming, auto-approval, and backend communication.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { ClineMessage, ToolCall } from '../types/cline-message'
import { AutoApproveToggles, AutoApproveSetting } from '../types/auto-approve'
import { BranchId, ConversationBranch } from '../types/conversation-fork'
import { formatToolDescription } from '../utils/tool-formatter'
import { vscodeApiClient } from '../api/vscode-client'
import { useConversationForks } from '../hooks/useConversationForks'
import vscode from '../vscode-api'

export interface TodoItem {
  id: string
  content: string
  status: 'pending' | 'in_progress' | 'completed'
}

export interface Subscription {
  plan_name: string
  status: 'Active' | 'Trial' | 'Expired' | 'Cancelled' | 'Pending'
  start_date: string
  end_date: string
  is_active: boolean
  is_trial: boolean
  days_remaining: number
  expired_days_ago?: number
}

interface ChatContextValue {
  // Messages
  messages: ClineMessage[]
  taskMessage: ClineMessage | null
  todos: TodoItem[]
  isLoading: boolean
  error: string | null

  // Authentication
  isAuthenticated: boolean
  authMessage: string | null

  // Subscription
  subscription: Subscription | null

  // Auto-approval
  autoApprovalEnabled: boolean
  autoApproveToggles: AutoApproveToggles

  // UI Preferences
  reasoningBlockCollapsed: boolean

  // Conversation Forks
  activeBranch: ConversationBranch | undefined
  allBranches: ConversationBranch[]
  hasForks: boolean
  branchCount: number

  // Actions
  sendMessage: (text: string, images?: string[]) => Promise<void>
  approveMessage: (messageTs: number) => Promise<void>
  rejectMessage: (messageTs: number) => Promise<void>
  setAutoApprovalEnabled: (enabled: boolean) => void
  setAutoApproveToggle: (key: AutoApproveSetting, value: boolean) => void
  setReasoningBlockCollapsed: (collapsed: boolean) => void
  clearError: () => void
  startNewTask: () => void

  // Fork Actions
  createFork: (messageTs: number, branchName?: string) => Promise<BranchId>
  switchBranch: (branchId: BranchId) => Promise<void>
  renameBranch: (branchId: BranchId, newName: string) => Promise<void>
  deleteBranch: (branchId: BranchId) => Promise<void>
  getChildBranches: (branchId: BranchId) => ConversationBranch[]
  getBranchPath: (branchId: BranchId) => BranchId[]
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined)

export const useChatContext = () => {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider')
  }
  return context
}

interface ChatProviderProps {
  children: React.ReactNode
}

console.log('🔥🔥🔥 [ChatProvider] Module is loading!');

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  console.log('🔥 [ChatProvider] Component rendering!');
  const [taskMessage, setTaskMessage] = useState<ClineMessage | null>(null)
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Authentication state - start as false, backend will send status
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authMessage, setAuthMessage] = useState<string | null>(null)

  // Subscription state
  const [subscription, setSubscription] = useState<Subscription | null>(null)

  const [autoApprovalEnabled, setAutoApprovalEnabledState] = useState(false)
  const [autoApproveToggles, setAutoApproveToggles] = useState<AutoApproveToggles>({})
  const [reasoningBlockCollapsed, setReasoningBlockCollapsedState] = useState(false)

  // Conversation fork management
  const {
    messages: forkMessages,
    activeBranch,
    allBranches,
    hasForks,
    branchCount,
    createFork,
    switchBranch,
    renameBranch,
    deleteBranch,
    getChildBranches,
    getBranchPath,
    updateBranchMessages,
    clearForks,
  } = useConversationForks([])

  // Use fork messages as the source of truth
  const messages = forkMessages

  // Load auto-approval settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await vscodeApiClient.getAutoApproveSettings()
        setAutoApprovalEnabledState(settings.autoApprovalEnabled)
        setAutoApproveToggles(settings.toggles)
      } catch (err) {
        console.error('Failed to load auto-approval settings:', err)
      }
    }
    loadSettings()

    // Request authentication status when webview is ready
    console.log('🔐 [ChatContext] Webview ready - requesting auth status')
    vscode.postMessage({ type: 'getAuthStatus' })

    // Request account data (includes subscription info)
    console.log('📊 [ChatContext] Requesting account data for subscription info')
    vscode.postMessage({ type: 'getAccountData' })

    // Listen for messages from extension
    const handleMessage = (event: MessageEvent) => {
      const message = event.data

      switch (message.type) {
        case 'authenticationStatus':
          // Update authentication state from backend
          console.log('🔐 [ChatContext] Received authenticationStatus:', message)
          setIsAuthenticated(message.isAuthenticated)
          setAuthMessage(message.message || null)
          console.log(`🔐 [ChatContext] Set isAuthenticated=${message.isAuthenticated}, authMessage="${message.message}"`)

          // If user just authenticated, request account data
          if (message.isAuthenticated) {
            console.log('📊 [ChatContext] User authenticated - requesting account data')
            vscode.postMessage({ type: 'getAccountData' })
          }
          break

        case 'accountData':
          // Update subscription data from account data
          console.log('📊 [ChatContext] Received accountData message:', message.data)
          console.log('📊 [ChatContext] Subscription field exists?', !!message.data?.subscription)
          if (message.data?.subscription) {
            console.log('📊 [ChatContext] Setting subscription data:', message.data.subscription)
            setSubscription(message.data.subscription)
          } else {
            console.log('⚠️ [ChatContext] No subscription data in accountData message')
          }
          break

        case 'subscriptionActivated':
          // Subscription just became active - update UI to show chat
          console.log('🎉 [ChatContext] Subscription activated!', message.subscription)
          setSubscription(message.subscription)
          // Clear any error messages
          setError(null)
          break

        case 'showSignInPrompt':
          // Show sign-in prompt as a system message
          const signInMessage: ClineMessage = {
            ts: Date.now(),
            type: 'say',
            say: 'sign_in_required',
            text: message.message || 'Please sign in to use Oropendola AI'
          }
          updateBranchMessages([...messages, signInMessage])
          setIsLoading(false)
          break

        case 'addMessage':
          if (message.message) {
            const isAssistant = message.message.role === 'assistant'
            let newMessages = [...messages]

            // Check if message contains tool_calls that need approval
            if (message.message.tool_calls && message.message.tool_calls.length > 0) {
              console.log(`📋 [ChatContext] Received ${message.message.tool_calls.length} tool(s) for approval`)

              // Create approval messages for each tool
              const toolMessages: ClineMessage[] = message.message.tool_calls.map((toolCall: ToolCall, index: number) => ({
                ts: Date.now() + index,
                type: 'ask',
                ask: 'tool',
                text: formatToolDescription(toolCall),
                tool: toolCall,
              }))

              // Add tool approval messages
              newMessages = [...newMessages, ...toolMessages]
            }

            // Add the AI's text response (if any)
            if (message.message.content) {
              const clineMsg: ClineMessage = {
                ts: message.message.ts || Date.now(),
                type: isAssistant ? 'say' : 'ask',
                ...(isAssistant
                  ? { say: 'text' as const }
                  : { ask: 'followup' as const }
                ),
                text: message.message.content || '',
                images: message.message.images || [],
                // Include metrics if provided by backend
                apiMetrics: message.message.apiMetrics || message.message.metrics
              }

              // Set as task message if first message
              if (!taskMessage && messages.length === 0) {
                setTaskMessage(clineMsg)
              }

              newMessages = [...newMessages, clineMsg]
            }

            // Update fork messages
            if (newMessages.length > messages.length) {
              updateBranchMessages(newMessages)
            }
          }
          break

        case 'updateTodos':
          if (message.todos) {
            // Transform backend todos to TodoListDisplay format
            setTodos(message.todos.map((t: any, idx: number) => ({
              id: t.id || `todo-${idx}`,
              content: t.content || t.text || '',
              status: t.status === 'completed' ? 'completed'
                    : t.status === 'in_progress' ? 'in_progress'
                    : t.done || t.completed ? 'completed'
                    : 'pending'
            })))
          }
          break

        case 'showTyping':
          setIsLoading(true)
          break

        case 'hideTyping':
          setIsLoading(false)
          break
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [messages, updateBranchMessages, taskMessage])

  // Send message to backend (through extension)
  const sendMessage = useCallback(async (text: string, images: string[] = []) => {
    setIsLoading(true)
    setError(null)

    try {
      // Add user message immediately
      const userMessage: ClineMessage = {
        ts: Date.now(),
        type: 'say',
        say: 'user_feedback',
        text,
        images,
      }

      // If this is the first message, set it as the task message
      if (messages.length === 0) {
        setTaskMessage(userMessage)
      }

      // Add to fork messages
      updateBranchMessages([...messages, userMessage])

      // Send message through extension (responses will come via message events)
      vscode.postMessage({
        type: 'sendMessage',
        text,
        attachments: images
      })
    } catch (err) {
      console.error('Send message error:', err)
      setError(err instanceof Error ? err.message : 'Failed to send message')
      setIsLoading(false)
    }
  }, [messages, updateBranchMessages])

  // Approve a message
  const approveMessage = useCallback(async (messageTs: number) => {
    setError(null)
    try {
      // Find the message to check if it's a tool approval
      const message = messages.find(m => m.ts === messageTs)

      if (message?.ask === 'tool' && message.tool) {
        console.log(`✅ [ChatContext] Approving tool: ${message.tool.action}`)

        // Send tool execution approval to extension
        window.postMessage({
          type: 'approveTool',
          messageTs: messageTs,
          tool: message.tool,
        }, '*')

        // Remove the approval message from UI (tool will execute)
        updateBranchMessages(messages.filter(m => m.ts !== messageTs))
      } else {
        // Regular approval (non-tool)
        await vscodeApiClient.approve({
          messageTs,
          approved: true,
        })
      }
    } catch (err) {
      console.error('Approve error:', err)
      setError(err instanceof Error ? err.message : 'Failed to approve')
    }
  }, [messages, updateBranchMessages])

  // Reject a message
  const rejectMessage = useCallback(async (messageTs: number) => {
    setError(null)
    try {
      // Find the message to check if it's a tool rejection
      const message = messages.find(m => m.ts === messageTs)

      if (message?.ask === 'tool' && message.tool) {
        console.log(`❌ [ChatContext] Rejecting tool: ${message.tool.action}`)

        // Send tool rejection to extension
        window.postMessage({
          type: 'rejectTool',
          messageTs: messageTs,
          tool: message.tool,
        }, '*')

        // Remove the approval message from UI
        updateBranchMessages(messages.filter(m => m.ts !== messageTs))
      } else {
        // Regular rejection (non-tool)
        await vscodeApiClient.approve({
          messageTs,
          approved: false,
        })
      }
    } catch (err) {
      console.error('Reject error:', err)
      setError(err instanceof Error ? err.message : 'Failed to reject')
    }
  }, [messages, updateBranchMessages])

  // Set auto-approval enabled
  const setAutoApprovalEnabled = useCallback((enabled: boolean) => {
    setAutoApprovalEnabledState(enabled)
    // Save to backend (through extension)
    vscodeApiClient.saveAutoApproveSettings(enabled, autoApproveToggles).catch(err => {
      console.error('Failed to save auto-approval enabled:', err)
    })
  }, [autoApproveToggles])

  // Set individual auto-approve toggle
  const setAutoApproveToggle = useCallback((key: AutoApproveSetting, value: boolean) => {
    setAutoApproveToggles(prev => {
      const updated = { ...prev, [key]: value }
      // Save to backend (through extension)
      vscodeApiClient.saveAutoApproveSettings(autoApprovalEnabled, updated).catch(err => {
        console.error('Failed to save auto-approve toggle:', err)
      })
      return updated
    })
  }, [autoApprovalEnabled])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Start a new task
  const startNewTask = useCallback(() => {
    clearForks()
    setTaskMessage(null)
    setTodos([])
    setError(null)
  }, [clearForks])

  // Set reasoning block collapsed preference
  const setReasoningBlockCollapsed = useCallback((collapsed: boolean) => {
    setReasoningBlockCollapsedState(collapsed)
    // Persist to localStorage
    try {
      localStorage.setItem('reasoningBlockCollapsed', JSON.stringify(collapsed))
    } catch (err) {
      console.error('Failed to save reasoning block preference:', err)
    }
  }, [])

  // Load reasoning block preference on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('reasoningBlockCollapsed')
      if (saved !== null) {
        setReasoningBlockCollapsedState(JSON.parse(saved))
      }
    } catch (err) {
      console.error('Failed to load reasoning block preference:', err)
    }
  }, [])

  const value: ChatContextValue = {
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
    reasoningBlockCollapsed,
    activeBranch,
    allBranches,
    hasForks,
    branchCount,
    sendMessage,
    approveMessage,
    rejectMessage,
    setAutoApprovalEnabled,
    setAutoApproveToggle,
    setReasoningBlockCollapsed,
    clearError,
    startNewTask,
    createFork,
    switchBranch,
    renameBranch,
    deleteBranch,
    getChildBranches,
    getBranchPath,
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}
