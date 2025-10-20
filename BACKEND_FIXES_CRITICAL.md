# Backend Fixes Required - TODO & Conversation Flow

## Problem Summary

Based on the screenshots, there are **2 critical backend issues**:

### ❌ Issue 1: Raw Tool Output Instead of Conversation
**Current Behavior:**
```
✅ read_file: import json import frappe...
✅ modify_file: Successfully modified file: posawesome/posawesome/api/restaurant_orders.py
✅ modify_file: Successfully modified file: posawesome/posawesome/api/restaurant_orders.py
⚠️ Request timed out. The backend may be experiencing issues.
```

**Expected Behavior (GitHub Copilot style):**
```
I've analyzed the error. The issue is that `search_orders` function is missing from 
`sales_orders.py`. Let me fix this by:

1. Adding the search_orders function
2. Updating the imports
3. Testing the fix

[Creating files... ✓]
```

### ❌ Issue 2: TODO Panel Not Working
**Current Behavior:**
- No TODO items appear in the panel
- Backend not parsing numbered plans
- No TODO updates sent to frontend

---

## Root Cause Analysis

### Backend Response Flow (Current - BROKEN):
```
User Message
    ↓
Backend AI Processing
    ↓
Tool Executions (✅ read_file, ✅ modify_file, etc.)
    ↓
❌ NO conversational response
❌ NO TODO parsing
    ↓
Frontend displays raw tool output
```

### Backend Response Flow (Expected - FIXED):
```
User Message
    ↓
Backend AI Processing
    ↓
1. Generate conversational response with numbered plan
2. Parse numbered plan → extract TODOs
3. Execute tools
4. Send back:
   - Conversational AI response text
   - file_changes data
   - todos data
   - Tool execution results
    ↓
Frontend displays properly formatted conversation + TODOs
```

---

## Fix #1: Conversational Response Format

### Current Backend Code (WRONG):
```python
# In your Frappe backend chat API
@frappe.whitelist(allow_guest=False)
def send_message(message, conversation_id=None):
    # ... AI processing ...
    
    # Execute tools
    tool_results = execute_tools(ai_response)
    
    # ❌ PROBLEM: Only returning tool results
    return {
        'success': True,
        'tool_results': tool_results  # Raw execution logs
    }
```

### Fixed Backend Code (CORRECT):
```python
@frappe.whitelist(allow_guest=False)
def send_message(message, conversation_id=None):
    # ... AI processing ...
    
    # Get AI response text (the actual conversation)
    ai_message = ai_response.get('message', '') or ai_response.get('content', '')
    
    # Parse TODOs from the response
    todos_data = parse_todos_from_text(ai_message)
    
    # Extract file changes from tool results
    file_changes = extract_file_changes(tool_results)
    
    # Execute tools
    tool_results = execute_tools(ai_response)
    
    # ✅ CORRECT: Return structured response
    return {
        'success': True,
        'role': 'assistant',
        'content': ai_message,  # The actual AI conversation text
        'file_changes': file_changes,  # Structured file changes
        'todos': todos_data['todos'],  # Parsed TODO items
        'todos_stats': todos_data['stats'],  # TODO statistics
        'tool_results': tool_results  # Optional: for debugging
    }
```

---

## Fix #2: TODO Parsing Implementation

### Add this function to your backend:

```python
import re
from datetime import datetime

def parse_todos_from_text(text):
    """
    Parse TODO items from AI response
    
    Detects patterns like:
    - "1. Create package.json"
    - "2. Set up main entry point"
    - "3. Add README.md"
    """
    todos = []
    
    # Pattern to match numbered lists: "1. Task", "2. Task", etc.
    numbered_pattern = r'^(\d+)[.)]\\s+(.+)$'
    
    lines = text.split('\\n')
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
            
            # Remove markdown/code markers
            task_text = task_text.replace('`', '').replace('**', '')
            
            # Skip if it's too short or looks like code
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
    
    # Calculate stats
    stats = {
        'total': len(todos),
        'completed': 0,
        'active': len(todos)
    }
    
    return {
        'todos': todos,
        'stats': stats
    }
```

---

## Fix #3: File Changes Extraction

```python
def extract_file_changes(tool_results):
    """
    Extract file changes from tool execution results
    
    Returns format expected by frontend:
    {
        'created': ['/path/to/new-file.js'],
        'modified': ['/path/to/edited-file.py'],
        'deleted': ['/path/to/removed-file.txt'],
        'commands': ['npm install', 'bench restart']
    }
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
                    'line_count': len(result.get('content', '').split('\\n'))
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
        
        elif action == 'execute_command' or action == 'run_terminal':
            command = result.get('command')
            if command:
                file_changes['commands'].append({
                    'command': command,
                    'output': result.get('output', '')[:200],  # Limit output
                    'exit_code': result.get('exit_code', 0)
                })
    
    return file_changes
```

---

## Fix #4: Response Structure Template

### Your backend should return this exact JSON structure:

```json
{
  "success": true,
  "role": "assistant",
  "content": "I've analyzed the error and found that the search_orders function is missing from sales_orders.py. Let me fix this:\n\n1. Add the search_orders function\n2. Update the imports in __init__.py\n3. Test the fix\n\nI've successfully made these changes...",
  
  "file_changes": {
    "created": [],
    "modified": [
      {
        "path": "posawesome/posawesome/api/sales_orders.py",
        "lines_added": 15,
        "lines_removed": 0
      },
      {
        "path": "posawesome/posawesome/api/__init__.py",
        "lines_added": 1,
        "lines_removed": 0
      }
    ],
    "deleted": [],
    "commands": []
  },
  
  "todos": [
    {
      "id": "todo_1729468234_1",
      "text": "Add the search_orders function",
      "type": "numbered",
      "order": 1,
      "completed": true,
      "createdAt": "2025-10-20T10:30:34Z"
    },
    {
      "id": "todo_1729468234_2",
      "text": "Update the imports in __init__.py",
      "type": "numbered",
      "order": 2,
      "completed": true,
      "createdAt": "2025-10-20T10:30:34Z"
    },
    {
      "id": "todo_1729468234_3",
      "text": "Test the fix",
      "type": "numbered",
      "order": 3,
      "completed": false,
      "createdAt": "2025-10-20T10:30:34Z"
    }
  ],
  
  "todos_stats": {
    "total": 3,
    "completed": 2,
    "active": 1
  }
}
```

---

## Testing the Fixes

### Step 1: Test TODO Parsing
```python
# In Frappe console or test file
text = """I'll fix this issue with these steps:

1. Add search_orders function to sales_orders.py
2. Update imports in __init__.py
3. Test the fix with bench restart
"""

result = parse_todos_from_text(text)
print(f"Found {len(result['todos'])} TODOs")
# Expected: Found 3 TODOs
```

### Step 2: Test Full Response
```bash
# Test your chat API
curl -X POST http://your-backend/api/method/oropendola.ai_assistant.api.send_message \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "Create a simple hello world app"
  }'

# Should return JSON with:
# - content: AI conversational text
# - file_changes: { created: [...], modified: [] }
# - todos: [ {id, text, order, completed}, ... ]
# - todos_stats: { total, completed, active }
```

---

## Frontend Expectations

The VS Code extension expects this **exact data structure**:

```javascript
// Frontend receives:
{
  role: 'assistant',
  content: 'AI conversation text...',
  file_changes: {
    created: [{path: 'file.js', line_count: 10}],
    modified: [{path: 'file.py', lines_added: 5, lines_removed: 2}],
    deleted: ['old.txt'],
    commands: [{command: 'npm install', output: '...', exit_code: 0}]
  }
}

// Frontend also expects separate TODO update:
{
  type: 'updateTodos',
  todos: [{id, text, order, completed}],
  stats: {total, completed, active},
  context: 'Working on: Create hello world app'
}
```

---

## Quick Checklist

- [ ] Backend returns `content` field with AI conversation text
- [ ] Backend returns `file_changes` in correct structure
- [ ] Backend parses numbered plans and extracts TODOs
- [ ] Backend returns `todos` and `todos_stats` fields
- [ ] TODOs have unique IDs, text, order, completed status
- [ ] File changes include path, line counts, command outputs
- [ ] No duplicate tool execution messages
- [ ] Response doesn't timeout (request timeout error)

---

## Where to Make Changes

### In your Frappe backend (likely in `oropendola` or `posawesome` app):

1. **File:** `ai_assistant/api.py` or similar
2. **Function:** `send_message()` or the chat endpoint
3. **Add:** `parse_todos_from_text()` function
4. **Add:** `extract_file_changes()` function
5. **Modify:** Response structure to include all fields

---

## Need Help?

Share your backend code file (the one that handles `/api/method/...send_message`) and I can provide exact line-by-line fixes!

The files are likely in:
- `apps/oropendola/oropendola/api/chat.py`
- `apps/posawesome/posawesome/api/ai_assistant.py`
- Or similar location in your Frappe apps directory

---

**Build Date:** October 20, 2025  
**Priority:** 🔴 CRITICAL - Blocks core functionality
