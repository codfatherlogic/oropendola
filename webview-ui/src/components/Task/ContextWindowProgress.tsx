/**
 * Context Window Progress Bar
 * Shows token usage as a progress bar with color coding
 * Based on Roo-Code implementation
 */

import React from 'react'
import { formatLargeNumber, getContextUsagePercent } from '../../utils/api-metrics'

export interface ContextWindowProgressProps {
  contextTokens: number
  contextWindow: number
  maxOutputTokens?: number
}

export const ContextWindowProgress: React.FC<ContextWindowProgressProps> = ({
  contextTokens,
  contextWindow,
  maxOutputTokens = 0,
}) => {
  // Calculate percentages
  const usedPercent = getContextUsagePercent(contextTokens, contextWindow)
  const reservedPercent = maxOutputTokens > 0
    ? Math.min(100, Math.round((maxOutputTokens / contextWindow) * 100))
    : 0
  const availablePercent = Math.max(0, 100 - usedPercent - reservedPercent)

  // Determine color based on usage
  const getUsedColor = () => {
    if (usedPercent >= 90) return 'bg-red-500'
    if (usedPercent >= 75) return 'bg-yellow-500'
    return 'bg-blue-500'
  }

  return (
    <div className="flex items-center gap-2 w-full">
      {/* Progress bar container */}
      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden flex">
        {/* Used tokens */}
        {usedPercent > 0 && (
          <div
            className={`h-full transition-all duration-300 ${getUsedColor()}`}
            style={{ width: `${usedPercent}%` }}
            title={`Used: ${formatLargeNumber(contextTokens)} tokens`}
          />
        )}

        {/* Reserved for output */}
        {reservedPercent > 0 && (
          <div
            className="h-full bg-purple-500/50"
            style={{ width: `${reservedPercent}%` }}
            title={`Reserved for response: ${formatLargeNumber(maxOutputTokens)} tokens`}
          />
        )}

        {/* Available space */}
        {availablePercent > 0 && (
          <div
            className="h-full bg-gray-600"
            style={{ width: `${availablePercent}%` }}
            title="Available space"
          />
        )}
      </div>

      {/* Percentage text */}
      <span className="text-xs text-gray-400 whitespace-nowrap min-w-[40px] text-right">
        {usedPercent}%
      </span>
    </div>
  )
}

export default ContextWindowProgress
