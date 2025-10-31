/**
 * Fork Button Component
 *
 * Button to create a new conversation branch from a specific message.
 */

import React, { useState } from 'react'
import { GitBranch } from 'lucide-react'
import './ForkButton.css'

export interface ForkButtonProps {
  /** Message timestamp to fork from */
  messageTs: number

  /** Callback when fork is created */
  onFork: (messageTs: number, branchName?: string) => void

  /** Whether to show inline (small) or standalone */
  inline?: boolean

  /** Whether the button is disabled */
  disabled?: boolean
}

export const ForkButton: React.FC<ForkButtonProps> = ({
  messageTs,
  onFork,
  inline = true,
  disabled = false,
}) => {
  const [showNameInput, setShowNameInput] = useState(false)
  const [branchName, setBranchName] = useState('')

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!showNameInput) {
      setShowNameInput(true)
    }
  }

  const handleCreate = (e: React.MouseEvent) => {
    e.stopPropagation()
    onFork(messageTs, branchName.trim() || undefined)
    setShowNameInput(false)
    setBranchName('')
  }

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowNameInput(false)
    setBranchName('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      handleCreate(e as any)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      handleCancel(e as any)
    }
  }

  if (showNameInput) {
    return (
      <div className="fork-button-input-container" onClick={(e) => e.stopPropagation()}>
        <input
          type="text"
          className="fork-button-name-input"
          placeholder="Branch name (optional)"
          value={branchName}
          onChange={(e) => setBranchName(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        <button className="fork-button-action fork-button-create" onClick={handleCreate} title="Create fork">
          <GitBranch size={14} />
        </button>
        <button className="fork-button-action fork-button-cancel" onClick={handleCancel} title="Cancel">
          ✕
        </button>
      </div>
    )
  }

  return (
    <button
      className={`fork-button ${inline ? 'fork-button-inline' : ''}`}
      onClick={handleClick}
      disabled={disabled}
      title="Fork conversation from this point"
    >
      <GitBranch size={inline ? 14 : 16} />
      {!inline && <span>Fork</span>}
    </button>
  )
}

ForkButton.displayName = 'ForkButton'
