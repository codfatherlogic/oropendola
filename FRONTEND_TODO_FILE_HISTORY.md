# Frontend Implementation - TODO Panel + File History

## 🎯 Overview

This document covers the frontend implementation for:
1. **TODO Panel** - Already exists, needs backend sync
2. **File Changes History** - NEW feature to add

---

## Part 1: TODO Panel Backend Sync

### Current State
The TODO panel already exists in the UI but only shows visual representation. We need to add:
- ✅ Sync with backend API
- ✅ Create TODOs from AI responses
- ✅ Toggle TODO status (checkbox clicks)
- ✅ Persist across reloads

### Files to Modify
- `src/sidebar/sidebar-provider.js` - Message handler and TODO sync

### Implementation Steps

#### Step 1: Add Message Handlers for TODO Actions

**Location**: `src/sidebar/sidebar-provider.js` around line 162

Add these new cases to the message handler:

```javascript
case 'syncTodos':
    await this._syncTodosWithBackend();
    break;

case 'toggleTodo':
    await this._toggleTodo(message.todoId);
    break;

case 'clearTodos':
    await this._clearTodos();
    break;
```

#### Step 2: Add TODO Sync Methods

**Location**: `src/sidebar/sidebar-provider.js` after `_handleOpenFile()` method

Add these new methods:

```javascript
/**
 * Sync TODOs with backend
 */
async _syncTodosWithBackend() {
    try {
        const config = vscode.workspace.getConfiguration('oropendola');
        const apiUrl = config.get('api.url', 'https://oropendola.ai');
        const axios = require('axios');

        // Get current conversation ID from state
        const conversationId = this._currentConversationId;
        if (!conversationId) {
            console.log('No active conversation for TODO sync');
            return;
        }

        // Fetch TODOs from backend
        const response = await axios.get(
            `${apiUrl}/api/method/oropendola.api.todos.get_todos`,
            {
                params: { conversation_id: conversationId },
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': this._sessionCookies
                }
            }
        );

        if (response.data && response.data.message) {
            const { todos, stats } = response.data.message;

            // Update UI
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'updateTodos',
                    todos: todos,
                    stats: stats,
                    context: 'Synced from server'
                });
            }

            console.log(`✅ Synced ${todos.length} TODOs from backend`);
        }
    } catch (error) {
        console.error('❌ Failed to sync TODOs:', error);
        vscode.window.showErrorMessage('Failed to sync TODOs');
    }
}

/**
 * Toggle TODO status
 */
async _toggleTodo(todoId) {
    try {
        const config = vscode.workspace.getConfiguration('oropendola');
        const apiUrl = config.get('api.url', 'https://oropendola.ai');
        const axios = require('axios');

        // Toggle on backend
        const response = await axios.post(
            `${apiUrl}/api/method/oropendola.api.todos.toggle_todo`,
            { todo_id: todoId },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': this._sessionCookies
                }
            }
        );

        if (response.data && response.data.message && response.data.message.success) {
            console.log(`✅ Toggled TODO: ${todoId}`);
            
            // Refresh TODO list
            await this._syncTodosWithBackend();
        } else {
            throw new Error('Failed to toggle TODO');
        }
    } catch (error) {
        console.error('❌ Failed to toggle TODO:', error);
        vscode.window.showErrorMessage('Failed to update TODO');
    }
}

/**
 * Clear all TODOs
 */
async _clearTodos() {
    try {
        const config = vscode.workspace.getConfiguration('oropendola');
        const apiUrl = config.get('api.url', 'https://oropendola.ai');
        const axios = require('axios');

        const conversationId = this._currentConversationId;
        if (!conversationId) return;

        // Clear on backend
        const response = await axios.post(
            `${apiUrl}/api/method/oropendola.api.todos.clear_todos`,
            { conversation_id: conversationId },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': this._sessionCookies
                }
            }
        );

        if (response.data && response.data.message && response.data.message.success) {
            console.log(`✅ Cleared all TODOs`);
            
            // Update UI
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'updateTodos',
                    todos: [],
                    stats: { total: 0, completed: 0, pending: 0 }
                });
            }
        }
    } catch (error) {
        console.error('❌ Failed to clear TODOs:', error);
        vscode.window.showErrorMessage('Failed to clear TODOs');
    }
}
```

#### Step 3: Update Message Send Handler to Process TODO Response

**Location**: Find `_handleSendMessage()` method (around line 500-600)

After receiving the AI response, add TODO processing:

```javascript
// Existing code to send message...

// Process response
if (responseData && responseData.message) {
    const { response, tool_calls, todos, todo_stats, file_changes } = responseData.message;

    // ... existing tool_calls processing ...

    // NEW: Update TODOs if provided
    if (todos && this._view) {
        this._view.webview.postMessage({
            type: 'updateTodos',
            todos: todos,
            stats: todo_stats || {},
            context: 'From AI response'
        });
    }

    // NEW: Display file changes if provided
    if (file_changes && this._view) {
        this._displayFileChanges(file_changes);
    }

    // ... rest of existing code ...
}
```

---

## Part 2: File Changes History (NEW Feature)

### What We're Building

A collapsible card that groups file operations:

```
┌─ 📂 Changes (5 files) ──────────────┐
│ ✅ Created 2 files                   │
│   • src/routes/api.js  [click open]  │
│   • public/styles.css  [click open]  │
│                                      │
│ ✏️  Modified 3 files                 │
│   • public/index.html  [click open]  │
│   • index.js           [click open]  │
│   • package.json       [click open]  │
│                                      │
│ ⚡ Ran 1 command                      │
│   $ npm install                      │
└──────────────────────────────────────┘
```

### CSS Styles to Add

**Location**: Add to CSS section (around line 2760)

```css
/* File Changes History */
.file-changes-card {
    background: rgba(79, 195, 247, 0.05);
    border: 1px solid rgba(79, 195, 247, 0.2);
    border-radius: 8px;
    margin: 12px 0;
    overflow: hidden;
}

.file-changes-header {
    padding: 12px 16px;
    background: rgba(79, 195, 247, 0.1);
    border-bottom: 1px solid rgba(79, 195, 247, 0.2);
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    user-select: none;
}

.file-changes-header:hover {
    background: rgba(79, 195, 247, 0.15);
}

.file-changes-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    font-size: 13px;
    color: var(--vscode-foreground);
}

.file-changes-icon {
    font-size: 16px;
}

.file-changes-count {
    color: #4FC3F7;
    font-weight: 700;
}

.file-changes-arrow {
    font-size: 12px;
    transition: transform 0.2s;
}

.file-changes-card.collapsed .file-changes-arrow {
    transform: rotate(-90deg);
}

.file-changes-content {
    padding: 16px;
}

.file-changes-card.collapsed .file-changes-content {
    display: none;
}

.file-change-section {
    margin-bottom: 16px;
}

.file-change-section:last-child {
    margin-bottom: 0;
}

.file-change-section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 600;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.file-change-list {
    list-style: none;
    padding: 0;
    margin: 0;
}

.file-change-item {
    padding: 6px 12px;
    margin: 4px 0;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    transition: all 0.2s;
}

.file-change-item:hover {
    background: rgba(79, 195, 247, 0.1);
    transform: translateX(4px);
}

.file-change-item::before {
    content: '•';
    color: #4FC3F7;
    font-weight: bold;
}

.file-change-path {
    color: #4FC3F7;
    font-family: var(--vscode-editor-font-family);
    font-size: 12px;
    font-weight: 500;
}

.command-item {
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.05);
    border-left: 3px solid #4FC3F7;
    border-radius: 4px;
    font-family: var(--vscode-editor-font-family);
    font-size: 12px;
    color: var(--vscode-terminal-ansiGreen);
    margin: 4px 0;
}
```

### JavaScript Function to Add

**Location**: Add after `openFileLink()` function (around line 3006)

```javascript
/**
 * Display file changes in a collapsible card
 */
function displayFileChanges(fileChanges) {
    try {
        if (!fileChanges) return null;

        const { created, modified, deleted, commands } = fileChanges;
        const totalFiles = (created?.length || 0) + (modified?.length || 0) + (deleted?.length || 0);
        const totalCommands = commands?.length || 0;

        if (totalFiles === 0 && totalCommands === 0) {
            return null;  // No changes to display
        }

        let html = "<div class='file-changes-card' onclick='toggleFileChanges(this)'>" +
            "<div class='file-changes-header'>" +
            "<div class='file-changes-title'>" +
            "<span class='file-changes-icon'>📂</span>" +
            "<span>Changes <span class='file-changes-count'>(" + totalFiles + " files";

        if (totalCommands > 0) {
            html += ", " + totalCommands + " command" + (totalCommands !== 1 ? "s" : "") + ")";
        } else {
            html += ")";
        }

        html += "</span></span></div>" +
            "<span class='file-changes-arrow'>▼</span>" +
            "</div>" +
            "<div class='file-changes-content'>";

        // Created files
        if (created && created.length > 0) {
            html += "<div class='file-change-section'>" +
                "<div class='file-change-section-title'>" +
                "✅ Created " + created.length + " file" + (created.length !== 1 ? "s" : "") +
                "</div>" +
                "<ul class='file-change-list'>";

            created.forEach(function(filePath) {
                html += "<li class='file-change-item' onclick='event.stopPropagation(); openFileLink(" + 
                    String.fromCharCode(39) + filePath + String.fromCharCode(39) + ")'>" +
                    "<span class='file-change-path'>" + filePath + "</span>" +
                    "</li>";
            });

            html += "</ul></div>";
        }

        // Modified files
        if (modified && modified.length > 0) {
            html += "<div class='file-change-section'>" +
                "<div class='file-change-section-title'>" +
                "✏️ Modified " + modified.length + " file" + (modified.length !== 1 ? "s" : "") +
                "</div>" +
                "<ul class='file-change-list'>";

            modified.forEach(function(filePath) {
                html += "<li class='file-change-item' onclick='event.stopPropagation(); openFileLink(" + 
                    String.fromCharCode(39) + filePath + String.fromCharCode(39) + ")'>" +
                    "<span class='file-change-path'>" + filePath + "</span>" +
                    "</li>";
            });

            html += "</ul></div>";
        }

        // Deleted files
        if (deleted && deleted.length > 0) {
            html += "<div class='file-change-section'>" +
                "<div class='file-change-section-title'>" +
                "🗑️ Deleted " + deleted.length + " file" + (deleted.length !== 1 ? "s" : "") +
                "</div>" +
                "<ul class='file-change-list'>";

            deleted.forEach(function(filePath) {
                html += "<li class='file-change-item'>" +
                    "<span class='file-change-path'>" + filePath + "</span>" +
                    "</li>";
            });

            html += "</ul></div>";
        }

        // Commands
        if (commands && commands.length > 0) {
            html += "<div class='file-change-section'>" +
                "<div class='file-change-section-title'>" +
                "⚡ Ran " + commands.length + " command" + (commands.length !== 1 ? "s" : "") +
                "</div>";

            commands.forEach(function(command) {
                html += "<div class='command-item'>$ " + command + "</div>";
            });

            html += "</div>";
        }

        html += "</div></div>";

        return html;
    } catch (e) {
        console.error("[displayFileChanges error]", e);
        return null;
    }
}

/**
 * Toggle file changes card collapse/expand
 */
function toggleFileChanges(element) {
    try {
        if (event && event.target.classList.contains('file-change-item')) {
            return;  // Don't toggle if clicking on a file item
        }
        
        element.classList.toggle('collapsed');
    } catch (e) {
        console.error("[toggleFileChanges error]", e);
    }
}
```

### Update `formatMessageContent()` Function

**Location**: Find `formatMessageContent()` function (around line 3003)

Add file changes rendering **BEFORE** the return statement:

```javascript
function formatMessageContent(text, fileChanges) {
    if (!text) return "";
    
    // ... existing formatting code ...
    
    // NEW: Add file changes card if provided
    if (fileChanges) {
        const fileChangesHtml = displayFileChanges(fileChanges);
        if (fileChangesHtml) {
            formatted = fileChangesHtml + formatted;
        }
    }
    
    return formatted;
}
```

### Update `addMessageToUI()` Function

**Location**: Find `addMessageToUI()` function (around line 3050)

Modify to pass file_changes:

```javascript
function addMessageToUI(message) {
    const hadTypingIndicator = !!typingElement;
    if (hadTypingIndicator) hideTypingIndicator();

    const messageDiv = document.createElement("div");
    messageDiv.className = "message message-" + message.role;

    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";
    
    // NEW: Pass file_changes to formatMessageContent
    contentDiv.innerHTML = formatMessageContent(
        message.content, 
        message.file_changes  // NEW parameter
    );
    
    messageDiv.appendChild(contentDiv);
    
    // ... rest of existing code ...
}
```

---

## Part 3: Backend Integration

### Update Message Handler to Store file_changes

**Location**: Find message processing in `_handleSendMessage()` (around line 600)

```javascript
// After receiving response from backend
if (responseData && responseData.message) {
    const { response, tool_calls, todos, todo_stats, file_changes } = responseData.message;

    // Add AI response to UI WITH file_changes
    if (this._view) {
        this._view.webview.postMessage({
            type: 'addMessage',
            message: {
                role: 'assistant',
                content: response,
                file_changes: file_changes  // NEW: Pass file changes
            }
        });
    }

    // ... rest of processing ...
}
```

---

## Testing Checklist

### TODO Panel Tests
- [ ] TODOs appear when AI responds with numbered list
- [ ] Click checkbox → status updates on backend
- [ ] Reload VS Code → TODOs persist
- [ ] Click "Sync" → refreshes from server
- [ ] Click "Clear" → removes all TODOs
- [ ] Stats show correct counts (3/5)

### File Changes Tests
- [ ] File changes card appears after file operations
- [ ] Card shows correct counts (5 files, 2 commands)
- [ ] Click header → expands/collapses card
- [ ] Click file path → opens file in editor
- [ ] Commands display with $ prefix
- [ ] Different sections for created/modified/deleted
- [ ] Arrow rotates on collapse

---

## Summary of Changes

### New CSS Classes (12)
- `.file-changes-card` - Container
- `.file-changes-header` - Header bar
- `.file-changes-title` - Title text
- `.file-changes-icon` - Emoji icon
- `.file-changes-count` - Count badge
- `.file-changes-arrow` - Collapse arrow
- `.file-changes-content` - Content section
- `.file-change-section` - Section container
- `.file-change-section-title` - Section title
- `.file-change-list` - File list
- `.file-change-item` - Individual file item
- `.command-item` - Command display

### New JavaScript Functions (4)
- `displayFileChanges(fileChanges)` - Render file changes card
- `toggleFileChanges(element)` - Handle collapse/expand
- `_syncTodosWithBackend()` - Sync TODOs from server
- `_toggleTodo(todoId)` - Toggle TODO status
- `_clearTodos()` - Clear all TODOs

### Modified Functions (3)
- `formatMessageContent()` - Accept fileChanges parameter
- `addMessageToUI()` - Pass file_changes to formatter
- `_handleSendMessage()` - Process todos and file_changes from response

---

## Implementation Order

1. ✅ Add TODO sync methods (`_syncTodosWithBackend`, etc.)
2. ✅ Add message handlers for TODO actions
3. ✅ Update message send to process TODOs
4. ✅ Add CSS for file changes card
5. ✅ Add `displayFileChanges()` function
6. ✅ Add `toggleFileChanges()` function
7. ✅ Update `formatMessageContent()` to accept file_changes
8. ✅ Update `addMessageToUI()` to pass file_changes
9. ✅ Update backend response handling to extract file_changes
10. ✅ Build and test

---

## Next Steps

After you implement the backend (BACKEND_TODO_FILE_TRACKING.md):
1. I'll implement all frontend changes above
2. Build new VSIX (v2.0.2)
3. You install and test
4. Both features will work together!

**Estimated frontend implementation time: 1-2 hours**
