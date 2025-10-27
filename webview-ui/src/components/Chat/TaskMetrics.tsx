/**
 * TaskMetrics Component
 * 
 * Displays API usage metrics including tokens, cache usage, and cost
 * Matches Roo-Code's task metrics display pattern
 */

import React from 'react'
import { ArrowUp, ArrowDown } from 'lucide-react'
import './TaskMetrics.css'

export interface ApiMetrics {
  tokensIn: number
  tokensOut: number
  cacheWrites?: number
  cacheReads?: number
  cost: number
}

export interface TaskMetricsProps {
  metrics: ApiMetrics | null
  className?: string
}

/**
 * Format large numbers with K/M suffixes
 */
function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`
  }
  return num.toString()
}

/**
 * Format cost with proper decimal places
 */
function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`
  }
  if (cost < 1) {
    return `$${cost.toFixed(3)}`
  }
  return `$${cost.toFixed(2)}`
}

export const TaskMetrics: React.FC<TaskMetricsProps> = ({ metrics, className = '' }) => {
  if (!metrics) {
    return null
  }

  const hasCache = (metrics.cacheWrites ?? 0) > 0 || (metrics.cacheReads ?? 0) > 0

  return (
    <div className={`task-metrics ${className}`}>
      {/* Tokens */}
      <div className="metric-group">
        <span className="metric-label">Tokens:</span>
        <div className="metric-values">
          <span className="metric-value metric-in" title="Tokens In (Input)">
            <ArrowUp size={12} />
            {formatNumber(metrics.tokensIn)}
          </span>
          <span className="metric-separator">/</span>
          <span className="metric-value metric-out" title="Tokens Out (Output)">
            <ArrowDown size={12} />
            {formatNumber(metrics.tokensOut)}
          </span>
        </div>
      </div>

      {/* Cache (if available) */}
      {hasCache && (
        <div className="metric-group">
          <span className="metric-label">Cache:</span>
          <div className="metric-values">
            <span className="metric-value metric-cache-write" title="Cache Writes">
              <ArrowUp size={12} />
              {formatNumber(metrics.cacheWrites ?? 0)}
            </span>
            <span className="metric-separator">/</span>
            <span className="metric-value metric-cache-read" title="Cache Reads">
              <ArrowDown size={12} />
              {formatNumber(metrics.cacheReads ?? 0)}
            </span>
          </div>
        </div>
      )}

      {/* Cost */}
      <div className="metric-group">
        <span className="metric-label">Cost:</span>
        <span className="metric-value metric-cost" title="Total API Cost">
          {formatCost(metrics.cost)}
        </span>
      </div>
    </div>
  )
}

export default TaskMetrics
