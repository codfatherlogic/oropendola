# Install Oropendola AI Assistant v3.7.0

## Quick Installation Steps

1. **Open VS Code Extensions View**
   - Press `Cmd+Shift+X` (macOS) or `Ctrl+Shift+X` (Windows/Linux)
   - OR click the Extensions icon in the Activity Bar

2. **Install from VSIX**
   - Click the `...` menu (three dots) at the top of the Extensions view
   - Select "Install from VSIX..."
   - Navigate to: `/Users/sammishthundiyil/oropendola/`
   - Select: `oropendola-ai-assistant-3.7.0.vsix`
   - Click "Install"

3. **Reload VS Code**
   - Click "Reload Required" when prompted
   - OR press `Cmd+Shift+P` → "Developer: Reload Window"

## What's Fixed in v3.7.0

### ✅ System Prompt Module Loading
- Fixed bundled module loading for production VSIX
- Modules now load correctly in both dev and production modes
- Added detailed logging to diagnose loading issues

### ✅ Batch File Operations API
- Added `readFilesBatch()` method to API client
- Added `applyDiffsBatch()` method to API client
- Added `getFileInfo()` method to API client
- Frontend now ready for backend batch operations

### Expected Logs After Installation

You should see these logs in the Developer Console:

```
🔍 Modules directory check: NOT FOUND
🔍 Looking for modules at: /Users/.../modules
📦 Bundled mode: Loading modules via require()
📦 Successfully loaded 9 bundled modules
✅ Prompt modules loaded: 9 sections
📋 Loaded modules: core-instructions (priority 1), workflow-guidelines (priority 2), ...
```

And:
```
📦 Prompt modules loaded: 9 sections
✅ System prompt present: ✓ YES
```

## Verify Installation

1. Open Developer Console: `Cmd+Shift+I` → Console tab
2. Filter logs: Type "Prompt modules" in the filter box
3. Look for: `✅ Prompt modules loaded: 9 sections`

4. Send a message to the AI
5. Look for the "Thinking" indicator (⏱️ icon with timer)

## Troubleshooting

### If prompt modules still show "0 sections":
1. Check Developer Console for errors
2. Look for the detailed module loading logs
3. Report the error stack trace

### If "Thinking" indicator doesn't appear:
1. Check that system prompt is present: Look for `✓ YES`
2. Verify backend is streaming reasoning chunks
3. Check WebSocket connection: Look for "Socket ID:"

### If better_sqlite3 error persists:
This error is non-critical - the extension works without the Task Manager. It only affects task persistence between sessions.

## Current Known Issues

1. **better_sqlite3 native binding** - Non-critical, task persistence disabled
2. **Semantic search API** - Requires `enabledApiProposals: ["findTextInFiles"]` in package.json
3. **Telemetry 417 error** - Backend endpoint issue, non-blocking

## File Locations

- **VSIX File**: `/Users/sammishthundiyil/oropendola/oropendola-ai-assistant-3.7.0.vsix`
- **Size**: 7.73 MB
- **Build Date**: Oct 27, 2025
- **Version**: 3.7.0

## Next Steps

After installing:
1. Test the "Thinking" indicator with a complex request
2. Try batch file operations (if backend supports it)
3. Monitor the Developer Console for any errors
