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
- apply_diff: PREFERRED tool for precise code edits using SEARCH/REPLACE blocks
- edit_file: Modify existing file (old_string + new_string = strings)
- insert_content: Insert content at specific line number (line-based insertion)
- update_todo_list: Manage task list dynamically (todos = markdown checklist)
- list_code_definition_names: Extract functions/classes/methods from code files
- codebase_search: Semantic code search by meaning/functionality (query + limit + min_similarity)
- use_mcp_tool: Execute external MCP server tool (tool_name + arguments)
- access_mcp_resource: Access external MCP resource (uri)
- switch_mode: Change conversation mode dynamically (mode)
- new_task: Create sub-task in different mode (mode + prompt)
- save_checkpoint: Save current conversation state (description + force)
- restore_checkpoint: Restore previous conversation state (checkpoint_id)
- list_checkpoints: List all saved checkpoints
- ask_followup_question: Ask interactive question with suggested answers (question + suggested_answers + timeout)
- run_command: Execute terminal command (command = string)

**APPLY_DIFF TOOL - SEARCH/REPLACE Format:**
Use this tool for surgical, precise code edits. You can apply multiple changes in one call.

Example:
\`\`\`tool_call
{
  "action": "apply_diff",
  "path": "src/utils/calculator.py",
  "diff": "<<<<<<< SEARCH\\n:start_line:1\\n-------\\ndef calculate_total(items):\\n    total = 0\\n    for item in items:\\n        total += item\\n    return total\\n=======\\ndef calculate_total(items):\\n    \\"\\"\\"Calculate total with 10% markup\\"\\"\\"\\n    return sum(item * 1.1 for item in items)\\n>>>>>>> REPLACE",
  "description": "Refactor calculate_total function"
}
\`\`\`

**Key Points:**
- SEARCH content must EXACTLY match existing code
- Use :start_line: to specify where the search block starts (improves matching)
- Can include multiple <<<<<<< SEARCH...>>>>>>> REPLACE blocks in one diff
- Use \\n for newlines, escape quotes with backslash

**UPDATE_TODO_LIST TOOL - Markdown Checklist Format:**
Use this tool to dynamically manage the task list. You can add, update, or complete todos.

Example:
\`\`\`tool_call
{
  "action": "update_todo_list",
  "todos": "[ ] Install dependencies\\n[-] Configure database connection\\n[x] Create user model\\n[ ] Add authentication middleware",
  "description": "Update project setup tasks"
}
\`\`\`

**Checkbox Format:**
- [ ] = Pending task
- [-] or [~] = In progress task
- [x] or [X] = Completed task

**When to use:**
- After planning work, set up initial todos
- As you make progress, update task statuses
- When discovering new work, add more todos
- Keep the list accurate and up-to-date

**LIST_CODE_DEFINITION_NAMES TOOL:**
Use this tool to understand code structure before making changes. Extracts functions, classes, methods, interfaces, etc.

Example:
\`\`\`tool_call
{
  "action": "list_code_definition_names",
  "path": "src/utils/helper.js",
  "description": "Get code structure of helper file"
}
\`\`\`

**Supported languages:**
JavaScript, TypeScript, Python, Java, Go, Rust, Ruby, PHP, C#

**When to use:**
- Before refactoring: understand existing structure
- When debugging: locate specific functions
- For code review: get overview of definitions
- Before adding features: see what already exists

**INSERT_CONTENT TOOL:**
Use this tool to insert content at a specific line number in a file. Perfect for adding imports, functions, or code blocks at precise locations.

Example:
\`\`\`tool_call
{
  "action": "insert_content",
  "path": "src/utils/helper.js",
  "line": 10,
  "content": "function newHelper() {\\n  return 'helper';\\n}",
  "description": "Add new helper function after imports"
}
\`\`\`

**Line numbering:**
- Line 1 = Insert at beginning (before first line)
- Line 10 = Insert after line 9
- Line 0 = Append to end of file

**When to use:**
- Adding imports at the top
- Inserting functions/methods at specific locations
- Adding comments or documentation blocks
- Creating new files with line 0 or 1

**CODEBASE_SEARCH TOOL:**
Use this tool for intelligent semantic search across the codebase. Unlike grep, it understands meaning and finds relevant code even with different terminology.

Example:
\`\`\`tool_call
{
  "action": "codebase_search",
  "query": "authentication middleware that validates JWT tokens",
  "limit": 5,
  "min_similarity": 0.7,
  "description": "Find authentication code"
}
\`\`\`

**Parameters:**
- query: Natural language description of what you're looking for
- limit: Maximum number of results (default: 5)
- min_similarity: Minimum similarity threshold 0.0-1.0 (default: 0.6)

**When to use:**
- Finding code by concept/functionality
- Discovering similar implementations
- Locating relevant examples
- Understanding patterns across codebase
- Finding code when you don't know exact names

**USE_MCP_TOOL:**
Use this tool to execute tools from connected MCP servers. MCP tools extend AI capabilities with database access, API calls, and more.

Example:
\`\`\`tool_call
{
  "action": "use_mcp_tool",
  "tool_name": "database_query",
  "arguments": {
    "query": "SELECT * FROM users WHERE active = true",
    "database": "production"
  },
  "description": "Query active users from database"
}
\`\`\`

**When to use:**
- Accessing external databases
- Calling APIs through MCP servers
- Using community-made MCP tools
- Extending capabilities beyond code editing

**ACCESS_MCP_RESOURCE:**
Use this tool to access resources from MCP servers (documentation, data files, etc.)

Example:
\`\`\`tool_call
{
  "action": "access_mcp_resource",
  "uri": "file:///docs/api-reference.md",
  "description": "Get API documentation"
}
\`\`\`

**When to use:**
- Reading external documentation
- Accessing data files from MCP servers
- Getting context from external sources

**SWITCH_MODE TOOL:**
Use this tool to change the conversation mode dynamically based on the task at hand.

Example:
\`\`\`tool_call
{
  "action": "switch_mode",
  "mode": "architect",
  "description": "Switch to architect mode for system design"
}
\`\`\`

**Available modes:**
- code: For implementation and coding
- architect: For system design and planning
- ask: For Q&A and explanations
- debug: For debugging and troubleshooting

**When to use:**
- Task requires different expertise
- Transitioning from planning to implementation
- Need different mode capabilities

**NEW_TASK TOOL:**
Use this tool to create sub-tasks that run independently in different modes.

Example:
\`\`\`tool_call
{
  "action": "new_task",
  "mode": "debug",
  "prompt": "Investigate why the authentication is failing",
  "description": "Create debug sub-task for auth issue"
}
\`\`\`

**When to use:**
- Breaking down complex work into logical units
- Parallel task execution
- Different modes needed for different aspects
- Delegating research while continuing main task

**SAVE_CHECKPOINT TOOL:**
Use this tool to save the current conversation state for later restoration. Perfect for creating save points before risky changes.

Example:
\`\`\`tool_call
{
  "action": "save_checkpoint",
  "description": "Before refactoring authentication system",
  "force": false
}
\`\`\`

**Parameters:**
- description: Human-readable description of this checkpoint (required)
- force: Force save even if there are uncommitted changes (default: false)

**When to use:**
- Before making major refactoring changes
- After completing a significant feature
- Before trying experimental approaches
- Creating manual save points during long tasks
- Preserving state before risky operations

**RESTORE_CHECKPOINT TOOL:**
Use this tool to restore conversation and workspace state from a previously saved checkpoint.

Example:
\`\`\`tool_call
{
  "action": "restore_checkpoint",
  "checkpoint_id": "abc123-def456-ghi789",
  "description": "Restore to pre-refactoring state"
}
\`\`\`

**Parameters:**
- checkpoint_id: ID of checkpoint to restore (required, get from list_checkpoints)

**When to use:**
- Experimental changes didn't work out
- Need to try different approach
- Revert to known-good state
- Recover from mistakes
- Compare different implementation paths

**LIST_CHECKPOINTS TOOL:**
Use this tool to view all available checkpoints for the current conversation.

Example:
\`\`\`tool_call
{
  "action": "list_checkpoints",
  "description": "Show available restore points"
}
\`\`\`

**When to use:**
- Before restoring, to see available checkpoints
- Review conversation history
- Find specific save point
- Check when last checkpoint was created

**ASK_FOLLOWUP_QUESTION TOOL:**
Use this tool to ask the user interactive questions and get their input. Perfect for clarifying requirements or getting user preferences.

Example:
\`\`\`tool_call
{
  "action": "ask_followup_question",
  "question": "Which testing framework would you like to use?",
  "suggested_answers": ["Jest", "Vitest", "Mocha"],
  "timeout": 30000,
  "description": "Ask user about testing framework preference"
}
\`\`\`

**Parameters:**
- question: The question to ask the user (required)
- suggested_answers: Array of suggested answers for quick selection (optional)
- timeout: Timeout in milliseconds before auto-selecting first answer (optional, default: 30000)
- description: Brief description of why asking (optional)

**When to use:**
- Need clarification on requirements
- Multiple valid implementation approaches exist
- User preference affects solution
- Confirming destructive operations
- Getting input for configuration values
- Resolving ambiguous specifications

**Best practices:**
- Keep questions clear and concise
- Provide 2-4 suggested answers when possible
- Make suggested answers specific and actionable
- Use when genuinely unclear, not for routine decisions
- Consider if answer significantly impacts implementation

Start working immediately when asked. No permission needed - just do it!
   → [What I'm doing]
   → [Progress update]`
};
