import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Virtuoso } from 'react-virtuoso'
import { VSCodeButton, VSCodeTextField, VSCodeDropdown, VSCodeOption } from '@vscode/webview-ui-toolkit/react'
import type { Task, TaskStatus, TaskFilters } from '../../types/task.ts'
import { TaskHistoryItem } from './TaskHistoryItem'
import { TaskCreationDialog } from './TaskCreationDialog'
import './TaskHistoryView.css'

export interface TaskHistoryViewProps {
  onTaskLoad?: (taskId: string) => void
  onTaskDelete?: (taskId: string) => void
}

/**
 * TaskHistoryView Component
 *
 * Displays a virtualized list of all tasks with search and filtering.
 * Features:
 * - Full-text search across task text and messages
 * - Filter by status, date range, cost
 * - Sort by date, tokens, cost
 * - Quick preview on hover
 * - Batch operations
 * - Export tasks
 *
 * Sprint 1-2: Task Persistence Layer - Week 3-4
 */
export const TaskHistoryView: React.FC<TaskHistoryViewProps> = ({
  onTaskLoad,
  onTaskDelete
}) => {
  // State
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'cost' | 'tokens'>('updatedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [stats, setStats] = useState<{
    total: number
    active: number
    completed: number
    failed: number
    terminated: number
  } | null>(null)

  // Load tasks on mount
  useEffect(() => {
    loadTasks()
    loadStats()
  }, [])

  // Load tasks whenever filters change
  useEffect(() => {
    loadTasks()
  }, [searchQuery, statusFilter, sortBy, sortOrder])

  /**
   * Load tasks from backend
   */
  const loadTasks = useCallback(async () => {
    setLoading(true)

    const filters: TaskFilters = {
      sortBy: sortBy,
      sortOrder: sortOrder
    }

    if (searchQuery.trim()) {
      filters.search = searchQuery.trim()
    }

    if (statusFilter !== 'all') {
      filters.status = statusFilter
    }

    // Send message to extension
    window.vscode.postMessage({
      type: 'listTasks',
      filters
    })

    // Note: Response will come via message listener (handled by parent)
  }, [searchQuery, statusFilter, sortBy, sortOrder])

  /**
   * Load task statistics
   */
  const loadStats = useCallback(() => {
    window.vscode.postMessage({
      type: 'getTaskStats'
    })
  }, [])

  /**
   * Handle task list response from extension
   */
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

        case 'taskCreated':
          // Reload tasks when new task is created
          if (message.success) {
            loadTasks()
            loadStats()
          }
          break

        case 'taskStatusChanged':
          // Reload tasks when status changes
          if (message.success) {
            loadTasks()
            loadStats()
          }
          break

        case 'taskDeleted':
          // Reload tasks when task is deleted
          if (message.success) {
            loadTasks()
            loadStats()
            setSelectedTasks(prev => {
              const next = new Set(prev)
              next.delete(message.taskId)
              return next
            })
          }
          break
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [loadTasks, loadStats])

  /**
   * Handle task selection
   */
  const handleTaskSelect = useCallback((taskId: string, selected: boolean) => {
    setSelectedTasks(prev => {
      const next = new Set(prev)
      if (selected) {
        next.add(taskId)
      } else {
        next.delete(taskId)
      }
      return next
    })
  }, [])

  /**
   * Handle select all
   */
  const handleSelectAll = useCallback(() => {
    if (selectedTasks.size === tasks.length) {
      setSelectedTasks(new Set())
    } else {
      setSelectedTasks(new Set(tasks.map(t => t.id)))
    }
  }, [tasks, selectedTasks])

  /**
   * Handle batch delete
   */
  const handleBatchDelete = useCallback(() => {
    if (selectedTasks.size === 0) return

    const confirmed = window.confirm(
      `Delete ${selectedTasks.size} task${selectedTasks.size > 1 ? 's' : ''}?`
    )

    if (confirmed) {
      selectedTasks.forEach(taskId => {
        window.vscode.postMessage({
          type: 'deleteTask',
          taskId,
          permanent: false
        })
      })
      setSelectedTasks(new Set())
    }
  }, [selectedTasks])

  /**
   * Handle batch export
   */
  const handleBatchExport = useCallback(() => {
    if (selectedTasks.size === 0) return

    window.vscode.postMessage({
      type: 'batchExport',
      taskIds: Array.from(selectedTasks),
      format: 'json'
    })
  }, [selectedTasks])

  /**
   * Handle batch status change
   */
  const handleBatchStatusChange = useCallback((status: TaskStatus) => {
    if (selectedTasks.size === 0) return

    const confirmed = window.confirm(
      `Change status of ${selectedTasks.size} task${selectedTasks.size > 1 ? 's' : ''} to ${status}?`
    )

    if (confirmed) {
      window.vscode.postMessage({
        type: 'batchSetStatus',
        taskIds: Array.from(selectedTasks),
        status
      })
      setSelectedTasks(new Set())
    }
  }, [selectedTasks])

  /**
   * Handle batch add tags
   */
  const handleBatchAddTags = useCallback(() => {
    if (selectedTasks.size === 0) return

    const tagsInput = window.prompt('Enter tags (comma-separated):')
    if (!tagsInput) return

    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)
    if (tags.length === 0) return

    window.vscode.postMessage({
      type: 'batchAddTags',
      taskIds: Array.from(selectedTasks),
      tags
    })
    setSelectedTasks(new Set())
  }, [selectedTasks])

  /**
   * Handle refresh
   */
  const handleRefresh = useCallback(() => {
    loadTasks()
    loadStats()
  }, [loadTasks, loadStats])

  /**
   * Filtered and sorted tasks (memoized)
   */
  const displayTasks = useMemo(() => {
    return tasks // Filtering/sorting already done on backend
  }, [tasks])

  /**
   * Render row in virtualized list
   */
  const renderTaskItem = useCallback((index: number) => {
    const task = displayTasks[index]
    const isSelected = selectedTasks.has(task.id)

    return (
      <TaskHistoryItem
        key={task.id}
        task={task}
        selected={isSelected}
        onSelect={(selected) => handleTaskSelect(task.id, selected)}
        onLoad={() => onTaskLoad?.(task.id)}
        onDelete={() => onTaskDelete?.(task.id)}
      />
    )
  }, [displayTasks, selectedTasks, handleTaskSelect, onTaskLoad, onTaskDelete])

  return (
    <div className="task-history-view">
      {/* Header */}
      <div className="task-history-header">
        <h2>Task History</h2>
        <VSCodeButton
          appearance="primary"
          onClick={() => setShowCreateDialog(true)}
        >
          <span className="codicon codicon-add"></span>
          New Task
        </VSCodeButton>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="task-history-stats">
          <div className="task-stat">
            <span className="task-stat-label">Total:</span>
            <span className="task-stat-value">{stats.total}</span>
          </div>
          <div className="task-stat">
            <span className="task-stat-label">Active:</span>
            <span className="task-stat-value status-active">{stats.active}</span>
          </div>
          <div className="task-stat">
            <span className="task-stat-label">Completed:</span>
            <span className="task-stat-value status-completed">{stats.completed}</span>
          </div>
          <div className="task-stat">
            <span className="task-stat-label">Failed:</span>
            <span className="task-stat-value status-failed">{stats.failed}</span>
          </div>
          <div className="task-stat">
            <span className="task-stat-label">Stopped:</span>
            <span className="task-stat-value status-terminated">{stats.terminated}</span>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="task-history-filters">
        <div className="task-history-search">
          <VSCodeTextField
            value={searchQuery}
            onInput={(e: any) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
          >
            <span slot="start" className="codicon codicon-search"></span>
          </VSCodeTextField>
        </div>

        <div className="task-history-filter-row">
          <div className="task-history-filter">
            <label>Status:</label>
            <VSCodeDropdown
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
            >
              <VSCodeOption value="all">All</VSCodeOption>
              <VSCodeOption value="active">Active</VSCodeOption>
              <VSCodeOption value="completed">Completed</VSCodeOption>
              <VSCodeOption value="failed">Failed</VSCodeOption>
              <VSCodeOption value="terminated">Stopped</VSCodeOption>
            </VSCodeDropdown>
          </div>

          <div className="task-history-filter">
            <label>Sort by:</label>
            <VSCodeDropdown
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
            >
              <VSCodeOption value="updatedAt">Last Updated</VSCodeOption>
              <VSCodeOption value="createdAt">Created Date</VSCodeOption>
              <VSCodeOption value="cost">Cost</VSCodeOption>
              <VSCodeOption value="tokens">Tokens</VSCodeOption>
            </VSCodeDropdown>
          </div>

          <div className="task-history-filter">
            <label>Order:</label>
            <VSCodeDropdown
              value={sortOrder}
              onChange={(e: any) => setSortOrder(e.target.value)}
            >
              <VSCodeOption value="desc">Descending</VSCodeOption>
              <VSCodeOption value="asc">Ascending</VSCodeOption>
            </VSCodeDropdown>
          </div>

          <VSCodeButton
            appearance="icon"
            onClick={handleRefresh}
            title="Refresh"
          >
            <span className="codicon codicon-refresh"></span>
          </VSCodeButton>
        </div>
      </div>

      {/* Batch Actions */}
      {selectedTasks.size > 0 && (
        <div className="task-history-batch-actions">
          <span className="batch-actions-label">
            {selectedTasks.size} selected
          </span>
          <VSCodeButton
            appearance="secondary"
            onClick={handleSelectAll}
          >
            {selectedTasks.size === tasks.length ? 'Deselect All' : 'Select All'}
          </VSCodeButton>

          {/* Status Change Actions */}
          <VSCodeButton
            appearance="secondary"
            onClick={() => handleBatchStatusChange('completed')}
            title="Mark selected as completed"
          >
            <span className="codicon codicon-check"></span>
            Complete
          </VSCodeButton>
          <VSCodeButton
            appearance="secondary"
            onClick={() => handleBatchStatusChange('terminated')}
            title="Stop selected tasks"
          >
            <span className="codicon codicon-stop"></span>
            Stop
          </VSCodeButton>

          {/* Tag Actions */}
          <VSCodeButton
            appearance="secondary"
            onClick={handleBatchAddTags}
            title="Add tags to selected"
          >
            <span className="codicon codicon-tag"></span>
            Add Tags
          </VSCodeButton>

          {/* Export & Delete */}
          <VSCodeButton
            appearance="secondary"
            onClick={handleBatchExport}
            title="Export selected"
          >
            <span className="codicon codicon-export"></span>
            Export
          </VSCodeButton>
          <VSCodeButton
            appearance="secondary"
            onClick={handleBatchDelete}
            title="Delete selected"
          >
            <span className="codicon codicon-trash"></span>
            Delete
          </VSCodeButton>
        </div>
      )}

      {/* Task List */}
      <div className="task-history-list">
        {loading ? (
          <div className="task-history-loading">
            <span className="codicon codicon-loading codicon-modifier-spin"></span>
            Loading tasks...
          </div>
        ) : displayTasks.length === 0 ? (
          <div className="task-history-empty">
            <span className="codicon codicon-inbox"></span>
            <p>No tasks found</p>
            {searchQuery && (
              <VSCodeButton
                appearance="secondary"
                onClick={() => setSearchQuery('')}
              >
                Clear search
              </VSCodeButton>
            )}
          </div>
        ) : (
          <Virtuoso
            data={displayTasks}
            itemContent={(index) => renderTaskItem(index)}
            style={{ height: '100%' }}
            overscan={200}
          />
        )}
      </div>

      {/* Create Task Dialog */}
      <TaskCreationDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />
    </div>
  )
}
