/**
 * CodeDefinitionsService
 *
 * Extracts code definitions (classes, functions, methods) from files using tree-sitter.
 * Provides structured information about code symbols for AI context.
 *
 * Features:
 * - Extract classes, methods, functions from source files
 * - Support for multiple languages (JS, TS, Python, Go, Rust, etc.)
 * - Line number information for each definition
 * - Docstring/comment extraction
 * - Fast parsing using tree-sitter AST
 *
 * Based on Roo-Code's list_code_definitions_in_file tool
 *
 * @author Oropendola Team
 * @date 2025-11-02
 */

const path = require('path');
const fs = require('fs').promises;

// Import tree-sitter infrastructure (will be compiled from TypeScript)
let loadRequiredLanguageParsers;
try {
    const treeSitter = require('./tree-sitter/languageParser');
    loadRequiredLanguageParsers = treeSitter.loadRequiredLanguageParsers;
} catch (error) {
    console.warn('⚠️ [CodeDefinitionsService] Tree-sitter not available:', error.message);
}

/**
 * CodeDefinitionsService - Extract code definitions from files
 */
class CodeDefinitionsService {
    constructor() {
        this.supportedExtensions = [
            '.js', '.jsx', '.ts', '.tsx',
            '.py', '.rs', '.go',
            '.c', '.h', '.cpp', '.hpp',
            '.cs', '.rb', '.java', '.php'
        ];
    }

    /**
     * Check if file type is supported
     * @param {string} filePath - Path to file
     * @returns {boolean}
     */
    isSupportedFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        return this.supportedExtensions.includes(ext);
    }

    /**
     * Extract code definitions from a file
     *
     * @param {string} filePath - Path to file
     * @returns {Promise<Array<Object>>} Array of code definitions
     * @example
     * [
     *   {
     *     type: 'class',
     *     name: 'MyClass',
     *     line: 10,
     *     doc: 'Class documentation'
     *   },
     *   {
     *     type: 'function',
     *     name: 'myFunction',
     *     line: 25,
     *     doc: 'Function documentation'
     *   }
     * ]
     */
    async extractDefinitions(filePath) {
        // Check if file is supported
        if (!this.isSupportedFile(filePath)) {
            throw new Error(`Unsupported file type: ${path.extname(filePath)}`);
        }

        // Check if tree-sitter is available
        if (!loadRequiredLanguageParsers) {
            throw new Error('Tree-sitter not available. Definitions cannot be extracted.');
        }

        try {
            // Read file content
            const fileContent = await fs.readFile(filePath, 'utf8');
            const lines = fileContent.split('\n');

            // Load parser for this file
            const ext = path.extname(filePath).toLowerCase().slice(1); // Remove leading dot
            const sourceDirectory = path.join(__dirname, 'tree-sitter');

            const languageParsers = await loadRequiredLanguageParsers([filePath], sourceDirectory);
            const { parser, query } = languageParsers[ext] || {};

            if (!parser || !query) {
                throw new Error(`No parser available for ${ext} files`);
            }

            // Parse the file
            const tree = parser.parse(fileContent);
            if (!tree) {
                throw new Error('Failed to parse file');
            }

            // Get captures from the AST
            const captures = query.captures(tree.rootNode);

            // Process captures to extract definitions
            const definitions = [];
            const definitionNodes = new Map();

            for (const capture of captures) {
                const { node, name } = capture;

                // Track definition nodes
                if (name.includes('definition')) {
                    const definitionType = name.split('.')[1]; // e.g., 'definition.class' -> 'class'
                    const startLine = node.startPosition.row + 1; // Tree-sitter uses 0-based indexing

                    if (!definitionNodes.has(startLine)) {
                        definitionNodes.set(startLine, {
                            type: definitionType || 'unknown',
                            line: startLine,
                            node,
                            name: null,
                            doc: null
                        });
                    }
                }

                // Capture names
                if (name === 'name') {
                    const startLine = node.startPosition.row + 1;

                    // Find the definition this name belongs to
                    for (const [defLine, def] of definitionNodes.entries()) {
                        if (Math.abs(defLine - startLine) <= 2) { // Name should be within 2 lines
                            def.name = node.text;
                            break;
                        }
                    }
                }

                // Capture documentation
                if (name === 'doc') {
                    const startLine = node.startPosition.row + 1;
                    const docText = node.text
                        .replace(/^\/\*+|\*+\/$/g, '') // Remove /* */
                        .replace(/^\/\/+/gm, '')        // Remove //
                        .replace(/^\s*\*\s?/gm, '')     // Remove leading * in block comments
                        .trim();

                    // Find the definition this doc belongs to
                    for (const [defLine, def] of definitionNodes.entries()) {
                        if (defLine >= startLine && defLine <= startLine + 5) {
                            def.doc = docText;
                            break;
                        }
                    }
                }
            }

            // Convert map to array and filter out unnamed definitions
            for (const def of definitionNodes.values()) {
                if (def.name) {
                    definitions.push({
                        type: def.type,
                        name: def.name,
                        line: def.line,
                        doc: def.doc || ''
                    });
                }
            }

            // Sort by line number
            definitions.sort((a, b) => a.line - b.line);

            console.log(`📚 [CodeDefinitionsService] Found ${definitions.length} definitions in ${path.basename(filePath)}`);

            return definitions;
        } catch (error) {
            console.error(`❌ [CodeDefinitionsService] Failed to extract definitions from ${filePath}:`, error);
            throw new Error(`Failed to extract definitions: ${error.message}`);
        }
    }

    /**
     * Format definitions for display
     *
     * @param {Array<Object>} definitions - Array of definitions
     * @param {string} filePath - Original file path
     * @returns {string} Formatted string
     */
    formatDefinitions(definitions, filePath) {
        if (definitions.length === 0) {
            return `No code definitions found in ${filePath}`;
        }

        let output = `Code Definitions in ${filePath}:\n`;
        output += `Found ${definitions.length} definition(s)\n\n`;

        for (const def of definitions) {
            const typeIcon = this._getTypeIcon(def.type);
            output += `${typeIcon} ${def.type} ${def.name} (line ${def.line})\n`;

            if (def.doc) {
                // Truncate long documentation
                const doc = def.doc.length > 100
                    ? def.doc.substring(0, 100) + '...'
                    : def.doc;
                output += `  ${doc}\n`;
            }

            output += '\n';
        }

        return output.trim();
    }

    /**
     * Get icon for definition type
     * @private
     */
    _getTypeIcon(type) {
        const icons = {
            'class': '🔷',
            'function': '🔧',
            'method': '⚙️',
            'interface': '📐',
            'type': '📦',
            'enum': '📋'
        };

        return icons[type] || '•';
    }
}

module.exports = CodeDefinitionsService;
