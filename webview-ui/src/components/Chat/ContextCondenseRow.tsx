/**
 * ContextCondenseRow Component
 *
 * Displays context condensing information inline in the chat history.
 * Shows before/after token counts, cost, and expandable summary.
 */

import React, { useState } from 'react'
import { MarkdownBlock } from './MarkdownBlock'
import { ProgressIndicator } from './ProgressIndicator'
import './ContextCondenseRow.css'

interface ContextCondense {
  /** Cost of condensing operation */
  cost?: number

  /** Token count before condensing */
  prevContextTokens?: number

  /** Token count after condensing */
  newContextTokens?: number

  /** Summary of conversation */
  summary?: string
}

export const ContextCondenseRow: React.FC<ContextCondense> = ({
  cost,
  prevContextTokens,
  newContextTokens,
  summary,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  // Handle null/undefined token values
  const prevTokens = prevContextTokens ?? 0
  const newTokens = newContextTokens ?? 0
  const displayCost = cost ?? 0

  return (
    <div className="context-condense-row">
      <div
        className="context-condense-header"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyPress={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setIsExpanded(!isExpanded)
          }
        }}
      >
        <div className="context-condense-check-icon">
          <span className="codicon codicon-check" />
        </div>

        <div className="context-condense-info">
          <span className="codicon codicon-compress context-condense-icon" />
          <span className="context-condense-title">Context Condensed</span>
          <span className="context-condense-tokens">
            {prevTokens.toLocaleString()} → {newTokens.toLocaleString()} tokens
          </span>
          {displayCost > 0 && (
            <span className="context-condense-cost">${displayCost.toFixed(2)}</span>
          )}
        </div>

        <span className={`codicon codicon-chevron-${isExpanded ? 'up' : 'down'} context-condense-chevron`} />
      </div>

      {isExpanded && summary && (
        <div className="context-condense-summary">
          <MarkdownBlock markdown={summary} />
        </div>
      )}
    </div>
  )
}

export const CondensingContextRow: React.FC = () => {
  return (
    <div className="context-condensing-row">
      <ProgressIndicator />
      <span className="codicon codicon-compress context-condensing-icon" />
      <span className="context-condensing-title">Condensing context...</span>
    </div>
  )
}

interface CondenseContextErrorRowProps {
  errorText?: string
}

export const CondenseContextErrorRow: React.FC<CondenseContextErrorRowProps> = ({ errorText }) => {
  return (
    <div className="context-condense-error-row">
      <div className="context-condense-error-header">
        <span className="codicon codicon-warning context-condense-error-icon" />
        <span className="context-condense-error-title">Context Condensing Failed</span>
      </div>
      {errorText && <span className="context-condense-error-text">{errorText}</span>}
    </div>
  )
}
