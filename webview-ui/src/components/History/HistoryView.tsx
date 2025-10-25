/**
 * HistoryView - Task History Interface
 * Sprint 1-2, Week 3: History View UI
 *
 * Features:
 * - Virtualized task list (1000+ tasks)
 * - Real-time search with debouncing
 * - Status filtering
 * - Sort by created/updated
 * - Task actions (load, delete, export)
 * - Empty states
 * - Loading states
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Virtuoso } from 'react-virtuoso'
import { Search, X, Filter, SortDesc, RefreshCw } from 'lucide-react'
import { TaskItem } from './TaskItem'
import vscode from '../../vscode-api'
import './HistoryView.css'

interface Task {
	id: string
	text: string
	status: 'active' | 'completed' | 'failed' | 'terminated'
	createdAt: number
	updatedAt: number
	completedAt?: number
	conversationId: string
	messages: any[]
	apiMetrics: {
		tokensIn: number
		tokensOut: number
		cacheWrites: number
		cacheReads: number
		totalCost: number
		contextTokens: number
	}
	contextTokens: number
	contextWindow: number
	checkpoints: any[]
	metadata: {
		version?: string
		mode?: string
		model?: string
		totalDuration?: number
		[key: string]: any
	}
}

interface TaskStats {
	total: number
	active: number
	completed: number
	failed: number
	terminated: number
}

export const HistoryView: React.FC = () => {
	const [tasks, setTasks] = useState<Task[]>([])
	const [stats, setStats] = useState<TaskStats | null>(null)
	const [loading, setLoading] = useState(true)
	const [searchQuery, setSearchQuery] = useState('')
	const [debouncedSearch, setDebouncedSearch] = useState('')
	const [statusFilter, setStatusFilter] = useState<string>('all')
	const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt'>('createdAt')
	const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC')

	// Debounce search input
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(searchQuery)
		}, 300)

		return () => clearTimeout(timer)
	}, [searchQuery])

	// Load tasks when filters change
	useEffect(() => {
		loadTasks()
	}, [debouncedSearch, statusFilter, sortBy, sortOrder])

	// Load task statistics
	useEffect(() => {
		loadStats()
	}, [])

	// Listen for messages from extension
	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			const message = event.data

			switch (message.type) {
				case 'taskList':
					setTasks(message.tasks || [])
					setLoading(false)
					break

				case 'taskStats':
					setStats(message.stats || null)
					break

				case 'taskDeleted':
					// Remove task from list
					setTasks((prev) => prev.filter((t) => t.id !== message.taskId))
					loadStats() // Refresh stats
					break

				case 'taskExported':
					// Handle export completion
					console.log('Task exported:', message.taskId, message.format)
					break

				case 'taskLoaded':
					// Task loaded in main view - optionally show notification
					console.log('Task loaded:', message.taskId)
					break

				case 'error':
					console.error('History error:', message.error)
					setLoading(false)
					break
			}
		}

		window.addEventListener('message', handleMessage)
		return () => window.removeEventListener('message', handleMessage)
	}, [])

	const loadTasks = useCallback(() => {
		setLoading(true)

		vscode.postMessage({
			type: 'listTasks',
			filters: {
				status: statusFilter === 'all' ? undefined : statusFilter,
				search: debouncedSearch || undefined,
				sortBy,
				sortOrder,
				limit: 1000, // Load up to 1000 tasks
				offset: 0
			}
		})
	}, [debouncedSearch, statusFilter, sortBy, sortOrder])

	const loadStats = useCallback(() => {
		vscode.postMessage({
			type: 'getTaskStats'
		})
	}, [])

	const handleRefresh = useCallback(() => {
		loadTasks()
		loadStats()
	}, [loadTasks, loadStats])

	const handleLoadTask = useCallback((taskId: string) => {
		vscode.postMessage({
			type: 'loadTask',
			taskId
		})
	}, [])

	const handleDeleteTask = useCallback((taskId: string) => {
		vscode.postMessage({
			type: 'deleteTask',
			taskId
		})
	}, [])

	const handleExportTask = useCallback(
		(taskId: string, format: 'json' | 'txt' | 'md') => {
			vscode.postMessage({
				type: 'exportTask',
				taskId,
				format
			})
		},
		[]
	)

	const handleClearSearch = useCallback(() => {
		setSearchQuery('')
	}, [])

	const toggleSortOrder = useCallback(() => {
		setSortOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'))
	}, [])

	// Filter tasks client-side (in addition to server-side for instant feedback)
	const filteredTasks = useMemo(() => {
		let filtered = tasks

		// Client-side search filter for instant feedback
		if (searchQuery && !debouncedSearch) {
			const query = searchQuery.toLowerCase()
			filtered = filtered.filter((task) =>
				task.text.toLowerCase().includes(query)
			)
		}

		return filtered
	}, [tasks, searchQuery, debouncedSearch])

	return (
		<div className="history-view">
			{/* Header */}
			<div className="history-header">
				<div className="history-title">
					<h2>Task History</h2>
					{stats && (
						<span className="task-count">
							{stats.total} task{stats.total !== 1 ? 's' : ''}
						</span>
					)}
				</div>

				<button
					className="refresh-btn"
					onClick={handleRefresh}
					disabled={loading}
					title="Refresh"
				>
					<RefreshCw size={16} className={loading ? 'spinning' : ''} />
				</button>
			</div>

			{/* Statistics Bar */}
			{stats && stats.total > 0 && (
				<div className="stats-bar">
					<div
						className={`stat-item ${statusFilter === 'active' ? 'active' : ''}`}
						onClick={() =>
							setStatusFilter(statusFilter === 'active' ? 'all' : 'active')
						}
					>
						<span className="stat-label">Active</span>
						<span className="stat-value">{stats.active || 0}</span>
					</div>
					<div
						className={`stat-item ${
							statusFilter === 'completed' ? 'active' : ''
						}`}
						onClick={() =>
							setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')
						}
					>
						<span className="stat-label">Completed</span>
						<span className="stat-value">{stats.completed || 0}</span>
					</div>
					<div
						className={`stat-item ${statusFilter === 'failed' ? 'active' : ''}`}
						onClick={() =>
							setStatusFilter(statusFilter === 'failed' ? 'all' : 'failed')
						}
					>
						<span className="stat-label">Failed</span>
						<span className="stat-value">{stats.failed || 0}</span>
					</div>
					<div
						className={`stat-item ${
							statusFilter === 'terminated' ? 'active' : ''
						}`}
						onClick={() =>
							setStatusFilter(
								statusFilter === 'terminated' ? 'all' : 'terminated'
							)
						}
					>
						<span className="stat-label">Terminated</span>
						<span className="stat-value">{stats.terminated || 0}</span>
					</div>
				</div>
			)}

			{/* Controls */}
			<div className="history-controls">
				{/* Search */}
				<div className="search-box">
					<Search className="search-icon" size={16} />
					<input
						type="text"
						placeholder="Search tasks..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="search-input"
					/>
					{searchQuery && (
						<button
							className="clear-search-btn"
							onClick={handleClearSearch}
							title="Clear search"
						>
							<X size={14} />
						</button>
					)}
				</div>

				{/* Filters */}
				<div className="filter-group">
					<div className="filter-item">
						<Filter size={14} />
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
					</div>

					<div className="filter-item">
						<select
							value={sortBy}
							onChange={(e) => setSortBy(e.target.value as any)}
							className="filter-select"
						>
							<option value="createdAt">Sort: Created</option>
							<option value="updatedAt">Sort: Updated</option>
						</select>
					</div>

					<button
						className="sort-order-btn"
						onClick={toggleSortOrder}
						title={`Sort ${sortOrder === 'DESC' ? 'Descending' : 'Ascending'}`}
					>
						<SortDesc
							size={16}
							className={sortOrder === 'ASC' ? 'flipped' : ''}
						/>
					</button>
				</div>
			</div>

			{/* Task List */}
			<div className="history-list">
				{loading && tasks.length === 0 ? (
					<div className="loading-state">
						<RefreshCw size={24} className="spinning" />
						<p>Loading tasks...</p>
					</div>
				) : filteredTasks.length === 0 ? (
					<div className="empty-state">
						{searchQuery || statusFilter !== 'all' ? (
							<>
								<Search size={48} opacity={0.3} />
								<h3>No tasks found</h3>
								<p>
									Try adjusting your search or filters
								</p>
								<button
									className="reset-filters-btn"
									onClick={() => {
										setSearchQuery('')
										setStatusFilter('all')
									}}
								>
									Clear Filters
								</button>
							</>
						) : (
							<>
								<div className="empty-icon">📋</div>
								<h3>No tasks yet</h3>
								<p>
									Start a conversation to create your first task
								</p>
							</>
						)}
					</div>
				) : (
					<Virtuoso
						data={filteredTasks}
						itemContent={(_index, task) => (
							<TaskItem
								key={task.id}
								task={task}
								onLoad={handleLoadTask}
								onDelete={handleDeleteTask}
								onExport={handleExportTask}
							/>
						)}
						style={{ height: 'calc(100vh - 280px)' }}
						className="task-list-virtuoso"
					/>
				)}
			</div>
		</div>
	)
}
