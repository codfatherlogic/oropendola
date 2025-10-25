import React from 'react';
import { Tooltip } from './ui';

interface HeaderProps {
  onNewChat: () => void;
  onSettings: () => void;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNewChat, onSettings, onSignOut }) => {
  return (
    <div className="roo-header">
      <div className="roo-header-left">
        <div className="roo-logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17M2 12L12 17L22 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="roo-title">
          <span className="roo-title-main">Oropendola</span>
          <span className="roo-title-sub">AI Assistant</span>
        </div>
      </div>
      <div className="roo-header-right">
        <Tooltip content="New Chat" side="bottom">
          <button className="roo-icon-btn" onClick={onNewChat} aria-label="New chat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 5v14M5 12h14" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </Tooltip>
        <Tooltip content="Settings" side="bottom">
          <button className="roo-icon-btn" onClick={onSettings} aria-label="Settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="3" strokeWidth="2"/>
              <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42m12.72-12.72l1.42-1.42" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </Tooltip>
        <Tooltip content="Sign Out" side="bottom">
          <button className="roo-icon-btn" onClick={onSignOut} aria-label="Sign out">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7 14l5-5-5-5m5 5H9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </Tooltip>
      </div>
    </div>
  );
};
