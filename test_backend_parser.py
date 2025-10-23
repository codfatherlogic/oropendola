#!/usr/bin/env python3
"""
Test Backend Tool Call Parser

This script tests the _parse_tool_calls() function to see why it's not finding tool calls.

Run this on the backend server:
    cd ~/frappe-bench
    python3 test_backend_parser.py
"""

import re
import json

def _parse_tool_calls(ai_response_text):
    """
    Parse tool_call blocks from AI response
    This is the CURRENT backend implementation (or should be)
    """
    if not ai_response_text:
        return []

    print(f"\n{'='*60}")
    print(f"PARSING AI RESPONSE")
    print(f"{'='*60}")
    print(f"Response length: {len(ai_response_text)}")
    print(f"Response preview (first 500 chars):")
    print(ai_response_text[:500])
    print(f"{'='*60}\n")

    # Pattern to match tool_call blocks
    pattern = r'```tool_call\s*\n(.*?)\n```'

    print(f"Using regex pattern: {pattern}")
    print(f"Flags: re.DOTALL | re.IGNORECASE\n")

    matches = re.findall(pattern, ai_response_text, flags=re.DOTALL | re.IGNORECASE)

    print(f"Found {len(matches)} regex matches\n")

    if matches:
        print("Matches found:")
        for i, match in enumerate(matches, 1):
            print(f"\n--- Match {i} ---")
            print(match[:200] + ("..." if len(match) > 200 else ""))
    else:
        print("❌ NO MATCHES FOUND!")
        print("\nLet's try different patterns:\n")

        # Try without newline requirement
        pattern2 = r'```tool_call(.*?)```'
        matches2 = re.findall(pattern2, ai_response_text, flags=re.DOTALL | re.IGNORECASE)
        print(f"Pattern 2 (no \\n required): Found {len(matches2)} matches")

        # Try with optional whitespace
        pattern3 = r'```tool_call\s*(.*?)\s*```'
        matches3 = re.findall(pattern3, ai_response_text, flags=re.DOTALL | re.IGNORECASE)
        print(f"Pattern 3 (optional whitespace): Found {len(matches3)} matches")

        # Check if tool_call even exists
        if '```tool_call' in ai_response_text:
            print("\n✓ Response DOES contain '```tool_call'")

            # Find the start and end
            start_idx = ai_response_text.find('```tool_call')
            end_idx = ai_response_text.find('```', start_idx + 12)

            if end_idx != -1:
                block = ai_response_text[start_idx:end_idx+3]
                print(f"\nActual block found in response:")
                print(block)
        else:
            print("\n❌ Response does NOT contain '```tool_call'")

    print(f"\n{'='*60}\n")

    tool_calls = []
    for match in matches:
        try:
            tool_call = json.loads(match)
            tool_calls.append(tool_call)
            print(f"✓ Successfully parsed tool call: {tool_call.get('action', 'unknown')}")
        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse tool_call JSON: {e}")
            print(f"   Content: {match[:100]}...")
            continue

    return tool_calls


# Sample AI responses to test

# Test 1: From logs (Claude)
sample_response_1 = """I'll help you create a Frappe Employee DocType based on the image. I'll break this down step by step.

```tool_call
{
  "action": "create_file",
  "path": "hrms/doctype/employee/employee.json",
  "content": "..."
}
```

This will create the employee doctype."""

# Test 2: From logs (DeepSeek)
sample_response_2 = """I'll create a comprehensive Employee Doctype for Frappe based on typical employee management requirements. Since I can't see the image, I'll include all standard fields needed for a complete employee management system.

```tool_call
{
  "action": "create_file",
  "path": "employee/employee.json",
  "content": "{\n  \"doctype\": \"DocType\",\n  \"module\": \"HR\",\n  \"name\": \"Employee\"\n}"
}
```"""

# Test 3: Escaped version (as it appears in JSON)
sample_response_3 = r"I'll create...\n\n```tool_call\n{\n  \"action\": \"create_file\"\n}\n```"


def main():
    print("\n" + "="*70)
    print("BACKEND TOOL CALL PARSER TEST")
    print("="*70)

    print("\n\nTEST 1: Claude-style response")
    print("-" * 70)
    result1 = _parse_tool_calls(sample_response_1)
    print(f"\nResult: {len(result1)} tool calls parsed")
    if result1:
        print(json.dumps(result1, indent=2))

    print("\n\nTEST 2: DeepSeek-style response")
    print("-" * 70)
    result2 = _parse_tool_calls(sample_response_2)
    print(f"\nResult: {len(result2)} tool calls parsed")
    if result2:
        print(json.dumps(result2, indent=2))

    print("\n\nTEST 3: Escaped version (JSON string)")
    print("-" * 70)
    result3 = _parse_tool_calls(sample_response_3)
    print(f"\nResult: {len(result3)} tool calls parsed")
    if result3:
        print(json.dumps(result3, indent=2))

    print("\n\n" + "="*70)
    print("SUMMARY")
    print("="*70)
    print(f"Test 1: {len(result1)} tool calls - {'✓ PASS' if result1 else '❌ FAIL'}")
    print(f"Test 2: {len(result2)} tool calls - {'✓ PASS' if result2 else '❌ FAIL'}")
    print(f"Test 3: {len(result3)} tool calls - {'✓ PASS' if result3 else '❌ FAIL'}")

    if not (result1 and result2):
        print("\n❌ PARSER IS BROKEN!")
        print("\nExpected: Both Test 1 and Test 2 should find tool calls")
        print("Actual: Parser is not finding them")
        print("\nPossible issues:")
        print("1. Regex pattern is wrong")
        print("2. Response format changed")
        print("3. Encoding issues (escaped vs unescaped)")
    else:
        print("\n✓ PARSER WORKS!")


if __name__ == "__main__":
    main()
