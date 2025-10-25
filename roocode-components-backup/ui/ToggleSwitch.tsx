/**
 * ToggleSwitch Component
 *
 * An accessible on/off toggle switch for binary settings.
 */

import React from 'react'
import './ToggleSwitch.css'

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  'aria-label'?: string
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  'aria-label': ariaLabel,
}) => {
  const handleClick = () => {
    if (!disabled) {
      onChange(!checked)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <div
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      className={`toggle-switch ${checked ? 'toggle-switch-checked' : ''} ${
        disabled ? 'toggle-switch-disabled' : ''
      }`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className="toggle-switch-thumb" />
    </div>
  )
}
