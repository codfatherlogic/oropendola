const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

/**
 * WorkspaceStructureLearner - Dynamically learn workspace patterns
 *
 * Like GitHub Copilot, this learns:
 * 1. WHERE to create files (discover app structure)
 * 2. WHAT naming conventions exist (snake_case, PascalCase, etc.)
 * 3. WHAT patterns are used (folder structures, file templates)
 *
 * Example:
 * - Detects Frappe app name by finding hooks.py location
 * - Learns DocType location pattern: {app}/{app}/doctype/{name}/{name}.json
 * - Discovers API location: {app}/{app}/api.py or {app}/{app}/api/*.py
 */
class WorkspaceStructureLearner {
    constructor() {
        this._cache = null;
        this._cacheTimestamp = null;
        this._cacheDuration = 300000; // 5 minutes
    }

    /**
     * Learn workspace structure dynamically
     * @param {string} workspacePath - Workspace root
     * @param {string} framework - Detected framework (e.g., "Frappe", "React")
     * @returns {Promise<Object>} Learned patterns and structure
     */
    async learnStructure(workspacePath, framework) {
        console.log(`🎓 [Learning] Analyzing ${framework} workspace structure...`);

        // Check cache
        if (this._isCacheValid(framework)) {
            console.log('📦 Using cached structure knowledge');
            return this._cache;
        }

        const structure = {
            framework,
            detectedPatterns: [],
            fileLocations: {},
            namingConventions: {},
            appMetadata: {},
            exampleFiles: [],
            suggestedLocations: {}
        };

        try {
            // Framework-specific learning
            switch (framework.toLowerCase()) {
                case 'frappe':
                case 'erpnext':
                    await this._learnFrappeStructure(workspacePath, structure);
                    break;

                case 'react':
                case 'next.js':
                    await this._learnReactStructure(workspacePath, structure);
                    break;

                case 'electron':
                    await this._learnElectronStructure(workspacePath, structure);
                    break;

                case 'django':
                    await this._learnDjangoStructure(workspacePath, structure);
                    break;

                case 'express':
                case 'node.js':
                    await this._learnNodeStructure(workspacePath, structure);
                    break;

                default:
                    await this._learnGenericStructure(workspacePath, structure);
            }

            // Cache the learned structure
            this._cache = structure;
            this._cacheTimestamp = Date.now();
            this._cacheFramework = framework;

            console.log('✅ [Learning] Structure analysis complete');
            console.log(`📋 [Learning] Detected ${structure.detectedPatterns.length} patterns`);

            return structure;

        } catch (error) {
            console.error('❌ [Learning] Failed to analyze structure:', error);
            return structure; // Return partial structure
        }
    }

    /**
     * Learn Frappe workspace structure
     * Discovers: app name, DocType locations, API patterns, etc.
     * @private
     */
    async _learnFrappeStructure(workspacePath, structure) {
        console.log('🔍 [Frappe] Learning Frappe workspace patterns...');

        // PATTERN 1: Detect if this is a Frappe Bench or Frappe App
        const appsPath = path.join(workspacePath, 'apps');
        const sitesPath = path.join(workspacePath, 'sites');
        const hooksPath = path.join(workspacePath, 'hooks.py');

        let workspaceType = 'unknown';
        let appName = null;
        let appPath = null;

        // Scenario A: Frappe Bench (has apps/ and sites/)
        if (fs.existsSync(appsPath) && fs.existsSync(sitesPath)) {
            workspaceType = 'bench';
            structure.detectedPatterns.push('Frappe Bench structure (apps/, sites/)');

            // List all apps in bench
            const apps = fs.readdirSync(appsPath).filter(file => {
                const fullPath = path.join(appsPath, file);
                return fs.statSync(fullPath).isDirectory() && file !== '.DS_Store';
            });

            structure.appMetadata.benchApps = apps;
            structure.appMetadata.type = 'bench';

            // Use first custom app (not frappe/erpnext) as default
            appName = apps.find(app => !['frappe', 'erpnext'].includes(app)) || apps[0];
            appPath = path.join(appsPath, appName, appName);

            console.log(`✓ Detected Frappe Bench with ${apps.length} apps`);
            console.log(`✓ Primary app: ${appName}`);
        }
        // Scenario B: Frappe App directory (has hooks.py in root)
        else if (fs.existsSync(hooksPath)) {
            workspaceType = 'app';
            appName = path.basename(workspacePath);
            appPath = path.join(workspacePath, appName);

            structure.detectedPatterns.push('Frappe App directory (hooks.py in root)');
            structure.appMetadata.type = 'app';
            structure.appMetadata.appName = appName;

            console.log(`✓ Detected Frappe App: ${appName}`);
        }
        // Scenario C: Inside a Frappe App subdirectory
        else {
            // Look for hooks.py in parent directories
            let currentPath = workspacePath;
            for (let i = 0; i < 3; i++) {
                const parentHooksPath = path.join(currentPath, '..', 'hooks.py');
                if (fs.existsSync(parentHooksPath)) {
                    appName = path.basename(path.dirname(parentHooksPath));
                    appPath = path.dirname(parentHooksPath);
                    workspaceType = 'app-subdir';

                    structure.detectedPatterns.push('Inside Frappe App subdirectory');
                    structure.appMetadata.type = 'app-subdir';
                    structure.appMetadata.appName = appName;

                    console.log(`✓ Inside Frappe App: ${appName}`);
                    break;
                }
                currentPath = path.join(currentPath, '..');
            }
        }

        // PATTERN 2: Discover DocType location pattern
        if (appName && appPath) {
            const docTypeBasePath = path.join(appPath, 'doctype');

            if (fs.existsSync(docTypeBasePath)) {
                const docTypes = fs.readdirSync(docTypeBasePath).filter(file => {
                    const fullPath = path.join(docTypeBasePath, file);
                    return fs.statSync(fullPath).isDirectory();
                });

                structure.fileLocations.doctype = `${appName}/${appName}/doctype/{name}/{name}.json`;
                structure.detectedPatterns.push(`DocType pattern: ${appName}/${appName}/doctype/{name}/`);
                structure.exampleFiles = docTypes.slice(0, 3).map(dt => `${appName}/doctype/${dt}/${dt}.json`);

                console.log(`✓ Found ${docTypes.length} existing DocTypes`);

                // Learn naming convention from existing DocTypes
                if (docTypes.length > 0) {
                    const hasSpaces = docTypes.some(dt => dt.includes(' '));
                    const hasUnderscores = docTypes.some(dt => dt.includes('_'));

                    structure.namingConventions.doctype = hasSpaces ? 'Title Case with Spaces' :
                        hasUnderscores ? 'snake_case' :
                            'lowercase';
                    console.log(`✓ DocType naming: ${structure.namingConventions.doctype}`);
                }
            } else {
                // DocTypes folder doesn't exist yet - suggest location
                structure.fileLocations.doctype = `${appName}/${appName}/doctype/{name}/{name}.json`;
                structure.detectedPatterns.push('DocType folder not found - will create');
            }

            // PATTERN 3: Discover API location pattern
            const apiPath = path.join(appPath, 'api.py');
            const apiDir = path.join(appPath, 'api');

            if (fs.existsSync(apiPath)) {
                structure.fileLocations.api = `${appName}/${appName}/api.py`;
                structure.detectedPatterns.push('API pattern: Single api.py file');
                console.log(`✓ Found API file: api.py`);
            } else if (fs.existsSync(apiDir)) {
                structure.fileLocations.api = `${appName}/${appName}/api/{module}.py`;
                structure.detectedPatterns.push('API pattern: api/ directory with modules');
                console.log(`✓ Found API directory: api/`);
            } else {
                structure.fileLocations.api = `${appName}/${appName}/api.py`;
                structure.detectedPatterns.push('API file not found - suggesting api.py');
            }

            // PATTERN 4: Discover other common locations
            structure.suggestedLocations = {
                doctype: workspaceType === 'bench'
                    ? `apps/${appName}/${appName}/doctype/{name}/{name}.json`
                    : `${appName}/doctype/{name}/{name}.json`,

                api: workspaceType === 'bench'
                    ? `apps/${appName}/${appName}/api.py`
                    : `${appName}/api.py`,

                controller: workspaceType === 'bench'
                    ? `apps/${appName}/${appName}/doctype/{name}/{name}.py`
                    : `${appName}/doctype/{name}/{name}.py`,

                client_script: workspaceType === 'bench'
                    ? `apps/${appName}/${appName}/doctype/{name}/{name}.js`
                    : `${appName}/doctype/{name}/{name}.js`,

                page: workspaceType === 'bench'
                    ? `apps/${appName}/${appName}/page/{name}/{name}.py`
                    : `${appName}/page/{name}/{name}.py`,

                report: workspaceType === 'bench'
                    ? `apps/${appName}/${appName}/report/{name}/{name}.py`
                    : `${appName}/report/{name}/{name}.py`
            };

            structure.appMetadata.appName = appName;
            structure.appMetadata.appPath = appPath;
            structure.appMetadata.workspaceType = workspaceType;
        }
    }

    /**
     * Learn React workspace structure
     * @private
     */
    async _learnReactStructure(workspacePath, structure) {
        console.log('🔍 [React] Learning React workspace patterns...');

        // Check for common React structures
        const srcPath = path.join(workspacePath, 'src');
        const componentsPath = path.join(srcPath, 'components');
        const pagesPath = path.join(srcPath, 'pages');
        const appPath = path.join(srcPath, 'App.jsx');

        if (fs.existsSync(srcPath)) {
            structure.detectedPatterns.push('src/ directory found');

            if (fs.existsSync(componentsPath)) {
                structure.fileLocations.component = 'src/components/{name}/{name}.jsx';
                structure.detectedPatterns.push('Components in src/components/');
                console.log('✓ Found components directory');
            }

            if (fs.existsSync(pagesPath)) {
                structure.fileLocations.page = 'src/pages/{name}.jsx';
                structure.detectedPatterns.push('Pages in src/pages/');
                console.log('✓ Found pages directory');
            }

            // Learn naming convention
            if (fs.existsSync(appPath)) {
                structure.namingConventions.component = 'PascalCase';
                structure.namingConventions.fileExtension = '.jsx';
            }
        }

        structure.suggestedLocations = {
            component: 'src/components/{name}/{name}.jsx',
            page: 'src/pages/{name}.jsx',
            hook: 'src/hooks/use{Name}.js',
            context: 'src/context/{Name}Context.jsx',
            service: 'src/services/{name}Service.js'
        };
    }

    /**
     * Learn Electron workspace structure
     * @private
     */
    async _learnElectronStructure(workspacePath, structure) {
        console.log('🔍 [Electron] Learning Electron workspace patterns...');

        const srcPath = path.join(workspacePath, 'src');
        const mainPath = path.join(srcPath, 'main.js');
        const rendererPath = path.join(srcPath, 'renderer.js');

        if (fs.existsSync(srcPath)) {
            structure.detectedPatterns.push('src/ directory structure');

            if (fs.existsSync(mainPath)) {
                structure.fileLocations.main = 'src/main.js';
                console.log('✓ Found main process file');
            }

            if (fs.existsSync(rendererPath)) {
                structure.fileLocations.renderer = 'src/renderer.js';
                console.log('✓ Found renderer process file');
            }
        }

        structure.suggestedLocations = {
            main: 'src/main.js',
            renderer: 'src/renderer.js',
            preload: 'src/preload.js',
            window: 'src/windows/{name}Window.js',
            ipc: 'src/ipc/{name}Handler.js'
        };
    }

    /**
     * Learn Django workspace structure
     * @private
     */
    async _learnDjangoStructure(workspacePath, structure) {
        console.log('🔍 [Django] Learning Django workspace patterns...');

        // Find Django apps
        const files = fs.readdirSync(workspacePath);
        const djangoApps = [];

        for (const file of files) {
            const modelsPath = path.join(workspacePath, file, 'models.py');
            if (fs.existsSync(modelsPath)) {
                djangoApps.push(file);
            }
        }

        if (djangoApps.length > 0) {
            structure.detectedPatterns.push(`Found ${djangoApps.length} Django apps`);
            structure.appMetadata.djangoApps = djangoApps;

            const primaryApp = djangoApps[0];
            structure.suggestedLocations = {
                model: `${primaryApp}/models.py`,
                view: `${primaryApp}/views.py`,
                serializer: `${primaryApp}/serializers.py`,
                url: `${primaryApp}/urls.py`,
                admin: `${primaryApp}/admin.py`
            };
        }
    }

    /**
     * Learn Node.js workspace structure
     * @private
     */
    async _learnNodeStructure(workspacePath, structure) {
        console.log('🔍 [Node] Learning Node.js workspace patterns...');

        const srcPath = path.join(workspacePath, 'src');
        const routesPath = path.join(srcPath, 'routes');
        const controllersPath = path.join(srcPath, 'controllers');

        if (fs.existsSync(srcPath)) {
            structure.detectedPatterns.push('src/ directory structure');

            if (fs.existsSync(routesPath)) {
                structure.fileLocations.route = 'src/routes/{name}.js';
                console.log('✓ Found routes directory');
            }

            if (fs.existsSync(controllersPath)) {
                structure.fileLocations.controller = 'src/controllers/{name}Controller.js';
                console.log('✓ Found controllers directory');
            }
        }

        structure.suggestedLocations = {
            route: 'src/routes/{name}.js',
            controller: 'src/controllers/{name}Controller.js',
            model: 'src/models/{name}.js',
            middleware: 'src/middleware/{name}.js',
            service: 'src/services/{name}Service.js'
        };
    }

    /**
     * Learn generic structure (fallback)
     * @private
     */
    async _learnGenericStructure(workspacePath, structure) {
        console.log('🔍 [Generic] Learning workspace patterns...');

        // Check for common directories
        const commonDirs = ['src', 'lib', 'app', 'components', 'modules'];

        for (const dir of commonDirs) {
            const dirPath = path.join(workspacePath, dir);
            if (fs.existsSync(dirPath)) {
                structure.detectedPatterns.push(`${dir}/ directory found`);
            }
        }
    }

    /**
     * Check if cache is valid
     * @private
     */
    _isCacheValid(framework) {
        if (!this._cache || !this._cacheTimestamp) {return false;}
        if (this._cacheFramework !== framework) {return false;}
        return (Date.now() - this._cacheTimestamp) < this._cacheDuration;
    }

    /**
     * Invalidate cache
     */
    invalidateCache() {
        this._cache = null;
        this._cacheTimestamp = null;
        this._cacheFramework = null;
        console.log('🗑️ Structure learning cache invalidated');
    }
}

module.exports = WorkspaceStructureLearner;
