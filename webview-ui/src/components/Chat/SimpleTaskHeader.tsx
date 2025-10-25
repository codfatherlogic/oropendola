/**
 * SimpleTaskHeader - Roo-Code Style Task Header for Oropendola
 *
 * This is a simplified version of Roo-Code's TaskHeader that works with
 * our current data structure while maintaining the exact same visual appearance.
 */

import React, { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import type { ClineMessage } from '../../types/cline-message'
import { TodoItem } from '../../context/ChatContext'
import { TodoListDisplay } from './TodoListDisplay'

interface SimpleTaskHeaderProps {
  // Task info
  task?: ClineMessage
  taskText?: string

  // Metrics
  tokensIn?: number
  tokensOut?: number
  totalCost?: number
  contextTokens?: number
  contextWindow?: number

  // Todos
  todos?: TodoItem[]

  // Actions
  onCondenseContext?: () => void
}

export const SimpleTaskHeader: React.FC<SimpleTaskHeaderProps> = ({
  task,
  taskText,
  tokensIn = 0,
  tokensOut = 0,
  totalCost = 0,
  contextTokens = 0,
  contextWindow = 200000,
  todos = [],
  onCondenseContext: _onCondenseContext,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  // Format large numbers like Roo-Code
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}m`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`
    return num.toString()
  }

  // Get task text
  const displayText = taskText || task?.text || 'New Task'

  // Check if we have todos to display
  const hasTodos = todos && todos.length > 0

  return (
    <div className="task-header-container">
      {/* Main Task Header */}
      <div
        className={`task-header ${hasTodos ? 'has-todos' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ cursor: 'pointer' }}
      >
        {/* Top Row */}
        <div className="task-header-top">
          <div className="task-title-container">
            {isExpanded && <span className="task-label">Task:</span>}
            {!isExpanded && (
              <div className="task-title-inline">
                <span className="task-label">Task</span>
                <span className="task-text">{displayText}</span>
              </div>
            )}
          </div>

          <div className="task-header-actions" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="expand-button"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {/* Metrics Row (Collapsed State) */}
        {!isExpanded && contextWindow > 0 && (
          <div className="task-metrics-inline">
            <span className="metric-item">
              {formatNumber(contextTokens || 0)} / {formatNumber(contextWindow)}
            </span>
            {!!totalCost && totalCost > 0 && (
              <span className="metric-item">
                ${totalCost.toFixed(2)}
              </span>
            )}
          </div>
        )}

        {/* Expanded State */}
        {isExpanded && (
          <>
            {/* Task Text */}
            <div className="task-text-expanded">
              {displayText}
            </div>

            {/* Metrics Table */}
            <div className="task-metrics-table">
              <table>
                <tbody>
                  {/* Context Window */}
                  {contextWindow > 0 && (
                    <tr>
                      <th>Context Window</th>
                      <td>
                        <div className="context-progress-container">
                          <div className="context-progress-bar">
                            <div
                              className="context-progress-fill"
                              style={{
                                width: `${Math.min(100, ((contextTokens || 0) / contextWindow) * 100)}%`
                              }}
                            />
                          </div>
                          <span className="context-progress-text">
                            {formatNumber(contextTokens || 0)} / {formatNumber(contextWindow)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Tokens */}
                  {(tokensIn > 0 || tokensOut > 0) && (
                    <tr>
                      <th>Tokens</th>
                      <td>
                        <div className="tokens-display">
                          {tokensIn > 0 && (
                            <span className="token-metric">↑ {formatNumber(tokensIn)}</span>
                          )}
                          {tokensOut > 0 && (
                            <span className="token-metric">↓ {formatNumber(tokensOut)}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* API Cost */}
                  {!!totalCost && totalCost > 0 && (
                    <tr>
                      <th>API Cost</th>
                      <td>${totalCost.toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Todo List - using Roo-Code TodoListDisplay */}
      {hasTodos && <TodoListDisplay todos={todos} />}
    </div>
  )
}
