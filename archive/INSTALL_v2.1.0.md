# Quick Install - v2.1.0 🚀

## ✨ What's New in v2.1.0

**Interactive AI Mode** - AI now discusses, analyzes, and asks permission before taking action!

### **4 Major Improvements:**

1. **📱 All messages align left** - Better visual consistency
2. **🧠 Deep workspace analysis** - AI understands your project structure
3. **💬 Interactive discussion** - AI asks for permission before executing
4. **📋 Smart TODOs** - Grouped by phases with context

---

## 📦 Installation

### **Step 1: Install Extension**

```bash
code --install-extension /Users/sammishthundiyil/oropendola/oropendola-ai-assistant-2.1.0.vsix --force
```

### **Step 2: Reload VS Code**

**Option A: Command Palette**
- Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
- Type: `Developer: Reload Window`
- Press Enter

**Option B: Complete Restart** (Recommended for first install)
- Quit VS Code completely
- Reopen VS Code
- Open your workspace

---

## ✅ Verify Installation

### **1. Check Version**

- Open Oropendola AI sidebar (bird icon)
- Open Developer Tools: `Cmd+Option+I` (macOS) or `Ctrl+Shift+I` (Windows)
- Console tab should show:
  ```
  [Webview Init] Version: oropendola-ai-assistant-2.1.0
  ```

### **2. Check System Prompt**

- Send any message to AI
- Console should show:
  ```
  [Extension Host] Adding system message with interactive guidelines
  ```

### **3. Test Interactive Mode**

**Send this:**
```
Create a new doctype called Employee
```

**AI should respond with:**
```
🔍 Analyzing your workspace...

Based on your Frappe project, here's my plan:

📋 TODOs:
1. Create employee.json (doctype definition)
2. Create employee.py (controller)
3. Create employee.js (client script)
4. Add permissions

Shall I proceed with these changes?
```

**✅ If AI asks "Shall I proceed?" → Installation successful!**

**❌ If AI immediately creates files → Old version still cached:**
- Quit VS Code completely
- Delete workspace cache: `rm -rf ~/Library/Application\ Support/Code/User/workspaceStorage/`
- Reopen VS Code

---

## 🎯 Quick Test Suite

### **Test 1: Message Alignment**
```
Send: "Hello"
Expected: Your message appears on LEFT side with BLUE border
          AI response appears on LEFT side with GREEN border
```

### **Test 2: Workspace Analysis**
```
Send: "What can you tell me about my workspace?"
Expected: AI describes your project type, files, dependencies
```

### **Test 3: Permission Request**
```
Send: "Add a new field to Driver doctype"
Expected: AI presents plan and asks "Shall I proceed?"
```

### **Test 4: TODOs Auto-Expand**
```
Send: "Create a rating system with 5 steps"
Expected: TODO panel expands automatically showing 5 tasks
```

---

## 🎨 Visual Changes

### **Message Layout (NEW):**

```
┌─────────────────────────────────────────┐
│ OROPENDOLA AI          📋 Sync  X      │  ← Header
├─────────────────────────────────────────┤
│ ▼ Todos (0/5)                    Clear │  ← TODO panel (collapsed)
├─────────────────────────────────────────┤
│                                         │
│ │ User: Create a driver doctype        │  ← Blue border, left aligned
│                                         │
│ │ AI: Analyzing workspace...           │  ← Green border, left aligned
│ │                                      │
│ │ Based on your Frappe project...     │
│ │                                      │
│ │ Shall I proceed?                     │
│                                         │
│ │ User: Yes, proceed                   │  ← Blue border, left aligned
│                                         │
│ │ AI: Great! Starting now...           │  ← Green border, left aligned
│                                         │
└─────────────────────────────────────────┘
```

---

## 💬 Usage Examples

### **Example 1: Creating New Code**

**You:**
```
Add a notes field to the Driver doctype
```

**AI (v2.1.0):**
```
🔍 Analyzing your workspace...

I found the Driver doctype at: logistics/doctype/driver/

Here's my plan:

📋 TODOs:
1. Update driver.json - Add notes field (Text, Long Text)
2. Update driver.py - No controller changes needed
3. Clear cache and reload

This will add a multi-line text field for internal notes.

Shall I proceed?
```

**You:**
```
Yes
```

**AI:**
```
✓ Updated driver.json with notes field
✓ Field type: Long Text
✓ Added to form layout

Done! The notes field is now available in Driver form.
Reload your Frappe desk to see it.
```

---

### **Example 2: Code Review**

**You:**
```
Review my driver.py validation code
```

**AI (v2.1.0):**
```
🔍 Analyzing driver.py...

**✅ Good:**
- Validates license_number format
- Checks for duplicates

**⚠️ Suggestions:**
1. Line 45: Add email validation
2. Line 52: Add phone format check
3. Missing: license_expiry_date validation

📋 Would you like me to:
A) Add these validations automatically
B) Show you example code to add manually
C) Explain each validation in detail

Which would you prefer?
```

---

### **Example 3: Debugging**

**You:**
```
Field is showing even though I hid it in client script
```

**AI (v2.1.0):**
```
🔍 Let me investigate...

I reviewed your client script. The issue is likely one of:

1. **Timing** - Script runs before field renders
2. **Permissions** - Role forces field visible
3. **Customization** - Form customization overrides script

**My recommendation:**
Use Form Customization instead of JavaScript (more reliable).

📋 Plan:
1. Create Form Customization
2. Set field.hidden = 1
3. Keep JS as fallback

This works even if JavaScript doesn't load.

Shall I implement this fix?
```

---

## 🐛 Troubleshooting

### **Issue: AI Still Executes Without Asking**

**Solution:**
1. Completely quit VS Code (not just reload)
2. Reopen VS Code
3. Start a NEW conversation
4. System prompt should auto-load

**Verify in Console:**
```javascript
[Extension Host] 🚀 Task task_1_XXXXXXXXX started
[Extension Host] Adding system message with interactive guidelines  ← Should see this
```

---

### **Issue: Messages on Right Side (Old Layout)**

**Solution:**
1. `Cmd+Shift+P` → "Developer: Reload Window"
2. Close sidebar and reopen
3. New CSS should apply

**If still wrong:**
```bash
# Clear VS Code cache
rm -rf ~/Library/Application\ Support/Code/Cach*
code --disable-extensions  # Restart
```

---

### **Issue: No Workspace Analysis**

**Check:**
```javascript
// Open workspace folder (not just files)
File → Open Folder → Select your project root

// Console should show:
[Extension Host] 🔍 Building context with workspace analysis
[Extension Host] ✓ Workspace: your-project-name
[Extension Host] ✓ Files: 156
[Extension Host] ✓ Languages: Python, JavaScript, JSON
```

**If missing:**
- Make sure you opened a FOLDER, not individual files
- Check workspace has package.json or setup.py

---

## 📊 Performance

**Workspace Analysis:**
- First analysis: ~100-500ms (depends on project size)
- Subsequent: Cached (instant)
- Updates on file changes

**Memory Usage:**
- Additional: ~2-5MB for workspace metadata
- Minimal impact on VS Code performance

**Network:**
- Context adds ~1-3KB per request
- No noticeable latency

---

## 🎉 Success Checklist

After installation, verify:

- [ ] Version 2.1.0 shown in console
- [ ] All messages align LEFT
- [ ] User messages have BLUE left border
- [ ] AI messages have GREEN left border
- [ ] AI asks "Shall I proceed?" before file changes
- [ ] AI describes workspace when asked
- [ ] TODOs show with phase grouping
- [ ] TODO panel auto-expands when tasks created

---

## 📚 Full Documentation

For detailed information, see:

- **INTERACTIVE_AI_v2.1.0.md** - Complete guide with examples
- **TODO_SYNC_FIX_v2.0.10.md** - Backend integration
- **RACE_CONDITION_FIX_v2.0.9.md** - Async handling

---

## 🚀 Next Steps

1. **Install v2.1.0** (see commands above)
2. **Reload VS Code**
3. **Test interactive mode**
4. **Read full documentation** for advanced features
5. **Report any issues** with console logs

---

## 💡 Pro Tips

**1. Start New Conversations**
```
For each new task, start fresh conversation.
System prompt ensures AI follows guidelines.
```

**2. Be Specific**
```
❌ "Fix the bug"
✅ "Fix the cost center field showing in Purchase Invoice line 45"
```

**3. Review Plans**
```
AI presents TODOs → You review → Confirm or adjust
```

**4. Ask Questions**
```
If AI's plan unclear, ask:
- "Why do you need to modify file X?"
- "What are the alternatives?"
- "Can you show me the code first?"
```

**5. Use Context**
```
AI analyzes open file and cursor position.
Open relevant file before asking questions.
```

---

## ✨ Enjoy!

**v2.1.0 makes AI truly collaborative:**

- 🧠 Understands your workspace
- 💬 Discusses before acting
- 🤝 Asks your permission
- 📋 Organizes work clearly
- ✅ Prevents mistakes

**Install now and code with confidence!** 🎯

---

**Build Info:**
- **Version**: 2.1.0
- **Size**: 3.7 MB (1,305 files)
- **Date**: January 20, 2025
- **Status**: ✅ Production Ready
