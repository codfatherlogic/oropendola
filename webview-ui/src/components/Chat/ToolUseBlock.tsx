/**
 * ToolUseBlock Component
 *
 * Container components for displaying tool usage information.
 * Provides consistent styling for tool execution blocks.
 */

import React from 'react'
import './ToolUseBlock.css'

interface ToolUseBlockProps {
  children: React.ReactNode
  className?: string
}

export const ToolUseBlock: React.FC<ToolUseBlockProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`tool-use-block ${className}`}>
      {children}
    </div>
  )
}

interface ToolUseBlockHeaderProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  style?: React.CSSProperties
}

export const ToolUseBlockHeader: React.FC<ToolUseBlockHeaderProps> = ({
  children,
  className = '',
  onClick,
  style,
}) => {
  return (
    <div
      className={`tool-use-block-header ${className}`}
      onClick={onClick}
      style={{
        ...style,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {children}
    </div>
  )
}
