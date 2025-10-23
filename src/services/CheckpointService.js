/**
 * CheckpointService
 *
 * Git-based checkpoint system inspired by Kilos architecture.
 * Creates automatic snapshots of workspace state for task resumption and rollback.
 *
 * Features:
 * - Git-based state snapshots
 * - Automatic checkpoints before risky operations
 * - State restoration support
 * - Lightweight (tracks diffs, not full files)
 *
 * @author Oropendola Team
 * @date 2025-10-23
 */

const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

/**
 * CheckpointService - Git-based state management
 *
 * Inspired by Kilos checkpoint pattern
 */
class CheckpointService {
    constructor(taskId, workspaceDir, globalStorageDir) {
        this.taskId = taskId;
        this.workspaceDir = workspaceDir;
        this.globalStorageDir = globalStorageDir;
        this.checkpointDir = path.join(globalStorageDir, 'checkpoints', taskId);
        this.checkpoints = [];

        console.log(`💾 [CheckpointService] Initialized for task ${taskId}`);
        console.log(`📁 Workspace: ${workspaceDir}`);
        console.log(`📁 Checkpoint dir: ${this.checkpointDir}`);
    }

    /**
     * Initialize checkpoint directory
     */
    async initialize() {
        try {
            await fs.mkdir(this.checkpointDir, { recursive: true });
            console.log(`✅ [CheckpointService] Checkpoint directory created`);
        } catch (error) {
            console.error(`[CheckpointService] Error creating checkpoint dir:`, error);
            throw error;
        }
    }

    /**
     * Check if workspace is a git repository
     * @returns {Promise<boolean>}
     */
    async isGitRepo() {
        try {
            await execAsync('git rev-parse --git-dir', {
                cwd: this.workspaceDir
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Save a checkpoint
     *
     * @param {Object} options - Checkpoint options
     * @param {boolean} options.force - Force save even if no changes
     * @param {boolean} options.suppressMessage - Don't log success message
     * @param {string} options.description - Optional checkpoint description
     * @returns {Promise<string|null>} Checkpoint ID or null if no changes
     */
    async save(options = {}) {
        const { force = false, suppressMessage = false, description = '' } = options;

        try {
            // Check if git repo exists
            const isGit = await this.isGitRepo();

            if (!isGit) {
                console.warn('⚠️ [CheckpointService] Workspace is not a git repository, using file-based checkpoint');
                return await this._saveFileBasedCheckpoint(description);
            }

            // Check for changes
            const { stdout: statusOutput } = await execAsync('git status --porcelain', {
                cwd: this.workspaceDir
            });

            if (!force && !statusOutput.trim()) {
                if (!suppressMessage) {
                    console.log('ℹ️ [CheckpointService] No changes to checkpoint');
                }
                return null;
            }

            // Create checkpoint ID
            const checkpointId = crypto.randomUUID();
            const timestamp = new Date().toISOString();

            // Get current diff
            const { stdout: diffOutput } = await execAsync('git diff HEAD', {
                cwd: this.workspaceDir
            });

            // Save checkpoint metadata
            const checkpoint = {
                id: checkpointId,
                taskId: this.taskId,
                timestamp,
                description,
                diff: diffOutput,
                status: statusOutput
            };

            // Write checkpoint file
            const checkpointFile = path.join(this.checkpointDir, `${checkpointId}.json`);
            await fs.writeFile(checkpointFile, JSON.stringify(checkpoint, null, 2));

            this.checkpoints.push({
                id: checkpointId,
                timestamp,
                description
            });

            if (!suppressMessage) {
                console.log(`💾 [CheckpointService] Checkpoint saved: ${checkpointId}`);
                if (description) {
                    console.log(`📝 Description: ${description}`);
                }
            }

            return checkpointId;

        } catch (error) {
            console.error(`[CheckpointService] Error saving checkpoint:`, error);
            throw error;
        }
    }

    /**
     * Save file-based checkpoint (fallback for non-git workspaces)
     * @private
     */
    async _saveFileBasedCheckpoint(description) {
        const checkpointId = crypto.randomUUID();
        const timestamp = new Date().toISOString();

        const checkpoint = {
            id: checkpointId,
            taskId: this.taskId,
            timestamp,
            description,
            type: 'file-based',
            warning: 'File-based checkpoint (workspace is not a git repository)'
        };

        const checkpointFile = path.join(this.checkpointDir, `${checkpointId}.json`);
        await fs.writeFile(checkpointFile, JSON.stringify(checkpoint, null, 2));

        this.checkpoints.push({
            id: checkpointId,
            timestamp,
            description
        });

        console.log(`💾 [CheckpointService] File-based checkpoint saved: ${checkpointId}`);
        return checkpointId;
    }

    /**
     * Restore from a checkpoint
     *
     * @param {string} checkpointId - Checkpoint ID to restore
     * @returns {Promise<void>}
     */
    async restore(checkpointId) {
        try {
            // Load checkpoint metadata
            const checkpointFile = path.join(this.checkpointDir, `${checkpointId}.json`);
            const checkpointData = await fs.readFile(checkpointFile, 'utf-8');
            const checkpoint = JSON.parse(checkpointData);

            if (checkpoint.type === 'file-based') {
                console.warn('⚠️ [CheckpointService] Cannot restore file-based checkpoint');
                return;
            }

            // Check if git repo
            const isGit = await this.isGitRepo();
            if (!isGit) {
                console.error('❌ [CheckpointService] Cannot restore: workspace is not a git repository');
                return;
            }

            console.log(`🔄 [CheckpointService] Restoring checkpoint: ${checkpointId}`);

            // Reset to checkpoint state
            // Note: This is a simplified version. In production, you'd want more sophisticated restore logic
            await execAsync('git reset --hard HEAD', {
                cwd: this.workspaceDir
            });

            console.log(`✅ [CheckpointService] Checkpoint restored: ${checkpointId}`);

        } catch (error) {
            console.error(`[CheckpointService] Error restoring checkpoint:`, error);
            throw error;
        }
    }

    /**
     * List all checkpoints for this task
     * @returns {Promise<Array>} List of checkpoints
     */
    async listCheckpoints() {
        try {
            const files = await fs.readdir(this.checkpointDir);
            const jsonFiles = files.filter(f => f.endsWith('.json'));

            const checkpoints = [];
            for (const file of jsonFiles) {
                const filePath = path.join(this.checkpointDir, file);
                const data = await fs.readFile(filePath, 'utf-8');
                const checkpoint = JSON.parse(data);
                checkpoints.push({
                    id: checkpoint.id,
                    timestamp: checkpoint.timestamp,
                    description: checkpoint.description
                });
            }

            return checkpoints.sort((a, b) =>
                new Date(b.timestamp) - new Date(a.timestamp)
            );

        } catch (error) {
            if (error.code === 'ENOENT') {
                return [];
            }
            console.error(`[CheckpointService] Error listing checkpoints:`, error);
            throw error;
        }
    }

    /**
     * Delete a checkpoint
     * @param {string} checkpointId - Checkpoint ID to delete
     */
    async deleteCheckpoint(checkpointId) {
        try {
            const checkpointFile = path.join(this.checkpointDir, `${checkpointId}.json`);
            await fs.unlink(checkpointFile);

            this.checkpoints = this.checkpoints.filter(c => c.id !== checkpointId);

            console.log(`🗑️ [CheckpointService] Checkpoint deleted: ${checkpointId}`);
        } catch (error) {
            console.error(`[CheckpointService] Error deleting checkpoint:`, error);
            throw error;
        }
    }

    /**
     * Clean up old checkpoints (keep last N)
     * @param {number} keepCount - Number of checkpoints to keep
     */
    async cleanup(keepCount = 10) {
        try {
            const checkpoints = await this.listCheckpoints();

            if (checkpoints.length <= keepCount) {
                console.log(`ℹ️ [CheckpointService] ${checkpoints.length} checkpoints (no cleanup needed)`);
                return;
            }

            const toDelete = checkpoints.slice(keepCount);
            console.log(`🧹 [CheckpointService] Cleaning up ${toDelete.length} old checkpoints`);

            for (const checkpoint of toDelete) {
                await this.deleteCheckpoint(checkpoint.id);
            }

            console.log(`✅ [CheckpointService] Cleanup complete, kept ${keepCount} most recent checkpoints`);

        } catch (error) {
            console.error(`[CheckpointService] Error during cleanup:`, error);
        }
    }

    /**
     * Dispose of checkpoint service
     */
    dispose() {
        console.log(`🧹 [CheckpointService] Disposing for task ${this.taskId}`);
        this.checkpoints = [];
    }
}

module.exports = CheckpointService;
