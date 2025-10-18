const vscode = require('vscode');

/**
 * Oropendola Edit Mode
 * Allows inline editing with AI-powered diff preview
 * Activated with Cmd+I (Continue.dev style)
 */
class EditMode {
    constructor(oropendolaProvider) {
        this.provider = oropendolaProvider;
        this.activeEdit = null;
        this.editHistory = [];
    }

    /**
     * Start edit mode on selected code
     */
    async startEdit() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor');
            return;
        }

        const selection = editor.selection;
        if (selection.isEmpty) {
            vscode.window.showWarningMessage('Please select code to edit');
            return;
        }

        const selectedCode = editor.document.getText(selection);
        const language = editor.document.languageId;

        // Show input box for instruction
        const instruction = await vscode.window.showInputBox({
            prompt: '✨ What would you like to do with this code?',
            placeHolder: 'e.g., Add error handling, Refactor to use async/await, Add comments',
            validateInput: (text) => {
                return text.trim().length === 0 ? 'Please enter an instruction' : null;
            }
        });

        if (!instruction) {
            return;
        }

        // Generate and show diff
        await this._generateAndShowDiff(editor, selection, selectedCode, instruction, language);
    }

    /**
     * Generate AI-powered code changes and show diff
     * @private
     */
    async _generateAndShowDiff(editor, selection, originalCode, instruction, language) {
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: '🐦 Oropendola is generating code changes...',
                cancellable: true
            }, async (progress, token) => {
                // Build prompt for code editing
                const prompt = this._buildEditPrompt(originalCode, instruction, language);

                progress.report({ increment: 20, message: 'Analyzing code...' });

                // Get AI response with streaming
                let modifiedCode = '';
                const onToken = (chunk) => {
                    modifiedCode += chunk;
                };

                try {
                    await this.provider.chat(prompt, {
                        activeFile: {
                            path: editor.document.fileName,
                            language: language
                        }
                    }, onToken);
                } catch (error) {
                    throw new Error(`Failed to generate changes: ${error.message}`);
                }

                if (token.isCancellationRequested) {
                    return;
                }

                progress.report({ increment: 50, message: 'Preparing diff...' });

                // Clean the response
                modifiedCode = this._cleanResponse(modifiedCode, language);

                if (!modifiedCode || modifiedCode.trim() === '') {
                    throw new Error('No valid code changes generated');
                }

                progress.report({ increment: 30, message: 'Showing diff...' });

                // Show diff and handle user action
                await this._showDiffEditor(
                    editor,
                    selection,
                    originalCode,
                    modifiedCode,
                    instruction,
                    language
                );
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Edit failed: ${error.message}`);
        }
    }

    /**
     * Build prompt for code editing
     * @private
     */
    _buildEditPrompt(code, instruction, language) {
        return `You are a code editor. Edit the following ${language} code according to the instruction.

**IMPORTANT**: Return ONLY the modified code. No explanations, no markdown formatting, no comments about the changes, just the raw code.

Original Code:
\`\`\`${language}
${code}
\`\`\`

Instruction: ${instruction}

Modified Code:`;
    }

    /**
     * Clean AI response to extract pure code
     * @private
     */
    _cleanResponse(response, language) {
        let cleaned = response.trim();

        // Remove markdown code blocks
        const codeBlockRegex = new RegExp(`\`\`\`${language}\\n?([\\s\\S]*?)\`\`\``, 'g');
        const match = codeBlockRegex.exec(cleaned);
        if (match) {
            cleaned = match[1];
        } else {
            // Try generic code block
            const genericMatch = /```\n?([\s\S]*?)```/g.exec(cleaned);
            if (genericMatch) {
                cleaned = genericMatch[1];
            }
        }

        // Remove any leading/trailing explanations
        const lines = cleaned.split('\n');
        const codeLines = [];
        let inCode = false;

        for (const line of lines) {
            // Skip explanation lines
            if (!inCode && (
                line.toLowerCase().startsWith('here') ||
                line.toLowerCase().startsWith('the') ||
                line.toLowerCase().startsWith('i\'ve') ||
                line.toLowerCase().startsWith('note:')
            )) {
                continue;
            }

            inCode = true;
            codeLines.push(line);
        }

        return codeLines.join('\n').trim();
    }

    /**
     * Show diff editor and handle user decision
     * @private
     */
    async _showDiffEditor(editor, selection, original, modified, instruction, language) {
        try {
            // Create temporary documents for diff view
            const originalUri = vscode.Uri.parse(`oropendola-original:${editor.document.fileName}.original.${language}`);
            const modifiedUri = vscode.Uri.parse(`oropendola-modified:${editor.document.fileName}.modified.${language}`);

            // Register text document content providers
            const originalProvider = new TextDocumentContentProvider(original);
            const modifiedProvider = new TextDocumentContentProvider(modified);

            const originalDisposable = vscode.workspace.registerTextDocumentContentProvider('oropendola-original', originalProvider);
            const modifiedDisposable = vscode.workspace.registerTextDocumentContentProvider('oropendola-modified', modifiedProvider);

            // Show diff
            await vscode.commands.executeCommand(
                'vscode.diff',
                originalUri,
                modifiedUri,
                `🐦 Oropendola Edit: ${instruction.substring(0, 50)}${instruction.length > 50 ? '...' : ''}`
            );

            // Prompt user to accept/reject changes
            const action = await vscode.window.showInformationMessage(
                `Apply these changes to ${editor.document.fileName}?`,
                { modal: false },
                'Accept ✅',
                'Reject ❌',
                'Try Again 🔄'
            );

            // Clean up content providers
            originalDisposable.dispose();
            modifiedDisposable.dispose();

            // Handle user action
            if (action === 'Accept ✅') {
                await this._applyChanges(editor, selection, modified);

                // Save to history
                this.editHistory.push({
                    instruction,
                    original,
                    modified,
                    timestamp: new Date(),
                    applied: true
                });

                vscode.window.showInformationMessage('✅ Changes applied successfully!');
            } else if (action === 'Try Again 🔄') {
                // Retry with potentially refined instruction
                const refinedInstruction = await vscode.window.showInputBox({
                    prompt: 'Refine your instruction',
                    value: instruction,
                    placeHolder: 'Try being more specific...'
                });

                if (refinedInstruction) {
                    await this._generateAndShowDiff(editor, selection, original, refinedInstruction, language);
                }
            } else {
                vscode.window.showInformationMessage('Changes discarded');
            }

        } catch (error) {
            console.error('Diff view error:', error);
            throw error;
        }
    }

    /**
     * Apply changes to editor
     * @private
     */
    async _applyChanges(editor, selection, newCode) {
        const success = await editor.edit(editBuilder => {
            editBuilder.replace(selection, newCode);
        });

        if (!success) {
            throw new Error('Failed to apply changes to document');
        }

        // Format the document if formatter is available
        try {
            await vscode.commands.executeCommand('editor.action.formatDocument');
        } catch (error) {
            // Formatting failed, but changes are applied
            console.log('Document formatting skipped:', error.message);
        }
    }

    /**
     * Quick edit - simpler flow for small changes
     */
    async quickEdit(instruction) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor');
            return;
        }

        const selection = editor.selection;
        if (selection.isEmpty) {
            vscode.window.showWarningMessage('Please select code to edit');
            return;
        }

        const selectedCode = editor.document.getText(selection);
        const language = editor.document.languageId;

        await this._generateAndShowDiff(editor, selection, selectedCode, instruction, language);
    }

    /**
     * Get edit history
     */
    getHistory() {
        return this.editHistory;
    }

    /**
     * Clear edit history
     */
    clearHistory() {
        this.editHistory = [];
    }
}

/**
 * Text Document Content Provider for diff view
 */
class TextDocumentContentProvider {
    constructor(content) {
        this.content = content;
    }

    provideTextDocumentContent(_uri) {
        return this.content;
    }
}

module.exports = EditMode;
