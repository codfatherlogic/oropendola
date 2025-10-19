# Oropendola Extension Testing Checklist v2.0.1

## 1. Testing & Validation ✅

### UI Components
- [ ] **Auto Context Button**
  - [ ] Visible above input field
  - [ ] Shows "Auto context" text with icon
  - [ ] Click triggers context menu
  - [ ] Tooltip displays correctly

- [ ] **Attachment Button**
  - [ ] Visible inline with Auto Context (📎 icon)
  - [ ] File picker opens on click
  - [ ] Images display in preview
  - [ ] Remove attachment works

- [ ] **Optimize Input Button (✨)**
  - [ ] Icon-only display (36px × 36px)
  - [ ] Tooltip shows "Optimize Input" on hover
  - [ ] Click optimizes user input
  - [ ] Disabled state works correctly

- [ ] **Send Button (↑)**
  - [ ] Icon displays correctly (36px × 36px)
  - [ ] Click sends message
  - [ ] Disabled when input empty
  - [ ] Tooltip shows "Send message"

- [ ] **Stop Button (■)**
  - [ ] Hidden by default
  - [ ] Shows during generation
  - [ ] Click stops AI response
  - [ ] Returns to send button after stop

### Input Field
- [ ] **Placeholder Text**
  - [ ] Shows "Ask Oropendola to do anything"
  - [ ] Disappears on focus
  - [ ] Returns when empty

- [ ] **Text Input**
  - [ ] Multi-line support (auto-expand)
  - [ ] Max height limit (160px)
  - [ ] Shift+Enter for new line
  - [ ] Enter sends message

- [ ] **Clipboard Integration**
  - [ ] Copy text from anywhere
  - [ ] Paste text into input
  - [ ] Paste images (shows preview)
  - [ ] Drag & drop images

### Mode Selector
- [ ] **Mode Dropdown**
  - [ ] Shows only "Agent" and "Ask"
  - [ ] No "Edit" mode visible
  - [ ] Default to "Agent"
  - [ ] Switches correctly

### Message Display
- [ ] **User Messages**
  - [ ] Right-aligned
  - [ ] Dark background
  - [ ] Proper formatting

- [ ] **Assistant Messages**
  - [ ] Left-aligned
  - [ ] Light background with border
  - [ ] Copy button on hover
  - [ ] Code blocks formatted

- [ ] **System Messages**
  - [ ] Center-aligned
  - [ ] Distinct styling
  - [ ] Progress indicators

### Authentication
- [ ] **Login Screen**
  - [ ] Email field validation
  - [ ] Password field (masked)
  - [ ] Sign In button functional
  - [ ] Error messages display

- [ ] **Session Management**
  - [ ] Auto-restore session
  - [ ] Sign Out works
  - [ ] Cookies persist correctly

---

## 2. Additional Features 🚀

### A. Enhanced Optimize Input Feature
**Status:** Basic implementation complete
**Todo:**
- [ ] Add preview modal before sending
- [ ] Show original vs optimized comparison
- [ ] Confidence level indicator
- [ ] Context-aware suggestions
- [ ] Cancel/Edit option

### B. Keyboard Shortcuts Enhancement
**Current:** Cmd+L (open chat), Cmd+I (edit code)
**Todo:**
- [ ] Cmd+K for quick commands
- [ ] Cmd+/ for help menu
- [ ] Escape to cancel generation
- [ ] Cmd+Enter to send message

### C. File Attachment Preview
**Status:** Basic support exists
**Todo:**
- [ ] Image thumbnails in preview
- [ ] PDF preview support
  - [ ] File size display
- [ ] Multiple file selection
- [ ] Drag & drop from file explorer

### D. Conversation Export/Import
**Todo:**
- [ ] Export chat as markdown
- [ ] Export as JSON
- [ ] Import previous conversations
- [ ] Search conversation history

### E. Auto Context Enhancement
**Todo:**
- [ ] Smart file detection
- [ ] Recent files suggestion
- [ ] Workspace summary
- [ ] Git status integration

---

## 3. Bug Fixes 🐛

### Critical Fixes
- [x] ~~JavaScript syntax errors (newline escaping)~~
- [x] ~~Clipboard paste not working~~
- [x] ~~Button event handlers not firing~~
- [x] ~~Emoji rendering in HTML~~

### Pending Fixes
- [ ] **Performance**
  - [ ] Message rendering lag with long conversations
  - [ ] Optimize HTML generation
  - [ ] Virtualize message list

- [ ] **Error Handling**
  - [ ] Network timeout handling
  - [ ] Session expiry detection
  - [ ] Graceful API error display

- [ ] **UI/UX**
  - [ ] Scroll to bottom on new message
  - [ ] Loading state improvements
  - [ ] Better error messages

---

## 4. Feature Enhancements 🎯

### A. Message Formatting
**Current:** Basic markdown support
**Enhancements:**
- [ ] Syntax highlighting for code
- [ ] Better table rendering
- [ ] Collapsible sections
- [ ] Message threading

### B. Smart Context Detection
**Todo:**
- [ ] Detect selected code language
- [ ] Auto-include related files
- [ ] Detect project type
- [ ] Suggest relevant context

### C. Response Actions
**Current:** Copy button
**Add:**
- [ ] Insert at cursor
- [ ] Replace selection
- [ ] Create new file
- [ ] Apply as diff

### D. Conversation Management
**Todo:**
- [ ] Save conversation
- [ ] Load previous chats
- [ ] Search messages
- [ ] Pin important messages
- [ ] Clear conversation

### E. Settings Panel
**Todo:**
- [ ] Temperature control
- [ ] Max tokens setting
- [ ] Provider selection
- [ ] Theme customization
- [ ] Shortcut customization

---

## Installation & Testing Instructions

### Install Extension
```bash
# In VS Code:
# 1. Press Cmd+Shift+P
# 2. Type: "Extensions: Install from VSIX"
# 3. Select: /Users/sammishthundiyil/oropendola/oropendola-ai-assistant-2.0.1.vsix
# 4. Reload window
```

### Test Scenarios

#### Scenario 1: Basic Chat
1. Open Oropendola sidebar
2. Type a simple question
3. Click Send
4. Verify response appears
5. Check formatting

#### Scenario 2: Optimize Input
1. Type vague input: "make it better"
2. Click ✨ Optimize button
3. Verify optimized prompt sent
4. Check AI response quality

#### Scenario 3: File Attachment
1. Click 📎 button
2. Select image file
3. Verify preview appears
4. Send with message
5. Check image in conversation

#### Scenario 4: Clipboard Operations
1. Copy text from editor
2. Paste into chat input
3. Verify text appears
4. Copy image from browser
5. Paste into chat
6. Verify image preview

#### Scenario 5: Mode Switching
1. Switch to "Ask" mode
2. Send question
3. Verify read-only behavior
4. Switch to "Agent" mode
5. Verify full editing capability

---

## Performance Metrics

### Load Time
- [ ] Extension activation < 2s
- [ ] Sidebar view load < 1s
- [ ] First message send < 3s

### Response Time
- [ ] Message send < 500ms
- [ ] Typing indicator < 200ms
- [ ] UI interaction < 100ms

### Memory Usage
- [ ] Idle: < 50MB
- [ ] Active chat: < 150MB
- [ ] Max conversations: 50 messages

---

## Browser Console Checks

### Expected Logs
```
✅ Oropendola AI Extension is now active!
✅ Sidebar provider registered
✅ ChatManager initialized
✅ Authentication check passed
```

### Error Checks
- [ ] No JavaScript syntax errors
- [ ] No uncaught exceptions
- [ ] No CSP violations
- [ ] No network errors (except 404 for marketplace)

---

## Next Steps

### Priority 1 (This Week)
1. [ ] Complete all UI testing
2. [ ] Implement Optimize Input preview
3. [ ] Add keyboard shortcuts
4. [ ] Fix performance issues

### Priority 2 (Next Week)
1. [ ] Add conversation export
2. [ ] Enhance Auto Context
3. [ ] Improve error handling
4. [ ] Add settings panel

### Priority 3 (Future)
1. [ ] Message threading
2. [ ] Advanced formatting
3. [ ] Plugin system
4. [ ] Multi-provider support

---

## Version History

### v2.0.1 (Current)
- ✅ UI layout restructured
- ✅ Optimize Input button added
- ✅ Clipboard fixes
- ✅ JavaScript syntax fixes
- ✅ Button size adjustments

### v2.0.0
- Two-mode system (Agent/Ask)
- ConversationTask integration
- Session-based authentication
- Auto Context support

---

**Last Updated:** 2025-10-19
**Status:** Ready for comprehensive testing
