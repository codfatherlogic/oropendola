# Backend Fix Required - Tool Calling Not Working

## 🚨 Critical Issue

The backend AI at `https://oropendola.ai/api/method/ai_assistant.api.chat` is **NOT returning tool_calls** in API responses, causing the frontend to loop infinitely without executing any actions.

---

## 📊 Current Behavior (BROKEN)

### What Backend Returns Now:
```json
{
  "message": {
    "success": true,
    "response": "I'll help you set up the project step by step:\n\n1. First, create a new project directory:\n```bash\nmkdir electron-pos-app\ncd electron-pos-app\n```\n\n2. Initialize the project:\n```bash\nnpm init -y\n```\n\n3. Install necessary dependencies:\n```bash\nnpm install electron sqlite3\n```",
    "tool_calls": [],  // ← EMPTY! This is the problem
    "todos": [
      {
        "id": "todo_1",
        "text": "Create project directory",
        "completed": false,
        "order": 0
      },
      {
        "id": "todo_2", 
        "text": "Initialize npm project",
        "completed": false,
        "order": 1
      }
    ],
    "todo_stats": {
      "total": 9,
      "completed": 0,
      "pending": 9
    }
  }
}
```

### What Happens:
1. ✅ Backend creates TODOs correctly
2. ❌ Backend returns **empty** `tool_calls` array
3. ❌ Frontend has nothing to execute
4. ❌ Frontend prompts AI to try again
5. ❌ Backend still returns empty `tool_calls`
6. ❌ **Infinite loop** - no work gets done

---

## ✅ Expected Behavior (CORRECT)

### What Backend Should Return:
```json
{
  "message": {
    "success": true,
    "response": "Creating the project structure and initial files...",
    "tool_calls": [
      {
        "action": "create_file",
        "path": "package.json",
        "content": "{\n  \"name\": \"electron-pos-app\",\n  \"version\": \"1.0.0\",\n  \"main\": \"src/main/main.js\",\n  \"scripts\": {\n    \"start\": \"electron .\"\n  },\n  \"dependencies\": {\n    \"electron\": \"^27.0.0\",\n    \"sqlite3\": \"^5.1.6\"\n  }\n}"
      },
      {
        "action": "create_file",
        "path": "src/main/main.js",
        "content": "const { app, BrowserWindow } = require('electron');\n\nfunction createWindow() {\n  const win = new BrowserWindow({\n    width: 1200,\n    height: 800,\n    webPreferences: {\n      nodeIntegration: true\n    }\n  });\n  win.loadFile('src/renderer/index.html');\n}\n\napp.whenReady().then(createWindow);"
      },
      {
        "action": "create_file",
        "path": "src/renderer/index.html",
        "content": "<!DOCTYPE html>\n<html>\n<head>\n  <title>POS System</title>\n  <link rel=\"stylesheet\" href=\"styles/main.css\">\n</head>\n<body>\n  <div id=\"app\"></div>\n  <script src=\"js/app.js\"></script>\n</body>\n</html>"
      }
    ],
    "todos": [
      {
        "id": "todo_1",
        "text": "Create project structure",
        "completed": true,
        "order": 0
      },
      {
        "id": "todo_2",
        "text": "Set up main application files",
        "completed": false,
        "order": 1
      }
    ],
    "todo_stats": {
      "total": 5,
      "completed": 1,
      "pending": 4
    }
  }
}
```

### What Happens:
1. ✅ Backend creates TODOs
2. ✅ Backend returns **populated** `tool_calls` array with actual actions
3. ✅ Frontend executes the tool calls (creates files)
4. ✅ Frontend marks TODO as complete
5. ✅ Frontend continues to next TODO
6. ✅ **Work gets done** - files created, commands run

---

## 🔧 Required Backend Changes

### 1. System Prompt Must Force Tool Usage

Your backend's AI system prompt needs to **explicitly require tool_calls** in responses. Add this to your system prompt:

```python
SYSTEM_PROMPT = """
You are an AI coding assistant integrated into VS Code.

CRITICAL REQUIREMENT: You MUST return tool_calls in your API responses to execute actions.

AVAILABLE TOOLS:
1. create_file - Create a new file
   Format: {"action": "create_file", "path": "path/to/file.js", "content": "file contents"}

2. replace_string_in_file - Edit an existing file
   Format: {"action": "replace_string_in_file", "path": "path/to/file.js", "old_string": "code to replace", "new_string": "new code"}

3. run_in_terminal - Execute shell commands
   Format: {"action": "run_in_terminal", "command": "npm install"}

4. read_file - Read file contents
   Format: {"action": "read_file", "path": "path/to/file.js"}

5. grep_search - Search for code patterns
   Format: {"action": "grep_search", "pattern": "function.*", "path": "src/"}

RESPONSE FORMAT:
When user asks you to implement something, you MUST:
1. Return a brief description in "response" field
2. Return actual actions in "tool_calls" array
3. Update "todos" and "todo_stats" to track progress

EXAMPLE RESPONSE:
{
  "response": "Creating the main application entry point...",
  "tool_calls": [
    {
      "action": "create_file",
      "path": "src/index.js",
      "content": "console.log('Hello World');"
    }
  ],
  "todos": [...],
  "todo_stats": {...}
}

DO NOT:
- Just describe what you would do without tool_calls
- Show bash commands in the response text without tool_calls
- Ask for permission - execute immediately
- Return empty tool_calls array when work needs to be done

ALWAYS:
- Return tool_calls with actual file contents
- Execute one or more tools per response
- Mark TODOs as completed when done
- Continue until all work is finished
"""
```

### 2. Backend Code Structure

Your backend endpoint should look something like this:

```python
@frappe.whitelist()
def chat(messages, mode="agent", conversation_id=None, **kwargs):
    """
    Main chat endpoint for AI assistant
    """
    try:
        # Get AI response from Claude/OpenAI
        ai_response = get_ai_completion(
            messages=messages,
            system_prompt=SYSTEM_PROMPT,
            tools=AVAILABLE_TOOLS,  # ← Must enable tool calling
            tool_choice="auto"      # ← AI decides when to use tools
        )
        
        # Parse AI response
        response_text = ai_response.get("content", "")
        tool_calls = parse_tool_calls(ai_response)  # ← Extract tool calls
        
        # Parse TODOs from response
        todos = parse_todos_from_response(response_text)
        todo_stats = calculate_todo_stats(todos)
        
        return {
            "success": True,
            "response": response_text,
            "tool_calls": tool_calls,  # ← MUST NOT BE EMPTY when work needed
            "todos": todos,
            "todo_stats": todo_stats,
            "conversation_id": conversation_id,
            "model": ai_response.get("model"),
            "usage": ai_response.get("usage")
        }
        
    except Exception as e:
        frappe.log_error(f"Chat API Error: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


def parse_tool_calls(ai_response):
    """
    Extract tool calls from AI response
    
    For Claude: Check for tool_use content blocks
    For OpenAI: Check for function_call or tool_calls
    """
    tool_calls = []
    
    # Example for Claude API (Anthropic)
    if "content" in ai_response:
        for block in ai_response.get("content", []):
            if block.get("type") == "tool_use":
                tool_calls.append({
                    "action": block.get("name"),
                    **block.get("input", {})
                })
    
    # Example for OpenAI API
    if "tool_calls" in ai_response:
        for call in ai_response.get("tool_calls", []):
            tool_calls.append({
                "action": call.function.name,
                **json.loads(call.function.arguments)
            })
    
    return tool_calls
```

### 3. Tool Definitions

Define tools in the format your AI provider expects:

**For Claude (Anthropic):**
```python
CLAUDE_TOOLS = [
    {
        "name": "create_file",
        "description": "Create a new file with specified content",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "File path relative to workspace root"
                },
                "content": {
                    "type": "string",
                    "description": "Complete file contents"
                }
            },
            "required": ["path", "content"]
        }
    },
    {
        "name": "replace_string_in_file",
        "description": "Replace text in an existing file",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {"type": "string"},
                "old_string": {"type": "string"},
                "new_string": {"type": "string"}
            },
            "required": ["path", "old_string", "new_string"]
        }
    },
    {
        "name": "run_in_terminal",
        "description": "Execute a shell command",
        "input_schema": {
            "type": "object",
            "properties": {
                "command": {
                    "type": "string",
                    "description": "Shell command to execute"
                }
            },
            "required": ["command"]
        }
    }
]

# When calling Claude API:
response = anthropic.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=4096,
    tools=CLAUDE_TOOLS,  # ← Pass tools here
    messages=messages
)
```

**For OpenAI:**
```python
OPENAI_FUNCTIONS = [
    {
        "name": "create_file",
        "description": "Create a new file with specified content",
        "parameters": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "File path relative to workspace root"
                },
                "content": {
                    "type": "string",
                    "description": "Complete file contents"
                }
            },
            "required": ["path", "content"]
        }
    }
    # ... other functions
]

# When calling OpenAI API:
response = openai.ChatCompletion.create(
    model="gpt-4",
    messages=messages,
    functions=OPENAI_FUNCTIONS,  # ← Pass functions here
    function_call="auto"
)
```

---

## 🔍 How to Debug

### Check Your Backend Logs

Look for these in your backend logs:

```bash
# Good - Tools are being called
✓ AI returned 3 tool_calls
✓ Tool: create_file (package.json)
✓ Tool: create_file (src/main.js)
✓ Tool: create_file (README.md)

# Bad - No tools being called
✗ AI returned 0 tool_calls
✗ Response only contains text description
✗ No actions to execute
```

### Test Backend Directly

Test your API endpoint directly:

```bash
curl -X POST https://oropendola.ai/api/method/ai_assistant.api.chat \
  -H "Content-Type: application/json" \
  -H "Cookie: sid=your_session_id" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Create a simple hello.js file that prints Hello World"
      }
    ],
    "mode": "agent"
  }'
```

**Expected response should have:**
```json
{
  "message": {
    "tool_calls": [
      {
        "action": "create_file",
        "path": "hello.js",
        "content": "console.log('Hello World');"
      }
    ]
  }
}
```

**If you get `"tool_calls": []`, your backend is broken.**

---

## 📋 Checklist for Backend Team

- [ ] **System prompt updated** to explicitly require tool_calls in responses
- [ ] **Tool definitions** added to AI provider configuration (Claude/OpenAI)
- [ ] **Tool parsing logic** implemented to extract tool_calls from AI response
- [ ] **Response format** includes populated `tool_calls` array
- [ ] **Tested** that AI actually returns tool_calls (not empty array)
- [ ] **Verified** that different types of tools work (create_file, run_in_terminal, etc.)
- [ ] **Error handling** for when AI doesn't return expected tool format
- [ ] **Logging** added to track tool_calls generation

---

## 🚀 After Backend Fix

Once backend returns proper `tool_calls`, the frontend will:

1. ✅ Receive tool_calls from backend
2. ✅ Execute each tool (create files, run commands, etc.)
3. ✅ Mark TODOs as completed
4. ✅ Continue to next TODO automatically
5. ✅ Provide comprehensive completion summary
6. ✅ Show all file changes in UI

---

## 📞 Questions?

If you need help implementing this, check:

1. **Which AI provider are you using?** (Claude, OpenAI, other?)
2. **Where is your backend code?** (Frappe app? Python files?)
3. **Do you have access to backend logs?** (Check what AI is actually returning)
4. **Have you enabled tool/function calling?** (Most providers require explicit opt-in)

The frontend is ready and waiting for tool_calls. Fix the backend and everything will work.
