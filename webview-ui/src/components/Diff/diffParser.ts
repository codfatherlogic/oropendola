/**
 * Diff Parser - Utilities for parsing and computing diffs
 */

export type DiffLineType = 'add' | 'remove' | 'context'

export interface DiffLine {
  type: DiffLineType
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}

/**
 * Parse SEARCH/REPLACE format diff string
 * Format:
 * <<<<<<< SEARCH
 * :start_line:N
 * -------
 * old content
 * =======
 * new content
 * >>>>>>> REPLACE
 */
export function parseDiffString(diffString: string): {
  oldContent: string
  newContent: string
  startLine?: number
} {
  const searchReplacePattern = /<<<<<<< SEARCH\s*(?::start_line:(\d+))?\s*-------\s*([\s\S]*?)\s*=======\s*([\s\S]*?)\s*>>>>>>> REPLACE/g

  const matches = Array.from(diffString.matchAll(searchReplacePattern))

  if (matches.length === 0) {
    // Not SEARCH/REPLACE format, treat as unified diff or plain content
    return {
      oldContent: '',
      newContent: diffString,
    }
  }

  // For now, handle single SEARCH/REPLACE block
  // TODO: Support multiple blocks
  const match = matches[0]
  const startLine = match[1] ? parseInt(match[1]) : undefined
  const oldContent = match[2] || ''
  const newContent = match[3] || ''

  return {
    oldContent: oldContent.trim(),
    newContent: newContent.trim(),
    startLine,
  }
}

/**
 * Compute line-by-line diff between two strings
 * Uses simple line-based diff algorithm
 */
export function computeLineDiff(
  oldContent: string,
  newContent: string,
  contextLines: number = 3
): DiffLine[] {
  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')

  // Use Myers diff algorithm (simplified version)
  const diff = myersDiff(oldLines, newLines)

  // Add context lines
  return addContext(diff, contextLines)
}

/**
 * Simple Myers diff algorithm for line-based diff
 */
function myersDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  const result: DiffLine[] = []
  let oldIndex = 0
  let newIndex = 0

  // Build LCS (Longest Common Subsequence) table
  const lcs = computeLCS(oldLines, newLines)

  // Trace back through LCS to build diff
  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    if (oldIndex < oldLines.length && newIndex < newLines.length) {
      if (oldLines[oldIndex] === newLines[newIndex]) {
        // Lines are the same - context
        result.push({
          type: 'context',
          content: oldLines[oldIndex],
          oldLineNumber: oldIndex + 1,
          newLineNumber: newIndex + 1,
        })
        oldIndex++
        newIndex++
      } else {
        // Lines differ - check LCS to decide what to do
        const skipOld = lcs[oldIndex + 1]?.[newIndex] || 0
        const skipNew = lcs[oldIndex]?.[newIndex + 1] || 0

        if (skipOld >= skipNew) {
          // Remove from old
          result.push({
            type: 'remove',
            content: oldLines[oldIndex],
            oldLineNumber: oldIndex + 1,
          })
          oldIndex++
        } else {
          // Add from new
          result.push({
            type: 'add',
            content: newLines[newIndex],
            newLineNumber: newIndex + 1,
          })
          newIndex++
        }
      }
    } else if (oldIndex < oldLines.length) {
      // Remaining old lines are removals
      result.push({
        type: 'remove',
        content: oldLines[oldIndex],
        oldLineNumber: oldIndex + 1,
      })
      oldIndex++
    } else {
      // Remaining new lines are additions
      result.push({
        type: 'add',
        content: newLines[newIndex],
        newLineNumber: newIndex + 1,
      })
      newIndex++
    }
  }

  return result
}

/**
 * Compute Longest Common Subsequence table
 */
function computeLCS(oldLines: string[], newLines: string[]): number[][] {
  const m = oldLines.length
  const n = newLines.length
  const lcs: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        lcs[i][j] = lcs[i - 1][j - 1] + 1
      } else {
        lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1])
      }
    }
  }

  return lcs
}

/**
 * Add context lines around changes
 */
function addContext(diffLines: DiffLine[], contextLines: number): DiffLine[] {
  if (contextLines === 0) return diffLines

  // Find indices of changed lines
  const changedIndices = new Set<number>()
  diffLines.forEach((line, index) => {
    if (line.type !== 'context') {
      changedIndices.add(index)
    }
  })

  // Mark lines to keep (changes + context)
  const keepIndices = new Set<number>()
  changedIndices.forEach((index) => {
    for (let i = Math.max(0, index - contextLines); i <= Math.min(diffLines.length - 1, index + contextLines); i++) {
      keepIndices.add(i)
    }
  })

  // Filter to keep only relevant lines
  const result: DiffLine[] = []
  let lastKeptIndex = -1

  diffLines.forEach((line, index) => {
    if (keepIndices.has(index)) {
      // Add ellipsis if we skipped lines
      if (lastKeptIndex !== -1 && index - lastKeptIndex > 1) {
        result.push({
          type: 'context',
          content: '...',
          oldLineNumber: undefined,
          newLineNumber: undefined,
        })
      }
      result.push(line)
      lastKeptIndex = index
    }
  })

  return result
}
