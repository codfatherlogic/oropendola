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
    <div className="input-container">
      {/* Add Context button at top */}
      <button
        className="add-context-btn-top"
        onClick={onAddContext}
        disabled={isGenerating}
        title="Add context from files"
      >
        ＋ Add Context
      </button>

      {/* Auto-resizing textarea */}
      <TextareaAutosize
        className="input-field-large"
        placeholder="Plan and build autonomously..."
        minRows={3}
        maxRows={10}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isGenerating}
      />

      {/* Bottom controls bar */}
      <div className="input-controls-bottom">
        <div className="input-controls-left">
          <select
            className="mode-dropdown-compact"
            value={mode}
            onChange={(e) => onModeChange(e.target.value as 'ask' | 'agent')}
            disabled={isGenerating}
          >
            <option value="agent">Agent</option>
            <option value="ask">Ask</option>
          </select>
          <select className="auto-dropdown-compact" disabled={isGenerating}>
            <option value="auto">Auto</option>
          </select>
        </div>

        <div className="input-controls-right">
          {currentFile && (
            <span className="current-file-indicator" title={currentFile}>
              ⚙️ {currentFile}
            </span>
          )}
          <span className="token-usage">44.0%</span>
          <Tooltip content="Attach file" side="top">
            <button
              className="icon-button-compact"
              disabled={isGenerating}
            >
              📎
            </button>
          </Tooltip>
          <Tooltip content={isGenerating ? 'Stop generation (Esc)' : 'Send message (⌘↵)'} side="top">
            <button
              className="send-button-compact"
              onClick={handleSend}
              disabled={!isGenerating && !message.trim()}
            >
              {isGenerating ? '◼' : '↑'}
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
