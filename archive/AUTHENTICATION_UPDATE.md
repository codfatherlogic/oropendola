# Oropendola AI Assistant - Authentication Update 🔐

## What's New in Version 1.1.0

We've completely redesigned the authentication experience! Instead of manually entering API keys, you now sign in with your **email and password** just like any modern application.

## 🆕 New Features

### Beautiful Login Experience
- **Modern UI**: Professional login screen with email/password fields
- **Instant Authentication**: Sign in once and stay logged in
- **Automatic Setup**: No need to manually configure API credentials
- **Create Account**: Quick link to create a new Oropendola account

### New Commands
- **"Oropendola: Sign In"** - Opens the login screen
- **"Oropendola: Sign Out"** - Logs you out securely

## 📸 Login Flow

1. **Open Sign In**
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
   - Type: `Oropendola: Sign In`
   - Login panel opens with beautiful UI

2. **Enter Credentials**
   - Email: Your Oropendola account email
   - Password: Your account password
   - Click "Sign In →"

3. **Auto-Connect**
   - Extension authenticates with Oropendola API
   - Credentials saved securely in VS Code
   - Chat panel opens automatically

4. **Start Chatting**
   - No additional setup needed!
   - AI assistant ready to help
   - Streaming responses work immediately

## 🚀 Quick Start

### First Time Users

1. **Install Extension**
   ```bash
   code --install-extension oropendola-ai-assistant-1.1.0.vsix
   ```

2. **Sign In**
   - Command Palette → `Oropendola: Sign In`
   - Enter your email and password
   - Click "Sign In"

3. **Start Coding**
   - Chat panel opens automatically
   - Select code and use "Explain", "Fix", "Improve"
   - Ask questions, get help, write better code!

### Don't Have an Account?

Click **"Create Account"** button in the login screen or visit:
👉 **https://oropendola.ai/signup**

## 🎯 Usage

### Open Chat
```
Command: Oropendola: Chat
Shortcut: (After sign in)
```

### Code Operations
Select code and use:
- **Explain Code** - Understand what code does
- **Fix Code** - Identify and fix bugs
- **Improve Code** - Get optimization suggestions
- **Review Code** - Best practices review

### Sign Out
```
Command: Oropendola: Sign Out
```

## 🔧 Technical Details

### Authentication Flow

```
User enters email/password
       ↓
Extension → POST /api/method/ai_assistant.api.login
       ↓
Receives: { token, api_key, api_secret }
       ↓
Saved to VS Code settings (encrypted)
       ↓
OropendolaProvider initialized with credentials
       ↓
Chat panel opens → Ready to use!
```

### Security

- **Encrypted Storage**: Credentials stored in VS Code's secure settings
- **Session Management**: Token-based authentication
- **No Plain Text**: Passwords never stored locally
- **Secure API**: All requests over HTTPS
- **Auto Logout**: Option to sign out anytime

### Settings

After login, these are automatically configured:
```json
{
  "oropendola.user.email": "your@email.com",
  "oropendola.user.token": "your-session-token",
  "oropendola.api.key": "auto-generated",
  "oropendola.api.secret": "auto-generated"
}
```

## 🆚 Before vs After

### Before (Manual Setup)
```
1. Get API key from website
2. Copy API key
3. Get API secret
4. Copy API secret
5. Run "Setup" command
6. Paste API key
7. Paste API secret
8. Hope it works 🤞
```

### After (Sign In)
```
1. Sign In with email/password
2. Done! ✅
```

## 🐛 Troubleshooting

### "Login failed" Error

**Causes:**
- Incorrect email or password
- Account not verified
- Network issues

**Solutions:**
- Double-check your credentials
- Check email for verification link
- Try resetting password at https://oropendola.ai/reset
- Check internet connection

### Chat Not Opening After Login

**Solutions:**
1. Wait a moment (initializing provider)
2. Try manually: `Oropendola: Chat`
3. Check Developer Tools console for errors
4. Sign out and sign in again

### Already Have API Credentials?

The old "Setup" command still works! But we recommend:
1. Sign out (if logged in)
2. Use "Sign In" with email/password
3. Let extension manage credentials automatically

## 📚 API Documentation

### Login Endpoint
```javascript
POST https://oropendola.ai/api/method/ai_assistant.api.login
Content-Type: application/json

{
  "usr": "user@example.com",
  "pwd": "password123"
}

Response:
{
  "message": {
    "token": "session-token",
    "api_key": "key",
    "api_secret": "secret",
    "full_name": "User Name"
  }
}
```

## 🔄 Migration Guide

### From v1.0.0 to v1.1.0

If you had API credentials configured:

**Option 1: Keep Using (Works)**
- Your existing setup continues to work
- No action needed

**Option 2: Switch to Sign In (Recommended)**
1. Run: `Oropendola: Sign Out`
2. Run: `Oropendola: Sign In`
3. Enter email/password
4. Enjoy new experience!

## 🎨 UI Features

### Login Screen
- **Modern Design**: Beautiful gradient background
- **Smooth Animations**: Slide-in effects
- **Form Validation**: Real-time error checking
- **Loading States**: Visual feedback during login
- **Error Messages**: Clear, helpful error text
- **Responsive**: Works on any screen size

### Chat Panel
- Same great features as before
- Opens automatically after login
- Context-aware AI assistance
- Real-time streaming responses

## 🌟 Benefits

### For Users
✅ Easier to get started
✅ No copying/pasting API keys
✅ Familiar email/password flow
✅ Automatic credential management
✅ Better security

### For Developers
✅ Cleaner authentication code
✅ Better error handling
✅ Session management built-in
✅ Easier debugging
✅ More maintainable

## 📝 Version History

### v1.1.0 (Current)
- ✨ New: Email/password authentication
- ✨ New: Beautiful login UI
- ✨ New: Auto-credential management
- ✨ New: Sign In/Sign Out commands
- ✨ New: Create Account button
- 🔧 Improved: Security and session handling
- 🔧 Improved: Error messages

### v1.0.0
- Initial release
- Manual API key setup
- Chat functionality
- Code operations

## 🤝 Support

### Need Help?
- 📧 Email: support@oropendola.ai
- 🌐 Website: https://oropendola.ai
- 📖 Docs: https://docs.oropendola.ai
- 💬 Discord: https://discord.gg/oropendola

### Found a Bug?
- Report on GitHub Issues
- Or email: bugs@oropendola.ai

## 🎉 Get Started Now!

```bash
# Install
code --install-extension oropendola-ai-assistant-1.1.0.vsix

# Sign In
1. Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows/Linux)
2. Type: "Oropendola: Sign In"
3. Enter email and password
4. Start coding!
```

---

**Made with ❤️ by the Oropendola team**

*Empowering developers with AI-powered coding assistance*
