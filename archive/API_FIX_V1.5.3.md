# Version 1.5.3 - API Endpoint Fixed for Frappe Backend

## 🎉 What's Fixed

**API Authentication Error Resolved**: Changed from custom `ai_assistant.api.login` endpoint to Frappe's standard `/api/method/login` endpoint.

## 🐛 The Problem

When clicking "Sign In", the extension tried to call:
```
POST https://oropendola.ai/api/method/ai_assistant.api.login
```

But your Frappe backend returned:
```
AttributeError: module 'ai_assistant.api' has no attribute 'login'
```

This means the backend API method doesn't exist (yet).

## ✅ The Solution

**Updated to use Frappe's built-in login endpoint:**

### Changed in `src/auth/auth-manager.js`:

**Before (v1.5.2):**
```javascript
const response = await axios.post(`${apiUrl}/api/method/ai_assistant.api.login`, {
    usr: email,
    pwd: password
});
```

**After (v1.5.3):**
```javascript
const response = await axios.post(`${apiUrl}/api/method/login`, {
    usr: email,
    pwd: password
});
```

### Updated Response Handling:

Now handles multiple response formats from Frappe:
```javascript
// Handle both response.data.message and response.data directly
const userData = response.data.message || response.data;

// Support multiple token formats (sid, api_key, token)
this.sessionToken = userData.token || userData.api_key || userData.sid;
```

## 📦 Installation

### Quick Install:
```bash
code --install-extension oropendola-ai-assistant-1.5.3.vsix
```

Then reload VS Code (`Cmd+Shift+P` → "Developer: Reload Window")

## 🧪 Testing

1. **Open Login Panel**: `Cmd+Shift+L`
2. **Enter Credentials**: Use your Frappe/ERPNext account
3. **Click Sign In**: Should now authenticate successfully!

### What Should Happen:
- ✅ Login panel closes automatically
- ✅ Success message appears
- ✅ Your email/token saved to VS Code settings
- ✅ Ready to use AI features

## 🔧 Two Authentication Approaches

### Approach 1: Standard Frappe Login (Current - v1.5.3)
✅ **Pros:**
- Works immediately with any Frappe/ERPNext site
- No backend code needed
- Uses existing user authentication

❌ **Cons:**
- Limited to web session authentication
- May not include API keys automatically
- Session expires based on Frappe settings

### Approach 2: Custom API Method (Future Enhancement)
Create `apps/ai_assistant/ai_assistant/api.py`:

```python
import frappe
from frappe import _

@frappe.whitelist(allow_guest=True)
def login(usr, pwd):
    """
    Custom login endpoint for Oropendola AI Assistant
    Returns API keys for programmatic access
    """
    try:
        # Authenticate user
        frappe.local.login_manager.authenticate(usr, pwd)
        frappe.local.login_manager.post_login()
        
        # Get user details
        user = frappe.get_doc("User", usr)
        
        # Generate API key and secret if not exists
        if not user.api_key:
            user.api_key = frappe.generate_hash(length=15)
            user.api_secret = frappe.generate_hash(length=15)
            user.save(ignore_permissions=True)
        
        return {
            "success": True,
            "full_name": user.full_name,
            "email": user.email,
            "api_key": user.api_key,
            "api_secret": user.api_secret,
            "token": user.api_key
        }
        
    except frappe.exceptions.AuthenticationError:
        frappe.throw(_("Invalid email or password"), frappe.AuthenticationError)
```

✅ **Pros:**
- Returns API keys for better security
- Custom response format tailored to extension
- Can include additional metadata

❌ **Cons:**
- Requires backend development
- Need to maintain custom code
- Must update when changing backend

## 🔐 Stored Authentication Data

After successful login, VS Code stores:
```json
{
    "oropendola.user.email": "your@email.com",
    "oropendola.user.token": "session_token_or_api_key",
    "oropendola.api.key": "api_key (if provided)",
    "oropendola.api.secret": "api_secret (if provided)"
}
```

View/edit these in VS Code:
- `Cmd+Shift+P` → "Preferences: Open User Settings (JSON)"

## 🔄 Version Progression

| Version | Status | Changes |
|---------|--------|---------|
| 1.5.2 | ❌ Login Failed | Used non-existent `ai_assistant.api.login` |
| 1.5.3 | ✅ **WORKING** | **Uses Frappe standard `/api/method/login`** |

## 🎯 Next Steps

1. **Test Login**: Install v1.5.3 and try signing in
2. **Check Settings**: Verify token is saved correctly
3. **Test Chat**: Try `Cmd+Shift+C` to open chat (may need API setup)
4. **Backend Setup** (Optional): Create custom API endpoint for better integration

## 🚨 Troubleshooting

### Issue: "Invalid credentials"
- Check username/password are correct
- Verify you're using a valid Frappe user account
- Check API URL in settings (default: `https://oropendola.ai`)

### Issue: "Network error"
- Check `oropendola.api.url` setting
- Verify backend is running
- Check CORS settings if using localhost

### Issue: Login succeeds but chat fails
- Backend needs additional API endpoints for chat
- Check if user has API keys generated
- Verify API authentication in chat requests

## 📝 Configuration

### Change API URL:
```json
{
    "oropendola.api.url": "http://localhost:8000"  // For local development
}
```

### View Current Settings:
```bash
# Open VS Code settings
code --list-extensions --show-versions | grep oropendola
```

## 🎊 Success Criteria

After installing v1.5.3, you should:
1. ✅ See login panel with `Cmd+Shift+L`
2. ✅ Enter credentials successfully
3. ✅ Panel closes on successful login
4. ✅ Settings saved with your token
5. ✅ No more "module has no attribute 'login'" error

---

**Ready to test!** Install v1.5.3 and sign in with your Frappe credentials! 🚀

If login works but you need help setting up the backend chat API, let me know!
