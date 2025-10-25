import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { Message } from '../types';
import { CodeBlock } from './CodeBlock';
import { MermaidBlock } from './MermaidBlock';
import { ImageBlock } from './ImageBlock';
import 'katex/dist/katex.min.css';

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
  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
  };

  const getRoleIcon = () => {
    switch (message.role) {
      case 'user':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="7" r="4" strokeWidth="2"/>
          </svg>
        );
      case 'assistant':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17M2 12L12 17L22 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'error':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" strokeWidth="2"/>
            <path d="M12 8v4M12 16h.01" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );
      case 'system':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" strokeWidth="2"/>
            <path d="M12 16v-4M12 8h.01" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );
      default:
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" strokeWidth="2"/>
            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );
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
    <div className={`roo-message roo-message-${message.role}`}>
      <div className="roo-message-header">
        <div className={`roo-message-icon roo-message-icon-${message.role}`}>
          {getRoleIcon()}
        </div>
        <div className="roo-message-label">{getRoleLabel()}</div>
        <button className="roo-copy-btn" onClick={handleCopy} title="Copy message">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2"/>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeWidth="2"/>
          </svg>
        </button>
      </div>
      <div className="roo-message-content">
        <ReactMarkdown
          remarkPlugins={[remarkMath, remarkGfm]}
          rehypePlugins={[rehypeKatex]}
          components={{
            code(props) {
              const { className, children, ...rest } = props;
              const match = /language-(\w+)/.exec(className || '');
              const language = match ? match[1] : 'plaintext';
              const codeString = String(children).replace(/\n$/, '');
              const isInline = !match;

              // Special handling for Mermaid diagrams
              if (!isInline && language === 'mermaid') {
                return <MermaidBlock code={codeString} />;
              }

              return !isInline ? (
                <CodeBlock code={codeString} language={language} />
              ) : (
                <code className={className} {...rest}>
                  {children}
                </code>
              );
            },
            img(props) {
              const { src, alt } = props;
              return <ImageBlock src={src || ''} alt={alt} />;
            }
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
      {showPlanActions && message.role === 'assistant' && (
        <div className="roo-message-actions">
          <button
            className="roo-action-btn roo-action-accept"
            onClick={() => onAcceptPlan?.(message.content)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M20 6L9 17l-5-5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Accept Plan
          </button>
          <button
            className="roo-action-btn roo-action-reject"
            onClick={() => onRejectPlan?.(message.content)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Reject Plan
          </button>
        </div>
      )}
    </div>
  );
};
