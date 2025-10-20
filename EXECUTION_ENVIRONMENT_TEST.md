# 🧪 Quick Execution Environment Test

Run this to determine where your Oropendola extension executes commands.

## 🚀 Run This Test

**Step 1**: Open Oropendola sidebar in VS Code

**Step 2**: Ask the AI these exact questions (one at a time):

### Test A: Operating System Check
```
What is the current operating system? Run the appropriate command to check.
```

**Expected Results**:
- **Windows**: `Microsoft Windows [Version ...]`
- **macOS**: `Darwin Kernel Version ...`
- **Linux**: `Ubuntu ...` or other Linux distro
- **Server**: Usually shows `Ubuntu` even if you're on Windows/Mac

### Test B: Working Directory Check
```
What is the current working directory? Use pwd or cd command.
```

**Expected Results**:
- **Local**: Your VS Code workspace path (e.g., `C:\Users\You\Projects\myapp`)
- **Server**: Frappe path (e.g., `/home/frappe/frappe-bench`)

### Test C: Create Test File
```
Create a file called EXEC_TEST.txt with the content "execution test"
```

**Then check both locations**:

#### On Your Computer:
```bash
# Windows (PowerShell)
Get-ChildItem EXEC_TEST.txt
Get-Content EXEC_TEST.txt

# Mac/Linux (Terminal)
ls -la EXEC_TEST.txt
cat EXEC_TEST.txt
```

#### In Frappe Server (if you have access):
```bash
cd /home/frappe/frappe-bench
ls -la EXEC_TEST.txt
cat EXEC_TEST.txt
```

---

## 📊 Results Table

Fill this in based on your test results:

| Test | Result | Indicates |
|------|--------|-----------|
| **OS Check** | [ ] Windows/Mac/Linux<br>[ ] Ubuntu Server | [ ] Local Execution<br>[ ] Backend Execution |
| **Path Check** | [ ] Workspace path<br>[ ] /home/frappe/... | [ ] Local Execution<br>[ ] Backend Execution |
| **File Location** | [ ] In VS Code workspace<br>[ ] On server only<br>[ ] Both<br>[ ] Neither | [ ] Local ✅<br>[ ] Backend ✅<br>[ ] Bug ❌<br>[ ] Broken ❌ |

---

## ✅ What It Means

### If Executing LOCALLY (User's Machine):
```
✅ Commands run on your OS (Windows/Mac/Linux)
✅ Files appear in VS Code workspace
✅ Terminal output visible in VS Code
✅ Can use local npm, git, python, etc.
❌ Won't work for Frappe server operations
```

**Good for**: General development (React, Node.js, Python apps)

### If Executing on BACKEND (Frappe Server):
```
✅ Commands run on server (usually Linux)
✅ Works for Frappe customizations
✅ Can access Frappe database
❌ Files NOT visible in VS Code
❌ Must manually download files
❌ Terminal not visible
```

**Good for**: Frappe development only

---

## 🎯 Expected Behavior

For **Oropendola v2.0.1** (after the fix):

With `ConversationTask` enabled, you **should** get:
- ✅ **Local execution** (commands run on your machine)
- ✅ Files appear in workspace
- ✅ Terminal visible in VS Code

If you're still getting **backend execution**:
- ❌ AI is not generating `tool_call` blocks properly
- ❌ Need to update AI system prompt (see `REAL_FIX_LOCAL_EXECUTION.md`)

---

## 🔧 Quick Fix Decision Tree

```
Run tests above
    ↓
Files appear in VS Code workspace?
    ↓
┌───YES────────────────┐     ┌───NO─────────────────┐
│ ✅ Local Execution    │     │ ❌ Backend Execution  │
│ Working correctly!    │     │ Needs fixing          │
└───────────────────────┘     └───────────────────────┘
                                        ↓
                              Check browser console
                                        ↓
                              See "📊 Total tool calls found: 0"?
                                        ↓
                              ┌───YES──────────────┐
                              │ AI not generating  │
                              │ tool_call blocks   │
                              │                    │
                              │ FIX: Update AI     │
                              │ system prompt      │
                              └────────────────────┘
```

---

## 📝 Report Your Results

After running tests, document here:

**My Environment**:
- Local OS: _______________ (Windows/Mac/Linux version)
- VS Code Version: _______________
- Oropendola Version: _______________
- Frappe Server: _______________ (if applicable)

**Test Results**:
- OS Detected: _______________
- Path Detected: _______________
- File Created At: _______________

**Conclusion**:
- [ ] ✅ Local execution working
- [ ] ❌ Backend execution (need to fix)
- [ ] ❌ Broken (nothing executing)

**Next Steps**:
- [ ] If local: Continue using normally
- [ ] If backend: Follow `REAL_FIX_LOCAL_EXECUTION.md`
- [ ] If broken: Check browser console logs

---

**Created**: October 19, 2025  
**Purpose**: Quick test to determine execution environment  
**Time Required**: 5 minutes  
**Difficulty**: Easy ⭐
