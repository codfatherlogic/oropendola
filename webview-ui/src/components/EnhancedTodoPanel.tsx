import React, { useState } from 'react';
import { CollapsibleTodoItem } from './CollapsibleTodoItem';
import { TodoItem } from '../types';

interface EnhancedTodoPanelProps {
  todos: TodoItem[];
  visible: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  onSync: () => void;
  thinkingStatus?: string;
}

export const EnhancedTodoPanel: React.FC<EnhancedTodoPanelProps> = ({
  todos,
  visible,
  onToggle,
  onDelete,
  onClear,
  onSync,
  thinkingStatus
}) => {
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(true);

  if (!visible && todos.length === 0) return null;

  // Build hierarchical structure
  const buildHierarchy = (items: TodoItem[]): TodoItem[] => {
    const itemMap = new Map<string, TodoItem>();
    const rootItems: TodoItem[] = [];

    // First pass: create map and add children array
    items.forEach((item) => {
      itemMap.set(item.id, { ...item, children: [] });
    });

    // Second pass: build hierarchy
    items.forEach((item) => {
      const itemWithChildren = itemMap.get(item.id)!;

      if (item.parentId && itemMap.has(item.parentId)) {
        const parent = itemMap.get(item.parentId)!;
        parent.children!.push(itemWithChildren);
      } else {
        rootItems.push(itemWithChildren);
      }
    });

    return rootItems;
  };

  const hierarchicalTodos = buildHierarchy(todos);

  const stats = {
    total: todos.length,
    completed: todos.filter((t) => t.status === 'completed').length,
    pending: todos.filter((t) => t.status === 'pending').length,
    inProgress: todos.filter((t) => t.status === 'in_progress').length
  };

  return (
    <div className={`enhanced-todo-panel ${visible ? 'visible' : ''} ${isPanelCollapsed ? 'collapsed' : ''}`}>
      <div className="todo-header" onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}>
        <div className="todo-title">
          <button className="panel-collapse-arrow" aria-label={isPanelCollapsed ? 'Expand' : 'Collapse'}>
            {isPanelCollapsed ? '▶' : '▼'}
          </button>
          <span className="todo-icon">📋</span>
          <span>Tasks</span>
          <span className="todo-count">({stats.completed}/{stats.total})</span>
        </div>
        <div className="todo-actions" onClick={(e) => e.stopPropagation()}>
          <button className="todo-action-btn" onClick={onSync} title="Sync">
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

      {!isPanelCollapsed && (
        <>
          {thinkingStatus && (
            <div className="thinking-status">
              <span className="thinking-dot">●</span>
              <span className="thinking-text">{thinkingStatus}</span>
            </div>
          )}

          <div className="todo-content">
            {todos.length === 0 ? (
              <div className="todo-empty">
                <span>No tasks yet</span>
              </div>
            ) : (
              <div className="todo-list-hierarchical">
                {hierarchicalTodos.map((todo) => (
                  <CollapsibleTodoItem
                    key={todo.id}
                    todo={todo}
                    level={0}
                    onToggle={onToggle}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            )}

            {todos.length > 0 && (
              <div className="todo-stats-bar">
                {stats.inProgress > 0 && (
                  <span className="stat in-progress">
                    ⟳ {stats.inProgress} in progress
                  </span>
                )}
                {stats.pending > 0 && (
                  <span className="stat pending">
                    ○ {stats.pending} pending
                  </span>
                )}
                <span className="stat completed">
                  ✓ {stats.completed} completed
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
