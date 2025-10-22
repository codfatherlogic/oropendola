# Installation Guide - Oropendola AI v2.3.14

## 🚀 Quick Install

### Option 1: Command Line (Fastest)
```bash
code --install-extension oropendola-ai-assistant-2.3.14.vsix
```

### Option 2: VS Code UI
1. Open VS Code
2. Press `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (Mac)
3. Click the `...` menu → **Install from VSIX...**
4. Navigate to and select `oropendola-ai-assistant-2.3.14.vsix`
5. Click **Reload** when prompted

## 📦 What's Included in v2.3.14

### 🎨 Claude-Style Chat UI (NEW!)
- **Colored message borders**: Blue for user, purple-blue for assistant
- **Left accent stripes**: 3px gradient stripes on each message
- **Enhanced thinking indicator**: Better visibility with background and accent stripe
- **Professional appearance**: Matches Claude Code Chat interface

### ✅ Previous Features Still Included
- **WebSocket Persistence** (v2.3.11): Real-time TODO updates
- **TODO ID Fix** (v2.3.12): Checkboxes update correctly
- **Message Queue** (v2.3.13): Queue messages during task execution

## 🔧 Post-Installation Steps

### 1. Verify Installation
After installing, you should see "Oropendola AI Assistant" in your Extensions list:
```
Extensions: Oropendola AI Assistant v2.3.14 ✓
```

### 2. Open Oropendola Sidebar
- Click the Oropendola icon in the Activity Bar (left sidebar)
- Or press `Ctrl+Shift+P` / `Cmd+Shift+P` → "Oropendola: Open Chat"

### 3. Configure Backend Connection
Make sure your Frappe backend is configured:
1. Open Settings (`Ctrl+,` / `Cmd+,`)
2. Search for "Oropendola"
3. Set `oropendola.backendUrl` to your Frappe server URL
4. Example: `https://your-frappe-site.com`

### 4. Test the New UI
Send a test message to see the new Claude-style interface:
- **User messages**: Blue border with left accent stripe
- **Assistant responses**: Purple-blue border with left accent stripe
- **Thinking indicator**: Enhanced visibility with subtle background

## 🎨 Visual Changes You'll Notice

### Message Appearance
```
Before v2.3.14:
┌─────────────────────────┐
│ Your message here       │  ← Plain, no borders
└─────────────────────────┘

After v2.3.14:
┌─────────────────────────┐
│ ▐ Your message here     │  ← Blue border + stripe
└─────────────────────────┘
```

### Thinking Indicator
The thinking indicator now:
- Has a subtle blue background for visibility
- Shows a blue left accent stripe
- Displays animated states: "Forming", "Finding", "Reasoning", etc.
- Uses higher z-index to ensure it's always visible

## 🔄 Upgrading from Previous Versions

### From v2.3.13
This is a **visual-only update**. No settings or configuration changes needed.
- All message queue features preserved
- WebSocket fixes still active
- Only UI appearance has changed

### From v2.3.12 or Earlier
You get all cumulative improvements:
1. ✅ WebSocket persistence (v2.3.11)
2. ✅ TODO ID matching (v2.3.12)
3. ✅ Message queue system (v2.3.13)
4. ✅ Claude-style UI (v2.3.14)

## 🐛 Troubleshooting

### Issue: Extension Not Showing in Sidebar
**Solution**: Reload VS Code window
- Press `Ctrl+R` (Windows/Linux) or `Cmd+R` (Mac)
- Or: `Ctrl+Shift+P` → "Developer: Reload Window"

### Issue: New UI Not Appearing
**Solution**: Refresh the webview
1. Click the refresh icon in the Oropendola header
2. Or close and reopen the Oropendola sidebar

### Issue: Colors Look Wrong
**Solution**: Check VS Code theme
- The colors use VS Code theme variables
- Works best with dark themes (Dark+, Monokai, etc.)
- Light themes will have adjusted opacity values

### Issue: Messages Not Sending
**Solution**: Verify backend connection
1. Open Developer Tools: `Help` → `Toggle Developer Tools`
2. Check Console for connection errors
3. Verify `oropendola.backendUrl` in settings
4. Ensure Frappe backend is running

## 📊 Build Information

- **Version**: 2.3.14
- **File Size**: 3.7 MB
- **Total Files**: 1,318
- **Build Date**: October 21, 2025

## 🎯 Key Features Working After Install

### 1. Real-Time TODO Updates
- TODOs update from ⬜ Pending → ⏳ In Progress → ✅ Completed
- WebSocket connection persists for backend events
- No more stuck "Pending" statuses

### 2. Message Queue System
- Send messages during task execution → they get queued
- Automatic sequential processing when task completes
- Notifications: "📥 Message queued (X in queue)"

### 3. Claude-Style Interface
- **NEW**: Colored borders differentiate message types
- **NEW**: 3px gradient accent stripes
- **NEW**: Enhanced thinking indicator visibility
- Professional, polished appearance

### 4. Enhanced Thinking States
Dynamic thinking states with animations:
- 💭 Forming
- 🔍 Finding
- 🧠 Reasoning
- 📊 Analyzing
- 🔨 Building
- ✨ Refining

## 📖 Documentation

- **Full Release Notes**: See [RELEASE_NOTES_v2.3.14.md](RELEASE_NOTES_v2.3.14.md)
- **Visual Guide**: See [CLAUDE_UI_VISUAL_GUIDE_v2.3.14.md](CLAUDE_UI_VISUAL_GUIDE_v2.3.14.md)
- **Support**: Visit https://oropendola.ai/support

## ✅ Verification Checklist

After installation, verify:
- [ ] Extension appears in Extensions list (v2.3.14)
- [ ] Oropendola icon visible in Activity Bar
- [ ] Sidebar opens when clicking icon
- [ ] Messages have colored borders
- [ ] User messages have blue accent stripe
- [ ] Assistant messages have purple-blue accent stripe
- [ ] Thinking indicator shows with background
- [ ] Can send and receive messages
- [ ] TODOs update in real-time

## 🚀 Next Steps

1. **Send a test message** to see the new UI
2. **Start a coding task** to see TODO updates in action
3. **Try the message queue** by sending multiple messages during task execution
4. **Enjoy the new look!** 🎨

---

**Congratulations!** You're now running Oropendola AI Assistant v2.3.14 with the beautiful Claude-style chat interface.

For questions or issues, visit: https://oropendola.ai/support
