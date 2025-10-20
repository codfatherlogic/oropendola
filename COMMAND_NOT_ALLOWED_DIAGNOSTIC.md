# Command Not Allowed - Diagnostic Steps

**Date**: 2025-10-19

## 🎯 Issue
You're seeing: `❌ Command failed: Command Not Allowed`

## 📋 Diagnostic Checklist

### Step 1: Check Your Mode
The extension has 3 modes:
- **ASK mode** (read-only) - NO tool execution ❌
- **AGENT mode** (default) - Full tool execution ✅
- **EDIT mode** (deprecated) - File operations only

**To check**: Look at the bottom of your chat interface or sidebar for mode indicator.

**To switch to AGENT mode**:
1. Use command palette (Cmd+Shift+P)
2. Type "Oropendola: Switch to Agent Mode"
3. Or check settings: `oropendola.conversationMode`

---

### Step 2: Open Output Panel

**CRITICAL**: This shows what's actually happening!

1. **View → Output** (or Cmd+Shift+U)
2. Select **"Oropendola AI Assistant"** from dropdown (top-right)
3. Try your command again
4. Look for these patterns:

#### ✅ If Commands ARE Working:
```
🔍 Found tool call #1
✅ Parsed tool call #1: run_terminal
💻 Executing command: git init
📁 Working directory: /Users/sammishthundiyil/oropendola
✅ Command output:
Initialized empty Git repository in /Users/sammishthundiyil/oropendola/.git/
```

#### ❌ If Commands Are NOT Being Attempted:
```
📊 Total tool calls found: 0
```
This means the AI didn't generate tool calls - just descriptive text.

#### 🔍 If You See ASK Mode:
```
ℹ️ ASK mode: Ignoring tool calls (read-only mode)
```
You're in read-only mode - switch to AGENT mode!

---

### Step 3: Test with Simple Command

Try asking the AI:

**Test 1 - File Creation**:
```
"Create a file called test.txt with the content 'Hello World'"
```

**Expected in Output Panel**:
```
🔍 Found tool call #1
✅ Parsed tool call #1: create_file
📝 Creating file: test.txt
✅ File created: test.txt
```

**Test 2 - Terminal Command**:
```
"Run the command: echo 'test' > test-output.txt"
```

**Expected in Output Panel**:
```
🔍 Found tool call #1
✅ Parsed tool call #1: run_terminal
💻 Executing command: echo 'test' > test-output.txt
✅ Command output: ...
```

---

## 🐛 Common Problems & Solutions

### Problem 1: ASK Mode Active
**Symptom**: Output shows `ℹ️ ASK mode: Ignoring tool calls`

**Solution**: Switch to AGENT mode
- Command: `Oropendola: Switch to Agent Mode`
- Or settings: `"oropendola.conversationMode": "agent"`

---

### Problem 2: AI Generating Text Instead of Tool Calls
**Symptom**: Output shows `📊 Total tool calls found: 0`

**What the AI should generate**:
\`\`\`tool_call
{
  "action": "run_terminal",
  "command": "git init",
  "description": "Initialize git repository"
}
\`\`\`

**What the AI is wrongly generating** (just descriptive text):
```
I'll initialize the git repository for you.

❌ Command failed: Command Not Allowed

Note: Terminal commands require permission.
```

**Solution**: 
- Check your AI backend configuration (Oropendola, OpenAI, Anthropic, etc.)
- The backend needs to be instructed to generate `tool_call` blocks
- See backend configuration docs for your provider

---

### Problem 3: Backend Whitelist (If Using Oropendola Backend)
**Symptom**: Commands fail at backend API level

**Check**: Your backend should have these in the whitelist:
```python
ALLOWLIST = [
    "ls", "pwd", "cat", "tail", "head", "grep",
    "pip", "python", "npm", "yarn", "git", "node"
]
```

**Solution**: Update backend whitelist to allow your command

---

## 🔧 Immediate Actions

1. ✅ **Check Output Panel** - This is the #1 diagnostic tool
2. ✅ **Verify AGENT mode** - Not ASK mode
3. ✅ **Test with simple file creation** - Proves tool execution works
4. ✅ **Check backend configuration** - For tool call support

---

## 📊 What You Should See (Successful Execution)

### In Chat:
```
AI: I'll create the file and initialize git.

✅ File created: package.json
✅ Command completed: git init

Done! Your repository is initialized.
```

### In Output Panel:
```
🔍 Found tool call #1
✅ Parsed tool call #1: create_file
📝 Creating file: package.json
✅ File created: package.json

🔍 Found tool call #2
✅ Parsed tool call #2: run_terminal
💻 Executing command: git init
✅ Command output:
Initialized empty Git repository...
```

---

## 🆘 Still Having Issues?

If after checking all the above you still see "Command Not Allowed":

1. **Share Output Panel logs** - Copy from "Oropendola AI Assistant" output
2. **Share your settings** - Check `oropendola.*` in settings.json
3. **Check AI provider** - Which backend are you using? (Oropendola, OpenAI, etc.)
4. **Test locally** - Try running the command manually in VS Code terminal

---

## 💡 Key Insight

The error message "Command Not Allowed" is **misleading**. It's not a permission issue with your OS or VS Code. It's either:

- ASK mode blocking execution (intentional)
- AI not generating proper tool calls (backend config issue)
- Backend API blocking the command (whitelist issue)

**The frontend extension has NO restrictions** - it can run any command when in AGENT mode!

