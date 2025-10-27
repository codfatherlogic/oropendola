/**
 * Subtask System Type Definitions
 * 
 * Implements Roo-Code style multi-task orchestration with parent/child relationships
 */

import { Task, TaskStatus, ClineMessage } from './task'

/**
 * Extended TaskStatus for subtask support
 */
export type SubtaskStatus = TaskStatus | 'waiting-for-subtask' | 'paused'

/**
 * Subtask relationship types
 */
export interface SubtaskRelationship {
  parentTaskId: string | null    // Parent task ID (null for root tasks)
  childTaskIds: string[]          // Array of child task IDs
  taskNumber: number               // Depth level (0 for root, 1 for first level subtasks, etc.)
  siblingIndex: number             // Position among siblings (0-based)
}

/**
 * Extended Task interface with subtask support
 */
export interface SubtaskCapableTask extends Task {
  relationship: SubtaskRelationship
  pauseState?: TaskPauseState
}

/**
 * Task pause state for resumption
 */
export interface TaskPauseState {
  pausedAt: number                 // Unix timestamp
  reason: 'user-request' | 'waiting-for-subtask' | 'system'
  messageIndexAtPause: number      // Position in message array
  contextAtPause: {
    apiMessages: any[]
    taskMessages: any[]
    toolResults: any[]
  }
  resumable: boolean
}

/**
 * Task stack entry
 */
export interface TaskStackEntry {
  taskId: string
  task: SubtaskCapableTask
  startedAt: number
  pausedAt?: number
}

/**
 * Subtask lifecycle events
 */
export type SubtaskEvent =
  | { type: 'subtask-started'; taskId: string; parentTaskId: string; taskNumber: number }
  | { type: 'subtask-completed'; taskId: string; parentTaskId: string; result: any }
  | { type: 'subtask-failed'; taskId: string; parentTaskId: string; error: Error }
  | { type: 'task-paused'; taskId: string; reason: string }
  | { type: 'task-resumed'; taskId: string }
  | { type: 'task-spawned'; taskId: string; spawnedFrom: string }

/**
 * Subtask orchestrator configuration
 */
export interface SubtaskOrchestratorConfig {
  maxDepth: number                 // Maximum nesting depth (default: 3)
  maxConcurrentSubtasks: number    // Max parallel subtasks (default: 1 for sequential)
  enablePauseResume: boolean       // Enable pause/resume functionality
  autoSaveInterval: number         // Auto-save interval in ms (default: 30000)
}

/**
 * Subtask result
 */
export interface SubtaskResult {
  taskId: string
  status: 'completed' | 'failed' | 'terminated'
  result?: any
  error?: Error
  messages: ClineMessage[]
  fileChanges?: any[]
  apiMetrics: any
}
