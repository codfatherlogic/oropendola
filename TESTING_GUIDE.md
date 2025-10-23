# Complete Testing Guide - Oropendola AI

> **Comprehensive testing checklist for frontend and backend**

## 📋 Pre-Test Setup

### Prerequisites
- ✅ VS Code with Oropendola extension installed
- ✅ Backend server running at oropendola.ai
- ✅ Test workspace folder created
- ✅ Backend fixes applied (optional but recommended)

### Create Test Workspace

```bash
mkdir ~/oropendola-test
cd ~/oropendola-test
```

---

## 🎯 Test Suite 1: UI & Typography

### Test 1.1: Clean Message Display

**Steps:**
1. Open VS Code
2. Open Oropendola chat (Cmd/Ctrl+Shift+A)
3. Type: "Hello, please introduce yourself"

**Expected Results:**
- ✅ Message appears in clean, readable font
- ✅ Text is crisp with good anti-aliasing
- ✅ Proper line spacing (line-height: 1.6-1.7)
- ✅ System fonts used (not monospace)
- ✅ No overlapping text
- ✅ Consistent 18px gaps between messages

**Screenshot:**
- Text should look like professional chat UI (similar to Claude or ChatGPT)

---

### Test 1.2: Code Block Rendering

**Steps:**
1. Type: "Show me a hello world function in JavaScript"

**Expected Results:**
- ✅ Code block has header with "JAVASCRIPT" label
- ✅ "📋 Copy" button visible on hover
- ✅ Code uses monospace font (13px)
- ✅ Proper padding (14px 16px)
- ✅ Subtle shadow and border
- ✅ Click copy button → "✅ Copied!" feedback

---

### Test 1.3: File Links

**Steps:**
1. Type message containing: "Check src/app.js for the implementation"

**Expected Results:**
- ✅ `src/app.js` appears as clickable link
- ✅ Link colored in blue (#4FC3F7)
- ✅ Hover shows underline
- ✅ Click opens file (if exists)

---

## 🔧 Test Suite 2: Tool Calls & Backend

### Test 2.1: Tool Call Blocks Stripped (Critical)

**Steps:**
1. Type: "Create a simple hello.js file with console.log"
2. Wait for response

**Expected Results - Frontend Only (No Backend Fix):**
- ⚠️ May see ```tool_call blocks in chat
- ✅ Frontend fallback strips them automatically
- ✅ Message still readable

**Expected Results - Backend Fixed:**
- ✅ NO ```tool_call blocks visible
- ✅ Clean message: "I'll create a hello.js file..."
- ✅ File created successfully
- ✅ Backend logs show: "[Strip] Original: X, Cleaned: Y"

**How to Check:**
```bash
# If backend is fixed, SSH and check logs:
ssh user@oropendola.ai
tail -f ~/frappe-bench/logs/oropendola.ai.log | grep Strip
```

Should see:
```
[Strip] Original: 500 chars, Cleaned: 200 chars
```

---

### Test 2.2: File Creation

**Steps:**
1. Type: "Create package.json with express dependency"
2. Wait for completion

**Expected Results:**
- ✅ File created in workspace root
- ✅ File opens in editor automatically
- ✅ Content is correct
- ✅ Green checkmark (✅) shows success
- ✅ Message: "Created package.json"

---

### Test 2.3: Multiple File Creation

**Steps:**
1. Type: "Create a simple Express app with:
   - package.json
   - src/index.js (main server)
   - src/routes/api.js (API routes)
   - README.md"

**Expected Results:**
- ✅ All 4 files created
- ✅ Correct directory structure (`src/` folder)
- ✅ No permission errors
- ✅ No overlapping in UI
- ✅ Each file shows status
- ✅ Clean, readable progress messages

---

### Test 2.4: Path Sanitization (Backend)

**This only works if backend fix is applied**

**Steps:**
1. Manually trigger AI to suggest absolute path:
   - Type: "Create file at /Users/john/project/src/app.js"

**Expected Results - Backend Fixed:**
- ✅ File created at: `workspace/src/app.js` (NOT /Users/)
- ✅ No permission denied error
- ✅ Backend logs show: `[Path] Sanitized: /Users/... → src/app.js`

**Expected Results - No Backend Fix:**
- ❌ Permission error may occur
- ❌ File not created

---

## 🔄 Test Suite 3: Multi-Step Tasks

### Test 3.1: Conversation Memory

**Steps:**
1. Type: "Create a React app with package.json"
2. Wait for completion
3. Type: "Now add a Button component in src/components/"
4. Wait for completion

**Expected Results - Backend Conversation Fix Applied:**
- ✅ AI remembers previous work
- ✅ Doesn't recreate package.json
- ✅ Creates component in correct location
- ✅ Builds on existing structure

**Expected Results - No Backend Fix:**
- ❌ AI may forget previous work
- ❌ May recreate files
- ❌ Conversation feels disconnected

---

### Test 3.2: Progressive Task Execution

**Steps:**
1. Type: "Build a full Node.js REST API with:
   - Express server
   - User routes
   - Database connection
   - Error handling"

**Expected Results:**
- ✅ Files created in sequence
- ✅ Progress visible for each step
- ✅ Clean UI throughout
- ✅ All files created successfully
- ✅ No UI corruption

---

## 💻 Test Suite 4: Terminal Commands

### Test 4.1: NPM Install

**Steps:**
1. Create package.json (ask AI)
2. AI suggests: "Run npm install"

**Expected Results:**
- ✅ Terminal opens automatically
- ✅ Command executes: `npm install`
- ✅ Output visible in terminal
- ✅ Notification shows: "Running: npm install"
- ✅ Can minimize terminal with "Hide Terminal" button

---

### Test 4.2: Git Commands

**Steps:**
1. Type: "Initialize git and make first commit"

**Expected Results:**
- ✅ `git init` executes
- ✅ `git add .` executes
- ✅ `git commit -m "..."` executes
- ✅ Commands run in sequence
- ✅ Terminal shows output

---

## 🎨 Test Suite 5: UI Components

### Test 5.1: Typing Indicator

**Steps:**
1. Send any message
2. While AI is responding, observe indicator

**Expected Results:**
- ✅ Yellow indicator appears at bottom
- ✅ Shows "Oropendola AI thinking..."
- ✅ Three animated dots visible
- ✅ Disappears when response arrives
- ✅ Never appears between messages

---

### Test 5.2: File Changes Card

**Steps:**
1. Ask AI to create multiple files

**Expected Results:**
- ✅ File changes card appears BELOW message text
- ✅ Shows count: "3 files changed"
- ✅ Each file has:
  - Checkbox
  - Icon (+ for created, ~ for modified, - for deleted)
  - File path (clickable)
  - Line count badge
  - Keep/Undo buttons
- ✅ No overlapping with message text
- ✅ Proper spacing (16px margin-top)

---

### Test 5.3: Message Actions (Accept/Reject)

**Steps:**
1. Type: "Create a numbered plan for building an app"
2. AI should respond with numbered list (1. 2. 3...)

**Expected Results:**
- ✅ Two buttons appear:
  - "✗ Dismiss"
  - "✓ Confirm & Execute"
- ✅ Click Confirm → Button changes to "⏳ Executing..."
- ✅ Dismiss button disappears
- ✅ AI proceeds with execution

---

## 🐛 Test Suite 6: Error Handling

### Test 6.1: Network Error

**Steps:**
1. Disconnect from internet
2. Send a message

**Expected Results:**
- ✅ Error message appears
- ✅ User informed of connection issue
- ✅ UI doesn't break
- ✅ Can retry when connection restored

---

### Test 6.2: Invalid File Path

**Steps:**
1. Type: "Create a file at /invalid/path/file.js"

**Expected Results - Backend Fixed:**
- ✅ Path sanitized to: `invalid/path/file.js` or `path/file.js`
- ✅ File created in workspace
- ✅ Warning logged

**Expected Results - No Backend Fix:**
- ❌ Permission error
- ✅ Error message shown to user
- ✅ UI remains functional

---

## 📊 Test Suite 7: Performance

### Test 7.1: Large File Creation

**Steps:**
1. Type: "Create a 500-line JavaScript file with functions"

**Expected Results:**
- ✅ File created successfully
- ✅ Editor opens without lag
- ✅ UI remains responsive
- ✅ Message displays properly

---

### Test 7.2: Multiple Rapid Messages

**Steps:**
1. Send 3 messages in quick succession:
   - "Create file A"
   - "Create file B"
   - "Create file C"

**Expected Results:**
- ✅ All messages queued properly
- ✅ Responses appear in order
- ✅ No UI corruption
- ✅ All files created

---

## ✅ Complete Verification Checklist

### Frontend UI (Should ALL Pass)
- [ ] Clean, readable typography
- [ ] Proper font sizes (14px body, 13px code)
- [ ] Good line-height (1.6-1.7)
- [ ] No overlapping text
- [ ] Consistent spacing (18px gaps)
- [ ] Code blocks well-formatted
- [ ] File links clickable
- [ ] Typing indicator works
- [ ] File changes card below text
- [ ] Accept/Reject buttons work

### Tool Execution (Should ALL Pass)
- [ ] Files created successfully
- [ ] Multiple files work
- [ ] Terminal commands execute
- [ ] File changes tracked
- [ ] Keep/Undo buttons work

### Backend Integration (Depends on Backend Fixes)
- [ ] NO tool_call blocks visible (Critical)
- [ ] Conversation memory works (Important)
- [ ] Path sanitization works (Important)
- [ ] 417 errors fixed (Nice to have)

### Error Handling
- [ ] Network errors handled gracefully
- [ ] Invalid paths handled
- [ ] UI never breaks
- [ ] User always informed

---

## 🔍 Debugging Failed Tests

### Issue: Tool Call Blocks Still Visible

**Diagnosis:**
1. Check browser console (Help → Toggle Developer Tools)
2. Look for: `[formatMessageContent]` logs
3. Check if text includes "```tool_call"

**Solutions:**
- **Frontend fallback in place:** Should strip automatically
- **If still visible:** Backend needs fixing (see BACKEND_DEPLOYMENT_GUIDE.md)
- **Temporary workaround:** Clear browser cache, reload VS Code

---

### Issue: Files Not Created

**Diagnosis:**
1. Check extension console for errors
2. Look for: "Tool execution" messages
3. Check workspace folder exists

**Solutions:**
- Verify workspace folder is open
- Check file permissions
- Check backend is reachable

---

### Issue: UI Overlapping/Messy

**Diagnosis:**
1. Check browser console for errors
2. Look for CSS issues
3. Check webview cache

**Solutions:**
```bash
# Clear VS Code cache
rm -rf ~/Library/Application\ Support/Code/Cache/*

# Reload extension
# In VS Code: Cmd/Ctrl+R (in Extension Development Host)
# Or: Close and reopen VS Code
```

---

### Issue: Conversation Not Continuing

**Diagnosis:**
1. Check backend logs for message history
2. Look for: `[Chat] Messages in history: X`
3. If X = 1, backend not receiving history

**Solutions:**
- Apply backend conversation fix
- See: `backend_chat_api_fix.py`
- Or contact backend team

---

## 📝 Test Results Template

Use this to track your testing:

```markdown
## Test Results - [Date]

### Environment
- Backend URL: https://oropendola.ai
- Backend fixes applied: [ ] Yes / [ ] No
- VS Code version: X.X.X
- Extension version: 3.0.0

### UI Tests
- Test 1.1 (Clean Display): ✅ PASS / ❌ FAIL
- Test 1.2 (Code Blocks): ✅ PASS / ❌ FAIL
- Test 1.3 (File Links): ✅ PASS / ❌ FAIL

### Tool Tests
- Test 2.1 (Tool Call Stripping): ✅ PASS / ❌ FAIL / ⚠️ PARTIAL
- Test 2.2 (File Creation): ✅ PASS / ❌ FAIL
- Test 2.3 (Multiple Files): ✅ PASS / ❌ FAIL
- Test 2.4 (Path Sanitization): ✅ PASS / ❌ FAIL / ⏭️ SKIPPED

### Multi-Step Tests
- Test 3.1 (Conversation Memory): ✅ PASS / ❌ FAIL / ⏭️ SKIPPED
- Test 3.2 (Progressive Tasks): ✅ PASS / ❌ FAIL

### Terminal Tests
- Test 4.1 (NPM Install): ✅ PASS / ❌ FAIL
- Test 4.2 (Git Commands): ✅ PASS / ❌ FAIL

### UI Component Tests
- Test 5.1 (Typing Indicator): ✅ PASS / ❌ FAIL
- Test 5.2 (File Changes Card): ✅ PASS / ❌ FAIL
- Test 5.3 (Accept/Reject): ✅ PASS / ❌ FAIL

### Error Handling Tests
- Test 6.1 (Network Error): ✅ PASS / ❌ FAIL
- Test 6.2 (Invalid Path): ✅ PASS / ❌ FAIL

### Performance Tests
- Test 7.1 (Large File): ✅ PASS / ❌ FAIL
- Test 7.2 (Rapid Messages): ✅ PASS / ❌ FAIL

### Issues Found
1. [Issue description]
2. [Issue description]

### Notes
- [Any additional observations]
```

---

## 🎯 Priority Testing Order

If time is limited, test in this order:

### Must Test (Critical):
1. ✅ Test 2.1 - Tool call blocks stripping
2. ✅ Test 2.2 - File creation
3. ✅ Test 1.1 - Clean message display
4. ✅ Test 5.1 - Typing indicator

### Should Test (Important):
5. ✅ Test 2.3 - Multiple files
6. ✅ Test 3.1 - Conversation memory
7. ✅ Test 4.1 - Terminal commands
8. ✅ Test 5.2 - File changes card

### Nice to Test:
9. ✅ Test 1.2 - Code blocks
10. ✅ All remaining tests

---

## 📞 Support

**Found a bug?**
1. Note which test failed
2. Copy error messages from console
3. Take screenshots
4. Report with test number (e.g., "Test 2.1 failed")

**Need help?**
- Check BACKEND_ISSUES_SUMMARY.md
- Check BACKEND_DEPLOYMENT_GUIDE.md
- Review console logs

---

**Testing Time Estimate:**
- Quick test (priority tests): 10 minutes
- Full test suite: 30-45 minutes
- With backend fixes: +15-20 minutes

**Success Criteria:**
- UI tests: 100% pass (critical)
- Tool tests: 80%+ pass (depends on backend)
- All other tests: 90%+ pass

Good luck testing! 🚀
