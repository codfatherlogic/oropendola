# ============================================
# CRITICAL BACKEND FIX - Tool Call Block Stripping
# ============================================
# File: ai_assistant/ai_assistant/api.py (or api/__init__.py)
# Purpose: Strip tool_call blocks from AI response before sending to frontend
#
# ⚠️ IMPORTANT: This is a PYTHON file for your Frappe backend server
#    Apply this fix to your backend at: ~/frappe-bench/apps/ai_assistant/
#
# ISSUE: Tool call blocks (```tool_call) appearing in chat UI
# CAUSE: Backend not stripping tool_call blocks from response text
# RESULT: User sees raw JSON in chat instead of clean message
#
# INSTRUCTIONS:
# 1. SSH into your backend server: ssh user@oropendola.ai
# 2. Navigate to: cd ~/frappe-bench/apps/ai_assistant/ai_assistant/
# 3. Backup current api.py: cp api.py api.py.backup
# 4. Edit api.py: nano api.py
# 5. Find the _parse_tool_calls() or chat() function
# 6. Add the strip_tool_call_blocks() function below
# 7. Call it after parsing tool calls
# 8. Save and restart: bench restart
# 9. Test in VS Code - tool_call blocks should NOT appear
# ============================================

import frappe
import re
import json


def strip_tool_call_blocks(text):
    """
    Remove all ```tool_call blocks from AI response text

    This function removes the raw tool call markdown blocks that are
    meant for backend parsing, not user display.

    Args:
        text (str): AI response with embedded tool calls

    Returns:
        str: Clean text without tool_call blocks

    Example:
        Input:
            I'll create a file...

            ```tool_call
            {"action": "create_file", "path": "app.js"}
            ```

            Done!

        Output:
            I'll create a file...

            Done!
    """
    if not text:
        return text

    # Pattern to match tool_call blocks:
    # ```tool_call ... ```
    pattern = r'```tool_call\s*\n.*?\n```'

    # Remove all tool_call blocks
    cleaned_text = re.sub(pattern, '', text, flags=re.DOTALL)

    # Clean up excessive newlines left behind
    cleaned_text = re.sub(r'\n{3,}', '\n\n', cleaned_text)

    # Trim whitespace
    cleaned_text = cleaned_text.strip()

    frappe.logger().info(f"[Tool Call Stripping] Original length: {len(text)}, Cleaned length: {len(cleaned_text)}")

    return cleaned_text


def _parse_tool_calls(response_text):
    """
    Parse tool calls from AI response and return cleaned text + tool calls

    This is the UPDATED version that strips tool_call blocks

    Args:
        response_text (str): Raw AI response with tool calls

    Returns:
        tuple: (cleaned_text, tool_calls_list)
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

                # Normalize action name
                if tool_call.get('action') in ['run_command', 'run_terminal', 'execute_command']:
                    tool_call['action'] = 'run_terminal_command'
                    frappe.logger().info(f"[Tool Call] Normalized action: {tool_call.get('action')} → run_terminal_command")

                # Sanitize file path if present
                if 'path' in tool_call and tool_call['path']:
                    original_path = tool_call['path']
                    tool_call['path'] = _sanitize_file_path(original_path)

                    if original_path != tool_call['path']:
                        frappe.logger().warning(f"[Path Sanitization] {original_path} → {tool_call['path']}")

                tool_calls.append(tool_call)
                frappe.logger().info(f"[Tool Call] Parsed: {tool_call.get('action')} - {tool_call.get('path', tool_call.get('command', 'N/A'))}")

            except json.JSONDecodeError as e:
                frappe.logger().error(f"[Tool Call] JSON parse error: {str(e)}")
                frappe.logger().error(f"[Tool Call] Invalid JSON: {tool_call_json[:200]}")

        # ✨ NEW: Strip tool_call blocks from response text
        cleaned_text = strip_tool_call_blocks(response_text)

        frappe.logger().info(f"[Tool Call] Total parsed: {len(tool_calls)}")
        frappe.logger().info(f"[Tool Call] Cleaned text length: {len(cleaned_text)}")

        return cleaned_text, tool_calls

    except Exception as e:
        frappe.logger().error(f"[Tool Call] Parse error: {str(e)}")
        return response_text, tool_calls


def _sanitize_file_path(path):
    """
    Convert absolute paths to relative while preserving directory structure

    This prevents permission errors when AI generates absolute paths

    Args:
        path (str): File path (absolute or relative)

    Returns:
        str: Sanitized relative path

    Examples:
        /Users/john/project/src/app.js → src/app.js
        C:\\Users\\john\\project\\src\\app.js → src/app.js
        /home/user/myapp/components/Button.js → components/Button.js
        src/app.js → src/app.js (already relative)
    """
    import os

    # Check if path is absolute
    is_windows_path = bool(re.match(r'^[A-Za-z]:[/\\\\]', path))
    is_unix_absolute = path.startswith('/')

    if not is_windows_path and not is_unix_absolute:
        return path  # Already relative

    # Normalize separators
    normalized_path = path.replace('\\\\', '/')
    parts = normalized_path.split('/')

    # Find project root indicators and extract relative path
    project_indicators = [
        'project', 'workspace', 'app', 'myapp', 'code',
        'src', 'client', 'server', 'frontend', 'backend'
    ]

    for i, part in enumerate(parts):
        # Check if this part looks like a project folder
        if any(indicator in part.lower() for indicator in project_indicators):
            # Return everything after this folder
            relative_path = '/'.join(parts[i+1:])
            if relative_path:
                frappe.logger().info(f"[Path Sanitization] Found project marker '{part}', extracting: {relative_path}")
                return relative_path

    # Fallback: preserve last 2-3 directory levels
    if len(parts) >= 3:
        fallback_path = '/'.join(parts[-3:])
        frappe.logger().warning(f"[Path Sanitization] No project marker found, using last 3 levels: {fallback_path}")
        return fallback_path

    # Last resort: just use filename
    return os.path.basename(path)


@frappe.whitelist(allow_guest=False)
def chat(messages=None, message=None, conversation_id=None, mode='agent', context=None):
    """
    Main chat endpoint - UPDATED with tool call stripping

    This version ensures tool_call blocks are removed from response text
    before sending to frontend
    """
    try:
        # === Parse messages (same as before) ===
        if messages is None and message is not None:
            messages = [{"role": "user", "content": message}]
        elif messages and isinstance(messages, str):
            messages = json.loads(messages)

        if not messages:
            frappe.throw("Messages required")

        # === Call AI model (your existing code) ===
        ai_response_raw = call_your_ai_model(messages, mode, context)

        # === Parse tool calls AND strip blocks ===
        # ✨ THIS IS THE KEY FIX
        ai_response_clean, tool_calls = _parse_tool_calls(ai_response_raw)

        frappe.logger().info(f"[Chat API] Raw response: {len(ai_response_raw)} chars")
        frappe.logger().info(f"[Chat API] Cleaned response: {len(ai_response_clean)} chars")
        frappe.logger().info(f"[Chat API] Tool calls: {len(tool_calls)}")

        # === Return response ===
        return {
            'success': True,
            'role': 'assistant',
            'content': ai_response_clean,  # ← CLEANED TEXT (no tool_call blocks)
            'tool_calls': tool_calls,
            'conversation_id': conversation_id or frappe.generate_hash(length=12)
        }

    except Exception as e:
        frappe.logger().error(f"[Chat API] Error: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }


def call_your_ai_model(messages, mode, context):
    """
    Your existing AI model integration

    This should return the RAW AI response with tool_call blocks embedded
    The _parse_tool_calls() function will clean it up
    """
    # Your existing code here
    # Returns: "I'll create a file...\n\n```tool_call\n{...}\n```"
    pass


# ============================================
# TESTING
# ============================================

def test_strip_tool_call_blocks():
    """Test the stripping function"""

    test_input = """I'll create a comprehensive Electron.js POS application with all the essential features you mentioned. Let me start by setting up the project structure with the main entry point and core modules.

```tool_call
{
  "action": "create_file",
  "path": "package.json",
  "content": "{\\"name\\": \\"electron-pos\\"}",
  "description": "Create package.json"
}
```

This will set up the basic project structure."""

    expected_output = """I'll create a comprehensive Electron.js POS application with all the essential features you mentioned. Let me start by setting up the project structure with the main entry point and core modules.

This will set up the basic project structure."""

    result = strip_tool_call_blocks(test_input)

    print("INPUT:")
    print(test_input)
    print("\n" + "="*50 + "\n")
    print("OUTPUT:")
    print(result)
    print("\n" + "="*50 + "\n")
    print("EXPECTED:")
    print(expected_output)
    print("\n" + "="*50 + "\n")
    print(f"Match: {result.strip() == expected_output.strip()}")


# ============================================
# VERIFICATION CHECKLIST
# ============================================
# After applying this fix, verify:
#
# ✅ 1. Tool calls still execute correctly
# ✅ 2. Chat UI shows clean message (no ```tool_call visible)
# ✅ 3. Backend logs show: "Cleaned response: X chars"
# ✅ 4. File operations work (create, modify, delete)
# ✅ 5. Terminal commands work (npm install, etc.)
# ✅ 6. Absolute paths converted to relative
# ✅ 7. No permission errors
#
# If any fail, check backend logs: tail -f ~/frappe-bench/logs/oropendola.ai.log
# ============================================


# ============================================
# SUMMARY
# ============================================
# BEFORE (broken):
#   AI Response → "I'll create...\n```tool_call\n{...}\n```"
#   → Sent to frontend AS-IS
#   → User sees raw tool_call blocks in chat
#
# AFTER (fixed):
#   AI Response → "I'll create...\n```tool_call\n{...}\n```"
#   → _parse_tool_calls() extracts tool calls
#   → strip_tool_call_blocks() removes blocks
#   → Clean text sent: "I'll create..."
#   → Tool calls sent separately
#   → User sees clean message, tools execute silently
# ============================================
