/**
 * CheckpointService
 *
 * Git-based checkpoint system for conversation state management.
 * Creates automatic snapshots of conversation state using a shadow Git repository.
 *
 * Features:
 * - Conversation state snapshots (messages, API history, metadata)
 * - Shadow Git repository for tracking changes
 * - State restoration support
 * - Diff viewing between checkpoints
 * - Automatic cleanup of old checkpoints
 *
 * Based on Roo-Code checkpoint architecture
 *
 * @author Oropendola Team
 * @date 2025-10-31 (Enhanced)
 */

const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const simpleGit = require('simple-git');

/**
 * CheckpointService - Git-based conversation state management
 *
 * Uses a shadow Git repository to track conversation history
 */
class CheckpointService {
    constructor(taskId, workspaceDir, globalStorageDir) {
        this.taskId = taskId;
        this.workspaceDir = workspaceDir;
        this.globalStorageDir = globalStorageDir;
        this.shadowGitPath = path.join(globalStorageDir, 'checkpoints', taskId);
        this.git = null;
        this.isInitialized = false;
        this.initializationPromise = null;

        console.log(`💾 [CheckpointService] Initialized for task ${taskId}`);
        console.log(`📁 Shadow Git path: ${this.shadowGitPath}`);
    }

    /**
     * Initialize shadow Git repository
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }

        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this._initializeShadowGit();
        await this.initializationPromise;
        this.isInitialized = true;
        this.initializationPromise = null;
    }

    async _initializeShadowGit() {
        try {
            // Create shadow git directory
            await fs.mkdir(this.shadowGitPath, { recursive: true });

            // Initialize git
            this.git = simpleGit(this.shadowGitPath);

            // Check if already initialized
            const isRepo = await this.git.checkIsRepo();

            if (!isRepo) {
                await this.git.init();

                // Configure git
                await this.git.addConfig('user.name', 'Oropendola AI');
                await this.git.addConfig('user.email', 'checkpoints@oropendola.ai');

                // Create initial commit
                const readmePath = path.join(this.shadowGitPath, 'README.md');
                await fs.writeFile(readmePath, `# Checkpoints for Task ${this.taskId}\n\nThis repository tracks conversation checkpoints.`);
                await this.git.add('README.md');
                await this.git.commit('Initial checkpoint repository', ['--allow-empty']);
            }

            console.log(`✅ [CheckpointService] Shadow Git initialized for task ${this.taskId}`);
        } catch (error) {
            console.error('[CheckpointService] Initialization failed:', error);
            throw new Error(`Failed to initialize checkpoint service: ${error.message}`);
        }
    }

    /**
     * Save a checkpoint of the current conversation state
     *
     * @param {object} conversationState - The state to checkpoint
     * @param {Array} conversationState.messages - Conversation messages
     * @param {Array} conversationState.apiHistory - API conversation history
     * @param {object} conversationState.metadata - Additional metadata
     * @returns {Promise<{checkpointId: string, commit: string, timestamp: number}>}
     */
    async save(conversationState) {
        await this.initialize();

        try {
            const timestamp = Date.now();
            const checkpointId = this._generateCheckpointId(timestamp);

            // Save conversation state to JSON file
            const statePath = path.join(this.shadowGitPath, 'conversation.json');
            await fs.writeFile(
                statePath,
                JSON.stringify(conversationState, null, 2),
                'utf8'
            );

            // Save metadata
            const metadataPath = path.join(this.shadowGitPath, 'metadata.json');
            const metadata = {
                checkpointId,
                timestamp,
                messageCount: conversationState.messages?.length || 0,
                taskId: this.taskId,
            };
            await fs.writeFile(
                metadataPath,
                JSON.stringify(metadata, null, 2),
                'utf8'
            );

            // Commit to git
            await this.git.add('.');
            const commitMessage = `Checkpoint: ${checkpointId}\n\nTimestamp: ${new Date(timestamp).toISOString()}\nMessages: ${metadata.messageCount}`;
            const commitResult = await this.git.commit(commitMessage);

            console.log(`💾 [CheckpointService] Saved checkpoint ${checkpointId}`);

            return {
                checkpointId,
                commit: commitResult.commit,
                timestamp,
                messageCount: metadata.messageCount,
            };
        } catch (error) {
            console.error('[CheckpointService] Failed to save checkpoint:', error);
            throw new Error(`Failed to save checkpoint: ${error.message}`);
        }
    }

    /**
     * Restore conversation state from a checkpoint
     *
     * @param {string} checkpointId - ID of checkpoint to restore (or commit hash)
     * @returns {Promise<object>} The restored conversation state
     */
    async restore(checkpointId) {
        await this.initialize();

        try {
            // Find the commit
            const commit = await this._findCommit(checkpointId);

            if (!commit) {
                throw new Error(`Checkpoint not found: ${checkpointId}`);
            }

            console.log(`🔄 [CheckpointService] Restoring checkpoint ${checkpointId}`);

            // Checkout the commit
            await this.git.checkout(commit);

            // Read the conversation state
            const statePath = path.join(this.shadowGitPath, 'conversation.json');
            const stateContent = await fs.readFile(statePath, 'utf8');
            const conversationState = JSON.parse(stateContent);

            // Return to main branch
            await this.git.checkout('master').catch(() => this.git.checkout('main'));

            console.log(`✅ [CheckpointService] Restored checkpoint ${checkpointId}`);

            return conversationState;
        } catch (error) {
            console.error('[CheckpointService] Failed to restore checkpoint:', error);
            throw new Error(`Failed to restore checkpoint: ${error.message}`);
        }
    }

    /**
     * Get diff between current state and a checkpoint
     *
     * @param {string} checkpointId - ID of checkpoint to compare against
     * @returns {Promise<object>} Diff summary
     */
    async getDiff(checkpointId) {
        await this.initialize();

        try {
            const commit = await this._findCommit(checkpointId);

            if (!commit) {
                throw new Error(`Checkpoint not found: ${checkpointId}`);
            }

            // Get diff from commit to current state
            const diffSummary = await this.git.diffSummary([commit, 'HEAD']);

            return {
                files: diffSummary.files,
                insertions: diffSummary.insertions,
                deletions: diffSummary.deletions,
                changed: diffSummary.changed,
            };
        } catch (error) {
            console.error('[CheckpointService] Failed to get diff:', error);
            throw new Error(`Failed to get diff: ${error.message}`);
        }
    }

    /**
     * List all checkpoints
     *
     * @returns {Promise<Array>} Array of checkpoint metadata
     */
    async listCheckpoints() {
        await this.initialize();

        try {
            const log = await this.git.log();

            const checkpoints = log.all
                .filter(commit => commit.message.startsWith('Checkpoint:'))
                .map(commit => {
                    const checkpointId = commit.message.split('\n')[0].replace('Checkpoint: ', '');
                    const timestampMatch = commit.message.match(/Timestamp: (.+)/);
                    const messagesMatch = commit.message.match(/Messages: (\d+)/);

                    return {
                        checkpointId,
                        commit: commit.hash,
                        timestamp: timestampMatch ? new Date(timestampMatch[1]).getTime() : null,
                        messageCount: messagesMatch ? parseInt(messagesMatch[1], 10) : 0,
                        author: commit.author_name,
                        date: commit.date,
                    };
                });

            return checkpoints;
        } catch (error) {
            console.error('[CheckpointService] Failed to list checkpoints:', error);
            return [];
        }
    }

    /**
     * Delete a checkpoint
     *
     * @param {string} checkpointId - ID of checkpoint to delete
     */
    async deleteCheckpoint(checkpointId) {
        await this.initialize();

        try {
            const commit = await this._findCommit(checkpointId);

            if (!commit) {
                throw new Error(`Checkpoint not found: ${checkpointId}`);
            }

            // Use git revert to remove the commit (safer than rebase)
            await this.git.revert(commit, { '--no-commit': null });
            await this.git.commit(`Removed checkpoint: ${checkpointId}`);

            console.log(`🗑️ [CheckpointService] Deleted checkpoint ${checkpointId}`);
        } catch (error) {
            console.error('[CheckpointService] Failed to delete checkpoint:', error);
            throw new Error(`Failed to delete checkpoint: ${error.message}`);
        }
    }

    /**
     * Clean up old checkpoints (keep only the last N)
     *
     * @param {number} keepCount - Number of checkpoints to keep
     */
    async cleanup(keepCount = 50) {
        await this.initialize();

        try {
            const checkpoints = await this.listCheckpoints();

            if (checkpoints.length <= keepCount) {
                console.log(`ℹ️ [CheckpointService] ${checkpoints.length} checkpoints (no cleanup needed)`);
                return;
            }

            // Sort by timestamp (newest first)
            checkpoints.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

            // Delete old checkpoints
            const toDelete = checkpoints.slice(keepCount);

            for (const checkpoint of toDelete) {
                await this.deleteCheckpoint(checkpoint.checkpointId);
            }

            console.log(`🧹 [CheckpointService] Cleaned ${toDelete.length} old checkpoints`);
        } catch (error) {
            console.error('[CheckpointService] Failed to clean old checkpoints:', error);
        }
    }

    /**
     * Find commit hash by checkpoint ID or commit hash
     *
     * @param {string} identifier - Checkpoint ID or commit hash
     * @returns {Promise<string|null>} Commit hash or null
     */
    async _findCommit(identifier) {
        try {
            // First try as commit hash
            const log = await this.git.log([identifier, '-1']);
            if (log.latest) {
                return identifier;
            }
        } catch (e) {
            // Not a valid commit hash, search by checkpoint ID
        }

        // Search by checkpoint ID in commit messages
        const allLog = await this.git.log();
        const commit = allLog.all.find(c =>
            c.message.includes(`Checkpoint: ${identifier}`)
        );

        return commit ? commit.hash : null;
    }

    /**
     * Generate a unique checkpoint ID
     *
     * @param {number} timestamp - Timestamp in milliseconds
     * @returns {string} Checkpoint ID
     */
    _generateCheckpointId(timestamp) {
        const hash = crypto.createHash('md5')
            .update(`${this.taskId}-${timestamp}`)
            .digest('hex')
            .substring(0, 8);

        return `cp-${timestamp}-${hash}`;
    }

    /**
     * Destroy the checkpoint service and clean up
     */
    dispose() {
        this.isInitialized = false;
        this.git = null;
        console.log(`🧹 [CheckpointService] Disposed for task ${this.taskId}`);
    }
}

module.exports = CheckpointService;
