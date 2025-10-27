/**
 * ContextWindowProgress Component
 * 
 * Displays a progress bar showing context window usage vs limit
 * Matches Roo-Code's context window indicator pattern
 */

import React from 'react'
import './ContextWindowProgress.css'

export interface ContextWindowProgressProps {
  /** Current context tokens used */
  used: number
  
  /** Maximum context tokens allowed */
  limit: number
  
  /** Optional warning threshold (0-1), defaults to 0.8 */
  warningThreshold?: number
  
  /** Optional danger threshold (0-1), defaults to 0.95 */
  dangerThreshold?: number
  
  /** Additional CSS classes */
  className?: string
  
  /** Show/hide label */
  showLabel?: boolean
}

/**
 * Format token count with K/M suffixes
 */
function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`
  }
  return tokens.toString()
}

/**
 * Get status color class based on usage percentage
 */
function getStatusClass(percentage: number, warningThreshold: number, dangerThreshold: number): string {
  if (percentage >= dangerThreshold) {
    return 'danger'
  }
  if (percentage >= warningThreshold) {
    return 'warning'
  }
  return 'normal'
}

export const ContextWindowProgress: React.FC<ContextWindowProgressProps> = ({
  used,
  limit,
  warningThreshold = 0.8,
  dangerThreshold = 0.95,
  className = '',
  showLabel = true,
}) => {
  // Calculate percentage (capped at 100%)
  const percentage = Math.min((used / limit) * 100, 100)
  const statusClass = getStatusClass(percentage / 100, warningThreshold, dangerThreshold)

  return (
    <div className={`context-window-progress ${className}`}>
      {showLabel && (
        <div className="context-label">
          <span className="context-text">Context:</span>
          <span className={`context-value ${statusClass}`}>
            {formatTokens(used)} / {formatTokens(limit)}
          </span>
          <span className={`context-percentage ${statusClass}`}>
            ({percentage.toFixed(0)}%)
          </span>
        </div>
      )}
      
      <div className="progress-bar-container">
        <div
          className={`progress-bar-fill ${statusClass}`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-label={`Context window: ${used} of ${limit} tokens used`}
        />
      </div>

      {/* Warning message when near limit */}
      {percentage >= warningThreshold * 100 && (
        <div className={`context-warning ${statusClass}`}>
          {percentage >= dangerThreshold * 100
            ? '⚠️ Context window nearly full - consider condensing'
            : '⚠️ Context window filling up'}
        </div>
      )}
    </div>
  )
}

export default ContextWindowProgress
