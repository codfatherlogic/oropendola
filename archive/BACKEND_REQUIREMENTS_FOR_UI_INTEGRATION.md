# Backend Requirements for Oropendola UI Integration

**Document Purpose**: This document identifies backend API requirements needed to support the planned UI enhancements (Thinking Indicator, Approval Buttons, Todo List, Metrics Display) based on analysis of the Roo-Code codebase.

**Created**: January 2025  
**Target Audience**: Backend Development Team  
**Related Docs**: OROPENDOLA_INTEGRATION_PLAN.md

---

## Executive Summary

The Roo-Code analysis reveals **5 critical backend patterns** that Oropendola's backend must support:

1. **Streaming AI Responses** - Real-time token-by-token updates
2. **Batch File Approval** - Individual file permissions for multi-file operations
3. **Task Metrics Tracking** - Token usage, cache, cost calculation
4. **Todo List Management** - CRUD operations with markdown format
5. **Progress Event System** - WebSocket events for UI state updates

**Current Status**:
- ✅ WebSocket infrastructure exists
- ✅ AI progress events implemented
- ⚠️ **CRITICAL**: Using `gateway.generate()` instead of `gateway.stream_generate()`
- ❌ Batch approval response handling missing
- ❌ Task metrics calculation missing
- ❌ Todo list endpoints missing

---

## 1. Streaming AI Responses (CRITICAL BLOCKER)

### Current Problem
**File**: `ai_assistant/api/__init__.py` ~line 275

```python
# CURRENT (WRONG - Blocks thinking indicator)
response = frappe.client.gateway.generate(
    model=model,
    messages=messages,
    temperature=0.7
)

# Result: Frontend receives complete response at once
# Cannot show thinking indicator, reasoning steps, or real-time progress
```

### Required Implementation
```python
# REQUIRED (Uses streaming)
for chunk in frappe.client.gateway.stream_generate(
    model=model,
    messages=messages,
    temperature=0.7
):
    # Extract token from chunk
    token = chunk.get("choices", [{}])[0].get("delta", {}).get("content", "")
    
    if token:
        # Send real-time update to frontend via WebSocket
        frappe.publish_realtime('ai_progress', {
            'type': 'ai_response_chunk',
            'task_id': task_id,
            'token': token,
            'reasoning': is_reasoning_block(token),  # Detect <thinking> tags
            'timestamp': frappe.utils.now()
        }, user=user)

# After stream completes
frappe.publish_realtime('ai_progress', {
    'type': 'ai_response_complete',
    'task_id': task_id,
    'full_response': accumulated_response
}, user=user)
```

### How Roo-Code Does It
**File**: `src/core/Cline.ts` lines 889-1045

```typescript
// Roo-Code's streaming implementation
const stream = this.api.createMessage(systemPrompt, apiConversationHistory)

for await (const chunk of stream) {
  const delta = JSON.parse(chunk)
  
  if (delta.type === "content_block_start") {
    if (delta.content_block.type === "thinking") {
      // Start thinking block
      isInThinkingBlock = true
      this.sayAndCreateMissingParamMessages("text", "Thinking...")
    } else if (delta.content_block.type === "text") {
      // Start text block
      isInTextBlock = true
    }
  }
  
  if (delta.type === "content_block_delta") {
    if (delta.delta.type === "thinking_delta") {
      // Append thinking content
      currentThinkingContent += delta.delta.thinking
      this.updateThinkingMessage(currentThinkingContent)
    } else if (delta.delta.type === "text_delta") {
      // Append text content
      currentTextContent += delta.delta.text
      this.updateTextMessage(currentTextContent)
    }
  }
  
  if (delta.type === "content_block_stop") {
    // Block complete, move to next
    isInThinkingBlock = false
    isInTextBlock = false
  }
}
```

### Backend Changes Required

**File**: `ai_assistant/api/__init__.py`

1. **Replace `gateway.generate()` with `gateway.stream_generate()`**
   - Line ~275
   - Wrap in `for chunk in` loop
   - Extract tokens from chunk structure

2. **Add token extraction logic**
   ```python
   def extract_token_from_chunk(chunk):
       """Extract content token from streaming chunk"""
       try:
           choices = chunk.get("choices", [])
           if choices:
               delta = choices[0].get("delta", {})
               return delta.get("content", "")
       except Exception as e:
           frappe.log_error(f"Error extracting token: {e}")
       return ""
   ```

3. **Add reasoning detection**
   ```python
   def is_reasoning_token(accumulated_text, new_token):
       """Detect if token is within <thinking> tags"""
       combined = accumulated_text + new_token
       
       # Check if we're inside thinking block
       thinking_start = combined.rfind("<thinking>")
       thinking_end = combined.rfind("</thinking>")
       
       return thinking_start > thinking_end if thinking_start != -1 else False
   ```

4. **Update WebSocket event emission**
   ```python
   accumulated_response = ""
   accumulated_reasoning = ""
   in_thinking_block = False
   
   for chunk in frappe.client.gateway.stream_generate(...):
       token = extract_token_from_chunk(chunk)
       
       if not token:
           continue
       
       # Detect reasoning blocks
       if "<thinking>" in token:
           in_thinking_block = True
       if "</thinking>" in token:
           in_thinking_block = False
       
       # Accumulate
       accumulated_response += token
       if in_thinking_block:
           accumulated_reasoning += token
       
       # Emit real-time update
       frappe.publish_realtime('ai_progress', {
           'type': 'ai_chunk',
           'task_id': task_id,
           'token': token,
           'is_reasoning': in_thinking_block,
           'accumulated': accumulated_response,
           'timestamp': frappe.utils.now()
       }, user=user)
   
   # Final event
   frappe.publish_realtime('ai_progress', {
       'type': 'ai_complete',
       'task_id': task_id,
       'response': accumulated_response,
       'reasoning': accumulated_reasoning
   }, user=user)
   ```

### Testing Streaming
```python
# Test script: test_streaming.py
import frappe

def test_streaming_response():
    """Verify streaming works and emits tokens"""
    
    # Track received chunks
    received_chunks = []
    
    def on_chunk(event):
        received_chunks.append(event)
    
    # Subscribe to events
    frappe.realtime.on('ai_progress', on_chunk)
    
    # Trigger AI request
    response = frappe.call('ai_assistant.api.chat', 
        message="Explain Python decorators",
        task_id="test_streaming"
    )
    
    # Assertions
    assert len(received_chunks) > 1, "Should receive multiple chunks"
    assert any(c['type'] == 'ai_chunk' for c in received_chunks), "Should have chunk events"
    assert received_chunks[-1]['type'] == 'ai_complete', "Should complete"
    
    print(f"✓ Received {len(received_chunks)} streaming chunks")
```

**Priority**: 🔴 **CRITICAL BLOCKER** - Nothing else works without this

---

## 2. Batch File Approval System

### Current Problem
Oropendola likely uses simple yes/no approval for file operations:
```python
# Current approach (assumed)
frappe.publish_realtime('ai_progress', {
    'type': 'ask',
    'ask': 'tool',
    'message': 'Read 5 files?'
})

# User clicks "Approve" or "Deny" - all or nothing
```

**Issue**: User must approve/deny all files together. No granular control.

### Roo-Code's Pattern: Individual File Permissions

**Backend sends batch request**:
```python
# Build batch approval request
batch_files = []
for file_info in files_to_read:
    batch_files.append({
        "key": f"{file_info['path']} lines 1-100",  # Unique identifier
        "path": file_info['path'],
        "lineSnippet": "lines 1-100",
        "isOutsideWorkspace": is_outside_workspace(file_info['path']),
        "content": get_absolute_path(file_info['path'])  # For opening in editor
    })

# Send to frontend
frappe.publish_realtime('ai_progress', {
    'type': 'ask',
    'ask': 'tool',
    'tool': 'readFile',
    'batchFiles': batch_files  # Array of file objects
}, user=user)
```

**Frontend displays list with individual approve/deny**:
```tsx
// BatchFilePermission.tsx
<div>
  {batchFiles.map(file => (
    <div key={file.key}>
      <span>{file.path} {file.lineSnippet}</span>
      <input 
        type="checkbox" 
        checked={permissions[file.key]} 
        onChange={(e) => setPermissions({
          ...permissions,
          [file.key]: e.target.checked
        })}
      />
    </div>
  ))}
  <button onClick={() => {
    // Send response with individual permissions
    vscode.postMessage({
      type: "askResponse",
      text: JSON.stringify(permissions)
      // Example: {"src/file1.ts lines 1-100": true, "config.json": false}
    })
  }}>Submit</button>
</div>
```

**Backend receives and processes**:
```python
# Receive approval response
approval_response = get_approval_response(task_id)
# approval_response = '{"src/file1.ts lines 1-100": true, "config.json": false}'

# Parse individual permissions
individual_permissions = json.loads(approval_response)

# Process only approved files
results = []
for file_info in batch_files:
    file_key = f"{file_info['path']} {file_info.get('lineSnippet', '')}"
    
    if individual_permissions.get(file_key) == True:
        # User approved - read file
        content = read_file(file_info['path'])
        results.append({
            "path": file_info['path'],
            "content": content,
            "status": "approved"
        })
    else:
        # User denied - skip
        results.append({
            "path": file_info['path'],
            "status": "denied"
        })

return results
```

### Required Backend Changes

**File**: `ai_assistant/tools/read_file.py` (or equivalent)

1. **Create batch approval helper**
   ```python
   def request_batch_file_approval(task_id, files, user):
       """
       Request approval for multiple files with individual permissions
       
       Args:
           task_id: Current task identifier
           files: List of {"path": str, "lineRanges": [{"start": int, "end": int}]}
           user: Current user
       
       Returns:
           dict: {file_key: bool} - Individual permissions
       """
       batch_files = []
       
       for file_info in files:
           path = file_info["path"]
           line_ranges = file_info.get("lineRanges", [])
           
           # Create readable line snippet
           line_snippet = ""
           if line_ranges:
               snippets = [
                   f"lines {r['start']}-{r['end']}" 
                   for r in line_ranges
               ]
               line_snippet = ", ".join(snippets)
           
           # Create unique key
           file_key = f"{path}{' ' + line_snippet if line_snippet else ''}"
           
           batch_files.append({
               "key": file_key,
               "path": path,
               "lineSnippet": line_snippet,
               "isOutsideWorkspace": not is_in_workspace(path),
               "content": get_absolute_path(path)  # For editor link
           })
       
       # Send to frontend
       frappe.publish_realtime('ai_progress', {
           'type': 'ask',
           'ask': 'tool',
           'tool': 'readFile',
           'batchFiles': batch_files
       }, user=user)
       
       # Wait for response
       response = wait_for_approval_response(task_id, timeout=300)
       
       # Parse JSON response
       try:
           individual_permissions = json.loads(response.get('text', '{}'))
           return individual_permissions
       except json.JSONDecodeError:
           frappe.log_error("Invalid batch approval response")
           return {}
   ```

2. **Update read_file tool to use batch approval**
   ```python
   def read_file(task_id, paths, user):
       """
       Read one or more files with approval
       
       Args:
           task_id: Current task ID
           paths: str or list of {"path": str, "lineRanges": [...]}
           user: Current user
       
       Returns:
           list: File contents or errors
       """
       # Normalize to list
       if isinstance(paths, str):
           files = [{"path": paths}]
       elif isinstance(paths, list):
           files = paths
       else:
           raise ValueError("Invalid paths format")
       
       # Batch approval for multiple files
       if len(files) > 1:
           permissions = request_batch_file_approval(task_id, files, user)
           
           results = []
           for file_info in files:
               file_key = create_file_key(file_info)
               
               if permissions.get(file_key) == True:
                   # Approved - read content
                   content = read_file_content(
                       file_info["path"],
                       file_info.get("lineRanges")
                   )
                   results.append({
                       "path": file_info["path"],
                       "content": content,
                       "status": "success"
                   })
               else:
                   # Denied - skip
                   results.append({
                       "path": file_info["path"],
                       "status": "denied",
                       "error": "User denied access"
                   })
           
           return results
       else:
           # Single file - existing approval flow
           return read_single_file(files[0], task_id, user)
   ```

3. **Add similar batch approval for write operations**
   ```python
   def request_batch_diff_approval(task_id, diffs, user):
       """
       Request approval for multiple file diffs
       
       Args:
           task_id: Current task ID
           diffs: List of {"path": str, "changes": [...]}
           user: Current user
       
       Returns:
           dict: {file_key: bool}
       """
       batch_diffs = []
       
       for diff_info in diffs:
           path = diff_info["path"]
           changes = diff_info.get("changes", [])
           change_count = len(changes)
           
           # Create key with change count
           change_text = f"{change_count} change" if change_count == 1 else f"{change_count} changes"
           file_key = f"{path} ({change_text})"
           
           # Combine all diffs
           combined_diff = "\n".join([
               c.get("content", "") for c in changes
           ])
           
           batch_diffs.append({
               "key": file_key,
               "path": path,
               "changeCount": change_count,
               "content": combined_diff,
               "diffs": changes
           })
       
       # Send to frontend
       frappe.publish_realtime('ai_progress', {
           'type': 'ask',
           'ask': 'tool',
           'tool': 'applyDiff',
           'batchDiffs': batch_diffs
       }, user=user)
       
       # Wait for response
       response = wait_for_approval_response(task_id, timeout=300)
       
       try:
           return json.loads(response.get('text', '{}'))
       except json.JSONDecodeError:
           return {}
   ```

### Testing Batch Approval
```python
# test_batch_approval.py
def test_batch_file_approval():
    """Test batch file approval with individual permissions"""
    
    # Simulate frontend response
    mock_response = {
        "src/file1.ts lines 1-100": True,
        "src/file2.ts": False,
        "config.json": True
    }
    
    # Mock WebSocket response
    frappe.test.mock_realtime_response(json.dumps(mock_response))
    
    # Request batch approval
    files = [
        {"path": "src/file1.ts", "lineRanges": [{"start": 1, "end": 100}]},
        {"path": "src/file2.ts"},
        {"path": "config.json"}
    ]
    
    results = read_file(task_id="test", paths=files, user="test@example.com")
    
    # Assertions
    assert results[0]["status"] == "success", "File 1 should be approved"
    assert results[1]["status"] == "denied", "File 2 should be denied"
    assert results[2]["status"] == "success", "Config should be approved"
    
    print("✓ Batch approval working correctly")
```

**Priority**: 🟡 **HIGH** - Major UX improvement over all-or-nothing approval

---

## 3. Task Metrics Tracking

### Requirement
Frontend needs to display:
- **Token Usage**: Input tokens (↑1.2K), Output tokens (↓800)
- **Cache Usage**: Cache writes (↑500), Cache reads (↓100)
- **API Cost**: Total cost in dollars ($0.05)
- **Context Usage**: Current context tokens vs. limit

### How Roo-Code Tracks Metrics

**Backend stores in message history**:
```typescript
// Every API request stores metrics
{
  type: "api_req_started",
  text: JSON.stringify({
    request: {...},
    tokensIn: 1234,
    tokensOut: 856,
    cacheWrites: 500,
    cacheReads: 100,
    cost: 0.023
  })
}
```

**Frontend calculates totals**:
```typescript
// getApiMetrics.ts
export function getApiMetrics(messages: ClineMessage[]) {
  let totalTokensIn = 0
  let totalTokensOut = 0
  let totalCacheWrites = 0
  let totalCacheReads = 0
  let totalCost = 0
  let contextTokens = 0
  
  messages.forEach(msg => {
    if (msg.type === "api_req_started" || msg.type === "condense_context") {
      try {
        const data = JSON.parse(msg.text || "{}")
        totalTokensIn += data.tokensIn || 0
        totalTokensOut += data.tokensOut || 0
        totalCacheWrites += data.cacheWrites || 0
        totalCacheReads += data.cacheReads || 0
        totalCost += data.cost || 0
        
        // Last request's context tokens
        if (msg.type === "api_req_started") {
          contextTokens = data.tokensIn || 0
        }
      } catch (e) {
        // Skip invalid JSON
      }
    }
  })
  
  return {
    totalTokensIn,
    totalTokensOut,
    totalCacheWrites,
    totalCacheReads,
    totalCost,
    contextTokens
  }
}
```

**Frontend displays in TaskHeader**:
```tsx
// TaskHeader.tsx
const metrics = getApiMetrics(messages)

<div className="metrics">
  <span>↑ {formatNumber(metrics.totalTokensIn)}</span>
  <span>↓ {formatNumber(metrics.totalTokensOut)}</span>
  <span className="cache">↑ {formatNumber(metrics.totalCacheWrites)}</span>
  <span className="cache">↓ {formatNumber(metrics.totalCacheReads)}</span>
  <span className="cost">${metrics.totalCost.toFixed(3)}</span>
</div>
```

### Required Backend Changes

**File**: `ai_assistant/api/__init__.py`

1. **Track metrics for each API request**
   ```python
   def calculate_request_cost(model, tokens_in, tokens_out, cache_writes=0, cache_reads=0):
       """
       Calculate cost for API request
       
       Returns:
           float: Cost in dollars
       """
       # Pricing per model (example - adjust to actual)
       pricing = {
           "gpt-4": {
               "input": 0.03 / 1000,   # $0.03 per 1K tokens
               "output": 0.06 / 1000,  # $0.06 per 1K tokens
               "cache_write": 0.015 / 1000,
               "cache_read": 0.0015 / 1000
           },
           "gpt-3.5-turbo": {
               "input": 0.0015 / 1000,
               "output": 0.002 / 1000,
               "cache_write": 0.00075 / 1000,
               "cache_read": 0.000075 / 1000
           }
       }
       
       rates = pricing.get(model, pricing["gpt-4"])
       
       cost = (
           tokens_in * rates["input"] +
           tokens_out * rates["output"] +
           cache_writes * rates["cache_write"] +
           cache_reads * rates["cache_read"]
       )
       
       return round(cost, 5)
   ```

2. **Store metrics with each message**
   ```python
   # After API request completes
   response_data = frappe.client.gateway.generate(...)
   
   # Extract usage data
   usage = response_data.get("usage", {})
   tokens_in = usage.get("prompt_tokens", 0)
   tokens_out = usage.get("completion_tokens", 0)
   cache_writes = usage.get("prompt_tokens_details", {}).get("cached_tokens", 0)
   cache_reads = usage.get("prompt_tokens_details", {}).get("cache_read_tokens", 0)
   
   # Calculate cost
   cost = calculate_request_cost(
       model=model,
       tokens_in=tokens_in,
       tokens_out=tokens_out,
       cache_writes=cache_writes,
       cache_reads=cache_reads
   )
   
   # Store in message
   message_doc = frappe.get_doc({
       "doctype": "AI Chat Message",
       "task_id": task_id,
       "type": "api_req_started",
       "text": json.dumps({
           "request": request_params,
           "tokensIn": tokens_in,
           "tokensOut": tokens_out,
           "cacheWrites": cache_writes,
           "cacheReads": cache_reads,
           "cost": cost,
           "model": model,
           "timestamp": frappe.utils.now()
       })
   })
   message_doc.insert()
   
   # Also emit real-time
   frappe.publish_realtime('ai_progress', {
       'type': 'metrics_update',
       'task_id': task_id,
       'metrics': {
           'tokensIn': tokens_in,
           'tokensOut': tokens_out,
           'cacheWrites': cache_writes,
           'cacheReads': cache_reads,
           'cost': cost
       }
   }, user=user)
   ```

3. **Add endpoint to fetch task metrics**
   ```python
   @frappe.whitelist()
   def get_task_metrics(task_id):
       """
       Get aggregated metrics for a task
       
       Returns:
           dict: {
               totalTokensIn, totalTokensOut,
               totalCacheWrites, totalCacheReads,
               totalCost, contextTokens
           }
       """
       messages = frappe.get_all(
           "AI Chat Message",
           filters={"task_id": task_id},
           fields=["type", "text"],
           order_by="creation asc"
       )
       
       total_tokens_in = 0
       total_tokens_out = 0
       total_cache_writes = 0
       total_cache_reads = 0
       total_cost = 0
       context_tokens = 0
       
       for msg in messages:
           if msg.type in ["api_req_started", "condense_context"]:
               try:
                   data = json.loads(msg.text or "{}")
                   total_tokens_in += data.get("tokensIn", 0)
                   total_tokens_out += data.get("tokensOut", 0)
                   total_cache_writes += data.get("cacheWrites", 0)
                   total_cache_reads += data.get("cacheReads", 0)
                   total_cost += data.get("cost", 0)
                   
                   if msg.type == "api_req_started":
                       context_tokens = data.get("tokensIn", 0)
               except json.JSONDecodeError:
                   pass
       
       return {
           "totalTokensIn": total_tokens_in,
           "totalTokensOut": total_tokens_out,
           "totalCacheWrites": total_cache_writes,
           "totalCacheReads": total_cache_reads,
           "totalCost": round(total_cost, 3),
           "contextTokens": context_tokens
       }
   ```

### Testing Metrics
```python
# test_metrics.py
def test_task_metrics_tracking():
    """Test metrics are tracked and calculated correctly"""
    
    # Create task
    task_id = create_test_task()
    
    # Simulate API request
    simulate_api_request(task_id, tokens_in=1000, tokens_out=500)
    simulate_api_request(task_id, tokens_in=800, tokens_out=300)
    
    # Fetch metrics
    metrics = frappe.call('ai_assistant.api.get_task_metrics', task_id=task_id)
    
    # Assertions
    assert metrics['totalTokensIn'] == 1800, "Should sum input tokens"
    assert metrics['totalTokensOut'] == 800, "Should sum output tokens"
    assert metrics['totalCost'] > 0, "Should calculate cost"
    
    print(f"✓ Metrics tracking works: {metrics}")
```

**Priority**: 🟡 **HIGH** - Important for cost visibility

---

## 4. Todo List Management

### Requirement
Frontend needs to:
- Display task checklist with status indicators
- Allow editing todos inline
- Support pending/in_progress/completed states

### Roo-Code's Todo Format

**Markdown Representation**:
```markdown
- [ ] Task not started
- [-] Task in progress
- [x] Task completed
```

**Internal Format**:
```typescript
interface TodoItem {
  id: number
  content: string
  status: "" | "in_progress" | "completed"  // "" = pending
}
```

**Storage in Task**:
```typescript
class Task {
  todoList: TodoItem[] = []
  
  addTodo(content: string, status: string = "", id?: number) {
    const todo: TodoItem = {
      id: id || Date.now(),
      content,
      status: status === "in_progress" ? "in_progress" : 
              status === "completed" ? "completed" : ""
    }
    this.todoList.push(todo)
    this.save()
  }
  
  updateTodoStatus(id: number, nextStatus: string) {
    const todo = this.todoList.find(t => t.id === id)
    if (todo) {
      todo.status = nextStatus
      this.save()
    }
  }
  
  removeTodo(id: number) {
    this.todoList = this.todoList.filter(t => t.id !== id)
    this.save()
  }
}
```

### Required Backend Changes

**Create new file**: `ai_assistant/api/todos.py`

```python
import frappe
import json

@frappe.whitelist()
def get_todos(task_id):
    """
    Get todo list for task
    
    Returns:
        list: [{"id": int, "content": str, "status": str}]
    """
    task = frappe.get_doc("AI Task", task_id)
    
    # Parse stored todos (JSON field)
    try:
        todos = json.loads(task.todo_list or "[]")
        return todos
    except json.JSONDecodeError:
        return []

@frappe.whitelist()
def add_todo(task_id, content, status="", todo_id=None):
    """
    Add todo to task
    
    Args:
        task_id: Task identifier
        content: Todo text
        status: "" | "in_progress" | "completed"
        todo_id: Optional custom ID
    
    Returns:
        dict: Created todo
    """
    task = frappe.get_doc("AI Task", task_id)
    
    # Parse existing todos
    todos = json.loads(task.todo_list or "[]")
    
    # Create new todo
    new_todo = {
        "id": todo_id or frappe.utils.now_datetime().timestamp(),
        "content": content,
        "status": status if status in ["in_progress", "completed"] else ""
    }
    
    todos.append(new_todo)
    
    # Save
    task.todo_list = json.dumps(todos)
    task.save()
    
    # Emit real-time update
    frappe.publish_realtime('ai_progress', {
        'type': 'todo_added',
        'task_id': task_id,
        'todo': new_todo
    }, user=frappe.session.user)
    
    return new_todo

@frappe.whitelist()
def update_todo_status(task_id, todo_id, next_status):
    """
    Update todo status
    
    Args:
        task_id: Task identifier
        todo_id: Todo ID
        next_status: "" | "in_progress" | "completed"
    """
    task = frappe.get_doc("AI Task", task_id)
    todos = json.loads(task.todo_list or "[]")
    
    # Find and update
    for todo in todos:
        if todo["id"] == todo_id:
            todo["status"] = next_status
            break
    
    # Save
    task.todo_list = json.dumps(todos)
    task.save()
    
    # Emit update
    frappe.publish_realtime('ai_progress', {
        'type': 'todo_updated',
        'task_id': task_id,
        'todo_id': todo_id,
        'status': next_status
    }, user=frappe.session.user)

@frappe.whitelist()
def remove_todo(task_id, todo_id):
    """Remove todo from task"""
    task = frappe.get_doc("AI Task", task_id)
    todos = json.loads(task.todo_list or "[]")
    
    # Filter out deleted
    todos = [t for t in todos if t["id"] != todo_id]
    
    # Save
    task.todo_list = json.dumps(todos)
    task.save()
    
    # Emit update
    frappe.publish_realtime('ai_progress', {
        'type': 'todo_removed',
        'task_id': task_id,
        'todo_id': todo_id
    }, user=frappe.session.user)

@frappe.whitelist()
def parse_markdown_checklist(markdown_text):
    """
    Parse markdown checklist into todo items
    
    Args:
        markdown_text: Text with - [ ] / - [-] / - [x] format
    
    Returns:
        list: TodoItem objects
    """
    import re
    
    todos = []
    lines = markdown_text.split('\n')
    
    for line in lines:
        # Match - [ ] Task text
        match = re.match(r'^-\s*\[([x\-\s])\]\s*(.+)$', line.strip())
        
        if match:
            checkbox, content = match.groups()
            
            # Determine status
            if checkbox.strip() == 'x':
                status = "completed"
            elif checkbox.strip() == '-':
                status = "in_progress"
            else:
                status = ""
            
            todos.append({
                "id": frappe.utils.now_datetime().timestamp(),
                "content": content.strip(),
                "status": status
            })
    
    return todos
```

**Add to DocType**: `AI Task`
```json
{
  "fields": [
    {
      "fieldname": "todo_list",
      "fieldtype": "Long Text",
      "label": "Todo List (JSON)"
    }
  ]
}
```

### Testing Todos
```python
# test_todos.py
def test_todo_management():
    """Test todo CRUD operations"""
    
    # Create task
    task_id = create_test_task()
    
    # Add todos
    todo1 = frappe.call('ai_assistant.api.todos.add_todo',
        task_id=task_id,
        content="Analyze codebase",
        status="in_progress"
    )
    
    todo2 = frappe.call('ai_assistant.api.todos.add_todo',
        task_id=task_id,
        content="Write documentation",
        status=""
    )
    
    # Fetch all
    todos = frappe.call('ai_assistant.api.todos.get_todos', task_id=task_id)
    assert len(todos) == 2, "Should have 2 todos"
    
    # Update status
    frappe.call('ai_assistant.api.todos.update_todo_status',
        task_id=task_id,
        todo_id=todo2['id'],
        next_status="completed"
    )
    
    # Verify update
    todos = frappe.call('ai_assistant.api.todos.get_todos', task_id=task_id)
    updated = next(t for t in todos if t['id'] == todo2['id'])
    assert updated['status'] == "completed", "Status should be updated"
    
    # Remove todo
    frappe.call('ai_assistant.api.todos.remove_todo',
        task_id=task_id,
        todo_id=todo1['id']
    )
    
    # Verify removal
    todos = frappe.call('ai_assistant.api.todos.get_todos', task_id=task_id)
    assert len(todos) == 1, "Should have 1 todo remaining"
    
    print("✓ Todo management working")
```

**Priority**: 🟢 **MEDIUM** - Nice to have, not critical

---

## 5. Progress Event System

### Requirement
Frontend needs real-time updates for:
- AI thinking progress
- Tool execution status
- File operation results
- Error notifications

### Roo-Code's Event Types

**Message Types**:
```typescript
type ClineMessage = 
  | { type: "text", text: string }
  | { type: "thinking", text: string }
  | { type: "tool_use", tool: string, params: any }
  | { type: "tool_result", result: any, success: boolean }
  | { type: "ask", ask: "tool" | "followup", message: string }
  | { type: "error", error: string }
  | { type: "api_req_started", metrics: {...} }
```

**Say Functions**:
```typescript
// Roo-Code's message emission
class Cline {
  say(type: ClineMessage["type"], text: string, images?: string[]) {
    const message: ClineMessage = {
      ts: Date.now(),
      type,
      text,
      images
    }
    
    // Store in history
    this.clineMessages.push(message)
    
    // Emit to UI
    this.providerRef.deref()?.postMessageToWebview({
      type: "clineMessage",
      message
    })
  }
  
  sayThinking(text: string) {
    this.say("thinking", text)
  }
  
  sayTool(tool: string, params: any) {
    this.say("tool_use", JSON.stringify({ tool, params }))
  }
}
```

### Required Backend Changes

**File**: `ai_assistant/api/__init__.py`

1. **Add progress event helpers**
   ```python
   def emit_progress(task_id, event_type, data, user):
       """
       Emit progress event to frontend
       
       Args:
           task_id: Current task ID
           event_type: Event type identifier
           data: Event-specific data
           user: Target user
       """
       frappe.publish_realtime('ai_progress', {
           'type': event_type,
           'task_id': task_id,
           'data': data,
           'timestamp': frappe.utils.now()
       }, user=user)
   
   def emit_thinking(task_id, text, user):
       """Emit thinking/reasoning text"""
       emit_progress(task_id, 'thinking', {'text': text}, user)
   
   def emit_tool_use(task_id, tool_name, params, user):
       """Emit tool execution start"""
       emit_progress(task_id, 'tool_use', {
           'tool': tool_name,
           'params': params
       }, user)
   
   def emit_tool_result(task_id, tool_name, result, success, user):
       """Emit tool execution result"""
       emit_progress(task_id, 'tool_result', {
           'tool': tool_name,
           'result': result,
           'success': success
       }, user)
   
   def emit_error(task_id, error_message, user):
       """Emit error notification"""
       emit_progress(task_id, 'error', {
           'error': error_message
       }, user)
   ```

2. **Update tool execution to emit events**
   ```python
   # Example: read_file tool
   def read_file_with_events(task_id, paths, user):
       """Read file(s) with progress events"""
       
       # Emit start
       emit_tool_use(task_id, 'read_file', {'paths': paths}, user)
       
       try:
           # Execute
           results = read_file(task_id, paths, user)
           
           # Emit success
           emit_tool_result(task_id, 'read_file', results, True, user)
           
           return results
       except Exception as e:
           # Emit error
           emit_tool_result(task_id, 'read_file', str(e), False, user)
           emit_error(task_id, f"Failed to read files: {str(e)}", user)
           raise
   ```

3. **Add message storage**
   ```python
   def store_message(task_id, msg_type, text, images=None):
       """
       Store message in task history
       
       Args:
           task_id: Task identifier
           msg_type: Message type (text, thinking, tool_use, etc.)
           text: Message content
           images: Optional image URLs
       """
       message_doc = frappe.get_doc({
           "doctype": "AI Chat Message",
           "task_id": task_id,
           "type": msg_type,
           "text": text,
           "images": json.dumps(images or []),
           "timestamp": frappe.utils.now()
       })
       message_doc.insert()
       
       return message_doc.name
   ```

### Testing Events
```python
# test_events.py
def test_progress_events():
    """Test progress event emission"""
    
    received_events = []
    
    def on_event(event):
        received_events.append(event)
    
    # Subscribe
    frappe.realtime.on('ai_progress', on_event)
    
    # Trigger events
    task_id = "test_task"
    emit_thinking(task_id, "Analyzing code...", "test@example.com")
    emit_tool_use(task_id, "read_file", {"path": "test.py"}, "test@example.com")
    emit_tool_result(task_id, "read_file", "Content here", True, "test@example.com")
    
    # Assertions
    assert len(received_events) == 3, "Should emit 3 events"
    assert received_events[0]['type'] == 'thinking', "First should be thinking"
    assert received_events[1]['type'] == 'tool_use', "Second should be tool_use"
    assert received_events[2]['type'] == 'tool_result', "Third should be tool_result"
    
    print("✓ Progress events working")
```

**Priority**: 🟡 **HIGH** - Essential for real-time UI updates

---

## 6. Summary: Implementation Checklist

### Critical Path (Must Complete First)
- [ ] **Streaming AI Responses** - Replace `gateway.generate()` with `gateway.stream_generate()`
  - Location: `ai_assistant/api/__init__.py` line ~275
  - Add token extraction and WebSocket emission
  - Test with `test_streaming_response()`
  - **BLOCKS**: Thinking indicator, real-time progress

### High Priority (Complete Next)
- [ ] **Batch File Approval** - Individual file permissions
  - Create `request_batch_file_approval()` helper
  - Update `read_file()` to support batch approval
  - Create `request_batch_diff_approval()` for writes
  - Test with `test_batch_file_approval()`
  - **ENABLES**: Better UX for multi-file operations

- [ ] **Task Metrics Tracking** - Token usage, cost calculation
  - Add `calculate_request_cost()` function
  - Store metrics in message history
  - Create `get_task_metrics()` endpoint
  - Test with `test_task_metrics_tracking()`
  - **ENABLES**: Cost visibility in frontend

- [ ] **Progress Event System** - Real-time UI updates
  - Create event emission helpers (`emit_thinking`, `emit_tool_use`, etc.)
  - Update tools to emit events
  - Add message storage
  - Test with `test_progress_events()`
  - **ENABLES**: Real-time feedback to user

### Medium Priority (Nice to Have)
- [ ] **Todo List Management** - Task checklist CRUD
  - Create `ai_assistant/api/todos.py`
  - Add `todo_list` field to AI Task doctype
  - Implement `get_todos`, `add_todo`, `update_todo_status`, `remove_todo`
  - Add markdown parser
  - Test with `test_todo_management()`
  - **ENABLES**: Task tracking UI

---

## 7. Frontend Integration Points

Once backend changes are complete, frontend will need:

### WebSocket Event Handlers
```typescript
// In extension.js or WebSocket handler
socket.on('ai_progress', (event) => {
  switch (event.type) {
    case 'ai_chunk':
      // Append token to reasoning block
      conversationTask.appendReasoningToken(event.token, event.is_reasoning)
      break
    
    case 'ai_complete':
      // Mark reasoning complete
      conversationTask.completeReasoning(event.response)
      break
    
    case 'ask':
      // Show approval UI
      if (event.tool === 'readFile' && event.batchFiles) {
        // Show batch file approval
        showBatchFileApproval(event.batchFiles)
      } else {
        // Show simple approval
        showApprovalButtons(event.message)
      }
      break
    
    case 'metrics_update':
      // Update task metrics display
      updateTaskMetrics(event.metrics)
      break
    
    case 'todo_added':
    case 'todo_updated':
    case 'todo_removed':
      // Update todo list
      updateTodoList(event.task_id)
      break
    
    case 'error':
      // Show error notification
      showError(event.data.error)
      break
  }
})
```

### API Calls
```typescript
// Fetch task metrics
const metrics = await vscode.postMessage({
  type: 'apiRequest',
  method: 'ai_assistant.api.get_task_metrics',
  args: { task_id: currentTaskId }
})

// Add todo
await vscode.postMessage({
  type: 'apiRequest',
  method: 'ai_assistant.api.todos.add_todo',
  args: {
    task_id: currentTaskId,
    content: "Implement feature X",
    status: "in_progress"
  }
})

// Send batch approval response
vscode.postMessage({
  type: 'askResponse',
  text: JSON.stringify({
    "src/file1.ts": true,
    "src/file2.ts": false,
    "config.json": true
  })
})
```

---

## 8. Testing Strategy

### Unit Tests
```python
# Run individual component tests
bench run-tests ai_assistant.tests.test_streaming
bench run-tests ai_assistant.tests.test_batch_approval
bench run-tests ai_assistant.tests.test_metrics
bench run-tests ai_assistant.tests.test_todos
bench run-tests ai_assistant.tests.test_events
```

### Integration Tests
```python
# test_integration.py
def test_full_ai_workflow():
    """Test complete AI workflow with all features"""
    
    # 1. Create task
    task_id = create_task()
    
    # 2. Send message (triggers streaming)
    send_message(task_id, "Read 3 files and summarize")
    
    # 3. Verify streaming events received
    events = get_task_events(task_id)
    assert any(e['type'] == 'ai_chunk' for e in events)
    
    # 4. Verify batch approval requested
    assert any(e['type'] == 'ask' and 'batchFiles' in e for e in events)
    
    # 5. Send approval response
    send_batch_approval(task_id, {
        "file1.ts": True,
        "file2.ts": False,
        "file3.ts": True
    })
    
    # 6. Verify only approved files processed
    results = get_task_results(task_id)
    assert "file1.ts" in results
    assert "file2.ts" not in results
    assert "file3.ts" in results
    
    # 7. Verify metrics tracked
    metrics = get_task_metrics(task_id)
    assert metrics['totalTokensIn'] > 0
    assert metrics['totalCost'] > 0
    
    print("✓ Full workflow works end-to-end")
```

### Manual Testing Checklist
- [ ] Start AI task, verify streaming tokens appear in real-time
- [ ] Request to read 3 files, verify individual approval UI
- [ ] Approve 2 files, deny 1, verify only approved are read
- [ ] Check task header, verify metrics display correctly
- [ ] Add/edit/delete todos, verify state updates
- [ ] Trigger error, verify error notification appears

---

## 9. Migration Guide

### Phase 1: Streaming (Week 1)
**Goal**: Enable real-time AI responses

**Steps**:
1. Backup current `ai_assistant/api/__init__.py`
2. Replace `gateway.generate()` with streaming implementation
3. Add token extraction logic
4. Add WebSocket event emission
5. Test with simple prompt: "Explain Python decorators"
6. Verify tokens appear one by one in frontend

**Rollback Plan**: Restore backup file if issues occur

### Phase 2: Batch Approval (Week 2)
**Goal**: Individual file permissions

**Steps**:
1. Create `request_batch_file_approval()` helper
2. Update `read_file()` to check file count
3. If >1 file, use batch approval
4. Test with prompt: "Read src/file1.ts, src/file2.ts, config.json"
5. Verify UI shows 3 files with individual checkboxes

**Rollback Plan**: Feature flag `enable_batch_approval` defaults to False

### Phase 3: Metrics & Events (Week 3)
**Goal**: Cost tracking and real-time updates

**Steps**:
1. Add `calculate_request_cost()` function
2. Store metrics in each API request
3. Create `get_task_metrics()` endpoint
4. Add progress event helpers
5. Update tools to emit events
6. Test with various prompts, verify metrics accuracy

**Rollback Plan**: Metrics are optional, can disable without breaking core functionality

### Phase 4: Todo List (Week 4)
**Goal**: Task tracking UI

**Steps**:
1. Add `todo_list` field to AI Task doctype
2. Create `ai_assistant/api/todos.py`
3. Implement CRUD endpoints
4. Test with frontend integration
5. Verify todos persist across sessions

**Rollback Plan**: Todo list is purely additive, can be disabled

---

## 10. Performance Considerations

### Streaming Response Size
**Issue**: Large responses may flood WebSocket

**Solution**: Batch tokens
```python
token_buffer = []
buffer_size = 10  # Send every 10 tokens

for chunk in stream:
    token = extract_token(chunk)
    token_buffer.append(token)
    
    if len(token_buffer) >= buffer_size:
        # Send batch
        frappe.publish_realtime('ai_progress', {
            'type': 'ai_chunk',
            'tokens': token_buffer  # Array instead of single token
        })
        token_buffer = []

# Send remaining
if token_buffer:
    frappe.publish_realtime('ai_progress', {
        'type': 'ai_chunk',
        'tokens': token_buffer
    })
```

### Batch Approval Timeout
**Issue**: User may not respond to approval request

**Solution**: Add timeout
```python
def wait_for_approval_response(task_id, timeout=300):
    """
    Wait for approval response with timeout
    
    Args:
        task_id: Task identifier
        timeout: Seconds to wait (default 5 minutes)
    
    Returns:
        dict: Response data or timeout error
    """
    import time
    
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        # Check for response
        response = frappe.cache().get(f"approval_response:{task_id}")
        
        if response:
            # Clear cache
            frappe.cache().delete(f"approval_response:{task_id}")
            return response
        
        time.sleep(0.5)
    
    # Timeout - deny all
    raise TimeoutError("Approval request timed out after {timeout}s")
```

### Metrics Calculation
**Issue**: Calculating metrics for tasks with 1000+ messages is slow

**Solution**: Cache aggregated metrics
```python
def get_task_metrics_cached(task_id):
    """Get metrics with caching"""
    
    cache_key = f"task_metrics:{task_id}"
    
    # Check cache
    cached = frappe.cache().get(cache_key)
    if cached:
        return cached
    
    # Calculate
    metrics = calculate_task_metrics(task_id)
    
    # Cache for 30 seconds
    frappe.cache().set(cache_key, metrics, expires_in_sec=30)
    
    return metrics
```

---

## 11. Security Considerations

### File Access Validation
**Always validate file paths before reading**:
```python
def validate_file_access(path, workspace_root):
    """
    Ensure file is within workspace and not ignored
    
    Raises:
        PermissionError: If access denied
    """
    import os
    
    abs_path = os.path.abspath(path)
    workspace_abs = os.path.abspath(workspace_root)
    
    # Check if within workspace
    if not abs_path.startswith(workspace_abs):
        raise PermissionError(f"Access denied: {path} is outside workspace")
    
    # Check .oropendolaignore
    if is_ignored(path):
        raise PermissionError(f"Access denied: {path} is ignored")
    
    # Check file exists
    if not os.path.exists(abs_path):
        raise FileNotFoundError(f"File not found: {path}")
    
    return abs_path
```

### Cost Limits
**Prevent runaway costs**:
```python
def check_cost_limit(task_id, estimated_cost):
    """
    Check if task exceeds cost limit
    
    Args:
        task_id: Task identifier
        estimated_cost: Estimated cost for next request
    
    Raises:
        ValueError: If cost limit exceeded
    """
    # Get current spend
    metrics = get_task_metrics(task_id)
    current_cost = metrics['totalCost']
    
    # Get user limit
    user_limit = frappe.db.get_value("User", frappe.session.user, "ai_cost_limit") or 5.0
    
    # Check if would exceed
    if current_cost + estimated_cost > user_limit:
        raise ValueError(
            f"Cost limit exceeded. Current: ${current_cost:.2f}, "
            f"Limit: ${user_limit:.2f}, "
            f"Estimated next request: ${estimated_cost:.2f}"
        )
```

### Rate Limiting
**Prevent API abuse**:
```python
def check_rate_limit(user):
    """
    Check if user is within rate limits
    
    Raises:
        RateLimitExceeded: If too many requests
    """
    cache_key = f"rate_limit:{user}"
    
    # Get request count
    count = frappe.cache().get(cache_key) or 0
    
    # Limit: 100 requests per hour
    if count >= 100:
        raise frappe.RateLimitExceeded("Too many requests. Try again in 1 hour.")
    
    # Increment
    frappe.cache().set(cache_key, count + 1, expires_in_sec=3600)
```

---

## 12. Monitoring & Debugging

### Add Logging
```python
import logging

logger = logging.getLogger(__name__)

def stream_ai_response(task_id, messages, user):
    """Stream AI response with detailed logging"""
    
    logger.info(f"Starting stream for task {task_id}")
    logger.debug(f"Message count: {len(messages)}")
    
    token_count = 0
    start_time = time.time()
    
    try:
        for chunk in gateway.stream_generate(...):
            token = extract_token(chunk)
            token_count += 1
            
            if token_count % 50 == 0:
                logger.debug(f"Streamed {token_count} tokens in {time.time() - start_time:.2f}s")
            
            # Emit to frontend
            frappe.publish_realtime(...)
        
        logger.info(f"Stream complete: {token_count} tokens in {time.time() - start_time:.2f}s")
    
    except Exception as e:
        logger.error(f"Stream failed: {str(e)}", exc_info=True)
        raise
```

### Add Metrics Dashboard
```python
@frappe.whitelist()
def get_system_metrics():
    """Get system-wide AI usage metrics"""
    
    # Total tasks
    total_tasks = frappe.db.count("AI Task")
    
    # Total cost (last 30 days)
    thirty_days_ago = frappe.utils.add_days(frappe.utils.now(), -30)
    
    messages = frappe.get_all(
        "AI Chat Message",
        filters={
            "type": "api_req_started",
            "creation": [">=", thirty_days_ago]
        },
        fields=["text"]
    )
    
    total_cost = 0
    total_tokens = 0
    
    for msg in messages:
        try:
            data = json.loads(msg.text or "{}")
            total_cost += data.get("cost", 0)
            total_tokens += data.get("tokensIn", 0) + data.get("tokensOut", 0)
        except:
            pass
    
    return {
        "totalTasks": total_tasks,
        "totalCost30Days": round(total_cost, 2),
        "totalTokens30Days": total_tokens,
        "avgCostPerTask": round(total_cost / max(total_tasks, 1), 4)
    }
```

---

## Conclusion

This document outlines all backend requirements for Oropendola's UI integration. The critical blocker is **streaming AI responses** - nothing else will work properly without it.

**Recommended Implementation Order**:
1. ✅ **Week 1**: Streaming (CRITICAL)
2. ✅ **Week 2**: Batch Approval (HIGH)
3. ✅ **Week 3**: Metrics & Events (HIGH)
4. ✅ **Week 4**: Todo List (MEDIUM)

All code examples are based on Roo-Code's proven implementation. Backend team can adapt these patterns to Oropendola's architecture.

**Next Steps**:
1. Backend team reviews this document
2. Estimates effort for each feature
3. Creates implementation plan with timeline
4. Starts with streaming fix (Week 1)
5. Frontend team can begin UI work in parallel

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Maintainer**: Development Team
