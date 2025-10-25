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
