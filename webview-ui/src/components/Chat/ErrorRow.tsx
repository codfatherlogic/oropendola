/**
 * ErrorRow Component
 *
 * Displays error messages with expandable details.
 * Supports different error types with appropriate styling and actions.
 */

import React, { useState } from 'react'
import { AlertCircle, ChevronDown, ChevronUp, Copy } from 'lucide-react'
import { useCopyToClipboard } from '../../utils/clipboard'
import './ErrorRow.css'

interface ErrorRowProps {
  type: 'error' | 'api_failure' | 'diff_error' | 'mistake_limit'
  message: string
  expandable?: boolean
  showCopyButton?: boolean
  additionalContent?: React.ReactNode
}

export const ErrorRow: React.FC<ErrorRowProps> = ({
  type,
  message,
  expandable = false,
  showCopyButton = false,
  additionalContent,
}) => {
  const [isExpanded, setIsExpanded] = useState(!expandable)
  const { showCopyFeedback, copyWithFeedback } = useCopyToClipboard()

  const getTitle = () => {
    switch (type) {
      case 'api_failure':
        return 'API Request Failed'
      case 'diff_error':
        return 'Diff Application Error'
      case 'mistake_limit':
        return 'Too Many Errors'
      default:
        return 'Error'
    }
  }

  const handleCopy = () => {
    copyWithFeedback(message)
  }

  return (
    <div className={`error-row error-row-${type}`}>
      <div
        className="error-row-header"
        onClick={() => expandable && setIsExpanded(!isExpanded)}
        style={{ cursor: expandable ? 'pointer' : 'default' }}
      >
        <div className="error-row-title">
          <AlertCircle className="error-row-icon" />
          <span className="error-row-title-text">{getTitle()}</span>
        </div>
        <div className="error-row-actions">
          {showCopyButton && (
            <button
              className="error-row-action-button"
              onClick={(e) => {
                e.stopPropagation()
                handleCopy()
              }}
              title="Copy error message"
            >
              {showCopyFeedback ? (
                <span className="codicon codicon-check" />
              ) : (
                <Copy className="error-row-action-icon" />
              )}
            </button>
          )}
          {expandable && (
            <button className="error-row-toggle">
              {isExpanded ? (
                <ChevronUp className="error-row-toggle-icon" />
              ) : (
                <ChevronDown className="error-row-toggle-icon" />
              )}
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="error-row-content">
          <pre className="error-row-message">{message}</pre>
          {additionalContent && (
            <div className="error-row-additional">{additionalContent}</div>
          )}
        </div>
      )}
    </div>
  )
}
