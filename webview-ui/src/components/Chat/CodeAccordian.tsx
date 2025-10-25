/**
 * CodeAccordian Component
 *
 * Collapsible code block with file path header and expand/collapse functionality.
 * Used for displaying file contents, diffs, and command outputs.
 */

import React from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { CodeBlock } from '../CodeBlock'
import './CodeAccordian.css'

interface CodeAccordianProps {
  code?: string
  language?: string
  path?: string
  isExpanded: boolean
  onToggleExpand: () => void
  isLoading?: boolean
  onJumpToFile?: () => void
}

export const CodeAccordian: React.FC<CodeAccordianProps> = ({
  code = '',
  language = 'txt',
  path,
  isExpanded,
  onToggleExpand,
  isLoading = false,
  onJumpToFile,
}) => {
  return (
    <div className="code-accordian">
      {/* Header */}
      <div
        className="code-accordian-header"
        onClick={onToggleExpand}
      >
        <div className="code-accordian-header-content">
          {path && (
            <span className="code-accordian-path" title={path}>
              {path}
            </span>
          )}
          {isLoading && (
            <span className="code-accordian-loading">Loading...</span>
          )}
        </div>
        <div className="code-accordian-header-actions">
          {onJumpToFile && (
            <button
              className="code-accordian-jump-button"
              onClick={(e) => {
                e.stopPropagation()
                onJumpToFile()
              }}
              title="Open file"
            >
              <span className="codicon codicon-go-to-file" />
            </button>
          )}
          <button className="code-accordian-toggle">
            {isExpanded ? (
              <ChevronUp className="code-accordian-icon" />
            ) : (
              <ChevronDown className="code-accordian-icon" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="code-accordian-content">
          {isLoading ? (
            <div className="code-accordian-skeleton">
              <div className="code-accordian-skeleton-line" />
              <div className="code-accordian-skeleton-line" />
              <div className="code-accordian-skeleton-line" />
            </div>
          ) : (
            <CodeBlock code={code} language={language} />
          )}
        </div>
      )}
    </div>
  )
}
