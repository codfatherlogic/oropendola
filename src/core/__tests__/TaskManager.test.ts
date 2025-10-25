/**
 * TaskManager Unit Tests
 * Sprint 1-2: Task Persistence Layer - Week 3-4
 *
 * Tests high-level task orchestration including:
 * - Task lifecycle management
 * - Event system
 * - Message handling
 * - State transitions
 * - Current task tracking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TaskManager } from '../TaskManager'
import type { Task, TaskStatus, ClineMessage } from '../../types/task'
import fs from 'fs'
import path from 'path'
import os from 'os'

// Mock VS Code context
const createMockContext = (storagePath: string) => ({
  subscriptions: [],
  globalStorageUri: {
    fsPath: storagePath,
    scheme: 'file',
    authority: '',
    path: storagePath,
    query: '',
    fragment: '',
    with: vi.fn(),
    toJSON: vi.fn()
  },
  workspaceState: {
    get: vi.fn(),
    update: vi.fn()
  },
  globalState: {
    get: vi.fn(),
    update: vi.fn(),
    setKeysForSync: vi.fn()
  },
  extensionPath: '',
  extensionUri: {} as any,
  environmentVariableCollection: {} as any,
  extensionMode: 3,
  storageUri: undefined,
  logUri: {} as any,
  storagePath: undefined,
  globalStoragePath: storagePath,
  logPath: '',
  asAbsolutePath: vi.fn(),
  secrets: {} as any,
  extension: {} as any
})

describe('TaskManager', () => {
  let manager: TaskManager
  let testDir: string
  let mockContext: any

  beforeEach(async () => {
    // Create temporary test directory
    testDir = path.join(os.tmpdir(), 'taskmanager-test-' + Date.now())
    fs.mkdirSync(testDir, { recursive: true })

    mockContext = createMockContext(testDir)
    manager = new TaskManager(mockContext)
    await manager.initialize()
  })

  afterEach(async () => {
    // Clean up
    if (manager) {
      await manager.close()
    }

    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true })
    }
  })

  describe('initialization', () => {
    it('should initialize without errors', async () => {
      expect(manager).toBeDefined()
    })

    it('should restore active task on initialization', async () => {
      // Create an active task
      const task = await manager.createTask('Active task')

      // Create new manager instance (simulating restart)
      const manager2 = new TaskManager(mockContext)
      await manager2.initialize()

      const currentTask = manager2.getCurrentTask()
      expect(currentTask).not.toBeNull()
      expect(currentTask?.id).toBe(task.id)

      await manager2.close()
    })

    it('should not have current task if no active tasks exist', async () => {
      const currentTask = manager.getCurrentTask()
      expect(currentTask).toBeNull()
    })
  })

  describe('createTask', () => {
    it('should create task with default name', async () => {
      const task = await manager.createTask()

      expect(task).toBeDefined()
      expect(task.id).toBeDefined()
      expect(task.text).toContain('Task')
      expect(task.status).toBe('active')
    })

    it('should create task with custom name', async () => {
      const task = await manager.createTask('Custom task name')

      expect(task.text).toBe('Custom task name')
    })

    it('should create task with mode', async () => {
      const task = await manager.createTask('Test', 'architect')

      expect(task.metadata?.mode).toBe('architect')
    })

    it('should set task as current task', async () => {
      const task = await manager.createTask('Test')
      const currentTask = manager.getCurrentTask()

      expect(currentTask).not.toBeNull()
      expect(currentTask?.id).toBe(task.id)
    })

    it('should emit taskCreated event', async () => {
      const spy = vi.fn()
      manager.on('taskCreated', spy)

      const task = await manager.createTask('Test')

      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy).toHaveBeenCalledWith(task)
    })
  })

  describe('getTask', () => {
    it('should retrieve existing task', async () => {
      const created = await manager.createTask('Test task')
      const retrieved = await manager.getTask(created.id)

      expect(retrieved).not.toBeNull()
      expect(retrieved?.id).toBe(created.id)
      expect(retrieved?.text).toBe('Test task')
    })

    it('should return null for non-existent task', async () => {
      const task = await manager.getTask('non-existent-id')
      expect(task).toBeNull()
    })
  })

  describe('updateTask', () => {
    it('should update task', async () => {
      const task = await manager.createTask('Original')
      const updated = await manager.updateTask(task.id, {
        text: 'Updated'
      })

      expect(updated.text).toBe('Updated')
    })

    it('should emit taskUpdated event', async () => {
      const task = await manager.createTask('Test')
      const spy = vi.fn()
      manager.on('taskUpdated', spy)

      await manager.updateTask(task.id, { text: 'Updated' })

      expect(spy).toHaveBeenCalledTimes(1)
    })

    it('should update current task if it is the one being modified', async () => {
      const task = await manager.createTask('Test')

      await manager.updateTask(task.id, { text: 'Updated' })

      const currentTask = manager.getCurrentTask()
      expect(currentTask?.text).toBe('Updated')
    })
  })

  describe('deleteTask', () => {
    it('should delete task', async () => {
      const task = await manager.createTask('To delete')

      const deleted = await manager.deleteTask(task.id)
      expect(deleted).toBe(true)

      const retrieved = await manager.getTask(task.id)
      expect(retrieved).toBeNull()
    })

    it('should emit taskDeleted event', async () => {
      const task = await manager.createTask('Test')
      const spy = vi.fn()
      manager.on('taskDeleted', spy)

      await manager.deleteTask(task.id)

      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy).toHaveBeenCalledWith(task.id)
    })

    it('should clear current task if it is deleted', async () => {
      const task = await manager.createTask('Test')

      expect(manager.getCurrentTask()).not.toBeNull()

      await manager.deleteTask(task.id)

      expect(manager.getCurrentTask()).toBeNull()
    })

    it('should not clear current task if different task is deleted', async () => {
      const task1 = await manager.createTask('Task 1')
      const task2 = await manager.createTask('Task 2')

      // task2 is current task
      expect(manager.getCurrentTask()?.id).toBe(task2.id)

      await manager.deleteTask(task1.id)

      // Should still have task2 as current
      expect(manager.getCurrentTask()?.id).toBe(task2.id)
    })
  })

  describe('listTasks', () => {
    beforeEach(async () => {
      await manager.createTask('Task 1')
      await manager.createTask('Task 2')
      await manager.createTask('Task 3')
    })

    it('should list all tasks', async () => {
      const tasks = await manager.listTasks()
      expect(tasks).toHaveLength(3)
    })

    it('should filter by status', async () => {
      const task = await manager.createTask('Completed task')
      await manager.setStatus(task.id, 'completed')

      const completedTasks = await manager.listTasks({ status: 'completed' })
      expect(completedTasks).toHaveLength(1)
      expect(completedTasks[0].status).toBe('completed')
    })

    it('should search tasks', async () => {
      const tasks = await manager.listTasks({ search: 'Task 1' })
      expect(tasks).toHaveLength(1)
      expect(tasks[0].text).toBe('Task 1')
    })
  })

  describe('setStatus', () => {
    it('should change task status from active to completed', async () => {
      const task = await manager.createTask('Test')
      expect(task.status).toBe('active')

      const updated = await manager.setStatus(task.id, 'completed')
      expect(updated.status).toBe('completed')
    })

    it('should set completedAt timestamp for terminal states', async () => {
      const task = await manager.createTask('Test')
      expect(task.completedAt).toBeUndefined()

      const updated = await manager.setStatus(task.id, 'completed')
      expect(updated.completedAt).toBeDefined()
      expect(updated.completedAt).toBeGreaterThan(0)
    })

    it('should set completedAt for all terminal states', async () => {
      const terminalStates: TaskStatus[] = ['completed', 'failed', 'terminated']

      for (const status of terminalStates) {
        const task = await manager.createTask(`Test ${status}`)
        const updated = await manager.setStatus(task.id, status)

        expect(updated.completedAt).toBeDefined()
        expect(updated.completedAt).toBeGreaterThan(0)
      }
    })

    it('should emit taskCompleted event', async () => {
      const task = await manager.createTask('Test')
      const spy = vi.fn()
      manager.on('taskCompleted', spy)

      await manager.setStatus(task.id, 'completed')

      expect(spy).toHaveBeenCalledTimes(1)
    })

    it('should emit taskTerminated event', async () => {
      const task = await manager.createTask('Test')
      const spy = vi.fn()
      manager.on('taskTerminated', spy)

      await manager.setStatus(task.id, 'terminated')

      expect(spy).toHaveBeenCalledTimes(1)
    })

    it('should update current task status', async () => {
      const task = await manager.createTask('Test')

      await manager.setStatus(task.id, 'completed')

      const currentTask = manager.getCurrentTask()
      expect(currentTask?.status).toBe('completed')
    })
  })

  describe('addMessage', () => {
    it('should add message to task', async () => {
      const task = await manager.createTask('Test')

      const message: ClineMessage = {
        type: 'ask',
        ask: 'user',
        text: 'Hello',
        ts: Date.now()
      }

      const updated = await manager.addMessage(task.id, message)

      expect(updated.messages).toHaveLength(1)
      expect(updated.messages[0].text).toBe('Hello')
    })

    it('should update API metrics from message', async () => {
      const task = await manager.createTask('Test')

      const message: ClineMessage = {
        type: 'say',
        say: 'assistant',
        text: 'Response',
        ts: Date.now(),
        apiMetrics: {
          tokensIn: 100,
          tokensOut: 50,
          cacheWrites: 0,
          cacheReads: 0,
          cost: 0.01
        }
      }

      const updated = await manager.addMessage(task.id, message)

      expect(updated.apiMetrics.tokensIn).toBe(100)
      expect(updated.apiMetrics.tokensOut).toBe(50)
      expect(updated.apiMetrics.totalCost).toBe(0.01)
    })

    it('should accumulate metrics across multiple messages', async () => {
      const task = await manager.createTask('Test')

      const message1: ClineMessage = {
        type: 'say',
        say: 'assistant',
        text: 'Response 1',
        ts: Date.now(),
        apiMetrics: {
          tokensIn: 100,
          tokensOut: 50,
          cacheWrites: 0,
          cacheReads: 0,
          cost: 0.01
        }
      }

      const message2: ClineMessage = {
        type: 'say',
        say: 'assistant',
        text: 'Response 2',
        ts: Date.now(),
        apiMetrics: {
          tokensIn: 200,
          tokensOut: 100,
          cacheWrites: 0,
          cacheReads: 0,
          cost: 0.02
        }
      }

      await manager.addMessage(task.id, message1)
      const updated = await manager.addMessage(task.id, message2)

      expect(updated.apiMetrics.tokensIn).toBe(300)
      expect(updated.apiMetrics.tokensOut).toBe(150)
      expect(updated.apiMetrics.totalCost).toBe(0.03)
    })
  })

  describe('exportTask', () => {
    it('should export task as JSON', async () => {
      const task = await manager.createTask('Export test')

      const exported = await manager.exportTask(task.id, 'json')

      expect(exported).toBeDefined()
      const parsed = JSON.parse(exported)
      expect(parsed.id).toBe(task.id)
    })

    it('should export task as TXT', async () => {
      const task = await manager.createTask('Export test')

      const exported = await manager.exportTask(task.id, 'txt')

      expect(exported).toBeDefined()
      expect(typeof exported).toBe('string')
      expect(exported).toContain('Export test')
    })

    it('should export task as Markdown', async () => {
      const task = await manager.createTask('Export test')

      const exported = await manager.exportTask(task.id, 'md')

      expect(exported).toBeDefined()
      expect(typeof exported).toBe('string')
    })
  })

  describe('getStats', () => {
    it('should return task statistics', async () => {
      await manager.createTask('Active 1')
      await manager.createTask('Active 2')
      const task = await manager.createTask('Completed')
      await manager.setStatus(task.id, 'completed')

      const stats = await manager.getStats()

      expect(stats.total).toBe(3)
      expect(stats.active).toBe(2)
      expect(stats.completed).toBe(1)
    })
  })

  describe('event system', () => {
    it('should register event listeners', () => {
      const spy = vi.fn()
      manager.on('taskCreated', spy)

      // Event listener should be registered (no error)
      expect(() => manager.on('taskCreated', spy)).not.toThrow()
    })

    it('should call multiple listeners for same event', async () => {
      const spy1 = vi.fn()
      const spy2 = vi.fn()

      manager.on('taskCreated', spy1)
      manager.on('taskCreated', spy2)

      await manager.createTask('Test')

      expect(spy1).toHaveBeenCalledTimes(1)
      expect(spy2).toHaveBeenCalledTimes(1)
    })

    it('should emit taskLoaded event on initialization', async () => {
      const task = await manager.createTask('Test')

      const spy = vi.fn()
      const manager2 = new TaskManager(mockContext)

      manager2.on('taskLoaded', spy)
      await manager2.initialize()

      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: task.id }))

      await manager2.close()
    })
  })

  describe('getCurrentTask', () => {
    it('should return null when no current task', () => {
      expect(manager.getCurrentTask()).toBeNull()
    })

    it('should return current task after creation', async () => {
      const task = await manager.createTask('Test')
      const current = manager.getCurrentTask()

      expect(current).not.toBeNull()
      expect(current?.id).toBe(task.id)
    })

    it('should update when new task is created', async () => {
      const task1 = await manager.createTask('Task 1')
      expect(manager.getCurrentTask()?.id).toBe(task1.id)

      const task2 = await manager.createTask('Task 2')
      expect(manager.getCurrentTask()?.id).toBe(task2.id)
    })

    it('should update when task is modified', async () => {
      const task = await manager.createTask('Original')

      await manager.updateTask(task.id, { text: 'Updated' })

      expect(manager.getCurrentTask()?.text).toBe('Updated')
    })
  })

  describe('edge cases', () => {
    it('should handle rapid task creation', async () => {
      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(manager.createTask(`Task ${i}`))
      }

      const tasks = await Promise.all(promises)
      expect(tasks).toHaveLength(10)

      const allTasks = await manager.listTasks()
      expect(allTasks).toHaveLength(10)
    })

    it('should handle empty message addition', async () => {
      const task = await manager.createTask('Test')

      const message: ClineMessage = {
        type: 'ask',
        ask: 'user',
        text: '',
        ts: Date.now()
      }

      const updated = await manager.addMessage(task.id, message)
      expect(updated.messages).toHaveLength(1)
    })

    it('should handle task with no metadata', async () => {
      const task = await manager.createTask()

      expect(task.metadata).toBeDefined()
      expect(task.metadata?.version).toBe('3.6.0')
    })
  })
})
