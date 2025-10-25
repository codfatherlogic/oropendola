const { Octokit } = require('@octokit/rest');
const vscode = require('vscode');
const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs').promises;

/**
 * GitHubManager - Handles all GitHub API operations
 * Including repository forking, cloning, and management
 */
class GitHubManager {
    constructor() {
        this.octokit = null;
        this.git = simpleGit();
        this.initialize();
    }

    /**
     * Initialize GitHub API client with authentication token
     */
    async initialize() {
        const config = vscode.workspace.getConfiguration('oropendola');
        const token = config.get('github.token');

        if (token) {
            this.octokit = new Octokit({
                auth: token,
                userAgent: 'oropendola-ai-assistant/1.0.0'
            });

            try {
                // Verify authentication
                const { data } = await this.octokit.rest.users.getAuthenticated();
                console.log(`Authenticated as: ${data.login}`);
            } catch (error) {
                vscode.window.showErrorMessage(`GitHub authentication failed: ${error.message}`);
            }
        } else {
            // GitHub token not configured - this is optional, no need to show warning
            console.log('GitHub token not configured. Set oropendola.github.token in settings to enable GitHub features.');
        }
    }

    /**
     * Fork a GitHub repository
     * @param {string} repoUrl - Full GitHub repository URL
     * @returns {Promise<Object>} Forked repository data
     */
    async forkRepository(repoUrl) {
        if (!this.octokit) {
            throw new Error('GitHub authentication not configured');
        }

        const { owner, repo } = this.parseRepoUrl(repoUrl);

        try {
            vscode.window.showInformationMessage(`Forking ${owner}/${repo}...`);

            const response = await this.octokit.rest.repos.createFork({
                owner,
                repo
            });

            // Wait for fork to be ready
            await this.waitForFork(response.data.full_name);

            vscode.window.showInformationMessage(`Successfully forked to ${response.data.full_name}`);
            return response.data;
        } catch (error) {
            if (error.status === 403) {
                throw new Error('Rate limit exceeded or permission denied');
            } else if (error.status === 404) {
                throw new Error('Repository not found or not accessible');
            } else {
                throw new Error(`Failed to fork repository: ${error.message}`);
            }
        }
    }

    /**
     * Wait for fork to be fully created and accessible
     * @param {string} fullName - Full repository name (owner/repo)
     */
    async waitForFork(fullName, maxAttempts = 10) {
        const [owner, repo] = fullName.split('/');

        for (let i = 0; i < maxAttempts; i++) {
            try {
                await this.octokit.rest.repos.get({ owner, repo });
                return true;
            } catch (error) {
                if (i < maxAttempts - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    throw new Error('Fork creation timeout');
                }
            }
        }
    }

    /**
     * Clone a repository to local workspace
     * @param {string} cloneUrl - Repository clone URL
     * @param {string} targetPath - Optional target directory path
     */
    async cloneRepository(cloneUrl, targetPath = null) {
        const workspaceFolders = vscode.workspace.workspaceFolders;

        if (!workspaceFolders && !targetPath) {
            const selected = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: 'Select Clone Location'
            });

            if (selected && selected[0]) {
                targetPath = selected[0].fsPath;
            } else {
                throw new Error('No target location selected');
            }
        }

        const cloneDir = targetPath || workspaceFolders[0].uri.fsPath;
        const repoName = this.getRepoNameFromUrl(cloneUrl);
        const fullPath = path.join(cloneDir, repoName);

        try {
            // Check if directory already exists
            try {
                await fs.access(fullPath);
                const overwrite = await vscode.window.showWarningMessage(
                    `Directory ${repoName} already exists. Overwrite?`,
                    'Yes', 'No'
                );
                if (overwrite !== 'Yes') {
                    return;
                }
                await fs.rm(fullPath, { recursive: true, force: true });
            } catch (error) {
                // Directory doesn't exist, continue
            }

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Cloning ${repoName}...`,
                cancellable: false
            }, async progress => {
                progress.report({ increment: 0, message: 'Initializing...' });

                await this.git.clone(cloneUrl, fullPath, {
                    '--progress': null
                });

                progress.report({ increment: 100, message: 'Complete!' });
            });

            // Open the cloned repository
            const openFolder = await vscode.window.showInformationMessage(
                `Repository cloned successfully to ${fullPath}`,
                'Open Folder', 'Open in New Window'
            );

            if (openFolder === 'Open Folder') {
                await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(fullPath), false);
            } else if (openFolder === 'Open in New Window') {
                await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(fullPath), true);
            }

            return fullPath;
        } catch (error) {
            throw new Error(`Failed to clone repository: ${error.message}`);
        }
    }

    /**
     * Get repository information
     * @param {string} owner - Repository owner
     * @param {string} repo - Repository name
     * @returns {Promise<Object>} Repository information
     */
    async getRepositoryInfo(owner, repo) {
        if (!this.octokit) {
            throw new Error('GitHub authentication not configured');
        }

        try {
            const { data } = await this.octokit.rest.repos.get({ owner, repo });
            return data;
        } catch (error) {
            throw new Error(`Failed to get repository info: ${error.message}`);
        }
    }

    /**
     * List authenticated user's repositories
     * @param {Object} options - Query options
     * @returns {Promise<Array>} List of repositories
     */
    async listRepositories(options = {}) {
        if (!this.octokit) {
            throw new Error('GitHub authentication not configured');
        }

        try {
            const { data } = await this.octokit.rest.repos.listForAuthenticatedUser({
                sort: options.sort || 'updated',
                direction: options.direction || 'desc',
                per_page: options.per_page || 30,
                page: options.page || 1
            });
            return data;
        } catch (error) {
            throw new Error(`Failed to list repositories: ${error.message}`);
        }
    }

    /**
     * Search GitHub repositories
     * @param {string} query - Search query
     * @returns {Promise<Array>} Search results
     */
    async searchRepositories(query) {
        if (!this.octokit) {
            throw new Error('GitHub authentication not configured');
        }

        try {
            const { data } = await this.octokit.rest.search.repos({
                q: query,
                sort: 'stars',
                order: 'desc',
                per_page: 10
            });
            return data.items;
        } catch (error) {
            throw new Error(`Failed to search repositories: ${error.message}`);
        }
    }

    /**
     * Parse GitHub repository URL
     * @param {string} url - GitHub repository URL
     * @returns {Object} Parsed owner and repo name
     */
    parseRepoUrl(url) {
        // Handle various GitHub URL formats
        const patterns = [
            /github\.com\/([^/]+)\/([^/.]+)/,
            /github\.com\/([^/]+)\/([^/]+)\.git/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return {
                    owner: match[1],
                    repo: match[2].replace('.git', '')
                };
            }
        }

        throw new Error('Invalid GitHub repository URL');
    }

    /**
     * Extract repository name from clone URL
     * @param {string} url - Clone URL
     * @returns {string} Repository name
     */
    getRepoNameFromUrl(url) {
        const match = url.match(/\/([^/]+?)(?:\.git)?$/);
        return match ? match[1].replace('.git', '') : 'repository';
    }

    /**
     * Check if authenticated
     * @returns {boolean} Authentication status
     */
    isAuthenticated() {
        return this.octokit !== null;
    }
}

module.exports = GitHubManager;
