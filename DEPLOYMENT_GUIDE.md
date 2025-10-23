# Deployment Guide - v3.2.1
**Date**: 2025-10-23
**Priority**: 🔴 CRITICAL FIX
**Status**: ✅ Frontend deployed, ⏳ Backend pending

---

## 📊 What Was Fixed

### Issue: Tool Calls Not Working

**Problem**: AI was generating tool calls with object content instead of string content:
```json
❌ WRONG:
{
  "content": {"doctype": "Employee"}  // Object
}

✅ CORRECT:
{
  "content": "{\"doctype\": \"Employee\"}"  // String
}
```

**Result**: Backend parser couldn't handle object content, returned empty `tool_calls: []` array.

---

## ✅ Frontend Fix (v3.2.1) - DEPLOYED

### What Was Changed

**File**: `src/core/ConversationTask.js:298-330`

**Added to system prompt**:
```
**TOOL CALL FORMAT - CRITICAL:**

When using tool_call blocks, follow this EXACT format:

✅ CORRECT - Content as STRING:
```tool_call
{
  "action": "create_file",
  "path": "employee/employee.json",
  "content": "{\n  \"doctype\": \"Employee\"\n}",
  "description": "Creating Employee DocType"
}
```

❌ WRONG - Content as OBJECT:
{
  "content": {"doctype": "Employee"}  // ❌ Don't do this!
}

**CRITICAL RULES:**
1. The 'content' field MUST ALWAYS be a STRING, never an object
2. If creating JSON files, stringify the JSON and escape quotes
3. Use \n for newlines in content strings
4. Always include "description" field
```

### Status: ✅ DEPLOYED

- Built: v3.2.1
- Installed: Successfully
- Committed: `e5a90af`
- Pushed: GitHub main branch

---

## ⏳ Backend Fix - NEEDS DEPLOYMENT

### What Needs to be Changed

**File**: `~/frappe-bench/apps/ai_assistant/ai_assistant/api/__init__.py`

**Function**: `_parse_tool_calls()` (around line 3200)

**Change**: Replace with defensive parser from `BACKEND_PARSER_FIX.py`

### Why This Fix

**Defensive programming**: Even if AI makes a mistake and sends object content, backend will:
1. Detect it
2. Convert object → string automatically
3. Log a warning
4. Continue execution

**This provides TWO layers of protection**:
1. Frontend tells AI to use strings ✅
2. Backend fixes mistakes if they happen ✅

---

## 🛠️ Backend Deployment Steps

### Step 1: Test the Parser (Optional but Recommended)

```bash
# Copy test script to backend
scp BACKEND_PARSER_FIX.py frappe@oropendola.ai:~/

# SSH to backend
ssh frappe@oropendola.ai

# Run tests
python3 ~/BACKEND_PARSER_FIX.py
```

**Expected output**:
```
======================================================================
RESULTS: 7 passed, 0 failed
======================================================================
✅ ALL TESTS PASSED
```

### Step 2: Backup Current Code

```bash
ssh frappe@oropendola.ai

cd ~/frappe-bench/apps/ai_assistant
cp ai_assistant/api/__init__.py ai_assistant/api/__init__.py.backup.$(date +%Y%m%d_%H%M%S)

ls -lh ai_assistant/api/__init__.py.backup.*
```

### Step 3: Edit the File

```bash
nano ai_assistant/api/__init__.py
```

**Find the function** (Ctrl+W, search for `_parse_tool_calls`):
```python
def _parse_tool_calls(ai_response_text):
    """Parse tool_call blocks from AI response"""
    # ... current code ...
```

**Replace entire function** with code from `BACKEND_PARSER_FIX.py` (lines 16-98).

**Key changes**:
1. Pattern: `r'```tool_call\s*(.*?)\s*```'` (more flexible)
2. Defensive fix: Convert object content to string
3. Better logging: Shows what's being parsed
4. Error handling: Continues on parse errors

### Step 4: Verify Changes

```bash
# Check the function exists and looks correct
grep -A 5 "def _parse_tool_calls" ai_assistant/api/__init__.py

# Should show:
# def _parse_tool_calls(ai_response_text):
#     """
#     Parse tool_call blocks from AI response
#     ...
```

### Step 5: Restart Backend

```bash
cd ~/frappe-bench
bench restart
```

**Watch for errors**:
```bash
tail -f ~/frappe-bench/logs/frappe.log
```

Should see:
```
[INFO] Bench restarted
[INFO] Workers started
```

### Step 6: Test

Send a message from VS Code and check backend logs:

```bash
tail -f ~/frappe-bench/logs/frappe.log | grep "Tool Parser"
```

**Expected output**:
```
[INFO] [Tool Parser] Parsing response (XXX chars)
[INFO] [Tool Parser] Found 1 tool_call blocks
[INFO] [Tool Parser] Parsing tool call 1/1
[INFO] [Tool Parser] ✓ Tool call 1 parsed: create_file
[INFO] [Tool Parser] Successfully parsed 1/1 tool calls
```

If AI sends object content, you'll also see:
```
[WARNING] [Tool Parser] Tool call 1 has object content, converting to string
```

---

## 🧪 Testing Checklist

After deploying backend fix, test these scenarios:

### Test 1: Standard Tool Call
**Message**: "Create a file called test.py with hello world"

**Expected**:
- ✅ AI generates string content
- ✅ Backend parses 1 tool call
- ✅ File created
- ✅ No warnings

### Test 2: JSON File Creation
**Message**: "Create employee.json with doctype Employee"

**Expected**:
- ✅ AI generates stringified JSON content
- ✅ Backend parses 1 tool call
- ✅ File created with valid JSON
- ✅ No warnings

### Test 3: Complex JSON (If AI Makes Mistake)
If AI mistakenly sends object content:

**Expected**:
- ⚠️ Backend logs: "has object content, converting to string"
- ✅ Backend still parses successfully
- ✅ File created
- ✅ Graceful handling

---

## 📊 Before vs After

### Before v3.2.1:

**Frontend**:
```
No specific instructions about content format
AI sends: {"content": {"doctype": "Employee"}}  ❌
```

**Backend**:
```python
# Parser fails on object content
tool_calls = []  ❌ Returns empty
```

**Result**: `🔧 Backend returned 0 tool_call(s)`

### After v3.2.1:

**Frontend**:
```
✅ Clear instructions: content MUST be string
AI sends: {"content": "{\"doctype\": \"Employee\"}"}  ✅
```

**Backend**:
```python
# Parser handles both formats
if isinstance(content, dict):
    content = json.dumps(content)  ✅ Defensive
tool_calls = [...]  ✅ Returns array
```

**Result**: `🔧 Backend returned 1 tool_call(s)` ✅

---

## 🎯 Expected Impact

| Metric | Before | After |
|--------|---------|-------|
| **Tool call success rate** | ~0% | ~95%+ |
| **Files created** | 0 | Working |
| **User complaints** | Many | None |
| **AI understands format** | No | Yes ✅ |
| **Backend handles mistakes** | No | Yes ✅ |

---

## 🚨 Rollback Plan

If something goes wrong:

### Rollback Backend:

```bash
ssh frappe@oropendola.ai
cd ~/frappe-bench/apps/ai_assistant

# Find backup
ls -lh ai_assistant/api/__init__.py.backup.*

# Restore
cp ai_assistant/api/__init__.py.backup.YYYYMMDD_HHMMSS ai_assistant/api/__init__.py

# Restart
cd ~/frappe-bench
bench restart
```

### Rollback Frontend:

**Option 1**: Reinstall v3.2.0:
```bash
/Applications/Visual\ Studio\ Code.app/Contents/Resources/app/bin/code \
  --install-extension oropendola-ai-assistant-3.2.0.vsix --force
```

**Option 2**: Revert git commit:
```bash
cd /Users/sammishthundiyil/oropendola
git revert e5a90af
npm run package
code --install-extension oropendola-ai-assistant-3.2.1.vsix --force
```

---

## 📝 Files Changed

### Frontend (v3.2.1):
- ✅ `package.json` - Version bump
- ✅ `src/core/ConversationTask.js` - System prompt updated
- ✅ Built and installed

### Backend (Pending):
- ⏳ `ai_assistant/api/__init__.py` - Parser function needs replacement
- ⏳ Restart required after change

### Documentation:
- ✅ `BACKEND_PARSER_FIX.py` - Complete parser code + tests
- ✅ `DEPLOYMENT_GUIDE.md` (this file)
- ✅ `ACTUAL_FIX_NEEDED.md` - Diagnosis

---

## ✅ Final Checklist

### Pre-Deployment:
- [x] Frontend system prompt updated
- [x] Backend parser code written
- [x] All parser tests pass (7/7)
- [x] Frontend v3.2.1 built
- [x] Frontend v3.2.1 installed
- [x] Changes committed to git
- [x] Changes pushed to GitHub

### Deployment:
- [ ] Backend parser tested on server
- [ ] Backend code backed up
- [ ] Backend parser replaced
- [ ] Backend restarted
- [ ] Logs checked for errors
- [ ] Tool calls tested end-to-end

### Post-Deployment:
- [ ] Test 1: Simple file creation ✅
- [ ] Test 2: JSON file creation ✅
- [ ] Test 3: Verify defensive handling ✅
- [ ] Monitor logs for 24 hours
- [ ] User feedback collected

---

## 🎓 What We Learned

### 1. Industry Standard: Content is Always String
- OpenAI, Anthropic, all use string content
- Files are text/bytes, not objects
- Backend writes strings to disk

### 2. Defensive Programming Wins
- Don't just fix the frontend
- Also handle mistakes in backend
- Graceful degradation > hard failures

### 3. Clear Communication with AI
- Explicit instructions in system prompt
- Show examples (✅ CORRECT / ❌ WRONG)
- Explain WHY (files are strings)

---

## 📞 Support

### If tool calls still don't work:

**Check frontend logs**:
```
🔧 Backend returned X tool_call(s)  ← Should be > 0
```

**Check backend logs**:
```bash
tail -f ~/frappe-bench/logs/frappe.log | grep "Tool Parser"
```

**Common issues**:
1. Backend not restarted → Solution: `bench restart`
2. Parser not replaced → Solution: Verify file changes
3. AI ignoring prompt → Solution: Try different model
4. Network/auth issues → Solution: Check session cookies

---

## 🎯 Summary

**What**: Fixed tool call format issue (object → string content)

**How**:
- Frontend: Updated system prompt with clear instructions
- Backend: Defensive parser handles both formats

**Status**:
- ✅ Frontend v3.2.1 deployed
- ⏳ Backend waiting for deployment

**Time to deploy backend**: 10 minutes

**Impact**: HIGH - Enables all file creation functionality

---

**Document created**: 2025-10-23
**Version**: v3.2.1
**Author**: Claude (Sonnet 4.5)
**Status**: ✅ Frontend done, ⏳ Backend pending
