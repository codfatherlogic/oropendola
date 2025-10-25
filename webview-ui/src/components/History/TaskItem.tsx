/**
 * TaskItem - Individual Task in History List
 * Sprint 1-2, Week 3: History View UI
 *
 * Features:
 * - Task status indicator
 * - Task text and metadata
 * - Formatted timestamps
 * - API metrics display
 * - Action buttons (load, delete, export)
 * - Export dropdown menu
 */

import React, { useState } from 'react'
import {
	Clock,
	Trash2,
	Download,
	ChevronDown,
	ChevronRight,
	MessageSquare,
	Coins,
	Zap
} from 'lucide-react'

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

interface TaskItemProps {
	task: Task
	onLoad: (taskId: string) => void
	onDelete: (taskId: string) => void
	onExport: (taskId: string, format: 'json' | 'txt' | 'md') => void
}

export const TaskItem: React.FC<TaskItemProps> = ({
	task,
	onLoad,
	onDelete,
	onExport
}) => {
	const [showExportMenu, setShowExportMenu] = useState(false)
	const [isExpanded, setIsExpanded] = useState(false)

	const formatDate = (timestamp: number): string => {
		const date = new Date(timestamp)
		const now = new Date()
		const diff = now.getTime() - date.getTime()
		const seconds = Math.floor(diff / 1000)
		const minutes = Math.floor(seconds / 60)
		const hours = Math.floor(minutes / 60)
		const days = Math.floor(hours / 24)

		if (seconds < 60) return 'just now'
		if (minutes < 60) return `${minutes}m ago`
		if (hours < 24) return `${hours}h ago`
		if (days < 7) return `${days}d ago`

		return date.toLocaleDateString()
	}

	const formatFullDate = (timestamp: number): string => {
		return new Date(timestamp).toLocaleString()
	}

	const formatNumber = (num: number): string => {
		if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
		if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
		return num.toString()
	}

	const formatDuration = (ms?: number): string => {
		if (!ms) return 'N/A'
		const seconds = Math.floor(ms / 1000)
		const minutes = Math.floor(seconds / 60)
		const hours = Math.floor(minutes / 60)

		if (hours > 0) return `${hours}h ${minutes % 60}m`
		if (minutes > 0) return `${minutes}m ${seconds % 60}s`
		return `${seconds}s`
	}

	const getStatusColor = (status: string): string => {
		switch (status) {
			case 'completed':
				return '#4caf50'
			case 'failed':
				return '#f44336'
			case 'terminated':
				return '#ff9800'
			case 'active':
				return '#2196f3'
			default:
				return '#757575'
		}
	}

	const getStatusLabel = (status: string): string => {
		return status.charAt(0).toUpperCase() + status.slice(1)
	}

	const totalTokens = task.apiMetrics.tokensIn + task.apiMetrics.tokensOut
	const cacheHitRate =
		task.apiMetrics.cacheReads + task.apiMetrics.cacheWrites > 0
			? (
					(task.apiMetrics.cacheReads /
						(task.apiMetrics.cacheReads + task.apiMetrics.cacheWrites)) *
					100
			  ).toFixed(0)
			: '0'

	const handleLoad = (e: React.MouseEvent) => {
		e.stopPropagation()
		onLoad(task.id)
	}

	const handleDelete = (e: React.MouseEvent) => {
		e.stopPropagation()
		if (
			confirm(
				`Delete task "${task.text}"?\n\nThis action cannot be undone.`
			)
		) {
			onDelete(task.id)
		}
	}

	const handleExport = (e: React.MouseEvent, format: 'json' | 'txt' | 'md') => {
		e.stopPropagation()
		onExport(task.id, format)
		setShowExportMenu(false)
	}

	const toggleExportMenu = (e: React.MouseEvent) => {
		e.stopPropagation()
		setShowExportMenu(!showExportMenu)
	}

	const toggleExpanded = () => {
		setIsExpanded(!isExpanded)
	}

	return (
		<div className="task-item" onClick={handleLoad}>
			{/* Status Indicator */}
			<div
				className="task-status-indicator"
				style={{ backgroundColor: getStatusColor(task.status) }}
				title={getStatusLabel(task.status)}
			/>

			{/* Main Content */}
			<div className="task-content">
				{/* Header */}
				<div className="task-header">
					<button
						className="expand-btn"
						onClick={(e) => {
							e.stopPropagation()
							toggleExpanded()
						}}
						title={isExpanded ? 'Collapse' : 'Expand'}
					>
						{isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
					</button>

					<div className="task-title-row">
						<h4 className="task-title">{task.text}</h4>
						<span
							className="task-status-badge"
							style={{ backgroundColor: getStatusColor(task.status) }}
						>
							{getStatusLabel(task.status)}
						</span>
					</div>
				</div>

				{/* Metadata */}
				<div className="task-meta">
					<span className="meta-item" title={formatFullDate(task.createdAt)}>
						<Clock size={12} />
						{formatDate(task.createdAt)}
					</span>

					<span className="meta-separator">•</span>

					<span className="meta-item" title="Total messages">
						<MessageSquare size={12} />
						{task.messages.length} msg{task.messages.length !== 1 ? 's' : ''}
					</span>

					<span className="meta-separator">•</span>

					<span className="meta-item" title="Total tokens">
						<Zap size={12} />
						{formatNumber(totalTokens)} tokens
					</span>

					<span className="meta-separator">•</span>

					<span className="meta-item" title="Total cost">
						<Coins size={12} />$
						{task.apiMetrics.totalCost.toFixed(4)}
					</span>

					{task.metadata.mode && (
						<>
							<span className="meta-separator">•</span>
							<span className="meta-item mode-badge">{task.metadata.mode}</span>
						</>
					)}
				</div>

				{/* Expanded Details */}
				{isExpanded && (
					<div className="task-details">
						<div className="detail-row">
							<span className="detail-label">ID:</span>
							<span className="detail-value monospace">{task.id}</span>
						</div>

						<div className="detail-row">
							<span className="detail-label">Created:</span>
							<span className="detail-value">
								{formatFullDate(task.createdAt)}
							</span>
						</div>

						<div className="detail-row">
							<span className="detail-label">Updated:</span>
							<span className="detail-value">
								{formatFullDate(task.updatedAt)}
							</span>
						</div>

						{task.completedAt && (
							<div className="detail-row">
								<span className="detail-label">Completed:</span>
								<span className="detail-value">
									{formatFullDate(task.completedAt)}
								</span>
							</div>
						)}

						<div className="detail-row">
							<span className="detail-label">Duration:</span>
							<span className="detail-value">
								{formatDuration(task.metadata.totalDuration)}
							</span>
						</div>

						<div className="detail-row">
							<span className="detail-label">Model:</span>
							<span className="detail-value">
								{task.metadata.model || 'N/A'}
							</span>
						</div>

						<div className="detail-row">
							<span className="detail-label">Tokens In:</span>
							<span className="detail-value">
								{formatNumber(task.apiMetrics.tokensIn)}
							</span>
						</div>

						<div className="detail-row">
							<span className="detail-label">Tokens Out:</span>
							<span className="detail-value">
								{formatNumber(task.apiMetrics.tokensOut)}
							</span>
						</div>

						<div className="detail-row">
							<span className="detail-label">Cache Hits:</span>
							<span className="detail-value">
								{formatNumber(task.apiMetrics.cacheReads)} ({cacheHitRate}%)
							</span>
						</div>

						<div className="detail-row">
							<span className="detail-label">Context Usage:</span>
							<span className="detail-value">
								{formatNumber(task.contextTokens)} /{' '}
								{formatNumber(task.contextWindow)}
							</span>
						</div>

						<div className="detail-row">
							<span className="detail-label">Checkpoints:</span>
							<span className="detail-value">{task.checkpoints.length}</span>
						</div>
					</div>
				)}
			</div>

			{/* Actions */}
			<div className="task-actions" onClick={(e) => e.stopPropagation()}>
				{/* Export Dropdown */}
				<div className="export-dropdown">
					<button
						className="action-btn export-btn"
						onClick={toggleExportMenu}
						title="Export task"
					>
						<Download size={16} />
						<ChevronDown size={12} />
					</button>

					{showExportMenu && (
						<>
							<div
								className="dropdown-backdrop"
								onClick={(e) => {
									e.stopPropagation()
									setShowExportMenu(false)
								}}
							/>
							<div className="export-menu">
								<button
									className="export-menu-item"
									onClick={(e) => handleExport(e, 'json')}
								>
									Export as JSON
								</button>
								<button
									className="export-menu-item"
									onClick={(e) => handleExport(e, 'txt')}
								>
									Export as TXT
								</button>
								<button
									className="export-menu-item"
									onClick={(e) => handleExport(e, 'md')}
								>
									Export as Markdown
								</button>
							</div>
						</>
					)}
				</div>

				{/* Delete Button */}
				<button
					className="action-btn delete-btn"
					onClick={handleDelete}
					title="Delete task"
				>
					<Trash2 size={16} />
				</button>
			</div>
		</div>
	)
}
