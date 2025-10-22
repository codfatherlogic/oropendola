# 🔄 Frontend vs Backend - Complete Guide

## 🎯 Quick Answer

**Frontend (VS Code Extension):**
- Runs on **your computer** (Mac/Windows/Linux)
- Written in **JavaScript/Node.js**
- Handles **UI/UX** (buttons, panels, displays)
- Sends **requests** to backend
- Displays **responses** from backend

**Backend (Frappe Server):**
- Runs on **oropendola.ai server** (Linux)
- Written in **Python**
- Handles **AI processing** (GPT, Claude, etc.)
- Manages **database** (TODOs, conversations, users)
- Executes **tool calls** (file operations, commands)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  YOUR COMPUTER (Mac/Windows/Linux)                          │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  VS CODE EDITOR                                     │    │
│  │                                                      │    │
│  │  ┌────────────────────────────────────────────┐    │    │
│  │  │  FRONTEND (Oropendola Extension)           │    │    │
│  │  │  - JavaScript/Node.js                      │    │    │
│  │  │  - UI Components (React-style)             │    │    │
│  │  │  - Event Handling                          │    │    │
│  │  │  - HTTP Client (axios)                     │    │    │
│  │  └────────────────────────────────────────────┘    │    │
│  │         │                               ▲            │    │
│  │         │ HTTP Request                  │ Response   │    │
│  │         ▼                               │            │    │
│  └────────────────────────────────────────────────────┘    │
└───────────────────────│───────────────────▲─────────────────┘
                        │                   │
                   INTERNET (HTTPS)
                        │                   │
┌───────────────────────▼───────────────────│─────────────────┐
│  OROPENDOLA.AI SERVER (Linux)             │                 │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  BACKEND (Frappe Framework)                        │    │
│  │  - Python                                          │    │
│  │  - REST API Endpoints                             │    │
│  │  - AI Integration (OpenAI, Anthropic)             │    │
│  │  - Database (MariaDB)                             │    │
│  │  - Tool Execution                                 │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  DATABASE                                          │    │
│  │  - AI TODO (TODOs)                                 │    │
│  │  - AI Conversation (Chat history)                  │    │
│  │  - User (Accounts)                                 │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 Frontend Work (VS Code Extension)

### Location
- **Path:** `/Users/sammishthundiyil/oropendola/src/`
- **Language:** JavaScript/Node.js
- **Runs on:** Your local computer
- **Environment:** VS Code Extension Host

### Responsibilities

#### 1. **User Interface (UI)**
```javascript
// Display chat messages
function addMessageToUI(message) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message';
  messageDiv.innerHTML = formatMessageContent(message.content);
  messagesContainer.appendChild(messageDiv);
}
```

**What it does:**
- ✅ Shows chat interface
- ✅ Displays AI messages
- ✅ Shows TODO panel
- ✅ Displays file changes card
- ✅ Renders buttons and controls

#### 2. **User Interaction**
```javascript
// Handle user clicks
function toggleTodoItem(todoId) {
  // Call backend API
  safePostMessage({
    type: 'toggleTodo',
    todoId: todoId
  });
}
```

**What it does:**
- ✅ Handles button clicks
- ✅ Processes text input
- ✅ Manages keyboard shortcuts
- ✅ Opens files in editor
- ✅ Copies code to clipboard

#### 3. **API Communication**
```javascript
// Send request to backend
async _handleToggleTodo(todoId) {
  const response = await axios.post(
    `${apiUrl}/api/method/ai_assistant.api.todos.toggle_todo_doctype`,
    { todo_id: todoId },
    { headers: { 'Cookie': this._sessionCookies } }
  );
}
```

**What it does:**
- ✅ Sends HTTP requests to backend
- ✅ Manages session cookies
- ✅ Handles authentication
- ✅ Retries on failure
- ✅ Shows loading states

#### 4. **State Management**
```javascript
// Track current state
this._conversationId = 'conv-123';
this._todos = [...];
this._fileChanges = {...};
```

**What it does:**
- ✅ Remembers conversation ID
- ✅ Caches TODO list
- ✅ Stores file changes
- ✅ Manages UI state
- ✅ Handles webview lifecycle

#### 5. **Visual Display**
```javascript
// Display file changes
function displayFileChanges(fileChanges) {
  const html = `
    <div class="file-changes-card">
      <div class="file-changes-header">File Changes (${count})</div>
      <div class="file-changes-content">
        ${fileChanges.created.map(file => `<li>${file}</li>`).join('')}
      </div>
    </div>
  `;
  return html;
}
```

**What it does:**
- ✅ Formats HTML for display
- ✅ Applies CSS styling
- ✅ Adds animations
- ✅ Handles responsive layout
- ✅ Manages themes (dark/light)

### Frontend Files (v2.0.2)

```
src/
├── core/
│   └── ConversationTask.js          # Event handling & data flow
│       - Extracts backend data (todos, file_changes)
│       - Emits events with extraData
│       - Manages task lifecycle
│
├── sidebar/
│   └── sidebar-provider.js          # Main UI component
│       - Renders chat interface
│       - Handles TODO panel
│       - Displays file changes card
│       - Makes API calls
│       - Manages webview
│
└── extension.js                     # Extension entry point
    - Activates extension
    - Registers commands
    - Creates sidebar
```

---

## 🔧 Backend Work (Frappe Server)

### Location
- **Path:** `frappe-bench/apps/ai_assistant/`
- **Language:** Python
- **Runs on:** oropendola.ai server (Linux)
- **Framework:** Frappe

### Responsibilities

#### 1. **AI Processing**
```python
# Process AI request
@frappe.whitelist()
def chat(message, conversation_id):
    # Call OpenAI/Claude
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[{"role": "user", "content": message}]
    )
    
    # Return AI response
    return {
        "response": response.choices[0].message.content,
        "tool_calls": [],
        "todos": extract_todos(response),
        "file_changes": track_file_changes()
    }
```

**What it does:**
- ✅ Calls AI models (GPT-4, Claude)
- ✅ Manages system prompts
- ✅ Handles context/history
- ✅ Processes streaming responses
- ✅ Extracts structured data

#### 2. **Database Operations**
```python
# Save TODO to database
@frappe.whitelist()
def create_todos_doctype(todos, conversation_id):
    for todo in todos:
        doc = frappe.get_doc({
            "doctype": "AI TODO",
            "conversation_id": conversation_id,
            "title": todo['title'],
            "status": "Pending",
            "user": frappe.session.user
        })
        doc.insert()
    
    frappe.db.commit()
```

**What it does:**
- ✅ Stores TODOs in database
- ✅ Saves conversation history
- ✅ Manages user data
- ✅ Handles transactions
- ✅ Ensures data integrity

#### 3. **TODO Management**
```python
# Toggle TODO status
@frappe.whitelist()
def toggle_todo_doctype(todo_id):
    doc = frappe.get_doc("AI TODO", todo_id)
    
    # Verify ownership
    if doc.user != frappe.session.user:
        frappe.throw("Unauthorized")
    
    # Toggle status
    doc.status = "Completed" if doc.status == "Pending" else "Pending"
    doc.completed_at = frappe.utils.now() if doc.status == "Completed" else None
    doc.save()
    
    return {"success": True, "status": doc.status}
```

**What it does:**
- ✅ CRUD operations on TODOs
- ✅ Validates user permissions
- ✅ Updates timestamps
- ✅ Returns updated data
- ✅ Handles errors

#### 4. **File Tracking**
```python
# Track file changes from tool calls
def extract_file_changes(tool_calls):
    file_changes = {
        "created": [],
        "modified": [],
        "deleted": [],
        "commands": []
    }
    
    for tool_call in tool_calls:
        if tool_call['action'] == 'create_file':
            file_changes['created'].append(tool_call['file_path'])
        elif tool_call['action'] == 'edit_file':
            file_changes['modified'].append(tool_call['file_path'])
        # ... etc
    
    return file_changes
```

**What it does:**
- ✅ Parses tool_calls array
- ✅ Categorizes file operations
- ✅ Deduplicates entries
- ✅ Extracts command history
- ✅ Returns structured data

#### 5. **Tool Execution**
```python
# Execute tool call
def execute_tool(tool_call):
    if tool_call['action'] == 'create_file':
        with open(tool_call['file_path'], 'w') as f:
            f.write(tool_call['content'])
    
    elif tool_call['action'] == 'run_command':
        result = subprocess.run(
            tool_call['command'],
            shell=True,
            capture_output=True
        )
        return result.stdout
```

**What it does:**
- ✅ Creates/edits/deletes files
- ✅ Runs terminal commands
- ✅ Installs packages
- ✅ Executes scripts
- ✅ Returns results

#### 6. **Authentication & Security**
```python
# Authenticate user
@frappe.whitelist()
def login(username, password):
    # Verify credentials
    frappe.local.login_manager.authenticate(username, password)
    
    # Create session
    frappe.local.login_manager.post_login()
    
    return {
        "success": True,
        "user": frappe.session.user,
        "sid": frappe.session.sid
    }
```

**What it does:**
- ✅ Validates credentials
- ✅ Creates sessions
- ✅ Manages cookies
- ✅ Enforces permissions
- ✅ Logs access

### Backend Files (v2.0.2)

```
frappe-bench/apps/ai_assistant/
├── ai_assistant/
│   ├── api/
│   │   ├── __init__.py              # Chat API
│   │   │   - Process AI requests
│   │   │   - Extract TODOs
│   │   │   - Track file changes
│   │   │
│   │   └── todos.py                 # TODO API
│   │       - create_todos_doctype()
│   │       - get_todos_doctype()
│   │       - toggle_todo_doctype()
│   │       - delete_todo_doctype()
│   │       - clear_todos_doctype()
│   │
│   └── doctype/
│       └── ai_todo/
│           ├── ai_todo.json         # Database schema
│           └── ai_todo.py           # Controller
│
└── test_todo_api.py                 # Test suite
```

---

## 🔄 How They Work Together

### Example: User Sends a Message

#### Step 1: **Frontend** - User Types Message
```javascript
// User clicks "Send" button
function handleSendMessage() {
  const message = messageInput.value;
  
  // Show in UI immediately
  addMessageToUI({
    role: 'user',
    content: message
  });
  
  // Send to backend
  sendToBackend(message);
}
```

**Frontend work:**
- ✅ Capture user input
- ✅ Validate input
- ✅ Display user message
- ✅ Show loading indicator

---

#### Step 2: **Frontend** - HTTP Request
```javascript
// Send HTTP request to backend
async function sendToBackend(message) {
  const response = await axios.post(
    'https://oropendola.ai/api/method/ai_assistant.api.chat',
    {
      message: message,
      conversation_id: this._conversationId
    },
    {
      headers: { 'Cookie': this._sessionCookies }
    }
  );
  
  return response.data;
}
```

**Frontend work:**
- ✅ Construct HTTP request
- ✅ Include auth cookies
- ✅ Send over HTTPS
- ✅ Wait for response

---

#### Step 3: **Backend** - Process Request
```python
# Backend receives request
@frappe.whitelist()
def chat(message, conversation_id):
    # 1. Load conversation history
    history = get_conversation_history(conversation_id)
    
    # 2. Call AI model
    ai_response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=history + [{"role": "user", "content": message}]
    )
    
    # 3. Extract TODOs
    todos = extract_todos(ai_response.content)
    
    # 4. Save TODOs to database
    if todos:
        create_todos_doctype(todos, conversation_id)
    
    # 5. Track file changes
    file_changes = extract_file_changes(ai_response.tool_calls)
    
    # 6. Get current TODOs
    all_todos = get_todos_doctype(conversation_id)
    
    # 7. Return response
    return {
        "success": True,
        "response": ai_response.content,
        "tool_calls": ai_response.tool_calls,
        "todos": all_todos['todos'],
        "todo_stats": all_todos['stats'],
        "file_changes": file_changes
    }
```

**Backend work:**
- ✅ Authenticate request
- ✅ Load conversation history
- ✅ Call AI model (GPT-4)
- ✅ Parse AI response
- ✅ Extract TODOs (regex)
- ✅ Save to database
- ✅ Track file changes
- ✅ Return structured data

---

#### Step 4: **Frontend** - Process Response
```javascript
// Frontend receives response
task.on('assistantMessage', (taskId, message, extraData) => {
  // 1. Display AI message
  this._view.webview.postMessage({
    type: 'addMessage',
    message: {
      role: 'assistant',
      content: message,
      file_changes: extraData?.file_changes
    }
  });
  
  // 2. Update TODO panel
  if (extraData?.todos) {
    this._view.webview.postMessage({
      type: 'updateTodos',
      todos: extraData.todos,
      stats: extraData.todo_stats
    });
  }
  
  // 3. Hide loading indicator
  this._view.webview.postMessage({
    type: 'hideTyping'
  });
});
```

**Frontend work:**
- ✅ Parse response JSON
- ✅ Extract todos, file_changes
- ✅ Update UI (message, TODO panel, file card)
- ✅ Hide loading indicator
- ✅ Handle errors

---

#### Step 5: **Frontend** - Display Results
```javascript
// Display in webview
function addMessageToUI(message) {
  // 1. Format message
  const html = formatMessageContent(message.content, message.file_changes);
  
  // 2. Append to chat
  messagesContainer.innerHTML += html;
  
  // 3. Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
```

**Frontend work:**
- ✅ Format message HTML
- ✅ Render file changes card
- ✅ Apply CSS styling
- ✅ Scroll to bottom
- ✅ Enable interactions

---

### Example: User Toggles TODO

#### Step 1: **Frontend** - User Clicks Checkbox
```javascript
// User clicks TODO checkbox
function toggleTodoItem(todoId) {
  // Send message to extension
  safePostMessage({
    type: 'toggleTodo',
    todoId: todoId
  });
}
```

**Frontend work:**
- ✅ Detect click event
- ✅ Extract TODO ID
- ✅ Send to extension host

---

#### Step 2: **Frontend** - Extension Handler
```javascript
// Extension handles message
async _handleToggleTodo(todoId) {
  // Call backend API
  const response = await axios.post(
    `${apiUrl}/api/method/ai_assistant.api.todos.toggle_todo_doctype`,
    { todo_id: todoId },
    { headers: { 'Cookie': this._sessionCookies } }
  );
  
  // Refresh TODO list from backend
  await this._fetchTodosFromBackend();
}
```

**Frontend work:**
- ✅ Make HTTP request
- ✅ Pass TODO ID
- ✅ Wait for response
- ✅ Fetch updated list

---

#### Step 3: **Backend** - Toggle Status
```python
# Backend toggles TODO
@frappe.whitelist()
def toggle_todo_doctype(todo_id):
    # Load TODO from database
    doc = frappe.get_doc("AI TODO", todo_id)
    
    # Verify user owns this TODO
    if doc.user != frappe.session.user:
        frappe.throw("Unauthorized", frappe.PermissionError)
    
    # Toggle status
    if doc.status == "Pending":
        doc.status = "Completed"
        doc.completed_at = frappe.utils.now()
    else:
        doc.status = "Pending"
        doc.completed_at = None
    
    # Save to database
    doc.save()
    frappe.db.commit()
    
    return {
        "success": True,
        "status": doc.status,
        "completed_at": doc.completed_at
    }
```

**Backend work:**
- ✅ Load TODO from database
- ✅ Check permissions
- ✅ Toggle status field
- ✅ Update timestamp
- ✅ Save to database
- ✅ Return new status

---

#### Step 4: **Frontend** - Update UI
```javascript
// Frontend updates TODO display
this._view.webview.postMessage({
  type: 'updateTodos',
  todos: updatedTodos,
  stats: { total: 5, completed: 3, pending: 2 }
});
```

**Frontend work:**
- ✅ Receive updated list
- ✅ Re-render TODO panel
- ✅ Update checkboxes
- ✅ Update count badge
- ✅ Apply strikethrough

---

## 📊 Responsibilities Summary

### Frontend Responsibilities ✅

| Task | Frontend | Backend |
|------|----------|---------|
| **Display UI** | ✅ Yes | ❌ No |
| **Handle clicks** | ✅ Yes | ❌ No |
| **Format HTML** | ✅ Yes | ❌ No |
| **Apply CSS** | ✅ Yes | ❌ No |
| **Manage state** | ✅ Yes (local) | ✅ Yes (persistent) |
| **Make HTTP requests** | ✅ Yes | ❌ No |
| **Open files in editor** | ✅ Yes | ❌ No |
| **Show notifications** | ✅ Yes | ❌ No |

### Backend Responsibilities ✅

| Task | Frontend | Backend |
|------|----------|---------|
| **Call AI models** | ❌ No | ✅ Yes |
| **Store in database** | ❌ No | ✅ Yes |
| **Execute commands** | ❌ No | ✅ Yes |
| **Create/edit files** | ❌ No | ✅ Yes |
| **Authenticate users** | ❌ No | ✅ Yes |
| **Extract TODOs** | ❌ No | ✅ Yes |
| **Track file changes** | ❌ No | ✅ Yes |
| **Manage permissions** | ❌ No | ✅ Yes |

---

## 🎯 Why This Separation?

### Frontend (Local)
**Pros:**
- ✅ **Fast** - No network delay for UI updates
- ✅ **Responsive** - Immediate feedback
- ✅ **Offline** - Can work without internet (cached data)
- ✅ **Secure** - User's files stay local

**Cons:**
- ❌ No access to AI models (expensive, require API keys)
- ❌ No persistent storage (data lost on restart)
- ❌ Can't execute on server (different OS)

### Backend (Server)
**Pros:**
- ✅ **Powerful** - Can run AI models
- ✅ **Persistent** - Database survives restarts
- ✅ **Centralized** - All users share same data model
- ✅ **Scalable** - Can handle many users

**Cons:**
- ❌ Network latency (200-500ms per request)
- ❌ Requires internet connection
- ❌ Can't access user's local files directly

---

## 🔑 Key Takeaways

### Frontend Does:
1. ✅ **UI/UX** - Everything the user sees and interacts with
2. ✅ **Communication** - HTTP requests to backend
3. ✅ **Display** - Rendering messages, TODOs, file changes
4. ✅ **Local State** - Temporary caching for performance

### Backend Does:
1. ✅ **AI Processing** - Calling GPT-4, Claude, etc.
2. ✅ **Database** - Persistent storage (TODOs, conversations)
3. ✅ **Business Logic** - TODO extraction, file tracking
4. ✅ **Security** - Authentication, permissions, validation

### Together They:
1. ✅ **Provide seamless UX** - Fast UI + Powerful AI
2. ✅ **Ensure data persistence** - TODOs survive restarts
3. ✅ **Enable collaboration** - Multiple users, same backend
4. ✅ **Maintain security** - Auth, permissions, validation

---

## 📝 Summary Table

| Aspect | Frontend (VS Code) | Backend (Frappe) |
|--------|-------------------|------------------|
| **Location** | Your computer | oropendola.ai server |
| **Language** | JavaScript | Python |
| **Framework** | VS Code Extension API | Frappe |
| **Storage** | Local variables | MariaDB database |
| **Network** | Makes requests | Receives requests |
| **AI** | None | GPT-4, Claude |
| **Files** | Displays paths | Creates/edits files |
| **TODOs** | Displays list | Stores in database |
| **Commands** | Shows in UI | Executes on server |
| **Speed** | Instant | 200-500ms |
| **Persistence** | Temporary | Permanent |

---

## 🚀 Your v2.0.2 Implementation

### Frontend Work (You: Me)
- ✅ Added `displayFileChanges()` function
- ✅ Added `toggleFileChanges()` function
- ✅ Updated `formatMessageContent()` to accept file_changes
- ✅ Modified `addMessageToUI()` to pass file_changes
- ✅ Added 22 CSS rules for styling
- ✅ Updated `_handleToggleTodo()` to call backend API
- ✅ Updated `_handleClearTodos()` to call backend API
- ✅ Added `_fetchTodosFromBackend()` method
- ✅ Modified `ConversationTask.js` to extract backend data
- ✅ Updated event emission with extraData

**Time:** 1.5 hours

### Backend Work (You: User)
- ✅ Created AI TODO DocType (database schema)
- ✅ Implemented 6 API endpoints (CRUD operations)
- ✅ Added TODO extraction (regex parsing)
- ✅ Added file tracking (tool_calls parsing)
- ✅ Updated chat API to return todos/file_changes
- ✅ Added permissions and security
- ✅ Wrote test suite (100% pass rate)

**Time:** 30 minutes

---

**Happy Coding! 🎉**

*Frontend displays, Backend processes, Together they create magic!* ✨

