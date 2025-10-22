# Quick Start Guide 🚀
## Using the New API Integration

This guide shows you how to quickly integrate the new backend APIs into your VS Code extension.

---

## 📦 Installation

All files are already in place! Just import and use:

```javascript
// Import APIs
const { ChatAPI, WorkspaceAPI, GitAPI } = require('./src/api');

// Import services
const { contextService, enhancedChatHandler } = require('./src/services');

// Import providers
const { AIInlineCompletionProvider } = require('./src/providers/inlineProvider');
```

---

## 🎯 Common Use Cases

### 1. Send a Chat Message with Context

**The Easy Way** (Recommended):

```javascript
const { enhancedChatHandler } = require('./src/services/enhancedChatHandler');

async function sendMessage() {
  // Automatically includes workspace + git context
  const response = await enhancedChatHandler.sendMessage(
    'Create a hello world app',
    'agent' // or 'chat'
  );
  
  console.log('✅ AI Response:', response.content);
  console.log('✅ TODOs:', response.todos);
  console.log('✅ Files changed:', response.file_changes);
}
```

**The Manual Way** (Full Control):

```javascript
const { ChatAPI } = require('./src/api');
const { contextService } = require('./src/services');

async function sendMessage() {
  // 1. Get context
  const context = await contextService.getEnrichedContext(true, true);
  
  // 2. Send message
  const response = await ChatAPI.chatCompletion(
    [{ role: 'user', content: 'Hello' }],
    null, // conversation ID
    'agent', // mode
    context
  );
  
  console.log('✅ Response:', response);
}
```

---

### 2. Get Workspace Information

```javascript
const { WorkspaceAPI } = require('./src/api');
const vscode = require('vscode');

async function getWorkspaceInfo() {
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  
  const response = await WorkspaceAPI.getWorkspaceContext(workspacePath);
  
  if (response.success) {
    console.log('📁 Total files:', response.data.workspace.file_count.total);
    console.log('💬 Languages:', response.data.workspace.languages);
    console.log('📦 Framework:', response.data.workspace.framework);
  }
}
```

---

### 3. Get Git Status

```javascript
const { GitAPI } = require('./src/api');

async function getGitStatus() {
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  
  const response = await GitAPI.getGitStatus(workspacePath);
  
  if (response.success) {
    console.log('🌿 Branch:', response.data.branch);
    console.log('📝 Uncommitted files:', response.data.uncommitted_changes.length);
    console.log('💡 Is dirty:', response.data.diff_stats.is_dirty);
  }
}
```

---

### 4. Generate AI Commit Message

```javascript
const { GitAPI } = require('./src/api');

async function generateCommit() {
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  
  const response = await GitAPI.generateCommitMessage(workspacePath);
  
  if (response.success) {
    console.log('✨ Suggested commit message:');
    console.log(response.data.message);
    
    // Show to user
    vscode.window.showInformationMessage(
      `Suggested: ${response.data.message}`,
      'Copy'
    ).then(selection => {
      if (selection === 'Copy') {
        vscode.env.clipboard.writeText(response.data.message);
      }
    });
  }
}
```

---

### 5. Enable Inline Completions

**In your extension.js:**

```javascript
const vscode = require('vscode');
const { AIInlineCompletionProvider } = require('./src/providers/inlineProvider');

function activate(context) {
  // Register inline completion provider
  const inlineProvider = new AIInlineCompletionProvider();
  
  const disposable = vscode.languages.registerInlineCompletionItemProvider(
    { pattern: '**' }, // All files
    inlineProvider
  );
  
  context.subscriptions.push(disposable);
  
  console.log('✅ Inline completions enabled!');
}

module.exports = { activate };
```

---

### 6. Add Context Refresh Command

```javascript
const vscode = require('vscode');
const { contextService } = require('./src/services');

function activate(context) {
  // Command: Refresh Context
  const refreshCommand = vscode.commands.registerCommand(
    'oropendola.refreshContext',
    async () => {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Refreshing context...',
          cancellable: false
        },
        async () => {
          await contextService.forceRefresh();
        }
      );
      
      vscode.window.showInformationMessage('✅ Context refreshed!');
    }
  );
  
  context.subscriptions.push(refreshCommand);
}
```

---

### 7. Update Sidebar to Use New APIs

**In your sidebar-provider.js:**

```javascript
const { enhancedChatHandler } = require('../services/enhancedChatHandler');

class OropendolaSidebarProvider {
  async _handleSendMessage(message, attachments) {
    try {
      // Show thinking indicator
      this._view.webview.postMessage({
        type: 'thinking',
        value: true
      });
      
      // Send message with context
      const response = await enhancedChatHandler.sendMessage(
        message,
        this._mode, // 'agent' or 'chat'
        true, // include workspace
        true  // include git
      );
      
      // Display response
      if (response.success) {
        this._view.webview.postMessage({
          type: 'addMessage',
          message: {
            role: 'assistant',
            content: response.content,
            file_changes: response.file_changes
          }
        });
        
        // Update TODOs
        if (response.todos.length > 0) {
          this._view.webview.postMessage({
            type: 'updateTodos',
            todos: response.todos,
            stats: response.todos_stats
          });
        }
        
        // Show file changes notification
        if (response.file_changes.created.length > 0) {
          vscode.window.showInformationMessage(
            `✅ Created ${response.file_changes.created.length} file(s)`
          );
        }
      } else {
        // Show error
        this._view.webview.postMessage({
          type: 'error',
          message: response.error || 'Failed to get response'
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
      this._view.webview.postMessage({
        type: 'error',
        message: error.message
      });
    } finally {
      // Hide thinking indicator
      this._view.webview.postMessage({
        type: 'thinking',
        value: false
      });
    }
  }
}
```

---

## 🔧 Configuration

Add these settings to your `package.json`:

```json
{
  "contributes": {
    "configuration": {
      "title": "Oropendola",
      "properties": {
        "oropendola.backendUrl": {
          "type": "string",
          "default": "http://localhost:8000",
          "description": "Backend API URL"
        },
        "oropendola.apiTimeout": {
          "type": "number",
          "default": 30000,
          "description": "API timeout in milliseconds"
        },
        "oropendola.enableInlineCompletions": {
          "type": "boolean",
          "default": true,
          "description": "Enable inline code completions"
        }
      }
    },
    "commands": [
      {
        "command": "oropendola.refreshContext",
        "title": "Oropendola: Refresh Context"
      },
      {
        "command": "oropendola.clearCache",
        "title": "Oropendola: Clear Cache"
      }
    ]
  }
}
```

---

## 📊 Response Structure

All chat responses follow this structure:

```javascript
{
  success: true,
  content: "AI conversational response...",
  
  // TODOs extracted from response
  todos: [
    {
      id: "todo_1729468234_1",
      text: "Create package.json",
      order: 1,
      completed: false
    }
  ],
  todos_stats: {
    total: 3,
    completed: 0,
    active: 3
  },
  
  // File changes from tool execution
  file_changes: {
    created: [
      { path: "package.json", line_count: 10 }
    ],
    modified: [
      { path: "index.js", lines_added: 5, lines_removed: 2 }
    ],
    deleted: [],
    commands: [
      { command: "npm install", output: "success", exit_code: 0 }
    ]
  },
  
  // Tool execution details
  tool_calls: [...],
  tool_results: [...]
}
```

---

## 🎯 Best Practices

### 1. Always Check Response Success

```javascript
const response = await ChatAPI.chatCompletion(...);

if (response.success) {
  // Handle success
  console.log(response.content);
} else {
  // Handle error
  console.error(response.error);
}
```

### 2. Use Context Service for Caching

```javascript
// ✅ Good - Uses cache
const context = await contextService.getEnrichedContext(true, true);

// ❌ Bad - Makes API call every time
const response = await WorkspaceAPI.getWorkspaceContext(...);
```

### 3. Use Enhanced Chat Handler

```javascript
// ✅ Good - Automatic context handling
const response = await enhancedChatHandler.sendMessage(...);

// ⚠️ Advanced - Manual context management
const context = await contextService.getEnrichedContext(...);
const response = await ChatAPI.chatCompletion(..., context);
```

---

## 🧪 Quick Test

Run this to test your integration:

```javascript
const { enhancedChatHandler } = require('./src/services/enhancedChatHandler');

async function quickTest() {
  console.log('🧪 Testing API integration...');
  
  try {
    const response = await enhancedChatHandler.sendMessage(
      'Hello, can you hear me?',
      'chat',
      false,
      false
    );
    
    if (response.success) {
      console.log('✅ SUCCESS! Response:', response.content);
    } else {
      console.log('❌ FAILED:', response.error);
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
}

quickTest();
```

---

## 🆘 Common Issues

### Issue: "Module not found"
```bash
# Make sure all files exist
ls -la src/api/
ls -la src/services/
ls -la src/providers/
```

### Issue: "Backend connection failed"
```javascript
// Check configuration
const config = vscode.workspace.getConfiguration('oropendola');
console.log('Backend URL:', config.get('backendUrl'));

// Test manually
const axios = require('axios');
axios.get('http://localhost:8000/api/method/ping')
  .then(() => console.log('✅ Backend reachable'))
  .catch(() => console.log('❌ Backend unreachable'));
```

### Issue: "Context not loading"
```javascript
// Check workspace
const workspaceFolders = vscode.workspace.workspaceFolders;
console.log('Workspace:', workspaceFolders?.[0]?.uri.fsPath);

// Force refresh
await contextService.forceRefresh();
```

---

## 🚀 You're Ready!

You now have:
- ✅ Complete API integration
- ✅ Context management
- ✅ Enhanced chat handler
- ✅ Inline completions
- ✅ Error handling
- ✅ Type safety

**Start coding and enjoy the new features!** 🎉

---

**For More Help:**
- See `FRONTEND_IMPLEMENTATION_COMPLETE.md` for full details
- See `VS_CODE_EXTENSION_INTEGRATION_GUIDE.md` for API reference
- Check individual API files for JSDoc documentation

---

**Last Updated:** October 20, 2025
