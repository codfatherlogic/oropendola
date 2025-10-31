/**
 * Mention Autocomplete Component
 *
 * Dropdown showing @mention suggestions with keyboard navigation.
 */

import React, { useState, useEffect, useRef } from 'react'
import { MentionSuggestion } from '../../types/mentions'
import './MentionAutocomplete.css'

export interface MentionAutocompleteProps {
  /** Current input text */
  input: string

  /** Cursor position in input */
  cursorPosition: number

  /** Mention suggestions to display */
  suggestions: MentionSuggestion[]

  /** Callback when suggestion is selected */
  onSelect: (suggestion: MentionSuggestion) => void

  /** Callback to close autocomplete */
  onClose: () => void

  /** Position relative to input */
  position?: { top: number; left: number }
}

export const MentionAutocomplete: React.FC<MentionAutocompleteProps> = ({
  input,
  cursorPosition,
  suggestions,
  onSelect,
  onClose,
  position,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLDivElement>(null)

  // Reset selection when suggestions change
  useEffect(() => {
    setSelectedIndex(0)
  }, [suggestions])

  // Scroll selected item into view
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      })
    }
  }, [selectedIndex])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % suggestions.length)
          break

        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length)
          break

        case 'Enter':
        case 'Tab':
          e.preventDefault()
          if (suggestions[selectedIndex]) {
            onSelect(suggestions[selectedIndex])
          }
          break

        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [suggestions, selectedIndex, onSelect, onClose])

  if (suggestions.length === 0) {
    return null
  }

  // Group suggestions by whether they're type suggestions or value suggestions
  const typeSuggestions = suggestions.filter((s) => s.value === '')
  const valueSuggestions = suggestions.filter((s) => s.value !== '')

  return (
    <div
      className="mention-autocomplete"
      ref={listRef}
      style={position ? { top: position.top, left: position.left } : undefined}
    >
      {/* Type suggestions (when user types @) */}
      {typeSuggestions.length > 0 && (
        <div className="mention-section">
          <div className="mention-section-title">Mention Types</div>
          {typeSuggestions.map((suggestion, idx) => {
            const globalIdx = suggestions.indexOf(suggestion)
            const isSelected = globalIdx === selectedIndex

            return (
              <div
                key={`type-${suggestion.type}`}
                ref={isSelected ? selectedRef : null}
                className={`mention-item ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelect(suggestion)}
                onMouseEnter={() => setSelectedIndex(globalIdx)}
              >
                <span className="mention-icon">{suggestion.icon}</span>
                <div className="mention-content">
                  <span className="mention-text">{suggestion.text}</span>
                  <span className="mention-description">{suggestion.description}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Value suggestions (when user types @type:) */}
      {valueSuggestions.length > 0 && (
        <div className="mention-section">
          <div className="mention-section-title">Suggestions</div>
          {valueSuggestions.map((suggestion, idx) => {
            const globalIdx = suggestions.indexOf(suggestion)
            const isSelected = globalIdx === selectedIndex

            return (
              <div
                key={`value-${suggestion.type}-${suggestion.value}`}
                ref={isSelected ? selectedRef : null}
                className={`mention-item ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelect(suggestion)}
                onMouseEnter={() => setSelectedIndex(globalIdx)}
              >
                {suggestion.icon && <span className="mention-icon">{suggestion.icon}</span>}
                <div className="mention-content">
                  <span className="mention-text">{suggestion.text}</span>
                  {suggestion.description && (
                    <span className="mention-description">{suggestion.description}</span>
                  )}
                  {suggestion.path && (
                    <span className="mention-path">{suggestion.path}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Help text */}
      <div className="mention-autocomplete-footer">
        <span className="mention-help-text">
          <kbd>↑↓</kbd> Navigate <kbd>Enter</kbd> Select <kbd>Esc</kbd> Close
        </span>
      </div>
    </div>
  )
}
