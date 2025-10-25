/**
 * Task Header Component
 * Displays task title, metrics, and details
 * Based on Roo-Code TaskHeader adapted for Oropendola AI single backend
 */

import React, { useState, useRef } from 'react'
import { ChevronUp, ChevronDown, FoldVertical } from 'lucide-react'
import { formatLargeNumber, formatCost } from '../../utils/api-metrics'
import type { ClineMessage } from '../../types/cline-message'
import type { Todo } from './TodoListDisplay'
import { ContextWindowProgress } from './ContextWindowProgress'
import { Mention } from './Mention'
import { TaskActions } from './TaskActions'
import { TodoListDisplay } from './TodoListDisplay'

export interface TaskHeaderProps {
  task: ClineMessage
  tokensIn: number
  tokensOut: number
  cacheWrites?: number
  cacheReads?: number
  totalCost: number
  contextTokens: number
  contextWindow?: number
  buttonsDisabled?: boolean
  onCondenseContext?: () => void
  todos?: Todo[]
}

export const TaskHeader: React.FC<TaskHeaderProps> = ({
  task,
  tokensIn,
  tokensOut,
  cacheWrites = 0,
  cacheReads = 0,
  totalCost,
  contextTokens,
  contextWindow = 200000, // Default for Claude 3.5 Sonnet
  buttonsDisabled = false,
  onCondenseContext,
  todos = [],
}) => {
  const [isTaskExpanded, setIsTaskExpanded] = useState(false)
  const textContainerRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)

  const hasTodos = todos && Array.isArray(todos) && todos.length > 0

  // Condense context button
  const condenseButton = onCondenseContext && (
    <button
      disabled={buttonsDisabled}
      onClick={onCondenseContext}
      title="Condense context to reduce token usage"
      className="shrink-0 min-h-[20px] min-w-[20px] p-[2px] cursor-pointer disabled:cursor-not-allowed opacity-85 hover:opacity-100 bg-transparent border-none rounded-md"
    >
      <FoldVertical size={16} />
    </button>
  )

  return (
    <div className="pt-2 pb-0 px-3">
      <div
        className={`
          px-2.5 pt-2.5 pb-2 flex flex-col gap-1.5 relative z-1 cursor-pointer
          bg-vscode-input-background hover:bg-vscode-input-background/90
          text-vscode-foreground/80 hover:text-vscode-foreground
          shadow-sm shadow-black/30 rounded-md
          ${hasTodos ? 'border-b-0' : ''}
        `}
        onClick={(e) => {
          // Don't expand if clicking on buttons or interactive elements
          if (
            e.target instanceof Element &&
            (e.target.closest('button') ||
              e.target.closest('[role="button"]') ||
              e.target.closest('img') ||
              e.target.tagName === 'IMG')
          ) {
            return
          }

          // Don't expand/collapse if user is selecting text
          const selection = window.getSelection()
          if (selection && selection.toString().length > 0) {
            return
          }

          setIsTaskExpanded(!isTaskExpanded)
        }}
      >
        {/* Header row */}
        <div className="flex justify-between items-center gap-0">
          <div className="flex items-center select-none grow min-w-0">
            <div className="whitespace-nowrap overflow-hidden text-ellipsis grow min-w-0">
              {isTaskExpanded && <span className="font-bold">Task: </span>}
              {!isTaskExpanded && (
                <div>
                  <span className="font-bold mr-1">Task:</span>
                  <Mention text={task.text} />
                </div>
              )}
            </div>
            <div className="flex items-center shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setIsTaskExpanded(!isTaskExpanded)}
                title={isTaskExpanded ? 'Collapse' : 'Expand'}
                className="shrink-0 min-h-[20px] min-w-[20px] p-[2px] cursor-pointer opacity-85 hover:opacity-100 bg-transparent border-none rounded-md"
              >
                {isTaskExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Collapsed state: Show metrics preview */}
        {!isTaskExpanded && contextWindow > 0 && (
          <div className="flex items-center gap-2 text-sm" onClick={(e) => e.stopPropagation()}>
            <span title={`${formatLargeNumber(contextTokens)} / ${formatLargeNumber(contextWindow)} tokens used`}>
              {formatLargeNumber(contextTokens)} / {formatLargeNumber(contextWindow)}
            </span>
            {totalCost > 0 && <span>{formatCost(totalCost)}</span>}
          </div>
        )}

        {/* Expanded state: Show full details */}
        {isTaskExpanded && (
          <>
            {/* Task description */}
            <div
              ref={textContainerRef}
              className="text-vscode-font-size overflow-y-auto break-words break-anywhere relative"
            >
              <div
                ref={textRef}
                className="overflow-auto max-h-80 whitespace-pre-wrap break-words break-anywhere cursor-text"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 'unset',
                  WebkitBoxOrient: 'vertical',
                }}
              >
                <Mention text={task.text} />
              </div>
            </div>

            {/* Images (if any) */}
            {task.images && task.images.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-2">
                {task.images.map((img, index) => (
                  <img
                    key={index}
                    src={img}
                    alt={`Task image ${index + 1}`}
                    className="max-w-[200px] max-h-[200px] rounded border border-vscode-panel-border cursor-pointer hover:opacity-90"
                    onClick={(e) => {
                      e.stopPropagation()
                      // TODO: Open in modal/lightbox
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
                            contextTokens={contextTokens}
                            contextWindow={contextWindow}
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
                        {typeof tokensIn === 'number' && tokensIn > 0 && (
                          <span>↑ {formatLargeNumber(tokensIn)}</span>
                        )}
                        {typeof tokensOut === 'number' && tokensOut > 0 && (
                          <span>↓ {formatLargeNumber(tokensOut)}</span>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Cache */}
                  {((typeof cacheReads === 'number' && cacheReads > 0) ||
                    (typeof cacheWrites === 'number' && cacheWrites > 0)) && (
                    <tr>
                      <th className="font-bold text-left align-top w-1 whitespace-nowrap pl-1 pr-3 h-[24px]">
                        Cache
                      </th>
                      <td className="align-top">
                        <div className="flex items-center gap-1 flex-wrap">
                          {typeof cacheWrites === 'number' && cacheWrites > 0 && (
                            <span>↑ {formatLargeNumber(cacheWrites)}</span>
                          )}
                          {typeof cacheReads === 'number' && cacheReads > 0 && (
                            <span>↓ {formatLargeNumber(cacheReads)}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* API Cost */}
                  {totalCost > 0 && (
                    <tr>
                      <th className="font-bold text-left align-top w-1 whitespace-nowrap pl-1 pr-3 h-[24px]">
                        API Cost
                      </th>
                      <td className="align-top">
                        <span>{formatCost(totalCost)}</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Task management buttons */}
            <div onClick={(e) => e.stopPropagation()}>
              <TaskActions
                onShare={() => console.log('Share task')}
                onDelete={() => console.log('Delete task')}
                onExport={() => console.log('Export task')}
                buttonsDisabled={buttonsDisabled}
              />
            </div>
          </>
        )}
      </div>

      {/* Todo list (if any) */}
      <TodoListDisplay todos={todos} />
    </div>
  )
}

export default TaskHeader
