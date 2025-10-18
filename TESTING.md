# 🧪 Testing the Oropendola Extension

## Quick Test Guide

### Step 1: Run the Extension

1. Open this folder in VS Code
2. Press **F5** (or Run > Start Debugging)
3. A new VS Code window will open with the extension loaded

### Step 2: Configure (Required)

In the Extension Development Host window:

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type: `Oropendola: Setup`
3. Enter your API credentials:
   - **API Key**: (from oropendola.ai)
   - **API Secret**: (from oropendola.ai)

### Step 3: Test Features

#### Test 1: Chat Interface ✅
```
1. Ctrl+Shift+P → "Oropendola: Chat"
2. Type a question: "What is a REST API?"
3. Press Enter or click Send
4. Watch the streaming response appear!
```

#### Test 2: Code Explanation ✅
```
1. Create a new file with some code
2. Select the code
3. Right-click → "Explain Code"
4. Check the chat panel for explanation
```

#### Test 3: Status Bar ✅
```
1. Look at bottom-right corner
2. Should see: "🟢 Oropendola: XXX requests"
3. Click it to see subscription details
```

#### Test 4: Fork Repository ✅
```
1. Ctrl+Shift+P → "Oropendola: Fork Repository"
2. Enter: https://github.com/microsoft/vscode-extension-samples
3. Watch it fork, clone, and analyze!
```

#### Test 5: Code Analysis ✅
```
1. Open any code file
2. Ctrl+Shift+P → "Oropendola: Analyze Code"
3. See file statistics
```

### Step 4: Check Console

Open the Debug Console (Ctrl+Shift+Y) to see:
- Extension activation logs
- API requests
- Error messages

## Manual Test Checklist

- [ ] Extension activates without errors
- [ ] Setup command accepts credentials
- [ ] Chat panel opens successfully
- [ ] Messages can be sent
- [ ] Streaming responses work
- [ ] Status bar shows up
- [ ] Status bar updates after requests
- [ ] Right-click menu shows Oropendola commands
- [ ] Explain Code works
- [ ] Fix Code works
- [ ] Improve Code works
- [ ] Review Code works
- [ ] Analyze Code works
- [ ] Fork Repository works (with GitHub token)
- [ ] Subscription check works
- [ ] Model change works
- [ ] Context is properly built
- [ ] Error messages are user-friendly

## Testing Without Real API

If you don't have Oropendola API credentials yet:

1. **Edit the provider** to return mock responses:

```javascript
// In src/ai/providers/oropendola-provider.js
async chat(message, context, onToken) {
  // Mock streaming response
  if (onToken) {
    const words = 'This is a mock response for testing'.split(' ');
    for (const word of words) {
      await new Promise(resolve => setTimeout(resolve, 100));
      onToken(word + ' ');
    }
    return 'This is a mock response for testing';
  }
  return 'Mock response: ' + message;
}
```

2. **Skip authentication** in setup:
```javascript
// Just test the UI without real API calls
```

## Debug Tips

### Extension Won't Activate
- Check the Output panel: View > Output > "Extension Host"
- Look for error messages in Debug Console

### Commands Not Showing
- Check package.json syntax
- Reload the window: Ctrl+R in Extension Dev Host

### Chat Panel Issues
- Open DevTools: Help > Toggle Developer Tools
- Check console for JavaScript errors
- Verify WebView HTML loads correctly

### API Errors
- Check your credentials in settings
- Verify internet connection
- Look at Debug Console for error details

## Performance Testing

### Test Streaming Performance
1. Ask a long question
2. Watch tokens appear in real-time
3. Should be smooth without delays

### Test Context Building
1. Open multiple files
2. Make a selection
3. Send chat message
4. Verify context includes file info

### Test Status Bar Updates
1. Send several messages
2. Watch request count decrease
3. Color should change at thresholds

## Known Limitations (Expected)

1. **No API credentials** → Setup required
2. **No GitHub token** → Fork operations won't work
3. **Offline** → API calls will fail
4. **Invalid credentials** → Authentication errors

## Successful Test Indicators

✅ Extension loads without errors
✅ Commands appear in Command Palette
✅ Chat panel opens and displays correctly
✅ Status bar item appears
✅ Right-click menu shows Oropendola options
✅ Settings are properly saved
✅ Error messages are clear and helpful

## Next Steps After Testing

1. **If tests pass**: Ready for packaging!
   ```bash
   npm run package
   ```

2. **If tests fail**: Check console logs and fix issues

3. **For production**: 
   - Add extension icon
   - Test with real API credentials
   - Get user feedback
   - Publish to marketplace

## Need Help?

- Check DEVELOPMENT.md for detailed info
- Review console logs
- Verify package.json configuration
- Test in a fresh VS Code install

---

Happy Testing! 🧪🐦
