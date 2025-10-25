/**
 * VSCode API Client
 *
 * Communicates with the backend through the VSCode extension (via postMessage)
 * instead of making direct fetch calls. This avoids CORS and cookie issues.
 */

import { ClineMessage } from '../types/cline-message'
import { AutoApproveToggles } from '../types/auto-approve'
import vscode from '../vscode-api'

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
 * VSCode-based API Client
 * Communicates through extension instead of direct HTTP
 */
export class VSCodeAPIClient {
  constructor() {
    // No initialization needed - using direct postMessage communication
  }


  /**
   * Send a message to the backend (through extension)
   */
  async *sendMessage(options: SendMessageOptions): AsyncGenerator<ClineMessage> {
    const { message, images = [] } = options

    // Send message through extension
    vscode.postMessage({
      type: 'sendMessage',
      text: message,
      attachments: images
    })

    // Wait for responses via message events
    // The extension will send messages back via 'addMessage' events
    // This is a simplified version - the real implementation would need
    // to properly handle streaming responses

    // For now, we'll yield a placeholder - the real messages will come
    // through the message event listener in ChatContext
    yield {
      ts: Date.now(),
      type: 'say',
      say: 'api_req_started',
      text: 'Processing your request...'
    } as ClineMessage
  }

  /**
   * Approve or reject a message
   */
  async approve(options: ApprovalOptions): Promise<boolean> {
    const { messageTs, approved, response } = options

    vscode.postMessage({
      type: 'messageFeedback',
      action: approved ? 'accept' : 'reject',
      message: {
        ts: messageTs,
        text: response || ''
      }
    })

    return true
  }

  /**
   * Get auto-approval settings
   */
  async getAutoApproveSettings(): Promise<{
    autoApprovalEnabled: boolean
    toggles: AutoApproveToggles
  }> {
    try {
      // Get from VSCode state (defaults provided)
      const state = vscode.getState() || {}

      return {
        autoApprovalEnabled: state.autoApprovalEnabled || false,
        toggles: state.autoApproveToggles || {
          alwaysAllowReadOnly: true,
          alwaysAllowWrite: false,
          alwaysAllowExecute: false,
          alwaysAllowBrowser: false,
          alwaysAllowMcp: false,
          alwaysAllowModeSwitch: true,
          alwaysAllowSubtasks: true,
          alwaysApproveResubmit: true,
          alwaysAllowFollowupQuestions: false,
          alwaysAllowUpdateTodoList: true,
        }
      }
    } catch (err) {
      console.error('Failed to get auto-approval settings:', err)
      return {
        autoApprovalEnabled: false,
        toggles: {}
      }
    }
  }

  /**
   * Save auto-approval settings
   */
  async saveAutoApproveSettings(autoApprovalEnabled: boolean, toggles: AutoApproveToggles): Promise<boolean> {
    // Save to VSCode state
    vscode.setState({
      ...vscode.getState(),
      autoApprovalEnabled,
      autoApproveToggles: toggles
    })

    // Also send to extension to persist
    vscode.postMessage({
      type: 'updateAutoApprove',
      autoApprovalEnabled,
      toggles
    })

    return true
  }
}

// Export singleton instance
export const vscodeApiClient = new VSCodeAPIClient()
