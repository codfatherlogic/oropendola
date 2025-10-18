# ✅ Testing Checklist - Agent & Ask Modes

Use this checklist to verify the Agent & Ask mode implementation is working correctly.

---

## 🔧 Pre-Testing Setup

### 1. Reload VS Code Extension
- [ ] Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
- [ ] Type "Developer: Reload Window"
- [ ] Press Enter
- [ ] Wait for extension to reload

### 2. Open Browser Console (for debugging)
- [ ] Go to Help → Toggle Developer Tools
- [ ] Click Console tab
- [ ] Keep it open to see logs

### 3. Open Oropendola Sidebar
- [ ] Press `Cmd+Shift+C` (macOS) or `Ctrl+Shift+C` (Windows/Linux)
- [ ] Or click Oropendola icon in activity bar
- [ ] Sidebar should open

---

## 🎨 Visual Tests

### Test 1: Mode Selector Visibility
- [ ] Mode selector appears below the header
- [ ] "MODE" label is visible
- [ ] Two buttons visible: 🤖 Agent and 💬 Ask
- [ ] Description text appears below buttons
- [ ] UI looks clean and professional

**Expected Result**:
```
MODE
[🤖 Agent] [💬 Ask]
Agent mode can execute actions...
```

### Test 2: Default State (Agent Mode)
- [ ] 🤖 Agent button has blue background
- [ ] 💬 Ask button has gray/transparent background
- [ ] Description says "Agent mode can execute actions and modify your workspace files."
- [ ] Empty state title shows "Build with agent mode"

### Test 3: Hover Effects
- [ ] Hover over Ask button
- [ ] Background color changes slightly
- [ ] Cursor changes to pointer
- [ ] Hover over Agent button
- [ ] Same hover effects appear

---

## 🔄 Mode Switching Tests

### Test 4: Switch to Ask Mode
**Steps**:
1. Click the 💬 Ask button

**Expected Results**:
- [ ] Ask button turns blue
- [ ] Agent button turns gray
- [ ] Description changes to "Ask mode provides answers and suggestions without modifying files."
- [ ] Empty state title changes to "Ask questions"
- [ ] Console shows: "🔄 Switched to ask mode"

### Test 5: Switch Back to Agent Mode
**Steps**:
1. Click the 🤖 Agent button

**Expected Results**:
- [ ] Agent button turns blue
- [ ] Ask button turns gray
- [ ] Description changes back to Agent description
- [ ] Empty state title changes to "Build with agent mode"
- [ ] Console shows: "🔄 Switched to agent mode"

### Test 6: Rapid Mode Switching
**Steps**:
1. Click Ask → Agent → Ask → Agent (quickly)

**Expected Results**:
- [ ] No errors in console
- [ ] UI updates correctly each time
- [ ] No lag or freezing
- [ ] Final mode is correctly highlighted

---

## 🤖 Agent Mode Functional Tests

### Test 7: Create File in Agent Mode
**Steps**:
1. Ensure 🤖 Agent is active (blue)
2. Type: "create a hello.js file with a simple console.log"
3. Send message

**Expected Results**:
- [ ] AI processes request
- [ ] File `hello.js` is created
- [ ] File appears in workspace explorer
- [ ] File opens in editor
- [ ] File contains actual code (not empty)
- [ ] Console shows: "✅ Created file: hello.js"
- [ ] Console shows: "🔧 Executing: create_file"

### Test 8: Modify File in Agent Mode
**Steps**:
1. Ensure 🤖 Agent is active
2. Type: "add a comment to hello.js explaining the code"
3. Send message

**Expected Results**:
- [ ] AI processes request
- [ ] File is modified
- [ ] Comment is added to file
- [ ] Console shows tool execution logs

---

## 💬 Ask Mode Functional Tests

### Test 9: Ask Mode Prevents File Creation
**Steps**:
1. Switch to 💬 Ask mode (blue highlight)
2. Type: "create a test.js file"
3. Send message

**Expected Results**:
- [ ] AI provides text response/explanation
- [ ] NO file is created in workspace
- [ ] Console shows: "ℹ️ ASK mode: Ignoring tool calls (read-only mode)"
- [ ] Console shows: "📊 Total tool calls found: 0"
- [ ] Response is conversational, not actionable

### Test 10: Ask Mode Answers Questions
**Steps**:
1. Ensure 💬 Ask mode is active
2. Type: "explain how async/await works in JavaScript"
3. Send message

**Expected Results**:
- [ ] AI provides detailed explanation
- [ ] No files created or modified
- [ ] Response is educational
- [ ] No console errors

### Test 11: Ask Mode for Code Review
**Steps**:
1. Open a code file in editor
2. Select some code
3. Switch to 💬 Ask mode
4. Type: "review this code for issues"
5. Send message

**Expected Results**:
- [ ] AI analyzes and explains issues
- [ ] No file modifications occur
- [ ] Suggestions provided as text only
- [ ] Code remains unchanged

---

## 🔀 Mode Switching During Conversation

### Test 12: Switch Mode Mid-Conversation
**Steps**:
1. Start in 💬 Ask mode
2. Type: "What is a REST API?"
3. AI responds with explanation
4. Switch to 🤖 Agent mode
5. Type: "Create a REST API endpoint"
6. Send message

**Expected Results**:
- [ ] First response is explanation only
- [ ] Mode switch is instant
- [ ] Second response creates files
- [ ] Previous messages remain unchanged
- [ ] Console shows both mode switches

---

## 🐛 Error Handling Tests

### Test 13: Mode Persistence
**Steps**:
1. Switch to 💬 Ask mode
2. Send a message
3. Wait for response
4. Check if mode is still Ask

**Expected Results**:
- [ ] Mode remains in Ask after message
- [ ] Mode doesn't reset to Agent
- [ ] UI state is consistent

### Test 14: Console Error Check
**Steps**:
1. Perform all above tests
2. Check console for errors

**Expected Results**:
- [ ] No red errors in console
- [ ] Only info/log messages
- [ ] No undefined errors
- [ ] No failed network requests (related to modes)

---

## 📊 Console Output Verification

### Test 15: Console Logs Are Correct

**When switching to Ask mode**, console should show:
```
✅ 🔄 Switched to ask mode
```

**When in Ask mode and AI responds**, console should show:
```
✅ ℹ️ ASK mode: Ignoring tool calls (read-only mode)
✅ 📊 Total tool calls found: 0
```

**When switching to Agent mode**, console should show:
```
✅ 🔄 Switched to agent mode
```

**When in Agent mode and creating files**, console should show:
```
✅ 🔧 [1/1] Executing: create_file
✅ ✅ Created file: filename.js
```

---

## 🎯 Integration Tests

### Test 16: New Chat Resets to Agent
**Steps**:
1. Switch to 💬 Ask mode
2. Click ➕ (New Chat) button
3. Check which mode is active

**Expected Results**:
- [ ] Mode resets to 🤖 Agent (default)
- [ ] Agent button is blue
- [ ] Chat history clears
- [ ] Empty state appears

### Test 17: Settings Don't Affect Mode
**Steps**:
1. Switch to 💬 Ask mode
2. Click ⚙️ Settings button
3. Go back to chat
4. Check mode state

**Expected Results**:
- [ ] Mode remains in Ask
- [ ] Settings open correctly
- [ ] Returning to chat preserves mode

---

## 📱 Responsive Tests

### Test 18: Narrow Window
**Steps**:
1. Resize VS Code window to be very narrow
2. Check mode selector appearance

**Expected Results**:
- [ ] Mode selector still visible
- [ ] Buttons don't overlap
- [ ] Text is readable
- [ ] Layout adapts gracefully

---

## ✅ Final Verification

### All Tests Passed?

**Visual Tests** (1-3):
- [ ] All passed ✅

**Mode Switching Tests** (4-6):
- [ ] All passed ✅

**Agent Mode Tests** (7-8):
- [ ] All passed ✅

**Ask Mode Tests** (9-11):
- [ ] All passed ✅

**Conversation Tests** (12):
- [ ] Passed ✅

**Error Handling** (13-14):
- [ ] All passed ✅

**Console Logs** (15):
- [ ] All correct ✅

**Integration Tests** (16-17):
- [ ] All passed ✅

**Responsive Tests** (18):
- [ ] Passed ✅

---

## 🎉 Success Criteria

**Minimum Requirements** (Must Pass):
- ✅ Mode selector visible
- ✅ Mode switching works
- ✅ Agent mode creates files
- ✅ Ask mode prevents file creation
- ✅ No console errors

**Excellent Implementation** (All Should Pass):
- ✅ All visual tests pass
- ✅ All functional tests pass
- ✅ Smooth user experience
- ✅ Proper console logging
- ✅ No bugs or glitches

---

## 🐛 If Tests Fail

### Common Issues

**Issue**: Mode selector not visible
**Fix**: 
1. Reload window (Developer: Reload Window)
2. Check sidebar-provider.js for syntax errors
3. Clear VS Code cache

**Issue**: Mode not switching
**Fix**:
1. Check console for errors
2. Verify switchMode function exists
3. Check message handler is registered

**Issue**: Ask mode still creating files
**Fix**:
1. Verify mode state in console
2. Check _parseToolCalls logic
3. Ensure mode is passed to ConversationTask

**Issue**: Console errors
**Fix**:
1. Copy error message
2. Check file syntax
3. Review recent changes
4. Restart VS Code

---

## 📝 Test Results

**Date Tested**: _______________

**Tester Name**: _______________

**Overall Result**: 
- [ ] ✅ All tests passed
- [ ] ⚠️ Some tests failed (see notes)
- [ ] ❌ Major issues found

**Notes**:
```
[Write any observations, issues, or comments here]




```

**Recommendation**:
- [ ] Ready for production
- [ ] Needs minor fixes
- [ ] Needs major revision

---

## 🚀 Next Steps

After all tests pass:
1. [ ] Document any findings
2. [ ] Update README if needed
3. [ ] Consider user feedback
4. [ ] Deploy to users
5. [ ] Monitor for issues

---

**Testing Guide Version**: 1.0  
**For**: Oropendola AI Assistant v2.0.0  
**Feature**: Agent & Ask Modes  
**Last Updated**: 2025-10-18
