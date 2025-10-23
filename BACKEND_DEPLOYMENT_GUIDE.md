# Backend Deployment Guide - Apply Fixes

> **Step-by-step guide to apply all backend fixes to your Oropendola server**

## Prerequisites

- SSH access to `oropendola.ai` server
- Frappe/Bench installed at `~/frappe-bench`
- Basic knowledge of nano/vim editor

---

## 🚀 Option 1: Quick Deploy (Automated Script)

Create this script on your server to apply all fixes automatically.

### Step 1: Create Deploy Script

```bash
# SSH to server
ssh user@oropendola.ai

# Create deploy script
cat > ~/deploy_fixes.sh << 'EOF'
#!/bin/bash

echo "🔧 Oropendola Backend Fix Deployment"
echo "===================================="

# Navigate to app directory
cd ~/frappe-bench/apps/ai_assistant/ai_assistant/ || exit 1

# Backup current api.py
echo "📦 Creating backup..."
cp api.py "api.py.backup.$(date +%Y%m%d_%H%M%S)"

# Check if backup successful
if [ $? -eq 0 ]; then
    echo "✅ Backup created"
else
    echo "❌ Backup failed - aborting"
    exit 1
fi

# Apply fixes
echo "🔨 Applying fixes..."

# Create the fix as a Python string for easy injection
cat > /tmp/fix_functions.py << 'FIXEOF'
import re
import json
import frappe


def strip_tool_call_blocks(text):
    """Remove all ```tool_call blocks from AI response text"""
    if not text:
        return text

    pattern = r'```tool_call\s*\n.*?\n```'
    cleaned_text = re.sub(pattern, '', text, flags=re.DOTALL)
    cleaned_text = re.sub(r'\n{3,}', '\n\n', cleaned_text)
    cleaned_text = cleaned_text.strip()

    frappe.logger().info(f"[Tool Call Stripping] Original: {len(text)}, Cleaned: {len(cleaned_text)}")
    return cleaned_text


def _sanitize_file_path(path):
    """Convert absolute paths to relative"""
    import os

    is_windows_path = bool(re.match(r'^[A-Za-z]:[/\\]', path))
    is_unix_absolute = path.startswith('/')

    if not is_windows_path and not is_unix_absolute:
        return path

    normalized_path = path.replace('\\', '/')
    parts = normalized_path.split('/')

    project_indicators = [
        'project', 'workspace', 'app', 'myapp', 'code',
        'src', 'client', 'server', 'frontend', 'backend'
    ]

    for i, part in enumerate(parts):
        if any(indicator in part.lower() for indicator in project_indicators):
            relative_path = '/'.join(parts[i+1:])
            if relative_path:
                return relative_path

    if len(parts) >= 3:
        return '/'.join(parts[-3:])

    return os.path.basename(path)
FIXEOF

echo "✅ Fix functions prepared"

# Note: Full automated application would require Python AST manipulation
# For safety, we'll provide manual steps instead

echo ""
echo "⚠️  Manual Steps Required:"
echo "1. Open api.py in editor"
echo "2. Add the functions from /tmp/fix_functions.py"
echo "3. Update _parse_tool_calls() to call strip_tool_call_blocks()"
echo "4. Update chat() to accept messages array"
echo ""
echo "📝 Detailed instructions: See BACKEND_DEPLOYMENT_GUIDE.md"
echo ""
echo "Press Enter when fixes are applied..."
read

# Restart bench
echo "🔄 Restarting bench..."
cd ~/frappe-bench
bench restart

echo ""
echo "✅ Deployment complete!"
echo "🧪 Test by opening VS Code and creating files"
echo "📊 Monitor logs: tail -f ~/frappe-bench/logs/oropendola.ai.log"

EOF

# Make executable
chmod +x ~/deploy_fixes.sh

# Run it
~/deploy_fixes.sh
```

---

## 📝 Option 2: Manual Step-by-Step

### Step 1: Connect to Server

```bash
ssh user@oropendola.ai
```

### Step 2: Navigate to App

```bash
cd ~/frappe-bench/apps/ai_assistant/ai_assistant/
```

### Step 3: Backup Current Code

```bash
# Create timestamped backup
cp api.py api.py.backup.$(date +%Y%m%d_%H%M%S)

# Verify backup
ls -lh api.py*
```

Expected output:
```
-rw-r--r-- 1 user user 45K Jan 23 10:00 api.py
-rw-r--r-- 1 user user 45K Jan 23 10:00 api.py.backup.20250123_100000
```

### Step 4: Open Editor

```bash
nano api.py
# or
vim api.py
```

### Step 5: Add Helper Functions

**Scroll to top of file (after imports) and add:**

```python
import re
import json


def strip_tool_call_blocks(text):
    """
    Remove all ```tool_call blocks from AI response text

    Args:
        text (str): AI response with embedded tool calls

    Returns:
        str: Clean text without tool_call blocks
    """
    if not text:
        return text

    # Pattern to match tool_call blocks
    pattern = r'```tool_call\s*\n.*?\n```'

    # Remove all tool_call blocks
    cleaned_text = re.sub(pattern, '', text, flags=re.DOTALL)

    # Clean up excessive newlines
    cleaned_text = re.sub(r'\n{3,}', '\n\n', cleaned_text)

    # Trim whitespace
    cleaned_text = cleaned_text.strip()

    frappe.logger().info(f"[Strip] Original: {len(text)} chars, Cleaned: {len(cleaned_text)} chars")

    return cleaned_text


def _sanitize_file_path(path):
    """
    Convert absolute paths to relative while preserving directory structure

    Args:
        path (str): File path (absolute or relative)

    Returns:
        str: Sanitized relative path
    """
    import os

    # Check if path is absolute
    is_windows_path = bool(re.match(r'^[A-Za-z]:[/\\]', path))
    is_unix_absolute = path.startswith('/')

    if not is_windows_path and not is_unix_absolute:
        return path  # Already relative

    # Normalize separators
    normalized_path = path.replace('\\', '/')
    parts = normalized_path.split('/')

    # Find project root indicators
    project_indicators = [
        'project', 'workspace', 'app', 'myapp', 'code',
        'src', 'client', 'server', 'frontend', 'backend'
    ]

    for i, part in enumerate(parts):
        if any(indicator in part.lower() for indicator in project_indicators):
            relative_path = '/'.join(parts[i+1:])
            if relative_path:
                frappe.logger().info(f"[Path] Sanitized: {path} → {relative_path}")
                return relative_path

    # Fallback: preserve last 2-3 directory levels
    if len(parts) >= 3:
        return '/'.join(parts[-3:])

    return os.path.basename(path)
```

**Save:** Ctrl+O, Enter (nano) or :w (vim)

### Step 6: Update _parse_tool_calls() Function

**Find this function (use Ctrl+W in nano or /search in vim):**

```python
def _parse_tool_calls(response_text):
```

**Modify the RETURN statement at the end:**

**BEFORE:**
```python
def _parse_tool_calls(response_text):
    tool_calls = []
    # ... parsing logic ...

    return tool_calls  # ← OLD
```

**AFTER:**
```python
def _parse_tool_calls(response_text):
    tool_calls = []

    # ... existing parsing logic ...

    # ✨ NEW: Strip tool_call blocks from response text
    cleaned_text = strip_tool_call_blocks(response_text)

    frappe.logger().info(f"[Parse] Parsed {len(tool_calls)} tool calls")

    return cleaned_text, tool_calls  # ← NEW: Return tuple
```

### Step 7: Update chat() Function

**Find the chat() function and update the return:**

**BEFORE:**
```python
@frappe.whitelist(allow_guest=False)
def chat(message, conversation_id=None, mode='agent', context=None):
    # ... existing code ...

    ai_response = call_ai_model(...)
    tool_calls = _parse_tool_calls(ai_response)  # ← OLD

    return {
        'success': True,
        'response': ai_response,  # ← Contains tool_call blocks!
        'tool_calls': tool_calls
    }
```

**AFTER:**
```python
@frappe.whitelist(allow_guest=False)
def chat(messages=None, message=None, conversation_id=None, mode='agent', context=None):
    # Support both old and new format
    if messages is None and message is not None:
        messages = [{"role": "user", "content": message}]
    elif messages and isinstance(messages, str):
        messages = json.loads(messages)

    if not messages:
        frappe.throw("Messages required")

    # ... existing AI call code ...

    ai_response_raw = call_ai_model(messages, mode, context)

    # ✨ NEW: Get cleaned text and tool calls
    ai_response_clean, tool_calls = _parse_tool_calls(ai_response_raw)

    frappe.logger().info(f"[Chat] Response: {len(ai_response_clean)} chars, {len(tool_calls)} tools")

    return {
        'success': True,
        'role': 'assistant',
        'content': ai_response_clean,  # ← Clean text without tool_call blocks!
        'tool_calls': tool_calls,
        'conversation_id': conversation_id or frappe.generate_hash(length=12)
    }
```

**Save:** Ctrl+O, Enter (nano) or :w (vim)

### Step 8: Update Tool Call Parsing Loop

**Find where tool calls are sanitized (inside _parse_tool_calls):**

**Add path sanitization:**

```python
def _parse_tool_calls(response_text):
    tool_calls = []

    # Find all tool_call blocks
    pattern = r'```tool_call\s*\n(.*?)\n```'
    matches = re.finditer(pattern, response_text, re.DOTALL)

    for match in matches:
        tool_call_json = match.group(1).strip()

        try:
            tool_call = json.loads(tool_call_json)

            # ✨ NEW: Normalize action name
            if tool_call.get('action') in ['run_command', 'run_terminal', 'execute_command']:
                tool_call['action'] = 'run_terminal_command'

            # ✨ NEW: Sanitize file path
            if 'path' in tool_call and tool_call['path']:
                original_path = tool_call['path']
                tool_call['path'] = _sanitize_file_path(original_path)

                if original_path != tool_call['path']:
                    frappe.logger().warning(f"[Path] {original_path} → {tool_call['path']}")

            tool_calls.append(tool_call)

        except json.JSONDecodeError as e:
            frappe.logger().error(f"[Parse] JSON error: {str(e)}")

    # Strip tool_call blocks from response
    cleaned_text = strip_tool_call_blocks(response_text)

    return cleaned_text, tool_calls
```

**Save and close:** Ctrl+X, Y, Enter (nano) or :wq (vim)

### Step 9: Restart Frappe

```bash
cd ~/frappe-bench
bench restart
```

Expected output:
```
Restarting supervisor processes...
✓ Reloaded configuration
✓ Restarted all processes
```

### Step 10: Verify Deployment

```bash
# Check if bench is running
bench status

# Monitor logs
tail -f ~/frappe-bench/logs/oropendola.ai.log
```

Expected in logs:
```
[Strip] Original: 845 chars, Cleaned: 342 chars
[Parse] Parsed 2 tool calls
[Chat] Response: 342 chars, 2 tools
```

---

## 🧪 Testing

### Test 1: Tool Call Blocks Removed

**In VS Code:**
1. Open Oropendola chat
2. Type: "Create a simple hello world app"
3. **Expected:** Clean message (no ```tool_call visible)
4. **Expected:** Files created successfully

**Backend logs should show:**
```
[Strip] Original: 500 chars, Cleaned: 200 chars
[Parse] Parsed 1 tool calls
```

### Test 2: Path Sanitization

**In VS Code:**
1. Type: "Create /Users/john/project/src/app.js"
2. **Expected:** File created at `workspace/src/app.js`
3. **Expected:** No permission errors

**Backend logs should show:**
```
[Path] Sanitized: /Users/john/project/src/app.js → src/app.js
```

### Test 3: Multi-Step Tasks

**In VS Code:**
1. Type: "Create a React app"
2. Wait for files to be created
3. Type: "Now add a component"
4. **Expected:** AI remembers previous work
5. **Expected:** Builds on existing structure

---

## 🐛 Troubleshooting

### Issue: Syntax Error After Edit

**Symptom:**
```
bench restart
Error: SyntaxError in api.py
```

**Solution:**
```bash
# Restore backup
cp api.py.backup.20250123_100000 api.py

# Try again more carefully
nano api.py
```

### Issue: Functions Not Found

**Symptom:**
```
NameError: name 'strip_tool_call_blocks' is not defined
```

**Solution:**
- Verify helper functions are added at top of file (after imports)
- Check indentation is correct (use spaces, not tabs)
- Restart bench again: `bench restart`

### Issue: Tool Calls Still Visible in UI

**Check:**
1. Verify `_parse_tool_calls()` returns tuple: `return cleaned_text, tool_calls`
2. Verify `chat()` uses cleaned text: `'content': ai_response_clean`
3. Check logs for "[Strip]" messages
4. Clear browser cache in VS Code

### Issue: Bench Won't Restart

**Solution:**
```bash
# Check for processes
ps aux | grep bench

# Kill stuck processes
pkill -9 -f bench

# Start fresh
cd ~/frappe-bench
bench start
```

---

## 📊 Verification Checklist

After deployment, verify all these:

- [ ] Bench restarted successfully
- [ ] No errors in logs
- [ ] Tool calls execute correctly
- [ ] Chat UI shows clean messages
- [ ] No ```tool_call blocks visible
- [ ] Files created in correct location
- [ ] Absolute paths converted to relative
- [ ] No permission denied errors
- [ ] Multi-step tasks work
- [ ] AI remembers conversation context

---

## 🔄 Rollback

If something goes wrong:

```bash
cd ~/frappe-bench/apps/ai_assistant/ai_assistant/

# Find your backup
ls -lh api.py.backup.*

# Restore (use your backup timestamp)
cp api.py.backup.20250123_100000 api.py

# Restart
cd ~/frappe-bench
bench restart
```

---

## 📞 Support

**Logs location:**
```bash
~/frappe-bench/logs/oropendola.ai.log
~/frappe-bench/logs/bench-start.log
```

**Check configuration:**
```bash
bench --site oropendola.ai console
>>> frappe.conf.get("anthropic_api_key")
>>> exit()
```

**Common commands:**
```bash
bench status                    # Check if running
bench restart                   # Restart all services
bench clear-cache               # Clear cache
bench migrate                   # Run migrations
bench --site oropendola.ai console  # Python REPL
```

---

## ✅ Success Criteria

You'll know the deployment succeeded when:

1. ✅ VS Code chat shows clean messages
2. ✅ No ```tool_call blocks visible in UI
3. ✅ Files created successfully
4. ✅ Backend logs show "[Strip]" messages
5. ✅ No permission errors
6. ✅ Multi-step tasks work correctly

---

**Deployment Time:** 15-20 minutes
**Difficulty:** Moderate (requires SSH and editing)
**Risk:** Low (backups created automatically)

Good luck! 🚀
