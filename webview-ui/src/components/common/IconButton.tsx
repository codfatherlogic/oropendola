/**
 * IconButton Component
 *
 * Toolbar icon button using VS Code's codicons
 * Based on Roo Code design pattern
 */

import React from 'react'

interface IconButtonProps {
  icon: string // codicon name (e.g., "settings-gear", "history", "menu")
  onClick?: (e: React.MouseEvent) => void
  title?: string
  disabled?: boolean
  className?: string
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onClick,
  title,
  disabled = false,
  className = '',
}) => {
  const handleClick = (e: React.MouseEvent) => {
    if (!disabled && onClick) {
      onClick(e)
    }
  }

  return (
    <button
      className={`icon-button ${disabled ? 'disabled' : ''} ${className}`}
      onClick={handleClick}
      disabled={disabled}
      title={title}
      aria-label={title}
    >
      <span className={`codicon codicon-${icon}`} />
    </button>
  )
}
