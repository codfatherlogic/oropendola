/**
 * DiffViewer Component - Enhanced Multi-File Diff Display
 *
 * Supports:
 * - Multi-file diffs in a single view
 * - Side-by-side and unified diff modes
 * - Syntax highlighting for both old and new code
 * - Line numbers and change indicators
 * - Collapsible file sections
 * - Batch approve/reject controls
 */

import React, { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Check, X } from 'lucide-react'
import { DiffBlock } from './DiffBlock'
import { parseDiffString } from './diffParser'
import './DiffViewer.css'

export type DiffViewMode = 'unified' | 'split'

export interface FileDiff {
  path: string
  oldContent: string
  newContent: string
  language?: string
}

export interface DiffViewerProps {
  // Single file diff
  diff?: string
  path?: string
  language?: string

  // Multi-file diffs
  files?: FileDiff[]

  // View settings
  viewMode?: DiffViewMode
  showLineNumbers?: boolean
  contextLines?: number

  // Actions
  onApprove?: (path?: string) => void
  onReject?: (path?: string) => void
  onApproveAll?: () => void
  onRejectAll?: () => void

  // Display options
  collapsible?: boolean
  defaultExpanded?: boolean
  showFileActions?: boolean
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  diff,
  path: singlePath,
  language: singleLanguage,
  files: multiFiles,
  viewMode = 'unified',
  showLineNumbers = true,
  contextLines = 3,
  onApprove,
  onReject,
  onApproveAll,
  onRejectAll,
  collapsible = true,
  defaultExpanded = true,
  showFileActions = true,
}) => {
  const [viewModeState, setViewModeState] = useState<DiffViewMode>(viewMode)
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())

  // Parse diffs into structured format
  const fileDiffs = useMemo(() => {
    if (multiFiles) {
      return multiFiles
    }

    if (diff && singlePath) {
      // Parse SEARCH/REPLACE format or unified diff
      const parsed = parseDiffString(diff)
      return [{
        path: singlePath,
        oldContent: parsed.oldContent,
        newContent: parsed.newContent,
        language: singleLanguage
      }]
    }

    return []
  }, [diff, singlePath, singleLanguage, multiFiles])

  // Initialize expanded state
  React.useEffect(() => {
    if (defaultExpanded) {
      setExpandedFiles(new Set(fileDiffs.map(f => f.path)))
    }
  }, [fileDiffs, defaultExpanded])

  const toggleFile = (path: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const handleApprove = (path?: string) => {
    if (onApprove) {
      onApprove(path)
    }
  }

  const handleReject = (path?: string) => {
    if (onReject) {
      onReject(path)
    }
  }

  if (fileDiffs.length === 0) {
    return (
      <div className="diff-viewer diff-viewer-empty">
        <p>No changes to display</p>
      </div>
    )
  }

  const isMultiFile = fileDiffs.length > 1

  return (
    <div className="diff-viewer">
      {/* Header with controls */}
      <div className="diff-viewer-header">
        <div className="diff-viewer-title">
          {isMultiFile ? (
            <span className="diff-file-count">{fileDiffs.length} files changed</span>
          ) : (
            <span className="diff-file-name">{fileDiffs[0].path}</span>
          )}
        </div>

        <div className="diff-viewer-controls">
          {/* View mode toggle */}
          <div className="diff-view-mode-toggle">
            <button
              className={`diff-view-mode-btn ${viewModeState === 'unified' ? 'active' : ''}`}
              onClick={() => setViewModeState('unified')}
              title="Unified view">
              Unified
            </button>
            <button
              className={`diff-view-mode-btn ${viewModeState === 'split' ? 'active' : ''}`}
              onClick={() => setViewModeState('split')}
              title="Side-by-side view">
              Split
            </button>
          </div>

          {/* Batch actions for multi-file */}
          {isMultiFile && (onApproveAll || onRejectAll) && (
            <div className="diff-batch-actions">
              {onApproveAll && (
                <button
                  className="diff-action-btn diff-approve-all-btn"
                  onClick={onApproveAll}
                  title="Approve all changes">
                  <Check size={14} />
                  Approve All
                </button>
              )}
              {onRejectAll && (
                <button
                  className="diff-action-btn diff-reject-all-btn"
                  onClick={onRejectAll}
                  title="Reject all changes">
                  <X size={14} />
                  Reject All
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* File diffs */}
      <div className="diff-viewer-content">
        {fileDiffs.map((file) => {
          const isExpanded = expandedFiles.has(file.path)

          return (
            <div key={file.path} className="diff-file-section">
              {/* File header */}
              <div
                className={`diff-file-header ${collapsible ? 'collapsible' : ''}`}
                onClick={() => collapsible && toggleFile(file.path)}>
                {collapsible && (
                  <span className="diff-file-toggle">
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </span>
                )}
                <span className="diff-file-path">{file.path}</span>

                {/* File-specific actions */}
                {showFileActions && (onApprove || onReject) && (
                  <div className="diff-file-actions" onClick={(e) => e.stopPropagation()}>
                    {onApprove && (
                      <button
                        className="diff-action-btn diff-approve-btn"
                        onClick={() => handleApprove(file.path)}
                        title="Approve this file">
                        <Check size={14} />
                      </button>
                    )}
                    {onReject && (
                      <button
                        className="diff-action-btn diff-reject-btn"
                        onClick={() => handleReject(file.path)}
                        title="Reject this file">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Diff content */}
              {isExpanded && (
                <div className="diff-file-content">
                  <DiffBlock
                    oldContent={file.oldContent}
                    newContent={file.newContent}
                    language={file.language}
                    viewMode={viewModeState}
                    showLineNumbers={showLineNumbers}
                    contextLines={contextLines}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

DiffViewer.displayName = 'DiffViewer'
