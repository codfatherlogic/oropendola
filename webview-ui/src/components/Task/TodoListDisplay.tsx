/**
 * Todo List Display
 * Shows todo items below the task header
 * Simplified for Phase 1
 */

import React from 'react'

export interface Todo {
  text: string
  done: boolean
}

export interface TodoListDisplayProps {
  todos: Todo[]
}

export const TodoListDisplay: React.FC<TodoListDisplayProps> = ({ todos }) => {
  if (!todos || todos.length === 0) return null

  return (
    <div className="roo-todo-list mt-2 px-3">
      <div className="bg-vscode-input-background rounded-md rounded-t-none border-t border-vscode-panel-border/50 px-2.5 py-2">
        <div className="space-y-1">
          {todos.map((todo, index) => (
            <div key={index} className="flex items-start gap-2 text-sm">
              <span className="text-vscode-descriptionForeground">
                {todo.done ? '✓' : '○'}
              </span>
              <span className={todo.done ? 'line-through text-vscode-descriptionForeground' : 'text-vscode-foreground'}>
                {todo.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default TodoListDisplay
