const vscode = require('vscode');
const axios = require('axios');

class OropendolaInlineCompletionProvider {
    constructor(serverUrl, statusBarItem) {
        this.cache = new Map();
        this.debounceTimer = undefined;
        this.cacheTTL = 30000; // 30 seconds
        this.debounceDelay = 75; // 75ms for responsive feel
        this.serverUrl = serverUrl;
        this.statusBarItem = statusBarItem;
    }

    async provideInlineCompletionItems(document, position, context, token) {
        // Debounce to avoid excessive API calls
        return new Promise((resolve) => {
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
            }

            this.debounceTimer = setTimeout(async () => {
                try {
                    const result = await this.fetchCompletions(document, position, token);
                    resolve(result);
                } catch (error) {
                    console.error('Inline completion error:', error);
                    resolve(null);
                }
            }, this.debounceDelay);
        });
    }

    async fetchCompletions(document, position, token) {
        if (token.isCancellationRequested) return null;

        const line = document.lineAt(position.line);
        const prefix = document.getText(new vscode.Range(new vscode.Position(position.line, 0), position));
        
        // Check cache
        const cacheKey = `${document.uri.fsPath}:${position.line}:${prefix}`;
        const cached = this.cache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
            return cached.completions;
        }

        // Get surrounding context
        const startLine = Math.max(0, position.line - 20);
        const endLine = Math.min(document.lineCount - 1, position.line + 5);
        const contextBefore = document.getText(new vscode.Range(startLine, 0, position.line, position.character));
        const contextAfter = document.getText(new vscode.Range(position.line, position.character, endLine, 999));

        try {
            this.statusBarItem.text = '$(loading~spin) AI completion...';
            this.statusBarItem.show();

            const response = await axios.post(
                `${this.serverUrl}/api/method/ai_assistant.api.endpoints.get_inline_completion`,
                {
                    file_path: document.uri.fsPath,
                    language: document.languageId,
                    prefix: contextBefore,
                    suffix: contextAfter,
                    line: position.line,
                    character: position.character
                },
                {
                    timeout: 5000,
                    headers: { 'Content-Type': 'application/json' }
                }
            );

            this.statusBarItem.text = '$(check) Oropendola AI';
            setTimeout(() => this.statusBarItem.hide(), 2000);

            if (response.data?.message?.completions && Array.isArray(response.data.message.completions)) {
                const completions = response.data.message.completions.map((text) => {
                    const item = new vscode.InlineCompletionItem(text);
                    item.range = new vscode.Range(position, position);
                    return item;
                });

                // Cache the result
                this.cache.set(cacheKey, {
                    prefix,
                    completions,
                    timestamp: Date.now()
                });

                // Clean old cache entries
                this.cleanCache();

                return completions;
            }

            return null;
        } catch (error) {
            this.statusBarItem.text = '$(error) Completion failed';
            setTimeout(() => this.statusBarItem.hide(), 3000);
            console.error('Inline completion request failed:', error);
            return null;
        }
    }

    cleanCache() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.cacheTTL) {
                this.cache.delete(key);
            }
        }
    }

    dispose() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.cache.clear();
    }
}

module.exports = { OropendolaInlineCompletionProvider };
