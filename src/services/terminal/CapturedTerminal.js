/**
 * Captured Terminal - Custom pseudo-terminal with output capture
 * Implements VSCode's Pseudoterminal API to capture all terminal output
 */

const vscode = require('vscode');
const { spawn } = require('child_process');
const os = require('os');

class CapturedTerminal {
    constructor(name = 'Oropendola AI') {
        this.name = name;
        this.outputBuffer = [];
        this.maxBufferSize = 1000; // Keep last 1000 lines
        this.process = null;

        // Create event emitters for pseudo-terminal
        this.writeEmitter = new vscode.EventEmitter();
        this.closeEmitter = new vscode.EventEmitter();

        this.onDidWrite = this.writeEmitter.event;
        this.onDidClose = this.closeEmitter.event;
    }

    /**
     * Open the pseudo-terminal
     * Called by VS Code when terminal is created
     */
    open(initialDimensions) {
        console.log('🖥️ [CapturedTerminal] Opening terminal:', this.name);

        // Determine shell based on OS
        const shell = os.platform() === 'win32' ? 'cmd.exe' : process.env.SHELL || '/bin/bash';
        const args = os.platform() === 'win32' ? [] : [];

        // Spawn shell process
        this.process = spawn(shell, args, {
            cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd(),
            env: { ...process.env, TERM: 'xterm-256color' }
        });

        // Capture stdout
        this.process.stdout.on('data', data => {
            const text = data.toString();
            this._captureOutput(text);
            this.writeEmitter.fire(text);
        });

        // Capture stderr
        this.process.stderr.on('data', data => {
            const text = data.toString();
            this._captureOutput(text);
            this.writeEmitter.fire(text);
        });

        // Handle process exit
        this.process.on('exit', code => {
            console.log('🖥️ [CapturedTerminal] Process exited with code:', code);
            this.closeEmitter.fire(code || 0);
        });

        console.log('✅ [CapturedTerminal] Terminal opened successfully');
    }

    /**
     * Close the terminal
     */
    close() {
        if (this.process) {
            this.process.kill();
            this.process = null;
        }
    }

    /**
     * Handle input from user
     * @param {string} data - Input data
     */
    handleInput(data) {
        if (this.process && this.process.stdin) {
            this.process.stdin.write(data);
        }
    }

    /**
     * Capture output to buffer
     * @param {string} text - Output text
     * @private
     */
    _captureOutput(text) {
        const lines = text.split('\\n');

        for (const line of lines) {
            if (line.trim()) {
                this.outputBuffer.push({
                    text: line,
                    timestamp: new Date().toISOString()
                });
            }
        }

        // Trim buffer if too large
        if (this.outputBuffer.length > this.maxBufferSize) {
            this.outputBuffer = this.outputBuffer.slice(-this.maxBufferSize);
        }
    }

    /**
     * Get recent output lines
     * @param {number} lines - Number of lines to retrieve (default: 50)
     * @returns {Array} Array of output lines
     */
    getRecentOutput(lines = 50) {
        return this.outputBuffer.slice(-lines);
    }

    /**
     * Get all captured output
     * @returns {Array} All output lines
     */
    getAllOutput() {
        return this.outputBuffer;
    }

    /**
     * Clear output buffer
     */
    clearBuffer() {
        this.outputBuffer = [];
    }

    /**
     * Search output for pattern
     * @param {RegExp|string} pattern - Pattern to search for
     * @param {number} maxResults - Maximum results (default: 10)
     * @returns {Array} Matching lines
     */
    searchOutput(pattern, maxResults = 10) {
        const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'i');
        const results = [];

        for (const entry of this.outputBuffer) {
            if (regex.test(entry.text)) {
                results.push(entry);
                if (results.length >= maxResults) {break;}
            }
        }

        return results;
    }
}

module.exports = CapturedTerminal;
