/**
 * DiffBlock Component - Display diff for a single file
 *
 * Supports both unified and split (side-by-side) views
 */

import React, { useMemo } from 'react'
import { computeLineDiff, DiffLine } from './diffParser'
import { CodeLine } from './CodeLine'
import './DiffBlock.css'

export interface DiffBlockProps {
  oldContent: string
  newContent: string
  language?: string
  viewMode?: 'unified' | 'split'
  showLineNumbers?: boolean
  contextLines?: number
}

export const DiffBlock: React.FC<DiffBlockProps> = ({
  oldContent,
  newContent,
  language = 'txt',
  viewMode = 'unified',
  showLineNumbers = true,
  contextLines = 3,
}) => {
  // Compute line-by-line diff
  const diffLines = useMemo(() => {
    return computeLineDiff(oldContent, newContent, contextLines)
  }, [oldContent, newContent, contextLines])

  if (viewMode === 'split') {
    return <SplitView diffLines={diffLines} language={language} showLineNumbers={showLineNumbers} />
  }

  return <UnifiedView diffLines={diffLines} language={language} showLineNumbers={showLineNumbers} />
}

// Unified view (like GitHub/GitLab default)
const UnifiedView: React.FC<{
  diffLines: DiffLine[]
  language: string
  showLineNumbers: boolean
}> = ({ diffLines, language, showLineNumbers }) => {
  return (
    <div className="diff-block diff-block-unified">
      <table className="diff-table">
        <tbody>
          {diffLines.map((line, index) => (
            <tr
              key={index}
              className={`diff-line diff-line-${line.type}`}
              data-type={line.type}>
              {showLineNumbers && (
                <>
                  <td className="diff-line-number diff-line-number-old">
                    {line.oldLineNumber || ''}
                  </td>
                  <td className="diff-line-number diff-line-number-new">
                    {line.newLineNumber || ''}
                  </td>
                </>
              )}
              <td className="diff-line-indicator">
                {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
              </td>
              <td className="diff-line-content">
                <CodeLine code={line.content} language={language} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Split view (side-by-side comparison)
const SplitView: React.FC<{
  diffLines: DiffLine[]
  language: string
  showLineNumbers: boolean
}> = ({ diffLines, language, showLineNumbers }) => {
  // Group lines for side-by-side display
  const sideBySideLines = useMemo(() => {
    const result: Array<{
      oldLine?: DiffLine
      newLine?: DiffLine
    }> = []

    let oldIndex = 0
    let newIndex = 0

    while (oldIndex < diffLines.length || newIndex < diffLines.length) {
      const oldLine = diffLines[oldIndex]
      const newLine = diffLines[newIndex]

      if (!oldLine && !newLine) break

      if (oldLine?.type === 'remove') {
        // Look ahead for corresponding add
        const nextAddIndex = diffLines.findIndex(
          (l, i) => i > oldIndex && l.type === 'add'
        )

        if (nextAddIndex !== -1 && nextAddIndex === oldIndex + 1) {
          // Paired remove/add
          result.push({
            oldLine: diffLines[oldIndex],
            newLine: diffLines[nextAddIndex],
          })
          oldIndex += 2
          newIndex = oldIndex
        } else {
          // Unpaired remove
          result.push({ oldLine: diffLines[oldIndex] })
          oldIndex++
        }
      } else if (oldLine?.type === 'add') {
        // Unpaired add
        result.push({ newLine: diffLines[oldIndex] })
        oldIndex++
      } else if (oldLine?.type === 'context') {
        // Context line (same on both sides)
        result.push({
          oldLine: diffLines[oldIndex],
          newLine: { ...diffLines[oldIndex] },
        })
        oldIndex++
      } else {
        break
      }
    }

    return result
  }, [diffLines])

  return (
    <div className="diff-block diff-block-split">
      <table className="diff-table diff-table-split">
        <thead>
          <tr>
            <th className="diff-split-header diff-split-header-old">Original</th>
            <th className="diff-split-header diff-split-header-new">Changed</th>
          </tr>
        </thead>
        <tbody>
          {sideBySideLines.map((pair, index) => (
            <tr key={index} className="diff-line-pair">
              {/* Old/removed side */}
              <td className={`diff-split-cell diff-split-cell-old ${pair.oldLine ? `diff-line-${pair.oldLine.type}` : 'diff-line-empty'}`}>
                <div className="diff-split-cell-content">
                  {showLineNumbers && pair.oldLine && (
                    <span className="diff-line-number">{pair.oldLine.oldLineNumber}</span>
                  )}
                  {pair.oldLine && (
                    <>
                      <span className="diff-line-indicator">
                        {pair.oldLine.type === 'remove' ? '-' : ' '}
                      </span>
                      <CodeLine code={pair.oldLine.content} language={language} />
                    </>
                  )}
                </div>
              </td>

              {/* New/added side */}
              <td className={`diff-split-cell diff-split-cell-new ${pair.newLine ? `diff-line-${pair.newLine.type}` : 'diff-line-empty'}`}>
                <div className="diff-split-cell-content">
                  {showLineNumbers && pair.newLine && (
                    <span className="diff-line-number">{pair.newLine.newLineNumber}</span>
                  )}
                  {pair.newLine && (
                    <>
                      <span className="diff-line-indicator">
                        {pair.newLine.type === 'add' ? '+' : ' '}
                      </span>
                      <CodeLine code={pair.newLine.content} language={language} />
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

DiffBlock.displayName = 'DiffBlock'
