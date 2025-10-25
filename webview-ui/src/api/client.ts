/**
 * API Client for Oropendola Backend
 *
 * Handles all communication with the backend at https://oropendola.ai
 * Provides methods for sending messages, handling approvals, and managing settings.
 */

import { ClineMessage } from '../types/cline-message'
import { AutoApproveToggles } from '../types/auto-approve'

const BASE_URL = 'https://oropendola.ai'

export interface SendMessageOptions {
  message: string
  images?: string[]
  sessionId?: string
}

export interface ApprovalOptions {
  messageTs: number
  approved: boolean
  response?: string
  sessionId?: string
}

/**
 * API Client class for backend communication
 */
export class OropendolaAPIClient {
  private baseUrl: string
  private sessionId: string | null = null

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl
  }

  /**
   * Set the session ID for authenticated requests
   */
  setSessionId(sessionId: string) {
    this.sessionId = sessionId
  }

  /**
   * Get the current session ID
   */
  getSessionId(): string | null {
    return this.sessionId
  }

  /**
   * Send a message to the backend and receive streaming responses
   */
  async *sendMessage(options: SendMessageOptions): AsyncGenerator<ClineMessage> {
    const { message, images = [], sessionId = this.sessionId } = options

    const response = await fetch(`${this.baseUrl}/api/method/ai_assistant.api.oropendola.chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for session
      body: JSON.stringify({
        message,
        images,
        session_id: sessionId,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    // Check if response is SSE (Server-Sent Events)
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('text/event-stream')) {
      // Handle SSE streaming
      yield* this.handleSSEStream(response)
    } else {
      // Handle JSON response (fallback)
      const data = await response.json()
      if (data.message) {
        yield data.message as ClineMessage
      }
    }
  }

  /**
   * Handle Server-Sent Events stream
   */
  private async *handleSSEStream(response: Response): AsyncGenerator<ClineMessage> {
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              return
            }

            try {
              const message = JSON.parse(data) as ClineMessage
              yield message
            } catch (e) {
              console.error('Failed to parse SSE message:', e)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  /**
   * Send approval/rejection for a permission request
   */
  async approve(options: ApprovalOptions): Promise<boolean> {
    const { messageTs, approved, response: feedbackResponse, sessionId = this.sessionId } = options

    const response = await fetch(`${this.baseUrl}/api/method/ai_assistant.api.oropendola.approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        message_ts: messageTs,
        approved,
        response: feedbackResponse,
        session_id: sessionId,
      }),
    })

    if (!response.ok) {
      throw new Error(`Approval failed: ${response.status}`)
    }

    const data = await response.json()
    return data.message?.success === true
  }

  /**
   * Get auto-approval settings from backend
   */
  async getAutoApproveSettings(): Promise<{
    autoApprovalEnabled: boolean
    toggles: AutoApproveToggles
  }> {
    const response = await fetch(
      `${this.baseUrl}/api/method/ai_assistant.api.oropendola.get_auto_approve_settings`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to get settings: ${response.status}`)
    }

    const data = await response.json()
    return {
      autoApprovalEnabled: data.message?.autoApprovalEnabled || false,
      toggles: data.message?.toggles || {
        alwaysAllowReadOnly: false,
        alwaysAllowWrite: false,
        alwaysAllowExecute: false,
        alwaysAllowBrowser: false,
        alwaysAllowMcp: false,
        alwaysAllowModeSwitch: false,
        alwaysAllowSubtasks: false,
        alwaysApproveResubmit: false,
        alwaysAllowFollowupQuestions: false,
        alwaysAllowUpdateTodoList: false,
      },
    }
  }

  /**
   * Save auto-approval settings to backend
   */
  async saveAutoApproveSettings(
    autoApprovalEnabled: boolean,
    toggles: AutoApproveToggles
  ): Promise<boolean> {
    const response = await fetch(
      `${this.baseUrl}/api/method/ai_assistant.api.oropendola.save_auto_approve_settings`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          autoApprovalEnabled,
          toggles,
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to save settings: ${response.status}`)
    }

    const data = await response.json()
    return data.message?.success === true
  }

  /**
   * Get task history from backend
   */
  async getTaskHistory(): Promise<ClineMessage[][]> {
    const response = await fetch(
      `${this.baseUrl}/api/method/oropendola.api.get_task_history`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to get task history: ${response.status}`)
    }

    const data = await response.json()
    return data.message?.tasks || []
  }

  /**
   * Create a new task
   */
  async createTask(message: string, images: string[] = []): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/method/oropendola.api.create_task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        message,
        images,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to create task: ${response.status}`)
    }

    const data = await response.json()
    return data.message?.task_id || ''
  }
}

/**
 * Singleton instance for the app
 */
export const apiClient = new OropendolaAPIClient()
