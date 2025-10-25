# Task Persistence - Developer Guide

**Version:** 3.5.0
**Sprint:** 1-2 (Task Persistence Layer)
**Architecture:** Local-first with backend sync capability

---

## 📐 Architecture Overview

### Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   ConversationTask                      │
│        (Business Logic - in-memory conversation)        │
│                                                          │
│  - Auto-creates task on conversation start              │
│  - Auto-saves after each AI response                    │
│  - Marks as completed/failed/terminated                 │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                     TaskManager                         │
│         (Task Lifecycle Management - EventEmitter)      │
│                                                          │
│  - createTask()    - saveTask()      - loadTask()       │
│  - completeTask()  - failTask()      - terminateTask()  │
│  - deleteTask()    - listTasks()     - searchTasks()    │
│  - exportTask()    - getStats()                         │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                     TaskStorage                         │
│              (Persistence Layer - SQLite)               │
│                                                          │
│  - SQL CRUD operations                                  │
│  - FTS5 full-text search                                │
│  - JSON serialization                                    │
│  - Export to JSON/TXT/MD                                │
└─────────────────────────────────────────────────────────┘
                           ↓
                    ┌─────────────┐
                    │   SQLite    │
                    │ ~/.oropendola │
                    │  /tasks.db   │
                    └─────────────┘
```

---

## 🗂️ File Structure

```
src/
├── services/
│   ├── tasks/
│   │   ├── TaskManager.js                 # Task lifecycle management
│   │   └── __tests__/
│   │       └── TaskManager.test.js        # 53 tests
│   └── storage/
│       ├── TaskStorage.js                 # SQLite persistence
│       ├── schema.sql                     # Database schema
│       └── __tests__/
│           └── TaskStorage.test.js        # 36 tests
├── types/
│   └── task.ts                            # TypeScript type definitions
├── core/
│   └── ConversationTask.js                # Integration points
└── sidebar/
    └── sidebar-provider.js                # Message handlers

webview-ui/
└── src/
    └── components/
        └── History/
            ├── HistoryView.tsx            # Main history UI
            ├── TaskItem.tsx               # Task item component
            └── HistoryView.css            # Styling
```

---

## 🔧 Core Components

### 1. TaskStorage (Database Layer)

**File:** `src/services/storage/TaskStorage.js`

**Responsibilities:**
- SQLite database operations
- FTS5 full-text search
- JSON serialization/deserialization
- Export functionality

**Key Methods:**

```javascript
class TaskStorage {
  async initialize()                      // Setup database, create tables
  async createTask(task)                  // INSERT new task
  async getTask(id)                       // SELECT by ID
  async updateTask(id, updates)           // UPDATE task fields
  async deleteTask(id)                    // DELETE task
  async listTasks(filters)                // SELECT with filters, FTS5 search
  async exportTask(id, format)            // Export to JSON/TXT/MD
  async getStats()                        // Aggregate statistics
  async close()                           // Close database connection
}
```

**Database Schema:**

```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  completedAt INTEGER,
  conversationId TEXT NOT NULL UNIQUE,
  messages TEXT NOT NULL,             -- JSON array
  apiMetrics TEXT NOT NULL,           -- JSON object
  contextTokens INTEGER DEFAULT 0,
  contextWindow INTEGER DEFAULT 200000,
  checkpoints TEXT DEFAULT '[]',      -- JSON array
  currentCheckpoint TEXT,
  metadata TEXT NOT NULL              -- JSON object
);

CREATE VIRTUAL TABLE tasks_fts USING fts5(
  id UNINDEXED,
  text,
  content=tasks
);
```

---

### 2. TaskManager (Business Logic Layer)

**File:** `src/services/tasks/TaskManager.js`

**Responsibilities:**
- Task lifecycle management
- Event emission
- Active task tracking
- Checkpoint management

**Extends:** `EventEmitter`

**Events:**

```javascript
// Emitted events:
'taskCreated'          (task)
'taskUpdated'          (task)
'taskLoaded'           (task)
'taskDeleted'          (taskId)
'taskCompleted'        (task)
'taskFailed'           (task, error)
'taskTerminated'       (task)
'taskSaved'            (taskId)
'taskExported'         (taskId, format, path)
'checkpointCreated'    (taskId, checkpointId)
'checkpointRestored'   (taskId, checkpointId)
'statsUpdated'         (stats)
'closed'               ()
```

**Key Methods:**

```javascript
class TaskManager extends EventEmitter {
  async initialize()

  // Lifecycle
  async createTask(text, conversationId, metadata = {})
  async saveTask(taskId, updates)
  async loadTask(taskId)
  async deleteTask(taskId)

  // Status changes
  async completeTask(taskId, result)
  async failTask(taskId, error)
  async terminateTask(taskId)

  // Queries
  async listTasks(filters = {})
  async searchTasks(query, filters = {})
  async getStats()

  // Export
  async exportTask(taskId, format = 'json')

  // Checkpoints
  async createCheckpoint(taskId, description)
  async restoreCheckpoint(taskId, checkpointId)

  // Active tasks
  registerActiveTask(taskId)
  unregisterActiveTask(taskId)
  getActiveTasks()

  // Text updates
  async updateTaskText(taskId, newText)

  async close()
}
```

---

### 3. ConversationTask Integration

**File:** `src/core/ConversationTask.js`

**Integration Points:**

#### Constructor
```javascript
constructor(taskId, options = {}) {
  // ...
  this.taskManager = options.taskManager || null
  this.persistentTaskId = null
}
```

#### Auto-Create on Start (Line 249-267)
```javascript
async run(initialMessage, images = []) {
  // Start conversation
  this.status = 'running'

  // Auto-create task
  if (this.taskManager && !this.persistentTaskId) {
    const task = await this.taskManager.createTask(
      initialMessage.substring(0, 100),
      this.taskId,
      {
        mode: this.mode,
        framework: this.detectedFramework
      }
    )
    this.persistentTaskId = task.id
  }

  // Continue with conversation...
}
```

#### Auto-Save After Response (Line 635-655)
```javascript
// After emitting assistantMessage event
if (this.taskManager && this.persistentTaskId) {
  await this.taskManager.saveTask(this.persistentTaskId, {
    messages: this.taskMessages || this.messages,
    apiMetrics: response._apiMetrics || {},
    contextTokens: this._calculateContextTokens(),
    metadata: {
      mode: this.mode,
      framework: this.detectedFramework,
      conversationId: this.conversationId,
      todos: response._todos,
      todo_stats: response._todo_stats
    }
  })
}
```

#### Task Completion (Line 3781-3801)
```javascript
async completeTask(status = 'completed') {
  // Generate task report...

  // Update TaskManager
  if (this.taskManager && this.persistentTaskId) {
    if (status === 'completed') {
      await this.taskManager.completeTask(this.persistentTaskId, report)
    } else if (status === 'failed') {
      await this.taskManager.failTask(this.persistentTaskId, error)
    } else if (status === 'terminated') {
      await this.taskManager.terminateTask(this.persistentTaskId)
    }
  }
}
```

#### Abort Handling (Line 841-850)
```javascript
async abortTask(isAbandoned = false) {
  this.abort = true
  this.status = 'aborted'

  // Mark as terminated
  if (this.taskManager && this.persistentTaskId) {
    await this.taskManager.terminateTask(this.persistentTaskId)
  }
}
```

---

## 🔄 Message Flow

### Frontend → Backend → Database

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend                            │
│                  (HistoryView.tsx)                       │
└─────────────────────────────────────────────────────────┘
                           ↓
          vscode.postMessage({ type: 'listTasks', filters })
                           ↓
┌─────────────────────────────────────────────────────────┐
│                   Extension Backend                      │
│               (sidebar-provider.js)                      │
│                                                          │
│  _handleListTasks(filters)                              │
│  _handleGetTaskStats()                                  │
│  _handleLoadTask(taskId)                                │
│  _handleDeleteTask(taskId)                              │
│  _handleExportTask(taskId, format)                      │
└─────────────────────────────────────────────────────────┘
                           ↓
                   TaskManager methods
                           ↓
                   TaskStorage methods
                           ↓
                      SQLite queries
                           ↓
          ← postMessage({ type: 'taskList', tasks })
                           ↓
┌─────────────────────────────────────────────────────────┐
│                      Frontend                            │
│                  (UI updates)                            │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 TypeScript Types

**File:** `src/types/task.ts`

```typescript
export interface Task {
  id: string
  text: string
  status: TaskStatus
  createdAt: number
  updatedAt: number
  completedAt?: number
  conversationId: string
  messages: ClineMessage[]
  apiMetrics: CombinedApiMetrics
  contextTokens: number
  contextWindow: number
  checkpoints: Checkpoint[]
  currentCheckpoint?: string
  metadata: TaskMetadata
}

export type TaskStatus = 'active' | 'completed' | 'failed' | 'terminated'

export interface ClineMessage {
  ts: number
  type: 'say' | 'ask' | 'text'
  say?: string
  text?: string
  ask?: 'command' | 'completion_result' | 'tool' | 'followup' | 'api_req_failed'
  // ... other fields
}

export interface TaskMetadata {
  mode?: string
  framework?: string
  conversationId?: string
  [key: string]: any
}

export interface Checkpoint {
  id: string
  taskId: string
  description: string
  createdAt: number
  snapshot: {
    messages: ClineMessage[]
    apiMetrics: CombinedApiMetrics
    metadata: TaskMetadata
  }
}
```

---

## 🧪 Testing

### Test Coverage

**Total:** 89 tests passing (100%)

#### TaskStorage Tests (36 tests)
**File:** `src/services/storage/__tests__/TaskStorage.test.js`

```javascript
describe('TaskStorage', () => {
  describe('Initialization', () => {
    it('should initialize database and create schema')
    it('should create storage directory if not exists')
  })

  describe('createTask', () => {
    it('should create task with generated ID')
    it('should create task with provided ID')
    it('should set default values for optional fields')
    it('should set timestamps')
  })

  describe('CRUD Operations', () => {
    // getTask, updateTask, deleteTask tests
  })

  describe('listTasks', () => {
    it('should list all tasks')
    it('should filter by status')
    it('should filter by conversationId')
    it('should search with FTS5')
    it('should sort by createdAt/updatedAt')
    it('should limit results')
  })

  describe('exportTask', () => {
    it('should export to JSON')
    it('should export to TXT')
    it('should export to Markdown')
  })

  describe('Edge Cases', () => {
    it('should handle special characters')
    it('should handle Unicode')
    it('should handle large metadata')
  })
})
```

#### TaskManager Tests (53 tests)
**File:** `src/services/tasks/__tests__/TaskManager.test.js`

```javascript
describe('TaskManager', () => {
  describe('Initialization', () => {
    it('should initialize successfully')
    it('should emit initialized event')
  })

  describe('Lifecycle', () => {
    it('should create task')
    it('should save task')
    it('should load task')
    it('should complete task')
    it('should fail task')
    it('should terminate task')
    it('should delete task')
  })

  describe('Events', () => {
    it('should emit taskCreated')
    it('should emit taskUpdated')
    it('should emit taskCompleted')
    // ... all 13 event types
  })

  describe('Active Task Tracking', () => {
    it('should register active task')
    it('should unregister active task')
    it('should list active tasks')
  })

  describe('Checkpoints', () => {
    it('should create checkpoint')
    it('should restore checkpoint')
    it('should list checkpoints')
  })
})
```

### Running Tests

```bash
# All tests
npm test

# Specific test file
npx vitest run src/services/storage/__tests__/TaskStorage.test.js

# Watch mode
npx vitest watch

# Coverage
npx vitest run --coverage
```

---

## ⚙️ Configuration

### Storage Location

Default: `~/.oropendola/tasks.db`

**Changing storage path:**

```javascript
// In extension.js
const taskManager = new TaskManager('/custom/path')
```

### Database Size Management

SQLite database grows with tasks. Typical sizes:
- 100 tasks: ~1-2 MB
- 1,000 tasks: ~10-20 MB
- 10,000 tasks: ~100-200 MB

**Cleanup strategies:**

```javascript
// Delete tasks older than 30 days
const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
const oldTasks = await taskManager.listTasks({
  status: 'completed',
  sort: 'createdAt',
  order: 'ASC'
})

for (const task of oldTasks) {
  if (task.createdAt < thirtyDaysAgo) {
    await taskManager.deleteTask(task.id)
  }
}
```

---

## 🔌 Extension Points

### Custom Event Handlers

```javascript
// Listen to task events
taskManager.on('taskCreated', (task) => {
  console.log(`New task: ${task.text}`)
  // Send to analytics, sync to backend, etc.
})

taskManager.on('taskCompleted', (task) => {
  console.log(`Task completed: ${task.id}`)
  // Generate report, send notification, etc.
})
```

### Backend Sync Integration

**Example: Sync to remote server**

```javascript
taskManager.on('taskUpdated', async (task) => {
  try {
    await axios.post('https://api.example.com/tasks/sync', {
      taskId: task.id,
      data: task
    })
  } catch (error) {
    console.error('Sync failed:', error)
  }
})
```

### Custom Export Formats

```javascript
// Add custom export format to TaskStorage
TaskStorage.prototype.exportTaskCustom = async function(taskId) {
  const task = await this.getTask(taskId)

  // Custom format logic
  const output = `
    Custom Format
    =============
    Task: ${task.text}
    Status: ${task.status}
    ...
  `

  return output
}
```

---

## 🐛 Debugging

### Enable Debug Logging

```javascript
// In TaskStorage
this.debug = true  // Logs all SQL queries

// In TaskManager
this.on('*', (eventName, ...args) => {
  console.log(`[TaskManager] ${eventName}:`, args)
})
```

### Database Inspection

```bash
# Open database in SQLite shell
sqlite3 ~/.oropendola/tasks.db

# List tables
.tables

# View schema
.schema tasks

# Query tasks
SELECT id, text, status, createdAt FROM tasks;

# Search with FTS5
SELECT * FROM tasks_fts WHERE tasks_fts MATCH 'react';
```

### Common Issues

**Issue:** Tasks not saving
**Solution:** Check TaskManager is initialized and passed to ConversationTask

**Issue:** Search not working
**Solution:** Verify FTS5 table exists and triggers are set up

**Issue:** Database locked
**Solution:** Close all connections, check for orphaned processes

---

## 📊 Performance Considerations

### Query Optimization

```javascript
// Use filters to limit results
await taskManager.listTasks({
  status: 'active',
  limit: 10
})

// Use FTS5 for fast search
await taskManager.searchTasks('react', { status: 'completed' })

// Pagination
await taskManager.listTasks({
  limit: 20,
  offset: 0
})
```

### Memory Management

```javascript
// Close TaskManager when done
await taskManager.close()

// Limit message history in memory
conversationTask.messages = conversationTask.messages.slice(-50)
```

### Database Indexing

Already optimized with indexes:
- `idx_status` on `status`
- `idx_createdAt` on `createdAt`
- `idx_updatedAt` on `updatedAt`
- `idx_conversationId` on `conversationId`

---

## 🔐 Security Considerations

### Data Privacy

Tasks stored **locally** in SQLite:
- No data sent to cloud by default
- User controls all data
- Can be encrypted at rest (OS-level)

### Sensitive Data

Avoid storing:
- API keys
- Passwords
- Secrets
- PII (personally identifiable information)

**Recommendation:** Use task metadata to flag sensitive tasks and exclude from export/sync.

---

## 🚀 Future Enhancements

### Planned Features

- [ ] Cloud sync (optional)
- [ ] Task templates
- [ ] Collaborative tasks
- [ ] Task analytics dashboard
- [ ] Export to PDF
- [ ] Task compression for old tasks
- [ ] Full-text search improvements
- [ ] Task tags/labels
- [ ] Task priorities
- [ ] Task dependencies

### API Stability

**Current Version:** 1.0.0

**Semver Policy:**
- Major (breaking changes): New major version
- Minor (new features): Backward compatible
- Patch (bug fixes): No API changes

---

## 📞 Support

### Documentation
- User Guide: `TASK_PERSISTENCE_USER_GUIDE.md`
- API Reference: This document
- TypeScript Types: `src/types/task.ts`

### Issues
Report bugs: https://github.com/anthropics/oropendola/issues

### Contributing
See `CONTRIBUTING.md` for development guidelines

---

**Last Updated:** 2025-10-26
**Version:** 3.5.0
**Sprint:** 1-2 Complete ✅
