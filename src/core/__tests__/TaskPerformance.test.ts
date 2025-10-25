/**
 * Task Performance Benchmark
 * Sprint 1-2: Task Persistence Layer - Week 5-6
 *
 * Comprehensive performance testing with 10,000+ tasks.
 * Measures:
 * - Task creation speed
 * - Retrieval performance
 * - Search performance
 * - Filter performance
 * - Update operations
 * - Export operations
 * - Memory usage
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { TaskManager } from '../TaskManager'
import type { Task, ClineMessage, TaskStatus } from '../../types/task'
import fs from 'fs'
import path from 'path'
import os from 'os'

// Performance thresholds (in milliseconds)
const THRESHOLDS = {
  CREATE_TASK: 50,           // Should create task in < 50ms
  GET_TASK: 10,              // Should retrieve task in < 10ms
  UPDATE_TASK: 50,           // Should update task in < 50ms
  LIST_ALL: 500,             // Should list all tasks in < 500ms
  SEARCH_10K: 200,           // Should search 10k tasks in < 200ms
  FILTER_STATUS: 100,        // Should filter by status in < 100ms
  EXPORT_JSON: 100,          // Should export to JSON in < 100ms
  BATCH_100: 5000,           // Should batch operation 100 tasks in < 5s
}

describe('Task Performance Benchmarks', () => {
  let manager: TaskManager
  let testDir: string
  const taskIds: string[] = []

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
    console.log('\n========================================')
    console.log('🚀 TASK PERFORMANCE BENCHMARK')
    console.log('========================================\n')

    testDir = path.join(os.tmpdir(), 'perf-benchmark-' + Date.now())
    fs.mkdirSync(testDir, { recursive: true })

    const mockContext = createMockContext(testDir)
    manager = new TaskManager(mockContext)
    await manager.initialize()

    console.log('📊 Generating 10,000 test tasks...\n')
  }, 300000) // 5 minute timeout for setup

  afterAll(async () => {
    await manager?.close()
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true })
    }

    console.log('\n========================================')
    console.log('✅ BENCHMARK COMPLETE')
    console.log('========================================\n')
  })

  describe('Task Creation Performance', () => {
    it('should create 10,000 tasks efficiently', async () => {
      const startTime = Date.now()
      const batchSize = 100
      let created = 0

      // Create in batches of 100
      for (let batch = 0; batch < 100; batch++) {
        const batchPromises = []

        for (let i = 0; i < batchSize; i++) {
          const taskNum = batch * batchSize + i
          const status: TaskStatus = ['active', 'completed', 'failed', 'terminated'][taskNum % 4] as TaskStatus

          const promise = manager.createTask(
            `Performance test task ${taskNum}`,
            ['agent', 'architect', 'code', 'ask'][taskNum % 4]
          ).then(task => {
            taskIds.push(task.id)
            return manager.setStatus(task.id, status)
          })

          batchPromises.push(promise)
        }

        await Promise.all(batchPromises)
        created += batchSize

        if ((batch + 1) % 10 === 0) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
          console.log(`  Created ${created}/10,000 tasks (${elapsed}s)`)
        }
      }

      const totalTime = Date.now() - startTime
      const avgTime = totalTime / 10000

      console.log(`\n  ✓ Created 10,000 tasks in ${(totalTime / 1000).toFixed(2)}s`)
      console.log(`  ✓ Average: ${avgTime.toFixed(2)}ms per task`)
      console.log(`  ✓ Throughput: ${(10000 / (totalTime / 1000)).toFixed(0)} tasks/sec\n`)

      expect(taskIds).toHaveLength(10000)
      expect(avgTime).toBeLessThan(THRESHOLDS.CREATE_TASK)
    }, 300000) // 5 minute timeout

    it('should measure single task creation time', async () => {
      const iterations = 100
      const times: number[] = []

      for (let i = 0; i < iterations; i++) {
        const start = Date.now()
        const task = await manager.createTask('Benchmark task')
        const time = Date.now() - start
        times.push(time)
        taskIds.push(task.id)
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length
      const min = Math.min(...times)
      const max = Math.max(...times)
      const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)]

      console.log(`  Single Task Creation (n=${iterations}):`)
      console.log(`  ✓ Average: ${avg.toFixed(2)}ms`)
      console.log(`  ✓ Min: ${min}ms`)
      console.log(`  ✓ Max: ${max}ms`)
      console.log(`  ✓ P95: ${p95}ms\n`)

      expect(avg).toBeLessThan(THRESHOLDS.CREATE_TASK)
      expect(p95).toBeLessThan(THRESHOLDS.CREATE_TASK * 2)
    })
  })

  describe('Task Retrieval Performance', () => {
    it('should retrieve tasks quickly', async () => {
      const iterations = 1000
      const times: number[] = []

      // Sample random tasks
      for (let i = 0; i < iterations; i++) {
        const randomId = taskIds[Math.floor(Math.random() * taskIds.length)]
        const start = Date.now()
        const task = await manager.getTask(randomId)
        const time = Date.now() - start
        times.push(time)
        expect(task).not.toBeNull()
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length
      const min = Math.min(...times)
      const max = Math.max(...times)
      const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)]

      console.log(`  Task Retrieval (n=${iterations}):`)
      console.log(`  ✓ Average: ${avg.toFixed(2)}ms`)
      console.log(`  ✓ Min: ${min}ms`)
      console.log(`  ✓ Max: ${max}ms`)
      console.log(`  ✓ P95: ${p95}ms\n`)

      expect(avg).toBeLessThan(THRESHOLDS.GET_TASK)
    })

    it('should list all tasks efficiently', async () => {
      const start = Date.now()
      const tasks = await manager.listTasks()
      const time = Date.now() - start

      console.log(`  List All Tasks:`)
      console.log(`  ✓ Retrieved ${tasks.length} tasks in ${time}ms`)
      console.log(`  ✓ ${(tasks.length / (time / 1000)).toFixed(0)} tasks/sec\n`)

      expect(tasks.length).toBeGreaterThan(10000)
      expect(time).toBeLessThan(THRESHOLDS.LIST_ALL)
    })
  })

  describe('Search Performance', () => {
    it('should search 10k+ tasks quickly', async () => {
      const searchTerms = [
        'Performance',
        'test',
        'task 500',
        'task 1000',
        'task 5000'
      ]

      for (const term of searchTerms) {
        const start = Date.now()
        const results = await manager.listTasks({ search: term })
        const time = Date.now() - start

        console.log(`  Search "${term}":`)
        console.log(`  ✓ Found ${results.length} results in ${time}ms\n`)

        expect(time).toBeLessThan(THRESHOLDS.SEARCH_10K)
      }
    })

    it('should filter by status quickly', async () => {
      const statuses: TaskStatus[] = ['active', 'completed', 'failed', 'terminated']

      for (const status of statuses) {
        const start = Date.now()
        const results = await manager.listTasks({ status })
        const time = Date.now() - start

        console.log(`  Filter status="${status}":`)
        console.log(`  ✓ Found ${results.length} results in ${time}ms\n`)

        expect(time).toBeLessThan(THRESHOLDS.FILTER_STATUS)
        expect(results.every(t => t.status === status)).toBe(true)
      }
    })

    it('should handle combined filters', async () => {
      const start = Date.now()
      const results = await manager.listTasks({
        status: 'active',
        search: 'test',
        sortBy: 'createdAt',
        sortOrder: 'desc',
        limit: 100
      })
      const time = Date.now() - start

      console.log(`  Combined filters (status + search + sort + limit):`)
      console.log(`  ✓ Found ${results.length} results in ${time}ms\n`)

      expect(time).toBeLessThan(THRESHOLDS.FILTER_STATUS)
    })
  })

  describe('Update Performance', () => {
    it('should update tasks efficiently', async () => {
      const iterations = 100
      const times: number[] = []

      for (let i = 0; i < iterations; i++) {
        const randomId = taskIds[Math.floor(Math.random() * taskIds.length)]
        const start = Date.now()
        await manager.updateTask(randomId, {
          text: `Updated task ${i}`
        })
        const time = Date.now() - start
        times.push(time)
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length
      const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)]

      console.log(`  Task Updates (n=${iterations}):`)
      console.log(`  ✓ Average: ${avg.toFixed(2)}ms`)
      console.log(`  ✓ P95: ${p95}ms\n`)

      expect(avg).toBeLessThan(THRESHOLDS.UPDATE_TASK)
    })

    it('should add messages efficiently', async () => {
      const taskId = taskIds[0]
      const iterations = 100
      const times: number[] = []

      for (let i = 0; i < iterations; i++) {
        const message: ClineMessage = {
          type: 'say',
          say: 'assistant',
          text: `Message ${i}`,
          ts: Date.now(),
          apiMetrics: {
            tokensIn: 100,
            tokensOut: 50,
            cacheReads: 0,
            cacheWrites: 0,
            cost: 0.01
          }
        }

        const start = Date.now()
        await manager.addMessage(taskId, message)
        const time = Date.now() - start
        times.push(time)
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length

      console.log(`  Add Messages (n=${iterations}):`)
      console.log(`  ✓ Average: ${avg.toFixed(2)}ms\n`)

      expect(avg).toBeLessThan(THRESHOLDS.UPDATE_TASK)
    })
  })

  describe('Export Performance', () => {
    it('should export to JSON quickly', async () => {
      const taskId = taskIds[0]
      const iterations = 50
      const times: number[] = []

      for (let i = 0; i < iterations; i++) {
        const start = Date.now()
        await manager.exportTask(taskId, 'json')
        const time = Date.now() - start
        times.push(time)
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length

      console.log(`  Export JSON (n=${iterations}):`)
      console.log(`  ✓ Average: ${avg.toFixed(2)}ms\n`)

      expect(avg).toBeLessThan(THRESHOLDS.EXPORT_JSON)
    })

    it('should export to TXT quickly', async () => {
      const taskId = taskIds[0]
      const start = Date.now()
      await manager.exportTask(taskId, 'txt')
      const time = Date.now() - start

      console.log(`  Export TXT:`)
      console.log(`  ✓ Completed in ${time}ms\n`)

      expect(time).toBeLessThan(THRESHOLDS.EXPORT_JSON)
    })

    it('should export to Markdown quickly', async () => {
      const taskId = taskIds[0]
      const start = Date.now()
      await manager.exportTask(taskId, 'md')
      const time = Date.now() - start

      console.log(`  Export Markdown:`)
      console.log(`  ✓ Completed in ${time}ms\n`)

      expect(time).toBeLessThan(THRESHOLDS.EXPORT_JSON)
    })
  })

  describe('Batch Operations Performance', () => {
    it('should handle batch status changes', async () => {
      const batchSize = 100
      const testTaskIds = taskIds.slice(0, batchSize)

      const start = Date.now()
      await Promise.all(
        testTaskIds.map(id => manager.setStatus(id, 'completed'))
      )
      const time = Date.now() - start

      console.log(`  Batch Status Change (n=${batchSize}):`)
      console.log(`  ✓ Completed in ${time}ms`)
      console.log(`  ✓ ${(batchSize / (time / 1000)).toFixed(0)} operations/sec\n`)

      expect(time).toBeLessThan(THRESHOLDS.BATCH_100)
    })

    it('should handle batch deletion', async () => {
      const batchSize = 100
      const testTaskIds = taskIds.slice(10000, 10000 + batchSize)

      const start = Date.now()
      await Promise.all(
        testTaskIds.map(id => manager.deleteTask(id))
      )
      const time = Date.now() - start

      console.log(`  Batch Deletion (n=${batchSize}):`)
      console.log(`  ✓ Completed in ${time}ms`)
      console.log(`  ✓ ${(batchSize / (time / 1000)).toFixed(0)} operations/sec\n`)

      expect(time).toBeLessThan(THRESHOLDS.BATCH_100)
    })
  })

  describe('Statistics Performance', () => {
    it('should calculate stats quickly', async () => {
      const iterations = 100
      const times: number[] = []

      for (let i = 0; i < iterations; i++) {
        const start = Date.now()
        await manager.getStats()
        const time = Date.now() - start
        times.push(time)
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length

      console.log(`  Get Statistics (n=${iterations}):`)
      console.log(`  ✓ Average: ${avg.toFixed(2)}ms\n`)

      expect(avg).toBeLessThan(100) // Should be fast - it's just a COUNT query
    })
  })

  describe('Memory Usage', () => {
    it('should report memory usage', () => {
      const used = process.memoryUsage()

      console.log(`  Memory Usage:`)
      console.log(`  ✓ RSS: ${(used.rss / 1024 / 1024).toFixed(2)} MB`)
      console.log(`  ✓ Heap Total: ${(used.heapTotal / 1024 / 1024).toFixed(2)} MB`)
      console.log(`  ✓ Heap Used: ${(used.heapUsed / 1024 / 1024).toFixed(2)} MB`)
      console.log(`  ✓ External: ${(used.external / 1024 / 1024).toFixed(2)} MB\n`)

      // Memory should be reasonable (< 500MB for 10k tasks)
      expect(used.heapUsed).toBeLessThan(500 * 1024 * 1024)
    })
  })
})
