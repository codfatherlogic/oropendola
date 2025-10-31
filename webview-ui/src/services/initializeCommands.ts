/**
 * Initialize Built-in Commands
 *
 * Registers all built-in commands with the command service.
 */

import { commandService } from './CommandService'
import { createBuiltInCommands } from '../config/built-in-commands'
import { CommandHandlers } from '../types/commands'

let initialized = false

export function initializeBuiltInCommands(handlers: CommandHandlers): void {
  if (initialized) {
    console.warn('[Commands] Already initialized')
    return
  }

  const commands = createBuiltInCommands(handlers)

  commands.forEach((command) => {
    commandService.register(command)
  })

  initialized = true
  console.log(`[Commands] Registered ${commands.length} built-in commands`)
}

export function isInitialized(): boolean {
  return initialized
}
