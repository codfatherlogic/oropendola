# 🚨 URGENT: Backend AI System Prompt Update

**Priority**: 🔴 CRITICAL - DO THIS FIRST  
**Time Required**: 15-30 minutes  
**Complexity**: Easy ⭐⭐  
**Impact**: Fixes ALL execution issues

---

## 🎯 What You Need to Do

Update your AI backend's system prompt to generate `tool_call` blocks in the correct format.

---

## 📍 Where to Update

### If Using Oropendola AI Backend (Frappe):

**File**: `frappe-bench/apps/ai_assistant/ai_assistant/api.py`

**Look for**: System prompt or instruction text sent to AI model

**Location in code** (approximately):
```python
# Around line 50-100
SYSTEM_PROMPT = """
You are an AI assistant...
"""

# OR

def get_system_prompt():
    return """
    You are an AI assistant...
    """
```

---

## ✅ NEW System Prompt (Copy This)

Replace your current system prompt with this:

```python
SYSTEM_PROMPT = """You are an AI coding assistant integrated into VS Code through the Oropendola extension.

When you need to perform actions (create files, run commands, etc.), you MUST generate tool_call blocks in your response using this exact format:

\`\`\`tool_call
{
  "action": "create_file",
  "path": "relative/path/to/file.js",
  "content": "file contents here",
  "description": "Brief description of what you're creating"
}
\`\`\`

\`\`\`tool_call
{
  "action": "run_terminal",
  "command": "npm install express",
  "description": "Install Express dependency"
}
\`\`\`

Available actions:
- **create_file**: Create a new file
  - Required: action, path, content
  - Optional: description
  
- **modify_file** or **edit_file**: Edit an existing file
  - Required: action, path, content
  - Optional: description
  
- **read_file**: Read file contents
  - Required: action, path
  
- **run_terminal** or **execute_command**: Execute terminal command
  - Required: action, command
  - Optional: description

CRITICAL RULES:
1. ALWAYS generate tool_call blocks for actions - do NOT just describe what you would do
2. Each tool_call must be in its own markdown code block with \`\`\`tool_call
3. The JSON inside must be valid (proper quotes, commas, brackets)
4. Use "action" field to specify the action type
5. Multiple tool_calls are allowed in one response
6. After tool_calls, you can add explanatory text

Example response:
"I'll create a Node.js application for you.

\`\`\`tool_call
{
  "action": "create_file",
  "path": "package.json",
  "content": "{\\n  \\"name\\": \\"my-app\\",\\n  \\"version\\": \\"1.0.0\\"\\n}",
  "description": "Create package.json"
}
\`\`\`

\`\`\`tool_call
{
  "action": "create_file",
  "path": "index.js",
  "content": "console.log('Hello World');",
  "description": "Create main entry file"
}
\`\`\`

\`\`\`tool_call
{
  "action": "run_terminal",
  "command": "npm install",
  "description": "Install dependencies"
}
\`\`\`

Done! The application is ready. You can run it with 'node index.js'."

The VS Code extension will execute these tool_calls locally on the user's machine.

DO NOT say things like:
- "I cannot run commands" ❌
- "You'll need to run this manually" ❌
- "I don't have access to the filesystem" ❌

Instead, generate the appropriate tool_call blocks! The extension WILL execute them.
"""
```

---

## 🔧 Step-by-Step Update Process

### Step 1: Locate Your Backend

```bash
# Find your Frappe bench directory
cd ~/frappe-bench
# or
cd /home/frappe/frappe-bench

# Navigate to AI assistant app
cd apps/ai_assistant/ai_assistant
```

### Step 2: Find the System Prompt

```bash
# Search for system prompt
grep -r "system.*prompt\|SYSTEM_PROMPT" *.py
grep -r "You are an AI" *.py
grep -r "assistant" api.py
```

Common locations:
- `api.py` - Main API file
- `ai_handler.py` - AI handler
- `config.py` - Configuration file
- `prompts.py` - Prompt templates

### Step 3: Edit the File

```bash
# Use your preferred editor
nano api.py
# or
vim api.py
# or
code api.py
```

### Step 4: Replace System Prompt

Find the existing system prompt and replace it with the new one above.

**Before** (example):
```python
SYSTEM_PROMPT = """
You are an AI assistant for VS Code.
Help users with coding tasks.
"""
```

**After**:
```python
SYSTEM_PROMPT = """You are an AI coding assistant integrated into VS Code through the Oropendola extension.

When you need to perform actions (create files, run commands, etc.), you MUST generate tool_call blocks in your response using this exact format:

\`\`\`tool_call
{
  "action": "create_file",
  "path": "relative/path/to/file.js",
  "content": "file contents here",
  "description": "Brief description of what you're creating"
}
\`\`\`
...
"""
```

### Step 5: Restart Backend

```bash
# Restart Frappe
cd ~/frappe-bench
bench restart

# Or if using supervisorctl
sudo supervisorctl restart all

# Or if using systemd
sudo systemctl restart frappe-bench
```

### Step 6: Clear AI Cache (if applicable)

```bash
# Clear Redis cache
bench --site your-site.local redis-cache-keys "*ai*" | xargs -L1 bench --site your-site.local redis-cache-del

# Or restart Redis
sudo systemctl restart redis
```

---

## 🧪 Test the Update

### Test 1: Simple File Creation

**In VS Code**, ask Oropendola:
```
Create a file called test.txt with the content "Hello World"
```

**Check browser console** (Help → Toggle Developer Tools):

**✅ Success - You should see**:
```
🔍 Found tool call #1
✅ Parsed tool call #1: create_file
📝 Creating file: test.txt
✅ File created successfully
```

**❌ Failure - You'll see**:
```
📊 Total tool calls found: 0
```

### Test 2: Terminal Command

**Ask**:
```
Run the command: echo 'Backend updated successfully'
```

**✅ Success - You should see**:
```
🔍 Found tool call #1
✅ Parsed tool call #1: run_terminal
💻 Executing command: echo 'Backend updated successfully'
✅ Command output: Backend updated successfully
```

### Test 3: Multiple Actions

**Ask**:
```
Create a simple Node.js app with package.json and index.js
```

**✅ Success - You should see**:
```
🔍 Found tool call #1
✅ Parsed tool call #1: create_file (package.json)
🔍 Found tool call #2
✅ Parsed tool call #2: create_file (index.js)
```

---

## 📊 Verification Checklist

After updating:

- [ ] Backend restarted successfully
- [ ] Cache cleared (if applicable)
- [ ] Test 1 passes (file created in workspace)
- [ ] Test 2 passes (command executed)
- [ ] Test 3 passes (multiple files created)
- [ ] No "Command Not Allowed" errors
- [ ] Files visible in VS Code explorer
- [ ] Console shows tool call parsing logs

---

## 🐛 Troubleshooting

### Problem: Still seeing "Total tool calls found: 0"

**Possible causes**:
1. System prompt not updated correctly
2. Backend not restarted
3. Cache not cleared
4. Wrong AI model being used

**Solutions**:
```bash
# 1. Verify prompt was saved
grep -A 5 "tool_call" api.py

# 2. Force restart
bench restart
sudo systemctl restart frappe-bench

# 3. Clear all caches
bench clear-cache
bench clear-website-cache

# 4. Check AI model configuration
bench --site your-site.local console
>>> frappe.get_doc('AI Settings', 'AI Settings').as_dict()
```

### Problem: Backend error after update

**Check logs**:
```bash
# Frappe logs
tail -f ~/frappe-bench/logs/frappe.log

# Worker logs
tail -f ~/frappe-bench/logs/worker.log

# Error logs
tail -f ~/frappe-bench/logs/error.log
```

### Problem: Syntax error in Python

Make sure:
- Triple quotes are correct: `"""`
- Backticks are escaped: `\\`\\`\\``
- Newlines are properly handled
- No missing quotes or brackets

---

## 🎯 Alternative: If You Can't Access Backend

If you can't modify the backend, you can implement **text extraction** on the frontend as a workaround:

**File**: `src/core/ConversationTask.js`

Add this fallback after line 430:

```javascript
/**
 * Fallback: Extract actions from AI text if no tool_call blocks found
 */
_extractActionsFromText(aiResponse) {
    const actions = [];
    
    // Pattern 1: "Create file X with content Y"
    const filePattern = /(?:create|make)\s+(?:a\s+)?(?:file|script)\s+(?:called\s+|named\s+)?[`"']([^`"']+)[`"']\s+with\s+(?:content|code)?:?\s*[`"']([\\s\\S]*?)[`"']/gi;
    let match;
    
    while ((match = filePattern.exec(aiResponse)) !== null) {
        actions.push({
            action: 'create_file',
            path: match[1],
            content: match[2].replace(/\\\\n/g, '\\n'),
            description: `Create ${match[1]}`
        });
    }
    
    // Pattern 2: "Run command X"
    const cmdPattern = /(?:run|execute)\s+(?:command|cmd)?:?\s*[`"']([^`"']+)[`"']/gi;
    
    while ((match = cmdPattern.exec(aiResponse)) !== null) {
        actions.push({
            action: 'run_terminal',
            command: match[1],
            description: `Execute: ${match[1]}`
        });
    }
    
    return actions;
}
```

Then modify `_parseToolCalls`:

```javascript
_parseToolCalls(aiResponse) {
    // ... existing parsing code ...
    
    console.log(`📊 Total tool calls found: ${toolCalls.length}`);
    
    // NEW: Fallback to text extraction
    if (toolCalls.length === 0) {
        console.log('⚠️ No tool_call blocks found, trying text extraction...');
        const extracted = this._extractActionsFromText(aiResponse);
        
        if (extracted.length > 0) {
            console.log(`✅ Extracted ${extracted.length} action(s) from text`);
            return extracted.map((action, i) => ({
                id: `call_${this.taskId}_${Date.now()}_${i}`,
                ...action
            }));
        }
    }
    
    return toolCalls;
}
```

But this is **NOT recommended** - fixing the backend is much better!

---

## ✅ Success Criteria

You'll know it's working when:

1. ✅ AI responses contain `\`\`\`tool_call` blocks
2. ✅ Console shows "Found tool call #1, #2, etc."
3. ✅ Files appear in VS Code workspace
4. ✅ Commands execute in terminal
5. ✅ No "Command Not Allowed" errors
6. ✅ No "Total tool calls found: 0" messages

---

## 🚀 After This Works

Once backend is fixed, you can improve:

1. **Workspace context** - Send file list to AI
2. **TODO tracking** - Better integration
3. **File tree awareness** - AI sees existing files
4. **Error handling** - Better error messages
5. **Performance** - Optimize parsing

But **first**, get the system prompt working!

---

**Priority**: 🔴 DO THIS NOW  
**Impact**: Fixes everything  
**Time**: 15-30 minutes  
**Difficulty**: Easy

Good luck! 🎉
