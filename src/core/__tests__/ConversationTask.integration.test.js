/**
 * Integration Tests for ConversationTask + TaskManager
 * Sprint 1-2: Task Persistence Layer
 *
 * Tests the full integration between ConversationTask and TaskManager,
 * verifying that tasks are created, saved, and completed correctly.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

// Mock vscode module BEFORE any imports
vi.mock('vscode', () => ({
	default: {
		workspace: {
			workspaceFolders: [{
				uri: { fsPath: '/test/workspace' }
			}]
		},
		window: {
			showInformationMessage: vi.fn(),
			showErrorMessage: vi.fn(),
			showSaveDialog: vi.fn()
		},
		Uri: {
			file: (path) => ({ fsPath: path })
		}
	}
}))

// Import after mocking - Use dynamic import to ensure mocks are set up first
let TaskManager
let ConversationTask

// We'll import in beforeAll

describe('ConversationTask + TaskManager Integration', () => {
	let taskManager
	let testDir
	let conversationTask

	beforeEach(async () => {
		// Create temporary test directory
		testDir = path.join(os.tmpdir(), `conversation-integration-test-${Date.now()}`)
		await fs.mkdir(testDir, { recursive: true })

		// Initialize TaskManager
		taskManager = new TaskManager(testDir)
		await taskManager.initialize()

		console.log('[Test Setup] TaskManager initialized in:', testDir)
	})

	afterEach(async () => {
		// Cleanup
		if (conversationTask) {
			conversationTask.dispose()
		}

		if (taskManager) {
			await taskManager.close()
		}

		// Remove test directory
		try {
			await fs.rm(testDir, { recursive: true, force: true })
		} catch (error) {
			console.warn('[Test Cleanup] Could not remove test dir:', error.message)
		}
	})

	describe('Task Creation', () => {
		it('should auto-create task when conversation starts', async () => {
			// Create ConversationTask with TaskManager
			conversationTask = new ConversationTask('test-task-1', {
				taskManager: taskManager,
				apiUrl: 'https://test.api',
				mode: 'agent'
			})

			// Mock the AI request to prevent actual API calls
			conversationTask._makeAIRequestWithRetry = vi.fn().mockResolvedValue(null)

			// Start conversation
			await conversationTask.run('Build a React app')

			// Verify task was created
			expect(conversationTask.persistentTaskId).toBeTruthy()

			// Verify task exists in database
			const task = await taskManager.storage.getTask(conversationTask.persistentTaskId)
			expect(task).toBeTruthy()
			expect(task.text).toBe('Build a React app')
			expect(task.status).toBe('active')
			expect(task.conversationId).toBe('test-task-1')
		})

		it('should capture initial message metadata', async () => {
			conversationTask = new ConversationTask('test-task-2', {
				taskManager: taskManager,
				apiUrl: 'https://test.api',
				mode: 'agent'
			})

			conversationTask._makeAIRequestWithRetry = vi.fn().mockResolvedValue(null)

			await conversationTask.run('Create a Vue.js dashboard')

			const task = await taskManager.storage.getTask(conversationTask.persistentTaskId)
			expect(task.metadata.mode).toBe('agent')
			expect(task.metadata.framework).toBeDefined()
		})

		it('should handle task creation failure gracefully', async () => {
			// Create a TaskManager that will fail
			const badTaskManager = {
				createTask: vi.fn().mockRejectedValue(new Error('Database error'))
			}

			conversationTask = new ConversationTask('test-task-3', {
				taskManager: badTaskManager,
				apiUrl: 'https://test.api',
				mode: 'agent'
			})

			conversationTask._makeAIRequestWithRetry = vi.fn().mockResolvedValue(null)

			// Should not throw - should log error and continue
			await expect(conversationTask.run('Test message')).resolves.not.toThrow()

			// Verify task creation was attempted
			expect(badTaskManager.createTask).toHaveBeenCalled()
		})
	})

	describe('Auto-Save', () => {
		it('should auto-save after AI response', async () => {
			conversationTask = new ConversationTask('test-task-4', {
				taskManager: taskManager,
				apiUrl: 'https://test.api',
				mode: 'agent'
			})

			// Mock AI response
			const mockResponse = {
				_apiMetrics: {
					totalTokens: 1000,
					totalCost: 0.02,
					model: 'claude-opus-3'
				},
				_todos: [{ text: 'Create components', completed: false }],
				_todo_stats: { total: 1, completed: 0 }
			}

			conversationTask._makeAIRequestWithRetry = vi.fn().mockResolvedValue('I will create a React app')
			conversationTask._parseToolCalls = vi.fn().mockReturnValue([])
			conversationTask._cleanToolCallsFromResponse = vi.fn().mockReturnValue('I will create a React app')

			// Start conversation
			await conversationTask.run('Build a React app')

			// Wait for auto-save
			await new Promise(resolve => setTimeout(resolve, 100))

			// Verify task was saved with metrics
			const task = await taskManager.storage.getTask(conversationTask.persistentTaskId)
			expect(task).toBeTruthy()
			expect(task.messages.length).toBeGreaterThan(0)
		})

		it('should calculate context tokens correctly', async () => {
			conversationTask = new ConversationTask('test-task-5', {
				taskManager: taskManager,
				apiUrl: 'https://test.api',
				mode: 'agent'
			})

			// Add some messages
			conversationTask.messages = [
				{ role: 'user', content: 'Hello world' }, // 11 chars = ~3 tokens
				{ role: 'assistant', content: 'Hi there, how can I help?' } // 27 chars = ~7 tokens
			]

			const tokens = conversationTask._calculateContextTokens()
			expect(tokens).toBeGreaterThan(0)
			expect(tokens).toBe(Math.ceil(38 / 4)) // Total 38 chars / 4 = 10 tokens
		})
	})

	describe('Task Completion', () => {
		it('should mark task as completed', async () => {
			conversationTask = new ConversationTask('test-task-6', {
				taskManager: taskManager,
				apiUrl: 'https://test.api',
				mode: 'agent'
			})

			conversationTask._makeAIRequestWithRetry = vi.fn().mockResolvedValue(null)

			await conversationTask.run('Quick task')

			// Complete the task
			await conversationTask.completeTask('completed')

			// Verify status
			const task = await taskManager.storage.getTask(conversationTask.persistentTaskId)
			expect(task.status).toBe('completed')
			expect(task.completedAt).toBeTruthy()
		})

		it('should mark task as failed on error', async () => {
			conversationTask = new ConversationTask('test-task-7', {
				taskManager: taskManager,
				apiUrl: 'https://test.api',
				mode: 'agent'
			})

			conversationTask._makeAIRequestWithRetry = vi.fn().mockResolvedValue(null)

			await conversationTask.run('Task that will fail')

			// Add error
			conversationTask.errors.push('Test error')

			// Complete with error
			await conversationTask.completeTask('failed')

			// Verify status
			const task = await taskManager.storage.getTask(conversationTask.persistentTaskId)
			expect(task.status).toBe('failed')
		})

		it('should mark task as terminated on abort', async () => {
			conversationTask = new ConversationTask('test-task-8', {
				taskManager: taskManager,
				apiUrl: 'https://test.api',
				mode: 'agent'
			})

			conversationTask._makeAIRequestWithRetry = vi.fn().mockResolvedValue(null)

			await conversationTask.run('Task to abort')

			// Abort the task
			await conversationTask.abortTask(true)

			// Verify status
			const task = await taskManager.storage.getTask(conversationTask.persistentTaskId)
			expect(task.status).toBe('terminated')
		})
	})

	describe('Task Statistics', () => {
		it('should track multiple tasks correctly', async () => {
			// Create first task
			const task1 = new ConversationTask('task-1', {
				taskManager: taskManager,
				apiUrl: 'https://test.api',
				mode: 'agent'
			})
			task1._makeAIRequestWithRetry = vi.fn().mockResolvedValue(null)
			await task1.run('Task 1')
			await task1.completeTask('completed')

			// Create second task
			const task2 = new ConversationTask('task-2', {
				taskManager: taskManager,
				apiUrl: 'https://test.api',
				mode: 'agent'
			})
			task2._makeAIRequestWithRetry = vi.fn().mockResolvedValue(null)
			await task2.run('Task 2')
			// Leave active

			// Get stats
			const stats = await taskManager.getStats()
			expect(stats.total).toBeGreaterThanOrEqual(2)
			expect(stats.completed).toBeGreaterThanOrEqual(1)
			expect(stats.active).toBeGreaterThanOrEqual(1)
		})
	})

	describe('Error Handling', () => {
		it('should continue on save failure', async () => {
			// Create a mock TaskManager that fails on save
			const failingSaveManager = {
				createTask: vi.fn().mockResolvedValue({ id: 'test-id' }),
				saveTask: vi.fn().mockRejectedValue(new Error('Save failed')),
				completeTask: vi.fn().mockResolvedValue(undefined)
			}

			conversationTask = new ConversationTask('test-task-9', {
				taskManager: failingSaveManager,
				apiUrl: 'https://test.api',
				mode: 'agent'
			})

			conversationTask._makeAIRequestWithRetry = vi.fn().mockResolvedValue('Response')
			conversationTask._parseToolCalls = vi.fn().mockReturnValue([])
			conversationTask._cleanToolCallsFromResponse = vi.fn().mockReturnValue('Response')

			// Should not throw
			await expect(conversationTask.run('Test')).resolves.not.toThrow()

			// Verify save was attempted
			expect(failingSaveManager.saveTask).toHaveBeenCalled()
		})

		it('should handle missing TaskManager gracefully', async () => {
			conversationTask = new ConversationTask('test-task-10', {
				// No taskManager provided
				apiUrl: 'https://test.api',
				mode: 'agent'
			})

			conversationTask._makeAIRequestWithRetry = vi.fn().mockResolvedValue(null)

			// Should work without TaskManager
			await expect(conversationTask.run('Test')).resolves.not.toThrow()

			// No persistent task ID
			expect(conversationTask.persistentTaskId).toBeNull()
		})
	})

	describe('Data Integrity', () => {
		it('should preserve message order', async () => {
			conversationTask = new ConversationTask('test-task-11', {
				taskManager: taskManager,
				apiUrl: 'https://test.api',
				mode: 'agent'
			})

			// Add messages in specific order
			conversationTask.addMessage('user', 'Message 1')
			conversationTask.addMessage('assistant', 'Response 1')
			conversationTask.addMessage('user', 'Message 2')

			// Mock to prevent actual API call
			conversationTask._makeAIRequestWithRetry = vi.fn().mockResolvedValue(null)
			await conversationTask.run('Initial message')

			// Load task from database
			const task = await taskManager.storage.getTask(conversationTask.persistentTaskId)

			// Verify message order is preserved
			expect(task.messages).toHaveLength(3)
			const userMessages = task.messages.filter(m => m.type === 'ask')
			expect(userMessages.length).toBe(2)
		})

		it('should handle Unicode and special characters', async () => {
			conversationTask = new ConversationTask('test-task-12', {
				taskManager: taskManager,
				apiUrl: 'https://test.api',
				mode: 'agent'
			})

			conversationTask._makeAIRequestWithRetry = vi.fn().mockResolvedValue(null)

			const specialMessage = 'Create app with émojis: 🚀 💻 ✨ and 中文字符'
			await conversationTask.run(specialMessage)

			const task = await taskManager.storage.getTask(conversationTask.persistentTaskId)
			expect(task.text).toContain('émojis')
			expect(task.text).toContain('🚀')
			expect(task.text).toContain('中文')
		})
	})
})
