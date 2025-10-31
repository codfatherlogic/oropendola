/**
 * Command Service
 *
 * Parses and executes slash commands in chat.
 */

import { Command, CommandRegistry, BuiltInCommand } from '../types/commands'

class CommandServiceImpl implements CommandRegistry {
  private commands: Map<string, Command> = new Map()

  constructor() {
    // Initialize with empty registry
  }

  /**
   * Register a command
   */
  register(command: Command): void {
    this.commands.set(command.name, command)

    // Register aliases
    if (command.aliases) {
      command.aliases.forEach((alias) => {
        this.commands.set(alias, command)
      })
    }

    console.log(`[Commands] Registered: /${command.name}`)
  }

  /**
   * Unregister a command
   */
  unregister(name: string): void {
    const command = this.commands.get(name)
    if (command) {
      this.commands.delete(name)

      // Remove aliases
      if (command.aliases) {
        command.aliases.forEach((alias) => {
          this.commands.delete(alias)
        })
      }

      console.log(`[Commands] Unregistered: /${name}`)
    }
  }

  /**
   * Execute a command from input string
   */
  async execute(input: string): Promise<boolean> {
    // Check if input starts with slash
    if (!input.startsWith('/')) {
      return false
    }

    // Parse command and arguments
    const parts = input.slice(1).trim().split(/\s+/)
    const commandName = parts[0].toLowerCase()
    const args = parts.slice(1)

    const command = this.commands.get(commandName)

    if (!command) {
      console.warn(`[Commands] Unknown command: /${commandName}`)
      return false
    }

    if (!command.enabled) {
      console.warn(`[Commands] Disabled command: /${commandName}`)
      return false
    }

    // Check if command requires args
    if (command.requiresArgs && args.length === 0) {
      console.warn(`[Commands] /${commandName} requires arguments: ${command.argsDescription}`)
      return false
    }

    try {
      await command.handler(args)
      console.log(`[Commands] Executed: /${commandName}`, args)
      return true
    } catch (error) {
      console.error(`[Commands] Error executing /${commandName}:`, error)
      return false
    }
  }

  /**
   * Search commands by query
   */
  search(query: string): Command[] {
    const lowerQuery = query.toLowerCase()
    const results: Command[] = []

    this.commands.forEach((command) => {
      // Avoid duplicate entries from aliases
      if (command.name === command.name.toLowerCase()) {
        if (
          command.name.includes(lowerQuery) ||
          command.description.toLowerCase().includes(lowerQuery) ||
          (command.aliases && command.aliases.some((a) => a.includes(lowerQuery)))
        ) {
          results.push(command)
        }
      }
    })

    return results
  }

  /**
   * Get all commands
   */
  getAll(): Command[] {
    const uniqueCommands = new Map<string, Command>()

    this.commands.forEach((command) => {
      if (!uniqueCommands.has(command.name)) {
        uniqueCommands.set(command.name, command)
      }
    })

    return Array.from(uniqueCommands.values()).sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * Get commands by category
   */
  getByCategory(category: Command['category']): Command[] {
    return this.getAll().filter((cmd) => cmd.category === category)
  }

  /**
   * Check if input is a command
   */
  isCommand(input: string): boolean {
    return input.trim().startsWith('/')
  }

  /**
   * Get command suggestions for autocomplete
   */
  getSuggestions(input: string): Command[] {
    if (!input.startsWith('/')) {
      return []
    }

    const query = input.slice(1).toLowerCase()

    if (query === '') {
      // Return all commands
      return this.getAll().filter((cmd) => cmd.enabled)
    }

    // Return matching commands
    return this.search(query).filter((cmd) => cmd.enabled)
  }
}

// Singleton instance
export const commandService = new CommandServiceImpl()
