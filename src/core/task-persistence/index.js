/**
 * Task Persistence Module
 *
 * Centralized module for task state persistence
 * Inspired by Kilos architecture
 *
 * @author Oropendola Team
 * @date 2025-10-23
 */

const apiMessages = require('./apiMessages');
const taskMessages = require('./taskMessages');
const taskMetadata = require('./taskMetadata');

module.exports = {
    // API Messages
    saveApiMessages: apiMessages.saveApiMessages,
    loadApiMessages: apiMessages.loadApiMessages,
    deleteApiMessages: apiMessages.deleteApiMessages,

    // Task Messages
    saveTaskMessages: taskMessages.saveTaskMessages,
    loadTaskMessages: taskMessages.loadTaskMessages,
    deleteTaskMessages: taskMessages.deleteTaskMessages,
    apiMessageToTaskMessage: taskMessages.apiMessageToTaskMessage,

    // Task Metadata
    saveTaskMetadata: taskMetadata.saveTaskMetadata,
    loadTaskMetadata: taskMetadata.loadTaskMetadata,
    deleteTaskMetadata: taskMetadata.deleteTaskMetadata,
    listAllTasks: taskMetadata.listAllTasks,
    deleteTaskDirectory: taskMetadata.deleteTaskDirectory
};
