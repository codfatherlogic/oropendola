# Backend Connection Test

## Issue
The webview shows "Failed to fetch" errors even though CSP is fixed.

## CSP Status
✅ CSP correctly allows `https://oropendola.ai`
```
connect-src 'self' https://*.vscode-cdn.net https://oropendola.ai;
```

## Test Backend Endpoints

Run these commands to test if the backend is accessible:

### 1. Test Settings Endpoint (GET)
```bash
curl -v https://oropendola.ai/api/method/ai_assistant.api.oropendola.get_auto_approve_settings \
  -H "Cookie: sid=YOUR_SESSION_ID"
```

**Expected Response:**
```json
{
  "message": {
    "autoApprovalEnabled": false,
    "toggles": {
      "alwaysAllowReadOnly": true,
      ...
    }
  }
}
```

### 2. Test Chat Endpoint (POST)
```bash
curl -v https://oropendola.ai/api/method/ai_assistant.api.oropendola.chat \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Cookie: sid=YOUR_SESSION_ID" \
  -d '{"message": "Hello", "images": [], "session_id": null}'
```

**Expected Response:**
SSE stream with `data: {...}` lines

## Possible Issues

### 1. Backend Not Deployed
The backend endpoints might not be deployed yet. Check:
```bash
ssh frappe@oropendola.ai
cd frappe-bench/apps/ai_assistant
ls -la ai_assistant/api/oropendola.py
```

### 2. CORS Headers Missing
The backend needs to set CORS headers for the webview origin.

Add to the API responses:
```python
response.headers['Access-Control-Allow-Origin'] = '*'  # or specific origin
response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
```

### 3. Authentication Issue
The webview might not be sending cookies correctly.

Check if cookies are being sent:
- Open DevTools in VSCode webview
- Go to Network tab
- Look at the failed request
- Check if `Cookie` header is present

## Current Error
```
Failed to load auto-approval settings: TypeError: Failed to fetch
    at sx.getAutoApproveSettings (index.js:42:714)
```

This error means:
1. The fetch() call failed completely (network error)
2. NOT a 404 or 500 error (those would show different messages)
3. Could be CORS, connection refused, or DNS issue

## Quick Fix for Testing

To test the UI without backend, temporarily modify the API client to return mock data:

### Option 1: Use Local Mock Server
Create a simple mock server:
```javascript
// mock-server.js
const express = require('express');
const app = express();
app.use(express.json());

app.get('/api/method/ai_assistant.api.oropendola.get_auto_approve_settings', (req, res) => {
  res.json({
    message: {
      autoApprovalEnabled: false,
      toggles: {
        alwaysAllowReadOnly: true,
        alwaysAllowWrite: false,
        alwaysAllowExecute: false,
        alwaysAllowBrowser: false,
        alwaysAllowMcp: false,
        alwaysAllowModeSwitch: false,
        alwaysAllowSubtasks: false,
        alwaysApproveResubmit: false,
        alwaysAllowFollowupQuestions: false,
        alwaysAllowUpdateTodoList: false
      }
    }
  });
});

app.listen(3000, () => console.log('Mock server on http://localhost:3000'));
```

Then update API client to use `http://localhost:3000` for testing.

### Option 2: Add Mock Mode to API Client

In `/Users/sammishthundiyil/oropendola/webview-ui/src/api/client.ts`, add:

```typescript
const MOCK_MODE = true; // Set to false when backend is ready

export class OropendolaAPIClient {
  async getAutoApproveSettings() {
    if (MOCK_MODE) {
      return {
        autoApprovalEnabled: false,
        toggles: {
          alwaysAllowReadOnly: true,
          alwaysAllowWrite: false,
          // ... rest
        }
      };
    }
    // Real implementation
  }

  async *sendMessage(options) {
    if (MOCK_MODE) {
      yield {
        ts: Date.now(),
        type: 'say',
        say: 'text',
        text: 'This is a mock response for testing the UI'
      };
      return;
    }
    // Real implementation
  }
}
```

## Debugging Steps

1. **Check browser console in webview:**
   - Right-click in the webview
   - Select "Inspect Element"
   - Go to Console tab
   - Look for actual fetch error details

2. **Check Network tab:**
   - Go to Network tab in DevTools
   - Try to send a message
   - Look at the failed request
   - Check:
     - Request URL
     - Request Headers
     - Response (if any)
     - Error message

3. **Check backend logs:**
   ```bash
   ssh frappe@oropendola.ai
   tail -f frappe-bench/logs/web.error.log
   tail -f frappe-bench/logs/web.log
   ```

4. **Test backend directly:**
   ```bash
   curl -I https://oropendola.ai
   curl -I https://oropendola.ai/api/method/ai_assistant.api.oropendola.get_auto_approve_settings
   ```

## Next Steps

1. ✅ Frontend UI is correctly built with Roo-Code interface
2. ✅ CSP is correctly configured
3. ⏳ **Backend endpoints need to be verified/deployed**
4. ⏳ **CORS headers need to be configured**
5. ⏳ **Test connection from webview to backend**

Once the backend is accessible and CORS is configured, the "Failed to fetch" error should disappear and the Roo-Code UI should work properly.
