const fs = require('fs').promises;
const path = require('path');
const vscode = require('vscode');

/**
 * RepositoryAnalyzer - Analyzes code repositories
 * Provides insights into structure, dependencies, and code patterns
 */
class RepositoryAnalyzer {
    constructor() {
        this.analysisCache = new Map();
        this.excludePatterns = this.getExcludePatterns();
    }

    /**
     * Get exclude patterns from configuration
     * @returns {Array<string>} Exclude patterns
     */
    getExcludePatterns() {
        const config = vscode.workspace.getConfiguration('oropendola');
        return config.get('analysis.excludePatterns', [
            'node_modules',
            '.git',
            'dist',
            'build',
            'out',
            'vendor',
            '.vscode',
            '*.min.js'
        ]);
    }

    /**
     * Analyze entire repository
     * @param {string} repoPath - Path to repository
     * @returns {Promise<Object>} Analysis results
     */
    async analyzeRepository(repoPath) {
        try {
            vscode.window.showInformationMessage('Analyzing repository...');

            const analysis = {
                path: repoPath,
                structure: await this.analyzeStructure(repoPath),
                dependencies: await this.analyzeDependencies(repoPath),
                languages: await this.detectLanguages(repoPath),
                documentation: await this.findDocumentation(repoPath),
                tests: await this.findTests(repoPath),
                statistics: {},
                timestamp: new Date()
            };

            // Calculate statistics
            analysis.statistics = this.calculateStatistics(analysis);

            // Cache the analysis
            this.analysisCache.set(repoPath, analysis);

            vscode.window.showInformationMessage('Repository analysis complete!');
            return analysis;

        } catch (error) {
            vscode.window.showErrorMessage(`Analysis failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Analyze repository structure
     * @param {string} repoPath - Repository path
     * @returns {Promise<Object>} Structure information
     */
    async analyzeStructure(repoPath) {
        const structure = {
            files: [],
            directories: [],
            totalFiles: 0,
            totalSize: 0
        };

        const traverse = async (dir, relativePath = '') => {
            try {
                const entries = await fs.readdir(dir, { withFileTypes: true });

                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    const relPath = path.join(relativePath, entry.name);

                    // Skip excluded patterns
                    if (this.shouldExclude(relPath)) {
                        continue;
                    }

                    if (entry.isDirectory()) {
                        structure.directories.push(relPath);
                        await traverse(fullPath, relPath);
                    } else if (entry.isFile()) {
                        const stats = await fs.stat(fullPath);
                        structure.files.push({
                            path: relPath,
                            size: stats.size,
                            extension: path.extname(entry.name),
                            language: this.detectFileLanguage(entry.name)
                        });
                        structure.totalFiles++;
                        structure.totalSize += stats.size;
                    }
                }
            } catch (error) {
                console.error(`Error traversing ${dir}:`, error);
            }
        };

        await traverse(repoPath);
        return structure;
    }

    /**
     * Analyze dependencies
     * @param {string} repoPath - Repository path
     * @returns {Promise<Object>} Dependencies information
     */
    async analyzeDependencies(repoPath) {
        const dependencies = {};

        // Check package.json (Node.js/JavaScript)
        const packageJsonPath = path.join(repoPath, 'package.json');
        try {
            const content = await fs.readFile(packageJsonPath, 'utf8');
            const packageJson = JSON.parse(content);
            dependencies.npm = {
                dependencies: packageJson.dependencies || {},
                devDependencies: packageJson.devDependencies || {},
                peerDependencies: packageJson.peerDependencies || {}
            };
        } catch (error) {
            // File doesn't exist or can't be parsed
        }

        // Check requirements.txt (Python)
        const requirementsPath = path.join(repoPath, 'requirements.txt');
        try {
            const content = await fs.readFile(requirementsPath, 'utf8');
            dependencies.python = content
                .split('\n')
                .filter(line => line.trim() && !line.startsWith('#'))
                .map(line => line.trim());
        } catch (error) {
            // File doesn't exist
        }

        // Check Gemfile (Ruby)
        const gemfilePath = path.join(repoPath, 'Gemfile');
        try {
            const content = await fs.readFile(gemfilePath, 'utf8');
            dependencies.ruby = this.parseGemfile(content);
        } catch (error) {
            // File doesn't exist
        }

        // Check go.mod (Go)
        const goModPath = path.join(repoPath, 'go.mod');
        try {
            const content = await fs.readFile(goModPath, 'utf8');
            dependencies.go = this.parseGoMod(content);
        } catch (error) {
            // File doesn't exist
        }

        // Check Cargo.toml (Rust)
        const cargoPath = path.join(repoPath, 'Cargo.toml');
        try {
            const content = await fs.readFile(cargoPath, 'utf8');
            dependencies.rust = this.parseCargoToml(content);
        } catch (error) {
            // File doesn't exist
        }

        return dependencies;
    }

    /**
     * Detect programming languages in repository
     * @param {string} repoPath - Repository path
     * @returns {Promise<Object>} Language statistics
     */
    async detectLanguages(repoPath) {
        const languages = {};

        const analyzeDir = async (dir) => {
            try {
                const entries = await fs.readdir(dir, { withFileTypes: true });

                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    const relativePath = fullPath.replace(repoPath, '');

                    if (this.shouldExclude(relativePath)) {
                        continue;
                    }

                    if (entry.isDirectory()) {
                        await analyzeDir(fullPath);
                    } else if (entry.isFile()) {
                        const lang = this.detectFileLanguage(entry.name);
                        if (lang !== 'text') {
                            languages[lang] = (languages[lang] || 0) + 1;
                        }
                    }
                }
            } catch (error) {
                console.error('Error analyzing directory:', error);
            }
        };

        await analyzeDir(repoPath);
        return languages;
    }

    /**
     * Find documentation files
     * @param {string} repoPath - Repository path
     * @returns {Promise<Array>} Documentation files
     */
    async findDocumentation(repoPath) {
        const docFiles = [];
        const docPatterns = ['README', 'CHANGELOG', 'CONTRIBUTING', 'LICENSE', 'DOCS', 'API'];

        try {
            const entries = await fs.readdir(repoPath);

            for (const entry of entries) {
                const upperEntry = entry.toUpperCase();
                if (docPatterns.some(pattern => upperEntry.includes(pattern))) {
                    docFiles.push(entry);
                }
            }
        } catch (error) {
            console.error('Error finding documentation:', error);
        }

        return docFiles;
    }

    /**
     * Find test files
     * @param {string} repoPath - Repository path
     * @returns {Promise<Array>} Test files
     */
    async findTests(repoPath) {
        const testFiles = [];

        const findTestsInDir = async (dir) => {
            try {
                const entries = await fs.readdir(dir, { withFileTypes: true });

                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    const relativePath = fullPath.replace(repoPath, '');

                    if (this.shouldExclude(relativePath)) {
                        continue;
                    }

                    if (entry.isDirectory()) {
                        if (entry.name.includes('test') || entry.name.includes('spec')) {
                            await findTestsInDir(fullPath);
                        }
                    } else if (entry.isFile()) {
                        const name = entry.name.toLowerCase();
                        if (name.includes('test') || name.includes('spec') || name.endsWith('.test.js') || name.endsWith('.spec.js')) {
                            testFiles.push(relativePath);
                        }
                    }
                }
            } catch (error) {
                console.error('Error finding tests:', error);
            }
        };

        await findTestsInDir(repoPath);
        return testFiles;
    }

    /**
     * Analyze single file
     * @param {string} filePath - File path
     * @returns {Promise<Object>} File analysis
     */
    async analyzeFile(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            const language = this.detectFileLanguage(filePath);

            return {
                path: filePath,
                language,
                lines: content.split('\n').length,
                size: content.length,
                functions: this.extractFunctions(content, language),
                classes: this.extractClasses(content, language),
                imports: this.extractImports(content, language),
                complexity: this.estimateComplexity(content, language)
            };
        } catch (error) {
            throw new Error(`Failed to analyze file: ${error.message}`);
        }
    }

    /**
     * Detect file language from filename
     * @param {string} fileName - File name
     * @returns {string} Language identifier
     */
    detectFileLanguage(fileName) {
        const ext = path.extname(fileName).toLowerCase();
        const languageMap = {
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.py': 'python',
            '.rb': 'ruby',
            '.java': 'java',
            '.cpp': 'cpp',
            '.c': 'c',
            '.cs': 'csharp',
            '.php': 'php',
            '.go': 'go',
            '.rs': 'rust',
            '.swift': 'swift',
            '.kt': 'kotlin',
            '.scala': 'scala',
            '.html': 'html',
            '.css': 'css',
            '.scss': 'scss',
            '.md': 'markdown',
            '.json': 'json',
            '.xml': 'xml',
            '.yaml': 'yaml',
            '.yml': 'yaml',
            '.sh': 'shell',
            '.sql': 'sql'
        };

        return languageMap[ext] || 'text';
    }

    /**
     * Extract functions from code
     * @param {string} content - File content
     * @param {string} language - Programming language
     * @returns {Array<string>} Function names
     */
    extractFunctions(content, language) {
        const functions = [];
        const patterns = {
            javascript: /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>))/g,
            typescript: /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>))/g,
            python: /def\s+(\w+)\s*\(/g,
            java: /(?:public|private|protected)?\s*(?:static)?\s*\w+\s+(\w+)\s*\(/g,
            go: /func\s+(\w+)\s*\(/g,
            rust: /fn\s+(\w+)\s*[(<]/g
        };

        const pattern = patterns[language];
        if (pattern) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const funcName = match[1] || match[2];
                if (funcName) {
                    functions.push(funcName);
                }
            }
        }

        return functions;
    }

    /**
     * Extract classes from code
     * @param {string} content - File content
     * @param {string} language - Programming language
     * @returns {Array<string>} Class names
     */
    extractClasses(content, language) {
        const classes = [];
        const patterns = {
            javascript: /class\s+(\w+)/g,
            typescript: /class\s+(\w+)/g,
            python: /class\s+(\w+)/g,
            java: /(?:public|private)?\s*class\s+(\w+)/g,
            go: /type\s+(\w+)\s+struct/g,
            rust: /(?:pub\s+)?struct\s+(\w+)/g
        };

        const pattern = patterns[language];
        if (pattern) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                classes.push(match[1]);
            }
        }

        return classes;
    }

    /**
     * Extract imports from code
     * @param {string} content - File content
     * @param {string} language - Programming language
     * @returns {Array<string>} Import statements
     */
    extractImports(content, language) {
        const imports = [];
        const patterns = {
            javascript: /(?:import|require)\s*\(?['"`]([^'"`]+)['"`]\)?/g,
            typescript: /import.*from\s+['"`]([^'"`]+)['"`]/g,
            python: /(?:import|from)\s+([\w.]+)/g,
            java: /import\s+([\w.]+)/g,
            go: /import\s+(?:"([^"]+)"|[(]([^)]+)[)])/g
        };

        const pattern = patterns[language];
        if (pattern) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                imports.push(match[1] || match[2]);
            }
        }

        return imports;
    }

    /**
     * Estimate code complexity
     * @param {string} content - File content
     * @param {string} _language - Programming language
     * @returns {Object} Complexity metrics
     */
    estimateComplexity(content, _language) {
        const lines = content.split('\n');
        const codeLines = lines.filter(line => {
            const trimmed = line.trim();
            return trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('#');
        });

        return {
            totalLines: lines.length,
            codeLines: codeLines.length,
            commentLines: lines.length - codeLines.length,
            averageLineLength: codeLines.reduce((sum, line) => sum + line.length, 0) / codeLines.length || 0
        };
    }

    /**
     * Calculate repository statistics
     * @param {Object} analysis - Analysis data
     * @returns {Object} Statistics
     */
    calculateStatistics(analysis) {
        return {
            totalFiles: analysis.structure.totalFiles,
            totalDirectories: analysis.structure.directories.length,
            totalSize: analysis.structure.totalSize,
            primaryLanguages: Object.entries(analysis.languages)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([lang, count]) => ({ language: lang, files: count })),
            hasTests: analysis.tests.length > 0,
            hasDocumentation: analysis.documentation.length > 0,
            dependencyCount: Object.values(analysis.dependencies).reduce((sum, deps) => {
                if (Array.isArray(deps)) return sum + deps.length;
                if (typeof deps === 'object') return sum + Object.keys(deps).length;
                return sum;
            }, 0)
        };
    }

    /**
     * Check if path should be excluded
     * @param {string} relativePath - Relative path
     * @returns {boolean} Should exclude
     */
    shouldExclude(relativePath) {
        return this.excludePatterns.some(pattern => {
            if (pattern.includes('*')) {
                const regex = new RegExp(pattern.replace(/\*/g, '.*'));
                return regex.test(relativePath);
            }
            return relativePath.includes(pattern);
        });
    }

    /**
     * Parse Gemfile content
     * @param {string} content - Gemfile content
     * @returns {Array<string>} Gem names
     */
    parseGemfile(content) {
        const gems = [];
        const lines = content.split('\n');
        for (const line of lines) {
            const match = line.match(/gem\s+['"]([^'"]+)['"]/);
            if (match) {
                gems.push(match[1]);
            }
        }
        return gems;
    }

    /**
     * Parse go.mod content
     * @param {string} content - go.mod content
     * @returns {Array<string>} Module names
     */
    parseGoMod(content) {
        const modules = [];
        const lines = content.split('\n');
        for (const line of lines) {
            const match = line.trim().match(/^([^\s]+)\s+v[\d.]+/);
            if (match && !line.includes('module ')) {
                modules.push(match[1]);
            }
        }
        return modules;
    }

    /**
     * Parse Cargo.toml content
     * @param {string} content - Cargo.toml content
     * @returns {Array<string>} Crate names
     */
    parseCargoToml(content) {
        const crates = [];
        const lines = content.split('\n');
        let inDependencies = false;

        for (const line of lines) {
            if (line.trim() === '[dependencies]') {
                inDependencies = true;
                continue;
            }
            if (line.trim().startsWith('[') && inDependencies) {
                break;
            }
            if (inDependencies) {
                const match = line.match(/^([^\s=]+)\s*=/);
                if (match) {
                    crates.push(match[1]);
                }
            }
        }
        return crates;
    }

    /**
     * Get cached analysis
     * @param {string} repoPath - Repository path
     * @returns {Object|null} Cached analysis or null
     */
    getCachedAnalysis(repoPath) {
        return this.analysisCache.get(repoPath) || null;
    }

    /**
     * Clear analysis cache
     */
    clearCache() {
        this.analysisCache.clear();
    }
}

module.exports = RepositoryAnalyzer;
