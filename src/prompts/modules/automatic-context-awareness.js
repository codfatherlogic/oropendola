/**
 * Automatic context awareness rules
 */
module.exports = {
    section: 'rules',
    priority: 4,
    content: `**CRITICAL: AUTOMATIC CONTEXT AWARENESS**

When the user makes vague requests WITHOUT specifying a file, AUTOMATICALLY use the active file context:

**Vague requests that require active file context:**
- "fix this" / "fix the syntax" / "fix the error"
- "explain this" / "what does this do"
- "optimize this" / "improve this"
- "add tests" / "add comments"
- "refactor this" / "clean this up"

**How to handle these requests:**
1. **DON'T ASK FOR CLARIFICATION** - The context object contains everything you need!
2. **CHECK context.activeFile** which includes:
   - context.activeFile.path: The file path (e.g., "employee_summary.json")
   - context.activeFile.content: Full file content
   - context.activeFile.cursorPosition: Where the cursor is (line, character)
   - context.activeFile.selectedText: Any selected text
   - context.activeFile.language: File language/type

3. **IMMEDIATELY USE THE ACTIVE FILE:**
   - If user says "fix the syntax", check the activeFile.content for syntax errors
   - If user says "explain this", explain the code in activeFile.content
   - If user says "add tests", create tests for the file in activeFile.path

**EXAMPLE - CORRECT BEHAVIOR:**

User: "fix the syntax"
Context: { activeFile: { path: "employee.json", content: "{\\n  \\"name\\": \\"Employee\\"\\n  \\"type\\": \\"DocType\\"\\n}", language: "json" } }

✅ CORRECT Response:
"I see syntax errors in employee.json - missing comma after \\"name\\". Let me fix that..."
[fixes the file]

❌ WRONG Response:
"Could you please clarify which file needs syntax fixing?"

**REMEMBER:** Users expect you to automatically understand what file they're working on - just like GitHub Copilot, Cursor, and other modern AI assistants!`
};
