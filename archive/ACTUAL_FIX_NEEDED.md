# Actual Fix Needed - Backend Parser
**Date**: 2025-10-23
**Priority**: 🔴 CRITICAL
**Status**: ❌ Backend `_parse_tool_calls()` is broken

---

## ✅ What Was Already Correct

1. **Frontend endpoint**: ✅ Calling `chat_completion` (correct!)
   - Line 852: `url: ${apiUrl}/api/method/ai_assistant.api.chat_completion`
   - Debug log was just outdated (now fixed)

2. **Backend structure**: ✅ Has correct flow
   - Calls `_parse_tool_calls()` at line 3301
   - Returns `tool_calls` array at line 3469
   - Strips tool blocks at line 3387

---

## ❌ What's Actually Broken

**Backend's `_parse_tool_calls()` function returns empty array `[]`**

### Evidence from Logs:

```
🔧 Backend returned 0 tool_call(s) in response  ← Empty!
```

While the content HAS tool calls:
```json
{
  "content": "...```tool_call\n{\"action\": \"create_file\"}..."  ← Present!
}
```

### Root Cause:

The backend regex pattern doesn't match the actual format of tool_call blocks:

**Pattern used:**
```python
pattern = r'```tool_call\s*\n(.*?)\n```'
```

**What AI actually generates:**
```
```tool_call
{
  "action": "create_file",
  "path": "test.json",
  "content": "{
  \"name\": \"Test\"
}"
}
```  ← Multiple newlines inside!
```

The pattern `\n```` expects the closing backticks immediately after a newline, but there are multiple newlines in the JSON content.

---

## ✅ The Fix

### File to Edit:
`~/frappe-bench/apps/ai_assistant/ai_assistant/api/__init__.py`

### Find Function (around line 3200):
```python
def _parse_tool_calls(ai_response_text):
    """Parse tool_call blocks from AI response"""
    if not ai_response_text:
        return []

    import re
    import json

    # OLD PATTERN - TOO STRICT
    pattern = r'```tool_call\s*\n(.*?)\n```'

    # ... rest of function
```

### Replace With:
```python
def _parse_tool_calls(ai_response_text):
    """
    Parse tool_call blocks from AI response

    Handles:
    - Multiple newlines in tool_call blocks
    - Escaped newlines from JSON encoding
    - Invalid JSON with literal newlines
    """
    if not ai_response_text:
        return []

    import re
    import json

    tool_calls = []

    # BETTER PATTERN - More flexible
    # Matches: ```tool_call ... ``` (any content between, including newlines)
    pattern = r'```tool_call\s*(.*?)\s*```'

    matches = re.findall(pattern, ai_response_text, flags=re.DOTALL | re.IGNORECASE)

    for match in matches:
        try:
            # Clean the match
            match_clean = match.strip()

            # Fix invalid JSON: replace literal newlines in JSON strings
            # This handles cases where AI puts raw newlines in strings
            match_clean = _fix_json_newlines(match_clean)

            # Parse JSON
            tool_call = json.loads(match_clean)
            tool_calls.append(tool_call)

        except json.JSONDecodeError as e:
            frappe.logger().error(f"[Tool Call Parser] Failed to parse: {e}")
            frappe.logger().error(f"[Tool Call Parser] Content: {match[:200]}")
            continue

    frappe.logger().info(f"[Tool Call Parser] Parsed {len(tool_calls)} tool calls")
    return tool_calls


def _fix_json_newlines(json_str):
    """
    Fix JSON strings that have literal newlines (invalid JSON)

    Example:
        Input:  {"content": "line1
                 line2"}
        Output: {"content": "line1\\nline2"}
    """
    import re

    def replace_newlines_in_strings(match):
        # Get the string content (between quotes)
        content = match.group(1)
        # Replace literal newlines with \\n
        content_fixed = content.replace('\n', '\\n')
        # Return the fixed string with quotes
        return f'"{content_fixed}"'

    # Match quoted strings (including multi-line strings)
    pattern = r'"([^"]*(?:\n[^"]*)*)"'
    json_str_fixed = re.sub(pattern, replace_newlines_in_strings, json_str, flags=re.DOTALL)

    return json_str_fixed
```

---

## 🧪 Test the Fix

### Before Deploying:

Run the test script on the backend:

```bash
cd ~/frappe-bench
python3 ~/test_backend_parser.py
```

Expected output:
```
Test 1: 1 tool calls - ✓ PASS
Test 2: 1 tool calls - ✓ PASS
Test 3: 1 tool calls - ✓ PASS
```

### Deploy Steps:

```bash
# 1. SSH to backend
ssh frappe@oropendola.ai

# 2. Backup current file
cd ~/frappe-bench/apps/ai_assistant
cp ai_assistant/api/__init__.py ai_assistant/api/__init__.py.backup.$(date +%Y%m%d_%H%M%S)

# 3. Edit the file
nano ai_assistant/api/__init__.py

# 4. Find _parse_tool_calls (around line 3200)
# Press Ctrl+W, type "_parse_tool_calls", press Enter

# 5. Replace the function with the fixed version above

# 6. Also add the _fix_json_newlines helper function after it

# 7. Save and exit (Ctrl+X, Y, Enter)

# 8. Restart backend
cd ~/frappe-bench
bench restart

# 9. Check logs
tail -f ~/frappe-bench/logs/oropendola.ai.log
```

---

## 📊 Expected Results

### Before Fix:
```
[Extension Host] 🔧 Backend returned 0 tool_call(s) in response  ❌
[Extension Host] 🧹 Cleaned response: ...```tool_call\n{...}```  ❌ Still has blocks
```

### After Fix:
```
[Backend] [Tool Call Parser] Parsed 1 tool calls               ✅
[Extension Host] 🔧 Backend returned 1 tool_call(s) in response ✅
[Extension Host] 🧹 Cleaned response: I'll create a file       ✅ Clean!
[Extension Host] 📂 File changes: 1 files affected             ✅ File created!
```

---

## 🎯 Why This is the Real Issue

| Layer | Status | Details |
|-------|--------|---------|
| **Frontend** | ✅ Correct | Calls `chat_completion` endpoint |
| **Backend endpoint** | ✅ Correct | Calls `_parse_tool_calls()` |
| **Backend parser** | ❌ **BROKEN** | Regex doesn't match tool_call blocks |
| **Backend stripping** | ⚠️ Skipped | Only runs if parser found tool calls |
| **Backend response** | ❌ Wrong | Returns empty `tool_calls: []` |

---

## 🔍 Debug Steps

If the fix doesn't work, add this debug logging:

```python
def _parse_tool_calls(ai_response_text):
    if not ai_response_text:
        return []

    # DEBUG: Log what we're parsing
    frappe.logger().info(f"[DEBUG] Parsing response length: {len(ai_response_text)}")
    frappe.logger().info(f"[DEBUG] Response preview: {ai_response_text[:500]}")

    # Check if tool_call exists at all
    if '```tool_call' in ai_response_text:
        frappe.logger().info("[DEBUG] ✓ Response contains '```tool_call'")
    else:
        frappe.logger().warning("[DEBUG] ✗ Response does NOT contain '```tool_call'")
        return []

    # ... rest of function
```

Then check backend logs to see what's happening.

---

## 📝 Summary

1. **Frontend**: ✅ Already calling correct endpoint (debug log now fixed)
2. **Backend**: ❌ Parser regex is too strict, needs to be more flexible
3. **Fix**: Update `_parse_tool_calls()` function in backend
4. **Time**: 10 minutes to deploy
5. **Impact**: Enables all tool calling functionality

---

**🔴 CRITICAL: The parser regex pattern needs to be fixed in the backend.**

The pattern `r'```tool_call\s*\n(.*?)\n```'` is too strict. It expects a single newline before closing backticks, but AI responses have multiple newlines in the JSON content.

Use `r'```tool_call\s*(.*?)\s*```'` instead (more flexible).

---

**Document created**: 2025-10-23
**Issue**: Backend `_parse_tool_calls()` regex too strict
**Fix**: More flexible regex pattern
**Time to fix**: 10 minutes on backend
**Files**: `ai_assistant/api/__init__.py` line ~3200
