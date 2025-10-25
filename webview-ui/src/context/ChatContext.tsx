/**
 * Chat Context
 *
 * Provides global state management for the chat interface.
 * Handles message streaming, auto-approval, and backend communication.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { ClineMessage } from '../types/cline-message'
import { AutoApproveToggles, AutoApproveSetting } from '../types/auto-approve'
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

  // Auto-approval
  autoApprovalEnabled: boolean
  autoApproveToggles: AutoApproveToggles

  // Actions
  sendMessage: (text: string, images?: string[]) => Promise<void>
  approveMessage: (messageTs: number) => Promise<void>
  rejectMessage: (messageTs: number) => Promise<void>
  setAutoApprovalEnabled: (enabled: boolean) => void
  setAutoApproveToggle: (key: AutoApproveSetting, value: boolean) => void
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

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [messages, setMessages] = useState<ClineMessage[]>([])
  const [taskMessage, setTaskMessage] = useState<ClineMessage | null>(null)
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [autoApprovalEnabled, setAutoApprovalEnabledState] = useState(false)
  const [autoApproveToggles, setAutoApproveToggles] = useState<AutoApproveToggles>({})

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

    // Listen for messages from extension
    const handleMessage = (event: MessageEvent) => {
      const message = event.data

      switch (message.type) {
        case 'addMessage':
          if (message.message) {
            const isAssistant = message.message.role === 'assistant'
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
      await vscodeApiClient.approve({
        messageTs,
        approved: true,
      })
    } catch (err) {
      console.error('Approve error:', err)
      setError(err instanceof Error ? err.message : 'Failed to approve')
    }
  }, [])

  // Reject a message
  const rejectMessage = useCallback(async (messageTs: number) => {
    setError(null)
    try {
      await vscodeApiClient.approve({
        messageTs,
        approved: false,
      })
    } catch (err) {
      console.error('Reject error:', err)
      setError(err instanceof Error ? err.message : 'Failed to reject')
    }
  }, [])

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

  const value: ChatContextValue = {
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
    startNewTask,
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}
