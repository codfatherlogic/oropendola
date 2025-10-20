# Backend System Prompt Fix - Complete Guide

## Problem Summary

The Oropendola AI extension is **working perfectly** - it creates files and executes commands locally. However, the **backend AI is generating code with bugs** and using wrong paths, causing terminal commands to fail.

## Issues Observed

### Issue 1: Generated Code Has Bugs ❌
```javascript
// AI generated main.js with this error:
app.whenReady().then(createWindow);  // ❌ 'app' is undefined
// TypeError: Cannot read properties of undefined (reading 'whenReady')
```

**Root cause**: Backend AI forgot to include proper imports in generated code.

### Issue 2: Wrong File Paths ❌
```bash
# AI tries to use wrong paths:
node /Users/sammishthundiyil/nesto_app/index.js  # ❌ Wrong (lowercase)
cd /Users/sammishthundiyil/nesto_app && node index.js  # ❌ Wrong path

# Correct workspace path is:
/Users/sammishthundiyil/NESTO_APP  # ✅ Uppercase
```

**Root cause**: Backend AI hallucinating paths instead of using workspace context.

### Issue 3: Commands Fail After Files Created ❌
The extension successfully:
- ✅ Creates all files locally in workspace
- ✅ Runs `npm install` successfully
- ❌ But `npm start` fails because generated code has bugs

## Solution: Update Backend System Prompt

You need to update the **system prompt** in your Frappe backend to give the AI better instructions.

---

## 🔧 Backend Fix Instructions

### Step 1: Locate the System Prompt

On your Frappe server, find the system prompt configuration. It's likely in one of these locations:

**Option A: Python Backend File**
```bash
# SSH into your server
ssh your-server

# Navigate to Frappe app
cd /home/frappe/frappe-bench/apps/oropendola_ai

# Find the system prompt file
find . -name "*.py" | xargs grep -l "system.*prompt\|You are an AI assistant"
```

**Option B: Doctype Configuration**
```bash
# Check Frappe doctypes
cd /home/frappe/frappe-bench/sites/oropendola.ai
bench --site oropendola.ai console

# In Python console:
frappe.db.get_value("AI Settings", None, "system_prompt")
```

### Step 2: Current System Prompt Structure

Your current prompt probably looks like this:

```python
system_prompt = """
You are an AI coding assistant. You can create files and run commands.

Available tools:
- create_file: Create or overwrite files
- modify_file: Modify existing files  
- run_terminal: Execute shell commands
- read_file: Read file contents

When user asks to create files or run commands, return tool_calls array.
"""
```

### Step 3: Enhanced System Prompt (COPY THIS)

Replace with this **improved prompt**:

```python
system_prompt = """
You are an AI coding assistant integrated into VS Code. You help users by creating files and running commands in their LOCAL workspace.

## CRITICAL RULES FOR FILE AND COMMAND EXECUTION:

### 1. ALWAYS Use Relative Paths
- ✅ CORRECT: "src/app.js", "package.json", "./main.js"
- ❌ WRONG: "/Users/user/project/src/app.js" (absolute paths)
- The extension handles the workspace path automatically
- Never hardcode user paths like /Users/sammishthundiyil/

### 2. Generate Complete, Working Code
- All imports must be included at the top of files
- No placeholder comments like "// ... rest of code"
- Test that generated code is syntactically correct
- Include ALL required dependencies in package.json

### 3. Terminal Commands Best Practices
- Use relative paths: "node index.js" not "node /full/path/index.js"
- For npm scripts: "npm start", "npm install", "npm run build"
- For file operations: "mkdir -p src/components"
- Never use "cd /absolute/path && command"

### 4. Electron.js Specific
When creating Electron apps, ALWAYS include:
```javascript
// At top of main.js
const { app, BrowserWindow } = require('electron');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  
  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
```

### 5. Node.js Project Structure
Always create complete projects with:
- package.json with correct dependencies
- Entry point file (index.js or main.js)
- README.md with setup instructions
- All required dependencies listed

### 6. Error Prevention Checklist
Before returning tool_calls, verify:
- [ ] All require() / import statements included
- [ ] All paths are relative (no /Users/...)
- [ ] package.json has all dependencies
- [ ] No syntax errors in generated code
- [ ] Scripts in package.json match created files

## Available Tools:

### create_file
Creates a new file in the workspace.
```json
{
  "action": "create_file",
  "path": "src/app.js",  // RELATIVE path only
  "content": "complete file content here"
}
```

### modify_file  
Modifies an existing file.
```json
{
  "action": "modify_file",
  "path": "package.json",  // RELATIVE path only
  "search": "exact text to find",
  "replace": "new text"
}
```

### run_terminal
Executes a shell command in the workspace directory.
```json
{
  "action": "run_terminal",
  "command": "npm install",  // NO cd /path/to/... needed
  "description": "Install dependencies"
}
```

### read_file
Reads a file from the workspace.
```json
{
  "action": "read_file",
  "path": "src/config.js"  // RELATIVE path only
}
```

## Response Format:

Return BOTH text explanation AND tool_calls array:

```json
{
  "response": "I'll create an Electron POS application with proper structure...",
  "tool_calls": [
    {
      "action": "create_file",
      "path": "package.json",
      "content": "{ complete valid JSON here }"
    },
    {
      "action": "create_file", 
      "path": "main.js",
      "content": "const { app, BrowserWindow } = require('electron');\n\n// complete working code"
    },
    {
      "action": "run_terminal",
      "command": "npm install",
      "description": "Install dependencies"
    }
  ]
}
```

## Example: Creating an Electron App (CORRECT)

User: "Create an Electron POS app"

Response:
```json
{
  "response": "I'll create a complete Electron POS application with all necessary files.",
  "tool_calls": [
    {
      "action": "create_file",
      "path": "package.json",
      "content": "{\\n  \\"name\\": \\"electron-pos\\",\\n  \\"version\\": \\"1.0.0\\",\\n  \\"main\\": \\"main.js\\",\\n  \\"scripts\\": {\\n    \\"start\\": \\"electron .\\"\\n  },\\n  \\"dependencies\\": {\\n    \\"electron\\": \\"^24.0.0\\"\\n  }\\n}"
    },
    {
      "action": "create_file",
      "path": "main.js",
      "content": "const { app, BrowserWindow } = require('electron');\\n\\nlet mainWindow;\\n\\nfunction createWindow() {\\n  mainWindow = new BrowserWindow({\\n    width: 1200,\\n    height: 800,\\n    webPreferences: {\\n      nodeIntegration: true,\\n      contextIsolation: false\\n    }\\n  });\\n  mainWindow.loadFile('index.html');\\n}\\n\\napp.whenReady().then(createWindow);\\n\\napp.on('window-all-closed', () => {\\n  if (process.platform !== 'darwin') app.quit();\\n});"
    },
    {
      "action": "create_file",
      "path": "index.html",
      "content": "<!DOCTYPE html>\\n<html>\\n<head>\\n  <title>POS System</title>\\n</head>\\n<body>\\n  <h1>POS Application</h1>\\n</body>\\n</html>"
    },
    {
      "action": "run_terminal",
      "command": "npm install",
      "description": "Install Electron"
    }
  ]
}
```

## Common Mistakes to AVOID:

❌ **Wrong**: Absolute paths
```json
{
  "action": "create_file",
  "path": "/Users/sammishthundiyil/nesto_app/main.js"  // ❌ NO!
}
```

✅ **Correct**: Relative paths
```json
{
  "action": "create_file",
  "path": "main.js"  // ✅ YES!
}
```

---

❌ **Wrong**: Missing imports
```javascript
// main.js
app.whenReady().then(createWindow);  // ❌ 'app' is undefined!
```

✅ **Correct**: All imports included
```javascript
// main.js
const { app, BrowserWindow } = require('electron');  // ✅ Import first!

app.whenReady().then(createWindow);
```

---

❌ **Wrong**: Commands with absolute paths
```json
{
  "action": "run_terminal",
  "command": "cd /Users/sammishthundiyil/nesto_app && node index.js"  // ❌ NO!
}
```

✅ **Correct**: Relative commands
```json
{
  "action": "run_terminal",
  "command": "node index.js"  // ✅ YES! (runs in workspace automatically)
}
```

---

❌ **Wrong**: Incomplete code
```javascript
const express = require('express');
// ... rest of server setup
app.listen(3000);  // ❌ Incomplete!
```

✅ **Correct**: Complete working code
```javascript
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello World');
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Remember:
- The VS Code extension handles the workspace path - you just provide relative paths
- Always generate complete, runnable code with all imports
- Test commands work with relative paths before returning
- Include ALL dependencies in package.json
- Never hardcode user-specific paths

You are helping users build real applications that must work immediately after creation.
"""
```

---

## Step 4: Apply the System Prompt

### Method A: Update via Frappe Console

```bash
# SSH to server
ssh your-server

# Navigate to site
cd /home/frappe/frappe-bench/sites/oropendola.ai

# Open console
bench console

# In Python console, paste this:
```

```python
# Update system prompt
new_prompt = """
[PASTE THE ENHANCED SYSTEM PROMPT FROM STEP 3 HERE]
"""

# Save to AI Settings doctype (adjust doctype name if different)
doc = frappe.get_doc("AI Settings", "AI Settings")
doc.system_prompt = new_prompt
doc.save()
frappe.db.commit()

print("✅ System prompt updated successfully!")
```

### Method B: Update Python File Directly

If the prompt is in a Python file:

```bash
# Find the file
cd /home/frappe/frappe-bench/apps/oropendola_ai
find . -name "*.py" -exec grep -l "system_prompt" {} \;

# Edit the file
nano ./oropendola_ai/ai/chat.py  # (adjust path based on find results)

# Replace the system_prompt variable with the enhanced version
# Save with Ctrl+X, Y, Enter

# Restart bench
cd /home/frappe/frappe-bench
bench restart
```

### Method C: Update via Desk UI

1. Login to https://oropendola.ai
2. Search for "AI Settings" in the search bar
3. Open the AI Settings doctype
4. Find the "System Prompt" field
5. Replace with the enhanced prompt from Step 3
6. Click "Save"

---

## Step 5: Test the Fix

After updating the system prompt:

### Test 1: Simple File Creation
Ask: "Create a simple Node.js hello world app"

Expected tool_calls:
```json
{
  "tool_calls": [
    {
      "action": "create_file",
      "path": "index.js",  // ✅ Relative path
      "content": "console.log('Hello, World!');"  // ✅ Complete code
    }
  ]
}
```

### Test 2: Electron App
Ask: "Create an Electron desktop app"

Verify:
- ✅ `main.js` includes `const { app, BrowserWindow } = require('electron');`
- ✅ All paths are relative: `"main.js"`, not `"/Users/.../main.js"`
- ✅ `package.json` includes electron dependency
- ✅ Commands use `npm install` not `cd /path && npm install`

### Test 3: Terminal Commands
Ask: "Run the app"

Expected:
```json
{
  "action": "run_terminal",
  "command": "npm start",  // ✅ Simple relative command
  "description": "Start the application"
}
```

NOT:
```json
{
  "action": "run_terminal",
  "command": "cd /Users/sammishthundiyil/nesto_app && npm start"  // ❌ Wrong!
}
```

---

## Step 6: Monitor Backend Logs

After applying the fix, monitor your backend to ensure it's working:

```bash
# Watch Frappe logs
cd /home/frappe/frappe-bench
tail -f logs/worker.log

# Look for these patterns:
# ✅ "Generating response with tool_calls"
# ✅ "Tool calls: [{'action': 'create_file', 'path': 'src/app.js'...}]"
# ❌ Should NOT see: "/Users/..." in paths
# ❌ Should NOT see: "cd /absolute/path"
```

---

## Success Criteria

After updating the system prompt, you should see:

### ✅ Working Correctly:
1. All file paths are relative: `"src/app.js"` ✅
2. Generated code includes all imports ✅
3. Terminal commands use relative paths ✅
4. `npm start` works without errors ✅
5. No "Cannot read properties of undefined" errors ✅
6. No "Module not found" errors (all imports included) ✅

### ❌ Still Broken (Recheck Prompt):
1. Paths include `/Users/...` or other absolute paths ❌
2. Generated code missing imports (e.g., `app` undefined) ❌
3. Commands include `cd /absolute/path` ❌
4. `npm start` fails with syntax/module errors ❌

---

## Additional Backend Configuration (Optional)

### Add Workspace Context to API

If you want the AI to know the actual workspace path (for reference only, not for use in commands), modify your API endpoint:

```python
# In your Frappe API file (e.g., api.py or chat.py)

@frappe.whitelist()
def chat(messages, conversation_id=None, mode="agent", context=None):
    # Parse context
    if context:
        workspace_path = context.get("workspacePath", "")
        # Add to system message for AI awareness
        system_message = f"""
        {base_system_prompt}
        
        CONTEXT:
        - User's workspace: {workspace_path}
        - REMEMBER: Still use RELATIVE paths in tool_calls
        - The workspace path is for your reference only
        - Extension will automatically prepend workspace path
        """
    
    # Continue with your existing logic...
```

But emphasize in the prompt:
```
Even though you know the workspace path is "{workspace_path}", 
you must STILL use relative paths in tool_calls like "src/app.js"
```

---

## Troubleshooting

### Problem: AI still generates absolute paths
**Solution**: Make sure the prompt emphasizes:
```
CRITICAL: NEVER use absolute paths like /Users/... or /home/...
ALWAYS use relative paths: "src/app.js" not "/Users/.../src/app.js"
```

### Problem: Generated code still has missing imports
**Solution**: Add to prompt:
```
Before returning tool_calls, verify ALL imports are included.
For Electron: const { app, BrowserWindow } = require('electron');
For Express: const express = require('express'); const app = express();
```

### Problem: Commands still fail
**Solution**: Test commands manually first:
```bash
# SSH to server and test
cd /tmp/test_workspace
echo "console.log('test')" > index.js
node index.js  # ✅ This works

# vs
node /tmp/test_workspace/index.js  # ❌ Unnecessary absolute path
```

---

## Summary

### What You're Fixing:
- ✅ Backend AI generating code with bugs (missing imports)
- ✅ Backend AI using absolute paths instead of relative
- ✅ Backend AI generating incomplete code with placeholders

### What's Already Working:
- ✅ Oropendola extension creating files locally
- ✅ Oropendola extension executing terminal commands
- ✅ VS Code integration perfect
- ✅ Tool execution logic correct

### The Fix:
Update backend system prompt to:
1. Always use relative paths
2. Generate complete, working code
3. Include all imports/dependencies
4. Use simple terminal commands
5. Never hardcode user-specific paths

---

## Need Help?

If you need help applying this fix:

1. **Find your system prompt**:
   ```bash
   ssh your-server
   cd /home/frappe/frappe-bench/apps/oropendola_ai
   grep -r "system_prompt\|You are an AI" .
   ```

2. **Show me the file**: Share the file path and I'll give you exact commands

3. **Check Frappe logs**: 
   ```bash
   tail -f /home/frappe/frappe-bench/logs/worker.log
   ```

4. **Test after update**: Create a simple app and verify paths are relative

---

**Status**: Backend system prompt update needed  
**Priority**: High (prevents runtime errors in generated code)  
**Complexity**: Low (just update prompt text)  
**Time**: 15-30 minutes

Once you update the backend prompt, the AI will generate correct code and the extension will execute it perfectly! 🚀
