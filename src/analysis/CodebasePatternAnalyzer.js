const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

/**
 * CodebasePatternAnalyzer - Dynamically discovers code patterns, conventions,
 * and framework usage WITHOUT hardcoded knowledge
 *
 * Philosophy: Don't tell the AI what frameworks exist - let it discover patterns
 * from the actual codebase and infer conventions.
 */
class CodebasePatternAnalyzer {
    constructor() {
        this.cache = new Map();
        this.cacheDuration = 120000; // 2 minutes
    }

    /**
     * Analyze codebase and discover patterns dynamically
     * @param {string} workspacePath - Workspace root path
     * @returns {Promise<Object>} Discovered patterns and conventions
     */
    async analyzePatterns(workspacePath) {
        const cacheKey = workspacePath;
        const cached = this.cache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
            console.log('📦 Using cached pattern analysis');
            return cached.data;
        }

        console.log('🔍 Dynamically analyzing codebase patterns...');

        const analysis = {
            // What dependencies/libraries are being used
            dependencies: await this._discoverDependencies(workspacePath),

            // What file patterns exist (e.g., *.doctype.*, *.component.*)
            filePatterns: await this._discoverFilePatterns(workspacePath),

            // What import patterns are common
            importPatterns: await this._discoverImportPatterns(workspacePath),

            // What configuration patterns exist
            configPatterns: await this._discoverConfigPatterns(workspacePath),

            // Extract knowledge from documentation
            documentationKnowledge: await this._extractDocumentationKnowledge(workspacePath),

            // Discover naming conventions
            namingConventions: await this._discoverNamingConventions(workspacePath),

            // Find example code patterns
            codeExamples: await this._findCodeExamples(workspacePath),

            // Discover command patterns (from scripts, makefiles, etc.)
            commandPatterns: await this._discoverCommandPatterns(workspacePath)
        };

        // Cache results
        this.cache.set(cacheKey, {
            data: analysis,
            timestamp: Date.now()
        });

        console.log('✅ Pattern analysis complete');
        return analysis;
    }

    /**
     * Discover what dependencies/libraries are being used
     * @private
     */
    async _discoverDependencies(workspacePath) {
        const dependencies = {
            python: [],
            javascript: [],
            go: [],
            rust: [],
            ruby: [],
            php: [],
            java: []
        };

        try {
            // Python - requirements.txt, Pipfile, pyproject.toml
            const pythonFiles = ['requirements.txt', 'Pipfile', 'pyproject.toml', 'setup.py'];
            for (const file of pythonFiles) {
                const filepath = path.join(workspacePath, file);
                if (fs.existsSync(filepath)) {
                    const content = fs.readFileSync(filepath, 'utf8');
                    dependencies.python.push(...this._extractPythonDeps(content, file));
                }
            }

            // JavaScript/Node - package.json
            const packageJsonPath = path.join(workspacePath, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                dependencies.javascript = [
                    ...Object.keys(packageJson.dependencies || {}),
                    ...Object.keys(packageJson.devDependencies || {})
                ];
            }

            // Go - go.mod
            const goModPath = path.join(workspacePath, 'go.mod');
            if (fs.existsSync(goModPath)) {
                const content = fs.readFileSync(goModPath, 'utf8');
                dependencies.go = this._extractGoMods(content);
            }

            // Rust - Cargo.toml
            const cargoPath = path.join(workspacePath, 'Cargo.toml');
            if (fs.existsSync(cargoPath)) {
                const content = fs.readFileSync(cargoPath, 'utf8');
                dependencies.rust = this._extractCargoDeps(content);
            }

            // Ruby - Gemfile
            const gemfilePath = path.join(workspacePath, 'Gemfile');
            if (fs.existsSync(gemfilePath)) {
                const content = fs.readFileSync(gemfilePath, 'utf8');
                dependencies.ruby = this._extractGemfileDeps(content);
            }

            // PHP - composer.json
            const composerPath = path.join(workspacePath, 'composer.json');
            if (fs.existsSync(composerPath)) {
                const composer = JSON.parse(fs.readFileSync(composerPath, 'utf8'));
                dependencies.php = Object.keys(composer.require || {});
            }

        } catch (error) {
            console.warn('⚠️ Error discovering dependencies:', error.message);
        }

        return dependencies;
    }

    /**
     * Discover file naming patterns (e.g., *.component.tsx, *.doctype.py)
     * @private
     */
    async _discoverFilePatterns(workspacePath) {
        const patterns = {};

        try {
            // Use VS Code API to find files
            const files = await vscode.workspace.findFiles(
                '**/*.{py,js,ts,tsx,jsx,json,toml,yaml,yml}',
                '**/node_modules/**',
                500
            );

            for (const file of files) {
                const basename = path.basename(file.fsPath);
                const ext = path.extname(basename);

                // Look for patterns like: name.pattern.ext
                const parts = basename.split('.');
                if (parts.length >= 3) {
                    const pattern = parts[parts.length - 2]; // e.g., "component", "doctype", "test"

                    if (!patterns[pattern]) {
                        patterns[pattern] = {
                            count: 0,
                            extensions: new Set(),
                            examples: []
                        };
                    }

                    patterns[pattern].count++;
                    patterns[pattern].extensions.add(ext);

                    if (patterns[pattern].examples.length < 3) {
                        patterns[pattern].examples.push(basename);
                    }
                }
            }

            // Convert Sets to Arrays for serialization
            Object.keys(patterns).forEach(key => {
                patterns[key].extensions = Array.from(patterns[key].extensions);
            });

        } catch (error) {
            console.warn('⚠️ Error discovering file patterns:', error.message);
        }

        return patterns;
    }

    /**
     * Discover common import patterns to understand library usage
     * @private
     */
    async _discoverImportPatterns(workspacePath) {
        const imports = {
            python: {},
            javascript: {}
        };

        try {
            // Sample Python files
            const pyFiles = await vscode.workspace.findFiles(
                '**/*.py',
                '**/node_modules/**',
                50
            );

            for (const file of pyFiles.slice(0, 20)) { // Limit to 20 files for performance
                const content = fs.readFileSync(file.fsPath, 'utf8');
                const pythonImports = this._extractPythonImports(content);

                pythonImports.forEach(imp => {
                    imports.python[imp] = (imports.python[imp] || 0) + 1;
                });
            }

            // Sample JavaScript/TypeScript files
            const jsFiles = await vscode.workspace.findFiles(
                '**/*.{js,ts,tsx,jsx}',
                '**/node_modules/**',
                50
            );

            for (const file of jsFiles.slice(0, 20)) {
                const content = fs.readFileSync(file.fsPath, 'utf8');
                const jsImports = this._extractJSImports(content);

                jsImports.forEach(imp => {
                    imports.javascript[imp] = (imports.javascript[imp] || 0) + 1;
                });
            }

        } catch (error) {
            console.warn('⚠️ Error discovering import patterns:', error.message);
        }

        // Sort by frequency
        imports.python = this._sortByValue(imports.python);
        imports.javascript = this._sortByValue(imports.javascript);

        return imports;
    }

    /**
     * Discover configuration file patterns
     * @private
     */
    async _discoverConfigPatterns(workspacePath) {
        const configs = [];

        const configFiles = [
            '.eslintrc', '.prettierrc', 'tsconfig.json', 'webpack.config.js',
            'babel.config.js', 'jest.config.js', 'vite.config.js',
            'pytest.ini', 'setup.cfg', 'tox.ini', '.flake8',
            'Makefile', 'Rakefile', 'Procfile',
            'docker-compose.yml', 'Dockerfile',
            '.env.example', 'config.yml'
        ];

        for (const file of configFiles) {
            const filepath = path.join(workspacePath, file);
            if (fs.existsSync(filepath)) {
                configs.push({
                    file,
                    path: filepath,
                    size: fs.statSync(filepath).size
                });
            }
        }

        return configs;
    }

    /**
     * Extract knowledge from README and documentation
     * @private
     */
    async _extractDocumentationKnowledge(workspacePath) {
        const knowledge = {
            readme: null,
            docFiles: [],
            conventions: []
        };

        try {
            // Read README
            const readmeFiles = ['README.md', 'README.rst', 'README.txt', 'README'];
            for (const readme of readmeFiles) {
                const readmePath = path.join(workspacePath, readme);
                if (fs.existsSync(readmePath)) {
                    knowledge.readme = fs.readFileSync(readmePath, 'utf8').slice(0, 10000); // First 10KB
                    break;
                }
            }

            // Find documentation files
            const docFiles = await vscode.workspace.findFiles(
                '{docs/**/*.md,*.md,CONTRIBUTING.md,DEVELOPMENT.md}',
                '**/node_modules/**',
                10
            );

            knowledge.docFiles = docFiles.map(file => ({
                name: path.basename(file.fsPath),
                path: file.fsPath
            }));

        } catch (error) {
            console.warn('⚠️ Error extracting documentation:', error.message);
        }

        return knowledge;
    }

    /**
     * Discover naming conventions from existing files
     * @private
     */
    async _discoverNamingConventions(workspacePath) {
        const conventions = {
            caseStyle: null, // snake_case, camelCase, PascalCase, kebab-case
            fileNaming: [],
            directoryStructure: []
        };

        try {
            const files = await vscode.workspace.findFiles(
                '**/*.{py,js,ts,tsx}',
                '**/node_modules/**',
                100
            );

            const fileNames = files.map(f => path.basename(f.fsPath, path.extname(f.fsPath)));

            // Detect case style
            const snakeCase = fileNames.filter(n => n.includes('_')).length;
            const camelCase = fileNames.filter(n => /[a-z][A-Z]/.test(n)).length;
            const kebabCase = fileNames.filter(n => n.includes('-')).length;

            if (snakeCase > camelCase && snakeCase > kebabCase) {
                conventions.caseStyle = 'snake_case';
            } else if (camelCase > snakeCase && camelCase > kebabCase) {
                conventions.caseStyle = 'camelCase';
            } else if (kebabCase > snakeCase && kebabCase > camelCase) {
                conventions.caseStyle = 'kebab-case';
            }

            // Common directory patterns
            const allDirs = files.map(f => path.dirname(f.fsPath));
            const dirCounts = {};
            allDirs.forEach(dir => {
                const relative = path.relative(workspacePath, dir);
                const firstDir = relative.split(path.sep)[0];
                if (firstDir && firstDir !== '..') {
                    dirCounts[firstDir] = (dirCounts[firstDir] || 0) + 1;
                }
            });

            conventions.directoryStructure = Object.entries(dirCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([dir, count]) => ({ directory: dir, fileCount: count }));

        } catch (error) {
            console.warn('⚠️ Error discovering naming conventions:', error.message);
        }

        return conventions;
    }

    /**
     * Find example code patterns from actual files
     * @private
     */
    async _findCodeExamples(workspacePath) {
        const examples = {
            python: [],
            javascript: []
        };

        try {
            // Get a few Python files
            const pyFiles = await vscode.workspace.findFiles('**/*.py', '**/node_modules/**', 5);
            for (const file of pyFiles.slice(0, 3)) {
                const content = fs.readFileSync(file.fsPath, 'utf8');
                examples.python.push({
                    file: path.relative(workspacePath, file.fsPath),
                    snippet: content.slice(0, 500) // First 500 chars
                });
            }

            // Get a few JS/TS files
            const jsFiles = await vscode.workspace.findFiles('**/*.{js,ts}', '**/node_modules/**', 5);
            for (const file of jsFiles.slice(0, 3)) {
                const content = fs.readFileSync(file.fsPath, 'utf8');
                examples.javascript.push({
                    file: path.relative(workspacePath, file.fsPath),
                    snippet: content.slice(0, 500)
                });
            }

        } catch (error) {
            console.warn('⚠️ Error finding code examples:', error.message);
        }

        return examples;
    }

    /**
     * Discover command patterns from scripts, Makefiles, etc.
     * @private
     */
    async _discoverCommandPatterns(workspacePath) {
        const commands = [];

        try {
            // Check package.json scripts
            const packageJsonPath = path.join(workspacePath, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                if (packageJson.scripts) {
                    Object.entries(packageJson.scripts).forEach(([name, command]) => {
                        commands.push({
                            source: 'package.json',
                            name: `npm run ${name}`,
                            command
                        });
                    });
                }
            }

            // Check Makefile
            const makefilePath = path.join(workspacePath, 'Makefile');
            if (fs.existsSync(makefilePath)) {
                const content = fs.readFileSync(makefilePath, 'utf8');
                const targets = content.match(/^[\w-]+:/gm);
                if (targets) {
                    targets.forEach(target => {
                        commands.push({
                            source: 'Makefile',
                            name: `make ${target.replace(':', '')}`,
                            command: target
                        });
                    });
                }
            }

        } catch (error) {
            console.warn('⚠️ Error discovering command patterns:', error.message);
        }

        return commands.slice(0, 20); // Limit to 20 commands
    }

    // Helper methods

    _extractPythonDeps(content, filename) {
        const deps = [];

        if (filename === 'requirements.txt') {
            content.split('\n').forEach(line => {
                line = line.trim();
                if (line && !line.startsWith('#')) {
                    const dep = line.split(/[=<>!]/)[0].trim();
                    if (dep) {deps.push(dep);}
                }
            });
        } else if (filename === 'setup.py') {
            const installRequiresMatch = content.match(/install_requires\s*=\s*\[(.*?)\]/s);
            if (installRequiresMatch) {
                const requires = installRequiresMatch[1];
                const depMatches = requires.match(/['"]([^'"]+)['"]/g);
                if (depMatches) {
                    depMatches.forEach(match => {
                        const dep = match.replace(/['"]/g, '').split(/[=<>!]/)[0].trim();
                        deps.push(dep);
                    });
                }
            }
        }

        return deps;
    }

    _extractGoMods(content) {
        const deps = [];
        const lines = content.split('\n');
        let inRequire = false;

        lines.forEach(line => {
            line = line.trim();
            if (line.startsWith('require (')) {
                inRequire = true;
            } else if (line === ')') {
                inRequire = false;
            } else if (inRequire || line.startsWith('require ')) {
                const match = line.match(/^([^\s]+)/);
                if (match) {deps.push(match[1]);}
            }
        });

        return deps;
    }

    _extractCargoDeps(content) {
        const deps = [];
        const depsMatch = content.match(/\[dependencies\](.*?)(\[|$)/s);

        if (depsMatch) {
            const depsSection = depsMatch[1];
            const depMatches = depsSection.match(/^([a-z_-]+)\s*=/gm);
            if (depMatches) {
                depMatches.forEach(match => {
                    const dep = match.replace(/\s*=.*/, '').trim();
                    deps.push(dep);
                });
            }
        }

        return deps;
    }

    _extractGemfileDeps(content) {
        const deps = [];
        const lines = content.split('\n');

        lines.forEach(line => {
            const match = line.match(/gem\s+['"]([^'"]+)['"]/);
            if (match) {deps.push(match[1]);}
        });

        return deps;
    }

    _extractPythonImports(content) {
        const imports = [];
        const lines = content.split('\n');

        lines.forEach(line => {
            const importMatch = line.match(/^import\s+([a-z_][a-z0-9_]*)/i);
            const fromMatch = line.match(/^from\s+([a-z_][a-z0-9_.]*)\s+import/i);

            if (importMatch) {imports.push(importMatch[1]);}
            if (fromMatch) {imports.push(fromMatch[1].split('.')[0]);}
        });

        return [...new Set(imports)];
    }

    _extractJSImports(content) {
        const imports = [];
        const importMatches = content.matchAll(/(?:import|require)\s*(?:\(?\s*['"]([^'"]+)['"]|.*?from\s+['"]([^'"]+)['"])/g);

        for (const match of importMatches) {
            const imp = match[1] || match[2];
            if (imp && !imp.startsWith('.') && !imp.startsWith('/')) {
                // Get package name (before first /)
                const pkg = imp.split('/')[0];
                imports.push(pkg);
            }
        }

        return [...new Set(imports)];
    }

    _sortByValue(obj) {
        return Object.fromEntries(
            Object.entries(obj)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 20) // Top 20
        );
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }
}

module.exports = CodebasePatternAnalyzer;
