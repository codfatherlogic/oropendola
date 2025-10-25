/**
 * Terminal View Component
 *
 * AI-powered terminal interface with command suggestions,
 * explanations, and history sync.
 *
 * Week 7: Enhanced Terminal
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import vscode from '../../vscode-api'
import './TerminalView.css'

interface TerminalCommand {
  id: string
  command: string
  output?: string
  error?: string
  exitCode?: number
  timestamp: Date
  cwd: string
}

interface TerminalSuggestion {
  command: string
  explanation: string
  confidence: number
}

export const TerminalView: React.FC = () => {
  const [commands, setCommands] = useState<TerminalCommand[]>([])
  const [currentInput, setCurrentInput] = useState('')
  const [suggestions, setSuggestions] = useState<TerminalSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load command history on mount
  useEffect(() => {
    vscode.postMessage({ type: 'getTerminalHistory' })

    // Listen for messages from extension
    const handleMessage = (event: MessageEvent) => {
      const message = event.data

      switch (message.type) {
        case 'terminalHistory':
          setCommands(message.commands.map((cmd: any) => ({
            ...cmd,
            timestamp: new Date(cmd.timestamp)
          })))
          break

        case 'terminalSuggestions':
          setSuggestions(message.suggestions)
          setShowSuggestions(message.suggestions.length > 0)
          setSelectedSuggestion(0)
          setLoading(false)
          break

        case 'commandExplanation':
          // Show explanation in UI
          console.log('Command explanation:', message.explanation)
          break
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Request AI suggestions when input changes
  const handleInputChange = useCallback((value: string) => {
    setCurrentInput(value)

    // Only suggest if input looks like natural language (has spaces)
    if (value.length > 10 && value.includes(' ') && !value.startsWith('/')) {
      setLoading(true)
      vscode.postMessage({
        type: 'getTerminalSuggestions',
        prompt: value
      })
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [])

  // Handle suggestion selection
  const selectSuggestion = useCallback((suggestion: TerminalSuggestion) => {
    setCurrentInput(suggestion.command)
    setShowSuggestions(false)
    setSuggestions([])
    inputRef.current?.focus()
  }, [])

  // Execute command
  const executeCommand = useCallback(() => {
    if (!currentInput.trim()) return

    vscode.postMessage({
      type: 'executeTerminalCommand',
      command: currentInput
    })

    setCurrentInput('')
    setSuggestions([])
    setShowSuggestions(false)
  }, [currentInput])

  // Explain command
  const explainCommand = useCallback((command: string) => {
    vscode.postMessage({
      type: 'explainTerminalCommand',
      command
    })
  }, [])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (showSuggestions && suggestions.length > 0) {
        selectSuggestion(suggestions[selectedSuggestion])
      } else {
        executeCommand()
      }
    } else if (e.key === 'ArrowDown' && showSuggestions) {
      e.preventDefault()
      setSelectedSuggestion((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp' && showSuggestions) {
      e.preventDefault()
      setSelectedSuggestion((prev) => prev > 0 ? prev - 1 : prev)
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }, [showSuggestions, suggestions, selectedSuggestion, selectSuggestion, executeCommand])

  return (
    <div className="terminal-view">
      <div className="terminal-header">
        <h2>AI-Powered Terminal</h2>
        <div className="terminal-actions">
          <button
            className="terminal-button"
            onClick={() => vscode.postMessage({ type: 'clearTerminalHistory' })}
            title="Clear History"
          >
            🗑️ Clear
          </button>
          <button
            className="terminal-button"
            onClick={() => vscode.postMessage({ type: 'openTerminal' })}
            title="Open Integrated Terminal"
          >
            📟 Open Terminal
          </button>
        </div>
      </div>

      <div className="terminal-content">
        {/* Command History */}
        <div className="terminal-history">
          {commands.length === 0 ? (
            <div className="terminal-empty">
              <p>No command history yet.</p>
              <p className="terminal-hint">
                Type a command or describe what you want to do in natural language.
              </p>
            </div>
          ) : (
            commands.map((cmd) => (
              <div
                key={cmd.id}
                className={`terminal-command ${cmd.exitCode !== 0 ? 'error' : ''}`}
              >
                <div className="command-header">
                  <code className="command-text">{cmd.command}</code>
                  <div className="command-meta">
                    <span className="command-cwd">{cmd.cwd}</span>
                    <span className="command-time">
                      {cmd.timestamp.toLocaleTimeString()}
                    </span>
                    <button
                      className="command-explain"
                      onClick={() => explainCommand(cmd.command)}
                      title="Explain this command"
                    >
                      ?
                    </button>
                  </div>
                </div>
                {cmd.output && (
                  <pre className="command-output">{cmd.output}</pre>
                )}
                {cmd.error && (
                  <pre className="command-error">{cmd.error}</pre>
                )}
              </div>
            ))
          )}
        </div>

        {/* AI Suggestions Panel */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="terminal-suggestions">
            <div className="suggestions-header">
              <span className="suggestions-title">AI Suggestions</span>
              <span className="suggestions-hint">
                ↑↓ to navigate, Enter to select, Esc to close
              </span>
            </div>
            <div className="suggestions-list">
              {suggestions.map((sug, idx) => (
                <div
                  key={idx}
                  className={`suggestion-item ${
                    idx === selectedSuggestion ? 'selected' : ''
                  }`}
                  onClick={() => selectSuggestion(sug)}
                >
                  <div className="suggestion-header">
                    <code className="suggestion-command">{sug.command}</code>
                    <span className="suggestion-confidence">
                      {Math.round(sug.confidence * 100)}%
                    </span>
                  </div>
                  <p className="suggestion-explanation">{sug.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Command Input */}
        <div className="terminal-input-container">
          <div className="terminal-prompt">$</div>
          <input
            ref={inputRef}
            type="text"
            className="terminal-input"
            value={currentInput}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter command or describe what you want to do..."
            autoFocus
          />
          {loading && <div className="terminal-loading">🤖</div>}
          <button
            className="terminal-send"
            onClick={executeCommand}
            disabled={!currentInput.trim()}
            title="Execute Command (Enter)"
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  )
}
