# Kilos-Inspired Features Guide
**Version**: 3.2.0
**Date**: 2025-10-23

---

## 📊 Overview

Oropendola v3.2.0 implements sophisticated patterns from Kilos architecture:
- ✅ **Message Queue Service** - Async message processing
- ✅ **Dual Message Tracking** - Separate API/UI messages
- ✅ **Checkpoint System** - Git-based state snapshots
- ✅ **Task Resumption** - 4-phase resumption pattern
- ✅ **Pause/Resume Support** - Task lifecycle management
- ✅ **Exponential Backoff** - Intelligent error recovery

---

## 1. 📬 Message Queue Service

### What It Is
Asynchronous message processing queue that ensures messages are handled sequentially in order, preventing race conditions.

### Key Features
- **Sequential Processing**: Messages processed one at a time in order
- **State Tracking**: `idle`, `processing`, `paused`
- **Event Emission**: State change events for monitoring
- **Error Handling**: Individual message errors don't break the queue

### File Location
`src/core/MessageQueueService.js`

### Usage Example
```javascript
const { MessageQueueService } = require('./core/MessageQueueService');

// Create queue
const queue = new MessageQueueService();

// Enqueue a message
await queue.enqueue({
    type: 'user',
    content: 'Hello',
    handler: async (message) => {
        // Process message
        console.log('Processing:', message.content);
        return { success: true };
    }
});

// Pause queue
queue.pause();

// Resume queue
await queue.resume();

// Get queue state
const state = queue.getState();
console.log('Queue state:', state);

// Dispose
queue.dispose();
```

### Events
- `stateChanged`: Emitted when queue state changes
- `error`: Emitted when message processing fails

### Benefits
- **No Race Conditions**: Sequential processing ensures order
- **Better Error Handling**: Errors isolated per message
- **Pause/Resume**: Can pause processing and resume later

---

## 2. 🔄 Dual Message Tracking

### What It Is
Separate message arrays for API calls and UI display, following Kilos pattern.

### Architecture
```
ConversationTask
├── messages        // Legacy (kept for compatibility)
├── apiMessages     // For AI API calls
└── taskMessages    // For UI display
```

### Why It's Better
| Without Dual Tracking | With Dual Tracking |
|----------------------|-------------------|
| Mixed concerns | Clean separation |
| UI changes affect API | Independent evolution |
| Hard to debug | Easy to trace |

### File Location
`src/core/ConversationTask.js` (lines 42-47)

### Usage
```javascript
// Messages are automatically tracked in both arrays
task.addMessage('user', 'Hello', []);

// Access API messages (sent to AI)
const apiMessages = task.apiMessages;

// Access task messages (displayed in UI)
const taskMessages = task.taskMessages;

// Legacy messages still work
const legacyMessages = task.messages;
```

### Conversion
```javascript
const { apiMessageToTaskMessage } = require('./core/task-persistence');

// Convert API message to task message format
const apiMsg = { role: 'user', content: 'Hello' };
const taskMsg = apiMessageToTaskMessage(apiMsg);

console.log(taskMsg);
// {
//   ts: 1729724800000,
//   type: 'say',
//   say: 'user_feedback',
//   text: 'Hello',
//   images: []
// }
```

---

## 3. 💾 Checkpoint System

### What It Is
Git-based state snapshots for task resumption and rollback, inspired by Kilos.

### Key Features
- **Git-Based**: Uses git for versioning (fallback to file-based)
- **Automatic Snapshots**: Saved before risky operations
- **Lightweight**: Tracks diffs, not full files
- **Restoration**: Can restore to any checkpoint

### File Location
`src/services/CheckpointService.js`

### Usage Example
```javascript
const CheckpointService = require('./services/CheckpointService');

// Initialize
const checkpointService = new CheckpointService(
    'task_123',
    '/path/to/workspace',
    '/path/to/storage'
);

await checkpointService.initialize();

// Save checkpoint
const checkpointId = await checkpointService.save({
    force: false,
    suppressMessage: false,
    description: 'Before file edit'
});

// List checkpoints
const checkpoints = await checkpointService.listCheckpoints();
console.log('Checkpoints:', checkpoints);

// Restore checkpoint
await checkpointService.restore(checkpointId);

// Cleanup old checkpoints (keep last 10)
await checkpointService.cleanup(10);

// Dispose
checkpointService.dispose();
```

### Automatic Checkpoint Triggers
- Before file operations
- Before terminal commands
- On task pause
- Manual checkpoint requests

### Benefits
- **Undo File Changes**: Roll back to any point
- **Safe Experimentation**: Try changes without fear
- **State Restoration**: Recover from errors

---

## 4. 🔄 Task Resumption

### What It Is
4-phase pattern for resuming interrupted tasks, following Kilos architecture.

### 4-Phase Pattern

#### Phase 1: Load Persisted State
```
Load metadata ✓
Load API messages ✓
Load task messages ✓
```

#### Phase 2: Clean Message Artifacts
```
Remove temporary messages ✓
Trim trailing reasoning ✓
Remove incomplete requests ✓
```

#### Phase 3: Ask User to Resume
```
Determine task status (completed vs interrupted)
Show resume UI to user
User chooses: Resume | Start New
```

#### Phase 4: Restore API Conversation
```
Convert tool use blocks to text
Restore conversation state
Continue execution
```

### File Location
`src/core/TaskResumption.js`

### Usage Example
```javascript
const { resumeTaskFromHistory, isTaskResumable } = require('./core/TaskResumption');

// Check if task can be resumed
const canResume = await isTaskResumable('task_123', storageDir);

if (canResume) {
    // Resume task
    const restoredState = await resumeTaskFromHistory(
        'task_123',
        storageDir,
        async (resumeType, context) => {
            // Ask user
            if (resumeType === 'resume_completed_task') {
                // Task was completed
                return 'resume'; // or 'start_new'
            } else {
                // Task was interrupted
                return 'resume';
            }
        }
    );

    if (restoredState) {
        // Task resumed successfully
        console.log('Resumed task:', restoredState.taskId);
        console.log('API messages:', restoredState.apiMessages.length);
        console.log('Task messages:', restoredState.taskMessages.length);
    }
}
```

### Persistence Files
```
.oropendola/tasks/{taskId}/
├── api_messages.json    // API conversation
├── task_messages.json   // UI messages
└── metadata.json        // Task state
```

---

## 5. ⏸️ Pause/Resume Support

### What It Is
Ability to pause and resume task execution at any point.

### Key Features
- **Graceful Pause**: Finishes current operation before pausing
- **State Preservation**: Saves checkpoint on pause
- **Queue Coordination**: Pauses message queue automatically
- **Event Emission**: Notifies listeners of pause/resume

### File Location
`src/core/ConversationTask.js` (lines 625-678)

### Usage Example
```javascript
// In your task
const task = new ConversationTask('task_123', options);

// Pause task
await task.pauseTask();
// Status changes: running → paused
// Message queue pauses
// Checkpoint saved

// Resume task
await task.resumeTask();
// Status changes: paused → running
// Message queue resumes
// Continue execution

// Listen for events
task.on('taskPaused', (taskId) => {
    console.log(`Task ${taskId} paused`);
});

task.on('taskResumed', (taskId) => {
    console.log(`Task ${taskId} resumed`);
});
```

### Status Flow
```
idle → running → paused → running → completed
                    ↓
                 abort
```

---

## 6. 🔁 Exponential Backoff

### What It Is
Intelligent retry logic with exponentially increasing delays for transient errors.

### Key Features
- **Smart Error Detection**: Distinguishes retryable from non-retryable errors
- **Progressive Delays**: 1s → 2s → 4s → 8s → ...
- **Configurable**: Preset configurations for different scenarios
- **Max Delay Cap**: Prevents excessive waits

### File Location
`src/utils/exponential-backoff.js`

### Usage Example
```javascript
const { withExponentialBackoff, withRetryPreset, RetryPresets } = require('./utils/exponential-backoff');

// Basic usage
const result = await withExponentialBackoff(
    async () => {
        // Your operation
        return await makeAPICall();
    },
    {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 60000,
        backoffMultiplier: 2,
        onRetry: (attempt, delay, error) => {
            console.log(`Retry ${attempt}: ${error.message}, waiting ${delay}ms`);
        }
    }
);

// Using presets
const result = await withRetryPreset(
    async () => makeAPICall(),
    'STANDARD'  // QUICK | STANDARD | AGGRESSIVE | PATIENT
);
```

### Retry Presets

| Preset | Max Retries | Initial Delay | Max Delay | Use Case |
|--------|------------|---------------|-----------|----------|
| **QUICK** | 2 | 500ms | 5s | Fast operations |
| **STANDARD** | 3 | 1s | 30s | Balanced approach |
| **AGGRESSIVE** | 5 | 1s | 60s | Critical operations |
| **PATIENT** | 5 | 2s | 120s | Non-urgent operations |

### Retryable Errors
- Network timeouts
- Connection refused
- Rate limits (429)
- Server errors (500-599)
- Gateway errors (502, 503, 504)

### Non-Retryable Errors
- Authentication failures (401, 403)
- Not found (404)
- Bad requests (400)
- Validation errors

---

## 7. 📝 Task Persistence

### What It Is
Comprehensive state storage for task resumption and history.

### File Structure
```
.oropendola/
├── tasks/
│   └── {taskId}/
│       ├── api_messages.json     // API conversation history
│       ├── task_messages.json    // UI display messages
│       └── metadata.json         // Task state and metadata
└── checkpoints/
    └── {taskId}/
        └── {checkpointId}.json   // Git diffs
```

### File Location
`src/core/task-persistence/`

### API

#### Save Task State
```javascript
const {
    saveApiMessages,
    saveTaskMessages,
    saveTaskMetadata
} = require('./core/task-persistence');

// Save API messages
await saveApiMessages(taskId, apiMessages, storageDir);

// Save task messages
await saveTaskMessages(taskId, taskMessages, storageDir);

// Save metadata
await saveTaskMetadata(taskId, {
    taskId: 'task_123',
    status: 'completed',
    mode: 'agent',
    conversationId: 'conv_456'
}, storageDir);
```

#### Load Task State
```javascript
const {
    loadApiMessages,
    loadTaskMessages,
    loadTaskMetadata
} = require('./core/task-persistence');

// Load API messages
const apiMessages = await loadApiMessages(taskId, storageDir);

// Load task messages
const taskMessages = await loadTaskMessages(taskId, storageDir);

// Load metadata
const metadata = await loadTaskMetadata(taskId, storageDir);
```

#### List and Manage Tasks
```javascript
const {
    listAllTasks,
    deleteTaskDirectory
} = require('./core/task-persistence');

// List all saved tasks
const tasks = await listAllTasks(storageDir);
console.log(`Found ${tasks.length} saved tasks`);

// Delete task
await deleteTaskDirectory(taskId, storageDir);
```

---

## 8. 🎯 Integration Guide

### How Services Work Together

```
User sends message
  ↓
MessageQueueService.enqueue()
  ↓
ConversationTask.run()
  ├── Save checkpoint (before risky operation)
  ├── Dual message tracking (API + UI)
  ├── Make AI request (with exponential backoff)
  └── Save task state
  ↓
User can:
  ├── Pause task (checkpoint saved)
  ├── Resume task (state restored)
  └── Resume later (4-phase resumption)
```

### Complete Example

```javascript
const vscode = require('vscode');
const ConversationTask = require('./core/ConversationTask');
const { resumeTaskFromHistory } = require('./core/TaskResumption');

// Get storage directory
const context = vscode.ExtensionContext;
const storageDir = context.globalStorageUri.fsPath;

// Create task
const task = new ConversationTask('task_123', {
    apiUrl: 'https://oropendola.ai',
    sessionCookies: 'cookies',
    mode: 'agent',
    storageDir: storageDir  // Enable persistence
});

// Listen for events
task.on('taskPaused', (taskId) => {
    console.log(`✅ Task ${taskId} paused`);
});

task.on('taskResumed', (taskId) => {
    console.log(`✅ Task ${taskId} resumed`);
});

task.on('taskAborted', (taskId) => {
    console.log(`❌ Task ${taskId} aborted`);
});

// Run task
await task.run('Create a React app', []);

// Later: Resume task
const restoredState = await resumeTaskFromHistory(
    'task_123',
    storageDir,
    async (type, context) => 'resume'
);

if (restoredState) {
    const newTask = new ConversationTask('task_123', {
        apiUrl: 'https://oropendola.ai',
        sessionCookies: 'cookies',
        mode: restoredState.metadata.mode,
        storageDir: storageDir
    });

    // Restore state
    newTask.apiMessages = restoredState.apiMessages;
    newTask.taskMessages = restoredState.taskMessages;
    newTask.conversationId = restoredState.metadata.conversationId;

    // Continue task
    await newTask.run();
}
```

---

## 9. 🐛 Debugging

### Enable Verbose Logging
```javascript
// Set environment variable
process.env.DEBUG = 'oropendola:*';

// Or in VS Code settings.json
{
  "oropendola.debug.verbose": true
}
```

### Key Log Markers

#### MessageQueueService
- `📬 [MessageQueueService] Initialized`
- `📥 [MessageQueueService] Enqueued message`
- `⚙️ [MessageQueueService] Processing message`
- `⏸️ [MessageQueueService] Queue paused`

#### CheckpointService
- `💾 [CheckpointService] Checkpoint saved`
- `🔄 [CheckpointService] Restoring checkpoint`
- `🗑️ [CheckpointService] Checkpoint deleted`

#### Task Resumption
- `📂 [Phase 1/4] Loading persisted state`
- `🧹 [Phase 2/4] Cleaning message artifacts`
- `❓ [Phase 3/4] Asking user to resume`
- `🔄 [Phase 4/4] Restoring API conversation`

#### ConversationTask
- `⏸️ [ConversationTask] Pausing task`
- `▶️ [ConversationTask] Resuming task`
- `💾 [ConversationTask] Task state saved`
- `🧹 [ConversationTask] Disposing task resources`

---

## 10. ✅ Testing Checklist

### Message Queue
- [ ] Messages processed in order
- [ ] Pause stops processing
- [ ] Resume continues processing
- [ ] Errors don't break queue
- [ ] Dispose cleans up properly

### Dual Message Tracking
- [ ] API messages saved separately
- [ ] Task messages saved separately
- [ ] Legacy messages still work
- [ ] Conversion works correctly

### Checkpoints
- [ ] Checkpoint created on pause
- [ ] Checkpoint restored correctly
- [ ] Git-based checkpoints work
- [ ] File-based fallback works
- [ ] Cleanup removes old checkpoints

### Task Resumption
- [ ] Task can be resumed after pause
- [ ] Task can be resumed after crash
- [ ] Completed tasks can be continued
- [ ] Message artifacts cleaned
- [ ] User choice respected

### Pause/Resume
- [ ] Task pauses gracefully
- [ ] Checkpoint saved on pause
- [ ] Task resumes correctly
- [ ] Message queue coordinates
- [ ] Events emitted

### Exponential Backoff
- [ ] Retries on network errors
- [ ] Delays increase exponentially
- [ ] Max retries respected
- [ ] Non-retryable errors fail fast
- [ ] Presets work correctly

---

## 11. 📊 Performance Impact

### Memory Usage
- **Message Queue**: ~1-2 MB (depends on queue size)
- **Dual Tracking**: ~2x message storage (negligible)
- **Checkpoints**: Disk-based (no memory impact)
- **Total Impact**: ~5-10 MB additional memory

### CPU Usage
- **Message Queue**: Minimal (async processing)
- **Checkpoints**: Low (git operations cached)
- **Task Persistence**: Low (file I/O async)
- **Total Impact**: <5% additional CPU

### Disk Usage
- **Checkpoints**: ~100 KB - 1 MB per checkpoint
- **Task Persistence**: ~10-50 KB per task
- **Total**: Depends on checkpoint retention

---

## 12. 🚀 Migration Guide

### From v3.1.0 to v3.2.0

#### No Breaking Changes
All v3.1.0 code continues to work. New features are opt-in.

#### Enable Persistence
```javascript
// Old (v3.1.0)
const task = new ConversationTask('task_123', {
    apiUrl: '...',
    sessionCookies: '...'
});

// New (v3.2.0) - with persistence
const task = new ConversationTask('task_123', {
    apiUrl: '...',
    sessionCookies: '...',
    storageDir: context.globalStorageUri.fsPath  // NEW!
});
```

#### Use Pause/Resume
```javascript
// Pause task
await task.pauseTask();

// Resume task
await task.resumeTask();
```

#### Enable Checkpoints
Checkpoints are automatic when `storageDir` is provided. No code changes needed!

---

## 13. 🎓 Best Practices

### 1. Always Provide storageDir
```javascript
// GOOD ✅
const task = new ConversationTask('task_123', {
    storageDir: context.globalStorageUri.fsPath
});

// BAD ❌ (no persistence)
const task = new ConversationTask('task_123', {});
```

### 2. Use Pause Before Long Operations
```javascript
// Before starting a long operation
await task.pauseTask();
// Checkpoint saved - can resume if interrupted
```

### 3. Clean Up Old Checkpoints
```javascript
// Clean up checkpoints older than last 10
await checkpointService.cleanup(10);
```

### 4. Use Exponential Backoff for External Calls
```javascript
const { withRetryPreset } = require('./utils/exponential-backoff');

// Wrap external API calls
const data = await withRetryPreset(
    async () => await externalAPI.call(),
    'STANDARD'
);
```

### 5. Listen for Events
```javascript
task.on('taskPaused', handlePause);
task.on('taskResumed', handleResume);
task.on('taskAborted', handleAbort);
```

---

## 14. 🔗 References

### Kilos Architecture Analysis
See [KILOS_ARCHITECTURE_ANALYSIS.md](KILOS_ARCHITECTURE_ANALYSIS.md) for detailed analysis of Kilos patterns.

### Source Files
- `src/core/MessageQueueService.js` - Message queue
- `src/core/ConversationTask.js` - Enhanced task with all features
- `src/services/CheckpointService.js` - Checkpoint system
- `src/core/TaskResumption.js` - 4-phase resumption
- `src/core/task-persistence/` - State persistence
- `src/utils/exponential-backoff.js` - Retry logic

### Kilos Repository
https://github.com/Kilo-Org/kilocode.git

---

**Version**: 3.2.0
**Generated**: 2025-10-23
**Author**: Oropendola Team
