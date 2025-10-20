const vscode = require('vscode');
const { WorkspaceAPI } = require('../api/workspace');
const { GitAPI } = require('../api/git');

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
    }

    /**
     * Get enriched context for chat
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

        // Add workspace context if requested and cache is stale
        if (includeWorkspace && this.shouldRefreshCache()) {
            try {
                const wsResponse = await WorkspaceAPI.getWorkspaceContext(
                    workspacePath,
                    false
                );
                if (wsResponse.success && wsResponse.data) {
                    this.workspaceContext = wsResponse.data.workspace;
                }
            } catch (error) {
                console.error('Failed to get workspace context:', error);
            }
        }

        // Add git context if requested
        if (includeGit) {
            try {
                const gitResponse = await GitAPI.getGitStatus(workspacePath);
                if (gitResponse.success && gitResponse.data) {
                    this.gitContext = {
                        branch: gitResponse.data.branch,
                        uncommitted_changes: gitResponse.data.uncommitted_changes?.length || 0,
                        is_dirty: gitResponse.data.diff_stats?.is_dirty || false
                    };
                }
            } catch (error) {
                console.error('Failed to get git context:', error);
            }
        }

        this.lastUpdate = Date.now();
        return context;
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
