const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

/**
 * DiffPreviewManager - Claude Code-style Inline Diff Editing
 * Shows file changes in VS Code's built-in diff editor
 * Provides before/after comparison with syntax highlighting
 */
class DiffPreviewManager {
    constructor() {
        this._previewDocuments = new Map(); // Track temporary preview documents
    }

    /**
     * Show diff preview for a file change
     * @param {string} filePath - Path to the file being modified
     * @param {string} originalContent - Original file content (or empty for new files)
     * @param {string} newContent - New/modified content
     * @param {string} changeType - 'create', 'modify', or 'delete'
     * @returns {Promise<void>}
     */
    async showDiff(filePath, originalContent, newContent, changeType = 'modify') {
        try {
            const fileName = path.basename(filePath);
            const language = this._detectLanguage(filePath);

            // For new files, show empty -> new content
            if (changeType === 'create') {
                originalContent = '';
            }

            // For deletions, show current -> empty
            if (changeType === 'delete') {
                newContent = '';
            }

            // Create temporary documents for comparison
            const originalDoc = await vscode.workspace.openTextDocument({
                content: originalContent,
                language: language
            });

            const modifiedDoc = await vscode.workspace.openTextDocument({
                content: newContent,
                language: language
            });

            // Store references for cleanup
            this._previewDocuments.set(filePath, {
                original: originalDoc.uri,
                modified: modifiedDoc.uri
            });

            // Determine title based on change type
            let title;
            switch (changeType) {
                case 'create':
                    title = `Create: ${fileName}`;
                    break;
                case 'modify':
                    title = `Modify: ${fileName}`;
                    break;
                case 'delete':
                    title = `Delete: ${fileName}`;
                    break;
                default:
                    title = `Preview: ${fileName}`;
            }

            // Open diff editor
            await vscode.commands.executeCommand(
                'vscode.diff',
                originalDoc.uri,
                modifiedDoc.uri,
                title,
                {
                    preview: true,
                    preserveFocus: false
                }
            );

            console.log(`✅ Diff preview shown for: ${filePath}`);

        } catch (error) {
            console.error('❌ Failed to show diff preview:', error);
            vscode.window.showErrorMessage(`Failed to show diff preview: ${error.message}`);
        }
    }

    /**
     * Show multiple file diffs in sequence
     * @param {Array} changes - Array of {path, originalContent, newContent, type}
     */
    async showMultipleDiffs(changes) {
        console.log(`📝 Showing ${changes.length} file diff(s)...`);

        for (let i = 0; i < changes.length; i++) {
            const change = changes[i];
            await this.showDiff(
                change.path,
                change.originalContent || '',
                change.newContent,
                change.type
            );

            // Small delay between opening multiple diffs
            if (i < changes.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }
    }

    /**
     * Open file at specific location (for navigation)
     * @param {string} filePath - File path
     * @param {number} line - Line number (0-indexed)
     */
    async openFileAtLine(filePath, line = 0) {
        try {
            const uri = vscode.Uri.file(filePath);
            const document = await vscode.workspace.openTextDocument(uri);
            const editor = await vscode.window.showTextDocument(document);

            // Move cursor to specified line
            const position = new vscode.Position(line, 0);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(new vscode.Range(position, position));

        } catch (error) {
            console.error('Failed to open file:', error);
        }
    }

    /**
     * Cleanup temporary preview documents
     */
    cleanup() {
        this._previewDocuments.clear();
        console.log('🧹 Cleaned up diff preview documents');
    }

    /**
     * Detect language ID from file path
     * @private
     */
    _detectLanguage(filePath) {
        const ext = path.extname(filePath).toLowerCase();

        const languageMap = {
            '.js': 'javascript',
            '.jsx': 'javascriptreact',
            '.ts': 'typescript',
            '.tsx': 'typescriptreact',
            '.py': 'python',
            '.java': 'java',
            '.cpp': 'cpp',
            '.c': 'c',
            '.h': 'c',
            '.hpp': 'cpp',
            '.cs': 'csharp',
            '.go': 'go',
            '.rs': 'rust',
            '.php': 'php',
            '.rb': 'ruby',
            '.swift': 'swift',
            '.kt': 'kotlin',
            '.json': 'json',
            '.xml': 'xml',
            '.html': 'html',
            '.css': 'css',
            '.scss': 'scss',
            '.md': 'markdown',
            '.yml': 'yaml',
            '.yaml': 'yaml',
            '.sh': 'shellscript',
            '.bash': 'shellscript',
            '.sql': 'sql'
        };

        return languageMap[ext] || 'plaintext';
    }

    /**
     * Get current file content from workspace
     * @param {string} filePath - File path
     * @returns {Promise<string>} File content or empty string if doesn't exist
     */
    async getCurrentFileContent(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                return fs.readFileSync(filePath, 'utf8');
            }
            return '';
        } catch (error) {
            console.warn(`⚠️ Could not read file: ${filePath}`, error.message);
            return '';
        }
    }

    /**
     * Show diff for a pending change by reading current file
     * @param {Object} change - {path, content, type}
     */
    async showDiffFromChange(change) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showWarningMessage('No workspace folder open');
            return;
        }

        const workspacePath = workspaceFolders[0].uri.fsPath;
        const fullPath = path.isAbsolute(change.path)
            ? change.path
            : path.join(workspacePath, change.path);

        // Get current content (empty if new file)
        const currentContent = await this.getCurrentFileContent(fullPath);

        // Show diff
        await this.showDiff(
            change.path,
            currentContent,
            change.content,
            change.type
        );
    }
}

module.exports = DiffPreviewManager;
