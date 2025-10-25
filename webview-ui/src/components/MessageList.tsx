import React from 'react';
import { Virtuoso } from 'react-virtuoso';
import { ChatMessage } from './ChatMessage';
import { Message } from '../types';

interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
  showEmptyState: boolean;
  onAcceptPlan?: (content: string) => void;
  onRejectPlan?: (content: string) => void;
  mode?: 'ask' | 'agent';
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isTyping,
  showEmptyState,
  onAcceptPlan,
  onRejectPlan,
  mode
}) => {
  if (showEmptyState) {
    return (
      <div className="messages-container">
        <div className="empty-state">
          <div className="empty-icon">💬</div>
          <div className="empty-title">Build with {mode === 'ask' ? 'ask' : 'agent'} mode</div>
          <div className="empty-desc">
            {mode === 'ask'
              ? 'AI will show a plan before making changes'
              : 'AI will automatically execute your requests'}
          </div>
          <div className="suggestions">
            <button className="suggestion-btn" data-suggestion="Explain this code">
              Explain selected code
            </button>
            <button className="suggestion-btn" data-suggestion="Create a new feature">
              Create a new feature
            </button>
            <button className="suggestion-btn" data-suggestion="Fix bugs">
              Fix bugs
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Virtuoso
      className="messages-container"
      data={messages}
      followOutput="smooth"
      alignToBottom
      itemContent={(index, message) => (
        <ChatMessage
          key={index}
          message={message}
          onAcceptPlan={onAcceptPlan}
          onRejectPlan={onRejectPlan}
          showPlanActions={mode === 'ask' && index === messages.length - 1}
        />
      )}
      components={{
        Footer: () => {
          if (!isTyping) return null;
          return (
            <div className="typing-indicator">
              <span>AI is thinking</span>
              <div className="typing-dots">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          );
        }
      }}
    />
  );
};
