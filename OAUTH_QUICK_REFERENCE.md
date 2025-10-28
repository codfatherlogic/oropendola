# 🚀 OAuth Quick Reference

## Deploy Backend
```bash
./DEPLOY_OAUTH.sh
```

## Test Backend
```bash
./test-oauth-flow.sh
```

## Install Extension
```bash
code --install-extension oropendola-oauth.vsix
```

## File Locations

### Backend (on oropendola.ai server)
```
/home/frappe/frappe-bench/apps/oropendola_ai/
├── oropendola_ai/api/vscode_extension.py
└── www/vscode-auth/
    ├── index.html
    └── index.py
```

### Extension (local)
```
src/
├── auth/AuthManager.js
└── sidebar/sidebar-provider.js

webview-ui/src/components/Chat/
├── RooStyleTextArea.tsx
└── ChatRow.tsx
```

## API Endpoints

### Health Check
```bash
curl https://oropendola.ai/api/method/oropendola_ai.oropendola_ai.api.vscode_extension.health_check
```

### Initiate Auth
```bash
curl -X POST \
  https://oropendola.ai/api/method/oropendola_ai.oropendola_ai.api.vscode_extension.initiate_vscode_auth \
  -H "Content-Type: application/json"
```

### Check Status
```bash
curl -X POST \
  https://oropendola.ai/api/method/oropendola_ai.oropendola_ai.api.vscode_extension.check_vscode_auth_status \
  -H "Content-Type: application/json" \
  -d '{"session_token": "YOUR_TOKEN"}'
```

### Complete Auth (from browser)
```javascript
fetch('/api/method/oropendola_ai.oropendola_ai.api.vscode_extension.complete_vscode_auth', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Frappe-CSRF-Token': frappe.csrf_token
  },
  body: JSON.stringify({
    session_token: sessionToken,
    api_key: apiKey,
    user_email: userEmail,
    subscription: subscription
  })
});
```

## Web Page
```
https://oropendola.ai/vscode-auth?token=SESSION_TOKEN
```

## Logs

### Backend
```bash
ssh frappe@oropendola.ai
tail -f /home/frappe/frappe-bench/logs/bench-start.log
```

### Extension
```
VS Code → Output → Oropendola AI
```

### Browser Console
```
F12 → Console (on auth page)
```

## Common Commands

### Clear Cache
```bash
ssh frappe@oropendola.ai "cd /home/frappe/frappe-bench && bench --site oropendola.ai clear-cache"
```

### Restart Frappe
```bash
ssh frappe@oropendola.ai "cd /home/frappe/frappe-bench && bench restart"
```

### Rebuild Extension
```bash
npm run build && vsce package
```

### Reload VS Code
```
Cmd+Shift+P → "Developer: Reload Window"
```

## OAuth Flow States

### Session States (Backend Redis)
- **pending**: User hasn't completed auth yet
- **complete**: Auth successful, API key returned
- **expired**: 10 minutes passed without completion

### Extension States
- **Not Authenticated**: Shows "Sign in" button
- **Authenticating**: Shows "Authenticating..." message
- **Authenticated**: Chat input enabled, shows user email

## Troubleshooting

### Backend not responding
```bash
# Check if files exist
ssh frappe@oropendola.ai "ls -la /home/frappe/frappe-bench/apps/oropendola_ai/oropendola_ai/api/vscode_extension.py"

# Check logs
ssh frappe@oropendola.ai "tail -100 /home/frappe/frappe-bench/logs/bench-start.log"

# Restart
ssh frappe@oropendola.ai "cd /home/frappe/frappe-bench && bench restart"
```

### Extension not working
```bash
# Rebuild
npm run build

# Package
vsce package

# Install
code --install-extension oropendola-oauth.vsix --force

# Reload VS Code
# Cmd+Shift+P → "Developer: Reload Window"
```

### Browser not opening
Check VS Code notification tray for auth URL, copy and open manually.

### "No API key found"
Go to https://oropendola.ai/my-profile and generate an API key first.

## Security Notes

- Session tokens: 32-byte random, 10-minute expiry
- API keys: Stored in VS Code Secrets (encrypted)
- CSRF: Required on authenticated endpoints
- HTTPS: All communication uses TLS
- Redis: Auto-cleanup after 10 minutes

## Version Info

- **Extension Version**: 3.7.0
- **Backend API Version**: 1.0.0
- **Frappe Version**: 14+
- **Node Version**: 18+
- **VS Code Version**: 1.85+

## Support

- **Email**: hello@oropendola.ai
- **Docs**: https://oropendola.ai/docs
- **Full Guide**: OAUTH_IMPLEMENTATION_COMPLETE.md
