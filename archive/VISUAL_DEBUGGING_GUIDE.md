# 🎨 Visual Debugging Guide

## 🔍 What You're Seeing

### In VSCode Console:
```
console.ts:137 [Extension Host] 📤 Making AI request (attempt 1/4)
log.ts:460   ERR [Extension Host] ❌ AI request error (attempt 1): No AI response in server reply
log.ts:460   ERR [Extension Host] ❌ Error in task loop: Error: No AI response in server reply
    at ConversationTask._makeAIRequestWithRetry
```

---

## 🎯 The Request Flow (Current State)

```
┌──────────────────────────────────────────────────────────────────┐
│  Step 1: User Types Message                                     │
└──────────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────────┐
│  Step 2: Extension Builds Request                               │
│  ✅ ConversationTask._makeAIRequestWithRetry()                   │
│  ✅ Messages: [{"role": "user", "content": "your message"}]      │
│  ✅ Headers: Cookie: sid=...                                     │
│  ✅ URL: https://oropendola.ai/api/method/ai_assistant.api.chat  │
└──────────────────────────────────────────────────────────────────┘
                            ↓
                    [HTTP POST Request]
                            ↓
┌──────────────────────────────────────────────────────────────────┐
│  Step 3: Backend Receives Request                               │
│  ❌ PROBLEM HERE!                                                │
│                                                                  │
│  Either:                                                         │
│  A) Endpoint doesn't exist → 500 Error                          │
│  B) Returns wrong format → {success: true, text: "..."}         │
│  C) AI call fails → Exception                                   │
└──────────────────────────────────────────────────────────────────┘
                            ↓
                    [HTTP Response]
                            ↓
┌──────────────────────────────────────────────────────────────────┐
│  Step 4: Extension Tries to Parse Response                      │
│  ❌ Looks for: response.data.message.response                    │
│  ❌ Not found!                                                   │
│  ❌ Throws: "No AI response in server reply"                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📊 What SHOULD Happen

```
┌──────────────────────────────────────────────────────────────────┐
│  Step 1: User Types Message                                     │
│  "Create a hello world app"                                     │
└──────────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────────┐
│  Step 2: Extension Sends Request                                │
│                                                                  │
│  POST /api/method/ai_assistant.api.chat                         │
│  {                                                               │
│    "messages": [                                                 │
│      {"role": "user", "content": "Create a hello world app"}    │
│    ],                                                            │
│    "mode": "agent",                                              │
│    "context": {...}                                              │
│  }                                                               │
└──────────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────────┐
│  Step 3: Backend Receives & Processes                           │
│  ✅ api.py: chat() function exists                               │
│  ✅ Parses messages array                                        │
│  ✅ Calls OpenAI/Claude                                          │
│  ✅ AI generates response with tool call                         │
└──────────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────────┐
│  Step 4: Backend Returns Response                               │
│                                                                  │
│  Frappe wraps the return value:                                 │
│  {                                                               │
│    "message": {                                                  │
│      "success": true,                                            │
│      "response": "I'll create a hello world app...\n            │
│                   ```tool_call\n                                 │
│                   {\"action\": \"create_file\", ...}\n          │
│                   ```",                                          │
│      "conversation_id": "abc123"                                 │
│    }                                                             │
│  }                                                               │
└──────────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────────┐
│  Step 5: Extension Parses Response                              │
│  ✅ Extracts: response.data.message.response                     │
│  ✅ Displays AI message in chat                                  │
│  ✅ Parses tool call from markdown                               │
│  ✅ Executes create_file                                         │
│  ✅ Sends result back to AI                                      │
│  ✅ AI continues conversation                                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Code Comparison

### ✅ Frontend Code (Working)
**File:** `src/core/ConversationTask.js` (lines 168-221)

```javascript
// Making the request
const response = await axios({
    method: 'POST',
    url: `${this.apiUrl}/api/method/ai_assistant.api.chat`,
    data: {
        messages: apiMessages,  // ← Correct format
        conversation_id: this.conversationId,
        mode: this.mode,
        context: this._buildContext()
    },
    headers: {
        'Content-Type': 'application/json',
        'Cookie': this.sessionCookies  // ← Correct auth
    },
    timeout: 120000
});

// Parsing the response
const aiResponse = response.data?.message?.response ||  // Try this first
                  response.data?.message?.content ||   // Fallback 1
                  response.data?.message?.text;        // Fallback 2

if (!aiResponse) {
    throw new Error('No AI response in server reply');  // ← YOUR ERROR
}
```

### ❌ Backend Code (Missing/Wrong)
**File:** `~/frappe-bench/apps/ai_assistant/ai_assistant/api.py` (ON SERVER)

**Current state:** Probably doesn't exist or has wrong format

**Should be:**
```python
import frappe
import json

@frappe.whitelist(allow_guest=False)
def chat(messages=None, message=None, conversation_id=None, mode='agent', context=None):
    """
    This function MUST exist at this path:
    ~/frappe-bench/apps/ai_assistant/ai_assistant/api.py
    """
    
    # Parse messages
    if messages is None and message is not None:
        messages = [{"role": "user", "content": message}]
    elif isinstance(messages, str):
        messages = json.loads(messages)
    
    # Call AI (OpenAI, Claude, etc.)
    ai_response = call_ai_model(messages, mode, context)
    
    # CRITICAL: Must return with 'response' key
    return {
        'success': True,
        'response': ai_response,  # ← Frontend looks for this
        'conversation_id': conversation_id or frappe.generate_hash(length=12)
    }

def call_ai_model(messages, mode, context):
    """Your AI integration goes here"""
    # Option 1: OpenAI
    # Option 2: Anthropic Claude  
    # Option 3: Local model
    # Option 4: Mock (for testing)
    pass
```

---

## 🧪 Testing Scenarios

### Scenario A: Endpoint Doesn't Exist

**Request:**
```bash
curl -X POST https://oropendola.ai/api/method/ai_assistant.api.chat \
  -H "Content-Type: application/json" \
  -H "Cookie: sid=..." \
  -d '{"messages":[{"role":"user","content":"test"}]}'
```

**Response:**
```json
{
  "exception": "AttributeError: module 'ai_assistant.api' has no attribute 'chat'",
  "exc_type": "AttributeError",
  "_server_messages": "[...]"
}
```

**Fix:** Deploy the backend code

---

### Scenario B: Wrong Response Format

**Backend returns:**
```python
return {
    'success': True,
    'text': ai_response,  # ← WRONG KEY
    'conversation_id': conv_id
}
```

**Frontend receives:**
```json
{
  "message": {
    "success": true,
    "text": "AI response here",  // ← Frontend looks for 'response', not 'text'
    "conversation_id": "abc123"
  }
}
```

**Frontend code:**
```javascript
const aiResponse = response.data?.message?.response ||  // undefined
                  response.data?.message?.content ||   // undefined
                  response.data?.message?.text;        // ← Would work if checked!
```

**Fix:** Return `'response'` key, not `'text'`

---

### Scenario C: AI Call Fails

**Backend code:**
```python
def call_ai_model(messages, mode, context):
    import openai
    
    # Missing API key
    openai.api_key = None  # ← PROBLEM
    
    # This will raise exception
    response = openai.ChatCompletion.create(...)
```

**Response:**
```json
{
  "exception": "AuthenticationError: No API key provided",
  "exc_type": "AuthenticationError"
}
```

**Fix:** Configure OpenAI API key

---

## 📋 Diagnostic Flowchart

```
START
  ↓
Can you access https://oropendola.ai in browser?
  ├─ NO → Check server status
  └─ YES
      ↓
Run: curl -X POST https://oropendola.ai/api/method/ai_assistant.api.chat
     -H "Cookie: sid=..." -d '{"messages":[...]}'
      ↓
What's the response?
  ├─ "AttributeError: no attribute 'chat'"
  │   → Backend not deployed
  │   → See: DEPLOYMENT_INSTRUCTIONS.md
  │
  ├─ {"exception": "AuthenticationError"}  
  │   → AI API key missing
  │   → Add to site_config.json
  │
  ├─ {"exception": "ImportError: No module named 'openai'"}
  │   → Run: bench pip install openai
  │
  ├─ {"message": {"success": true, "text": "..."}}
  │   → Wrong key name
  │   → Change 'text' to 'response'
  │
  └─ {"message": {"success": true, "response": "..."}}
      → ✅ WORKING!
      → Test in VSCode extension
```

---

## 🎯 Quick Reference

### Expected Request Format
```json
{
  "messages": [
    {"role": "user", "content": "message 1"},
    {"role": "assistant", "content": "response 1"},
    {"role": "user", "content": "message 2"}
  ],
  "conversation_id": "optional-id",
  "mode": "agent",
  "context": {
    "workspace": "project-name",
    "activeFile": {"path": "...", "language": "..."}
  }
}
```

### Expected Response Format
```json
{
  "message": {
    "success": true,
    "response": "AI response text here, can include tool calls",
    "conversation_id": "abc123"
  }
}
```

### Tool Call Format (in response)
```markdown
I'll create a file for you.

```tool_call
{
  "action": "create_file",
  "path": "hello.js",
  "content": "console.log('Hello');",
  "description": "A hello world file"
}
```

Done!
```

---

## 🚀 Action Items

1. **Verify Backend Exists**
   ```bash
   ssh user@oropendola.ai
   ls ~/frappe-bench/apps/ai_assistant/ai_assistant/api.py
   ```

2. **Deploy if Missing**
   - See: `DEPLOYMENT_INSTRUCTIONS.md`
   - Copy code from: `backend_chat_api_fix.py`

3. **Test Endpoint**
   ```bash
   ./test-backend.sh
   ```

4. **Check Logs**
   ```bash
   tail -f ~/frappe-bench/sites/*/logs/web.log
   ```

5. **Try Extension**
   - Open VSCode
   - Open Oropendola sidebar
   - Send message
   - Check for success!

---

## 📞 Still Having Issues?

### Provide These Details:

1. **Backend file exists?**
   ```bash
   ls -la ~/frappe-bench/apps/ai_assistant/ai_assistant/api.py
   ```

2. **Curl test output:**
   ```bash
   curl -X POST ... | jq .
   ```

3. **Frappe logs:**
   ```bash
   tail -50 ~/frappe-bench/sites/*/logs/web.log
   tail -50 ~/frappe-bench/sites/*/logs/error.log
   ```

4. **VSCode Extension Host logs:**
   - Cmd+Shift+P
   - "Developer: Show Logs"
   - Select "Extension Host"
   - Copy recent errors

This will help pinpoint the exact issue!
