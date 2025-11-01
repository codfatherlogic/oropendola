import React, { useState, useEffect } from 'react';
import './BrowserAutomation.css';

interface BrowserSession {
    id: string;
    pageCount: number;
    createdAt: number;
    lastActivity: number;
    pages: string[];
}

interface ScrapedData {
    url: string;
    title: string;
    timestamp: number;
    data: any;
}

interface BrowserAutomationProps {
    vscode: any;
}

type ViewMode = 'sessions' | 'navigation' | 'scraping' | 'automation';

export const BrowserAutomation: React.FC<BrowserAutomationProps> = ({ vscode }) => {
    const [viewMode, setViewMode] = useState<ViewMode>('sessions');
    const [sessions, setSessions] = useState<BrowserSession[]>([]);
    const [activeSession, setActiveSession] = useState<string | null>(null);
    const [activePage, setActivePage] = useState<string | null>(null);
    const [currentUrl, setCurrentUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [screenshot, setScreenshot] = useState<string | null>(null);
    const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);

    // Session config
    const [headless, setHeadless] = useState(true);
    const [width, setWidth] = useState(1920);
    const [height, setHeight] = useState(1080);

    // Navigation
    const [navigateUrl, setNavigateUrl] = useState('');

    // Scraping
    const [scrapeSelectors, setScrapeSelectors] = useState<Record<string, string>>({});
    const [newSelectorKey, setNewSelectorKey] = useState('');
    const [newSelectorValue, setNewSelectorValue] = useState('');

    // Automation
    const [automationScript, setAutomationScript] = useState('');
    const [automationResult, setAutomationResult] = useState<any>(null);

    useEffect(() => {
        // Load initial data
        vscode.postMessage({ type: 'getBrowserSessions' });

        // Listen for updates
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            switch (message.type) {
                case 'browserSessions':
                    setSessions(message.data.sessions || []);
                    break;
                case 'sessionCreated':
                    setActiveSession(message.data.sessionId);
                    vscode.postMessage({ type: 'getBrowserSessions' });
                    break;
                case 'pageCreated':
                    setActivePage(message.data.pageId);
                    vscode.postMessage({ type: 'getBrowserSessions' });
                    break;
                case 'navigationComplete':
                    setCurrentUrl(message.data.url);
                    setLoading(false);
                    break;
                case 'screenshotTaken':
                    setScreenshot(message.data.screenshot);
                    setLoading(false);
                    break;
                case 'scrapingComplete':
                    setScrapedData(message.data.data);
                    setLoading(false);
                    break;
                case 'automationComplete':
                    setAutomationResult(message.data.result);
                    setLoading(false);
                    break;
                case 'error':
                    console.error('Browser automation error:', message.data.error);
                    setLoading(false);
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [vscode]);

    const handleCreateSession = () => {
        setLoading(true);
        vscode.postMessage({
            type: 'createBrowserSession',
            data: { headless, width, height }
        });
    };

    const handleCloseSession = (sessionId: string) => {
        vscode.postMessage({
            type: 'closeBrowserSession',
            data: { sessionId }
        });
        if (activeSession === sessionId) {
            setActiveSession(null);
            setActivePage(null);
        }
    };

    const handleNewPage = () => {
        if (!activeSession) return;
        vscode.postMessage({
            type: 'newBrowserPage',
            data: { sessionId: activeSession }
        });
    };

    const handleNavigate = () => {
        if (!activeSession || !activePage || !navigateUrl) return;
        setLoading(true);
        vscode.postMessage({
            type: 'navigateTo',
            data: {
                sessionId: activeSession,
                pageId: activePage,
                url: navigateUrl
            }
        });
    };

    const handleTakeScreenshot = () => {
        if (!activeSession || !activePage) return;
        setLoading(true);
        vscode.postMessage({
            type: 'takeScreenshot',
            data: {
                sessionId: activeSession,
                pageId: activePage
            }
        });
    };

    const handleAddSelector = () => {
        if (newSelectorKey && newSelectorValue) {
            setScrapeSelectors({
                ...scrapeSelectors,
                [newSelectorKey]: newSelectorValue
            });
            setNewSelectorKey('');
            setNewSelectorValue('');
        }
    };

    const handleRemoveSelector = (key: string) => {
        const updated = { ...scrapeSelectors };
        delete updated[key];
        setScrapeSelectors(updated);
    };

    const handleScrape = () => {
        if (!activeSession || !activePage) return;
        setLoading(true);
        vscode.postMessage({
            type: 'scrapeData',
            data: {
                sessionId: activeSession,
                pageId: activePage,
                selectors: scrapeSelectors
            }
        });
    };

    const handleRunAutomation = () => {
        if (!activeSession || !activePage || !automationScript) return;
        setLoading(true);
        vscode.postMessage({
            type: 'runAutomation',
            data: {
                sessionId: activeSession,
                pageId: activePage,
                script: automationScript
            }
        });
    };

    const formatTimestamp = (timestamp: number) => {
        return new Date(timestamp).toLocaleString();
    };

    const formatDuration = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        return `${minutes}m ${seconds % 60}s`;
    };

    const renderSessionsView = () => {
        return (
            <div className="sessions-view">
                <div className="section-header">
                    <h2>Browser Sessions</h2>
                    <button className="btn-primary" onClick={handleCreateSession} disabled={loading}>
                        {loading ? 'Creating...' : 'New Session'}
                    </button>
                </div>

                <div className="session-config">
                    <h3>Session Configuration</h3>
                    <div className="config-grid">
                        <div className="config-item">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={headless}
                                    onChange={(e) => setHeadless(e.target.checked)}
                                />
                                Headless Mode
                            </label>
                        </div>
                        <div className="config-item">
                            <label>Width:</label>
                            <input
                                type="number"
                                value={width}
                                onChange={(e) => setWidth(parseInt(e.target.value))}
                                min={800}
                                max={3840}
                            />
                        </div>
                        <div className="config-item">
                            <label>Height:</label>
                            <input
                                type="number"
                                value={height}
                                onChange={(e) => setHeight(parseInt(e.target.value))}
                                min={600}
                                max={2160}
                            />
                        </div>
                    </div>
                </div>

                {sessions.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">🌐</div>
                        <p>No active browser sessions</p>
                        <span className="empty-subtitle">Create a session to start browser automation</span>
                    </div>
                ) : (
                    <div className="sessions-list">
                        {sessions.map(session => (
                            <div
                                key={session.id}
                                className={`session-card ${activeSession === session.id ? 'active' : ''}`}
                                onClick={() => setActiveSession(session.id)}
                            >
                                <div className="session-header">
                                    <h3>Session {session.id.slice(-8)}</h3>
                                    <button
                                        className="btn-close"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleCloseSession(session.id);
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                                <div className="session-info">
                                    <div className="info-row">
                                        <span className="info-label">Pages:</span>
                                        <span className="info-value">{session.pageCount}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label">Created:</span>
                                        <span className="info-value">{formatTimestamp(session.createdAt)}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label">Last Activity:</span>
                                        <span className="info-value">
                                            {formatDuration(Date.now() - session.lastActivity)} ago
                                        </span>
                                    </div>
                                </div>
                                {session.pages.length > 0 && (
                                    <div className="pages-list">
                                        <h4>Pages:</h4>
                                        {session.pages.map(pageId => (
                                            <div
                                                key={pageId}
                                                className={`page-item ${activePage === pageId ? 'active' : ''}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActivePage(pageId);
                                                }}
                                            >
                                                Page {pageId.slice(-8)}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {activeSession && (
                    <div className="session-actions">
                        <button className="btn-secondary" onClick={handleNewPage}>
                            New Page
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const renderNavigationView = () => {
        return (
            <div className="navigation-view">
                <div className="section-header">
                    <h2>Navigation</h2>
                </div>

                {!activeSession || !activePage ? (
                    <div className="empty-state">
                        <div className="empty-icon">⚠️</div>
                        <p>No active page selected</p>
                        <span className="empty-subtitle">Create a session and page first</span>
                    </div>
                ) : (
                    <>
                        <div className="navigation-bar">
                            <input
                                type="url"
                                className="url-input"
                                placeholder="Enter URL..."
                                value={navigateUrl}
                                onChange={(e) => setNavigateUrl(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleNavigate()}
                            />
                            <button className="btn-primary" onClick={handleNavigate} disabled={loading}>
                                {loading ? 'Loading...' : 'Go'}
                            </button>
                        </div>

                        {currentUrl && (
                            <div className="current-url">
                                <span className="url-label">Current URL:</span>
                                <code>{currentUrl}</code>
                            </div>
                        )}

                        <div className="navigation-actions">
                            <button className="btn-secondary" onClick={handleTakeScreenshot} disabled={loading}>
                                📷 Take Screenshot
                            </button>
                            <button
                                className="btn-secondary"
                                onClick={() => {
                                    vscode.postMessage({
                                        type: 'reloadPage',
                                        data: { sessionId: activeSession, pageId: activePage }
                                    });
                                }}
                            >
                                🔄 Reload
                            </button>
                        </div>

                        {screenshot && (
                            <div className="screenshot-preview">
                                <h3>Screenshot</h3>
                                <img src={`data:image/png;base64,${screenshot}`} alt="Screenshot" />
                                <button
                                    className="btn-secondary"
                                    onClick={() => {
                                        vscode.postMessage({
                                            type: 'saveScreenshot',
                                            data: { screenshot }
                                        });
                                    }}
                                >
                                    Save Screenshot
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    };

    const renderScrapingView = () => {
        return (
            <div className="scraping-view">
                <div className="section-header">
                    <h2>Web Scraping</h2>
                </div>

                {!activeSession || !activePage ? (
                    <div className="empty-state">
                        <div className="empty-icon">⚠️</div>
                        <p>No active page selected</p>
                        <span className="empty-subtitle">Navigate to a page first</span>
                    </div>
                ) : (
                    <>
                        <div className="selectors-section">
                            <h3>CSS Selectors</h3>
                            <div className="selector-input-row">
                                <input
                                    type="text"
                                    placeholder="Key (e.g., 'title')"
                                    value={newSelectorKey}
                                    onChange={(e) => setNewSelectorKey(e.target.value)}
                                />
                                <input
                                    type="text"
                                    placeholder="CSS Selector (e.g., 'h1.title')"
                                    value={newSelectorValue}
                                    onChange={(e) => setNewSelectorValue(e.target.value)}
                                />
                                <button className="btn-primary" onClick={handleAddSelector}>
                                    Add
                                </button>
                            </div>

                            {Object.keys(scrapeSelectors).length > 0 && (
                                <div className="selectors-list">
                                    {Object.entries(scrapeSelectors).map(([key, value]) => (
                                        <div key={key} className="selector-item">
                                            <div className="selector-content">
                                                <span className="selector-key">{key}:</span>
                                                <code className="selector-value">{value}</code>
                                            </div>
                                            <button
                                                className="btn-remove"
                                                onClick={() => handleRemoveSelector(key)}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                className="btn-primary"
                                onClick={handleScrape}
                                disabled={loading || Object.keys(scrapeSelectors).length === 0}
                            >
                                {loading ? 'Scraping...' : 'Scrape Data'}
                            </button>
                        </div>

                        {scrapedData && (
                            <div className="scraped-data">
                                <h3>Scraped Data</h3>
                                <div className="data-info">
                                    <div className="info-row">
                                        <span className="info-label">URL:</span>
                                        <span className="info-value">{scrapedData.url}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label">Title:</span>
                                        <span className="info-value">{scrapedData.title}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label">Timestamp:</span>
                                        <span className="info-value">{formatTimestamp(scrapedData.timestamp)}</span>
                                    </div>
                                </div>
                                <pre className="data-preview">{JSON.stringify(scrapedData.data, null, 2)}</pre>
                                <button
                                    className="btn-secondary"
                                    onClick={() => {
                                        vscode.postMessage({
                                            type: 'saveScrapedData',
                                            data: { data: scrapedData }
                                        });
                                    }}
                                >
                                    Save Data
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    };

    const renderAutomationView = () => {
        return (
            <div className="automation-view">
                <div className="section-header">
                    <h2>Automation Scripts</h2>
                </div>

                {!activeSession || !activePage ? (
                    <div className="empty-state">
                        <div className="empty-icon">⚠️</div>
                        <p>No active page selected</p>
                        <span className="empty-subtitle">Create a session and page first</span>
                    </div>
                ) : (
                    <>
                        <div className="script-editor">
                            <h3>JavaScript Code</h3>
                            <textarea
                                className="script-textarea"
                                placeholder="Enter JavaScript code to execute in the browser context..."
                                value={automationScript}
                                onChange={(e) => setAutomationScript(e.target.value)}
                                rows={15}
                            />
                            <button
                                className="btn-primary"
                                onClick={handleRunAutomation}
                                disabled={loading || !automationScript}
                            >
                                {loading ? 'Running...' : 'Run Script'}
                            </button>
                        </div>

                        {automationResult !== null && (
                            <div className="automation-result">
                                <h3>Result</h3>
                                <pre className="result-preview">
                                    {typeof automationResult === 'object'
                                        ? JSON.stringify(automationResult, null, 2)
                                        : String(automationResult)}
                                </pre>
                            </div>
                        )}

                        <div className="script-examples">
                            <h3>Examples</h3>
                            <div className="examples-list">
                                <div className="example-item">
                                    <h4>Get all links</h4>
                                    <code>
                                        {`Array.from(document.querySelectorAll('a')).map(a => ({text: a.textContent, href: a.href}))`}
                                    </code>
                                </div>
                                <div className="example-item">
                                    <h4>Extract table data</h4>
                                    <code>
                                        {`Array.from(document.querySelectorAll('table tr')).map(r => Array.from(r.querySelectorAll('td')).map(c => c.textContent))`}
                                    </code>
                                </div>
                                <div className="example-item">
                                    <h4>Click button</h4>
                                    <code>
                                        document.querySelector('.submit-button').click()
                                    </code>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="browser-automation-container">
            <div className="automation-header">
                <h1>Browser Automation</h1>
                <p className="automation-subtitle">Automate web browsing, scraping, and testing</p>
            </div>

            <div className="view-tabs">
                <button
                    className={`tab-button ${viewMode === 'sessions' ? 'active' : ''}`}
                    onClick={() => setViewMode('sessions')}
                >
                    <span className="tab-icon">🖥️</span>
                    Sessions
                    {sessions.length > 0 && <span className="tab-badge">{sessions.length}</span>}
                </button>
                <button
                    className={`tab-button ${viewMode === 'navigation' ? 'active' : ''}`}
                    onClick={() => setViewMode('navigation')}
                    disabled={!activeSession || !activePage}
                >
                    <span className="tab-icon">🌐</span>
                    Navigation
                </button>
                <button
                    className={`tab-button ${viewMode === 'scraping' ? 'active' : ''}`}
                    onClick={() => setViewMode('scraping')}
                    disabled={!activeSession || !activePage}
                >
                    <span className="tab-icon">📊</span>
                    Scraping
                </button>
                <button
                    className={`tab-button ${viewMode === 'automation' ? 'active' : ''}`}
                    onClick={() => setViewMode('automation')}
                    disabled={!activeSession || !activePage}
                >
                    <span className="tab-icon">⚡</span>
                    Automation
                </button>
            </div>

            <div className="view-content">
                {viewMode === 'sessions' && renderSessionsView()}
                {viewMode === 'navigation' && renderNavigationView()}
                {viewMode === 'scraping' && renderScrapingView()}
                {viewMode === 'automation' && renderAutomationView()}
            </div>
        </div>
    );
};
