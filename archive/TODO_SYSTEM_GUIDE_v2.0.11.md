# Oropendola AI - TODO System User Guide v2.0.11

## ✅ TODO System is FULLY IMPLEMENTED!

The TODO system in Oropendola AI is **completely functional** and follows GitHub Copilot's design pattern. Here's how it works and how to use it.

---

## 🎯 Overview

When you ask the AI to perform tasks, it automatically:
1. **Detects task lists** in its response
2. **Parses TODOs** from the text
3. **Displays them** in a collapsible panel above the chat
4. **Syncs with backend** for persistence
5. **Tracks progress** as tasks complete

---

## 📋 How TODOs Appear

### Example Conversation:

**You:** "Create a new React component with tests"

**AI Response:**
```
I'll help you create a new React component. Here's what I'll do:

1. Create Button.jsx component file
2. Create Button.test.jsx test file
3. Add CSS styling
4. Update exports
```

### What Happens:

1. **Panel Appears**: A blue todo panel shows above the chat
2. **Items Listed**: All 4 tasks appear with checkboxes
3. **Counter**: Shows "0/4" completed
4. **Auto-expand**: Panel opens automatically

---

## 🔍 TODO Detection Patterns

The AI's TodoManager detects these formats:

### 1. Numbered Lists ✅
```
1. Create component file
2. Write tests
3. Add documentation
```

### 2. Bullet Points ✅
```
- Install dependencies
* Configure webpack
+ Run build
```

### 3. Explicit TODOs ✅
```
TODO: Fix the authentication bug
TO-DO: Add error handling
To Do: Update README
```

### 4. Checkboxes ✅
```
[ ] Implement feature
[x] Write tests (pre-completed)
[ ] Deploy to production
```

---

## 🎨 UI Features

### Panel States:

1. **Expanded** (default when todos arrive)
   ```
   ▼ Todos (0/4)                    🔄 🗑️
   ═══════════════════════════════════════
   Context: "Creating React component..."

   📄 Related Files:
   - src/components/Button.jsx
   - src/components/Button.test.jsx

   ✅ Created 4 todos

   ○ 1. Create Button.jsx component file
   ○ 2. Create Button.test.jsx test file
   ○ 3. Add CSS styling
   ○ 4. Update exports
   ```

2. **Collapsed** (click header to collapse)
   ```
   ▶ Todos (2/4)
   ```

3. **Empty State** (no todos yet)
   ```
   No tasks yet. Ask AI to create something!
   ```

### Interactive Elements:

- **Checkboxes**: Click any todo to toggle complete/pending
- **Numbers**: Show order (1., 2., 3., ...)
- **Collapse Arrow**: ▼ (expanded) or ▶ (collapsed)
- **Stats Counter**: (completed/total)
- **Sync Button** (🔄): Manually sync with backend
- **Clear Button** (🗑️): Remove all todos

---

## ⚙️ How It Works Internally

### 1. Parsing Phase
```javascript
// src/utils/todo-manager.js
parseFromAIResponse(aiResponse) {
  - Detects numbered lists (1. 2. 3.)
  - Detects bullet points (- * +)
  - Detects TODO: markers
  - Detects checkboxes ([ ] [x])
  - Extracts context/reasoning
  - Finds related files
}
```

### 2. Display Phase
```javascript
// src/sidebar/sidebar-provider.js
_parseTodosFromResponse(responseText) {
  - Calls TodoManager.parseFromAIResponse()
  - Adds todos to local list
  - Sends updateTodos message to webview
  - Syncs with backend API
}
```

### 3. Webview Rendering
```javascript
// Embedded in sidebar-provider.js line 3523
renderTodos(todos, stats, context, relatedFiles) {
  - Shows todo panel
  - Renders each item with checkbox
  - Updates counter
  - Scrolls into view
}
```

### 4. Backend Sync
```javascript
_createTodosInBackend(todos) {
  - POSTs to /api/method/ai_assistant.api.todos.create_todos_doctype
  - Stores in Frappe DocType
  - Associates with conversation_id
  - Enables cross-device sync
}
```

---

## 🎬 Usage Examples

### Example 1: Building a Feature
```
You: "Build a user authentication system"

AI: "I'll build a complete authentication system:

1. Create AuthService.js with login/logout
2. Add JWT token handling
3. Create Login component
4. Add protected route wrapper
5. Write integration tests"

Result: 5 todos appear, panel opens
```

### Example 2: Fixing Bugs
```
You: "Fix the memory leak in ProfilePage"

AI: "To fix the memory leak:

- Add useEffect cleanup
- Remove event listeners
- Cancel pending requests
- Update component lifecycle"

Result: 4 todos appear as bullet list
```

### Example 3: Refactoring
```
You: "Refactor the API client"

AI: "Let's refactor step by step:

TODO: Extract axios config to separate file
TODO: Add request/response interceptors
TODO: Implement retry logic
TODO: Add error handling wrapper"

Result: 4 todos with TODO: prefix
```

---

## 🔧 User Actions

### Toggle Todo Completion
1. Click on any todo item OR
2. Click the checkbox circle
3. Item gets checked ✓ and strikes through
4. Counter updates (e.g., "1/4" → "2/4")
5. Syncs with backend automatically

### Collapse/Expand Panel
1. Click the todo header (anywhere except buttons)
2. Panel collapses to single line
3. Click again to expand
4. State persists during session

### Sync with Backend
1. Click 🔄 sync button
2. Fetches latest todos from server
3. Merges with local state
4. Shows confirmation

### Clear All Todos
1. Click 🗑️ clear button
2. Confirms: "Clear all TODOs?"
3. If yes: Deletes from backend + UI
4. Panel hides (empty state)

---

## 📊 Backend Integration

### API Endpoints

1. **Create TODOs**
   ```
   POST /api/method/ai_assistant.api.todos.create_todos_doctype
   Body: {
     conversation_id: "conv_123",
     todos: [{title, description, status, order}]
   }
   ```

2. **Sync TODOs**
   ```
   POST /api/method/ai_assistant.api.todos.sync_todos
   Body: {conversation_id: "conv_123"}
   Returns: {todos: [...], stats: {total, completed, pending}}
   ```

3. **Clear TODOs**
   ```
   POST /api/method/ai_assistant.api.todos.clear_todos
   Body: {conversation_id: "conv_123"}
   Returns: {deleted_count: 5}
   ```

### Data Model

```javascript
{
  id: "todo_1_1698765432000",
  text: "Create Button component",
  completed: false,
  order: 1,
  type: "numbered", // or "bullet", "explicit", "checkbox"
  parentId: null, // for hierarchical sub-tasks
  level: 0, // indentation level (0 = top, 1 = sub-task)
  timestamp: Date
}
```

---

## 🎨 Styling (GitHub Copilot-Inspired)

### Colors & Design:
- **Panel Background**: Matches VSCode editor background
- **Border**: Subtle panel border color
- **Checkboxes**:
  - Empty: Grey circular border
  - Checked: Blue filled circle with white ✓
- **Hover Effects**: Light background on hover
- **Completed Items**: 60% opacity + strikethrough
- **Stats**: Descriptive foreground color
- **Context Box**: Slightly darker background with border

### Responsive Behavior:
- **Auto-scroll**: Panel scrolls into view when visible
- **Smooth Animations**:
  - Slide down when appearing
  - Fade when completing
  - Collapse/expand transition
- **Sticky Panel**: Stays above messages

---

## 🐛 Troubleshooting

### TODOs Not Appearing?

**Check 1:** Does AI response contain a list?
- ✅ Must have numbered list (1. 2. 3.)
- ✅ OR bullet points (- * +)
- ✅ OR TODO: markers
- ✅ OR checkboxes ([ ])

**Check 2:** Is the conversation active?
- ✅ Must have valid `conversation_id`
- ✅ Check console: "📝 Parsed X TODO items"

**Check 3:** Is backend accessible?
- ⚠️ If backend sync fails, TODOs still show locally
- Check console for errors

### TODOs Not Syncing?

**Fix 1:** Click the 🔄 sync button manually

**Fix 2:** Check session cookies:
```javascript
// In sidebar-provider.js
if (!this._sessionCookies) {
  console.error('No session cookies - re-login');
}
```

**Fix 3:** Verify conversation ID:
```javascript
// Check console logs
console.log('Conversation ID:', this._conversationId);
```

### Panel Not Visible?

**Reason:** Panel only shows when todos exist
- Empty state hides panel completely
- Ask AI: "Create a todo list for X"
- Panel appears automatically

---

## 🚀 Advanced Features

### Hierarchical Sub-Tasks (Supported)
```
1. Build authentication
   - Create login form
   - Add validation
   - Handle errors
2. Add user profile
   - Create profile page
   - Add edit functionality
```

Result: Parent tasks and indented sub-tasks

### Context & Related Files
When AI creates todos, it extracts:
1. **Context**: The "why" behind the tasks
2. **Related Files**: Files mentioned in response

Both appear above the todo list.

### Real-Time Updates
- Todos sync as AI generates them
- No need to wait for full response
- Incremental updates possible

---

## 📝 Best Practices

### For Users:

1. **Be Specific**: "Create login page with email/password" → Better todos
2. **Use Action Verbs**: AI detects "Create", "Fix", "Update", "Add"
3. **One Request at a Time**: Keeps todos focused
4. **Check Todos**: Click to mark complete as you work
5. **Clear When Done**: Use 🗑️ to start fresh

### For AI Prompts:

```
Good: "Build a search feature with autocomplete"
→ AI creates: 3-5 specific, actionable todos

Bad: "Make it better"
→ AI might not generate concrete todo list
```

---

## 🎯 Real-World Workflow

### Scenario: Adding a New Feature

**Step 1: Ask AI**
```
You: "Add dark mode toggle to settings page"
```

**Step 2: Review Plan**
```
AI: "I'll add dark mode support:

1. Create DarkModeToggle component
2. Add theme context provider
3. Update CSS variables
4. Store preference in localStorage
5. Test theme switching"

→ 5 todos appear in panel
```

**Step 3: Work Through Todos**
- AI creates files automatically
- You review each change
- Click ✓ on todos as completed
- Counter shows progress: 3/5

**Step 4: Completion**
```
All 5 todos checked ✓
Counter shows: 5/5
Feature complete!
```

**Step 5: Clean Up**
- Click 🗑️ to clear todos
- Ready for next task

---

## 💡 Tips & Tricks

### Tip 1: Use TODOs as Checklist
Even if AI completes tasks automatically, TODOs serve as:
- ✅ **Progress tracker**
- ✅ **Audit log** (what was done)
- ✅ **Quality checklist** (verify each step)

### Tip 2: Collapse When Not Needed
- Keep panel collapsed while chatting
- Expand when actively working through tasks
- Saves screen space

### Tip 3: Manual TODOs
Ask AI: "Create a todo list for refactoring the auth module"
- AI generates list without executing
- You can work through manually
- Check off as you complete each

### Tip 4: Sync Across Devices
- TODOs sync to backend
- Open same conversation on different machine
- Progress persists!

---

## 📊 Statistics

The todo system tracks:
- **Total todos**: All created
- **Completed**: Checked off
- **Pending**: Still open
- **Completion rate**: Shown in UI

Console logs show detailed stats:
```
📋 Updating UI with 5 TODOs from backend
   Total: 5, Completed: 2, Pending: 3
```

---

## 🔐 Security & Privacy

- TODOs stored in your Frappe backend
- Associated with your conversation_id
- Only you can access your todos
- Session-based authentication
- No todos shared between users

---

## 🆘 Getting Help

### Debug Mode:
Open browser DevTools (in VS Code webview):
1. VS Code → Help → Toggle Developer Tools
2. Switch to "Webview Developer Tools"
3. Check console for todo logs:
   - `[WEBVIEW] updateTodos received`
   - `📝 Parsed X TODO items`
   - `✅ Created X TODOs in backend`

### Common Console Messages:

**Success:**
```
📝 Parsed 4 TODO items from AI response
✅ Successfully saved 4 TODOs to backend
[WEBVIEW] updateTodos received 4 todos
```

**Warnings:**
```
⚠️ Failed to create TODOs in backend: [reason]
(TODOs still visible locally)
```

**Errors:**
```
❌ Parse TODOs error: [details]
(Check AI response format)
```

---

## 🎉 Summary

The TODO system in Oropendola AI is:

✅ **Fully Implemented** - Complete UI and backend integration
✅ **Auto-Parsing** - Detects todos from AI responses
✅ **Interactive** - Click to toggle, collapse, sync, clear
✅ **Persistent** - Syncs with backend for cross-device access
✅ **GitHub Copilot Style** - Familiar, polished UI
✅ **Context-Aware** - Shows reasoning and related files
✅ **Hierarchical** - Supports sub-tasks and ordering

**You don't need to change anything - it just works!** 🚀

---

## 📞 Support

If todos still don't appear:
1. Check console logs (see Debug Mode above)
2. Verify AI response includes a list format
3. Ensure session is authenticated
4. Try manual sync with 🔄 button
5. Report issue with console output

---

**Version:** 2.0.11
**Status:** ✅ Production Ready
**Last Updated:** 2025-01-20

**The TODO system is complete and functional. Just ask the AI to create tasks and watch the magic happen!** ✨
