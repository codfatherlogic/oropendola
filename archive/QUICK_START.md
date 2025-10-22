# 🚀 Oropendola v2.0.5 - Quick Start Guide

## ⚡ Installation

```bash
code --install-extension oropendola-ai-assistant-2.0.5.vsix
```

## 🔑 First Steps

1. **Sign In** - Press `F2` or run `Oropendola: Sign In (Enhanced)`
2. **Index Workspace** (optional) - Run `Oropendola: Index Workspace`
3. **Start Coding** - Inline completions will appear as you type!

## 🎯 Key Features

### 🤖 Inline Completions (Copilot-Style)
- **What:** Ghost text suggestions as you type
- **How:** Just start typing, wait 75ms, press `Tab` to accept
- **Toggle:** `"oropendola.inlineCompletions.enabled": true/false`

### 💬 AI Chat
- **Command:** `Oropendola: Open AI Chat Panel`
- **Features:** Context-aware, copy/insert code, markdown support
- **Tip:** Chat includes your current file context automatically

### 🔍 Diagnostics
- **What:** AI-detected issues in Problems panel
- **Auto-run:** On file save (if enabled)
- **Manual:** Run `Oropendola: Run AI Diagnostics`
- **Fix:** Look for 💡 light bulb on issues

### 🛠️ Code Actions
- **How:** Right-click code → Refactor → Oropendola AI
- **Actions:**
  - 🤖 AI: Refactor selection
  - 🤖 AI: Explain code
  - 🤖 AI: Optimize code
  - 🤖 AI: Generate documentation

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `F2` | Sign In |
| `F3` | Open Chat |
| `F4` | Explain Code |
| `F5` | Fix Code |
| `F6` | Improve Code |
| `Cmd+I` | Edit Mode |

## ⚙️ Essential Settings

```json
{
  "oropendola.serverUrl": "https://oropendola.ai",
  "oropendola.inlineCompletions.enabled": true,
  "oropendola.inlineCompletions.delay": 75,
  "oropendola.diagnostics.enabled": true,
  "oropendola.diagnostics.runOnSave": true,
  "oropendola.indexing.enabled": true,
  "oropendola.telemetry.enabled": true
}
```

## 🎛️ Quick Settings Access

1. `Cmd+,` (Mac) or `Ctrl+,` (Windows/Linux)
2. Search: "oropendola"
3. Adjust as needed

## 📊 Status Bar

Look for these indicators:

- 🔒 **Oropendola: Sign In** - Not authenticated
- 🐦 **Oropendola AI** - Authenticated and ready
- $(loading~spin) **AI completion...** - Fetching suggestion
- $(check) **Oropendola AI** - Completion ready

## 🔧 Commands (Quick Access)

Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux), then type:

- `Oropendola: Sign In (Enhanced)` - Authenticate
- `Oropendola: Index Workspace` - Index your code
- `Oropendola: Open AI Chat Panel` - Start chatting
- `Oropendola: Run AI Diagnostics` - Analyze code
- `Oropendola: Toggle Autocomplete` - Enable/disable completions

## 🐛 Troubleshooting Quick Fixes

### No completions appearing?
1. Check: `"oropendola.inlineCompletions.enabled": true`
2. Sign in via `F2`
3. Check status bar for errors

### Chat not working?
1. Verify: `"oropendola.serverUrl": "https://oropendola.ai"`
2. Check internet connection
3. Look at Output panel (View → Output → Oropendola)

### Diagnostics not showing?
1. Enable: `"oropendola.diagnostics.enabled": true`
2. Save file to trigger (if runOnSave is true)
3. Or run manually: `Oropendola: Run AI Diagnostics`

## 📚 More Info

See `ENTERPRISE_FEATURES_v2.0.5.md` for comprehensive documentation.

## 🌐 Server URL

Default: `https://oropendola.ai`

Change in settings:
```json
{
  "oropendola.serverUrl": "https://your-custom-server.com"
}
```

## 🔒 Privacy Controls

Disable features individually:

```json
{
  "oropendola.telemetry.enabled": false,       // No analytics
  "oropendola.inlineCompletions.enabled": false, // No completions
  "oropendola.diagnostics.enabled": false,     // No diagnostics
  "oropendola.indexing.enabled": false         // No workspace indexing
}
```

## ✨ Pro Tips

1. **Index on startup** - Set `"oropendola.indexing.onStartup": true` for better AI context
2. **Lower delay** - Set `"oropendola.inlineCompletions.delay": 50` for faster suggestions
3. **More suggestions** - Set `"oropendola.inlineCompletions.maxSuggestions": 5`
4. **Auto-fix on save** - Set `"oropendola.codeActions.autoFixOnSave": true` (use cautiously!)

## 🎉 Happy Coding!

You're all set to experience enterprise-grade AI assistance in VS Code! 🚀

---

**Need help?** Visit https://oropendola.ai/support
