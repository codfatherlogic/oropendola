/**
 * CodeLine Component - Render a single line of code with optional syntax highlighting
 */

import React from 'react'

export interface CodeLineProps {
  code: string
  language?: string
}

export const CodeLine: React.FC<CodeLineProps> = ({ code }) => {
  // For now, render as plain text
  // TODO: Add syntax highlighting with Shiki for individual lines
  return <span className="code-line-text">{code}</span>
}

CodeLine.displayName = 'CodeLine'
