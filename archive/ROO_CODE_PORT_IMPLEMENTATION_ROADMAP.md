# Roo-Code Interface Port - Implementation Roadmap
## Oropendola AI Assistant v3.6.0

**Date:** October 25, 2025
**Objective:** Replace simple chat interface with full Roo-Code task-based workflow system
**Backend:** Single backend at https://oropendola.ai (unchanged)

---

## Executive Summary

After analyzing the actual Roo-Code repository at `/tmp/Roo-Code`, this document provides a complete roadmap to port their interface to Oropendola AI while maintaining our single backend architecture.

**Key Insight:** Roo-Code uses a **message-based system with rich metadata**, not a fundamentally different task architecture. The "task" is simply the first message with special UI treatment.

---

## Phase 1: Message Type System (Week 1)

### 1.1 Core Message Types

**Source:** `/tmp/Roo-Code/packages/types/src/message.ts`

**Implement:** `webview-ui/src/types/messages.ts`

```typescript
// ClineAsk - Permission requests and user interactions
export type ClineAsk =
  | "followup"                      // Clarifying question
  | "command"                        // Execute terminal command
  | "command_output"                 // Read command output
  | "completion_result"              // Task complete
  | "tool"                           // File operation permission
  | "api_req_failed"                 // Retry failed request
  | "resume_task"                    // Resume paused task
  | "resume_completed_task"          // Resume completed task
  | "mistake_limit_reached"          // Too many errors
  | "browser_action_launch"          // Browser automation
  | "use_mcp_server"                 // MCP tool usage
  | "auto_approval_max_req_reached"  // Auto-approve limit

// ClineSay - Assistant messages
export type ClineSay =
  | "error"                          // Error message
  | "api_req_started"                // API request started
  | "api_req_finished"               // API request finished
  | "api_req_retried"                // API request retry
  | "text"                           // General text
  | "reasoning"                      // Thinking process
  | "command_output"                 // Command result
  | "browser_action"                 // Browser action
  | "browser_action_result"          // Browser result
  | "mcp_server_request_started"     // MCP request
  | "mcp_server_response"            // MCP response
  | "subtask_result"                 // Subtask complete
  | "checkpoint_saved"               // Checkpoint saved
  | "codebase_search_result"         // Search results

// Main message interface
export interface ClineMessage {
  ts: number                         // Timestamp
  type: "ask" | "say"                // Message type
  ask?: ClineAsk                     // Ask type if applicable
  say?: ClineSay                     // Say type if applicable
  text?: string                      // Message content
  images?: string[]                  // Image attachments
  tool?: ClineSayTool                // Tool usage data
  apiMetrics?: {
    cost?: number
    tokensIn?: number
    tokensOut?: number
    cacheWrites?: number
    cacheReads?: number
  }
}
```

**Backend Integration:**
```json
{
  "type": "message",
  "message": {
    "ts": 1698765432000,
    "type": "ask",
    "ask": "tool",
    "text": "I need to read style.css to understand the current styling",
    "tool": {
      "tool": "read_file",
      "path": "style.css",
      "maxLines": 500
    }
  }
}
```

---

## Phase 2: TaskHeader Component (Week 1-2)

### 2.1 Component Structure

**Source:** `/tmp/Roo-Code/webview-ui/src/components/chat/TaskHeader.tsx`

**Implement:** `webview-ui/src/components/Task/TaskHeader.tsx`

**Features:**
1. **Collapsed State** (default)
   - Shows: `Task: [title]`
   - Token usage: `11.7k / 200k`
   - Cost: `$0.02`
   - Expand/collapse icon

2. **Expanded State**
   - Full task description
   - Attached images (thumbnails)
   - **Metrics Table:**
     - Context Window (with progress bar)
     - Tokens (↑ in, ↓ out)
     - Cache (↑ writes, ↓ reads)
     - API Cost
     - Size (file size)
   - Task management buttons

**UI Layout:**
```
┌──────────────────────────────────────────────────────┐
│ Task: Add colors to this website        [Expand ▼] │
│ 11.7k / 200k    $0.02                              │
└──────────────────────────────────────────────────────┘

[When Expanded:]

┌──────────────────────────────────────────────────────┐
│ Task: Add colors to this website    [Collapse ▲]   │
│                                                      │
│ I need to add a modern color palette to this        │
│ website to make it more visually appealing.         │
│                                                      │
│ [Image thumbnails if any]                           │
│                                                      │
│ ┌──────────────────────────────────────────────┐   │
│ │ Context Window  [████████░░░░] 50%  [Condense]│ │
│ │ Tokens          ↑ 8,234  ↓ 3,466             │   │
│ │ Cache           ↑ 12,000 ↓ 45,000            │   │
│ │ API Cost        $0.02                        │   │
│ │ Size            2.4 MB                       │   │
│ └──────────────────────────────────────────────┘   │
│                                                      │
│ [Share] [Delete] [Export] [Settings]               │
└──────────────────────────────────────────────────────┘
```

**Code Structure:**
```tsx
export const TaskHeader: React.FC<TaskHeaderProps> = ({
  task,
  tokensIn,
  tokensOut,
  cacheWrites,
  cacheReads,
  totalCost,
  contextTokens,
  contextWindow,
  onCondenseContext
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="roo-task-header">
      {/* Collapsed header */}
      <div className="roo-task-header-collapsed">
        <span>Task: {truncate(task.text, 50)}</span>
        <button onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? <ChevronUp /> : <ChevronDown />}
        </button>
      </div>

      {/* Metrics preview (collapsed) */}
      {!isExpanded && (
        <div className="roo-metrics-preview">
          <span>{formatTokens(contextTokens)} / {formatTokens(contextWindow)}</span>
          <span>${totalCost.toFixed(2)}</span>
        </div>
      )}

      {/* Expanded content */}
      {isExpanded && (
        <>
          <div className="roo-task-description">{task.text}</div>
          {task.images && <Thumbnails images={task.images} />}

          <table className="roo-metrics-table">
            <tbody>
              <tr>
                <th>Context Window</th>
                <td>
                  <ContextWindowProgress
                    current={contextTokens}
                    max={contextWindow}
                  />
                  <button onClick={onCondenseContext}>Condense</button>
                </td>
              </tr>
              <tr>
                <th>Tokens</th>
                <td>↑ {formatTokens(tokensIn)} ↓ {formatTokens(tokensOut)}</td>
              </tr>
              {/* ... more rows ... */}
            </tbody>
          </table>

          <TaskActions />
        </>
      )}
    </div>
  )
}
```

---

## Phase 3: Auto-Approve System (Week 2)

### 3.1 AutoApproveDropdown Component

**Source:** `/tmp/Roo-Code/webview-ui/src/components/chat/AutoApproveDropdown.tsx`

**Implement:** `webview-ui/src/components/Task/AutoApproveDropdown.tsx`

**Permissions:**
```typescript
export interface AutoApprovePermissions {
  enabled: boolean                    // Master toggle
  read: boolean                       // Read files
  readOutsideWorkspace: boolean       // Read outside workspace
  write: boolean                      // Write files
  writeOutsideWorkspace: boolean      // Write outside workspace
  writeProtected: boolean             // Write protected files
  execute: boolean                    // Execute commands
  browser: boolean                    // Browser automation
  mcp: boolean                        // MCP tool usage
  modeSwitch: boolean                 // Mode switching
  subtasks: boolean                   // Create subtasks
  retry: boolean                      // Retry failed requests
  followupQuestions: boolean          // Auto-answer followups
  updateTodoList: boolean             // Update todos
}
```

**UI Layout:**
```
┌────────────────────────────────────────────────┐
│ [✓] Auto-approve: Read, Write, Execute... ▶   │
└────────────────────────────────────────────────┘

[When expanded:]

┌────────────────────────────────────────────────┐
│ Auto-Approval Settings                    [⚙] │
│ Automatically approve certain actions         │
│                                                │
│ [✓ Read]      [✓ Write]      [  Execute]     │
│ [✓ Browser]   [  MCP]        [✓ Mode]        │
│ [✓ Subtasks]  [✓ Retry]                      │
│                                                │
│ [All] [None]              [Enabled] [Toggle]  │
└────────────────────────────────────────────────┘
```

**Implementation:**
```tsx
export const AutoApproveDropdown: React.FC = () => {
  const { permissions, updatePermissions } = useAutoApprove()
  const [open, setOpen] = useState(false)

  const handleToggle = (key: keyof AutoApprovePermissions) => {
    updatePermissions({ [key]: !permissions[key] })
  }

  const handleAll = () => {
    updatePermissions(Object.keys(permissions).reduce(
      (acc, key) => ({ ...acc, [key]: true }), {}
    ))
  }

  const handleNone = () => {
    updatePermissions(Object.keys(permissions).reduce(
      (acc, key) => ({ ...acc, [key]: false }), {}
    ))
  }

  const enabledCount = Object.values(permissions).filter(Boolean).length
  const totalCount = Object.keys(permissions).length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        {permissions.enabled ? '✓' : '✗'} Auto-approve: {enabledCount}/{totalCount}
      </PopoverTrigger>
      <PopoverContent>
        {/* Permission grid */}
        <div className="roo-permissions-grid">
          {Object.entries(permissionConfig).map(([key, config]) => (
            <button
              key={key}
              onClick={() => handleToggle(key)}
              className={permissions[key] ? 'enabled' : 'disabled'}
            >
              <Icon name={config.icon} />
              {config.label}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="roo-permissions-controls">
          <button onClick={handleAll}>All</button>
          <button onClick={handleNone}>None</button>
          <ToggleSwitch checked={permissions.enabled} onChange={handleMasterToggle} />
        </div>
      </PopoverContent>
    </Popover>
  )
}
```

---

## Phase 4: ChatRow Component (Week 2-3)

### 4.1 Message Row Structure

**Source:** `/tmp/Roo-Code/webview-ui/src/components/chat/ChatRow.tsx`

**Implement:** `webview-ui/src/components/Task/ChatRow.tsx`

**Message Types:**

1. **API Request Started** (`api_req_started`)
   ```
   ┌──────────────────────────────────────────┐
   │ ⟳ API Request  #d037  ▼                 │
   │ Investigating Color Integration...       │
   └──────────────────────────────────────────┘
   ```

2. **Tool Permission** (`tool`)
   ```
   ┌──────────────────────────────────────────┐
   │ 📄 Roo wants to read this file:         │
   │    style.css (max 500 lines)      [📂]  │
   │                                          │
   │    [Approve] [Deny]                      │
   └──────────────────────────────────────────┘
   ```

3. **Command Execution** (`command`)
   ```
   ┌──────────────────────────────────────────┐
   │ $ Roo wants to execute:                  │
   │   npm install tailwindcss               │
   │                                          │
   │   [Approve] [Deny] [Edit]               │
   └──────────────────────────────────────────┘
   ```

4. **Assistant Text** (`text`)
   ```
   ┌──────────────────────────────────────────┐
   │ I've analyzed the current color scheme   │
   │ and created a modern palette...          │
   └──────────────────────────────────────────┘
   ```

5. **Completion Result** (`completion_result`)
   ```
   ┌──────────────────────────────────────────┐
   │ ✓ Task Complete                         │
   │                                          │
   │ I've successfully added a modern color   │
   │ palette to your website.                 │
   │                                          │
   │ [Start New Task] [Modify]               │
   └──────────────────────────────────────────┘
   ```

**Implementation:**
```tsx
export const ChatRow: React.FC<ChatRowProps> = ({ message }) => {
  const { type, ask, say, text, tool } = message

  // API Request
  if (say === 'api_req_started') {
    return (
      <div className="roo-api-request">
        <div className="roo-api-request-header">
          <Spinner />
          <span>API Request</span>
          <Badge>{message.apiRequestId}</Badge>
          <ExpandIcon />
        </div>
        <div className="roo-api-request-content">
          {text}
        </div>
      </div>
    )
  }

  // Tool Permission
  if (ask === 'tool') {
    return (
      <div className="roo-permission-request">
        <Icon name="file" />
        <span>Roo wants to read this file:</span>
        <div className="roo-file-info">
          <span>{tool.path}</span>
          {tool.maxLines && <span>(max {tool.maxLines} lines)</span>}
          <button>Open</button>
        </div>
        <div className="roo-permission-actions">
          <button onClick={handleApprove}>Approve</button>
          <button onClick={handleDeny}>Deny</button>
        </div>
      </div>
    )
  }

  // Command Execution
  if (ask === 'command') {
    return (
      <div className="roo-command-request">
        <Icon name="terminal" />
        <span>Roo wants to execute:</span>
        <code>{tool.command}</code>
        <div className="roo-command-actions">
          <button onClick={handleApprove}>Approve</button>
          <button onClick={handleDeny}>Deny</button>
          <button onClick={handleEdit}>Edit</button>
        </div>
      </div>
    )
  }

  // Regular text message
  return (
    <div className="roo-text-message">
      <Markdown>{text}</Markdown>
    </div>
  )
}
```

---

## Phase 5: ChatView Container (Week 3)

### 5.1 Main Chat Container

**Source:** `/tmp/Roo-Code/webview-ui/src/components/chat/ChatView.tsx`

**Implement:** `webview-ui/src/components/Task/ChatView.tsx`

**Structure:**
```tsx
export const ChatView: React.FC = () => {
  const { messages, currentTask } = useExtensionState()
  const virtuosoRef = useRef<VirtuosoHandle>(null)

  // First message is the task
  const task = messages[0]
  const chatMessages = messages.slice(1)

  // Combine API requests for cleaner display
  const combinedMessages = combineApiRequests(chatMessages)

  // Calculate metrics
  const apiMetrics = getApiMetrics(combinedMessages)

  return (
    <div className="roo-chat-view">
      {/* Task Header */}
      <TaskHeader
        task={task}
        tokensIn={apiMetrics.tokensIn}
        tokensOut={apiMetrics.tokensOut}
        cacheWrites={apiMetrics.cacheWrites}
        cacheReads={apiMetrics.cacheReads}
        totalCost={apiMetrics.totalCost}
        contextTokens={apiMetrics.contextTokens}
        contextWindow={apiMetrics.contextWindow}
      />

      {/* Messages */}
      <Virtuoso
        ref={virtuosoRef}
        data={combinedMessages}
        itemContent={(index, message) => (
          <ChatRow key={index} message={message} />
        )}
      />

      {/* Input Area */}
      <ChatTextArea
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        disabled={isSending}
      />
    </div>
  )
}
```

---

## Phase 6: Backend Integration (Week 3-4)

### 6.1 Update Backend Message Format

**Endpoint:** `https://oropendola.ai/api/method/ai_assistant.api.endpoints.chat`

**Request Format:**
```json
{
  "message": "Add colors to this website",
  "images": ["base64..."],
  "mode": "agent",
  "auto_approve": {
    "enabled": true,
    "read": true,
    "write": false,
    "execute": false,
    "browser": false,
    "mcp": false
  }
}
```

**Response Format (Streaming):**
```json
{
  "type": "message",
  "message": {
    "ts": 1698765432000,
    "type": "ask",
    "ask": "tool",
    "text": "I need to read style.css",
    "tool": {
      "tool": "read_file",
      "path": "style.css",
      "maxLines": 500
    }
  }
}

{
  "type": "metrics",
  "metrics": {
    "tokensIn": 8234,
    "tokensOut": 3466,
    "cacheWrites": 12000,
    "cacheReads": 45000,
    "cost": 0.02
  }
}

{
  "type": "message",
  "message": {
    "ts": 1698765433000,
    "type": "say",
    "say": "api_req_started",
    "text": "Analyzing color scheme...",
    "apiRequestId": "d037"
  }
}
```

### 6.2 Backend Requirements

**New Endpoints:**
1. `/api/method/ai_assistant.api.endpoints.approve_permission`
   - Approve/deny file read, write, command execution

2. `/api/method/ai_assistant.api.endpoints.update_auto_approve`
   - Update auto-approval settings

3. `/api/method/ai_assistant.api.endpoints.condense_context`
   - Condense conversation context

4. `/api/method/ai_assistant.api.endpoints.save_checkpoint`
   - Save conversation checkpoint

**Backend Changes:**
```python
# frappe backend
@frappe.whitelist(allow_guest=False)
def chat(message, images=None, mode="agent", auto_approve=None):
    """
    Enhanced chat endpoint with Roo-Code features
    """
    # Parse auto-approve settings
    auto_approve = json.loads(auto_approve) if auto_approve else {}

    # Create task message
    task_message = {
        "ts": int(time.time() * 1000),
        "type": "ask",
        "ask": "followup",  # Initial message type
        "text": message,
        "images": images or []
    }

    # Stream responses
    def generate():
        # Send task
        yield json.dumps({"type": "message", "message": task_message})

        # Process with AI
        for chunk in process_with_ai(message, auto_approve):
            yield json.dumps(chunk)

    return generate()
```

---

## Phase 7: Migration Strategy (Week 4)

### 7.1 Gradual Migration

**Step 1:** Feature Flag
```typescript
const USE_ROO_CODE_INTERFACE = true

if (USE_ROO_CODE_INTERFACE) {
  return <ChatView />
} else {
  return <OldChatInterface />
}
```

**Step 2:** Side-by-Side Testing
- Keep old interface available via settings toggle
- Collect user feedback
- Fix bugs in new interface

**Step 3:** Full Migration
- Remove old interface code
- Update all documentation
- Train users on new features

### 7.2 Data Migration

**Convert old messages to new format:**
```typescript
function migrateOldMessages(oldMessages): ClineMessage[] {
  return oldMessages.map(msg => ({
    ts: msg.timestamp,
    type: msg.role === 'user' ? 'ask' : 'say',
    ask: msg.role === 'user' ? 'followup' : undefined,
    say: msg.role === 'assistant' ? 'text' : undefined,
    text: msg.content,
    images: msg.images || []
  }))
}
```

---

## Implementation Timeline

### Week 1: Foundation
- ✅ Day 1-2: Set up message type system
- ✅ Day 3-4: Implement TaskHeader component
- ✅ Day 5: Testing and bug fixes

### Week 2: Interactive Features
- ✅ Day 1-2: Implement AutoApproveDropdown
- ✅ Day 3-4: Implement ChatRow component
- ✅ Day 5: Testing and integration

### Week 3: Main Container & Backend
- ✅ Day 1-2: Implement ChatView container
- ✅ Day 3-4: Update backend integration
- ✅ Day 5: End-to-end testing

### Week 4: Polish & Launch
- ✅ Day 1-2: Bug fixes and polish
- ✅ Day 3: Documentation
- ✅ Day 4: User testing
- ✅ Day 5: Production deployment

---

## Success Metrics

### Technical Metrics
- ✅ 0 TypeScript errors
- ✅ All tests passing
- ✅ < 2s initial load time
- ✅ Smooth 60fps scrolling

### User Experience Metrics
- ✅ Auto-approve reduces clicks by 80%
- ✅ Task header provides clear context
- ✅ Permission requests are intuitive
- ✅ Metrics help track costs

### Backend Metrics
- ✅ Single backend maintained
- ✅ No API changes required for existing users
- ✅ Backward compatible with old clients

---

## Risk Mitigation

### High Risk: Breaking Changes
**Mitigation:** Feature flag + gradual rollout

### Medium Risk: Backend Load
**Mitigation:** Optimize streaming, add caching

### Low Risk: User Confusion
**Mitigation:** Onboarding tutorial, documentation

---

## Conclusion

This roadmap provides a complete, actionable plan to port Roo-Code's sophisticated interface to Oropendola AI while maintaining our single backend architecture at oropendola.ai.

**Key Advantages:**
- ✅ Professional, polished UI matching industry standards
- ✅ Auto-approval system reduces friction
- ✅ Clear metrics and cost tracking
- ✅ Granular permission controls
- ✅ Single backend simplifies deployment

**Next Step:** Begin Phase 1 - Message Type System

---

*Document Version: 1.0*
*Last Updated: October 25, 2025*
*Status: 🟢 Ready for Implementation*
