import React from 'react';
import { Tooltip } from './ui';

interface HeaderProps {
  onNewChat: () => void;
  onSettings: () => void;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNewChat, onSettings, onSignOut }) => {
  return (
    <div className="header">
      <div className="header-title">
        <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMiA3TDEyIDEyTDIyIDdMMTIgMloiIHN0cm9rZT0iIzQwYTVmZiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPHBhdGggZD0iTTIgMTdMMTIgMjJMMjIgMTdNMiAxMkwxMiAxN0wyMiAxMiIgc3Ryb2tlPSIjNDBhNWZmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4=" alt="Logo" />
        <span>AI Assistant</span>
      </div>
      <div className="header-actions">
        <Tooltip content="New Chat (⌘N)" side="bottom">
          <button className="icon-button" onClick={onNewChat}>
            ✚
          </button>
        </Tooltip>
        <Tooltip content="Settings" side="bottom">
          <button className="icon-button" onClick={onSettings}>
            ⚙
          </button>
        </Tooltip>
        <Tooltip content="Sign Out" side="bottom">
          <button className="icon-button" onClick={onSignOut}>
            ⎋
          </button>
        </Tooltip>
      </div>
    </div>
  );
};
