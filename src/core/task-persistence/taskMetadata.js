/**
 * Task Metadata Persistence
 *
 * Manages storage and retrieval of task state and metadata.
 * Used for task resumption and state restoration.
 *
 * Inspired by Kilos task-persistence pattern
 *
 * @author Oropendola Team
 * @date 2025-10-23
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Task Metadata format
 * @typedef {Object} TaskMetadata
 * @property {string} taskId - Task ID
 * @property {number} instanceId - Task instance ID
 * @property {string} status - Task status
 * @property {string} mode - Conversation mode ('ask' | 'edit' | 'agent')
 * @property {string} [conversationId] - Backend conversation ID
 * @property {Date} createdAt - Task creation time
 * @property {Date} [updatedAt] - Last update time
 * @property {Date} [completedAt] - Task completion time
 * @property {Array} [todoList] - Current TODO list
 * @property {Object} [toolUsage] - Tool usage statistics
 * @property {Object} [tokenUsage] - Token usage statistics
 * @property {number} consecutiveMistakeCount - Error counter
 * @property {Object} fileChanges - File change summary
 */

/**
 * Save task metadata
 *
 * @param {string} taskId - Task ID
 * @param {TaskMetadata} metadata - Task metadata
 * @param {string} storageDir - Storage directory path
 * @returns {Promise<void>}
 */
async function saveTaskMetadata(taskId, metadata, storageDir) {
    try {
        const taskDir = path.join(storageDir, 'tasks', taskId);
        await fs.mkdir(taskDir, { recursive: true });

        const filePath = path.join(taskDir, 'metadata.json');
        const dataToSave = {
            ...metadata,
            updatedAt: new Date().toISOString()
        };

        await fs.writeFile(filePath, JSON.stringify(dataToSave, null, 2));

        console.log(`💾 [Task Metadata] Saved metadata for task ${taskId}`);
    } catch (error) {
        console.error(`[Task Metadata] Error saving:`, error);
        throw error;
    }
}

/**
 * Load task metadata
 *
 * @param {string} taskId - Task ID
 * @param {string} storageDir - Storage directory path
 * @returns {Promise<TaskMetadata|null>} Task metadata or null
 */
async function loadTaskMetadata(taskId, storageDir) {
    try {
        const filePath = path.join(storageDir, 'tasks', taskId, 'metadata.json');
        const data = await fs.readFile(filePath, 'utf-8');
        const metadata = JSON.parse(data);

        console.log(`📂 [Task Metadata] Loaded metadata for task ${taskId}`);
        return metadata;
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log(`ℹ️ [Task Metadata] No saved metadata for task ${taskId}`);
            return null;
        }
        console.error(`[Task Metadata] Error loading:`, error);
        throw error;
    }
}

/**
 * Delete task metadata
 *
 * @param {string} taskId - Task ID
 * @param {string} storageDir - Storage directory path
 * @returns {Promise<void>}
 */
async function deleteTaskMetadata(taskId, storageDir) {
    try {
        const filePath = path.join(storageDir, 'tasks', taskId, 'metadata.json');
        await fs.unlink(filePath);
        console.log(`🗑️ [Task Metadata] Deleted for task ${taskId}`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return; // Already deleted
        }
        console.error(`[Task Metadata] Error deleting:`, error);
        throw error;
    }
}

/**
 * List all saved tasks
 *
 * @param {string} storageDir - Storage directory path
 * @returns {Promise<Array>} List of task metadata
 */
async function listAllTasks(storageDir) {
    try {
        const tasksDir = path.join(storageDir, 'tasks');
        const taskDirs = await fs.readdir(tasksDir);

        const tasks = [];
        for (const taskId of taskDirs) {
            const metadata = await loadTaskMetadata(taskId, storageDir);
            if (metadata) {
                tasks.push(metadata);
            }
        }

        return tasks.sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        );

    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        console.error(`[Task Metadata] Error listing tasks:`, error);
        throw error;
    }
}

/**
 * Delete entire task directory
 *
 * @param {string} taskId - Task ID
 * @param {string} storageDir - Storage directory path
 * @returns {Promise<void>}
 */
async function deleteTaskDirectory(taskId, storageDir) {
    try {
        const taskDir = path.join(storageDir, 'tasks', taskId);
        await fs.rm(taskDir, { recursive: true, force: true });
        console.log(`🗑️ [Task Metadata] Deleted entire task directory for ${taskId}`);
    } catch (error) {
        console.error(`[Task Metadata] Error deleting task directory:`, error);
        throw error;
    }
}

module.exports = {
    saveTaskMetadata,
    loadTaskMetadata,
    deleteTaskMetadata,
    listAllTasks,
    deleteTaskDirectory
};
