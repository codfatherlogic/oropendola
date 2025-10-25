# Task Persistence - User Guide

**Version:** 3.5.0
**Sprint:** 1-2 (Task Persistence Layer)
**Status:** Production Ready ✅

---

## 📖 Overview

Oropendola AI Assistant now automatically saves all your conversations as **tasks**. Every chat session is preserved, allowing you to:

- ✅ **Never lose work** - All conversations automatically saved
- ✅ **Resume anytime** - Continue conversations from where you left off
- ✅ **Review history** - Browse all past tasks with search and filters
- ✅ **Export tasks** - Save conversations as JSON, Markdown, or TXT files
- ✅ **Track progress** - See task status (active, completed, failed, terminated)

---

## 🚀 Getting Started

### Automatic Task Creation

**No setup required!** Tasks are created automatically:

1. **Open sidebar** - Click the Oropendola icon in VS Code
2. **Send a message** - Type your request and press Enter
3. **Task created** - A new task is automatically created in the background

```
You: "Create a React todo app"
↓
[Task automatically created]
↓
AI: "I'll help you build a React todo app..."
```

**That's it!** Your conversation is now being saved automatically.

---

## 💾 Automatic Saving

### What Gets Saved

Every aspect of your conversation is preserved:

- **All messages** - Every user message and AI response
- **Tool executions** - Files created, commands run, code changes
- **API metrics** - Token usage, cost, model used
- **TODO lists** - Task breakdowns and progress
- **Framework detection** - Detected project frameworks (React, Vue, etc.)
- **Timestamps** - When task started, last updated, completed

### When It Saves

Tasks are saved automatically:

- **On creation** - When you send your first message
- **After each AI response** - State saved after every assistant message
- **On completion** - Final save when conversation ends
- **On abort** - Saves even if you stop mid-conversation

**You never need to click "Save"** - it all happens transparently!

---

## 📚 Viewing Task History

### Opening History View

1. Click the **Oropendola** icon in the sidebar
2. Click the **"History"** tab (or button) in the chat interface
3. Browse all your saved tasks

### History View Features

#### Search
```
[🔍 Search tasks...]

Type to search:
- Task descriptions
- Message content
- File names
```

**Tips:**
- Search is **fuzzy** - finds partial matches
- Updates as you type (300ms delay)
- Searches task text and messages

#### Filters

**Status Filter:**
- **All** - Show every task
- **Active** - Currently running tasks
- **Completed** - Successfully finished tasks
- **Failed** - Tasks that encountered errors
- **Terminated** - Tasks you stopped manually

**Sort Options:**
- **Created Date** - When task started
- **Updated Date** - Last activity
- **Ascending** ↑ or **Descending** ↓

#### Statistics Bar

```
┌─────────────────────────────────────────┐
│ Total: 45  Active: 2  Completed: 40    │
│ Failed: 2  Terminated: 1               │
└─────────────────────────────────────────┘
```

Shows real-time counts of tasks by status.

---

## 🔄 Resuming a Task

### How to Resume

1. **Open History View**
2. **Find your task** - Use search/filters if needed
3. **Click the task** - Click anywhere on the task card
4. **Messages restored** - All conversation history reappears
5. **Continue chatting** - Send a new message to continue

### What Happens on Resume

```
📖 Restored task: Create a React todo app

Status: completed
Messages: 15
Created: 2025-10-26 10:30 AM

[All 15 messages displayed below]

---

You can continue this conversation by sending a new message.
```

**Example:**

```
Original conversation (3 days ago):
You: "Create a React app"
AI: "I created the app with components..."
[Conversation ended]

Today (after resuming):
You: "Now add dark mode"
AI: "I'll add dark mode to your existing app..."
```

The AI **remembers the context** from the original conversation!

---

## 📤 Exporting Tasks

### Export Options

Each task can be exported in 3 formats:

1. **JSON** - Full data structure (for developers)
2. **Markdown** - Readable format with formatting
3. **Text** - Plain text transcript

### How to Export

1. **Find task** in History View
2. **Click "Export" button** (📤 icon)
3. **Select format** - JSON / Markdown / Text
4. **Choose location** - Save dialog appears
5. **File saved** - Notification confirms success

### Export Contents

#### JSON Export
```json
{
  "id": "abc123...",
  "text": "Create a React app",
  "status": "completed",
  "createdAt": 1234567890,
  "completedAt": 1234567900,
  "messages": [...],
  "apiMetrics": {
    "totalTokens": 5000,
    "totalCost": 0.15,
    "model": "claude-opus-3"
  },
  "contextTokens": 12000,
  "metadata": {...}
}
```

#### Markdown Export
```markdown
# Task: Create a React app

**Status:** Completed
**Created:** 2025-10-26 10:30 AM
**Duration:** 5 minutes

## Conversation

**User:**
Create a React app

**Assistant:**
I'll help you create a React app...

[... full conversation ...]

## Metrics
- Tokens: 5,000
- Cost: $0.15
- Messages: 15
```

#### Text Export
```
Task: Create a React app
Status: Completed
Created: 2025-10-26 10:30 AM

=== Conversation ===

User:
Create a React app