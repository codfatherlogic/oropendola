/**
 * SimpleTaskHeader - Exact Roo-Code TaskHeader Implementation for Oropendola
 *
 * Matches Roo-Code's TaskHeader.tsx design exactly:
 * - Collapsible header with chevron indicator
 * - Inline metrics in collapsed state (tokens/contextWindow, cost)
 * - Expanded state shows full task text and detailed metrics table
 * - Progress bar for context window usage
 * - Integrated TodoListDisplay component
 * - Clean, professional styling matching Roo-Code exactly
 */

import React, { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import type { ClineMessage } from '../../types/cline-message'
import { TodoItem } from '../../context/ChatContext'
import { TodoListDisplay } from './TodoListDisplay'
import './SimpleTaskHeader.css'

interface SimpleTaskHeaderProps {
  // Task info
  task?: ClineMessage
  taskText?: string

  // Metrics
  tokensIn?: number
  tokensOut?: number
  cacheWrites?: number
  cacheReads?: number
  totalCost?: number
  contextTokens?: number
  contextWindow?: number

  // Todos
  todos?: TodoItem[]

  // Actions (kept for future condense context button)
  onCondenseContext?: () => void
}

export const SimpleTaskHeader: React.FC<SimpleTaskHeaderProps> = ({
  task,
  taskText,
  tokensIn = 0,
  tokensOut = 0,
  cacheWrites,
  cacheReads,
  totalCost = 0,
  contextTokens = 0,
  contextWindow = 200000,
  todos = [],
  onCondenseContext: _onCondenseContext,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  // Format large numbers like Roo-Code (e.g., 1000 -> 1k, 1000000 -> 1m)
  const formatLargeNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}m`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`
    return num.toString()
  }

  // Get task text
  const displayText = taskText || task?.text || 'New Task'

  // Check if we have todos to display
  const hasTodos = todos && todos.length > 0

  // Calculate context window progress percentage
  const contextPercent = contextWindow > 0 
    ? Math.min(100, ((contextTokens || 0) / contextWindow) * 100) 
    : 0

  return (
    <div className="task-header-container">
      {/* Main Task Header */}
      <div
        className={`task-header ${hasTodos ? 'has-todos' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
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
              {formatLargeNumber(contextTokens || 0)} / {formatLargeNumber(contextWindow)}
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
                  {/* Context Window with Progress Bar */}
                  {contextWindow > 0 && (
                    <tr>
                      <th>Context Window</th>
                      <td>
                        <div className="context-progress-container">
                          <div className="context-progress-wrapper">
                            <div className="context-progress-bar">
                              <div
                                className="context-progress-fill"
                                style={{ width: `${contextPercent}%` }}
                              />
                            </div>
                            <span className="context-progress-text">
                              {formatLargeNumber(contextTokens || 0)} / {formatLargeNumber(contextWindow)}
                            </span>
                          </div>
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
                            <span className="token-metric">↑ {formatLargeNumber(tokensIn)}</span>
                          )}
                          {tokensOut > 0 && (
                            <span className="token-metric">↓ {formatLargeNumber(tokensOut)}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Cache (if available) */}
                  {((typeof cacheReads === 'number' && cacheReads > 0) ||
                    (typeof cacheWrites === 'number' && cacheWrites > 0)) && (
                    <tr>
                      <th>Cache</th>
                      <td>
                        <div className="tokens-display">
                          {typeof cacheWrites === 'number' && cacheWrites > 0 && (
                            <span className="token-metric">↑ {formatLargeNumber(cacheWrites)}</span>
                          )}
                          {typeof cacheReads === 'number' && cacheReads > 0 && (
                            <span className="token-metric">↓ {formatLargeNumber(cacheReads)}</span>
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
