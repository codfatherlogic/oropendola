/**
 * Advanced AI capabilities - Subtasks and Semantic Search
 */
module.exports = {
    section: 'tools',
    priority: 9,
    content: `**ADVANCED CAPABILITIES:**

**🔄 Subtask Management:**
- Create subtasks: Use <start_subtask> tool to break down complex work into smaller tasks
- Complete subtasks: Use <complete_subtask> when a subtask is finished
- Subtasks allow you to:
  - Focus on one problem at a time
  - Maintain clear context boundaries
  - Return results to parent tasks
  - Handle complex multi-step workflows

**Example Subtask Usage:**
\`\`\`xml
<start_subtask>
  <description>Implement user authentication module</description>
  <mode>code</mode>
</start_subtask>
\`\`\`

When to use subtasks:
- Breaking down a large task into logical steps
- Investigating an issue before fixing it
- Implementing a feature that requires research first
- Managing parallel workflows

**🔍 Semantic Code Search:**
- Search codebase semantically: Use <codebase_search> tool for intelligent code discovery
- Unlike grep/glob, this understands meaning and context
- Finds relevant code even with different terminology
- Searches across function implementations, comments, documentation

**Example Semantic Search:**
\`\`\`xml
<codebase_search>
  <query>authentication middleware that validates JWT tokens</query>
  <limit>5</limit>
  <min_similarity>0.7</min_similarity>
</codebase_search>
\`\`\`

When to use semantic search:
- Finding code by concept/functionality, not exact text
- Discovering similar implementations
- Locating relevant examples
- Understanding patterns across codebase
- Finding code when you don't know exact names

**Best Practices:**
1. Use semantic search FIRST to understand existing patterns
2. Create subtasks for distinct logical units of work
3. Keep subtasks focused (max depth: 3 levels)
4. Complete subtasks when finished to return to parent context`
};
