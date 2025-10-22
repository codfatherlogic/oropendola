# 🔧 Backend Requirements - TODO Status Updates

## Problem Statement

**Current Behavior**:
- ✅ Frontend creates TODOs and displays them in UI
- ✅ Backend creates TODO records in Frappe database
- ❌ **When tools complete, Frappe TODOs stay "Pending"** instead of updating to "Completed"

**User's Screenshot Evidence** (from v2.4.9):
```
Frontend UI:           Backend Frappe:
TASKS (2 ACTIVE)      TODO Status: Pending
- Task 1 ✓            TODO Status: Pending  ← PROBLEM!
- Task 2 ✓            TODO Status: Pending  ← PROBLEM!
```

---

## Root Cause Analysis

### Current Implementation

1. **Frontend** ([sidebar-provider.js](src/sidebar/sidebar-provider.js)):
   - Creates TODOs from AI response (line 2006)
   - Displays TODOs in webview (line 2029)
   - Updates TODO status locally via `updateTodoStatus()` (line 1876, 1890)
   - Sends `updateTodoStatus` message to webview (line 1875-1879, 1887-1894)

2. **Backend** (Frappe):
   - Creates TODO records in database when conversation starts
   - Sets initial status to "Pending"
   - **Does NOT listen for completion events** ← THIS IS THE PROBLEM

### What's Missing

Backend needs to **listen for tool completion events** and **update Frappe TODO records** accordingly.

---

## Solution: Backend Event Handler

### Recommended Approach: WebSocket Event Handler

Backend should listen to `toolExecutionComplete` events that frontend already sends.

#### Step 1: Identify Where Backend Receives Events

Your backend documentation shows you emit these events:
```python
# Backend sends TO frontend
socketio.emit('ai_progress', {
    'type': 'toolExecutionStart',
    'todo_id': todo_id,
    'message': 'Creating file...'
})

socketio.emit('ai_progress', {
    'type': 'toolExecutionComplete',
    'todo_id': todo_id,
    'success': True,
    'message': 'File created'
})
```

#### Step 2: Add Handler for Completion Events

Backend should also **LISTEN** to these events (not just emit them):

```python
# In your backend Socket.IO handler
@socketio.on('ai_progress')
def handle_ai_progress_from_frontend(data):
    """
    Listen for progress events from frontend
    (e.g., when frontend-side tools complete)
    """
    event_type = data.get('type')
    todo_id = data.get('todo_id')

    if event_type == 'toolExecutionComplete' and todo_id:
        success = data.get('success', True)
        update_todo_status(todo_id, success)


def update_todo_status(todo_id, success=True):
    """
    Update Frappe TODO record status
    """
    try:
        import frappe
        from frappe.utils import now

        # Get TODO record
        todo = frappe.get_doc('AI TODO', todo_id)

        if success:
            # Mark as completed
            todo.status = 'Completed'
            todo.completed_at = now()
            print(f"✅ [Backend] Updated TODO {todo_id} to Completed")
        else:
            # Mark as failed
            todo.status = 'Failed'
            todo.failed_at = now()
            print(f"❌ [Backend] Updated TODO {todo_id} to Failed")

        todo.save()
        frappe.db.commit()

    except Exception as e:
        print(f"❌ [Backend] Error updating TODO {todo_id}: {str(e)}")
        import traceback
        traceback.print_exc()
```

---

## Alternative Approach: REST API Endpoint

If WebSocket handler is difficult to implement, provide a REST API endpoint:

### Backend Endpoint

```python
# In your Frappe app, add this method
@frappe.whitelist()
def update_todo_status(todo_id, status):
    """
    REST API endpoint to update TODO status
    Method: POST
    URL: /api/method/your_app.api.update_todo_status
    Params:
        - todo_id: string (TODO record ID)
        - status: string ('completed', 'failed', 'in_progress')
    """
    try:
        from frappe.utils import now

        # Validate status
        valid_statuses = ['Pending', 'In Progress', 'Completed', 'Failed']
        status_map = {
            'pending': 'Pending',
            'in_progress': 'In Progress',
            'completed': 'Completed',
            'failed': 'Failed'
        }

        status_value = status_map.get(status.lower(), 'Pending')

        if status_value not in valid_statuses:
            return {
                'success': False,
                'error': f'Invalid status: {status}'
            }

        # Update TODO
        todo = frappe.get_doc('AI TODO', todo_id)
        todo.status = status_value

        if status_value == 'Completed':
            todo.completed_at = now()
        elif status_value == 'Failed':
            todo.failed_at = now()

        todo.save()
        frappe.db.commit()

        print(f"✅ [Backend API] Updated TODO {todo_id} to {status_value}")

        return {
            'success': True,
            'todo_id': todo_id,
            'status': status_value
        }

    except Exception as e:
        import traceback
        error_msg = str(e)
        print(f"❌ [Backend API] Error: {error_msg}")
        traceback.print_exc()

        return {
            'success': False,
            'error': error_msg
        }
```

### Frontend Changes (if using REST API)

I would update the frontend to call this API:

```javascript
// In sidebar-provider.js, line ~1890
task.on('toolExecutionComplete', async (_taskId, tool, _result, index, total) => {
    console.log(`✅ Tool ${tool.action} completed [${index + 1}/${total}]`);

    // Update todo item to completed
    if (this._view) {
        const todoId = `todo_${index}`;
        console.log(`📋 Updating ${todoId} to completed`);

        // Update UI
        this._view.webview.postMessage({
            type: 'updateTodoStatus',
            todoId: todoId,
            status: 'completed'
        });

        // Call backend API to persist
        try {
            const config = vscode.workspace.getConfiguration('oropendolaAI');
            const apiUrl = config.get('apiUrl');

            const response = await fetch(`${apiUrl}/api/method/your_app.api.update_todo_status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': this._sessionCookies
                },
                body: JSON.stringify({
                    todo_id: todoId,
                    status: 'completed'
                })
            });

            const result = await response.json();
            if (result.message?.success) {
                console.log(`✅ Backend TODO ${todoId} updated successfully`);
            } else {
                console.error(`❌ Backend TODO update failed:`, result);
            }
        } catch (apiError) {
            console.error(`❌ Error calling backend TODO API:`, apiError);
        }
    }
});
```

---

## Comparison: WebSocket vs REST API

| Aspect | WebSocket Handler | REST API |
|--------|-------------------|----------|
| **Complexity** | Medium (add handler) | Low (add endpoint) |
| **Performance** | Fast (already connected) | Slower (new HTTP request) |
| **Reliability** | High (event-driven) | Medium (depends on network) |
| **Debugging** | Harder (async events) | Easier (sync requests) |
| **Best For** | Real-time updates | Explicit status changes |

**Recommendation**: Use **WebSocket Handler** because:
- Backend already handles WebSocket events
- No additional HTTP overhead
- Automatic synchronization
- Matches existing architecture

---

## Implementation Steps

### If Using WebSocket Handler (Recommended):

1. **Add event handler** in backend Socket.IO code:
   ```python
   @socketio.on('ai_progress')
   def handle_ai_progress_from_frontend(data):
       # Handle toolExecutionComplete events
       # Update Frappe TODO records
   ```

2. **Test**: Send message in frontend, check Frappe database
3. **Verify**: TODO status changes from "Pending" to "Completed"

### If Using REST API:

1. **Add API endpoint** in Frappe app:
   ```python
   @frappe.whitelist()
   def update_todo_status(todo_id, status):
       # Update TODO record
   ```

2. **Share endpoint URL** with me (e.g., `/api/method/oropendola.api.update_todo_status`)
3. **I'll update frontend** to call this API
4. **Test together**

---

## Testing Plan

### Step 1: Backend Setup

Choose implementation approach (WebSocket or REST API).

### Step 2: Add Logging

Add verbose logging to confirm events received:

```python
def update_todo_status(todo_id, success=True):
    print(f"🔧 [TODO UPDATE] Starting update for {todo_id}")
    print(f"🔧 [TODO UPDATE] Success: {success}")

    # ... update code ...

    print(f"✅ [TODO UPDATE] Completed for {todo_id}")
```

### Step 3: Test Flow

1. User sends message: "create simple app"
2. Backend creates TODO records
3. Backend executes tools (e.g., create file)
4. Backend emits `toolExecutionComplete` event
5. **NEW**: Backend handler updates TODO status
6. Frappe database shows "Completed" status

### Step 4: Verify in Frappe

Query Frappe database:
```sql
SELECT name, status, completed_at
FROM `tabAI TODO`
WHERE conversation_id = 'xxx'
```

Should show:
```
| name    | status    | completed_at         |
|---------|-----------|----------------------|
| todo_1  | Completed | 2025-10-22 12:34:56 |
| todo_2  | Completed | 2025-10-22 12:34:58 |
```

---

## Expected Results

### Before Fix:
```
Frappe Database:
┌─────────┬──────────┬──────────────┐
│ name    │ status   │ completed_at │
├─────────┼──────────┼──────────────┤
│ todo_1  │ Pending  │ NULL         │
│ todo_2  │ Pending  │ NULL         │
└─────────┴──────────┴──────────────┘
```

### After Fix:
```
Frappe Database:
┌─────────┬───────────┬──────────────────────┐
│ name    │ status    │ completed_at         │
├─────────┼───────────┼──────────────────────┤
│ todo_1  │ Completed │ 2025-10-22 12:34:56 │
│ todo_2  │ Completed │ 2025-10-22 12:34:58 │
└─────────┴───────────┴──────────────────────┘
```

---

## Code Templates

### Template 1: WebSocket Handler (Python/Frappe)

```python
# In your Socket.IO event handlers

@socketio.on('ai_progress')
def handle_ai_progress_from_frontend(data):
    """
    Handle AI progress events from frontend
    Specifically handles toolExecutionComplete to update TODOs
    """
    try:
        event_type = data.get('type')
        print(f"📊 [Backend] Received ai_progress event: {event_type}")

        if event_type == 'toolExecutionComplete':
            todo_id = data.get('todo_id')
            success = data.get('success', True)

            print(f"🔧 [Backend] Tool completed - TODO ID: {todo_id}, Success: {success}")

            if todo_id:
                update_frappe_todo_status(todo_id, success)
            else:
                print(f"⚠️ [Backend] No todo_id in toolExecutionComplete event")

    except Exception as e:
        print(f"❌ [Backend] Error handling ai_progress: {str(e)}")
        import traceback
        traceback.print_exc()


def update_frappe_todo_status(todo_id, success=True):
    """
    Update Frappe AI TODO record status
    """
    try:
        import frappe
        from frappe.utils import now

        print(f"🔧 [Backend] Updating TODO {todo_id} in Frappe...")

        # Get TODO document
        if not frappe.db.exists('AI TODO', todo_id):
            print(f"⚠️ [Backend] TODO {todo_id} not found in database")
            return

        todo = frappe.get_doc('AI TODO', todo_id)

        # Update status
        if success:
            todo.status = 'Completed'
            todo.completed_at = now()
            print(f"✅ [Backend] Set TODO {todo_id} to Completed")
        else:
            todo.status = 'Failed'
            todo.failed_at = now()
            print(f"❌ [Backend] Set TODO {todo_id} to Failed")

        # Save changes
        todo.save()
        frappe.db.commit()

        print(f"💾 [Backend] TODO {todo_id} saved successfully")

    except Exception as e:
        print(f"❌ [Backend] Error updating TODO {todo_id}: {str(e)}")
        import traceback
        traceback.print_exc()
```

### Template 2: REST API Endpoint (Python/Frappe)

```python
# In your Frappe app's api.py

import frappe
from frappe.utils import now

@frappe.whitelist()
def update_todo_status(todo_id, status):
    """
    REST API endpoint to update AI TODO status

    Usage:
        POST /api/method/your_app.api.update_todo_status
        Body: {"todo_id": "todo_1", "status": "completed"}

    Returns:
        {"success": True, "todo_id": "todo_1", "status": "Completed"}
    """
    try:
        # Validate inputs
        if not todo_id:
            return {
                'success': False,
                'error': 'todo_id is required'
            }

        # Status mapping
        status_map = {
            'pending': 'Pending',
            'in_progress': 'In Progress',
            'completed': 'Completed',
            'failed': 'Failed'
        }

        status_value = status_map.get(status.lower(), 'Pending')

        print(f"🔧 [API] Updating TODO {todo_id} to {status_value}")

        # Check if TODO exists
        if not frappe.db.exists('AI TODO', todo_id):
            return {
                'success': False,
                'error': f'TODO {todo_id} not found'
            }

        # Get and update TODO
        todo = frappe.get_doc('AI TODO', todo_id)
        old_status = todo.status
        todo.status = status_value

        # Set timestamp fields
        if status_value == 'Completed' and not todo.completed_at:
            todo.completed_at = now()
        elif status_value == 'Failed' and not todo.failed_at:
            todo.failed_at = now()

        # Save
        todo.save()
        frappe.db.commit()

        print(f"✅ [API] TODO {todo_id} updated: {old_status} → {status_value}")

        return {
            'success': True,
            'todo_id': todo_id,
            'old_status': old_status,
            'new_status': status_value,
            'timestamp': todo.completed_at or todo.failed_at or now()
        }

    except Exception as e:
        import traceback
        error_msg = str(e)
        print(f"❌ [API] Error updating TODO: {error_msg}")
        traceback.print_exc()

        return {
            'success': False,
            'error': error_msg
        }
```

---

## Summary for User

### What You Need to Do:

1. **Choose approach**:
   - WebSocket handler (recommended) OR
   - REST API endpoint

2. **Implement handler/endpoint** using templates above

3. **Add logging** to verify events received

4. **Test** by sending a message and checking Frappe database

5. **Share results** with me:
   - Console logs showing handler called
   - Database screenshot showing status changed

### What I'll Do:

1. **If using WebSocket**: No frontend changes needed (already sends events)
2. **If using REST API**: I'll update frontend to call your endpoint
3. **Verify together** that TODOs update correctly

---

## Questions?

If you need help with:
- Where to add this code in your backend
- How to structure the event handler
- Debugging why events aren't received
- Frontend changes for REST API approach

**Just share**:
- Your backend event handler code (where you emit `ai_progress` events)
- Your Frappe app structure
- Any error messages you see

I can provide more specific guidance!

---

**Document**: Backend TODO Requirements v2.4.10
**Date**: October 22, 2025
**Purpose**: Enable backend to update Frappe TODO status when tools complete
