# 🚨 URGENT: Backend Deployment Required

## Current Status

**Frontend:** ✅ Working perfectly (dynamic discovery fixed)
**Backend:** ❌ Broken (tool calls not working)

## Evidence from Logs

```
[Extension Host] 🔍 Response data: {
  "message": {
    "content": "I'll create an Employee doctype...```tool_call\n{...}"
  }
}
[Extension Host] 🔧 Backend returned 0 tool_call(s) in response
```

**Problem:** Backend has tool_call blocks in the content but returns 0 parsed tool calls.

**Result:**
- User sees raw JSON in chat ❌
- Tool calls don't execute ❌
- AI thinks it's done but nothing happened ❌

---

## Fix Required: Deploy to Backend Server

### Step 1: SSH to Backend

```bash
ssh your_username@oropendola.ai
cd ~/frappe-bench/apps/ai_assistant/ai_assistant/
```

### Step 2: Backup Current Code

```bash
cp api.py api.py.backup.$(date +%Y%m%d_%H%M%S)
ls -lh api.py.backup.*
```

### Step 3: Edit api.py

```bash
nano api.py
```

### Step 4: Add Tool Call Stripping Function

From [BACKEND_TOOL_CALL_FIX.py](BACKEND_TOOL_CALL_FIX.py), add this function:

```python
import re

def strip_tool_call_blocks(text):
    """
    Remove all ```tool_call blocks from AI response text

    This function removes the raw tool call markdown blocks that are
    meant for backend parsing, not user display.
    """
    if not text:
        return text

    # Pattern to match tool_call blocks: ```tool_call ... ```
    pattern = r'```tool_call\s*\n.*?\n```'

    # Remove all tool_call blocks
    cleaned_text = re.sub(pattern, '', text, flags=re.DOTALL)

    # Clean up excessive newlines left behind
    cleaned_text = re.sub(r'\n{3,}', '\n\n', cleaned_text)

    # Trim whitespace
    cleaned_text = cleaned_text.strip()

    frappe.logger().info(f"[Tool Call Stripping] Original: {len(text)}, Cleaned: {len(cleaned_text)}")

    return cleaned_text
```

### Step 5: Update _parse_tool_calls Function

Find your `_parse_tool_calls()` function and update it:

```python
def _parse_tool_calls(response_text):
    """
    Parse tool calls from AI response and return cleaned text + tool calls
    """
    tool_calls = []

    if not response_text:
        return response_text, tool_calls

    try:
        # Find all tool_call blocks
        pattern = r'```tool_call\s*\n(.*?)\n```'
        matches = re.finditer(pattern, response_text, re.DOTALL)

        for match in matches:
            tool_call_json = match.group(1).strip()

            try:
                # Parse JSON
                tool_call = json.loads(tool_call_json)
                tool_calls.append(tool_call)

                frappe.logger().info(f"[Tool Call] Parsed: {tool_call.get('action')}")

            except json.JSONDecodeError as e:
                frappe.logger().error(f"[Tool Call] JSON parse error: {str(e)}")

        # ✨ NEW: Strip tool_call blocks from response text
        cleaned_text = strip_tool_call_blocks(response_text)

        frappe.logger().info(f"[Tool Call] Total parsed: {len(tool_calls)}")
        frappe.logger().info(f"[Tool Call] Cleaned text length: {len(cleaned_text)}")

        return cleaned_text, tool_calls

    except Exception as e:
        frappe.logger().error(f"[Tool Call] Parse error: {str(e)}")
        return response_text, tool_calls
```

### Step 6: Update chat() Endpoint

Make sure your chat endpoint uses the cleaned text:

```python
@frappe.whitelist(allow_guest=False)
def chat(messages=None, message=None, conversation_id=None, mode='agent', context=None):
    """
    Main chat endpoint - UPDATED with tool call stripping
    """
    try:
        # ... your existing code to call AI model ...

        ai_response_raw = call_your_ai_model(messages, mode, context)

        # ✨ Parse tool calls AND strip blocks
        ai_response_clean, tool_calls = _parse_tool_calls(ai_response_raw)

        frappe.logger().info(f"[Chat API] Raw response: {len(ai_response_raw)} chars")
        frappe.logger().info(f"[Chat API] Cleaned response: {len(ai_response_clean)} chars")
        frappe.logger().info(f"[Chat API] Tool calls: {len(tool_calls)}")

        # Return cleaned text (no tool_call blocks)
        return {
            'success': True,
            'role': 'assistant',
            'content': ai_response_clean,  # ← CLEANED TEXT
            'tool_calls': tool_calls,
            'conversation_id': conversation_id or frappe.generate_hash(length=12)
        }

    except Exception as e:
        frappe.logger().error(f"[Chat API] Error: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }
```

### Step 7: Restart Backend

```bash
bench restart
```

### Step 8: Test in VS Code

1. Send a message asking AI to create a file
2. Check logs - should see:
   ```
   [Tool Call] Total parsed: 1
   [Tool Call] Cleaned text length: 123
   ```
3. File should actually be created ✅
4. Chat should NOT show ```tool_call blocks ✅

---

## Verification

After deployment, your logs should show:

**Before (broken):**
```
🔧 Backend returned 0 tool_call(s) in response
```

**After (fixed):**
```
[Tool Call] Parsed: create_file
[Tool Call] Total parsed: 1
[Tool Call] Cleaned text length: 85
🔧 Backend returned 1 tool_call(s) in response
```

---

## Complete Fix Files

All code is in these files in your repository:

1. **[BACKEND_TOOL_CALL_FIX.py](BACKEND_TOOL_CALL_FIX.py)** - Complete implementation
2. **[BACKEND_IMAGE_ATTACHMENT_FIX.py](BACKEND_IMAGE_ATTACHMENT_FIX.py)** - Image processing fix
3. **[BACKEND_FIXES_README.md](BACKEND_FIXES_README.md)** - Detailed guide
4. **[BACKEND_DEPLOYMENT_GUIDE.sh](BACKEND_DEPLOYMENT_GUIDE.sh)** - Automated script

---

## Why This Is Urgent

**Current experience:**
- User: "Create an Employee doctype"
- AI: "I'll create... ```tool_call {action: create_file}```" ← User sees this
- Nothing happens ← Files not created
- User confused ← "Communication stopped"

**After fix:**
- User: "Create an Employee doctype"
- AI: "I'll create an Employee doctype for you" ← Clean message
- Files created ← Tool calls execute
- User happy ← Everything works

---

## Time Required

**15-20 minutes** including:
- SSH to backend (2 min)
- Backup code (1 min)
- Add functions (10 min)
- Restart bench (2 min)
- Test (5 min)

---

## Need Help?

If you encounter issues:

1. Check backend logs:
   ```bash
   tail -f ~/frappe-bench/logs/oropendola.ai.log
   ```

2. Look for these lines after sending a message:
   ```
   [Tool Call] Parsed: create_file
   [Tool Call] Total parsed: 1
   [Tool Call] Cleaned text length: 85
   ```

3. If still seeing 0 tool calls:
   - Verify functions were added correctly
   - Check that chat() uses cleaned text
   - Ensure bench restart completed

---

**The frontend is perfect now. Deploy the backend fixes to complete the system! 🚀**
