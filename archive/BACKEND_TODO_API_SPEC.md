# Backend TODO API Specification for Oropendola AI Assistant

## Overview
This document specifies the backend API endpoints required to support the TODO list feature in the Oropendola AI Assistant VS Code extension.

---

## 1. System Prompt Modification (CRITICAL)

### Current Problem
The AI model is not generating `tool_call` blocks, causing files not to be created.

### Required Fix
Update the system prompt in `ai_assistant/api.py` → `get_system_prompt()` function:

```python
def get_system_prompt(mode, context=None):
    """Generate system prompt based on mode"""
    
    if mode == 'agent':
        prompt = """You are an AI coding assistant with file manipulation and task planning capabilities.

**CRITICAL RULES:**
1. When creating/modifying files, you MUST use tool_call format
2. When outlining a plan, generate TODO items in numbered list format
3. After tool execution, you will see results and can continue

**Tool Call Format (MANDATORY for file operations):**
```tool_call
{
  "action": "create_file",
  "path": "path/to/file.js",
  "content": "file content here",
  "description": "Purpose of this file"
}
```

**TODO List Format (for planning):**
When planning a multi-step task, provide numbered steps:

```
I'll create a complete application with the following steps:

1. Create package.json with dependencies
2. Set up main entry point (index.js)
3. Create configuration file
4. Add documentation (README.md)
5. Set up testing framework

Let me start by creating the first file...
```

**Available Actions:**
- create_file: Create a new file
- modify_file: Edit existing file  
- read_file: Read file contents
- execute_command: Run terminal command

**Workflow:**
1. Present plan with numbered TODO items
2. Execute tool calls one by one
3. Wait for execution results
4. Continue with next steps based on results
5. Confirm completion when done

**Example Conversation:**

USER: "Create a Node.js hello world app"

ASSISTANT: "I'll create a simple Node.js application:

1. Create package.json
2. Create index.js with hello world code
3. Add README.md with instructions

Let's start:

```tool_call
{
  "action": "create_file",
  "path": "package.json",
  "content": "{\\n  \\"name\\": \\"hello-world\\",\\n  \\"version\\": \\"1.0.0\\",\\n  \\"main\\": \\"index.js\\"\\n}",
  "description": "Package configuration"
}
```
"

SYSTEM: "✅ Created package.json"

ASSISTANT: "Great! Now creating the main file:

```tool_call
{
  "action": "create_file",
  "path": "index.js",
  "content": "console.log('Hello, World!');",
  "description": "Main application entry point"
}
```
"

SYSTEM: "✅ Created index.js"

ASSISTANT: "Perfect! Application created successfully. You can run it with: node index.js"
"""
    
    else:  # ask mode
        prompt = """You are an AI coding assistant in read-only mode.

**Ask Mode - NO file operations allowed**
- Provide explanations and guidance only
- NO tool calls
- Help users understand code
"""
    
    # Add context
    if context:
        workspace = context.get('workspace')
        active_file = context.get('activeFile')
        
        if workspace:
            prompt += f"\\n\\nWorkspace: {workspace}"
        if active_file:
            prompt += f"\\nActive file: {active_file.get('path')}"
    
    return prompt
```

---

## 2. API Endpoint: Extract TODOs

### Endpoint
`POST /api/method/ai_assistant.api.extract_todos`

### Purpose
Parse AI assistant responses to extract TODO items

### Request
```json
{
  "conversation_id": "abc123",
  "message_content": "AI response text containing numbered lists, bullet points, etc."
}
```

### Response
```json
{
  "message": {
    "success": true,
    "todos": [
      {
        "id": "todo_1234567890_1",
        "text": "Create package.json with dependencies",
        "type": "numbered",
        "order": 1,
        "completed": false,
        "createdAt": "2025-01-15T10:30:00Z"
      },
      {
        "id": "todo_1234567890_2",
        "text": "Set up main entry point (index.js)",
        "type": "numbered",
        "order": 2,
        "completed": false,
        "createdAt": "2025-01-15T10:30:00Z"
      }
    ],
    "stats": {
      "total": 2,
      "completed": 0,
      "active": 2
    }
  }
}
```

### Implementation
```python
import frappe
from frappe import _
import re


@frappe.whitelist(allow_guest=False)
def extract_todos(conversation_id=None, message_content=None):
    """
    Extract TODO items from AI response
    
    Args:
        conversation_id: Optional conversation ID for context
        message_content: AI response text to parse
    
    Returns:
        dict: Extracted TODO items and stats
    """
    try:
        if not message_content:
            frappe.throw("message_content is required")
        
        # Parse TODOs from message
        todos = parse_todos_from_text(message_content)
        
        # Calculate stats
        stats = {
            'total': len(todos),
            'completed': sum(1 for t in todos if t.get('completed', False)),
            'active': sum(1 for t in todos if not t.get('completed', False))
        }
        
        return {
            'success': True,
            'todos': todos,
            'stats': stats
        }
        
    except Exception as e:
        frappe.log_error(f"Extract TODOs error: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'todos': [],
            'stats': {'total': 0, 'completed': 0, 'active': 0}
        }


def parse_todos_from_text(text):
    """
    Parse TODO items from text
    
    Extracts:
    - Numbered lists: 1. Create file, 2. Edit config
    - Bullet points: - Task one, * Task two
    - Explicit TODOs: TODO: Fix bug
    - Checkboxes: [ ] Pending, [x] Done
    - Action verbs: Create, Build, Implement, etc.
    """
    import time
    
    todos = []
    lines = text.split('\\n')
    id_counter = 0
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        id_counter += 1
        timestamp = int(time.time() * 1000)
        
        # Pattern 1: Numbered lists
        numbered_match = re.match(r'^(\\d+)[\\.)\\s]+(.+)$', line)
        if numbered_match:
            todos.append({
                'id': f'todo_{timestamp}_{id_counter}',
                'text': numbered_match.group(2).strip(),
                'type': 'numbered',
                'order': int(numbered_match.group(1)),
                'completed': False,
                'createdAt': frappe.utils.now()
            })
            continue
        
        # Pattern 2: Bullet points
        bullet_match = re.match(r'^[-*+]\\s+(.+)$', line)
        if bullet_match:
            todos.append({
                'id': f'todo_{timestamp}_{id_counter}',
                'text': bullet_match.group(1).strip(),
                'type': 'bullet',
                'order': None,
                'completed': False,
                'createdAt': frappe.utils.now()
            })
            continue
        
        # Pattern 3: Explicit TODO markers
        todo_match = re.match(r'^(?:TODO|TO-DO|To Do|To-Do):\\s*(.+)$', line, re.IGNORECASE)
        if todo_match:
            todos.append({
                'id': f'todo_{timestamp}_{id_counter}',
                'text': todo_match.group(1).strip(),
                'type': 'explicit',
                'order': None,
                'completed': False,
                'createdAt': frappe.utils.now()
            })
            continue
        
        # Pattern 4: Checkboxes
        checkbox_match = re.match(r'^\\[(\\s|x|X)\\]\\s+(.+)$', line)
        if checkbox_match:
            completed = checkbox_match.group(1).lower() == 'x'
            todos.append({
                'id': f'todo_{timestamp}_{id_counter}',
                'text': checkbox_match.group(2).strip(),
                'type': 'checkbox',
                'order': None,
                'completed': completed,
                'createdAt': frappe.utils.now(),
                'completedAt': frappe.utils.now() if completed else None
            })
            continue
        
        # Pattern 5: Action verbs (only if line is short - not a paragraph)
        action_verbs = [
            'create', 'build', 'make', 'generate', 'develop', 'implement',
            'add', 'insert', 'fix', 'resolve', 'update', 'modify', 'edit',
            'remove', 'delete', 'test', 'verify', 'install', 'setup',
            'configure', 'write', 'design', 'plan'
        ]
        
        if len(line) < 150:  # Not a paragraph
            for verb in action_verbs:
                if line.lower().startswith(verb + ' '):
                    todos.append({
                        'id': f'todo_{timestamp}_{id_counter}',
                        'text': line,
                        'type': 'action',
                        'order': None,
                        'completed': False,
                        'createdAt': frappe.utils.now()
                    })
                    break
    
    return todos
```

---

## 3. API Endpoint: Save TODOs

### Endpoint
`POST /api/method/ai_assistant.api.save_todos`

### Purpose
Persist TODO items to database

### Request
```json
{
  "conversation_id": "abc123",
  "todos": [
    {
      "id": "todo_1234567890_1",
      "text": "Create package.json",
      "type": "numbered",
      "order": 1,
      "completed": false
    }
  ]
}
```

### Response
```json
{
  "message": {
    "success": true,
    "saved_count": 5
  }
}
```

### Implementation
```python
@frappe.whitelist(allow_guest=False)
def save_todos(conversation_id, todos):
    """
    Save TODO items to database
    
    Args:
        conversation_id: Conversation ID
        todos: Array of TODO items
    """
    try:
        import json
        
        # Parse todos if string
        if isinstance(todos, str):
            todos = json.loads(todos)
        
        if not isinstance(todos, list):
            frappe.throw("todos must be an array")
        
        # Store in Conversation record
        if frappe.db.exists("AI Conversation", conversation_id):
            doc = frappe.get_doc("AI Conversation", conversation_id)
            doc.todos = json.dumps(todos)
            doc.todo_count = len(todos)
            doc.save(ignore_permissions=True)
            frappe.db.commit()
        else:
            frappe.throw(f"Conversation {conversation_id} not found")
        
        return {
            'success': True,
            'saved_count': len(todos)
        }
        
    except Exception as e:
        frappe.log_error(f"Save TODOs error: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }
```

---

## 4. API Endpoint: Get TODOs

### Endpoint
`GET /api/method/ai_assistant.api.get_todos`

### Purpose
Retrieve saved TODO items

### Request
```
GET /api/method/ai_assistant.api.get_todos?conversation_id=abc123
```

### Response
```json
{
  "message": {
    "success": true,
    "todos": [...],
    "stats": {
      "total": 5,
      "completed": 2,
      "active": 3
    }
  }
}
```

### Implementation
```python
@frappe.whitelist(allow_guest=False)
def get_todos(conversation_id):
    """
    Get TODO items for a conversation
    """
    try:
        if not frappe.db.exists("AI Conversation", conversation_id):
            return {
                'success': True,
                'todos': [],
                'stats': {'total': 0, 'completed': 0, 'active': 0}
            }
        
        doc = frappe.get_doc("AI Conversation", conversation_id)
        todos = json.loads(doc.todos) if doc.todos else []
        
        stats = {
            'total': len(todos),
            'completed': sum(1 for t in todos if t.get('completed', False)),
            'active': sum(1 for t in todos if not t.get('completed', False))
        }
        
        return {
            'success': True,
            'todos': todos,
            'stats': stats
        }
        
    except Exception as e:
        frappe.log_error(f"Get TODOs error: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'todos': [],
            'stats': {'total': 0, 'completed': 0, 'active': 0}
        }
```

---

## 5. Database Schema Changes

### AI Conversation DocType

Add these fields to the "AI Conversation" DocType:

```python
{
    "fieldname": "todos",
    "fieldtype": "Long Text",
    "label": "TODOs (JSON)"
},
{
    "fieldname": "todo_count",
    "fieldtype": "Int",
    "label": "TODO Count",
    "default": 0
}
```

---

## 6. Testing Commands

### Test TODO Extraction
```bash
curl -X POST https://oropendola.ai/api/method/ai_assistant.api.extract_todos \
  -H "Content-Type: application/json" \
  -H "Cookie: sid=YOUR_SESSION_ID" \
  -d '{
    "message_content": "I will create an app:\n\n1. Create package.json\n2. Create index.js\n3. Add README.md"
  }'
```

### Test TODO Save
```bash
curl -X POST https://oropendola.ai/api/method/ai_assistant.api.save_todos \
  -H "Content-Type: application/json" \
  -H "Cookie: sid=YOUR_SESSION_ID" \
  -d '{
    "conversation_id": "abc123",
    "todos": [{"id": "todo_1", "text": "Test task", "completed": false}]
  }'
```

---

## 7. Priority Implementation Order

1. **HIGHEST PRIORITY**: Fix system prompt to generate tool_call blocks
2. **HIGH**: Implement `extract_todos()` endpoint
3. **MEDIUM**: Implement `save_todos()` and `get_todos()` endpoints
4. **LOW**: Add database schema changes for persistence

---

## 8. Expected Behavior After Implementation

1. User asks: "Create an Electron POS app"
2. AI responds with:
   - Plan with numbered TODO items (1. Create package.json, 2. Create main.js, etc.)
   - Actual tool_call blocks for each file
3. Frontend:
   - Extracts TODOs from numbered list
   - Displays in TODO panel
   - Executes tool_call blocks to create files
4. User sees:
   - TODO list with checkboxes
   - Files actually created in workspace
   - Progress tracking

---

## Questions?
Contact: sammish@Oropendola.ai
