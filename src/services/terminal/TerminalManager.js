/**
 * Terminal Manager
 * Manages captured terminals and provides terminal output to AI context
 */

const vscode = require('vscode');
const CapturedTerminal = require('./CapturedTerminal');

class TerminalManager {
    constructor() {
        this.terminals = new Map();
        this.activeTerminalId = null;
    }

    /**
     * Create a new captured terminal
     * @param {string} name - Terminal name
     * @returns {vscode.Terminal} VS Code terminal instance
     */
    createTerminal(name = 'Oropendola AI') {
        const capturedTerminal = new CapturedTerminal(name);
        const terminalId = `${name}-${Date.now()}`;

        // Create VS Code terminal with custom pseudo-terminal
        const terminal = vscode.window.createTerminal({
            name: name,
            pty: capturedTerminal
        });

        // Store terminal
        this.terminals.set(terminalId, {
            vscodeTerminal: terminal,
            capturedTerminal: capturedTerminal,
            name: name,
            createdAt: new Date()
        });

        this.activeTerminalId = terminalId;

        console.log(`✅ [TerminalManager] Created captured terminal: ${name} (${terminalId})`);

        return terminal;
    }

    /**
     * Get or create the Oropendola AI terminal
     * @returns {vscode.Terminal} Terminal instance
     */
    getOrCreateTerminal() {
        // Look for existing Oropendola terminal
        let existingTerminal = null;

        for (const [id, terminalData] of this.terminals.entries()) {
            if (terminalData.name === 'Oropendola AI') {
                existingTerminal = terminalData.vscodeTerminal;
                this.activeTerminalId = id;
                break;
            }
        }

        if (existingTerminal) {
            return existingTerminal;
        }

        // Create new terminal
        return this.createTerminal('Oropendola AI');
    }

    /**
     * Get captured output from active terminal
     * @param {number} lines - Number of lines to retrieve
     * @returns {Array|null} Output lines or null if no terminal
     */
    getActiveTerminalOutput(lines = 50) {
        if (!this.activeTerminalId) {
            return null;
        }

        const terminalData = this.terminals.get(this.activeTerminalId);
        if (!terminalData) {
            return null;
        }

        return terminalData.capturedTerminal.getRecentOutput(lines);
    }

    /**
     * Get terminal info for context
     * @returns {Object} Terminal information
     */
    getTerminalContext() {
        const activeTerminal = this.activeTerminalId
            ? this.terminals.get(this.activeTerminalId)
            : null;

        const output = activeTerminal
            ? activeTerminal.capturedTerminal.getRecentOutput(50)
            : [];

        return {
            hasActiveTerminal: !!activeTerminal,
            terminalName: activeTerminal?.name,
            terminalCount: this.terminals.size,
            recentOutput: output.map(entry => entry.text),
            lastCommand: this._extractLastCommand(output)
        };
    }

    /**
     * Extract last command from output
     * @param {Array} output - Output lines
     * @returns {string|null} Last command or null
     * @private
     */
    _extractLastCommand(output) {
        if (!output || output.length === 0) {
            return null;
        }

        // Look for lines that look like commands (usually start with prompt)
        for (let i = output.length - 1; i >= 0; i--) {
            const line = output[i].text;
            // Simple heuristic: line starts with $ or > or contains common command words
            if (line.trim().match(/^[$>%#]/) || line.includes('npm ') || line.includes('git ')) {
                return line.trim();
            }
        }

        return null;
    }

    /**
     * Search terminal output
     * @param {string|RegExp} pattern - Search pattern
     * @param {number} maxResults - Maximum results
     * @returns {Array} Matching lines
     */
    searchOutput(pattern, maxResults = 10) {
        if (!this.activeTerminalId) {
            return [];
        }

        const terminalData = this.terminals.get(this.activeTerminalId);
        if (!terminalData) {
            return [];
        }

        return terminalData.capturedTerminal.searchOutput(pattern, maxResults);
    }

    /**
     * Clear terminal output buffer
     */
    clearBuffer() {
        if (!this.activeTerminalId) {
            return;
        }

        const terminalData = this.terminals.get(this.activeTerminalId);
        if (terminalData) {
            terminalData.capturedTerminal.clearBuffer();
        }
    }

    /**
     * Dispose all terminals
     */
    dispose() {
        for (const [id, terminalData] of this.terminals.entries()) {
            terminalData.capturedTerminal.close();
        }
        this.terminals.clear();
    }
}

// Export singleton instance
module.exports = new TerminalManager();
