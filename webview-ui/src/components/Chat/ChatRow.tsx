/**
 * ChatRow Component - Roo Code Style Implementation
 * 
 * Renders individual messages in the chat with proper styling for:
 * - User messages (user_feedback)
 * - Assistant messages (text, api_req_started, reasoning, etc.)
 * - Tool usage displays
 * - Error messages
 * - Code blocks and markdown
 */

import React from 'react'
import { User, MessageCircle, AlertCircle } from 'lucide-react'
import type { ClineMessage } from '../../types/cline-message'
import { MarkdownBlock } from './MarkdownBlock'
import { ProgressIndicator } from './ProgressIndicator'
import { ReasoningBlock } from './ReasoningBlock'
import './ChatRow.css'

interface ChatRowProps {
  message: ClineMessage
  isExpanded?: boolean
  isLast?: boolean
  isStreaming?: boolean
  onToggleExpand?: (ts: number) => void
}

export const ChatRow: React.FC<ChatRowProps> = ({
  message,
  isExpanded: _isExpanded = false,
  isLast: _isLast = false,
  isStreaming = false,
  onToggleExpand: _onToggleExpand,
}) => {
  // Determine message type and styling
  const isAssistant = message.type === 'say'
  const isUser = message.type === 'ask' && message.ask === 'user_feedback'
  const isError = message.say === 'error' || message.ask === 'error'
  const isApiRequest = message.say === 'api_req_started'
  const isToolApproval = message.type === 'ask' && message.ask === 'tool'  // ✅ Added

  // Header style for tool/action messages
  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px',
    wordBreak: 'break-word',
  }

  // Render user message
  if (isUser) {
    return (
      <div className="chat-row chat-row-user">
        <div style={headerStyle}>
          <User className="w-4 h-4" aria-label="User icon" />
          <span style={{ fontWeight: 'bold' }}>You said</span>
        </div>
        <div className="chat-row-user-content">
          {message.text}
        </div>
        {message.images && message.images.length > 0 && (
          <div className="chat-row-images">
            {message.images.map((img, i) => (
              <img key={i} src={img} alt={`Attachment ${i + 1}`} className="chat-row-image" />
            ))}
          </div>
        )}
      </div>
    )
  }

  // ✅ Render tool approval message - SHOWS INLINE IN CHAT
  if (isToolApproval && message.tool) {
    return (
      <div className="chat-row chat-row-tool-approval" style={{
        border: '1px solid var(--vscode-notifications-border)',
        borderRadius: '4px',
        padding: '12px',
        backgroundColor: 'var(--vscode-notifications-background)',
        margin: '8px 0'
      }}>
        <div style={headerStyle}>
          <AlertCircle className="w-4 h-4" style={{ color: 'var(--vscode-notificationsWarningIcon-foreground)' }} />
          <span style={{ fontWeight: 'bold' }}>Tool Requires Approval</span>
        </div>
        <div className="chat-row-tool-content" style={{ marginBottom: '12px' }}>
          <MarkdownBlock markdown={message.text} />
        </div>
        {/* Note: Approval buttons are rendered by ChatView at bottom of chat */}
        <div style={{ 
          fontSize: '0.9em', 
          color: 'var(--vscode-descriptionForeground)',
          fontStyle: 'italic'
        }}>
          ⏳ Waiting for your approval...
        </div>
      </div>
    )
  }

  // Render error message
  if (isError) {
    return (
      <div className="chat-row chat-row-error">
        <div style={headerStyle}>
          <AlertCircle className="w-4 h-4" style={{ color: 'var(--vscode-errorForeground)' }} />
          <span style={{ fontWeight: 'bold', color: 'var(--vscode-errorForeground)' }}>Error</span>
        </div>
        <div className="chat-row-error-content">
          {message.text || 'An error occurred'}
        </div>
      </div>
    )
  }

  // Render API request indicator
  if (isApiRequest) {
    const cost = message.apiMetrics?.cost
    return (
      <div className="chat-row chat-row-api">
        <div style={{ ...headerStyle, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isStreaming ? (
              <ProgressIndicator />
            ) : (
              <MessageCircle className="w-4 h-4" />
            )}
            <span>{isStreaming ? 'Streaming...' : 'API Request'}</span>
          </div>
          {cost !== null && cost !== undefined && cost > 0 && (
            <div className="chat-row-cost">
              ${cost.toFixed(4)}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Render reasoning/thinking message
  if (isAssistant && message.say === 'reasoning') {
    return (
      <div className="chat-row chat-row-assistant">
        <ReasoningBlock
          content={message.text || ''}
          ts={message.ts}
          isStreaming={isStreaming}
          isLast={_isLast}
        />
      </div>
    )
  }

  // Render assistant text message
  if (isAssistant && message.say === 'text') {
    return (
      <div className="chat-row chat-row-assistant">
        <div style={headerStyle}>
          <MessageCircle className="w-4 h-4" aria-label="Assistant icon" />
          <span style={{ fontWeight: 'bold' }}>Oropendola said</span>
        </div>
        <div className="chat-row-assistant-content">
          <MarkdownBlock markdown={message.text} partial={message.partial} />
          {message.images && message.images.length > 0 && (
            <div className="chat-row-images">
              {message.images.map((img, i) => (
                <img key={i} src={img} alt={`Image ${i + 1}`} className="chat-row-image" />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Default rendering for other message types
  return (
    <div className={`chat-row ${isAssistant ? 'chat-row-assistant' : 'chat-row-default'}`}>
      <div className="chat-row-content">
        {message.text && (
          <div className="chat-row-text">
            <MarkdownBlock markdown={message.text} partial={message.partial} />
          </div>
        )}
        {message.images && message.images.length > 0 && (
          <div className="chat-row-images">
            {message.images.map((img, i) => (
              <img key={i} src={img} alt={`Image ${i + 1}`} className="chat-row-image" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
