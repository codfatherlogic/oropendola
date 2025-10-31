/**
 * Built-in Commands Configuration
 *
 * Default slash commands available in chat.
 */

import { Command } from '../types/commands'

export interface CommandHandlers {
  onClear?: () => void
  onReset?: () => void
  onShowShortcuts?: () => void
  onShowCost?: () => void
  onShowContext?: () => void
  onCondense?: () => void
  onApprove?: () => void
  onReject?: () => void
  onCreateFork?: (name?: string) => void
  onShowBranches?: () => void
  onToggleAutoApprove?: () => void
}

/**
 * Create built-in commands with handlers
 */
export function createBuiltInCommands(handlers: CommandHandlers): Command[] {
  return [
    // Chat commands
    {
      name: 'clear',
      aliases: ['c'],
      description: 'Clear current conversation',
      category: 'chat',
      handler: async () => {
        if (handlers.onClear) {
          handlers.onClear()
        }
      },
      enabled: true,
    },
    {
      name: 'reset',
      aliases: ['restart'],
      description: 'Reset and start new conversation',
      category: 'chat',
      handler: async () => {
        if (handlers.onReset) {
          handlers.onReset()
        }
      },
      enabled: true,
    },

    // Navigation commands
    {
      name: 'help',
      aliases: ['h', '?'],
      description: 'Show help and available commands',
      category: 'navigation',
      handler: async () => {
        console.log('[Commands] Help requested')
        // Will be shown in command autocomplete
      },
      enabled: true,
    },
    {
      name: 'shortcuts',
      aliases: ['keys', 'kb'],
      description: 'Show keyboard shortcuts',
      category: 'navigation',
      handler: async () => {
        if (handlers.onShowShortcuts) {
          handlers.onShowShortcuts()
        }
      },
      enabled: true,
    },

    // Context commands
    {
      name: 'cost',
      aliases: ['price', 'usage'],
      description: 'Show cost breakdown',
      category: 'context',
      handler: async () => {
        if (handlers.onShowCost) {
          handlers.onShowCost()
        }
      },
      enabled: true,
    },
    {
      name: 'context',
      aliases: ['ctx', 'tokens'],
      description: 'Show context window information',
      category: 'context',
      handler: async () => {
        if (handlers.onShowContext) {
          handlers.onShowContext()
        }
      },
      enabled: true,
    },
    {
      name: 'condense',
      aliases: ['compress', 'optimize'],
      description: 'Condense conversation context',
      category: 'context',
      handler: async () => {
        if (handlers.onCondense) {
          handlers.onCondense()
        }
      },
      enabled: true,
    },

    // Tool commands
    {
      name: 'approve',
      aliases: ['yes', 'y'],
      description: 'Approve pending tool action',
      category: 'tools',
      handler: async () => {
        if (handlers.onApprove) {
          handlers.onApprove()
        }
      },
      enabled: true,
    },
    {
      name: 'reject',
      aliases: ['no', 'n', 'cancel'],
      description: 'Reject pending tool action',
      category: 'tools',
      handler: async () => {
        if (handlers.onReject) {
          handlers.onReject()
        }
      },
      enabled: true,
    },

    // Branching commands
    {
      name: 'fork',
      aliases: ['branch'],
      description: 'Create conversation fork (optional: /fork <name>)',
      category: 'chat',
      handler: async (args) => {
        const branchName = args.join(' ')
        if (handlers.onCreateFork) {
          handlers.onCreateFork(branchName || undefined)
        }
      },
      argsDescription: '<name>',
      enabled: true,
    },
    {
      name: 'branches',
      aliases: ['forks', 'tree'],
      description: 'Show all conversation branches',
      category: 'chat',
      handler: async () => {
        if (handlers.onShowBranches) {
          handlers.onShowBranches()
        }
      },
      enabled: true,
    },

    // Debug commands
    {
      name: 'debug',
      aliases: ['info'],
      description: 'Show debug information',
      category: 'debug',
      handler: async () => {
        console.log('[Commands] Debug info:')
        console.log('- Version: 3.9.0')
        console.log('- Platform:', navigator.platform)
        console.log('- User agent:', navigator.userAgent)
      },
      enabled: true,
    },
    {
      name: 'version',
      aliases: ['v'],
      description: 'Show extension version',
      category: 'debug',
      handler: async () => {
        console.log('[Commands] Oropendola AI v3.9.0')
      },
      enabled: true,
    },

    // Settings commands
    {
      name: 'autoapprove',
      aliases: ['auto', 'aa'],
      description: 'Toggle auto-approve mode',
      category: 'tools',
      handler: async () => {
        if (handlers.onToggleAutoApprove) {
          handlers.onToggleAutoApprove()
        }
      },
      enabled: true,
    },
  ]
}

/**
 * Get command help text
 */
export function getCommandHelp(): string {
  return `
Available Commands:

Chat:
  /clear, /c - Clear current conversation
  /reset - Start new conversation
  /fork [name] - Create conversation fork
  /branches - Show all branches

Context:
  /cost - Show cost breakdown
  /context - Show context info
  /condense - Optimize context

Tools:
  /approve, /yes - Approve action
  /reject, /no - Reject action
  /autoapprove - Toggle auto-approve

Navigation:
  /help, /? - Show this help
  /shortcuts - Show keyboard shortcuts

Debug:
  /debug - Show debug info
  /version - Show version

Type / to see autocomplete suggestions.
  `.trim()
}
