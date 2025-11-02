/**
 * ToolRepetitionDetector
 *
 * Detects when AI gets stuck in loops by calling the same tool repeatedly.
 * Provides warnings and suggestions to break out of repetitive patterns.
 *
 * Features:
 * - Tracks recent tool calls with parameters
 * - Detects exact repetition (same tool + same params)
 * - Detects pattern repetition (alternating between same tools)
 * - Provides contextual warnings and suggestions
 * - Configurable thresholds
 *
 * Based on Roo-Code's tool repetition detection
 *
 * @author Oropendola Team
 * @date 2025-11-02
 */

/**
 * Calculate similarity between two objects (for parameter comparison)
 * @param {Object} obj1 - First object
 * @param {Object} obj2 - Second object
 * @returns {number} Similarity score 0-1
 */
function calculateObjectSimilarity(obj1, obj2) {
    if (!obj1 || !obj2) {
        return obj1 === obj2 ? 1 : 0;
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length === 0 && keys2.length === 0) {
        return 1;
    }

    const allKeys = new Set([...keys1, ...keys2]);
    let matches = 0;

    for (const key of allKeys) {
        const val1 = obj1[key];
        const val2 = obj2[key];

        if (val1 === val2) {
            matches++;
        } else if (typeof val1 === 'string' && typeof val2 === 'string') {
            // For strings, check if they're very similar
            const similarity = calculateStringSimilarity(val1, val2);
            matches += similarity;
        }
    }

    return matches / allKeys.size;
}

/**
 * Calculate string similarity using Levenshtein distance
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score 0-1
 */
function calculateStringSimilarity(str1, str2) {
    if (str1 === str2) return 1;
    if (!str1 || !str2) return 0;

    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 1;

    const distance = levenshteinDistance(str1, str2);
    return 1 - (distance / maxLen);
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[str2.length][str1.length];
}

/**
 * ToolRepetitionDetector - Detect and prevent tool call loops
 */
class ToolRepetitionDetector {
    constructor(options = {}) {
        // Configuration
        this.historySize = options.historySize || 20; // Track last N tool calls
        this.exactRepetitionThreshold = options.exactRepetitionThreshold || 3; // Same tool 3 times
        this.patternRepetitionThreshold = options.patternRepetitionThreshold || 4; // Pattern repeats 2 times (4 calls)
        this.similarityThreshold = options.similarityThreshold || 0.85; // 85% similar = repetition

        // Tool call history
        this.history = []; // Array of { tool, params, timestamp }

        // Statistics
        this.totalDetections = 0;
        this.detectionsByTool = {};
    }

    /**
     * Record a tool call
     * @param {string} toolName - Name of the tool
     * @param {Object} params - Tool parameters
     * @param {boolean} success - Whether the tool succeeded
     * @param {string} error - Error message if failed
     */
    recordToolCall(toolName, params = {}, success = true, error = null) {
        const record = {
            tool: toolName,
            params: this._normalizeParams(params),
            timestamp: Date.now(),
            success,
            error
        };

        this.history.push(record);

        // Keep only recent history
        if (this.history.length > this.historySize) {
            this.history.shift();
        }

        console.log(`🔍 [ToolRepetition] Recorded: ${toolName} (success: ${success}, history: ${this.history.length})`);
    }

    /**
     * Check for tool repetition
     * @returns {Object|null} Detection result or null if no repetition
     */
    detectRepetition() {
        if (this.history.length < this.exactRepetitionThreshold) {
            return null;
        }

        // Check for failed tool repetition (high priority - same tool failing repeatedly)
        const failedRepetition = this._detectFailedRepetition();
        if (failedRepetition) {
            this.totalDetections++;
            this.detectionsByTool[failedRepetition.tool] =
                (this.detectionsByTool[failedRepetition.tool] || 0) + 1;
            return failedRepetition;
        }

        // Check for read-write-read cycles
        const readWriteCycle = this._detectReadWriteCycle();
        if (readWriteCycle) {
            this.totalDetections++;
            return readWriteCycle;
        }

        // Check for exact repetition (same tool repeatedly)
        const exactRepetition = this._detectExactRepetition();
        if (exactRepetition) {
            this.totalDetections++;
            this.detectionsByTool[exactRepetition.tool] =
                (this.detectionsByTool[exactRepetition.tool] || 0) + 1;
            return exactRepetition;
        }

        // Check for pattern repetition (A->B->A->B pattern)
        const patternRepetition = this._detectPatternRepetition();
        if (patternRepetition) {
            this.totalDetections++;
            return patternRepetition;
        }

        // Check for unproductive search patterns
        const searchPattern = this._detectUnproductiveSearch();
        if (searchPattern) {
            this.totalDetections++;
            return searchPattern;
        }

        return null;
    }

    /**
     * Detect failed tool repetition (same tool failing repeatedly)
     * @private
     */
    _detectFailedRepetition() {
        const recent = this.history.slice(-this.exactRepetitionThreshold);
        const firstTool = recent[0].tool;

        // Check if all recent calls are the same tool AND all failed
        const allSameFailedTool = recent.every(r =>
            r.tool === firstTool && r.success === false
        );

        if (allSameFailedTool) {
            console.warn(`⚠️ [ToolRepetition] Failed repetition: ${firstTool} failed ${recent.length} times`);

            // Get common error pattern
            const errorMessages = recent.map(r => r.error).filter(Boolean);
            const similarErrors = errorMessages.length >= 2;

            return {
                type: 'failed',
                tool: firstTool,
                count: recent.length,
                errors: errorMessages,
                suggestion: `${firstTool} has failed ${recent.length} times in a row${similarErrors ? ' with similar errors' : ''}. The current approach isn't working. Try:\n1. Check the error messages carefully\n2. Verify prerequisites (file exists, correct path, valid syntax)\n3. Use a different tool or approach\n4. Read relevant files first to understand the context`,
                warning: `${firstTool} has failed ${recent.length} consecutive times. This approach is not working.`
            };
        }

        return null;
    }

    /**
     * Detect read-write-read cycles (reading file, writing, reading again)
     * @private
     */
    _detectReadWriteCycle() {
        if (this.history.length < 3) {
            return null;
        }

        const recent = this.history.slice(-6); // Look at last 6 calls

        // Find read-write-read patterns for the same file
        for (let i = 0; i < recent.length - 2; i++) {
            const call1 = recent[i];
            const call2 = recent[i + 1];
            const call3 = recent[i + 2];

            // Check for read->write->read pattern on same file
            if (
                call1.tool === 'read_file' &&
                (call2.tool === 'write_file' || call2.tool === 'apply_diff' || call2.tool === 'edit_file') &&
                call3.tool === 'read_file' &&
                call1.params.path === call2.params.path &&
                call2.params.path === call3.params.path
            ) {
                console.warn(`⚠️ [ToolRepetition] Read-write-read cycle detected for ${call1.params.path}`);

                return {
                    type: 'read_write_cycle',
                    tool: 'read/write cycle',
                    file: call1.params.path,
                    count: 1,
                    suggestion: `You're reading a file, modifying it, then reading it again immediately. This is usually unnecessary:\n- If checking your changes: Trust the write operation succeeded\n- If validating syntax: The write tool already validates\n- If you need confirmation: Check the write tool's success response\n\nConsider proceeding with the next step instead of re-reading.`,
                    warning: `Detected read-write-read cycle for ${call1.params.path}. Re-reading immediately after writing is usually unnecessary.`
                };
            }
        }

        return null;
    }

    /**
     * Detect unproductive search patterns
     * @private
     */
    _detectUnproductiveSearch() {
        const recent = this.history.slice(-4);

        // Check for repeated search/list operations
        const searchTools = ['search_files', 'list_files', 'codebase_search', 'grep_search'];
        const recentSearches = recent.filter(r => searchTools.includes(r.tool));

        if (recentSearches.length >= 3) {
            // Check if searches are similar but not finding results
            const allNoResults = recentSearches.every(r =>
                r.success === true && // Tool succeeded but...
                (!r.params.results || r.params.results === 0) // ...found nothing
            );

            if (allNoResults) {
                console.warn(`⚠️ [ToolRepetition] Unproductive search pattern detected`);

                return {
                    type: 'unproductive_search',
                    tool: 'search tools',
                    count: recentSearches.length,
                    suggestion: `You've performed ${recentSearches.length} searches with no results. Try:\n1. Broaden your search terms\n2. Check if files exist in the expected location\n3. Verify the workspace is correct\n4. Use list_files to understand the directory structure\n5. Ask the user if you're searching in the right place`,
                    warning: `${recentSearches.length} consecutive searches found no results. Your search strategy may need adjustment.`
                };
            }
        }

        return null;
    }

    /**
     * Detect exact repetition (same tool called multiple times)
     * @private
     */
    _detectExactRepetition() {
        const recent = this.history.slice(-this.exactRepetitionThreshold);
        const firstTool = recent[0].tool;

        // Check if all recent calls are the same tool
        const allSameTool = recent.every(r => r.tool === firstTool);
        if (!allSameTool) {
            return null;
        }

        // Check if parameters are similar
        let similarCalls = 1;
        for (let i = 1; i < recent.length; i++) {
            const similarity = calculateObjectSimilarity(
                recent[i].params,
                recent[i - 1].params
            );

            if (similarity >= this.similarityThreshold) {
                similarCalls++;
            }
        }

        if (similarCalls >= this.exactRepetitionThreshold) {
            console.warn(`⚠️ [ToolRepetition] Exact repetition detected: ${firstTool} x${similarCalls}`);

            return {
                type: 'exact',
                tool: firstTool,
                count: similarCalls,
                suggestion: this._getSuggestionForTool(firstTool),
                warning: `You've called ${firstTool} ${similarCalls} times in a row with similar parameters. This might indicate you're stuck in a loop.`
            };
        }

        return null;
    }

    /**
     * Detect pattern repetition (alternating pattern)
     * @private
     */
    _detectPatternRepetition() {
        if (this.history.length < this.patternRepetitionThreshold) {
            return null;
        }

        const recent = this.history.slice(-this.patternRepetitionThreshold);

        // Check for A-B-A-B pattern
        if (recent.length >= 4) {
            const isABABPattern =
                recent[0].tool === recent[2].tool &&
                recent[1].tool === recent[3].tool &&
                recent[0].tool !== recent[1].tool;

            if (isABABPattern) {
                // Check parameter similarity
                const similarity02 = calculateObjectSimilarity(recent[0].params, recent[2].params);
                const similarity13 = calculateObjectSimilarity(recent[1].params, recent[3].params);

                if (similarity02 >= this.similarityThreshold && similarity13 >= this.similarityThreshold) {
                    console.warn(`⚠️ [ToolRepetition] Pattern repetition: ${recent[0].tool} ↔ ${recent[1].tool}`);

                    return {
                        type: 'pattern',
                        pattern: [recent[0].tool, recent[1].tool],
                        count: 2,
                        suggestion: `You're alternating between ${recent[0].tool} and ${recent[1].tool}. Consider using a different approach or tool.`,
                        warning: `Detected alternating pattern between ${recent[0].tool} and ${recent[1].tool}. This might not be making progress.`
                    };
                }
            }
        }

        return null;
    }

    /**
     * Get contextual suggestion for a specific tool
     * @private
     */
    _getSuggestionForTool(toolName) {
        const suggestions = {
            'read_file': 'If you\'re reading the same file repeatedly, you already have its contents. Review previous tool results instead.',
            'write_file': 'If writes are failing, check the error messages. You may need to read the file first or verify the path.',
            'execute_command': 'If a command keeps failing, check the error output and try a different approach.',
            'list_files': 'You\'ve already seen the file list. Use search_files or read specific files instead.',
            'search_files': 'If search isn\'t finding what you need, try different search terms or check if files exist with list_files.',
            'apply_diff': 'If diffs are failing, verify the search string exists exactly as shown. Consider using edit_file or read_file first.',
            'ask_followup_question': 'Asking the same question repeatedly won\'t get different answers. Try a different approach to the task.',
            'attempt_completion': 'If completion keeps failing, there may be unresolved errors. Check tool results carefully.'
        };

        return suggestions[toolName] || 'Consider trying a different tool or approach to make progress.';
    }

    /**
     * Normalize parameters for comparison
     * @private
     */
    _normalizeParams(params) {
        // Create a simplified version of params for comparison
        const normalized = {};

        for (const [key, value] of Object.entries(params)) {
            // Skip description fields (they're often unique but not meaningful for repetition)
            if (key === 'description' || key === 'reasoning') {
                continue;
            }

            // Normalize long strings by truncating
            if (typeof value === 'string' && value.length > 200) {
                normalized[key] = value.substring(0, 200);
            } else {
                normalized[key] = value;
            }
        }

        return normalized;
    }

    /**
     * Get recent tool call summary
     * @param {number} count - Number of recent calls to summarize
     * @returns {string}
     */
    getRecentSummary(count = 5) {
        const recent = this.history.slice(-count);
        if (recent.length === 0) {
            return 'No recent tool calls';
        }

        const summary = recent.map((r, i) =>
            `${i + 1}. ${r.tool}${r.params.path ? ` (${r.params.path})` : ''}`
        ).join('\n');

        return `Recent tool calls:\n${summary}`;
    }

    /**
     * Clear history
     */
    clear() {
        this.history = [];
        console.log('🧹 [ToolRepetition] History cleared');
    }

    /**
     * Get statistics
     * @returns {Object}
     */
    getStats() {
        return {
            totalDetections: this.totalDetections,
            detectionsByTool: { ...this.detectionsByTool },
            historySize: this.history.length
        };
    }
}

module.exports = ToolRepetitionDetector;
