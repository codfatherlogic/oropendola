const vscode = require('vscode');
const { InlineAPI } = require('../api/inline');
const { debounce } = require('../utils/debounce');

/**
 * AI Inline Completion Provider
 * Provides inline code suggestions using backend API
 */
class AIInlineCompletionProvider {
    constructor() {
        this.debounceMs = 200;
        this.disposables = [];

        // Debounced completion function
        this.debouncedGetCompletions = debounce(
            this.getCompletionsInternal.bind(this),
            this.debounceMs
        );
    }

    /**
     * Internal completion fetching
     * @private
     * @param {vscode.TextDocument} document - Document
     * @param {vscode.Position} position - Position
     * @returns {Promise<vscode.InlineCompletionItem[]>}
     */
    async getCompletionsInternal(document, position) {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        if (!workspaceFolder) {return [];}

        const line = document.lineAt(position.line);
        const textBefore = document.getText(
            new vscode.Range(position.with(undefined, 0), position)
        );
        const textAfter = line.text.substring(position.character);

        try {
            const response = await InlineAPI.getCompletion(
                document.uri.fsPath,
                position.line,
                position.character,
                textBefore,
                textAfter,
                document.languageId
            );

            if (!response.success || !response.data) {return [];}

            return response.data.completions.map(completion => ({
                insertText: completion.text,
                range: new vscode.Range(position, position)
            }));
        } catch (error) {
            console.error('Inline completion error:', error);
            return [];
        }
    }

    /**
     * Provide inline completion items
     * @param {vscode.TextDocument} document - Document
     * @param {vscode.Position} position - Position
     * @param {vscode.InlineCompletionContext} context - Context
     * @param {vscode.CancellationToken} token - Cancellation token
     * @returns {Promise<vscode.InlineCompletionItem[]|vscode.InlineCompletionList|undefined>}
     */
    async provideInlineCompletionItems(document, position, context, token) {
        // Skip if user is actively selecting from autocomplete
        if (context.selectedCompletionInfo) {
            return [];
        }

        try {
            const items = await this.debouncedGetCompletions(document, position);
            return items;
        } catch (error) {
            console.error('Inline completion provider error:', error);
            return [];
        }
    }

    /**
     * Dispose provider
     */
    dispose() {
        this.disposables.forEach(d => d.dispose());
    }
}

module.exports = { AIInlineCompletionProvider };
