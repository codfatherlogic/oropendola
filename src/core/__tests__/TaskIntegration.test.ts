/**
 * Task Integration Tests
 * Sprint 1-2: Task Persistence Layer - Week 3-4
 *
 * End-to-end integration tests for the complete task persistence system.
 * Tests the full stack from TaskManager -> TaskStorage -> SQLite.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { TaskManager } from '../TaskManager'
import type { ClineMessage } from '../../types/task'
import fs from 'fs'
import path from 'os'

describe('Task Integration Tests', () => {
  let manager: TaskManager
  let testDir: string

  const createMockContext = (storagePath: string) => ({
    subscriptions: [],
    globalStorageUri: {
      fsPath: storagePath,
      scheme: 'file',
      authority: '',
      path: storagePath,
      query: '',
      fragment: '',
      with: () => ({} as any),
      toJSON: () => ({})
    },
    workspaceState: { get: () => undefined, update: async () => {} },
    globalState: {
      get: () => undefined,
      update: async () => {},
      setKeysForSync: () => {}
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
    asAbsolutePath: (p: string) => p,
    secrets: {} as any,
    extension: {} as any
  })

  beforeAll(async () => {
    testDir = path.tmpdir() + '/task-integration-' + Date.now()
    fs.mkdirSync(testDir, { recursive: true })

    const mockContext = createMockContext(testDir)
    manager = new TaskManager(mockContext)
    await manager.initialize()
  })

  afterAll(async () => {
    await manager?.close()
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true })
    }
  })

  it('should complete full task lifecycle', async () => {
    // Create a new task
    const task = await manager.createTask('Integration test task', 'agent')

    expect(task.id).toBeDefined()
    expect(task.text).toBe('Integration test task')
    expect(task.status).toBe('active')
    expect(task.metadata?.mode).toBe('agent')

    // Add some messages
    const message1: ClineMessage = {
      type: 'ask',
      ask: 'user',
      text: 'Hello, AI!',
      ts: Date.now()
    }

    await manager.addMessage(task.id, message1)

    const message2: ClineMessage = {
      type: 'say',
      say: 'assistant',
      text: 'Hello! How can I help?',
      ts: Date.now(),
      apiMetrics: {
        tokensIn: 100,
        tokensOut: 50,
        cacheWrites: 0,
        cacheReads: 0,
        cost: 0.01
      }
    }

    const updated = await manager.addMessage(task.id, message2)

    expect(updated.messages).toHaveLength(2)
    expect(updated.apiMetrics.tokensIn).toBe(100)
    expect(updated.apiMetrics.tokensOut).toBe(50)
    expect(updated.apiMetrics.totalCost).toBe(0.01)

    // Complete the task
    const completed = await manager.setStatus(task.id, 'completed')

    expect(completed.status).toBe('completed')
    expect(completed.completedAt).toBeDefined()
    expect(completed.completedAt).toBeGreaterThan(0)

    // Verify task can be retrieved
    const retrieved = await manager.getTask(task.id)

    expect(retrieved).not.toBeNull()
    expect(retrieved?.id).toBe(task.id)
    expect(retrieved?.messages).toHaveLength(2)
    expect(retrieved?.status).toBe('completed')

    // Verify task appears in list
    const allTasks = await manager.listTasks()
    expect(allTasks.length).toBeGreaterThan(0)

    const foundTask = allTasks.find(t => t.id === task.id)
    expect(foundTask).toBeDefined()

    // Export task
    const exported = await manager.exportTask(task.id, 'json')
    expect(exported).toBeDefined()

    const parsed = JSON.parse(exported)
    expect(parsed.id).toBe(task.id)
    expect(parsed.messages).toHaveLength(2)

    // Delete task
    const deleted = await manager.deleteTask(task.id)
    expect(deleted).toBe(true)

    // Verify task is gone
    const deletedTask = await manager.getTask(task.id)
    expect(deletedTask).toBeNull()
  })

  it('should handle multiple concurrent tasks', async () => {
    const tasks = await Promise.all([
      manager.createTask('Task 1'),
      manager.createTask('Task 2'),
      manager.createTask('Task 3')
    ])

    expect(tasks).toHaveLength(3)

    // Each should have unique ID
    const ids = tasks.map(t => t.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(3)

    // All should be retrievable
    for (const task of tasks) {
      const retrieved = await manager.getTask(task.id)
      expect(retrieved).not.toBeNull()
      expect(retrieved?.id).toBe(task.id)
    }
  })

  it('should search and filter tasks', async () => {
    // Create test tasks
    await manager.createTask('Search test alpha')
    await manager.createTask('Search test beta')
    const task3 = await manager.createTask('Different task')

    // Complete one task
    await manager.setStatus(task3.id, 'completed')

    // Search by text
    const searchResults = await manager.listTasks({
      search: 'Search test'
    })

    expect(searchResults.length).toBeGreaterThanOrEqual(2)

    // Filter by status
    const activeResults = await manager.listTasks({
      status: 'active'
    })

    expect(activeResults.every(t => t.status === 'active')).toBe(true)

    const completedResults = await manager.listTasks({
      status: 'completed'
    })

    expect(completedResults.every(t => t.status === 'completed')).toBe(true)
  })

  it('should get task statistics', async () => {
    const stats = await manager.getStats()

    expect(stats).toBeDefined()
    expect(stats.total).toBeGreaterThan(0)
    expect(typeof stats.active).toBe('number')
    expect(typeof stats.completed).toBe('number')
    expect(typeof stats.failed).toBe('number')
    expect(typeof stats.terminated).toBe('number')

    // Total should equal sum of statuses
    expect(stats.total).toBe(
      stats.active + stats.completed + stats.failed + stats.terminated
    )
  })
})
