/**
 * Task Messages Persistence
 *
 * Manages storage and retrieval of UI display messages.
 * Separate from API messages for cleaner UI/API separation.
 *
 * Inspired by Kilos task-persistence pattern
 *
 * @author Oropendola Team
 * @date 2025-10-23
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Task UI Message format
 * @typedef {Object} TaskMessage
 * @property {number} ts - Timestamp
 * @property {string} type - Message type: 'say' | 'ask'
 * @property {string} [say] - Say subtype: 'text' | 'user_feedback' | 'api_req_started' | 'reasoning'
 * @property {string} [ask] - Ask subtype: 'followup' | 'command' | 'completion_result' | 'resume_task'
 * @property {string} [text] - Message text
 * @property {string[]} [images] - Image URLs/paths
 * @property {Object} [metadata] - Additional metadata
 */

/**
 * Save UI messages for a task
 *
 * @param {string} taskId - Task ID
 * @param {TaskMessage[]} messages - UI messages
 * @param {string} storageDir - Storage directory path
 * @returns {Promise<void>}
 */
async function saveTaskMessages(taskId, messages, storageDir) {
    try {
        const taskDir = path.join(storageDir, 'tasks', taskId);
        await fs.mkdir(taskDir, { recursive: true });

        const filePath = path.join(taskDir, 'task_messages.json');
        await fs.writeFile(filePath, JSON.stringify(messages, null, 2));

        console.log(`💾 [Task Messages] Saved ${messages.length} UI messages for task ${taskId}`);
    } catch (error) {
        console.error(`[Task Messages] Error saving:`, error);
        throw error;
    }
}

/**
 * Load UI messages for a task
 *
 * @param {string} taskId - Task ID
 * @param {string} storageDir - Storage directory path
 * @returns {Promise<TaskMessage[]>} UI messages
 */
async function loadTaskMessages(taskId, storageDir) {
    try {
        const filePath = path.join(storageDir, 'tasks', taskId, 'task_messages.json');
        const data = await fs.readFile(filePath, 'utf-8');
        const messages = JSON.parse(data);

        console.log(`📂 [Task Messages] Loaded ${messages.length} UI messages for task ${taskId}`);
        return messages;
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log(`ℹ️ [Task Messages] No saved UI messages for task ${taskId}`);
            return [];
        }
        console.error(`[Task Messages] Error loading:`, error);
        throw error;
    }
}

/**
 * Delete UI messages for a task
 *
 * @param {string} taskId - Task ID
 * @param {string} storageDir - Storage directory path
 * @returns {Promise<void>}
 */
async function deleteTaskMessages(taskId, storageDir) {
    try {
        const filePath = path.join(storageDir, 'tasks', taskId, 'task_messages.json');
        await fs.unlink(filePath);
        console.log(`🗑️ [Task Messages] Deleted for task ${taskId}`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return; // Already deleted
        }
        console.error(`[Task Messages] Error deleting:`, error);
        throw error;
    }
}

/**
 * Convert API message to UI message format
 *
 * @param {Object} apiMessage - API message
 * @returns {TaskMessage} UI message
 */
function apiMessageToTaskMessage(apiMessage) {
    const ts = Date.now();

    if (apiMessage.role === 'user') {
        return {
            ts,
            type: 'say',
            say: 'user_feedback',
            text: apiMessage.content,
            images: apiMessage.images || []
        };
    } else if (apiMessage.role === 'assistant') {
        return {
            ts,
            type: 'say',
            say: 'text',
            text: apiMessage.content
        };
    } else if (apiMessage.role === 'system') {
        return {
            ts,
            type: 'say',
            say: 'text',
            text: '[System Message]',
            metadata: {
                systemPrompt: true
            }
        };
    } else if (apiMessage.role === 'tool_result') {
        return {
            ts,
            type: 'say',
            say: 'text',
            text: `[Tool Result: ${apiMessage.tool_name}]`,
            metadata: {
                toolResult: true,
                toolName: apiMessage.tool_name
            }
        };
    }

    return {
        ts,
        type: 'say',
        say: 'text',
        text: apiMessage.content || ''
    };
}

module.exports = {
    saveTaskMessages,
    loadTaskMessages,
    deleteTaskMessages,
    apiMessageToTaskMessage
};
