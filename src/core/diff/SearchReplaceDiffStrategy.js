/**
 * Search/Replace Diff Strategy for Oropendola AI
 * Implements SEARCH/REPLACE block-based code editing
 * Based on Roo-Code's MultiSearchReplaceDiffStrategy
 */

const { distance } = require('fastest-levenshtein');

/**
 * Calculate similarity between two strings using Levenshtein distance
 * Returns a score from 0 to 1, where 1 is an exact match
 */
function getSimilarity(original, search) {
    if (search === "") {
        return 0;
    }

    // Normalize strings (handle smart quotes, etc.)
    const normalizedOriginal = normalizeString(original);
    const normalizedSearch = normalizeString(search);

    if (normalizedOriginal === normalizedSearch) {
        return 1;
    }

    // Calculate Levenshtein distance
    const dist = distance(normalizedOriginal, normalizedSearch);
    const maxLength = Math.max(normalizedOriginal.length, normalizedSearch.length);

    return 1 - dist / maxLength;
}

/**
 * Normalize string by handling smart quotes and special characters
 */
function normalizeString(str) {
    return str
        .replace(/[\u2018\u2019]/g, "'")  // Smart single quotes
        .replace(/[\u201C\u201D]/g, '"')  // Smart double quotes
        .replace(/\u2013/g, '-')           // En dash
        .replace(/\u2014/g, '--')          // Em dash
        .replace(/\u2026/g, '...')         // Ellipsis
        .replace(/\u00A0/g, ' ');          // Non-breaking space
}

/**
 * Performs fuzzy search to find the best match for searchChunk in lines
 * Uses middle-out search strategy for better performance
 */
function fuzzySearch(lines, searchChunk, startIndex, endIndex) {
    let bestScore = 0;
    let bestMatchIndex = -1;
    let bestMatchContent = "";

    const searchLines = searchChunk.split(/\r?\n/);
    const searchLen = searchLines.length;

    // Middle-out search from midpoint
    const midPoint = Math.floor((startIndex + endIndex) / 2);
    let leftIndex = midPoint;
    let rightIndex = midPoint + 1;

    while (leftIndex >= startIndex || rightIndex <= endIndex - searchLen) {
        // Search left
        if (leftIndex >= startIndex) {
            const originalChunk = lines.slice(leftIndex, leftIndex + searchLen).join("\n");
            const similarity = getSimilarity(originalChunk, searchChunk);

            if (similarity > bestScore) {
                bestScore = similarity;
                bestMatchIndex = leftIndex;
                bestMatchContent = originalChunk;
            }
            leftIndex--;
        }

        // Search right
        if (rightIndex <= endIndex - searchLen) {
            const originalChunk = lines.slice(rightIndex, rightIndex + searchLen).join("\n");
            const similarity = getSimilarity(originalChunk, searchChunk);

            if (similarity > bestScore) {
                bestScore = similarity;
                bestMatchIndex = rightIndex;
                bestMatchContent = originalChunk;
            }
            rightIndex++;
        }
    }

    return { bestScore, bestMatchIndex, bestMatchContent };
}

/**
 * Parse SEARCH/REPLACE blocks from diff content
 */
function parseSearchReplaceBlocks(diffContent) {
    const blocks = [];

    // Match SEARCH/REPLACE blocks
    const blockRegex = /<<<<<<< SEARCH\s*:start_line:\s*(\d+)\s*-+\s*([\s\S]*?)\s*=======\s*([\s\S]*?)\s*>>>>>>> REPLACE/g;

    let match;
    while ((match = blockRegex.exec(diffContent)) !== null) {
        const startLine = parseInt(match[1], 10);
        const searchContent = match[2];
        const replaceContent = match[3];

        blocks.push({
            startLine,
            searchContent,
            replaceContent
        });
    }

    return blocks;
}

/**
 * SearchReplaceDiffStrategy class
 */
class SearchReplaceDiffStrategy {
    constructor(fuzzyThreshold = 1.0, bufferLines = 40) {
        this.fuzzyThreshold = fuzzyThreshold;
        this.bufferLines = bufferLines;
    }

    getName() {
        return "SearchReplace";
    }

    /**
     * Apply diff to original content
     * @param {string} originalContent - Original file content
     * @param {string} diffContent - Diff in SEARCH/REPLACE format
     * @param {number} startLine - Optional starting line hint
     * @returns {Object} Result with success flag and new content or error
     */
    async applyDiff(originalContent, diffContent, startLine = 0) {
        try {
            // Parse SEARCH/REPLACE blocks
            const blocks = parseSearchReplaceBlocks(diffContent);

            if (blocks.length === 0) {
                return {
                    success: false,
                    error: "No valid SEARCH/REPLACE blocks found in diff content. Expected format:\n<<<<<<< SEARCH\n:start_line:1\n-------\n[search content]\n=======\n[replace content]\n>>>>>>> REPLACE"
                };
            }

            // Split original content into lines
            let lines = originalContent.split(/\r?\n/);
            let appliedBlocks = [];
            let failedBlocks = [];

            // Apply each block sequentially
            for (const block of blocks) {
                const result = this._applySingleBlock(lines, block);

                if (result.success) {
                    lines = result.newLines;
                    appliedBlocks.push({
                        success: true,
                        startLine: result.matchIndex,
                        searchContent: block.searchContent,
                        replaceContent: block.replaceContent
                    });
                } else {
                    failedBlocks.push({
                        success: false,
                        error: result.error,
                        searchContent: block.searchContent,
                        details: result.details
                    });
                }
            }

            // Check if any blocks failed
            if (failedBlocks.length > 0 && appliedBlocks.length === 0) {
                // All blocks failed
                return {
                    success: false,
                    error: "Failed to apply all SEARCH/REPLACE blocks",
                    failParts: failedBlocks
                };
            }

            // Some or all blocks succeeded
            return {
                success: true,
                content: lines.join("\n"),
                appliedBlocks,
                failParts: failedBlocks.length > 0 ? failedBlocks : undefined
            };

        } catch (error) {
            return {
                success: false,
                error: `Error applying diff: ${error.message}`,
                details: error.stack
            };
        }
    }

    /**
     * Apply a single SEARCH/REPLACE block
     */
    _applySingleBlock(lines, block) {
        const { startLine, searchContent, replaceContent } = block;

        // Trim search content but preserve relative indentation
        const searchLines = searchContent.split(/\r?\n/);
        const replaceLines = replaceContent.split(/\r?\n/);

        // Determine search range
        const searchLen = searchLines.length;
        let searchStart = 0;
        let searchEnd = lines.length;

        // Use startLine as a hint if provided
        if (startLine > 0 && startLine <= lines.length) {
            searchStart = Math.max(0, startLine - 1 - this.bufferLines);
            searchEnd = Math.min(lines.length, startLine - 1 + searchLen + this.bufferLines);
        }

        // Perform fuzzy search
        const { bestScore, bestMatchIndex, bestMatchContent } = fuzzySearch(
            lines,
            searchContent,
            searchStart,
            searchEnd
        );

        // Check if match meets threshold
        if (bestScore < this.fuzzyThreshold) {
            return {
                success: false,
                error: `Could not find matching content. Best match score: ${(bestScore * 100).toFixed(1)}% (threshold: ${(this.fuzzyThreshold * 100).toFixed(1)}%)`,
                details: {
                    searchedFor: searchContent.substring(0, 200),
                    bestMatch: bestMatchContent.substring(0, 200),
                    bestScore,
                    threshold: this.fuzzyThreshold
                }
            };
        }

        // Apply replacement
        const newLines = [
            ...lines.slice(0, bestMatchIndex),
            ...replaceLines,
            ...lines.slice(bestMatchIndex + searchLen)
        ];

        return {
            success: true,
            newLines,
            matchIndex: bestMatchIndex
        };
    }

    /**
     * Get progress status for streaming updates
     */
    getProgressStatus(block, diffResult) {
        if (!block || block.partial) {
            return { type: 'processing', message: 'Processing diff...' };
        }

        if (diffResult && diffResult.appliedBlocks) {
            return {
                type: 'applied',
                blocksApplied: diffResult.appliedBlocks.length,
                blocksFailed: diffResult.failParts ? diffResult.failParts.length : 0
            };
        }

        return {};
    }
}

module.exports = SearchReplaceDiffStrategy;
