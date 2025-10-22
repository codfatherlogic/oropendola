# 🚀 Quick Install Guide - Oropendola AI v2.3.17

## ✨ What's New

- ✅ **Fixed** webview `filePath.split` error
- ✅ **Fixed** noisy console errors for optional backend APIs
- ✅ **Improved** error messages (warnings instead of errors)
- ✅ **Enhanced** graceful degradation when backend unavailable

---

## 📦 Installation Steps

### Option 1: VS Code Command Line (Recommended)

```bash
# 1. Uninstall previous version (if installed)
code --uninstall-extension oropendola.oropendola-ai-assistant

# 2. Install v2.3.17
code --install-extension /Users/sammishthundiyil/oropendola/oropendola-ai-assistant-2.3.17.vsix

# 3. Reload VS Code
code --reload
```

### Option 2: VS Code GUI

1. **Uninstall Previous Version**:
   - Open VS Code Extensions panel (`Cmd+Shift+X`)
   - Find "Oropendola AI Assistant"
   - Click gear icon → Uninstall
   - Reload window

2. **Install v2.3.17**:
   - Press `Cmd+Shift+P`
   - Type: "Extensions: Install from VSIX..."
   - Navigate to: `/Users/sammishthundiyil/oropendola/oropendola-ai-assistant-2.3.17.vsix`
   - Click "Install"

3. **Reload Window**:
   - Press `Cmd+Shift+P`
   - Type: "Developer: Reload Window"
   - Press Enter

---

## ✅ Verification

After installation, check:

1. **Extension Activated**:
   - Look for Oropendola icon in sidebar
   - Check Extensions panel shows v2.3.17

2. **Console is Clean**:
   - Open Developer Tools (`Help → Toggle Developer Tools`)
   - Should see ✅ green checkmarks and ⚠️ yellow warnings
   - Should **NOT** see ❌ red errors with stack traces

3. **TODO System Working**:
   - Open Oropendola sidebar
   - Ask: "Create a simple Node.js app"
   - Verify TODO panel appears with tasks
   - Verify tasks update from pending → in-progress → completed

4. **File Changes Display**:
   - After AI creates files, should see "Changed Files" card
   - Should **NOT** see `filePath.split is not a function` error

---

## 🎯 Expected Console Output

### ✅ Good (What You Should See)

```
🆕 Creating new ConversationTask
✅ Realtime connection established
🔍 [PARSE] _parseTodosFromResponse called
🔍 [TodoManager] Found numbered todo: Set up package.json...
📝 Parsed 5 TODO items from AI response
[WEBVIEW] updateTodos received 5 todos
⚠️ Workspace API unavailable, using local context only
⚠️ Git API unavailable, continuing without git context
```

### ❌ Bad (What You Should NOT See)

```
❌ [Extension Host] Failed to get workspace context: Error: Error
    at ApiClient.createApiException (/Users/.../client.js:113:26)
    [Stack trace...]

[addMessageToUI error] TypeError: filePath.split is not a function
```

---

## 🐛 Troubleshooting

### Issue: Extension Not Showing in Sidebar

**Fix**:
1. Press `Cmd+Shift+P`
2. Type: "View: Open View"
3. Select "Oropendola AI"

### Issue: Still Seeing Old Version

**Fix**:
```bash
# Completely remove extension
rm -rf ~/.vscode/extensions/oropendola.oropendola-ai-assistant-*

# Reinstall
code --install-extension oropendola-ai-assistant-2.3.17.vsix

# Hard reload
code --reload
```

### Issue: TODOs Not Appearing

**Check**:
1. Is AI creating numbered lists (1. 2. 3.) ?
2. Open Developer Tools console
3. Look for `[renderTodos] Called with todos: X`
4. If X > 0 but panel empty → Report bug
5. If X = 0 → AI didn't create numbered list

---

## 📊 Quick Test

After installation, run this test:

**1. Open Oropendola sidebar**

**2. Ask AI**:
```
Create a simple Express.js server with:
1. GET / endpoint returning "Hello World"
2. POST /api/echo endpoint echoing request body
3. Error handling middleware
```

**3. Verify**:
- [ ] TODO panel shows 3+ tasks
- [ ] Tasks update from ⬜ → ⏳ → ✅
- [ ] Files created (package.json, server.js)
- [ ] Console shows no red errors
- [ ] File changes card displays correctly

---

## 🎓 What Changed from v2.3.16

| Feature | v2.3.16 | v2.3.17 |
|---------|---------|---------|
| TODO system | ✅ Working | ✅ Still working |
| File creation | ✅ Working | ✅ Still working |
| Webview errors | ❌ filePath.split crash | ✅ Fixed |
| API error logging | ❌ Noisy stack traces | ✅ Clean warnings |
| Backend API failures | ❌ console.error | ✅ console.warn |
| Console cleanliness | ❌ Very noisy | ✅ Clean |

---

## 📱 Support

If you encounter issues:

1. **Check console logs**:
   - Help → Toggle Developer Tools → Console
   - Copy all logs

2. **Check extension version**:
   - Extensions panel → Oropendola AI Assistant
   - Should show "2.3.17"

3. **Try clean reinstall**:
   - Completely uninstall
   - Delete `~/.vscode/extensions/oropendola.*`
   - Reinstall v2.3.17
   - Reload window

---

## 📚 Additional Documentation

- [RELEASE_NOTES_v2.3.17.md](RELEASE_NOTES_v2.3.17.md) - Full release notes
- [DIAGNOSTIC_ANALYSIS_v2.3.16.md](DIAGNOSTIC_ANALYSIS_v2.3.16.md) - Technical analysis
- [TODO_SYSTEM_GUIDE_v2.0.11.md](TODO_SYSTEM_GUIDE_v2.0.11.md) - TODO feature guide

---

**Build**: oropendola-ai-assistant-2.3.17.vsix
**Size**: 3.77 MB
**Status**: ✅ Ready to Install

```bash
code --install-extension /Users/sammishthundiyil/oropendola/oropendola-ai-assistant-2.3.17.vsix
```
