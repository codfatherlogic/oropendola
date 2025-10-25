"""
PARSER BUG FIX - Copy and paste this into api/__init__.py

Location: ~/frappe-bench/apps/ai_assistant/ai_assistant/api/__init__.py
Line: ~3200 (search for "def _parse_tool_calls")

Instructions:
1. Find the existing _parse_tool_calls function
2. Delete the ENTIRE old function
3. Paste BOTH functions below (including _fix_json_newlines helper)
"""

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

	frappe.logger().info(f"[Tool Call Parser] Found {len(matches)} tool_call blocks in response")

	for idx, match in enumerate(matches):
		try:
			# Clean the match
			match_clean = match.strip()

			frappe.logger().info(f"[Tool Call Parser] Processing block {idx + 1}: {match_clean[:100]}...")

			# Fix invalid JSON: replace literal newlines in JSON strings
			# This handles cases where AI puts raw newlines in strings
			match_clean = _fix_json_newlines(match_clean)

			# Parse JSON
			tool_call = json.loads(match_clean)
			tool_calls.append(tool_call)

			frappe.logger().info(f"[Tool Call Parser] ✓ Successfully parsed tool call {idx + 1}: {tool_call.get('action', 'unknown')}")

		except json.JSONDecodeError as e:
			frappe.logger().error(f"[Tool Call Parser] ✗ Failed to parse block {idx + 1}: {e}")
			frappe.logger().error(f"[Tool Call Parser] Content: {match[:200]}")
			continue

	frappe.logger().info(f"[Tool Call Parser] SUCCESS: Parsed {len(tool_calls)} tool calls total")
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


"""
AFTER PASTING:
1. Save file (Ctrl+X, Y, Enter in nano)
2. Restart backend:
   cd ~/frappe-bench
   bench restart

3. Test the fix:
   tail -f ~/frappe-bench/logs/oropendola.ai.log

   Look for:
   [Tool Call Parser] Found X tool_call blocks in response
   [Tool Call Parser] SUCCESS: Parsed X tool calls total
"""
