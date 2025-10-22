# ⚠️ CRITICAL: How to See the Claude-Style UI Changes

## 🔴 Why You're Not Seeing Changes

The CSS styling is **embedded in the HTML template** inside the extension code. Simply installing the extension **is not enough** - VS Code caches the webview HTML.

## ✅ CORRECT Installation Steps (Follow These Exactly!)

### Step 1: Uninstall Old Version
```bash
code --uninstall-extension oropendola.oropendola-ai-assistant
```

###  Step 2: **CRITICAL** - Close ALL VS Code Windows
- Close **every single VS Code window**
- Make sure no VS Code processes are running
- On Mac: `Cmd+Q` to fully quit VS Code
- On Windows/Linux: Close all windows and check Task Manager

### Step 3: Install v2.3.15
```bash
code --install-extension oropendola-ai-assistant-2.3.15.vsix
```

### Step 4: Open VS Code Fresh
- Open VS Code (**single window only** for testing)
- Open your project folder

### Step 5: Force Webview Reload
**Method 1 - Reload Window (RECOMMENDED)**:
1. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type: "Developer: Reload Window"
3. Press Enter

**Method 2 - Restart VS Code Completely**:
- Close VS Code entirely
- Reopen it

### Step 6: Open Oropendola Sidebar
- Click the Oropendola icon in the Activity Bar (left sidebar)
- Or press `Cmd+Shift+P` → "Oropendola: Open Chat"

### Step 7: Send a Test Message
- Send any message like "create simple app"
- You should NOW see:
  - ✅ **Thinking indicator** with blue background and left stripe
  - ✅ **Your message** with blue border and left accent stripe
  - ✅ **AI response** with purple-blue border and left accent stripe
  - ✅ **TODO list** with colored checkboxes

## 🎨 What You Should See

### Thinking Indicator (VISIBLE NOW!)
```
┌───────────────────────────────────┐
│ ▐ Thinking...                     │ ← Blue background
│ ▐                                 │   Blue 3px left stripe
└───────────────────────────────────┘
```

### Your Messages (Blue)
```
┌───────────────────────────────────┐
│ ▐ create simple app               │ ← Blue border
│ ▐                                 │   Blue 3px left stripe
└───────────────────────────────────┘
```

### AI Responses (Purple-Blue)
```
┌───────────────────────────────────┐
│ ▐ I'll create a simple app...     │ ← Purple-blue border
│ ▐                                 │   Purple-blue 3px left stripe
└───────────────────────────────────┘
```

## 🐛 Still Not Seeing Changes?

### Debug Checklist:
- [ ] Completely closed all VS Code windows before installing
- [ ] Ran "Developer: Reload Window" after installation
- [ ] Opened Oropendola sidebar and sent a message
- [ ] Checked that extension version shows "2.3.15" in Extensions list

### Force Webview Regeneration:
1. **Click the New Chat button** (➕ icon in Oropendola header)
2. This forces the webview to regenerate with new CSS
3. Send a test message

### Nuclear Option - Complete Reset:
```bash
# 1. Uninstall extension
code --uninstall-extension oropendola.oropendola-ai-assistant

# 2. Remove extension cache (Mac/Linux)
rm -rf ~/.vscode/extensions/oropendola.oropendola-ai-assistant-*

# 3. Quit VS Code completely
# Mac: Cmd+Q
# Windows/Linux: Close all windows

# 4. Reinstall
code --install-extension oropendola-ai-assistant-2.3.15.vsix

# 5. Open VS Code fresh
# 6. Reload Window (Cmd+Shift+P → Developer: Reload Window)
```

## 📊 Verify Installation

### Check Extension Version:
1. Open Extensions view (`Cmd+Shift+X`)
2. Search for "Oropendola"
3. Version should show **2.3.15**

### Check Console for CSS:
1. Open Oropendola sidebar
2. Open Developer Tools: `Help` → `Toggle Developer Tools`
3. Go to Console tab
4. Send a message
5. You should see:
   - `💭 [showTypingIndicator] Called`
   - `💭 Thinking indicator shown`
   - `💭 Rotated to state: Forming`

### Visual Verification:
- Open Oropendola sidebar
- Send message: "hello"
- You should see:
  - ✅ Your "hello" message with **blue left stripe**
  - ✅ Thinking indicator with **blue background**
  - ✅ AI response with **purple-blue left stripe**

## 🎯 Key Changes in v2.3.15

1. **Message Borders**: All messages have colored borders
   - User: Blue `rgba(64, 165, 255, 0.25)`
   - Assistant: Purple-blue `rgba(100, 150, 255, 0.2)`
   - Error: Red `rgba(244, 67, 54, 0.3)`
   - System: Gray `rgba(158, 158, 158, 0.2)`

2. **Left Accent Stripes**: 3px gradient stripes using `::before` pseudo-elements
   - Creates visual depth
   - Matches Claude Code Chat style

3. **Thinking Indicator**: NOW VISIBLE!
   - Background: `rgba(100, 150, 255, 0.05)`
   - Border: `rgba(100, 150, 255, 0.3)`
   - Left stripe: Blue gradient
   - `z-index: 10` ensures visibility
   - Animated states: "Thinking", "Forming", "Finding", etc.

4. **Better Spacing**:
   - Messages: `padding: 12px 16px`, `border-radius: 8px`
   - Left padding: `20px` to accommodate stripe
   - Margin between messages: `12px`

## ⚡ Quick Test Command

After installing v2.3.15:
1. Open Oropendola
2. Send this message: `create simple app`
3. Watch for:
   - ✅ Thinking indicator appears (blue background, visible!)
   - ✅ Your message has blue left stripe
   - ✅ AI response has purple-blue left stripe
   - ✅ TODOs update in real-time (⬜ → ⏳ → ✅)

## 📞 Still Having Issues?

If you still don't see the changes after following ALL steps:

1. **Take a screenshot** of:
   - Oropendola sidebar showing a message
   - Extensions list showing version 2.3.15
   - Console (Developer Tools) showing any errors

2. **Check browser DevTools**:
   - Right-click on Oropendola sidebar
   - Select "Inspect Element"
   - Check if `.message-user` has `border: 1px solid rgba(64, 165, 255, 0.25)`
   - Check if `.claude-thinking-container` exists in the DOM

3. **Verify CSS is loaded**:
   - In DevTools, go to Elements tab
   - Find `<style>` tag in `<head>`
   - Search for `.message-user::before`
   - Should see: `background: linear-gradient(to bottom, rgba(64, 165, 255, 0.7), rgba(64, 165, 255, 0.4))`

---

**The key**: CSS changes only apply after **complete window reload** because the HTML template is generated once and cached. Follow the steps exactly!
