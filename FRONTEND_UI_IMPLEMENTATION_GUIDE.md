# Frontend UI Implementation Guide for Oropendola

**Document Purpose**: Step-by-step guide to implement Thinking Indicator, Approval Buttons, Batch File Permissions, Todo List, and Metrics Display based on Roo-Code patterns.

**Created**: January 2025  
**Prerequisites**: Backend streaming and WebSocket events must be working (see BACKEND_REQUIREMENTS_FOR_UI_INTEGRATION.md)  
**Estimated Effort**: 12-16 hours total

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [Thinking Indicator (Reasoning Block)](#2-thinking-indicator-reasoning-block)
3. [Batch File Approval UI](#3-batch-file-approval-ui)
4. [Approval/Deny Buttons](#4-approvaldeny-buttons)
5. [Todo List Display](#5-todo-list-display)
6. [Task Metrics Display](#6-task-metrics-display)
7. [Integration Testing](#7-integration-testing)
8. [Styling & Animations](#8-styling--animations)

---

## 1. Quick Start

### File Structure
After implementation, you'll have these new files:

```
webview-ui/src/components/
├── Chat/
│   ├── ReasoningBlock.tsx          ← NEW (Thinking indicator)
│   ├── BatchFilePermission.tsx     ← NEW (Batch file approval)
│   ├── BatchDiffApproval.tsx       ← NEW (Batch diff approval)
│   ├── ApprovalButtons.tsx         ← NEW (Approve/Deny buttons)
│   ├── TodoListDisplay.tsx         ← NEW (Todo list UI)
│   ├── TaskMetrics.tsx             ← NEW (Token/cost display)
│   └── ChatRow.tsx                 ← MODIFY (Add new components)
├── utils/
│   └── getApiMetrics.ts            ← NEW (Metrics calculation)
```

### Dependencies
No new packages needed! All features use existing VSCode Webview UI Toolkit.

### Implementation Order
1. **ReasoningBlock** (30 mins) - Shows AI thinking
2. **ApprovalButtons** (30 mins) - Simple approve/deny
3. **BatchFilePermission** (1 hour) - Individual file approval
4. **TaskMetrics** (45 mins) - Token/cost display
5. **TodoListDisplay** (1 hour) - Task checklist
6. **Styling & Polish** (2 hours) - Animations, icons, responsive

---

## 2. Thinking Indicator (Reasoning Block)

### What It Does
Displays AI's internal reasoning in a collapsible block while streaming, similar to Claude's thinking indicator.

**Visual**:
```
┌─────────────────────────────────────┐
│ 💭 Thinking... (Streaming)         │ ← Header (yellow/orange)
├─────────────────────────────────────┤
│ Let me analyze the codebase...     │
│ First, I'll check the file struct- │ ← Real-time streaming text
│ ure to understand dependencies.    │
│ Then I'll...                        │
└─────────────────────────────────────┘
```

### Implementation

**Create**: `webview-ui/src/components/Chat/ReasoningBlock.tsx`

```tsx
import React, { useState, useEffect, useRef } from 'react'
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react'
import './ReasoningBlock.css'

interface ReasoningBlockProps {
  content: string          // Current reasoning text
  isStreaming: boolean     // Whether still receiving tokens
  onToggle?: () => void    // Optional collapse callback
}

export const ReasoningBlock: React.FC<ReasoningBlockProps> = ({
  content,
  isStreaming,
  onToggle
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  
  // Auto-scroll to bottom as content streams in
  useEffect(() => {
    if (isStreaming && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [content, isStreaming])
  
  const handleToggle = () => {
    setIsCollapsed(!isCollapsed)
    onToggle?.()
  }
  
  return (
    <div className={`reasoning-block ${isStreaming ? 'streaming' : 'complete'}`}>
      {/* Header */}
      <div className="reasoning-header" onClick={handleToggle}>
        <span className="thinking-icon">
          {isStreaming ? '💭' : '✓'}
        </span>
        <span className="reasoning-title">
          {isStreaming ? 'Thinking...' : 'Thinking Complete'}
        </span>
        {isStreaming && (
          <span className="streaming-indicator">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </span>
        )}
        <VSCodeButton 
          appearance="icon" 
          className="collapse-button"
          aria-label={isCollapsed ? 'Expand' : 'Collapse'}
        >
          <span className={`codicon codicon-chevron-${isCollapsed ? 'down' : 'up'}`} />
        </VSCodeButton>
      </div>
      
      {/* Content */}
      {!isCollapsed && (
        <div 
          ref={contentRef}
          className="reasoning-content"
        >
          {content || 'Starting to think...'}
          {isStreaming && <span className="cursor-blink">▊</span>}
        </div>
      )}
    </div>
  )
}
```

**Create**: `webview-ui/src/components/Chat/ReasoningBlock.css`

```css
.reasoning-block {
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  margin: 8px 0;
  overflow: hidden;
  background: var(--vscode-editor-background);
}

.reasoning-block.streaming {
  border-left: 3px solid var(--vscode-notificationsWarningIcon-foreground);
  background: var(--vscode-editor-inactiveSelectionBackground);
}

.reasoning-block.complete {
  border-left: 3px solid var(--vscode-notificationsInfoIcon-foreground);
}

.reasoning-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--vscode-editorGroupHeader-tabsBackground);
  cursor: pointer;
  user-select: none;
}

.reasoning-header:hover {
  background: var(--vscode-list-hoverBackground);
}

.thinking-icon {
  font-size: 16px;
}

.reasoning-title {
  flex: 1;
  font-weight: 500;
  font-size: 13px;
  color: var(--vscode-foreground);
}

.streaming-indicator {
  display: flex;
  gap: 4px;
  align-items: center;
}

.streaming-indicator .dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--vscode-notificationsWarningIcon-foreground);
  animation: pulse 1.4s ease-in-out infinite;
}

.streaming-indicator .dot:nth-child(2) {
  animation-delay: 0.2s;
}

.streaming-indicator .dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
}

.reasoning-content {
  padding: 12px;
  max-height: 300px;
  overflow-y: auto;
  font-family: var(--vscode-editor-font-family);
  font-size: 12px;
  line-height: 1.6;
  color: var(--vscode-foreground);
  white-space: pre-wrap;
  word-wrap: break-word;
}

.cursor-blink {
  display: inline-block;
  width: 8px;
  height: 14px;
  background: var(--vscode-editorCursor-foreground);
  animation: blink 1s step-end infinite;
  margin-left: 2px;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

.collapse-button {
  margin-left: auto;
}
```

### Integration into ChatRow

**Modify**: `webview-ui/src/components/Chat/ChatRow.tsx`

```tsx
import { ReasoningBlock } from './ReasoningBlock'

// Inside ChatRow component, add state for reasoning
const [reasoningContent, setReasoningContent] = useState('')
const [isReasoningStreaming, setIsReasoningStreaming] = useState(false)

// Listen to WebSocket events (in parent component or context)
useEffect(() => {
  const handleProgress = (event: any) => {
    if (event.type === 'ai_chunk' && event.is_reasoning) {
      // Append reasoning token
      setReasoningContent(prev => prev + event.token)
      setIsReasoningStreaming(true)
    } else if (event.type === 'ai_complete') {
      // Mark complete
      setIsReasoningStreaming(false)
    }
  }
  
  // Subscribe to WebSocket events
  window.addEventListener('ai_progress', handleProgress)
  
  return () => window.removeEventListener('ai_progress', handleProgress)
}, [])

// Render in ChatRow
return (
  <div className="chat-row">
    {/* Show reasoning block if there's content */}
    {reasoningContent && (
      <ReasoningBlock
        content={reasoningContent}
        isStreaming={isReasoningStreaming}
      />
    )}
    
    {/* Regular message content */}
    <div className="message-content">
      {message.text}
    </div>
  </div>
)
```

### Testing Reasoning Block

**Test Script**: Create `test-reasoning-block.tsx`

```tsx
import { ReasoningBlock } from './ReasoningBlock'

export const TestReasoningBlock = () => {
  const [content, setContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  
  const simulateStreaming = () => {
    setIsStreaming(true)
    setContent('')
    
    const tokens = "Let me analyze this problem... First, I'll check the file structure. Then I'll examine dependencies.".split(' ')
    
    let i = 0
    const interval = setInterval(() => {
      if (i < tokens.length) {
        setContent(prev => prev + tokens[i] + ' ')
        i++
      } else {
        setIsStreaming(false)
        clearInterval(interval)
      }
    }, 100)
  }
  
  return (
    <div style={{ padding: '20px' }}>
      <button onClick={simulateStreaming}>Simulate Streaming</button>
      <ReasoningBlock
        content={content}
        isStreaming={isStreaming}
      />
    </div>
  )
}
```

**Expected Behavior**:
- ✅ Shows "💭 Thinking..." header while streaming
- ✅ Animated dots pulse
- ✅ Cursor blinks at end of text
- ✅ Auto-scrolls as content grows
- ✅ Changes to "✓ Thinking Complete" when done
- ✅ Click header to collapse/expand

---

## 3. Batch File Approval UI

### What It Does
Shows a list of files with individual approve/deny checkboxes for batch operations.

**Visual**:
```
┌─────────────────────────────────────────────┐
│ 📖 Wants to read 3 files                   │
├─────────────────────────────────────────────┤
│ ☑ src/components/Chat/ChatRow.tsx          │ ← Checkbox + filename
│   lines 1-100                               │ ← Line range
│                                             │
│ ☑ src/utils/helpers.ts                     │
│   lines 50-75                               │
│                                             │
│ ☐ config/settings.json                     │ ← User unchecked this
│                                             │
├─────────────────────────────────────────────┤
│ [Select All] [Deselect All] [Submit]       │ ← Action buttons
└─────────────────────────────────────────────┘
```

### Implementation

**Create**: `webview-ui/src/components/Chat/BatchFilePermission.tsx`

```tsx
import React, { useState } from 'react'
import { VSCodeButton, VSCodeCheckbox } from '@vscode/webview-ui-toolkit/react'
import './BatchFilePermission.css'

interface FilePermissionItem {
  key: string              // Unique identifier (path + line range)
  path: string             // File path
  lineSnippet?: string     // "lines 1-100"
  isOutsideWorkspace?: boolean
  content?: string         // Absolute path for opening
}

interface BatchFilePermissionProps {
  files: FilePermissionItem[]
  onSubmit: (permissions: Record<string, boolean>) => void
  onCancel?: () => void
}

export const BatchFilePermission: React.FC<BatchFilePermissionProps> = ({
  files,
  onSubmit,
  onCancel
}) => {
  // Initialize all as approved
  const [permissions, setPermissions] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    files.forEach(file => {
      initial[file.key] = true
    })
    return initial
  })
  
  const handleToggle = (key: string) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }
  
  const handleSelectAll = () => {
    const all: Record<string, boolean> = {}
    files.forEach(file => {
      all[file.key] = true
    })
    setPermissions(all)
  }
  
  const handleDeselectAll = () => {
    const none: Record<string, boolean> = {}
    files.forEach(file => {
      none[file.key] = false
    })
    setPermissions(none)
  }
  
  const handleSubmit = () => {
    onSubmit(permissions)
  }
  
  const approvedCount = Object.values(permissions).filter(Boolean).length
  
  return (
    <div className="batch-file-permission">
      {/* Header */}
      <div className="permission-header">
        <span className="codicon codicon-file-text" />
        <span className="permission-title">
          Wants to read {files.length} file{files.length > 1 ? 's' : ''}
        </span>
        <span className="approval-count">
          ({approvedCount}/{files.length} approved)
        </span>
      </div>
      
      {/* File List */}
      <div className="file-list">
        {files.map(file => (
          <div 
            key={file.key} 
            className={`file-item ${permissions[file.key] ? 'approved' : 'denied'}`}
          >
            <VSCodeCheckbox
              checked={permissions[file.key]}
              onChange={() => handleToggle(file.key)}
            />
            <div className="file-info">
              <div className="file-path">
                {file.isOutsideWorkspace && (
                  <span className="codicon codicon-warning warning-icon" />
                )}
                <span className="path-text">{file.path}</span>
                {file.content && (
                  <VSCodeButton
                    appearance="icon"
                    onClick={() => {
                      // Open file in editor
                      const vscode = acquireVsCodeApi()
                      vscode.postMessage({
                        type: 'openFile',
                        path: file.content
                      })
                    }}
                  >
                    <span className="codicon codicon-link-external" />
                  </VSCodeButton>
                )}
              </div>
              {file.lineSnippet && (
                <div className="line-snippet">{file.lineSnippet}</div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Actions */}
      <div className="permission-actions">
        <VSCodeButton onClick={handleSelectAll}>
          Select All
        </VSCodeButton>
        <VSCodeButton onClick={handleDeselectAll}>
          Deselect All
        </VSCodeButton>
        <div className="spacer" />
        {onCancel && (
          <VSCodeButton appearance="secondary" onClick={onCancel}>
            Cancel
          </VSCodeButton>
        )}
        <VSCodeButton 
          appearance="primary" 
          onClick={handleSubmit}
          disabled={approvedCount === 0}
        >
          Submit ({approvedCount})
        </VSCodeButton>
      </div>
    </div>
  )
}
```

**Create**: `webview-ui/src/components/Chat/BatchFilePermission.css`

```css
.batch-file-permission {
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  margin: 8px 0;
  overflow: hidden;
  background: var(--vscode-editor-background);
}

.permission-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--vscode-editorGroupHeader-tabsBackground);
  border-bottom: 1px solid var(--vscode-panel-border);
  font-weight: 500;
}

.permission-title {
  flex: 1;
}

.approval-count {
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
}

.file-list {
  max-height: 400px;
  overflow-y: auto;
  padding: 8px;
}

.file-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px;
  border: 1px solid transparent;
  border-radius: 4px;
  transition: all 0.2s;
}

.file-item:hover {
  background: var(--vscode-list-hoverBackground);
}

.file-item.approved {
  border-color: var(--vscode-notificationsInfoIcon-foreground);
  background: var(--vscode-editor-selectionBackground);
}

.file-item.denied {
  opacity: 0.6;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-path {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--vscode-editor-font-family);
  font-size: 12px;
}

.warning-icon {
  color: var(--vscode-notificationsWarningIcon-foreground);
}

.path-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.line-snippet {
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
  margin-top: 2px;
}

.permission-actions {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid var(--vscode-panel-border);
  background: var(--vscode-editorGroupHeader-tabsBackground);
}

.permission-actions .spacer {
  flex: 1;
}
```

### Batch Diff Approval (Similar Pattern)

**Create**: `webview-ui/src/components/Chat/BatchDiffApproval.tsx`

```tsx
import React, { useState } from 'react'
import { VSCodeButton, VSCodeCheckbox } from '@vscode/webview-ui-toolkit/react'
import './BatchDiffApproval.css'

interface FileDiff {
  key: string              // "path (X changes)"
  path: string             // File path
  changeCount: number      // Number of changes
  content: string          // Combined diff content
  diffs?: Array<{
    content: string
    startLine?: number
  }>
}

interface BatchDiffApprovalProps {
  diffs: FileDiff[]
  onSubmit: (permissions: Record<string, boolean>) => void
  onCancel?: () => void
}

export const BatchDiffApproval: React.FC<BatchDiffApprovalProps> = ({
  diffs,
  onSubmit,
  onCancel
}) => {
  const [permissions, setPermissions] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    diffs.forEach(diff => {
      initial[diff.key] = true
    })
    return initial
  })
  
  const [expandedDiffs, setExpandedDiffs] = useState<Record<string, boolean>>({})
  
  const handleToggle = (key: string) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }
  
  const toggleExpand = (key: string) => {
    setExpandedDiffs(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }
  
  const approvedCount = Object.values(permissions).filter(Boolean).length
  
  return (
    <div className="batch-diff-approval">
      {/* Header */}
      <div className="approval-header">
        <span className="codicon codicon-diff" />
        <span className="approval-title">
          Wants to modify {diffs.length} file{diffs.length > 1 ? 's' : ''}
        </span>
        <span className="approval-count">
          ({approvedCount}/{diffs.length} approved)
        </span>
      </div>
      
      {/* Diff List */}
      <div className="diff-list">
        {diffs.map(diff => (
          <div 
            key={diff.key}
            className={`diff-item ${permissions[diff.key] ? 'approved' : 'denied'}`}
          >
            <div className="diff-header">
              <VSCodeCheckbox
                checked={permissions[diff.key]}
                onChange={() => handleToggle(diff.key)}
              />
              <div className="diff-info" onClick={() => toggleExpand(diff.key)}>
                <span className="diff-path">{diff.path}</span>
                <span className="change-count">
                  ({diff.changeCount} change{diff.changeCount > 1 ? 's' : ''})
                </span>
              </div>
              <VSCodeButton
                appearance="icon"
                onClick={() => toggleExpand(diff.key)}
              >
                <span className={`codicon codicon-chevron-${expandedDiffs[diff.key] ? 'up' : 'down'}`} />
              </VSCodeButton>
            </div>
            
            {expandedDiffs[diff.key] && (
              <div className="diff-content">
                <pre><code>{diff.content}</code></pre>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Actions */}
      <div className="approval-actions">
        <VSCodeButton onClick={() => {
          const all: Record<string, boolean> = {}
          diffs.forEach(d => all[d.key] = true)
          setPermissions(all)
        }}>
          Approve All
        </VSCodeButton>
        <VSCodeButton onClick={() => {
          const none: Record<string, boolean> = {}
          diffs.forEach(d => none[d.key] = false)
          setPermissions(none)
        }}>
          Deny All
        </VSCodeButton>
        <div className="spacer" />
        {onCancel && (
          <VSCodeButton appearance="secondary" onClick={onCancel}>
            Cancel
          </VSCodeButton>
        )}
        <VSCodeButton
          appearance="primary"
          onClick={() => onSubmit(permissions)}
          disabled={approvedCount === 0}
        >
          Apply Changes ({approvedCount})
        </VSCodeButton>
      </div>
    </div>
  )
}
```

### Integration into ChatRow

**Modify**: `webview-ui/src/components/Chat/ChatRow.tsx`

```tsx
import { BatchFilePermission } from './BatchFilePermission'
import { BatchDiffApproval } from './BatchDiffApproval'

// In render logic, check for batch approval requests
if (message.type === 'ask' && message.ask === 'tool') {
  const toolData = JSON.parse(message.text || '{}')
  
  // Batch file read approval
  if (toolData.tool === 'readFile' && toolData.batchFiles) {
    return (
      <BatchFilePermission
        files={toolData.batchFiles}
        onSubmit={(permissions) => {
          // Send response to backend
          const vscode = acquireVsCodeApi()
          vscode.postMessage({
            type: 'askResponse',
            text: JSON.stringify(permissions)
          })
        }}
        onCancel={() => {
          // Send empty response (deny all)
          const vscode = acquireVsCodeApi()
          vscode.postMessage({
            type: 'askResponse',
            text: '{}'
          })
        }}
      />
    )
  }
  
  // Batch diff approval
  if (toolData.tool === 'applyDiff' && toolData.batchDiffs) {
    return (
      <BatchDiffApproval
        diffs={toolData.batchDiffs}
        onSubmit={(permissions) => {
          const vscode = acquireVsCodeApi()
          vscode.postMessage({
            type: 'askResponse',
            text: JSON.stringify(permissions)
          })
        }}
      />
    )
  }
}
```

---

## 4. Approval/Deny Buttons

### What It Does
Shows simple approve/deny buttons for single-item approvals (tool usage, follow-ups, etc.).

**Visual**:
```
┌─────────────────────────────────────┐
│ 🔧 Wants to write to config.json   │
├─────────────────────────────────────┤
│ [Show Code]                         │ ← Optional preview
├─────────────────────────────────────┤
│ [✓ Approve] [✗ Deny]                │ ← Action buttons
└─────────────────────────────────────┘
```

### Implementation

**Create**: `webview-ui/src/components/Chat/ApprovalButtons.tsx`

```tsx
import React, { useState } from 'react'
import { VSCodeButton, VSCodeTextArea } from '@vscode/webview-ui-toolkit/react'
import './ApprovalButtons.css'

interface ApprovalButtonsProps {
  message: string                    // Approval request message
  primaryText?: string               // Custom approve button text
  secondaryText?: string             // Custom deny button text
  showFeedbackInput?: boolean        // Whether to show optional feedback
  onApprove: (feedback?: string) => void
  onDeny: (feedback?: string) => void
}

export const ApprovalButtons: React.FC<ApprovalButtonsProps> = ({
  message,
  primaryText = 'Approve',
  secondaryText = 'Deny',
  showFeedbackInput = false,
  onApprove,
  onDeny
}) => {
  const [feedback, setFeedback] = useState('')
  const [showInput, setShowInput] = useState(false)
  
  const handleApprove = () => {
    onApprove(feedback || undefined)
  }
  
  const handleDeny = () => {
    if (!showInput && showFeedbackInput) {
      // Show feedback input first
      setShowInput(true)
    } else {
      onDeny(feedback || undefined)
    }
  }
  
  return (
    <div className="approval-buttons">
      <div className="approval-message">
        {message}
      </div>
      
      {showInput && (
        <VSCodeTextArea
          className="feedback-input"
          placeholder="Optional: Explain why you're denying..."
          value={feedback}
          onChange={(e: any) => setFeedback(e.target.value)}
          rows={3}
        />
      )}
      
      <div className="button-row">
        <VSCodeButton
          appearance="primary"
          onClick={handleApprove}
        >
          <span className="codicon codicon-check" />
          {primaryText}
        </VSCodeButton>
        
        <VSCodeButton
          appearance="secondary"
          onClick={handleDeny}
        >
          <span className="codicon codicon-close" />
          {secondaryText}
        </VSCodeButton>
      </div>
    </div>
  )
}
```

**Create**: `webview-ui/src/components/Chat/ApprovalButtons.css`

```css
.approval-buttons {
  border: 1px solid var(--vscode-panel-border);
  border-left: 3px solid var(--vscode-notificationsInfoIcon-foreground);
  border-radius: 4px;
  padding: 12px;
  margin: 8px 0;
  background: var(--vscode-editor-selectionBackground);
}

.approval-message {
  margin-bottom: 12px;
  font-size: 13px;
  line-height: 1.5;
}

.feedback-input {
  width: 100%;
  margin-bottom: 12px;
}

.button-row {
  display: flex;
  gap: 8px;
}

.button-row vscode-button {
  display: flex;
  align-items: center;
  gap: 6px;
}
```

---

## 5. Todo List Display

### What It Does
Shows task checklist with colored status indicators and inline editing.

**Visual**:
```
┌─────────────────────────────────────┐
│ 📋 Todo List (3/5 complete)        │ ← Header with count
├─────────────────────────────────────┤
│ 🟢 Analyze codebase                │ ← Green = completed
│ 🟡 Write documentation              │ ← Yellow = in progress
│ ⚪ Create tests                     │ ← Hollow = pending
│ ⚪ Review PR                        │
│ 🟢 Deploy to staging                │
└─────────────────────────────────────┘
```

### Implementation

**Create**: `webview-ui/src/components/Chat/TodoListDisplay.tsx`

```tsx
import React, { useState, useRef, useEffect } from 'react'
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react'
import './TodoListDisplay.css'

interface TodoItem {
  id: number
  content: string
  status: '' | 'in_progress' | 'completed'
}

interface TodoListDisplayProps {
  todos: TodoItem[]
  taskId?: string
  editable?: boolean
  onUpdate?: (todos: TodoItem[]) => void
}

export const TodoListDisplay: React.FC<TodoListDisplayProps> = ({
  todos,
  taskId,
  editable = false,
  onUpdate
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  
  // Auto-scroll to in-progress item when expanded
  useEffect(() => {
    if (!isCollapsed && listRef.current) {
      const inProgressItem = listRef.current.querySelector('.todo-item.in-progress')
      if (inProgressItem) {
        inProgressItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  }, [isCollapsed])
  
  const completedCount = todos.filter(t => t.status === 'completed').length
  const totalCount = todos.length
  
  const getStatusIcon = (status: TodoItem['status']) => {
    switch (status) {
      case 'completed':
        return '🟢' // Green circle
      case 'in_progress':
        return '🟡' // Yellow circle
      default:
        return '⚪' // Hollow circle
    }
  }
  
  const handleStatusChange = (todoId: number, newStatus: TodoItem['status']) => {
    if (!editable || !onUpdate) return
    
    const updated = todos.map(t =>
      t.id === todoId ? { ...t, status: newStatus } : t
    )
    onUpdate(updated)
  }
  
  if (todos.length === 0) return null
  
  return (
    <div className="todo-list-display">
      {/* Header */}
      <div 
        className="todo-header"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <span className="codicon codicon-checklist" />
        <span className="todo-title">
          Todo List ({completedCount}/{totalCount} complete)
        </span>
        <VSCodeButton appearance="icon">
          <span className={`codicon codicon-chevron-${isCollapsed ? 'down' : 'up'}`} />
        </VSCodeButton>
      </div>
      
      {/* List */}
      {!isCollapsed && (
        <div ref={listRef} className="todo-items">
          {todos.map(todo => (
            <div
              key={todo.id}
              className={`todo-item ${todo.status}`}
            >
              {editable ? (
                <select
                  value={todo.status}
                  onChange={(e) => handleStatusChange(todo.id, e.target.value as TodoItem['status'])}
                  className="status-dropdown"
                >
                  <option value="">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              ) : (
                <span className="status-icon">
                  {getStatusIcon(todo.status)}
                </span>
              )}
              <span className="todo-content">{todo.content}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Create**: `webview-ui/src/components/Chat/TodoListDisplay.css`

```css
.todo-list-display {
  border: 1px solid var(--vscode-panel-border);
  border-radius: 4px;
  margin: 8px 0;
  overflow: hidden;
}

.todo-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--vscode-editorGroupHeader-tabsBackground);
  cursor: pointer;
  user-select: none;
}

.todo-header:hover {
  background: var(--vscode-list-hoverBackground);
}

.todo-title {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
}

.todo-items {
  padding: 8px 4px;
  max-height: 300px;
  overflow-y: auto;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.todo-item:hover {
  background: var(--vscode-list-hoverBackground);
}

.todo-item.in-progress {
  background: var(--vscode-editor-selectionBackground);
  border-left: 2px solid var(--vscode-notificationsWarningIcon-foreground);
}

.status-icon {
  font-size: 14px;
  width: 20px;
  text-align: center;
}

.status-dropdown {
  font-size: 11px;
  padding: 2px 4px;
  border-radius: 3px;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border);
}

.todo-content {
  flex: 1;
  font-size: 12px;
  line-height: 1.4;
}

.todo-item.completed .todo-content {
  text-decoration: line-through;
  opacity: 0.7;
}
```

---

## 6. Task Metrics Display

### What It Does
Shows token usage, cache, and cost information in a compact format.

**Visual**:
```
┌─────────────────────────────────────┐
│ 📊 Task Metrics                     │
├─────────────────────────────────────┤
│ Tokens:  ↑ 1.2K  ↓ 856             │ ← Input/Output
│ Cache:   ↑ 500   ↓ 100             │ ← Writes/Reads
│ Cost:    $0.023                     │
│                                     │
│ Context: [████████░░] 82%          │ ← Progress bar
└─────────────────────────────────────┘
```

### Implementation

**Create**: `webview-ui/src/utils/getApiMetrics.ts`

```typescript
interface ClineMessage {
  type: string
  text?: string
}

export interface ApiMetrics {
  totalTokensIn: number
  totalTokensOut: number
  totalCacheWrites: number
  totalCacheReads: number
  totalCost: number
  contextTokens: number
}

export function getApiMetrics(messages: ClineMessage[]): ApiMetrics {
  let totalTokensIn = 0
  let totalTokensOut = 0
  let totalCacheWrites = 0
  let totalCacheReads = 0
  let totalCost = 0
  let contextTokens = 0
  
  messages.forEach(msg => {
    if (msg.type === 'api_req_started' || msg.type === 'condense_context') {
      try {
        const data = JSON.parse(msg.text || '{}')
        
        totalTokensIn += data.tokensIn || 0
        totalTokensOut += data.tokensOut || 0
        totalCacheWrites += data.cacheWrites || 0
        totalCacheReads += data.cacheReads || 0
        totalCost += data.cost || 0
        
        // Last request's context tokens
        if (msg.type === 'api_req_started') {
          contextTokens = data.tokensIn || 0
        }
      } catch (e) {
        // Skip invalid JSON
      }
    }
  })
  
  return {
    totalTokensIn,
    totalTokensOut,
    totalCacheWrites,
    totalCacheReads,
    totalCost,
    contextTokens
  }
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}
```

**Create**: `webview-ui/src/components/Chat/TaskMetrics.tsx`

```tsx
import React from 'react'
import { ApiMetrics, formatNumber } from '../../utils/getApiMetrics'
import './TaskMetrics.css'

interface TaskMetricsProps {
  metrics: ApiMetrics
  contextWindow?: number  // Max context tokens (e.g., 200000)
  maxTokens?: number      // Max output tokens (e.g., 8192)
}

export const TaskMetrics: React.FC<TaskMetricsProps> = ({
  metrics,
  contextWindow = 200000,
  maxTokens = 8192
}) => {
  // Calculate context usage percentage
  const contextUsed = metrics.contextTokens
  const contextAvailable = contextWindow - contextUsed - maxTokens
  const contextPercent = Math.min((contextUsed / contextWindow) * 100, 100)
  
  return (
    <div className="task-metrics">
      <div className="metrics-header">
        <span className="codicon codicon-graph" />
        <span className="metrics-title">Task Metrics</span>
      </div>
      
      <div className="metrics-grid">
        {/* Tokens */}
        <div className="metric-row">
          <span className="metric-label">Tokens:</span>
          <div className="metric-values">
            <span className="metric-value input">
              ↑ {formatNumber(metrics.totalTokensIn)}
            </span>
            <span className="metric-value output">
              ↓ {formatNumber(metrics.totalTokensOut)}
            </span>
          </div>
        </div>
        
        {/* Cache */}
        {(metrics.totalCacheWrites > 0 || metrics.totalCacheReads > 0) && (
          <div className="metric-row">
            <span className="metric-label">Cache:</span>
            <div className="metric-values">
              <span className="metric-value cache-write">
                ↑ {formatNumber(metrics.totalCacheWrites)}
              </span>
              <span className="metric-value cache-read">
                ↓ {formatNumber(metrics.totalCacheReads)}
              </span>
            </div>
          </div>
        )}
        
        {/* Cost */}
        <div className="metric-row">
          <span className="metric-label">Cost:</span>
          <div className="metric-values">
            <span className="metric-value cost">
              ${metrics.totalCost.toFixed(3)}
            </span>
          </div>
        </div>
      </div>
      
      {/* Context Progress Bar */}
      <div className="context-progress">
        <div className="progress-header">
          <span>Context: {formatNumber(contextUsed)} / {formatNumber(contextWindow)}</span>
          <span className="progress-percent">{contextPercent.toFixed(0)}%</span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${contextPercent}%` }}
          />
        </div>
      </div>
    </div>
  )
}
```

**Create**: `webview-ui/src/components/Chat/TaskMetrics.css`

```css
.task-metrics {
  border: 1px solid var(--vscode-panel-border);
  border-radius: 4px;
  padding: 12px;
  margin: 8px 0;
  background: var(--vscode-editor-background);
}

.metrics-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  font-weight: 500;
  font-size: 13px;
}

.metrics-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metric-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
}

.metric-label {
  width: 60px;
  color: var(--vscode-descriptionForeground);
}

.metric-values {
  display: flex;
  gap: 16px;
  flex: 1;
  font-family: var(--vscode-editor-font-family);
}

.metric-value {
  display: flex;
  align-items: center;
  gap: 4px;
}

.metric-value.input,
.metric-value.cache-write {
  color: var(--vscode-charts-blue);
}

.metric-value.output,
.metric-value.cache-read {
  color: var(--vscode-charts-green);
}

.metric-value.cost {
  color: var(--vscode-charts-orange);
  font-weight: 500;
}

.context-progress {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--vscode-panel-border);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  margin-bottom: 6px;
  color: var(--vscode-descriptionForeground);
}

.progress-percent {
  font-weight: 500;
}

.progress-bar {
  height: 6px;
  background: var(--vscode-progressBar-background);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--vscode-progressBar-background);
  transition: width 0.3s ease;
}
```

---

## 7. Integration Testing

### End-to-End Test

**Create**: `webview-ui/src/test/integration-test.tsx`

```tsx
import { ReasoningBlock } from '../components/Chat/ReasoningBlock'
import { BatchFilePermission } from '../components/Chat/BatchFilePermission'
import { ApprovalButtons } from '../components/Chat/ApprovalButtons'
import { TodoListDisplay } from '../components/Chat/TodoListDisplay'
import { TaskMetrics } from '../components/Chat/TaskMetrics'
import { getApiMetrics } from '../utils/getApiMetrics'

export const IntegrationTest = () => {
  // Test data
  const mockMessages = [
    {
      type: 'api_req_started',
      text: JSON.stringify({
        tokensIn: 1234,
        tokensOut: 856,
        cacheWrites: 500,
        cacheReads: 100,
        cost: 0.023
      })
    }
  ]
  
  const mockTodos = [
    { id: 1, content: 'Analyze codebase', status: 'completed' as const },
    { id: 2, content: 'Write docs', status: 'in_progress' as const },
    { id: 3, content: 'Create tests', status: '' as const }
  ]
  
  const mockFiles = [
    {
      key: 'src/test.ts lines 1-100',
      path: 'src/test.ts',
      lineSnippet: 'lines 1-100',
      content: '/absolute/path/test.ts'
    },
    {
      key: 'config.json',
      path: 'config.json',
      content: '/absolute/path/config.json'
    }
  ]
  
  const metrics = getApiMetrics(mockMessages)
  
  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <h2>Oropendola UI Components Test</h2>
      
      <h3>1. Reasoning Block</h3>
      <ReasoningBlock
        content="Let me analyze this problem step by step..."
        isStreaming={true}
      />
      
      <h3>2. Approval Buttons</h3>
      <ApprovalButtons
        message="Do you want to proceed with this operation?"
        onApprove={() => console.log('Approved')}
        onDeny={() => console.log('Denied')}
      />
      
      <h3>3. Batch File Permission</h3>
      <BatchFilePermission
        files={mockFiles}
        onSubmit={(perms) => console.log('Permissions:', perms)}
      />
      
      <h3>4. Todo List</h3>
      <TodoListDisplay
        todos={mockTodos}
        editable={true}
        onUpdate={(todos) => console.log('Updated todos:', todos)}
      />
      
      <h3>5. Task Metrics</h3>
      <TaskMetrics
        metrics={metrics}
        contextWindow={200000}
        maxTokens={8192}
      />
    </div>
  )
}
```

### Manual Testing Checklist

#### Reasoning Block
- [ ] Shows "💭 Thinking..." while streaming
- [ ] Animated dots pulse continuously
- [ ] Cursor blinks at end of text
- [ ] Auto-scrolls as content grows
- [ ] Changes to "✓ Thinking Complete" when done
- [ ] Collapse/expand works correctly
- [ ] Text wraps properly for long content

#### Batch File Permission
- [ ] All files checked by default
- [ ] Can toggle individual files
- [ ] "Select All" checks all files
- [ ] "Deselect All" unchecks all files
- [ ] Submit button shows count (X files)
- [ ] Submit disabled when 0 selected
- [ ] Opens file in editor on link click
- [ ] Warning icon shows for outside-workspace files

#### Approval Buttons
- [ ] Approve button sends response
- [ ] Deny button sends response
- [ ] Optional feedback input appears
- [ ] Custom button text displays correctly

#### Todo List
- [ ] Shows completion count (X/Y)
- [ ] Green dot for completed items
- [ ] Yellow dot for in-progress items
- [ ] Hollow dot for pending items
- [ ] Collapse/expand works
- [ ] Auto-scrolls to in-progress item
- [ ] Editable dropdown changes status (if editable=true)
- [ ] Completed items show strikethrough

#### Task Metrics
- [ ] Displays token counts with ↑↓ arrows
- [ ] Shows cache usage (if > 0)
- [ ] Shows cost with $ symbol
- [ ] Progress bar fills correctly
- [ ] Percentage matches visual bar
- [ ] Numbers formatted (1.2K, 1.5M)

---

## 8. Styling & Animations

### Global Animations

**Create**: `webview-ui/src/styles/animations.css`

```css
/* Fade in animation for new components */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: fadeIn 0.3s ease-out;
}

/* Slide in from right */
@keyframes slideInRight {
  from {
    transform: translateX(20px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.slide-in-right {
  animation: slideInRight 0.4s ease-out;
}

/* Pulse for important notifications */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.pulse {
  animation: pulse 2s ease-in-out infinite;
}

/* Shimmer for loading states */
@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

.shimmer {
  background: linear-gradient(
    90deg,
    var(--vscode-editor-background) 0%,
    var(--vscode-list-hoverBackground) 50%,
    var(--vscode-editor-background) 100%
  );
  background-size: 1000px 100%;
  animation: shimmer 2s infinite;
}
```

### Responsive Design

**Create**: `webview-ui/src/styles/responsive.css`

```css
/* Small webview (< 400px) */
@media (max-width: 400px) {
  .batch-file-permission,
  .batch-diff-approval,
  .approval-buttons {
    padding: 8px;
  }
  
  .file-path,
  .diff-path {
    font-size: 11px;
  }
  
  .button-row,
  .permission-actions,
  .approval-actions {
    flex-direction: column;
  }
  
  .button-row > *,
  .permission-actions > *,
  .approval-actions > * {
    width: 100%;
  }
}

/* Medium webview (400-600px) */
@media (min-width: 401px) and (max-width: 600px) {
  .metrics-grid {
    font-size: 11px;
  }
  
  .todo-items {
    max-height: 200px;
  }
}

/* Large webview (> 600px) */
@media (min-width: 601px) {
  .reasoning-content {
    max-height: 400px;
  }
  
  .file-list,
  .diff-list {
    max-height: 500px;
  }
}
```

### Dark/Light Theme Support

All components use VSCode theme variables, so they automatically adapt to user's theme. Key variables:

- `--vscode-editor-background` - Main background
- `--vscode-editor-foreground` - Main text color
- `--vscode-panel-border` - Border color
- `--vscode-list-hoverBackground` - Hover state
- `--vscode-editor-selectionBackground` - Selection state
- `--vscode-notificationsInfoIcon-foreground` - Info blue
- `--vscode-notificationsWarningIcon-foreground` - Warning yellow
- `--vscode-notificationsErrorIcon-foreground` - Error red

---

## Final Implementation Checklist

### Phase 1: Core Components (4 hours)
- [ ] Create `ReasoningBlock.tsx` and `ReasoningBlock.css`
- [ ] Create `ApprovalButtons.tsx` and `ApprovalButtons.css`
- [ ] Test both components in isolation
- [ ] Integrate into `ChatRow.tsx`
- [ ] Test with mock WebSocket events

### Phase 2: Batch Approval (3 hours)
- [ ] Create `BatchFilePermission.tsx` and `.css`
- [ ] Create `BatchDiffApproval.tsx` and `.css`
- [ ] Add permission handling logic
- [ ] Integrate into `ChatRow.tsx`
- [ ] Test with mock batch requests

### Phase 3: Todo & Metrics (3 hours)
- [ ] Create `getApiMetrics.ts` utility
- [ ] Create `TaskMetrics.tsx` and `.css`
- [ ] Create `TodoListDisplay.tsx` and `.css`
- [ ] Integrate into task header/footer
- [ ] Test with mock data

### Phase 4: Polish (2 hours)
- [ ] Add animations (`animations.css`)
- [ ] Add responsive styles (`responsive.css`)
- [ ] Test on different webview sizes
- [ ] Verify dark/light theme compatibility
- [ ] Run accessibility checks

### Phase 5: Integration Testing (2 hours)
- [ ] Create `integration-test.tsx`
- [ ] Test all components together
- [ ] Test with real backend (if available)
- [ ] Fix any layout/styling issues
- [ ] Document usage in README

---

## Troubleshooting

### Reasoning Block Not Updating
**Problem**: Reasoning content doesn't stream in real-time

**Solution**: Verify WebSocket event listener is attached:
```tsx
useEffect(() => {
  const handleProgress = (event: CustomEvent) => {
    if (event.detail.type === 'ai_chunk' && event.detail.is_reasoning) {
      setReasoningContent(prev => prev + event.detail.token)
    }
  }
  
  window.addEventListener('ai_progress', handleProgress as EventListener)
  return () => window.removeEventListener('ai_progress', handleProgress as EventListener)
}, [])
```

### Batch Approval Not Sending Response
**Problem**: Backend doesn't receive approval response

**Solution**: Ensure `acquireVsCodeApi()` is called correctly:
```tsx
const vscode = acquireVsCodeApi()
vscode.postMessage({
  type: 'askResponse',
  text: JSON.stringify(permissions) // Must be JSON string
})
```

### Metrics Show 0 Values
**Problem**: Task metrics display all zeros

**Solution**: Check message format matches expected structure:
```typescript
// Backend must send:
{
  type: 'api_req_started',
  text: JSON.stringify({
    tokensIn: number,
    tokensOut: number,
    cost: number
  })
}
```

### Todos Not Persisting
**Problem**: Todo changes don't save to backend

**Solution**: Implement `onUpdate` callback:
```tsx
<TodoListDisplay
  todos={todos}
  editable={true}
  onUpdate={(updatedTodos) => {
    // Save to backend
    vscode.postMessage({
      type: 'updateTodos',
      taskId: currentTaskId,
      todos: updatedTodos
    })
  }}
/>
```

---

## Next Steps

After completing this guide:

1. **Test with Real Backend**: Once backend streaming is implemented, test with actual AI responses
2. **Add Auto-Approval**: Implement auto-approval toggles for trusted tools
3. **Add Keyboard Shortcuts**: Add Ctrl+Enter for approve, Ctrl+Shift+Enter for deny
4. **Performance Optimization**: Virtualize long file lists in batch approvals
5. **Accessibility**: Add ARIA labels, keyboard navigation, screen reader support

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Total Estimated Effort**: 12-16 hours  
**Maintainer**: Frontend Development Team
