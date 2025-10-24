import React, { useState, useEffect } from 'react';
import { TodoItem } from '../types';

interface CollapsibleTodoItemProps {
  todo: TodoItem;
  level?: number;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export const CollapsibleTodoItem: React.FC<CollapsibleTodoItemProps> = ({
  todo,
  level = 0,
  onToggle,
  onDelete
}) => {
  const hasChildren = todo.children && todo.children.length > 0;
  const indent = level * 20;

  // Smart auto-collapse: expand only in_progress todos, collapse pending/completed
  const getInitialExpandedState = () => {
    if (!hasChildren) return true;
    return todo.status === 'in_progress'; // Expand only active work
  };

  const [isExpanded, setIsExpanded] = useState(getInitialExpandedState);

  // Auto-expand when todo becomes in_progress, collapse when pending/completed
  useEffect(() => {
    if (hasChildren) {
      if (todo.status === 'in_progress') {
        setIsExpanded(true);
      } else if (todo.status === 'pending' || todo.status === 'completed') {
        setIsExpanded(false);
      }
    }
  }, [todo.status, hasChildren]);

  const getStatusIcon = () => {
    switch (todo.status) {
      case 'completed':
        return '✓';
      case 'in_progress':
        return '⟳';
      case 'pending':
        return '○';
      case 'failed':
        return '✗';
      default:
        return '○';
    }
  };

  const getStatusColor = () => {
    switch (todo.status) {
      case 'completed':
        return '#4CAF50';
      case 'in_progress':
        return '#FFC107';
      case 'pending':
        return '#9E9E9E';
      case 'failed':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  return (
    <div className="collapsible-todo-container">
      <div
        className={`collapsible-todo-item level-${level} ${todo.status}`}
        style={{ paddingLeft: `${indent}px` }}
      >
        {hasChildren && (
          <button
            className="collapse-arrow"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        )}

        <div
          className="status-indicator"
          style={{ color: getStatusColor() }}
        >
          {getStatusIcon()}
        </div>

        <div className="todo-content-wrapper" onClick={() => onToggle(todo.id)}>
          <span className={`todo-text ${todo.status === 'completed' ? 'completed' : ''}`}>
            {todo.content || todo.text}
          </span>

          {todo.metadata && (
            <span className="todo-metadata">
              {todo.metadata.linesOfOutput && `${todo.metadata.linesOfOutput} lines of output`}
              {todo.metadata.filePath && ` (${todo.metadata.filePath})`}
            </span>
          )}
        </div>

        <button
          className="todo-delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(todo.id);
          }}
          title="Delete"
        >
          ✕
        </button>
      </div>

      {hasChildren && isExpanded && (
        <div className="todo-children">
          {todo.children!.map((child) => (
            <CollapsibleTodoItem
              key={child.id}
              todo={child}
              level={level + 1}
              onToggle={onToggle}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};
