/**
 * TaskManager Test Suite
 * Sprint 1-2: Task Persistence Layer
 *
 * Tests:
 * - Initialization
 * - Task creation
 * - Task lifecycle (save, load, delete, complete, terminate, fail)
 * - Events
 * - Active task tracking
 * - Search and filtering
 * - Checkpoints
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import TaskManager from '../TaskManager.js'
import path from 'path'
import fs from 'fs/promises'
import os from 'os'

describe('TaskManager', () => {
	let manager
	let tempDir

	beforeEach(async () => {
		// Create temporary directory for each test
		tempDir = path.join(os.tmpdir(), 'oropendola-manager-test-' + Date.now())
		manager = new TaskManager(tempDir)
		await manager.initialize()
	})

	afterEach(async () => {
		// Clean up
		await manager.close()
		await fs.rm(tempDir, { recursive: true, force: true })
	})

	describe('Initialization', () => {
		it('should initialize TaskManager', () => {
			expect(manager.initialized).toBe(true)
			expect(manager.storage).toBeDefined()
			expect(manager.activeTasks).toBeDefined()
			expect(manager.activeTasks.size).toBe(0)
		})

		it('should emit ready event on initialization', async () => {
			const newTempDir = path.join(
				os.tmpdir(),
				'oropendola-manager-test-' + Date.now()
			)
			const newManager = new TaskManager(newTempDir)

			const readyPromise = new Promise((resolve) => {
				newManager.once('ready', resolve)
			})

			await newManager.initialize()
			await readyPromise

			await newManager.close()
			await fs.rm(newTempDir, { recursive: true, force: true })
		})

		it('should not reinitialize if already initialized', async () => {
			const spy = vi.spyOn(console, 'log')
			await manager.initialize()

			expect(spy).toHaveBeenCalledWith('[TaskManager] Already initialized')
			spy.mockRestore()
		})

		it('should throw error if method called before initialization', async () => {
			const uninitializedManager = new TaskManager(tempDir)

			await expect(uninitializedManager.createTask('Test')).rejects.toThrow(
				'TaskManager not initialized'
			)
		})
	})

	describe('createTask', () => {
		it('should create task with text', async () => {
			const task = await manager.createTask('Test task', 'conv-123')

			expect(task).toBeDefined()
			expect(task.id).toBeDefined()
			expect(task.text).toBe('Test task')
			expect(task.conversationId).toBe('conv-123')
			expect(task.status).toBe('active')
		})

		it('should create task with generated conversation ID', async () => {
			const task = await manager.createTask('Test task')

			expect(task.conversationId).toBeDefined()
			expect(task.conversationId).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
			)
		})

		it('should create task with default metadata', async () => {
			const task = await manager.createTask('Test task')

			expect(task.metadata.version).toBe('3.5.0')
			expect(task.metadata.mode).toBe('architect')
			expect(task.metadata.model).toBe('claude-3-5-sonnet-20241022')
		})

		it('should create task with custom metadata', async () => {
			const task = await manager.createTask('Test task', 'conv-123', {
				mode: 'code',
				model: 'claude-3-haiku',
				customField: 'custom value'
			})

			expect(task.metadata.mode).toBe('code')
			expect(task.metadata.model).toBe('claude-3-haiku')
			expect(task.metadata.customField).toBe('custom value')
		})

		it('should emit taskCreated event', async () => {
			const eventPromise = new Promise((resolve) => {
				manager.once('taskCreated', resolve)
			})

			const task = await manager.createTask('Test task')
			const emittedTask = await eventPromise

			expect(emittedTask.id).toBe(task.id)
		})

		it('should create task with default text if not provided', async () => {
			const task = await manager.createTask()

			expect(task.text).toBe('Untitled Task')
		})
	})

	describe('saveTask', () => {
		it('should save task state', async () => {
			const task = await manager.createTask('Test task')

			const messages = [
				{ type: 'ask', text: 'User message', ts: Date.now() },
				{ type: 'say', text: 'Assistant response', ts: Date.now() }
			]

			const saved = await manager.saveTask(task.id, {
				messages,
				apiMetrics: {
					tokensIn: 100,
					tokensOut: 50,
					cacheWrites: 0,
					cacheReads: 0,
					totalCost: 0.001,
					contextTokens: 150
				},
				contextTokens: 150
			})

			expect(saved.messages).toHaveLength(2)
			expect(saved.apiMetrics.tokensIn).toBe(100)
			expect(saved.contextTokens).toBe(150)
		})

		it('should emit taskUpdated event', async () => {
			const task = await manager.createTask('Test task')

			const eventPromise = new Promise((resolve) => {
				manager.once('taskUpdated', resolve)
			})

			await manager.saveTask(task.id, {
				messages: [],
				apiMetrics: manager.storage._emptyMetrics(),
				contextTokens: 0
			})

			const emittedTask = await eventPromise
			expect(emittedTask.id).toBe(task.id)
		})
	})

	describe('loadTask', () => {
		it('should load task by ID', async () => {
			const created = await manager.createTask('Test task')
			const loaded = await manager.loadTask(created.id)

			expect(loaded.id).toBe(created.id)
			expect(loaded.text).toBe('Test task')
		})

		it('should throw error for non-existent task', async () => {
			await expect(manager.loadTask('non-existent')).rejects.toThrow(
				'Task not found'
			)
		})

		it('should emit taskLoaded event', async () => {
			const task = await manager.createTask('Test task')

			const eventPromise = new Promise((resolve) => {
				manager.once('taskLoaded', resolve)
			})

			await manager.loadTask(task.id)
			const emittedTask = await eventPromise

			expect(emittedTask.id).toBe(task.id)
		})
	})

	describe('deleteTask', () => {
		it('should delete task', async () => {
			const task = await manager.createTask('Test task')
			const result = await manager.deleteTask(task.id)

			expect(result).toBe(true)

			await expect(manager.loadTask(task.id)).rejects.toThrow(
				'Task not found'
			)
		})

		it('should remove task from active tasks', async () => {
			const task = await manager.createTask('Test task')
			manager.registerActiveTask(task.id, { test: 'object' })

			expect(manager.isTaskActive(task.id)).toBe(true)

			await manager.deleteTask(task.id)

			expect(manager.isTaskActive(task.id)).toBe(false)
		})

		it('should emit taskDeleted event', async () => {
			const task = await manager.createTask('Test task')

			const eventPromise = new Promise((resolve) => {
				manager.once('taskDeleted', resolve)
			})

			await manager.deleteTask(task.id)
			const emittedTaskId = await eventPromise

			expect(emittedTaskId).toBe(task.id)
		})
	})

	describe('completeTask', () => {
		it('should mark task as completed', async () => {
			const task = await manager.createTask('Test task')
			const completed = await manager.completeTask(task.id)

			expect(completed.status).toBe('completed')
			expect(completed.completedAt).toBeDefined()
		})

		it('should remove task from active tasks', async () => {
			const task = await manager.createTask('Test task')
			manager.registerActiveTask(task.id, { test: 'object' })

			await manager.completeTask(task.id)

			expect(manager.isTaskActive(task.id)).toBe(false)
		})

		it('should emit taskCompleted event', async () => {
			const task = await manager.createTask('Test task')

			const eventPromise = new Promise((resolve) => {
				manager.once('taskCompleted', resolve)
			})

			await manager.completeTask(task.id)
			const emittedTask = await eventPromise

			expect(emittedTask.id).toBe(task.id)
			expect(emittedTask.status).toBe('completed')
		})

		it('should save final metadata', async () => {
			const task = await manager.createTask('Test task')
			const completed = await manager.completeTask(task.id, {
				totalDuration: 1000,
				customField: 'value'
			})

			expect(completed.metadata.totalDuration).toBe(1000)
			expect(completed.metadata.customField).toBe('value')
		})
	})

	describe('terminateTask', () => {
		it('should mark task as terminated', async () => {
			const task = await manager.createTask('Test task')
			const terminated = await manager.terminateTask(task.id)

			expect(terminated.status).toBe('terminated')
			expect(terminated.completedAt).toBeDefined()
			expect(terminated.metadata.terminationReason).toBe('User stopped')
		})

		it('should save termination reason', async () => {
			const task = await manager.createTask('Test task')
			const terminated = await manager.terminateTask(
				task.id,
				'Custom termination reason'
			)

			expect(terminated.metadata.terminationReason).toBe(
				'Custom termination reason'
			)
		})

		it('should emit taskTerminated event', async () => {
			const task = await manager.createTask('Test task')

			const eventPromise = new Promise((resolve) => {
				manager.once('taskTerminated', resolve)
			})

			await manager.terminateTask(task.id)
			const emittedTask = await eventPromise

			expect(emittedTask.id).toBe(task.id)
			expect(emittedTask.status).toBe('terminated')
		})

		it('should return null for non-existent task', async () => {
			const result = await manager.terminateTask('non-existent')
			expect(result).toBeNull()
		})
	})

	describe('failTask', () => {
		it('should mark task as failed', async () => {
			const task = await manager.createTask('Test task')
			const error = new Error('Test error')
			const failed = await manager.failTask(task.id, error)

			expect(failed.status).toBe('failed')
			expect(failed.completedAt).toBeDefined()
			expect(failed.metadata.error).toBe('Test error')
			expect(failed.metadata.stack).toBeDefined()
		})

		it('should emit taskFailed event with error', async () => {
			const task = await manager.createTask('Test task')
			const error = new Error('Test error')

			const eventPromise = new Promise((resolve) => {
				manager.once('taskFailed', (task, err) => resolve({ task, err }))
			})

			await manager.failTask(task.id, error)
			const { task: emittedTask, err } = await eventPromise

			expect(emittedTask.id).toBe(task.id)
			expect(err.message).toBe('Test error')
		})

		it('should return null for non-existent task', async () => {
			const error = new Error('Test error')
			const result = await manager.failTask('non-existent', error)
			expect(result).toBeNull()
		})
	})

	describe('listTasks', () => {
		beforeEach(async () => {
			await manager.createTask('Active task 1', 'conv-1')
			await manager.createTask('Active task 2', 'conv-2')
			const task3 = await manager.createTask('Completed task', 'conv-3')
			await manager.completeTask(task3.id)
		})

		it('should list all tasks', async () => {
			const tasks = await manager.listTasks()
			expect(tasks.length).toBeGreaterThanOrEqual(3)
		})

		it('should filter by status', async () => {
			const activeTasks = await manager.listTasks({ status: 'active' })
			expect(activeTasks.length).toBeGreaterThanOrEqual(2)
			expect(activeTasks.every((t) => t.status === 'active')).toBe(true)

			const completedTasks = await manager.listTasks({ status: 'completed' })
			expect(completedTasks.length).toBeGreaterThanOrEqual(1)
			expect(completedTasks[0].text).toBe('Completed task')
		})

		it('should paginate results', async () => {
			const page1 = await manager.listTasks({ limit: 2, offset: 0 })
			const page2 = await manager.listTasks({ limit: 2, offset: 2 })

			expect(page1.length).toBeLessThanOrEqual(2)
			expect(page2.length).toBeLessThanOrEqual(2)
		})
	})

	describe('searchTasks', () => {
		beforeEach(async () => {
			await manager.createTask('Build new feature')
			await manager.createTask('Fix bug in authentication')
			await manager.createTask('Improve performance')
		})

		it('should search tasks by text', async () => {
			const results = await manager.searchTasks('bug')
			expect(results.length).toBeGreaterThanOrEqual(1)
			expect(results[0].text).toContain('bug')
		})

		it('should combine search with filters', async () => {
			const task = await manager.createTask('Build API endpoint')
			await manager.completeTask(task.id)

			const results = await manager.searchTasks('Build', { status: 'active' })
			const texts = results.map((t) => t.text)

			expect(texts).toContain('Build new feature')
			expect(texts).not.toContain('Build API endpoint')
		})
	})

	describe('exportTask', () => {
		let task

		beforeEach(async () => {
			task = await manager.createTask('Export test task')
			await manager.saveTask(task.id, {
				messages: [
					{ type: 'ask', text: 'User message', ts: Date.now() },
					{ type: 'say', text: 'Assistant response', ts: Date.now() }
				],
				apiMetrics: {
					tokensIn: 100,
					tokensOut: 50,
					cacheWrites: 0,
					cacheReads: 0,
					totalCost: 0.001,
					contextTokens: 0
				},
				contextTokens: 150
			})
		})

		it('should export to JSON', async () => {
			const json = await manager.exportTask(task.id, 'json')
			const parsed = JSON.parse(json)

			expect(parsed.id).toBe(task.id)
			expect(parsed.messages).toHaveLength(2)
		})

		it('should export to TXT', async () => {
			const txt = await manager.exportTask(task.id, 'txt')

			expect(txt).toContain('Export test task')
			expect(txt).toContain('User message')
			expect(txt).toContain('Assistant response')
		})

		it('should export to Markdown', async () => {
			const md = await manager.exportTask(task.id, 'md')

			expect(md).toContain('# Export test task')
			expect(md).toContain('**User:**')
			expect(md).toContain('**Assistant:**')
		})
	})

	describe('getStats', () => {
		beforeEach(async () => {
			await manager.createTask('Active 1')
			await manager.createTask('Active 2')
			const task3 = await manager.createTask('Completed')
			await manager.completeTask(task3.id)
			const task4 = await manager.createTask('Failed')
			await manager.failTask(task4.id, new Error('Test error'))
		})

		it('should return task statistics', async () => {
			const stats = await manager.getStats()

			expect(stats.total).toBeGreaterThanOrEqual(4)
			expect(stats.active).toBeGreaterThanOrEqual(2)
			expect(stats.completed).toBeGreaterThanOrEqual(1)
			expect(stats.failed).toBeGreaterThanOrEqual(1)
		})
	})

	describe('Active Task Management', () => {
		it('should register active task', () => {
			const taskInstance = { test: 'object', id: 'test-123' }
			manager.registerActiveTask('task-123', taskInstance)

			expect(manager.isTaskActive('task-123')).toBe(true)
			expect(manager.getActiveTask('task-123')).toBe(taskInstance)
			expect(manager.getActiveTaskCount()).toBe(1)
		})

		it('should unregister active task', () => {
			manager.registerActiveTask('task-123', { test: 'object' })
			manager.unregisterActiveTask('task-123')

			expect(manager.isTaskActive('task-123')).toBe(false)
			expect(manager.getActiveTask('task-123')).toBeNull()
			expect(manager.getActiveTaskCount()).toBe(0)
		})

		it('should get all active task IDs', () => {
			manager.registerActiveTask('task-1', { id: 1 })
			manager.registerActiveTask('task-2', { id: 2 })
			manager.registerActiveTask('task-3', { id: 3 })

			const ids = manager.getActiveTaskIds()
			expect(ids).toHaveLength(3)
			expect(ids).toContain('task-1')
			expect(ids).toContain('task-2')
			expect(ids).toContain('task-3')
		})

		it('should emit activeTaskRegistered event', () => {
			const eventPromise = new Promise((resolve) => {
				manager.once('activeTaskRegistered', (id, task) =>
					resolve({ id, task })
				)
			})

			const taskInstance = { test: 'object' }
			manager.registerActiveTask('task-123', taskInstance)

			return eventPromise.then(({ id, task }) => {
				expect(id).toBe('task-123')
				expect(task).toBe(taskInstance)
			})
		})

		it('should emit activeTaskUnregistered event', () => {
			manager.registerActiveTask('task-123', { test: 'object' })

			const eventPromise = new Promise((resolve) => {
				manager.once('activeTaskUnregistered', resolve)
			})

			manager.unregisterActiveTask('task-123')

			return eventPromise.then((id) => {
				expect(id).toBe('task-123')
			})
		})
	})

	describe('updateTaskText', () => {
		it('should update task text', async () => {
			const task = await manager.createTask('Original text')
			const updated = await manager.updateTaskText(task.id, 'Updated text')

			expect(updated.text).toBe('Updated text')
		})

		it('should emit taskUpdated event', async () => {
			const task = await manager.createTask('Original text')

			const eventPromise = new Promise((resolve) => {
				manager.once('taskUpdated', resolve)
			})

			await manager.updateTaskText(task.id, 'Updated text')
			const emittedTask = await eventPromise

			expect(emittedTask.text).toBe('Updated text')
		})
	})

	describe('Checkpoints', () => {
		let task

		beforeEach(async () => {
			task = await manager.createTask('Checkpoint test')
			await manager.saveTask(task.id, {
				messages: [
					{ type: 'ask', text: 'Message 1', ts: Date.now() },
					{ type: 'say', text: 'Response 1', ts: Date.now() },
					{ type: 'ask', text: 'Message 2', ts: Date.now() }
				],
				apiMetrics: manager.storage._emptyMetrics(),
				contextTokens: 100
			})
		})

		it('should add checkpoint', async () => {
			const updated = await manager.addCheckpoint(task.id, 'Before changes')

			expect(updated.checkpoints).toHaveLength(1)
			expect(updated.checkpoints[0].label).toBe('Before changes')
			expect(updated.checkpoints[0].messageIndex).toBe(3)
			expect(updated.currentCheckpoint).toBe(updated.checkpoints[0].id)
		})

		it('should add checkpoint with default label', async () => {
			const updated = await manager.addCheckpoint(task.id)

			expect(updated.checkpoints[0].label).toBe('Checkpoint 1')
		})

		it('should emit checkpointAdded event', async () => {
			const eventPromise = new Promise((resolve) => {
				manager.once('checkpointAdded', (task, checkpoint) =>
					resolve({ task, checkpoint })
				)
			})

			await manager.addCheckpoint(task.id, 'Test checkpoint')
			const { task: emittedTask, checkpoint } = await eventPromise

			expect(emittedTask.id).toBe(task.id)
			expect(checkpoint.label).toBe('Test checkpoint')
		})

		it('should restore checkpoint', async () => {
			const withCheckpoint = await manager.addCheckpoint(
				task.id,
				'After message 3'
			)
			const checkpointId = withCheckpoint.checkpoints[0].id

			// Add more messages
			await manager.saveTask(task.id, {
				messages: [
					...withCheckpoint.messages,
					{ type: 'say', text: 'Response 2', ts: Date.now() },
					{ type: 'ask', text: 'Message 3', ts: Date.now() }
				],
				apiMetrics: manager.storage._emptyMetrics(),
				contextTokens: 150
			})

			// Restore to checkpoint
			const restored = await manager.restoreCheckpoint(task.id, checkpointId)

			expect(restored.messages).toHaveLength(3)
			expect(restored.currentCheckpoint).toBe(checkpointId)
		})

		it('should throw error for non-existent checkpoint', async () => {
			await expect(
				manager.restoreCheckpoint(task.id, 'non-existent')
			).rejects.toThrow('Checkpoint not found')
		})

		it('should emit checkpointRestored event', async () => {
			const withCheckpoint = await manager.addCheckpoint(task.id)
			const checkpointId = withCheckpoint.checkpoints[0].id

			const eventPromise = new Promise((resolve) => {
				manager.once('checkpointRestored', (task, checkpoint) =>
					resolve({ task, checkpoint })
				)
			})

			await manager.restoreCheckpoint(task.id, checkpointId)
			const { task: emittedTask, checkpoint } = await eventPromise

			expect(emittedTask.id).toBe(task.id)
			expect(checkpoint.id).toBe(checkpointId)
		})
	})

	describe('close', () => {
		it('should close manager and cleanup', async () => {
			manager.registerActiveTask('task-1', { test: 'object' })
			manager.registerActiveTask('task-2', { test: 'object' })

			await manager.close()

			expect(manager.initialized).toBe(false)
			expect(manager.activeTasks.size).toBe(0)
		})

		it('should emit closed event', async () => {
			const eventPromise = new Promise((resolve) => {
				manager.once('closed', resolve)
			})

			await manager.close()
			await eventPromise
		})
	})
})
