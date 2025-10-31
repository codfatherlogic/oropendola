/**
 * Commands System Types
 *
 * Slash commands for quick actions in chat.
 */

export interface Command {
  /** Command name (without slash) */
  name: string

  /** Aliases for the command */
  aliases?: string[]

  /** Command description */
  description: string

  /** Category for grouping */
  category: 'chat' | 'context' | 'tools' | 'navigation' | 'debug'

  /** Handler function */
  handler: (args: string[]) => void | Promise<void>

  /** Whether command requires arguments */
  requiresArgs?: boolean

  /** Argument description */
  argsDescription?: string

  /** Whether command is enabled */
  enabled: boolean
}

export type BuiltInCommand =
  | 'clear'
  | 'reset'
  | 'help'
  | 'shortcuts'
  | 'cost'
  | 'context'
  | 'condense'
  | 'approve'
  | 'reject'
  | 'fork'
  | 'branches'
  | 'debug'
  | 'version'

export interface CommandRegistry {
  commands: Map<string, Command>
  register: (command: Command) => void
  unregister: (name: string) => void
  execute: (input: string) => Promise<boolean>
  search: (query: string) => Command[]
  getAll: () => Command[]
}

export interface CommandSuggestion {
  command: Command
  matchScore: number
}
