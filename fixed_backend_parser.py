#!/usr/bin/env python3
"""
FIXED Backend Tool Call Parser

This is the corrected version that handles:
1. Real newlines (\n characters)
2. Escaped newlines (\\n strings)
3. Invalid JSON with literal newlines

Deploy this to backend at:
    ~/frappe-bench/apps/ai_assistant/ai_assistant/api/__init__.py

Replace the existing _parse_tool_calls() function with this one.
"""

import re
import json

def _parse_tool_calls(ai_response_text):
    """
    Parse tool_call blocks from AI response

    Handles both:
    - Real newlines: ```tool_call\n{...}\n```
    - Escaped newlines: ```tool_call\\n{...}\\n```

    Args:
        ai_response_text: AI response text (string)

    Returns:
        list: Parsed tool call objects
    """
    if not ai_response_text:
        return []

    # Unescape JSON strings first (convert \\n to \n)
    # This handles cases where response comes JSON-encoded
    try:
        # If the response is a JSON-encoded string, decode it
        if ai_response_text.startswith('"') and ai_response_text.endswith('"'):
            ai_response_text = json.loads(ai_response_text)
    except:
        pass  # Not JSON-encoded, use as-is

    tool_calls = []

    # Pattern 1: Standard format with newlines
    # Matches: ```tool_call\n{...}\n```
    pattern1 = r'```tool_call\s*\n(.*?)\n```'
    matches1 = re.findall(pattern1, ai_response_text, flags=re.DOTALL | re.IGNORECASE)

    # Pattern 2: Without newline requirement (fallback)
    # Matches: ```tool_call{...}```
    pattern2 = r'```tool_call\s*(.*?)\s*```'
    matches2 = re.findall(pattern2, ai_response_text, flags=re.DOTALL | re.IGNORECASE)

    # Use whichever pattern found matches
    matches = matches1 if matches1 else matches2

    for match in matches:
        try:
            # Clean the match
            match_clean = match.strip()

            # Handle escaped newlines (\\n → \n)
            # This happens when response is JSON-encoded
            if '\\n' in match_clean:
                # Replace escaped newlines with real ones
                match_clean = match_clean.replace('\\n', '\n')
                # Replace escaped quotes
                match_clean = match_clean.replace('\\"', '"')
                # Replace escaped backslashes
                match_clean = match_clean.replace('\\\\', '\\')

            # Fix invalid JSON: replace literal newlines in strings with \n
            # This handles cases where AI puts raw newlines in JSON strings
            match_clean = _fix_json_newlines(match_clean)

            # Parse JSON
            tool_call = json.loads(match_clean)
            tool_calls.append(tool_call)

        except json.JSONDecodeError as e:
            # Log error but continue
            print(f"[ERROR] Failed to parse tool_call JSON: {e}")
            print(f"[ERROR] Content preview: {match[:100]}...")
            continue

    return tool_calls


def _fix_json_newlines(json_str):
    """
    Fix JSON strings that have literal newlines (invalid JSON)

    Example:
        Input:  {"content": "line1
                 line2"}
        Output: {"content": "line1\nline2"}
    """
    # This is a simple heuristic fix
    # A proper solution would use a JSON parser that's lenient

    # Find strings with literal newlines
    def replace_newlines_in_strings(match):
        # Get the string content (between quotes)
        content = match.group(1)
        # Replace literal newlines with \n
        content_fixed = content.replace('\n', '\\n')
        # Return the fixed string with quotes
        return f'"{content_fixed}"'

    # Match quoted strings and fix newlines in them
    # Pattern: "..." including strings that span multiple lines
    pattern = r'"([^"]*(?:\n[^"]*)*)"'
    json_str_fixed = re.sub(pattern, replace_newlines_in_strings, json_str, flags=re.DOTALL)

    return json_str_fixed


# Test cases

def test_fixed_parser():
    """Test the fixed parser"""

    # Test 1: Standard format (real newlines)
    test1 = """I'll create a file.

```tool_call
{
  "action": "create_file",
  "path": "test.py",
  "content": "print('hello')"
}
```"""

    # Test 2: Invalid JSON with literal newlines in content
    test2 = """I'll create a file.

```tool_call
{
  "action": "create_file",
  "path": "test.json",
  "content": "{
  \"name\": \"Test\"
}"
}
```"""

    # Test 3: Escaped newlines (JSON string format)
    test3 = r"I'll create...\n\n```tool_call\n{\n  \"action\": \"create_file\"\n}\n```"

    # Test 4: No newlines after backticks
    test4 = """```tool_call{"action": "create_file", "path": "test.txt"}```"""

    print("="*70)
    print("TESTING FIXED PARSER")
    print("="*70)

    tests = [
        ("Standard format", test1),
        ("Invalid JSON newlines", test2),
        ("Escaped newlines", test3),
        ("No newlines", test4)
    ]

    for name, test_input in tests:
        print(f"\nTest: {name}")
        print("-" * 70)
        result = _parse_tool_calls(test_input)
        print(f"Result: {len(result)} tool calls")
        if result:
            print(json.dumps(result, indent=2))
            print("✓ PASS")
        else:
            print("❌ FAIL")

    print("\n" + "="*70)


if __name__ == "__main__":
    test_fixed_parser()
