const vscode = require('vscode');
const { WorkspaceAPI } = require('../api/workspace');
const { GitAPI } = require('../api/git');
const LocalWorkspaceAnalyzer = require('../workspace/LocalWorkspaceAnalyzer');

/**
 * Context Service - Aggregates workspace, git, and editor context
 * @typedef {import('../types/api').ChatContext} ChatContext
 * @typedef {import('../types/api').WorkspaceContext} WorkspaceContext
 */

class ContextService {
    constructor() {
        /** @type {WorkspaceContext|null} */
        this.workspaceContext = null;

        /** @type {any} */
        this.gitContext = null;

        /** @type {number} */
        this.lastUpdate = 0;

        /** @type {number} */
        this.cacheTimeout = 30000; // 30 seconds

        // Local workspace analyzer (replaces backend APIs)
        this.localAnalyzer = new LocalWorkspaceAnalyzer();
    }

    /**
     * Get enriched context for chat with deep project analysis
     * @param {boolean} [includeWorkspace=true] - Include workspace context
     * @param {boolean} [includeGit=true] - Include git context
     * @returns {Promise<ChatContext>}
     */
    async getEnrichedContext(includeWorkspace = true, includeGit = true) {
        const editor = vscode.window.activeTextEditor;
        const workspaceFolders = vscode.workspace.workspaceFolders;

        if (!editor || !workspaceFolders) {
            return {};
        }

        const workspacePath = workspaceFolders[0].uri.fsPath;
        const currentFile = vscode.workspace.asRelativePath(editor.document.uri);

        /** @type {ChatContext} */
        const context = {
            currentFile,
            cursorLine: editor.selection.active.line,
            selectedText: editor.document.getText(editor.selection),
            workspacePath,
            includeWorkspaceContext: includeWorkspace,
            includeGitContext: includeGit
        };

        // Add visible range context (what code is currently visible to user)
        if (editor.visibleRanges && editor.visibleRanges.length > 0) {
            const visibleRange = editor.visibleRanges[0];
            context.visibleLines = {
                start: visibleRange.start.line,
                end: visibleRange.end.line,
                content: editor.document.getText(visibleRange)
            };
        }

        // Add open editors (other files user is working with)
        const openEditors = vscode.window.visibleTextEditors
            .filter(e => e !== editor)
            .map(e => ({
                file: vscode.workspace.asRelativePath(e.document.uri),
                language: e.document.languageId
            }));
        if (openEditors.length > 0) {
            context.openEditors = openEditors.slice(0, 5); // Limit to 5
        }

        // Add workspace context if requested and cache is stale
        if (includeWorkspace && this.shouldRefreshCache()) {
            try {
                // Use LOCAL workspace analyzer instead of backend API
                console.log('🔍 Analyzing workspace locally (no backend needed)...');
                const analysis = await this.localAnalyzer.analyzeWorkspace(workspacePath, true);

                // Store in cache
                this.workspaceContext = analysis;

                // Extract key project information for AI context
                context.projectInfo = {
                    name: analysis.projectName,
                    type: analysis.projectType,
                    mainLanguages: analysis.languages.slice(0, 3),
                    dependencies: analysis.dependencies.slice(0, 10), // Top 10 deps
                    dependencyCount: analysis.dependencies.length,
                    fileCount: analysis.fileCount,
                    hasTests: analysis.hasTests,
                    hasDocs: analysis.hasDocsFolder,
                    configFiles: analysis.configFiles
                };

                // Add git info from local analysis
                if (analysis.git) {
                    context.git = {
                        branch: analysis.git.branch,
                        uncommittedChanges: analysis.git.uncommittedChanges,
                        isDirty: analysis.git.isDirty,
                        modifiedFiles: analysis.git.modifiedFiles || [],
                        lastCommit: analysis.git.lastCommit
                    };
                    this.gitContext = context.git;
                }

                console.log('✅ Local workspace analysis complete:', {
                    type: analysis.projectType,
                    languages: analysis.languages,
                    deps: analysis.dependencies.length,
                    git: analysis.git?.branch
                });

            } catch (error) {
                console.warn('⚠️ Local workspace analysis failed, using minimal context');
                console.error(error);
                // Continue with basic context
            }
        }

        // Add recent terminal commands (if available)
        const recentCommands = this._getRecentTerminalCommands();
        if (recentCommands.length > 0) {
            context.recentCommands = recentCommands;
        }

        this.lastUpdate = Date.now();
        return context;
    }

    /**
     * Detect project type from workspace context
     * @private
     */
    _detectProjectType(workspace) {
        const deps = workspace.dependencies || [];
        const files = workspace.root_files || [];

        if (files.includes('package.json')) {
            if (deps.some(d => d.name === 'react' || d.name === 'next')) {
                return 'React/Next.js';
            } else if (deps.some(d => d.name === 'vue')) {
                return 'Vue.js';
            } else if (deps.some(d => d.name === 'express')) {
                return 'Node.js/Express';
            }
            return 'Node.js';
        }

        if (files.includes('requirements.txt') || files.includes('setup.py') || files.includes('pyproject.toml')) {
            if (deps.some(d => d.name === 'django')) {
                return 'Django';
            } else if (deps.some(d => d.name === 'flask')) {
                return 'Flask';
            } else if (deps.some(d => d.name === 'fastapi')) {
                return 'FastAPI';
            }
            return 'Python';
        }

        if (files.includes('go.mod')) return 'Go';
        if (files.includes('Cargo.toml')) return 'Rust';
        if (files.includes('pom.xml') || files.includes('build.gradle')) return 'Java';
        if (files.includes('Gemfile')) return 'Ruby';

        return 'Unknown';
    }

    /**
     * Get primary language from language distribution
     * @private
     */
    _getPrimaryLanguage(languages = []) {
        if (!languages || languages.length === 0) return 'Unknown';

        // Languages is typically [{name: 'JavaScript', percentage: 45}, ...]
        const sorted = [...languages].sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
        return sorted[0]?.name || 'Unknown';
    }

    /**
     * Get recent terminal commands (if terminals are accessible)
     * @private
     */
    _getRecentTerminalCommands() {
        // VSCode doesn't provide direct access to terminal history
        // This is a placeholder for future implementation
        return [];
    }

    /**
     * Check if cache should be refreshed
     * @private
     * @returns {boolean}
     */
    shouldRefreshCache() {
        return Date.now() - this.lastUpdate > this.cacheTimeout;
    }

    /**
     * Get cached workspace context
     * @returns {WorkspaceContext|null}
     */
    getWorkspaceContext() {
        return this.workspaceContext;
    }

    /**
     * Get cached git context
     * @returns {any}
     */
    getGitContext() {
        return this.gitContext;
    }

    /**
     * Clear all cached context
     * @returns {void}
     */
    clearCache() {
        this.workspaceContext = null;
        this.gitContext = null;
        this.lastUpdate = 0;
    }

    /**
     * Force refresh all context
     * @returns {Promise<void>}
     */
    async forceRefresh() {
        this.clearCache();
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return;

        await this.getEnrichedContext(true, true);
    }
}

// Singleton instance
const contextService = new ContextService();

module.exports = { contextService, ContextService };
