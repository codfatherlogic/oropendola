const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * LocalWorkspaceAnalyzer - Analyze workspace WITHOUT backend API
 * Replaces failing backend workspace/git API calls
 * Provides deep workspace understanding from local file system
 */
class LocalWorkspaceAnalyzer {
    constructor() {
        this._cache = null;
        this._cacheTimestamp = null;
        this._cacheDuration = 60000; // 1 minute cache

        // ✨ FRAMEWORK DETECTION REGISTRY (v3.2.5)
        // Priority order: Higher priority = checked first
        // Each framework has multiple indicators for robust detection
        this._frameworkRegistry = [
            {
                name: 'Frappe',
                priority: 100,
                indicators: [
                    { type: 'folders', paths: ['apps', 'sites'], all: true },
                    { type: 'file', path: 'hooks.py' },
                    { type: 'file', path: 'apps.txt' },
                    { type: 'file', path: 'Procfile', contains: ['bench', 'frappe'] },
                    { type: 'pattern', regex: /doctype.*\.json$/i }
                ],
                detector: this._detectFrappeProject.bind(this)
            },
            {
                name: 'Rust',
                priority: 90,
                indicators: [
                    { type: 'file', path: 'Cargo.toml' },
                    { type: 'file', path: 'Cargo.lock' },
                    { type: 'folder', path: 'src', contains: '*.rs' }
                ],
                configFile: 'Cargo.toml'
            },
            {
                name: 'Go',
                priority: 85,
                indicators: [
                    { type: 'file', path: 'go.mod' },
                    { type: 'file', path: 'go.sum' },
                    { type: 'pattern', regex: /\.go$/ }
                ],
                configFile: 'go.mod'
            },
            {
                name: 'Java',
                priority: 80,
                indicators: [
                    { type: 'file', path: 'pom.xml' },
                    { type: 'file', path: 'build.gradle' },
                    { type: 'file', path: 'build.gradle.kts' },
                    { type: 'folder', path: 'src/main/java' }
                ],
                configFiles: ['pom.xml', 'build.gradle', 'build.gradle.kts']
            },
            {
                name: 'Python',
                priority: 70,
                indicators: [
                    { type: 'file', path: 'requirements.txt' },
                    { type: 'file', path: 'setup.py' },
                    { type: 'file', path: 'pyproject.toml' },
                    { type: 'file', path: 'Pipfile' },
                    { type: 'file', path: 'poetry.lock' }
                ],
                detector: this._detectPythonProject.bind(this)
            },
            {
                name: 'Ruby',
                priority: 65,
                indicators: [
                    { type: 'file', path: 'Gemfile' },
                    { type: 'file', path: 'Gemfile.lock' },
                    { type: 'file', path: 'config.ru' }
                ],
                configFile: 'Gemfile'
            },
            {
                name: 'PHP',
                priority: 60,
                indicators: [
                    { type: 'file', path: 'composer.json' },
                    { type: 'file', path: 'composer.lock' },
                    { type: 'folder', path: 'vendor' }
                ],
                configFile: 'composer.json'
            },
            {
                name: 'Node.js',
                priority: 50, // Lower priority - many projects have package.json for tools
                indicators: [
                    { type: 'file', path: 'package.json' },
                    { type: 'file', path: 'package-lock.json' },
                    { type: 'file', path: 'yarn.lock' },
                    { type: 'folder', path: 'node_modules' }
                ],
                detector: this._detectNodeProject.bind(this)
            },
            {
                name: 'C/C++',
                priority: 75,
                indicators: [
                    { type: 'file', path: 'CMakeLists.txt' },
                    { type: 'file', path: 'Makefile' },
                    { type: 'file', path: 'configure.ac' },
                    { type: 'pattern', regex: /\.(c|cpp|cc|h|hpp)$/ }
                ],
                configFiles: ['CMakeLists.txt', 'Makefile']
            },
            {
                name: '.NET',
                priority: 78,
                indicators: [
                    { type: 'pattern', regex: /\.csproj$/ },
                    { type: 'pattern', regex: /\.sln$/ },
                    { type: 'file', path: 'global.json' }
                ],
                configFile: '*.csproj'
            }
        ];
    }

    /**
     * Analyze workspace and return comprehensive context
     * @param {string} workspacePath - Workspace root path
     * @param {boolean} useCache - Whether to use cached results
     * @returns {Promise<Object>} Workspace analysis
     */
    async analyzeWorkspace(workspacePath, useCache = true) {
        // Return cache if valid
        if (useCache && this._isCacheValid()) {
            console.log('📦 Using cached workspace analysis');
            return this._cache;
        }

        console.log('🔍 Analyzing workspace locally...');

        const analysis = {
            workspacePath,
            projectName: path.basename(workspacePath),
            projectType: 'Unknown',
            languages: [],
            dependencies: [],
            devDependencies: [],
            structure: {},
            git: null,
            fileCount: 0,
            hasTests: false,
            hasDocsFolder: false,
            configFiles: []
        };

        try {
            // Detect project type and dependencies
            await this._analyzeProjectType(workspacePath, analysis);

            // Analyze file structure
            await this._analyzeFileStructure(workspacePath, analysis);

            // Get git information
            await this._analyzeGit(workspacePath, analysis);

            // Detect languages
            this._detectLanguages(analysis);

            // Cache results
            this._cache = analysis;
            this._cacheTimestamp = Date.now();

            console.log('✅ Workspace analysis complete:', {
                type: analysis.projectType,
                languages: analysis.languages,
                dependencies: analysis.dependencies.length,
                git: analysis.git?.branch
            });

            return analysis;

        } catch (error) {
            console.error('❌ Workspace analysis failed:', error);
            return analysis; // Return partial analysis
        }
    }

    /**
     * Analyze project type using framework registry
     * ✨ UNIVERSAL DYNAMIC DETECTION (v3.2.5)
     * Uses priority-ordered framework registry with multiple indicators
     * @private
     */
    async _analyzeProjectType(workspacePath, analysis) {
        console.log('🔍 Starting dynamic framework detection...');

        // Sort frameworks by priority (highest first)
        const sortedFrameworks = [...this._frameworkRegistry].sort((a, b) => b.priority - a.priority);

        console.log(`📋 Checking ${sortedFrameworks.length} frameworks in priority order:`);
        sortedFrameworks.forEach(fw => {
            console.log(`   ${fw.priority}: ${fw.name} (${fw.indicators.length} indicators)`);
        });

        // Check each framework in priority order
        for (const framework of sortedFrameworks) {
            const detected = await this._checkFrameworkIndicators(workspacePath, framework, analysis);

            if (detected) {
                console.log(`✅ Framework detected: ${framework.name} (priority ${framework.priority})`);

                // Use custom detector if available
                if (framework.detector) {
                    const detectorResult = framework.detector(workspacePath, analysis);
                    if (detectorResult) {
                        analysis.projectType = detectorResult;
                        analysis.framework = framework.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                        console.log(`   Custom detector: ${detectorResult}`);
                        return; // Early return - framework found!
                    }
                }

                // Default detection
                analysis.projectType = framework.name;
                analysis.framework = framework.name.toLowerCase().replace(/[^a-z0-9]/g, '');

                // Add config files
                if (framework.configFile) {
                    analysis.configFiles.push(framework.configFile);
                } else if (framework.configFiles) {
                    analysis.configFiles.push(...framework.configFiles);
                }

                return; // Early return - framework found!
            }
        }

        console.log('❌ No framework detected - marking as Unknown');
        analysis.projectType = 'Unknown';
    }

    /**
     * Check if workspace matches framework indicators
     * @private
     */
    async _checkFrameworkIndicators(workspacePath, framework, analysis) {
        for (const indicator of framework.indicators) {
            let matched = false;

            switch (indicator.type) {
                case 'file':
                    const filePath = path.join(workspacePath, indicator.path);
                    if (fs.existsSync(filePath)) {
                        // Check file contents if specified
                        if (indicator.contains) {
                            try {
                                const content = fs.readFileSync(filePath, 'utf8');
                                matched = indicator.contains.some(keyword => content.includes(keyword));
                            } catch (error) {
                                matched = false;
                            }
                        } else {
                            matched = true;
                        }

                        if (matched) {
                            console.log(`      ✓ Found ${indicator.path}`);
                            return true; // Indicator matched!
                        }
                    }
                    break;

                case 'folder':
                    const folderPath = path.join(workspacePath, indicator.path);
                    if (fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory()) {
                        console.log(`      ✓ Found folder ${indicator.path}`);
                        return true;
                    }
                    break;

                case 'folders':
                    // Check multiple folders (all must exist if 'all: true')
                    const allPaths = indicator.paths.map(p => path.join(workspacePath, p));
                    const existingPaths = allPaths.filter(p => fs.existsSync(p) && fs.statSync(p).isDirectory());

                    if (indicator.all && existingPaths.length === allPaths.length) {
                        console.log(`      ✓ Found all folders: ${indicator.paths.join(', ')}`);
                        return true;
                    } else if (!indicator.all && existingPaths.length > 0) {
                        console.log(`      ✓ Found folders: ${existingPaths.map(p => path.basename(p)).join(', ')}`);
                        return true;
                    }
                    break;

                case 'pattern':
                    // Check if any files match pattern
                    const hasMatch = this._hasFilesMatching(workspacePath, indicator.regex);
                    if (hasMatch) {
                        console.log(`      ✓ Found files matching pattern: ${indicator.regex}`);
                        return true;
                    }
                    break;

                default:
                    console.warn(`      ⚠️ Unknown indicator type: ${indicator.type}`);
            }
        }

        return false; // No indicators matched
    }

    /**
     * Detect Node.js project type from package.json
     * Custom detector for framework registry
     * @private
     */
    _detectNodeProject(workspacePath, analysis) {
        const packageJsonPath = path.join(workspacePath, 'package.json');
        if (!fs.existsSync(packageJsonPath)) return null;

        try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const deps = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };

            analysis.dependencies = Object.keys(packageJson.dependencies || {});
            analysis.devDependencies = Object.keys(packageJson.devDependencies || {});
            analysis.configFiles.push('package.json');

            // Detect specific framework
            if (deps.react) {
                if (deps.next) return 'Next.js (React)';
                if (deps['react-native']) return 'React Native';
                return 'React';
            }

            if (deps.vue) {
                if (deps.nuxt) return 'Nuxt.js (Vue)';
                return 'Vue.js';
            }

            if (deps.angular || deps['@angular/core']) return 'Angular';
            if (deps.svelte) return 'Svelte';
            if (deps.express) return 'Express.js';
            if (deps.fastify) return 'Fastify';
            if (deps.koa) return 'Koa.js';
            if (deps.electron) return 'Electron';
            if (deps.gatsby) return 'Gatsby';

            console.log(`   Dependencies: ${analysis.dependencies.length}`);
            return 'Node.js';

        } catch (error) {
            console.warn('⚠️ Failed to parse package.json:', error.message);
            return null;
        }
    }

    /**
     * Detect Python project type from dependencies
     * Custom detector for framework registry
     * @private
     */
    _detectPythonProject(workspacePath, analysis) {
        const requirementsPath = path.join(workspacePath, 'requirements.txt');
        if (!fs.existsSync(requirementsPath)) return null;

        try {
            const requirements = fs.readFileSync(requirementsPath, 'utf8');
            const dependencies = requirements
                .split('\n')
                .filter(line => line.trim() && !line.startsWith('#'))
                .map(line => line.split('==')[0].trim());

            const deps = dependencies.map(d => d.toLowerCase());

            analysis.dependencies = dependencies;
            analysis.configFiles.push('requirements.txt');

            // Check for specific frameworks
            if (deps.includes('django')) return 'Django';
            if (deps.includes('flask')) return 'Flask';
            if (deps.includes('fastapi')) return 'FastAPI';
            if (deps.includes('tornado')) return 'Tornado';
            if (deps.includes('pyramid')) return 'Pyramid';

            console.log(`   Python dependencies: ${dependencies.length}`);
            return 'Python';

        } catch (error) {
            console.warn('⚠️ Failed to parse requirements.txt:', error.message);
            return null;
        }
    }

    /**
     * Detect Frappe/ERPNext project by directory structure
     * ✨ ENHANCED: Multiple indicators, prioritized detection (v3.2.4)
     * @private
     */
    _detectFrappeProject(workspacePath, analysis) {
        try {
            console.log('🔍 Checking for Frappe indicators...');

            // 🔥 INDICATOR 1: Frappe Bench structure (highest priority)
            const appsPath = path.join(workspacePath, 'apps');
            const sitesPath = path.join(workspacePath, 'sites');
            const procfilePath = path.join(workspacePath, 'Procfile');

            if (fs.existsSync(appsPath) && fs.existsSync(sitesPath)) {
                console.log('✅ Found apps/ and sites/ - Frappe Bench detected');
                analysis.configFiles.push('apps/', 'sites/');

                // List apps in bench
                const apps = fs.readdirSync(appsPath).filter(file => {
                    const appPath = path.join(appsPath, file);
                    return fs.statSync(appPath).isDirectory() && file !== '.DS_Store';
                });

                analysis.frappeApps = apps;
                console.log(`📋 Frappe apps found: ${apps.join(', ')}`);

                // Check if ERPNext is installed
                if (apps.includes('erpnext')) {
                    return 'ERPNext (Frappe Bench)';
                }

                return 'Frappe Bench';
            }

            // 🔥 INDICATOR 2: Frappe app directory (hooks.py)
            const hooksPath = path.join(workspacePath, 'hooks.py');
            if (fs.existsSync(hooksPath)) {
                console.log('✅ Found hooks.py - Frappe App detected');
                analysis.configFiles.push('hooks.py');

                const appName = path.basename(workspacePath);
                analysis.frappeApp = appName;

                // Check for DocType folders
                this._detectFrappeDocTypes(workspacePath, analysis);

                console.log(`📋 Frappe app detected: ${appName}`);
                return 'Frappe App';
            }

            // 🔥 INDICATOR 3: DocType JSON files (app subfolder opened)
            const doctypePattern = /doctype.*\.json$/i;
            const hasDocTypeFiles = this._hasFilesMatching(workspacePath, doctypePattern);
            if (hasDocTypeFiles) {
                console.log('✅ Found DocType JSON files - Frappe workspace detected');
                analysis.configFiles.push('*.json (DocTypes)');

                this._detectFrappeDocTypes(workspacePath, analysis);

                return 'Frappe App (DocTypes)';
            }

            // 🔥 INDICATOR 4: Procfile with bench command
            if (fs.existsSync(procfilePath)) {
                try {
                    const procfileContent = fs.readFileSync(procfilePath, 'utf8');
                    if (procfileContent.includes('bench') || procfileContent.includes('frappe')) {
                        console.log('✅ Found Procfile with bench/frappe - Frappe Bench detected');
                        analysis.configFiles.push('Procfile');
                        return 'Frappe Bench';
                    }
                } catch (error) {
                    console.warn('⚠️ Failed to read Procfile:', error.message);
                }
            }

            // 🔥 INDICATOR 5: apps.txt file (bench apps list)
            const appsTxtPath = path.join(workspacePath, 'apps.txt');
            if (fs.existsSync(appsTxtPath)) {
                console.log('✅ Found apps.txt - Frappe Bench detected');
                analysis.configFiles.push('apps.txt');
                return 'Frappe Bench';
            }

            console.log('❌ No Frappe indicators found');
            return null;

        } catch (error) {
            console.warn('⚠️ Error detecting Frappe project:', error.message);
            return null;
        }
    }

    /**
     * Detect Frappe DocTypes in workspace
     * @private
     */
    _detectFrappeDocTypes(workspacePath, analysis) {
        try {
            // Look for common DocType folders
            const commonPaths = [
                path.join(workspacePath, 'doctype'),
                path.join(workspacePath, '*', 'doctype'),
                path.join(workspacePath, '*', '*', 'doctype')
            ];

            const docTypes = [];

            commonPaths.forEach(pattern => {
                if (pattern.includes('*')) {
                    // Handle glob patterns
                    return;
                }

                if (fs.existsSync(pattern)) {
                    const files = fs.readdirSync(pattern);
                    files.forEach(file => {
                        if (file.endsWith('.json')) {
                            docTypes.push(file.replace('.json', ''));
                        }
                    });
                }
            });

            if (docTypes.length > 0) {
                analysis.frappeDocTypes = docTypes;
                console.log(`   Found ${docTypes.length} DocTypes: ${docTypes.slice(0, 5).join(', ')}${docTypes.length > 5 ? '...' : ''}`);
            }

        } catch (error) {
            console.warn('⚠️ Error detecting DocTypes:', error.message);
        }
    }

    /**
     * Check if workspace has files matching pattern
     * @private
     */
    _hasFilesMatching(workspacePath, pattern) {
        try {
            const files = fs.readdirSync(workspacePath, { recursive: true, encoding: 'utf8' });
            return files.some(file => pattern.test(file));
        } catch (error) {
            // Fallback for older Node.js versions without recursive option
            return false;
        }
    }

    /**
     * Analyze file structure
     * @private
     */
    async _analyzeFileStructure(workspacePath, analysis) {
        try {
            // Use VS Code API to find files (respects .gitignore)
            const files = await vscode.workspace.findFiles(
                '**/*',
                '**/node_modules/**',
                2000 // Limit to prevent slowdown
            );

            analysis.fileCount = files.length;

            // Build structure map
            const structure = {};
            const extensions = new Set();

            files.forEach(file => {
                const relativePath = path.relative(workspacePath, file.fsPath);
                const parts = relativePath.split(path.sep);
                const ext = path.extname(file.fsPath);

                if (ext) extensions.add(ext);

                // Build directory tree (first 2 levels only)
                if (parts.length > 0) {
                    const topLevel = parts[0];
                    if (!structure[topLevel]) {
                        structure[topLevel] = { type: 'folder', files: [] };
                    }

                    if (parts.length === 1) {
                        structure[topLevel].files.push(path.basename(file.fsPath));
                    }
                }

                // Detect special folders
                if (relativePath.match(/test|spec|__tests__/i)) {
                    analysis.hasTests = true;
                }

                if (relativePath.match(/docs?|documentation/i)) {
                    analysis.hasDocsFolder = true;
                }
            });

            analysis.structure = structure;
            analysis.extensions = Array.from(extensions);

            console.log(`📁 Analyzed ${analysis.fileCount} files`);

        } catch (error) {
            console.warn('⚠️ File structure analysis failed:', error.message);
        }
    }

    /**
     * Analyze git repository
     * @private
     */
    async _analyzeGit(workspacePath, analysis) {
        try {
            // Check if git repo
            if (!fs.existsSync(path.join(workspacePath, '.git'))) {
                console.log('ℹ️ Not a git repository');
                return;
            }

            const git = {};

            // Get current branch
            try {
                git.branch = execSync('git branch --show-current', {
                    cwd: workspacePath,
                    encoding: 'utf8',
                    stdio: ['pipe', 'pipe', 'ignore'] // Suppress stderr
                }).trim();
            } catch (e) {
                git.branch = 'unknown';
            }

            // Get uncommitted changes
            try {
                const status = execSync('git status --porcelain', {
                    cwd: workspacePath,
                    encoding: 'utf8',
                    stdio: ['pipe', 'pipe', 'ignore']
                });

                const lines = status.split('\n').filter(Boolean);
                git.uncommittedChanges = lines.length;
                git.isDirty = lines.length > 0;

                // Parse modified files
                git.modifiedFiles = lines.slice(0, 10).map(line => {
                    const parts = line.trim().split(/\s+/);
                    return {
                        status: parts[0],
                        file: parts[1]
                    };
                });

            } catch (e) {
                git.uncommittedChanges = 0;
                git.isDirty = false;
            }

            // Get last commit
            try {
                git.lastCommit = execSync('git log -1 --format="%h - %s (%cr)"', {
                    cwd: workspacePath,
                    encoding: 'utf8',
                    stdio: ['pipe', 'pipe', 'ignore']
                }).trim();
            } catch (e) {
                git.lastCommit = null;
            }

            analysis.git = git;

            console.log(`🔀 Git: ${git.branch}, ${git.uncommittedChanges} uncommitted changes`);

        } catch (error) {
            console.warn('⚠️ Git analysis failed:', error.message);
        }
    }

    /**
     * Detect primary languages from extensions
     * @private
     */
    _detectLanguages(analysis) {
        const extensionMap = {
            '.js': 'JavaScript',
            '.jsx': 'JavaScript',
            '.ts': 'TypeScript',
            '.tsx': 'TypeScript',
            '.py': 'Python',
            '.java': 'Java',
            '.cpp': 'C++',
            '.c': 'C',
            '.go': 'Go',
            '.rs': 'Rust',
            '.php': 'PHP',
            '.rb': 'Ruby',
            '.swift': 'Swift',
            '.kt': 'Kotlin',
            '.cs': 'C#'
        };

        const languages = new Set();

        (analysis.extensions || []).forEach(ext => {
            const lang = extensionMap[ext];
            if (lang) languages.add(lang);
        });

        analysis.languages = Array.from(languages);
    }

    /**
     * Check if cache is still valid
     * @private
     */
    _isCacheValid() {
        if (!this._cache || !this._cacheTimestamp) return false;
        return (Date.now() - this._cacheTimestamp) < this._cacheDuration;
    }

    /**
     * Invalidate cache (call when files change)
     */
    invalidateCache() {
        this._cache = null;
        this._cacheTimestamp = null;
        console.log('🗑️ Workspace analysis cache invalidated');
    }

    /**
     * Get quick summary for AI context
     */
    async getQuickSummary(workspacePath) {
        const analysis = await this.analyzeWorkspace(workspacePath, true);

        return {
            projectType: analysis.projectType,
            mainLanguages: analysis.languages.slice(0, 3),
            dependencyCount: analysis.dependencies.length,
            fileCount: analysis.fileCount,
            gitBranch: analysis.git?.branch || null,
            hasUncommittedChanges: analysis.git?.isDirty || false
        };
    }
}

module.exports = LocalWorkspaceAnalyzer;
