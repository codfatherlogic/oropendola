import React, { useState, useEffect } from 'react'
import Toggle from '../common/Toggle'
import './CodeIndexManager.css'

interface IndexStats {
  totalFiles: number
  totalChunks: number
  indexedFiles: number
  indexedChunks: number
  lastIndexTime?: number
  qdrantConnected: boolean
  collectionSize?: number
}

interface SearchResult {
  filePath: string
  content: string
  score: number
  language: string
  startLine: number
  endLine: number
  functionName?: string
  className?: string
}

interface CodeIndexManagerProps {
  stats: IndexStats
  indexedFiles: string[]
  isIndexing: boolean
  onStartIndexing: () => void
  onStopIndexing: () => void
  onClearIndex: () => void
  onRebuildIndex: () => void
  onSearch: (query: string, language?: string) => Promise<SearchResult[]>
  onOpenFile: (filePath: string, line: number) => void
  onTestConnection: () => Promise<boolean>
}

const CodeIndexManager: React.FC<CodeIndexManagerProps> = ({
  stats,
  indexedFiles,
  isIndexing,
  onStartIndexing,
  onStopIndexing,
  onClearIndex,
  onRebuildIndex,
  onSearch,
  onOpenFile,
  onTestConnection
}) => {
  const [view, setView] = useState<'overview' | 'files' | 'search'>('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLanguage, setSearchLanguage] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showRebuildConfirm, setShowRebuildConfirm] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking')

  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    setConnectionStatus('checking')
    const connected = await onTestConnection()
    setConnectionStatus(connected ? 'connected' : 'disconnected')
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      return
    }

    setSearching(true)
    try {
      const results = await onSearch(searchQuery, searchLanguage || undefined)
      setSearchResults(results)
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Never'
    return new Date(timestamp).toLocaleString()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'var(--vscode-testing-iconPassed)'
      case 'disconnected':
        return 'var(--vscode-testing-iconFailed)'
      default:
        return 'var(--vscode-descriptionForeground)'
    }
  }

  return (
    <div className="code-index-manager">
      {/* Header */}
      <div className="page-header">
        <h2>Code Index</h2>
        <div className="header-actions">
          <div className="connection-status" style={{ color: getConnectionStatusColor() }}>
            <span className="status-dot"></span>
            {connectionStatus === 'checking' && 'Checking...'}
            {connectionStatus === 'connected' && 'Qdrant Connected'}
            {connectionStatus === 'disconnected' && 'Qdrant Disconnected'}
          </div>
          <button className="refresh-btn" onClick={checkConnection}>
            🔄
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${view === 'overview' ? 'active' : ''}`}
          onClick={() => setView('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${view === 'files' ? 'active' : ''}`}
          onClick={() => setView('files')}
        >
          Indexed Files ({indexedFiles.length})
        </button>
        <button
          className={`tab ${view === 'search' ? 'active' : ''}`}
          onClick={() => setView('search')}
        >
          Semantic Search
        </button>
      </div>

      {/* Overview View */}
      {view === 'overview' && (
        <div className="overview-view">
          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Files</div>
              <div className="stat-value">{stats.totalFiles}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Indexed Files</div>
              <div className="stat-value">{stats.indexedFiles}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Chunks</div>
              <div className="stat-value">{stats.indexedChunks}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Last Indexed</div>
              <div className="stat-value small">{formatDate(stats.lastIndexTime)}</div>
            </div>
          </div>

          {/* Progress Section */}
          {isIndexing && (
            <div className="progress-section">
              <div className="progress-header">
                <h3>Indexing in Progress...</h3>
                <button className="stop-btn" onClick={onStopIndexing}>
                  Stop
                </button>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${stats.totalFiles > 0 ? (stats.indexedFiles / stats.totalFiles) * 100 : 0}%` }}
                ></div>
              </div>
              <div className="progress-text">
                {stats.indexedFiles} / {stats.totalFiles} files indexed
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="actions-section">
            <h3>Actions</h3>
            <div className="action-buttons">
              <button
                className="action-btn primary"
                onClick={onStartIndexing}
                disabled={isIndexing || connectionStatus !== 'connected'}
              >
                {isIndexing ? 'Indexing...' : 'Start Indexing'}
              </button>
              <button
                className="action-btn secondary"
                onClick={() => setShowRebuildConfirm(true)}
                disabled={isIndexing || connectionStatus !== 'connected'}
              >
                Rebuild Index
              </button>
              <button
                className="action-btn danger"
                onClick={() => setShowClearConfirm(true)}
                disabled={isIndexing || connectionStatus !== 'connected'}
              >
                Clear Index
              </button>
            </div>

            {connectionStatus === 'disconnected' && (
              <div className="warning-message">
                ⚠️ Qdrant is not connected. Make sure Qdrant is running at the configured URL.
              </div>
            )}
          </div>

          {/* Configuration Info */}
          <div className="config-section">
            <h3>Configuration</h3>
            <div className="config-grid">
              <div className="config-item">
                <div className="config-label">Embedding Provider</div>
                <div className="config-value">OpenAI (text-embedding-ada-002)</div>
              </div>
              <div className="config-item">
                <div className="config-label">Vector Dimensions</div>
                <div className="config-value">1536</div>
              </div>
              <div className="config-item">
                <div className="config-label">Distance Metric</div>
                <div className="config-value">Cosine Similarity</div>
              </div>
              <div className="config-item">
                <div className="config-label">Chunk Size</div>
                <div className="config-value">50 lines</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Files View */}
      {view === 'files' && (
        <div className="files-view">
          <div className="files-header">
            <h3>Indexed Files</h3>
            <div className="files-count">{indexedFiles.length} files</div>
          </div>

          {indexedFiles.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📁</div>
              <h4>No files indexed yet</h4>
              <p>Start indexing to enable semantic code search</p>
              <button className="start-indexing-btn" onClick={onStartIndexing}>
                Start Indexing
              </button>
            </div>
          ) : (
            <div className="files-list">
              {indexedFiles.map((file, index) => (
                <div key={index} className="file-item" onClick={() => onOpenFile(file, 1)}>
                  <div className="file-icon">📄</div>
                  <div className="file-path">{file}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search View */}
      {view === 'search' && (
        <div className="search-view">
          <div className="search-header">
            <h3>Semantic Code Search</h3>
            <p className="search-description">
              Search your codebase using natural language. The search understands code semantics, not just keywords.
            </p>
          </div>

          <div className="search-form">
            <div className="search-input-group">
              <input
                type="text"
                className="search-input"
                placeholder="e.g., 'function that validates email addresses' or 'error handling logic'"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <select
                className="language-select"
                value={searchLanguage}
                onChange={(e) => setSearchLanguage(e.target.value)}
              >
                <option value="">All Languages</option>
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
              </select>
              <button
                className="search-btn"
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="search-results">
              <div className="results-header">
                <h4>Results ({searchResults.length})</h4>
              </div>

              <div className="results-list">
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    className="result-item"
                    onClick={() => onOpenFile(result.filePath, result.startLine)}
                  >
                    <div className="result-header">
                      <div className="result-file">
                        <span className="file-icon">📄</span>
                        <span className="file-path">{result.filePath}</span>
                        <span className="file-location">
                          Lines {result.startLine}-{result.endLine}
                        </span>
                      </div>
                      <div className="result-score">
                        Score: {(result.score * 100).toFixed(1)}%
                      </div>
                    </div>

                    {(result.functionName || result.className) && (
                      <div className="result-meta">
                        {result.className && (
                          <span className="meta-tag">Class: {result.className}</span>
                        )}
                        {result.functionName && (
                          <span className="meta-tag">Function: {result.functionName}</span>
                        )}
                        <span className="meta-tag language">{result.language}</span>
                      </div>
                    )}

                    <pre className="result-code">{result.content}</pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          {searchResults.length === 0 && searchQuery && !searching && (
            <div className="no-results">
              <div className="no-results-icon">🔍</div>
              <h4>No results found</h4>
              <p>Try different keywords or check if your code is indexed</p>
            </div>
          )}
        </div>
      )}

      {/* Clear Confirmation Dialog */}
      {showClearConfirm && (
        <div className="modal-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Clear Index</h3>
            <p>Are you sure you want to clear the entire code index? This action cannot be undone.</p>
            <div className="modal-actions">
              <button
                className="modal-btn danger"
                onClick={() => {
                  onClearIndex()
                  setShowClearConfirm(false)
                }}
              >
                Clear Index
              </button>
              <button className="modal-btn" onClick={() => setShowClearConfirm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rebuild Confirmation Dialog */}
      {showRebuildConfirm && (
        <div className="modal-overlay" onClick={() => setShowRebuildConfirm(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Rebuild Index</h3>
            <p>
              This will clear the existing index and re-index all files in your workspace. This may take several minutes.
            </p>
            <div className="modal-actions">
              <button
                className="modal-btn primary"
                onClick={() => {
                  onRebuildIndex()
                  setShowRebuildConfirm(false)
                }}
              >
                Rebuild Index
              </button>
              <button className="modal-btn" onClick={() => setShowRebuildConfirm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CodeIndexManager
