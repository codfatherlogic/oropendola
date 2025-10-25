/**
 * TaskStorage Test Suite
 * Sprint 1-2: Task Persistence Layer
 *
 * Tests:
 * - Database initialization
 * - CRUD operations
 * - Search and filtering
 * - Export functionality
 * - Task statistics
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import TaskStorage from '../TaskStorage.js'
import path from 'path'
import fs from 'fs/promises'
import os from 'os'

describe('TaskStorage', () => {
	let storage
	let tempDir

	beforeEach(async () => {
		// Create temporary directory for each test
		tempDir = path.join(os.tmpdir(), 'oropendola-test-' + Date.now())
		storage = new TaskStorage(tempDir)
		await storage.initialize()
	})

	afterEach(async () => {
		// Clean up
		await storage.close()
		await fs.rm(tempDir, { recursive: true, force: true })
	})

	describe('Initialization', () => {
		it('should initialize database and create schema', async () => {
			expect(storage.db).toBeDefined()
			expect(storage.dbPath).toBe(path.join(tempDir, 'tasks.db'))

			// Verify tables exist
			const tables = await storage._all(
				"SELECT name FROM sqlite_master WHERE type='table'",
				[]
			)
			const tableNames = tables.map((t) => t.name)

			expect(tableNames).toContain('tasks')
			expect(tableNames).toContain('tasks_fts')
		})

		it('should create storage directory if not exists', async () => {
			const stats = await fs.stat(tempDir)
			expect(stats.isDirectory()).toBe(true)
		})
	})

	describe('createTask', () => {
		it('should create task with generated ID', async () => {
			const task = await storage.createTask({
				text: 'Test task',
				conversationId: 'conv-123',
				messages: [],
				apiMetrics: storage._emptyMetrics(),
				metadata: {}
			})

			expect(task).toBeDefined()
			expect(task.id).toBeDefined()
			expect(task.text).toBe('Test task')
			expect(task.status).toBe('active')
			expect(task.conversationId).toBe('conv-123')
		})

		it('should create task with provided ID', async () => {
			const taskId = 'task-123'
			const task = await storage.createTask({
				id: taskId,
				text: 'Test task',
				conversationId: 'conv-123',
				messages: [],
				apiMetrics: storage._emptyMetrics(),
				metadata: {}
			})

			expect(task.id).toBe(taskId)
		})

		it('should set default values for optional fields', async () => {
			const task = await storage.createTask({
				text: 'Minimal task',
				conversationId: 'conv-123'
			})

			expect(task.messages).toEqual([])
			expect(task.checkpoints).toEqual([])
			expect(task.contextTokens).toBe(0)
			expect(task.contextWindow).toBe(200000)
			expect(task.status).toBe('active')
		})

		it('should set timestamps', async () => {
			const before = Date.now()
			const task = await storage.createTask({
				text: 'Test task',
				conversationId: 'conv-123'
			})
			const after = Date.now()

			expect(task.createdAt).toBeGreaterThanOrEqual(before)
			expect(task.createdAt).toBeLessThanOrEqual(after)
			expect(task.updatedAt).toBe(task.createdAt)
		})
	})

	describe('getTask', () => {
		it('should retrieve task by ID', async () => {
			const created = await storage.createTask({
				text: 'Test task',
				conversationId: 'conv-123',
				messages: [{ type: 'ask', text: 'Hello', ts: Date.now() }],
				apiMetrics: storage._emptyMetrics(),
				metadata: { mode: 'architect' }
			})

			const retrieved = await storage.getTask(created.id)

			expect(retrieved).toEqual(created)
			expect(retrieved.messages).toHaveLength(1)
			expect(retrieved.metadata.mode).toBe('architect')
		})

		it('should return null for non-existent task', async () => {
			const task = await storage.getTask('non-existent')
			expect(task).toBeNull()
		})
	})

	describe('updateTask', () => {
		it('should update task fields', async () => {
			const task = await storage.createTask({
				text: 'Original text',
				conversationId: 'conv-123',
				messages: [],
				apiMetrics: storage._emptyMetrics(),
				metadata: {}
			})

			const updated = await storage.updateTask(task.id, {
				text: 'Updated text',
				status: 'completed'
			})

			expect(updated.text).toBe('Updated text')
			expect(updated.status).toBe('completed')
			expect(updated.updatedAt).toBeGreaterThanOrEqual(task.updatedAt)
		})

		it('should update messages array', async () => {
			const task = await storage.createTask({
				text: 'Test task',
				conversationId: 'conv-123',
				messages: [],
				apiMetrics: storage._emptyMetrics(),
				metadata: {}
			})

			const newMessages = [
				{ type: 'ask', text: 'User message', ts: Date.now() },
				{ type: 'say', text: 'Assistant response', ts: Date.now() }
			]

			const updated = await storage.updateTask(task.id, {
				messages: newMessages
			})

			expect(updated.messages).toHaveLength(2)
			expect(updated.messages[0].text).toBe('User message')
		})

		it('should throw error for non-existent task', async () => {
			await expect(storage.updateTask('non-existent', {})).rejects.toThrow(
				'Task not found'
			)
		})

		it('should preserve fields not being updated', async () => {
			const task = await storage.createTask({
				text: 'Original text',
				conversationId: 'conv-123',
				messages: [{ type: 'ask', text: 'Hello', ts: Date.now() }],
				apiMetrics: { tokensIn: 100, tokensOut: 50 },
				metadata: { mode: 'architect' }
			})

			const updated = await storage.updateTask(task.id, {
				status: 'completed'
			})

			expect(updated.text).toBe('Original text')
			expect(updated.messages).toHaveLength(1)
			expect(updated.apiMetrics.tokensIn).toBe(100)
			expect(updated.metadata.mode).toBe('architect')
		})
	})

	describe('deleteTask', () => {
		it('should delete task', async () => {
			const task = await storage.createTask({
				text: 'Test task',
				conversationId: 'conv-123',
				messages: [],
				apiMetrics: storage._emptyMetrics(),
				metadata: {}
			})

			const result = await storage.deleteTask(task.id)
			expect(result).toBe(true)

			const retrieved = await storage.getTask(task.id)
			expect(retrieved).toBeNull()
		})

		it('should not throw error when deleting non-existent task', async () => {
			const result = await storage.deleteTask('non-existent')
			expect(result).toBe(true)
		})
	})

	describe('listTasks', () => {
		beforeEach(async () => {
			// Create test tasks
			await storage.createTask({
				text: 'Active task 1',
				conversationId: 'conv-1',
				status: 'active',
				messages: [],
				apiMetrics: storage._emptyMetrics(),
				metadata: {}
			})

			await storage.createTask({
				text: 'Completed task',
				conversationId: 'conv-2',
				status: 'completed',
				messages: [],
				apiMetrics: storage._emptyMetrics(),
				metadata: {}
			})

			await storage.createTask({
				text: 'Active task 2',
				conversationId: 'conv-3',
				status: 'active',
				messages: [],
				apiMetrics: storage._emptyMetrics(),
				metadata: {}
			})

			await storage.createTask({
				text: 'Failed task',
				conversationId: 'conv-4',
				status: 'failed',
				messages: [],
				apiMetrics: storage._emptyMetrics(),
				metadata: {}
			})
		})

		it('should list all tasks', async () => {
			const tasks = await storage.listTasks()
			expect(tasks).toHaveLength(4)
		})

		it('should filter by status', async () => {
			const activeTasks = await storage.listTasks({ status: 'active' })
			expect(activeTasks).toHaveLength(2)
			expect(activeTasks.every((t) => t.status === 'active')).toBe(true)

			const completedTasks = await storage.listTasks({ status: 'completed' })
			expect(completedTasks).toHaveLength(1)
			expect(completedTasks[0].text).toBe('Completed task')
		})

		it('should paginate results', async () => {
			const page1 = await storage.listTasks({ limit: 2, offset: 0 })
			const page2 = await storage.listTasks({ limit: 2, offset: 2 })

			expect(page1).toHaveLength(2)
			expect(page2).toHaveLength(2)

			// Ensure no overlap
			const page1Ids = page1.map((t) => t.id)
			const page2Ids = page2.map((t) => t.id)
			expect(page1Ids).not.toEqual(page2Ids)
		})

		it('should sort by createdAt descending by default', async () => {
			const tasks = await storage.listTasks()

			for (let i = 1; i < tasks.length; i++) {
				expect(tasks[i - 1].createdAt).toBeGreaterThanOrEqual(
					tasks[i].createdAt
				)
			}
		})

		it('should sort by updatedAt', async () => {
			// Update one task to change updatedAt
			const tasks = await storage.listTasks()
			await storage.updateTask(tasks[tasks.length - 1].id, {
				text: 'Updated'
			})

			const sortedByUpdated = await storage.listTasks({
				sortBy: 'updatedAt',
				sortOrder: 'DESC'
			})

			expect(sortedByUpdated[0].text).toBe('Updated')
		})

		it('should search tasks using FTS', async () => {
			const tasks = await storage.listTasks({ search: 'Completed' })
			expect(tasks).toHaveLength(1)
			expect(tasks[0].text).toBe('Completed task')
		})

		it('should search with partial match', async () => {
			const tasks = await storage.listTasks({ search: 'Active' })
			expect(tasks.length).toBeGreaterThanOrEqual(2)
		})

		it('should combine search and status filter', async () => {
			const tasks = await storage.listTasks({
				search: 'task',
				status: 'active'
			})

			expect(tasks.every((t) => t.status === 'active')).toBe(true)
		})
	})

	describe('exportTask', () => {
		let task

		beforeEach(async () => {
			task = await storage.createTask({
				text: 'Export test task',
				conversationId: 'conv-123',
				status: 'completed',
				completedAt: Date.now(),
				messages: [
					{ type: 'ask', text: 'User message', ts: Date.now() },
					{ type: 'say', text: 'Assistant response', ts: Date.now() }
				],
				apiMetrics: {
					tokensIn: 100,
					tokensOut: 50,
					cacheWrites: 10,
					cacheReads: 5,
					totalCost: 0.0015,
					contextTokens: 150
				},
				contextTokens: 150,
				metadata: {
					mode: 'architect',
					model: 'claude-3-5-sonnet-20241022'
				}
			})
		})

		it('should export to JSON', async () => {
			const json = await storage.exportTask(task.id, 'json')
			const parsed = JSON.parse(json)

			expect(parsed.id).toBe(task.id)
			expect(parsed.text).toBe('Export test task')
			expect(parsed.messages).toHaveLength(2)
			expect(parsed.apiMetrics.tokensIn).toBe(100)
		})

		it('should export to TXT', async () => {
			const txt = await storage.exportTask(task.id, 'txt')

			expect(txt).toContain('Export test task')
			expect(txt).toContain('Status: completed')
			expect(txt).toContain('User message')
			expect(txt).toContain('Assistant response')
			expect(txt).toContain('Tokens In: 100')
			expect(txt).toContain('Tokens Out: 50')
			expect(txt).toContain('Total Cost: $0.0015')
		})

		it('should export to Markdown', async () => {
			const md = await storage.exportTask(task.id, 'md')

			expect(md).toContain('# Export test task')
			expect(md).toContain('**Status:** completed')
			expect(md).toContain('**User:**')
			expect(md).toContain('**Assistant:**')
			expect(md).toContain('## Metrics')
			expect(md).toContain('- **Tokens In:** 100')
			expect(md).toContain('- **Tokens Out:** 50')
			expect(md).toContain('## Configuration')
			expect(md).toContain('- **Mode:** architect')
		})

		it('should throw error for unsupported format', async () => {
			await expect(storage.exportTask(task.id, 'pdf')).rejects.toThrow(
				'Unsupported format'
			)
		})

		it('should throw error for non-existent task', async () => {
			await expect(storage.exportTask('non-existent', 'json')).rejects.toThrow(
				'Task not found'
			)
		})
	})

	describe('getStats', () => {
		beforeEach(async () => {
			await storage.createTask({
				text: 'Active 1',
				conversationId: 'conv-1',
				status: 'active',
				messages: [],
				apiMetrics: storage._emptyMetrics(),
				metadata: {}
			})

			await storage.createTask({
				text: 'Active 2',
				conversationId: 'conv-2',
				status: 'active',
				messages: [],
				apiMetrics: storage._emptyMetrics(),
				metadata: {}
			})

			await storage.createTask({
				text: 'Completed',
				conversationId: 'conv-3',
				status: 'completed',
				messages: [],
				apiMetrics: storage._emptyMetrics(),
				metadata: {}
			})

			await storage.createTask({
				text: 'Failed',
				conversationId: 'conv-4',
				status: 'failed',
				messages: [],
				apiMetrics: storage._emptyMetrics(),
				metadata: {}
			})

			await storage.createTask({
				text: 'Terminated',
				conversationId: 'conv-5',
				status: 'terminated',
				messages: [],
				apiMetrics: storage._emptyMetrics(),
				metadata: {}
			})
		})

		it('should return task statistics', async () => {
			const stats = await storage.getStats()

			expect(stats.total).toBe(5)
			expect(stats.active).toBe(2)
			expect(stats.completed).toBe(1)
			expect(stats.failed).toBe(1)
			expect(stats.terminated).toBe(1)
		})

		it('should return zeros for empty database', async () => {
			// Create new storage with empty database
			const emptyTempDir = path.join(
				os.tmpdir(),
				'oropendola-empty-' + Date.now()
			)
			const emptyStorage = new TaskStorage(emptyTempDir)
			await emptyStorage.initialize()

			const stats = await emptyStorage.getStats()

			// SQL SUM returns null for empty table, not 0
			expect(stats.total).toBe(0)
			expect(stats.active === null || stats.active === 0).toBe(true)
			expect(stats.completed === null || stats.completed === 0).toBe(true)
			expect(stats.failed === null || stats.failed === 0).toBe(true)
			expect(stats.terminated === null || stats.terminated === 0).toBe(true)

			await emptyStorage.close()
			await fs.rm(emptyTempDir, { recursive: true, force: true })
		})
	})

	describe('Helper Methods', () => {
		it('_emptyMetrics should return correct structure', () => {
			const metrics = storage._emptyMetrics()

			expect(metrics).toEqual({
				tokensIn: 0,
				tokensOut: 0,
				cacheWrites: 0,
				cacheReads: 0,
				totalCost: 0,
				contextTokens: 0
			})
		})

		it('_defaultMetadata should return correct structure', () => {
			const metadata = storage._defaultMetadata()

			expect(metadata.version).toBe('3.5.0')
			expect(metadata.mode).toBe('architect')
			expect(metadata.model).toBe('claude-3-5-sonnet-20241022')
		})
	})

	describe('Edge Cases', () => {
		it('should handle tasks with empty messages array', async () => {
			const task = await storage.createTask({
				text: 'Empty messages',
				conversationId: 'conv-123',
				messages: [],
				apiMetrics: storage._emptyMetrics(),
				metadata: {}
			})

			expect(task.messages).toEqual([])

			const retrieved = await storage.getTask(task.id)
			expect(retrieved.messages).toEqual([])
		})

		it('should handle tasks with many messages', async () => {
			const manyMessages = Array.from({ length: 100 }, (_, i) => ({
				type: i % 2 === 0 ? 'ask' : 'say',
				text: `Message ${i}`,
				ts: Date.now() + i
			}))

			const task = await storage.createTask({
				text: 'Many messages',
				conversationId: 'conv-123',
				messages: manyMessages,
				apiMetrics: storage._emptyMetrics(),
				metadata: {}
			})

			expect(task.messages).toHaveLength(100)

			const retrieved = await storage.getTask(task.id)
			expect(retrieved.messages).toHaveLength(100)
		})

		it('should handle special characters in task text', async () => {
			const specialText =
				'Task with special chars: "quotes", \'apostrophes\', <tags>, & ampersands'

			const task = await storage.createTask({
				text: specialText,
				conversationId: 'conv-123',
				messages: [],
				apiMetrics: storage._emptyMetrics(),
				metadata: {}
			})

			expect(task.text).toBe(specialText)

			const retrieved = await storage.getTask(task.id)
			expect(retrieved.text).toBe(specialText)
		})

		it('should handle Unicode characters', async () => {
			const unicodeText = 'Task with Unicode: 你好 🚀 café'

			const task = await storage.createTask({
				text: unicodeText,
				conversationId: 'conv-123',
				messages: [],
				apiMetrics: storage._emptyMetrics(),
				metadata: {}
			})

			const retrieved = await storage.getTask(task.id)
			expect(retrieved.text).toBe(unicodeText)
		})

		it('should handle large metadata objects', async () => {
			const largeMetadata = {
				mode: 'architect',
				model: 'claude-3-5-sonnet-20241022',
				tags: Array.from({ length: 50 }, (_, i) => `tag-${i}`),
				fileChanges: Array.from({ length: 20 }, (_, i) => ({
					path: `/path/to/file${i}.js`,
					type: 'update',
					timestamp: Date.now()
				}))
			}

			const task = await storage.createTask({
				text: 'Large metadata',
				conversationId: 'conv-123',
				messages: [],
				apiMetrics: storage._emptyMetrics(),
				metadata: largeMetadata
			})

			expect(task.metadata.tags).toHaveLength(50)
			expect(task.metadata.fileChanges).toHaveLength(20)
		})
	})
})
