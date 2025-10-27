# Advanced Features Implementation Guide

## Overview

This document describes the implementation of two major advanced features inspired by Roo-Code:
1. **Subtask System** - Hierarchical task management with parent/child relationships
2. **Semantic Code Search** - AI-powered intelligent code discovery

## 🔄 Subtask System

### Architecture

The subtask system allows breaking down complex tasks into smaller, manageable subtasks with full state management, pause/resume capabilities, and automatic context switching.

#### Core Components

1. **SubtaskOrchestrator** (`src/core/SubtaskOrchestrator.ts`)
   - Manages task stack (similar to Roo-Code's `clineStack`)
   - Handles parent/child relationships
   - Provides pause/resume functionality
   - Auto-saves task stack state

2. **Type Definitions** (`src/types/subtask.ts`)
   - `SubtaskCapableTask` - Extended task with relationship tracking
   - `TaskStackEntry` - Stack frame for active tasks
   - `SubtaskRelationship` - Parent/child hierarchy metadata
   - `TaskPauseState` - State preservation for resumption

3. **UI Components**
   - `TaskStackNavigator` - Breadcrumb-style task hierarchy visualization
   - Shows task depth, status, and allows navigation

#### How It Works

```typescript
// In AI assistant context:
// 1. Start a subtask
<start_subtask>
  <description>Implement authentication module</description>
  <mode>code</mode>
</start_subtask>

// 2. Current task is automatically paused
// 3. Subtask executes with isolated context
// 4. Complete subtask to return to parent

<complete_subtask>
  <result>Authentication module implemented successfully</result>
</complete_subtask>
```

#### Task Stack Structure

```
Root Task (depth: 0)
  └─ Subtask 1 (depth: 1) ← Currently active
      └─ Subtask 1.1 (depth: 2) [paused - waiting]
```

#### Features

- **Max Depth**: Configurable (default: 3 levels)
- **Pause/Resume**: Automatic when creating subtasks
- **State Persistence**: Auto-saves every 30 seconds
- **Stack Navigation**: UI breadcrumb for task switching
- **Event System**: Real-time updates via EventEmitter

#### API Methods

```typescript
// SubtaskOrchestrator methods:
startRootTask(text: string, mode?: string): Promise<SubtaskCapableTask>
startSubtask(text: string, mode?: string): Promise<SubtaskResult>
waitForSubtask(subtaskId: string): Promise<SubtaskResult>
completeSubtask(result?: any): Promise<void>
pauseTask(taskId: string, reason: string): Promise<void>
resumeTask(taskId: string): Promise<void>
getTaskStack(): TaskStackEntry[]
getCurrentTask(): SubtaskCapableTask | null
```

#### Tool Interface

The AI can use these tools directly:

**`<start_subtask>`**
- Creates a new child task
- Pauses current task
- Switches context to subtask

**`<complete_subtask>`**
- Marks subtask as complete
- Resumes parent task
- Returns result to parent context

#### Use Cases

1. **Research Then Implement**
   ```
   Main Task: "Add user authentication"
     └─ Subtask: "Research existing auth patterns" (completes)
     └─ Subtask: "Implement JWT authentication" (current)
   ```

2. **Multi-Step Workflows**
   ```
   Main Task: "Refactor payment system"
     └─ Subtask: "Create new payment interface"
         └─ Sub-subtask: "Write unit tests"
   ```

3. **Investigation Before Fix**
   ```
   Main Task: "Fix login bug"
     └─ Subtask: "Investigate authentication flow" (completes)
     └─ Subtask: "Apply fix" (uses findings from investigation)
   ```

#### Configuration

```typescript
new SubtaskOrchestrator(taskManager, {
  maxDepth: 3,                    // Maximum nesting levels
  maxConcurrentSubtasks: 1,       // Sequential execution
  enablePauseResume: true,        // Pause/resume support
  autoSaveInterval: 30000         // Save every 30 seconds
})
```

## 🔍 Semantic Code Search

### Architecture

Semantic search uses vector embeddings to find code by meaning rather than exact text matching. It integrates with the backend vector database service.

#### Core Components

1. **VectorDBClient** (`src/vector/VectorDBClient.ts`)
   - Backend API integration
   - Vector indexing and search
   - Result caching (5-minute TTL)

2. **SemanticSearchProvider** (`src/vector/SemanticSearchProvider.ts`)
   - High-level search interface
   - Context building for AI
   - Memory storage and retrieval

3. **Tool Implementation** (`src/core/ConversationTask.js`)
   - `_executeCodebaseSearch()` - Tool handler
   - Result formatting
   - Similarity filtering

#### How It Works

```xml
<!-- In AI assistant context: -->
<codebase_search>
  <query>authentication middleware that validates JWT tokens</query>
  <limit>5</limit>
  <min_similarity>0.7</min_similarity>
</codebase_search>
```

#### Response Format

```
Found 3 relevant code snippet(s) for: "authentication middleware"

Result 1/3:
File: src/middleware/auth.js:25
Similarity: 87.3%

export const validateJWT = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  // ... implementation
}

---

Result 2/3:
File: src/utils/token-validator.js:10
Similarity: 78.9%

class TokenValidator {
  verify(token) {
    // ... implementation
  }
}

---
```

#### Features

- **Vector Embeddings**: Uses backend embedding service (OpenAI, Ollama, etc.)
- **Semantic Matching**: Finds code by concept, not keywords
- **Configurable Similarity**: Filter by relevance threshold
- **Result Caching**: 10-minute cache for repeated queries
- **Context Integration**: Automatically included in AI context

#### API Methods

```typescript
// SemanticSearchProvider methods:
searchContext(query: string, options): Promise<{
  codeContext: VectorSearchResult[]
  memories: ConversationMemory[]
  contextString: string
}>

searchCodeContext(query: string, limit: number): Promise<VectorSearchResult[]>
storeConversation(messages, summary?): Promise<void>
indexCurrentFile(): Promise<void>
```

#### Backend Integration

The system uses the Oropendola AI backend's vector database endpoints:

- `POST /api/method/ai_assistant.api.vector_index` - Index content
- `POST /api/method/ai_assistant.api.vector_search` - Search vectors
- `POST /api/method/ai_assistant.api.vector_store_memory` - Store memories

#### Tool Interface

**`<codebase_search>`** parameters:
- `query` (required): Natural language search query
- `limit` (optional): Max results (default: 5)
- `min_similarity` (optional): Minimum similarity score 0-1 (default: 0.6)

#### Use Cases

1. **Find Similar Code**
   ```xml
   <codebase_search>
     <query>functions that validate user input</query>
     <limit>3</limit>
   </codebase_search>
   ```

2. **Discover Patterns**
   ```xml
   <codebase_search>
     <query>error handling for API requests</query>
     <min_similarity>0.8</min_similarity>
   </codebase_search>
   ```

3. **Understand Architecture**
   ```xml
   <codebase_search>
     <query>database connection and query methods</query>
     <limit>10</limit>
   </codebase_search>
   ```

#### Advantages Over grep/glob

| grep/glob | Semantic Search |
|-----------|----------------|
| Exact text matching | Conceptual matching |
| Requires knowing keywords | Works with descriptions |
| Misses synonyms | Finds related concepts |
| No relevance ranking | Similarity-based ranking |

#### Performance

- **Cache Hit**: ~10ms
- **Cache Miss**: ~200-500ms (backend query)
- **Index Time**: ~50-100ms per file
- **Batch Indexing**: 5 concurrent operations

## 🚀 Getting Started

### 1. Enable Features

The features are automatically enabled when:
- TaskManager is initialized (provides subtask orchestration)
- Backend connection is available (provides semantic search)

### 2. AI Usage

The AI assistant can now use these tools automatically:

```xml
<!-- Create a subtask for focused work -->
<start_subtask>
  <description>Research authentication patterns</description>
  <mode>code</mode>
</start_subtask>

<!-- Search for relevant code -->
<codebase_search>
  <query>existing authentication implementations</query>
  <limit>5</limit>
</codebase_search>

<!-- Complete subtask when done -->
<complete_subtask>
  <result>Found 3 authentication patterns to consider</result>
</complete_subtask>
```

### 3. User Workflow

Users don't need to do anything special - the AI will:
1. Use semantic search to understand existing code
2. Create subtasks for complex multi-step work
3. Navigate task hierarchy automatically
4. Show progress in TaskStackNavigator UI

## 📊 Status Indicators

### Task Stack Navigator

- 🔵 Active (spinning loader)
- ✅ Completed (green checkmark)
- ❌ Failed (red X)
- ⏸️ Paused (yellow pause icon)
- ⭕ Pending (gray circle)

### Depth Badges

Tasks show depth level: `L0` (root), `L1` (first level), `L2` (second level), etc.

## 🔧 Configuration

### VS Code Settings

```json
{
  "oropendola.semanticSearch.enabled": true,
  "oropendola.subtasks.maxDepth": 3,
  "oropendola.subtasks.autoSave": true
}
```

### TaskManager Integration

The SubtaskOrchestrator requires TaskManager to be initialized first. This happens automatically in the extension activation.

## 🐛 Troubleshooting

### Subtasks Not Working

1. Check TaskManager is initialized: `this._taskManager !== null`
2. Check SubtaskOrchestrator exists: `this._subtaskOrchestrator !== null`
3. Check console for initialization errors

### Semantic Search Not Finding Results

1. Verify backend connection is active
2. Check if content has been indexed
3. Lower `min_similarity` threshold
4. Try broader search terms

## 📝 Best Practices

### For AI Assistant

1. **Use semantic search FIRST** before writing code
2. **Create subtasks** for distinct units of work
3. **Keep subtasks focused** - max 3 levels deep
4. **Always complete subtasks** - don't leave orphaned tasks
5. **Search broadly** then narrow down

### For Developers

1. Index important files for better search results
2. Monitor task stack in UI for context
3. Use task breadcrumbs to navigate hierarchy
4. Clear old subtasks if stack gets cluttered

## 🎯 Performance Considerations

### Memory Usage

- Task stack: ~1KB per task
- Search cache: ~100KB (10 min TTL)
- Vector embeddings: Backend-managed

### Network Usage

- Semantic search: ~200-500ms per query
- Task operations: Local (no network)
- Auto-save: ~1KB every 30 seconds

## 🔮 Future Enhancements

1. **Parallel Subtasks** - Execute multiple subtasks concurrently
2. **Task Templates** - Predefined subtask workflows
3. **Smart Caching** - Predict and pre-fetch likely searches
4. **Visual DAG** - Graph view of task relationships
5. **Task Replay** - Replay subtask execution history

## 📚 Related Documentation

- [Task Management System](../types/task.ts)
- [Vector Database Client](../vector/VectorDBClient.ts)
- [Conversation Task](../core/ConversationTask.js)
- [Sidebar Provider](../sidebar/sidebar-provider.js)

## 🤝 Contributing

When adding new features to these systems:

1. Update type definitions first
2. Add tool handlers to ConversationTask
3. Update UI components if needed
4. Add tests for new functionality
5. Update this documentation

---

**Implementation Date**: October 27, 2025
**Version**: 3.8.0 (Next Release)
**Status**: ✅ Complete - Ready for Testing
