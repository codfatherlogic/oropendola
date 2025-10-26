/**
 * CondensingControls Component
 * 
 * Provides manual controls for context condensing.
 * Shows condensing status and allows user to trigger manually.
 * 
 * Features:
 * - Manual condense button
 * - Auto-condense toggle
 * - Condensing progress indicator
 * - Last condense timestamp
 * - Condensing history
 */

import React, { useState } from 'react';
import './CondensingControls.css';

export interface CondensingControlsProps {
    autoCondensingEnabled: boolean;
    isCondensing: boolean;
    lastCondensedAt?: number;
    condensingHistory?: CondensingHistoryEntry[];
    onCondense: () => void;
    onToggleAuto: (enabled: boolean) => void;
    className?: string;
}

export interface CondensingHistoryEntry {
    timestamp: number;
    messagesBefore: number;
    messagesAfter: number;
    tokensSaved: number;
    percentReduction: number;
}

export const CondensingControls: React.FC<CondensingControlsProps> = ({
    autoCondensingEnabled,
    isCondensing,
    lastCondensedAt,
    condensingHistory = [],
    onCondense,
    onToggleAuto,
    className = ''
}) => {
    const [showHistory, setShowHistory] = useState(false);

    const formatTimestamp = (timestamp: number): string => {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    const formatNumber = (num: number): string => {
        if (num >= 1000) {
            return `${(num / 1000).toFixed(1)}k`;
        }
        return num.toString();
    };

    const getTotalTokensSaved = (): number => {
        return condensingHistory.reduce((sum, entry) => sum + entry.tokensSaved, 0);
    };

    const getAverageReduction = (): number => {
        if (condensingHistory.length === 0) return 0;
        const sum = condensingHistory.reduce((s, e) => s + e.percentReduction, 0);
        return sum / condensingHistory.length;
    };

    return (
        <div className={`condensing-controls ${className}`}>
            <div className="controls-header">
                <span className="controls-title">Context Condensing</span>
                <div className="auto-toggle">
                    <label className="toggle-label">
                        <input
                            type="checkbox"
                            checked={autoCondensingEnabled}
                            onChange={(e) => onToggleAuto(e.target.checked)}
                            disabled={isCondensing}
                        />
                        <span className="toggle-slider"></span>
                        <span className="toggle-text">Auto</span>
                    </label>
                </div>
            </div>

            <div className="controls-body">
                <button
                    className="condense-button"
                    onClick={onCondense}
                    disabled={isCondensing}
                >
                    {isCondensing ? (
                        <>
                            <span className="spinner"></span>
                            Condensing...
                        </>
                    ) : (
                        <>
                            <span className="icon">🔄</span>
                            Condense Now
                        </>
                    )}
                </button>

                {lastCondensedAt && (
                    <div className="last-condensed">
                        <span className="last-label">Last condensed:</span>
                        <span className="last-value">
                            {formatTimestamp(lastCondensedAt)}
                        </span>
                    </div>
                )}
            </div>

            {condensingHistory.length > 0 && (
                <div className="condensing-stats">
                    <div className="stat-item">
                        <span className="stat-label">Total Saved:</span>
                        <span className="stat-value highlight">
                            {formatNumber(getTotalTokensSaved())} tokens
                        </span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Avg Reduction:</span>
                        <span className="stat-value">
                            {getAverageReduction().toFixed(1)}%
                        </span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Times Condensed:</span>
                        <span className="stat-value">
                            {condensingHistory.length}
                        </span>
                    </div>
                </div>
            )}

            {condensingHistory.length > 0 && (
                <div className="history-section">
                    <button
                        className="history-toggle"
                        onClick={() => setShowHistory(!showHistory)}
                    >
                        <span className="toggle-icon">
                            {showHistory ? '▼' : '▶'}
                        </span>
                        Condensing History
                    </button>

                    {showHistory && (
                        <div className="history-list">
                            {condensingHistory.slice().reverse().map((entry, index) => (
                                <div key={index} className="history-entry">
                                    <div className="entry-header">
                                        <span className="entry-time">
                                            {formatTimestamp(entry.timestamp)}
                                        </span>
                                        <span className="entry-reduction">
                                            -{entry.percentReduction.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="entry-details">
                                        <span className="entry-detail">
                                            {entry.messagesBefore} → {entry.messagesAfter} messages
                                        </span>
                                        <span className="entry-detail">
                                            -{formatNumber(entry.tokensSaved)} tokens
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {autoCondensingEnabled && (
                <div className="auto-info">
                    <span className="info-icon">ℹ️</span>
                    <span className="info-text">
                        Auto-condensing will trigger at 80% context usage
                    </span>
                </div>
            )}
        </div>
    );
};

export default CondensingControls;
