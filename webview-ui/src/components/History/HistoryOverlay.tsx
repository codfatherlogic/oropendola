/**
 * HistoryOverlay Component - Roo Code-style History View
 * 
 * Slides over the main chat view to show full task history
 */

import React, { useState, useEffect } from 'react'
import { HistoryView } from './HistoryView'
import './HistoryOverlay.css'

interface HistoryOverlayProps {
  onClose: () => void
}

export const HistoryOverlay: React.FC<HistoryOverlayProps> = ({ onClose }) => {
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
        className={`history-overlay-backdrop ${isVisible ? 'visible' : ''}`}
        onClick={handleClose}
      />

      {/* Overlay panel */}
      <div className={`history-overlay-panel ${isVisible ? 'visible' : ''}`}>
        {/* Header */}
        <div className="history-overlay-header">
          <h2 className="history-overlay-title">Task History</h2>
          <button
            className="history-overlay-close"
            onClick={handleClose}
            aria-label="Close history"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="history-overlay-content">
          <HistoryView onDone={handleClose} />
        </div>
      </div>
    </>
  )
}
