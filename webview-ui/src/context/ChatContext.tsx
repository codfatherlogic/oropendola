/**
 * Chat Context
 *
 * Provides global state management for the chat interface.
 * Handles message streaming, auto-approval, and backend communication.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { ClineMessage, ToolCall } from '../types/cline-message'
import { AutoApproveToggles, AutoApproveSetting } from '../types/auto-approve'
import { formatToolDescription } from '../utils/tool-formatter'
import { vscodeApiClient } from '../api/vscode-client'
import vscode from '../vscode-api'

export interface TodoItem {
  id: string
  content: string
  status: 'pending' | 'in_progress' | 'completed'
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

  // Auto-approval
  autoApprovalEnabled: boolean
  autoApproveToggles: AutoApproveToggles

  // UI Preferences
  reasoningBlockCollapsed: boolean

  // Actions
  sendMessage: (text: string, images?: string[]) => Promise<void>
  approveMessage: (messageTs: number) => Promise<void>
  rejectMessage: (messageTs: number) => Promise<void>
  setAutoApprovalEnabled: (enabled: boolean) => void
  setAutoApproveToggle: (key: AutoApproveSetting, value: boolean) => void
  setReasoningBlockCollapsed: (collapsed: boolean) => void
  clearError: () => void
  startNewTask: () => void
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
  const [messages, setMessages] = useState<ClineMessage[]>([])
  const [taskMessage, setTaskMessage] = useState<ClineMessage | null>(null)
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Authentication state - start as false, backend will send status
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authMessage, setAuthMessage] = useState<string | null>(null)

  const [autoApprovalEnabled, setAutoApprovalEnabledState] = useState(false)
  const [autoApproveToggles, setAutoApproveToggles] = useState<AutoApproveToggles>({})
  const [reasoningBlockCollapsed, setReasoningBlockCollapsedState] = useState(false)

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
          break

        case 'showSignInPrompt':
          // Show sign-in prompt as a system message
          const signInMessage: ClineMessage = {
            ts: Date.now(),
            type: 'say',
            say: 'sign_in_required',
            text: message.message || 'Please sign in to use Oropendola AI'
          }
          setMessages(prev => [...prev, signInMessage])
          setIsLoading(false)
          break

        case 'addMessage':
          if (message.message) {
            const isAssistant = message.message.role === 'assistant'
            
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
              setMessages(prev => [...prev, ...toolMessages])
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
              setMessages(prev => {
                // Set as task message if first message
                if (!taskMessage && prev.length === 0) {
                  setTaskMessage(clineMsg)
                }
                return [...prev, clineMsg]
              })
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
  }, [])

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

      setMessages(prev => {
        // If this is the first message, set it as the task message
        if (prev.length === 0) {
          setTaskMessage(userMessage)
        }
        return [...prev, userMessage]
      })

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
  }, [])

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
        setMessages(prev => prev.filter(m => m.ts !== messageTs))
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
  }, [messages])

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
        setMessages(prev => prev.filter(m => m.ts !== messageTs))
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
  }, [messages])

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
    setMessages([])
    setTaskMessage(null)
    setTodos([])
    setError(null)
  }, [])

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
    autoApprovalEnabled,
    autoApproveToggles,
    reasoningBlockCollapsed,
    sendMessage,
    approveMessage,
    rejectMessage,
    setAutoApprovalEnabled,
    setAutoApproveToggle,
    setReasoningBlockCollapsed,
    clearError,
    startNewTask,
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}
