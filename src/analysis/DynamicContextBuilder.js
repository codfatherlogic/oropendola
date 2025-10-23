/**
 * DynamicContextBuilder - Builds AI context from discovered codebase patterns
 *
 * Philosophy: Don't tell the AI what to do - show it what exists and let it infer!
 *
 * WRONG: "You are in a Frappe project. When user says 'doctype', do X"
 * RIGHT: "I found these patterns: files ending in .doctype.py, imports from 'frappe',
 *         README mentions 'bench' command. Here are code examples..."
 */
class DynamicContextBuilder {
    /**
     * Build context from pattern analysis
     * @param {Object} patterns - Results from CodebasePatternAnalyzer
     * @returns {string} AI-ready context
     */
    static buildContext(patterns) {
        if (!patterns || Object.keys(patterns).length === 0) {
            return '';
        }

        let context = '\n\n**📊 CODEBASE ANALYSIS (Discovered Patterns)**\n\n';
        context += 'I analyzed this codebase and discovered the following patterns. ';
        context += 'Use this to understand the project structure and conventions:\n\n';

        // Dependencies discovered
        context += this._buildDependenciesContext(patterns.dependencies);

        // File patterns
        context += this._buildFilePatterns Context(patterns.filePatterns);

        // Import patterns
        context += this._buildImportPatternsContext(patterns.importPatterns);

        // Naming conventions
        context += this._buildNamingConventionsContext(patterns.namingConventions);

        // Commands discovered
        context += this._buildCommandPatternsContext(patterns.commandPatterns);

        // Code examples
        context += this._buildCodeExamplesContext(patterns.codeExamples);

        // Documentation knowledge
        context += this._buildDocumentationContext(patterns.documentationKnowledge);

        // Configuration files
        context += this._buildConfigContext(patterns.configPatterns);

        context += '\n**🎯 YOUR TASK:**\n';
        context += 'Based on the patterns above, understand the codebase conventions and ';
        context += 'generate code that matches the existing style. When the user asks to ';
        context += 'create something, look at the examples and follow the same patterns.\n';

        return context;
    }

    static _buildDependenciesContext(dependencies) {
        let context = '**📦 Dependencies & Libraries Found:**\n\n';

        const allDeps = [
            ...dependencies.python || [],
            ...dependencies.javascript || [],
            ...dependencies.go || [],
            ...dependencies.rust || [],
            ...dependencies.ruby || [],
            ...dependencies.php || []
        ];

        if (allDeps.length === 0) {
            return '';
        }

        // Group by language
        Object.entries(dependencies).forEach(([lang, deps]) => {
            if (deps && deps.length > 0) {
                const topDeps = deps.slice(0, 15); // Top 15 dependencies
                context += `- **${lang}**: ${topDeps.join(', ')}\n`;

                // Add interpretive note if certain key libraries are found
                const keyLibs = this._identifyKeyLibraries(deps, lang);
                if (keyLibs.length > 0) {
                    context += `  → Key libraries detected: ${keyLibs.join(', ')}\n`;
                }
            }
        });

        context += '\n';
        return context;
    }

    static _identifyKeyLibraries(deps, lang) {
        const keyLibs = [];

        if (lang === 'python') {
            if (deps.includes('frappe') || deps.includes('erpnext')) {
                keyLibs.push('Frappe framework');
            }
            if (deps.includes('django')) keyLibs.push('Django web framework');
            if (deps.includes('flask')) keyLibs.push('Flask web framework');
            if (deps.includes('fastapi')) keyLibs.push('FastAPI framework');
            if (deps.includes('pytest')) keyLibs.push('pytest testing');
            if (deps.includes('sqlalchemy')) keyLibs.push('SQLAlchemy ORM');
        }

        if (lang === 'javascript') {
            if (deps.includes('react')) keyLibs.push('React');
            if (deps.includes('vue')) keyLibs.push('Vue.js');
            if (deps.includes('angular')) keyLibs.push('Angular');
            if (deps.includes('express')) keyLibs.push('Express.js');
            if (deps.includes('next')) keyLibs.push('Next.js');
            if (deps.includes('electron')) keyLibs.push('Electron');
            if (deps.includes('jest')) keyLibs.push('Jest testing');
        }

        return keyLibs;
    }

    static _buildFilePatternsContext(filePatterns) {
        if (!filePatterns || Object.keys(filePatterns).length === 0) {
            return '';
        }

        let context = '**📁 File Naming Patterns Found:**\n\n';
        context += 'The codebase uses these file naming conventions:\n\n';

        const sortedPatterns = Object.entries(filePatterns)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 10); // Top 10 patterns

        sortedPatterns.forEach(([pattern, data]) => {
            context += `- **\`.${pattern}.\`** pattern (${data.count} files)\n`;
            context += `  - Extensions: ${data.extensions.join(', ')}\n`;
            context += `  - Examples: ${data.examples.join(', ')}\n`;
        });

        context += '\n';
        context += '💡 When creating new files, follow these existing patterns.\n\n';

        return context;
    }

    static _buildImportPatternsContext(importPatterns) {
        if (!importPatterns) {
            return '';
        }

        let context = '**📥 Common Import Patterns:**\n\n';
        let hasContent = false;

        if (importPatterns.python && Object.keys(importPatterns.python).length > 0) {
            hasContent = true;
            context += '**Python imports (most frequent):**\n```python\n';

            Object.entries(importPatterns.python).slice(0, 10).forEach(([module, count]) => {
                context += `import ${module}  # Used ${count} times\n`;
            });

            context += '```\n\n';
        }

        if (importPatterns.javascript && Object.keys(importPatterns.javascript).length > 0) {
            hasContent = true;
            context += '**JavaScript/TypeScript imports (most frequent):**\n```javascript\n';

            Object.entries(importPatterns.javascript).slice(0, 10).forEach(([module, count]) => {
                context += `import ... from '${module}';  // Used ${count} times\n`;
            });

            context += '```\n\n';
        }

        if (!hasContent) {
            return '';
        }

        context += '💡 When writing new code, use these same libraries and import patterns.\n\n';
        return context;
    }

    static _buildNamingConventionsContext(conventions) {
        if (!conventions || !conventions.caseStyle) {
            return '';
        }

        let context = '**🔤 Naming Conventions:**\n\n';

        if (conventions.caseStyle) {
            context += `- **File naming style**: ${conventions.caseStyle}\n`;
            context += `  → Use ${conventions.caseStyle} for new files to match existing code\n\n`;
        }

        if (conventions.directoryStructure && conventions.directoryStructure.length > 0) {
            context += '**Common directory structure:**\n';
            conventions.directoryStructure.forEach(({ directory, fileCount }) => {
                context += `- \`${directory}/\` (${fileCount} files)\n`;
            });
            context += '\n';
        }

        return context;
    }

    static _buildCommandPatternsContext(commands) {
        if (!commands || commands.length === 0) {
            return '';
        }

        let context = '**⚡ Available Commands Found:**\n\n';
        context += 'The project defines these commands:\n\n';

        commands.slice(0, 15).forEach(cmd => {
            context += `- \`${cmd.name}\``;
            if (cmd.source) context += ` (${cmd.source})`;
            context += '\n';
        });

        context += '\n💡 Use these commands when needed for building, testing, or running the project.\n\n';

        return context;
    }

    static _buildCodeExamplesContext(examples) {
        if (!examples) {
            return '';
        }

        let context = '**📝 Code Examples from Codebase:**\n\n';
        let hasContent = false;

        if (examples.python && examples.python.length > 0) {
            hasContent = true;
            context += '**Python code style:**\n';
            examples.python.forEach(({ file, snippet }) => {
                context += `\n\`${file}\`:\n\`\`\`python\n${snippet}\n...\n\`\`\`\n`;
            });
        }

        if (examples.javascript && examples.javascript.length > 0) {
            hasContent = true;
            context += '\n**JavaScript/TypeScript code style:**\n';
            examples.javascript.forEach(({ file, snippet }) => {
                context += `\n\`${file}\`:\n\`\`\`javascript\n${snippet}\n...\n\`\`\`\n`;
            });
        }

        if (!hasContent) {
            return '';
        }

        context += '\n💡 Match the coding style shown in these examples.\n\n';
        return context;
    }

    static _buildDocumentationContext(docKnowledge) {
        if (!docKnowledge || !docKnowledge.readme) {
            return '';
        }

        let context = '**📖 Project Documentation:**\n\n';

        if (docKnowledge.readme) {
            const readmePreview = docKnowledge.readme.slice(0, 1500); // First 1500 chars
            context += '**README.md excerpt:**\n```\n';
            context += readmePreview;
            if (docKnowledge.readme.length > 1500) {
                context += '\n... (truncated)\n';
            }
            context += '```\n\n';
        }

        if (docKnowledge.docFiles && docKnowledge.docFiles.length > 0) {
            context += '**Additional documentation files available:**\n';
            docKnowledge.docFiles.forEach(doc => {
                context += `- ${doc.name}\n`;
            });
            context += '\n';
        }

        context += '💡 Refer to this documentation for project-specific conventions.\n\n';

        return context;
    }

    static _buildConfigContext(configs) {
        if (!configs || configs.length === 0) {
            return '';
        }

        let context = '**⚙️ Configuration Files:**\n\n';
        context += 'Project uses these configuration files:\n';

        configs.forEach(config => {
            context += `- \`${config.file}\`\n`;
        });

        context += '\n';
        return context;
    }

    /**
     * Build minimal summary for quick reference
     * @param {Object} patterns - Pattern analysis
     * @returns {string} Summary text
     */
    static buildSummary(patterns) {
        const summary = [];

        // Main languages
        const langs = [];
        if (patterns.dependencies?.python?.length > 0) langs.push('Python');
        if (patterns.dependencies?.javascript?.length > 0) langs.push('JavaScript');
        if (patterns.dependencies?.go?.length > 0) langs.push('Go');
        if (patterns.dependencies?.rust?.length > 0) langs.push('Rust');

        if (langs.length > 0) {
            summary.push(`Languages: ${langs.join(', ')}`);
        }

        // Key frameworks
        const frameworks = this._identifyKeyLibraries(
            [...(patterns.dependencies?.python || []), ...(patterns.dependencies?.javascript || [])],
            'combined'
        );

        if (frameworks.length > 0) {
            summary.push(`Frameworks: ${frameworks.join(', ')}`);
        }

        // File patterns
        if (patterns.filePatterns && Object.keys(patterns.filePatterns).length > 0) {
            const topPattern = Object.keys(patterns.filePatterns)[0];
            summary.push(`Uses .${topPattern}. naming pattern`);
        }

        return summary.join(' | ');
    }
}

module.exports = DynamicContextBuilder;
