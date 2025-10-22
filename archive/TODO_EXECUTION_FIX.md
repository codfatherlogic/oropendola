# TODO Execution Fix - Terminal Commands Blocked

## Date
2025-10-19

## Issue Description

When clicking **Accept** on a numbered plan:
1. ✅ TODOs were being created correctly (0/49 shown)
2. ✅ Accept button was working
3. ❌ Backend was blocking terminal commands with **"Command Not Allowed"** error
4. ❌ Files were not being created because the AI kept trying to run `npm install` and `node` commands

### Error Messages
```
❌ Command failed: Command Not Allowed
❌ Command exited with code 127
```

---

## Root Cause

The `_handleAcceptPlan()` function was sending this message to the AI:

```javascript
'Execute the plan you just outlined. Create all files and run all commands.'
```

The phrase **"run all commands"** was causing the AI to attempt terminal commands like:
- `npm install`
- `node index.js`
- `npm start`

These are **blocked by the backend** for security reasons.

---

## The Fix

### Change 1: Updated Execution Instruction

**File**: `src/sidebar/sidebar-provider.js` (Line ~1290)

**Before**:
```javascript
await this._handleSendMessage('Execute the plan you just outlined. Create all files and run all commands.', []);
```

**After**:
```javascript
// NOTE: Only ask to create files, NOT run terminal commands (backend blocks those)
await this._handleSendMessage('Execute the plan you just outlined. Create all the files with their complete implementation. Do NOT run any terminal commands like npm install or node commands - just create the files.', []);
```

**Why This Works**:
- Explicitly tells AI to **NOT** run terminal commands
- Focuses on **file creation only**
- Backend allows file creation (create_file, edit_file)
- Backend blocks terminal execution (run_in_terminal)

---

### Change 2: Updated System Message

**File**: `src/sidebar/sidebar-provider.js` (Line ~1276)

**Before**:
```javascript
content: '🚀 Executing plan... Files will be created automatically.'
```

**After**:
```javascript
content: '🚀 Creating files... You\'ll need to run commands manually (terminal commands are restricted for security).'
```

**Why This Is Better**:
- Sets correct expectations
- Informs user that they need to run commands manually
- Explains why (security restriction)

---

## How It Works Now

### Before (Broken Flow)
```
User clicks Accept
  ↓
AI gets: "Execute the plan... Create all files and run all commands"
  ↓
AI tries: npm install
  ↓
Backend: ❌ Command Not Allowed
  ↓
FAILURE - No files created
```

### After (Working Flow)
```
User clicks Accept
  ↓
AI gets: "Create all the files... Do NOT run terminal commands"
  ↓
AI creates: package.json, main.js, index.html, etc.
  ↓
Backend: ✅ Files created successfully
  ↓
User sees: ✅ Created package.json, ✅ Created main.js, etc.
  ↓
User runs commands manually: npm install && npm start
```

---

## User Experience

### What Users See Now

1. **Click Accept**
   ```
   🚀 Creating files... You'll need to run commands manually 
   (terminal commands are restricted for security).
   ```

2. **Files Are Created**
   ```
   ✅ Created package.json
   ✅ Created main.js
   ✅ Created src/index.html
   ✅ Created src/styles.css
   ✅ Created src/renderer.js
   ...
   ```

3. **User Runs Commands Manually**
   ```bash
   npm install
   npm start
   ```

---

## Why Terminal Commands Are Blocked

### Security Reasons

1. **Arbitrary Code Execution**
   - Terminal commands can execute any code
   - Could be used to harm user's system
   
2. **Dependency Installation**
   - `npm install` can install malicious packages
   - Could compromise user's machine
   
3. **System Access**
   - Terminal has full system access
   - Could delete files, access sensitive data
   
4. **Backend Protection**
   - Backend server needs protection
   - Can't allow unlimited command execution

### What IS Allowed

✅ **File Operations** (via backend API):
- `create_file` - Create new files
- `edit_file` - Modify existing files
- `delete_file` - Remove files
- `read_file` - Read file contents

❌ **Terminal Operations** (blocked):
- `npm install`
- `node index.js`
- `npm start`
- Any shell commands

---

## Testing Checklist

After installing the updated extension:

✅ **Accept creates files** without terminal errors
✅ **System message is accurate** (mentions manual commands)
✅ **No "Command Not Allowed" errors** for file creation
✅ **TODOs still work** as before
✅ **User can run commands manually** in VS Code terminal

---

## Manual Testing Steps

1. **Ask AI to create a project**
   ```
   Create a simple Node.js Express server
   ```

2. **Check for numbered plan**
   - Should see Accept/Reject buttons
   
3. **Click Accept**
   - Should see: "🚀 Creating files..."
   - Should NOT see terminal command errors
   
4. **Verify files created**
   - Check workspace for created files
   - Files should have complete code
   
5. **Run commands manually**
   ```bash
   cd <project-directory>
   npm install
   npm start
   ```

---

## Expected Behavior

### Successful Execution
```
User: "Create a React app"
  ↓
AI: [Shows numbered plan with TODOs]
  ↓
User: [Clicks Accept]
  ↓
System: "🚀 Creating files... You'll need to run commands manually"
  ↓
AI: ✅ Created package.json
    ✅ Created src/App.js
    ✅ Created src/index.js
    ✅ Created public/index.html
  ↓
User: [Opens terminal, runs: npm install && npm start]
  ↓
SUCCESS - App is running
```

### What NOT to Expect
```
❌ AI will NOT run npm install automatically
❌ AI will NOT execute node commands
❌ Terminal will NOT show "Command Not Allowed" errors
❌ Files will NOT fail to be created due to terminal blocks
```

---

## Related Changes

This fix complements all previous UX fixes:

1. ✅ **Default Collapsed State** - TODO panel starts collapsed
2. ✅ **Reduced Context Text** - Only 1-2 sentences shown
3. ✅ **Right-Aligned Buttons** - Positioned correctly
4. ✅ **Button Visibility** - Actually visible now
5. ✅ **Reject Preserves TODOs** - Doesn't clear the list
6. ✅ **Accept Creates Files Only** - No terminal command failures (NEW)

---

## Technical Details

### Backend API Endpoints Used

**File Creation** (Allowed):
```javascript
POST /api/method/ai_assistant.api.execute_tool_call
{
  "action": "create_file",
  "path": "package.json",
  "content": "{ ... }"
}
```

**Terminal Execution** (Blocked):
```javascript
POST /api/method/ai_assistant.api.execute_tool_call
{
  "action": "run_in_terminal",
  "command": "npm install"
}
// Returns: 417 Error - Command Not Allowed
```

---

## Build Information

**Package**: `oropendola-ai-assistant-2.0.1.vsix`
**Size**: 2.4 MB
**Files**: 835 files
**Build Date**: 2025-10-19
**Status**: ✅ SUCCESS

---

## Installation

```bash
code --install-extension oropendola-ai-assistant-2.0.1.vsix
```

Then reload VS Code and test by:
1. Asking AI to create a project
2. Clicking Accept
3. Verifying files are created WITHOUT terminal errors

---

## Known Limitations

1. **Manual Commands Required**
   - Users must run `npm install`, `npm start`, etc. manually
   - This is BY DESIGN for security
   
2. **No Auto-Installation**
   - Dependencies are not auto-installed
   - User must install them in terminal
   
3. **No Auto-Execution**
   - Applications don't auto-start
   - User must start them manually

These are **intentional security features**, not bugs.

---

## Future Enhancements (Optional)

Could add in the future (if backend allows):

1. **Safe Command Whitelist**
   - Allow only safe commands (e.g., `npm install`)
   - Block dangerous commands (e.g., `rm -rf`)
   
2. **Confirmation Prompts**
   - Ask user to confirm before running commands
   - Show what command will be executed
   
3. **Terminal Integration**
   - Auto-open VS Code terminal with suggested commands
   - Show copy-to-clipboard button for commands

---

## Success Criteria

✅ Accept button creates files successfully
✅ No "Command Not Allowed" errors
✅ System message sets correct expectations
✅ User can run commands manually
✅ All files have complete implementation
✅ No security vulnerabilities
✅ Clean, predictable behavior
