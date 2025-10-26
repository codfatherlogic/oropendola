# TASK MANAGEMENT SYSTEM - TECHNICAL DESIGN

**Sprint:** 1-2 (Week 1-6)
**Effort:** 240 hours
**Goal:** Complete task persistence layer with full lifecycle support

---

## 1. OVERVIEW

### Purpose
Implement enterprise-grade task management matching Roo Code's functionality:
- Create, save, load, delete tasks
- Task history with search/filter
- Export to JSON/TXT/Markdown
- Task metadata tracking
- Resume/terminate controls

### Success Criteria
- ✅ Tasks persist across extension restarts
- ✅ Task history view working
- ✅ Export functionality complete
- ✅ Load time < 100ms
- ✅ 80% test coverage

---

## 2. ARCHITECTURE

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                      WEBVIEW (React)                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  TaskHeader  │  HistoryView  │  TaskActions            │ │
│  └────────────────────────────────────────────────────────┘ │
│                            ↕ postMessage                     │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                   EXTENSION (Node.js)                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │               TaskManager.js                            │ │
│  │  - createTask()    - deleteTask()                       │ │
│  │  - saveTask()      - exportTask()                       │ │
│  │  - loadTask()      - listTasks()                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                            ↕                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │               TaskStorage.js                            │ │
│  │  - SQLite database                                      │ │
│  │  - Task CRUD operations                                 │ │
│  │  - Query/filter support                                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                            ↕                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │      ~/.oropendola/tasks.db (SQLite)                    │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

**Create Task Flow:**
1. User enters task text in UI
2. Webview sends `createTask` message → Extension
3. TaskManager.createTask() generates ID, creates Task object
4. TaskStorage.save() persists to SQLite
5. Extension sends task back to webview
6. UI updates TaskHeader with task info

**Load Task Flow:**
1. User clicks task in HistoryView
2. Webview sends `loadTask` message with taskId → Extension
3. TaskManager.loadTask(id) calls TaskStorage.getById(id)
4. Extension reconstructs ConversationTask from stored data
5. Extension sends task + messages to webview
6. UI renders conversation with full history

---

## 3. DATA MODELS

### Task Interface (TypeScript)

```typescript
// src/types/task.ts

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
```

### Database Schema (SQLite)

```sql
-- src/services/storage/schema.sql

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',

  -- Timestamps
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  completedAt INTEGER,

  -- Conversation data
  conversationId TEXT NOT NULL,
  messages TEXT NOT NULL,  -- JSON array

  -- API metrics (JSON object)
  apiMetrics TEXT NOT NULL,

  -- Context tracking
  contextTokens INTEGER DEFAULT 0,
  contextWindow INTEGER DEFAULT 200000,

  -- Checkpoints (JSON array)
  checkpoints TEXT DEFAULT '[]',
  currentCheckpoint TEXT,

  -- Metadata (JSON object)
  metadata TEXT NOT NULL,

  -- Indexes for search
  UNIQUE(conversationId)
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_createdAt ON tasks(createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_text ON tasks(text);

-- Full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS tasks_fts USING fts5(
  id UNINDEXED,
  text,
  content=tasks,
  content_rowid=rowid
);

-- FTS triggers
CREATE TRIGGER IF NOT EXISTS tasks_fts_insert AFTER INSERT ON tasks
BEGIN
  INSERT INTO tasks_fts(rowid, id, text) VALUES (new.rowid, new.id, new.text);
END;

CREATE TRIGGER IF NOT EXISTS tasks_fts_delete AFTER DELETE ON tasks
BEGIN
  DELETE FROM tasks_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER IF NOT EXISTS tasks_fts_update AFTER UPDATE ON tasks
BEGIN
  UPDATE tasks_fts SET text = new.text WHERE rowid = old.rowid;
END;
```

---

## 4. IMPLEMENTATION PLAN

### Phase 1: Database Layer (Week 1, 80 hrs)

#### File: `src/services/storage/TaskStorage.js`

```javascript
// src/services/storage/TaskStorage.js

const sqlite3 = require('sqlite3').verbose()
const path = require('path')
const fs = require('fs').promises
const { v4: uuidv4 } = require('uuid')

class TaskStorage {
  constructor(storagePath) {
    this.storagePath = storagePath
    this.dbPath = path.join(storagePath, 'tasks.db')
    this.db = null
  }

  /**
   * Initialize database connection and schema
   */
  async initialize() {
    // Ensure storage directory exists
    await fs.mkdir(this.storagePath, { recursive: true })

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) return reject(err)
        this._initSchema()
          .then(resolve)
          .catch(reject)
      })
    })
  }

  /**
   * Create database schema
   */
  async _initSchema() {
    const schema = `
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        completedAt INTEGER,
        conversationId TEXT NOT NULL,
        messages TEXT NOT NULL,
        apiMetrics TEXT NOT NULL,
        contextTokens INTEGER DEFAULT 0,
        contextWindow INTEGER DEFAULT 200000,
        checkpoints TEXT DEFAULT '[]',
        currentCheckpoint TEXT,
        metadata TEXT NOT NULL,
        UNIQUE(conversationId)
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_createdAt ON tasks(createdAt DESC);
      CREATE INDEX IF NOT EXISTS idx_tasks_text ON tasks(text);

      CREATE VIRTUAL TABLE IF NOT EXISTS tasks_fts USING fts5(
        id UNINDEXED,
        text,
        content=tasks,
        content_rowid=rowid
      );

      CREATE TRIGGER IF NOT EXISTS tasks_fts_insert AFTER INSERT ON tasks
      BEGIN
        INSERT INTO tasks_fts(rowid, id, text) VALUES (new.rowid, new.id, new.text);
      END;

      CREATE TRIGGER IF NOT EXISTS tasks_fts_delete AFTER DELETE ON tasks
      BEGIN
        DELETE FROM tasks_fts WHERE rowid = old.rowid;
      END;

      CREATE TRIGGER IF NOT EXISTS tasks_fts_update AFTER UPDATE ON tasks
      BEGIN
        UPDATE tasks_fts SET text = new.text WHERE rowid = old.rowid;
      END;
    `

    return this._exec(schema)
  }

  /**
   * Create new task
   */
  async createTask(task) {
    const id = task.id || uuidv4()
    const now = Date.now()

    const taskData = {
      id,
      text: task.text,
      status: task.status || 'active',
      createdAt: task.createdAt || now,
      updatedAt: now,
      completedAt: task.completedAt || null,
      conversationId: task.conversationId,
      messages: JSON.stringify(task.messages || []),
      apiMetrics: JSON.stringify(task.apiMetrics || this._emptyMetrics()),
      contextTokens: task.contextTokens || 0,
      contextWindow: task.contextWindow || 200000,
      checkpoints: JSON.stringify(task.checkpoints || []),
      currentCheckpoint: task.currentCheckpoint || null,
      metadata: JSON.stringify(task.metadata || {})
    }

    const sql = `
      INSERT INTO tasks (
        id, text, status, createdAt, updatedAt, completedAt,
        conversationId, messages, apiMetrics, contextTokens, contextWindow,
        checkpoints, currentCheckpoint, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    await this._run(sql, Object.values(taskData))
    return this.getTask(id)
  }

  /**
   * Get task by ID
   */
  async getTask(id) {
    const sql = 'SELECT * FROM tasks WHERE id = ?'
    const row = await this._get(sql, [id])
    return row ? this._deserializeTask(row) : null
  }

  /**
   * Update task
   */
  async updateTask(id, updates) {
    const task = await this.getTask(id)
    if (!task) {
      throw new Error(`Task not found: ${id}`)
    }

    const merged = { ...task, ...updates, updatedAt: Date.now() }
    const data = {
      text: merged.text,
      status: merged.status,
      updatedAt: merged.updatedAt,
      completedAt: merged.completedAt || null,
      messages: JSON.stringify(merged.messages),
      apiMetrics: JSON.stringify(merged.apiMetrics),
      contextTokens: merged.contextTokens,
      checkpoints: JSON.stringify(merged.checkpoints),
      currentCheckpoint: merged.currentCheckpoint || null,
      metadata: JSON.stringify(merged.metadata)
    }

    const sql = `
      UPDATE tasks SET
        text = ?, status = ?, updatedAt = ?, completedAt = ?,
        messages = ?, apiMetrics = ?, contextTokens = ?,
        checkpoints = ?, currentCheckpoint = ?, metadata = ?
      WHERE id = ?
    `

    await this._run(sql, [...Object.values(data), id])
    return this.getTask(id)
  }

  /**
   * Delete task
   */
  async deleteTask(id) {
    const sql = 'DELETE FROM tasks WHERE id = ?'
    await this._run(sql, [id])
    return true
  }

  /**
   * List tasks with filters
   */
  async listTasks(filters = {}) {
    const {
      status,
      limit = 100,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      search
    } = filters

    let sql = 'SELECT * FROM tasks'
    const params = []
    const conditions = []

    // Status filter
    if (status) {
      conditions.push('status = ?')
      params.push(status)
    }

    // Full-text search
    if (search) {
      sql = `
        SELECT tasks.* FROM tasks
        JOIN tasks_fts ON tasks.rowid = tasks_fts.rowid
        WHERE tasks_fts MATCH ?
      `
      params.unshift(search)
    }

    // Build WHERE clause
    if (conditions.length > 0 && !search) {
      sql += ' WHERE ' + conditions.join(' AND ')
    }

    // Sort and pagination
    sql += ` ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`
    params.push(limit, offset)

    const rows = await this._all(sql, params)
    return rows.map(row => this._deserializeTask(row))
  }

  /**
   * Export task to format
   */
  async exportTask(id, format = 'json') {
    const task = await this.getTask(id)
    if (!task) {
      throw new Error(`Task not found: ${id}`)
    }

    switch (format) {
      case 'json':
        return JSON.stringify(task, null, 2)

      case 'txt':
        return this._exportToText(task)

      case 'md':
        return this._exportToMarkdown(task)

      default:
        throw new Error(`Unsupported format: ${format}`)
    }
  }

  /**
   * Get task statistics
   */
  async getStats() {
    const sql = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'terminated' THEN 1 ELSE 0 END) as terminated
      FROM tasks
    `
    return this._get(sql, [])
  }

  /**
   * Close database connection
   */
  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) return reject(err)
          this.db = null
          resolve()
        })
      } else {
        resolve()
      }
    })
  }

  // Helper methods
  _exec(sql) {
    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err) => {
        if (err) return reject(err)
        resolve()
      })
    })
  }

  _run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) return reject(err)
        resolve({ lastID: this.lastID, changes: this.changes })
      })
    })
  }

  _get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) return reject(err)
        resolve(row)
      })
    })
  }

  _all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) return reject(err)
        resolve(rows)
      })
    })
  }

  _deserializeTask(row) {
    return {
      id: row.id,
      text: row.text,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      completedAt: row.completedAt,
      conversationId: row.conversationId,
      messages: JSON.parse(row.messages),
      apiMetrics: JSON.parse(row.apiMetrics),
      contextTokens: row.contextTokens,
      contextWindow: row.contextWindow,
      checkpoints: JSON.parse(row.checkpoints),
      currentCheckpoint: row.currentCheckpoint,
      metadata: JSON.parse(row.metadata)
    }
  }

  _emptyMetrics() {
    return {
      tokensIn: 0,
      tokensOut: 0,
      cacheWrites: 0,
      cacheReads: 0,
      totalCost: 0,
      contextTokens: 0
    }
  }

  _exportToText(task) {
    const lines = [
      `Task: ${task.text}`,
      `Status: ${task.status}`,
      `Created: ${new Date(task.createdAt).toLocaleString()}`,
      `Updated: ${new Date(task.updatedAt).toLocaleString()}`,
      '',
      'Metrics:',
      `  Tokens In: ${task.apiMetrics.tokensIn}`,
      `  Tokens Out: ${task.apiMetrics.tokensOut}`,
      `  Total Cost: $${task.apiMetrics.totalCost.toFixed(4)}`,
      '',
      'Conversation:',
      ''
    ]

    task.messages.forEach((msg, idx) => {
      const prefix = msg.type === 'ask' ? 'User:' : 'Assistant:'
      lines.push(`[${idx + 1}] ${prefix}`)
      lines.push(msg.text || '')
      lines.push('')
    })

    return lines.join('\n')
  }

  _exportToMarkdown(task) {
    const lines = [
      `# ${task.text}`,
      '',
      `**Status:** ${task.status}`,
      `**Created:** ${new Date(task.createdAt).toLocaleString()}`,
      `**Updated:** ${new Date(task.updatedAt).toLocaleString()}`,
      '',
      '## Metrics',
      '',
      `- **Tokens In:** ${task.apiMetrics.tokensIn}`,
      `- **Tokens Out:** ${task.apiMetrics.tokensOut}`,
      `- **Total Cost:** $${task.apiMetrics.totalCost.toFixed(4)}`,
      '',
      '## Conversation',
      ''
    ]

    task.messages.forEach((msg, idx) => {
      const prefix = msg.type === 'ask' ? '**User:**' : '**Assistant:**'
      lines.push(`### Message ${idx + 1}`)
      lines.push(prefix)
      lines.push('')
      lines.push(msg.text || '')
      lines.push('')
    })

    return lines.join('\n')
  }
}

module.exports = TaskStorage
```

#### Testing (Week 1)

```javascript
// src/services/storage/__tests__/TaskStorage.test.js

const { describe, it, expect, beforeEach, afterEach } = require('vitest')
const TaskStorage = require('../TaskStorage')
const path = require('path')
const fs = require('fs').promises
const os = require('os')

describe('TaskStorage', () => {
  let storage
  let tempDir

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), 'oropendola-test-' + Date.now())
    storage = new TaskStorage(tempDir)
    await storage.initialize()
  })

  afterEach(async () => {
    await storage.close()
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  describe('createTask', () => {
    it('should create task with generated ID', async () => {
      const task = await storage.createTask({
        text: 'Test task',
        conversationId: 'conv-123',
        messages: [],
        apiMetrics: storage._emptyMetrics(),
        metadata: {}
      })

      expect(task).toBeDefined()
      expect(task.id).toBeDefined()
      expect(task.text).toBe('Test task')
      expect(task.status).toBe('active')
    })

    it('should create task with provided ID', async () => {
      const taskId = 'task-123'
      const task = await storage.createTask({
        id: taskId,
        text: 'Test task',
        conversationId: 'conv-123',
        messages: [],
        apiMetrics: storage._emptyMetrics(),
        metadata: {}
      })

      expect(task.id).toBe(taskId)
    })
  })

  describe('getTask', () => {
    it('should retrieve task by ID', async () => {
      const created = await storage.createTask({
        text: 'Test task',
        conversationId: 'conv-123',
        messages: [],
        apiMetrics: storage._emptyMetrics(),
        metadata: {}
      })

      const retrieved = await storage.getTask(created.id)
      expect(retrieved).toEqual(created)
    })

    it('should return null for non-existent task', async () => {
      const task = await storage.getTask('non-existent')
      expect(task).toBeNull()
    })
  })

  describe('updateTask', () => {
    it('should update task fields', async () => {
      const task = await storage.createTask({
        text: 'Original text',
        conversationId: 'conv-123',
        messages: [],
        apiMetrics: storage._emptyMetrics(),
        metadata: {}
      })

      const updated = await storage.updateTask(task.id, {
        text: 'Updated text',
        status: 'completed'
      })

      expect(updated.text).toBe('Updated text')
      expect(updated.status).toBe('completed')
      expect(updated.updatedAt).toBeGreaterThan(task.updatedAt)
    })

    it('should throw error for non-existent task', async () => {
      await expect(storage.updateTask('non-existent', {}))
        .rejects.toThrow('Task not found')
    })
  })

  describe('deleteTask', () => {
    it('should delete task', async () => {
      const task = await storage.createTask({
        text: 'Test task',
        conversationId: 'conv-123',
        messages: [],
        apiMetrics: storage._emptyMetrics(),
        metadata: {}
      })

      await storage.deleteTask(task.id)
      const retrieved = await storage.getTask(task.id)
      expect(retrieved).toBeNull()
    })
  })

  describe('listTasks', () => {
    beforeEach(async () => {
      // Create test tasks
      await storage.createTask({
        text: 'Active task 1',
        conversationId: 'conv-1',
        status: 'active',
        messages: [],
        apiMetrics: storage._emptyMetrics(),
        metadata: {}
      })

      await storage.createTask({
        text: 'Completed task',
        conversationId: 'conv-2',
        status: 'completed',
        messages: [],
        apiMetrics: storage._emptyMetrics(),
        metadata: {}
      })

      await storage.createTask({
        text: 'Active task 2',
        conversationId: 'conv-3',
        status: 'active',
        messages: [],
        apiMetrics: storage._emptyMetrics(),
        metadata: {}
      })
    })

    it('should list all tasks', async () => {
      const tasks = await storage.listTasks()
      expect(tasks).toHaveLength(3)
    })

    it('should filter by status', async () => {
      const tasks = await storage.listTasks({ status: 'active' })
      expect(tasks).toHaveLength(2)
      expect(tasks.every(t => t.status === 'active')).toBe(true)
    })

    it('should paginate results', async () => {
      const page1 = await storage.listTasks({ limit: 2, offset: 0 })
      const page2 = await storage.listTasks({ limit: 2, offset: 2 })

      expect(page1).toHaveLength(2)
      expect(page2).toHaveLength(1)
    })

    it('should search tasks', async () => {
      const tasks = await storage.listTasks({ search: 'Completed' })
      expect(tasks).toHaveLength(1)
      expect(tasks[0].text).toBe('Completed task')
    })
  })

  describe('exportTask', () => {
    let task

    beforeEach(async () => {
      task = await storage.createTask({
        text: 'Export test',
        conversationId: 'conv-123',
        messages: [
          { type: 'ask', text: 'User message', ts: Date.now() },
          { type: 'say', text: 'Assistant response', ts: Date.now() }
        ],
        apiMetrics: {
          tokensIn: 100,
          tokensOut: 50,
          totalCost: 0.001,
          cacheWrites: 0,
          cacheReads: 0,
          contextTokens: 0
        },
        metadata: {}
      })
    })

    it('should export to JSON', async () => {
      const json = await storage.exportTask(task.id, 'json')
      const parsed = JSON.parse(json)

      expect(parsed.id).toBe(task.id)
      expect(parsed.text).toBe('Export test')
      expect(parsed.messages).toHaveLength(2)
    })

    it('should export to TXT', async () => {
      const txt = await storage.exportTask(task.id, 'txt')

      expect(txt).toContain('Export test')
      expect(txt).toContain('User message')
      expect(txt).toContain('Assistant response')
      expect(txt).toContain('Tokens In: 100')
    })

    it('should export to Markdown', async () => {
      const md = await storage.exportTask(task.id, 'md')

      expect(md).toContain('# Export test')
      expect(md).toContain('**User:**')
      expect(md).toContain('**Assistant:**')
      expect(md).toContain('## Metrics')
    })
  })

  describe('getStats', () => {
    beforeEach(async () => {
      await storage.createTask({
        text: 'Active 1',
        conversationId: 'conv-1',
        status: 'active',
        messages: [],
        apiMetrics: storage._emptyMetrics(),
        metadata: {}
      })

      await storage.createTask({
        text: 'Completed',
        conversationId: 'conv-2',
        status: 'completed',
        messages: [],
        apiMetrics: storage._emptyMetrics(),
        metadata: {}
      })

      await storage.createTask({
        text: 'Failed',
        conversationId: 'conv-3',
        status: 'failed',
        messages: [],
        apiMetrics: storage._emptyMetrics(),
        metadata: {}
      })
    })

    it('should return task statistics', async () => {
      const stats = await storage.getStats()

      expect(stats.total).toBe(3)
      expect(stats.active).toBe(1)
      expect(stats.completed).toBe(1)
      expect(stats.failed).toBe(1)
      expect(stats.terminated).toBe(0)
    })
  })
})
```

---

### Phase 2: Task Manager API (Week 2, 80 hrs)

#### File: `src/services/tasks/TaskManager.js`

```javascript
// src/services/tasks/TaskManager.js

const TaskStorage = require('../storage/TaskStorage')
const { v4: uuidv4 } = require('uuid')
const EventEmitter = require('events')

class TaskManager extends EventEmitter {
  constructor(storagePath) {
    super()
    this.storage = new TaskStorage(storagePath)
    this.activeTasks = new Map() // id -> ConversationTask instance
  }

  async initialize() {
    await this.storage.initialize()
    console.log('[TaskManager] Initialized')
  }

  /**
   * Create new task
   */
  async createTask(text, conversationId, metadata = {}) {
    const taskId = uuidv4()

    const task = await this.storage.createTask({
      id: taskId,
      text,
      conversationId,
      status: 'active',
      messages: [],
      apiMetrics: this.storage._emptyMetrics(),
      metadata: {
        version: metadata.version || '3.5.0',
        mode: metadata.mode || 'architect',
        model: metadata.model || 'claude-3-5-sonnet-20241022',
        ...metadata
      }
    })

    this.emit('taskCreated', task)
    console.log(`[TaskManager] Created task: ${taskId}`)

    return task
  }

  /**
   * Save task state (during conversation)
   */
  async saveTask(taskId, conversationTask) {
    const updates = {
      messages: conversationTask.messages || [],
      apiMetrics: conversationTask.apiMetrics || this.storage._emptyMetrics(),
      contextTokens: conversationTask.contextTokens || 0,
      status: conversationTask.status || 'active'
    }

    const task = await this.storage.updateTask(taskId, updates)
    this.emit('taskUpdated', task)

    return task
  }

  /**
   * Load task by ID
   */
  async loadTask(taskId) {
    const task = await this.storage.getTask(taskId)
    if (!task) {
      throw new Error(`Task not found: ${taskId}`)
    }

    this.emit('taskLoaded', task)
    console.log(`[TaskManager] Loaded task: ${taskId}`)

    return task
  }

  /**
   * Delete task
   */
  async deleteTask(taskId) {
    await this.storage.deleteTask(taskId)
    this.activeTasks.delete(taskId)

    this.emit('taskDeleted', taskId)
    console.log(`[TaskManager] Deleted task: ${taskId}`)

    return true
  }

  /**
   * Complete task
   */
  async completeTask(taskId) {
    const task = await this.storage.updateTask(taskId, {
      status: 'completed',
      completedAt: Date.now()
    })

    this.activeTasks.delete(taskId)
    this.emit('taskCompleted', task)

    return task
  }

  /**
   * Terminate task (user stopped)
   */
  async terminateTask(taskId) {
    const task = await this.storage.updateTask(taskId, {
      status: 'terminated',
      completedAt: Date.now()
    })

    this.activeTasks.delete(taskId)
    this.emit('taskTerminated', task)

    return task
  }

  /**
   * Fail task (error occurred)
   */
  async failTask(taskId, error) {
    const task = await this.storage.updateTask(taskId, {
      status: 'failed',
      completedAt: Date.now(),
      metadata: {
        error: error.message,
        stack: error.stack
      }
    })

    this.activeTasks.delete(taskId)
    this.emit('taskFailed', task, error)

    return task
  }

  /**
   * List tasks with filters
   */
  async listTasks(filters = {}) {
    return this.storage.listTasks(filters)
  }

  /**
   * Search tasks
   */
  async searchTasks(query) {
    return this.storage.listTasks({ search: query })
  }

  /**
   * Export task
   */
  async exportTask(taskId, format = 'json') {
    return this.storage.exportTask(taskId, format)
  }

  /**
   * Get task statistics
   */
  async getStats() {
    return this.storage.getStats()
  }

  /**
   * Register active task instance
   */
  registerActiveTask(taskId, conversationTask) {
    this.activeTasks.set(taskId, conversationTask)
  }

  /**
   * Get active task instance
   */
  getActiveTask(taskId) {
    return this.activeTasks.get(taskId)
  }

  /**
   * Close task manager
   */
  async close() {
    await this.storage.close()
    this.activeTasks.clear()
    console.log('[TaskManager] Closed')
  }
}

module.exports = TaskManager
```

---

### Phase 3: History View UI (Week 3, 80 hrs)

#### File: `webview-ui/src/components/History/HistoryView.tsx`

```typescript
// webview-ui/src/components/History/HistoryView.tsx

import React, { useState, useEffect, useMemo } from 'react'
import { Virtuoso } from 'react-virtuoso'
import { Search, X, Trash2, Download, ChevronDown } from 'lucide-react'
import './HistoryView.css'
import vscode from '../../vscode-api'

interface Task {
  id: string
  text: string
  status: 'active' | 'completed' | 'failed' | 'terminated'
  createdAt: number
  updatedAt: number
  completedAt?: number
  apiMetrics: {
    tokensIn: number
    tokensOut: number
    totalCost: number
  }
  metadata: {
    mode?: string
    model?: string
  }
}

export const HistoryView: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt'>('createdAt')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadTasks()

    const handleMessage = (event: MessageEvent) => {
      const message = event.data
      if (message.type === 'taskList') {
        setTasks(message.tasks)
        setLoading(false)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const loadTasks = () => {
    setLoading(true)
    vscode.postMessage({
      type: 'listTasks',
      filters: {
        status: statusFilter === 'all' ? undefined : statusFilter,
        sortBy,
        sortOrder: 'DESC'
      }
    })
  }

  const filteredTasks = useMemo(() => {
    let filtered = tasks

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(task =>
        task.text.toLowerCase().includes(query)
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter)
    }

    return filtered
  }, [tasks, searchQuery, statusFilter])

  const handleLoadTask = (taskId: string) => {
    vscode.postMessage({
      type: 'loadTask',
      taskId
    })
  }

  const handleDeleteTask = (taskId: string) => {
    if (confirm('Delete this task? This cannot be undone.')) {
      vscode.postMessage({
        type: 'deleteTask',
        taskId
      })
      setTasks(tasks.filter(t => t.id !== taskId))
    }
  }

  const handleExportTask = (taskId: string, format: 'json' | 'txt' | 'md') => {
    vscode.postMessage({
      type: 'exportTask',
      taskId,
      format
    })
  }

  return (
    <div className="history-view">
      <div className="history-header">
        <h2>Task History</h2>
        <div className="history-controls">
          <div className="search-box">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="clear-search"
                onClick={() => setSearchQuery('')}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="terminated">Terminated</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="sort-select"
          >
            <option value="createdAt">Created</option>
            <option value="updatedAt">Updated</option>
          </select>
        </div>
      </div>

      <div className="history-list">
        {loading ? (
          <div className="loading">Loading tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="empty">
            No tasks found
          </div>
        ) : (
          <Virtuoso
            data={filteredTasks}
            itemContent={(index, task) => (
              <TaskItem
                key={task.id}
                task={task}
                onLoad={handleLoadTask}
                onDelete={handleDeleteTask}
                onExport={handleExportTask}
              />
            )}
            style={{ height: 'calc(100vh - 120px)' }}
          />
        )}
      </div>
    </div>
  )
}

interface TaskItemProps {
  task: Task
  onLoad: (id: string) => void
  onDelete: (id: string) => void
  onExport: (id: string, format: 'json' | 'txt' | 'md') => void
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onLoad, onDelete, onExport }) => {
  const [showExport, setShowExport] = useState(false)

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))

    if (hours < 24) {
      return `${hours}h ago`
    }
    const days = Math.floor(hours / 24)
    if (days < 7) {
      return `${days}d ago`
    }
    return date.toLocaleDateString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#4caf50'
      case 'failed': return '#f44336'
      case 'terminated': return '#ff9800'
      default: return '#2196f3'
    }
  }

  return (
    <div className="task-item">
      <div className="task-item-header" onClick={() => onLoad(task.id)}>
        <div
          className="task-status-indicator"
          style={{ backgroundColor: getStatusColor(task.status) }}
        />
        <div className="task-item-content">
          <div className="task-item-title">{task.text}</div>
          <div className="task-item-meta">
            <span>{formatDate(task.createdAt)}</span>
            <span>•</span>
            <span>{task.apiMetrics.tokensIn + task.apiMetrics.tokensOut} tokens</span>
            <span>•</span>
            <span>${task.apiMetrics.totalCost.toFixed(4)}</span>
            {task.metadata.mode && (
              <>
                <span>•</span>
                <span className="task-mode">{task.metadata.mode}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="task-item-actions">
        <div className="export-dropdown">
          <button
            className="action-btn"
            onClick={() => setShowExport(!showExport)}
          >
            <Download size={16} />
            <ChevronDown size={12} />
          </button>
          {showExport && (
            <div className="export-menu">
              <button onClick={() => {
                onExport(task.id, 'json')
                setShowExport(false)
              }}>
                Export as JSON
              </button>
              <button onClick={() => {
                onExport(task.id, 'txt')
                setShowExport(false)
              }}>
                Export as TXT
              </button>
              <button onClick={() => {
                onExport(task.id, 'md')
                setShowExport(false)
              }}>
                Export as Markdown
              </button>
            </div>
          )}
        </div>

        <button
          className="action-btn delete-btn"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(task.id)
          }}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}
```

---

## 5. ACCEPTANCE CRITERIA

### Sprint 1-2 Success Criteria:

✅ **Functionality:**
- [ ] Tasks persist across extension restarts
- [ ] Create task creates new task with ID
- [ ] Load task loads full conversation
- [ ] Delete task removes from database
- [ ] Export works for JSON, TXT, Markdown
- [ ] History view shows all tasks
- [ ] Search finds tasks by text
- [ ] Filter works for all statuses

✅ **Performance:**
- [ ] Task load time < 100ms
- [ ] History view renders 1000+ tasks smoothly
- [ ] Search returns results < 50ms
- [ ] Export completes < 500ms

✅ **Testing:**
- [ ] 80% code coverage
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Performance tests passing

✅ **Code Quality:**
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Code reviewed
- [ ] Documentation complete

---

## 6. NEXT STEPS

### Immediate Actions (This Week):
1. Install SQLite3: `npm install sqlite3`
2. Create file structure:
   ```
   src/services/
     ├── storage/
     │   ├── TaskStorage.js
     │   └── __tests__/
     │       └── TaskStorage.test.js
     └── tasks/
         ├── TaskManager.js
         └── __tests__/
             └── TaskManager.test.js
   ```
3. Implement TaskStorage (Week 1)
4. Write tests for TaskStorage
5. Implement TaskManager (Week 2)
6. Integrate with extension.js
7. Build HistoryView UI (Week 3)

### Following Sprints:
- **Sprint 3-4**: Context Management & Condensing
- **Sprint 5-6**: Input Autocomplete System
- **Sprint 7-8**: Auto-Approval Backend
- **Sprint 9**: Checkpoint System

---

**Document Version:** 1.0
**Last Updated:** 2025-10-25
