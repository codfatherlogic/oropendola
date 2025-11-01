# Oropendola AI Integration Plan
## Thinking Indicator & Approval/Deny Buttons

**Based on Roo-Code Architecture Analysis**  
**Date**: October 27, 2025

---

## 🎯 Objectives

1. **AI Thinking Indicator**: Display live "💡 Thinking Xs" indicator during AI reasoning
2. **Approval/Deny Buttons**: Add "Approve" and "Deny" buttons for tool usage requests
3. **Auto-Approval System**: Implement granular auto-approval toggles (read, write, execute, browser)
4. **Message Duplication Fix**: Resolved (already implemented in v3.7.1)

---

## 📊 Current Status

### ✅ **What's Ready (Frontend)**

1. **WebSocket Connection**: ✅ Connected to oropendola.ai (Socket ID verified)
2. **RealtimeManager**: ✅ Listening for `ai_progress` events (line 163 in RealtimeManager.js)
3. **ConversationTask**: ✅ Forwarding events to webview (lines 153-175)
4. **ChatRow Component**: ✅ Has conditional rendering for `message.say === 'reasoning'`
5. **ReasoningBlock Component**: ✅ Complete with Lightbulb icon, timer, collapse functionality
6. **Message Architecture**: ✅ `taskMessages` array ready for UI updates

### ❌ **What's Missing**

1. **Backend WebSocket Emissions**: `chat_completion()` uses non-streaming `gateway.generate()` - **NO EVENTS EMITTED**
2. **Approval/Deny Buttons**: Not implemented in ChatTextArea/ChatView
3. **Auto-Approval Toggles**: No UI controls for auto-approve settings
4. **Ask State Management**: No `clineAsk` state tracking for pending approvals

---

## 🏗️ Architecture Reference (Roo-Code)

### **1. Approval/Deny Button System**

**File**: `webview-ui/src/components/chat/ChatView.tsx`

```tsx
// State Management
const [clineAsk, setClineAsk] = useState<string | undefined>()
const [enableButtons, setEnableButtons] = useState(false)
const [primaryButtonText, setPrimaryButtonText] = useState<string | undefined>()
const [secondaryButtonText, setSecondaryButtonText] = useState<string | undefined>()

// Auto-approval logic (lines 1551-1686)
useEffect(() => {
  if (!clineAsk || !enableButtons || userRespondedRef.current) {
    return
  }

  const autoApproveOrReject = async () => {
    const lastMessage = messages[messages.length - 1]
    
    // Check for auto-deny (denied commands)
    if (isDeniedCommand(lastMessage)) {
      vscode.postMessage({ type: "askResponse", askResponse: "noButtonClicked" })
      return
    }

    // Check for auto-approval based on ask type
    if (isAutoApproved(lastMessage)) {
      // For write tools, add delay
      if (lastMessage.ask === "tool" && isWriteToolAction(lastMessage)) {
        await new Promise<void>((resolve) => {
          autoApproveTimeoutRef.current = setTimeout(() => {
            resolve()
          }, writeDelayMs)
        })
      }
      
      vscode.postMessage({ type: "askResponse", askResponse: "yesButtonClicked" })
      setSendingDisabled(true)
      setClineAsk(undefined)
      setEnableButtons(false)
    }
  }
  
  autoApproveOrReject()
}, [clineAsk, enableButtons, /* ...dependencies */])

// Button Rendering (lines 1935-1961)
{primaryButtonText && (
  <VSCodeButton
    appearance="primary"
    disabled={!enableButtons}
    onClick={() => handlePrimaryButtonClick(inputValue, selectedImages)}>
    {primaryButtonText}
  </VSCodeButton>
)}
{secondaryButtonText && (
  <VSCodeButton
    appearance="secondary"
    disabled={!enableButtons}
    onClick={() => handleSecondaryButtonClick(inputValue, selectedImages)}>
    {secondaryButtonText}
  </VSCodeButton>
)}
```

**Key Features**:
- `clineAsk` state: Tracks current approval type (`"tool"`, `"command"`, `"browser_action_launch"`, etc.)
- `enableButtons`: Controls when buttons are clickable
- `autoApproveOrReject()`: Auto-approves based on user settings
- `writeDelayMs`: Delay before auto-approving write operations (default 2000ms)
- `userRespondedRef`: Prevents auto-approval if user manually responded

### **2. Auto-Approval Toggle System**

**File**: `webview-ui/src/components/chat/AutoApproveDropdown.tsx`

```tsx
interface AutoApprovalToggles {
  alwaysAllowReadOnly: boolean
  alwaysAllowWrite: boolean
  alwaysAllowExecute: boolean
  alwaysAllowBrowser: boolean
  alwaysAllowMcp: boolean
  alwaysAllowModeSwitch: boolean
  alwaysAllowSubtasks: boolean
  alwaysApproveResubmit: boolean
  alwaysAllowFollowupQuestions: boolean
  alwaysAllowUpdateTodoList: boolean
}

const onAutoApproveToggle = (key: string, value: boolean) => {
  vscode.postMessage({ type: key, bool: value })
  // Update local state
  switch (key) {
    case "alwaysAllowReadOnly":
      setAlwaysAllowReadOnly(value)
      break
    case "alwaysAllowWrite":
      setAlwaysAllowWrite(value)
      break
    // ... other cases
  }
}
```

**UI Component**:
```tsx
<PopoverTrigger>
  {/* Shows enabled count: "Auto-Approve (3)" */}
  <CheckCheck /> {t("chat:autoApprove.triggerLabel", { count: enabledCount })}
</PopoverTrigger>

<PopoverContent>
  {settingsArray.map(({ key, labelKey, icon }) => (
    <button onClick={() => onAutoApproveToggle(key, !toggles[key])}>
      <span className={`codicon codicon-${icon}`} />
      <span>{t(labelKey)}</span>
    </button>
  ))}
</PopoverContent>
```

**Settings Icons**:
- Read: `file-text` icon
- Write: `edit` icon
- Execute: `terminal` icon
- Browser: `globe` icon
- MCP: `plug` icon

### **3. Thinking Indicator Implementation**

**File**: `webview-ui/src/components/chat/ReasoningBlock.tsx`

```tsx
export const ReasoningBlock = ({ content, isStreaming, isLast }: ReasoningBlockProps) => {
  const { reasoningBlockCollapsed } = useExtensionState()
  const [isCollapsed, setIsCollapsed] = useState(reasoningBlockCollapsed)
  
  const startTimeRef = useRef<number>(Date.now())
  const [elapsed, setElapsed] = useState<number>(0)
  
  // Update timer every second while streaming
  useEffect(() => {
    if (isLast && isStreaming) {
      const tick = () => setElapsed(Date.now() - startTimeRef.current)
      tick()
      const id = setInterval(tick, 1000)
      return () => clearInterval(id)
    }
  }, [isLast, isStreaming])
  
  const seconds = Math.floor(elapsed / 1000)
  const secondsLabel = t("chat:reasoning.seconds", { count: seconds })
  
  return (
    <div className="group">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4" />
          <span className="font-bold">{t("chat:reasoning.thinking")}</span>
          {elapsed > 0 && (
            <span className="text-sm text-vscode-descriptionForeground">
              {secondsLabel}
            </span>
          )}
        </div>
        <ChevronUp className={isCollapsed ? "rotate-180" : ""} />
      </div>
      
      {!isCollapsed && (
        <div className="reasoning-content">
          <MarkdownBlock markdown={content} partial={isStreaming} />
        </div>
      )}
    </div>
  )
}
```

**ChatRow Integration** (line 1008-1044):
```tsx
case "reasoning":
  return (
    <ReasoningBlock
      content={message.text || ""}
      ts={message.ts}
      isStreaming={isStreaming}
      isLast={isLast}
      metadata={message.metadata}
    />
  )
```

### **4. Backend Streaming Architecture**

**File**: `src/core/task/Task.ts` (lines 1958-2300)

```typescript
// Process streaming chunks
for await (const chunk of apiStream) {
  switch (chunk.type) {
    case "reasoning": {
      reasoningMessage += chunk.text
      
      // Update reasoning block in real-time
      await this.say("reasoning", reasoningMessage, [], true) // partial=true
      break
    }
    
    case "text": {
      textMessage += chunk.text
      await this.say("text", textMessage, [], true)
      break
    }
    
    case "usage": {
      // Track token usage
      inputTokens = chunk.inputTokens
      outputTokens = chunk.outputTokens
      break
    }
  }
}

// Mark reasoning as complete
if (reasoningMessage) {
  const lastReasoningIndex = findLastIndex(
    this.clineMessages,
    (m) => m.type === "say" && m.say === "reasoning"
  )
  
  if (lastReasoningIndex !== -1 && this.clineMessages[lastReasoningIndex].partial) {
    this.clineMessages[lastReasoningIndex].partial = false
    await this.updateClineMessage(this.clineMessages[lastReasoningIndex])
  }
}
```

**Key Points**:
- Backend yields `{ type: "reasoning", text: "chunk" }` for thinking
- Backend yields `{ type: "text", text: "chunk" }` for response
- Backend yields `{ type: "usage", inputTokens, outputTokens }` for metrics
- Frontend receives chunks via WebSocket and updates UI in real-time

---

## 🛠️ Implementation Plan for Oropendola

### **Phase 1: Fix Backend Streaming** 🔴 **CRITICAL - BLOCKING ISSUE**

**Problem**: Backend uses non-streaming `gateway.generate()` - NO WebSocket events emitted

**File**: `ai_assistant/api/__init__.py` (Line ~275)

**Current Code (BROKEN)**:
```python
def _generate_cloud_response(messages, provider, model, ...):
    gateway = get_unified_gateway()
    
    # ❌ NON-STREAMING - Waits for complete response
    result = gateway.generate(
        messages=messages,
        preferred_provider=provider,
        model=model,
        ...
    )
    
    return {
        "success": True,
        "response": result.get('content', ''),
        ...
    }
```

**Fixed Code (WORKING)**:
```python
def _generate_cloud_response(messages, provider, model, temperature=0.7, max_tokens=1000, conversation_id=None):
    """Generate response using cloud AI providers WITH WEBSOCKET STREAMING"""
    from ai_assistant.core.unified_gateway import get_unified_gateway
    from frappe.utils import now_datetime
    
    gateway = get_unified_gateway()
    user = frappe.session.user
    task_id = f"task_{conversation_id or frappe.generate_hash(length=8)}"
    
    # Accumulators
    response_text = ""
    reasoning_text = ""
    input_tokens = 0
    output_tokens = 0
    
    try:
        # ✅ USE STREAMING GENERATOR
        for chunk in gateway.stream_generate(
            messages=messages,
            preferred_provider=provider,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens
        ):
            # REASONING CHUNKS
            if chunk.get("type") == "reasoning":
                reasoning_chunk = chunk.get("text", "")
                reasoning_text += reasoning_chunk
                
                # ✅ EMIT WEBSOCKET EVENT
                try:
                    frappe.publish_realtime(
                        event='ai_progress',
                        message={
                            'type': 'reasoning',
                            'text': reasoning_chunk,
                            'partial': True,
                            'task_id': task_id,
                            'timestamp': now_datetime().isoformat()
                        },
                        user=user
                    )
                    frappe.db.commit()  # ⚠️ CRITICAL for real-time delivery
                except Exception as ws_error:
                    frappe.logger().warning(f"WebSocket reasoning emit failed: {ws_error}")
            
            # TEXT CHUNKS
            elif chunk.get("type") == "text":
                text_chunk = chunk.get("text", "")
                response_text += text_chunk
                
                # ✅ EMIT WEBSOCKET EVENT
                try:
                    frappe.publish_realtime(
                        event='ai_progress',
                        message={
                            'type': 'text',
                            'text': text_chunk,
                            'partial': True,
                            'task_id': task_id,
                            'timestamp': now_datetime().isoformat()
                        },
                        user=user
                    )
                    frappe.db.commit()
                except Exception as ws_error:
                    frappe.logger().warning(f"WebSocket text emit failed: {ws_error}")
            
            # USAGE STATS
            elif chunk.get("type") == "usage":
                input_tokens = chunk.get("input_tokens", 0)
                output_tokens = chunk.get("output_tokens", 0)
        
        # ✅ EMIT COMPLETION EVENT
        try:
            frappe.publish_realtime(
                event='ai_progress',
                message={
                    'type': 'completion',
                    'text': response_text,
                    'reasoning': reasoning_text,
                    'partial': False,
                    'task_id': task_id,
                    'timestamp': now_datetime().isoformat()
                },
                user=user
            )
            frappe.db.commit()
        except Exception as ws_error:
            frappe.logger().warning(f"WebSocket completion emit failed: {ws_error}")
        
        # Return final response
        return {
            "success": True,
            "response": response_text,
            "reasoning": reasoning_text,
            "usage": {
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": input_tokens + output_tokens
            },
            "provider": provider,
            "model": model
        }
    
    except Exception as e:
        frappe.logger().error(f"Cloud response generation failed: {str(e)}")
        import traceback
        frappe.logger().error(f"Traceback: {traceback.format_exc()}")
        return {
            "success": False,
            "error": str(e),
            "response": "",
            "usage": {}
        }
```

**Testing**:
```bash
# 1. Backend logs
tail -f ~/frappe-bench/logs/worker.error.log | grep "websocket"
# Expected: [WebSocket] 💭 REASONING emitted: XX chars

# 2. Browser console
# Open DevTools → Console
# Send AI message
# Expected:
# 🔥🔥🔥 [RealtimeManager] AI_PROGRESS EVENT RECEIVED
# 📊 Event type: reasoning
# 📊 Full data: {"type":"reasoning","text":"Analyzing...","partial":true}

# 3. VSCode UI
# Send message: "Design a REST API"
# Expected: 💡 Thinking 0s → 💡 Thinking 1s → 💡 Thinking 2s
```

**References**:
- See `BACKEND_FIX_URGENT.md` for complete implementation guide
- See `BACKEND_REASONING_STREAMING_GUIDE.md` for technical reference
- See `BACKEND_FIX_DEPLOYMENT.md` for deployment procedures

---

### **Phase 2: Implement Approval/Deny Buttons (Frontend)**

#### **Step 2.1: Create Auto-Approval State Management**

**File**: `webview-ui/src/context/ExtensionStateContext.tsx`

Add to existing context:
```tsx
interface ExtensionStateContextValue {
  // ... existing fields
  
  // Auto-Approval Settings
  autoApprovalEnabled: boolean
  alwaysAllowReadOnly: boolean
  alwaysAllowWrite: boolean
  alwaysAllowExecute: boolean
  alwaysAllowBrowser: boolean
  writeDelayMs: number
  
  // Approval State
  clineAsk: string | undefined
  enableButtons: boolean
  primaryButtonText: string | undefined
  secondaryButtonText: string | undefined
}
```

#### **Step 2.2: Add Approval Buttons to ChatTextArea**

**File**: `webview-ui/src/components/Chat/ChatTextArea.tsx`

Add button section above input area:
```tsx
{/* Approval Buttons */}
{enableButtons && (primaryButtonText || secondaryButtonText) && (
  <div className="chat-approval-buttons" style={{
    display: 'flex',
    gap: '8px',
    padding: '12px 16px',
    borderTop: '1px solid var(--vscode-panel-border)',
    backgroundColor: 'var(--vscode-editor-background)'
  }}>
    {primaryButtonText && (
      <button
        className="chat-approval-button-primary"
        disabled={!enableButtons}
        onClick={handleApprove}
        style={{
          flex: 1,
          padding: '8px 16px',
          backgroundColor: 'var(--vscode-button-background)',
          color: 'var(--vscode-button-foreground)',
          border: 'none',
          borderRadius: '2px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: '500'
        }}>
        {primaryButtonText}
      </button>
    )}
    {secondaryButtonText && (
      <button
        className="chat-approval-button-secondary"
        disabled={!enableButtons}
        onClick={handleDeny}
        style={{
          flex: 1,
          padding: '8px 16px',
          backgroundColor: 'var(--vscode-button-secondaryBackground)',
          color: 'var(--vscode-button-secondaryForeground)',
          border: '1px solid var(--vscode-button-border)',
          borderRadius: '2px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: '500'
        }}>
        {secondaryButtonText}
      </button>
    )}
  </div>
)}
```

#### **Step 2.3: Add Approval Message Handlers**

**File**: `src/core/ConversationTask.js`

Add approval state management:
```javascript
/**
 * Handle approval request from AI
 * @param {string} askType - Type of approval: 'tool', 'command', 'browser_action_launch'
 * @param {object} data - Approval data (tool info, command, etc.)
 */
handleApprovalRequest(askType, data) {
    console.log(`🔔 [ConversationTask] Approval request: ${askType}`, data);
    
    // Emit to sidebar for UI update
    this.emit('approvalRequest', this.taskId, {
        type: askType,
        data: data,
        timestamp: new Date().toISOString()
    });
}

/**
 * Send approval response to backend
 * @param {boolean} approved - true = approve, false = deny
 * @param {string} text - Optional feedback text
 * @param {Array} images - Optional feedback images
 */
async sendApprovalResponse(approved, text = '', images = []) {
    console.log(`✅ [ConversationTask] Approval response: ${approved ? 'APPROVED' : 'DENIED'}`);
    
    // Send to backend via API
    const response = await fetch(`${this.apiUrl}/api/method/ai_assistant.api.approval_response`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': this.sessionCookies
        },
        body: JSON.stringify({
            task_id: this.taskId,
            approved: approved,
            text: text,
            images: images
        })
    });
    
    const result = await response.json();
    console.log('📬 [ConversationTask] Approval response sent:', result);
    
    // Clear approval state in UI
    this.emit('approvalComplete', this.taskId);
}
```

#### **Step 2.4: Create Auto-Approval Toggle Component**

**File**: `webview-ui/src/components/Chat/AutoApprovalToggle.tsx`

```tsx
import React, { useState } from 'react';
import { vscode } from '@/utils/vscode';

interface AutoApprovalToggleProps {
  autoApprovalEnabled: boolean;
  alwaysAllowReadOnly: boolean;
  alwaysAllowWrite: boolean;
  alwaysAllowExecute: boolean;
  alwaysAllowBrowser: boolean;
}

export const AutoApprovalToggle: React.FC<AutoApprovalToggleProps> = ({
  autoApprovalEnabled,
  alwaysAllowReadOnly,
  alwaysAllowWrite,
  alwaysAllowExecute,
  alwaysAllowBrowser
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const toggleSetting = (key: string, value: boolean) => {
    vscode.postMessage({ type: key, bool: value });
  };
  
  const enabledCount = [
    alwaysAllowReadOnly,
    alwaysAllowWrite,
    alwaysAllowExecute,
    alwaysAllowBrowser
  ].filter(Boolean).length;
  
  return (
    <div className="auto-approval-toggle">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="auto-approval-trigger"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 8px',
          backgroundColor: autoApprovalEnabled 
            ? 'var(--vscode-button-background)' 
            : 'transparent',
          color: autoApprovalEnabled 
            ? 'var(--vscode-button-foreground)' 
            : 'var(--vscode-foreground)',
          border: '1px solid var(--vscode-button-border)',
          borderRadius: '3px',
          cursor: 'pointer',
          fontSize: '12px'
        }}>
        <span className="codicon codicon-check-all"></span>
        <span>Auto-Approve ({enabledCount})</span>
      </button>
      
      {isOpen && (
        <div className="auto-approval-dropdown" style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '4px',
          padding: '8px',
          backgroundColor: 'var(--vscode-dropdown-background)',
          border: '1px solid var(--vscode-dropdown-border)',
          borderRadius: '3px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          minWidth: '200px',
          zIndex: 1000
        }}>
          <div style={{ marginBottom: '8px', fontWeight: 'bold', fontSize: '12px' }}>
            Auto-Approve Settings
          </div>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <input 
              type="checkbox" 
              checked={alwaysAllowReadOnly}
              onChange={(e) => toggleSetting('alwaysAllowReadOnly', e.target.checked)}
            />
            <span className="codicon codicon-file-text"></span>
            <span>Read Files</span>
          </label>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <input 
              type="checkbox" 
              checked={alwaysAllowWrite}
              onChange={(e) => toggleSetting('alwaysAllowWrite', e.target.checked)}
            />
            <span className="codicon codicon-edit"></span>
            <span>Write Files</span>
          </label>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <input 
              type="checkbox" 
              checked={alwaysAllowExecute}
              onChange={(e) => toggleSetting('alwaysAllowExecute', e.target.checked)}
            />
            <span className="codicon codicon-terminal"></span>
            <span>Execute Commands</span>
          </label>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input 
              type="checkbox" 
              checked={alwaysAllowBrowser}
              onChange={(e) => toggleSetting('alwaysAllowBrowser', e.target.checked)}
            />
            <span className="codicon codicon-globe"></span>
            <span>Browser Actions</span>
          </label>
        </div>
      )}
    </div>
  );
};
```

---

### **Phase 3: Wire Up Backend Approval System**

#### **Step 3.1: Create Approval Response Endpoint**

**File**: `ai_assistant/api/__init__.py`

```python
@frappe.whitelist(allow_guest=False)
def approval_response(task_id, approved, text='', images=None):
    """
    Handle approval/denial response from VSCode extension
    
    Args:
        task_id: Conversation task ID
        approved: Boolean - True = approved, False = denied
        text: Optional feedback text
        images: Optional feedback images
    
    Returns:
        Success/failure status
    """
    try:
        user = frappe.session.user
        
        # Store approval response in cache for task to pick up
        cache_key = f"approval_response_{task_id}"
        frappe.cache().set_value(
            cache_key,
            {
                'approved': approved,
                'text': text,
                'images': images or [],
                'timestamp': frappe.utils.now()
            },
            expires_in_sec=300  # 5 minutes
        )
        
        # Emit WebSocket event to notify task
        frappe.publish_realtime(
            event='approval_response',
            message={
                'task_id': task_id,
                'approved': approved,
                'text': text
            },
            user=user
        )
        
        frappe.logger().info(f"Approval response recorded: task_id={task_id}, approved={approved}")
        
        return {
            'success': True,
            'message': 'Approval response recorded'
        }
        
    except Exception as e:
        frappe.logger().error(f"Approval response error: {str(e)}")
        import traceback
        frappe.logger().error(traceback.format_exc())
        return {
            'success': False,
            'error': str(e)
        }
```

#### **Step 3.2: Emit Approval Requests from Backend**

**File**: `ai_assistant/core/tool_manager.py` (or wherever tool execution happens)

```python
def request_tool_approval(tool_name, tool_params, task_id):
    """
    Request approval from VSCode extension before executing tool
    
    Args:
        tool_name: Name of the tool (e.g., 'create_file', 'run_command')
        tool_params: Tool parameters
        task_id: Conversation task ID
    
    Returns:
        Boolean: True if approved, False if denied
    """
    user = frappe.session.user
    
    # Emit approval request via WebSocket
    frappe.publish_realtime(
        event='ai_progress',
        message={
            'type': 'ask',
            'ask': 'tool',
            'task_id': task_id,
            'tool': tool_name,
            'params': tool_params,
            'timestamp': frappe.utils.now()
        },
        user=user
    )
    frappe.db.commit()
    
    frappe.logger().info(f"Tool approval requested: {tool_name} for task {task_id}")
    
    # Wait for approval response (with timeout)
    cache_key = f"approval_response_{task_id}"
    timeout = 300  # 5 minutes
    start_time = time.time()
    
    while True:
        # Check cache for response
        response = frappe.cache().get_value(cache_key)
        if response:
            # Clear cache
            frappe.cache().delete_value(cache_key)
            return response.get('approved', False)
        
        # Timeout check
        if time.time() - start_time > timeout:
            frappe.logger().warning(f"Approval timeout for task {task_id}")
            return False
        
        # Small sleep to avoid busy waiting
        time.sleep(0.5)
```

---

### **Phase 4: Testing & Validation**

#### **Test Checklist**

**Backend Streaming**:
- [ ] Send AI message in VSCode
- [ ] Verify backend logs show `[WebSocket] 💭 REASONING emitted`
- [ ] Verify browser console shows `ai_progress` events
- [ ] Verify thinking indicator appears with live timer

**Approval Buttons**:
- [ ] AI requests to create file
- [ ] Approval buttons appear: "Approve" (primary) | "Deny" (secondary)
- [ ] Click "Approve" → File created
- [ ] Click "Deny" → File not created, task continues

**Auto-Approval**:
- [ ] Enable "Auto-Approve Read Files"
- [ ] AI reads file without asking
- [ ] Disable toggle → AI asks for approval

**Message Duplication**:
- [ ] Send user message
- [ ] Verify message appears ONCE (not twice)
- [ ] Fixed in v3.7.1 ✅

---

## 📁 File Structure

```
oropendola/
├── src/
│   ├── core/
│   │   ├── ConversationTask.js         [✅ Add approval handling]
│   │   ├── RealtimeManager.js          [✅ Already ready]
│   │   └── task-persistence/
│   │       └── taskMessages.js         [✅ Already has 'ask' type]
│   │
│   └── sidebar/
│       └── sidebar-provider.js         [✅ Fixed message duplication]
│
├── webview-ui/src/
│   ├── components/
│   │   └── Chat/
│   │       ├── ChatRow.tsx             [✅ Already has reasoning case]
│   │       ├── ChatTextArea.tsx        [❌ Add approval buttons]
│   │       ├── ReasoningBlock.tsx      [✅ Already complete]
│   │       └── AutoApprovalToggle.tsx  [❌ CREATE NEW]
│   │
│   └── context/
│       └── ExtensionStateContext.tsx   [❌ Add approval state]
│
└── backend/ (ai_assistant/)
    ├── api/
    │   └── __init__.py                 [🔴 FIX: Add streaming]
    │
    └── core/
        └── tool_manager.py             [❌ Add approval requests]
```

---

## 🚀 Deployment Sequence

### **Step 1: Backend Streaming Fix (10 minutes)**
```bash
# 1. Update code
cd ~/frappe-bench/apps/ai_assistant
nano ai_assistant/api/__init__.py  # Replace _generate_cloud_response()

# 2. Test locally
bench restart
# Send test message, watch logs
tail -f ~/frappe-bench/logs/worker.error.log | grep "websocket"

# 3. Deploy to production
git add ai_assistant/api/__init__.py
git commit -m "feat: Add WebSocket streaming to chat_completion"
bench update --apps ai_assistant
bench restart
```

**Expected Output**:
```
[WebSocket] 💭 REASONING emitted: 45 chars
[WebSocket] 📝 TEXT emitted: 128 chars
[WebSocket] ✅ COMPLETION emitted
```

### **Step 2: Frontend Approval Buttons (30 minutes)**
```bash
# 1. Create AutoApprovalToggle component
cd /Users/sammishthundiyil/oropendola
touch webview-ui/src/components/Chat/AutoApprovalToggle.tsx

# 2. Update ChatTextArea with approval buttons
# 3. Update ExtensionStateContext with approval state
# 4. Update ConversationTask with approval handlers

# 5. Build
npm run build

# 6. Package
vsce package

# 7. Install
code --install-extension oropendola-ai-assistant-3.7.2.vsix
```

### **Step 3: Backend Approval System (20 minutes)**
```bash
# 1. Create approval response endpoint
# 2. Update tool_manager with approval requests
# 3. Deploy
bench restart
```

### **Step 4: Integration Testing (15 minutes)**
```bash
# Test Case 1: Thinking Indicator
# - Send: "Design a REST API for user management"
# - Expected: 💡 Thinking 0s → 1s → 2s → Response appears

# Test Case 2: Approval Buttons
# - Send: "Create a file called test.js with console.log"
# - Expected: Approval buttons appear
# - Click "Approve" → File created
# - Click "Deny" → Task continues without file

# Test Case 3: Auto-Approval
# - Enable "Auto-Approve Read Files"
# - Send: "Read the README.md file"
# - Expected: File read automatically without approval

# Test Case 4: Message Duplication
# - Send any message
# - Expected: Message appears ONCE (already fixed in v3.7.1)
```

---

## 🎨 UI/UX Guidelines

### **Thinking Indicator**
- **Icon**: Lightbulb (💡)
- **Text**: "Thinking Xs" (updates every second)
- **Behavior**: 
  - Appears when `type: 'reasoning'` events received
  - Timer starts at 0s
  - Increments every 1 second
  - Disappears when `type: 'completion'` received
  - Collapsible (click to expand/collapse reasoning text)

### **Approval Buttons**
- **Primary Button** ("Approve"):
  - Blue background (`var(--vscode-button-background)`)
  - White text (`var(--vscode-button-foreground)`)
  - Full width (50%)
- **Secondary Button** ("Deny"):
  - Gray background (`var(--vscode-button-secondaryBackground)`)
  - Gray text (`var(--vscode-button-secondaryForeground)`)
  - Border (`var(--vscode-button-border)`)
  - Full width (50%)
- **Position**: Above input area, below chat messages
- **Behavior**:
  - Appear when AI requests approval
  - Disabled during auto-approval countdown
  - Disappear after user responds

### **Auto-Approval Toggle**
- **Icon**: Check-all icon (✅)
- **Text**: "Auto-Approve (X)" where X = enabled count
- **Position**: Top-right corner of chat input area
- **Dropdown Items**:
  1. 📄 Read Files
  2. ✏️ Write Files
  3. 💻 Execute Commands
  4. 🌐 Browser Actions
- **Behavior**:
  - Click to open dropdown
  - Checkboxes for each permission
  - Changes saved immediately

---

## 📝 Success Criteria

### **Thinking Indicator**
✅ Thinking indicator appears when AI starts reasoning  
✅ Timer increments every second (0s → 1s → 2s → ...)  
✅ Indicator disappears when AI finishes thinking  
✅ Reasoning text displays progressively (partial updates)  
✅ Collapsible UI works (click to expand/collapse)  

### **Approval Buttons**
✅ Buttons appear when AI requests tool approval  
✅ "Approve" button creates/executes requested action  
✅ "Deny" button cancels action and continues task  
✅ Buttons disappear after user responds  
✅ Auto-approval works with configurable delay (2s default)  

### **Auto-Approval Toggles**
✅ Toggles appear in chat input area  
✅ Each toggle (read/write/execute/browser) works independently  
✅ Auto-approved actions skip approval buttons  
✅ Disabled toggles show approval buttons  
✅ Settings persist across sessions  

### **Message Duplication**
✅ User messages appear ONCE (not twice)  
✅ Fixed in v3.7.1 (already deployed)  

---

## 🔗 References

**Roo-Code Source Files**:
- `webview-ui/src/components/chat/ChatView.tsx` (lines 1551-1686, 1935-1961)
- `webview-ui/src/components/chat/AutoApproveDropdown.tsx` (lines 0-297)
- `webview-ui/src/components/chat/ReasoningBlock.tsx` (lines 0-61)
- `webview-ui/src/components/chat/ChatRow.tsx` (lines 1008-1044)
- `src/core/task/Task.ts` (lines 1958-2300)
- `src/api/providers/anthropic.ts` (streaming implementation)

**Oropendola Documentation**:
- `BACKEND_FIX_URGENT.md` (Quick streaming fix guide)
- `BACKEND_REASONING_STREAMING_GUIDE.md` (Complete technical reference)
- `BACKEND_FIX_DEPLOYMENT.md` (Deployment procedures)

**Testing Resources**:
- Browser Console: Check `ai_progress` events
- Backend Logs: `tail -f ~/frappe-bench/logs/worker.error.log | grep "websocket"`
- VSCode UI: Verify thinking indicator and approval buttons

---

## ⚠️ Critical Notes

1. **Backend Streaming is BLOCKING**: Nothing will work until `gateway.stream_generate()` is implemented
2. **frappe.db.commit() is MANDATORY**: Without it, WebSocket events are delayed/buffered
3. **Auto-Approval Timeout**: Write operations have 2-second delay by default (configurable)
4. **Error Handling**: Always wrap WebSocket emissions in try/except (graceful degradation)
5. **Message Duplication**: Already fixed in v3.7.1 - don't revert sidebar-provider.js changes

---

## 📊 Estimated Timeline

| Phase | Task | Duration | Priority |
|-------|------|----------|----------|
| 1 | Backend streaming fix | 10 min | 🔴 CRITICAL |
| 2 | Frontend approval buttons | 30 min | 🟡 HIGH |
| 3 | Backend approval system | 20 min | 🟡 HIGH |
| 4 | Auto-approval toggles | 20 min | 🟢 MEDIUM |
| 5 | Integration testing | 15 min | 🟡 HIGH |
| **TOTAL** | | **95 minutes** | |

---

**Status**: Ready for implementation  
**Next Step**: Send `BACKEND_FIX_URGENT.md` to backend team  
**Blocking Issue**: Backend streaming (Phase 1)  
**Frontend Ready**: 100% (ReasoningBlock, WebSocket listeners, ChatRow)
