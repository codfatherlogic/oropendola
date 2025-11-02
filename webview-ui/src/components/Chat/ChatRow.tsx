/**
 * ChatRow Component - Roo-Code UI Implementation for Oropendola
 *
 * Exact visual match to Roo-Code's ChatRow.tsx:
 * - Pure Tailwind utility classes (no CSS imports)
 * - Tailwind padding: px-[15px] py-[10px] pr-[6px]
 * - VSCode theme integration via Tailwind variables
 * - Preserves all Oropendola authentication & subscription features
 */

import React from 'react'
import { User, MessageCircle, AlertCircle } from 'lucide-react'
import type { ClineMessage } from '../../types/cline-message'
import { MarkdownBlock } from './MarkdownBlock'
import { ProgressIndicator } from './ProgressIndicator'
import { ReasoningBlock } from './ReasoningBlock'
import { AgentModelBadge } from './AgentModelBadge'
import { DiffViewer } from '../Diff'
import { cn } from '../../lib/utils'
import vscode from '../../vscode-api'

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
  const isToolApproval = message.type === 'ask' && message.ask === 'tool'
  const isSignInRequired = message.say === 'sign_in_required'

  // Render Sign In prompt (Oropendola auth feature)
  if (isSignInRequired) {
    return (
      <div className="px-[15px] py-[10px] pr-[6px]">
        <div className="flex flex-col items-center justify-center py-10 px-5 gap-5 bg-vscode-editor-background rounded-lg my-5">
          <div className="text-base text-vscode-foreground text-center mb-2.5">
            {message.text || 'Please sign in to use Oropendola AI'}
          </div>
          <button
            onClick={() => {
              vscode.postMessage({ type: 'login' })
            }}
            className={cn(
              "bg-vscode-button-secondaryBackground text-vscode-button-secondaryForeground",
              "border border-vscode-button-border rounded-sm py-1.5 px-3.5 text-[13px]",
              "cursor-pointer transition-colors duration-100",
              "hover:bg-vscode-button-secondaryHoverBackground"
            )}
          >
            Sign in
          </button>
        </div>
      </div>
    )
  }

  // Render user message
  if (isUser) {
    return (
      <div className="px-[15px] py-[10px] pr-[6px]">
        <div className="flex items-center gap-2.5 mb-2.5 break-words">
          <User className="w-4 h-4" aria-label="User icon" />
          <span className="font-bold">You said</span>
        </div>
        <div className="text-vscode-foreground">
          {message.text}
        </div>
        {message.images && message.images.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-2">
            {message.images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`Attachment ${i + 1}`}
                className="max-w-[200px] max-h-[200px] rounded border border-vscode-panel-border"
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // Render tool approval message (Oropendola feature)
  if (isToolApproval && message.tool) {
    // Check if this is an apply_diff tool with diff content
    const isApplyDiff = message.tool.action === 'apply_diff' && message.tool.diff
    const isDiffTool = isApplyDiff ||
                       message.tool.action === 'edit_file' ||
                       message.tool.action === 'editedExistingFile'

    return (
      <div className="px-[15px] py-[10px] pr-[6px]">
        <div className="border border-vscode-notifications-border rounded p-3 bg-vscode-notifications-background my-2">
          <div className="flex items-center gap-2.5 mb-2.5 break-words">
            <AlertCircle className="w-4 h-4 text-vscode-notificationsWarningIcon-foreground" />
            <span className="font-bold">
              {isDiffTool ? 'File Changes Require Approval' : 'Tool Requires Approval'}
            </span>
          </div>

          {/* Show diff viewer for apply_diff */}
          {isApplyDiff ? (
            <>
              <div className="mb-3 text-[13px] text-vscode-descriptionForeground">
                {message.tool.description || 'Review the changes below'}
              </div>
              <DiffViewer
                diff={message.tool.diff}
                path={message.tool.path}
                language={message.tool.language}
                viewMode="unified"
                showLineNumbers={true}
                collapsible={false}
                defaultExpanded={true}
                showFileActions={false}
              />
            </>
          ) : (
            <div className="mb-3">
              <MarkdownBlock markdown={message.text} />
            </div>
          )}

          {/* Note: Approval buttons are rendered by ChatView at bottom of chat */}
          <div className="text-sm text-vscode-descriptionForeground italic">
            ⏳ Waiting for your approval...
          </div>
        </div>
      </div>
    )
  }

  // Render error message
  if (isError) {
    return (
      <div className="px-[15px] py-[10px] pr-[6px]">
        <div className="flex items-center gap-2.5 mb-2.5 break-words">
          <AlertCircle className="w-4 h-4 text-vscode-errorForeground" />
          <span className="font-bold text-vscode-errorForeground">Error</span>
        </div>
        <div className="text-vscode-errorForeground">
          {message.text || 'An error occurred'}
        </div>
      </div>
    )
  }

  // Render API request indicator
  if (isApiRequest) {
    const cost = message.apiMetrics?.cost
    return (
      <div className="px-[15px] py-[10px] pr-[6px]">
        <div className="flex items-center justify-between gap-2.5 mb-2.5 break-words">
          <div className="flex items-center gap-2.5">
            {isStreaming ? (
              <ProgressIndicator />
            ) : (
              <MessageCircle className="w-4 h-4" />
            )}
            <span>{isStreaming ? 'Streaming...' : 'API Request'}</span>
          </div>
          {cost !== null && cost !== undefined && cost > 0 && (
            <div className="text-vscode-descriptionForeground text-sm">
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
      <div className="px-[15px] py-[10px] pr-[6px]">
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
    const hasAgentMode = message.apiMetrics?.agentMode && message.apiMetrics?.selectedModel

    return (
      <div className="px-[15px] py-[10px] pr-[6px]">
        <div className="flex items-center gap-2.5 mb-2.5 break-words">
          <MessageCircle className="w-4 h-4" aria-label="Assistant icon" />
          <span className="font-bold">Oropendola said</span>
          {hasAgentMode && message.apiMetrics && (
            <AgentModelBadge
              model={message.apiMetrics.selectedModel || ''}
              selectionReason={message.apiMetrics.selectionReason}
              compact={true}
            />
          )}
        </div>
        <div className="text-vscode-foreground">
          <MarkdownBlock markdown={message.text} partial={message.partial} />
          {message.images && message.images.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-2">
              {message.images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`Image ${i + 1}`}
                  className="max-w-[200px] max-h-[200px] rounded border border-vscode-panel-border"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Default rendering for other message types
  return (
    <div className="px-[15px] py-[10px] pr-[6px]">
      <div className="text-vscode-foreground">
        {message.text && (
          <div>
            <MarkdownBlock markdown={message.text} partial={message.partial} />
          </div>
        )}
        {message.images && message.images.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-2">
            {message.images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`Image ${i + 1}`}
                className="max-w-[200px] max-h-[200px] rounded border border-vscode-panel-border"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
