import * as vscode from 'vscode';
import { RiskAssessor } from './RiskAssessor';
import type {
  CommandValidationResult,
  RiskLevel,
  CommandValidatorConfig
} from '../types';

/**
 * CommandValidator - Validates and sanitizes shell commands before execution
 * Prevents execution of dangerous or unauthorized commands
 */
export class CommandValidator {
  private riskAssessor: RiskAssessor;
  private allowedCommands: string[];
  private deniedCommands: string[];
  private commandTimeout: number;
  private requireConfirmation: boolean;

  constructor() {
    this.riskAssessor = new RiskAssessor();
    this.allowedCommands = [];
    this.deniedCommands = [];
    this.commandTimeout = 120;
    this.requireConfirmation = true;
    this.updateConfiguration();
  }

  /**
   * Update configuration from VS Code settings
   */
  updateConfiguration(): void {
    const config = vscode.workspace.getConfiguration('oropendola');

    this.allowedCommands = config.get<string[]>('allowedCommands', [
      'git log',
      'git diff',
      'git show',
      'git status',
      'npm list',
      'npm --version',
      'node --version',
      'ls',
      'pwd',
      'cat',
      'echo'
    ]);

    this.deniedCommands = config.get<string[]>('deniedCommands', [
      'rm -rf',
      'sudo',
      'shutdown',
      'reboot',
      'mkfs',
      'dd',
      'fork bomb',
      ':(){ :|:& };:',
      'chmod 777',
      'chown',
      'kill -9',
      'killall'
    ]);

    this.commandTimeout = config.get<number>('commandExecutionTimeout', 120); // seconds
    this.requireConfirmation = config.get<boolean>('commandRequireConfirmation', true);
  }

  /**
   * Validate a command before execution
   * @param command - The command to validate
   * @returns Validation result
   */
  async validate(command: string): Promise<CommandValidationResult> {
    if (!command || typeof command !== 'string') {
      return {
        allowed: false,
        requiresConfirmation: false,
        reason: 'Invalid command format',
        riskLevel: 'high',
        sanitized: ''
      };
    }

    const trimmedCommand = command.trim();

    // Check if command is in denied list
    const isDenied = this.deniedCommands.some(denied =>
      trimmedCommand.toLowerCase().includes(denied.toLowerCase())
    );

    if (isDenied) {
      return {
        allowed: false,
        requiresConfirmation: false,
        reason: 'Command is in the denied list',
        riskLevel: 'high',
        sanitized: this.sanitize(trimmedCommand)
      };
    }

    // Assess risk level
    const riskAssessment = this.riskAssessor.assess(trimmedCommand);

    // Check if command is in allowed list
    const isAllowed = this.allowedCommands.some(allowed =>
      trimmedCommand.toLowerCase().startsWith(allowed.toLowerCase())
    );

    if (isAllowed) {
      return {
        allowed: true,
        requiresConfirmation: false,
        reason: 'Command is in the allowed list',
        riskLevel: riskAssessment.level,
        sanitized: this.sanitize(trimmedCommand)
      };
    }

    // Unknown command - requires user confirmation based on risk
    const requiresConfirmation = this.requireConfirmation || riskAssessment.level !== 'low';

    return {
      allowed: requiresConfirmation, // Will require confirmation
      requiresConfirmation: true,
      reason: riskAssessment.reason,
      riskLevel: riskAssessment.level,
      sanitized: this.sanitize(trimmedCommand)
    };
  }

  /**
   * Get timeout for command execution
   * @param command - The command
   * @returns Timeout in milliseconds (0 = no timeout)
   */
  getTimeout(command: string): number {
    if (this.commandTimeout === 0) {
      return 0; // No timeout
    }

    // Some commands might need longer timeouts
    const longRunningCommands = ['npm install', 'npm ci', 'git clone', 'docker build'];
    const needsLongerTimeout = longRunningCommands.some(cmd =>
      command.toLowerCase().includes(cmd)
    );

    if (needsLongerTimeout) {
      return this.commandTimeout * 3 * 1000; // 3x timeout for long-running commands
    }

    return this.commandTimeout * 1000; // Convert to milliseconds
  }

  /**
   * Sanitize command to prevent injection attacks
   * @param command - The command to sanitize
   * @returns Sanitized command
   */
  sanitize(command: string): string {
    // Remove potentially dangerous characters and patterns
    let sanitized = command.trim();

    // Remove command chaining attempts (except for safe pipes)
    const dangerousPatterns: RegExp[] = [
      /;\s*(?!$)/g,  // Semicolon command chaining
      /&&\s*(?!$)/g, // AND command chaining
      /\|\|/g,       // OR command chaining
      /`[^`]*`/g,    // Backtick command substitution
      /\$\([^)]*\)/g // $() command substitution
    ];

    dangerousPatterns.forEach(pattern => {
      if (pattern.test(sanitized)) {
        console.warn(`[CommandValidator] Removed dangerous pattern from command: ${pattern}`);
      }
      sanitized = sanitized.replace(pattern, '');
    });

    return sanitized;
  }

  /**
   * Request user confirmation for a command
   * @param command - The command
   * @param validationResult - The validation result
   * @returns Whether user approved
   */
  async requestConfirmation(
    command: string,
    validationResult: CommandValidationResult
  ): Promise<boolean> {
    const riskEmoji: Record<RiskLevel, string> = {
      low: '✅',
      medium: '⚠️',
      high: '🔴'
    };

    const emoji = riskEmoji[validationResult.riskLevel] || '❓';

    let message = `${emoji} Execute command?\n\n${command}\n\n`;
    message += `Risk Level: ${validationResult.riskLevel.toUpperCase()}\n`;
    message += `Reason: ${validationResult.reason}`;

    const options = ['Execute', 'Cancel', 'Always Allow'];
    const choice = await vscode.window.showWarningMessage(
      message,
      { modal: true },
      ...options
    );

    if (choice === 'Always Allow') {
      // Add to allowed commands
      await this.addToAllowedCommands(command);
      return true;
    }

    return choice === 'Execute';
  }

  /**
   * Add command to allowed list
   * @param command - The command to allow
   */
  private async addToAllowedCommands(command: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('oropendola');
    const currentAllowed = config.get<string[]>('allowedCommands', []);

    // Extract base command (first word)
    const baseCommand = command.trim().split(' ')[0];

    if (!currentAllowed.includes(baseCommand)) {
      currentAllowed.push(baseCommand);
      await config.update('allowedCommands', currentAllowed, vscode.ConfigurationTarget.Global);
      this.allowedCommands = currentAllowed;

      vscode.window.showInformationMessage(
        `Command "${baseCommand}" added to allowed list`
      );
    }
  }

  /**
   * Validate and execute a command with all safety checks
   * @param command - The command to execute
   * @param executor - The function that executes the command
   * @returns Result from executor
   */
  async validateAndExecute<T>(
    command: string,
    executor: (cmd: string) => Promise<T>
  ): Promise<T> {
    // Validate command
    const validationResult = await this.validate(command);

    if (!validationResult.allowed && !validationResult.requiresConfirmation) {
      throw new Error(`Command blocked: ${validationResult.reason}`);
    }

    // Request confirmation if needed
    if (validationResult.requiresConfirmation) {
      const confirmed = await this.requestConfirmation(command, validationResult);
      if (!confirmed) {
        throw new Error('Command execution cancelled by user');
      }
    }

    // Sanitize command
    const sanitizedCommand = this.sanitize(command);

    // Get timeout
    const timeout = this.getTimeout(sanitizedCommand);

    // Execute with timeout
    try {
      if (timeout > 0) {
        return await this.executeWithTimeout(sanitizedCommand, executor, timeout);
      } else {
        return await executor(sanitizedCommand);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[CommandValidator] Command execution failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Execute command with timeout
   * @param command - The command
   * @param executor - The executor function
   * @param timeout - Timeout in milliseconds
   * @returns Result from executor
   */
  private async executeWithTimeout<T>(
    command: string,
    executor: (cmd: string) => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      executor(command),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Command timed out after ${timeout}ms`)), timeout)
      )
    ]);
  }

  /**
   * Get current configuration
   * @returns Current validator configuration
   */
  getConfiguration(): CommandValidatorConfig {
    return {
      allowedCommands: [...this.allowedCommands],
      deniedCommands: [...this.deniedCommands],
      commandExecutionTimeout: this.commandTimeout,
      requireConfirmation: this.requireConfirmation,
      alwaysAllowList: [] // Could be implemented in future
    };
  }
}
