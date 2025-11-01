# User API Integration Guide

## Overview

The Oropendola VS Code extension now supports direct integration with the User API, allowing users to manage their API keys and view subscription information directly from the extension.

## Features

### ✅ API Key Management
- **Get API Key**: Retrieve your API key (first time only - stored securely!)
- **View API Key Prefix**: See the first 8 characters of your key
- **Regenerate API Key**: Create a new key (revokes old one)

### 📊 Subscription Information
- **Plan Details**: View your current plan (Free, Pro, Enterprise)
- **Daily Quota**: See remaining daily requests
- **Monthly Budget**: Track your monthly usage
- **Subscription Status**: Check if subscription is active

### 🔐 Authentication
- **Session-Based**: Uses Frappe session cookies after login
- **Automatic**: No manual API key configuration needed
- **Secure**: Cookies stored in VS Code secure storage

---

## User Flow

```
1. User clicks "Sign In" button
   ↓
2. Enter email & password
   ↓
3. Extension stores session cookies
   ↓
4. Auto-fetches user profile (subscription + API key info)
   ↓
5. User can view/manage API key from sidebar
```

---

## API Endpoints Used

All endpoints are under:
```
https://oropendola.ai/api/method/oropendola_ai.oropendola_ai.api.user_api
```

### 1. Get My API Key
**Endpoint**: `.get_my_api_key`

**Frontend Message**:
```typescript
vscode.postMessage({ type: 'getMyAPIKey' });
```

**Response**:
```typescript
{
  type: 'apiKeyData',
  data: {
    success: true,
    api_key: "xyz789abc123..." | null,  // null if already retrieved
    api_key_prefix: "xyz789ab",
    subscription_id: "SUB-2025-00001",
    plan: "free",
    status: "Active",
    warning: "⚠️ Store it securely - it will not be shown again!",
    message: "API key already retrieved..." // if already shown
  }
}
```

### 2. Get My Subscription
**Endpoint**: `.get_my_subscription`

**Frontend Message**:
```typescript
vscode.postMessage({ type: 'getMySubscription' });
```

**Response**:
```typescript
{
  type: 'subscriptionData',
  data: {
    success: true,
    subscription: {
      id: "SUB-2025-00001",
      plan_id: "free",
      plan_title: "Free Plan",
      status: "Active",
      start_date: "2025-10-27",
      end_date: null,
      daily_quota: {
        limit: 100,
        remaining: 85
      },
      monthly_budget: {
        limit: 500,
        used: 120,
        remaining: 380
      }
    }
  }
}
```

### 3. Regenerate API Key
**Endpoint**: `.regenerate_api_key`

**Frontend Message**:
```typescript
vscode.postMessage({ type: 'regenerateAPIKey' });
```

**Confirmation**: Extension shows warning dialog before proceeding

**Response**:
```typescript
{
  type: 'apiKeyRegenerated',
  data: {
    success: true,
    api_key: "new_key_abc123...",
    api_key_prefix: "new_key_",
    warning: "⚠️ Store this securely!"
  }
}
```

### 4. Get User Profile (Combined)
**Frontend Message**:
```typescript
vscode.postMessage({ type: 'getUserProfile' });
```

**Response**: Combines subscription + API key info
```typescript
{
  type: 'userProfile',
  data: {
    success: true,
    subscription: { /* Subscription object */ },
    apiKey: {
      available: boolean,  // true if api_key is not null
      prefix: "xyz789ab",
      fullKey: "xyz789abc123..." | null,
      message: "API key already retrieved...",
      warning: "⚠️ Store it securely!"
    }
  }
}
```

---

## Implementation Details

### Backend (src/api/user-api-client.js)

```javascript
const userAPIClient = require('../api/user-api-client');

// Check authentication
userAPIClient.isAuthenticated(); // returns boolean

// Update session cookies after login
userAPIClient.updateSessionCookies({ sid: '...', full_name: '...' });

// Get API key
const apiKeyData = await userAPIClient.getMyAPIKey();

// Get subscription
const subData = await userAPIClient.getMySubscription();

// Regenerate API key
const newKeyData = await userAPIClient.regenerateAPIKey();

// Get complete profile
const profile = await userAPIClient.getUserProfile();
```

### Frontend (webview-ui/src)

**Sending Messages**:
```typescript
import { vscode } from './utilities/vscode';

// Get API key
vscode.postMessage({ type: 'getMyAPIKey' });

// Get subscription
vscode.postMessage({ type: 'getMySubscription' });

// Regenerate API key
vscode.postMessage({ type: 'regenerateAPIKey' });

// Get complete profile
vscode.postMessage({ type: 'getUserProfile' });
```

**Receiving Responses**:
```typescript
import { UserProfile } from './types/user-api';

window.addEventListener('message', (event) => {
  const message = event.data;
  
  switch (message.type) {
    case 'userProfile':
      const profile: UserProfile = message.data;
      console.log('Daily quota:', profile.subscription?.daily_quota.remaining);
      console.log('API key:', profile.apiKey?.fullKey || 'Already retrieved');
      break;
      
    case 'apiKeyData':
      const keyData = message.data;
      if (keyData.api_key) {
        // First time - store securely!
        navigator.clipboard.writeText(keyData.api_key);
        alert(keyData.warning);
      } else {
        alert(keyData.message); // Already retrieved
      }
      break;
      
    case 'subscriptionData':
      const sub = message.data.subscription;
      console.log(`${sub.daily_quota.remaining}/${sub.daily_quota.limit} requests remaining`);
      break;
  }
});
```

---

## Auto-Login Flow

After successful login, the extension automatically:

1. **Stores session cookies** → `sidebar-provider.js`
2. **Updates agent client** → Agent Mode uses session auth
3. **Updates user API client** → User API uses session auth
4. **Fetches user profile** → Shows subscription + API key info (500ms delay)

```javascript
// In _handleLogin()
this._isLoggedIn = true;
this._view.webview.html = this._getChatHtml(this._view.webview);

// Auto-fetch profile after 500ms
setTimeout(async () => {
  await this._handleGetUserProfile();
}, 500);
```

---

## UI Components (To Be Created)

### Subscription Info Card
Display in sidebar after login:

```tsx
<div className="subscription-card">
  <h3>📊 {subscription.plan_title}</h3>
  <div className="quota-bar">
    <span>{remaining}/{limit} requests today</span>
    <progress value={remaining} max={limit} />
  </div>
  <div className="budget-info">
    <span>Monthly: ${used}/${limit}</span>
  </div>
</div>
```

### API Key Management
Button group in settings:

```tsx
<div className="api-key-section">
  <button onClick={() => vscode.postMessage({ type: 'getMyAPIKey' })}>
    🔑 View API Key
  </button>
  <button onClick={() => vscode.postMessage({ type: 'regenerateAPIKey' })}>
    🔄 Regenerate Key
  </button>
</div>
```

### API Key Display Modal
Show when user clicks "View API Key":

```tsx
{apiKey && (
  <div className="api-key-modal">
    <h3>🔑 Your API Key</h3>
    {apiKey.fullKey ? (
      <>
        <code>{apiKey.fullKey}</code>
        <button onClick={() => navigator.clipboard.writeText(apiKey.fullKey!)}>
          📋 Copy
        </button>
        <p className="warning">{apiKey.warning}</p>
      </>
    ) : (
      <p>{apiKey.message}</p>
    )}
  </div>
)}
```

---

## Error Handling

### Not Authenticated
```typescript
{
  type: 'error',
  message: 'Not authenticated. Please sign in first.'
}
```

### No Subscription
```typescript
{
  type: 'error',
  message: 'No active subscription found. Please subscribe to a plan.'
}
```

### Request Failed
```typescript
{
  type: 'error',
  message: 'Request failed: <detailed error>'
}
```

---

## Testing

### Manual Test Flow

1. **Sign In**
   - Open Oropendola sidebar
   - Click "Sign In"
   - Enter credentials
   - Verify user profile auto-loads

2. **Get API Key**
   - Open DevTools console
   - Send: `vscode.postMessage({ type: 'getMyAPIKey' })`
   - Check response in console

3. **Get Subscription**
   - Send: `vscode.postMessage({ type: 'getMySubscription' })`
   - Verify daily quota shows

4. **Regenerate Key**
   - Send: `vscode.postMessage({ type: 'regenerateAPIKey' })`
   - Confirm warning dialog
   - Verify new key returned

### Automated Tests (TODO)

Create `test-user-api.js`:
```javascript
const userAPIClient = require('../src/api/user-api-client');

// Mock session cookies
userAPIClient.updateSessionCookies({
  sid: 'test_session_id',
  full_name: 'Test User'
});

// Test API key retrieval
userAPIClient.getMyAPIKey()
  .then(data => console.log('✅ API Key:', data))
  .catch(err => console.error('❌ Error:', err));

// Test subscription
userAPIClient.getMySubscription()
  .then(data => console.log('✅ Subscription:', data))
  .catch(err => console.error('❌ Error:', err));
```

---

## Security Considerations

### ✅ Best Practices Implemented

1. **Session Cookies Only**
   - No API keys stored in plaintext
   - Session cookies in VS Code secure storage
   - Automatic cleanup on logout

2. **API Key Warning**
   - Shows warning when key is first retrieved
   - Emphasizes secure storage
   - Cannot re-display full key after first view

3. **Regenerate Confirmation**
   - Modal confirmation before regeneration
   - Explains that old key will be revoked
   - Prevents accidental regeneration

4. **HTTPS Only**
   - All requests use HTTPS
   - Cookies marked secure
   - No credential leakage

### ⚠️ User Responsibilities

1. **Store API Key Securely**
   - Use password manager
   - Never commit to Git
   - Don't share via email/chat

2. **Regenerate If Compromised**
   - Immediately regenerate if leaked
   - Old key revoked instantly
   - Update all integrations

3. **Monitor Usage**
   - Check daily quota regularly
   - Review monthly budget
   - Watch for unusual activity

---

## Future Enhancements

### Phase 1 (Current)
- ✅ User API client created
- ✅ Backend handlers implemented
- ✅ Auto-fetch after login
- ✅ TypeScript types defined

### Phase 2 (Next Sprint)
- [ ] Subscription info card in sidebar
- [ ] API key management UI
- [ ] Copy-to-clipboard buttons
- [ ] Usage charts/graphs

### Phase 3 (Future)
- [ ] Upgrade plan from extension
- [ ] Payment integration
- [ ] Usage alerts/notifications
- [ ] Historical usage reports

---

## References

- **User API Documentation**: `USER_API_QUICK_REFERENCE.md`
- **Backend Implementation**: `src/api/user-api-client.js`
- **Message Handlers**: `src/sidebar/sidebar-provider.js`
- **TypeScript Types**: `webview-ui/src/types/user-api.ts`
- **Frappe Auth Guide**: `FRAPPE_USER_REFACTORING.md`

---

## Support

For issues or questions:
- **GitHub Issues**: https://github.com/your-repo/issues
- **Documentation**: https://oropendola.ai/docs
- **Email**: support@oropendola.ai

---

**Last Updated**: October 27, 2025  
**Version**: 3.7.2  
**Status**: ✅ Backend Complete, 🔄 UI Pending
