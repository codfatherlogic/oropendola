/**
 * Terminal Service
 * Captures terminal output for @terminal mentions
 */

import * as vscode from 'vscode'

export interface TerminalInfo {
	id: string
	name: string
	processId?: number
	creationOptions?: vscode.TerminalOptions
}

export class TerminalService {
	private terminals: Map<string, vscode.Terminal> = new Map()
	private terminalOutputs: Map<string, string> = new Map()
	private disposables: vscode.Disposable[] = []

	constructor() {
		this.initialize()
	}

	private initialize(): void {
		// Track existing terminals
		vscode.window.terminals.forEach(terminal => {
			this.trackTerminal(terminal)
		})

		// Track new terminals
		this.disposables.push(
			vscode.window.onDidOpenTerminal(terminal => {
				this.trackTerminal(terminal)
			})
		)

		// Clean up closed terminals
		this.disposables.push(
			vscode.window.onDidCloseTerminal(terminal => {
				const id = this.getTerminalId(terminal)
				this.terminals.delete(id)
				this.terminalOutputs.delete(id)
			})
		)
	}

	/**
	 * Track a terminal for output capture
	 */
	private trackTerminal(terminal: vscode.Terminal): void {
		const id = this.getTerminalId(terminal)
		this.terminals.set(id, terminal)
	}

	/**
	 * Get unique terminal ID
	 */
	private getTerminalId(terminal: vscode.Terminal): string {
		// Use terminal name + creation time as ID
		return terminal.name
	}

	/**
	 * Get active terminal
	 */
	public getActiveTerminal(): vscode.Terminal | undefined {
		return vscode.window.activeTerminal
	}

	/**
	 * Get all terminals
	 */
	public async getAllTerminals(): Promise<TerminalInfo[]> {
		const terminals = await Promise.all(
			vscode.window.terminals.map(async terminal => ({
				id: this.getTerminalId(terminal),
				name: terminal.name,
				processId: await terminal.processId,
				creationOptions: terminal.creationOptions
			}))
		)
		return terminals
	}

	/**
	 * Get terminal by ID or name
	 */
	public getTerminal(idOrName: string): vscode.Terminal | undefined {
		// Try exact ID match
		if (this.terminals.has(idOrName)) {
			return this.terminals.get(idOrName)
		}

		// Try name match
		return vscode.window.terminals.find(t => t.name === idOrName)
	}

	/**
	 * Get terminal output (simulated - VS Code doesn't provide direct access)
	 * 
	 * Note: VS Code API doesn't provide terminal output access.
	 * This is a placeholder that would need integration with terminal history
	 * or custom terminal implementation.
	 */
	public getTerminalOutput(idOrName: string = 'current'): string {
		if (idOrName === 'current') {
			const activeTerminal = this.getActiveTerminal()
			if (!activeTerminal) {
				return '⚠️  No active terminal'
			}
			idOrName = this.getTerminalId(activeTerminal)
		}

		// Check if we have cached output
		if (this.terminalOutputs.has(idOrName)) {
			return this.terminalOutputs.get(idOrName)!
		}

		// Placeholder message
		const terminal = this.getTerminal(idOrName)
		if (!terminal) {
			return `⚠️  Terminal "${idOrName}" not found`
		}

		return `📟 Terminal: ${terminal.name}\n\nNote: Terminal output capture requires VS Code Terminal API extensions.\nCurrent implementation shows terminal metadata only.\n\nProcess ID: ${terminal.processId || 'N/A'}`
	}

	/**
	 * Format terminal info for AI context
	 */
	public formatTerminalForContext(idOrName: string = 'current'): string {
		const output = this.getTerminalOutput(idOrName)
		
		return `## Terminal Output\n\n${output}`
	}

	/**
	 * Execute command in terminal and capture output
	 * (Placeholder - actual output capture not available in VS Code API)
	 */
	public async executeCommand(command: string, terminalName?: string): Promise<string> {
		let terminal: vscode.Terminal | undefined

		if (terminalName) {
			terminal = this.getTerminal(terminalName)
		} else {
			terminal = this.getActiveTerminal()
		}

		if (!terminal) {
			terminal = vscode.window.createTerminal('Oropendola Command')
		}

		terminal.show()
		terminal.sendText(command)

		// Return placeholder since we can't capture output
		return `✅ Command executed in terminal "${terminal.name}": ${command}\n\nNote: Output capture not available via VS Code API`
	}

	/**
	 * List all terminals with status
	 */
	public async listTerminals(): Promise<string> {
		const terminals = await this.getAllTerminals()
		
		if (terminals.length === 0) {
			return '📟 No terminals open'
		}

		let output = `📟 Open Terminals (${terminals.length}):\n\n`
		
		terminals.forEach((terminal, index) => {
			output += `${index + 1}. ${terminal.name}`
			if (terminal.processId) {
				output += ` (PID: ${terminal.processId})`
			}
			output += '\n'
		})

		const activeTerminal = this.getActiveTerminal()
		if (activeTerminal) {
			output += `\n✅ Active: ${activeTerminal.name}`
		}

		return output
	}

	/**
	 * Dispose of service
	 */
	public dispose(): void {
		this.disposables.forEach(d => d.dispose())
		this.disposables = []
		this.terminals.clear()
		this.terminalOutputs.clear()
	}
}

// Export singleton
export const terminalService = new TerminalService()
