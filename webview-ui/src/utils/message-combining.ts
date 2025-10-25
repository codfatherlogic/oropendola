/**
 * Message Combining Utilities
 *
 * Functions to combine consecutive related messages for better UX.
 * Based on Roo-Code's message combining logic.
 */

import { ClineMessage } from '../types/cline-message'

/**
 * Combines consecutive API request messages (api_req_started + api_req_finished)
 * into a single message for cleaner display.
 */
export function combineApiRequests(messages: ClineMessage[]): ClineMessage[] {
  const combined: ClineMessage[] = []

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i]

    // Check if this is an api_req_started message
    if (message.say === 'api_req_started') {
      // Look ahead for the matching api_req_finished
      let j = i + 1
      while (j < messages.length && messages[j].say !== 'api_req_finished') {
        j++
      }

      // If we found a matching finished message, combine them
      if (j < messages.length && messages[j].say === 'api_req_finished') {
        // Combine: use the started message but merge in finished data
        combined.push({
          ...message,
          ...messages[j],
          say: 'api_req_started', // Keep as started for rendering
        })
        i = j // Skip the finished message
      } else {
        // No matching finished message, keep as-is
        combined.push(message)
      }
    } else {
      combined.push(message)
    }
  }

  return combined
}

/**
 * Combines consecutive command execution messages for better display.
 * Groups command request with its output.
 */
export function combineCommandSequences(messages: ClineMessage[]): ClineMessage[] {
  const combined: ClineMessage[] = []

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i]

    // Check if this is a command message
    if (message.ask === 'command') {
      // Look ahead for command_output
      let j = i + 1
      let output = ''

      while (j < messages.length &&
             (messages[j].say === 'command_output' || messages[j].ask === 'command_output')) {
        if (messages[j].text) {
          output += messages[j].text + '\n'
        }
        j++
      }

      // If we found output, combine it with the command
      if (output) {
        combined.push({
          ...message,
          text: (message.text || '') + '\n\n__OUTPUT__:\n' + output.trim(),
        })
        i = j - 1 // Skip the output messages
      } else {
        combined.push(message)
      }
    } else {
      combined.push(message)
    }
  }

  return combined
}

/**
 * Filter out internal/system messages that shouldn't be displayed
 */
export function filterVisibleMessages(messages: ClineMessage[]): ClineMessage[] {
  return messages.filter(message => {
    // Filter out api_req_finished (they're combined with api_req_started)
    if (message.say === 'api_req_finished') {
      return false
    }

    // Filter out empty messages
    if (!message.text && !message.images && !message.tool) {
      return false
    }

    return true
  })
}

/**
 * Main function to process messages for display.
 * Combines related messages and filters out system messages.
 */
export function processMessagesForDisplay(messages: ClineMessage[]): ClineMessage[] {
  // Step 1: Combine API requests
  let processed = combineApiRequests(messages)

  // Step 2: Combine command sequences
  processed = combineCommandSequences(processed)

  // Step 3: Filter visible messages
  processed = filterVisibleMessages(processed)

  return processed
}

/**
 * Get the last user message from the message list
 */
export function getLastUserMessage(messages: ClineMessage[]): ClineMessage | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].say === 'user_feedback') {
      return messages[i]
    }
  }
  return undefined
}

/**
 * Get the last assistant message from the message list
 */
export function getLastAssistantMessage(messages: ClineMessage[]): ClineMessage | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].type === 'say' && messages[i].say !== 'user_feedback') {
      return messages[i]
    }
  }
  return undefined
}

/**
 * Check if a message is asking for approval
 */
export function isApprovalMessage(message: ClineMessage): boolean {
  if (message.type !== 'ask') return false

  const approvalTypes = [
    'command',
    'tool',
    'browser_action_launch',
    'use_mcp_server',
  ]

  return approvalTypes.includes(message.ask || '')
}

/**
 * Check if a message has been auto-approved based on settings
 */
export function shouldAutoApprove(
  message: ClineMessage,
  settings: {
    autoApprovalEnabled: boolean
    alwaysAllowReadOnly?: boolean
    alwaysAllowWrite?: boolean
    alwaysAllowExecute?: boolean
    alwaysAllowBrowser?: boolean
    alwaysAllowMcp?: boolean
  }
): boolean {
  if (!settings.autoApprovalEnabled) return false
  if (!isApprovalMessage(message)) return false

  const ask = message.ask

  switch (ask) {
    case 'command':
      return settings.alwaysAllowExecute || false

    case 'tool':
      try {
        const tool = JSON.parse(message.text || '{}')
        // Read-only operations
        if (['readFile', 'listFilesTopLevel', 'listFilesRecursive', 'searchFiles'].includes(tool.tool)) {
          return settings.alwaysAllowReadOnly || false
        }
        // Write operations
        if (['editedExistingFile', 'newFileCreated', 'appliedDiff'].includes(tool.tool)) {
          return settings.alwaysAllowWrite || false
        }
      } catch {
        return false
      }
      return false

    case 'browser_action_launch':
      return settings.alwaysAllowBrowser || false

    case 'use_mcp_server':
      return settings.alwaysAllowMcp || false

    default:
      return false
  }
}
