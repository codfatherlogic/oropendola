/**
 * TaskHeader - Roo-Code UI Implementation for Oropendola
 *
 * Exact visual match to Roo-Code's TaskHeader.tsx:
 * - Collapsible header with chevron
 * - Inline metrics in collapsed state
 * - Detailed metrics table in expanded state
 * - Context window progress bar
 * - Tailwind CSS utilities for styling
 * - Preserves all Oropendola authentication & subscription features
 */

import React, { memo, useState } from 'react'
import { ChevronUp, ChevronDown, FoldVertical } from 'lucide-react'
import type { ClineMessage } from '../../types/cline-message'
import { TodoItem } from '../../context/ChatContext'
import { cn } from '../../lib/utils'
import { TodoListDisplay } from './TodoListDisplay'
import { ContextWindowProgress } from './ContextWindowProgress'

export interface TaskHeaderProps {
  // Task info
  task: ClineMessage

  // Metrics
  tokensIn: number
  tokensOut: number
  cacheWrites?: number
  cacheReads?: number
  totalCost: number
  contextTokens: number
  contextWindow?: number

  // Todos
  todos?: TodoItem[]

  // Actions
  buttonsDisabled?: boolean
  handleCondenseContext?: (taskId: string) => void
}

const TaskHeader = ({
  task,
  tokensIn,
  tokensOut,
  cacheWrites,
  cacheReads,
  totalCost,
  contextTokens,
  contextWindow = 200000,
  buttonsDisabled = false,
  handleCondenseContext,
  todos,
}: TaskHeaderProps) => {
  const [isTaskExpanded, setIsTaskExpanded] = useState(false)

  // Format large numbers (1000 -> 1k, 1000000 -> 1m)
  const formatLargeNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}m`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`
    return num.toString()
  }

  const hasTodos = todos && Array.isArray(todos) && todos.length > 0

  // Condense context button (matches Roo-Code style)
  const condenseButton = handleCondenseContext && (
    <button
      disabled={buttonsDisabled}
      onClick={(e) => {
        e.stopPropagation()
        if (task.ts) {
          handleCondenseContext(task.ts.toString())
        }
      }}
      className="shrink-0 min-h-[20px] min-w-[20px] p-[2px] cursor-pointer disabled:cursor-not-allowed opacity-85 hover:opacity-100 bg-transparent border-none rounded-md"
      aria-label="Condense context"
    >
      <FoldVertical size={16} />
    </button>
  )

  return (
    <div className="pt-2 pb-0 px-3">
      <div
        className={cn(
          "px-2.5 pt-2.5 pb-2 flex flex-col gap-1.5 relative z-1 cursor-pointer",
          "bg-vscode-input-background hover:bg-vscode-input-background/90",
          "text-vscode-foreground/80 hover:text-vscode-foreground",
          "shadow-sm shadow-black/30 rounded-md",
          hasTodos && "border-b-0",
        )}
        onClick={(e) => {
          // Don't expand if clicking on buttons
          if (
            e.target instanceof Element &&
            (e.target.closest("button") ||
              e.target.closest('[role="button"]'))
          ) {
            return
          }

          // Don't expand if selecting text
          const selection = window.getSelection()
          if (selection && selection.toString().length > 0) {
            return
          }

          setIsTaskExpanded(!isTaskExpanded)
        }}
      >
        {/* Header Row */}
        <div className="flex justify-between items-center gap-0">
          <div className="flex items-center select-none grow min-w-0">
            <div className="whitespace-nowrap overflow-hidden text-ellipsis grow min-w-0">
              {isTaskExpanded && <span className="font-bold">Task</span>}
              {!isTaskExpanded && (
                <div>
                  <span className="font-bold mr-1">Task</span>
                  <span>{task.text}</span>
                </div>
              )}
            </div>
            <div className="flex items-center shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setIsTaskExpanded(!isTaskExpanded)}
                className="shrink-0 min-h-[20px] min-w-[20px] p-[2px] cursor-pointer opacity-85 hover:opacity-100 bg-transparent border-none rounded-md"
                aria-label={isTaskExpanded ? "Collapse" : "Expand"}
              >
                {isTaskExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Collapsed state: Show inline metrics */}
        {!isTaskExpanded && contextWindow > 0 && (
          <div className="flex items-center gap-2 text-sm" onClick={(e) => e.stopPropagation()}>
            <span className="mr-1">
              {formatLargeNumber(contextTokens || 0)} / {formatLargeNumber(contextWindow)}
            </span>
            {!!totalCost && <span>${totalCost.toFixed(2)}</span>}
          </div>
        )}

        {/* Expanded state: Show full details */}
        {isTaskExpanded && (
          <>
            {/* Task text */}
            <div className="text-vscode-font-size overflow-y-auto break-words break-anywhere relative">
              <div
                className="overflow-auto max-h-80 whitespace-pre-wrap break-words break-anywhere cursor-text"
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: "unset",
                  WebkitBoxOrient: "vertical",
                }}
              >
                {task.text}
              </div>
            </div>

            {/* Images if present */}
            {task.images && task.images.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-2">
                {task.images.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`Task attachment ${i + 1}`}
                    className="max-w-[100px] max-h-[100px] rounded cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      // Could open in modal here
                    }}
                  />
                ))}
              </div>
            )}

            {/* Metrics table */}
            <div className="border-t border-b border-vscode-panel-border/50 py-4 mt-2 mb-1">
              <table className="w-full">
                <tbody>
                  {/* Context Window */}
                  {contextWindow > 0 && (
                    <tr>
                      <th className="font-bold text-left align-top w-1 whitespace-nowrap pl-1 pr-3 h-[24px]">
                        Context Window
                      </th>
                      <td className="align-top">
                        <div className="max-w-80 -mt-0.5 flex flex-nowrap gap-1">
                          <ContextWindowProgress
                            contextWindow={contextWindow}
                            contextTokens={contextTokens || 0}
                            maxTokens={undefined}
                          />
                          {condenseButton}
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Tokens */}
                  <tr>
                    <th className="font-bold text-left align-top w-1 whitespace-nowrap pl-1 pr-3 h-[24px]">
                      Tokens
                    </th>
                    <td className="align-top">
                      <div className="flex items-center gap-1 flex-wrap">
                        {typeof tokensIn === "number" && tokensIn > 0 && (
                          <span>↑ {formatLargeNumber(tokensIn)}</span>
                        )}
                        {typeof tokensOut === "number" && tokensOut > 0 && (
                          <span>↓ {formatLargeNumber(tokensOut)}</span>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Cache */}
                  {((typeof cacheReads === "number" && cacheReads > 0) ||
                    (typeof cacheWrites === "number" && cacheWrites > 0)) && (
                    <tr>
                      <th className="font-bold text-left align-top w-1 whitespace-nowrap pl-1 pr-3 h-[24px]">
                        Cache
                      </th>
                      <td className="align-top">
                        <div className="flex items-center gap-1 flex-wrap">
                          {typeof cacheWrites === "number" && cacheWrites > 0 && (
                            <span>↑ {formatLargeNumber(cacheWrites)}</span>
                          )}
                          {typeof cacheReads === "number" && cacheReads > 0 && (
                            <span>↓ {formatLargeNumber(cacheReads)}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* API Cost */}
                  {!!totalCost && (
                    <tr>
                      <th className="font-bold text-left align-top w-1 whitespace-nowrap pl-1 pr-3 h-[24px]">
                        API Cost
                      </th>
                      <td className="align-top">
                        <span>${totalCost?.toFixed(2)}</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* TodoListDisplay */}
      <TodoListDisplay todos={todos ?? []} />
    </div>
  )
}

export default memo(TaskHeader)
