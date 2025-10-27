/**
 * TaskStorage - SQLite-based task persistence
 * Sprint 1-2: Task Persistence Layer
 *
 * Features:
 * - Full CRUD operations
 * - Full-text search (FTS5)
 * - Task filtering and pagination
 * - Export to JSON/TXT/Markdown
 * - Task statistics
 */

const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs').promises
const { v4: uuidv4 } = require('uuid')

class TaskStorage {
	constructor (storagePath) {
		this.storagePath = storagePath
		this.dbPath = path.join(storagePath, 'tasks.db')
		this.db = null
	}

	/**
	 * Initialize database connection and schema
	 */
	async initialize () {
		console.log('[TaskStorage] Initializing...')

		// Ensure storage directory exists
		await fs.mkdir(this.storagePath, { recursive: true })

		try {
			this.db = new Database(this.dbPath)
			console.log(`[TaskStorage] Database opened: ${this.dbPath}`)
			await this._initSchema()
			console.log('[TaskStorage] Schema initialized')
		} catch (err) {
			console.error('[TaskStorage] Failed to open database:', err)
			throw err
		}
	}

	/**
	 * Create database schema from schema.sql
	 */
	async _initSchema () {
		const schemaPath = path.join(__dirname, 'schema.sql')
		const schema = await fs.readFile(schemaPath, 'utf-8')

		this.db.exec(schema)
	}

	/**
	 * Create new task
	 * @param {Object} task - Task data
	 * @returns {Promise<Object>} Created task
	 */
	async createTask (task) {
		const id = task.id || uuidv4()
		const now = Date.now()

		const taskData = {
			id,
			text: task.text || 'Untitled Task',
			status: task.status || 'active',
			createdAt: task.createdAt || now,
			updatedAt: now,
			completedAt: task.completedAt || null,
			conversationId: task.conversationId || uuidv4(),
			messages: JSON.stringify(task.messages || []),
			apiMetrics: JSON.stringify(task.apiMetrics || this._emptyMetrics()),
			contextTokens: task.contextTokens || 0,
			contextWindow: task.contextWindow || 200000,
			checkpoints: JSON.stringify(task.checkpoints || []),
			currentCheckpoint: task.currentCheckpoint || null,
			metadata: JSON.stringify(task.metadata || this._defaultMetadata())
		}

		const sql = `
			INSERT INTO tasks (
				id, text, status, createdAt, updatedAt, completedAt,
				conversationId, messages, apiMetrics, contextTokens, contextWindow,
				checkpoints, currentCheckpoint, metadata
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`

		const values = [
			taskData.id,
			taskData.text,
			taskData.status,
			taskData.createdAt,
			taskData.updatedAt,
			taskData.completedAt,
			taskData.conversationId,
			taskData.messages,
			taskData.apiMetrics,
			taskData.contextTokens,
			taskData.contextWindow,
			taskData.checkpoints,
			taskData.currentCheckpoint,
			taskData.metadata
		]

		await this._run(sql, values)
		console.log(`[TaskStorage] Created task: ${id}`)

		return this.getTask(id)
	}

	/**
	 * Get task by ID
	 * @param {string} id - Task ID
	 * @returns {Promise<Object|null>} Task or null
	 */
	async getTask (id) {
		const sql = 'SELECT * FROM tasks WHERE id = ?'
		const row = await this._get(sql, [id])
		return row ? this._deserializeTask(row) : null
	}

	/**
	 * Update task
	 * @param {string} id - Task ID
	 * @param {Object} updates - Fields to update
	 * @returns {Promise<Object>} Updated task
	 */
	async updateTask (id, updates) {
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

		const values = [
			data.text,
			data.status,
			data.updatedAt,
			data.completedAt,
			data.messages,
			data.apiMetrics,
			data.contextTokens,
			data.checkpoints,
			data.currentCheckpoint,
			data.metadata,
			id
		]

		await this._run(sql, values)
		console.log(`[TaskStorage] Updated task: ${id}`)

		return this.getTask(id)
	}

	/**
	 * Delete task
	 * @param {string} id - Task ID
	 * @returns {Promise<boolean>} Success
	 */
	async deleteTask (id) {
		const sql = 'DELETE FROM tasks WHERE id = ?'
		await this._run(sql, [id])
		console.log(`[TaskStorage] Deleted task: ${id}`)
		return true
	}

	/**
	 * List tasks with filters
	 * @param {Object} filters - Filter options
	 * @returns {Promise<Array>} Tasks
	 */
	async listTasks (filters = {}) {
		const {
			status,
			limit = 100,
			offset = 0,
			sortBy = 'createdAt',
			sortOrder = 'DESC',
			search
		} = filters

		let sql
		const params = []
		const conditions = []

		// Full-text search
		if (search) {
			sql = `
				SELECT tasks.* FROM tasks
				JOIN tasks_fts ON tasks.rowid = tasks_fts.rowid
				WHERE tasks_fts MATCH ?
			`
			params.push(search)

			// Add status filter if provided
			if (status) {
				sql += ' AND tasks.status = ?'
				params.push(status)
			}
		} else {
			sql = 'SELECT * FROM tasks'

			// Status filter
			if (status) {
				conditions.push('status = ?')
				params.push(status)
			}

			// Build WHERE clause
			if (conditions.length > 0) {
				sql += ' WHERE ' + conditions.join(' AND ')
			}
		}

		// Sort and pagination
		sql += ` ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`
		params.push(limit, offset)

		const rows = await this._all(sql, params)
		return rows.map((row) => this._deserializeTask(row))
	}

	/**
	 * Export task to format
	 * @param {string} id - Task ID
	 * @param {string} format - Export format (json, txt, md)
	 * @returns {Promise<string>} Exported content
	 */
	async exportTask (id, format = 'json') {
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
	 * @returns {Promise<Object>} Statistics
	 */
	async getStats () {
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
	 * @returns {Promise<void>}
	 */
	async close () {
		return new Promise((resolve, reject) => {
			if (this.db) {
				this.db.close((err) => {
					if (err) {
						console.error('[TaskStorage] Failed to close database:', err)
						return reject(err)
					}
					this.db = null
					console.log('[TaskStorage] Database closed')
					resolve()
				})
			} else {
				resolve()
			}
		})
	}

	// ==================== Helper Methods ====================

	/**
	 * Execute SQL (no results)
	 */
	/**
	 * Run SQL (with parameters)
	 */
	async _run (sql, params = []) {
		const stmt = this.db.prepare(sql)
		const result = stmt.run(params)
		return { lastID: result.lastInsertRowid, changes: result.changes }
	}

	/**
	 * Get single row
	 */
	async _get (sql, params = []) {
		const stmt = this.db.prepare(sql)
		return stmt.get(params)
	}

	/**
	 * Get all rows
	 */
	async _all (sql, params = []) {
		const stmt = this.db.prepare(sql)
		return stmt.all(params)
	}

	/**
	 * Deserialize task from database row
	 */
	_deserializeTask (row) {
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

	/**
	 * Get empty API metrics
	 */
	_emptyMetrics () {
		return {
			tokensIn: 0,
			tokensOut: 0,
			cacheWrites: 0,
			cacheReads: 0,
			totalCost: 0,
			contextTokens: 0
		}
	}

	/**
	 * Get default metadata
	 */
	_defaultMetadata () {
		return {
			version: '3.5.0',
			mode: 'architect',
			model: 'default-model'
		}
	}

	/**
	 * Export task to plain text
	 */
	_exportToText (task) {
		const lines = [
			`Task: ${task.text}`,
			`Status: ${task.status}`,
			`Created: ${new Date(task.createdAt).toLocaleString()}`,
			`Updated: ${new Date(task.updatedAt).toLocaleString()}`,
			''
		]

		if (task.completedAt) {
			lines.push(`Completed: ${new Date(task.completedAt).toLocaleString()}`)
			lines.push('')
		}

		lines.push('Metrics:')
		lines.push(`  Tokens In: ${task.apiMetrics.tokensIn}`)
		lines.push(`  Tokens Out: ${task.apiMetrics.tokensOut}`)
		lines.push(`  Cache Writes: ${task.apiMetrics.cacheWrites}`)
		lines.push(`  Cache Reads: ${task.apiMetrics.cacheReads}`)
		lines.push(`  Total Cost: $${task.apiMetrics.totalCost.toFixed(4)}`)
		lines.push(`  Context: ${task.contextTokens}/${task.contextWindow}`)
		lines.push('')

		if (task.metadata.mode) {
			lines.push(`Mode: ${task.metadata.mode}`)
		}
		if (task.metadata.model) {
			lines.push(`Model: ${task.metadata.model}`)
		}
		lines.push('')

		lines.push('Conversation:')
		lines.push('')

		task.messages.forEach((msg, idx) => {
			const prefix = msg.type === 'ask' ? 'User:' : 'Assistant:'
			lines.push(`[${idx + 1}] ${prefix}`)
			lines.push(msg.text || msg.say || msg.ask || '')
			lines.push('')
		})

		return lines.join('\n')
	}

	/**
	 * Export task to Markdown
	 */
	_exportToMarkdown (task) {
		const lines = [
			`# ${task.text}`,
			'',
			`**Status:** ${task.status}`,
			`**Created:** ${new Date(task.createdAt).toLocaleString()}`,
			`**Updated:** ${new Date(task.updatedAt).toLocaleString()}`,
			''
		]

		if (task.completedAt) {
			lines.push(`**Completed:** ${new Date(task.completedAt).toLocaleString()}`)
			lines.push('')
		}

		lines.push('## Metrics')
		lines.push('')
		lines.push(`- **Tokens In:** ${task.apiMetrics.tokensIn}`)
		lines.push(`- **Tokens Out:** ${task.apiMetrics.tokensOut}`)
		lines.push(`- **Cache Writes:** ${task.apiMetrics.cacheWrites}`)
		lines.push(`- **Cache Reads:** ${task.apiMetrics.cacheReads}`)
		lines.push(`- **Total Cost:** $${task.apiMetrics.totalCost.toFixed(4)}`)
		lines.push(`- **Context:** ${task.contextTokens}/${task.contextWindow}`)
		lines.push('')

		if (task.metadata.mode || task.metadata.model) {
			lines.push('## Configuration')
			lines.push('')
			if (task.metadata.mode) {
				lines.push(`- **Mode:** ${task.metadata.mode}`)
			}
			if (task.metadata.model) {
				lines.push(`- **Model:** ${task.metadata.model}`)
			}
			lines.push('')
		}

		lines.push('## Conversation')
		lines.push('')

		task.messages.forEach((msg, idx) => {
			const prefix = msg.type === 'ask' ? '**User:**' : '**Assistant:**'
			lines.push(`### Message ${idx + 1}`)
			lines.push(prefix)
			lines.push('')
			lines.push(msg.text || msg.say || msg.ask || '')
			lines.push('')
		})

		return lines.join('\n')
	}
}

module.exports = TaskStorage
