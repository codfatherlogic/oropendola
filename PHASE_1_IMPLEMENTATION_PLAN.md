# PHASE 1: CORE FOUNDATION - IMPLEMENTATION PLAN
## Oropendola AI v3.6.0 - Roo-Code Full Parity

**Start Date:** October 26, 2025
**Duration:** 5 months (20 weeks)
**Effort:** 1,100 hours
**Team:** 1 Senior Full-Stack Engineer
**Budget:** $90,000 (Phase 1 portion)

---

## OVERVIEW

Phase 1 establishes the foundational systems required for Roo-Code parity:
- Task Persistence & Management
- Context Intelligence & Condensing
- Auto-Approval System
- Checkpoint/Snapshot System

These are **critical** features without which the extension cannot function at production quality.

---

## SPRINT 1-2: TASK PERSISTENCE LAYER
**Duration:** 6 weeks (Oct 26 - Dec 7, 2025)
**Effort:** 240 hours
**Goal:** Tasks persist across VS Code sessions with full CRUD operations

### Week 1-2: Database Schema & Architecture (80 hrs)

#### Deliverables

**1. SQLite Database Schema**
```sql
-- tasks table
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    name TEXT NOT NULL,
    state TEXT NOT NULL CHECK(state IN ('active', 'paused', 'completed', 'archived')),
    messages_json TEXT NOT NULL,
    metadata_json TEXT NOT NULL,
    settings_json TEXT NOT NULL,
    size_bytes INTEGER DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0
);

-- indexes for performance
CREATE INDEX idx_tasks_state ON tasks(state);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
CREATE INDEX idx_tasks_updated_at ON tasks(updated_at);
CREATE INDEX idx_tasks_name ON tasks(name);

-- Full-text search
CREATE VIRTUAL TABLE tasks_fts USING fts5(
    id,
    name,
    messages_text,
    content='tasks'
);
```

**2. TypeScript Interfaces**
```typescript
// src/types/task.ts
export interface Task {
  id: string                    // UUID v4
  createdAt: number              // Unix timestamp ms
  updatedAt: number              // Unix timestamp ms
  name: string                   // User-provided or auto-generated
  state: TaskState
  messages: ClineMessage[]
  metadata: TaskMetadata
  settings: TaskSettings
}

export type TaskState = 'active' | 'paused' | 'completed' | 'archived'

export interface TaskMetadata {
  tokensIn: number
  tokensOut: number
  cacheReads: number
  cacheWrites: number
  totalCost: number
  sizeBytes: number              // Total size of task data
  durationSeconds: number        // Time spent on task
  provider?: string              // Last AI provider used
  model?: string                 // Last model used
}

export interface TaskSettings {
  mode: string                   // 'agent' | 'ask' | 'code'
  apiConfig: string              // API configuration name
  autoApprovalEnabled: boolean
  autoApproveToggles: Record<string, boolean>
}

export interface TaskFilter {
  state?: TaskState[]
  createdAfter?: number
  createdBefore?: number
  searchQuery?: string
  limit?: number
  offset?: number
}
```

**3. TaskStorage Service**
```typescript
// src/services/TaskStorage.ts
import * as sqlite3 from 'sqlite3'
import { open, Database } from 'sqlite'
import * as path from 'path'
import * as fs from 'fs'
import { Task, TaskFilter } from '../types/task'

export class TaskStorage {
  private db: Database | null = null
  private dbPath: string

  constructor(storagePath: string) {
    this.dbPath = path.join(storagePath, 'tasks.db')
  }

  async initialize(): Promise<void> {
    // Ensure directory exists
    const dir = path.dirname(this.dbPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    // Open database
    this.db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database
    })

    // Run migrations
    await this.runMigrations()
  }

  private async runMigrations(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    // Create tasks table if not exists
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        name TEXT NOT NULL,
        state TEXT NOT NULL CHECK(state IN ('active', 'paused', 'completed', 'archived')),
        messages_json TEXT NOT NULL,
        metadata_json TEXT NOT NULL,
        settings_json TEXT NOT NULL,
        size_bytes INTEGER DEFAULT 0,
        duration_seconds INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_state ON tasks(state);
      CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
      CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);
      CREATE INDEX IF NOT EXISTS idx_tasks_name ON tasks(name);

      CREATE VIRTUAL TABLE IF NOT EXISTS tasks_fts USING fts5(
        id,
        name,
        messages_text,
        content='tasks'
      );
    `)
  }

  async save(task: Task): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const messagesText = task.messages.map(m => m.text || '').join(' ')
    const sizeBytes = JSON.stringify(task).length

    await this.db.run(`
      INSERT OR REPLACE INTO tasks (
        id, created_at, updated_at, name, state,
        messages_json, metadata_json, settings_json,
        size_bytes, duration_seconds
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      task.id,
      task.createdAt,
      task.updatedAt,
      task.name,
      task.state,
      JSON.stringify(task.messages),
      JSON.stringify(task.metadata),
      JSON.stringify(task.settings),
      sizeBytes,
      task.metadata.durationSeconds
    ])

    // Update FTS index
    await this.db.run(`
      INSERT OR REPLACE INTO tasks_fts (id, name, messages_text)
      VALUES (?, ?, ?)
    `, [task.id, task.name, messagesText])
  }

  async load(taskId: string): Promise<Task | null> {
    if (!this.db) throw new Error('Database not initialized')

    const row = await this.db.get(
      'SELECT * FROM tasks WHERE id = ?',
      taskId
    )

    if (!row) return null

    return {
      id: row.id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      name: row.name,
      state: row.state,
      messages: JSON.parse(row.messages_json),
      metadata: JSON.parse(row.metadata_json),
      settings: JSON.parse(row.settings_json)
    }
  }

  async delete(taskId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    await this.db.run('DELETE FROM tasks WHERE id = ?', taskId)
    await this.db.run('DELETE FROM tasks_fts WHERE id = ?', taskId)
  }

  async list(filter?: TaskFilter): Promise<Task[]> {
    if (!this.db) throw new Error('Database not initialized')

    let query = 'SELECT * FROM tasks WHERE 1=1'
    const params: any[] = []

    if (filter?.state && filter.state.length > 0) {
      query += ` AND state IN (${filter.state.map(() => '?').join(',')})`
      params.push(...filter.state)
    }

    if (filter?.createdAfter) {
      query += ' AND created_at >= ?'
      params.push(filter.createdAfter)
    }

    if (filter?.createdBefore) {
      query += ' AND created_at <= ?'
      params.push(filter.createdBefore)
    }

    query += ' ORDER BY updated_at DESC'

    if (filter?.limit) {
      query += ' LIMIT ?'
      params.push(filter.limit)
    }

    if (filter?.offset) {
      query += ' OFFSET ?'
      params.push(filter.offset)
    }

    const rows = await this.db.all(query, params)

    return rows.map(row => ({
      id: row.id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      name: row.name,
      state: row.state,
      messages: JSON.parse(row.messages_json),
      metadata: JSON.parse(row.metadata_json),
      settings: JSON.parse(row.settings_json)
    }))
  }

  async search(query: string, limit: number = 50): Promise<Task[]> {
    if (!this.db) throw new Error('Database not initialized')

    const rows = await this.db.all(`
      SELECT t.* FROM tasks t
      JOIN tasks_fts fts ON t.id = fts.id
      WHERE tasks_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `, [query, limit])

    return rows.map(row => ({
      id: row.id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      name: row.name,
      state: row.state,
      messages: JSON.parse(row.messages_json),
      metadata: JSON.parse(row.metadata_json),
      settings: JSON.parse(row.settings_json)
    }))
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close()
      this.db = null
    }
  }
}
```

#### Files to Create

```
src/
├── types/
│   ├── task.ts                 (NEW - 150 lines)
│   └── index.ts                (UPDATE - add exports)
├── services/
│   ├── TaskStorage.ts          (NEW - 300 lines)
│   └── index.ts                (UPDATE - add exports)
└── core/
    └── TaskManager.ts          (NEW - Week 3-4)
```

#### Acceptance Criteria
- [✅] SQLite database initializes on extension activation
- [✅] Tasks save without errors
- [✅] Tasks load in < 100ms
- [✅] Search returns results in < 200ms
- [✅] All TypeScript types compile
- [✅] Unit tests pass (80% coverage)

---

### Week 3-4: Task Creation & Management UI (80 hrs)

#### Deliverables

**1. TaskManager Service**
```typescript
// src/core/TaskManager.ts
import { v4 as uuidv4 } from 'uuid'
import { Task, TaskState, TaskSettings } from '../types/task'
import { TaskStorage } from '../services/TaskStorage'
import { ClineMessage } from '../types/cline-message'

export class TaskManager {
  private storage: TaskStorage
  private currentTask: Task | null = null
  private tasks: Map<string, Task> = new Map()

  constructor(storage: TaskStorage) {
    this.storage = storage
  }

  async initialize(): Promise<void> {
    await this.storage.initialize()

    // Load active task if exists
    const activeTasks = await this.storage.list({
      state: ['active'],
      limit: 1
    })

    if (activeTasks.length > 0) {
      this.currentTask = activeTasks[0]
      this.tasks.set(this.currentTask.id, this.currentTask)
    }
  }

  async createTask(name?: string, settings?: Partial<TaskSettings>): Promise<Task> {
    const now = Date.now()
    const task: Task = {
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      name: name || `Task ${new Date().toLocaleString()}`,
      state: 'active',
      messages: [],
      metadata: {
        tokensIn: 0,
        tokensOut: 0,
        cacheReads: 0,
        cacheWrites: 0,
        totalCost: 0,
        sizeBytes: 0,
        durationSeconds: 0
      },
      settings: {
        mode: settings?.mode || 'agent',
        apiConfig: settings?.apiConfig || 'default',
        autoApprovalEnabled: settings?.autoApprovalEnabled ?? false,
        autoApproveToggles: settings?.autoApproveToggles || {}
      }
    }

    await this.storage.save(task)
    this.tasks.set(task.id, task)
    this.currentTask = task

    return task
  }

  async loadTask(taskId: string): Promise<Task | null> {
    // Check cache first
    if (this.tasks.has(taskId)) {
      return this.tasks.get(taskId)!
    }

    // Load from storage
    const task = await this.storage.load(taskId)
    if (task) {
      this.tasks.set(taskId, task)
    }
    return task
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    const task = await this.loadTask(taskId)
    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    const updatedTask: Task = {
      ...task,
      ...updates,
      updatedAt: Date.now()
    }

    await this.storage.save(updatedTask)
    this.tasks.set(taskId, updatedTask)

    if (this.currentTask?.id === taskId) {
      this.currentTask = updatedTask
    }

    return updatedTask
  }

  async addMessage(taskId: string, message: ClineMessage): Promise<Task> {
    const task = await this.loadTask(taskId)
    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    task.messages.push(message)

    // Update metadata from message
    if (message.apiMetrics) {
      task.metadata.tokensIn += message.apiMetrics.inputTokens || 0
      task.metadata.tokensOut += message.apiMetrics.outputTokens || 0
      task.metadata.cacheReads += message.apiMetrics.cacheReadTokens || 0
      task.metadata.cacheWrites += message.apiMetrics.cacheWriteTokens || 0
      task.metadata.totalCost += message.apiMetrics.cost || 0
    }

    return await this.updateTask(taskId, task)
  }

  async pauseTask(taskId: string): Promise<Task> {
    return await this.updateTask(taskId, { state: 'paused' })
  }

  async resumeTask(taskId: string): Promise<Task> {
    const task = await this.updateTask(taskId, { state: 'active' })
    this.currentTask = task
    return task
  }

  async completeTask(taskId: string): Promise<Task> {
    return await this.updateTask(taskId, { state: 'completed' })
  }

  async archiveTask(taskId: string): Promise<Task> {
    return await this.updateTask(taskId, { state: 'archived' })
  }

  async deleteTask(taskId: string): Promise<void> {
    await this.storage.delete(taskId)
    this.tasks.delete(taskId)

    if (this.currentTask?.id === taskId) {
      this.currentTask = null
    }
  }

  getCurrentTask(): Task | null {
    return this.currentTask
  }

  async listTasks(filter?: any): Promise<Task[]> {
    return await this.storage.list(filter)
  }

  async searchTasks(query: string): Promise<Task[]> {
    return await this.storage.search(query)
  }
}
```

**2. React Components**

```tsx
// webview-ui/src/components/Task/TaskCreationDialog.tsx
import React, { useState } from 'react'
import { vscode } from '../../utils/vscode'

interface TaskCreationDialogProps {
  isOpen: boolean
  onClose: () => void
}

export const TaskCreationDialog: React.FC<TaskCreationDialogProps> = ({
  isOpen,
  onClose
}) => {
  const [taskName, setTaskName] = useState('')
  const [mode, setMode] = useState('agent')

  const handleCreate = () => {
    vscode.postMessage({
      type: 'createTask',
      name: taskName || undefined,
      settings: { mode }
    })
    setTaskName('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="roo-dialog-overlay" onClick={onClose}>
      <div className="roo-dialog" onClick={e => e.stopPropagation()}>
        <div className="roo-dialog-header">
          <h2>Create New Task</h2>
          <button className="roo-icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="roo-dialog-content">
          <div className="roo-form-group">
            <label htmlFor="task-name">Task Name (optional)</label>
            <input
              id="task-name"
              type="text"
              className="roo-input"
              placeholder="Leave empty for auto-generated name"
              value={taskName}
              onChange={e => setTaskName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="roo-form-group">
            <label htmlFor="task-mode">Mode</label>
            <select
              id="task-mode"
              className="roo-select"
              value={mode}
              onChange={e => setMode(e.target.value)}
            >
              <option value="agent">Agent (autonomous)</option>
              <option value="ask">Ask (plan first)</option>
              <option value="code">Code (focused)</option>
            </select>
          </div>
        </div>

        <div className="roo-dialog-footer">
          <button className="roo-btn roo-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="roo-btn roo-btn-primary" onClick={handleCreate}>
            Create Task
          </button>
        </div>
      </div>
    </div>
  )
}
```

```tsx
// webview-ui/src/components/Task/TaskStateControls.tsx
import React from 'react'
import { Task } from '../../types/task'
import { vscode } from '../../utils/vscode'

interface TaskStateControlsProps {
  task: Task
}

export const TaskStateControls: React.FC<TaskStateControlsProps> = ({
  task
}) => {
  const handlePause = () => {
    vscode.postMessage({
      type: 'pauseTask',
      taskId: task.id
    })
  }

  const handleResume = () => {
    vscode.postMessage({
      type: 'resumeTask',
      taskId: task.id
    })
  }

  const handleComplete = () => {
    vscode.postMessage({
      type: 'completeTask',
      taskId: task.id
    })
  }

  const handleArchive = () => {
    vscode.postMessage({
      type: 'archiveTask',
      taskId: task.id
    })
  }

  return (
    <div className="roo-task-controls">
      {task.state === 'active' && (
        <>
          <button className="roo-btn roo-btn-sm" onClick={handlePause}>
            ⏸ Pause
          </button>
          <button className="roo-btn roo-btn-sm roo-btn-success" onClick={handleComplete}>
            ✓ Complete
          </button>
        </>
      )}

      {task.state === 'paused' && (
        <>
          <button className="roo-btn roo-btn-sm roo-btn-primary" onClick={handleResume}>
            ▶ Resume
          </button>
          <button className="roo-btn roo-btn-sm" onClick={handleArchive}>
            📦 Archive
          </button>
        </>
      )}

      {task.state === 'completed' && (
        <button className="roo-btn roo-btn-sm" onClick={handleArchive}>
          📦 Archive
        </button>
      )}

      <span className="roo-task-state-badge roo-state-{task.state}">
        {task.state.toUpperCase()}
      </span>
    </div>
  )
}
```

#### Files to Create

```
src/core/
└── TaskManager.ts              (NEW - 200 lines)

webview-ui/src/components/Task/
├── TaskCreationDialog.tsx      (NEW - 150 lines)
├── TaskStateControls.tsx       (NEW - 100 lines)
├── TaskDeletionDialog.tsx      (NEW - 80 lines)
└── index.ts                    (UPDATE - add exports)

webview-ui/src/styles/
└── TaskDialogs.css             (NEW - 200 lines)
```

#### Acceptance Criteria
- [✅] User can create task with custom name
- [✅] Auto-generated task ID is visible
- [✅] Task state transitions work (active → paused → completed → archived)
- [✅] Cannot delete active task without confirmation
- [✅] All state changes persist to database

---

### Week 5-6: Task History View (80 hrs)

**Deliverable:** Full history view with search, filter, preview

*Detailed specs to be provided in Week 5 kickoff...*

---

## SPRINT 3-4: CONTEXT INTELLIGENCE
**Duration:** 6 weeks (Dec 8 - Jan 18, 2026)
**Effort:** 300 hours
**Goal:** Real-time token tracking, context condensing, cost calculation

*Detailed specs to be provided after Sprint 1-2 completion...*

---

## SPRINT 5-6: AUTO-APPROVAL SYSTEM
**Duration:** 4 weeks (Jan 19 - Feb 15, 2026)
**Effort:** 200 hours
**Goal:** Backend approval logic + UI integration

*Detailed specs to be provided after Sprint 3-4 completion...*

---

## SPRINT 7-8: CHECKPOINT SYSTEM
**Duration:** 4 weeks (Feb 16 - Mar 15, 2026)
**Effort:** 200 hours
**Goal:** Snapshot creation, restoration, branching

*Detailed specs to be provided after Sprint 5-6 completion...*

---

## SPRINT 9: INTEGRATION & TESTING
**Duration:** 2 weeks (Mar 16 - Mar 29, 2026)
**Effort:** 160 hours
**Goal:** All Phase 1 features working together, tested, documented

*Detailed specs to be provided after Sprint 7-8 completion...*

---

## SUCCESS METRICS

### Phase 1 Completion Criteria

| Metric | Target | Status |
|--------|--------|--------|
| Task Creation Time | < 5 seconds | TBD |
| Task Load Time | < 100ms | TBD |
| Context Condensing Quality | > 70% BLEU | TBD |
| Token Tracking Accuracy | 100% | TBD |
| Auto-Approval Accuracy | 100% | TBD |
| Checkpoint Create Time | < 500ms | TBD |
| Test Coverage | > 80% | TBD |
| User Satisfaction | > 4.0/5.0 | TBD |

---

## NEXT STEPS

### Immediate (This Week)
1. ✅ Install dependencies: `npm install sqlite3 sqlite uuid --save`
2. ⏳ Create `src/types/task.ts` interface file
3. ⏳ Create `src/services/TaskStorage.ts` service
4. ⏳ Create `src/core/TaskManager.ts` manager
5. ⏳ Write unit tests for TaskStorage

### Week 2
1. Complete TaskStorage implementation
2. Integration testing with real database
3. Performance benchmarking (10k tasks)

### Week 3
1. Build TaskCreationDialog component
2. Build TaskStateControls component
3. Build TaskDeletionDialog component
4. Wire up message handlers in extension

---

**Document Version:** 1.0
**Last Updated:** October 26, 2025
**Next Review:** End of Week 2 (Nov 9, 2025)
