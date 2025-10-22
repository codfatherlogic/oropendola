# Installation and Testing Guide

## Quick Installation

1. **Install the Extension**
   ```bash
   code --install-extension oropendola-ai-assistant-1.0.0.vsix
   ```

2. **Reload VS Code**
   - Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
   - Type "Reload Window" and press Enter
   - Or simply restart VS Code

## First-Time Setup

### Step 1: Configure API Credentials

1. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Type and select: **"Oropendola: Setup"**
3. Enter your API Key when prompted
4. Enter your API Secret when prompted

Your credentials will be saved securely in VS Code settings.

### Step 2: Verify Configuration

You can check your configuration in VS Code settings:
1. Open Settings (`Cmd+,` / `Ctrl+,`)
2. Search for "Oropendola"
3. Verify these settings:
   - `oropendola.api.url`: https://oropendola.ai
   - `oropendola.api.key`: Your API key
   - `oropendola.api.secret`: Your API secret (hidden)

## Testing the Extension

### Test 1: Open Chat Window

1. Open Command Palette
2. Type and select: **"Oropendola: Chat"**
3. A chat panel should open on the right side
4. You should see the Oropendola AI Chat interface

**Expected Result:**
- Chat panel opens with message input at the bottom
- Send button is visible
- Chat history area is visible

### Test 2: Send a Message

1. In the chat panel, type a simple message: "Hello, can you help me?"
2. Click the "Send" button or press Enter
3. Watch for the streaming response

**Expected Result:**
- Your message appears in the chat
- AI response appears token-by-token (streaming)
- Status bar shows remaining API requests

### Test 3: Code Explanation

1. Open any code file in your workspace
2. Select a few lines of code
3. Open Command Palette
4. Select: **"Oropendola: Explain Code"**

**Expected Result:**
- Chat panel opens automatically
- AI explains the selected code in detail

### Test 4: Code Review

1. Open any code file
2. Select code or leave it unselected (will review entire file)
3. Open Command Palette
4. Select: **"Oropendola: Review Code"**

**Expected Result:**
- Chat panel opens
- AI provides code review with suggestions

### Test 5: Check Subscription Status

1. Look at the VS Code status bar (bottom right)
2. You should see an indicator like: 🟢 Oropendola (100 left)
3. Click on it to see detailed subscription info

**Color Indicators:**
- 🟢 Green: 50+ requests remaining
- 🟡 Yellow: 10-49 requests remaining
- 🔴 Red: Less than 10 requests remaining

## Troubleshooting

### Chat Window Not Opening

**Symptoms:**
- Nothing happens when you run "Oropendola: Chat"
- No error message shown

**Solutions:**
1. Make sure you've run "Oropendola: Setup" first
2. Check VS Code Developer Tools (Help → Toggle Developer Tools)
3. Look for errors in the Console tab
4. Try reloading the window (`Cmd+R` / `Ctrl+R`)

### "Not Configured" Warning

**Symptoms:**
- Warning message: "Oropendola not configured"
- Chat won't open

**Solutions:**
1. Run "Oropendola: Setup" command
2. Enter valid API credentials
3. Try opening chat again

### Streaming Not Working

**Symptoms:**
- Messages sent but no response
- Response appears all at once instead of streaming

**Solutions:**
1. Check your internet connection
2. Verify API credentials are correct
3. Check status bar for subscription status
4. Look at Developer Tools Console for API errors

### API Errors

**Common Errors:**

1. **401 Unauthorized**
   - Invalid API key or secret
   - Run "Oropendola: Setup" and re-enter credentials

2. **429 Too Many Requests**
   - Rate limit exceeded
   - Wait a moment and try again
   - Check subscription status

3. **500 Server Error**
   - Oropendola API is having issues
   - Try again later
   - Check https://oropendola.ai for status updates

## Advanced Testing

### Test GitHub Integration

1. **Fork a Repository:**
   ```
   Command: "Oropendola: Fork Repository"
   Enter: https://github.com/owner/repo
   ```

2. **List Your Repositories:**
   ```
   Command: "Oropendola: List GitHub Repositories"
   ```

### Test Code Operations

1. **Analyze Code:**
   ```
   Command: "Oropendola: Analyze Code"
   ```

2. **Fix Code:**
   ```
   Select buggy code
   Command: "Oropendola: Fix Code"
   ```

3. **Improve Code:**
   ```
   Select code to optimize
   Command: "Oropendola: Improve Code"
   ```

### Test Model Selection

1. Open Settings
2. Find: `oropendola.ai.model`
3. Try different models:
   - `auto` (default, automatic selection)
   - `gpt-4` (OpenAI GPT-4)
   - `claude` (Anthropic Claude)
   - `gemini` (Google Gemini)
   - `local` (Local model)

## Debugging Tips

### Enable Verbose Logging

1. Open Developer Tools: `Help → Toggle Developer Tools`
2. Go to Console tab
3. You'll see log messages starting with "🐦 Oropendola"

### Check Network Requests

1. Open Developer Tools
2. Go to Network tab
3. Send a chat message
4. Look for requests to `oropendola.ai`
5. Check request/response details

### View Extension Logs

1. Open Output panel: `View → Output`
2. Select "Oropendola AI Assistant" from dropdown
3. Watch for extension logs

## Uninstalling

If you need to remove the extension:

```bash
code --uninstall-extension oropendola.oropendola-ai-assistant
```

Or use VS Code UI:
1. Go to Extensions view (`Cmd+Shift+X` / `Ctrl+Shift+X`)
2. Find "Oropendola AI Assistant"
3. Click the gear icon
4. Select "Uninstall"

## Getting Help

If you encounter issues:

1. Check this guide's Troubleshooting section
2. Review the [README.md](./README.md) for feature documentation
3. Check [DEVELOPMENT.md](./DEVELOPMENT.md) for technical details
4. Open Developer Tools and check for errors
5. Contact Oropendola support at https://oropendola.ai

## Success Checklist

- [ ] Extension installed successfully
- [ ] API credentials configured
- [ ] Chat window opens
- [ ] Can send messages and receive streaming responses
- [ ] Status bar shows subscription info
- [ ] Code operations work (explain, review, fix, improve)
- [ ] No errors in Developer Tools console

Once all items are checked, your extension is working perfectly! 🎉
