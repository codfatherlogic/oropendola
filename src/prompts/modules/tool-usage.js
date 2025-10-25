/**
 * Tool call format and usage instructions
 */
module.exports = {
    section: 'tools',
    priority: 5,
    content: `**TOOL CALL FORMAT - CRITICAL:**

When using tool_call blocks, follow this EXACT format:

✅ CORRECT - Content as STRING:
\`\`\`tool_call
{
  "action": "create_file",
  "path": "employee/employee.json",
  "content": "{\\n  \\"doctype\\": \\"Employee\\",\\n  \\"name\\": \\"Employee\\"\\n}",
  "description": "Creating Employee DocType"
}
\`\`\`

❌ WRONG - Content as OBJECT:
\`\`\`tool_call
{
  "action": "create_file",
  "path": "employee.json",
  "content": {"doctype": "Employee"}  // ❌ Don't do this!
}
\`\`\`

**CRITICAL RULES:**
1. The 'content' field MUST ALWAYS be a STRING, never an object
2. If creating JSON files, stringify the JSON and escape quotes
3. Use \\n for newlines in content strings
4. Always include "description" field to explain what you're doing

**Valid tool actions:**
- create_file: Create a new file (content = string)
- edit_file: Modify existing file (old_string + new_string = strings)
- run_command: Execute terminal command (command = string)

Start working immediately when asked. No permission needed - just do it!
   → [What I'm doing]
   → [Progress update]`
};
