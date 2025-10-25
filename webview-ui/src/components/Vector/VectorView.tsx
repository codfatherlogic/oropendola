/**
 * Vector Database / Semantic Search View Component
 *
 * Search codebase using semantic/AI-powered search
 * Powered by vector embeddings and similarity search
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import vscode from '../../vscode-api'
import './VectorView.css'

interface VectorSearchResult {
  id: string
  content: string
  filePath: string
  type: 'code' | 'comment' | 'documentation' | 'conversation'
  similarity: number
  metadata?: Record<string, any>
  lineNumber?: number
  contextBefore?: string
  contextAfter?: string
}

interface IndexedFile {
  path: string
  type: string
  chunks: number
  lastIndexed: Date
  status: 'indexed' | 'pending' | 'error'
}

export const VectorView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<VectorSearchResult[]>([])
  const [indexedFiles, setIndexedFiles] = useState<IndexedFile[]>([])
  const [loading, setLoading] = useState(false)
  const [indexing, setIndexing] = useState(false)
  const [view, setView] = useState<'search' | 'index'>('search')
  const [stats, setStats] = useState({ total: 0, indexed: 0, pending: 0 })
  const searchTimeout = useRef<NodeJS.Timeout>()

  // Load indexed files and stats on mount
  useEffect(() => {
    vscode.postMessage({ type: 'getVectorStats' })
    vscode.postMessage({ type: 'getIndexedFiles' })

    // Listen for messages from extension
    const handleMessage = (event: MessageEvent) => {
      const message = event.data

      switch (message.type) {
        case 'vectorSearchResults':
          setResults(message.results)
          setLoading(false)
          break

        case 'vectorStats':
          setStats(message.stats)
          break

        case 'indexedFiles':
          setIndexedFiles(message.files.map((f: any) => ({
            ...f,
            lastIndexed: new Date(f.lastIndexed)
          })))
          break

        case 'indexingProgress':
          setIndexing(message.inProgress)
          if (!message.inProgress) {
            vscode.postMessage({ type: 'getVectorStats' })
            vscode.postMessage({ type: 'getIndexedFiles' })
          }
          break

        case 'indexingComplete':
          setIndexing(false)
          vscode.postMessage({ type: 'getVectorStats' })
          vscode.postMessage({ type: 'getIndexedFiles' })
          break
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Debounced search
  const performSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    vscode.postMessage({
      type: 'vectorSearch',
      query,
      limit: 50
    })
  }, [])

  // Handle search input change
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }
    searchTimeout.current = setTimeout(() => {
      performSearch(value)
    }, 500)
  }, [performSearch])

  // Index workspace
  const indexWorkspace = useCallback(() => {
    setIndexing(true)
    vscode.postMessage({ type: 'indexWorkspace' })
  }, [])

  // Clear index
  const clearIndex = useCallback(() => {
    if (confirm('Are you sure you want to clear the vector database? This cannot be undone.')) {
      vscode.postMessage({ type: 'clearVectorIndex' })
      setIndexedFiles([])
      setResults([])
      setStats({ total: 0, indexed: 0, pending: 0 })
    }
  }, [])

  // Open file at line
  const openFile = useCallback((result: VectorSearchResult) => {
    vscode.postMessage({
      type: 'openFile',
      filePath: result.filePath,
      lineNumber: result.lineNumber
    })
  }, [])

  // Format similarity score
  const formatSimilarity = (score: number): string => {
    return `${(score * 100).toFixed(1)}%`
  }

  return (
    <div className="vector-view">
      <div className="vector-header">
        <h2>🔍 Semantic Search</h2>
        <div className="view-switcher">
          <button
            className={`view-button ${view === 'search' ? 'active' : ''}`}
            onClick={() => setView('search')}
          >
            Search
          </button>
          <button
            className={`view-button ${view === 'index' ? 'active' : ''}`}
            onClick={() => setView('index')}
          >
            Index ({stats.indexed})
          </button>
        </div>
      </div>

      {view === 'search' ? (
        /* Search View */
        <div className="search-view">
          <div className="search-bar-container">
            <div className="search-bar-large">
              <input
                type="text"
                className="search-input-large"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search code semantically (e.g., 'functions that handle authentication')"
                autoFocus
              />
              <div className="search-hint">
                💡 Use natural language to find code by meaning, not just keywords
              </div>
            </div>

            <div className="stats-bar">
              <span className="stat-item">
                📊 {stats.indexed.toLocaleString()} files indexed
              </span>
              <span className="stat-item">
                🔢 {stats.total.toLocaleString()} vectors
              </span>
              {stats.pending > 0 && (
                <span className="stat-item pending">
                  ⏳ {stats.pending} pending
                </span>
              )}
            </div>
          </div>

          <div className="search-results">
            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner" />
                <p>Searching with AI...</p>
              </div>
            ) : !searchQuery.trim() ? (
              <div className="empty-state">
                <div className="search-icon">🔍</div>
                <h3>Semantic Code Search</h3>
                <p>Search your codebase using natural language</p>
                <div className="example-queries">
                  <h4>Example queries:</h4>
                  <ul>
                    <li>"Functions that handle user authentication"</li>
                    <li>"Code related to database connections"</li>
                    <li>"React components for forms"</li>
                    <li>"Error handling utilities"</li>
                  </ul>
                </div>
              </div>
            ) : results.length === 0 ? (
              <div className="empty-state">
                <p>No results found for "{searchQuery}"</p>
                <p className="empty-hint">
                  Try a different query or ensure your workspace is indexed
                </p>
              </div>
            ) : (
              <div className="results-list">
                {results.map((result, idx) => (
                  <div
                    key={`${result.id}-${idx}`}
                    className="result-item"
                    onClick={() => openFile(result)}
                  >
                    <div className="result-header">
                      <div className="result-file">
                        <span className="file-icon">📄</span>
                        <span className="file-path">{result.filePath}</span>
                        {result.lineNumber && (
                          <span className="line-number">:{result.lineNumber}</span>
                        )}
                      </div>
                      <div className="result-meta">
                        <span className={`result-type ${result.type}`}>
                          {result.type}
                        </span>
                        <span className="result-similarity">
                          {formatSimilarity(result.similarity)}
                        </span>
                      </div>
                    </div>

                    <div className="result-content">
                      {result.contextBefore && (
                        <pre className="context-before">{result.contextBefore}</pre>
                      )}
                      <pre className="result-code">{result.content}</pre>
                      {result.contextAfter && (
                        <pre className="context-after">{result.contextAfter}</pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Index Management View */
        <div className="index-view">
          <div className="index-header">
            <div className="index-stats">
              <div className="stat-card">
                <div className="stat-value">{stats.indexed.toLocaleString()}</div>
                <div className="stat-label">Indexed Files</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.total.toLocaleString()}</div>
                <div className="stat-label">Total Vectors</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.pending.toLocaleString()}</div>
                <div className="stat-label">Pending</div>
              </div>
            </div>

            <div className="index-actions">
              <button
                className="button-primary"
                onClick={indexWorkspace}
                disabled={indexing}
              >
                {indexing ? '⏳ Indexing...' : '🔄 Re-index Workspace'}
              </button>
              <button
                className="button-danger"
                onClick={clearIndex}
                disabled={indexing}
              >
                🗑️ Clear Index
              </button>
            </div>
          </div>

          <div className="indexed-files-list">
            <h3>Indexed Files</h3>
            {indexedFiles.length === 0 ? (
              <div className="empty-state">
                <p>No files indexed yet</p>
                <button className="button-primary" onClick={indexWorkspace}>
                  Index Workspace Now
                </button>
              </div>
            ) : (
              <div className="files-list">
                {indexedFiles.map((file, idx) => (
                  <div key={idx} className={`file-item ${file.status}`}>
                    <div className="file-info">
                      <span className="file-path-text">{file.path}</span>
                      <div className="file-meta">
                        <span className="file-type">{file.type}</span>
                        <span className="file-chunks">{file.chunks} chunks</span>
                        <span className="file-date">
                          {file.lastIndexed.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <span className={`file-status ${file.status}`}>
                      {file.status === 'indexed' ? '✓' : file.status === 'pending' ? '⏳' : '✗'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
