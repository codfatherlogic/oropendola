/**
 * TaskManager - High-level task lifecycle management
 * Sprint 1-2: Task Persistence Layer
 *
 * Features:
 * - Task lifecycle (create, save, load, delete, complete, terminate, fail)
 * - Event emission for task state changes
 * - Active task tracking
 * - Integration with TaskStorage
 * - Backend sync support (future)
 */

const { EventEmitter } = require('events')
const TaskStorage = require('../storage/TaskStorage')
const { v4: uuidv4 } = require('uuid')
const path = require('path')
const os = require('os')

class TaskManager extends EventEmitter {
	constructor (storagePath) {
		super()

		// Default storage path: ~/.oropendola/
		this.storagePath =
			storagePath || path.join(os.homedir(), '.oropendola')

		this.storage = new TaskStorage(this.storagePath)
		this.activeTasks = new Map() // taskId -> ConversationTask instance
		this.initialized = false

		console.log(`[TaskManager] Created with storage path: ${this.storagePath}`)
	}

	/**
	 * Initialize TaskManager and underlying storage
	 */
	async initialize () {
		if (this.initialized) {
			console.log('[TaskManager] Already initialized')
			return
		}

		await this.storage.initialize()
		this.initialized = true

		console.log('[TaskManager] Initialized successfully')

		// Emit ready event
		this.emit('ready')
	}

	/**
	 * Create new task
	 * @param {string} text - Task description
	 * @param {string} conversationId - Conversation ID
	 * @param {Object} metadata - Task metadata
	 * @returns {Promise<Object>} Created task
	 */
	async createTask (text, conversationId, metadata = {}) {
		this._ensureInitialized()

		const taskId = uuidv4()

		const task = await this.storage.createTask({
			id: taskId,
			text: text || 'Untitled Task',
			conversationId: conversationId || uuidv4(),
			status: 'active',
			messages: [],
			apiMetrics: this.storage._emptyMetrics(),
			contextTokens: 0,
			contextWindow: metadata.contextWindow || 200000,
			checkpoints: [],
			metadata: {
				version: metadata.version || '3.5.0',
				mode: metadata.mode || 'architect',
				model: metadata.model || 'default-model',
				...metadata
			}
		})

		console.log(`[TaskManager] Created task: ${taskId}`)

		// Emit taskCreated event
		this.emit('taskCreated', task)

		return task
	}

	/**
	 * Save task state (during conversation)
	 * Updates messages, apiMetrics, context usage
	 * @param {string} taskId - Task ID
	 * @param {Object} updates - Task updates
	 * @returns {Promise<Object>} Updated task
	 */
	async saveTask (taskId, updates) {
		this._ensureInitialized()

		// Build update object, only including fields that are provided
		const updateData = {}
		if (updates.messages !== undefined) updateData.messages = updates.messages
		if (updates.apiMetrics !== undefined) updateData.apiMetrics = updates.apiMetrics
		if (updates.contextTokens !== undefined) updateData.contextTokens = updates.contextTokens
		if (updates.checkpoints !== undefined) updateData.checkpoints = updates.checkpoints
		if (updates.currentCheckpoint !== undefined) updateData.currentCheckpoint = updates.currentCheckpoint
		if (updates.metadata !== undefined) updateData.metadata = updates.metadata
		if (updates.status !== undefined) updateData.status = updates.status

		const task = await this.storage.updateTask(taskId, updateData)

		console.log(`[TaskManager] Saved task: ${taskId}`)

		// Emit taskUpdated event
		this.emit('taskUpdated', task)

		return task
	}

	/**
	 * Load task by ID
	 * @param {string} taskId - Task ID
	 * @returns {Promise<Object>} Task
	 */
	async loadTask (taskId) {
		this._ensureInitialized()

		const task = await this.storage.getTask(taskId)

		if (!task) {
			throw new Error(`Task not found: ${taskId}`)
		}

		console.log(`[TaskManager] Loaded task: ${taskId}`)

		// Emit taskLoaded event
		this.emit('taskLoaded', task)

		return task
	}

	/**
	 * Delete task
	 * @param {string} taskId - Task ID
	 * @returns {Promise<boolean>} Success
	 */
	async deleteTask (taskId) {
		this._ensureInitialized()

		await this.storage.deleteTask(taskId)

		// Remove from active tasks
		this.activeTasks.delete(taskId)

		console.log(`[TaskManager] Deleted task: ${taskId}`)

		// Emit taskDeleted event
		this.emit('taskDeleted', taskId)

		return true
	}

	/**
	 * Complete task (successful completion)
	 * @param {string} taskId - Task ID
	 * @param {Object} finalMetadata - Final metadata
	 * @returns {Promise<Object>} Updated task
	 */
	async completeTask (taskId, finalMetadata = {}) {
		this._ensureInitialized()

		const task = await this.storage.updateTask(taskId, {
			status: 'completed',
			completedAt: Date.now(),
			metadata: finalMetadata
		})

		// Remove from active tasks
		this.activeTasks.delete(taskId)

		console.log(`[TaskManager] Completed task: ${taskId}`)

		// Emit taskCompleted event
		this.emit('taskCompleted', task)

		return task
	}

	/**
	 * Terminate task (user stopped)
	 * @param {string} taskId - Task ID
	 * @param {string} reason - Termination reason
	 * @returns {Promise<Object>} Updated task
	 */
	async terminateTask (taskId, reason = 'User stopped') {
		this._ensureInitialized()

		const task = await this.storage.getTask(taskId)

		if (task) {
			const updatedTask = await this.storage.updateTask(taskId, {
				status: 'terminated',
				completedAt: Date.now(),
				metadata: {
					...task.metadata,
					terminationReason: reason
				}
			})

			// Remove from active tasks
			this.activeTasks.delete(taskId)

			console.log(`[TaskManager] Terminated task: ${taskId} - ${reason}`)

			// Emit taskTerminated event
			this.emit('taskTerminated', updatedTask)

			return updatedTask
		}

		return null
	}

	/**
	 * Fail task (error occurred)
	 * @param {string} taskId - Task ID
	 * @param {Error} error - Error object
	 * @returns {Promise<Object>} Updated task
	 */
	async failTask (taskId, error) {
		this._ensureInitialized()

		const task = await this.storage.getTask(taskId)

		if (task) {
			const updatedTask = await this.storage.updateTask(taskId, {
				status: 'failed',
				completedAt: Date.now(),
				metadata: {
					...task.metadata,
					error: error.message,
					stack: error.stack
				}
			})

			// Remove from active tasks
			this.activeTasks.delete(taskId)

			console.error(`[TaskManager] Failed task: ${taskId}`, error)

			// Emit taskFailed event
			this.emit('taskFailed', updatedTask, error)

			return updatedTask
		}

		return null
	}

	/**
	 * List tasks with filters
	 * @param {Object} filters - Filter options
	 * @returns {Promise<Array>} Tasks
	 */
	async listTasks (filters = {}) {
		this._ensureInitialized()

		return this.storage.listTasks(filters)
	}

	/**
	 * Search tasks by text
	 * @param {string} query - Search query
	 * @param {Object} filters - Additional filters
	 * @returns {Promise<Array>} Matching tasks
	 */
	async searchTasks (query, filters = {}) {
		this._ensureInitialized()

		return this.storage.listTasks({
			...filters,
			search: query
		})
	}

	/**
	 * Export task to format
	 * @param {string} taskId - Task ID
	 * @param {string} format - Export format (json, txt, md)
	 * @returns {Promise<string>} Exported content
	 */
	async exportTask (taskId, format = 'json') {
		this._ensureInitialized()

		return this.storage.exportTask(taskId, format)
	}

	/**
	 * Get task statistics
	 * @returns {Promise<Object>} Statistics
	 */
	async getStats () {
		this._ensureInitialized()

		return this.storage.getStats()
	}

	/**
	 * Register active task instance
	 * Used by ConversationTask to track running tasks
	 * @param {string} taskId - Task ID
	 * @param {Object} conversationTask - ConversationTask instance
	 */
	registerActiveTask (taskId, conversationTask) {
		this.activeTasks.set(taskId, conversationTask)
		console.log(
			`[TaskManager] Registered active task: ${taskId} (total: ${this.activeTasks.size})`
		)

		// Emit activeTaskRegistered event
		this.emit('activeTaskRegistered', taskId, conversationTask)
	}

	/**
	 * Unregister active task
	 * @param {string} taskId - Task ID
	 */
	unregisterActiveTask (taskId) {
		const removed = this.activeTasks.delete(taskId)
		if (removed) {
			console.log(
				`[TaskManager] Unregistered active task: ${taskId} (total: ${this.activeTasks.size})`
			)

			// Emit activeTaskUnregistered event
			this.emit('activeTaskUnregistered', taskId)
		}
	}

	/**
	 * Get active task instance
	 * @param {string} taskId - Task ID
	 * @returns {Object|null} ConversationTask instance
	 */
	getActiveTask (taskId) {
		return this.activeTasks.get(taskId) || null
	}

	/**
	 * Get all active task IDs
	 * @returns {Array<string>} Active task IDs
	 */
	getActiveTaskIds () {
		return Array.from(this.activeTasks.keys())
	}

	/**
	 * Get count of active tasks
	 * @returns {number} Count
	 */
	getActiveTaskCount () {
		return this.activeTasks.size
	}

	/**
	 * Check if task is active
	 * @param {string} taskId - Task ID
	 * @returns {boolean} Is active
	 */
	isTaskActive (taskId) {
		return this.activeTasks.has(taskId)
	}

	/**
	 * Update task text/description
	 * @param {string} taskId - Task ID
	 * @param {string} text - New task text
	 * @returns {Promise<Object>} Updated task
	 */
	async updateTaskText (taskId, text) {
		this._ensureInitialized()

		const task = await this.storage.updateTask(taskId, { text })

		console.log(`[TaskManager] Updated task text: ${taskId}`)

		// Emit taskUpdated event
		this.emit('taskUpdated', task)

		return task
	}

	/**
	 * Add checkpoint to task
	 * @param {string} taskId - Task ID
	 * @param {string} label - Checkpoint label
	 * @returns {Promise<Object>} Updated task
	 */
	async addCheckpoint (taskId, label) {
		this._ensureInitialized()

		const task = await this.storage.getTask(taskId)

		if (!task) {
			throw new Error(`Task not found: ${taskId}`)
		}

		const checkpoint = {
			id: uuidv4(),
			timestamp: Date.now(),
			messageIndex: task.messages.length,
			contextTokens: task.contextTokens,
			label: label || `Checkpoint ${task.checkpoints.length + 1}`
		}

		const checkpoints = [...task.checkpoints, checkpoint]

		const updatedTask = await this.storage.updateTask(taskId, {
			checkpoints,
			currentCheckpoint: checkpoint.id
		})

		console.log(`[TaskManager] Added checkpoint to task: ${taskId}`)

		// Emit checkpointAdded event
		this.emit('checkpointAdded', updatedTask, checkpoint)

		return updatedTask
	}

	/**
	 * Restore task to checkpoint
	 * @param {string} taskId - Task ID
	 * @param {string} checkpointId - Checkpoint ID
	 * @returns {Promise<Object>} Updated task
	 */
	async restoreCheckpoint (taskId, checkpointId) {
		this._ensureInitialized()

		const task = await this.storage.getTask(taskId)

		if (!task) {
			throw new Error(`Task not found: ${taskId}`)
		}

		const checkpoint = task.checkpoints.find((c) => c.id === checkpointId)

		if (!checkpoint) {
			throw new Error(`Checkpoint not found: ${checkpointId}`)
		}

		// Truncate messages to checkpoint
		const messages = task.messages.slice(0, checkpoint.messageIndex)

		const updatedTask = await this.storage.updateTask(taskId, {
			messages,
			currentCheckpoint: checkpointId
		})

		console.log(`[TaskManager] Restored task to checkpoint: ${taskId}`)

		// Emit checkpointRestored event
		this.emit('checkpointRestored', updatedTask, checkpoint)

		return updatedTask
	}

	/**
	 * Close TaskManager and cleanup
	 */
	async close () {
		await this.storage.close()
		this.activeTasks.clear()
		this.initialized = false

		console.log('[TaskManager] Closed')

		// Emit closed event
		this.emit('closed')
	}

	// ==================== Private Methods ====================

	/**
	 * Ensure TaskManager is initialized
	 * @private
	 */
	_ensureInitialized () {
		if (!this.initialized) {
			throw new Error(
				'TaskManager not initialized. Call initialize() first.'
			)
		}
	}
}

module.exports = TaskManager
