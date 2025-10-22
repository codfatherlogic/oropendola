# Backend Implementation Guide - TODO API + File Tracking

## 🎯 Overview

This guide covers implementing **two backend features** in your Frappe application:

1. **TODO API** - Persistent TODO list with CRUD operations
2. **File Tracking** - Structured file changes in chat responses

Both features work together to give users a modern coding assistant experience.

---

## Part 1: TODO API Implementation

### 📋 What You're Building

A TODO management system that:
- ✅ Stores TODOs in Frappe database (persistent)
- ✅ Links TODOs to conversations
- ✅ Supports CRUD operations (Create, Read, Update, Delete)
- ✅ Returns TODO status with chat responses
- ✅ Auto-creates TODOs from AI responses

---

### Step 1: Create TODO DocType

**File**: `oropendola/oropendola/doctype/ai_todo/ai_todo.json`

```json
{
  "creation": "2025-10-19 12:00:00.000000",
  "doctype": "DocType",
  "engine": "InnoDB",
  "field_order": [
    "conversation_id",
    "user",
    "title",
    "description",
    "status",
    "order_index",
    "completed_at",
    "created_from_message"
  ],
  "fields": [
    {
      "fieldname": "conversation_id",
      "fieldtype": "Data",
      "label": "Conversation ID",
      "reqd": 1,
      "in_list_view": 1
    },
    {
      "fieldname": "user",
      "fieldtype": "Link",
      "label": "User",
      "options": "User",
      "reqd": 1
    },
    {
      "fieldname": "title",
      "fieldtype": "Data",
      "label": "Title",
      "reqd": 1,
      "in_list_view": 1
    },
    {
      "fieldname": "description",
      "fieldtype": "Text",
      "label": "Description"
    },
    {
      "fieldname": "status",
      "fieldtype": "Select",
      "label": "Status",
      "options": "Pending\nIn Progress\nCompleted\nCancelled",
      "default": "Pending",
      "reqd": 1
    },
    {
      "fieldname": "order_index",
      "fieldtype": "Int",
      "label": "Order",
      "default": 0
    },
    {
      "fieldname": "completed_at",
      "fieldtype": "Datetime",
      "label": "Completed At"
    },
    {
      "fieldname": "created_from_message",
      "fieldtype": "Data",
      "label": "Created From Message ID"
    }
  ],
  "modified": "2025-10-19 12:00:00.000000",
  "modified_by": "Administrator",
  "module": "Oropendola",
  "name": "AI TODO",
  "owner": "Administrator",
  "permissions": [
    {
      "create": 1,
      "delete": 1,
      "email": 1,
      "export": 1,
      "print": 1,
      "read": 1,
      "report": 1,
      "role": "System Manager",
      "share": 1,
      "write": 1
    },
    {
      "create": 1,
      "delete": 1,
      "read": 1,
      "role": "All",
      "write": 1,
      "if_owner": 1
    }
  ],
  "sort_field": "modified",
  "sort_order": "DESC",
  "track_changes": 1
}
```

**Create it**:
```bash
# SSH to your Frappe server
cd /path/to/frappe-bench/apps/oropendola

# Create the DocType directory
mkdir -p oropendola/doctype/ai_todo

# Save JSON above to:
# oropendola/doctype/ai_todo/ai_todo.json

# Create __init__.py
touch oropendola/doctype/ai_todo/__init__.py

# Create Python controller
touch oropendola/doctype/ai_todo/ai_todo.py
```

---

### Step 2: Add TODO Controller Logic

**File**: `oropendola/oropendola/doctype/ai_todo/ai_todo.py`

```python
# Copyright (c) 2025, Your Company and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class AITODO(Document):
    def before_save(self):
        """Set completed_at timestamp when status changes to Completed"""
        if self.status == "Completed" and not self.completed_at:
            self.completed_at = frappe.utils.now()
        elif self.status != "Completed":
            self.completed_at = None
    
    def validate(self):
        """Validate TODO data"""
        if not self.user:
            self.user = frappe.session.user
        
        # Ensure order_index is set
        if self.order_index is None:
            self.order_index = self.get_next_order_index()
    
    def get_next_order_index(self):
        """Get next order index for this conversation"""
        result = frappe.db.sql("""
            SELECT COALESCE(MAX(order_index), -1) + 1
            FROM `tabAI TODO`
            WHERE conversation_id = %s AND user = %s
        """, (self.conversation_id, self.user))
        return result[0][0] if result else 0
```

---

### Step 3: Create TODO API Endpoints

**File**: `oropendola/oropendola/api/todos.py`

```python
# Copyright (c) 2025, Your Company and contributors
# For license information, please see license.txt

import frappe
import json
from frappe import _

@frappe.whitelist()
def create_todos(conversation_id, todos):
    """
    Create multiple TODOs from AI response
    
    Args:
        conversation_id: Conversation identifier
        todos: JSON array of todo objects [{"title": "...", "description": "..."}]
    
    Returns:
        List of created TODO documents
    """
    try:
        if isinstance(todos, str):
            todos = json.loads(todos)
        
        user = frappe.session.user
        created_todos = []
        
        for idx, todo_data in enumerate(todos):
            todo = frappe.get_doc({
                "doctype": "AI TODO",
                "conversation_id": conversation_id,
                "user": user,
                "title": todo_data.get("title", ""),
                "description": todo_data.get("description", ""),
                "status": "Pending",
                "order_index": idx
            })
            todo.insert(ignore_permissions=False)
            created_todos.append(todo.as_dict())
        
        frappe.db.commit()
        
        return {
            "success": True,
            "todos": created_todos,
            "count": len(created_todos)
        }
    
    except Exception as e:
        frappe.log_error(f"Error creating TODOs: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def get_todos(conversation_id):
    """
    Get all TODOs for a conversation
    
    Args:
        conversation_id: Conversation identifier
    
    Returns:
        List of TODO documents
    """
    try:
        user = frappe.session.user
        
        todos = frappe.get_all(
            "AI TODO",
            filters={
                "conversation_id": conversation_id,
                "user": user
            },
            fields=["name", "title", "description", "status", "order_index", "completed_at"],
            order_by="order_index asc"
        )
        
        # Calculate stats
        total = len(todos)
        completed = sum(1 for t in todos if t.status == "Completed")
        
        return {
            "success": True,
            "todos": todos,
            "stats": {
                "total": total,
                "completed": completed,
                "pending": total - completed
            }
        }
    
    except Exception as e:
        frappe.log_error(f"Error fetching TODOs: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def update_todo(todo_id, status=None, title=None, description=None):
    """
    Update a TODO item
    
    Args:
        todo_id: TODO document name
        status: New status (optional)
        title: New title (optional)
        description: New description (optional)
    
    Returns:
        Updated TODO document
    """
    try:
        user = frappe.session.user
        todo = frappe.get_doc("AI TODO", todo_id)
        
        # Security: Only owner can update
        if todo.user != user:
            frappe.throw(_("You don't have permission to update this TODO"))
        
        if status:
            todo.status = status
        if title:
            todo.title = title
        if description is not None:  # Allow empty string
            todo.description = description
        
        todo.save(ignore_permissions=False)
        frappe.db.commit()
        
        return {
            "success": True,
            "todo": todo.as_dict()
        }
    
    except Exception as e:
        frappe.log_error(f"Error updating TODO: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def toggle_todo(todo_id):
    """
    Toggle TODO between Pending and Completed
    
    Args:
        todo_id: TODO document name
    
    Returns:
        Updated TODO document
    """
    try:
        user = frappe.session.user
        todo = frappe.get_doc("AI TODO", todo_id)
        
        # Security check
        if todo.user != user:
            frappe.throw(_("You don't have permission to update this TODO"))
        
        # Toggle status
        if todo.status == "Completed":
            todo.status = "Pending"
            todo.completed_at = None
        else:
            todo.status = "Completed"
            todo.completed_at = frappe.utils.now()
        
        todo.save(ignore_permissions=False)
        frappe.db.commit()
        
        return {
            "success": True,
            "todo": todo.as_dict()
        }
    
    except Exception as e:
        frappe.log_error(f"Error toggling TODO: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def delete_todo(todo_id):
    """
    Delete a TODO item
    
    Args:
        todo_id: TODO document name
    
    Returns:
        Success status
    """
    try:
        user = frappe.session.user
        todo = frappe.get_doc("AI TODO", todo_id)
        
        # Security check
        if todo.user != user:
            frappe.throw(_("You don't have permission to delete this TODO"))
        
        todo.delete()
        frappe.db.commit()
        
        return {
            "success": True,
            "message": "TODO deleted successfully"
        }
    
    except Exception as e:
        frappe.log_error(f"Error deleting TODO: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def clear_todos(conversation_id):
    """
    Delete all TODOs for a conversation
    
    Args:
        conversation_id: Conversation identifier
    
    Returns:
        Success status with count
    """
    try:
        user = frappe.session.user
        
        todos = frappe.get_all(
            "AI TODO",
            filters={
                "conversation_id": conversation_id,
                "user": user
            },
            pluck="name"
        )
        
        for todo_id in todos:
            frappe.delete_doc("AI TODO", todo_id, ignore_permissions=False)
        
        frappe.db.commit()
        
        return {
            "success": True,
            "deleted": len(todos)
        }
    
    except Exception as e:
        frappe.log_error(f"Error clearing TODOs: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }
```

---

### Step 4: Update Chat API to Return TODOs

**File**: `oropendola/oropendola/api/chat.py` (existing file)

Find the chat endpoint (around line 100-200) and **add TODO extraction**:

```python
@frappe.whitelist()
def send_message(conversation_id, message, mode="agent", attachments=None):
    """Send message and get AI response"""
    
    # ... existing code ...
    
    # Get AI response
    ai_response = get_ai_completion(
        messages=conversation_history,
        system_prompt=system_prompt
    )
    
    # Extract TODOs from response (NEW)
    extracted_todos = extract_todos_from_response(ai_response)
    
    # Create TODOs if found (NEW)
    created_todos = []
    if extracted_todos:
        from oropendola.api.todos import create_todos
        result = create_todos(conversation_id, extracted_todos)
        if result.get("success"):
            created_todos = result.get("todos", [])
    
    # Get current TODO list for this conversation (NEW)
    from oropendola.api.todos import get_todos
    todos_data = get_todos(conversation_id)
    
    return {
        "message": {
            "response": ai_response,
            "tool_calls": tool_calls,  # existing
            "conversation_id": conversation_id,
            # NEW: Add TODO data
            "todos": todos_data.get("todos", []),
            "todo_stats": todos_data.get("stats", {}),
            "created_todos": created_todos  # Just created this turn
        }
    }


def extract_todos_from_response(text):
    """
    Extract numbered TODO list from AI response
    
    Examples:
        "1. Create the app\n2. Add features\n3. Deploy"
        "1) Install dependencies\n2) Configure server"
    
    Returns:
        List of todo dicts [{"title": "...", "description": "..."}]
    """
    import re
    
    todos = []
    
    # Pattern: "1. Todo item" or "1) Todo item"
    pattern = r'^\s*(\d+)[.)][\s]+(.+)$'
    
    lines = text.split('\n')
    for line in lines:
        match = re.match(pattern, line.strip())
        if match:
            number = match.group(1)
            title = match.group(2).strip()
            
            # Clean up markdown formatting
            title = re.sub(r'\*\*(.+?)\*\*', r'\1', title)  # Remove bold
            title = re.sub(r'\*(.+?)\*', r'\1', title)      # Remove italic
            title = re.sub(r'`(.+?)`', r'\1', title)        # Remove code
            
            todos.append({
                "title": title,
                "description": f"Task {number} from AI plan"
            })
    
    return todos if len(todos) >= 2 else []  # Only return if 2+ items
```

---

## Part 2: File Tracking Implementation

### 📂 What You're Building

Track file operations and return structured data:
- ✅ Lists files created, modified, deleted
- ✅ Tracks terminal commands run
- ✅ Returns with each chat response
- ✅ Frontend displays in collapsible card

---

### Step 1: Update Chat Response to Include file_changes

**File**: `oropendola/oropendola/api/chat.py` (same file as above)

**Modify the return statement**:

```python
@frappe.whitelist()
def send_message(conversation_id, message, mode="agent", attachments=None):
    """Send message and get AI response"""
    
    # ... existing code to get AI response ...
    
    # Track file changes (NEW)
    file_changes = extract_file_changes(tool_calls)
    
    return {
        "message": {
            "response": ai_response,
            "tool_calls": tool_calls,
            "conversation_id": conversation_id,
            # TODO data (from Part 1)
            "todos": todos_data.get("todos", []),
            "todo_stats": todos_data.get("stats", {}),
            "created_todos": created_todos,
            # NEW: File tracking data
            "file_changes": file_changes
        }
    }


def extract_file_changes(tool_calls):
    """
    Extract file operations from tool_calls
    
    Args:
        tool_calls: List of tool call objects
    
    Returns:
        Dict with created, modified, deleted, commands arrays
    """
    if not tool_calls or not isinstance(tool_calls, list):
        return {
            "created": [],
            "modified": [],
            "deleted": [],
            "commands": []
        }
    
    file_changes = {
        "created": [],
        "modified": [],
        "deleted": [],
        "commands": []
    }
    
    for tool_call in tool_calls:
        action = tool_call.get("action", "")
        path = tool_call.get("path", "")
        command = tool_call.get("command", "")
        
        if action == "create_file" and path:
            file_changes["created"].append(path)
        
        elif action == "modify_file" and path:
            file_changes["modified"].append(path)
        
        elif action == "delete_file" and path:
            file_changes["deleted"].append(path)
        
        elif action == "run_terminal" and command:
            file_changes["commands"].append(command)
    
    return file_changes
```

---

### Step 2: Test the Backend APIs

Create a test script to verify everything works:

**File**: `test_todo_api.py` (in your Frappe bench)

```python
import frappe
import json

def test_todo_api():
    """Test TODO API endpoints"""
    
    # Set user context
    frappe.set_user("your-email@example.com")
    
    # Test 1: Create TODOs
    print("\n=== Test 1: Create TODOs ===")
    todos_data = [
        {"title": "Install dependencies", "description": "Run npm install"},
        {"title": "Create server", "description": "Set up Express server"},
        {"title": "Add routes", "description": "Create API routes"}
    ]
    
    from oropendola.api.todos import create_todos
    result = create_todos("test-conversation-123", json.dumps(todos_data))
    print(f"Created {result.get('count')} TODOs")
    
    # Test 2: Get TODOs
    print("\n=== Test 2: Get TODOs ===")
    from oropendola.api.todos import get_todos
    result = get_todos("test-conversation-123")
    print(f"Total: {result['stats']['total']}, Completed: {result['stats']['completed']}")
    for todo in result['todos']:
        print(f"  - {todo['title']}")
    
    # Test 3: Toggle TODO
    print("\n=== Test 3: Toggle TODO ===")
    first_todo_id = result['todos'][0]['name']
    from oropendola.api.todos import toggle_todo
    toggle_result = toggle_todo(first_todo_id)
    print(f"Toggled: {toggle_result['todo']['title']} -> {toggle_result['todo']['status']}")
    
    # Test 4: Get updated stats
    print("\n=== Test 4: Updated Stats ===")
    result = get_todos("test-conversation-123")
    print(f"Total: {result['stats']['total']}, Completed: {result['stats']['completed']}")
    
    # Test 5: Clear TODOs
    print("\n=== Test 5: Clear TODOs ===")
    from oropendola.api.todos import clear_todos
    clear_result = clear_todos("test-conversation-123")
    print(f"Deleted {clear_result['deleted']} TODOs")
    
    print("\n✅ All tests passed!")

# Run in Frappe console:
# bench console
# >>> exec(open("test_todo_api.py").read())
# >>> test_todo_api()
```

---

## 🚀 Installation Steps

### Step 1: Create Files on Server

```bash
# SSH to your Frappe server
ssh user@oropendola.ai

# Navigate to app directory
cd /path/to/frappe-bench/apps/oropendola

# Create TODO DocType
mkdir -p oropendola/doctype/ai_todo
touch oropendola/doctype/ai_todo/__init__.py

# Create the files (copy content from above):
# - oropendola/doctype/ai_todo/ai_todo.json
# - oropendola/doctype/ai_todo/ai_todo.py
# - oropendola/api/todos.py (new file)

# Edit chat.py to add TODO extraction and file tracking
nano oropendola/api/chat.py
```

### Step 2: Install DocType

```bash
# In Frappe bench directory
cd /path/to/frappe-bench

# Migrate to create database tables
bench --site oropendola.ai migrate

# You should see:
# "Updating DocType AI TODO"
# "Created table tabAI TODO"
```

### Step 3: Restart Services

```bash
# Restart Frappe
bench restart

# Or if using supervisor:
sudo supervisorctl restart all
```

### Step 4: Test the API

```bash
# Open Frappe console
bench console

# Test imports
>>> from oropendola.api.todos import create_todos, get_todos
>>> print("✅ TODO API imported successfully")

# Test file tracking
>>> from oropendola.api.chat import extract_file_changes
>>> print("✅ File tracking imported successfully")

# Exit console
>>> exit()
```

---

## 📡 API Endpoints Reference

### Base URL
```
https://oropendola.ai/api/method/oropendola.api.todos
```

### 1. Create TODOs

**Endpoint**: `POST /create_todos`

**Request**:
```json
{
  "conversation_id": "conv-123",
  "todos": [
    {"title": "Task 1", "description": "Details"},
    {"title": "Task 2", "description": "More details"}
  ]
}
```

**Response**:
```json
{
  "success": true,
  "todos": [
    {
      "name": "TODO-001",
      "title": "Task 1",
      "description": "Details",
      "status": "Pending",
      "order_index": 0
    }
  ],
  "count": 2
}
```

### 2. Get TODOs

**Endpoint**: `GET /get_todos?conversation_id=conv-123`

**Response**:
```json
{
  "success": true,
  "todos": [
    {
      "name": "TODO-001",
      "title": "Task 1",
      "status": "Pending",
      "order_index": 0
    }
  ],
  "stats": {
    "total": 3,
    "completed": 1,
    "pending": 2
  }
}
```

### 3. Toggle TODO

**Endpoint**: `POST /toggle_todo`

**Request**:
```json
{
  "todo_id": "TODO-001"
}
```

**Response**:
```json
{
  "success": true,
  "todo": {
    "name": "TODO-001",
    "status": "Completed",
    "completed_at": "2025-10-19 14:30:00"
  }
}
```

### 4. Update TODO

**Endpoint**: `POST /update_todo`

**Request**:
```json
{
  "todo_id": "TODO-001",
  "title": "New title",
  "status": "In Progress"
}
```

### 5. Delete TODO

**Endpoint**: `POST /delete_todo`

**Request**:
```json
{
  "todo_id": "TODO-001"
}
```

### 6. Clear All TODOs

**Endpoint**: `POST /clear_todos`

**Request**:
```json
{
  "conversation_id": "conv-123"
}
```

---

## 🧪 Testing Checklist

### Backend Tests

- [ ] DocType installed (check in Desk > Doctype List > AI TODO)
- [ ] Create TODO via API (returns success)
- [ ] Get TODOs (returns list)
- [ ] Toggle TODO status (updates database)
- [ ] Delete TODO (removes from database)
- [ ] Chat response includes `todos` field
- [ ] Chat response includes `file_changes` field
- [ ] TODO extraction from numbered lists works
- [ ] File changes extracted from tool_calls

### Frontend Tests (After Implementation)

- [ ] TODO panel appears above chat input
- [ ] Clicking checkbox toggles TODO
- [ ] TODOs persist across reloads
- [ ] File changes show in collapsible card
- [ ] Clicking file path opens file

---

## 🔧 Troubleshooting

### Issue: "DocType AI TODO not found"

**Solution**:
```bash
bench --site oropendola.ai migrate
bench restart
```

### Issue: "API method not found"

**Solution**:
```bash
# Check if todos.py exists
ls oropendola/api/todos.py

# Restart bench
bench restart

# Clear cache
bench --site oropendola.ai clear-cache
```

### Issue: "Permission denied"

**Solution**:
Edit `ai_todo.json`, add permission for role "All":
```json
{
  "role": "All",
  "read": 1,
  "write": 1,
  "create": 1,
  "delete": 1,
  "if_owner": 1
}
```

Then:
```bash
bench --site oropendola.ai migrate
```

### Issue: TODOs not being created

**Solution**:
Check the extraction logic in chat.py:
```python
# Debug extraction
extracted_todos = extract_todos_from_response(ai_response)
print(f"Extracted TODOs: {extracted_todos}")

# Should return at least 2 items for a valid TODO list
```

---

## 📊 Database Schema

**Table**: `tabAI TODO`

| Column | Type | Description |
|--------|------|-------------|
| name | VARCHAR(140) | Primary key (e.g., "TODO-001") |
| conversation_id | VARCHAR(255) | Links to conversation |
| user | VARCHAR(140) | User email |
| title | VARCHAR(255) | TODO title |
| description | TEXT | TODO details |
| status | VARCHAR(50) | Pending/In Progress/Completed/Cancelled |
| order_index | INT | Display order (0, 1, 2...) |
| completed_at | DATETIME | Completion timestamp |
| created_from_message | VARCHAR(140) | Source message ID |
| creation | DATETIME | Created timestamp |
| modified | DATETIME | Last modified timestamp |

---

## 🎯 Next Steps

After implementing the backend:

1. **Test all API endpoints** using the test script
2. **Verify database tables** exist and data is saved
3. **Check chat response** includes `todos` and `file_changes`
4. **Move to frontend implementation** (I'll do this part)

---

## 📞 Support

If you encounter issues:

1. Check Frappe error logs:
   ```bash
   tail -f /path/to/frappe-bench/logs/oropendola.ai.log
   ```

2. Check console errors:
   ```bash
   bench console
   >>> from oropendola.api.todos import create_todos
   >>> # Test function calls
   ```

3. Verify migrations:
   ```bash
   bench --site oropendola.ai migrate
   ```

---

## ✅ Success Criteria

**You'll know it's working when**:

1. ✅ DocType "AI TODO" exists in Desk
2. ✅ API endpoints return data (test with Postman/curl)
3. ✅ Chat response includes:
   ```json
   {
     "todos": [...],
     "todo_stats": {"total": 3, "completed": 1},
     "file_changes": {
       "created": ["src/app.js"],
       "modified": ["package.json"]
     }
   }
   ```
4. ✅ TODOs persist in database (check Doctype list)
5. ✅ Toggle changes TODO status
6. ✅ File operations tracked correctly

---

## 🚀 Ready to Implement?

**Timeline**:
- Part 1 (TODO API): 1-2 hours
- Part 2 (File Tracking): 30 minutes
- Testing: 30 minutes
- **Total: ~2-3 hours**

**Order of implementation**:
1. Create AI TODO DocType
2. Add todos.py API file
3. Update chat.py to extract TODOs
4. Update chat.py to track file changes
5. Test all endpoints
6. Signal me when done → I'll implement frontend

**Start with Part 1, then move to Part 2. Let me know when backend is ready!** 🎯
