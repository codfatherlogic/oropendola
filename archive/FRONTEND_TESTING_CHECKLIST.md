# Frontend Testing Checklist - Backend API v2.0 Integration

**Status**: ✅ **READY FOR TESTING**
**Date**: 2025-10-22
**Backend**: https://oropendola.ai

---

## ✅ Pre-Test Setup

### 1. Get API Credentials

**Method 1: API Key/Secret (Recommended)**
1. Go to https://oropendola.ai
2. Sign in to your account
3. Navigate to: **User → API Access → Generate Keys**
4. Copy the API Key and API Secret
5. Add to VS Code settings:

```json
{
  "oropendola.api.url": "https://oropendola.ai",
  "oropendola.api.key": "YOUR_API_KEY_HERE",
  "oropendola.api.secret": "YOUR_API_SECRET_HERE"
}
```

**Method 2: Session Cookies (Alternative)**
- Already configured if you've logged in through the extension
- Cookie stored in: `oropendola.session.cookies`

### 2. Install/Update Extension

```bash
# In extension directory
npm install
npm run package

# Install the generated .vsix file
code --install-extension oropendola-ai-assistant-*.vsix
```

### 3. Reload VS Code
Press `Cmd+Shift+P` → `Developer: Reload Window`

---

## 🧪 Test Cases

### ✅ Test 1: Backend Connection

**Command**: `Oropendola: Test Backend Connection`

**Expected**:
```
✅ Backend Connection Successful!

Response: Backend is working!
Model: claude-3-5-sonnet-20241022
Provider: claude
Tokens: 45
Cost: $0.000135
```

**Status**: [ ] Pass [ ] Fail

**Notes**: _______________________

---

### ✅ Test 2: Model Selection

**Command**: `Oropendola: Select AI Model`

**Steps**:
1. Run command
2. Select "Auto (Recommended)"
3. Verify setting updated

**Expected**: Quick pick shows 6 models with descriptions

**Status**: [ ] Pass [ ] Fail

**Notes**: _______________________

---

### ✅ Test 3: Chat with Different Models

**Steps**:
1. Open chat panel (`Cmd+L` or `Oropendola: Chat`)
2. Change model via `Select AI Model`
3. Send message: "What is 2+2?"
4. Check console for model used

**Test Each Model**:
- [ ] Auto
- [ ] Claude
- [ ] DeepSeek
- [ ] Gemini
- [ ] GPT
- [ ] Local (if Ollama installed)

**Expected**: Response shows correct model in console

**Notes**: _______________________

---

### ✅ Test 4: Todo Extraction (Manual)

**Command**: `Oropendola: Extract Todos from Selection`

**Steps**:
1. Open a file or create new one
2. Type:
   ```
   We need to:
   1. Fix authentication bug
   2. Add unit tests
   3. Update documentation
   4. Deploy to production
   ```
3. Select the text
4. Run `Extract Todos from Selection`

**Expected**:
```
✅ Extracted 4 todo(s)!
Would you like to view the todos now? [Yes] [No]
```

**Status**: [ ] Pass [ ] Fail

**Notes**: _______________________

---

### ✅ Test 5: Todo Panel UI

**Command**: `Oropendola: Show Todos`

**Expected**:
- Panel opens in second column
- Shows statistics at top
- Groups todos by status (Open, Working, Completed)
- Shows priority badges (🔴 High, 🟡 Medium, 🟢 Low)
- Filter dropdowns work
- Refresh button works
- "Extract from Text" button works

**Actions to Test**:
- [ ] Click "Start" on an Open todo
- [ ] Click "Complete" on a Working todo
- [ ] Filter by status
- [ ] Filter by priority
- [ ] Click "Refresh"
- [ ] Click "Statistics"

**Status**: [ ] Pass [ ] Fail

**Notes**: _______________________

---

### ✅ Test 6: Auto Todo Extraction in Chat

**Steps**:
1. Configure setting:
   ```json
   {
     "oropendola.chat.enableTodoExtraction": true
   }
   ```
2. Open chat
3. Send: "Help me implement a login system. What steps should I take?"
4. Check if todos are automatically extracted

**Expected**:
- AI response contains action items
- Todos automatically appear in Todo Panel
- Console shows: "Extracted X todo(s)"

**Status**: [ ] Pass [ ] Fail

**Notes**: _______________________

---

### ✅ Test 7: Usage Analytics

**Command**: `Oropendola: Show Usage Analytics`

**Expected**:
```
📊 Usage Analytics (Last 30 Days)

Total Requests: 150
Total Tokens: 75,000
Total Cost: $2.45

By Provider:
• claude: 100 requests, $1.80
• deepseek: 50 requests, $0.65

Average Response Time: 1.2s
```

**Status**: [ ] Pass [ ] Fail

**Notes**: _______________________

---

### ✅ Test 8: Conversation History

**Command**: `Oropendola: Show Conversation History`

**Steps**:
1. Run command
2. Select a conversation from the list
3. View exported markdown

**Expected**:
- Quick pick shows recent conversations
- Shows message count and last update time
- Opens markdown document with full conversation
- Markdown includes all messages with timestamps

**Status**: [ ] Pass [ ] Fail

**Notes**: _______________________

---

### ✅ Test 9: Integration Tests

**Run Test Suite**:
```bash
# In extension directory
npm test
```

**Expected**:
```
Oropendola Backend API Integration Tests
  Authentication
    ✓ should authenticate with API Key/Secret
    ✓ should authenticate with Session Cookies
  Chat Modes
    ✓ should work in CHAT mode
    ✓ should work in CODE mode
    ✓ should work in AGENT mode
  Model Selection
    ✓ should use AUTO model selection
    ✓ should use specific model: Claude
  ... more tests

  52+ passing (45s)
```

**Status**: [ ] Pass [ ] Fail

**Notes**: _______________________

---

### ✅ Test 10: Cost Tracking in Chat

**Steps**:
1. Send message in chat
2. Check console output
3. Look for cost information

**Expected Console Output**:
```
✅ Received response from API
🤖 Model used: claude-3-5-sonnet-20241022 (Provider: claude)
📊 Token usage: { input_tokens: 45, output_tokens: 156, total_tokens: 201 }
💰 Cost: 0.000603
```

**Status**: [ ] Pass [ ] Fail

**Notes**: _______________________

---

### ✅ Test 11: Different Chat Modes

**Configure Mode**:
```json
{
  "oropendola.chat.mode": "chat"  // or "agent" or "code"
}
```

**Test Each Mode**:

**CHAT Mode** (simple Q&A):
- [ ] Send: "What is JavaScript?"
- [ ] Expected: Text response, no tool calls

**AGENT Mode** (with tools):
- [ ] Send: "Create a new file called test.txt with 'Hello World'"
- [ ] Expected: File created, tool execution visible

**CODE Mode** (optimized for code):
- [ ] Send: "Write a function to sort an array"
- [ ] Expected: Code-focused response, minimal explanation

**Status**: [ ] Pass [ ] Fail

**Notes**: _______________________

---

### ✅ Test 12: Error Handling

**Test Scenarios**:

**Invalid Credentials**:
1. Set wrong API key
2. Try to send message
3. Expected: Clear error message

**Network Error**:
1. Disconnect internet
2. Send message
3. Expected: Network error message

**Rate Limit** (if applicable):
1. Send many requests quickly
2. Expected: Rate limit error with retry info

**Status**: [ ] Pass [ ] Fail

**Notes**: _______________________

---

### ✅ Test 13: Response Format Validation

**Steps**:
1. Send any message
2. Check that response includes:
   - ✅ AI text response
   - ✅ Model name
   - ✅ Provider name
   - ✅ Token usage (input, output, total)
   - ✅ Cost (dollar amount)
   - ✅ Conversation ID

**Status**: [ ] Pass [ ] Fail

**Notes**: _______________________

---

### ✅ Test 14: Conversation Persistence

**Steps**:
1. Start a conversation in chat
2. Send 3-4 messages
3. Close chat panel
4. Reopen chat panel
5. Check if conversation continues

**Expected**: Previous messages visible, conversation ID preserved

**Status**: [ ] Pass [ ] Fail

**Notes**: _______________________

---

### ✅ Test 15: Service Caching

**Test Conversation Service Caching**:
1. Run `Show Conversation History`
2. Note the load time
3. Run again immediately
4. Second time should be faster (cached)

**Test Todo Service Caching**:
1. Open Todo Panel
2. Note load time
3. Refresh
4. Second load should be faster

**Status**: [ ] Pass [ ] Fail

**Notes**: _______________________

---

## 🔍 Debug Checklist

If tests fail, check:

### API Configuration
- [ ] API credentials are correct
- [ ] API URL is `https://oropendola.ai`
- [ ] No typos in settings keys

### Network
- [ ] Internet connection working
- [ ] Can access https://oropendola.ai in browser
- [ ] No firewall blocking requests
- [ ] No proxy issues

### Extension
- [ ] Extension is activated (check console)
- [ ] No JavaScript errors in console
- [ ] All dependencies installed (`npm install`)
- [ ] Extension reloaded after changes

### Backend
- [ ] Backend is online (check https://oropendola.ai)
- [ ] API key has proper permissions
- [ ] No rate limits hit
- [ ] Check backend error logs if available

---

## 📊 Test Results Summary

**Date Tested**: _______________________
**Tester**: _______________________

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | Backend Connection | [ ] | |
| 2 | Model Selection | [ ] | |
| 3 | Chat with Models | [ ] | |
| 4 | Todo Extraction | [ ] | |
| 5 | Todo Panel UI | [ ] | |
| 6 | Auto Todo Extraction | [ ] | |
| 7 | Usage Analytics | [ ] | |
| 8 | Conversation History | [ ] | |
| 9 | Integration Tests | [ ] | |
| 10 | Cost Tracking | [ ] | |
| 11 | Chat Modes | [ ] | |
| 12 | Error Handling | [ ] | |
| 13 | Response Format | [ ] | |
| 14 | Conversation Persistence | [ ] | |
| 15 | Service Caching | [ ] | |

**Overall Status**: [ ] All Pass [ ] Some Fail [ ] Major Issues

---

## 🐛 Known Issues

Document any issues found during testing:

### Issue 1:
**Description**: _______________________
**Severity**: [ ] Critical [ ] High [ ] Medium [ ] Low
**Reproducible**: [ ] Yes [ ] No
**Steps to Reproduce**: _______________________
**Expected**: _______________________
**Actual**: _______________________

### Issue 2:
**Description**: _______________________
**Severity**: [ ] Critical [ ] High [ ] Medium [ ] Low
**Reproducible**: [ ] Yes [ ] No
**Steps to Reproduce**: _______________________
**Expected**: _______________________
**Actual**: _______________________

---

## ✅ Sign-Off

**Frontend Status**: [ ] Ready for Production [ ] Needs Work [ ] Major Issues

**Tested By**: _______________________
**Date**: _______________________
**Signature**: _______________________

---

## 📞 Support

If you encounter issues:
1. Check [BACKEND_INTEGRATION_v2.0_COMPLETE.md](BACKEND_INTEGRATION_v2.0_COMPLETE.md) for troubleshooting
2. Run `Oropendola: Test Backend Connection` for diagnostics
3. Check VS Code Developer Console for errors
4. Review backend logs at https://oropendola.ai/app/error-log
5. Submit issue on GitHub with test results

---

**Document Version**: 1.0
**Last Updated**: 2025-10-22
**Compatible With**: Oropendola AI Extension v2.5.1+, Backend API v2.0
