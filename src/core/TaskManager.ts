/**
 * TaskManager Service
 *
 * High-level task management orchestration.
 * Manages task lifecycle, state transitions, and message handling.
 *
 * Sprint 1-2: Task Persistence Layer
 * Sprint 3-4: Context Intelligence Integration
 */

import { Task, TaskStatus, ClineMessage, TaskFilters, TaskStats, ExportFormat } from '../types/task'
import { TaskStorage } from '../services/TaskStorage'
import { TokenCounter } from '../services/TokenCounter'
import { CostTracker } from '../services/CostTracker'
import { MessageCondenser } from '../services/MessageCondenser'
import { ContextManager, ContextStatus, CondensingResult } from '../services/ContextManager'
import * as vscode from 'vscode'

export interface TaskManagerEvents {
  taskCreated: (task: Task) => void
  taskUpdated: (task: Task) => void
  taskLoaded: (task: Task) => void
  taskDeleted: (taskId: string) => void
  taskCompleted: (task: Task) => void
  taskTerminated: (task: Task) => void
  taskFailed: (task: Task, error: Error) => void
  contextStatusChanged: (status: ContextStatus) => void
  autoCondensingTriggered: (taskId: string, result: CondensingResult) => void
}

export class TaskManager {
  private storage: TaskStorage
  private currentTask: Task | null = null
  private tasks: Map<string, Task> = new Map()
  private eventListeners: Partial<TaskManagerEvents> = {}
  
  // Context Intelligence Services (Sprint 3-4)
  private tokenCounter: TokenCounter
  private costTracker: CostTracker
  private messageCondenser: MessageCondenser
  private contextManager: ContextManager

  constructor(context: vscode.ExtensionContext) {
    const storagePath = context.globalStorageUri.fsPath
    this.storage = new TaskStorage(storagePath)
    
    // Initialize Context Intelligence services
    const apiKey = vscode.workspace.getConfiguration('oropendola').get<string>('apiKey')
    this.tokenCounter = new TokenCounter(apiKey)
    this.costTracker = new CostTracker(this.tokenCounter)
    this.messageCondenser = new MessageCondenser(apiKey)
    this.contextManager = new ContextManager(
      this.tokenCounter,
      this.messageCondenser,
      {
        maxTokens: 200_000,
        autoCondensingThreshold: 80,
        criticalThreshold: 90,
        reservedOutputTokens: 4096,
        preserveRecent: 5
      }
    )
    
    // Listen to context status changes
    this.contextManager.onStatusChange((status) => {
      this.emit('contextStatusChanged', status)
      
      // Warn if approaching limit
      if (status.nearLimit) {
        console.warn('[TaskManager] Context approaching limit:', status.percentUsed.toFixed(1) + '%')
      }
    })
  }

  /**
   * Initialize task manager and restore active task
   */
  async initialize(): Promise<void> {
    await this.storage.initialize()

    // Load active task if exists
    const activeTasks = await this.storage.listTasks({
      status: 'active',
      limit: 1,
      sortBy: 'updatedAt',
      sortOrder: 'DESC'
    })

    if (activeTasks.length > 0) {
      this.currentTask = activeTasks[0]
      this.tasks.set(this.currentTask.id, this.currentTask)
      this.emit('taskLoaded', this.currentTask)
      console.log('[TaskManager] Restored active task:', this.currentTask.id)
    }

    console.log('[TaskManager] Initialized')
  }

  /**
   * Create a new task
   */
  async createTask(text?: string, mode?: string): Promise<Task> {
    const task = await this.storage.createTask({
      text: text || `Task ${new Date().toLocaleString()}`,
      metadata: {
        version: '3.6.0',
        mode: mode || 'agent',
        model: 'auto'
      }
    })

    this.tasks.set(task.id, task)
    this.currentTask = task
    this.emit('taskCreated', task)

    console.log('[TaskManager] Task created:', task.id)
    return task
  }

  /**
   * Get a task by ID (without setting as current)
   */
  async getTask(taskId: string): Promise<Task | null> {
    // Check cache first
    if (this.tasks.has(taskId)) {
      return this.tasks.get(taskId)!
    }

    // Load from storage
    const task = await this.storage.getTask(taskId)
    if (task) {
      this.tasks.set(taskId, task)
    }

    return task
  }

  /**
   * Load a task by ID (sets as current task)
   */
  async loadTask(taskId: string): Promise<Task | null> {
    const task = await this.getTask(taskId)

    if (task) {
      this.currentTask = task
      this.emit('taskLoaded', task)
    }

    return task
  }

  /**
   * Update a task
   */
  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    const task = await this.storage.updateTask(taskId, updates)
    this.tasks.set(taskId, task)

    if (this.currentTask?.id === taskId) {
      this.currentTask = task
    }

    this.emit('taskUpdated', task)
    return task
  }

  /**
   * Add a message to a task
   * Enhanced with cost tracking and auto-condensing (Sprint 3-4)
   */
  async addMessage(taskId: string, message: ClineMessage): Promise<Task> {
    const task = await this.storage.getTask(taskId)
    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    task.messages.push(message)

    // Update API metrics from message
    if (message.apiMetrics) {
      task.apiMetrics.tokensIn += message.apiMetrics.tokensIn || 0
      task.apiMetrics.tokensOut += message.apiMetrics.tokensOut || 0
      task.apiMetrics.cacheReads += message.apiMetrics.cacheReads || 0
      task.apiMetrics.cacheWrites += message.apiMetrics.cacheWrites || 0
      task.apiMetrics.totalCost += message.apiMetrics.cost || 0
      task.contextTokens = task.apiMetrics.tokensIn + task.apiMetrics.tokensOut
      task.apiMetrics.contextTokens = task.contextTokens
      
      // Track costs (Sprint 3-4)
      const messageId = `${taskId}-${task.messages.length - 1}`
      await this.costTracker.trackMessage(taskId, messageId, message, {
        tokensIn: message.apiMetrics.tokensIn,
        tokensOut: message.apiMetrics.tokensOut,
        cacheReads: message.apiMetrics.cacheReads,
        cacheWrites: message.apiMetrics.cacheWrites
      })
    }
    
    // Check for auto-condensing (Sprint 3-4)
    const shouldCondense = await this.contextManager.shouldCondense(task.messages)
    if (shouldCondense && this.currentTask?.id === taskId) {
      console.log('[TaskManager] Auto-condensing triggered for task:', taskId)
      const result = await this.contextManager.autoCondense(task.messages)
      
      if (result.success && result.condensedMessages < result.originalMessages) {
        // Update task with condensed messages
        // Note: This would need to extract the condensed messages from the result
        // For now, just emit the event
        this.emit('autoCondensingTriggered', taskId, result)
      }
    }

    return await this.updateTask(taskId, task)
  }
  
  /**
   * Get task cost breakdown (Sprint 3-4)
   */
  getTaskCost(taskId: string) {
    return this.costTracker.getTaskCost(taskId)
  }
  
  /**
   * Get cost summary across all tasks (Sprint 3-4)
   */
  getCostSummary() {
    return this.costTracker.getSummary()
  }
  
  /**
   * Get daily cost trend (Sprint 3-4)
   */
  getDailyCostTrend(days: number = 7) {
    return this.costTracker.getDailyTrend(days)
  }
  
  /**
   * Export cost data (Sprint 3-4)
   */
  exportCostData() {
    return this.costTracker.exportData()
  }
  
  /**
   * Manually condense task messages (Sprint 3-4)
   */
  async manualCondense(taskId: string): Promise<CondensingResult> {
    const task = await this.getTask(taskId)
    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }
    
    const result = await this.contextManager.condenseMessages(task.messages)
    
    if (result.success) {
      console.log('[TaskManager] Manual condensing completed:', {
        taskId,
        saved: result.tokensSaved,
        reduction: result.percentReduction.toFixed(1) + '%'
      })
    }
    
    return result
  }
  
  /**
   * Get context status for task (Sprint 3-4)
   */
  async getContextStatus(taskId: string): Promise<ContextStatus> {
    const task = await this.getTask(taskId)
    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }
    
    return await this.contextManager.getStatus(task.messages)
  }

  /**
   * Change task status
   */
  async setStatus(taskId: string, status: TaskStatus): Promise<Task> {
    const updates: Partial<Task> = { status }

    if (status === 'completed' || status === 'failed' || status === 'terminated') {
      updates.completedAt = Date.now()
    }

    const task = await this.updateTask(taskId, updates)

    // Emit specific events
    switch (status) {
      case 'completed':
        this.emit('taskCompleted', task)
        break
      case 'terminated':
        this.emit('taskTerminated', task)
        break
      case 'failed':
        if (task.metadata.error) {
          this.emit('taskFailed', task, new Error(task.metadata.error))
        }
        break
    }

    return task
  }

  /**
   * Complete a task
   */
  async completeTask(taskId: string): Promise<Task> {
    return await this.setStatus(taskId, 'completed')
  }

  /**
   * Terminate a task
   */
  async terminateTask(taskId: string): Promise<Task> {
    return await this.setStatus(taskId, 'terminated')
  }

  /**
   * Resume a task
   */
  async resumeTask(taskId: string): Promise<Task> {
    const task = await this.setStatus(taskId, 'active')
    this.currentTask = task
    return task
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: string): Promise<boolean> {
    const deleted = await this.storage.deleteTask(taskId)

    if (deleted) {
      this.tasks.delete(taskId)

      if (this.currentTask?.id === taskId) {
        this.currentTask = null
      }

      this.emit('taskDeleted', taskId)
    }

    return deleted
  }

  /**
   * Get current active task
   */
  getCurrentTask(): Task | null {
    return this.currentTask
  }

  /**
   * List all tasks
   */
  async listTasks(filters?: TaskFilters): Promise<Task[]> {
    return await this.storage.listTasks(filters)
  }

  /**
   * Search tasks
   */
  async searchTasks(query: string, limit?: number): Promise<Task[]> {
    return await this.storage.listTasks({
      search: query,
      limit: limit || 50,
      sortBy: 'updatedAt',
      sortOrder: 'DESC'
    })
  }

  /**
   * Batch Operations - Week 5-6 Advanced Features
   */

  /**
   * Batch update task status
   * Updates multiple tasks to the same status
   */
  async batchSetStatus(taskIds: string[], status: TaskStatus): Promise<{
    succeeded: string[]
    failed: { id: string; error: string }[]
  }> {
    const results = {
      succeeded: [] as string[],
      failed: [] as { id: string; error: string }[]
    }

    // Process in parallel with Promise.allSettled
    const promises = taskIds.map(async (id) => {
      try {
        await this.setStatus(id, status)
        return { success: true, id }
      } catch (error) {
        return { success: false, id, error: (error as Error).message }
      }
    })

    const settled = await Promise.allSettled(promises)

    settled.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.success) {
        results.succeeded.push(result.value.id)
      } else if (result.status === 'fulfilled' && !result.value.success) {
        results.failed.push({
          id: result.value.id,
          error: result.value.error || 'Unknown error'
        })
      } else if (result.status === 'rejected') {
        results.failed.push({
          id: 'unknown',
          error: result.reason
        })
      }
    })

    console.log(`[TaskManager] Batch status change: ${results.succeeded.length} succeeded, ${results.failed.length} failed`)
    return results
  }

  /**
   * Batch delete tasks
   */
  async batchDelete(taskIds: string[]): Promise<{
    succeeded: string[]
    failed: { id: string; error: string }[]
  }> {
    const results = {
      succeeded: [] as string[],
      failed: [] as { id: string; error: string }[]
    }

    const promises = taskIds.map(async (id) => {
      try {
        const deleted = await this.deleteTask(id)
        return { success: deleted, id }
      } catch (error) {
        return { success: false, id, error: (error as Error).message }
      }
    })

    const settled = await Promise.allSettled(promises)

    settled.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.success) {
        results.succeeded.push(result.value.id)
      } else if (result.status === 'fulfilled' && !result.value.success) {
        results.failed.push({
          id: result.value.id,
          error: result.value.error || 'Task not found'
        })
      } else if (result.status === 'rejected') {
        results.failed.push({
          id: 'unknown',
          error: result.reason
        })
      }
    })

    console.log(`[TaskManager] Batch delete: ${results.succeeded.length} succeeded, ${results.failed.length} failed`)
    return results
  }

  /**
   * Batch export tasks
   */
  async batchExport(taskIds: string[], format: ExportFormat): Promise<{
    succeeded: { id: string; data: string }[]
    failed: { id: string; error: string }[]
  }> {
    const results = {
      succeeded: [] as { id: string; data: string }[],
      failed: [] as { id: string; error: string }[]
    }

    const promises = taskIds.map(async (id) => {
      try {
        const data = await this.exportTask(id, format)
        return { success: true, id, data }
      } catch (error) {
        return { success: false, id, error: (error as Error).message }
      }
    })

    const settled = await Promise.allSettled(promises)

    settled.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.success) {
        results.succeeded.push({
          id: result.value.id,
          data: result.value.data || ''
        })
      } else if (result.status === 'fulfilled' && !result.value.success) {
        results.failed.push({
          id: result.value.id,
          error: result.value.error || 'Export failed'
        })
      } else if (result.status === 'rejected') {
        results.failed.push({
          id: 'unknown',
          error: result.reason
        })
      }
    })

    console.log(`[TaskManager] Batch export: ${results.succeeded.length} succeeded, ${results.failed.length} failed`)
    return results
  }

  /**
   * Batch add tags to tasks
   */
  async batchAddTags(taskIds: string[], tags: string[]): Promise<{
    succeeded: string[]
    failed: { id: string; error: string }[]
  }> {
    const results = {
      succeeded: [] as string[],
      failed: [] as { id: string; error: string }[]
    }

    const promises = taskIds.map(async (id) => {
      try {
        const task = await this.getTask(id)
        if (!task) {
          return { success: false, id, error: 'Task not found' }
        }

        const existingTags = task.metadata?.tags || []
        const newTags = [...new Set([...existingTags, ...tags])] // Merge and dedupe

        await this.updateTask(id, {
          metadata: {
            ...task.metadata,
            tags: newTags
          }
        })

        return { success: true, id }
      } catch (error) {
        return { success: false, id, error: (error as Error).message }
      }
    })

    const settled = await Promise.allSettled(promises)

    settled.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.success) {
        results.succeeded.push(result.value.id)
      } else if (result.status === 'fulfilled' && !result.value.success) {
        results.failed.push({
          id: result.value.id,
          error: result.value.error || 'Unknown error'
        })
      } else if (result.status === 'rejected') {
        results.failed.push({
          id: 'unknown',
          error: result.reason
        })
      }
    })

    console.log(`[TaskManager] Batch add tags: ${results.succeeded.length} succeeded, ${results.failed.length} failed`)
    return results
  }

  /**
   * Batch remove tags from tasks
   */
  async batchRemoveTags(taskIds: string[], tags: string[]): Promise<{
    succeeded: string[]
    failed: { id: string; error: string }[]
  }> {
    const results = {
      succeeded: [] as string[],
      failed: [] as { id: string; error: string }[]
    }

    const promises = taskIds.map(async (id) => {
      try {
        const task = await this.getTask(id)
        if (!task) {
          return { success: false, id, error: 'Task not found' }
        }

        const existingTags = task.metadata?.tags || []
        const newTags = existingTags.filter(tag => !tags.includes(tag))

        await this.updateTask(id, {
          metadata: {
            ...task.metadata,
            tags: newTags
          }
        })

        return { success: true, id }
      } catch (error) {
        return { success: false, id, error: (error as Error).message }
      }
    })

    const settled = await Promise.allSettled(promises)

    settled.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.success) {
        results.succeeded.push(result.value.id)
      } else if (result.status === 'fulfilled' && !result.value.success) {
        results.failed.push({
          id: result.value.id,
          error: result.value.error || 'Unknown error'
        })
      } else if (result.status === 'rejected') {
        results.failed.push({
          id: 'unknown',
          error: result.reason
        })
      }
    })

    console.log(`[TaskManager] Batch remove tags: ${results.succeeded.length} succeeded, ${results.failed.length} failed`)
    return results
  }

  /**
   * Get task statistics
   */
  async getStats(): Promise<TaskStats> {
    return await this.storage.getStats()
  }

  /**
   * Export task
   */
  async exportTask(taskId: string, format: ExportFormat): Promise<string> {
    return await this.storage.exportTask(taskId, format)
  }

  /**
   * Register event listener
   */
  on<K extends keyof TaskManagerEvents>(event: K, listener: TaskManagerEvents[K]): void {
    this.eventListeners[event] = listener as any
  }

  /**
   * Emit event
   */
  private emit<K extends keyof TaskManagerEvents>(
    event: K,
    ...args: Parameters<NonNullable<TaskManagerEvents[K]>>
  ): void {
    const listener = this.eventListeners[event]
    if (listener) {
      ;(listener as any)(...args)
    }
  }

  /**
   * Close task manager
   */
  async close(): Promise<void> {
    await this.storage.close()
    this.tasks.clear()
    this.currentTask = null
    this.eventListeners = {}
    console.log('[TaskManager] Closed')
  }
}
