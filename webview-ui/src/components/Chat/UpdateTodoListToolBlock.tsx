/**
 * UpdateTodoListToolBlock Component
 *
 * Editable Todo List component for chat messages.
 * Each time the todo list changes (edit, add, delete, status switch),
 * the parent component is notified via the onChange callback.
 */

import React, { useState, useEffect, useRef } from 'react'
import { ToolUseBlock, ToolUseBlockHeader } from './ToolUseBlock'
import './UpdateTodoListToolBlock.css'

interface TodoItem {
  id?: string
  content: string
  status?: 'completed' | 'in_progress' | 'pending' | string
  activeForm?: string
}

interface UpdateTodoListToolBlockProps {
  /** Todo items to display */
  todos?: TodoItem[]

  /** Fallback content if todos is empty */
  content?: string

  /** Callback when todos change - must implement to sync with model */
  onChange: (todos: TodoItem[]) => void

  /** Whether editing is allowed */
  editable?: boolean

  /** Whether this was user edited */
  userEdited?: boolean
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Not Started', color: 'var(--vscode-foreground)', border: '#bbb', bg: 'transparent' },
  {
    value: 'in_progress',
    label: 'In Progress',
    color: 'var(--vscode-charts-yellow)',
    border: 'var(--vscode-charts-yellow)',
    bg: 'rgba(255, 221, 51, 0.15)',
  },
  {
    value: 'completed',
    label: 'Completed',
    color: 'var(--vscode-charts-green)',
    border: 'var(--vscode-charts-green)',
    bg: 'var(--vscode-charts-green)',
  },
]

const genId = () => Math.random().toString(36).slice(2, 10)

export const UpdateTodoListToolBlock: React.FC<UpdateTodoListToolBlockProps> = ({
  todos = [],
  content,
  onChange,
  editable = true,
  userEdited = false,
}) => {
  const [editTodos, setEditTodos] = useState<TodoItem[]>(
    todos.length > 0 ? todos.map((todo) => ({ ...todo, id: todo.id || genId() })) : []
  )
  const [adding, setAdding] = useState(false)
  const [newContent, setNewContent] = useState('')
  const newInputRef = useRef<HTMLInputElement>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  // Automatically exit edit mode when external editable becomes false
  useEffect(() => {
    if (!editable && isEditing) {
      setIsEditing(false)
    }
  }, [editable, isEditing])

  // Check if onChange is passed
  useEffect(() => {
    if (typeof onChange !== 'function') {
      console.warn('UpdateTodoListToolBlock: onChange callback not passed!')
    }
  }, [onChange])

  // Sync when external props.todos changes
  useEffect(() => {
    setEditTodos(todos.length > 0 ? todos.map((todo) => ({ ...todo, id: todo.id || genId() })) : [])
  }, [todos])

  // Auto focus on new item
  useEffect(() => {
    if (adding && newInputRef.current) {
      newInputRef.current.focus()
    }
  }, [adding])

  // Edit content
  const handleContentChange = (id: string, value: string) => {
    const newTodos = editTodos.map((todo) => (todo.id === id ? { ...todo, content: value } : todo))
    setEditTodos(newTodos)
    onChange?.(newTodos)
  }

  // Change status
  const handleStatusChange = (id: string, status: string) => {
    const newTodos = editTodos.map((todo) => (todo.id === id ? { ...todo, status } : todo))
    setEditTodos(newTodos)
    onChange?.(newTodos)
  }

  // Delete (confirmation dialog)
  const handleDelete = (id: string) => {
    setDeleteId(id)
  }

  const confirmDelete = () => {
    if (!deleteId) return
    const newTodos = editTodos.filter((todo) => todo.id !== deleteId)
    setEditTodos(newTodos)
    onChange?.(newTodos)
    setDeleteId(null)
  }

  const cancelDelete = () => setDeleteId(null)

  // Add
  const handleAdd = () => {
    if (!newContent.trim()) return
    const newTodo: TodoItem = {
      id: genId(),
      content: newContent.trim(),
      status: 'pending',
    }
    const newTodos = [...editTodos, newTodo]
    setEditTodos(newTodos)
    onChange?.(newTodos)
    setNewContent('')
    setAdding(false)
  }

  // Add on Enter
  const handleNewInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAdd()
    } else if (e.key === 'Escape') {
      setAdding(false)
      setNewContent('')
    }
  }

  if (userEdited) {
    return (
      <ToolUseBlock>
        <ToolUseBlockHeader>
          <div className="update-todo-header">
            <span className="codicon codicon-feedback update-todo-icon-warning" />
            <span className="update-todo-title">User Edit</span>
          </div>
        </ToolUseBlockHeader>
        <div className="update-todo-content">
          <span className="update-todo-user-edit">User Edits</span>
        </div>
      </ToolUseBlock>
    )
  }

  const getTodoIcon = (todo: TodoItem) => {
    if (todo.status === 'completed') {
      return <span className="update-todo-status-icon completed" />
    } else if (todo.status === 'in_progress') {
      return <span className="update-todo-status-icon in-progress" />
    } else {
      return <span className="update-todo-status-icon pending" />
    }
  }

  const getTodoColor = (todo: TodoItem) => {
    if (todo.status === 'completed') return 'var(--vscode-charts-green)'
    if (todo.status === 'in_progress') return 'var(--vscode-charts-yellow)'
    return 'var(--vscode-foreground)'
  }

  return (
    <>
      <ToolUseBlock>
        <ToolUseBlockHeader>
          <div className="update-todo-header">
            <span className="codicon codicon-checklist update-todo-icon" />
            <span className="update-todo-title">Todo List Updated</span>
            <div className="update-todo-spacer" />
            {editable && (
              <button
                className="update-todo-edit-button"
                onClick={() => setIsEditing(!isEditing)}
                style={{
                  border: isEditing ? '1px solid var(--vscode-button-border)' : '1px solid var(--vscode-button-secondaryBorder)',
                  background: isEditing ? 'var(--vscode-button-background)' : 'var(--vscode-button-secondaryBackground)',
                  color: isEditing ? 'var(--vscode-button-foreground)' : 'var(--vscode-button-secondaryForeground)',
                }}
              >
                {isEditing ? 'Done' : 'Edit'}
              </button>
            )}
          </div>
        </ToolUseBlockHeader>

        <div className="update-todo-content">
          {Array.isArray(editTodos) && editTodos.length > 0 ? (
            <ul className="update-todo-list">
              {editTodos.map((todo) => (
                <li key={todo.id} className="update-todo-item">
                  {getTodoIcon(todo)}
                  {isEditing ? (
                    <input
                      type="text"
                      value={todo.content}
                      placeholder="Enter todo item"
                      onChange={(e) => handleContentChange(todo.id!, e.target.value)}
                      className="update-todo-input"
                      onBlur={(e) => {
                        if (!e.target.value.trim()) {
                          handleDelete(todo.id!)
                        }
                      }}
                    />
                  ) : (
                    <span className="update-todo-text" style={{ color: getTodoColor(todo) }}>
                      {todo.content}
                    </span>
                  )}
                  {isEditing && (
                    <>
                      <select
                        value={todo.status || 'pending'}
                        onChange={(e) => handleStatusChange(todo.id!, e.target.value)}
                        className="update-todo-select"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleDelete(todo.id!)}
                        className="update-todo-delete-button"
                        title="Remove"
                      >
                        ×
                      </button>
                    </>
                  )}
                </li>
              ))}
              {adding ? (
                <li className="update-todo-item update-todo-item-new">
                  <span className="update-todo-status-icon-spacer" />
                  <input
                    ref={newInputRef}
                    type="text"
                    value={newContent}
                    placeholder="Enter todo item, press Enter to add"
                    onChange={(e) => setNewContent(e.target.value)}
                    onKeyDown={handleNewInputKeyDown}
                    className="update-todo-input"
                  />
                  <button
                    onClick={handleAdd}
                    disabled={!newContent.trim()}
                    className="update-todo-add-confirm-button"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setAdding(false)
                      setNewContent('')
                    }}
                    className="update-todo-cancel-button"
                  >
                    Cancel
                  </button>
                </li>
              ) : (
                <li className="update-todo-item-add">
                  {isEditing && (
                    <button onClick={() => setAdding(true)} className="update-todo-add-button">
                      + Add Todo
                    </button>
                  )}
                </li>
              )}
            </ul>
          ) : (
            <div className="update-todo-empty">{content || 'No todos'}</div>
          )}
        </div>

        {/* Delete confirmation dialog */}
        {deleteId && (
          <div className="update-todo-delete-overlay" onClick={cancelDelete}>
            <div className="update-todo-delete-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="update-todo-delete-message">
                Are you sure you want to delete this todo item?
              </div>
              <div className="update-todo-delete-actions">
                <button onClick={cancelDelete} className="update-todo-delete-cancel">
                  Cancel
                </button>
                <button onClick={confirmDelete} className="update-todo-delete-confirm">
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </ToolUseBlock>
    </>
  )
}
