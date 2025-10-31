/**
 * CodeDefinitionParser - Extract code definitions (functions, classes, methods) from source files
 * Uses regex patterns for common languages
 * Simpler alternative to Tree-sitter for MVP
 */

class CodeDefinitionParser {
    constructor() {
        // Language patterns for extracting definitions
        this.patterns = {
            javascript: [
                // Function declarations
                { pattern: /^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/gm, type: 'function' },
                // Arrow functions assigned to const/let/var
                { pattern: /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/gm, type: 'function' },
                // Class declarations
                { pattern: /^(?:export\s+)?class\s+(\w+)/gm, type: 'class' },
                // Method definitions
                { pattern: /^\s+(?:async\s+)?(\w+)\s*\([^)]*\)\s*{/gm, type: 'method' },
            ],
            typescript: [
                // Everything from JavaScript, plus:
                { pattern: /^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/gm, type: 'function' },
                { pattern: /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/gm, type: 'function' },
                { pattern: /^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/gm, type: 'class' },
                { pattern: /^(?:export\s+)?interface\s+(\w+)/gm, type: 'interface' },
                { pattern: /^(?:export\s+)?type\s+(\w+)\s*=/gm, type: 'type' },
                { pattern: /^\s+(?:async\s+)?(\w+)\s*\([^)]*\)\s*{/gm, type: 'method' },
            ],
            python: [
                // Function definitions
                { pattern: /^(?:async\s+)?def\s+(\w+)\s*\(/gm, type: 'function' },
                // Class definitions
                { pattern: /^class\s+(\w+)(?:\([^)]*\))?:/gm, type: 'class' },
                // Method definitions (indented)
                { pattern: /^\s+(?:async\s+)?def\s+(\w+)\s*\(/gm, type: 'method' },
            ],
            java: [
                // Method declarations
                { pattern: /(?:public|private|protected)\s+(?:static\s+)?(?:\w+\s+)?(\w+)\s*\([^)]*\)\s*{/gm, type: 'method' },
                // Class declarations
                { pattern: /(?:public|private|protected)?\s*class\s+(\w+)/gm, type: 'class' },
                // Interface declarations
                { pattern: /(?:public|private|protected)?\s*interface\s+(\w+)/gm, type: 'interface' },
            ],
            go: [
                // Function declarations
                { pattern: /^func\s+(\w+)\s*\(/gm, type: 'function' },
                // Method declarations (receiver)
                { pattern: /^func\s+\([^)]+\)\s+(\w+)\s*\(/gm, type: 'method' },
                // Type declarations
                { pattern: /^type\s+(\w+)\s+struct/gm, type: 'struct' },
                { pattern: /^type\s+(\w+)\s+interface/gm, type: 'interface' },
            ],
            rust: [
                // Function declarations
                { pattern: /^(?:pub\s+)?fn\s+(\w+)\s*\(/gm, type: 'function' },
                // Struct declarations
                { pattern: /^(?:pub\s+)?struct\s+(\w+)/gm, type: 'struct' },
                // Trait declarations
                { pattern: /^(?:pub\s+)?trait\s+(\w+)/gm, type: 'trait' },
                // Impl blocks
                { pattern: /^impl(?:\s+\w+)?\s+for\s+(\w+)/gm, type: 'impl' },
            ],
            ruby: [
                // Method definitions
                { pattern: /^(?:\s*)def\s+(\w+)/gm, type: 'method' },
                // Class definitions
                { pattern: /^class\s+(\w+)/gm, type: 'class' },
                // Module definitions
                { pattern: /^module\s+(\w+)/gm, type: 'module' },
            ],
            php: [
                // Function declarations
                { pattern: /function\s+(\w+)\s*\(/gm, type: 'function' },
                // Class declarations
                { pattern: /class\s+(\w+)/gm, type: 'class' },
                // Method declarations
                { pattern: /(?:public|private|protected)\s+function\s+(\w+)\s*\(/gm, type: 'method' },
            ],
            csharp: [
                // Method declarations
                { pattern: /(?:public|private|protected|internal)\s+(?:static\s+)?(?:\w+\s+)?(\w+)\s*\([^)]*\)\s*{/gm, type: 'method' },
                // Class declarations
                { pattern: /(?:public|private|internal)?\s*class\s+(\w+)/gm, type: 'class' },
                // Interface declarations
                { pattern: /(?:public|private|internal)?\s*interface\s+(\w+)/gm, type: 'interface' },
            ]
        };

        // Map file extensions to language keys
        this.extensionMap = {
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.py': 'python',
            '.java': 'java',
            '.go': 'go',
            '.rs': 'rust',
            '.rb': 'ruby',
            '.php': 'php',
            '.cs': 'csharp',
        };
    }

    /**
     * Detect language from file extension
     */
    detectLanguage(filePath) {
        const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
        return this.extensionMap[ext] || null;
    }

    /**
     * Parse file content and extract definitions
     * @param {string} content - File content
     * @param {string} language - Programming language
     * @returns {Array} Array of definitions with line numbers
     */
    parse(content, language) {
        const patterns = this.patterns[language];
        if (!patterns) {
            return null; // Unsupported language
        }

        const lines = content.split('\n');
        const definitions = [];

        patterns.forEach(({ pattern, type }) => {
            const regex = new RegExp(pattern.source, pattern.flags);
            let match;

            // Reset regex state
            regex.lastIndex = 0;

            while ((match = regex.exec(content)) !== null) {
                const definitionName = match[1];
                if (!definitionName) continue;

                // Find line number
                const beforeMatch = content.substring(0, match.index);
                const lineNumber = (beforeMatch.match(/\n/g) || []).length + 1;

                // Get the full line for context
                const line = lines[lineNumber - 1];

                definitions.push({
                    name: definitionName,
                    type,
                    line: lineNumber,
                    code: line.trim()
                });
            }
        });

        // Sort by line number
        definitions.sort((a, b) => a.line - b.line);

        // Remove duplicates (same name, line, and type)
        const unique = [];
        const seen = new Set();
        for (const def of definitions) {
            const key = `${def.name}:${def.line}:${def.type}`;
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(def);
            }
        }

        return unique;
    }

    /**
     * Format definitions as readable string
     * @param {Array} definitions - Array of definitions
     * @param {string} filePath - File path (for display)
     * @returns {string} Formatted string
     */
    format(definitions, filePath) {
        if (!definitions || definitions.length === 0) {
            return `No code definitions found in ${filePath}`;
        }

        const lines = [`Code definitions in ${filePath}:\n`];

        // Group by type
        const grouped = {};
        definitions.forEach(def => {
            if (!grouped[def.type]) {
                grouped[def.type] = [];
            }
            grouped[def.type].push(def);
        });

        // Format each group
        Object.keys(grouped).sort().forEach(type => {
            const items = grouped[type];
            lines.push(`\n${type}s (${items.length}):`);
            items.forEach(item => {
                lines.push(`  Line ${item.line}: ${item.name}`);
            });
        });

        return lines.join('\n');
    }

    /**
     * Parse file and return formatted definitions
     * @param {string} content - File content
     * @param {string} filePath - File path
     * @returns {string} Formatted definitions or error message
     */
    parseFile(content, filePath) {
        const language = this.detectLanguage(filePath);

        if (!language) {
            const ext = filePath.substring(filePath.lastIndexOf('.'));
            return `Unsupported file type: ${ext}\nSupported: .js, .jsx, .ts, .tsx, .py, .java, .go, .rs, .rb, .php, .cs`;
        }

        const definitions = this.parse(content, language);

        if (!definitions) {
            return `Could not parse ${language} file: ${filePath}`;
        }

        return this.format(definitions, filePath);
    }
}

module.exports = CodeDefinitionParser;
