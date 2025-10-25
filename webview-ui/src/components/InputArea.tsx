import React, { useState, KeyboardEvent } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { Tooltip } from './ui';

interface InputAreaProps {
  onSend: (message: string) => void;
  onStop: () => void;
  isGenerating: boolean;
  mode: 'ask' | 'agent';
  onModeChange: (mode: 'ask' | 'agent') => void;
  onAddContext?: () => void;
  currentFile?: string;
}

export const InputArea: React.FC<InputAreaProps> = ({
  onSend,
  onStop,
  isGenerating,
  mode,
  onModeChange,
  onAddContext,
  currentFile
}) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (isGenerating) {
      onStop();
    } else if (message.trim()) {
      onSend(message);
      setMessage('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="roo-input-container">
      {/* Add Context button at top */}
      <button
        className="roo-add-context-btn"
        onClick={onAddContext}
        disabled={isGenerating}
        title="Add context from files"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 5v14M5 12h14" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        Add Context
      </button>

      {/* Auto-resizing textarea */}
      <TextareaAutosize
        className="roo-input-field"
        placeholder="Plan and build autonomously..."
        minRows={3}
        maxRows={10}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isGenerating}
      />

      {/* Bottom controls bar */}
      <div className="roo-input-controls">
        <div className="roo-input-controls-left">
          <select
            className="roo-mode-selector"
            value={mode}
            onChange={(e) => onModeChange(e.target.value as 'ask' | 'agent')}
            disabled={isGenerating}
          >
            <option value="agent">Agent</option>
            <option value="ask">Ask</option>
          </select>
          <select className="roo-auto-selector" disabled={isGenerating}>
            <option value="auto">Auto</option>
          </select>
        </div>

        <div className="roo-input-controls-right">
          {currentFile && (
            <span className="roo-file-indicator" title={currentFile}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" strokeWidth="2"/>
                <path d="M13 2v7h7" strokeWidth="2"/>
              </svg>
              {currentFile}
            </span>
          )}
          <span className="roo-token-usage">44.0%</span>
          <Tooltip content="Attach file" side="top">
            <button
              className="roo-icon-btn"
              disabled={isGenerating}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </Tooltip>
          <Tooltip content={isGenerating ? 'Stop generation (Esc)' : 'Send message (⌘↵)'} side="top">
            <button
              className="roo-send-btn"
              onClick={handleSend}
              disabled={!isGenerating && !message.trim()}
            >
              {isGenerating ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 19V5M5 12l7-7 7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
