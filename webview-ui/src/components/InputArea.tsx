import React, { useState, useRef, KeyboardEvent } from 'react';

interface InputAreaProps {
  onSend: (message: string) => void;
  onStop: () => void;
  isGenerating: boolean;
  mode: 'ask' | 'agent';
  onModeChange: (mode: 'ask' | 'agent') => void;
}

export const InputArea: React.FC<InputAreaProps> = ({
  onSend,
  onStop,
  isGenerating,
  mode,
  onModeChange
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim() && !isGenerating) {
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
      <div className="input-wrapper-container">
        <div className="input-bottom-row">
          <textarea
            ref={textareaRef}
            className="input-field"
            placeholder="Ask Oropendola to do anything"
            rows={1}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            disabled={isGenerating}
          />
          <button
            className="send-button"
            onClick={handleSend}
            disabled={!message.trim() || isGenerating}
            title="Send message"
          >
            ↑
          </button>
          <button
            className="stop-button"
            onClick={onStop}
            style={{ display: isGenerating ? 'flex' : 'none' }}
            title="Stop generation"
          >
            ◼
          </button>
        </div>
      </div>
      <div className="mode-selector-bottom">
        <span className="mode-label">Mode:</span>
        <select
          className="mode-dropdown"
          value={mode}
          onChange={(e) => onModeChange(e.target.value as 'ask' | 'agent')}
        >
          <option value="agent">Agent</option>
          <option value="ask">Ask</option>
        </select>
      </div>
    </div>
  );
};
