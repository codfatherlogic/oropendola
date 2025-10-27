/**
 * SubtaskOrchestrator - Multi-task management with parent/child relationships
 * 
 * Inspired by Roo-Code's task orchestration pattern:
 * - Task stack management (clineStack)
 * - Parent/child task relationships
 * - Pause/resume functionality
 * - Sequential and parallel subtask execution
 */

import { EventEmitter } from 'events'
import * as vscode from 'vscode'
import { TaskManager } from './TaskManager'
import {
  SubtaskCapableTask,
  SubtaskRelationship,
  SubtaskEvent,
  SubtaskOrchestratorConfig,
  SubtaskResult,
  TaskStackEntry,
  TaskPauseState
} from '../types/subtask'
import { Task, ClineMessage } from '../types/task'

export class SubtaskOrchestrator extends EventEmitter {
  private taskManager: TaskManager
  private taskStack: TaskStackEntry[] = []
  private currentTask: SubtaskCapableTask | null = null
  private config: SubtaskOrchestratorConfig
  private autoSaveTimer: NodeJS.Timeout | null = null

  constructor(taskManager: TaskManager, config?: Partial<SubtaskOrchestratorConfig>) {
    super()
    this.taskManager = taskManager
    this.config = {
      maxDepth: config?.maxDepth ?? 3,
      maxConcurrentSubtasks: config?.maxConcurrentSubtasks ?? 1,
      enablePauseResume: config?.enablePauseResume ?? true,
      autoSaveInterval: config?.autoSaveInterval ?? 30000
    }
  }

  /**
   * Start a new root task
   */
  async startRootTask(text: string, mode?: string): Promise<SubtaskCapableTask> {
    const baseTask = await this.taskManager.createTask(text, mode)
    const task = this.enhanceTaskWithSubtaskCapabilities(baseTask, {
      parentTaskId: null,
      childTaskIds: [],
      taskNumber: 0,
      siblingIndex: 0
    })

    this.pushToStack(task)
    this.currentTask = task
    this.startAutoSave()

    this.emitEvent({
      type: 'task-spawned',
      taskId: task.id,
      spawnedFrom: 'root'
    })

    console.log(`[SubtaskOrchestrator] Root task started: ${task.id} (depth: 0)`)
    return task
  }

  /**
   * Start a subtask from the current task
   * @param text - Subtask description
   * @param mode - Task mode
   * @returns Promise<SubtaskResult> - Resolves when subtask completes
   */
  async startSubtask(text: string, mode?: string): Promise<SubtaskResult> {
    if (!this.currentTask) {
      throw new Error('No active task to create subtask from')
    }

    const parentTask = this.currentTask
    const taskNumber = parentTask.relationship.taskNumber + 1

    // Check max depth
    if (taskNumber > this.config.maxDepth) {
      throw new Error(`Maximum subtask depth (${this.config.maxDepth}) exceeded`)
    }

    // Pause parent task
    await this.pauseTask(parentTask.id, 'waiting-for-subtask')

    // Create subtask
    const baseTask = await this.taskManager.createTask(text, mode)
    const subtask = this.enhanceTaskWithSubtaskCapabilities(baseTask, {
      parentTaskId: parentTask.id,
      childTaskIds: [],
      taskNumber,
      siblingIndex: parentTask.relationship.childTaskIds.length
    })

    // Update parent's child list
    parentTask.relationship.childTaskIds.push(subtask.id)
    await this.taskManager.updateTask(parentTask.id, {
      metadata: {
        ...parentTask.metadata,
        childTasks: parentTask.relationship.childTaskIds
      }
    })

    // Push subtask to stack and make it current
    this.pushToStack(subtask)
    this.currentTask = subtask

    this.emitEvent({
      type: 'subtask-started',
      taskId: subtask.id,
      parentTaskId: parentTask.id,
      taskNumber
    })

    console.log(`[SubtaskOrchestrator] Subtask started: ${subtask.id} (depth: ${taskNumber}, parent: ${parentTask.id})`)

    // Wait for subtask to complete
    return this.waitForSubtask(subtask.id)
  }

  /**
   * Wait for a subtask to complete
   * @param subtaskId - ID of the subtask to wait for
   * @returns Promise<SubtaskResult> - Resolves when subtask completes
   */
  async waitForSubtask(subtaskId: string): Promise<SubtaskResult> {
    return new Promise((resolve, reject) => {
      const onComplete = (taskId: string, result: SubtaskResult) => {
        if (taskId === subtaskId) {
          this.removeListener('subtask-complete', onComplete)
          this.removeListener('subtask-error', onError)
          resolve(result)
        }
      }

      const onError = (taskId: string, error: Error) => {
        if (taskId === subtaskId) {
          this.removeListener('subtask-complete', onComplete)
          this.removeListener('subtask-error', onError)
          reject(error)
        }
      }

      this.on('subtask-complete', onComplete)
      this.on('subtask-error', onError)
    })
  }

  /**
   * Complete the current subtask and return to parent
   * @param result - Subtask result
   */
  async completeSubtask(result?: any): Promise<void> {
    if (!this.currentTask) {
      throw new Error('No active task to complete')
    }

    const completedTask = this.currentTask
    const task = await this.taskManager.getTask(completedTask.id)

    if (!task) {
      throw new Error(`Task ${completedTask.id} not found`)
    }

    // Mark as completed
    await this.taskManager.updateTask(completedTask.id, {
      status: 'completed',
      completedAt: Date.now()
    })

    // Build result
    const subtaskResult: SubtaskResult = {
      taskId: completedTask.id,
      status: 'completed',
      result,
      messages: task.messages,
      fileChanges: task.metadata.fileChanges,
      apiMetrics: task.apiMetrics
    }

    // Pop from stack
    this.popFromStack()

    // Resume parent if exists
    if (completedTask.relationship.parentTaskId) {
      await this.resumeParentTask(completedTask.relationship.parentTaskId)

      this.emitEvent({
        type: 'subtask-completed',
        taskId: completedTask.id,
        parentTaskId: completedTask.relationship.parentTaskId,
        result: subtaskResult
      })

      this.emit('subtask-complete', completedTask.id, subtaskResult)
    }

    console.log(`[SubtaskOrchestrator] Subtask completed: ${completedTask.id}`)
  }

  /**
   * Pause a task
   */
  async pauseTask(taskId: string, reason: TaskPauseState['reason']): Promise<void> {
    const task = await this.findTaskInStack(taskId)
    if (!task) {
      throw new Error(`Task ${taskId} not found in stack`)
    }

    const fullTask = await this.taskManager.getTask(taskId)
    if (!fullTask) {
      throw new Error(`Task ${taskId} not found`)
    }

    const pauseState: TaskPauseState = {
      pausedAt: Date.now(),
      reason,
      messageIndexAtPause: fullTask.messages.length,
      contextAtPause: {
        apiMessages: [], // Would be populated from ConversationTask
        taskMessages: [],
        toolResults: []
      },
      resumable: true
    }

    task.pauseState = pauseState

    await this.taskManager.updateTask(taskId, {
      status: 'active', // Keep as active but with pause state
      metadata: {
        ...fullTask.metadata,
        pauseState: pauseState as any
      }
    })

    this.emitEvent({
      type: 'task-paused',
      taskId,
      reason
    })

    console.log(`[SubtaskOrchestrator] Task paused: ${taskId} (reason: ${reason})`)
  }

  /**
   * Resume a paused task
   */
  async resumeTask(taskId: string): Promise<void> {
    const task = await this.findTaskInStack(taskId)
    if (!task) {
      throw new Error(`Task ${taskId} not found in stack`)
    }

    if (!task.pauseState) {
      console.warn(`Task ${taskId} is not paused`)
      return
    }

    delete task.pauseState

    await this.taskManager.updateTask(taskId, {
      metadata: {
        ...(await this.taskManager.getTask(taskId))!.metadata,
        pauseState: undefined
      }
    })

    this.emitEvent({
      type: 'task-resumed',
      taskId
    })

    console.log(`[SubtaskOrchestrator] Task resumed: ${taskId}`)
  }

  /**
   * Resume parent task after subtask completion
   */
  private async resumeParentTask(parentTaskId: string): Promise<void> {
    const parentTask = await this.findTaskInStack(parentTaskId)
    if (!parentTask) {
      throw new Error(`Parent task ${parentTaskId} not found`)
    }

    await this.resumeTask(parentTaskId)
    this.currentTask = parentTask
  }

  /**
   * Get current task stack
   */
  getTaskStack(): TaskStackEntry[] {
    return [...this.taskStack]
  }

  /**
   * Get current task
   */
  getCurrentTask(): SubtaskCapableTask | null {
    return this.currentTask
  }

  /**
   * Get task depth (nesting level)
   */
  getTaskDepth(taskId: string): number | null {
    const task = this.taskStack.find(entry => entry.taskId === taskId)
    return task ? task.task.relationship.taskNumber : null
  }

  /**
   * Get parent task
   */
  async getParentTask(taskId: string): Promise<SubtaskCapableTask | null> {
    const task = await this.findTaskInStack(taskId)
    if (!task || !task.relationship.parentTaskId) {
      return null
    }
    return this.findTaskInStack(task.relationship.parentTaskId)
  }

  /**
   * Get child tasks
   */
  async getChildTasks(taskId: string): Promise<SubtaskCapableTask[]> {
    const task = await this.findTaskInStack(taskId)
    if (!task) {
      return []
    }

    const children: SubtaskCapableTask[] = []
    for (const childId of task.relationship.childTaskIds) {
      const child = await this.findTaskInStack(childId)
      if (child) {
        children.push(child)
      }
    }

    return children
  }

  /**
   * Add message to current task
   */
  async addMessage(message: ClineMessage): Promise<void> {
    if (!this.currentTask) {
      throw new Error('No active task')
    }

    await this.taskManager.addMessage(this.currentTask.id, message)
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer)
      this.autoSaveTimer = null
    }
    this.removeAllListeners()
  }

  // ============ Private Helper Methods ============

  private enhanceTaskWithSubtaskCapabilities(
    task: Task,
    relationship: SubtaskRelationship
  ): SubtaskCapableTask {
    return {
      ...task,
      relationship
    }
  }

  private pushToStack(task: SubtaskCapableTask): void {
    const entry: TaskStackEntry = {
      taskId: task.id,
      task,
      startedAt: Date.now()
    }
    this.taskStack.push(entry)
  }

  private popFromStack(): TaskStackEntry | undefined {
    return this.taskStack.pop()
  }

  private async findTaskInStack(taskId: string): Promise<SubtaskCapableTask | null> {
    const entry = this.taskStack.find(e => e.taskId === taskId)
    return entry ? entry.task : null
  }

  private emitEvent(event: SubtaskEvent): void {
    this.emit('subtask-event', event)
  }

  private startAutoSave(): void {
    if (this.autoSaveTimer) {
      return
    }

    this.autoSaveTimer = setInterval(async () => {
      if (this.currentTask) {
        try {
          const stackData = this.taskStack.map(entry => ({
            taskId: entry.taskId,
            startedAt: entry.startedAt,
            pausedAt: entry.pausedAt,
            relationship: entry.task.relationship,
            pauseState: entry.task.pauseState
          }))

          // Store stack in workspace state
          await vscode.workspace
            .getConfiguration('oropendola')
            .update('taskStack', stackData, vscode.ConfigurationTarget.Workspace)

          console.log(`[SubtaskOrchestrator] Auto-saved task stack (${this.taskStack.length} tasks)`)
        } catch (error) {
          console.error('[SubtaskOrchestrator] Auto-save failed:', error)
        }
      }
    }, this.config.autoSaveInterval)
  }

  /**
   * Restore task stack from saved state
   */
  async restoreTaskStack(): Promise<void> {
    const config = vscode.workspace.getConfiguration('oropendola')
    const savedStack = config.get<any[]>('taskStack')

    if (!savedStack || savedStack.length === 0) {
      console.log('[SubtaskOrchestrator] No saved task stack found')
      return
    }

    console.log(`[SubtaskOrchestrator] Restoring task stack (${savedStack.length} tasks)`)

    for (const entry of savedStack) {
      const task = await this.taskManager.getTask(entry.taskId)
      if (task) {
        const subtaskTask = this.enhanceTaskWithSubtaskCapabilities(task, entry.relationship)
        if (entry.pauseState) {
          subtaskTask.pauseState = entry.pauseState
        }

        this.taskStack.push({
          taskId: entry.taskId,
          task: subtaskTask,
          startedAt: entry.startedAt,
          pausedAt: entry.pausedAt
        })
      }
    }

    // Set current task to top of stack
    if (this.taskStack.length > 0) {
      this.currentTask = this.taskStack[this.taskStack.length - 1].task
      console.log(`[SubtaskOrchestrator] Current task: ${this.currentTask.id}`)
    }
  }
}
