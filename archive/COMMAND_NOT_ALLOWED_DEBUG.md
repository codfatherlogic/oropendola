# "Command Not Allowed" Error - Debugging Guide

**Date**: 2025-10-19  
**Error**: "Executed: Initialize git repository ❌ Command failed: Command Not Allowed"

---

## 🔍 Root Cause Analysis

The "Command Not Allowed" error is **NOT** coming from the frontend code. Here's why:

### Where Commands Execute

```javascript
// File: src/core/ConversationTask.js (Line 697)
async _executeTerminalCommand(command, _description) {
    try {
        // Executes LOCALLY using Node.js child_process
        const { stdout, stderr } = await execPromise(command, {
            cwd: workspacePath,
            env: { ...process.env }
        });
        
        return {
            success: true,
            content: `Command executed successfully: ${output}`
        };
    } catch (error) {
        // Errors would say: "Failed to execute command"
        throw new Error(`Failed to execute command "${command}": ${error.message}`);
    }
}
```

**Expected error format**: `"Failed to execute command \"git init\": [system error]"`  
**Actual error**: `"Command Not Allowed"`

### Where "Command Not Allowed" Comes From

There are **3 possible sources**:

#### Option 1: AI Response Text (Most Likely)
The AI might be **generating** this error message in its response, not actually trying to execute the command.

**Example**:
```
AI Response:
"I've created the files. 

❌ Command failed: Command Not Allowed

Note: Terminal commands are restricted."
```

This would appear as an error in the UI, but it's just **text from the AI**, not an actual execution error.

#### Option 2: Backend Whitelist (If AI Calls Backend API)
If the AI is generating a tool call that goes to your **Frappe backend** instead of running locally, the backend whitelist would apply.

**From your original claim** (backend whitelist):
```python
ALLOWLIST = [
    "ls", "pwd", "cat", "tail", "head", "grep",
    "pip", "python", "bench",
    "npm", "yarn", "git"  # ✅ git IS allowed!
]
```

So if the backend is being called, `git init` **should work** since `git` is in the whitelist.

#### Option 3: Tool Parsing Error
The AI might be generating the tool call in an incorrect format that's not being parsed properly.

---

## 🧪 How to Debug

### Step 1: Check VS Code Output Panel

1. Open VS Code Output panel (View → Output)
2. Select "Oropendola AI Assistant" from dropdown
3. Look for these log messages:

**If command executes locally:**
```
💻 Executing command: git init
📁 Working directory: /path/to/workspace
✅ Command output: ...
```

**If command fails to execute:**
```
❌ Command failed: git init
Error: [actual error message]
```

**If tool call isn't parsed:**
```
📊 Total tool calls found: 0
```

### Step 2: Check What Tool Call AI Generated

The AI should generate something like:
```markdown
```tool_call
{
  "action": "run_terminal",
  "command": "git init",
  "description": "Initialize git repository"
}
```
```

**Possible issues:**
- ❌ Wrong action name (not `run_terminal` or `execute_command`)
- ❌ Missing `command` field
- ❌ Malformed JSON
- ❌ AI didn't generate a tool call at all (just text)

### Step 3: Check if Backend is Being Called

Look for network requests in Output panel:
```
📤 Sending optimization request: ...
```

If you see backend API calls for command execution, that means the AI is trying to use the backend instead of local execution.

---

## 💡 Possible Solutions

### Solution 1: AI Not Generating Tool Calls

**Problem**: AI is just saying "I would run git init" but not actually generating the tool_call block.

**Fix**: Improve the system prompt to ensure AI generates tool calls.

Add to sidebar-provider.js:
```javascript
const instruction = 
    'Execute the plan you just outlined. ' +
    'Create all the files with their complete implementation. ' +
    'Then run any necessary setup commands (npm install, git init, etc.) ' +
    'using the run_terminal tool. ' +
    'IMPORTANT: Generate actual tool_call blocks in markdown format, do not just describe what you would do.';
```

### Solution 2: Tool Call Format Issue

**Problem**: AI generating tool calls in wrong format.

**Current regex** (ConversationTask.js line 388):
```javascript
const toolCallRegex = /```tool_call\s*\n([\s\S]*?)\n```/g;
```

**Check if AI is using different syntax:**
- `tool_use` instead of `tool_call`
- `execute_tool` instead of `run_terminal`
- Different markdown fence format

**Fix**: Add logging to see what the AI actually generates:

```javascript
_parseToolCalls(aiResponse) {
    console.log('🔍 AI Response:', aiResponse.substring(0, 500));  // Log first 500 chars
    
    // ... existing parsing code ...
}
```

### Solution 3: Backend Redirect Issue

**Problem**: Commands being sent to backend instead of local execution.

**Check**: Does your chat manager call a backend API for tool execution?

**Fix**: Ensure ConversationTask handles all tool execution locally, don't send to backend.

---

## 🎯 Recommended Next Steps

### Immediate Action

1. **Install the updated VSIX** (with PATH fix)
   ```bash
   code --install-extension oropendola-ai-assistant-2.0.1.vsix
   ```

2. **Enable verbose logging**
   
   Add this to ConversationTask.js after line 82:
   ```javascript
   console.log('🔍 AI Full Response:', response.substring(0, 1000));
   console.log('🔍 Tool calls parsed:', JSON.stringify(toolCalls, null, 2));
   ```

3. **Try a simple command first**
   
   Ask AI: "Run the command: echo 'test'"
   
   This should work since `echo` is a basic shell command.

4. **Check Output panel for actual errors**
   
   The real error message will be in the Output panel, not in the chat UI.

### If Still Fails

**Collect debug info:**
1. Full text from Output panel (Oropendola AI Assistant)
2. Screenshot of the tool call the AI generated
3. Check if git is in your PATH:
   ```bash
   which git  # macOS/Linux
   where git  # Windows
   ```

### Quick Test

Create a test file to verify local execution works:

```javascript
// test-command.js
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

(async () => {
    try {
        const { stdout } = await execPromise('git --version', {
            env: { ...process.env }
        });
        console.log('✅ Git works:', stdout);
    } catch (error) {
        console.log('❌ Git failed:', error.message);
    }
})();
```

Run:
```bash
cd /Users/sammishthundiyil/oropendola
node test-command.js
```

If this works, the issue is with tool call parsing/generation, not command execution.

---

## 📊 Error Source Matrix

| Error Message | Source | Fix |
|---------------|--------|-----|
| "Command Not Allowed" | AI text response | Improve prompts |
| "Failed to execute command: ..." | Local execution error | Check PATH, permissions |
| "Command exited with code 127" | Command not found | Add to PATH |
| "Unknown tool action: ..." | Tool parsing error | Fix AI tool call format |
| No error, but nothing happens | Tool call not parsed | Check regex, logging |

---

## 🚀 Updated Package Available

I've already created a new VSIX with:
- ✅ PATH environment inherited (`env: { ...process.env }`)
- ✅ Terminal commands enabled in sidebar-provider.js
- ✅ All infrastructure in place

**File**: `oropendola-ai-assistant-2.0.1.vsix`

Install it and check the Output panel for actual execution logs!

---

## 📝 Next Steps Summary

1. ✅ Install updated VSIX
2. 🔍 Check Output panel during next attempt
3. 📋 Share Output panel logs if issue persists
4. 🧪 Test with simple `echo` command first
5. 🔧 Add debug logging if needed

The "Command Not Allowed" message is misleading - the actual issue is likely in tool call generation/parsing, not execution!
