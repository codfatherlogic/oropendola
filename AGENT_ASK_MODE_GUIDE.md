# Agent, Edit, and Ask Mode Guide

## Overview

Oropendola AI Assistant supports **three interaction modes** inspired by Microsoft GitHub Copilot and modern AI assistants:

1. **🤖 Agent Mode** - Autonomous assistance with full workspace access
2. **✏️ Edit Mode** - Targeted edits to files you specify  
3. **💬 Ask Mode** - Read-only Q&A assistance

This provides flexibility in how you interact with the AI, giving you control over the AI's capabilities and scope.

---

## Mode Comparison

| Feature | Agent Mode 🤖 | Edit Mode ✏️ | Ask Mode 💬 |
|---------|---------------|-------------|-------------|
| **Purpose** | Build, modify, execute | Targeted edits | Answer and guide |
| **File Creation** | ✅ Yes | ✅ Yes | ❌ No |
| **File Modification** | ✅ Yes | ✅ Yes (scoped) | ❌ No |
| **Context Discovery** | ✅ Autonomous | 👤 User-specified | N/A |
| **Code Execution** | ✅ Yes | ❌ No | ❌ No |
| **Tool Calls** | ✅ All allowed | ✅ Scoped to working set | ❌ Ignored |
| **Workspace Safety** | ⚠️ Can modify any file | 🎯 Scoped modifications | ✅ Read-only |
| **Speed** | 🐢 Slower (discovery) | 🚀 Fast | ⚡ Fastest |
| **Use Cases** | Full features, builds | Targeted fixes | Learning, review |
| **Response Type** | Actions + explanations | Scoped actions | Explanations only |

---

## 🤖 Agent Mode

### What is Agent Mode?

Agent Mode is the **default and most powerful** mode. The AI can:

- ✅ Create new files
- ✅ Modify existing files
- ✅ Delete files
- ✅ Execute commands
- ✅ Perform multi-step operations
- ✅ Make workspace changes

### When to Use Agent Mode

Use Agent Mode when you want the AI to:

- **Build features**: "Create a login component with authentication"
- **Fix bugs**: "Fix the null pointer exception in UserService.java"
- **Refactor code**: "Extract this into a separate utility class"
- **Generate files**: "Create a REST API endpoint for user management"
- **Setup projects**: "Initialize a React app with TypeScript"

### Example Agent Mode Interactions

```
User: Create a calculator class in Python

AI: [Creates calculator.py with complete implementation]
✅ Created file: calculator.py
```

```
User: Add error handling to the login function

AI: [Modifies login.js to add try-catch blocks]
✅ Updated file: login.js
```

### Safety Considerations

⚠️ **Important**: Agent Mode can modify your workspace. Always:

- Review generated code before accepting
- Use version control (Git) for safety
- Test changes in a development environment first
- Use the **Accept/Reject** buttons to approve or decline changes

---

## 💬 Ask Mode

### What is Ask Mode?

Ask Mode is a **safe, read-only** mode. The AI can:

- ✅ Answer questions
- ✅ Explain code
- ✅ Provide suggestions
- ✅ Offer best practices
- ✅ Review code
- ❌ **Cannot** modify files
- ❌ **Cannot** execute commands

### When to Use Ask Mode

Use Ask Mode when you want to:

- **Learn**: "Explain how this authentication works"
- **Understand**: "What does this regex pattern do?"
- **Get advice**: "What's the best way to structure this API?"
- **Code review**: "Are there any issues with this function?"
- **Explore**: "How can I improve the performance of this code?"

### Example Ask Mode Interactions

```
User: Explain how this sorting algorithm works

AI: [Provides detailed explanation]
This is a quicksort implementation. It works by...
[No file modifications]
```

```
User: What's wrong with this code?

AI: [Analyzes and explains issues]
I see several potential issues:
1. Missing null checks...
2. Inefficient loop...
[Suggests improvements but doesn't modify files]
```

### Benefits of Ask Mode

✅ **Safe exploration**: Learn without risking changes
✅ **Code understanding**: Get explanations without modifications
✅ **Best practices**: Receive guidance and suggestions
✅ **Code review**: Get feedback on your code

---

## Switching Between Modes

### In the Sidebar

The mode selector appears **below the header** in the Oropendola sidebar:

```
┌─────────────────────────┐
│   MODE                  │
│  [🤖 Agent] [💬 Ask]    │
│                         │
│  Description appears    │
│  here based on mode     │
└─────────────────────────┘
```

### Visual Indicators

**Agent Mode Active**:
- Button: **🤖 Agent** (highlighted in blue)
- Description: "Agent mode can execute actions and modify your workspace files."
- Empty state: "Build with agent mode"

**Ask Mode Active**:
- Button: **💬 Ask** (highlighted in blue)
- Description: "Ask mode provides answers and suggestions without modifying files."
- Empty state: "Ask questions"

### Switching Mode Mid-Conversation

You can switch modes **at any time** during a conversation:

1. Click the desired mode button
2. The change takes effect **immediately**
3. Previous messages remain unchanged
4. New messages follow the selected mode's behavior

---

## Technical Implementation

### How Agent Mode Works

1. User sends message
2. AI analyzes request
3. AI generates response with **tool calls** (if needed)
4. Extension **executes** tool calls:
   - `create_file` → Creates new file
   - `modify_file` → Updates existing file
   - `delete_file` → Removes file
5. Results shown in chat
6. User accepts/rejects changes

### How Ask Mode Works

1. User sends message
2. AI analyzes request
3. AI generates response (may include suggested code)
4. Extension **ignores** all tool calls
5. Pure text response shown in chat
6. No file modifications occur

### Mode Persistence

- Mode selection persists **during the session**
- Default mode: **Agent** (for backward compatibility)
- Mode resets to Agent when sidebar is reloaded

---

## Best Practices

### Use Agent Mode For:

✅ Active development
✅ Automated code generation
✅ Refactoring tasks
✅ Building features
✅ Fixing bugs that require changes

### Use Ask Mode For:

✅ Learning new concepts
✅ Code reviews
✅ Understanding existing code
✅ Getting suggestions without changes
✅ Exploring ideas safely

### Safety Tips

1. **Always use version control** (Git) when working in Agent Mode
2. **Review all changes** before accepting them
3. **Test in development** environments first
4. **Switch to Ask Mode** when you're unsure
5. **Use Accept/Reject buttons** to control what changes are applied

---

## Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| Open Chat | `Ctrl+Shift+C` | `Cmd+Shift+C` |
| New Chat | (Click + button) | (Click + button) |
| Send Message | `Enter` | `Enter` |
| New Line | `Shift+Enter` | `Shift+Enter` |

*Note: Mode switching is currently mouse/click-only*

---

## Comparison with Other AI Assistants

### GitHub Copilot Chat

Oropendola's modes are inspired by Copilot's distinction between:
- **Agent Mode** ≈ Copilot's edit/refactor capabilities
- **Ask Mode** ≈ Copilot's explain/review capabilities

### Colabot

Similar to Colabot's approach of separating:
- **Do Mode** (Agent) - Active assistance
- **Ask Mode** - Passive guidance

---

## Troubleshooting

### Problem: Mode button not responding

**Solution**: Refresh the sidebar by:
1. Closing the Oropendola sidebar
2. Reopening it with `Cmd+Shift+C` (macOS) or `Ctrl+Shift+C` (Windows/Linux)

### Problem: Agent Mode not modifying files

**Possible causes**:
1. Check that you're actually in Agent Mode (button highlighted)
2. Ensure you have workspace folder open
3. Check file permissions
4. Review console for errors (Help → Toggle Developer Tools)

### Problem: Ask Mode still executing tools

**Solution**: This should not happen. If it does:
1. File a bug report
2. Check console logs
3. Verify extension version

---

## Feedback and Support

We'd love to hear how you're using Agent and Ask modes!

- 👍 **Accept** responses you like
- 👎 **Reject** responses that aren't helpful
- Report bugs on GitHub
- Email: sammish@Oropendola.ai

---

## Future Enhancements

Planned features:
- [ ] Keyboard shortcut to toggle modes
- [ ] Per-conversation mode memory
- [ ] "Preview changes" mode before applying
- [ ] Custom modes with configurable permissions
- [ ] Workspace-level mode preferences

---

**Last Updated**: 2025-10-18  
**Version**: 1.0.0  
**Extension**: Oropendola AI Assistant
