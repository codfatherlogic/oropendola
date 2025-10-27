/**
 * SettingsOverlay Component - Roo Code-style Settings Panel
 * 
 * Slides over the main chat view for settings configuration
 */

import React, { useState, useEffect } from 'react'
import { SettingsView } from './SettingsView'
import './SettingsOverlay.css'

interface SettingsOverlayProps {
  onClose: () => void
}

export const SettingsOverlay: React.FC<SettingsOverlayProps> = ({ onClose }) => {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger slide-in animation
    setTimeout(() => setIsVisible(true), 10)
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 200) // Wait for slide-out animation
  }

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`settings-overlay-backdrop ${isVisible ? 'visible' : ''}`}
        onClick={handleClose}
      />

      {/* Overlay panel */}
      <div className={`settings-overlay-panel ${isVisible ? 'visible' : ''}`}>
        {/* Header */}
        <div className="settings-overlay-header">
          <h2 className="settings-overlay-title">Settings</h2>
          <button
            className="settings-overlay-close"
            onClick={handleClose}
            aria-label="Close settings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="settings-overlay-content">
          <SettingsView onDone={handleClose} />
        </div>
      </div>
    </>
  )
}
