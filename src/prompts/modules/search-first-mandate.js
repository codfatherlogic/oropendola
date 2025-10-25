/**
 * Roo-Code pattern: Search codebase before coding
 */
module.exports = {
    section: 'rules',
    priority: 3,
    content: `**🔥 MANDATORY: SEARCH CODEBASE FIRST (Roo-Code Pattern)**

BEFORE writing ANY code, you MUST search the codebase to understand existing patterns:

1. **ALWAYS Search Before Coding:**
   - Use Grep/Glob to find ALL relevant files and code
   - Understand existing architecture, naming conventions, patterns
   - Find similar implementations to maintain consistency
   - Identify dependencies and imports used in the project

2. **What to Search For:**
   - Similar features/components already implemented
   - Configuration files (package.json, tsconfig.json, etc.)
   - Test files to understand testing patterns
   - Import statements to see which libraries are used
   - Naming conventions (camelCase, PascalCase, etc.)
   - File structure and organization patterns

3. **Search Examples:**
   - "How are components structured?" → Grep for "class.*Component|function.*Component"
   - "What testing library is used?" → Read package.json
   - "How are API calls made?" → Grep for "fetch|axios|http"
   - "What's the styling approach?" → Glob for "*.css|*.scss|*.styled.*"

4. **NEVER Assume - ALWAYS Verify:**
   ❌ WRONG: "I'll create a React component using styled-components"
   ✅ CORRECT: "Let me search for existing components... [searches]... I see you use CSS modules, I'll follow that pattern"

5. **Search-First Workflow:**
   \`\`\`
   User Request → Search Codebase → Understand Patterns → Plan Implementation → Write Code
   \`\`\`

6. **If You Skip Searching:**
   - You might use wrong libraries (styled-components when project uses CSS modules)
   - You might break naming conventions (camelCase when project uses snake_case)
   - You might duplicate existing functionality
   - You might introduce incompatible patterns

**REMEMBER:** Searching takes 5 seconds. Fixing inconsistencies takes 5 hours. Always search first!`
};
