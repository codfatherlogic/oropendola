# Oropendola AI v2.0.11 - Debug Build Instructions

## 🔍 Debug Build Created

**Filename:** `oropendola-ai-assistant-2.0.11-debug.vsix`
**Size:** 3.69 MB
**Files:** 1,303 files
**Purpose:** Diagnose TODO panel not displaying issue

---

## 🎯 What Was Added

### Enhanced Debug Logging

I've added comprehensive debug logging to track the TODO parsing flow:

### 1. **TodoManager.parseFromAIResponse()** (`src/utils/todo-manager.js`)

**Added Logs:**
```javascript
🔍 [TodoManager] parseFromAIResponse called
🔍 [TodoManager] Response length: X
🔍 [TodoManager] Response type: string
🔍 [TodoManager] Analyzing X lines
🔍 [TodoManager] Found numbered todo: [task text]
🔍 [TodoManager] Parsing complete: X todos found
🔍 [TodoManager] First 3 todos: [...]
```

**Location:** Lines 26-28, 40, 62, 135-138

**Purpose:** Verify that the parser is receiving the AI response and detecting numbered lists

---

### 2. **SidebarProvider._parseTodosFromResponse()** (`src/sidebar/sidebar-provider.js`)

**Added Logs:**
```javascript
🔍 [PARSE] _parseTodosFromResponse called
🔍 [PARSE] Response text length: X
🔍 [PARSE] First 500 chars: [preview]
🔍 [PARSE] Calling TodoManager.parseFromAIResponse...
🔍 [PARSE] TodoManager returned: X todos
⚠️ [PARSE] No todos parsed from response
❌ [PARSE] Parse TODOs error: [error details]
```

**Location:** Lines 1353-1365, 1390, 1393-1394

**Purpose:** Verify that the sidebar provider is calling the parser and handling results

---

### 3. **SidebarProvider._updateTodoDisplay()** (`src/sidebar/sidebar-provider.js`)

**Added Logs:**
```javascript
🔍 [TODO] _updateTodoDisplay called
❌ [TODO] No webview available!
🔍 [TODO] Todos to display: X
🔍 [TODO] Stats: {total: X, completed: Y, pending: Z}
🔍 [TODO] Sending updateTodos message to webview
```

**Location:** Lines 1333-1347

**Purpose:** Verify that the display method is being called and sending messages to the webview

---

## 📊 Expected Console Output

### ✅ **Working System** (What You Should See)

When TODOs are properly detected, you'll see this sequence:

```
🔍 [PARSE] _parseTodosFromResponse called
🔍 [PARSE] Response text length: 1247
🔍 [PARSE] First 500 chars: I'll help you create a POS desktop application using Electron.js. I'll break this down into multiple steps and create the necessary files with a well-structured application.

1. First, let's set up the basic project structure and dependencies:
2. Create the main Electron process file:
3. Create the database handler:
4. Create the main HTML interface:
5. Create the styles:
🔍 [PARSE] Calling TodoManager.parseFromAIResponse...
🔍 [TodoManager] parseFromAIResponse called
🔍 [TodoManager] Response length: 1247
🔍 [TodoManager] Response type: string
🔍 [TodoManager] Analyzing 47 lines
🔍 [TodoManager] Found numbered todo: First, let's set up the basic project structure and dependencies:
🔍 [TodoManager] Found numbered todo: Create the main Electron process file:
🔍 [TodoManager] Found numbered todo: Create the database handler:
🔍 [TodoManager] Found numbered todo: Create the main HTML interface:
🔍 [TodoManager] Found numbered todo: Create the styles:
🔍 [TodoManager] Parsing complete: 5 todos found
🔍 [TodoManager] First 3 todos: [{text: "First, let's set up...", type: "numbered"}, ...]
🔍 [PARSE] TodoManager returned: 5 todos
📝 Parsed 5 TODO items from AI response
🔍 [TODO] _updateTodoDisplay called
🔍 [TODO] Todos to display: 5
🔍 [TODO] Stats: {total: 5, completed: 0, pending: 5}
🔍 [TODO] Sending updateTodos message to webview
🔄 Creating TODOs in backend DocType...
✅ Successfully saved 5 TODOs to backend
```

### ❌ **Broken System** (Current Issue)

What you're seeing now:

```
📋 Backend returned 0 TODO(s)
📂 File changes: 4 files affected
```

**Missing:** All the debug logs above!

---

## 🚀 How to Test

### Step 1: Install Debug Build

```bash
# Uninstall current version (if any)
code --uninstall-extension your-publisher.oropendola-ai-assistant

# Install debug build
code --install-extension oropendola-ai-assistant-2.0.11-debug.vsix
```

### Step 2: Reload VS Code

- Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
- Type: "Developer: Reload Window"
- Press Enter

### Step 3: Open Developer Tools

1. **VS Code Main Window:**
   - Help → Toggle Developer Tools
   - Switch to Console tab

2. **Webview Developer Tools:**
   - In sidebar, right-click on the chat area
   - Select "Inspect Element" or "Toggle Developer Tools"
   - Switch to Console tab

### Step 4: Test TODO Creation

Ask the AI:
```
Create a POS desktop application using Electron.js
```

Or any request that should generate a numbered list.

### Step 5: Check Console Output

**In VS Code Main Window Console**, look for:

1. **Parsing Started:**
   ```
   🔍 [PARSE] _parseTodosFromResponse called
   ```

2. **TodoManager Called:**
   ```
   🔍 [TodoManager] parseFromAIResponse called
   ```

3. **Todos Found:**
   ```
   🔍 [TodoManager] Found numbered todo: ...
   ```

4. **Display Updated:**
   ```
   🔍 [TODO] _updateTodoDisplay called
   ```

5. **Webview Message Sent:**
   ```
   🔍 [TODO] Sending updateTodos message to webview
   ```

**In Webview Console**, look for:
```
[WEBVIEW] updateTodos received X todos
```

---

## 🐛 Diagnostic Scenarios

### Scenario 1: No `_parseTodosFromResponse` Call

**Symptom:** Missing `🔍 [PARSE] _parseTodosFromResponse called`

**Diagnosis:** The method is not being invoked at all

**Fix:** Check line 1832 in sidebar-provider.js - ensure `assistantMessage` event is firing

---

### Scenario 2: Parser Returns 0 Todos

**Symptom:**
```
🔍 [PARSE] _parseTodosFromResponse called
🔍 [TodoManager] Parsing complete: 0 todos found
⚠️ [PARSE] No todos parsed from response
```

**Diagnosis:** AI response doesn't match regex patterns

**Fix:** Check the "First 500 chars" output - verify it contains numbered list like "1. Task, 2. Task"

---

### Scenario 3: Webview Not Receiving Message

**Symptom:**
```
🔍 [TODO] Sending updateTodos message to webview
```
But no `[WEBVIEW] updateTodos received` in webview console

**Diagnosis:** Webview communication broken

**Fix:** Check if webview is initialized - look for `❌ [TODO] No webview available!`

---

### Scenario 4: Backend Override

**Symptom:**
```
📝 Parsed 5 TODO items from AI response
🔍 [TODO] _updateTodoDisplay called
📋 Backend returned 0 TODOs - keeping locally parsed TODOs
```

But UI still shows empty

**Diagnosis:** Backend's 0 result might be sent after local update, clearing UI

**Fix:** Check timing - if `📋 Backend returned 0 TODOs` appears AFTER local parsing, it's overriding

---

## 📝 What to Share

After testing, please share:

1. **Full console output** from VS Code main window (copy all logs)
2. **Full console output** from webview developer tools
3. **Screenshot** of the AI response that should have created TODOs
4. **Which scenario** (1-4 above) matches your output

---

## 🔍 Common Issues

### Issue 1: Debug Logs Not Appearing

**Problem:** No debug logs at all

**Solution:**
- Verify you installed the debug build
- Check extension is activated: Look for "Oropendola AI v2.0.11" in Extensions panel
- Reload window: `Cmd+Shift+P` → "Developer: Reload Window"

### Issue 2: Too Many Logs

**Problem:** Console is flooded

**Solution:**
- Filter console by typing `[TodoManager]` or `[PARSE]` in filter box
- This will show only TODO-related logs

### Issue 3: Webview Console Empty

**Problem:** Can't find webview developer tools

**Solution:**
- Open Oropendola sidebar
- Right-click directly on the chat area
- Select "Inspect Element"
- Look for a new window titled "Developer Tools - Webview"

---

## 🎯 Next Steps After Diagnosis

Based on the console output, we'll identify:

1. **Where the flow breaks** (parsing, display, or webview communication)
2. **Why TODOs aren't detected** (regex issue, response format, or backend override)
3. **The exact fix needed** (pattern update, timing fix, or backend integration)

---

## 📦 Build Details

### Files Modified

1. **src/utils/todo-manager.js**
   - Lines 26-28: Entry logging
   - Line 40: Line count logging
   - Line 62: Numbered todo detection logging
   - Lines 135-138: Completion logging

2. **src/sidebar/sidebar-provider.js**
   - Lines 1353-1365: Parse method entry and error logging
   - Lines 1333-1347: Display method logging

### Build Command Used

```bash
vsce package --out oropendola-ai-assistant-2.0.11-debug.vsix
```

### Package Contents

- **Total Files:** 1,303
- **JavaScript Files:** 457
- **Total Size (uncompressed):** 15.63 MB
- **VSIX Size:** 3.69 MB

---

## ⚠️ Important Notes

1. **This is a debug build** - Contains extra logging that will impact performance slightly
2. **Not for production** - Use only for diagnostics
3. **Console will be verbose** - This is expected and necessary
4. **Share full logs** - Don't truncate console output when reporting

---

## 🔄 Reverting to Production Build

Once we identify the issue:

```bash
# Uninstall debug build
code --uninstall-extension your-publisher.oropendola-ai-assistant

# Install production build (after fix)
code --install-extension oropendola-ai-assistant-2.0.11.vsix
```

---

## 📞 Support

If you encounter issues installing or testing:

1. Check VS Code version: Minimum required is specified in package.json
2. Check Extension Host logs: `Cmd+Shift+P` → "Developer: Show Logs" → "Extension Host"
3. Try clean install: Uninstall completely, restart VS Code, then reinstall

---

**Status:** ✅ Debug Build Ready
**Version:** 2.0.11-debug
**Date:** 2025-01-20
**Purpose:** Diagnose TODO panel not displaying issue

**🎯 Install this build, test TODO creation, and share the console output!**
