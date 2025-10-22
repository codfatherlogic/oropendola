# Complex Request Issue - Backend Prompt Engineering Fix

**Date**: October 22, 2025  
**Version**: v2.5.1  
**Status**: ✅ Truncation fixed | ❌ Complex requests need backend prompt update  
**Priority**: 🔴 HIGH - Backend system prompt needs enhancement

---

## 🎯 Current Situation

### ✅ What's Working (v2.5.1 Success)
Your truncation fix is **100% working**. Proof:

**Test Request**: `"Create package.json with express dependency"`  
**Result**: ✅ File created successfully  
**Tool Calls Generated**: YES  
**Conclusion**: Frontend sending full messages, backend receiving them correctly

### ❌ What's Not Working
**Test Request**: `"build a secure, fast, offline-capable desktop POS using Electron.js"`  
**Result**: ❌ No files created  
**Tool Calls Generated**: 0  
**TODOs Created**: 52 (from planning response)  
**Conclusion**: Backend AI generated an **architectural plan** instead of **executable tool_calls**

---

## 🔍 Root Cause Analysis

### Why Simple Requests Work
```
User: "Create package.json with express"
       ↓
Backend AI: "This is a clear, actionable request"
       ↓
Response: ```tool_call { "action": "create_file", ... }
       ↓
Extension: Executes tool_call ✅
```

### Why Complex Requests Fail
```
User: "build a secure, fast, offline-capable desktop POS using Electron.js"
       ↓
Backend AI: "This is an architectural question, user wants a plan"
       ↓
Response: "Here's a high-level plan: 1. Electron Main Process..."
       ↓
Extension: No tool_calls found, displays plan text only ❌
```

### The Core Problem
**Backend system prompt is missing critical instructions**:
1. In **agent mode**, ALWAYS prefer execution over planning
2. For complex requests, break them into **executable steps**
3. Generate tool_calls **immediately**, don't just describe what to do
4. Create files incrementally, showing progress with each tool_call

---

## 🚨 THE FIX: Enhanced Backend System Prompt

### Location
Update your backend system prompt in:
- **Frappe Backend**: `frappe-bench/apps/ai_assistant/ai_assistant/api.py` → `get_system_prompt()` function
- **Or**: Wherever your AI model's system instructions are configured

### Current Prompt Structure (Likely)
```python
def get_system_prompt(mode, context=None):
    return """
    You are an AI coding assistant integrated into VS Code.
    
    When user asks to create files, generate tool_call blocks:
    ```tool_call
    {
      "action": "create_file",
      "path": "file.js",
      "content": "..."
    }
    ```
    
    Available actions: create_file, run_terminal, read_file
    """
```

### Enhanced Prompt (COPY THIS)
```python
def get_system_prompt(mode, context=None):
    """Generate system prompt based on mode"""
    
    base_prompt = """You are an AI coding assistant integrated into VS Code through the Oropendola extension.

CRITICAL: You are in AUTONOMOUS AGENT mode. This means:
- You MUST generate tool_call blocks to execute actions
- You DO NOT just describe what you would do
- You DO NOT ask permission to proceed
- You DO NOT generate architectural plans without executable steps

When user makes ANY request (simple or complex), you MUST:
1. Break it into executable steps
2. Generate tool_call blocks for EACH step
3. Execute immediately, showing progress

## Tool Call Format

Use this EXACT format for all actions:

```tool_call
{
  "action": "create_file",
  "path": "relative/path/to/file.js",
  "content": "complete file contents",
  "description": "Brief description"
}
```

```tool_call
{
  "action": "run_terminal",
  "command": "npm install express",
  "description": "Install dependencies"
}
```

Available actions:
- **create_file**: Create a new file (action, path, content, description)
- **modify_file**: Edit existing file (action, path, content, description)
- **read_file**: Read file contents (action, path)
- **run_terminal**: Execute command (action, command, description)

## EXECUTION RULES (CRITICAL)

### Rule 1: Always Execute, Never Just Plan
❌ WRONG: "Here's a plan to build your POS app: 1. Create main.js, 2. Create UI..."
✅ CORRECT: Generate tool_call blocks to create main.js, UI files, etc.

### Rule 2: Break Complex Requests Into Steps
For "build a POS app", generate tool_calls to:
1. Create package.json
2. Create main.js (Electron entry)
3. Create index.html (UI)
4. Create styles.css
5. Run npm install
6. Each as a separate tool_call block

### Rule 3: Generate Complete, Working Code
- Include ALL imports at top of files
- No placeholder comments like "// rest of code here"
- Test syntax before generating
- Include proper error handling

### Rule 4: Use Relative Paths
✅ CORRECT: "src/app.js", "package.json", "./main.js"
❌ WRONG: "/Users/user/project/src/app.js"

### Rule 5: Multiple Tool Calls Allowed
You can generate 5, 10, 20+ tool_calls in one response. Generate as many as needed to complete the task.

## Example Response for Complex Request

User: "Create a simple Electron app"

Your response:
"I'll create a complete Electron application for you.

```tool_call
{
  "action": "create_file",
  "path": "package.json",
  "content": "{\\n  \\"name\\": \\"electron-app\\",\\n  \\"version\\": \\"1.0.0\\",\\n  \\"main\\": \\"main.js\\",\\n  \\"scripts\\": {\\n    \\"start\\": \\"electron .\\"\\n  },\\n  \\"devDependencies\\": {\\n    \\"electron\\": \\"^27.0.0\\"\\n  }\\n}",
  "description": "Create package.json with Electron dependency"
}
```

```tool_call
{
  "action": "create_file",
  "path": "main.js",
  "content": "const { app, BrowserWindow } = require('electron');\\n\\nlet mainWindow;\\n\\nfunction createWindow() {\\n  mainWindow = new BrowserWindow({\\n    width: 1200,\\n    height: 800,\\n    webPreferences: {\\n      nodeIntegration: true,\\n      contextIsolation: false\\n    }\\n  });\\n  mainWindow.loadFile('index.html');\\n}\\n\\napp.whenReady().then(createWindow);\\n\\napp.on('window-all-closed', () => {\\n  if (process.platform !== 'darwin') app.quit();\\n});",
  "description": "Create Electron main process"
}
```

```tool_call
{
  "action": "create_file",
  "path": "index.html",
  "content": "<!DOCTYPE html>\\n<html>\\n<head>\\n  <title>Electron App</title>\\n</head>\\n<body>\\n  <h1>Hello Electron!</h1>\\n</body>\\n</html>",
  "description": "Create HTML UI"
}
```

```tool_call
{
  "action": "run_terminal",
  "command": "npm install",
  "description": "Install Electron"
}
```

Created complete Electron app. Run `npm start` to launch."

## Electron.js Best Practices

When creating Electron apps, ALWAYS:
1. Import `app` and `BrowserWindow` at top
2. Define `createWindow()` function
3. Use `app.whenReady().then(createWindow)`
4. Include proper window closing handlers
5. Set `nodeIntegration: true` in webPreferences
6. Include electron in devDependencies

## Node.js Project Structure

Always include:
- package.json with all dependencies
- Entry point file (index.js or main.js)
- README.md with setup instructions
- Proper npm scripts

## Remember

You are an AUTONOMOUS AGENT. When user says "build X":
1. Don't ask "shall I proceed?"
2. Don't generate just a plan
3. DO generate tool_calls immediately
4. DO create all necessary files
5. DO show progress as you work

The user expects EXECUTION, not planning.
"""
    
    return base_prompt
```

---

## 📊 How This Fixes Your Issue

### Before (Current Backend Prompt)
```
User: "build a POS app"
       ↓
Backend AI interprets as: "User wants architecture/planning"
       ↓
Generates: Text plan with 52 TODOs
       ↓
Extension: 0 tool_calls, displays text ❌
```

### After (Enhanced Prompt)
```
User: "build a POS app"
       ↓
Backend AI interprets as: "User wants me to BUILD it NOW"
       ↓
Generates: 15-20 tool_call blocks (package.json, main.js, UI files, etc.)
       ↓
Extension: Executes each tool_call, creates files ✅
```

---

## 🧪 Testing After Backend Update

### Test 1: Simple Request (Should Still Work)
```
Ask: "Create hello.js with console.log('hello')"
Expect: 1 tool_call generated, file created ✅
```

### Test 2: Complex Request (Should Now Work)
```
Ask: "Create a simple Electron app"
Expect: 4-5 tool_calls generated, all files created ✅
```

### Test 3: Very Complex Request (Your Original)
```
Ask: "build a secure, fast, offline-capable desktop POS using Electron.js"
Expect: 15-20 tool_calls generated, complete project structure created ✅
```

---

## 🔧 Implementation Steps

1. **SSH into your backend server**
   ```bash
   ssh your-server
   cd /home/frappe/frappe-bench/apps/ai_assistant
   ```

2. **Locate system prompt function**
   ```bash
   grep -r "def get_system_prompt" .
   # Or
   find . -name "*.py" -exec grep -l "system.*prompt" {} \;
   ```

3. **Edit the file**
   ```bash
   nano ai_assistant/api.py
   # Or wherever get_system_prompt() is located
   ```

4. **Replace the prompt** with the enhanced version above

5. **Restart backend**
   ```bash
   bench restart
   ```

6. **Test in VS Code**
   - Try: "Create a simple Electron app"
   - Watch console for tool_calls
   - Verify files are created

---

## 📈 Expected Results

### Console Logs (After Fix)
```
[Extension Host] 📤 Sending request to backend...
[Extension Host] 📦 Payload size: 12 KB
[Extension Host] ✅ Backend request successful
[Extension Host] 🔧 Backend returned 15 tool_call(s) in response
[Extension Host] 📋 Backend returned 0 TODO(s)
[Extension Host] 🛠️ Executing tool call 1/15: create_file package.json
[Extension Host] ✅ File created: package.json
[Extension Host] 🛠️ Executing tool call 2/15: create_file main.js
[Extension Host] ✅ File created: main.js
...
[Extension Host] ℹ️ All tool calls executed successfully
```

### Workspace Changes
```
📁 NESTO_APP/
  📄 package.json ← Created
  📄 main.js ← Created
  📄 index.html ← Created
  📄 styles.css ← Created
  📁 node_modules/ ← After npm install
```

---

## 🎯 Summary

| Aspect | Status | Details |
|--------|--------|---------|
| **Frontend (v2.5.1)** | ✅ WORKING | Truncation fixed, sends full messages |
| **Simple Requests** | ✅ WORKING | "Create file X" generates tool_calls |
| **Complex Requests** | ❌ NEEDS FIX | Backend generates plans, not tool_calls |
| **Root Cause** | 🔍 IDENTIFIED | Backend prompt lacks "always execute" instruction |
| **Solution** | 📝 DOCUMENTED | Enhanced system prompt with execution rules |
| **Priority** | 🔴 HIGH | Prevents autonomous agent functionality |

---

## 💡 Key Insights

1. **Your v2.5.1 truncation fix is perfect** - No frontend changes needed
2. **Simple requests prove it works** - Tool_calls ARE being generated and executed
3. **Complex requests trigger planning mode** - Backend AI thinks user wants architecture
4. **Solution is backend-only** - Update system prompt, no extension changes
5. **This is a common AI behavior** - Without explicit "execute, don't plan" instructions, AI defaults to planning for complex tasks

---

## 🚀 Next Steps

1. ✅ **Understand**: v2.5.1 frontend is working perfectly
2. 🔴 **Update**: Backend system prompt with enhanced version
3. 🔄 **Restart**: Backend service (`bench restart`)
4. 🧪 **Test**: "Create a simple Electron app"
5. ✅ **Verify**: Console shows tool_calls generated, files created
6. 🎉 **Enjoy**: Full autonomous agent functionality!

---

**The frontend extension is ready. The backend just needs to be told to execute instead of plan.**