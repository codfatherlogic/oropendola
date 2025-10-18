# 🤖 Agent Mode - Complete Implementation Guide

## 🎯 What You Asked For

> "is this frontend or backend? ```tool_call { "action": "create_file", ... }```"

**Answer**: This is **BACKEND OUTPUT** that needs **BACKEND EXECUTION** (for Frappe operations)

---

## 📊 Current Status

### ✅ What's Already Working

1. **Backend AI** (Frappe):
   - ✅ Detects Agent mode
   - ✅ Uses enhanced system prompts
   - ✅ Generates tool calls in proper JSON format
   - ✅ Returns tool_calls array in API response

2. **Frontend** (VS Code Extension):
   - ✅ Sends mode parameter to backend
   - ✅ Receives tool calls from backend
   - ✅ Accept/Reject buttons working
   - ✅ Image paste working

### ⚠️ What's Missing

1. **Backend**: `execute_tool_call` endpoint (to create Frappe documents)
2. **Frontend**: Tool call handler (to send to backend for execution)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         USER                                │
│  "Create sales invoice JS file, make cost center read-only" │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  FRONTEND (VS Code Extension)                │
│  - Sends message with mode='agent'                          │
│  - Receives AI response with tool_calls[]                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (Frappe API)                        │
│  chat_completion() → AI generates tool call                 │
│  Returns: {                                                 │
│    "response": "Sure, I'll create...",                      │
│    "tool_calls": [{                                         │
│      "action": "create_file",                               │
│      "path": "sales_invoice.js",                            │
│      "content": "function makeCostCenterReadOnly()..."      │
│    }]                                                       │
│  }                                                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              FRONTEND (Tool Call Handler)                    │
│  - Detects tool_calls in response                          │
│  - Calls execute_tool_call() endpoint                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│            BACKEND (execute_tool_call endpoint)              │
│  - Creates Frappe Client Script DocType                     │
│  - Saves JavaScript code                                    │
│  - Returns success confirmation                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    USER SEES                                 │
│  ✅ "Created Client Script for Sales Invoice"              │
│  Script appears in Frappe UI (Customization → Client Script)│
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Implementation Steps

### Step 1: Add Backend Endpoint (5 minutes)

**File**: `ai_assistant/ai_assistant/api.py`

**Add this function** (see [BACKEND_TOOL_EXECUTION.md](BACKEND_TOOL_EXECUTION.md) for full code):

```python
@frappe.whitelist(allow_guest=False)
def execute_tool_call(action, path=None, content=None, description=None, **kwargs):
    """Execute AI-generated tool calls"""
    if action == "create_file":
        return _handle_create_file(path, content, description, **kwargs)
    # ... other handlers
```

**Key handlers**:
- `_handle_create_file()` - Creates Frappe Client Script
- `_handle_create_client_script()` - Explicit Client Script
- `_handle_create_server_script()` - Server-side Python scripts
- `_handle_modify_file()` - Update existing scripts
- `_handle_read_file()` - Read script content

---

### Step 2: Update Frontend Handler (10 minutes)

**File**: `src/sidebar/sidebar-provider.js`

**Add after receiving AI response**:

```javascript
// In _handleSendMessage, after getting response
if (response.data && response.data.message) {
    const { response: aiText, tool_calls, mode } = response.data.message;
    
    // Show AI response
    this._addAIMessage(aiText);
    
    // Execute tool calls if in agent mode
    if (mode === 'agent' && tool_calls && tool_calls.length > 0) {
        for (const toolCall of tool_calls) {
            await this._executeToolCall(toolCall);
        }
    }
}

async _executeToolCall(toolCall) {
    const axios = require('axios');
    const config = vscode.workspace.getConfiguration('oropendola');
    const apiUrl = config.get('api.url');
    
    const response = await axios.post(
        `${apiUrl}/api/method/ai_assistant.api.execute_tool_call`,
        toolCall,
        {
            headers: {
                'Content-Type': 'application/json',
                'Cookie': this._sessionCookies
            },
            timeout: 30000
        }
    );
    
    if (response.data.message.success) {
        vscode.window.showInformationMessage(
            `✅ ${response.data.message.message}`
        );
    }
}
```

---

### Step 3: Test End-to-End (2 minutes)

1. **Rebuild extension**:
   ```bash
   cd /Users/sammishthundiyil/oropendola
   npm run lint -- --fix
   npx vsce package --allow-star-activation
   ```

2. **Install in VS Code**:
   ```bash
   code --install-extension oropendola-ai-assistant-2.0.0.vsix
   ```

3. **Reload VS Code**: `Cmd+R`

4. **Test in chat**:
   ```
   You: "Create sales invoice JS file, make cost center read-only"
   AI: "Sure, I'll create that for you..."
   ✅ Created Client Script for Sales Invoice
   ```

5. **Verify in Frappe**:
   - Go to: Customization → Client Script
   - Should see: "Custom - Sales Invoice"
   - Code should contain: `costCenterField.readOnly = true;`

---

## 📝 Example Conversations

### Example 1: Your Current Use Case

```
👤 User: "can u add sales invoice js file and make cost center read only?"

🤖 AI: "Sure, I can help with that. I'll create a new JavaScript file 
      for the sales invoice and make the cost center field read-only."
      
      ```tool_call
      {
        "action": "create_file",
        "path": "sales_invoice.js",
        "content": "function makeCostCenterReadOnly() { ... }",
        "description": "Create sales invoice JS and make cost center read-only"
      }
      ```

💻 System: Executing tool call...
         Calling execute_tool_call endpoint...
         Creating Frappe Client Script...

✅ Success: "Created Client Script for Sales Invoice"

👁️ You see: Script in Frappe UI at Customization → Client Script
```

### Example 2: Create Server Script

```
👤 User: "Create a server script that validates email on User save"

🤖 AI: "I'll create a server script with email validation logic..."
      
      ```tool_call
      {
        "action": "create_server_script",
        "script_name": "User Email Validation",
        "content": "import re\ndef validate_email(doc)...",
        "script_type": "DocType Event",
        "doctype": "User",
        "event_type": "Before Save"
      }
      ```

✅ Success: "Created Server Script: User Email Validation"
```

### Example 3: Modify Existing Script

```
👤 User: "Update sales invoice script to also hide cost center"

🤖 AI: "I'll modify the existing script to hide the cost center field..."
      
      ```tool_call
      {
        "action": "modify_file",
        "path": "sales_invoice.js",
        "content": "function makeCostCenterReadOnly() { ... hidden=true ... }"
      }
      ```

✅ Success: "Updated Client Script for Sales Invoice"
```

---

## 🔍 Debugging

### Check if Tool Calls are Generated

**Browser Console** (in VS Code webview):
```javascript
// Should see in network response:
{
  "response": "Sure, I'll create...",
  "tool_calls": [{...}],  // ← This should exist
  "mode": "agent"
}
```

### Check if Tool Calls are Executed

**Extension Host Console**:
```
🔧 Executing tool call: create_file
📤 Calling backend: /api/method/ai_assistant.api.execute_tool_call
✅ Tool call executed: {success: true, message: "Created..."}
```

### Check Backend Logs

**Frappe Logs** (`~/frappe-bench/sites/*/logs/web.log`):
```
🔧 Executing tool call: create_file
✅ Created Client Script: Custom - Sales Invoice
```

---

## 🎯 What Happens Now

### When You Implement This:

1. **User asks** for a file/script in Agent mode
2. **Backend AI** generates tool call with code
3. **Frontend** detects tool call
4. **Frontend** sends to `execute_tool_call` endpoint
5. **Backend** creates Frappe document (Client Script/Server Script)
6. **User** sees confirmation and script in Frappe UI
7. **Script** automatically applies to forms

### Benefits:

- ✅ **No manual coding** - AI writes the code
- ✅ **Proper Frappe integration** - Saves as DocType
- ✅ **Automatic application** - Works immediately
- ✅ **Version control** - Frappe tracks changes
- ✅ **Easy updates** - Just ask AI to modify

---

## 📚 Files to Modify

1. **Backend**: `ai_assistant/ai_assistant/api.py`
   - Add `execute_tool_call()` function
   - Add helper functions (`_handle_create_file`, etc.)
   - See: [BACKEND_TOOL_EXECUTION.md](BACKEND_TOOL_EXECUTION.md)

2. **Frontend**: `src/sidebar/sidebar-provider.js`
   - Add `_handleAIResponseWithToolCalls()` method
   - Add `_executeToolCall()` method
   - Update message handler

3. **Rebuild**: 
   ```bash
   npm run lint -- --fix
   npx vsce package --allow-star-activation
   ```

---

## ✅ Checklist

### Backend Implementation:
- [ ] Add `execute_tool_call()` to `api.py`
- [ ] Add `_handle_create_file()` helper
- [ ] Add `_handle_create_client_script()` helper
- [ ] Add `_handle_create_server_script()` helper
- [ ] Add `_extract_doctype_from_path()` utility
- [ ] Test endpoint with Postman/curl

### Frontend Implementation:
- [ ] Add `_handleAIResponseWithToolCalls()` method
- [ ] Add `_executeToolCall()` method
- [ ] Update message response handler
- [ ] Add success/error notifications
- [ ] Add system messages in chat

### Testing:
- [ ] Test creating Client Script
- [ ] Test creating Server Script
- [ ] Test modifying existing script
- [ ] Test error handling
- [ ] Verify in Frappe UI

### Deployment:
- [ ] Rebuild extension (`npx vsce package`)
- [ ] Install in VS Code
- [ ] Reload VS Code
- [ ] Test end-to-end flow
- [ ] Document for users

---

## 🎓 Understanding the Flow

### Why Two Steps (AI Generate → Backend Execute)?

**AI Generate (chat_completion)**:
- AI understands user intent
- AI writes the actual code
- AI formats as structured tool call
- AI explains what it's doing

**Backend Execute (execute_tool_call)**:
- Has Frappe permissions
- Can create DocTypes
- Validates and saves
- Returns confirmation

This separation allows:
- AI to focus on code generation
- Backend to handle execution safely
- Clear audit trail
- Easy error handling

---

## 🚀 Next Steps

1. **Implement backend endpoint** (5 minutes)
2. **Implement frontend handler** (10 minutes)
3. **Rebuild extension** (2 minutes)
4. **Test with your use case** (2 minutes)
5. **Celebrate!** 🎉

---

## 📖 Additional Resources

- Full backend code: [BACKEND_TOOL_EXECUTION.md](BACKEND_TOOL_EXECUTION.md)
- Backend fixes: [BACKEND_IMPLEMENTATION.md](BACKEND_IMPLEMENTATION.md)
- Feature documentation: [FEATURES_DOCUMENTATION.md](FEATURES_DOCUMENTATION.md)
- Quick start: [QUICK_START_GUIDE.md](QUICK_START_GUIDE.md)

---

## 💡 Summary

**Your Question**: "is this frontend or backend?"

**Answer**: 
- It's **BACKEND OUTPUT** (AI-generated tool call)
- Needs **BACKEND EXECUTION** (create Frappe documents)
- **FRONTEND** just forwards it to backend

**What to Do**:
1. Add `execute_tool_call` endpoint to Frappe backend
2. Add tool call handler to VS Code extension
3. Test your sales invoice use case
4. ✅ Done! Agent mode fully working!

**Time Required**: ~20 minutes total

Ready to implement? Let's do it! 🚀
