# 📋 TODO List Feature - User Guide

## 🎉 Welcome to Automatic TODO Tracking!

The Oropendola AI Assistant now automatically extracts, tracks, and syncs TODO items from AI responses. When you ask the AI to build something, it creates a numbered plan and tracks your progress!

---

## ✨ How It Works

### 1. Ask the AI to Build Something

```
User: "Create a React app with TypeScript and ESLint"
```

### 2. AI Generates a Plan

```
AI: I'll help you set up a React + TypeScript project:

1. Create project structure
2. Install dependencies
3. Set up TypeScript configuration
4. Configure ESLint
5. Create sample component

Let's start:

```tool_call
{
  "action": "create_file",
  "path": "package.json",
  ...
}
```
```

### 3. TODOs Are Automatically Extracted

The extension detects the numbered list and:
- ✅ Extracts all 5 TODO items
- ✅ Saves them locally
- ✅ Syncs with backend automatically
- ✅ Displays progress tracking

### 4. Track Your Progress

```
React + TypeScript Setup
[████████████████░░░░░░░░] 4/5 tasks (80%)

☑ 1. Create project structure
☑ 2. Install dependencies
☑ 3. Set up TypeScript configuration
☑ 4. Configure ESLint
☐ 5. Create sample component
```

---

## 📝 Supported TODO Formats

The system automatically detects TODOs in these formats:

### Format 1: Numbered Lists ⭐ Most Common
```
1. First task
2. Second task
3. Third task
```

### Format 2: Bullet Points
```
- Task one
* Task two
+ Task three
```

### Format 3: Explicit TODO Markers
```
TODO: Fix this bug
To Do: Add validation
```

### Format 4: Checkboxes
```
[ ] Incomplete task
[x] Completed task
```

### Format 5: Action Verbs
```
Create a new file
Build the Docker image
Implement authentication
Deploy to production
```

---

## 🚀 Features

### ✅ Automatic Detection
- No manual input needed
- Parses AI responses in real-time
- Supports 5 different TODO patterns

### ✅ Progress Tracking
- See completion percentage
- Track active vs completed tasks
- Visual progress indicators

### ✅ Backend Sync
- Automatically saves to conversation database
- Persists across sessions
- Real-time updates when you toggle completion

### ✅ Smart Parsing
- Filters out paragraphs (keeps only task-like items)
- Prevents duplicate TODOs
- Maintains order from numbered lists

---

## 💡 Usage Examples

### Example 1: Building a Web Server

**Your Request:**
```
Create a Node.js Express server with:
- Port 3000
- Health check endpoint
- Error handling middleware
- Logging
```

**AI Response:**
```
I'll create a production-ready Express server:

1. Create package.json with dependencies
2. Set up Express server (index.js)
3. Add health check route
4. Implement error handling middleware
5. Configure Winston logger
6. Add start script

```tool_call
{...}
```
```

**Result:** 6 TODOs extracted and tracked automatically

---

### Example 2: Docker Setup

**Your Request:**
```
Set up Docker for my Python Flask app
```

**AI Response:**
```
I'll dockerize your Flask application:

1. Create Dockerfile
2. Add .dockerignore
3. Create docker-compose.yml
4. Add environment variables file
5. Create startup script

```tool_call
{...}
```
```

**Result:** 5 TODOs tracked with completion status

---

### Example 3: Testing Setup

**Your Request:**
```
Add unit tests to my React components
```

**AI Response:**
```
TODO: Install Jest and React Testing Library
TODO: Create test setup file
TODO: Write tests for App component
TODO: Write tests for Button component
TODO: Add test coverage reporting
```

**Result:** 5 TODOs extracted from explicit markers

---

## 📊 Statistics

Every TODO list includes real-time statistics:

```json
{
  "total": 5,
  "completed": 3,
  "active": 2,
  "completion_percentage": 60.0
}
```

**Displayed as:**
```
[████████████░░░░░░░░░░░░] 3/5 (60%)
```

---

## ⚙️ Technical Details

### Where TODOs Are Stored

1. **Local (Frontend)**
   - In-memory TodoManager instance
   - Persists during session
   - Fast access and updates

2. **Backend (Database)**
   - AI Conversation document
   - `todos` field (JSON)
   - `todo_count` field (integer)

### Sync Behavior

- **Automatic Sync:** When AI generates new TODOs
- **Manual Sync:** Toggle completion status
- **Load on Start:** Retrieves saved TODOs when conversation opens
- **Fail-Safe:** Local operations work even if backend is down

### API Endpoints Used

| Operation | Endpoint | When |
|-----------|----------|------|
| Extract TODOs | `extract_todos` | After AI response |
| Save TODOs | `save_todos` | After extraction |
| Get TODOs | `get_todos` | On conversation load |
| Update TODO | `update_todo` | On toggle completion |

---

## 🎯 Best Practices

### 1. Ask for Numbered Plans
```
✅ Good: "Create a React app (list the steps)"
❌ Less Optimal: "Create a React app" (may not generate numbered list)
```

### 2. Use Agent Mode
- Agent mode generates tool_call blocks + TODOs
- Ask mode only provides explanations

### 3. Be Specific
```
✅ Good: "Create an Express API with auth, DB, and logging"
❌ Vague: "Make an API"
```

### 4. Review Auto-Generated TODOs
- The AI generates the plan
- You track completion manually
- System syncs automatically

---

## 🔧 Operations

### Toggle TODO Completion
```javascript
// Via UI (future):
Click checkbox next to TODO item

// Via Console:
vscode.postMessage({ 
  type: 'toggleTodo', 
  todoId: 'todo_1234567890_1' 
});
```

### Delete a TODO
```javascript
vscode.postMessage({ 
  type: 'deleteTodo', 
  todoId: 'todo_1234567890_1' 
});
```

### Clear All TODOs
```javascript
vscode.postMessage({ type: 'clearTodos' });
```

### Manual Sync
```javascript
vscode.postMessage({ type: 'syncTodos' });
```

---

## 🐛 Troubleshooting

### TODOs Not Being Extracted

**Check:**
1. Is the AI response in **numbered list format**? (1., 2., 3.)
2. Are you in **Agent mode**? (not Ask mode)
3. Check console for: `📝 Parsed X TODO items from AI response`

**Fix:**
- Ask AI to "list the steps"
- Use explicit: "Create a numbered plan for..."

---

### Backend Sync Failed

**Symptom:** Console shows `⚠️ Auto-sync failed`

**Causes:**
- Network issue
- Backend API down
- Invalid conversation ID

**Impact:** None - TODOs still work locally

**Fix:**
- Check API URL in settings
- Verify session is active
- Manual sync: `vscode.postMessage({ type: 'syncTodos' })`

---

### Duplicate TODOs

**Prevention:** Built-in duplicate detection compares:
- Normalized text (case-insensitive, no punctuation)
- Similar TODOs are merged

**Manual Fix:**
```javascript
vscode.postMessage({ type: 'deleteTodo', todoId: 'todo_xxx' });
```

---

## 📈 Metrics & Insights

### Completion Rate
```
High completion (>80%): ✅ Project on track
Medium completion (50-80%): 🟡 In progress
Low completion (<50%): 🔴 Just started
```

### TODO Count Trends
```
New conversation: 5-10 TODOs typical
Complex project: 15-30 TODOs
Major refactor: 30+ TODOs
```

---

## 🎨 Future Enhancements (Roadmap)

### Planned Features
- [ ] Visual TODO panel in sidebar
- [ ] Drag-and-drop reordering
- [ ] Sub-tasks support
- [ ] Priority levels (High/Medium/Low)
- [ ] Due dates
- [ ] Export to Markdown/CSV
- [ ] Bulk operations (mark all complete)

---

## 💻 Developer Notes

### Frontend Components

**TodoManager Class** (`src/utils/todo-manager.js`)
- Parsing engine (5 patterns)
- State management
- Duplicate prevention
- Export/Import

**Sidebar Provider** (`src/sidebar/sidebar-provider.js`)
- Event handlers
- Backend sync
- UI updates
- Message passing

### Integration Points

1. **AI Response Received:**
   ```javascript
   task.on('assistantMessage', (taskId, message) => {
     this._parseTodosFromResponse(message);
     // Auto-syncs with backend
   });
   ```

2. **TODO Toggle:**
   ```javascript
   _handleToggleTodo(todoId) {
     this._todoManager.toggleTodo(todoId);
     this._updateTodoDisplay();
     this._syncTodoWithBackend(todoId, completed);
   }
   ```

3. **Backend Sync:**
   ```javascript
   await axios.post('/api/method/ai_assistant.api.save_todos', {
     conversation_id: this._conversationId,
     todos: this._todoManager.getAllTodos()
   });
   ```

---

## 📚 Related Documentation

- **Backend API Spec:** `BACKEND_TODO_API_SPEC.md`
- **Implementation Summary:** `TODO_IMPLEMENTATION_SUMMARY.md`
- **Backend Fixes:** `BACKEND_FIXES_REQUIRED.md`

---

## ✅ Quick Start Checklist

- [x] Backend TODO API deployed
- [x] Frontend TodoManager implemented
- [x] Auto-extraction from AI responses
- [x] Backend sync enabled
- [x] Toggle completion works
- [ ] UI panel added (next step)
- [ ] User testing completed

---

## 🎯 Summary

**What Works:**
- ✅ Automatic TODO extraction (5 patterns)
- ✅ Backend sync (save, load, update)
- ✅ Progress tracking
- ✅ Duplicate prevention

**What's Next:**
- 🔄 Add visual TODO panel to chat UI
- 🔄 User testing and feedback
- 🔄 Enhanced features (priorities, due dates)

---

**Status:** ✅ **READY FOR USE**

The TODO feature is fully functional! Start using it in Agent mode today:

```
Ask: "Create a full-stack app with React + Node.js"
Watch: AI generates numbered plan
Result: TODOs automatically tracked!
```

---

**Questions?** Contact: sammish@oropendola.ai
