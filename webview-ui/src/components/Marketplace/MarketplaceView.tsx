/**
 * Marketplace View Component
 *
 * Browse, search, and install VS Code extensions and Oropendola plugins
 * Week 8: Marketplace Phase 2
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import vscode from '../../vscode-api'
import './MarketplaceView.css'

interface MarketplaceExtension {
  id: string
  name: string
  displayName: string
  publisher: string
  version: string
  description: string
  icon?: string
  installs: number
  rating: number
  ratingCount: number
  categories: string[]
  tags: string[]
  repositoryUrl?: string
  homepageUrl?: string
  license?: string
  isInstalled: boolean
}

interface InstalledExtension {
  id: string
  name: string
  version: string
  enabled: boolean
}

export const MarketplaceView: React.FC = () => {
  const [extensions, setExtensions] = useState<MarketplaceExtension[]>([])
  const [installed, setInstalled] = useState<InstalledExtension[]>([])
  const [selectedExtension, setSelectedExtension] = useState<MarketplaceExtension | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'Installs' | 'Rating' | 'Name'>('Installs')
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'browse' | 'installed' | 'details'>('browse')
  const searchTimeout = useRef<NodeJS.Timeout>()

  const categories = [
    'All',
    'AI Copilots',
    'Programming Languages',
    'Snippets',
    'Linters',
    'Themes',
    'Debuggers',
    'Formatters',
    'Other'
  ]

  // Load installed extensions on mount
  useEffect(() => {
    vscode.postMessage({ type: 'getInstalledExtensions' })
    performSearch()

    // Listen for messages from extension
    const handleMessage = (event: MessageEvent) => {
      const message = event.data

      switch (message.type) {
        case 'marketplaceSearchResults':
          setExtensions(message.extensions)
          setLoading(false)
          break

        case 'installedExtensions':
          setInstalled(message.extensions)
          break

        case 'extensionInstalled':
          setInstalled(prev => [...prev, message.extension])
          if (selectedExtension?.id === message.extension.id) {
            setSelectedExtension({
              ...selectedExtension,
              isInstalled: true
            } as MarketplaceExtension)
          }
          break

        case 'extensionUninstalled':
          setInstalled(prev => prev.filter(e => e.id !== message.extensionId))
          if (selectedExtension?.id === message.extensionId) {
            setSelectedExtension({
              ...selectedExtension,
              isInstalled: false
            } as MarketplaceExtension)
          }
          break

        case 'extensionDetails':
          setSelectedExtension(message.extension)
          setView('details')
          break
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Debounced search
  const performSearch = useCallback(() => {
    setLoading(true)
    vscode.postMessage({
      type: 'searchMarketplace',
      query: searchQuery,
      category: selectedCategory === 'all' ? undefined : selectedCategory,
      sortBy,
      pageSize: 50
    })
  }, [searchQuery, selectedCategory, sortBy])

  // Handle search input change
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }
    searchTimeout.current = setTimeout(() => {
      performSearch()
    }, 500)
  }, [performSearch])

  // Install extension
  const installExtension = useCallback((extension: MarketplaceExtension) => {
    vscode.postMessage({
      type: 'installExtension',
      extensionId: extension.id
    })
  }, [])

  // Uninstall extension
  const uninstallExtension = useCallback((extensionId: string) => {
    vscode.postMessage({
      type: 'uninstallExtension',
      extensionId
    })
  }, [])

  // View extension details
  const viewDetails = useCallback((extension: MarketplaceExtension) => {
    vscode.postMessage({
      type: 'getExtensionDetails',
      extensionId: extension.id
    })
  }, [])

  // Format install count
  const formatInstalls = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count.toString()
  }

  return (
    <div className="marketplace-view">
      <div className="marketplace-header">
        <h2>🛒 Extension Marketplace</h2>
        <div className="view-switcher">
          <button
            className={`view-button ${view === 'browse' ? 'active' : ''}`}
            onClick={() => setView('browse')}
          >
            Browse
          </button>
          <button
            className={`view-button ${view === 'installed' ? 'active' : ''}`}
            onClick={() => setView('installed')}
          >
            Installed ({installed.length})
          </button>
        </div>
      </div>

      {view === 'details' && selectedExtension ? (
        /* Extension Details View */
        <div className="extension-details">
          <button className="back-button" onClick={() => setView('browse')}>
            ← Back to Browse
          </button>

          <div className="details-header">
            {selectedExtension.icon && (
              <img
                src={selectedExtension.icon}
                alt={selectedExtension.displayName}
                className="details-icon"
              />
            )}
            <div className="details-info">
              <h1>{selectedExtension.displayName}</h1>
              <p className="details-publisher">{selectedExtension.publisher}</p>
              <p className="details-description">{selectedExtension.description}</p>

              <div className="details-meta">
                <span className="meta-item">
                  ⭐ {selectedExtension.rating.toFixed(1)} ({selectedExtension.ratingCount})
                </span>
                <span className="meta-item">
                  📥 {formatInstalls(selectedExtension.installs)}
                </span>
                <span className="meta-item">
                  📦 v{selectedExtension.version}
                </span>
              </div>

              <div className="details-actions">
                {selectedExtension.isInstalled ? (
                  <button
                    className="button-danger"
                    onClick={() => uninstallExtension(selectedExtension.id)}
                  >
                    Uninstall
                  </button>
                ) : (
                  <button
                    className="button-primary"
                    onClick={() => installExtension(selectedExtension)}
                  >
                    Install
                  </button>
                )}
                {selectedExtension.repositoryUrl && (
                  <button
                    className="button-secondary"
                    onClick={() => window.open(selectedExtension.repositoryUrl, '_blank')}
                  >
                    Repository
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="details-content">
            <div className="details-section">
              <h3>Categories</h3>
              <div className="category-tags">
                {selectedExtension.categories.map(cat => (
                  <span key={cat} className="category-tag">{cat}</span>
                ))}
              </div>
            </div>

            {selectedExtension.tags.length > 0 && (
              <div className="details-section">
                <h3>Tags</h3>
                <div className="tag-list">
                  {selectedExtension.tags.map(tag => (
                    <span key={tag} className="tag-item">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {selectedExtension.license && (
              <div className="details-section">
                <h3>License</h3>
                <p>{selectedExtension.license}</p>
              </div>
            )}
          </div>
        </div>
      ) : view === 'installed' ? (
        /* Installed Extensions View */
        <div className="installed-view">
          {installed.length === 0 ? (
            <div className="empty-state">
              <p>No extensions installed yet</p>
              <button className="button-primary" onClick={() => setView('browse')}>
                Browse Marketplace
              </button>
            </div>
          ) : (
            <div className="installed-list">
              {installed.map(ext => (
                <div key={ext.id} className="installed-item">
                  <div className="installed-info">
                    <h3>{ext.name}</h3>
                    <p className="installed-version">v{ext.version}</p>
                  </div>
                  <div className="installed-actions">
                    <button
                      className="button-small button-danger"
                      onClick={() => uninstallExtension(ext.id)}
                    >
                      Uninstall
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Browse Extensions View */
        <>
          <div className="marketplace-controls">
            <div className="search-bar">
              <input
                type="text"
                className="search-input"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search extensions..."
              />
            </div>

            <div className="filter-bar">
              <select
                className="category-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat.toLowerCase()}>
                    {cat}
                  </option>
                ))}
              </select>

              <select
                className="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="Installs">Most Installed</option>
                <option value="Rating">Highest Rated</option>
                <option value="Name">Name (A-Z)</option>
              </select>
            </div>
          </div>

          <div className="marketplace-content">
            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner" />
                <p>Searching marketplace...</p>
              </div>
            ) : extensions.length === 0 ? (
              <div className="empty-state">
                <p>No extensions found</p>
                <p className="empty-hint">Try a different search or category</p>
              </div>
            ) : (
              <div className="extensions-grid">
                {extensions.map(ext => (
                  <div
                    key={ext.id}
                    className="extension-card"
                    onClick={() => viewDetails(ext)}
                  >
                    {ext.icon && (
                      <img
                        src={ext.icon}
                        alt={ext.displayName}
                        className="extension-icon"
                      />
                    )}
                    <div className="extension-info">
                      <h3 className="extension-name">{ext.displayName}</h3>
                      <p className="extension-publisher">{ext.publisher}</p>
                      <p className="extension-description">{ext.description}</p>

                      <div className="extension-meta">
                        <span className="meta-rating">
                          ⭐ {ext.rating.toFixed(1)}
                        </span>
                        <span className="meta-installs">
                          📥 {formatInstalls(ext.installs)}
                        </span>
                      </div>

                      <div className="extension-footer">
                        {ext.isInstalled ? (
                          <span className="installed-badge">✓ Installed</span>
                        ) : (
                          <button
                            className="install-button"
                            onClick={(e) => {
                              e.stopPropagation()
                              installExtension(ext)
                            }}
                          >
                            Install
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
