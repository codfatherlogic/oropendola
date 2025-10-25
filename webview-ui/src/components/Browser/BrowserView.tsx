/**
 * Browser Automation View Component
 *
 * Browser automation interface with AI-powered web scraping
 * and interaction capabilities.
 *
 * Week 6: Browser Automation
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import vscode from '../../vscode-api'
import './BrowserView.css'

interface BrowserSession {
  id: string
  name: string
  url: string
  status: 'active' | 'inactive' | 'error'
  createdAt: Date
}

interface BrowserAction {
  id: string
  sessionId: string
  type: 'navigate' | 'click' | 'type' | 'scroll' | 'screenshot' | 'extract'
  description: string
  status: 'pending' | 'running' | 'success' | 'failed'
  result?: any
  error?: string
  timestamp: Date
}

export const BrowserView: React.FC = () => {
  const [sessions, setSessions] = useState<BrowserSession[]>([])
  const [currentSession, setCurrentSession] = useState<BrowserSession | null>(null)
  const [actions, setActions] = useState<BrowserAction[]>([])
  const [actionInput, setActionInput] = useState('')
  const [urlInput, setURLInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load sessions on mount
  useEffect(() => {
    vscode.postMessage({ type: 'getBrowserSessions' })

    // Listen for messages from extension
    const handleMessage = (event: MessageEvent) => {
      const message = event.data

      switch (message.type) {
        case 'browserSessions':
          setSessions(message.sessions.map((s: any) => ({
            ...s,
            createdAt: new Date(s.createdAt)
          })))
          break

        case 'browserSessionCreated':
          const newSession: BrowserSession = {
            ...message.session,
            createdAt: new Date(message.session.createdAt)
          }
          setSessions(prev => [...prev, newSession])
          setCurrentSession(newSession)
          setLoading(false)
          break

        case 'browserActionComplete':
          const action: BrowserAction = {
            ...message.action,
            timestamp: new Date(message.action.timestamp)
          }
          setActions(prev => [...prev, action])
          if (action.type === 'screenshot' && action.result) {
            setScreenshot(action.result.data)
          }
          setLoading(false)
          break

        case 'browserError':
          console.error('Browser error:', message.error)
          setLoading(false)
          break
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Create new browser session
  const createSession = useCallback(() => {
    setLoading(true)
    vscode.postMessage({
      type: 'createBrowserSession',
      options: {
        sessionName: `Session ${sessions.length + 1}`,
        headless: true,
        viewportWidth: 1920,
        viewportHeight: 1080
      }
    })
  }, [sessions.length])

  // Navigate to URL
  const navigateToURL = useCallback(() => {
    if (!currentSession || !urlInput.trim()) return

    setLoading(true)
    vscode.postMessage({
      type: 'browserNavigate',
      sessionId: currentSession.id,
      url: urlInput
    })
  }, [currentSession, urlInput])

  // Execute AI-powered action
  const executeAction = useCallback(() => {
    if (!currentSession || !actionInput.trim()) return

    setLoading(true)
    vscode.postMessage({
      type: 'browserExecuteAction',
      sessionId: currentSession.id,
      prompt: actionInput
    })
    setActionInput('')
  }, [currentSession, actionInput])

  // Take screenshot
  const takeScreenshot = useCallback(() => {
    if (!currentSession) return

    setLoading(true)
    vscode.postMessage({
      type: 'browserScreenshot',
      sessionId: currentSession.id
    })
  }, [currentSession])

  // Close session
  const closeSession = useCallback((sessionId: string) => {
    vscode.postMessage({
      type: 'closeBrowserSession',
      sessionId
    })
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    if (currentSession?.id === sessionId) {
      setCurrentSession(null)
      setActions([])
      setScreenshot(null)
    }
  }, [currentSession])

  return (
    <div className="browser-view">
      <div className="browser-header">
        <h2>Browser Automation</h2>
        <div className="browser-actions">
          <button
            className="browser-button"
            onClick={createSession}
            disabled={loading}
          >
            ➕ New Session
          </button>
          {currentSession && (
            <button
              className="browser-button danger"
              onClick={() => closeSession(currentSession.id)}
            >
              ✕ Close Session
            </button>
          )}
        </div>
      </div>

      <div className="browser-content">
        {/* Sessions List */}
        <div className="browser-sidebar">
          <h3>Sessions</h3>
          {sessions.length === 0 ? (
            <div className="sessions-empty">
              <p>No active sessions</p>
              <p className="sessions-hint">Create a session to start automating</p>
            </div>
          ) : (
            <div className="sessions-list">
              {sessions.map(session => (
                <div
                  key={session.id}
                  className={`session-item ${currentSession?.id === session.id ? 'active' : ''}`}
                  onClick={() => setCurrentSession(session)}
                >
                  <div className="session-header">
                    <span className={`session-status ${session.status}`}>●</span>
                    <span className="session-name">{session.name}</span>
                  </div>
                  <div className="session-url">{session.url || 'No URL'}</div>
                  <div className="session-time">
                    {session.createdAt.toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main Automation Panel */}
        <div className="browser-main">
          {!currentSession ? (
            <div className="browser-empty">
              <h3>No Session Selected</h3>
              <p>Create or select a session to start browser automation</p>
              <button className="browser-button-large" onClick={createSession}>
                Create New Session
              </button>
            </div>
          ) : (
            <>
              {/* URL Navigation */}
              <div className="browser-navigation">
                <input
                  type="url"
                  className="url-input"
                  value={urlInput}
                  onChange={(e) => setURLInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && navigateToURL()}
                  placeholder="Enter URL (e.g., https://example.com)"
                />
                <button
                  className="nav-button"
                  onClick={navigateToURL}
                  disabled={!urlInput.trim() || loading}
                >
                  Go
                </button>
                <button
                  className="screenshot-button"
                  onClick={takeScreenshot}
                  disabled={loading}
                  title="Take Screenshot"
                >
                  📸
                </button>
              </div>

              {/* Screenshot Preview */}
              {screenshot && (
                <div className="screenshot-preview">
                  <div className="screenshot-header">
                    <span>Latest Screenshot</span>
                    <button
                      className="screenshot-close"
                      onClick={() => setScreenshot(null)}
                    >
                      ✕
                    </button>
                  </div>
                  <img src={`data:image/png;base64,${screenshot}`} alt="Screenshot" />
                </div>
              )}

              {/* Actions History */}
              <div className="browser-actions-history">
                <h3>Actions History</h3>
                {actions.filter(a => a.sessionId === currentSession.id).length === 0 ? (
                  <div className="actions-empty">
                    <p>No actions yet</p>
                    <p className="actions-hint">
                      Describe what you want to do in natural language below
                    </p>
                  </div>
                ) : (
                  <div className="actions-list">
                    {actions
                      .filter(a => a.sessionId === currentSession.id)
                      .map(action => (
                        <div
                          key={action.id}
                          className={`action-item ${action.status}`}
                        >
                          <div className="action-header">
                            <span className="action-type">{action.type}</span>
                            <span className="action-status">{action.status}</span>
                          </div>
                          <div className="action-description">{action.description}</div>
                          {action.result && (
                            <div className="action-result">
                              {JSON.stringify(action.result, null, 2)}
                            </div>
                          )}
                          {action.error && (
                            <div className="action-error">{action.error}</div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* AI Action Input */}
              <div className="browser-input-container">
                <textarea
                  ref={inputRef}
                  className="browser-input"
                  value={actionInput}
                  onChange={(e) => setActionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      e.preventDefault()
                      executeAction()
                    }
                  }}
                  placeholder="Describe what you want to do (e.g., 'Click the login button', 'Fill the search box with python', 'Extract all links')..."
                  rows={3}
                />
                <button
                  className="execute-button"
                  onClick={executeAction}
                  disabled={!actionInput.trim() || loading}
                  title="Execute Action (Ctrl+Enter)"
                >
                  {loading ? '⏳' : '🤖 Execute'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
