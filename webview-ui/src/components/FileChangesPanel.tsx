import React, { useState } from 'react';
import { FileChange } from '../types';

interface FileChangesPanelProps {
  fileChanges: FileChange[];
  visible: boolean;
  onAccept: (path: string) => void;
  onReject: (path: string) => void;
}

export const FileChangesPanel: React.FC<FileChangesPanelProps> = ({
  fileChanges,
  visible,
  onAccept,
  onReject
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  if (!visible && fileChanges.length === 0) return null;

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return '＋';
      case 'modify':
        return '~';
      case 'delete':
        return '－';
      default:
        return '•';
    }
  };

  const getActionClass = (action: string) => {
    switch (action) {
      case 'create':
        return 'added';
      case 'modify':
        return 'modified';
      case 'delete':
        return 'deleted';
      default:
        return '';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'generating':
        return '⏳';
      case 'applying':
        return '⚙️';
      case 'applied':
        return '✓';
      case 'failed':
        return '✗';
      default:
        return '';
    }
  };

  const stats = {
    total: fileChanges.length,
    applied: fileChanges.filter((f) => f.status === 'applied').length,
    pending: fileChanges.filter((f) => f.status === 'generating' || f.status === 'applying').length
  };

  return (
    <div className={`file-changes-panel ${visible ? 'visible' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="file-changes-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className="file-changes-title">
          <button className="panel-collapse-arrow" aria-label={isCollapsed ? 'Expand' : 'Collapse'}>
            {isCollapsed ? '▶' : '▼'}
          </button>
          <span className="file-changes-icon">📁</span>
          <span>File Changes</span>
          <span className="file-changes-count">({stats.applied}/{stats.total})</span>
        </div>
      </div>

      {!isCollapsed && (
        <div className="file-changes-content">
          {fileChanges.length === 0 ? (
            <div className="file-changes-empty">
              <span>No file changes yet</span>
            </div>
          ) : (
            <div className="file-changes-list">
              {fileChanges.map((fileChange, index) => (
                <div key={index} className={`file-change-row ${getActionClass(fileChange.action)}`}>
                  <div className="file-change-info">
                    <span className="file-change-icon">{getActionIcon(fileChange.action)}</span>
                    <span className="file-change-path" title={fileChange.path}>
                      {fileChange.path}
                    </span>
                    <span className="file-status-icon">{getStatusIcon(fileChange.status)}</span>
                  </div>
                  {fileChange.status !== 'applied' && fileChange.status !== 'failed' && (
                    <div className="file-change-actions">
                      <button
                        className="file-action-btn accept-btn"
                        onClick={() => onAccept(fileChange.path)}
                        title="Accept changes"
                      >
                        ✓
                      </button>
                      <button
                        className="file-action-btn reject-btn"
                        onClick={() => onReject(fileChange.path)}
                        title="Reject changes"
                      >
                        ✗
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
