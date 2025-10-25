/**
 * Task Resumption Module
 *
 * Implements Kilos-inspired 4-phase resumption pattern:
 * 1. Load persisted state
 * 2. Clean message artifacts
 * 3. Ask user to resume
 * 4. Restore API conversation
 *
 * @author Oropendola Team
 * @date 2025-10-23
 */

const {
    loadApiMessages,
    loadTaskMessages,
    loadTaskMetadata
} = require('./task-persistence');

/**
 * Resume a task from saved state
 *
 * @param {string} taskId - Task ID to resume
 * @param {string} storageDir - Storage directory
 * @param {Function} askUserCallback - Callback to ask user if they want to resume
 * @returns {Promise<Object>} Restored task state
 */
async function resumeTaskFromHistory(taskId, storageDir, askUserCallback) {
    console.log(`🔄 [Task Resumption] Starting resumption for task ${taskId}`);

    try {
        // ========================================
        // PHASE 1: Load Persisted State
        // ========================================
        console.log('📂 [Phase 1/4] Loading persisted state...');

        const metadata = await loadTaskMetadata(taskId, storageDir);
        if (!metadata) {
            throw new Error(`No metadata found for task ${taskId}`);
        }

        const apiMessages = await loadApiMessages(taskId, storageDir);
        const taskMessages = await loadTaskMessages(taskId, storageDir);

        console.log(`✅ [Phase 1/4] Loaded state:`);
        console.log(`   - API messages: ${apiMessages.length}`);
        console.log(`   - Task messages: ${taskMessages.length}`);
        console.log(`   - Status: ${metadata.status}`);

        // ========================================
        // PHASE 2: Clean Message Artifacts
        // ========================================
        console.log('🧹 [Phase 2/4] Cleaning message artifacts...');

        // Remove temporary resume messages from task messages
        const cleanedTaskMessages = removeTemporaryMessages(taskMessages);

        // Remove trailing reasoning-only messages
        const trimmedTaskMessages = trimTrailingReasoningMessages(cleanedTaskMessages);

        // Remove incomplete API requests
        const cleanedApiMessages = removeIncompleteApiRequests(apiMessages);

        console.log(`✅ [Phase 2/4] Cleaned messages:`);
        console.log(`   - Task messages: ${taskMessages.length} → ${trimmedTaskMessages.length}`);
        console.log(`   - API messages: ${apiMessages.length} → ${cleanedApiMessages.length}`);

        // ========================================
        // PHASE 3: Ask User to Resume
        // ========================================
        console.log('❓ [Phase 3/4] Asking user to resume...');

        const lastTaskMessage = trimmedTaskMessages[trimmedTaskMessages.length - 1];
        const isCompleted = metadata.status === 'completed';

        const resumeType = isCompleted ? 'resume_completed_task' : 'resume_task';
        const userChoice = await askUserCallback(resumeType, {
            taskId,
            metadata,
            lastMessage: lastTaskMessage,
            isCompleted
        });

        if (userChoice !== 'resume') {
            console.log('❌ [Phase 3/4] User declined to resume');
            return null;
        }

        console.log('✅ [Phase 3/4] User confirmed resumption');

        // ========================================
        // PHASE 4: Restore API Conversation
        // ========================================
        console.log('🔄 [Phase 4/4] Restoring API conversation...');

        // Convert tool use blocks to text (for legacy compatibility)
        const restoredApiMessages = convertToolUseBlocksToText(cleanedApiMessages);

        console.log(`✅ [Phase 4/4] API conversation restored: ${restoredApiMessages.length} messages`);

        // ========================================
        // Return Restored State
        // ========================================
        return {
            taskId,
            metadata,
            apiMessages: restoredApiMessages,
            taskMessages: trimmedTaskMessages,
            resumed: true
        };

    } catch (error) {
        console.error(`❌ [Task Resumption] Error resuming task ${taskId}:`, error);
        throw error;
    }
}

/**
 * Remove temporary resume messages
 * @private
 */
function removeTemporaryMessages(messages) {
    // Find last relevant message (not a resume message)
    let lastRelevantIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        const isResumeMsg = msg.ask === 'resume_task' || msg.ask === 'resume_completed_task';
        if (!isResumeMsg) {
            lastRelevantIndex = i;
            break;
        }
    }

    if (lastRelevantIndex === -1) {
        return messages; // No cleanup needed
    }

    // Remove all resume messages after the last relevant message
    return messages.slice(0, lastRelevantIndex + 1);
}

/**
 * Trim trailing reasoning-only messages
 * @private
 */
function trimTrailingReasoningMessages(messages) {
    const trimmed = [...messages];

    while (trimmed.length > 0) {
        const last = trimmed[trimmed.length - 1];
        if (last.type === 'say' && last.say === 'reasoning') {
            trimmed.pop();
        } else {
            break;
        }
    }

    return trimmed;
}

/**
 * Remove incomplete API requests
 * @private
 */
function removeIncompleteApiRequests(messages) {
    // Remove messages that were part of an incomplete request
    // (e.g., if task was interrupted mid-request)
    const cleaned = [...messages];

    // Simple heuristic: if last message is a user message with no assistant response,
    // it might be incomplete
    if (cleaned.length > 0) {
        const last = cleaned[cleaned.length - 1];
        if (last.role === 'user' && cleaned.length > 1) {
            const secondLast = cleaned[cleaned.length - 2];
            if (secondLast.role === 'user') {
                // Two consecutive user messages - probably incomplete
                console.log('⚠️ Found incomplete request, removing last user message');
                cleaned.pop();
            }
        }
    }

    return cleaned;
}

/**
 * Convert tool use blocks to text format (legacy support)
 * @private
 */
function convertToolUseBlocksToText(messages) {
    return messages.map(message => {
        if (Array.isArray(message.content)) {
            const newContent = message.content.map(block => {
                if (block.type === 'tool_use') {
                    // Convert to XML format for better AI understanding
                    return {
                        type: 'text',
                        text: `<${block.name}>\n${JSON.stringify(block.input, null, 2)}\n</${block.name}>`
                    };
                }
                return block;
            });

            return { ...message, content: newContent };
        }
        return message;
    });
}

/**
 * Check if a task is resumable
 *
 * @param {string} taskId - Task ID
 * @param {string} storageDir - Storage directory
 * @returns {Promise<boolean>} True if task can be resumed
 */
async function isTaskResumable(taskId, storageDir) {
    try {
        const metadata = await loadTaskMetadata(taskId, storageDir);
        if (!metadata) {
            return false;
        }

        // Task is resumable if it's not completed or if it completed recently
        if (metadata.status === 'running' || metadata.status === 'paused') {
            return true;
        }

        if (metadata.status === 'completed') {
            // Allow resuming completed tasks for follow-ups
            return true;
        }

        return false;
    } catch (error) {
        console.error(`[Task Resumption] Error checking if task ${taskId} is resumable:`, error);
        return false;
    }
}

module.exports = {
    resumeTaskFromHistory,
    isTaskResumable
};
