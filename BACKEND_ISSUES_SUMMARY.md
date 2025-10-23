# Backend Issues Summary & Fixes

> **Complete guide to fixing backend issues in Oropendola AI**

## 🔴 Critical Issues Identified

### Issue 1: Tool Call Blocks Appearing in Chat UI

**Symptoms:**
```
User sees in chat:
"I'll create a file...

```tool_call
{
  "action": "create_file",
  "path": "app.js",
  "content": "..."
}
```

Done!"
```

**Root Cause:**
- Backend parses tool calls but doesn't strip them from response text
- Raw AI response with embedded tool_call blocks sent to frontend
- Frontend receives and displays the blocks as regular text

**Impact:**
- Poor user experience
- Confusing interface
- Looks unprofessional

**Fix Location:** `~/frappe-bench/apps/ai_assistant/ai_assistant/api.py`

**Fix Required:**
1. Add `strip_tool_call_blocks()` function (see BACKEND_TOOL_CALL_FIX.py)
2. Call it in `_parse_tool_calls()` after parsing
3. Return cleaned text to frontend

**Files:**
- ✅ Fix provided: `BACKEND_TOOL_CALL_FIX.py`
- Apply to: Backend API

---

### Issue 2: Conversation History Not Supported

**Symptoms:**
- AI doesn't remember tool execution results
- Can't continue multi-step tasks
- Each message treated independently

**Root Cause:**
- Backend chat() function expects single `message` string
- Frontend now sends full `messages` array
- Backend ignores conversation history

**Impact:**
- AI can't see if file was created successfully
- Can't build on previous work
- Broken agent workflow

**Fix Location:** `~/frappe-bench/apps/ai_assistant/ai_assistant/api.py`

**Fix Required:**
1. Update chat() function to accept `messages` array
2. Support both old (message) and new (messages) format
3. Pass full conversation history to AI model

**Files:**
- ✅ Fix provided: `backend_chat_api_fix.py`
- Apply to: Backend API

---

### Issue 3: 417 Errors on Accept/Reject

**Symptoms:**
```
Failed to send telemetry: AxiosError: Request failed with status code 417
```

**Root Cause:**
- Frappe document modified timestamp validation
- Multiple concurrent feedback updates
- Document timestamp mismatch

**Impact:**
- Accept/Reject buttons fail silently
- User feedback not recorded
- Error spam in logs

**Fix Location:** `~/frappe-bench/apps/ai_assistant/ai_assistant/api.py`

**Fix Required:**
1. Update `update_conversation_stats()` to use direct SQL
2. Bypass Frappe's timestamp validation
3. Or comment out stats update if not critical

**Files:**
- ✅ Fix provided: `backend_api_fix.py`
- Apply to: Backend API

---

## 📋 Fix Application Order

Apply fixes in this order to avoid breaking dependencies:

### Step 1: Fix Conversation History (Most Critical)
```bash
# SSH into backend
ssh user@oropendola.ai

# Navigate to app
cd ~/frappe-bench/apps/ai_assistant/ai_assistant/

# Backup
cp api.py api.py.backup

# Apply fix from backend_chat_api_fix.py
nano api.py
# Replace chat() function with new version

# Restart
bench restart
```

**Verify:**
```bash
# Test with multi-step task
# Open VS Code → "create a full React app"
# AI should remember each step and continue
```

---

### Step 2: Fix Tool Call Block Stripping (Critical UX)
```bash
# Edit same api.py file
nano api.py

# Add strip_tool_call_blocks() function
# Update _parse_tool_calls() to call it

# Restart
bench restart
```

**Verify:**
```bash
# Open VS Code → Ask AI to create files
# Chat should show clean text (no ```tool_call blocks)
# Tool calls should still execute
```

---

### Step 3: Fix 417 Errors (Optional but Recommended)
```bash
# Edit same api.py file
nano api.py

# Update update_conversation_stats() function
# Or comment out the call

# Restart
bench restart
```

**Verify:**
```bash
# Test Accept/Reject buttons
# No 417 errors in console
# Feedback recorded successfully
```

---

## 🧪 Testing Checklist

After applying all fixes:

### Test 1: Tool Call Blocks Removed
- [ ] Ask AI to create files
- [ ] Chat shows clean message
- [ ] No ```tool_call visible in UI
- [ ] Tool calls execute correctly
- [ ] Files created in correct location

### Test 2: Conversation Memory
- [ ] Ask: "Create a React app"
- [ ] AI creates package.json
- [ ] Ask: "Now add a component"
- [ ] AI remembers previous work
- [ ] Builds on existing structure

### Test 3: Multi-File Projects
- [ ] Ask: "Create a full Express server"
- [ ] Multiple files created
- [ ] No overlapping in UI
- [ ] All files in correct directories

### Test 4: Terminal Commands
- [ ] AI suggests: "npm install"
- [ ] Terminal opens
- [ ] Command executes
- [ ] No permission errors

### Test 5: Path Sanitization
- [ ] AI generates absolute path: `/Users/x/project/src/app.js`
- [ ] Backend converts to: `src/app.js`
- [ ] No permission denied errors
- [ ] File created in workspace

### Test 6: Accept/Reject (if applied)
- [ ] AI suggests numbered plan
- [ ] Click Accept
- [ ] No 417 error
- [ ] Feedback recorded

---

## 📊 Backend Architecture

```
┌─────────────────────────────────────────┐
│         VS Code Extension               │
│  (TypeScript - Already Fixed ✅)        │
└──────────────┬──────────────────────────┘
               │
               │ POST /api/method/ai_assistant.api.chat
               │ { "messages": [...] }
               │
┌──────────────┴──────────────────────────┐
│         Backend API (Python)            │
│                                         │
│  chat()                                 │
│    ↓                                    │
│  call_ai_model()                        │
│    ↓                                    │
│  AI Response (with tool_call blocks)    │
│    ↓                                    │
│  _parse_tool_calls() ← FIX HERE        │
│    ├─ Extract tool calls                │
│    └─ strip_tool_call_blocks() ← ADD   │
│         ↓                               │
│  Return { content, tool_calls }         │
└─────────────────────────────────────────┘
```

---

## 🔍 Debugging

### Check Backend Logs
```bash
tail -f ~/frappe-bench/logs/oropendola.ai.log | grep -E 'Tool Call|Chat API'
```

**Expected output after fixes:**
```
[Chat API] Messages in history: 3
[Tool Call] Total parsed: 2
[Tool Call Stripping] Original length: 845, Cleaned length: 342
[Chat API] Cleaned response: 342 chars
[Chat API] Tool calls: 2
```

### Check Frontend Console
```
Open VS Code → Help → Toggle Developer Tools → Console
```

**Expected output after fixes:**
```
[DEBUG] Checking numbered plan: false has_todos: true
[DEBUG] TODOs present - auto-executing, no confirmation needed
✅ Created file: src/app.js
✅ Created file: src/index.js
```

### Test API Directly
```bash
curl -X POST http://localhost:8000/api/method/ai_assistant.api.chat \
  -H "Content-Type: application/json" \
  -H "Cookie: sid=YOUR_SESSION_ID" \
  -d '{
    "messages": [
      {"role": "user", "content": "create a hello world app"}
    ],
    "mode": "agent"
  }'
```

**Expected response:**
```json
{
  "message": {
    "success": true,
    "content": "I'll create a hello world app...",
    "tool_calls": [
      {
        "action": "create_file",
        "path": "app.js",
        "content": "console.log('hello');"
      }
    ]
  }
}
```

**❌ BAD response (before fix):**
```json
{
  "message": {
    "content": "I'll create...\n\n```tool_call\n{...}\n```"
  }
}
```

---

## 📝 File Summary

### Backend Fix Files (Apply to Server)

1. **BACKEND_TOOL_CALL_FIX.py** ⭐ Most Important
   - Strips tool_call blocks from response
   - Fixes ugly chat UI
   - Apply to: `api.py`

2. **backend_chat_api_fix.py** ⭐ Critical
   - Supports conversation history
   - Enables agent memory
   - Apply to: `api.py`

3. **backend_api_fix.py**
   - Fixes 417 errors
   - Optional but recommended
   - Apply to: `api.py`

### Documentation Files (Reference)

4. **ACCEPT_REJECT_BUTTONS_FIX.md**
   - Complete developer guide
   - Architecture overview
   - Reference documentation

5. **BACKEND_ISSUES_SUMMARY.md** (this file)
   - Issue summary
   - Fix instructions
   - Testing checklist

---

## 🚀 Quick Fix (5 Minutes)

**If you just want to fix the UI quickly:**

1. SSH to backend
2. Edit `api.py`
3. Find `_parse_tool_calls()` function
4. Add one line before return:
   ```python
   # Strip tool_call blocks from response
   response_text = re.sub(r'```tool_call\s*\n.*?\n```', '', response_text, flags=re.DOTALL)
   ```
5. Save and run: `bench restart`

**Result:** Chat UI immediately clean, no more tool_call blocks visible.

---

## ❓ Need Help?

**Backend not accessible?**
- Check if Frappe is running: `bench status`
- Verify site exists: `bench --site oropendola.ai migrate`

**Fixes not working?**
- Check logs: `tail -f logs/oropendola.ai.log`
- Restart properly: `bench restart`
- Clear cache: `bench clear-cache`

**Still seeing tool_call blocks?**
- Verify fix applied: `grep strip_tool_call_blocks api.py`
- Check function is being called
- Add debug logging to confirm execution

**AI not remembering conversation?**
- Verify messages array format in logs
- Check if AI model receives full history
- Test with simple multi-step task

---

**Last Updated:** 2025-01-23
**Priority:** Critical - Apply ASAP
**Estimated Fix Time:** 15-20 minutes

---

## Summary

**The main issues are:**
1. 🔴 Tool call blocks appearing in chat (fix in backend API)
2. 🔴 No conversation memory (fix message handling)
3. 🟡 417 errors on feedback (fix stats update)

**All fixes are provided in this repository.**
**Apply them to your backend server to resolve all issues.**

Good luck! 🚀
