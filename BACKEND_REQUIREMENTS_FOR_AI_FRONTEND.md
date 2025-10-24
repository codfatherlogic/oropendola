# Backend Requirements for AI Coding Assistant Frontend
**Date**: 2025-10-24
**Purpose**: Define backend API contract for VS Code extension (v3.2.7+)
**Based on**: Deep-dive VS Code extension architecture review

---

## 🎯 Executive Summary

The VS Code extension (frontend) handles:
- ✅ Context collection (files, cursor, workspace)
- ✅ Framework detection (local heuristics)
- ✅ File location resolution (learning from workspace)
- ✅ Conversation memory (session + persistent)
- ✅ UI rendering (diffs, chat, ghost text)
- ✅ Execution (file creation, git operations)

**What the backend MUST provide**:
- 🔴 **Code generation** based on structured requests
- 🔴 **Plan generation** (multi-file scaffolding)
- 🔴 **Risk assessment** for operations
- 🔴 **Streaming support** for real-time feedback
- 🔴 **Agent mode orchestration** (multi-step plans)

---

## 📋 Backend API Contract

### 1. Request Format (Frontend → Backend)

**Endpoint**: `POST /ai/generate` or `WS /ai/stream`

**Request Schema**:
```json
{
  "user": "Create Doctype Driver with fields driver_name, license, phone",
  "intent": "create_doctype",
  "framework": {
    "name": "frappe",
    "confidence": 0.95,
    "version": "14.0"
  },
  "workspace": {
    "root": "/home/user/frappe-bench",
    "app_roots": ["apps/transport", "apps/sales"],
    "preferred_app": "transport"
  },
  "context": {
    "top_files": [
      {
        "path": "apps/transport/transport/doctype/vehicle/vehicle.json",
        "preview": "{\"name\": \"Vehicle\", \"fields\": [...]}",
        "language": "json"
      },
      {
        "path": "apps/transport/transport/doctype/vehicle/vehicle.py",
        "preview": "class Vehicle(Document):\n    def validate(self):\n        ...",
        "language": "python"
      }
    ],
    "cursor_context": {
      "file": "apps/transport/transport/doctype/vehicle/vehicle.py",
      "line": 10,
      "column": 4,
      "selection": "def validate(self):",
      "snippet": "# 200 lines around cursor"
    }
  },
  "memory_refs": {
    "last_created": {
      "type": "doctype",
      "name": "customer_feedback",
      "path": "apps/transport/transport/doctype/customer_feedback/"
    },
    "conversation": [
      {"role": "user", "text": "Create Customer Feedback doctype"},
      {"role": "assistant", "text": "Created Customer Feedback doctype with 5 fields"}
    ]
  },
  "mode": "ask",
  "preferences": {
    "auto_migrate": false,
    "create_tests": true,
    "use_typescript": false
  }
}
```

**Required Fields**:
- `user` (string) - User's message/command
- `intent` (string) - Detected intent (see Intent Types below)
- `framework` (object) - Framework detection result
- `workspace` (object) - Workspace metadata
- `context` (object) - Code context

**Optional Fields**:
- `memory_refs` - Conversation memory and last actions
- `mode` - "ask" or "agent" mode
- `preferences` - User preferences

---

### 2. Response Format (Backend → Frontend)

**Plan-Based Response** (for multi-file operations):
```json
{
  "type": "plan",
  "intent": "create_doctype",
  "framework": "frappe",
  "target": "apps/transport/transport/doctype/driver",
  "files": [
    {
      "path": "driver.json",
      "action": "create",
      "content": "{\n  \"name\": \"Driver\",\n  \"fields\": [\n    {\"fieldname\": \"driver_name\", \"fieldtype\": \"Data\", \"reqd\": 1}\n  ]\n}",
      "language": "json"
    },
    {
      "path": "driver.py",
      "action": "create",
      "content": "from frappe.model.document import Document\n\nclass Driver(Document):\n\tpass",
      "language": "python"
    },
    {
      "path": "driver.js",
      "action": "create",
      "content": "frappe.ui.form.on('Driver', {\n\trefresh: function(frm) {\n\n\t}\n});",
      "language": "javascript"
    }
  ],
  "commands": [
    "bench --site site1.local migrate"
  ],
  "risk": "low",
  "risk_factors": [
    "Creates new files only (no edits)",
    "Standard Frappe structure"
  ],
  "explanation": "Creates a Driver Doctype with 3 files (JSON schema, Python controller, JS client script) following Frappe v14 conventions.",
  "next_steps": [
    "Review the generated files",
    "Add validation logic in driver.py if needed",
    "Test the Doctype in your site"
  ]
}
```

**Inline Completion Response** (for single-line suggestions):
```json
{
  "type": "completion",
  "text": "    return self.driver_name if self.driver_name else ''",
  "language": "python",
  "confidence": 0.87,
  "provenance": "Based on similar patterns in Vehicle.py"
}
```

**Edit Response** (for modifying existing files):
```json
{
  "type": "edit",
  "target_file": "apps/transport/transport/doctype/driver/driver.json",
  "edits": [
    {
      "action": "insert",
      "line": 15,
      "content": "    {\"fieldname\": \"email\", \"fieldtype\": \"Data\", \"label\": \"Email\"},\n    {\"fieldname\": \"phone\", \"fieldtype\": \"Data\", \"label\": \"Phone\"}"
    }
  ],
  "risk": "low",
  "explanation": "Adding email and phone fields to Driver Doctype"
}
```

**Streaming Response** (for progressive output):
```json
// Chunk 1
{"type": "stream", "chunk": "Creating Driver Doctype...\n"}

// Chunk 2
{"type": "stream", "chunk": "Generated driver.json\n"}

// Chunk 3
{"type": "stream", "chunk": "Generated driver.py\n"}

// Final chunk
{
  "type": "plan",
  "files": [...],
  "risk": "low"
}
```

**Error Response**:
```json
{
  "type": "error",
  "error": {
    "code": "INVALID_FRAMEWORK",
    "message": "Framework 'unknown-framework' is not supported",
    "suggestions": [
      "Supported frameworks: frappe, react, django, electron, express",
      "Try: 'Create React component' or 'Create Frappe DocType'"
    ]
  }
}
```

---

## 🎯 Intent Types (Backend Must Handle)

### Framework-Specific Intents

**Frappe**:
- `create_doctype` - Create new DocType with fields
- `add_field` - Add field to existing DocType
- `create_api` - Create API endpoint
- `create_page` - Create Frappe Page
- `create_report` - Create Report
- `create_server_script` - Create Server Script

**React**:
- `create_component` - Create React component
- `create_page` - Create page component
- `create_hook` - Create custom hook
- `create_context` - Create Context provider

**Electron**:
- `scaffold_app` - Create full Electron app structure
- `create_window` - Create new window
- `add_ipc_handler` - Add IPC communication

**Django**:
- `create_model` - Create Django model
- `create_view` - Create view
- `create_serializer` - Create DRF serializer

### Generic Intents:
- `explain_code` - Explain selected code
- `fix_error` - Fix error at cursor
- `refactor` - Refactor code
- `add_tests` - Generate tests
- `document` - Add documentation

---

## 🔧 Backend Processing Requirements

### 1. Framework Template System

**Backend must maintain templates for each framework**:

```python
# Pseudocode
TEMPLATES = {
    'frappe': {
        'doctype': {
            'json': DOCTYPE_JSON_TEMPLATE,
            'py': DOCTYPE_PY_TEMPLATE,
            'js': DOCTYPE_JS_TEMPLATE
        },
        'api': API_PY_TEMPLATE
    },
    'react': {
        'component': COMPONENT_TSX_TEMPLATE,
        'hook': HOOK_TS_TEMPLATE
    }
}

def generate_plan(request):
    framework = request['framework']['name']
    intent = request['intent']

    template = TEMPLATES[framework][intent]

    # Fill template with user data
    files = template.render(request['user'], request['context'])

    return {
        'type': 'plan',
        'files': files,
        'risk': assess_risk(files)
    }
```

### 2. Risk Assessment Algorithm

**Backend must evaluate risk level**:

```python
def assess_risk(plan):
    risk_score = 0
    factors = []

    # Risk factors
    for file in plan['files']:
        if file['action'] == 'create':
            risk_score += 0  # Safe
        elif file['action'] == 'edit':
            risk_score += 1
            factors.append(f"Modifying existing file: {file['path']}")
        elif file['action'] == 'delete':
            risk_score += 3
            factors.append(f"Deleting file: {file['path']}")

        # Check critical files
        if file['path'] in ['package.json', 'requirements.txt', 'hooks.py']:
            risk_score += 2
            factors.append(f"Editing critical file: {file['path']}")

    # Determine risk level
    if risk_score == 0:
        return 'low', factors
    elif risk_score <= 2:
        return 'medium', factors
    else:
        return 'high', factors
```

### 3. Context Understanding

**Backend must parse frontend context and use relevant parts**:

```python
def use_context(request):
    context = request['context']

    # Use open files as examples
    for file in context['top_files']:
        if file['language'] == 'python':
            # Extract patterns from Python files
            extract_python_patterns(file['preview'])

    # Use cursor context for inline completions
    if context['cursor_context']:
        cursor_file = context['cursor_context']['file']
        cursor_line = context['cursor_context']['line']
        # Generate completion at cursor position
```

### 4. Memory Integration

**Backend should use conversation memory**:

```python
def resolve_reference(user_message, memory_refs):
    # Handle "it", "this", "that" references
    if 'it' in user_message.lower() or 'this' in user_message.lower():
        if memory_refs.get('last_created'):
            entity = memory_refs['last_created']
            # "Add field to it" → "Add field to Driver Doctype"
            return f"Add field to {entity['name']} {entity['type']}"

    return user_message

def generate_with_memory(request):
    user = request['user']
    memory = request.get('memory_refs', {})

    # Resolve references
    resolved_user = resolve_reference(user, memory)

    # Use conversation history for context
    conversation = memory.get('conversation', [])

    # Generate with full context
    return generate_plan(resolved_user, conversation)
```

---

## 🌊 Streaming Implementation

### WebSocket Endpoint

**`WS /ai/stream`**

```python
async def stream_generation(websocket, request):
    """Stream plan generation to frontend"""

    # Send progress updates
    await websocket.send(json.dumps({
        'type': 'stream',
        'chunk': 'Analyzing request...\n'
    }))

    # Detect intent
    intent = detect_intent(request['user'])
    await websocket.send(json.dumps({
        'type': 'stream',
        'chunk': f'Intent: {intent}\n'
    }))

    # Generate files
    files = []
    for file_name in ['driver.json', 'driver.py', 'driver.js']:
        await websocket.send(json.dumps({
            'type': 'stream',
            'chunk': f'Generating {file_name}...\n'
        }))

        content = generate_file(file_name, request)
        files.append({
            'path': file_name,
            'action': 'create',
            'content': content
        })

    # Send final plan
    await websocket.send(json.dumps({
        'type': 'plan',
        'files': files,
        'risk': 'low'
    }))
```

---

## 🤖 Agent Mode Support

### Multi-Step Plan Generation

**Backend must support complex, multi-step operations**:

```python
def generate_agent_plan(request):
    """Generate multi-step plan for agent mode"""

    user = request['user']

    # Example: "Create a complete authentication system"
    steps = [
        # Step 1: Create models
        {
            'step': 1,
            'description': 'Create User model',
            'files': [
                {'path': 'models/user.py', 'action': 'create', 'content': '...'}
            ],
            'risk': 'low'
        },
        # Step 2: Create views
        {
            'step': 2,
            'description': 'Create authentication views',
            'files': [
                {'path': 'views/auth.py', 'action': 'create', 'content': '...'}
            ],
            'dependencies': [1],  # Depends on step 1
            'risk': 'medium'
        },
        # Step 3: Add tests
        {
            'step': 3,
            'description': 'Create tests for auth',
            'files': [
                {'path': 'tests/test_auth.py', 'action': 'create', 'content': '...'}
            ],
            'dependencies': [1, 2],
            'risk': 'low'
        }
    ]

    return {
        'type': 'agent_plan',
        'steps': steps,
        'total_steps': len(steps),
        'overall_risk': 'medium'
    }
```

---

## 📊 Backend API Summary Table

| Feature | Endpoint | Method | Request | Response | Priority |
|---------|----------|--------|---------|----------|----------|
| **Code Generation** | `/ai/generate` | POST | Structured request | Plan JSON | 🔴 Critical |
| **Streaming** | `/ai/stream` | WS | Structured request | Stream chunks + Plan | 🟠 High |
| **Inline Completion** | `/ai/complete` | POST | Cursor context | Completion text | 🟡 Medium |
| **Explain Code** | `/ai/explain` | POST | Code snippet | Explanation | 🟡 Medium |
| **Fix Error** | `/ai/fix` | POST | Error + context | Fix patch | 🟡 Medium |
| **Agent Plan** | `/ai/agent` | POST | Complex request | Multi-step plan | 🟠 High |
| **Health Check** | `/health` | GET | - | Status | 🟢 Low |

---

## 🎨 Example Backend Implementation (Python/FastAPI)

### Minimal Server

```python
from fastapi import FastAPI, WebSocket
from pydantic import BaseModel
import json

app = FastAPI()

class GenerateRequest(BaseModel):
    user: str
    intent: str
    framework: dict
    workspace: dict
    context: dict
    memory_refs: dict = {}
    mode: str = "ask"

class PlanResponse(BaseModel):
    type: str = "plan"
    intent: str
    framework: str
    target: str
    files: list
    commands: list = []
    risk: str
    explanation: str

@app.post("/ai/generate")
async def generate_plan(request: GenerateRequest):
    """Generate code plan based on structured request"""

    # 1. Detect intent (already provided by frontend)
    intent = request.intent
    framework = request.framework['name']

    # 2. Get appropriate template
    template = get_template(framework, intent)

    # 3. Parse user message for entities
    entities = extract_entities(request.user)

    # 4. Generate files using template
    files = []

    if framework == 'frappe' and intent == 'create_doctype':
        doctype_name = entities.get('name', 'Driver')
        fields = entities.get('fields', [])

        # Generate JSON
        files.append({
            'path': f'{doctype_name.lower()}.json',
            'action': 'create',
            'content': generate_frappe_json(doctype_name, fields),
            'language': 'json'
        })

        # Generate Python controller
        files.append({
            'path': f'{doctype_name.lower()}.py',
            'action': 'create',
            'content': generate_frappe_controller(doctype_name),
            'language': 'python'
        })

        # Generate JS
        files.append({
            'path': f'{doctype_name.lower()}.js',
            'action': 'create',
            'content': generate_frappe_client_script(doctype_name),
            'language': 'javascript'
        })

    # 5. Assess risk
    risk, risk_factors = assess_risk(files)

    # 6. Determine target path (use frontend's learned location)
    target = request.workspace.get('preferred_app', 'apps/custom_app')

    # 7. Return plan
    return {
        'type': 'plan',
        'intent': intent,
        'framework': framework,
        'target': f'{target}/{doctype_name.lower()}',
        'files': files,
        'commands': ['bench --site site1.local migrate'],
        'risk': risk,
        'risk_factors': risk_factors,
        'explanation': f'Creates {doctype_name} Doctype with {len(fields)} fields'
    }

@app.websocket("/ai/stream")
async def stream_generation(websocket: WebSocket):
    """Stream plan generation progressively"""
    await websocket.accept()

    # Receive request
    data = await websocket.receive_text()
    request = json.loads(data)

    # Send progress updates
    await websocket.send_json({
        'type': 'stream',
        'chunk': 'Analyzing request...\n'
    })

    # Generate plan
    plan = await generate_plan_internal(request)

    # Send file by file
    for file in plan['files']:
        await websocket.send_json({
            'type': 'stream',
            'chunk': f'Generated {file["path"]}\n'
        })

    # Send final plan
    await websocket.send_json(plan)

def generate_frappe_json(name, fields):
    """Generate Frappe DocType JSON"""
    return json.dumps({
        'name': name,
        'fields': [
            {
                'fieldname': field['name'],
                'fieldtype': field.get('type', 'Data'),
                'label': field['name'].title(),
                'reqd': field.get('required', 0)
            }
            for field in fields
        ]
    }, indent=2)

def generate_frappe_controller(name):
    """Generate Frappe Python controller"""
    return f'''from frappe.model.document import Document

class {name}(Document):
    pass
'''

def generate_frappe_client_script(name):
    """Generate Frappe JS client script"""
    return f'''frappe.ui.form.on('{name}', {{
    refresh: function(frm) {{

    }}
}});
'''

def assess_risk(files):
    """Assess risk level of operation"""
    if all(f['action'] == 'create' for f in files):
        return 'low', ['Only creating new files']
    else:
        return 'medium', ['Modifying existing files']
```

---

## 🔐 Security Requirements

### 1. Input Validation

**Backend MUST validate**:
- File paths (no `../`, absolute paths only within workspace)
- File sizes (limit content size to prevent DoS)
- Command execution (whitelist only safe commands)

```python
def validate_file_path(path, workspace_root):
    """Ensure file path is safe"""
    abs_path = os.path.abspath(os.path.join(workspace_root, path))

    # Must be within workspace
    if not abs_path.startswith(workspace_root):
        raise ValueError(f"Invalid path: {path} (outside workspace)")

    # No hidden files except .vscode
    if '/.git/' in abs_path or '/.env' in abs_path:
        raise ValueError(f"Cannot modify sensitive file: {path}")

    return abs_path
```

### 2. Command Execution Safety

**Only allow whitelisted commands**:
```python
SAFE_COMMANDS = {
    'frappe': ['bench migrate', 'bench build', 'bench console'],
    'node': ['npm install', 'npm test', 'npm run build'],
    'python': ['pip install', 'pytest', 'python manage.py migrate']
}

def validate_command(command, framework):
    """Check if command is safe to execute"""
    safe = SAFE_COMMANDS.get(framework, [])

    for safe_cmd in safe:
        if command.startswith(safe_cmd):
            return True

    raise ValueError(f"Unsafe command: {command}")
```

---

## 📈 Performance Requirements

### Response Time Targets

| Operation | Target | Max |
|-----------|--------|-----|
| Simple completion | < 500ms | 1s |
| Plan generation (3-5 files) | < 2s | 5s |
| Complex plan (>10 files) | < 5s | 10s |
| Streaming first chunk | < 300ms | 500ms |

### Optimization Strategies

1. **Template caching** - Pre-compile templates
2. **Lazy loading** - Load framework templates on-demand
3. **Streaming** - Send partial results immediately
4. **Batch processing** - Generate multiple files in parallel

---

## ✅ Backend Implementation Checklist

### Core Functionality
- [ ] POST `/ai/generate` endpoint
- [ ] WebSocket `/ai/stream` endpoint
- [ ] Structured request parsing (JSON schema validation)
- [ ] Plan-based response generation
- [ ] Risk assessment algorithm
- [ ] Template system for all supported frameworks
- [ ] Intent detection/routing

### Framework Support
- [ ] Frappe templates (DocType, API, Page, Report)
- [ ] React templates (Component, Hook, Context)
- [ ] Electron templates (Window, IPC)
- [ ] Django templates (Model, View, Serializer)
- [ ] Express templates (Route, Controller)

### Advanced Features
- [ ] Streaming support (progressive output)
- [ ] Agent mode (multi-step plans)
- [ ] Memory integration (conversation context)
- [ ] Reference resolution ("it", "this", "that")
- [ ] Error handling and recovery

### Security
- [ ] Input validation (paths, sizes)
- [ ] Command whitelisting
- [ ] Rate limiting
- [ ] Authentication/authorization

### Performance
- [ ] Response time < 2s for simple plans
- [ ] Template caching
- [ ] Parallel file generation
- [ ] Streaming for >3 files

---

## 🎯 Summary: What Backend Must Provide

### 1. **Structured Code Generation**
   - Input: JSON request with intent, framework, context
   - Output: Plan JSON with files, commands, risk

### 2. **Template System**
   - Maintain templates for Frappe, React, Electron, Django, etc.
   - Render templates with user data

### 3. **Risk Assessment**
   - Evaluate every plan for safety
   - Return risk level: low/medium/high

### 4. **Streaming Support**
   - Progressive output via WebSocket
   - Send chunks as files are generated

### 5. **Agent Mode**
   - Multi-step plan generation
   - Dependency tracking between steps

### 6. **Security**
   - Validate all inputs
   - Whitelist commands
   - Prevent path traversal

### 7. **Performance**
   - < 2s for simple plans
   - < 5s for complex plans
   - Streaming first chunk < 500ms

---

**Document created**: 2025-10-24
**Version**: Backend Requirements v1.0
**Status**: Ready for implementation
