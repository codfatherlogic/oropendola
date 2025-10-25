// Task Management Type Definitions
// Sprint 1-2: Task Persistence Layer

export interface Task {
  // Core fields
  id: string                    // UUID v4
  text: string                  // Task description
  status: TaskStatus            // active | completed | failed | terminated

  // Timestamps
  createdAt: number             // Unix timestamp (ms)
  updatedAt: number             // Unix timestamp (ms)
  completedAt?: number          // Unix timestamp (ms)

  // Conversation data
  conversationId: string        // Links to backend conversation
  messages: ClineMessage[]      // Full conversation history

  // API metrics
  apiMetrics: CombinedApiMetrics

  // Context tracking
  contextTokens: number         // Current context window usage
  contextWindow: number         // Max context window (200k default)

  // Checkpoints
  checkpoints: Checkpoint[]     // Snapshots for restore
  currentCheckpoint?: string    // Active checkpoint ID

  // Metadata
  metadata: TaskMetadata
}

export type TaskStatus =
  | 'active'      // Currently running
  | 'completed'   // Finished successfully
  | 'failed'      // Error occurred
  | 'terminated'  // User stopped

export interface TaskMetadata {
  version: string               // Extension version
  mode: string                  // architect | code | ask
  model: string                 // claude-3-5-sonnet-20241022
  totalDuration?: number        // Total time in ms
  fileChanges?: FileChange[]    // Files modified
  tags?: string[]               // User tags
  error?: string                // Error message if failed
  stack?: string                // Stack trace if failed
}

export interface Checkpoint {
  id: string                    // UUID v4
  timestamp: number             // Unix timestamp (ms)
  messageIndex: number          // Message count at checkpoint
  contextTokens: number         // Context usage at checkpoint
  label?: string                // User label
}

export interface CombinedApiMetrics {
  tokensIn: number              // Total input tokens
  tokensOut: number             // Total output tokens
  cacheWrites: number           // Cache writes
  cacheReads: number            // Cache reads
  totalCost: number             // Total cost in USD
  contextTokens: number         // Current context usage
}

export interface ClineMessage {
  ts: number
  type: 'ask' | 'say'
  ask?: string
  say?: string
  text?: string
  images?: string[]
  partial?: boolean
  tool?: any
  apiMetrics?: ApiMetrics
}

export interface ApiMetrics {
  cost?: number
  tokensIn?: number
  tokensOut?: number
  cacheWrites?: number
  cacheReads?: number
  apiRequestId?: string
}

export interface FileChange {
  path: string
  type: 'create' | 'update' | 'delete'
  timestamp: number
}

// Task Storage Interface
export interface TaskStorageInterface {
  createTask(task: Partial<Task>): Promise<Task>
  getTask(id: string): Promise<Task | null>
  updateTask(id: string, updates: Partial<Task>): Promise<Task>
  deleteTask(id: string): Promise<boolean>
  listTasks(filters?: TaskFilters): Promise<Task[]>
  exportTask(id: string, format: ExportFormat): Promise<string>
  getStats(): Promise<TaskStats>
  close(): Promise<void>
}

export interface TaskFilters {
  status?: TaskStatus
  limit?: number
  offset?: number
  sortBy?: 'createdAt' | 'updatedAt'
  sortOrder?: 'ASC' | 'DESC'
  search?: string
}

export type ExportFormat = 'json' | 'txt' | 'md'

export interface TaskStats {
  total: number
  active: number
  completed: number
  failed: number
  terminated: number
}

// Task Manager Events
export interface TaskManagerEvents {
  taskCreated: (task: Task) => void
  taskUpdated: (task: Task) => void
  taskLoaded: (task: Task) => void
  taskDeleted: (taskId: string) => void
  taskCompleted: (task: Task) => void
  taskTerminated: (task: Task) => void
  taskFailed: (task: Task, error: Error) => void
}
