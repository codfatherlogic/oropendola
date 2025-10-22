# Install v2.0.9 - Race Condition Fix

## 🎯 What This Version Fixes

**Problem**: TODOs appeared briefly (23 items) then immediately disappeared (cleared to 0).

**Solution**: Fixed race condition between TODO parsing/saving and backend fetch by properly awaiting async operations.

## 📦 Installation

### Option 1: Command Line (Recommended)

```bash
code --install-extension /Users/sammishthundiyil/oropendola/oropendola-ai-assistant-2.0.9.vsix --force
```

### Option 2: VS Code UI

1. Open VS Code
2. Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
3. Type: `Extensions: Install from VSIX...`
4. Navigate to: `/Users/sammishthundiyil/oropendola/oropendola-ai-assistant-2.0.9.vsix`
5. Click "Install"

### Option 3: Drag and Drop

1. Locate `oropendola-ai-assistant-2.0.9.vsix` in Finder
2. Drag and drop onto VS Code window
3. Confirm installation

## 🔄 After Installation

**CRITICAL**: You MUST reload VS Code window for changes to take effect:

1. Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
2. Type: `Developer: Reload Window`
3. Press Enter

**Why?** Webview HTML is cached by VS Code. Reloading regenerates the webview with the latest code.

## ✅ Verify Installation

### 1. Check Version in Console

1. Open Oropendola AI sidebar (bird icon in left sidebar)
2. Open Developer Tools: `Cmd+Option+I` (macOS) or `Ctrl+Shift+I` (Windows/Linux)
3. Go to Console tab
4. Look for: `[Webview Init] Version: oropendola-ai-assistant-2.0.9`

### 2. Test TODO Features

**Send this message**:
```
Create a Frappe driver doctype with all required fields, proper validation, and documentation
```

**Expected Behavior** (v2.0.9):
- ✅ TODOs appear at top between header and messages
- ✅ TODOs stay visible (don't disappear)
- ✅ Panel auto-expands when TODOs arrive
- ✅ Context box shows first 1-2 sentences
- ✅ Related files extracted (if mentioned in response)
- ✅ Visual checkboxes for completion tracking

### 3. Check Console Logs

**Should see** (in order):
```
🤖 Assistant response received
📝 Parsed 23 TODO items from AI response
🔄 Creating TODOs in backend DocType...
✅ Successfully saved 23 TODOs to backend
[WEBVIEW] updateTodos received 23 Object
📋 Backend returned 0 TODOs - keeping locally parsed TODOs (not clearing UI)
```

**Should NOT see** (old broken behavior):
```
❌ [WEBVIEW] updateTodos received 23 Object
❌ [WEBVIEW] updateTodos received 0 Object  ← Immediately after (BAD)
```

### 4. Verify Backend Sync (Optional)

1. Login to https://oropendola.ai
2. Navigate to: **AI TODO** list
3. Should see 23 TODOs saved with names like: `TODO.25.01.20.0000001`
4. Each TODO has:
   - Title (first sentence)
   - Description (full TODO text)
   - Status (Pending/In Progress/Completed)
   - Creation timestamp
   - User (your account)

## 🐛 Troubleshooting

### Issue: TODOs Still Not Visible

**Solutions**:
1. ✅ Reload VS Code window (`Cmd+Shift+P` → "Developer: Reload Window")
2. ✅ Check console for errors (`Cmd+Option+I` → Console tab)
3. ✅ Verify version: Look for `oropendola-ai-assistant-2.0.9` in console
4. ✅ Try uninstalling old version first:
   ```bash
   code --uninstall-extension oropendola.oropendola-ai-assistant
   code --install-extension oropendola-ai-assistant-2.0.9.vsix
   ```

### Issue: "Command not found: code"

**Solution**: VS Code CLI not in PATH. Use Option 2 or 3 above (UI or drag-and-drop).

### Issue: Console Shows Version 2.0.8 (Old Version)

**Reason**: Webview HTML cached from old version.

**Solution**: 
1. Completely close VS Code (quit application)
2. Reopen VS Code
3. Open Developer Tools → Console
4. Should now show: `oropendola-ai-assistant-2.0.9`

### Issue: Extension Not Loading

**Check**:
1. Extensions view (`Cmd+Shift+X`)
2. Search: "Oropendola"
3. Should show: "Oropendola AI Assistant v2.0.9"
4. Status: Enabled (blue toggle switch)

**If disabled**:
- Click the gear icon → "Enable"
- Reload window

## 📊 What Changed from v2.0.8

### Code Changes

| File | Line | Change | Purpose |
|------|------|--------|---------|
| sidebar-provider.js | 1800 | Added `async` to handler | Allow await inside handler |
| sidebar-provider.js | 1804 | Added `await` to parse call | Wait for save to complete |
| sidebar-provider.js | 1370 | Changed `.catch()` to `try/catch` | Better error handling |
| sidebar-provider.js | 1373 | Added success log | Confirm save completed |
| sidebar-provider.js | 1829 | Improved log message | Clarify protection behavior |
| package.json | 5 | Version: 2.0.8 → 2.0.9 | Version bump |

### Behavioral Changes

**Before (v2.0.8)**:
1. Parse TODOs (no await) → starts async
2. Display TODOs → shows 23 items
3. Save to backend → starts async
4. Check backend → returns 0 (save not done)
5. Clear TODOs → overwrite with 0 ❌

**After (v2.0.9)**:
1. Parse TODOs (with await) → waits
2. Display TODOs → shows 23 items
3. Save to backend → awaits completion ✅
4. Check backend → returns 0 (but protected)
5. Keep TODOs → doesn't overwrite ✅

## 🎯 Success Criteria

Installation is successful when ALL of these are true:

- [x] Console shows: `oropendola-ai-assistant-2.0.9`
- [x] TODOs appear at top (between header and messages)
- [x] TODOs stay visible (don't disappear)
- [x] Console shows: `✅ Successfully saved X TODOs to backend`
- [x] No errors in console
- [x] Backend has saved TODOs (verify at oropendola.ai)

## 📚 Related Documentation

- **Race Condition Fix**: `RACE_CONDITION_FIX_v2.0.9.md` (technical details)
- **GitHub Copilot Layout**: `GITHUB_COPILOT_LAYOUT_v2.0.8.md` (v2.0.8 positioning fix)
- **Webview Reload**: `WEBVIEW_RELOAD_REQUIRED.md` (caching explanation)
- **What Changed**: `WHAT_CHANGED_VISUAL_GUIDE.md` (v2.0.6 features)

## 🚀 Next Steps After Installation

### 1. Test Core Features

- **TODO Creation**: Ask AI for multi-step plans
- **TODO Completion**: Click checkboxes to mark complete
- **TODO Toggle**: Test individual completion tracking
- **Sync Button**: Test manual sync with backend
- **Clear Button**: Test clearing completed TODOs

### 2. Test Edge Cases

- **Empty Response**: AI response with no TODOs
- **Single TODO**: Response with only 1 TODO
- **Many TODOs**: Response with 20+ TODOs
- **Backend Offline**: Disconnect from https://oropendola.ai (should still show local TODOs)
- **Network Slow**: Slow connection (race condition should be fixed now)

### 3. Report Issues

If you find any issues:

1. Open console: `Cmd+Option+I` → Console tab
2. Copy full console output
3. Take screenshot of UI
4. Note:
   - What you tried to do
   - What happened
   - What you expected
   - Version: 2.0.9

---

**Build Info**:
- Version: **2.0.9**
- File: `oropendola-ai-assistant-2.0.9.vsix`
- Size: **3.6 MB** (3.65 MB uncompressed)
- Files: **1,291** total
- Date: **Jan 20, 2025**
- Status: ✅ **Ready for Testing**

**Key Improvement**: Fixed race condition where TODOs would appear then immediately disappear. Now properly waits for backend save to complete before checking for updates.
