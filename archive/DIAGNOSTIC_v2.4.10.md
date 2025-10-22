# 🔍 Diagnostic Version 2.4.10 - Event Flow Analysis

## Overview

**v2.4.10** is a diagnostic build with comprehensive logging to identify where backend streaming events are being lost in the event chain.

---

## 🎯 Purpose

User reported two critical issues in v2.4.9:
1. **"Indicator still missing"** - Backend streaming events (`understanding`, `processing`, `thinking`, etc.) not appearing in UI
2. **"Backend not updating completed task"** - TODOs stuck in "Pending" status in Frappe database

This version adds detailed logging to trace events from:
```
Backend Socket.IO → RealtimeManager → ConversationTask → Sidebar → Webview → handleAIProgress → UI
```

---

## 📦 Installation

```bash
# 1. Uninstall old version
code --uninstall-extension oropendola.oropendola-ai-assistant

# 2. CLOSE ALL VS CODE WINDOWS (CRITICAL!)
# Mac: Cmd+Q
# Windows/Linux: Close all windows

# 3. Install v2.4.10 DIAGNOSTIC
code --install-extension oropendola-ai-assistant-2.4.10.vsix

# 4. Reopen VS Code and reload window
# Press Cmd+Shift+P → "Developer: Reload Window"
```

---

## 🔬 What's Different in v2.4.10

### 1. Enhanced Sidebar Logging (Lines 2062-2095)

**Before (v2.4.9)**:
```javascript
task.on('aiProgress', (taskId, progressData) => {
    console.log(`📊 [Sidebar] AI Progress [${progressData.type}]:`, progressData.message || '');
    // ... forward to webview
});
```

**After (v2.4.10)**:
```javascript
task.on('aiProgress', (taskId, progressData) => {
    console.log('🔥🔥🔥 [Sidebar] ========== AI PROGRESS EVENT RECEIVED ==========');
    console.log(`📊 [Sidebar] Task ID: ${taskId}`);
    console.log(`📊 [Sidebar] Event Type: ${progressData.type}`);
    console.log(`📊 [Sidebar] Message: ${progressData.message || '(no message)'}`);
    console.log(`📊 [Sidebar] Full data:`, JSON.stringify(progressData, null, 2));
    console.log(`📊 [Sidebar] Webview exists: ${!!this._view}`);

    if (this._view) {
        console.log('🔥 [Sidebar] Forwarding event to webview...');
        this._view.webview.postMessage({
            type: 'aiProgress',
            taskId: taskId,
            data: progressData
        });
        console.log('🔥 [Sidebar] Event forwarded to webview successfully');
    } else {
        console.error('❌ [Sidebar] Cannot forward event - webview does not exist!');
    }
    console.log('🔥🔥🔥 [Sidebar] ========== AI PROGRESS EVENT COMPLETE ==========');
});
```

### 2. Enhanced Webview Message Reception (Line 3883)

**Before (v2.4.9)**:
```javascript
case "aiProgress": handleAIProgress(message.data); break;
```

**After (v2.4.10)**:
```javascript
case "aiProgress":
    console.log("🔥🔥🔥 [WEBVIEW] ========== RECEIVED AIPROGRESS MESSAGE ==========");
    console.log("[WEBVIEW] Message type:", message.data.type);
    console.log("[WEBVIEW] Message data:", JSON.stringify(message.data, null, 2));
    handleAIProgress(message.data);
    console.log("🔥 [WEBVIEW] handleAIProgress called");
    break;
```

### 3. handleAIProgress Logging (Already Present in v2.4.9)

Already had comprehensive logging for each event type:
- `understanding`, `processing`, `thinking`, `plan`
- `executionStart`, `toolExecutionStart`, `toolExecutionComplete`, `executionComplete`
- `complete`, `error`

---

## 🧪 Testing Instructions

### Step 1: Open Developer Console

1. Open Oropendola sidebar
2. Right-click in the chat area → **"Inspect Element"**
3. Go to **Console** tab
4. Clear console (`Cmd+K` or click clear icon)

### Step 2: Send Test Message

Send a simple message like:
```
create simple app
```

### Step 3: Monitor Console Output

Look for the **complete event flow**:

#### ✅ Expected Flow (if working):

```
🔥🔥🔥 [RealtimeManager] ========== AI_PROGRESS EVENT RECEIVED ==========
📊 [RealtimeManager] Event type: understanding
📊 [RealtimeManager] Full data: {...}
🔥 [RealtimeManager] Emitting ai_progress to listeners

🔥🔥🔥 [ConversationTask] ========== RECEIVED AI_PROGRESS FROM REALTIME MANAGER ==========
📊 [ConversationTask task_1_xxxxx] AI Progress [understanding]: Analyzing request...
🔥 [ConversationTask] Emitting aiProgress to sidebar...

🔥🔥🔥 [Sidebar] ========== AI PROGRESS EVENT RECEIVED ==========
📊 [Sidebar] Task ID: task_1_xxxxx
📊 [Sidebar] Event Type: understanding
📊 [Sidebar] Message: Analyzing request...
📊 [Sidebar] Full data: {...}
📊 [Sidebar] Webview exists: true
🔥 [Sidebar] Forwarding event to webview...
🔥 [Sidebar] Event forwarded to webview successfully

🔥🔥🔥 [WEBVIEW] ========== RECEIVED AIPROGRESS MESSAGE ==========
[WEBVIEW] Message type: understanding
[WEBVIEW] Message data: {...}
🔥 [WEBVIEW] handleAIProgress called
🔔 [AI Progress] Received event: understanding
🔍 Understanding request
```

#### ❌ If Events Stop at RealtimeManager:

```
🔥🔥🔥 [RealtimeManager] ========== AI_PROGRESS EVENT RECEIVED ==========
📊 [RealtimeManager] Event type: understanding
🔥 [RealtimeManager] Emitting ai_progress to listeners

❌ NO ConversationTask logs appear
```

**Diagnosis**: ConversationTask not listening to RealtimeManager events
**Backend Action**: None needed
**Frontend Fix**: Check ConversationTask event listener setup

#### ❌ If Events Stop at ConversationTask:

```
🔥🔥🔥 [ConversationTask] ========== RECEIVED AI_PROGRESS FROM REALTIME MANAGER ==========
📊 [ConversationTask task_1_xxxxx] AI Progress [understanding]: Analyzing request...
🔥 [ConversationTask] Emitting aiProgress to sidebar...

❌ NO Sidebar logs appear
```

**Diagnosis**: Sidebar not listening to ConversationTask events
**Backend Action**: None needed
**Frontend Fix**: Check `_setupTaskEventListeners` in sidebar-provider.js

#### ❌ If Events Stop at Sidebar:

```
🔥🔥🔥 [Sidebar] ========== AI PROGRESS EVENT RECEIVED ==========
📊 [Sidebar] Webview exists: false
❌ [Sidebar] Cannot forward event - webview does not exist!
```

**Diagnosis**: Webview not initialized or destroyed
**Backend Action**: None needed
**Frontend Fix**: Check webview lifecycle

#### ❌ If Events Stop at Webview:

```
🔥 [Sidebar] Event forwarded to webview successfully

❌ NO WEBVIEW logs appear
```

**Diagnosis**: Webview message handler not receiving events
**Backend Action**: None needed
**Frontend Fix**: Check CSP, webview message passing

#### ❌ If Events Reach Webview but Don't Display:

```
🔥🔥🔥 [WEBVIEW] ========== RECEIVED AIPROGRESS MESSAGE ==========
[WEBVIEW] Message type: understanding
🔥 [WEBVIEW] handleAIProgress called
🔔 [AI Progress] Received event: understanding

❌ But nothing appears in UI
```

**Diagnosis**: `handleAIProgress` logic or UI rendering broken
**Backend Action**: None needed
**Frontend Fix**: Check `showProgressMessage`, DOM manipulation

---

## 🔍 What to Look For

### Scenario A: No Backend Events at All

**Console shows**:
```
❌ No [RealtimeManager] logs
❌ No [ConversationTask] logs
❌ No [Sidebar] logs
```

**Diagnosis**: Backend not sending events OR WebSocket not connected
**Backend Action**:
- Check if Socket.IO emitting `ai_progress` events
- Verify conversation task created in Frappe
- Confirm WebSocket connection established

**Frontend Action**: None needed (already listening correctly)

### Scenario B: Events Reach RealtimeManager but Stop

**Console shows**:
```
✅ [RealtimeManager] logs present
❌ [ConversationTask] logs missing
```

**Diagnosis**: Event listener not attached or task not initialized
**Backend Action**: None needed
**Frontend Action**: Check ConversationTask instantiation in sidebar-provider.js line 2375

### Scenario C: Events Reach ConversationTask but Stop

**Console shows**:
```
✅ [RealtimeManager] logs present
✅ [ConversationTask] logs present
❌ [Sidebar] logs missing
```

**Diagnosis**: `aiProgress` event listener not attached to task
**Backend Action**: None needed
**Frontend Action**: Verify `_setupTaskEventListeners` called at line 2385

### Scenario D: Events Reach Sidebar but Stop

**Console shows**:
```
✅ [Sidebar] Webview exists: false
```

**Diagnosis**: Webview not ready when events arrive
**Backend Action**: None needed
**Frontend Action**: Check webview initialization timing

### Scenario E: Events Reach Webview but Don't Display

**Console shows**:
```
✅ [WEBVIEW] RECEIVED AIPROGRESS MESSAGE
✅ [AI Progress] Received event: understanding
❌ But no visible UI update
```

**Diagnosis**: DOM manipulation failing or CSS hiding elements
**Backend Action**: None needed
**Frontend Action**: Check `showProgressMessage`, `showProgressStep` functions

---

## 📊 TODO Status Updates - Separate Issue

### Current Behavior

1. **Frontend**: Creates TODOs, displays them, updates status locally via `updateTodoStatus()`
2. **Backend**: Creates TODO records in Frappe database with "Pending" status
3. **Problem**: When tools complete, backend doesn't update TODO status from "Pending" to "Completed"

### Root Cause

**Two possible issues**:

1. **Backend not listening for completion events**:
   - Frontend sends `toolExecutionComplete` with `todo_id`
   - Backend may not have handler to update Frappe TODO records

2. **Frontend not calling backend API**:
   - Frontend updates TODOs locally only
   - No API call to backend to persist status change

### Backend Requirements

Backend needs to implement ONE of these approaches:

#### Approach A: Listen to WebSocket Events (Recommended)

Backend should listen for `toolExecutionComplete` events and update Frappe TODOs:

```python
# In backend event handler
def handle_tool_execution_complete(data):
    todo_id = data.get('todo_id')
    success = data.get('success', True)

    if todo_id:
        # Update Frappe TODO record
        frappe.db.set_value('AI TODO', todo_id, {
            'status': 'Completed' if success else 'Failed',
            'completed_at': frappe.utils.now()
        })
        frappe.db.commit()
```

#### Approach B: REST API Endpoint (Alternative)

Provide REST API endpoint for frontend to call:

```python
# Backend endpoint
@frappe.whitelist()
def update_todo_status(todo_id, status):
    frappe.db.set_value('AI TODO', todo_id, 'status', status)
    frappe.db.commit()
    return {'success': True}
```

Frontend would call:
```javascript
// In updateTodoStatus function
fetch(`${apiUrl}/api/method/update_todo_status`, {
    method: 'POST',
    body: JSON.stringify({ todo_id: todoId, status: status })
});
```

### Recommended Solution

**Use Approach A (WebSocket)** because:
- Backend already receives all events via Socket.IO
- No additional API calls needed
- Automatic synchronization
- Real-time updates

---

## 📝 Summary for User

After installing v2.4.10, please:

### 1. Test with Diagnostic Logging

1. Install v2.4.10
2. Open Developer Console (right-click → Inspect Element)
3. Send test message
4. **Copy ALL console logs**
5. Share logs with me

### 2. What to Report

Based on console logs, tell me which scenario matches:

- **Scenario A**: No backend events at all → Backend issue (you fix)
- **Scenario B-E**: Events stop at specific point → Frontend issue (I fix)

### 3. TODO Status Issue - Backend Fix Needed

For TODOs stuck in "Pending" status:

**Backend needs to add**:
```python
# Listen for toolExecutionComplete events
# Update Frappe TODO records when tools complete
# Set status to 'Completed' and completed_at timestamp
```

I can provide exact code if you share your backend event handler structure.

---

## 🚀 Build Information

- **Version**: 2.4.10 (DIAGNOSTIC)
- **File Size**: 3.86 MB
- **Total Files**: 1,353
- **Purpose**: Trace event flow, identify bottleneck
- **Changes**: Enhanced logging only (no logic changes)

---

## 🔄 Next Steps

1. **User installs v2.4.10**
2. **User sends console logs** showing where events stop
3. **I analyze logs** and determine:
   - Backend issue (user fixes) OR
   - Frontend issue (I fix in v2.4.11)
4. **User implements TODO status handler** in backend
5. **Final fix released** as v2.5.0

---

## 📞 Support

For questions or to share diagnostic results:
- Email: support@oropendola.ai
- GitHub: https://github.com/codfatherlogic/oropendola-ai/issues

---

**Built**: October 22, 2025
**Focus**: Event flow diagnostics + TODO backend requirements
