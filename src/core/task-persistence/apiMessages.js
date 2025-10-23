/**
 * API Messages Persistence
 *
 * Manages storage and retrieval of API conversation history.
 * Separate from UI display messages for cleaner architecture.
 *
 * Inspired by Kilos task-persistence pattern
 *
 * @author Oropendola Team
 * @date 2025-10-23
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Save API conversation history for a task
 *
 * @param {string} taskId - Task ID
 * @param {Array} apiMessages - API conversation history
 * @param {string} storageDir - Storage directory path
 * @returns {Promise<void>}
 */
async function saveApiMessages(taskId, apiMessages, storageDir) {
    try {
        const taskDir = path.join(storageDir, 'tasks', taskId);
        await fs.mkdir(taskDir, { recursive: true });

        const filePath = path.join(taskDir, 'api_messages.json');
        await fs.writeFile(filePath, JSON.stringify(apiMessages, null, 2));

        console.log(`💾 [API Messages] Saved ${apiMessages.length} API messages for task ${taskId}`);
    } catch (error) {
        console.error(`[API Messages] Error saving:`, error);
        throw error;
    }
}

/**
 * Load API conversation history for a task
 *
 * @param {string} taskId - Task ID
 * @param {string} storageDir - Storage directory path
 * @returns {Promise<Array>} API messages
 */
async function loadApiMessages(taskId, storageDir) {
    try {
        const filePath = path.join(storageDir, 'tasks', taskId, 'api_messages.json');
        const data = await fs.readFile(filePath, 'utf-8');
        const messages = JSON.parse(data);

        console.log(`📂 [API Messages] Loaded ${messages.length} API messages for task ${taskId}`);
        return messages;
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log(`ℹ️ [API Messages] No saved API messages for task ${taskId}`);
            return [];
        }
        console.error(`[API Messages] Error loading:`, error);
        throw error;
    }
}

/**
 * Delete API messages for a task
 *
 * @param {string} taskId - Task ID
 * @param {string} storageDir - Storage directory path
 * @returns {Promise<void>}
 */
async function deleteApiMessages(taskId, storageDir) {
    try {
        const filePath = path.join(storageDir, 'tasks', taskId, 'api_messages.json');
        await fs.unlink(filePath);
        console.log(`🗑️ [API Messages] Deleted for task ${taskId}`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return; // Already deleted
        }
        console.error(`[API Messages] Error deleting:`, error);
        throw error;
    }
}

module.exports = {
    saveApiMessages,
    loadApiMessages,
    deleteApiMessages
};
