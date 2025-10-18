const vscode = require('vscode');

/**
 * Oropendola Autocomplete Provider
 * Provides inline code completions as you type (Tab completion)
 * Based on Continue.dev's autocomplete architecture
 */
class OropendolaAutocompleteProvider {
    constructor(oropendolaProvider) {
        this.provider = oropendolaProvider;
        this.debounceTimer = null;
        this.cache = new Map();
        this.isEnabled = true;
        this.debounceDelay = 200; // 200ms delay after typing stops
        this.maxCacheSize = 50;
        this.cacheTTL = 300000; // 5 minutes

        // Clean up cache periodically
        setInterval(() => this.cleanCache(), 60000); // Every minute
    }

    /**
     * Provide inline completion items
     * @param {vscode.TextDocument} document - Current document
     * @param {vscode.Position} position - Cursor position
     * @param {vscode.InlineCompletionContext} context - Completion context
     * @param {vscode.CancellationToken} token - Cancellation token
     * @returns {Promise<vscode.InlineCompletionItem[]>}
     */
    async provideInlineCompletionItems(document, position, context, token) {
        if (!this.isEnabled || !this.provider) {
            return [];
        }

        // Don't trigger in certain scenarios
        if (this.shouldSkipCompletion(document, position)) {
            return [];
        }

        // Debounce requests to avoid spamming the API
        return new Promise((resolve) => {
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
            }

            this.debounceTimer = setTimeout(async () => {
                try {
                    // Check if request was cancelled
                    if (token.isCancellationRequested) {
                        resolve([]);
                        return;
                    }

                    // Get context around cursor
                    const prefix = this._getPrefix(document, position);
                    const suffix = this._getSuffix(document, position);

                    // Generate cache key
                    const cacheKey = this._generateCacheKey(document, position, prefix);

                    // Check cache first
                    const cachedResult = this.cache.get(cacheKey);
                    if (cachedResult && Date.now() - cachedResult.timestamp < this.cacheTTL) {
                        resolve(cachedResult.items);
                        return;
                    }

                    // Get completion from backend
                    const completion = await this._getCompletion(document, prefix, suffix, token);

                    if (!completion || completion.trim() === '' || token.isCancellationRequested) {
                        resolve([]);
                        return;
                    }

                    // Create inline completion item
                    const items = [
                        new vscode.InlineCompletionItem(
                            completion,
                            new vscode.Range(position, position)
                        )
                    ];

                    // Cache result
                    this.cache.set(cacheKey, {
                        items,
                        timestamp: Date.now()
                    });

                    resolve(items);
                } catch (error) {
                    console.error('Autocomplete error:', error);
                    resolve([]);
                }
            }, this.debounceDelay);
        });
    }

    /**
     * Get code completion from backend
     * @private
     */
    async _getCompletion(document, prefix, suffix, _token) {
        try {
            // Build Fill-In-Middle (FIM) prompt
            const prompt = this._buildFIMPrompt(document, prefix, suffix);

            // Call backend with optimized parameters for autocomplete
            const response = await this.provider.chat(prompt, {
                activeFile: {
                    path: document.fileName,
                    language: document.languageId,
                    content: '' // Don't send full file content for speed
                }
            }, null); // Non-streaming for autocomplete

            // Extract and clean completion
            return this._cleanCompletion(response);
        } catch (error) {
            console.error('Completion request failed:', error);
            return null;
        }
    }

    /**
     * Build Fill-In-Middle prompt
     * @private
     */
    _buildFIMPrompt(document, prefix, suffix) {
        const language = document.languageId;

        return `Complete the following ${language} code. Provide ONLY the completion, no explanations or markdown.

File: ${document.fileName}

Code before cursor:
${prefix}

Code after cursor:
${suffix}

Complete the code at the cursor position:`;
    }

    /**
     * Clean and validate completion
     * @private
     */
    _cleanCompletion(response) {
        if (!response) return null;

        let cleaned = response.trim();

        // Remove markdown code blocks if present
        cleaned = cleaned.replace(/```[\w]*\n?/g, '');
        cleaned = cleaned.replace(/```/g, '');

        // Remove explanatory text (anything after a newline followed by explanation patterns)
        const explanationPatterns = [
            /\n\s*This code/i,
            /\n\s*The above/i,
            /\n\s*Explanation:/i,
            /\n\s*Note:/i
        ];

        for (const pattern of explanationPatterns) {
            const match = cleaned.match(pattern);
            if (match) {
                cleaned = cleaned.substring(0, match.index);
            }
        }

        // Limit completion length (max 3 lines for inline suggestions)
        const lines = cleaned.split('\n');
        if (lines.length > 3) {
            cleaned = lines.slice(0, 3).join('\n');
        }

        return cleaned.trim();
    }

    /**
     * Get text before cursor (prefix)
     * @private
     */
    _getPrefix(document, position) {
        // Get up to 20 lines before cursor, max 1500 chars
        const startLine = Math.max(0, position.line - 20);
        const range = new vscode.Range(startLine, 0, position.line, position.character);
        const text = document.getText(range);

        // Take last 1500 chars for efficiency
        return text.length > 1500 ? text.slice(-1500) : text;
    }

    /**
     * Get text after cursor (suffix)
     * @private
     */
    _getSuffix(document, position) {
        // Get up to 10 lines after cursor, max 500 chars
        const endLine = Math.min(document.lineCount, position.line + 10);
        const range = new vscode.Range(position.line, position.character, endLine, 0);
        const text = document.getText(range);

        // Take first 500 chars
        return text.length > 500 ? text.slice(0, 500) : text;
    }

    /**
     * Generate cache key
     * @private
     */
    _generateCacheKey(document, position, prefix) {
        // Use file path, position, and prefix hash for caching
        const prefixHash = this._simpleHash(prefix);
        return `${document.fileName}:${position.line}:${position.character}:${prefixHash}`;
    }

    /**
     * Simple hash function for strings
     * @private
     */
    _simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    /**
     * Check if completion should be skipped
     * @private
     */
    shouldSkipCompletion(document, position) {
        const line = document.lineAt(position.line);
        const textBeforeCursor = line.text.substring(0, position.character);

        // Skip in comments
        if (this._isInComment(document, position)) {
            return true;
        }

        // Skip in strings (unless it's a template string)
        if (this._isInString(textBeforeCursor) && !this._isInTemplateString(textBeforeCursor)) {
            return true;
        }

        // Skip if line is only whitespace
        if (textBeforeCursor.trim() === '') {
            return true;
        }

        // Skip if cursor is in the middle of a word
        if (this._isInMiddleOfWord(document, position)) {
            return true;
        }

        return false;
    }

    /**
     * Check if position is in a comment
     * @private
     */
    _isInComment(document, position) {
        const line = document.lineAt(position.line).text;
        const textBeforeCursor = line.substring(0, position.character);

        // Check for single-line comments
        const singleLineComment = {
            'javascript': '//',
            'typescript': '//',
            'python': '#',
            'java': '//',
            'cpp': '//',
            'csharp': '//',
            'go': '//',
            'rust': '//',
            'php': '//'
        };

        const commentSymbol = singleLineComment[document.languageId];
        if (commentSymbol && textBeforeCursor.includes(commentSymbol)) {
            return true;
        }

        return false;
    }

    /**
     * Check if position is in a string
     * @private
     */
    _isInString(text) {
        const singleQuotes = (text.match(/'/g) || []).length;
        const doubleQuotes = (text.match(/"/g) || []).length;
        return (singleQuotes % 2 !== 0) || (doubleQuotes % 2 !== 0);
    }

    /**
     * Check if position is in a template string
     * @private
     */
    _isInTemplateString(text) {
        const backticks = (text.match(/`/g) || []).length;
        return backticks % 2 !== 0;
    }

    /**
     * Check if cursor is in the middle of a word
     * @private
     */
    _isInMiddleOfWord(document, position) {
        const line = document.lineAt(position.line).text;
        const charAfter = line.charAt(position.character);

        // If there's an alphanumeric character right after cursor, we're in middle of word
        return /[a-zA-Z0-9_]/.test(charAfter);
    }

    /**
     * Clean expired cache entries
     * @private
     */
    cleanCache() {
        const now = Date.now();
        let removed = 0;

        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.cacheTTL) {
                this.cache.delete(key);
                removed++;
            }
        }

        // If cache is still too large, remove oldest entries
        if (this.cache.size > this.maxCacheSize) {
            const entries = Array.from(this.cache.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp);

            const toRemove = entries.slice(0, this.cache.size - this.maxCacheSize);
            toRemove.forEach(([key]) => this.cache.delete(key));
            removed += toRemove.length;
        }

        if (removed > 0) {
            console.log(`🧹 Cleaned ${removed} autocomplete cache entries`);
        }
    }

    /**
     * Enable/disable autocomplete
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        console.log(`Autocomplete ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('Autocomplete cache cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxCacheSize,
            enabled: this.isEnabled
        };
    }
}

module.exports = OropendolaAutocompleteProvider;
