import React, { useState, useEffect } from 'react';
import './CloudSync.css';

interface SyncConfig {
    enabled: boolean;
    endpoint: string;
    apiKey: string;
    organizationId?: string;
    autoSync: boolean;
    syncInterval: number;
    itemsToSync: string[];
}

interface SyncLog {
    timestamp: number;
    action: string;
    itemType: string;
    itemId: string;
    message: string;
    success: boolean;
}

interface SyncConflict {
    itemId: string;
    type: string;
    localVersion: number;
    remoteVersion: number;
    localData: any;
    remoteData: any;
    timestamp: number;
}

interface SyncStatistics {
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    activeConflicts: number;
    lastSync: number | null;
    status: string;
    enabled: boolean;
    autoSync: boolean;
}

interface CloudSyncProps {
    vscode: any;
}

type ViewMode = 'config' | 'logs' | 'conflicts' | 'statistics';

export const CloudSync: React.FC<CloudSyncProps> = ({ vscode }) => {
    const [viewMode, setViewMode] = useState<ViewMode>('config');
    const [config, setConfig] = useState<SyncConfig>({
        enabled: false,
        endpoint: '',
        apiKey: '',
        autoSync: false,
        syncInterval: 300000,
        itemsToSync: []
    });
    const [status, setStatus] = useState<string>('offline');
    const [logs, setLogs] = useState<SyncLog[]>([]);
    const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
    const [statistics, setStatistics] = useState<SyncStatistics | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [selectedConflict, setSelectedConflict] = useState<SyncConflict | null>(null);

    const syncItemTypes = [
        { id: 'settings', label: 'Settings' },
        { id: 'prompts', label: 'Prompts' },
        { id: 'checkpoints', label: 'Checkpoints' },
        { id: 'conversations', label: 'Conversations' },
        { id: 'custom_modes', label: 'Custom Modes' },
        { id: 'code_index', label: 'Code Index' }
    ];

    useEffect(() => {
        // Load initial data
        vscode.postMessage({ type: 'getCloudSyncData' });

        // Listen for updates
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            switch (message.type) {
                case 'cloudSyncData':
                    setConfig(message.data.config);
                    setStatus(message.data.status);
                    setLogs(message.data.logs || []);
                    setConflicts(message.data.conflicts || []);
                    setStatistics(message.data.statistics);
                    break;
                case 'syncStatusUpdate':
                    setStatus(message.data.status);
                    setSyncing(message.data.status === 'syncing');
                    break;
                case 'syncComplete':
                    setSyncing(false);
                    vscode.postMessage({ type: 'getCloudSyncData' });
                    break;
                case 'error':
                    console.error('Cloud sync error:', message.data.error);
                    setSyncing(false);
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [vscode]);

    const handleConnect = () => {
        if (!config.endpoint || !config.apiKey) {
            alert('Please enter endpoint and API key');
            return;
        }

        setSyncing(true);
        vscode.postMessage({
            type: 'connectCloudSync',
            data: { endpoint: config.endpoint, apiKey: config.apiKey }
        });
    };

    const handleDisconnect = () => {
        vscode.postMessage({ type: 'disconnectCloudSync' });
    };

    const handleSync = () => {
        setSyncing(true);
        vscode.postMessage({ type: 'syncAll' });
    };

    const handleConfigUpdate = (updates: Partial<SyncConfig>) => {
        const newConfig = { ...config, ...updates };
        setConfig(newConfig);
        vscode.postMessage({
            type: 'updateCloudSyncConfig',
            data: newConfig
        });
    };

    const handleToggleSyncItem = (itemType: string) => {
        const itemsToSync = config.itemsToSync.includes(itemType)
            ? config.itemsToSync.filter(t => t !== itemType)
            : [...config.itemsToSync, itemType];
        handleConfigUpdate({ itemsToSync });
    };

    const handleResolveConflict = (conflictId: string, useLocal: boolean) => {
        vscode.postMessage({
            type: 'resolveConflict',
            data: { conflictId, useLocal }
        });
        setSelectedConflict(null);
    };

    const formatTimestamp = (timestamp: number) => {
        return new Date(timestamp).toLocaleString();
    };

    const formatInterval = (ms: number) => {
        const minutes = Math.floor(ms / 60000);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h ${minutes % 60}m`;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'synced': return 'status-synced';
            case 'syncing': return 'status-syncing';
            case 'error': return 'status-error';
            case 'conflict': return 'status-conflict';
            default: return 'status-offline';
        }
    };

    const renderConfigView = () => {
        return (
            <div className="config-view">
                <div className="section-header">
                    <h2>Cloud Sync Configuration</h2>
                    <div className={`status-indicator ${getStatusColor(status)}`}>
                        {status.toUpperCase()}
                    </div>
                </div>

                <div className="config-section">
                    <h3>Connection Settings</h3>
                    <div className="form-group">
                        <label htmlFor="endpoint">API Endpoint</label>
                        <input
                            id="endpoint"
                            type="url"
                            value={config.endpoint}
                            onChange={(e) => setConfig({ ...config, endpoint: e.target.value })}
                            placeholder="https://api.example.com"
                            disabled={config.enabled}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="apiKey">API Key</label>
                        <input
                            id="apiKey"
                            type="password"
                            value={config.apiKey}
                            onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                            placeholder="Enter your API key"
                            disabled={config.enabled}
                        />
                    </div>
                    <div className="button-group">
                        {!config.enabled ? (
                            <button className="btn-primary" onClick={handleConnect} disabled={syncing}>
                                {syncing ? 'Connecting...' : 'Connect'}
                            </button>
                        ) : (
                            <>
                                <button className="btn-primary" onClick={handleSync} disabled={syncing}>
                                    {syncing ? 'Syncing...' : 'Sync Now'}
                                </button>
                                <button className="btn-secondary" onClick={handleDisconnect}>
                                    Disconnect
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {config.enabled && (
                    <>
                        <div className="config-section">
                            <h3>Auto-Sync Settings</h3>
                            <div className="form-group checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={config.autoSync}
                                        onChange={(e) => handleConfigUpdate({ autoSync: e.target.checked })}
                                    />
                                    Enable automatic synchronization
                                </label>
                            </div>
                            {config.autoSync && (
                                <div className="form-group">
                                    <label htmlFor="syncInterval">Sync Interval</label>
                                    <div className="interval-selector">
                                        <input
                                            id="syncInterval"
                                            type="number"
                                            value={config.syncInterval / 60000}
                                            onChange={(e) =>
                                                handleConfigUpdate({ syncInterval: parseInt(e.target.value) * 60000 })
                                            }
                                            min={1}
                                            max={60}
                                        />
                                        <span>minutes</span>
                                    </div>
                                    <div className="preset-intervals">
                                        <button onClick={() => handleConfigUpdate({ syncInterval: 60000 })}>1m</button>
                                        <button onClick={() => handleConfigUpdate({ syncInterval: 300000 })}>5m</button>
                                        <button onClick={() => handleConfigUpdate({ syncInterval: 900000 })}>15m</button>
                                        <button onClick={() => handleConfigUpdate({ syncInterval: 1800000 })}>30m</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="config-section">
                            <h3>Items to Sync</h3>
                            <div className="sync-items-list">
                                {syncItemTypes.map(item => (
                                    <div key={item.id} className="sync-item">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={config.itemsToSync.includes(item.id)}
                                                onChange={() => handleToggleSyncItem(item.id)}
                                            />
                                            {item.label}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    };

    const renderLogsView = () => {
        return (
            <div className="logs-view">
                <div className="section-header">
                    <h2>Sync Logs</h2>
                    <button className="btn-secondary" onClick={() => vscode.postMessage({ type: 'clearSyncLogs' })}>
                        Clear Logs
                    </button>
                </div>

                {logs.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📋</div>
                        <p>No sync logs yet</p>
                        <span className="empty-subtitle">Sync activity will appear here</span>
                    </div>
                ) : (
                    <div className="logs-list">
                        {logs.map((log, index) => (
                            <div key={index} className={`log-item ${log.success ? 'success' : 'error'}`}>
                                <div className="log-header">
                                    <span className={`log-icon ${log.success ? 'success' : 'error'}`}>
                                        {log.success ? '✓' : '✗'}
                                    </span>
                                    <span className="log-action">{log.action.toUpperCase()}</span>
                                    <span className="log-type">{log.itemType}</span>
                                    <span className="log-time">{formatTimestamp(log.timestamp)}</span>
                                </div>
                                <div className="log-message">{log.message}</div>
                                <div className="log-id">ID: {log.itemId}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderConflictsView = () => {
        return (
            <div className="conflicts-view">
                <div className="section-header">
                    <h2>Sync Conflicts</h2>
                    {conflicts.length > 0 && (
                        <button className="btn-secondary" onClick={() => vscode.postMessage({ type: 'clearConflicts' })}>
                            Clear All
                        </button>
                    )}
                </div>

                {conflicts.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">✓</div>
                        <p>No sync conflicts</p>
                        <span className="empty-subtitle">All items are in sync</span>
                    </div>
                ) : (
                    <div className="conflicts-list">
                        {conflicts.map((conflict, index) => (
                            <div key={index} className="conflict-card" onClick={() => setSelectedConflict(conflict)}>
                                <div className="conflict-header">
                                    <span className="conflict-type">{conflict.type}</span>
                                    <span className="conflict-time">{formatTimestamp(conflict.timestamp)}</span>
                                </div>
                                <div className="conflict-id">ID: {conflict.itemId}</div>
                                <div className="conflict-versions">
                                    <span>Local: v{conflict.localVersion}</span>
                                    <span>Remote: v{conflict.remoteVersion}</span>
                                </div>
                                <button
                                    className="btn-primary"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedConflict(conflict);
                                    }}
                                >
                                    Resolve
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {selectedConflict && (
                    <div className="modal-overlay" onClick={() => setSelectedConflict(null)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Resolve Conflict</h2>
                                <button className="modal-close" onClick={() => setSelectedConflict(null)}>×</button>
                            </div>
                            <div className="modal-body">
                                <div className="conflict-details">
                                    <div className="detail-row">
                                        <span className="detail-label">Item Type:</span>
                                        <span className="detail-value">{selectedConflict.type}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="detail-label">Item ID:</span>
                                        <span className="detail-value">{selectedConflict.itemId}</span>
                                    </div>
                                </div>
                                <div className="conflict-comparison">
                                    <div className="version-panel">
                                        <h3>Local Version (v{selectedConflict.localVersion})</h3>
                                        <pre>{JSON.stringify(selectedConflict.localData, null, 2)}</pre>
                                    </div>
                                    <div className="version-panel">
                                        <h3>Remote Version (v{selectedConflict.remoteVersion})</h3>
                                        <pre>{JSON.stringify(selectedConflict.remoteData, null, 2)}</pre>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    className="btn-secondary"
                                    onClick={() => handleResolveConflict(selectedConflict.itemId, false)}
                                >
                                    Use Remote
                                </button>
                                <button
                                    className="btn-primary"
                                    onClick={() => handleResolveConflict(selectedConflict.itemId, true)}
                                >
                                    Use Local
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderStatisticsView = () => {
        if (!statistics) {
            return (
                <div className="empty-state">
                    <div className="empty-icon">📊</div>
                    <p>No statistics available</p>
                </div>
            );
        }

        return (
            <div className="statistics-view">
                <div className="section-header">
                    <h2>Sync Statistics</h2>
                </div>

                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon">🔄</div>
                        <div className="stat-content">
                            <div className="stat-value">{statistics.totalSyncs}</div>
                            <div className="stat-label">Total Syncs</div>
                        </div>
                    </div>

                    <div className="stat-card success">
                        <div className="stat-icon">✓</div>
                        <div className="stat-content">
                            <div className="stat-value">{statistics.successfulSyncs}</div>
                            <div className="stat-label">Successful</div>
                        </div>
                    </div>

                    <div className="stat-card error">
                        <div className="stat-icon">✗</div>
                        <div className="stat-content">
                            <div className="stat-value">{statistics.failedSyncs}</div>
                            <div className="stat-label">Failed</div>
                        </div>
                    </div>

                    <div className="stat-card warning">
                        <div className="stat-icon">⚠️</div>
                        <div className="stat-content">
                            <div className="stat-value">{statistics.activeConflicts}</div>
                            <div className="stat-label">Conflicts</div>
                        </div>
                    </div>

                    <div className="stat-card info">
                        <div className="stat-icon">🕒</div>
                        <div className="stat-content">
                            <div className="stat-value">
                                {statistics.lastSync ? formatTimestamp(statistics.lastSync) : 'Never'}
                            </div>
                            <div className="stat-label">Last Sync</div>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon">⚙️</div>
                        <div className="stat-content">
                            <div className="stat-value">{statistics.enabled ? 'Enabled' : 'Disabled'}</div>
                            <div className="stat-label">Status</div>
                        </div>
                    </div>
                </div>

                <div className="sync-rate">
                    <h3>Success Rate</h3>
                    <div className="progress-bar">
                        <div
                            className="progress-fill success"
                            style={{
                                width: `${statistics.totalSyncs > 0
                                    ? (statistics.successfulSyncs / statistics.totalSyncs) * 100
                                    : 0
                                }%`
                            }}
                        />
                    </div>
                    <span className="progress-label">
                        {statistics.totalSyncs > 0
                            ? `${Math.round((statistics.successfulSyncs / statistics.totalSyncs) * 100)}%`
                            : '0%'}
                    </span>
                </div>
            </div>
        );
    };

    return (
        <div className="cloud-sync-container">
            <div className="sync-header">
                <h1>Cloud Sync</h1>
                <p className="sync-subtitle">Synchronize your settings and data across devices</p>
            </div>

            <div className="view-tabs">
                <button
                    className={`tab-button ${viewMode === 'config' ? 'active' : ''}`}
                    onClick={() => setViewMode('config')}
                >
                    <span className="tab-icon">⚙️</span>
                    Configuration
                </button>
                <button
                    className={`tab-button ${viewMode === 'logs' ? 'active' : ''}`}
                    onClick={() => setViewMode('logs')}
                >
                    <span className="tab-icon">📋</span>
                    Logs
                    {logs.length > 0 && <span className="tab-badge">{logs.length}</span>}
                </button>
                <button
                    className={`tab-button ${viewMode === 'conflicts' ? 'active' : ''}`}
                    onClick={() => setViewMode('conflicts')}
                >
                    <span className="tab-icon">⚠️</span>
                    Conflicts
                    {conflicts.length > 0 && <span className="tab-badge">{conflicts.length}</span>}
                </button>
                <button
                    className={`tab-button ${viewMode === 'statistics' ? 'active' : ''}`}
                    onClick={() => setViewMode('statistics')}
                >
                    <span className="tab-icon">📊</span>
                    Statistics
                </button>
            </div>

            <div className="view-content">
                {viewMode === 'config' && renderConfigView()}
                {viewMode === 'logs' && renderLogsView()}
                {viewMode === 'conflicts' && renderConflictsView()}
                {viewMode === 'statistics' && renderStatisticsView()}
            </div>
        </div>
    );
};
