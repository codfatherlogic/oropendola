import React from 'react'

export interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, disabled }) => {
  return (
    <label className="toggle-switch">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className="toggle-switch-slider" />
    </label>
  )
}
