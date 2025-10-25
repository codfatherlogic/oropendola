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
      <div className="roo-messages-container">
        <div className="roo-empty-state">
          <div className="roo-empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="roo-empty-title">Build with {mode === 'ask' ? 'ask' : 'agent'} mode</div>
          <div className="roo-empty-desc">
            {mode === 'ask'
              ? 'AI will show a plan before making changes'
              : 'AI will automatically execute your requests'}
          </div>
          <div className="roo-suggestions">
            <button className="roo-suggestion-btn" data-suggestion="Explain this code">
              Explain selected code
            </button>
            <button className="roo-suggestion-btn" data-suggestion="Create a new feature">
              Create a new feature
            </button>
            <button className="roo-suggestion-btn" data-suggestion="Fix bugs">
              Fix bugs
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Virtuoso
      className="roo-messages-container"
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
            <div className="roo-typing-indicator">
              <span>AI is thinking</span>
              <div className="roo-typing-dots">
                <div className="roo-typing-dot"></div>
                <div className="roo-typing-dot"></div>
                <div className="roo-typing-dot"></div>
              </div>
            </div>
          );
        }
      }}
    />
  );
};
