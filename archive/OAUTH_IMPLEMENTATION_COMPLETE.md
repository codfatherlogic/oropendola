# Oropendola AI VS Code Extension - OAuth Authentication

## ✅ Implementation Complete!

Full OAuth authentication flow implemented for VS Code extension with browser-based authentication.

---

## 🏗️ Architecture

### Authentication Flow

```
┌─────────────┐
│   VS Code   │
│  Extension  │
└──────┬──────┘
       │
       │ 1. Click "Sign In"
       │
       ▼
┌─────────────────────────────────────┐
│  POST /initiate_vscode_auth         │
│  Returns: auth_url, session_token   │
└──────┬──────────────────────────────┘
       │
       │ 2. Opens browser
       │
       ▼
┌─────────────────────────────────────┐
│  https://oropendola.ai/vscode-auth  │
│  ?token=SESSION_TOKEN               │
└──────┬──────────────────────────────┘
       │
       │ 3. User logs in (if needed)
       │ 4. Gets API key + subscription
       │ 5. Calls complete_vscode_auth
       │
       ▼
┌─────────────────────────────────────┐
│  Extension polls every 5 seconds:   │
│  POST /check_vscode_auth_status     │
│  Returns: pending/complete/expired  │
└──────┬──────────────────────────────┘
       │
       │ 6. When complete, returns:
       │    - API key
       │    - User email
       │    - Subscription info
       │
       ▼
┌─────────────────────────────────────┐
│  Extension stores API key in        │
│  VS Code Secrets (encrypted)        │
│  Updates agent client               │
└─────────────────────────────────────┘
```

---

## 📁 Files Created

### Backend Files

1. **`backend/vscode_extension.py`**
   - OAuth endpoints implementation
   - `initiate_vscode_auth()` - Start flow, return auth URL
   - `check_vscode_auth_status()` - Polling endpoint
   - `complete_vscode_auth()` - Mark authentication complete
   - `health_check()` - API health endpoint

2. **`backend/www/vscode-auth/index.html`**
   - Beautiful authentication page
   - Checks if user is logged in
   - Redirects to login if needed
   - Gets API key and subscription
   - Calls complete_vscode_auth
   - Shows success/error messages
   - Auto-closes after 5 seconds

3. **`backend/www/vscode-auth/index.py`**
   - Frappe page context handler
   - Validates session token from URL

### Extension Files

4. **`src/auth/AuthManager.js`**
   - OAuth flow manager
   - `initiate()` - Call backend API
   - `pollStatus()` - Poll every 5 seconds
   - `authenticate()` - Complete flow
   - `loadFromStorage()` - Load saved credentials
   - `logout()` - Clear authentication
   - Uses VS Code Secrets API for secure storage

5. **`src/sidebar/sidebar-provider.js`**
   - Updated to use AuthManager
   - Login handler calls OAuth flow
   - Sends auth status to webview
   - Updates agent client with API key

6. **`webview-ui/src/components/Chat/RooStyleTextArea.tsx`**
   - Simple "Sign in" button when not authenticated
   - Uses VS Code secondary button style
   - Sends login message to extension

7. **`webview-ui/src/components/Chat/ChatRow.tsx`**
   - Also has Sign in button for consistency

---

## 🚀 Deployment Instructions

### 1. Deploy Backend Files

Copy the backend files to your Frappe app:

```bash
# On your server (e.g., oropendola.ai)
cd /home/frappe/frappe-bench/apps/oropendola_ai

# Copy vscode_extension.py
cp backend/vscode_extension.py oropendola_ai/oropendola_ai/api/

# Create vscode-auth directory
mkdir -p oropendola_ai/www/vscode-auth

# Copy authentication page files
cp backend/www/vscode-auth/index.html oropendola_ai/www/vscode-auth/
cp backend/www/vscode-auth/index.py oropendola_ai/www/vscode-auth/
```

### 2. Clear Cache and Restart

```bash
cd /home/frappe/frappe-bench

# Clear cache
bench --site oropendola.ai clear-cache

# Restart bench
bench restart
```

### 3. Verify Endpoints

Test that the endpoints are accessible:

```bash
# Test health check
curl https://oropendola.ai/api/method/oropendola_ai.oropendola_ai.api.vscode_extension.health_check

# Should return:
# {"message": {"success": true, "status": "healthy", ...}}
```

### 4. Test Authentication Page

Visit the page in browser (will show error without token, which is expected):

```
https://oropendola.ai/vscode-auth
```

---

## 🧪 Testing the Full Flow

### From VS Code Extension

1. **Install extension** (`oropendola-oauth.vsix`)
2. **Reload VS Code**
3. **Open Oropendola sidebar**
4. **Click "Sign in" button**
5. **Dialog appears**: "Opening browser for authentication..."
6. **Click "Open Browser"**
7. **Browser opens** to authentication page
8. **If not logged in**: Redirects to login, then back
9. **Page shows**: Your subscription details
10. **Page shows**: "Authentication Successful!"
11. **VS Code shows**: "Successfully authenticated as [email]!"
12. **Extension ready**: Can now send messages

### Manual API Testing

```bash
# 1. Initiate authentication
curl -X POST https://oropendola.ai/api/method/oropendola_ai.oropendola_ai.api.vscode_extension.initiate_vscode_auth \
  -H "Content-Type: application/json"

# Response:
{
  "message": {
    "success": true,
    "auth_url": "https://oropendola.ai/vscode-auth?token=XXXXX",
    "session_token": "XXXXX",
    "expires_in": 600
  }
}

# 2. Open auth_url in browser, complete authentication

# 3. Poll status
curl -X POST https://oropendola.ai/api/method/oropendola_ai.oropendola_ai.api.vscode_extension.check_vscode_auth_status \
  -H "Content-Type: application/json" \
  -d '{"session_token": "XXXXX"}'

# When complete:
{
  "message": {
    "success": true,
    "status": "complete",
    "api_key": "oro_XXXXXXXX",
    "user_email": "user@example.com",
    "subscription": {...}
  }
}
```

---

## 🔒 Security Features

1. **Session Tokens**
   - Generated using `secrets.token_urlsafe(32)`
   - 32-byte cryptographically secure random tokens
   - Stored in Redis cache with 10-minute expiration
   - Automatically deleted after use

2. **API Key Storage**
   - Stored in VS Code Secrets API (encrypted)
   - Never logged or displayed in UI
   - Automatically cleared on logout
   - Not accessible to other extensions

3. **CSRF Protection**
   - All authenticated endpoints require CSRF token
   - Token obtained from Frappe session cookies
   - Validates user is actually logged in

4. **HTTPS Only**
   - All API calls use HTTPS/TLS
   - Session cookies marked as secure
   - No sensitive data in URLs (except session token)

---

## 📊 Storage Details

### Backend (Redis Cache)

```python
Key: "vscode_auth:{session_token}"
Value: {
    "status": "pending" | "complete" | "expired",
    "created_at": "ISO timestamp",
    "expires_at": "ISO timestamp",
    "api_key": "oro_...",  # when complete
    "user_email": "...",    # when complete
    "subscription": {...}   # when complete
}
TTL: 600 seconds (10 minutes)
```

### Extension (VS Code Secrets)

```javascript
Key: "oropendola_api_key"
Value: "oro_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
Storage: Encrypted by VS Code
```

### Extension (Global State)

```javascript
Key: "oropendola_user_email"
Value: "user@example.com"

Key: "oropendola_subscription"
Value: JSON string of subscription object
```

---

## 🔧 Configuration

No configuration needed! The extension automatically:

1. Uses `https://oropendola.ai` as backend URL
2. Polls every 5 seconds (customizable in AuthManager.js)
3. Times out after 10 minutes (matches backend)
4. Stores credentials securely
5. Updates agent client automatically

---

## 🐛 Troubleshooting

### "Authentication failed" Error

**Cause**: Backend endpoints not accessible  
**Solution**: 
1. Verify files copied to Frappe app
2. Clear cache: `bench --site oropendola.ai clear-cache`
3. Restart: `bench restart`
4. Test endpoint: `curl https://oropendola.ai/api/method/.../health_check`

### "Session expired" Message

**Cause**: User took longer than 10 minutes  
**Solution**: Click "Sign in" again to start fresh

### "No API key found" Error

**Cause**: User doesn't have API key generated  
**Solution**: 
1. Go to https://oropendola.ai/my-profile
2. Generate API key from dashboard
3. Try authentication again

### Browser Doesn't Open

**Cause**: VS Code can't open external URLs  
**Solution**: 
1. Copy auth URL from notification
2. Open manually in browser
3. Complete authentication
4. Extension will detect completion

### "Invalid authentication request"

**Cause**: Missing or invalid session token  
**Solution**: Extension issue - check browser console for errors

---

## 📈 Usage Statistics

After authentication, the extension can track:

- **API calls made**
- **Tokens consumed**
- **Cost per request**
- **Daily quota usage**
- **Subscription limits**

All tracked automatically by backend when API key is used.

---

## 🔄 Logout Flow

```javascript
// User clicks logout
await authManager.logout();

// Clears:
// - API key from Secrets
// - User email from Global State
// - Subscription from Global State
// - Updates agent client (apiKey = null)
// - Shows sign-in prompt in UI
```

---

## 🎯 Next Steps

1. ✅ **Backend deployed** - Copy files to server
2. ✅ **Cache cleared** - Restart Frappe
3. ✅ **Extension built** - Install `oropendola-oauth.vsix`
4. ✅ **Test flow** - Click Sign In and verify

### Optional Enhancements

- [ ] Add "Remember me" option (longer session)
- [ ] Show authentication status in status bar
- [ ] Add "Switch account" feature
- [ ] Display quota usage in UI
- [ ] Add notification when quota low
- [ ] Support multiple workspaces

---

## 📞 Support

**Issues?** Check:
1. Backend logs: `tail -f /home/frappe/frappe-bench/logs/bench-start.log`
2. Extension logs: VS Code Output → Oropendola AI
3. Browser console: F12 on auth page

**Email**: hello@oropendola.ai  
**Docs**: https://oropendola.ai/docs

---

## 📝 Summary

**✅ Complete OAuth Implementation**

- 🔐 Secure browser-based authentication
- 🎨 Beautiful authentication page
- 💾 Encrypted credential storage
- 🔄 Automatic polling and updates
- 🚀 Ready to deploy!

**Total Files**: 7 (3 backend + 4 extension)  
**Lines of Code**: ~800  
**Build Size**: 61.64 MB VSIX  
**Security**: Industry-standard OAuth flow

---

**Version**: 1.0.0  
**Last Updated**: October 28, 2025  
**Status**: ✅ Ready for Production
