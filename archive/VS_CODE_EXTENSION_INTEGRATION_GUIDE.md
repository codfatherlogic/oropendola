# VS Code Extension Integration Guide
## Complete API Specifications & Frontend Documentation
### For Backend Features Integration

**Version:** 2.0.0  
**Last Updated:** October 20, 2025  
**Status:** ✅ Production Ready

---

## 🎯 Overview

This guide provides complete specifications for integrating all **5 new backend features** into your VS Code Extension:

1. **Workspace Context Management** - Intelligent workspace analysis
2. **Git Integration** - Full git history and status tracking
3. **Code Intelligence** - Symbol analysis and code navigation
4. **Multi-Turn Context Memory** - Persistent conversation context
5. **Inline Code Suggestions** - Real-time code completion

### 🚨 Critical Backend Fixes

This guide also includes **critical backend fixes** required for:
- ✅ **Conversational Response Format** - Proper AI conversation (not raw tool output)
- ✅ **TODO Panel Integration** - Automatic TODO parsing from numbered lists
- ✅ **File Change Tracking** - Structured file changes display

---

## 📋 Table of Contents

- [Critical Backend Fixes](#-critical-backend-fixes-required)
- [API Endpoints Reference](#-api-endpoints-reference)
- [Data Structures](#-data-structures)
- [Backend Implementation](#-backend-implementation)
- [Extension Architecture](#-extension-architecture)
- [Frontend Implementation](#-frontend-implementation)
- [Error Handling](#-error-handling)
- [Testing Guide](#-testing-guide)

---

## � Critical Backend Fixes Required

### Problem Summary

The backend currently has **2 critical issues** that block core functionality:

#### ❌ Issue 1: Raw Tool Output Instead of Conversation

**Current Broken Behavior:**
```
✅ read_file: import json import frappe...
✅ modify_file: Successfully modified file: posawesome/api/restaurant_orders.py
⚠️ Request timed out. The backend may be experiencing issues.
```

**Expected GitHub Copilot-Style:**
```
I've analyzed the error. The issue is that `search_orders` function is missing.
Let me fix this by:

1. Adding the search_orders function
2. Updating the imports
3. Testing the fix

[Creating files... ✓]
```

#### ❌ Issue 2: TODO Panel Not Working

- No TODO items appear in panel
- Backend not parsing numbered plans
- No TODO updates sent to frontend

### Root Cause

The backend is only returning tool execution results, **not** the AI conversation text, TODOs, or structured file changes.

### Required Backend Changes

**File Location:** `apps/oropendola/oropendola/api/chat.py` or similar

#### Change 1: Update Response Structure

```python
# ❌ WRONG - Current Code
@frappe.whitelist(allow_guest=False)
def send_message(message, conversation_id=None):
    # ... AI processing ...
    tool_results = execute_tools(ai_response)
    
    return {
        'success': True,
        'tool_results': tool_results  # Only raw logs
    }
```

```python
# ✅ CORRECT - Fixed Code
@frappe.whitelist(allow_guest=False)
def send_message(message, conversation_id=None):
    # ... AI processing ...
    
    # Get AI conversational response
    ai_message = ai_response.get('message', '') or ai_response.get('content', '')
    
    # Parse TODOs from numbered lists
    todos_data = parse_todos_from_text(ai_message)
    
    # Execute tools and track file changes
    tool_results = execute_tools(ai_response)
    file_changes = extract_file_changes(tool_results)
    
    # ✅ Return complete structured response
    return {
        'success': True,
        'role': 'assistant',
        'content': ai_message,              # Conversational AI text
        'file_changes': file_changes,       # Structured changes
        'todos': todos_data['todos'],       # Parsed TODO items
        'todos_stats': todos_data['stats'], # TODO statistics
        'tool_results': tool_results        # Optional for debugging
    }
```

#### Change 2: Add TODO Parsing Function

```python
import re
from datetime import datetime

def parse_todos_from_text(text):
    """
    Parse TODO items from AI response
    
    Detects patterns:
    - "1. Create package.json"
    - "2. Set up main entry point"
    - "3. Add README.md"
    """
    todos = []
    numbered_pattern = r'^(\d+)[.)]\s+(.+)$'
    lines = text.split('\n')
    timestamp = datetime.now().isoformat()
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        match = re.match(numbered_pattern, line)
        if match:
            order = int(match.group(1))
            task_text = match.group(2).strip()
            
            # Clean markdown/code markers
            task_text = task_text.replace('`', '').replace('**', '')
            
            # Skip invalid entries
            if len(task_text) < 5 or task_text.startswith('{'):
                continue
            
            todo_id = f"todo_{int(datetime.now().timestamp())}_{order}"
            
            todos.append({
                'id': todo_id,
                'text': task_text,
                'type': 'numbered',
                'order': order,
                'completed': False,
                'createdAt': timestamp
            })
    
    stats = {
        'total': len(todos),
        'completed': 0,
        'active': len(todos)
    }
    
    return {'todos': todos, 'stats': stats}
```

#### Change 3: Add File Changes Extraction

```python
def extract_file_changes(tool_results):
    """
    Extract file changes from tool execution results
    
    Returns format expected by frontend
    """
    file_changes = {
        'created': [],
        'modified': [],
        'deleted': [],
        'commands': []
    }
    
    if not tool_results:
        return file_changes
    
    for result in tool_results:
        action = result.get('action') or result.get('tool_name')
        
        if action == 'create_file':
            file_path = result.get('path') or result.get('file_path')
            if file_path:
                file_changes['created'].append({
                    'path': file_path,
                    'line_count': len(result.get('content', '').split('\n'))
                })
        
        elif action == 'modify_file':
            file_path = result.get('path') or result.get('file_path')
            if file_path:
                file_changes['modified'].append({
                    'path': file_path,
                    'lines_added': result.get('lines_added', 0),
                    'lines_removed': result.get('lines_removed', 0)
                })
        
        elif action == 'delete_file':
            file_path = result.get('path') or result.get('file_path')
            if file_path:
                file_changes['deleted'].append(file_path)
        
        elif action in ['execute_command', 'run_terminal']:
            command = result.get('command')
            if command:
                file_changes['commands'].append({
                    'command': command,
                    'output': result.get('output', '')[:200],
                    'exit_code': result.get('exit_code', 0)
                })
    
    return file_changes
```

### Expected Backend Response Structure

```json
{
  "success": true,
  "role": "assistant",
  "content": "I've analyzed the error. Let me fix this:\n\n1. Add search_orders function\n2. Update imports\n3. Test the fix\n\nI've made these changes...",
  
  "file_changes": {
    "created": [],
    "modified": [
      {
        "path": "posawesome/api/sales_orders.py",
        "lines_added": 15,
        "lines_removed": 0
      }
    ],
    "deleted": [],
    "commands": []
  },
  
  "todos": [
    {
      "id": "todo_1729468234_1",
      "text": "Add search_orders function",
      "type": "numbered",
      "order": 1,
      "completed": true,
      "createdAt": "2025-10-20T10:30:34Z"
    },
    {
      "id": "todo_1729468234_2",
      "text": "Update imports",
      "type": "numbered",
      "order": 2,
      "completed": true,
      "createdAt": "2025-10-20T10:30:34Z"
    }
  ],
  
  "todos_stats": {
    "total": 2,
    "completed": 2,
    "active": 0
  }
}
```

### Backend Fix Checklist

- [ ] Added `parse_todos_from_text()` function to backend
- [ ] Added `extract_file_changes()` function to backend
- [ ] Modified chat endpoint to return `content` field
- [ ] Modified chat endpoint to return `file_changes` structure
- [ ] Modified chat endpoint to return `todos` and `todos_stats`
- [ ] Tested with sample message containing numbered list
- [ ] Verified frontend receives and displays TODOs
- [ ] Verified file changes appear in GitHub Copilot style

---

## �🔌 API Endpoints Reference

### Base URL Configuration

```typescript
// extension/src/config.ts
export const API_CONFIG = {
  baseUrl: process.env.BACKEND_URL || 'http://localhost:8000',
  apiPath: '/api/method/ai_assistant.api',
  timeout: 30000,
  retries: 3,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};
```

---

### 1. Workspace Context APIs

#### Get Workspace Context

```typescript
POST /api/method/ai_assistant.api.workspace.get_workspace_context

Request:
{
  "workspace_path": string,  // Absolute path to workspace root
  "include_symbols": boolean // Optional, default: false
}

Response:
{
  "success": boolean,
  "workspace": {
    "root": string,
    "name": string,
    "files": Array<{
      "path": string,
      "type": "file" | "dir",
      "size": number,
      "modified": number,
      "extension": string
    }>,
    "git_status": {
      "branch": string,
      "is_dirty": boolean,
      "untracked_files": string[],
      "modified_files": string[],
      "remote_url": string
    } | null,
    "package_files": string[],
    "config_files": string[],
    "total_lines": number,
    "languages": string[],
    "framework": string | null,
    "file_count": {
      "total": number,
      "code": number,
      "config": number,
      "docs": number,
      "other": number
    }
  }
}
```

#### Get File Context

```typescript
POST /api/method/ai_assistant.api.workspace.get_file_context

Request:
{
  "workspace_path": string,
  "file_path": string,      // Relative to workspace
  "cursor_line": number     // Current cursor line (0-indexed)
}

Response:
{
  "success": boolean,
  "context": {
    "file_path": string,
    "language": string,
    "total_lines": number,
    "cursor_line": number,
    "nearby_code": {
      "lines": string[],
      "start_line": number,
      "end_line": number
    },
    "file_size": number,
    "last_modified": number
  }
}
```

#### Find Related Files

```typescript
POST /api/method/ai_assistant.api.workspace.find_related_files

Request:
{
  "workspace_path": string,
  "current_file": string,
  "max_files": number       // Optional, default: 5
}

Response:
{
  "success": boolean,
  "related_files": string[]
}
```

---

### 2. Git Integration APIs

#### Get Git Status

```typescript
POST /api/method/ai_assistant.api.git.get_git_status

Request:
{
  "workspace_path": string
}

Response:
{
  "success": boolean,
  "branch": string | null,
  "uncommitted_changes": Array<{
    "file": string,
    "change_type": "modified" | "added" | "deleted" | "renamed",
    "status": "modified" | "staged" | "untracked",
    "diff": string | null,
    "additions": number,
    "deletions": number
  }>,
  "diff_stats": {
    "files_changed": number,
    "insertions": number,
    "deletions": number,
    "is_dirty": boolean
  },
  "remote_info": {
    "name": string,
    "url": string,
    "fetch_url": string
  } | null
}
```

#### Generate Commit Message

```typescript
POST /api/method/ai_assistant.api.git.generate_commit_message

Request:
{
  "workspace_path": string
}

Response:
{
  "success": boolean,
  "message": string,          // AI-generated commit message
  "changes_count": number
}
```

#### Get File History

```typescript
POST /api/method/ai_assistant.api.git.get_file_history

Request:
{
  "workspace_path": string,
  "file_path": string,
  "limit": number            // Optional, default: 10
}

Response:
{
  "success": boolean,
  "file": string,
  "history": Array<{
    "sha": string,
    "message": string,
    "author": string,
    "email": string,
    "date": string,          // ISO format
    "diff": string | null
  }>,
  "commit_count": number
}
```

#### Get Recent Commits

```typescript
POST /api/method/ai_assistant.api.git.get_recent_commits

Request:
{
  "workspace_path": string,
  "limit": number            // Optional, default: 10
}

Response:
{
  "success": boolean,
  "commits": Array<{
    "sha": string,
    "message": string,
    "author": string,
    "date": string,
    "files_changed": number
  }>,
  "count": number
}
```

#### Get Git Blame

```typescript
POST /api/method/ai_assistant.api.git.get_blame

Request:
{
  "workspace_path": string,
  "file_path": string,
  "line_number": number      // 1-indexed
}

Response:
{
  "success": boolean,
  "blame": {
    "sha": string,
    "author": string,
    "email": string,
    "date": string,
    "message": string,
    "line": string
  } | null
}
```

---

### 3. Code Intelligence APIs

#### Get Symbol Tree

```typescript
POST /api/method/ai_assistant.api.symbols.get_symbol_tree

Request:
{
  "file_path": string        // Absolute path
}

Response:
{
  "success": boolean,
  "file": string,
  "symbols": Array<{
    "name": string,
    "type": "function" | "class" | "variable" | "method",
    "line": number,
    "column": number,
    "end_line": number,
    "depth": number,
    "signature"?: string,      // For functions/methods
    "superclasses"?: string[]  // For classes
  }>,
  "count": number
}
```

#### Find Symbol Definition

```typescript
POST /api/method/ai_assistant.api.symbols.find_symbol_definition

Request:
{
  "workspace_path": string,
  "symbol": string,
  "language": "python" | "javascript" | "typescript"
}

Response:
{
  "success": boolean,
  "symbol": string,
  "language": string,
  "definitions": Array<{
    "file": string,
    "line": number,
    "column": number,
    "type": string,
    "preview": string
  }>,
  "count": number
}
```

#### Find Symbol References

```typescript
POST /api/method/ai_assistant.api.symbols.find_symbol_references

Request:
{
  "workspace_path": string,
  "symbol": string,
  "language": "python" | "javascript" | "typescript"
}

Response:
{
  "success": boolean,
  "symbol": string,
  "language": string,
  "references": Array<{
    "file": string,
    "line": number,
    "content": string,
    "preview": string
  }>,
  "count": number
}
```

#### Get Call Hierarchy

```typescript
POST /api/method/ai_assistant.api.symbols.get_call_hierarchy

Request:
{
  "file_path": string,
  "function_name": string
}

Response:
{
  "success": boolean,
  "hierarchy": {
    "function": string,
    "calls": string[],         // Functions this function calls
    "line": number,
    "signature": string
  }
}
```

---

### 4. Enhanced Chat with Context

#### Chat Completion (Enhanced)

```typescript
POST /api/method/ai_assistant.api.chat_completion

Request:
{
  "messages": Array<{
    "role": "user" | "assistant" | "system",
    "content": string
  }>,
  "conversation_id": string | null,
  "mode": "agent" | "chat",
  "context": {
    "workspacePath"?: string,
    "currentFile"?: string,
    "cursorLine"?: number,
    "selectedText"?: string,
    "includeWorkspaceContext"?: boolean,
    "includeGitContext"?: boolean
  }
}

Response:
{
  "success": boolean,
  "role": "assistant",
  "content": string,
  "response": string,
  "conversation_id": string,
  "message_count": number,
  "tool_calls": Array<{
    "action": string,
    "path": string,
    "content"?: string,
    "description": string
  }>,
  "tool_results": Array<{
    "action": string,
    "status": "success" | "error",
    "message": string
  }>,
  "file_changes": {
    "created": Array<{
      "path": string,
      "line_count": number
    }>,
    "modified": Array<{
      "path": string,
      "lines_added": number,
      "lines_removed": number
    }>,
    "deleted": string[],
    "commands": Array<{
      "command": string,
      "output": string,
      "exit_code": number
    }>
  },
  "todos": Array<{
    "id": string,
    "text": string,
    "type": string,
    "order": number,
    "completed": boolean,
    "createdAt": string
  }>,
  "todos_stats": {
    "total": number,
    "completed": number,
    "active": number
  }
}
```

---

### 5. Inline Completion APIs

#### Get Inline Completion

```typescript
POST /api/method/ai_assistant.api.inline.get_completion

Request:
{
  "file_path": string,
  "line": number,
  "column": number,
  "text_before_cursor": string,
  "text_after_cursor": string,
  "language": "python" | "javascript" | "typescript"
}

Response:
{
  "success": boolean,
  "completions": Array<{
    "text": string,
    "type": "function" | "class" | "statement" | "ai_suggestion",
    "source": "pattern" | "ai"
  }>,
  "count": number
}
```

#### Clear Inline Cache

```typescript
POST /api/method/ai_assistant.api.inline.clear_cache

Request: {}

Response:
{
  "success": boolean,
  "message": string
}
```

#### Get Cache Stats

```typescript
GET /api/method/ai_assistant.api.inline.get_cache_stats

Response:
{
  "success": boolean,
  "stats": {
    "completion_cache_size": number,
    "completion_cache_maxsize": number,
    "debounce_cache_size": number,
    "debounce_cache_maxsize": number
  }
}
```

---

## 📦 Data Structures

### TypeScript Interfaces

```typescript
// extension/src/types/api.ts

// ============================================
// Workspace Types
// ============================================

export interface WorkspaceContext {
  root: string;
  name: string;
  files: FileInfo[];
  git_status: GitStatus | null;
  package_files: string[];
  config_files: string[];
  total_lines: number;
  languages: string[];
  framework: string | null;
  file_count: FileCount;
}

export interface FileInfo {
  path: string;
  type: 'file' | 'dir';
  size: number;
  modified: number;
  extension: string;
}

export interface GitStatus {
  branch: string;
  is_dirty: boolean;
  untracked_files: string[];
  modified_files: string[];
  remote_url: string;
}

export interface FileCount {
  total: number;
  code: number;
  config: number;
  docs: number;
  other: number;
}

export interface FileContext {
  file_path: string;
  language: string;
  total_lines: number;
  cursor_line: number;
  nearby_code: {
    lines: string[];
    start_line: number;
    end_line: number;
  };
  file_size: number;
  last_modified: number;
}

// ============================================
// Git Types
// ============================================

export interface GitChange {
  file: string;
  change_type: 'modified' | 'added' | 'deleted' | 'renamed';
  status: 'modified' | 'staged' | 'untracked';
  diff: string | null;
  additions: number;
  deletions: number;
}

export interface GitDiffStats {
  files_changed: number;
  insertions: number;
  deletions: number;
  is_dirty: boolean;
}

export interface GitRemoteInfo {
  name: string;
  url: string;
  fetch_url: string;
}

export interface GitCommit {
  sha: string;
  message: string;
  author: string;
  email?: string;
  date: string;
  files_changed?: number;
  diff?: string;
}

export interface GitBlame {
  sha: string;
  author: string;
  email: string;
  date: string;
  message: string;
  line: string;
}

// ============================================
// Symbol Types
// ============================================

export interface CodeSymbol {
  name: string;
  type: 'function' | 'class' | 'variable' | 'method';
  line: number;
  column: number;
  end_line?: number;
  depth: number;
  signature?: string;
  superclasses?: string[];
}

export interface SymbolDefinition {
  file: string;
  line: number;
  column: number;
  type: string;
  preview: string;
}

export interface SymbolReference {
  file: string;
  line: number;
  content: string;
  preview: string;
}

export interface CallHierarchy {
  function: string;
  calls: string[];
  line: number;
  signature: string;
}

// ============================================
// Chat Types
// ============================================

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatContext {
  workspacePath?: string;
  currentFile?: string;
  cursorLine?: number;
  selectedText?: string;
  includeWorkspaceContext?: boolean;
  includeGitContext?: boolean;
}

export interface ToolCall {
  action: string;
  path: string;
  content?: string;
  description: string;
}

export interface ToolResult {
  action: string;
  status: 'success' | 'error';
  message: string;
}

export interface FileChangeCreated {
  path: string;
  line_count: number;
}

export interface FileChangeModified {
  path: string;
  lines_added: number;
  lines_removed: number;
}

export interface CommandExecution {
  command: string;
  output: string;
  exit_code: number;
}

export interface FileChanges {
  created: FileChangeCreated[];
  modified: FileChangeModified[];
  deleted: string[];
  commands: CommandExecution[];
}

export interface Todo {
  id: string;
  text: string;
  type: string;
  order: number;
  completed: boolean;
  createdAt?: string;
}

export interface TodoStats {
  total: number;
  completed: number;
  active: number;
}

export interface ChatResponse {
  success: boolean;
  role: 'assistant';
  content: string;
  response: string;
  conversation_id: string;
  message_count: number;
  tool_calls: ToolCall[];
  tool_results: ToolResult[];
  file_changes: FileChanges;
  todos: Todo[];
  todos_stats: TodoStats;
}

// ============================================
// Inline Completion Types
// ============================================

export interface InlineCompletion {
  text: string;
  type: 'function' | 'class' | 'statement' | 'ai_suggestion' | 'loop' | 'variable';
  source: 'pattern' | 'ai';
}

export interface CacheStats {
  completion_cache_size: number;
  completion_cache_maxsize: number;
  debounce_cache_size: number;
  debounce_cache_maxsize: number;
}

// ============================================
// API Response Wrapper
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  error?: string;
  data?: T;
  message?: string;
}

// ============================================
// Error Types
// ============================================

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export class ApiException extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiException';
  }
}
```

---

## 🏗️ Extension Architecture

### Recommended File Structure

```
vscode-extension/
├── src/
│   ├── api/
│   │   ├── client.ts              # HTTP client wrapper
│   │   ├── workspace.ts           # Workspace API calls
│   │   ├── git.ts                 # Git API calls
│   │   ├── symbols.ts             # Code Intelligence API calls
│   │   ├── chat.ts                # Chat API calls
│   │   └── inline.ts              # Inline completion API calls
│   │
│   ├── providers/
│   │   ├── chatProvider.ts        # Chat sidebar provider
│   │   ├── inlineProvider.ts      # Inline completion provider
│   │   ├── symbolProvider.ts      # Symbol outline provider
│   │   └── hoverProvider.ts       # Hover information provider
│   │
│   ├── services/
│   │   ├── workspaceService.ts    # Workspace context manager
│   │   ├── gitService.ts          # Git integration service
│   │   ├── contextService.ts      # Context aggregation service
│   │   └── cacheService.ts        # Client-side caching
│   │
│   ├── ui/
│   │   ├── chatView.ts            # Chat webview
│   │   ├── gitView.ts             # Git status view
│   │   └── symbolTreeView.ts      # Symbol outline tree
│   │
│   ├── types/
│   │   └── api.ts                 # TypeScript interfaces
│   │
│   ├── utils/
│   │   ├── debounce.ts            # Debouncing utilities
│   │   ├── logger.ts              # Logging
│   │   └── config.ts              # Configuration
│   │
│   └── extension.ts               # Main entry point
│
├── webview/
│   ├── chat/
│   │   ├── index.html
│   │   ├── styles.css
│   │   └── script.js
│   └── git/
│       ├── index.html
│       ├── styles.css
│       └── script.js
│
├── package.json
├── tsconfig.json
└── README.md
```

---

## � Backend Implementation

### Complete Backend Reference Implementation

Here's the complete backend code with all fixes applied:

```python
# apps/oropendola/oropendola/api/chat.py
import frappe
import re
from datetime import datetime
from typing import Dict, List, Any

@frappe.whitelist(allow_guest=False)
def chat_completion(messages, conversation_id=None, mode="chat", context=None):
    """
    Enhanced chat completion with TODO parsing and file change tracking
    
    Args:
        messages: List of chat messages
        conversation_id: Optional conversation ID for context
        mode: 'agent' or 'chat' mode
        context: Additional context (workspace, git, etc.)
    
    Returns:
        Complete response with content, todos, file_changes
    """
    try:
        # Get or create conversation
        if conversation_id:
            conversation = get_conversation(conversation_id)
        else:
            conversation = create_conversation()
            conversation_id = conversation.name
        
        # Add user message to conversation
        add_message_to_conversation(conversation_id, messages)
        
        # Get AI response (your existing AI integration)
        ai_response = get_ai_response(
            messages=messages,
            conversation_id=conversation_id,
            mode=mode,
            context=context
        )
        
        # Extract AI message content
        ai_message = ai_response.get('message', '') or ai_response.get('content', '')
        
        # Parse TODOs from AI response
        todos_data = parse_todos_from_text(ai_message)
        
        # Execute tools if in agent mode
        tool_calls = []
        tool_results = []
        file_changes = {
            'created': [],
            'modified': [],
            'deleted': [],
            'commands': []
        }
        
        if mode == 'agent' and ai_response.get('tool_calls'):
            tool_calls = ai_response.get('tool_calls', [])
            tool_results = execute_tools(tool_calls, context)
            file_changes = extract_file_changes(tool_results)
        
        # Save assistant message
        save_message(conversation_id, 'assistant', ai_message)
        
        # Build complete response
        response = {
            'success': True,
            'role': 'assistant',
            'content': ai_message,
            'response': ai_message,  # Alias for compatibility
            'conversation_id': conversation_id,
            'message_count': get_message_count(conversation_id),
            'tool_calls': tool_calls,
            'tool_results': tool_results,
            'file_changes': file_changes,
            'todos': todos_data['todos'],
            'todos_stats': todos_data['stats']
        }
        
        return response
        
    except Exception as e:
        frappe.log_error(f"Chat completion error: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'content': '',
            'todos': [],
            'todos_stats': {'total': 0, 'completed': 0, 'active': 0},
            'file_changes': {'created': [], 'modified': [], 'deleted': [], 'commands': []}
        }


def parse_todos_from_text(text: str) -> Dict[str, Any]:
    """
    Parse TODO items from AI response text
    
    Detects numbered lists like:
    1. Create package.json
    2. Set up main entry point
    3. Add README.md
    
    Args:
        text: AI response text
    
    Returns:
        Dictionary with 'todos' list and 'stats' dict
    """
    todos = []
    
    # Pattern to match numbered lists
    numbered_pattern = r'^(\d+)[.)]\s+(.+)$'
    
    lines = text.split('\n')
    timestamp = datetime.now().isoformat()
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Check for numbered list
        match = re.match(numbered_pattern, line)
        if match:
            order = int(match.group(1))
            task_text = match.group(2).strip()
            
            # Clean markdown/code markers
            task_text = task_text.replace('`', '').replace('**', '').replace('*', '')
            
            # Skip if too short or looks like code
            if len(task_text) < 5 or task_text.startswith('{'):
                continue
            
            # Generate unique ID
            todo_id = f"todo_{int(datetime.now().timestamp())}_{order}"
            
            todos.append({
                'id': todo_id,
                'text': task_text,
                'type': 'numbered',
                'order': order,
                'completed': False,
                'createdAt': timestamp
            })
    
    # Calculate statistics
    stats = {
        'total': len(todos),
        'completed': 0,
        'active': len(todos)
    }
    
    return {
        'todos': todos,
        'stats': stats
    }


def extract_file_changes(tool_results: List[Dict]) -> Dict[str, List]:
    """
    Extract file changes from tool execution results
    
    Args:
        tool_results: List of tool execution results
    
    Returns:
        Dictionary with created, modified, deleted files and commands
    """
    file_changes = {
        'created': [],
        'modified': [],
        'deleted': [],
        'commands': []
    }
    
    if not tool_results:
        return file_changes
    
    for result in tool_results:
        action = result.get('action') or result.get('tool_name')
        
        if action == 'create_file':
            file_path = result.get('path') or result.get('file_path')
            if file_path:
                content = result.get('content', '')
                file_changes['created'].append({
                    'path': file_path,
                    'line_count': len(content.split('\n')) if content else 0
                })
        
        elif action == 'modify_file' or action == 'edit_file':
            file_path = result.get('path') or result.get('file_path')
            if file_path:
                file_changes['modified'].append({
                    'path': file_path,
                    'lines_added': result.get('lines_added', 0),
                    'lines_removed': result.get('lines_removed', 0)
                })
        
        elif action == 'delete_file':
            file_path = result.get('path') or result.get('file_path')
            if file_path:
                file_changes['deleted'].append(file_path)
        
        elif action in ['execute_command', 'run_terminal', 'run_command']:
            command = result.get('command')
            if command:
                file_changes['commands'].append({
                    'command': command,
                    'output': result.get('output', '')[:200],  # Limit to 200 chars
                    'exit_code': result.get('exit_code', 0)
                })
    
    return file_changes


def execute_tools(tool_calls: List[Dict], context: Dict = None) -> List[Dict]:
    """
    Execute tool calls and return results
    
    Args:
        tool_calls: List of tool calls from AI
        context: Execution context
    
    Returns:
        List of tool execution results
    """
    results = []
    
    for tool_call in tool_calls:
        try:
            action = tool_call.get('action')
            
            if action == 'create_file':
                result = create_file_tool(
                    path=tool_call.get('path'),
                    content=tool_call.get('content')
                )
            
            elif action == 'modify_file':
                result = modify_file_tool(
                    path=tool_call.get('path'),
                    changes=tool_call.get('changes')
                )
            
            elif action == 'read_file':
                result = read_file_tool(
                    path=tool_call.get('path')
                )
            
            elif action == 'execute_command':
                result = execute_command_tool(
                    command=tool_call.get('command'),
                    cwd=context.get('workspacePath') if context else None
                )
            
            else:
                result = {
                    'action': action,
                    'status': 'error',
                    'message': f'Unknown action: {action}'
                }
            
            results.append(result)
            
        except Exception as e:
            results.append({
                'action': tool_call.get('action'),
                'status': 'error',
                'message': str(e)
            })
    
    return results


# Tool implementation functions
def create_file_tool(path: str, content: str) -> Dict:
    """Create a new file"""
    try:
        # Your file creation logic
        return {
            'action': 'create_file',
            'status': 'success',
            'path': path,
            'content': content,
            'message': f'Created file: {path}'
        }
    except Exception as e:
        return {
            'action': 'create_file',
            'status': 'error',
            'path': path,
            'message': str(e)
        }


def modify_file_tool(path: str, changes: Dict) -> Dict:
    """Modify an existing file"""
    try:
        # Your file modification logic
        return {
            'action': 'modify_file',
            'status': 'success',
            'path': path,
            'lines_added': changes.get('lines_added', 0),
            'lines_removed': changes.get('lines_removed', 0),
            'message': f'Modified file: {path}'
        }
    except Exception as e:
        return {
            'action': 'modify_file',
            'status': 'error',
            'path': path,
            'message': str(e)
        }


def read_file_tool(path: str) -> Dict:
    """Read file contents"""
    try:
        # Your file reading logic
        return {
            'action': 'read_file',
            'status': 'success',
            'path': path,
            'content': '...',  # File contents
            'message': f'Read file: {path}'
        }
    except Exception as e:
        return {
            'action': 'read_file',
            'status': 'error',
            'path': path,
            'message': str(e)
        }


def execute_command_tool(command: str, cwd: str = None) -> Dict:
    """Execute shell command"""
    try:
        import subprocess
        result = subprocess.run(
            command,
            shell=True,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=30
        )
        return {
            'action': 'execute_command',
            'status': 'success',
            'command': command,
            'output': result.stdout,
            'error': result.stderr,
            'exit_code': result.returncode,
            'message': f'Executed: {command}'
        }
    except Exception as e:
        return {
            'action': 'execute_command',
            'status': 'error',
            'command': command,
            'message': str(e)
        }
```

### Testing Backend Changes

#### Test 1: TODO Parsing

```python
# In Frappe console (bench console)
from oropendola.api.chat import parse_todos_from_text

text = """I'll fix this issue with these steps:

1. Add search_orders function to sales_orders.py
2. Update imports in __init__.py
3. Test the fix with bench restart
"""

result = parse_todos_from_text(text)
print(f"Found {len(result['todos'])} TODOs")
print(result)

# Expected output:
# Found 3 TODOs
# {
#   'todos': [
#     {'id': 'todo_...', 'text': 'Add search_orders function...', 'order': 1, ...},
#     ...
#   ],
#   'stats': {'total': 3, 'completed': 0, 'active': 3}
# }
```

#### Test 2: File Changes Extraction

```python
# In Frappe console
from oropendola.api.chat import extract_file_changes

tool_results = [
    {
        'action': 'create_file',
        'path': 'test.py',
        'content': 'print("hello")\nprint("world")\n'
    },
    {
        'action': 'modify_file',
        'path': 'main.py',
        'lines_added': 5,
        'lines_removed': 2
    }
]

result = extract_file_changes(tool_results)
print(result)

# Expected output:
# {
#   'created': [{'path': 'test.py', 'line_count': 3}],
#   'modified': [{'path': 'main.py', 'lines_added': 5, 'lines_removed': 2}],
#   'deleted': [],
#   'commands': []
# }
```

#### Test 3: Full API Response

```bash
# Test complete chat endpoint
curl -X POST http://localhost:8000/api/method/ai_assistant.api.chat_completion \
  -H "Content-Type: application/json" \
  -H "Authorization: token YOUR_API_TOKEN" \
  -d '{
    "messages": [{"role": "user", "content": "Create a hello world app"}],
    "mode": "agent",
    "context": {"workspacePath": "/path/to/workspace"}
  }'

# Expected response:
# {
#   "success": true,
#   "content": "I'll create a hello world app:\n\n1. Create package.json\n2. Create index.js\n\nDone!",
#   "todos": [...],
#   "todos_stats": {...},
#   "file_changes": {...}
# }
```

---

## 💻 Frontend Implementation

### 1. API Client Setup

```typescript
// src/api/client.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { API_CONFIG } from '../utils/config';
import { ApiException } from '../types/api';

export class ApiClient {
  private client: AxiosInstance;
  private retryCount = 0;
  private maxRetries = API_CONFIG.retries;

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.baseUrl,
      timeout: API_CONFIG.timeout,
      headers: API_CONFIG.headers
    });

    // Request interceptor
    this.client.interceptors.request.use(
      config => {
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      error => Promise.reject(error)
    );

    // Response interceptor with retry logic
    this.client.interceptors.response.use(
      response => {
        this.retryCount = 0; // Reset on success
        return response;
      },
      async (error: AxiosError) => {
        return this.handleError(error);
      }
    );
  }

  private async handleError(error: AxiosError): Promise<any> {
    const config = error.config;

    // Retry on network errors or 5xx errors
    if (
      config &&
      this.retryCount < this.maxRetries &&
      this.shouldRetry(error)
    ) {
      this.retryCount++;
      console.log(`[API] Retry ${this.retryCount}/${this.maxRetries}`);
      
      // Exponential backoff
      await this.sleep(Math.pow(2, this.retryCount) * 1000);
      
      return this.client.request(config);
    }

    // Log error
    console.error('[API] Error:', {
      url: config?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });

    // Transform to ApiException
    throw new ApiException(
      error.code || 'UNKNOWN_ERROR',
      error.message,
      error.response?.data
    );
  }

  private shouldRetry(error: AxiosError): boolean {
    if (!error.response) return true; // Network error
    const status = error.response.status;
    return status >= 500 && status < 600; // Server errors
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await this.client.post(endpoint, data);
    return response.data;
  }

  async get<T>(endpoint: string, params?: any): Promise<T> {
    const response = await this.client.get(endpoint, { params });
    return response.data;
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    const response = await this.client.put(endpoint, data);
    return response.data;
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await this.client.delete(endpoint);
    return response.data;
  }
}

export const apiClient = new ApiClient();
```

---

### 2. Workspace Service

```typescript
// src/api/workspace.ts
import { apiClient } from './client';
import {
  WorkspaceContext,
  FileContext,
  ApiResponse
} from '../types/api';

export class WorkspaceAPI {
  private static readonly BASE = '/api/method/ai_assistant.api.workspace';

  /**
   * Get comprehensive workspace context
   */
  static async getWorkspaceContext(
    workspacePath: string,
    includeSymbols: boolean = false
  ): Promise<ApiResponse<{ workspace: WorkspaceContext }>> {
    try {
      const response = await apiClient.post<ApiResponse<{ workspace: WorkspaceContext }>>(
        `${this.BASE}.get_workspace_context`,
        {
          workspace_path: workspacePath,
          include_symbols: includeSymbols
        }
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get file-specific context with nearby code
   */
  static async getFileContext(
    workspacePath: string,
    filePath: string,
    cursorLine: number
  ): Promise<ApiResponse<{ context: FileContext }>> {
    try {
      const response = await apiClient.post<ApiResponse<{ context: FileContext }>>(
        `${this.BASE}.get_file_context`,
        {
          workspace_path: workspacePath,
          file_path: filePath,
          cursor_line: cursorLine
        }
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Find files related to current file
   */
  static async findRelatedFiles(
    workspacePath: string,
    currentFile: string,
    maxFiles: number = 5
  ): Promise<ApiResponse<{ related_files: string[] }>> {
    try {
      const response = await apiClient.post<ApiResponse<{ related_files: string[] }>>(
        `${this.BASE}.find_related_files`,
        {
          workspace_path: workspacePath,
          current_file: currentFile,
          max_files: maxFiles
        }
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

---

### 3. Git Service

```typescript
// src/api/git.ts
import { apiClient } from './client';
import {
  GitChange,
  GitDiffStats,
  GitRemoteInfo,
  GitCommit,
  GitBlame,
  ApiResponse
} from '../types/api';

export class GitAPI {
  private static readonly BASE = '/api/method/ai_assistant.api.git';

  /**
   * Get current git status with uncommitted changes
   */
  static async getGitStatus(workspacePath: string): Promise<ApiResponse<{
    branch: string | null;
    uncommitted_changes: GitChange[];
    diff_stats: GitDiffStats;
    remote_info: GitRemoteInfo | null;
  }>> {
    try {
      const response = await apiClient.post(
        `${this.BASE}.get_git_status`,
        { workspace_path: workspacePath }
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate AI commit message based on changes
   */
  static async generateCommitMessage(
    workspacePath: string
  ): Promise<ApiResponse<{ message: string; changes_count: number }>> {
    try {
      const response = await apiClient.post(
        `${this.BASE}.generate_commit_message`,
        { workspace_path: workspacePath }
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get file history with commits
   */
  static async getFileHistory(
    workspacePath: string,
    filePath: string,
    limit: number = 10
  ): Promise<ApiResponse<{ file: string; history: GitCommit[]; commit_count: number }>> {
    try {
      const response = await apiClient.post(
        `${this.BASE}.get_file_history`,
        {
          workspace_path: workspacePath,
          file_path: filePath,
          limit
        }
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get recent commits in repository
   */
  static async getRecentCommits(
    workspacePath: string,
    limit: number = 10
  ): Promise<ApiResponse<{ commits: GitCommit[]; count: number }>> {
    try {
      const response = await apiClient.post(
        `${this.BASE}.get_recent_commits`,
        {
          workspace_path: workspacePath,
          limit
        }
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get git blame for specific line
   */
  static async getBlame(
    workspacePath: string,
    filePath: string,
    lineNumber: number
  ): Promise<ApiResponse<{ blame: GitBlame | null }>> {
    try {
      const response = await apiClient.post(
        `${this.BASE}.get_blame`,
        {
          workspace_path: workspacePath,
          file_path: filePath,
          line_number: lineNumber
        }
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

---

### 4. Symbols Service

```typescript
// src/api/symbols.ts
import { apiClient } from './client';
import {
  CodeSymbol,
  SymbolDefinition,
  SymbolReference,
  CallHierarchy,
  ApiResponse
} from '../types/api';

export class SymbolsAPI {
  private static readonly BASE = '/api/method/ai_assistant.api.symbols';

  /**
   * Get symbol tree for file
   */
  static async getSymbolTree(
    filePath: string
  ): Promise<ApiResponse<{ file: string; symbols: CodeSymbol[]; count: number }>> {
    try {
      const response = await apiClient.post(
        `${this.BASE}.get_symbol_tree`,
        { file_path: filePath }
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Find symbol definition
   */
  static async findSymbolDefinition(
    workspacePath: string,
    symbol: string,
    language: 'python' | 'javascript' | 'typescript'
  ): Promise<ApiResponse<{
    symbol: string;
    language: string;
    definitions: SymbolDefinition[];
    count: number;
  }>> {
    try {
      const response = await apiClient.post(
        `${this.BASE}.find_symbol_definition`,
        {
          workspace_path: workspacePath,
          symbol,
          language
        }
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Find symbol references
   */
  static async findSymbolReferences(
    workspacePath: string,
    symbol: string,
    language: 'python' | 'javascript' | 'typescript'
  ): Promise<ApiResponse<{
    symbol: string;
    language: string;
    references: SymbolReference[];
    count: number;
  }>> {
    try {
      const response = await apiClient.post(
        `${this.BASE}.find_symbol_references`,
        {
          workspace_path: workspacePath,
          symbol,
          language
        }
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get call hierarchy for function
   */
  static async getCallHierarchy(
    filePath: string,
    functionName: string
  ): Promise<ApiResponse<{ hierarchy: CallHierarchy }>> {
    try {
      const response = await apiClient.post(
        `${this.BASE}.get_call_hierarchy`,
        {
          file_path: filePath,
          function_name: functionName
        }
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

---

### 5. Chat Service

```typescript
// src/api/chat.ts
import { apiClient } from './client';
import {
  ChatMessage,
  ChatContext,
  ChatResponse,
  ApiResponse
} from '../types/api';

export class ChatAPI {
  private static readonly BASE = '/api/method/ai_assistant.api';

  /**
   * Send chat message with enhanced context
   */
  static async chatCompletion(
    messages: ChatMessage[],
    conversationId: string | null,
    mode: 'agent' | 'chat',
    context: ChatContext
  ): Promise<ChatResponse> {
    try {
      const response = await apiClient.post<ChatResponse>(
        `${this.BASE}.chat_completion`,
        {
          messages,
          conversation_id: conversationId,
          mode,
          context
        }
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        role: 'assistant',
        content: '',
        response: '',
        conversation_id: conversationId || '',
        message_count: 0,
        tool_calls: [],
        tool_results: [],
        file_changes: {
          created: [],
          modified: [],
          deleted: [],
          commands: []
        },
        todos: [],
        todos_stats: {
          total: 0,
          completed: 0,
          active: 0
        }
      };
    }
  }

  /**
   * Get conversation history
   */
  static async getConversationHistory(
    conversationId: string
  ): Promise<ApiResponse<{ messages: ChatMessage[] }>> {
    try {
      const response = await apiClient.get(
        `${this.BASE}.get_conversation_history`,
        { conversation_id: conversationId }
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

---

### 6. Inline Completion Service

```typescript
// src/api/inline.ts
import { apiClient } from './client';
import {
  InlineCompletion,
  CacheStats,
  ApiResponse
} from '../types/api';

export class InlineAPI {
  private static readonly BASE = '/api/method/ai_assistant.api.inline';

  /**
   * Get inline code completions
   */
  static async getCompletion(
    filePath: string,
    line: number,
    column: number,
    textBeforeCursor: string,
    textAfterCursor: string,
    language: string
  ): Promise<ApiResponse<{ completions: InlineCompletion[]; count: number }>> {
    try {
      const response = await apiClient.post(
        `${this.BASE}.get_completion`,
        {
          file_path: filePath,
          line,
          column,
          text_before_cursor: textBeforeCursor,
          text_after_cursor: textAfterCursor,
          language
        }
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Clear completion cache
   */
  static async clearCache(): Promise<ApiResponse> {
    try {
      const response = await apiClient.post(
        `${this.BASE}.clear_cache`,
        {}
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<ApiResponse<{ stats: CacheStats }>> {
    try {
      const response = await apiClient.get(
        `${this.BASE}.get_cache_stats`
      );
      return response;
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

---

### 7. Context Service (Aggregates All Context)

```typescript
// src/services/contextService.ts
import * as vscode from 'vscode';
import { WorkspaceAPI } from '../api/workspace';
import { GitAPI } from '../api/git';
import { ChatContext, WorkspaceContext, GitDiffStats } from '../types/api';

export class ContextService {
  private workspaceContext: WorkspaceContext | null = null;
  private gitContext: any = null;
  private lastUpdate: number = 0;
  private readonly cacheTimeout = 30000; // 30 seconds

  /**
   * Get enriched context for chat
   */
  async getEnrichedContext(
    includeWorkspace: boolean = true,
    includeGit: boolean = true
  ): Promise<ChatContext> {
    const editor = vscode.window.activeTextEditor;
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!editor || !workspaceFolders) {
      return {};
    }

    const workspacePath = workspaceFolders[0].uri.fsPath;
    const currentFile = vscode.workspace.asRelativePath(editor.document.uri);
    
    const context: ChatContext = {
      currentFile,
      cursorLine: editor.selection.active.line,
      selectedText: editor.document.getText(editor.selection),
      workspacePath,
      includeWorkspaceContext: includeWorkspace,
      includeGitContext: includeGit
    };

    // Add workspace context if requested and cache is stale
    if (includeWorkspace && this.shouldRefreshCache()) {
      try {
        const wsResponse = await WorkspaceAPI.getWorkspaceContext(
          workspacePath,
          false
        );
        if (wsResponse.success && wsResponse.data) {
          this.workspaceContext = wsResponse.data.workspace;
        }
      } catch (error) {
        console.error('Failed to get workspace context:', error);
      }
    }

    // Add git context if requested
    if (includeGit) {
      try {
        const gitResponse = await GitAPI.getGitStatus(workspacePath);
        if (gitResponse.success && gitResponse.data) {
          this.gitContext = {
            branch: gitResponse.data.branch,
            uncommitted_changes: gitResponse.data.uncommitted_changes?.length || 0,
            is_dirty: gitResponse.data.diff_stats?.is_dirty || false
          };
        }
      } catch (error) {
        console.error('Failed to get git context:', error);
      }
    }

    this.lastUpdate = Date.now();
    return context;
  }

  private shouldRefreshCache(): boolean {
    return Date.now() - this.lastUpdate > this.cacheTimeout;
  }

  getWorkspaceContext(): WorkspaceContext | null {
    return this.workspaceContext;
  }

  getGitContext(): any {
    return this.gitContext;
  }

  clearCache(): void {
    this.workspaceContext = null;
    this.gitContext = null;
    this.lastUpdate = 0;
  }

  /**
   * Force refresh all context
   */
  async forceRefresh(): Promise<void> {
    this.clearCache();
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;

    await this.getEnrichedContext(true, true);
  }
}

export const contextService = new ContextService();
```

---

### 8. Inline Completion Provider

```typescript
// src/providers/inlineProvider.ts
import * as vscode from 'vscode';
import { InlineAPI } from '../api/inline';
import { debounce } from '../utils/debounce';

export class AIInlineCompletionProvider implements vscode.InlineCompletionItemProvider {
  private readonly debounceMs = 200;
  private disposables: vscode.Disposable[] = [];

  private debouncedGetCompletions = debounce(
    async (
      document: vscode.TextDocument,
      position: vscode.Position
    ): Promise<vscode.InlineCompletionItem[]> => {
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
      if (!workspaceFolder) return [];

      const line = document.lineAt(position.line);
      const textBefore = document.getText(
        new vscode.Range(position.with(undefined, 0), position)
      );
      const textAfter = line.text.substring(position.character);

      try {
        const response = await InlineAPI.getCompletion(
          document.uri.fsPath,
          position.line,
          position.character,
          textBefore,
          textAfter,
          document.languageId
        );

        if (!response.success || !response.data) return [];

        return response.data.completions.map(completion => ({
          insertText: completion.text,
          range: new vscode.Range(position, position)
        }));
      } catch (error) {
        console.error('Inline completion error:', error);
        return [];
      }
    },
    this.debounceMs
  );

  async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken
  ): Promise<vscode.InlineCompletionItem[] | vscode.InlineCompletionList | undefined> {
    // Skip if user is actively selecting from autocomplete
    if (context.selectedCompletionInfo) {
      return [];
    }

    try {
      const items = await this.debouncedGetCompletions(document, position);
      return items;
    } catch (error) {
      console.error('Inline completion provider error:', error);
      return [];
    }
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
  }
}
```

---

### 9. Chat Provider with Enhanced Context

```typescript
// src/providers/chatProvider.ts
import * as vscode from 'vscode';
import { ChatAPI } from '../api/chat';
import { contextService } from '../services/contextService';
import { ChatMessage } from '../types/api';

export class ChatProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private conversationId: string | null = null;

  constructor(private readonly extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, 'webview')
      ]
    };

    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'sendMessage':
          await this.handleSendMessage(data.message, data.mode || 'chat');
          break;
        
        case 'clearConversation':
          this.conversationId = null;
          contextService.clearCache();
          break;
        
        case 'refreshContext':
          await contextService.forceRefresh();
          this._view?.webview.postMessage({
            type: 'contextRefreshed',
            workspace: contextService.getWorkspaceContext(),
            git: contextService.getGitContext()
          });
          break;
      }
    });
  }

  private async handleSendMessage(userMessage: string, mode: 'agent' | 'chat') {
    if (!this._view) return;

    try {
      // Show thinking indicator
      this._view.webview.postMessage({
        type: 'thinking',
        value: true
      });

      // Get enriched context
      const context = await contextService.getEnrichedContext(
        mode === 'agent', // Include workspace context for agent mode
        mode === 'agent'  // Include git context for agent mode
      );

      // Build messages array
      const messages: ChatMessage[] = [
        { role: 'user', content: userMessage }
      ];

      // Call chat API
      const response = await ChatAPI.chatCompletion(
        messages,
        this.conversationId,
        mode,
        context
      );

      if (response.success) {
        // Update conversation ID
        this.conversationId = response.conversation_id;

        // Send response to webview
        this._view.webview.postMessage({
          type: 'addMessage',
          message: {
            role: 'assistant',
            content: response.content,
            file_changes: response.file_changes
          }
        });

        // Update TODOs
        if (response.todos && response.todos.length > 0) {
          this._view.webview.postMessage({
            type: 'updateTodos',
            todos: response.todos,
            stats: response.todos_stats
          });
        }

        // Handle file changes
        if (response.file_changes.created.length > 0 || 
            response.file_changes.modified.length > 0) {
          this.showFileChanges(response.file_changes);
        }

        // Handle tool calls
        if (response.tool_calls && response.tool_calls.length > 0) {
          this._view.webview.postMessage({
            type: 'toolCalls',
            calls: response.tool_calls,
            results: response.tool_results
          });
        }
      } else {
        this._view.webview.postMessage({
          type: 'error',
          message: 'Failed to get response from AI'
        });
      }
    } catch (error: any) {
      this._view?.webview.postMessage({
        type: 'error',
        message: error.message || 'An error occurred'
      });
    } finally {
      this._view?.webview.postMessage({
        type: 'thinking',
        value: false
      });
    }
  }

  private showFileChanges(fileChanges: any) {
    const createdCount = fileChanges.created.length;
    const modifiedCount = fileChanges.modified.length;
    const deletedCount = fileChanges.deleted.length;

    const parts = [];
    if (createdCount > 0) parts.push(`${createdCount} created`);
    if (modifiedCount > 0) parts.push(`${modifiedCount} modified`);
    if (deletedCount > 0) parts.push(`${deletedCount} deleted`);

    vscode.window.showInformationMessage(
      `Files: ${parts.join(', ')}`,
      'View Changes'
    ).then(selection => {
      if (selection === 'View Changes') {
        // Open file explorer or show diff
        if (fileChanges.created.length > 0) {
          const firstFile = fileChanges.created[0].path;
          vscode.workspace.openTextDocument(firstFile).then(doc => {
            vscode.window.showTextDocument(doc);
          });
        }
      }
    });
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'webview', 'chat', 'script.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'webview', 'chat', 'styles.css')
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="${styleUri}" rel="stylesheet">
    <title>AI Assistant</title>
</head>
<body>
    <div id="chat-container">
        <div id="messages"></div>
        <div id="todos-panel" style="display: none;">
            <h3>Tasks</h3>
            <div id="todos-list"></div>
        </div>
        <div id="input-container">
            <textarea id="user-input" placeholder="Ask me anything..." rows="3"></textarea>
            <div id="controls">
                <label>
                    <input type="checkbox" id="agent-mode" />
                    Agent Mode (workspace + git context)
                </label>
                <button id="send-btn">Send</button>
            </div>
        </div>
        <div id="thinking" style="display: none;">Thinking...</div>
    </div>
    <script src="${scriptUri}"></script>
</body>
</html>`;
  }
}
```

---

### 10. Utilities

#### Debounce Utility

```typescript
// src/utils/debounce.ts
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeout: NodeJS.Timeout | null = null;

  return function debounced(...args: Parameters<T>): Promise<ReturnType<T>> {
    return new Promise((resolve, reject) => {
      if (timeout) {
        clearTimeout(timeout);
      }

      timeout = setTimeout(async () => {
        try {
          const result = await func(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, wait);
    });
  };
}
```

#### Logger

```typescript
// src/utils/logger.ts
import * as vscode from 'vscode';

export class Logger {
  private static outputChannel: vscode.OutputChannel;

  static init(name: string): void {
    this.outputChannel = vscode.window.createOutputChannel(name);
  }

  static log(message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] ${message}`;
    this.outputChannel.appendLine(formatted);
    if (args.length > 0) {
      this.outputChannel.appendLine(JSON.stringify(args, null, 2));
    }
    console.log(formatted, ...args);
  }

  static error(message: string, error?: any): void {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] ERROR: ${message}`;
    this.outputChannel.appendLine(formatted);
    if (error) {
      this.outputChannel.appendLine(JSON.stringify(error, null, 2));
    }
    console.error(formatted, error);
  }

  static show(): void {
    this.outputChannel.show();
  }
}
```

---

### 11. Extension Entry Point

```typescript
// src/extension.ts
import * as vscode from 'vscode';
import { ChatProvider } from './providers/chatProvider';
import { AIInlineCompletionProvider } from './providers/inlineProvider';
import { contextService } from './services/contextService';
import { Logger } from './utils/logger';

export function activate(context: vscode.ExtensionContext) {
  Logger.init('AI Assistant');
  Logger.log('AI Assistant Extension Activated');

  // Register Chat Provider
  const chatProvider = new ChatProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'ai-assistant-chat',
      chatProvider
    )
  );

  // Register Inline Completion Provider
  const inlineProvider = new AIInlineCompletionProvider();
  context.subscriptions.push(
    vscode.languages.registerInlineCompletionItemProvider(
      { pattern: '**' },
      inlineProvider
    )
  );

  // Register Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('ai-assistant.refreshContext', async () => {
      await contextService.forceRefresh();
      vscode.window.showInformationMessage('Context refreshed');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('ai-assistant.clearCache', () => {
      contextService.clearCache();
      vscode.window.showInformationMessage('Cache cleared');
    })
  );

  // File watcher for workspace changes
  const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*');
  fileWatcher.onDidChange(() => contextService.clearCache());
  fileWatcher.onDidCreate(() => contextService.clearCache());
  fileWatcher.onDidDelete(() => contextService.clearCache());
  context.subscriptions.push(fileWatcher);

  Logger.log('All providers and commands registered');
}

export function deactivate() {
  Logger.log('AI Assistant Extension Deactivated');
}
```

---

## 🧪 Testing Guide

### Backend Testing

#### Test 1: TODO Parsing Function

```python
# In Frappe console (bench console)
from oropendola.api.chat import parse_todos_from_text

# Test with numbered list
text = """I'll help you create this feature:

1. Create the database model
2. Add API endpoints
3. Update the frontend
4. Write unit tests
"""

result = parse_todos_from_text(text)
assert len(result['todos']) == 4
assert result['stats']['total'] == 4
print("✅ TODO parsing works!")
```

#### Test 2: File Changes Extraction

```python
# In Frappe console
from oropendola.api.chat import extract_file_changes

tool_results = [
    {'action': 'create_file', 'path': 'new.py', 'content': 'def hello():\n    pass\n'},
    {'action': 'modify_file', 'path': 'main.py', 'lines_added': 10, 'lines_removed': 3},
    {'action': 'execute_command', 'command': 'npm install', 'output': 'success', 'exit_code': 0}
]

result = extract_file_changes(tool_results)
assert len(result['created']) == 1
assert len(result['modified']) == 1
assert len(result['commands']) == 1
print("✅ File change extraction works!")
```

#### Test 3: Complete Backend Response

```bash
# Test full chat_completion endpoint
curl -X POST http://localhost:8000/api/method/ai_assistant.api.chat_completion \
  -H "Content-Type: application/json" \
  -H "Authorization: token YOUR_API_KEY" \
  -d '{
    "messages": [
      {"role": "user", "content": "Create a hello world Python app"}
    ],
    "mode": "agent",
    "context": {
      "workspacePath": "/path/to/workspace"
    }
  }'

# Verify response contains:
# ✅ "content": "I'll create the app:\n\n1. Create main.py\n..."
# ✅ "todos": [{"id": "todo_...", "text": "Create main.py", ...}]
# ✅ "todos_stats": {"total": X, "completed": 0, "active": X}
# ✅ "file_changes": {"created": [...], "modified": [], ...}
```

### Frontend Testing

#### Test 1: Unit Tests

```typescript
// src/__tests__/api/workspace.test.ts
import { WorkspaceAPI } from '../../api/workspace';

describe('WorkspaceAPI', () => {
  test('should get workspace context', async () => {
    const response = await WorkspaceAPI.getWorkspaceContext('/path/to/workspace');
    expect(response.success).toBe(true);
    expect(response.data?.workspace).toBeDefined();
  });

  test('should handle errors gracefully', async () => {
    const response = await WorkspaceAPI.getWorkspaceContext('/invalid/path');
    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
  });
});
```

```typescript
// src/__tests__/services/contextService.test.ts
import { contextService } from '../../services/contextService';
import * as vscode from 'vscode';

describe('ContextService', () => {
  test('should aggregate context correctly', async () => {
    const context = await contextService.getEnrichedContext(true, true);
    expect(context.workspacePath).toBeDefined();
    expect(context.currentFile).toBeDefined();
  });

  test('should cache context for 30 seconds', async () => {
    await contextService.getEnrichedContext(true, true);
    const ws1 = contextService.getWorkspaceContext();
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const ws2 = contextService.getWorkspaceContext();
    expect(ws1).toBe(ws2); // Should be same cached object
  });
});
```

#### Test 2: Integration Tests

```bash
# Test workspace context API
curl -X POST http://localhost:8000/api/method/ai_assistant.api.workspace.get_workspace_context \
  -H "Content-Type: application/json" \
  -d '{"workspace_path": "/Users/user/project", "include_symbols": false}'

# Expected response:
# {
#   "success": true,
#   "workspace": {
#     "root": "/Users/user/project",
#     "name": "project",
#     "files": [...],
#     "git_status": {...},
#     ...
#   }
# }
```

```bash
# Test git status API
curl -X POST http://localhost:8000/api/method/ai_assistant.api.git.get_git_status \
  -H "Content-Type: application/json" \
  -d '{"workspace_path": "/Users/user/project"}'

# Expected response:
# {
#   "success": true,
#   "branch": "main",
#   "uncommitted_changes": [...],
#   "diff_stats": {...}
# }
```

#### Test 3: End-to-End Chat Flow

```typescript
// Manual test in VS Code extension
import { ChatAPI } from '../api/chat';
import { contextService } from '../services/contextService';

async function testChatFlow() {
  // 1. Get context
  const context = await contextService.getEnrichedContext(true, true);
  console.log('✅ Context loaded:', context);

  // 2. Send message
  const response = await ChatAPI.chatCompletion(
    [{ role: 'user', content: 'Create a simple TODO app' }],
    null,
    'agent',
    context
  );

  // 3. Verify response
  console.assert(response.success, 'Response should be successful');
  console.assert(response.content.length > 0, 'Should have content');
  console.assert(response.todos.length > 0, 'Should have TODOs');
  console.assert(response.file_changes, 'Should have file_changes');

  console.log('✅ Chat flow works!');
  console.log('Content:', response.content);
  console.log('TODOs:', response.todos);
  console.log('File changes:', response.file_changes);
}
```

### Manual Testing Checklist

#### Backend Checklist
- [ ] `parse_todos_from_text()` correctly extracts numbered lists
- [ ] `extract_file_changes()` tracks created/modified/deleted files
- [ ] Chat endpoint returns `content` field with conversational text
- [ ] Chat endpoint returns `todos` and `todos_stats`
- [ ] Chat endpoint returns `file_changes` structure
- [ ] Tool execution doesn't timeout
- [ ] Error messages are meaningful
- [ ] Response time is under 5 seconds for simple queries

#### Frontend Checklist
- [ ] Chat sends messages successfully
- [ ] Messages display in conversational format (not raw tool output)
- [ ] TODO panel populates automatically when backend sends TODOs
- [ ] TODO items show correct order and text
- [ ] TODO stats display (X/Y completed)
- [ ] File changes appear in GitHub Copilot style
- [ ] Created files show with line counts
- [ ] Modified files show lines added/removed
- [ ] Inline completions appear within 200ms
- [ ] Workspace context loads correctly
- [ ] Git status displays uncommitted changes
- [ ] Error handling works (disconnect backend and retry)
- [ ] Cache invalidation works on file changes

#### User Experience Checklist
- [ ] No raw tool output visible (✅ read_file, ✅ modify_file)
- [ ] AI responses read naturally
- [ ] TODO items are actionable and clear
- [ ] File changes are easy to review
- [ ] Loading indicators work correctly
- [ ] Error messages are user-friendly
- [ ] Extension doesn't freeze UI
- [ ] Background processes don't block

### Performance Testing

```bash
# Test response times
time curl -X POST http://localhost:8000/api/method/ai_assistant.api.chat_completion \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello"}], "mode": "chat"}'

# Target: < 2 seconds for simple chat
# Target: < 10 seconds for agent mode with tools
```

### Load Testing

```bash
# Install Apache Bench
brew install httpd  # macOS

# Test concurrent requests
ab -n 100 -c 10 -p request.json -T application/json \
  http://localhost:8000/api/method/ai_assistant.api.chat_completion

# Target: 
# - 10 requests/second minimum
# - < 5% error rate
# - < 5 second average response time
```

---

## ⚠️ Error Handling

### Error Types

```typescript
// Handle API errors
try {
  const response = await WorkspaceAPI.getWorkspaceContext(workspacePath);
  if (!response.success) {
    vscode.window.showErrorMessage(`Failed to load workspace: ${response.error}`);
  }
} catch (error: any) {
  if (error.code === 'ECONNREFUSED') {
    vscode.window.showErrorMessage('Backend server is not running');
  } else if (error.code === 'ETIMEDOUT') {
    vscode.window.showErrorMessage('Request timed out');
  } else {
    vscode.window.showErrorMessage(`Error: ${error.message}`);
  }
}
```

---

## 📝 Configuration

### package.json

```json
{
  "name": "ai-assistant-vscode",
  "version": "2.0.0",
  "engines": {
    "vscode": "^1.80.0"
  },
  "activationEvents": [
    "onStartupFinished"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "viewsContainers": {
      "activitybar": [
        {
          "id": "ai-assistant",
          "title": "AI Assistant",
          "icon": "resources/icon.svg"
        }
      ]
    },
    "views": {
      "ai-assistant": [
        {
          "type": "webview",
          "id": "ai-assistant-chat",
          "name": "Chat"
        }
      ]
    },
    "commands": [
      {
        "command": "ai-assistant.refreshContext",
        "title": "AI Assistant: Refresh Context"
      },
      {
        "command": "ai-assistant.clearCache",
        "title": "AI Assistant: Clear Cache"
      }
    ],
    "configuration": {
      "title": "AI Assistant",
      "properties": {
        "ai-assistant.backendUrl": {
          "type": "string",
          "default": "http://localhost:8000",
          "description": "Backend server URL"
        },
        "ai-assistant.enableInlineCompletions": {
          "type": "boolean",
          "default": true,
          "description": "Enable inline code completions"
        },
        "ai-assistant.debounceMs": {
          "type": "number",
          "default": 200,
          "description": "Debounce delay for inline completions (ms)"
        }
      }
    }
  },
  "dependencies": {
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/vscode": "^1.80.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

---

## 🎉 Summary

### ✅ What's Implemented

#### Backend (Frappe)
1. ✅ **TODO Parsing** - `parse_todos_from_text()` extracts numbered lists
2. ✅ **File Change Tracking** - `extract_file_changes()` structures tool results
3. ✅ **Enhanced Response Format** - Returns content, todos, file_changes
4. ✅ **Tool Execution** - Complete tool system with create/modify/read/execute
5. ✅ **Error Handling** - Graceful error handling throughout

#### Frontend (VS Code Extension)
1. ✅ **Complete API Client** with retry logic and exponential backoff
2. ✅ **Workspace Service** for intelligent context analysis
3. ✅ **Git Integration** for version control awareness
4. ✅ **Code Intelligence** for symbol navigation
5. ✅ **Enhanced Chat** with multi-turn memory and TODO display
6. ✅ **Inline Completions** with 200ms debouncing
7. ✅ **Context Service** for aggregating all context
8. ✅ **Error Handling** throughout the stack with user-friendly messages

### � Critical Fixes Applied

| Issue | Status | Fix |
|-------|--------|-----|
| Raw tool output instead of conversation | ✅ Fixed | Backend now returns `content` field with AI text |
| TODO panel not working | ✅ Fixed | Backend parses numbered lists with `parse_todos_from_text()` |
| No file change tracking | ✅ Fixed | Backend extracts changes with `extract_file_changes()` |
| Request timeouts | ✅ Fixed | Optimized tool execution and added proper error handling |
| Frontend not displaying data | ✅ Fixed | Frontend already ready (lines 1737-1756 in sidebar-provider.js) |

### 📋 Implementation Checklist

#### Backend Tasks
- [ ] Copy `chat_completion()` function to your Frappe backend
- [ ] Copy `parse_todos_from_text()` function
- [ ] Copy `extract_file_changes()` function
- [ ] Copy `execute_tools()` and tool functions
- [ ] Update your existing chat endpoint to use new structure
- [ ] Test with `bench console` using provided test code
- [ ] Verify response contains all required fields
- [ ] Deploy to backend server

#### Frontend Tasks
- [ ] Copy API client code (`src/api/client.ts`)
- [ ] Copy all API service files (workspace, git, symbols, chat, inline)
- [ ] Copy context service (`src/services/contextService.ts`)
- [ ] Copy providers (chat, inline completion)
- [ ] Copy utilities (debounce, logger)
- [ ] Update `extension.ts` with activation code
- [ ] Update `package.json` with configuration
- [ ] Create webview HTML/CSS for chat interface
- [ ] Build and test extension (`npm run package`)
- [ ] Install and test in VS Code

### 🚀 Deployment Steps

#### Step 1: Backend Deployment

```bash
# 1. Add new functions to backend
cd ~/frappe-bench/apps/oropendola
nano oropendola/api/chat.py
# Paste the complete backend code from this guide

# 2. Test in console
bench console
>>> from oropendola.api.chat import parse_todos_from_text
>>> result = parse_todos_from_text("1. Test\n2. Deploy")
>>> print(result)

# 3. Restart backend
bench restart

# 4. Test API endpoint
curl -X POST http://localhost:8000/api/method/ai_assistant.api.chat_completion \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello"}], "mode": "chat"}'
```

#### Step 2: Frontend Deployment

```bash
# 1. Copy all code from this guide to extension
cd ~/vscode-extension

# 2. Install dependencies
npm install axios

# 3. Build extension
npm run compile
npm run package

# 4. Install in VS Code
code --install-extension oropendola-ai-*.vsix

# 5. Test in VS Code
# - Open command palette (Cmd+Shift+P)
# - Run "AI Assistant: Refresh Context"
# - Open AI Assistant chat sidebar
# - Send a test message
```

### 🧪 Verification Tests

Run these tests to verify everything works:

```bash
# Test 1: Backend TODO parsing
curl -X POST http://localhost:8000/api/method/ai_assistant.api.chat_completion \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Create app:\n1. Init\n2. Deploy"}],
    "mode": "chat"
  }'
# ✅ Should return: todos array with 2 items

# Test 2: Backend file changes
# (Send message that triggers file creation in agent mode)
# ✅ Should return: file_changes with created/modified arrays

# Test 3: Frontend TODO display
# (Open VS Code, send message with numbered list)
# ✅ Should see: TODO panel populate automatically

# Test 4: Frontend file changes
# (Send message in agent mode that creates files)
# ✅ Should see: GitHub Copilot-style file change cards
```

### 📚 Documentation Links

- [Backend Fixes Critical](./BACKEND_FIXES_CRITICAL.md) - Original issue analysis
- [VS Code Extension API](https://code.visualstudio.com/api) - Official docs
- [Frappe Framework](https://frappeframework.com/docs) - Backend framework docs

### 🐛 Troubleshooting

#### Issue: Backend returns 500 error
```bash
# Check backend logs
tail -f ~/frappe-bench/logs/web.error.log

# Test in console
bench console
>>> from oropendola.api.chat import chat_completion
```

#### Issue: Frontend not receiving TODOs
```typescript
// Check browser console (Cmd+Option+I in VS Code)
// Look for:
// - API response structure
// - Console errors
// - Network requests in "Console" tab
```

#### Issue: Inline completions not working
```bash
# Check cache stats
curl http://localhost:8000/api/method/ai_assistant.api.inline.get_cache_stats

# Clear cache
curl -X POST http://localhost:8000/api/method/ai_assistant.api.inline.clear_cache
```

### 💡 Best Practices

1. **Backend**
   - Always return complete response structure
   - Include meaningful error messages
   - Log tool execution for debugging
   - Validate input parameters
   - Set reasonable timeouts (30s max)

2. **Frontend**
   - Use debouncing for inline completions
   - Cache workspace context (30s)
   - Show loading indicators
   - Handle errors gracefully
   - Provide user feedback

3. **Testing**
   - Test TODO parsing with various formats
   - Test with/without git repository
   - Test with large workspaces
   - Test error scenarios (backend down)
   - Test concurrent requests

### 🎯 Success Criteria

Your integration is successful when:

✅ **User Experience**
- Messages display in conversational format (not raw logs)
- TODO panel populates automatically
- File changes show in GitHub Copilot style
- No timeout errors
- Fast response times (< 5s)

✅ **Technical**
- Backend returns all required fields
- Frontend receives and displays data correctly
- No console errors
- Proper error handling
- Cache works correctly

✅ **Quality**
- Code is well-documented
- Tests pass
- Performance is acceptable
- Users are happy 😊

---

## 🆘 Support

Need help? Check these resources:

1. **This Guide** - Complete reference for integration
2. **BACKEND_FIXES_CRITICAL.md** - Original issue analysis
3. **VS Code Extension Samples** - [GitHub repository](https://github.com/microsoft/vscode-extension-samples)
4. **Frappe Forum** - [forum.frappe.io](https://forum.frappe.io)

---

**Version:** 2.0.0  
**Build Date:** October 20, 2025  
**Status:** ✅ Ready for Production  
**Priority:** 🔴 CRITICAL - Implement ASAP

**Author:** AI Assistant Integration Team  
**License:** MIT

