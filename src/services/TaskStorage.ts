/**
 * TaskStorage Service
 *
 * SQLite-based persistent storage for tasks.
 * Handles CRUD operations, search, and full-text indexing.
 *
 * Sprint 1-2: Task Persistence Layer
 */

import * as sqlite3 from 'sqlite3'
import { open, Database } from 'sqlite'
import * as path from 'path'
import * as fs from 'fs'
import { Task, TaskStatus, TaskFilters, TaskStats, ExportFormat } from '../types/task'

export class TaskStorage {
  private db: Database | null = null
  private dbPath: string
  private isInitialized: boolean = false

  constructor(storagePath: string) {
    this.dbPath = path.join(storagePath, 'oropendola-tasks.db')
  }

  /**
   * Initialize database connection and run migrations
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

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

    // Enable foreign keys
    await this.db.exec('PRAGMA foreign_keys = ON')

    // Run migrations
    await this.runMigrations()

    this.isInitialized = true
    console.log('[TaskStorage] Database initialized at:', this.dbPath)
  }

  /**
   * Run database schema migrations
   */
  private async runMigrations(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    // Create tasks table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        completed_at INTEGER,
        text TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('active', 'completed', 'failed', 'terminated')),
        conversation_id TEXT NOT NULL,
        messages_json TEXT NOT NULL DEFAULT '[]',
        messages_text TEXT,
        checkpoints_json TEXT NOT NULL DEFAULT '[]',
        current_checkpoint TEXT,
        context_tokens INTEGER NOT NULL DEFAULT 0,
        context_window INTEGER NOT NULL DEFAULT 200000,

        -- API Metrics
        tokens_in INTEGER NOT NULL DEFAULT 0,
        tokens_out INTEGER NOT NULL DEFAULT 0,
        cache_reads INTEGER NOT NULL DEFAULT 0,
        cache_writes INTEGER NOT NULL DEFAULT 0,
        total_cost REAL NOT NULL DEFAULT 0.0,

        -- Metadata
        version TEXT,
        mode TEXT NOT NULL DEFAULT 'agent',
        model TEXT,
        total_duration INTEGER,
        file_changes_json TEXT DEFAULT '[]',
        tags_json TEXT DEFAULT '[]',
        error TEXT,
        stack TEXT
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
      CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);
      CREATE INDEX IF NOT EXISTS idx_tasks_conversation_id ON tasks(conversation_id);

      -- Full-text search
      CREATE VIRTUAL TABLE IF NOT EXISTS tasks_fts USING fts5(
        id UNINDEXED,
        text,
        messages_text,
        content='tasks',
        content_rowid='rowid'
      );

      -- Triggers to keep FTS index updated
      CREATE TRIGGER IF NOT EXISTS tasks_fts_insert AFTER INSERT ON tasks BEGIN
        INSERT INTO tasks_fts(rowid, id, text, messages_text)
        VALUES (new.rowid, new.id, new.text, new.messages_text);
      END;

      CREATE TRIGGER IF NOT EXISTS tasks_fts_update AFTER UPDATE ON tasks BEGIN
        UPDATE tasks_fts SET text = new.text, messages_text = new.messages_text
        WHERE rowid = new.rowid;
      END;

      CREATE TRIGGER IF NOT EXISTS tasks_fts_delete AFTER DELETE ON tasks BEGIN
        DELETE FROM tasks_fts WHERE rowid = old.rowid;
      END;
    `)

    console.log('[TaskStorage] Database schema up to date')
  }

  /**
   * Create a new task
   */
  async createTask(task: Partial<Task>): Promise<Task> {
    if (!this.db) throw new Error('Database not initialized')

    const now = Date.now()
    const newTask: Task = {
      id: task.id || this.generateId(),
      createdAt: now,
      updatedAt: now,
      completedAt: task.completedAt,
      text: task.text || `Task ${new Date().toLocaleString()}`,
      status: task.status || 'active',
      conversationId: task.conversationId || this.generateId(),
      messages: task.messages || [],
      checkpoints: task.checkpoints || [],
      currentCheckpoint: task.currentCheckpoint,
      contextTokens: task.contextTokens || 0,
      contextWindow: task.contextWindow || 200000,
      apiMetrics: task.apiMetrics || {
        tokensIn: 0,
        tokensOut: 0,
        cacheReads: 0,
        cacheWrites: 0,
        totalCost: 0,
        contextTokens: 0
      },
      metadata: task.metadata || {
        version: '3.6.0',
        mode: 'agent',
        model: 'auto'
      }
    }

    // Extract text from messages for FTS
    const messagesText = newTask.messages
      .map(m => m.text || m.ask || m.say || '')
      .filter(Boolean)
      .join(' ')

    await this.db.run(`
      INSERT INTO tasks (
        id, created_at, updated_at, completed_at, text, status,
        conversation_id, messages_json, messages_text, checkpoints_json, current_checkpoint,
        context_tokens, context_window,
        tokens_in, tokens_out, cache_reads, cache_writes, total_cost,
        version, mode, model, total_duration, file_changes_json, tags_json, error, stack
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newTask.id,
      newTask.createdAt,
      newTask.updatedAt,
      newTask.completedAt || null,
      newTask.text,
      newTask.status,
      newTask.conversationId,
      JSON.stringify(newTask.messages),
      messagesText,
      JSON.stringify(newTask.checkpoints),
      newTask.currentCheckpoint || null,
      newTask.contextTokens,
      newTask.contextWindow,
      newTask.apiMetrics.tokensIn,
      newTask.apiMetrics.tokensOut,
      newTask.apiMetrics.cacheReads,
      newTask.apiMetrics.cacheWrites,
      newTask.apiMetrics.totalCost,
      newTask.metadata.version,
      newTask.metadata.mode,
      newTask.metadata.model,
      newTask.metadata.totalDuration || null,
      JSON.stringify(newTask.metadata.fileChanges || []),
      JSON.stringify(newTask.metadata.tags || []),
      newTask.metadata.error || null,
      newTask.metadata.stack || null
    ])

    console.log('[TaskStorage] Task created:', newTask.id)
    return newTask
  }

  /**
   * Get a task by ID
   */
  async getTask(id: string): Promise<Task | null> {
    if (!this.db) throw new Error('Database not initialized')

    const row = await this.db.get('SELECT * FROM tasks WHERE id = ?', id)
    if (!row) return null

    return this.rowToTask(row)
  }

  /**
   * Update an existing task
   */
  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    if (!this.db) throw new Error('Database not initialized')

    const existing = await this.getTask(id)
    if (!existing) {
      throw new Error(`Task ${id} not found`)
    }

    const updatedTask: Task = {
      ...existing,
      ...updates,
      updatedAt: Date.now()
    }

    // Extract text from messages for FTS
    const messagesText = updatedTask.messages
      .map(m => m.text || m.ask || m.say || '')
      .filter(Boolean)
      .join(' ')

    await this.db.run(`
      UPDATE tasks SET
        updated_at = ?,
        completed_at = ?,
        text = ?,
        status = ?,
        messages_json = ?,
        messages_text = ?,
        checkpoints_json = ?,
        current_checkpoint = ?,
        context_tokens = ?,
        context_window = ?,
        tokens_in = ?,
        tokens_out = ?,
        cache_reads = ?,
        cache_writes = ?,
        total_cost = ?,
        mode = ?,
        model = ?,
        total_duration = ?,
        file_changes_json = ?,
        tags_json = ?,
        error = ?,
        stack = ?
      WHERE id = ?
    `, [
      updatedTask.updatedAt,
      updatedTask.completedAt || null,
      updatedTask.text,
      updatedTask.status,
      JSON.stringify(updatedTask.messages),
      messagesText,
      JSON.stringify(updatedTask.checkpoints),
      updatedTask.currentCheckpoint || null,
      updatedTask.contextTokens,
      updatedTask.contextWindow,
      updatedTask.apiMetrics.tokensIn,
      updatedTask.apiMetrics.tokensOut,
      updatedTask.apiMetrics.cacheReads,
      updatedTask.apiMetrics.cacheWrites,
      updatedTask.apiMetrics.totalCost,
      updatedTask.metadata.mode,
      updatedTask.metadata.model,
      updatedTask.metadata.totalDuration || null,
      JSON.stringify(updatedTask.metadata.fileChanges || []),
      JSON.stringify(updatedTask.metadata.tags || []),
      updatedTask.metadata.error || null,
      updatedTask.metadata.stack || null,
      id
    ])

    console.log('[TaskStorage] Task updated:', id)
    return updatedTask
  }

  /**
   * Delete a task
   */
  async deleteTask(id: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized')

    const result = await this.db.run('DELETE FROM tasks WHERE id = ?', id)
    const deleted = (result.changes || 0) > 0

    if (deleted) {
      console.log('[TaskStorage] Task deleted:', id)
    }

    return deleted
  }

  /**
   * List tasks with filters
   */
  async listTasks(filters?: TaskFilters): Promise<Task[]> {
    if (!this.db) throw new Error('Database not initialized')

    let query = 'SELECT * FROM tasks WHERE 1=1'
    const params: any[] = []

    if (filters?.status) {
      query += ' AND status = ?'
      params.push(filters.status)
    }

    if (filters?.search) {
      // Use full-text search
      const ftsQuery = `
        SELECT t.* FROM tasks t
        JOIN tasks_fts ON t.rowid = tasks_fts.rowid
        WHERE tasks_fts MATCH ?
      `
      const ftsParams = [filters.search]

      if (filters.status) {
        const combined = ftsQuery + ' AND t.status = ?'
        ftsParams.push(filters.status)
        const rows = await this.db.all(combined, ftsParams)
        return rows.map(row => this.rowToTask(row))
      }

      const rows = await this.db.all(ftsQuery, ftsParams)
      return rows.map(row => this.rowToTask(row))
    }

    // Sorting
    const sortBy = filters?.sortBy || 'updatedAt'
    const sortOrder = filters?.sortOrder || 'DESC'
    query += ` ORDER BY ${sortBy === 'createdAt' ? 'created_at' : 'updated_at'} ${sortOrder}`

    // Pagination
    if (filters?.limit) {
      query += ' LIMIT ?'
      params.push(filters.limit)
    } else if (filters?.offset) {
      // OFFSET requires LIMIT in SQLite, use -1 for all rows
      query += ' LIMIT -1'
    }

    if (filters?.offset) {
      query += ' OFFSET ?'
      params.push(filters.offset)
    }

    const rows = await this.db.all(query, params)
    return rows.map(row => this.rowToTask(row))
  }

  /**
   * Export task in specified format
   */
  async exportTask(id: string, format: ExportFormat): Promise<string> {
    const task = await this.getTask(id)
    if (!task) {
      throw new Error(`Task ${id} not found`)
    }

    switch (format) {
      case 'json':
        return JSON.stringify(task, null, 2)

      case 'txt':
        return this.taskToText(task)

      case 'md':
        return this.taskToMarkdown(task)

      default:
        throw new Error(`Unsupported format: ${format}`)
    }
  }

  /**
   * Get task statistics
   */
  async getStats(): Promise<TaskStats> {
    if (!this.db) throw new Error('Database not initialized')

    const stats = await this.db.get(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'terminated' THEN 1 ELSE 0 END) as terminated
      FROM tasks
    `)

    return {
      total: stats.total || 0,
      active: stats.active || 0,
      completed: stats.completed || 0,
      failed: stats.failed || 0,
      terminated: stats.terminated || 0
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.close()
      this.db = null
      this.isInitialized = false
      console.log('[TaskStorage] Database closed')
    }
  }

  /**
   * Convert database row to Task object
   */
  private rowToTask(row: any): Task {
    return {
      id: row.id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at || undefined,
      text: row.text,
      status: row.status as TaskStatus,
      conversationId: row.conversation_id,
      messages: JSON.parse(row.messages_json || '[]'),
      checkpoints: JSON.parse(row.checkpoints_json || '[]'),
      currentCheckpoint: row.current_checkpoint || undefined,
      contextTokens: row.context_tokens,
      contextWindow: row.context_window,
      apiMetrics: {
        tokensIn: row.tokens_in,
        tokensOut: row.tokens_out,
        cacheReads: row.cache_reads,
        cacheWrites: row.cache_writes,
        totalCost: row.total_cost,
        contextTokens: row.context_tokens
      },
      metadata: {
        version: row.version,
        mode: row.mode,
        model: row.model,
        totalDuration: row.total_duration || undefined,
        fileChanges: JSON.parse(row.file_changes_json || '[]'),
        tags: JSON.parse(row.tags_json || '[]'),
        error: row.error || undefined,
        stack: row.stack || undefined
      }
    }
  }

  /**
   * Generate UUID v4
   */
  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  /**
   * Convert task to plain text
   */
  private taskToText(task: Task): string {
    let text = `TASK: ${task.text}\n`
    text += `ID: ${task.id}\n`
    text += `Status: ${task.status}\n`
    text += `Created: ${new Date(task.createdAt).toLocaleString()}\n`
    text += `Updated: ${new Date(task.updatedAt).toLocaleString()}\n\n`

    text += `METRICS:\n`
    text += `  Tokens In: ${task.apiMetrics.tokensIn}\n`
    text += `  Tokens Out: ${task.apiMetrics.tokensOut}\n`
    text += `  Total Cost: $${task.apiMetrics.totalCost.toFixed(4)}\n\n`

    text += `CONVERSATION:\n`
    task.messages.forEach((msg, i) => {
      text += `\n[${i + 1}] ${msg.type.toUpperCase()} (${new Date(msg.ts).toLocaleTimeString()})\n`
      if (msg.text) {
        text += msg.text + '\n'
      }
    })

    return text
  }

  /**
   * Convert task to markdown
   */
  private taskToMarkdown(task: Task): string {
    let md = `# ${task.text}\n\n`
    md += `**ID:** ${task.id}  \n`
    md += `**Status:** ${task.status}  \n`
    md += `**Created:** ${new Date(task.createdAt).toLocaleString()}  \n`
    md += `**Updated:** ${new Date(task.updatedAt).toLocaleString()}  \n\n`

    md += `## Metrics\n\n`
    md += `| Metric | Value |\n`
    md += `|--------|-------|\n`
    md += `| Tokens In | ${task.apiMetrics.tokensIn} |\n`
    md += `| Tokens Out | ${task.apiMetrics.tokensOut} |\n`
    md += `| Cache Reads | ${task.apiMetrics.cacheReads} |\n`
    md += `| Cache Writes | ${task.apiMetrics.cacheWrites} |\n`
    md += `| Total Cost | $${task.apiMetrics.totalCost.toFixed(4)} |\n\n`

    md += `## Conversation\n\n`
    task.messages.forEach((msg, i) => {
      md += `### Message ${i + 1} (${msg.type})\n`
      md += `*${new Date(msg.ts).toLocaleString()}*\n\n`
      if (msg.text) {
        md += msg.text + '\n\n'
      }
    })

    return md
  }
}
