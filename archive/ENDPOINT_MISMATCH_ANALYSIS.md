# Endpoint Mismatch Analysis - Root Cause Found

**Date**: 2025-10-23
**Status**: 🔍 Root cause identified

---

## 🎯 The Problem

**Frontend expects:**
```javascript
{
  "message": {
    "content": "I'll create an Employee doctype",  // Clean text
    "tool_calls": [                                 // Array of parsed tool calls
      {"action": "create_file", "path": "employee.py", ...}
    ]
  }
}
```

**Backend actually returns:**
```javascript
{
  "message": {
    "content": "I'll create...```tool_call\n{\"action\": \"create_file\"}```",  // ❌ Raw blocks
    "tool_calls": []  // ❌ Empty array
  }
}
```

---

## 🔍 Analysis

### Frontend Code
**File**: [src/core/ConversationTask.js:626](src/core/ConversationTask.js#L626)
**Endpoint**: `ai_assistant.api.chat_completion`

**Request sent:**
```javascript
{
  messages: [...],
  conversation_id: "...",
  mode: "agent",  // ← Should trigger tool call parsing
  context: {...}
}
```

**Response expected (Line 722):**
```javascript
if (messageData.tool_calls && Array.isArray(messageData.tool_calls)) {
    console.log(`🔧 Backend returned ${messageData.tool_calls.length} tool_call(s)`);
    aiResponse._backendToolCalls = messageData.tool_calls;
}
```

### Backend Code (from verification doc)

**Function exists**: `_parse_tool_calls()` at line 5505 ✅
**Function called**: Line 3301 in chat_completion endpoint ✅
**Tool calls parsed**: Working correctly ✅

**But...**

### The Missing Link 🔗

The backend **parses** tool calls but **doesn't add them to the response** that's sent back to the frontend!

**Current backend code (hypothetical based on logs):**
```python
@frappe.whitelist(allow_guest=False)
def chat_completion(messages=None, conversation_id=None, mode='agent', context=None):
    # ... call AI model ...
    ai_response_text = call_ai_model(...)

    if mode == 'agent':
        tool_calls = _parse_tool_calls(ai_response_text)  # ✅ Parses correctly
        frappe.logger().info(f"🔧 Detected {len(tool_calls)} tool call(s)")

        # ... executes tool calls ...
        # ... but doesn't add to response! ❌

    # Returns without tool_calls in response structure
    return {
        'success': True,
        'role': 'assistant',
        'content': ai_response_text,  # ❌ Still has raw tool_call blocks
        # Missing: 'tool_calls': tool_calls
    }
```

**What it SHOULD do:**
```python
@frappe.whitelist(allow_guest=False)
def chat_completion(messages=None, conversation_id=None, mode='agent', context=None):
    # ... call AI model ...
    ai_response_raw = call_ai_model(...)

    if mode == 'agent':
        tool_calls = _parse_tool_calls(ai_response_raw)
        frappe.logger().info(f"🔧 Detected {len(tool_calls)} tool call(s)")

        # ✨ NEW: Strip tool_call blocks from content
        clean_content = strip_tool_call_blocks(ai_response_raw)

        return {
            'success': True,
            'role': 'assistant',
            'content': clean_content,      # ✅ Clean text
            'tool_calls': tool_calls,      # ✅ Parsed tool calls
            'conversation_id': conversation_id
        }

    # Non-agent mode
    return {
        'success': True,
        'role': 'assistant',
        'content': ai_response_raw,
        'conversation_id': conversation_id
    }
```

---

## 🔧 The Fix Needed

### Backend: Update chat_completion endpoint

**Location**: `ai_assistant/api/__init__.py` (around line 3301)

**Change 1: Add strip_tool_call_blocks function** (if not already present)
```python
def strip_tool_call_blocks(text):
    """Remove ```tool_call blocks from AI response"""
    import re
    pattern = r'```tool_call\s*\n.*?\n```'
    cleaned = re.sub(pattern, '', text, flags=re.DOTALL)
    return re.sub(r'\n{3,}', '\n\n', cleaned).strip()
```

**Change 2: Update return statement in chat_completion**
```python
# After parsing tool calls
if mode == 'agent' and tool_calls:
    clean_content = strip_tool_call_blocks(ai_response_raw)
else:
    clean_content = ai_response_raw

return {
    'success': True,
    'role': 'assistant',
    'content': clean_content,           # ✅ Clean text (no tool_call blocks)
    'tool_calls': tool_calls if mode == 'agent' else [],  # ✅ Parsed array
    'conversation_id': conversation_id,
    'model': model_used,
    'usage': usage_stats
}
```

---

## 📊 Why This Fixes Everything

### Before Fix:
```
Frontend → Backend (mode: agent)
Backend parses tool_calls ✅
Backend executes tool_calls ✅
Backend returns:
  - content: "...```tool_call {...}```"  ❌ Raw blocks
  - tool_calls: (not in response)        ❌ Missing
Frontend sees: 0 tool_calls               ❌
User sees: Raw JSON in chat               ❌
```

### After Fix:
```
Frontend → Backend (mode: agent)
Backend parses tool_calls ✅
Backend strips tool_call blocks ✅
Backend executes tool_calls ✅
Backend returns:
  - content: "I'll create an Employee doctype"  ✅ Clean
  - tool_calls: [{action: "create_file", ...}] ✅ Array
Frontend sees: 1 tool_call                      ✅
User sees: Clean message, file created          ✅
```

---

## 🎯 Verification Steps

### 1. Check Current Backend Response Structure

**Location**: `ai_assistant/api/__init__.py:3301` (around chat_completion function)

Look for the return statement:
```python
return {
    'success': True,
    'role': 'assistant',
    'content': ...  # What's returned here?
    # Is 'tool_calls' included? ←  CHECK THIS
}
```

### 2. Verify _parse_tool_calls is Used

```bash
cd ~/frappe-bench/apps/ai_assistant/
grep -A 20 "def chat_completion" ai_assistant/api/__init__.py | grep -E "tool_calls|_parse_tool_calls"
```

Expected output:
```python
tool_calls = _parse_tool_calls(ai_response)  # ✅ Should be present
```

### 3. Check if tool_calls is in Return

```bash
grep -A 30 "def chat_completion" ai_assistant/api/__init__.py | grep "return {" -A 10
```

Expected:
```python
return {
    ...
    'tool_calls': tool_calls,  # ← Should be here
    ...
}
```

If `'tool_calls'` is NOT in the return statement, that's the bug!

---

## 🔧 Minimal Fix (If tool_calls not in response)

### File: `ai_assistant/api/__init__.py`

**Find the chat_completion function** (around line 3300):

```python
@frappe.whitelist(allow_guest=False)
def chat_completion(messages=None, conversation_id=None, mode='agent', context=None):
    # ... existing code ...

    # After this line (where tool_calls are parsed):
    tool_calls = _parse_tool_calls(ai_response_text)

    # ADD THIS:
    # Strip tool_call blocks from content if tool calls were found
    if mode == 'agent' and tool_calls:
        import re
        clean_content = re.sub(r'```tool_call\s*\n.*?\n```', '', ai_response_text, flags=re.DOTALL)
        clean_content = re.sub(r'\n{3,}', '\n\n', clean_content).strip()
    else:
        clean_content = ai_response_text

    # MODIFY RETURN STATEMENT:
    return {
        'success': True,
        'role': 'assistant',
        'content': clean_content,      # ← Use clean_content
        'tool_calls': tool_calls,      # ← ADD THIS LINE
        'conversation_id': conversation_id,
        # ... rest of fields ...
    }
```

**Lines to add**: ~5 lines
**Impact**: HIGH - Fixes the entire tool call system

---

## 🚀 Deployment

```bash
# 1. SSH to backend
ssh user@oropendola.ai
cd ~/frappe-bench/apps/ai_assistant/

# 2. Backup
cp ai_assistant/api/__init__.py ai_assistant/api/__init__.py.backup.$(date +%Y%m%d_%H%M%S)

# 3. Edit
nano ai_assistant/api/__init__.py
# - Find chat_completion function (~line 3300)
# - Add tool_calls stripping logic
# - Add 'tool_calls': tool_calls to return statement

# 4. Restart
cd ~/frappe-bench
bench restart

# 5. Test
# - Send message in VS Code: "Create a file called test.py"
# - Check logs: tail -f ~/frappe-bench/logs/*.log
# - Should see: "Backend returned 1 tool_call(s)"
# - File should be created
```

---

## 📝 Summary

| Issue | Status | Fix |
|-------|--------|-----|
| **Backend parses tool calls** | ✅ Working | No change needed |
| **Backend strips tool_call blocks** | ❌ Not returned | Add to response |
| **Backend returns tool_calls array** | ❌ Missing | Add to return statement |
| **Frontend reads tool_calls** | ✅ Ready | No change needed |

**Root Cause**: Backend parses tool calls but doesn't include them in the response sent to frontend.

**Fix**: Add 2 things to chat_completion return:
1. `clean_content` - AI response with tool_call blocks stripped
2. `'tool_calls': tool_calls` - Parsed tool calls array

**Effort**: ~5 lines of code
**Impact**: Fixes the entire tool calling system

---

**Next Step**: Check the backend `chat_completion` function's return statement and verify if `tool_calls` is included. If not, add it!
