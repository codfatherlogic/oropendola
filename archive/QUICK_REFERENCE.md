# Oropendola Extension - Quick Reference Guide

**Version:** 2.0.1 | **Updated:** 2025-10-19

---

## 🚀 Quick Start

### Installation
```bash
1. Open VS Code
2. Press Cmd+Shift+P (Ctrl+Shift+P on Windows/Linux)
3. Type: "Extensions: Install from VSIX"
4. Select: oropendola-ai-assistant-2.0.1.vsix
5. Click "Reload Window"
```

### First-Time Setup
```
1. Click Oropendola icon in sidebar
2. Sign in with your email
3. Start chatting!
```

---

## ⌨️ Keyboard Shortcuts

| Action | Mac | Windows/Linux |
|--------|-----|---------------|
| Open Chat | `Cmd+L` | `Ctrl+L` |
| Edit Selected Code | `Cmd+I` | `Ctrl+I` |
| Explain Code | `Cmd+Shift+E` | `Ctrl+Shift+E` |
| Fix Code | `Cmd+Shift+F` | `Ctrl+Shift+F` |
| Improve Code | `Cmd+Shift+I` | `Ctrl+Shift+I` |
| Show Shortcuts | `Cmd+Shift+H` | `Ctrl+Shift+H` |
| Test Extension | `Cmd+Shift+T` | `Ctrl+Shift+T` |

---

## 🎛️ UI Components

### Input Area
```
┌─────────────────────────────────────┐
│ [○ Auto context] [📎]              │ ← Context & Attachment
├─────────────────────────────────────┤
│ Ask Oropendola to do anything___   │ ← Input field
│ [✨] [↑]                            │ ← Optimize & Send
├─────────────────────────────────────┤
│ MODE: [Agent ▼]                     │ ← Mode selector
└─────────────────────────────────────┘
```

### Buttons Explained

**✨ Optimize Input**
- Improves your message clarity
- Adds context automatically
- Shows before/after preview
- *Hover to see tooltip*

**↑ Send**
- Sends your message
- Disabled when input empty
- Switches to Stop (■) during generation

**○ Auto Context**
- Adds workspace context
- Includes active file info
- Detects selected code

**📎 Attach**
- Attach images
- Drag & drop support
- Shows preview before sending

---

## 🎯 Two Modes

### Agent Mode (Default)
**What it does:**
- Full file editing capability
- Can create/modify/delete files
- Executes tool calls
- Multi-file operations

**When to use:**
- Building new features
- Refactoring code
- Project-wide changes

### Ask Mode
**What it does:**
- Read-only assistance
- Answers questions
- Explains code
- Provides guidance

**When to use:**
- Learning and exploration
- Code review
- Documentation help
- Quick questions

---

## 💬 Chat Features

### Send a Message
1. Type your message
2. Click **↑** or press **Enter**
3. Wait for response
4. Use **■** to stop if needed

### Attach Images
**Method 1: Click**
```
1. Click 📎 button
2. Select image file
3. Preview appears
4. Send message
```

**Method 2: Drag & Drop**
```
1. Drag image from Finder
2. Drop on input field
3. Preview appears
4. Send message
```

**Method 3: Paste**
```
1. Copy image (Cmd+C)
2. Click input field
3. Paste (Cmd+V)
4. Send message
```

### Optimize Input
```
1. Type message: "fix this"
2. Click ✨ Optimize button
3. Review preview:
   Original: "fix this"
   Optimized: "Please fix this code..."
4. Choose action:
   ✅ Use Optimized
   ✏️ Edit & Send
   ❌ Keep Original
```

### Message Actions
**On Assistant Messages:**
- **Copy** - Copy message to clipboard
- **Insert** - Insert at cursor *(coming soon)*
- **Replace** - Replace selection *(coming soon)*
- **New File** - Create file from code *(coming soon)*

---

## 🔧 Common Tasks

### Explain Selected Code
```
1. Select code in editor
2. Press Cmd+Shift+E
   OR right-click → "Explain Code"
3. View explanation in chat
```

### Fix Code Issues
```
1. Select buggy code
2. Press Cmd+Shift+F
   OR right-click → "Fix Code"
3. Review suggested fixes
4. Apply changes
```

### Improve Code Quality
```
1. Select code to improve
2. Press Cmd+Shift+I
   OR right-click → "Improve Code"
3. See optimization suggestions
4. Apply improvements
```

### Analyze Current File
```
1. Open file in editor
2. Right-click → "Analyze Code"
   OR Cmd+Shift+P → "Oropendola: Analyze Code"
3. View analysis results
```

---

## 🎨 Customization

### Settings Location
```
VS Code → Preferences → Settings
Search: "Oropendola"
```

### Key Settings

**API Configuration**
```json
{
  "oropendola.api.url": "https://oropendola.ai",
  "oropendola.user.email": "your@email.com"
}
```

**AI Behavior**
```json
{
  "oropendola.ai.temperature": 0.7,  // 0.0-2.0
  "oropendola.ai.maxTokens": 4096
}
```

**Autocomplete**
```json
{
  "oropendola.autocomplete.enabled": true,
  "oropendola.autocomplete.debounceDelay": 200
}
```

**Chat History**
```json
{
  "oropendola.chat.historySize": 50
}
```

---

## 🐛 Troubleshooting

### Extension Not Loading
```
1. Check Extensions view (Cmd+Shift+X)
2. Ensure "Oropendola AI Assistant" is enabled
3. Reload window (Cmd+Shift+P → "Reload Window")
4. Check Console for errors (Help → Toggle Developer Tools)
```

### Can't Sign In
```
1. Check internet connection
2. Verify email/password
3. Clear session: Settings → "oropendola.session.cookies" → Clear
4. Try again
```

### Buttons Not Working
```
1. Check browser console (Inspect webview)
2. Look for JavaScript errors
3. Reload extension
4. Reinstall if needed
```

### Clipboard Not Working
```
1. Check browser permissions
2. Try direct paste (Cmd+V)
3. Use drag & drop instead
4. Reload window
```

---

## 📊 Testing

### Run Test Suite
```bash
cd /Users/sammishthundiyil/oropendola
./test-extension.sh
```

### Manual Testing
```
Open: TESTING_CHECKLIST.md
Follow: Step-by-step instructions
Document: Any issues found
```

---

## 📚 Resources

### Documentation
- **Full Features:** `COMPREHENSIVE_FEATURES.md`
- **Testing Guide:** `TESTING_CHECKLIST.md`
- **Architecture:** `ARCHITECTURE.md`
- **Quick Start:** `QUICKSTART.md`

### Test Files
- **Test Script:** `test-extension.sh`
- **Input Optimizer:** `src/utils/input-optimizer.js`

### Support
- **Email:** sammish@Oropendola.ai
- **Website:** https://oropendola.ai
- **GitHub:** https://github.com/codfatherlogic/oropendola-ai

---

## 🎯 Pro Tips

### 1. Use Optimize Input for Better Results
```
Instead of: "fix this"
Optimized:  "Please fix this code. Provide specific 
             suggestions and explain the changes."
```

### 2. Add Context for Accurate Help
```
Good: "How do I optimize this React component?"
Better: "How do I optimize this React component? 
         I want to reduce re-renders and improve performance."
```

### 3. Use Mode Appropriately
- **Agent:** When you want code changes
- **Ask:** When you want explanations

### 4. Leverage Keyboard Shortcuts
```
Workflow:
1. Select code (mouse)
2. Cmd+Shift+E (explain)
3. Cmd+Shift+F (fix)
4. Cmd+Shift+I (improve)
Fast iteration!
```

### 5. Attach Images for Visual Context
```
Screenshot error → Paste in chat → Get help faster
```

---

## ⚡ Quick Commands

### Via Command Palette (Cmd+Shift+P)
```
Oropendola: Open Chat
Oropendola: Sign In
Oropendola: Sign Out
Oropendola: Check Subscription
Oropendola: Setup
Oropendola: Show Keyboard Shortcuts
Oropendola: Toggle Autocomplete
```

### Via Right-Click Menu
```
Oropendola: Edit Code with AI
Oropendola: Explain Code
Oropendola: Fix Code
Oropendola: Improve Code
Oropendola: Analyze Code
Oropendola: Review Code
```

---

## 📈 Version History

### v2.0.1 (Current)
- ✅ Enhanced UI layout
- ✅ Optimize Input button
- ✅ Clipboard fixes
- ✅ Button improvements
- ✅ JavaScript syntax fixes

### v2.0.0
- Two-mode system (Agent/Ask)
- ConversationTask integration
- Session-based auth
- Auto Context support

---

**Need Help?**  
📧 sammish@Oropendola.ai  
🌐 https://oropendola.ai
