const { apiClient } = require('./client');

/**
 * Git Integration API
 * @typedef {import('../types/api').ApiResponse} ApiResponse
 * @typedef {import('../types/api').GitChange} GitChange
 * @typedef {import('../types/api').GitDiffStats} GitDiffStats
 * @typedef {import('../types/api').GitRemoteInfo} GitRemoteInfo
 * @typedef {import('../types/api').GitCommit} GitCommit
 * @typedef {import('../types/api').GitBlame} GitBlame
 */

class GitAPI {
    static BASE = '/api/method/ai_assistant.api.git';

    /**
     * Get current git status with uncommitted changes
     * @param {string} workspacePath - Workspace path
     * @returns {Promise<ApiResponse<{branch: string|null, uncommitted_changes: GitChange[], diff_stats: GitDiffStats, remote_info: GitRemoteInfo|null}>>}
     */
    static async getGitStatus(workspacePath) {
        try {
            const response = await apiClient.post(`${this.BASE}.get_git_status`, {
                workspace_path: workspacePath
            });
            return response;
        } catch (error) {
            console.error('Failed to get git status:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Generate AI commit message based on changes
     * @param {string} workspacePath - Workspace path
     * @returns {Promise<ApiResponse<{message: string, changes_count: number}>>}
     */
    static async generateCommitMessage(workspacePath) {
        try {
            const response = await apiClient.post(`${this.BASE}.generate_commit_message`, {
                workspace_path: workspacePath
            });
            return response;
        } catch (error) {
            console.error('Failed to generate commit message:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get file history with commits
     * @param {string} workspacePath - Workspace path
     * @param {string} filePath - File path
     * @param {number} [limit=10] - Number of commits to return
     * @returns {Promise<ApiResponse<{file: string, history: GitCommit[], commit_count: number}>>}
     */
    static async getFileHistory(workspacePath, filePath, limit = 10) {
        try {
            const response = await apiClient.post(`${this.BASE}.get_file_history`, {
                workspace_path: workspacePath,
                file_path: filePath,
                limit
            });
            return response;
        } catch (error) {
            console.error('Failed to get file history:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get recent commits in repository
     * @param {string} workspacePath - Workspace path
     * @param {number} [limit=10] - Number of commits to return
     * @returns {Promise<ApiResponse<{commits: GitCommit[], count: number}>>}
     */
    static async getRecentCommits(workspacePath, limit = 10) {
        try {
            const response = await apiClient.post(`${this.BASE}.get_recent_commits`, {
                workspace_path: workspacePath,
                limit
            });
            return response;
        } catch (error) {
            console.error('Failed to get recent commits:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get git blame for specific line
     * @param {string} workspacePath - Workspace path
     * @param {string} filePath - File path
     * @param {number} lineNumber - Line number (1-indexed)
     * @returns {Promise<ApiResponse<{blame: GitBlame|null}>>}
     */
    static async getBlame(workspacePath, filePath, lineNumber) {
        try {
            const response = await apiClient.post(`${this.BASE}.get_blame`, {
                workspace_path: workspacePath,
                file_path: filePath,
                line_number: lineNumber
            });
            return response;
        } catch (error) {
            console.error('Failed to get git blame:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = { GitAPI };
