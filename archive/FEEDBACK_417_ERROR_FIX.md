# 🔧 Fix for 417 Error: "Document has been modified"

## Problem

When clicking Accept/Reject buttons, you see:
```
⚠️ Backend error: Error: Document has been modified after you have opened it
⚠️ Could not send feedback to backend: Request failed with status code 417
```

## Root Cause

The backend `message_feedback` API endpoint is trying to update the `AI Conversation` document's statistics (in the `update_conversation_stats()` function), but Frappe detects that the document has been modified since it was read, causing a **timestamp mismatch error (417)**.

This happens because:
1. Multiple feedback requests can arrive concurrently
2. Each one tries to update the same Conversation document
3. Frappe's ORM checks the `modified` timestamp to prevent data corruption
4. If timestamps don't match, it returns a 417 error

---

## Solution Options

### ✅ **Option 1: Skip Timestamp Check (Recommended)**

Modify the backend `update_conversation_stats()` function to bypass timestamp validation:

**File**: `ai_assistant/ai_assistant/api.py`

**Find this code:**
```python
def update_conversation_stats(conversation_id, feedback):
    """Update conversation statistics with feedback data"""
    try:
        # ... counts code ...
        
        # Update conversation document (if you have these fields)
        frappe.db.set_value('AI Conversation', conversation_id, {
            'total_feedbacks': total_feedback,
            'accepted_count': accepted_count,
            'acceptance_rate': acceptance_rate
        })
        
        frappe.db.commit()
```

**Replace with:**
```python
def update_conversation_stats(conversation_id, feedback):
    """Update conversation statistics with feedback data"""
    try:
        # Count total feedbacks for this conversation
        total_feedback = frappe.db.count('AI Message Feedback', {
            'conversation': conversation_id
        })
        
        # Count accepted feedbacks
        accepted_count = frappe.db.count('AI Message Feedback', {
            'conversation': conversation_id,
            'feedback_type': 'accept'
        })
        
        # Calculate acceptance rate
        acceptance_rate = (accepted_count / total_feedback * 100) if total_feedback > 0 else 0
        
        # Update conversation document WITHOUT timestamp check
        frappe.db.set_value(
            'AI Conversation', 
            conversation_id, 
            {
                'total_feedbacks': total_feedback,
                'accepted_count': accepted_count,
                'acceptance_rate': acceptance_rate
            },
            update_modified=False  # ← KEY FIX: Don't update 'modified' timestamp
        )
        
        frappe.db.commit()
        
    except Exception as e:
        # Don't fail the main operation if stats update fails
        frappe.log_error(f"Stats Update Error: {str(e)}")
```

**Key change:** Added `update_modified=False` parameter to skip timestamp validation.

---

### ✅ **Option 2: Use Direct SQL (Most Reliable)**

Replace the entire `update_conversation_stats()` function:

```python
def update_conversation_stats(conversation_id, feedback):
    """Update conversation statistics with feedback data using direct SQL"""
    try:
        # Count feedbacks using SQL (faster and avoids ORM overhead)
        total_feedback = frappe.db.count('AI Message Feedback', {
            'conversation': conversation_id
        })
        
        accepted_count = frappe.db.count('AI Message Feedback', {
            'conversation': conversation_id,
            'feedback_type': 'accept'
        })
        
        acceptance_rate = (accepted_count / total_feedback * 100) if total_feedback > 0 else 0
        
        # Update using direct SQL - bypasses timestamp check completely
        frappe.db.sql("""
            UPDATE `tabAI Conversation`
            SET 
                total_feedbacks = %s,
                accepted_count = %s,
                acceptance_rate = %s
            WHERE name = %s
        """, (total_feedback, accepted_count, acceptance_rate, conversation_id))
        
        frappe.db.commit()
        
    except Exception as e:
        frappe.log_error(f"Stats Update Error: {str(e)}")
```

**Benefits:**
- ✅ No timestamp validation
- ✅ Faster performance
- ✅ Handles concurrent updates gracefully

---

### ✅ **Option 3: Disable Stats Update (Quick Fix)**

If you don't need statistics tracking right now, simply comment out the stats update:

**File**: `ai_assistant/ai_assistant/api.py`

**Find this code:**
```python
@frappe.whitelist(allow_guest=False)
def message_feedback(conversation_id, message_content, feedback):
    """Store user feedback for AI responses"""
    try:
        # ... validation code ...
        
        feedback_doc.insert(ignore_permissions=False)
        frappe.db.commit()
        
        # Optional: Update conversation statistics
        update_conversation_stats(conversation_id, feedback)  # ← COMMENT THIS OUT
```

**Replace with:**
```python
@frappe.whitelist(allow_guest=False)
def message_feedback(conversation_id, message_content, feedback):
    """Store user feedback for AI responses"""
    try:
        # ... validation code ...
        
        feedback_doc.insert(ignore_permissions=False)
        frappe.db.commit()
        
        # Optional: Update conversation statistics
        # update_conversation_stats(conversation_id, feedback)  # ← DISABLED FOR NOW
```

---

## How to Apply the Fix

### Step 1: Access Your Frappe Backend

```bash
# SSH into your server
ssh user@oropendola.ai

# Navigate to your bench
cd ~/frappe-bench

# Open the API file
nano apps/ai_assistant/ai_assistant/api.py
```

### Step 2: Apply One of the Fixes Above

Choose **Option 1** (recommended) or **Option 2** (most reliable).

### Step 3: Restart Frappe

```bash
bench restart
```

### Step 4: Test the Fix

1. Open VS Code
2. Open Oropendola AI sidebar
3. Send a message
4. Click **Accept** or **Reject**
5. Check console - should see:
   ```
   ✅ Feedback sent to backend
   ```
   **No more 417 errors!**

---

## Alternative: Frontend-Only Workaround

If you can't access the backend right now, you can suppress the error on the frontend:

**File**: `src/sidebar/sidebar-provider.js`

**Find this code (around line 326):**
```javascript
async _sendFeedbackToBackend(apiUrl, action, message) {
    const axios = require('axios');

    // Add timeout to prevent hanging
    const response = await axios.post(
        `${apiUrl}/api/method/ai_assistant.api.message_feedback`,
        {
            conversation_id: this._conversationId,
            message_content: message.content ? message.content.substring(0, 500) : '',
            feedback: action
        },
        {
            headers: {
                'Content-Type': 'application/json',
                'Cookie': this._sessionCookies
            },
            timeout: 5000
        }
    );

    console.log('✅ Feedback sent to backend:', response.data);
}
```

**Replace with:**
```javascript
async _sendFeedbackToBackend(apiUrl, action, message) {
    const axios = require('axios');

    try {
        // Add timeout to prevent hanging
        const response = await axios.post(
            `${apiUrl}/api/method/ai_assistant.api.message_feedback`,
            {
                conversation_id: this._conversationId,
                message_content: message.content ? message.content.substring(0, 500) : '',
                feedback: action
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': this._sessionCookies
                },
                timeout: 5000,
                validateStatus: function (status) {
                    // Accept 417 as valid response (Frappe timestamp error)
                    return status < 500 || status === 417;
                }
            }
        );

        if (response.status === 417) {
            console.warn('⚠️ Backend timestamp mismatch (417) - feedback may not be saved');
            // Feedback still works locally, just not persisted to DB
        } else {
            console.log('✅ Feedback sent to backend:', response.data);
        }
    } catch (error) {
        // Enhanced error handling
        if (error.response && error.response.status === 417) {
            console.warn('⚠️ Backend returned 417 - continuing anyway');
        } else {
            throw error; // Re-throw other errors
        }
    }
}
```

**This allows the extension to work even if the backend has the 417 error.**

---

## Recommended Fix Path

1. **Immediate**: Apply **Frontend Workaround** (takes 2 minutes)
2. **Permanent**: Apply **Option 2 (Direct SQL)** on backend (takes 5 minutes)

---

## Testing Checklist

After applying the fix:

- [ ] Click Accept button - no 417 error
- [ ] Click Reject button - no 417 error
- [ ] Send multiple feedback quickly - no errors
- [ ] Check backend logs - feedback records created successfully
- [ ] Check AI Conversation stats - counts updated correctly

---

## Questions?

If the issue persists after applying these fixes, check:

1. **Backend logs**: `bench --site oropendola.ai tail-logs`
2. **Extension console**: Look for errors in Extension Host logs
3. **Network tab**: Check if 417 response includes error details

Let me know if you need help applying any of these fixes! 🚀
