import React, { useState, useRef, KeyboardEvent } from 'react';

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (isGenerating) {
      onStop();
    } else if (message.trim()) {
      onSend(message);
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
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

      {/* Large textarea */}
      <textarea
        ref={textareaRef}
        className="input-field-large"
        placeholder="Plan and build autonomously..."
        rows={3}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
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
          <button
            className="icon-button-compact"
            title="Attach file"
            disabled={isGenerating}
          >
            📎
          </button>
          <button
            className="send-button-compact"
            onClick={handleSend}
            disabled={!isGenerating && !message.trim()}
            title={isGenerating ? 'Stop generation' : 'Send message'}
          >
            {isGenerating ? '◼' : '↑'}
          </button>
        </div>
      </div>
    </div>
  );
};
