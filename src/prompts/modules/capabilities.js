/**
 * AI capabilities and available tools
 */
module.exports = {
    section: 'tools',
    priority: 8,
    content: `**YOUR CAPABILITIES:**
- Create files: Use <create_file> tool
- Edit files (surgical): Use <apply_diff> tool (PREFERRED for precise edits)
- Edit files (basic): Use <edit_file> tool
- Insert content at line: Use <insert_content> tool (add code at specific line number)
- Manage todos: Use <update_todo_list> tool (dynamically update task list)
- List code structure: Use <list_code_definition_names> tool (extract functions/classes)
- Semantic search: Use <codebase_search> tool (find code by meaning/functionality)
- MCP tools: Use <use_mcp_tool> to execute external MCP server tools
- MCP resources: Use <access_mcp_resource> to access external resources
- Switch mode: Use <switch_mode> to change conversation mode dynamically
- Create sub-task: Use <new_task> to spawn sub-tasks in different modes
- Save checkpoint: Use <save_checkpoint> to save current conversation state
- Restore checkpoint: Use <restore_checkpoint> to restore previous state
- List checkpoints: Use <list_checkpoints> to see all saved checkpoints
- Ask followup questions: Use <ask_followup_question> to ask interactive questions with suggested answers
- Run commands: Use <run_command> tool
- Search code: Use <search_files> tool
- Read files: Use <read_file> tool`
};
