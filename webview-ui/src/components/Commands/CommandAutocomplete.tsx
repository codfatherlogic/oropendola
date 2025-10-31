/**
 * Command Autocomplete Component
 *
 * Shows command suggestions as user types slash commands.
 */

import React, { useState, useEffect, useRef } from 'react'
import { Command } from '../../types/commands'
import './CommandAutocomplete.css'

export interface CommandAutocompleteProps {
  /** Input value */
  input: string

  /** Available commands */
  commands: Command[]

  /** Callback when command is selected */
  onSelect: (command: Command) => void

  /** Callback when autocomplete should close */
  onClose: () => void

  /** Position relative to input */
  position?: { top: number; left: number }
}

export const CommandAutocomplete: React.FC<CommandAutocompleteProps> = ({
  input,
  commands,
  onSelect,
  onClose,
  position,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  // Reset selection when commands change
  useEffect(() => {
    setSelectedIndex(0)
  }, [commands])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (commands.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % commands.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev - 1 + commands.length) % commands.length)
          break
        case 'Enter':
        case 'Tab':
          e.preventDefault()
          onSelect(commands[selectedIndex])
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [commands, selectedIndex, onSelect, onClose])

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [selectedIndex])

  if (commands.length === 0) {
    return null
  }

  const categoryGroups = commands.reduce((groups, cmd) => {
    if (!groups[cmd.category]) {
      groups[cmd.category] = []
    }
    groups[cmd.category].push(cmd)
    return groups
  }, {} as Record<string, Command[]>)

  const categoryTitles: Record<string, string> = {
    chat: 'Chat',
    context: 'Context',
    tools: 'Tools',
    navigation: 'Navigation',
    debug: 'Debug',
  }

  return (
    <div
      className="command-autocomplete"
      style={position ? { top: position.top, left: position.left } : undefined}
      ref={listRef}
    >
      <div className="command-autocomplete-header">
        <span>Commands</span>
        <span className="command-autocomplete-hint">↑↓ navigate • ⏎ select • esc close</span>
      </div>

      <div className="command-autocomplete-list">
        {Object.entries(categoryGroups).map(([category, cmds]) => (
          <div key={category} className="command-category">
            <div className="command-category-title">{categoryTitles[category] || category}</div>
            {cmds.map((command, idx) => {
              const globalIndex = commands.indexOf(command)
              const isSelected = globalIndex === selectedIndex

              return (
                <div
                  key={command.name}
                  className={`command-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => onSelect(command)}
                  onMouseEnter={() => setSelectedIndex(globalIndex)}
                >
                  <div className="command-item-header">
                    <span className="command-name">/{command.name}</span>
                    {command.aliases && command.aliases.length > 0 && (
                      <span className="command-aliases">
                        {command.aliases.map((a) => `/${a}`).join(', ')}
                      </span>
                    )}
                  </div>
                  <div className="command-description">{command.description}</div>
                  {command.argsDescription && (
                    <div className="command-args">{command.argsDescription}</div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

CommandAutocomplete.displayName = 'CommandAutocomplete'
