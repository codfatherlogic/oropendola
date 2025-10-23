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
     * Analyze project type from config files
     * @private
     */
    async _analyzeProjectType(workspacePath, analysis) {
        // Check for Node.js project
        const packageJsonPath = path.join(workspacePath, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

                analysis.projectType = this._detectNodeProjectType(packageJson);
                analysis.dependencies = Object.keys(packageJson.dependencies || {});
                analysis.devDependencies = Object.keys(packageJson.devDependencies || {});
                analysis.configFiles.push('package.json');

                console.log(`📦 Node.js project detected: ${analysis.projectType}`);
                console.log(`   Dependencies: ${analysis.dependencies.length}`);

            } catch (error) {
                console.warn('⚠️ Failed to parse package.json:', error.message);
            }
        }

        // Check for Python project
        const requirementsPath = path.join(workspacePath, 'requirements.txt');
        if (fs.existsSync(requirementsPath)) {
            try {
                const requirements = fs.readFileSync(requirementsPath, 'utf8');
                analysis.dependencies = requirements
                    .split('\n')
                    .filter(line => line.trim() && !line.startsWith('#'))
                    .map(line => line.split('==')[0].trim());

                analysis.projectType = this._detectPythonProjectType(analysis.dependencies, workspacePath);
                analysis.configFiles.push('requirements.txt');

                console.log(`🐍 Python project detected: ${analysis.projectType}`);

            } catch (error) {
                console.warn('⚠️ Failed to parse requirements.txt:', error.message);
            }
        }

        // Check for Frappe/ERPNext project structure
        const frappeDetected = this._detectFrappeProject(workspacePath, analysis);
        if (frappeDetected) {
            analysis.projectType = frappeDetected;
            console.log(`📋 Frappe project detected: ${frappeDetected}`);
        }

        // Check for other project types
        if (fs.existsSync(path.join(workspacePath, 'Cargo.toml'))) {
            analysis.projectType = 'Rust';
            analysis.configFiles.push('Cargo.toml');
        }

        if (fs.existsSync(path.join(workspacePath, 'go.mod'))) {
            analysis.projectType = 'Go';
            analysis.configFiles.push('go.mod');
        }

        if (fs.existsSync(path.join(workspacePath, 'pom.xml'))) {
            analysis.projectType = 'Java (Maven)';
            analysis.configFiles.push('pom.xml');
        }

        if (fs.existsSync(path.join(workspacePath, 'build.gradle'))) {
            analysis.projectType = 'Java (Gradle)';
            analysis.configFiles.push('build.gradle');
        }
    }

    /**
     * Detect Node.js project type from dependencies
     * @private
     */
    _detectNodeProjectType(packageJson) {
        const deps = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };

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

        return 'Node.js';
    }

    /**
     * Detect Python project type from dependencies
     * @private
     */
    _detectPythonProjectType(dependencies, workspacePath) {
        const deps = dependencies.map(d => d.toLowerCase());

        // Check for Frappe/ERPNext
        if (deps.includes('frappe') || deps.includes('erpnext')) {
            return 'Frappe/ERPNext';
        }

        if (deps.includes('django')) return 'Django';
        if (deps.includes('flask')) return 'Flask';
        if (deps.includes('fastapi')) return 'FastAPI';
        if (deps.includes('tornado')) return 'Tornado';
        if (deps.includes('pyramid')) return 'Pyramid';

        return 'Python';
    }

    /**
     * Detect Frappe/ERPNext project by directory structure
     * @private
     */
    _detectFrappeProject(workspacePath, analysis) {
        try {
            // Check for frappe-bench structure
            const appsPath = path.join(workspacePath, 'apps');
            const sitesPath = path.join(workspacePath, 'sites');
            const benchConfigPath = path.join(workspacePath, 'config');

            // Check if this is a bench directory
            if (fs.existsSync(appsPath) && fs.existsSync(sitesPath)) {
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

            // Check if this is a Frappe app directory
            const hooksPath = path.join(workspacePath, 'hooks.py');
            const appJsonPath = path.join(workspacePath, 'pyproject.toml');

            if (fs.existsSync(hooksPath)) {
                analysis.configFiles.push('hooks.py');

                // Check for app name in parent directory
                const appName = path.basename(workspacePath);
                analysis.frappeApp = appName;

                console.log(`📋 Frappe app detected: ${appName}`);
                return 'Frappe App';
            }

            return null;

        } catch (error) {
            console.warn('⚠️ Error detecting Frappe project:', error.message);
            return null;
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
