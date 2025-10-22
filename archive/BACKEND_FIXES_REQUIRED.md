# 🚨 URGENT: Backend Fixes Required for Oropendola AI Assistant

## Problem Summary
Users report that when asking the AI to create files (e.g., "Create an Electron POS app"), the AI responds with descriptions but **NO files are actually created**. The console shows: `📊 Total tool calls found: 0`.

---

## Root Cause
The AI model is **NOT generating** the required ```tool_call markdown blocks. The frontend parser is working correctly, but the backend AI prompt doesn't instruct the model to use the tool_call format.

---

## Required Fix #1: System Prompt (CRITICAL - DO THIS FIRST)

### File
`ai_assistant/api.py` → `get_system_prompt()` function

### What to Change
The system prompt for `agent` mode MUST explicitly instruct the AI to generate tool_call blocks.

### Current Behavior ❌
```
AI Response:
"I'll create an Electron POS app for you.

✅ Created package.json
✅ Created main.js
✅ Created renderer.js
...
```
**Result**: NO files created (just text descriptions)

### Required Behavior ✅
```
AI Response:
"I'll create an Electron POS app:

1. Create package.json
2. Create main.js  
3. Create renderer.js

Let's start:

```tool_call
{
  "action": "create_file",
  "path": "package.json",
  "content": "{ \"name\": \"pos-app\", ... }",
  "description": "Package configuration"
}
```
"
```
**Result**: Files are ACTUALLY created

---

## System Prompt Template (Copy This)

```python
def get_system_prompt(mode, context=None):
    """Generate system prompt based on mode"""
    
    if mode == 'agent':
        prompt = """You are an AI coding assistant with file manipulation capabilities.

**CRITICAL: You MUST use tool_call format for ALL file operations!**

**Tool Call Format (MANDATORY):**
```tool_call
{
  "action": "create_file",
  "path": "path/to/file.js",
  "content": "file content here",
  "description": "Purpose of this file"
}
```

**Available Actions:**
- create_file: Create a new file
- modify_file: Edit existing file
- read_file: Read file contents
- execute_command: Run terminal command

**Workflow Example:**

USER: "Create a Node.js hello world app"

ASSISTANT: "I'll create a Node.js application:

1. Create package.json
2. Create index.js

```tool_call
{
  "action": "create_file",
  "path": "package.json",
  "content": "{\\n  \\"name\\": \\"hello-world\\",\\n  \\"version\\": \\"1.0.0\\"\\n}",
  "description": "Package configuration"
}
```
"

SYSTEM: "✅ Created package.json"

ASSISTANT: "Now creating the main file:

```tool_call
{
  "action": "create_file",
  "path": "index.js",
  "content": "console.log('Hello, World!');",
  "description": "Main entry point"
}
```
"

**REMEMBER: ALWAYS wrap file operations in ```tool_call blocks!**
"""
    
    else:  # ask mode
        prompt = """You are an AI assistant in read-only mode. Provide guidance only, NO file operations."""
    
    # Add context if available
    if context:
        if context.get('workspace'):
            prompt += f"\\n\\nWorkspace: {context['workspace']}"
        if context.get('activeFile'):
            prompt += f"\\nActive file: {context['activeFile']['path']}"
    
    return prompt
```

---

## Required Fix #2: TODO List API (Medium Priority)

### Endpoints Needed

1. **Extract TODOs** (parses AI responses for numbered lists)
   ```
   POST /api/method/ai_assistant.api.extract_todos
   ```

2. **Save TODOs** (persists to database)
   ```
   POST /api/method/ai_assistant.api.save_todos
   ```

3. **Get TODOs** (retrieves saved TODOs)
   ```
   GET /api/method/ai_assistant.api.get_todos
   ```

### Full Implementation
See `BACKEND_TODO_API_SPEC.md` for complete Python code examples.

---

## Testing Checklist

### Test #1: File Creation
```bash
USER: "Create a package.json file with name 'test-app'"
EXPECTED: AI generates ```tool_call block AND file is created
```

### Test #2: Multiple Files
```bash
USER: "Create an Express.js server with index.js and config.js"
EXPECTED: AI generates MULTIPLE ```tool_call blocks AND both files are created
```

### Test #3: TODO Extraction
```bash
USER: "Create a React app"
AI Response: "I'll create:
1. Create package.json
2. Create App.js
3. Create index.html"

EXPECTED: Frontend shows TODO list with 3 checkboxes
```

---

## Priority Order

1. ✅ **URGENT**: Fix system prompt (Fix #1) - **Do this immediately!**
2. 🟡 **HIGH**: Implement `extract_todos()` endpoint
3. 🟢 **MEDIUM**: Implement `save_todos()` and `get_todos()` endpoints

---

## Questions?
See full specification: `BACKEND_TODO_API_SPEC.md`
Contact: sammish@oropendola.ai
