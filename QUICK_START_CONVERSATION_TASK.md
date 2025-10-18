# Quick Start: ConversationTask Integration

## 🚀 5-Minute Integration Guide

This guide shows you how to integrate the new ConversationTask into your existing Oropendola extension.

## Option 1: Minimal Integration (Copy-Paste Ready)

Replace your current `_handleSendMessage` method with this enhanced version:

```javascript
async _handleSendMessage(text, attachments = []) {
    if (!text || !text.trim()) return;

    // Show user message in UI
    this._messages.push({
        role: 'user',
        content: text,
        timestamp: new Date().toISOString()
    });

    if (this._view) {
        this._view.webview.postMessage({
            type: 'addMessage',
            message: { role: 'user', content: text }
        });
        
        this._view.webview.postMessage({ type: 'showTyping' });
    }

    try {
        // Get configuration
        const config = vscode.workspace.getConfiguration('oropendola');
        const apiUrl = config.get('api.url', 'https://oropendola.ai');

        // Create or reuse task
        if (!this._currentTask || this._currentTask.status !== 'running') {
            const ConversationTask = require('../core/ConversationTask');
            
            this._taskCounter = (this._taskCounter || 0) + 1;
            const taskId = `task_${this._taskCounter}_${Date.now()}`;
            
            this._currentTask = new ConversationTask(taskId, {
                apiUrl: apiUrl,
                sessionCookies: this._sessionCookies,
                mode: this._mode,
                providerRef: new WeakRef(this)
            });
            
            // Set up basic event listeners
            this._currentTask.on('taskCompleted', () => {
                if (this._view) {
                    this._view.webview.postMessage({ type: 'hideTyping' });
                }
            });
            
            this._currentTask.on('toolCompleted', (taskId, tool, result) => {
                if (this._view && result.success) {
                    this._view.webview.postMessage({
                        type: 'addMessage',
                        message: {
                            role: 'system',
                            content: `✅ ${tool.action}: ${result.content.substring(0, 200)}...`
                        }
                    });
                }
            });
            
            this._currentTask.on('taskError', (taskId, error) => {
                if (this._view) {
                    this._view.webview.postMessage({
                        type: 'addMessage',
                        message: {
                            role: 'error',
                            content: `Error: ${error.message}`
                        }
                    });
                }
            });
        }
        
        // Run the task (handles everything automatically)
        await this._currentTask.run(text, attachments);
        
    } catch (error) {
        console.error('Chat error:', error);
        
        if (this._view) {
            this._view.webview.postMessage({ type: 'hideTyping' });
            this._view.webview.postMessage({
                type: 'addMessage',
                message: {
                    role: 'error',
                    content: `Error: ${error.message || 'Failed to get AI response. Please try again.'}`
                }
            });
        }
    }
}
```

**That's it!** Your extension now has:
- ✅ Automatic retry with exponential backoff
- ✅ Context window management
- ✅ Multiple tool call support
- ✅ Better error handling

## Option 2: Full Integration with All Events

For production-ready implementation with complete UI feedback:

### Step 1: Update Constructor

```javascript
constructor(context) {
    
    // Add task management
    this._currentTask = null;
    this._taskHistory = [];
    this._taskCounter = 0;
}
```

### Step 2: Add Event Listener Setup Method

```javascript
_setupTaskEventListeners(task) {
    // Task started
    task.on('taskStarted', (taskId) => {
        console.log(`📋 Task ${taskId} started`);
    });

    // Task completed
    task.on('taskCompleted', (taskId) => {
        console.log(`✅ Task ${taskId} completed`);
        if (this._view) {
            this._view.webview.postMessage({ type: 'hideTyping' });
        }
        this._taskHistory.push(task.getSummary());
    });

    // Task retrying
    task.on('taskRetrying', (taskId, attempt, delay) => {
        console.log(`🔄 Retrying (attempt ${attempt}) after ${delay}ms`);
        if (this._view) {
            this._view.webview.postMessage({
                type: 'addMessage',
                message: {
                    role: 'system',
                    content: `⏳ Network issue detected. Retrying in ${delay / 1000}s...`
                }
            });
        }
    });

    // Tools executing
    task.on('toolsExecuting', (taskId, count) => {
        console.log(`🔧 Executing ${count} tool(s)`);
    });

    // Tool completed
    task.on('toolCompleted', (taskId, tool, result) => {
        console.log(`✅ Tool ${tool.action} completed`);
        if (this._view && result.success) {
            this._view.webview.postMessage({
                type: 'addMessage',
                message: {
                    role: 'system',
                    content: `✅ ${tool.action}: ${result.content.substring(0, 200)}${result.content.length > 200 ? '...' : ''}`
                }
            });
        }
    });

    // Tool error
    task.on('toolError', (taskId, tool, error) => {
        console.error(`❌ Tool ${tool.action} error:`, error);
        if (this._view) {
            this._view.webview.postMessage({
                type: 'addMessage',
                message: {
                    role: 'error',
                    content: `❌ Tool error (${tool.action}): ${error.message}`
                }
            });
        }
    });

    // Context reduced
    task.on('contextReduced', (taskId, removed, kept) => {
        console.log(`📉 Context reduced: removed ${removed}, kept ${kept}`);
        if (this._view) {
            this._view.webview.postMessage({
                type: 'addMessage',
                message: {
                    role: 'system',
                    content: `⚠️ Context window limit approaching. Kept ${kept} most recent messages.`
                }
            });
        }
    });

    // Rate limited
    task.on('rateLimited', (taskId, delay) => {
        console.log(`⏳ Rate limited, waiting ${delay}ms`);
        if (this._view) {
            this._view.webview.postMessage({
                type: 'addMessage',
                message: {
                    role: 'system',
                    content: `⏳ Rate limit reached. Waiting ${delay / 1000}s before retrying...`
                }
            });
        }
    });

    // Task error
    task.on('taskError', (taskId, error) => {
        console.error(`❌ Task ${taskId} error:`, error);
        if (this._view) {
            this._view.webview.postMessage({
                type: 'addMessage',
                message: {
                    role: 'error',
                    content: `Error: ${error.message}`
                }
            });
        }
    });
}
```

### Step 3: Update _handleSendMessage

```javascript
async _handleSendMessage(text, attachments = []) {
    if (!text || !text.trim()) return;

    // Add to history
    this._messages.push({
        role: 'user',
        content: text,
        timestamp: new Date().toISOString()
    });

    // Show in UI
    if (this._view) {
        this._view.webview.postMessage({
            type: 'addMessage',
            message: { role: 'user', content: text }
        });
        this._view.webview.postMessage({ type: 'showTyping' });
    }

    try {
        const config = vscode.workspace.getConfiguration('oropendola');
        const apiUrl = config.get('api.url', 'https://oropendola.ai');

        // Validate session
        if (!this._sessionCookies) {
            throw new Error('Session expired. Please sign in again.');
        }

        // Create new task if needed
        if (!this._currentTask || this._currentTask.status !== 'running') {
            const ConversationTask = require('../core/ConversationTask');
            
            this._taskCounter = (this._taskCounter || 0) + 1;
            const taskId = `task_${this._taskCounter}_${Date.now()}`;
            
            this._currentTask = new ConversationTask(taskId, {
                apiUrl: apiUrl,
                sessionCookies: this._sessionCookies,
                mode: this._mode,
                providerRef: new WeakRef(this),
                consecutiveMistakeLimit: 3
            });
            
            // Set up all event listeners
            this._setupTaskEventListeners(this._currentTask);
        }
        
        // Run task
        await this._currentTask.run(text, attachments);
        
    } catch (error) {
        console.error('Chat error:', error);
        
        if (this._view) {
            this._view.webview.postMessage({ type: 'hideTyping' });
            this._view.webview.postMessage({
                type: 'addMessage',
                message: {
                    role: 'error',
                    content: `Error: ${error.message || 'Failed to get AI response'}`
                }
            });
        }
    }
}
```

### Step 4: Add Stop Button Support

```javascript
// In your webview message handler
switch (message.type) {
    // ... existing cases ...
    
    case 'stopGeneration':
        console.log('⏹ Stop generation requested');
        if (this._currentTask) {
            this._currentTask.abortTask();
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'addMessage',
                    message: {
                        role: 'system',
                        content: '⏹ Generation stopped by user'
                    }
                });
            }
        }
        break;
}
```

## Testing Your Integration

### Test 1: Basic Functionality
```
1. Open Oropendola sidebar
2. Type: "create hello.js file"
3. Expect: File created successfully
```

### Test 2: Network Retry
```
1. Disconnect network
2. Send message
3. Reconnect network
4. Expect: Auto-retry messages, then success
```

### Test 3: Multiple Tools
```
1. Send: "create 3 files: a.js, b.js, c.js"
2. Expect: All 3 files created with success messages
```

### Test 4: Context Management
```
1. Have a long conversation (20+ messages)
2. Check console for "Context reduced" message
3. Expect: Conversation continues smoothly
```

### Test 5: Abort
```
1. Start a task
2. Click "Stop" button
3. Expect: Task cancelled gracefully
```

## Troubleshooting

### Issue: "Cannot find module '../core/ConversationTask'"
**Solution**: Make sure the path is correct relative to sidebar-provider.js:
```javascript
const ConversationTask = require('../core/ConversationTask');
```

### Issue: Events not firing
**Solution**: Make sure you call `_setupTaskEventListeners` before `task.run()`:
```javascript
this._setupTaskEventListeners(this._currentTask);
await this._currentTask.run(text, attachments);
```

### Issue: Tasks keep creating new instances
**Solution**: Check the status before creating new task:
```javascript
if (!this._currentTask || this._currentTask.status !== 'running') {
    // Create new task
}
```

## Advanced Usage

### Custom Retry Limit
```javascript
new ConversationTask(taskId, {
    // ... other options ...
    maxRetries: 5  // Override default (3)
})
```

### Custom Context Limit
```javascript
const task = new ConversationTask(taskId, options);
task.maxContextTokens = 100000;  // Override default (128000)
```

### Task History
```javascript
// Get summary of completed tasks
console.log('Task history:', this._taskHistory);

// Get current task status
if (this._currentTask) {
    console.log('Current task:', this._currentTask.getSummary());
}
```

## What You Get

✅ **Automatic retry** on network failures  
✅ **Exponential backoff** (1s, 2s, 4s, 8s...)  
✅ **Context management** (auto-reduces when full)  
✅ **Multiple tool calls** (execute all in one response)  
✅ **Better error messages** (clear status updates)  
✅ **Abort control** (user can cancel tasks)  
✅ **Event tracking** (know what's happening)

## Next Steps

1. **Test locally** - Try the basic integration first
2. **Add UI polish** - Show retry/rate-limit messages
3. **Package** - Create new VSIX with enhancements
4. **Deploy** - Ship to users!

---

**Need Help?**
- Check console logs (ConversationTask logs everything)
- Review event flow (all events are logged)
- Check task status with `task.getSummary()`

**Ready to ship!** 🚀
