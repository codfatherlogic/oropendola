# Kilos Code Architecture Analysis
**Date**: 2025-10-23
**Repository**: https://github.com/Kilo-Org/kilocode.git
**Purpose**: Understand chat window, task resumption patterns, and termination processes

---

## 📊 Executive Summary

Kilos (forked from Cline) implements a **sophisticated task-based conversation system** with:
- ✅ **Event-driven architecture** using EventEmitter
- ✅ **Checkpoint-based state management** for task resumption
- ✅ **Comprehensive resource cleanup** with centralized dispose pattern
- ✅ **Robust message persistence** with separate API/UI message tracking
- ✅ **Pattern-based resumption** with automatic state restoration

---

## 1. 🏗️ Architecture Overview

### Core Components

| Component | File | Purpose |
|-----------|------|---------|
| **Task** | `src/core/task/Task.ts` | Main conversation orchestrator (2000+ lines) |
| **ClineProvider** | `src/core/webview/ClineProvider.ts` | Webview provider & task manager |
| **Message Queue** | `src/core/message-queue/MessageQueueService.ts` | Async message handling |
| **Checkpoints** | `src/core/checkpoints/index.ts` | State save/restore system |
| **Persistence** | `src/core/task-persistence/` | Message & metadata storage |

### Architecture Pattern

```
ClineProvider (Webview Provider)
    ↓
Task (EventEmitter)
    ├── MessageQueueService (Async processing)
    ├── CheckpointService (State management)
    ├── FileContextTracker (File watching)
    ├── BrowserSession (Browser automation)
    ├── TerminalRegistry (Terminal management)
    └── DiffViewProvider (Code editing)
```

---

## 2. 💬 Chat Window Implementation

### Message Types

**Kilos uses dual message tracking:**

```typescript
// src/core/task/Task.ts:267-268
apiConversationHistory: ApiMessage[] = []  // For AI API
clineMessages: ClineMessage[] = []         // For UI display
```

**Message Types:**
```typescript
type ClineMessage = {
  ts: number
  type: "say" | "ask"
  say?: "text" | "user_feedback" | "api_req_started" | "reasoning" | ...
  ask?: "followup" | "command" | "completion_result" | "resume_task" | ...
  text?: string
  images?: string[]
}
```

### Message Flow

```
User Input
  ↓
MessageQueueService (queues message)
  ↓
Task.say() → ClineMessage (UI)
  ↓
Task.makeApiRequest() → ApiMessage (AI)
  ↓
Stream Response → Parse tools → Update UI
  ↓
Task.saveClineMessages() → Persist
  ↓
Task.saveApiMessages() → Persist
```

**Key Files:**
- `src/core/task-persistence/taskMessages.ts` - UI message persistence
- `src/core/task-persistence/apiMessages.ts` - API message persistence
- `src/core/task-persistence/taskMetadata.ts` - Task state metadata

---

## 3. 🔄 Pattern-Based Task Resumption

### Resume Pattern Architecture

**Kilos implements a sophisticated 4-phase resumption pattern:**

#### Phase 1: Load Persisted State

```typescript
// src/core/task/Task.ts:1282-1348
private async resumeTaskFromHistory() {
  // Load saved messages
  const modifiedClineMessages = await this.getSavedClineMessages()

  // Clean up artifacts
  // 1. Remove temporary resume messages
  // 2. Trim reasoning-only messages
  // 3. Remove incomplete API requests

  // Restore conversation state
  this.clineMessages = await this.getSavedClineMessages()
  this.apiConversationHistory = await this.getSavedApiConversationHistory()
}
```

**What gets persisted:**
```typescript
// Task metadata
{
  taskId: string
  instanceId: string
  conversationHistory: ApiMessage[]
  clineMessages: ClineMessage[]
  mode: string
  todoList: TodoItem[]
  toolUsage: ToolUsage
  tokenUsage: TokenUsage
}
```

#### Phase 2: Clean Message Artifacts

```typescript
// Remove resume messages (lines 1309-1317)
const lastRelevantMessageIndex = findLastIndex(
  modifiedClineMessages,
  (m) => !(m.ask === "resume_task" || m.ask === "resume_completed_task")
)
modifiedClineMessages.splice(lastRelevantMessageIndex + 1)

// Remove trailing reasoning messages (lines 1320-1327)
while (modifiedClineMessages.length > 0) {
  const last = modifiedClineMessages[modifiedClineMessages.length - 1]
  if (last.type === "say" && last.say === "reasoning") {
    modifiedClineMessages.pop()
  } else {
    break
  }
}
```

#### Phase 3: Ask User to Resume

```typescript
// Lines 1358-1372
const lastClineMessage = this.clineMessages
  .slice()
  .reverse()
  .find((m) => !(m.ask === "resume_task" || m.ask === "resume_completed_task"))

let askType: ClineAsk
if (lastClineMessage?.ask === "completion_result") {
  askType = "resume_completed_task"  // Task was finished
} else {
  askType = "resume_task"            // Task was in progress
}

const { response, text, images } = await this.ask(askType)
```

**Resume UI:**
- Shows last conversation state
- Displays "Resume Task" or "Resume Completed Task" button
- User can add new messages before resuming
- User can delete messages

#### Phase 4: Restore API Conversation

```typescript
// Lines 1383-1420
let existingApiConversationHistory = await this.getSavedApiConversationHistory()

// Convert tool use blocks to text (legacy support)
const conversationWithoutToolBlocks = existingApiConversationHistory.map((message) => {
  if (Array.isArray(message.content)) {
    const newContent = message.content.map((block) => {
      if (block.type === "tool_use") {
        // Convert to XML format
        return {
          type: "text",
          text: `<${block.name}>\n...\n</${block.name}>`
        }
      }
      return block
    })
    return { ...message, content: newContent }
  }
  return message
})
```

### Checkpoint System

**Checkpoints are automatic snapshots of workspace state:**

```typescript
// src/core/checkpoints/index.ts
export async function checkpointSave(task: Task, force: boolean, suppressMessage: boolean) {
  const service = await getCheckpointService(task)

  if (!service) {
    return
  }

  // Save git-tracked file changes
  const checkpoint = await service.save({
    force,              // Save even if no changes
    suppressMessage     // Don't show "Checkpoint saved" in UI
  })

  return checkpoint
}
```

**Checkpoint triggers:**
- User sends a new message (line 941-944)
- Before file operations
- Before terminal commands
- Manual checkpoint request

**Checkpoint storage:**
- Uses git for versioning
- Stored in `globalStorageDir/.checkpoints/{taskId}/`
- Tracks diffs, not full files
- Can restore to any checkpoint

### Resumable Ask Pattern

```typescript
// src/core/task/Task.ts:223-225
idleAsk?: ClineMessage        // Task waiting for user input
resumableAsk?: ClineMessage   // Task can resume from this point
interactiveAsk?: ClineMessage // Task needs user interaction
```

**Pattern detection:**
```typescript
// From @roo-code/types
export function isResumableAsk(ask: ClineAsk): boolean {
  return [
    "api_req_failed",
    "command_output",
    "completion_result"
  ].includes(ask)
}
```

---

## 4. 🛑 Termination & Cleanup Process

### Termination Architecture

Kilos uses a **2-stage termination pattern**:

#### Stage 1: Abort Task

```typescript
// src/core/task/Task.ts:1552-1576
public async abortTask(isAbandoned = false) {
  // Set flags
  if (isAbandoned) {
    this.abandoned = true  // Task forcefully stopped
  }
  this.abort = true        // Stop all running promises

  // Emit event for listeners
  this.emit(RooCodeEventName.TaskAborted)

  // Call centralized cleanup
  try {
    this.dispose()
  } catch (error) {
    console.error(`Error during disposal:`, error)
    // Don't rethrow - abort must always succeed
  }

  // Save final state
  try {
    await this.saveClineMessages()
  } catch (error) {
    console.error(`Error saving messages:`, error)
  }
}
```

#### Stage 2: Dispose Resources

```typescript
// src/core/task/Task.ts:1578-1660
public dispose(): void {
  console.log(`[Task#dispose] disposing task ${this.taskId}.${this.instanceId}`)

  // 1. Dispose message queue
  try {
    if (this.messageQueueStateChangedHandler) {
      this.messageQueueService.removeListener("stateChanged", this.messageQueueStateChangedHandler)
      this.messageQueueStateChangedHandler = undefined
    }
    this.messageQueueService.dispose()
  } catch (error) {
    console.error("Error disposing message queue:", error)
  }

  // 2. Remove ALL event listeners (prevent memory leaks)
  try {
    this.removeAllListeners()
  } catch (error) {
    console.error("Error removing event listeners:", error)
  }

  // 3. Clear pause interval
  if (this.pauseInterval) {
    clearInterval(this.pauseInterval)
    this.pauseInterval = undefined
  }

  // 4. Unsubscribe from bridge (if using cloud features)
  if (this.enableBridge) {
    BridgeOrchestrator.getInstance()
      ?.unsubscribeFromTask(this.taskId)
      .catch((error) => console.error(`Bridge unsubscribe failed:`, error))
  }

  // 5. Release terminals
  try {
    TerminalRegistry.releaseTerminalsForTask(this.taskId)
  } catch (error) {
    console.error("Error releasing terminals:", error)
  }

  // 6. Close browsers
  try {
    this.urlContentFetcher.closeBrowser()
  } catch (error) {
    console.error("Error closing URL fetcher browser:", error)
  }

  try {
    this.browserSession.closeBrowser()
  } catch (error) {
    console.error("Error closing browser session:", error)
  }

  // 7. Dispose file watchers
  try {
    if (this.rooIgnoreController) {
      this.rooIgnoreController.dispose()
      this.rooIgnoreController = undefined
    }
  } catch (error) {
    console.error("Error disposing RooIgnoreController:", error)
  }

  try {
    this.fileContextTracker.dispose()
  } catch (error) {
    console.error("Error disposing file context tracker:", error)
  }

  // 8. Revert unsaved diff changes
  try {
    if (this.isStreaming && this.diffViewProvider.isEditing) {
      this.diffViewProvider.revertChanges().catch(console.error)
    }
  } catch (error) {
    console.error("Error reverting diff changes:", error)
  }
}
```

### Abort Propagation Pattern

**Abort checking in loops:**
```typescript
// src/core/task/Task.ts:1743
while (!this.abort) {
  // Process messages

  if (this.abort) {
    throw new Error(`task ${this.taskId}.${this.instanceId} aborted`)
  }
}
```

**Abort checking in streams:**
```typescript
// src/core/task/Task.ts:2093-2101
if (this.abort) {
  console.log(`aborting stream, this.abandoned = ${this.abandoned}`)

  if (!this.abandoned) {
    // Graceful abort - save state
    await abortStream("user_cancelled")
  }

  throw new Error("Task aborted")
}
```

### Resource Cleanup Checklist

Kilos cleans up **9 categories of resources**:

| Resource | Cleanup Action | Why Important |
|----------|---------------|---------------|
| **Message Queue** | `.dispose()` + remove listeners | Prevent event leaks |
| **Event Listeners** | `.removeAllListeners()` | Memory leak prevention |
| **Intervals/Timers** | `clearInterval()` | CPU usage |
| **Bridge/Cloud** | `.unsubscribeFromTask()` | Network connections |
| **Terminals** | `.releaseTerminalsForTask()` | Terminal cleanup |
| **Browsers** | `.closeBrowser()` × 2 | Browser processes |
| **File Watchers** | `.dispose()` × 2 | File system handles |
| **Diff Views** | `.revertChanges()` | Editor state |
| **WeakRefs** | Set to undefined | GC assistance |

---

## 5. 🆚 Comparison: Kilos vs Oropendola

### Architecture Differences

| Feature | Kilos | Oropendola |
|---------|-------|------------|
| **Main Class** | `Task` (EventEmitter) | `ConversationTask` |
| **Message Storage** | Dual (API + UI messages) | Single conversation history |
| **State Persistence** | File-based (JSON) | Database + file hybrid |
| **Checkpoints** | Git-based diffs | Not implemented |
| **Resource Cleanup** | Centralized `dispose()` | Distributed cleanup |
| **Resumption** | 4-phase pattern | Not fully implemented |
| **Event System** | EventEmitter | Custom events |
| **Message Queue** | Dedicated service | Not implemented |

### Message Persistence

**Kilos:**
```typescript
// Separate storage
await saveTaskMessages(taskId, clineMessages)      // UI messages
await saveApiMessages(taskId, apiConversationHistory) // API messages
await saveTaskMetadata(taskId, metadata)           // Task state
```

**Oropendola:**
```typescript
// Single storage
await this._saveConversationToFile()  // Markdown file
// TODO: Add database persistence
```

### Resumption Pattern

**Kilos:**
```
1. Load messages →
2. Clean artifacts →
3. Ask user "Resume?" →
4. Restore API state →
5. Continue from last point
```

**Oropendola:**
```
1. Load conversation file →
2. Create new task →
3. User manually continues
// TODO: Automatic resumption
```

### Termination Pattern

**Kilos:**
```
abort() →
  Set flags →
  Emit event →
  dispose() →
    Clean 9 resource types →
  Save state
```

**Oropendola:**
```
Task complete →
  Close WebSocket →
  Save conversation →
  Generate report (conditional)
// TODO: Centralized dispose()
```

---

## 6. 💡 Improvement Suggestions for Oropendola

### 🔴 Critical Improvements

#### 1. Implement Centralized Disposal Pattern

**Current Issue:**
- Resources cleaned up in multiple places
- Potential memory leaks from event listeners
- No systematic cleanup checklist

**Recommended Fix:**
```typescript
// src/core/ConversationTask.js

async dispose() {
    console.log(`🧹 Disposing task ${this.taskId}`);

    try {
        // 1. Set abort flag
        this.abort = true;

        // 2. Close WebSocket
        if (this.realtimeManager) {
            this.realtimeManager.disconnect();
            this.realtimeManager = null;
        }

        // 3. Remove ALL event listeners
        this.removeAllListeners();

        // 4. Clear intervals/timers
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }

        // 5. Release file watchers
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
            this.fileWatcher = null;
        }

        // 6. Save final state
        await this._saveConversationToFile();

        // 7. Notify provider
        this.emit('disposed');

    } catch (error) {
        console.error('Error during disposal:', error);
        // Don't throw - disposal must always succeed
    }
}
```

**Why Important:**
- Prevents memory leaks
- Clean shutdown
- Proper resource release
- Matches Kilos best practices

#### 2. Implement Resumption Pattern

**Current Issue:**
- Users can't resume interrupted tasks
- No checkpoint system
- Conversation state not fully restorable

**Recommended Implementation:**
```typescript
// src/core/ConversationTask.js

async resumeFromHistory(taskId) {
    console.log(`🔄 Resuming task ${taskId}`);

    // Phase 1: Load persisted state
    const messages = await this._loadConversationMessages(taskId);
    const metadata = await this._loadTaskMetadata(taskId);

    // Phase 2: Clean artifacts
    const cleanMessages = this._removeTemporaryMessages(messages);

    // Phase 3: Restore state
    this.messages = cleanMessages;
    this.conversationId = metadata.conversationId;
    this.mode = metadata.mode || 'agent';

    // Phase 4: Ask user to resume
    const lastMessage = cleanMessages[cleanMessages.length - 1];
    const isCompleted = lastMessage.content.includes('Task complete');

    const resumeType = isCompleted ? 'resume_completed' : 'resume_task';
    const userChoice = await this._askUserToResume(resumeType);

    if (userChoice === 'resume') {
        // Phase 5: Continue execution
        await this.run();
    }
}

_removeTemporaryMessages(messages) {
    return messages.filter(m =>
        m.role !== 'system' ||
        !m.content.includes('[TEMP]')
    );
}

async _askUserToResume(type) {
    // Show UI to user asking if they want to resume
    const message = type === 'resume_completed'
        ? 'This task was completed. Would you like to continue?'
        : 'This task was interrupted. Would you like to resume?';

    return this.provider.askUser({
        type: 'resume',
        message,
        options: ['Resume', 'Start New']
    });
}
```

**Benefits:**
- Users can recover from crashes
- Better UX for long-running tasks
- State preservation across sessions

#### 3. Implement Message Queue Service

**Current Issue:**
- Messages processed synchronously
- No queuing mechanism
- Potential race conditions

**Recommended Pattern:**
```typescript
// src/core/MessageQueueService.js

class MessageQueueService {
    constructor() {
        this.queue = [];
        this.processing = false;
    }

    async enqueue(message) {
        this.queue.push(message);

        if (!this.processing) {
            await this.processQueue();
        }
    }

    async processQueue() {
        this.processing = true;

        while (this.queue.length > 0) {
            const message = this.queue.shift();

            try {
                await this.processMessage(message);
            } catch (error) {
                console.error('Error processing message:', error);
            }
        }

        this.processing = false;
    }

    async processMessage(message) {
        // Process message
        this.emit('messageProcessed', message);
    }

    dispose() {
        this.queue = [];
        this.removeAllListeners();
    }
}
```

**Benefits:**
- Ordered message processing
- Better error handling
- Async message handling

### 🟡 Medium Priority Improvements

#### 4. Separate API Messages from UI Messages

**Current Implementation:**
```typescript
// Oropendola - mixed storage
this.messages = [
  { role: 'system', content: '...' },  // For AI
  { role: 'user', content: '...' },    // From user
  { role: 'assistant', content: '...' } // From AI
]
```

**Recommended Pattern (from Kilos):**
```typescript
// Separate concerns
this.apiMessages = [...]     // For AI API calls
this.displayMessages = [...]  // For UI rendering
this.metadata = {...}         // Task state
```

**Benefits:**
- Cleaner separation of concerns
- Easier to modify UI without affecting API
- Better for debugging

#### 5. Implement Event-Driven Architecture

**Current:**
```typescript
// Oropendola - callback-based
this.onProgress = (progress) => { /* ... */ };
this.onComplete = () => { /* ... */ };
```

**Recommended (from Kilos):**
```typescript
// Event-driven
class ConversationTask extends EventEmitter {
    async run() {
        this.emit('started', { taskId: this.taskId });

        // ... processing ...

        this.emit('progress', { step: 1, total: 5 });

        // ... more processing ...

        this.emit('completed', { result: ... });
    }
}

// Usage
task.on('started', (data) => { /* ... */ });
task.on('progress', (data) => { /* ... */ });
task.on('completed', (data) => { /* ... */ });
```

**Benefits:**
- Multiple listeners possible
- Decoupled architecture
- Standard Node.js pattern

#### 6. Add Checkpoint System (Optional)

**If you want git-based checkpoints like Kilos:**

```typescript
// src/services/CheckpointService.js

class CheckpointService {
    constructor(taskId, workspaceDir) {
        this.taskId = taskId;
        this.workspaceDir = workspaceDir;
        this.checkpointDir = path.join(workspaceDir, '.oropendola', 'checkpoints', taskId);
    }

    async save(force = false) {
        // Use git to create checkpoint
        const git = simpleGit(this.workspaceDir);

        // Create a stash-like checkpoint
        await git.add('.');
        const status = await git.status();

        if (force || status.files.length > 0) {
            const checkpointId = crypto.randomUUID();
            await git.stash(['save', checkpointId]);
            return checkpointId;
        }

        return null;
    }

    async restore(checkpointId) {
        const git = simpleGit(this.workspaceDir);
        await git.stash(['apply', checkpointId]);
    }
}
```

**Benefits:**
- Undo file changes
- Safe experimentation
- State rollback

### 🟢 Nice-to-Have Improvements

#### 7. Add Abort Propagation Pattern

**Current:**
```typescript
// No systematic abort checking
```

**Recommended:**
```typescript
async run() {
    while (!this.abort) {
        // Check frequently
        if (this.abort) {
            throw new Error('Task aborted');
        }

        await this.processNextStep();

        if (this.abort) {
            break;
        }
    }
}
```

#### 8. Add Pause/Resume Support

**From Kilos:**
```typescript
this.isPaused = false;

async pauseTask() {
    this.isPaused = true;
    this.emit('paused');
}

async resumeTask() {
    this.isPaused = false;
    this.emit('resumed');
    await this.run();
}
```

#### 9. Better Error Recovery

**Kilos pattern:**
```typescript
try {
    await this.makeApiRequest();
} catch (error) {
    if (isRetryableError(error)) {
        // Exponential backoff
        await delay(Math.min(retryCount * 1000, 60000));
        return this.makeApiRequest();
    }
    throw error;
}
```

---

## 7. 📝 Summary of Key Patterns

### Kilos Strengths

1. **Centralized Disposal** - Single `dispose()` method cleans all resources
2. **Robust Resumption** - 4-phase pattern with state cleaning
3. **Dual Message Tracking** - Separate API/UI message histories
4. **Checkpoint System** - Git-based state snapshots
5. **Message Queue** - Async message processing service
6. **Event-Driven** - EventEmitter for decoupled architecture
7. **Resource Tracking** - Comprehensive cleanup checklist
8. **Abort Propagation** - Systematic abort checking

### What Oropendola Should Adopt

**Priority 1 (Critical):**
- ✅ Centralized `dispose()` method
- ✅ Resumption pattern (at least basic)
- ✅ Better resource cleanup

**Priority 2 (Important):**
- Message queue service
- Event-driven architecture
- Separate API/UI messages

**Priority 3 (Nice-to-have):**
- Checkpoint system
- Pause/resume support
- Better error recovery

---

## 8. 🎯 Concrete Action Items

### Immediate (This Week)

1. **Add `dispose()` method to ConversationTask**
   - Follow Kilos 9-point cleanup pattern
   - Test for memory leaks
   - Ensure all resources released

2. **Fix endpoint mismatch**
   - Backend must return `tool_calls` array in response
   - Backend must strip tool_call blocks from content
   - Test with actual tool calls

3. **Add basic resumption**
   - Save task state to file
   - Load state on resume
   - Ask user "Resume?" or "Start New"

### Short-term (This Month)

4. **Implement message queue**
   - Create MessageQueueService
   - Queue all user messages
   - Process sequentially

5. **Add event-driven patterns**
   - Extend EventEmitter
   - Emit lifecycle events
   - Allow multiple listeners

6. **Separate message types**
   - `apiMessages` for AI
   - `displayMessages` for UI
   - `metadata` for state

### Long-term (Next Quarter)

7. **Add checkpoint system** (optional)
   - Git-based if possible
   - File-based alternative
   - UI for checkpoint management

8. **Add pause/resume** (optional)
   - Pause button in UI
   - Save interrupted state
   - Resume gracefully

---

## 9. 📚 References

### Kilos Key Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/core/task/Task.ts` | 2000+ | Main task orchestrator |
| `src/core/checkpoints/index.ts` | 300 | Checkpoint system |
| `src/core/task-persistence/*.ts` | 500 | Message persistence |
| `src/core/webview/ClineProvider.ts` | 1000+ | Webview provider |
| `src/core/message-queue/MessageQueueService.ts` | 200 | Message queue |

### Pattern Examples

**Resumption:** Lines 1282-1429 in Task.ts
**Disposal:** Lines 1578-1660 in Task.ts
**Checkpoints:** src/core/checkpoints/index.ts
**Message Queue:** src/core/message-queue/MessageQueueService.ts

---

## 10. ✅ Conclusion

**Kilos demonstrates excellent patterns for:**
- Task state management
- Resource cleanup
- Message persistence
- Checkpoint/resume functionality

**Oropendola should prioritize:**
1. Centralized disposal pattern (prevents memory leaks)
2. Basic resumption support (better UX)
3. Fix endpoint mismatch (tool calls broken)

**Estimated effort:**
- Disposal pattern: 2-3 hours
- Basic resumption: 4-6 hours
- Endpoint fix: 30 minutes

**Total:** ~1 day of focused development

---

**Analysis completed**: 2025-10-23
**Analyzed by**: Claude (Sonnet 4.5)
**Repository**: https://github.com/Kilo-Org/kilocode.git
**Lines reviewed**: ~2500+ lines of core code
