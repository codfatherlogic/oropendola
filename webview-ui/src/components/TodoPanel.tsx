import React from 'react';
import { TodoItem } from '../types';

interface TodoPanelProps {
  todos: TodoItem[];
  visible: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  onSync: () => void;
}

export const TodoPanel: React.FC<TodoPanelProps> = ({
  todos,
  visible,
  onToggle,
  onDelete,
  onClear,
  onSync
}) => {
  if (!visible) return null;

  const stats = {
    total: todos.length,
    completed: todos.filter((t) => t.status === 'completed').length,
    pending: todos.filter((t) => t.status === 'pending').length,
    inProgress: todos.filter((t) => t.status === 'in_progress').length
  };

  const getStatusIcon = (status: TodoItem['status']) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'in_progress':
        return '⟳';
      case 'pending':
        return '○';
    }
  };

  return (
    <div className="todo-panel visible">
      <div className="todo-header">
        <div className="todo-title">
          📋 Tasks ({stats.completed}/{stats.total})
        </div>
        <div className="todo-actions">
          <button className="todo-action-btn" onClick={onSync} title="Sync with backend">
            🔄
          </button>
          <button
            className="todo-action-btn"
            onClick={onClear}
            title="Clear all"
            disabled={todos.length === 0}
          >
            🗑
          </button>
        </div>
      </div>
      <div className="todo-content">
        {todos.length === 0 ? (
          <div className="todo-empty">No tasks yet</div>
        ) : (
          <ul className="todo-list">
            {todos.map((todo) => (
              <li key={todo.id} className={`todo-item ${todo.status}`}>
                <button
                  className="todo-checkbox"
                  onClick={() => onToggle(todo.id)}
                  title={`Mark as ${todo.status === 'completed' ? 'incomplete' : 'complete'}`}
                >
                  {getStatusIcon(todo.status)}
                </button>
                <span className="todo-content-text">
                  {todo.status === 'in_progress' ? todo.activeForm : todo.content}
                </span>
                <button
                  className="todo-delete-btn"
                  onClick={() => onDelete(todo.id)}
                  title="Delete task"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        {todos.length > 0 && (
          <div className="todo-stats">
            <span className="todo-stat">
              ✓ {stats.completed} completed
            </span>
            <span className="todo-stat">
              ⟳ {stats.inProgress} in progress
            </span>
            <span className="todo-stat">
              ○ {stats.pending} pending
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
