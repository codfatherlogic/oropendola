# Tool Approval UI - Missing Implementation 🔴

**Date**: October 27, 2025  
**Issue**: Approve/Reject buttons not showing for tool calls  
**Status**: ❌ **CRITICAL MISSING FEATURE**

---

## Problem Analysis

### What User Sees:
- Roo-Code screenshot shows "Approve/Reject" buttons with "Roo wants to recursively view all files"
- Oropendola screenshot shows only "AI is thinking..." with NO approval buttons
- Files fail to create with "No workspace folder open" error

### Root Cause:

**Backend sends tool_calls correctly** (from logs):
```javascript
[Extension Host] 🔧 Backend returned 1 tool_call(s) in response
[Extension Host] 🔧 [1/1] Executing: create_file
[Extension Host] 📄 File change added: api/routes/users.js (generating)
❌ Tool execution error: Error: Failed to create file api/routes/users.js: No workspace folder open
```

**But Frontend is MISSING**:
1. ❌ Tool call parsing from backend responses
2. ❌ Approval message creation for tools
3. ❌ Tool approval UI display logic
4. ❌ Approval state management for tools

---

## Current Implementation Status

### ✅ What EXISTS:

**1. Approval Buttons Component** (`ChatView.tsx` lines 291-305):
```tsx
{lastApprovalMessage && (
  <div className="chat-view-approval-buttons">
    <button onClick={handleApprove}>
      {buttonText.approve}
    </button>
    <button onClick={handleReject}>
      {buttonText.reject}
    </button>
  </div>
)}
```

**2. Approval Detection** (`message-combining.ts` lines 154-162):
```typescript
export function isApprovalMessage(message: ClineMessage): boolean {
  if (message.type !== 'ask') return false
  
  const approvalTypes = [
    'command',
    'tool',  // ✅ Expects ask: 'tool'
    'browser_action_launch',
    'use_mcp_server',
  ]
  
  return approvalTypes.includes(message.ask || '')
}
```

**3. Approval Callbacks**:
- `onApproveMessage(messageTs)` - ✅ Exists
- `onRejectMessage(messageTs)` - ✅ Exists

### ❌ What's MISSING:

**1. Tool Call Parsing** (NO CODE EXISTS):
```typescript
// MISSING: Extract tool_calls from backend response
interface BackendResponse {
  success: boolean
  role: 'assistant'
  content: string
  tool_calls?: Array<{
    action: string  // 'create_file', 'edit_file', etc.
    path?: string
    content?: string
    // ... other tool parameters
  }>
}

// MISSING: Parse and convert to approval messages
function parseToolCalls(response: BackendResponse): ClineMessage[] {
  if (!response.tool_calls) return []
  
  return response.tool_calls.map((toolCall, index) => ({
    ts: Date.now() + index,
    type: 'ask',
    ask: 'tool',  // ✅ This triggers approval buttons!
    text: formatToolForDisplay(toolCall),
    tool: toolCall,  // Store for execution later
  }))
}
```

**2. Tool Execution After Approval** (NO CODE EXISTS):
```typescript
// MISSING: Execute tool after user approves
async function executeApprovedTool(tool: any): Promise<void> {
  // Send to extension via postMessage
  window.postMessage({
    type: 'executeTool',
    tool: tool,
    approved: true
  }, '*')
}
```

**3. Message Flow Integration** (BROKEN):
```
Current Flow (BROKEN):
1. User sends: "Create API endpoint"
2. Backend responds with tool_calls
3. ❌ Frontend shows AI response text only
4. ❌ Extension tries to execute tool immediately (NO APPROVAL!)
5. ❌ Tool fails: "No workspace folder open"

Expected Flow (MISSING):
1. User sends: "Create API endpoint"
2. Backend responds with tool_calls
3. ✅ Frontend creates ask: 'tool' messages
4. ✅ Approve/Reject buttons appear
5. ✅ User clicks Approve
6. ✅ Frontend sends approval to extension
7. ✅ Extension executes tool
8. ✅ Results shown in chat
```

---

## Implementation Required

### File 1: `/webview-ui/src/types/cline-message.ts`

**Add Tool Call Types**:
```typescript
export interface ToolCall {
  action: string  // 'create_file', 'edit_file', 'run_command', etc.
  path?: string
  content?: string
  command?: string
  // ... other parameters based on tool type
}

export interface ClineMessage {
  ts: number
  type: 'ask' | 'say'
  ask?: string
  say?: string
  text?: string
  images?: string[]
  partial?: boolean
  tool?: ToolCall  // ✅ Add this
  apiMetrics?: ApiMetrics
}
```

### File 2: `/webview-ui/src/context/ChatContext.tsx`

**Add Tool Message Handling**:
```typescript
// In handleMessage function, add after receiving AI response:

case 'newMessage':
  const message = data.message
  
  // Check if message contains tool_calls
  if (message.tool_calls && message.tool_calls.length > 0) {
    // Create approval messages for each tool
    const toolMessages: ClineMessage[] = message.tool_calls.map((toolCall: any, index: number) => ({
      ts: Date.now() + index,
      type: 'ask',
      ask: 'tool',
      text: formatToolDescription(toolCall),
      tool: toolCall,
    }))
    
    // Add tool messages to conversation
    setMessages(prev => [...prev, ...toolMessages])
  }
  
  // Add the assistant's text response
  setMessages(prev => [...prev, {
    ts: message.ts || Date.now(),
    type: 'say',
    say: 'text',
    text: message.content,
    apiMetrics: message.apiMetrics
  }])
  break

case 'approveMessage':
  // Find the message with this timestamp
  const approvalMsg = messages.find(m => m.ts === data.messageTs)
  if (approvalMsg?.tool) {
    // Send tool execution request to extension
    window.postMessage({
      type: 'executeTool',
      tool: approvalMsg.tool,
      messageTs: data.messageTs
    }, '*')
  }
  break

case 'rejectMessage':
  // Remove pending tool messages
  setMessages(prev => prev.filter(m => m.ts !== data.messageTs))
  
  // Send rejection to extension
  window.postMessage({
    type: 'rejectTool',
    messageTs: data.messageTs
  }, '*')
  break
```

### File 3: `/webview-ui/src/utils/tool-formatter.ts` (NEW FILE)

**Create Tool Description Formatter**:
```typescript
import { ToolCall } from '../types/cline-message'

export function formatToolDescription(tool: ToolCall): string {
  switch (tool.action) {
    case 'create_file':
      return `**Create file**: \`${tool.path}\`\n\n\`\`\`\n${truncate(tool.content, 200)}\n\`\`\``
    
    case 'edit_file':
      return `**Edit file**: \`${tool.path}\`\n\nApply changes to existing file`
    
    case 'run_command':
      return `**Run command**: \`${tool.command}\``
    
    case 'read_file':
      return `**Read file**: \`${tool.path}\``
    
    default:
      return `**${tool.action}**: ${JSON.stringify(tool, null, 2)}`
  }
}

function truncate(str: string | undefined, maxLength: number): string {
  if (!str) return ''
  return str.length > maxLength ? str.substring(0, maxLength) + '...' : str
}
```

### File 4: Extension Side (`src/core/ConversationTask.js`)

**Handle Tool Approval** (likely already exists, need to verify):
```javascript
// In webview message handler:
case 'executeTool':
  // Execute the approved tool
  const result = await this._executeSingleTool(message.tool)
  
  // Send result back to webview
  this._postMessageToWebview({
    type: 'toolResult',
    messageTs: message.messageTs,
    success: result.success,
    output: result.output
  })
  break

case 'rejectTool':
  // Log rejection
  console.log(`Tool rejected by user: ${message.messageTs}`)
  
  // Send error result to backend
  await this._sendToolResult({
    success: false,
    error: 'User rejected tool execution'
  })
  break
```

---

## Testing Plan

### Test Case 1: File Creation Approval
1. Send message: "Create a hello.txt file"
2. ✅ VERIFY: Approve/Reject buttons appear
3. ✅ VERIFY: Tool description shows "Create file: `hello.txt`"
4. Click Approve
5. ✅ VERIFY: File created successfully
6. ✅ VERIFY: Success message in chat

### Test Case 2: Command Execution Approval
1. Send message: "Run ls -la"
2. ✅ VERIFY: Approve/Reject buttons appear
3. ✅ VERIFY: Tool description shows "Run command: `ls -la`"
4. Click Approve
5. ✅ VERIFY: Command executes
6. ✅ VERIFY: Output shown in chat

### Test Case 3: Tool Rejection
1. Send message: "Delete all files"
2. ✅ VERIFY: Approve/Reject buttons appear
3. Click Reject
4. ✅ VERIFY: Tool not executed
5. ✅ VERIFY: Rejection acknowledged in chat

### Test Case 4: Multiple Tools in Sequence
1. Send message: "Create 3 files: a.txt, b.txt, c.txt"
2. ✅ VERIFY: 3 approval buttons appear (one per file)
3. Approve first two, reject third
4. ✅ VERIFY: Only a.txt and b.txt created
5. ✅ VERIFY: c.txt not created

---

## Estimated Effort

| Task | Time | Priority |
|------|------|----------|
| Add ToolCall type definitions | 30 min | P0 |
| Parse tool_calls in ChatContext | 1 hour | P0 |
| Create tool description formatter | 1 hour | P0 |
| Test with real tool calls | 1 hour | P0 |
| Fix edge cases (multiple tools, errors) | 2 hours | P1 |
| **TOTAL** | **5.5 hours** | **P0** |

---

## Why This Is Critical

**Without tool approval**:
- ❌ Users can't control what AI does (security risk!)
- ❌ Files created without permission
- ❌ Commands run without confirmation
- ❌ No way to review changes before applying
- ❌ Core UX feature missing (Roo-Code has this!)

**With tool approval**:
- ✅ Users review every action
- ✅ Safe exploration of AI suggestions
- ✅ Learn what AI is doing step-by-step
- ✅ Matches Roo-Code UX exactly
- ✅ Professional AI assistant experience

---

## Quick Fix (Temporary Workaround)

If immediate fix not possible, add this to ChatView to show tool calls as text:

```tsx
// In ChatRow component, detect tool responses:
{message.text?.includes('```tool_call') && (
  <div className="tool-call-preview">
    <p>⚠️ Tool approval UI coming soon. For now, tools execute automatically.</p>
    <pre>{message.text}</pre>
  </div>
)}
```

But this is **NOT ACCEPTABLE** for production. Real approval UI is mandatory.

---

## Conclusion

**Status**: ❌ **BLOCKING v3.7.1 RELEASE**

The tool approval UI is not a "nice to have" - it's a **core security and UX feature**. Without it:
- Users have no control over AI actions
- Extension behaves unpredictably
- Security risk (AI could run any command)
- Fails to match Roo-Code functionality

**Recommendation**: Implement tool approval before release (5.5 hours estimated)

---

**Report Created**: October 27, 2025  
**Issue**: Tool Approval UI Missing  
**Status**: 🔴 **CRITICAL - MUST FIX BEFORE RELEASE**
