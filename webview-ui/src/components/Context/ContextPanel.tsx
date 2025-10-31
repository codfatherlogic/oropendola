/**
 * Context Intelligence Panel
 *
 * Displays token usage, cost, and context management tools.
 */

import React, { useState, useEffect } from 'react'
import { ClineMessage } from '../../../../src/shared/interfaces'
import { ContextMetrics, CostBreakdown } from '../../types/context-intelligence'
import { costCalculator } from '../../services/CostCalculator'
import { contextCondenser } from '../../services/ContextCondenser'
import './ContextPanel.css'

export interface ContextPanelProps {
  /** Messages to analyze */
  messages: ClineMessage[]

  /** Current model ID */
  modelId?: string

  /** Callback when context is condensed */
  onCondense?: (condensedMessages: ClineMessage[]) => void

  /** Whether panel is open */
  isOpen: boolean

  /** Callback to close panel */
  onClose: () => void
}

export const ContextPanel: React.FC<ContextPanelProps> = ({
  messages,
  modelId,
  onCondense,
  isOpen,
  onClose,
}) => {
  const [metrics, setMetrics] = useState<ContextMetrics | null>(null)
  const [breakdown, setBreakdown] = useState<CostBreakdown | null>(null)
  const [condensing, setCondensing] = useState(false)
  const [selectedStrategy, setSelectedStrategy] = useState<'aggressive' | 'balanced' | 'conservative'>('balanced')

  // Calculate metrics when messages change
  useEffect(() => {
    if (messages.length > 0) {
      const m = costCalculator.calculateMetrics(messages, modelId)
      const b = costCalculator.calculateCostBreakdown(messages, modelId)
      setMetrics(m)
      setBreakdown(b)
    }
  }, [messages, modelId])

  const handleCondense = async () => {
    setCondensing(true)
    try {
      const result = await contextCondenser.condense(messages, {
        strategy: selectedStrategy,
        preserveCode: true,
        preserveReasoning: false,
      })

      if (onCondense) {
        onCondense(result.messages)
      }

      // Show success message
      alert(result.summary)
    } catch (error) {
      console.error('Failed to condense:', error)
      alert('Failed to condense context')
    } finally {
      setCondensing(false)
    }
  }

  if (!isOpen || !metrics) {
    return null
  }

  const warningLevel = metrics.contextUsagePercent > 80 ? 'high' : metrics.contextUsagePercent > 60 ? 'medium' : 'low'

  return (
    <div className="context-panel-overlay" onClick={onClose}>
      <div className="context-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="context-panel-header">
          <h2>Context Intelligence</h2>
          <button className="context-panel-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="context-panel-content">
          {/* Token Usage */}
          <section className="context-section">
            <h3>Token Usage</h3>
            <div className="metric-grid">
              <div className="metric-item">
                <span className="metric-label">Total Tokens</span>
                <span className="metric-value">{costCalculator.formatTokens(metrics.totalTokens)}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Input</span>
                <span className="metric-value">{costCalculator.formatTokens(metrics.inputTokens)}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Output</span>
                <span className="metric-value">{costCalculator.formatTokens(metrics.outputTokens)}</span>
              </div>
              {metrics.cacheReadTokens && metrics.cacheReadTokens > 0 && (
                <div className="metric-item">
                  <span className="metric-label">Cache Read</span>
                  <span className="metric-value">{costCalculator.formatTokens(metrics.cacheReadTokens)}</span>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="context-usage-bar">
              <div
                className={`context-usage-fill ${warningLevel}`}
                style={{ width: `${Math.min(100, metrics.contextUsagePercent)}%` }}
              />
            </div>
            <div className="context-usage-text">
              <span>{metrics.contextUsagePercent.toFixed(1)}% of context window used</span>
              <span>{costCalculator.formatTokens(metrics.remainingCapacity)} remaining</span>
            </div>
          </section>

          {/* Cost Breakdown */}
          <section className="context-section">
            <h3>Cost Analysis</h3>
            <div className="cost-total">
              <span className="cost-label">Total Cost</span>
              <span className="cost-value">{costCalculator.formatCost(metrics.totalCost)}</span>
            </div>

            {breakdown && (
              <div className="cost-breakdown">
                <div className="cost-item">
                  <span className="cost-label">Input</span>
                  <span className="cost-value">{costCalculator.formatCost(breakdown.inputCost)}</span>
                </div>
                <div className="cost-item">
                  <span className="cost-label">Output</span>
                  <span className="cost-value">{costCalculator.formatCost(breakdown.outputCost)}</span>
                </div>
              </div>
            )}

            {breakdown && Object.keys(breakdown.byModel).length > 1 && (
              <div className="cost-by-model">
                <h4>By Model</h4>
                {Object.entries(breakdown.byModel).map(([model, cost]) => (
                  <div key={model} className="cost-item">
                    <span className="cost-label">{costCalculator.getModelName(model)}</span>
                    <span className="cost-value">{costCalculator.formatCost(cost)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Context Management */}
          <section className="context-section">
            <h3>Context Management</h3>
            <p className="section-description">
              Condense conversation to reduce token usage while preserving key information.
            </p>

            <div className="condense-controls">
              <label className="condense-label">
                <span>Strategy</span>
                <select
                  value={selectedStrategy}
                  onChange={(e) => setSelectedStrategy(e.target.value as any)}
                  className="condense-select"
                >
                  <option value="aggressive">Aggressive (Most reduction)</option>
                  <option value="balanced">Balanced (Recommended)</option>
                  <option value="conservative">Conservative (Minimal changes)</option>
                </select>
              </label>

              <button
                className="condense-button"
                onClick={handleCondense}
                disabled={condensing}
              >
                {condensing ? 'Condensing...' : 'Condense Context'}
              </button>
            </div>

            <div className="condense-info">
              <div className="info-item">
                <strong>Aggressive:</strong> Removes most messages except first, last 5, and key interactions.
                Condenses all reasoning.
              </div>
              <div className="info-item">
                <strong>Balanced:</strong> Condenses reasoning, summarizes long outputs, removes intermediate
                tool uses. Preserves code blocks.
              </div>
              <div className="info-item">
                <strong>Conservative:</strong> Only removes redundant content and condenses thinking blocks.
                Keeps most messages intact.
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
