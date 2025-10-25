/**
 * TaskStorage Unit Tests
 * Sprint 1-2: Task Persistence Layer - Week 3-4
 *
 * Tests SQLite-based task persistence with CRUD operations,
 * full-text search, filtering, and export functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TaskStorage } from '../TaskStorage'
import type { Task, TaskStatus, ClineMessage } from '../../types/task'
import fs from 'fs'
import path from 'path'
import os from 'os'

describe('TaskStorage', () => {
  let storage: TaskStorage
  let testDbPath: string

  beforeEach(async () => {
    // Create temporary test database
    const tempDir = path.join(os.tmpdir(), 'oropendola-test-' + Date.now())
    fs.mkdirSync(tempDir, { recursive: true })
    testDbPath = path.join(tempDir, 'tasks.db')

    storage = new TaskStorage(tempDir)
    await storage.initialize()
  })

  afterEach(async () => {
    // Clean up test database
    await storage.close()

    const tempDir = path.dirname(testDbPath)
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  describe('initialization', () => {
    it('should create database file on initialization', async () => {
      expect(fs.existsSync(testDbPath)).toBe(true)
    })

    it('should create tasks table', async () => {
      const task = await storage.createTask({ text: 'Test task' })
      expect(task).toBeDefined()
      expect(task.id).toBeDefined()
    })

    it('should create FTS table for search', async () => {
      const task1 = await storage.createTask({ text: 'Find me with search' })
      const task2 = await storage.createTask({ text: 'Another task' })

      const results = await storage.listTasks({ search: 'search' })
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe(task1.id)
    })
  })

  describe('createTask', () => {
    it('should create task with minimal data', async () => {
      const task = await storage.createTask({})

      expect(task.id).toBeDefined()
      expect(task.createdAt).toBeGreaterThan(0)
      expect(task.updatedAt).toBeGreaterThan(0)
      expect(task.status).toBe('active')
      expect(task.messages).toEqual([])
    })

    it('should create task with full data', async () => {
      const taskData = {
        text: 'Full task',
        status: 'completed' as TaskStatus,
        messages: [
          {
            type: 'ask' as const,
            ask: 'user',
            text: 'Hello',
            ts: Date.now()
          } as ClineMessage
        ]
      }

      const task = await storage.createTask(taskData)

      expect(task.text).toBe('Full task')
      expect(task.status).toBe('completed')
      expect(task.messages).toHaveLength(1)
      expect(task.messages[0].text).toBe('Hello')
    })

    it('should auto-generate ID if not provided', async () => {
      const task1 = await storage.createTask({})
      const task2 = await storage.createTask({})

      expect(task1.id).toBeDefined()
      expect(task2.id).toBeDefined()
      expect(task1.id).not.toBe(task2.id)
    })

    it('should use provided ID if given', async () => {
      const customId = 'custom-test-id'
      const task = await storage.createTask({ id: customId })

      expect(task.id).toBe(customId)
    })

    it('should set timestamps correctly', async () => {
      const beforeCreate = Date.now()
      const task = await storage.createTask({})
      const afterCreate = Date.now()

      expect(task.createdAt).toBeGreaterThanOrEqual(beforeCreate)
      expect(task.createdAt).toBeLessThanOrEqual(afterCreate)
      expect(task.updatedAt).toBe(task.createdAt)
    })
  })

  describe('getTask', () => {
    it('should retrieve existing task', async () => {
      const created = await storage.createTask({ text: 'Test task' })
      const retrieved = await storage.getTask(created.id)

      expect(retrieved).not.toBeNull()
      expect(retrieved?.id).toBe(created.id)
      expect(retrieved?.text).toBe('Test task')
    })

    it('should return null for non-existent task', async () => {
      const task = await storage.getTask('non-existent-id')
      expect(task).toBeNull()
    })

    it('should deserialize messages correctly', async () => {
      const messages: ClineMessage[] = [
        { type: 'ask', ask: 'user', text: 'Message 1', ts: Date.now() },
        { type: 'ask', ask: 'assistant', text: 'Message 2', ts: Date.now() }
      ]

      const created = await storage.createTask({ messages })
      const retrieved = await storage.getTask(created.id)

      expect(retrieved?.messages).toHaveLength(2)
      expect(retrieved?.messages[0].text).toBe('Message 1')
      expect(retrieved?.messages[1].text).toBe('Message 2')
    })
  })

  describe('updateTask', () => {
    it('should update task fields', async () => {
      const task = await storage.createTask({ text: 'Original' })

      const updated = await storage.updateTask(task.id, {
        text: 'Updated'
      })

      expect(updated.text).toBe('Updated')
      expect(updated.id).toBe(task.id)
    })

    it('should update timestamp on update', async () => {
      const task = await storage.createTask({})
      const originalTimestamp = task.updatedAt

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))

      const updated = await storage.updateTask(task.id, { text: 'Updated' })

      expect(updated.updatedAt).toBeGreaterThan(originalTimestamp)
    })

    it('should update status', async () => {
      const task = await storage.createTask({ status: 'active' })

      const updated = await storage.updateTask(task.id, {
        status: 'completed'
      })

      expect(updated.status).toBe('completed')
    })

    it('should update messages', async () => {
      const task = await storage.createTask({ messages: [] })

      const newMessages: ClineMessage[] = [
        { type: 'ask', ask: 'user', text: 'New message', ts: Date.now() }
      ]

      const updated = await storage.updateTask(task.id, {
        messages: newMessages
      })

      expect(updated.messages).toHaveLength(1)
      expect(updated.messages[0].text).toBe('New message')
    })

    it('should throw error for non-existent task', async () => {
      await expect(
        storage.updateTask('non-existent-id', { text: 'Update' })
      ).rejects.toThrow()
    })
  })

  describe('deleteTask', () => {
    it('should delete existing task', async () => {
      const task = await storage.createTask({ text: 'To delete' })

      const deleted = await storage.deleteTask(task.id)
      expect(deleted).toBe(true)

      const retrieved = await storage.getTask(task.id)
      expect(retrieved).toBeNull()
    })

    it('should return false for non-existent task', async () => {
      const deleted = await storage.deleteTask('non-existent-id')
      expect(deleted).toBe(false)
    })

    it('should remove from FTS index', async () => {
      const task = await storage.createTask({ text: 'Searchable task' })

      // Verify it's searchable
      let results = await storage.listTasks({ search: 'searchable' })
      expect(results).toHaveLength(1)

      // Delete it
      await storage.deleteTask(task.id)

      // Verify it's no longer searchable
      results = await storage.listTasks({ search: 'searchable' })
      expect(results).toHaveLength(0)
    })
  })

  describe('listTasks', () => {
    beforeEach(async () => {
      // Create test tasks
      await storage.createTask({
        text: 'Active task 1',
        status: 'active'
      })
      await storage.createTask({
        text: 'Completed task',
        status: 'completed'
      })
      await storage.createTask({
        text: 'Active task 2',
        status: 'active'
      })
      await storage.createTask({
        text: 'Failed task',
        status: 'failed'
      })
    })

    it('should list all tasks without filters', async () => {
      const tasks = await storage.listTasks({})
      expect(tasks).toHaveLength(4)
    })

    it('should filter by status', async () => {
      const activeTasks = await storage.listTasks({ status: 'active' })
      expect(activeTasks).toHaveLength(2)
      expect(activeTasks.every(t => t.status === 'active')).toBe(true)

      const completedTasks = await storage.listTasks({ status: 'completed' })
      expect(completedTasks).toHaveLength(1)
      expect(completedTasks[0].status).toBe('completed')
    })

    it('should search by text', async () => {
      const results = await storage.listTasks({ search: 'Active' })
      expect(results).toHaveLength(2)
      expect(results.every(t => t.text?.includes('Active'))).toBe(true)
    })

    it('should sort by createdAt ascending', async () => {
      const tasks = await storage.listTasks({
        sortBy: 'createdAt',
        sortOrder: 'asc'
      })

      for (let i = 1; i < tasks.length; i++) {
        expect(tasks[i].createdAt).toBeGreaterThanOrEqual(tasks[i - 1].createdAt)
      }
    })

    it('should sort by createdAt descending', async () => {
      const tasks = await storage.listTasks({
        sortBy: 'createdAt',
        sortOrder: 'desc'
      })

      for (let i = 1; i < tasks.length; i++) {
        expect(tasks[i].createdAt).toBeLessThanOrEqual(tasks[i - 1].createdAt)
      }
    })

    it('should limit results', async () => {
      const tasks = await storage.listTasks({ limit: 2 })
      expect(tasks).toHaveLength(2)
    })

    it('should offset results', async () => {
      const allTasks = await storage.listTasks({
        sortBy: 'createdAt',
        sortOrder: 'asc'
      })
      const offsetTasks = await storage.listTasks({
        offset: 2,
        sortBy: 'createdAt',
        sortOrder: 'asc'
      })

      expect(offsetTasks).toHaveLength(2)
      expect(offsetTasks[0].id).toBe(allTasks[2].id)
    })

    it('should combine filters', async () => {
      const tasks = await storage.listTasks({
        status: 'active',
        search: 'task 1'
      })

      expect(tasks).toHaveLength(1)
      expect(tasks[0].text).toBe('Active task 1')
    })
  })

  describe('exportTask', () => {
    let task: Task

    beforeEach(async () => {
      task = await storage.createTask({
        text: 'Export test',
        messages: [
          { type: 'ask', ask: 'user', text: 'Test message', ts: Date.now() }
        ]
      })
    })

    it('should export as JSON', async () => {
      const exported = await storage.exportTask(task.id, 'json')

      expect(exported).toBeDefined()
      const parsed = JSON.parse(exported)
      expect(parsed.id).toBe(task.id)
      expect(parsed.text).toBe('Export test')
    })

    it('should export as TXT', async () => {
      const exported = await storage.exportTask(task.id, 'txt')

      expect(exported).toBeDefined()
      expect(typeof exported).toBe('string')
      expect(exported).toContain('Export test')
      expect(exported).toContain('Test message')
    })

    it('should export as Markdown', async () => {
      const exported = await storage.exportTask(task.id, 'md')

      expect(exported).toBeDefined()
      expect(typeof exported).toBe('string')
      expect(exported).toContain('# Task')
      expect(exported).toContain('Export test')
    })

    it('should throw error for non-existent task', async () => {
      await expect(
        storage.exportTask('non-existent-id', 'json')
      ).rejects.toThrow()
    })
  })

  describe('getStats', () => {
    beforeEach(async () => {
      // Create test tasks with different statuses
      await storage.createTask({ status: 'active' })
      await storage.createTask({ status: 'active' })
      await storage.createTask({ status: 'completed' })
      await storage.createTask({ status: 'failed' })
      await storage.createTask({ status: 'terminated' })
    })

    it('should return correct task counts', async () => {
      const stats = await storage.getStats()

      expect(stats.total).toBe(5)
      expect(stats.active).toBe(2)
      expect(stats.completed).toBe(1)
      expect(stats.failed).toBe(1)
      expect(stats.terminated).toBe(1)
    })

    it('should return zero counts for empty database', async () => {
      // Create fresh storage
      const tempDir = path.join(os.tmpdir(), 'empty-test-' + Date.now())
      fs.mkdirSync(tempDir, { recursive: true })

      const emptyStorage = new TaskStorage(tempDir)
      await emptyStorage.initialize()

      const stats = await emptyStorage.getStats()

      expect(stats.total).toBe(0)
      expect(stats.active).toBe(0)
      expect(stats.completed).toBe(0)
      expect(stats.failed).toBe(0)
      expect(stats.terminated).toBe(0)

      await emptyStorage.close()
    })
  })

  describe('edge cases', () => {
    it('should handle tasks with no text', async () => {
      const task = await storage.createTask({})
      expect(task.text).toBe('')
    })

    it('should handle tasks with very long text', async () => {
      const longText = 'a'.repeat(10000)
      const task = await storage.createTask({ text: longText })

      const retrieved = await storage.getTask(task.id)
      expect(retrieved?.text).toBe(longText)
    })

    it('should handle tasks with many messages', async () => {
      const messages: ClineMessage[] = []
      for (let i = 0; i < 100; i++) {
        messages.push({
          type: 'ask',
          ask: i % 2 === 0 ? 'user' : 'assistant',
          text: `Message ${i}`,
          ts: Date.now()
        })
      }

      const task = await storage.createTask({ messages })
      const retrieved = await storage.getTask(task.id)

      expect(retrieved?.messages).toHaveLength(100)
    })

    it('should handle special characters in text', async () => {
      const specialText = 'Test "quotes" and \'apostrophes\' and \\backslashes\\'
      const task = await storage.createTask({ text: specialText })

      const retrieved = await storage.getTask(task.id)
      expect(retrieved?.text).toBe(specialText)
    })

    it('should handle concurrent operations', async () => {
      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(storage.createTask({ text: `Task ${i}` }))
      }

      const tasks = await Promise.all(promises)
      expect(tasks).toHaveLength(10)

      // Verify all tasks were created
      const allTasks = await storage.listTasks({})
      expect(allTasks).toHaveLength(10)
    })
  })
})
