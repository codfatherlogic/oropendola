const { apiClient } = require('./client');

/**
 * Workspace API
 * @typedef {import('../types/api').ApiResponse} ApiResponse
 * @typedef {import('../types/api').WorkspaceContext} WorkspaceContext
 * @typedef {import('../types/api').FileContext} FileContext
 */

class WorkspaceAPI {
    static BASE = '/api/method/ai_assistant.api.workspace';

    /**
     * Get comprehensive workspace context
     * @param {string} workspacePath - Absolute path to workspace root
     * @param {boolean} [includeSymbols=false] - Include symbol tree
     * @returns {Promise<ApiResponse<{workspace: WorkspaceContext}>>}
     */
    static async getWorkspaceContext(workspacePath, includeSymbols = false) {
        try {
            const response = await apiClient.post(`${this.BASE}.get_workspace_context`, {
                workspace_path: workspacePath,
                include_symbols: includeSymbols
            });
            return response;
        } catch (error) {
            console.error('Failed to get workspace context:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get file-specific context with nearby code
     * @param {string} workspacePath - Workspace path
     * @param {string} filePath - Relative file path
     * @param {number} cursorLine - Current cursor line (0-indexed)
     * @returns {Promise<ApiResponse<{context: FileContext}>>}
     */
    static async getFileContext(workspacePath, filePath, cursorLine) {
        try {
            const response = await apiClient.post(`${this.BASE}.get_file_context`, {
                workspace_path: workspacePath,
                file_path: filePath,
                cursor_line: cursorLine
            });
            return response;
        } catch (error) {
            console.error('Failed to get file context:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Find files related to current file
     * @param {string} workspacePath - Workspace path
     * @param {string} currentFile - Current file path
     * @param {number} [maxFiles=5] - Maximum related files to return
     * @returns {Promise<ApiResponse<{related_files: string[]}>>}
     */
    static async findRelatedFiles(workspacePath, currentFile, maxFiles = 5) {
        try {
            const response = await apiClient.post(`${this.BASE}.find_related_files`, {
                workspace_path: workspacePath,
                current_file: currentFile,
                max_files: maxFiles
            });
            return response;
        } catch (error) {
            console.error('Failed to find related files:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = { WorkspaceAPI };
