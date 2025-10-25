/**
 * ProgressIndicator Component
 *
 * Displays an animated loading spinner for in-progress operations.
 * Used for API requests, command execution, and other async operations.
 */

import React from 'react'
import './ProgressIndicator.css'

export const ProgressIndicator: React.FC = () => {
  return (
    <div className="progress-indicator">
      <div className="progress-indicator-spinner" />
    </div>
  )
}
