#!/usr/bin/env python3
"""
Backend Tool Call Parser - COMPLETE FIX

This is the production-ready parser that handles:
1. Standard format with string content
2. Invalid format with object content (AI mistake)
3. Multi-line tool_call blocks
4. Escaped newlines from JSON encoding

Deploy to: ~/frappe-bench/apps/ai_assistant/ai_assistant/api/__init__.py

Replace the existing _parse_tool_calls() function with this code.
"""

import re
import json


def _parse_tool_calls(ai_response_text):
    """
    Parse tool_call blocks from AI response

    Handles:
    - String content (correct format)
    - Object content (incorrect but fixable)
    - Multi-line tool_call blocks
    - Escaped newlines

    Returns:
        list: Parsed and validated tool call objects
    """
    if not ai_response_text:
        return []

    try:
        import frappe
    except ImportError:
        # For testing outside Frappe
        class FakeLogger:
            def info(self, msg): print(f"[INFO] {msg}")
            def error(self, msg): print(f"[ERROR] {msg}")
            def warning(self, msg): print(f"[WARNING] {msg}")

        class FakeFrappe:
            def logger(self): return FakeLogger()

        frappe = FakeFrappe()

    frappe.logger().info(f"[Tool Parser] Parsing response ({len(ai_response_text)} chars)")

    tool_calls = []

    # Pattern: Match ```tool_call ... ``` (flexible, allows any content)
    pattern = r'```tool_call\s*(.*?)\s*```'

    matches = re.findall(pattern, ai_response_text, flags=re.DOTALL | re.IGNORECASE)

    frappe.logger().info(f"[Tool Parser] Found {len(matches)} tool_call blocks")

    for i, match in enumerate(matches, 1):
        try:
            # Clean the match
            match_clean = match.strip()

            frappe.logger().info(f"[Tool Parser] Parsing tool call {i}/{len(matches)}")

            # Parse JSON
            tool_call = json.loads(match_clean)

            # DEFENSIVE FIX: Convert object content to string
            if 'content' in tool_call and isinstance(tool_call['content'], dict):
                frappe.logger().warning(f"[Tool Parser] Tool call {i} has object content, converting to string")
                tool_call['content'] = json.dumps(tool_call['content'], indent=2)

            # DEFENSIVE FIX: Convert object old_string/new_string to string (for edit_file)
            if 'old_string' in tool_call and isinstance(tool_call['old_string'], dict):
                frappe.logger().warning(f"[Tool Parser] Tool call {i} has object old_string, converting to string")
                tool_call['old_string'] = json.dumps(tool_call['old_string'], indent=2)

            if 'new_string' in tool_call and isinstance(tool_call['new_string'], dict):
                frappe.logger().warning(f"[Tool Parser] Tool call {i} has object new_string, converting to string")
                tool_call['new_string'] = json.dumps(tool_call['new_string'], indent=2)

            # Validate required fields
            if 'action' not in tool_call:
                frappe.logger().error(f"[Tool Parser] Tool call {i} missing 'action' field")
                continue

            # Add default description if missing
            if 'description' not in tool_call:
                tool_call['description'] = f"Executing {tool_call['action']}"

            tool_calls.append(tool_call)
            frappe.logger().info(f"[Tool Parser] ✓ Tool call {i} parsed: {tool_call['action']}")

        except json.JSONDecodeError as e:
            frappe.logger().error(f"[Tool Parser] Failed to parse tool call {i}: {e}")
            frappe.logger().error(f"[Tool Parser] Content preview: {match[:200]}")
            continue
        except Exception as e:
            frappe.logger().error(f"[Tool Parser] Unexpected error parsing tool call {i}: {e}")
            continue

    frappe.logger().info(f"[Tool Parser] Successfully parsed {len(tool_calls)}/{len(matches)} tool calls")

    return tool_calls


# ============================================================================
# TEST CASES
# ============================================================================

def test_parser():
    """Test the parser with various formats"""

    test_cases = [
        # Test 1: Standard format with string content (CORRECT)
        {
            "name": "Standard format - string content",
            "input": """I'll create a file.

```tool_call
{
  "action": "create_file",
  "path": "test.py",
  "content": "print('hello world')",
  "description": "Creating test file"
}
```

Done!""",
            "expected": 1
        },

        # Test 2: Invalid format with object content (AI MISTAKE - should be fixed)
        {
            "name": "Invalid format - object content",
            "input": """Creating employee doctype.

```tool_call
{
  "action": "create_file",
  "path": "employee/employee.json",
  "content": {
    "doctype": "Employee",
    "name": "Employee"
  },
  "description": "Creating Employee DocType"
}
```""",
            "expected": 1
        },

        # Test 3: Edit file with object content (should be fixed)
        {
            "name": "Edit file - object content",
            "input": """```tool_call
{
  "action": "edit_file",
  "path": "config.json",
  "old_string": {"setting": "old"},
  "new_string": {"setting": "new"}
}
```""",
            "expected": 1
        },

        # Test 4: Multiple tool calls
        {
            "name": "Multiple tool calls",
            "input": """I'll create two files:

```tool_call
{
  "action": "create_file",
  "path": "file1.txt",
  "content": "content 1"
}
```

And:

```tool_call
{
  "action": "create_file",
  "path": "file2.txt",
  "content": "content 2"
}
```""",
            "expected": 2
        },

        # Test 5: JSON string content with nested quotes
        {
            "name": "JSON content with nested quotes",
            "input": """```tool_call
{
  "action": "create_file",
  "path": "data.json",
  "content": "{\\"name\\": \\"Test\\", \\"value\\": 123}"
}
```""",
            "expected": 1
        },

        # Test 6: No tool calls
        {
            "name": "No tool calls",
            "input": "Just a regular response with no tool calls.",
            "expected": 0
        },

        # Test 7: Invalid JSON (should be skipped)
        {
            "name": "Invalid JSON",
            "input": """```tool_call
{
  "action": "create_file"
  "path": "test.txt"  // Missing comma
}
```""",
            "expected": 0
        }
    ]

    print("="*70)
    print("BACKEND PARSER TEST SUITE")
    print("="*70)

    passed = 0
    failed = 0

    for test in test_cases:
        print(f"\nTest: {test['name']}")
        print("-" * 70)

        result = _parse_tool_calls(test['input'])
        actual = len(result)
        expected = test['expected']

        if actual == expected:
            print(f"✓ PASS - Found {actual} tool calls (expected {expected})")
            passed += 1

            # Show parsed tool calls
            if result:
                for i, tc in enumerate(result, 1):
                    print(f"  Tool {i}: {tc['action']} - {tc.get('path', 'N/A')}")
                    # Check if object content was converted to string
                    if 'content' in tc and isinstance(tc['content'], str):
                        if tc['content'].startswith('{'):
                            print(f"    Content: [JSON string, {len(tc['content'])} chars]")
                    else:
                        print(f"    Content type: {type(tc.get('content'))}")
        else:
            print(f"❌ FAIL - Found {actual} tool calls (expected {expected})")
            failed += 1

    print("\n" + "="*70)
    print(f"RESULTS: {passed} passed, {failed} failed")
    print("="*70)

    return passed == len(test_cases)


if __name__ == "__main__":
    success = test_parser()

    if success:
        print("\n✅ ALL TESTS PASSED")
        print("\nThis parser is ready for production deployment.")
        print("\nTo deploy:")
        print("1. SSH to backend: ssh frappe@oropendola.ai")
        print("2. Edit file: nano ~/frappe-bench/apps/ai_assistant/ai_assistant/api/__init__.py")
        print("3. Find _parse_tool_calls() function")
        print("4. Replace with the code above")
        print("5. Restart: cd ~/frappe-bench && bench restart")
    else:
        print("\n❌ SOME TESTS FAILED")
        print("\nPlease fix the failing tests before deploying.")

    exit(0 if success else 1)
