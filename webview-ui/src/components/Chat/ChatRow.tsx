/**
 * ChatRow Component - Simplified stub
 */

import React from 'react'
import type { ClineMessage } from '../../types/cline-message'
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
  isStreaming: _isStreaming = false,
  onToggleExpand: _onToggleExpand,
}) => {
  const isAssistant = message.type === 'say'

  return (
    <div className={`chat-row ${isAssistant ? 'assistant' : 'user'}`}>
      <div className="chat-row-content">
        <div className="chat-row-text">
          {message.text || ''}
        </div>
        {message.images && message.images.length > 0 && (
          <div className="chat-row-images">
            {message.images.map((img, i) => (
              <img key={i} src={img} alt={`Image ${i}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
