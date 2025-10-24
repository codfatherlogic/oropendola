import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import { Message } from '../types';

interface ChatMessageProps {
  message: Message;
  onAcceptPlan?: (content: string) => void;
  onRejectPlan?: (content: string) => void;
  showPlanActions?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onAcceptPlan,
  onRejectPlan,
  showPlanActions
}) => {
  const roleClass = `message-${message.role}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
  };

  const getRoleIcon = () => {
    switch (message.role) {
      case 'user':
        return 'U';
      case 'assistant':
        return 'AI';
      case 'error':
        return '!';
      case 'system':
        return 'ℹ';
      default:
        return '?';
    }
  };

  const getRoleLabel = () => {
    switch (message.role) {
      case 'user':
        return 'You';
      case 'assistant':
        return 'Assistant';
      case 'error':
        return 'Error';
      case 'system':
        return 'System';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className={`message ${roleClass}`}>
      <div className="message-header">
        <div className={`message-icon ${message.role}`}>{getRoleIcon()}</div>
        <div className="message-label">{getRoleLabel()}</div>
        <button className="copy-btn" onClick={handleCopy} title="Copy message">
          📋
        </button>
      </div>
      <div className="message-content">
        <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
          {message.content}
        </ReactMarkdown>
      </div>
      {showPlanActions && message.role === 'assistant' && (
        <div className="message-actions">
          <button
            className="message-action-btn message-action-accept"
            onClick={() => onAcceptPlan?.(message.content)}
          >
            ✓ Accept Plan
          </button>
          <button
            className="message-action-btn message-action-reject"
            onClick={() => onRejectPlan?.(message.content)}
          >
            ✗ Reject Plan
          </button>
        </div>
      )}
    </div>
  );
};
