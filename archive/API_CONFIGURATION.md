# Oropendola AI API Configuration

## 🌐 Base URL Configuration

All API requests to Oropendola AI services are directed to:

**Base URL**: `https://oropendola.ai`  
**Protocol**: HTTPS (HTTP Secure)  
**Port**: 443 (default HTTPS port)

## 📋 API Endpoints

The extension uses the following Frappe Framework endpoints:

### Authentication
- **Login**: `POST https://oropendola.ai/api/method/login`
- **Logout**: `POST https://oropendola.ai/api/method/logout`

### AI Assistant
- **Chat**: `POST https://oropendola.ai/api/method/ai_assistant.api.chat`
- **Conversation Management**: Various endpoints under `/api/method/ai_assistant.api.*`

### Subscription Management
- **Check Status**: `GET https://oropendola.ai/api/method/ai_assistant.subscription.get_status`
- **Usage Tracking**: Various endpoints under `/api/method/ai_assistant.subscription.*`

## ⚙️ Configuration

### VS Code Settings

The API URL is configurable via VS Code settings:

```json
{
  "oropendola.api.url": "https://oropendola.ai"
}
```

**Location**: Settings → Extensions → Oropendola AI → API URL

### Default Configuration

The extension automatically uses `https://oropendola.ai` if no custom URL is configured.

**File**: [`package.json`](file:///Users/sammishthundiyil/oropendola/package.json#L166-L170)
```json
"oropendola.api.url": {
  "type": "string",
  "default": "https://oropendola.ai",
  "description": "Oropendola API base URL (HTTPS on port 443)",
  "scope": "application"
}
```

## 🔒 Security

### HTTPS Configuration

All API communication uses HTTPS (TLS/SSL encrypted):
- **Protocol**: HTTPS (HTTP over TLS)
- **Port**: 443 (standard HTTPS port)
- **Encryption**: TLS 1.2+ required
- **Certificate**: Valid SSL certificate from trusted CA

### Request Security Features

1. **Session-based Authentication**: Uses Frappe Framework's session cookies
2. **HTTPS Encryption**: All data transmitted over secure connection
3. **Cookie Security**: Session cookies transmitted with secure flags
4. **CORS Protection**: Frappe framework handles CORS policies

### Headers Configuration

**Standard Request Headers**:
```javascript
{
  'Content-Type': 'application/json',
  'Cookie': sessionCookies,
  'Expect': '' // Disabled to prevent 417 errors
}
```

## 📁 Implementation Files

### Configuration Sources

All files use the same configuration pattern:

```javascript
const config = vscode.workspace.getConfiguration('oropendola');
const apiUrl = config.get('api.url', 'https://oropendola.ai');
```

### Files Using API Configuration

1. **[extension.js](file:///Users/sammishthundiyil/oropendola/extension.js#L175)**
   - Extension activation and initialization
   
2. **[src/core/ConversationTask.js](file:///Users/sammishthundiyil/oropendola/src/core/ConversationTask.js)**
   - AI chat requests with retry logic
   - Axios configuration with HTTPS
   
3. **[src/sidebar/sidebar-provider.js](file:///Users/sammishthundiyil/oropendola/src/sidebar/sidebar-provider.js)**
   - Login handling (line 135)
   - Subscription renewal (line 285)
   - File operations (line 342)
   - Chat message handling (line 622)
   - Feedback submission (line 1072)
   
4. **[src/sidebar/settings-provider.js](file:///Users/sammishthundiyil/oropendola/src/sidebar/settings-provider.js)**
   - Settings login (line 96)
   - Subscription checks (line 144)
   
5. **[src/auth/auth-manager.js](file:///Users/sammishthundiyil/oropendola/src/auth/auth-manager.js)**
   - Authentication flows (lines 442, 532)
   
6. **[src/ai/providers/oropendola-provider.js](file:///Users/sammishthundiyil/oropendola/src/ai/providers/oropendola-provider.js#L8)**
   - AI provider initialization

## 🔧 Axios Configuration

### HTTP 417 Fix Applied

To ensure compatibility with Frappe Framework, the Axios configuration includes:

```javascript
{
  headers: {
    'Content-Type': 'application/json',
    'Cookie': this.sessionCookies,
    'Expect': '' // ✅ Prevents HTTP 417 errors
  },
  timeout: 120000, // 2 minutes
  signal: this.abortController.signal,
  maxContentLength: Infinity,  // ✅ Allows large responses
  maxBodyLength: Infinity       // ✅ Allows large requests
}
```

**Reference**: [HTTP_417_FIX.md](file:///Users/sammishthundiyil/oropendola/HTTP_417_FIX.md)

## 🌍 Custom API URL

### When to Use Custom URL

You may want to configure a custom API URL for:
- **Development**: Testing against local Frappe instance
- **Staging**: Testing before production deployment
- **Self-hosted**: Running your own Oropendola AI instance

### Setting Custom URL

**Via VS Code Settings**:
1. Press `Cmd+,` (macOS) or `Ctrl+,` (Windows/Linux)
2. Search for "Oropendola API URL"
3. Enter custom URL (must include protocol: `https://your-domain.com`)

**Via settings.json**:
```json
{
  "oropendola.api.url": "https://your-custom-domain.com"
}
```

**Important**: Custom URLs must:
- Use HTTPS protocol (HTTP not recommended for security)
- Be a valid Frappe Framework instance
- Have the `ai_assistant` app installed
- Support Frappe's session-based authentication

## 📊 Network Requirements

### Outbound Connections

The extension requires outbound HTTPS access to:
- **Primary**: `oropendola.ai:443`
- **Fallback**: Custom URL if configured

### Firewall Rules

Ensure your firewall allows:
- **Protocol**: HTTPS (TCP)
- **Port**: 443
- **Direction**: Outbound
- **Destination**: `oropendola.ai` (or custom domain)

### Proxy Configuration

The extension respects VS Code's proxy settings:
- Configure via: Settings → Application → Proxy
- Supports HTTP/HTTPS proxies
- Honors `http.proxy` and `http.proxyStrictSSL` settings

## 🧪 Testing API Connectivity

### Manual Test

Test API connectivity from terminal:

```bash
# Test HTTPS connection
curl -v https://oropendola.ai/api/method/ping

# Test with authentication
curl -X POST https://oropendola.ai/api/method/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "usr=your-email@example.com&pwd=your-password"
```

### Extension Console Logs

Monitor API requests in VS Code Developer Console:
1. Press `Cmd+Option+I` (macOS) or `Ctrl+Shift+I` (Windows/Linux)
2. Go to "Console" tab
3. Look for logs like:
   ```
   📤 Making AI request (attempt 1/4)
   ✅ Task completed successfully
   ```

## 🐛 Troubleshooting

### Common Issues

**1. HTTP 417 Expectation Failed**
- **Cause**: Axios `Expect` header incompatibility
- **Fix**: Already applied in v2.0.0
- **Reference**: [HTTP_417_FIX.md](file:///Users/sammishthundiyil/oropendola/HTTP_417_FIX.md)

**2. Connection Timeout**
- **Cause**: Network connectivity issues
- **Solution**: Check firewall, proxy settings, internet connection
- **Retry**: Extension auto-retries with exponential backoff

**3. SSL Certificate Errors**
- **Cause**: Corporate proxy with SSL inspection
- **Solution**: Configure `http.proxyStrictSSL: false` (not recommended)
- **Better**: Add corporate CA certificate to system trust store

**4. Authentication Failures**
- **Cause**: Invalid credentials or expired session
- **Solution**: Re-login via Chat tab
- **Check**: Session cookies in settings

### Debug Mode

Enable detailed logging:

```javascript
// Add to VS Code settings.json
{
  "oropendola.debug.enabled": true,
  "oropendola.debug.logLevel": "verbose"
}
```

## 📚 Related Documentation

- **[HTTP_417_FIX.md](file:///Users/sammishthundiyil/oropendola/HTTP_417_FIX.md)** - HTTP 417 error fix details
- **[FULL_INTEGRATION_COMPLETE.md](file:///Users/sammishthundiyil/oropendola/FULL_INTEGRATION_COMPLETE.md)** - ConversationTask integration
- **[KILOCODE_ENHANCEMENTS_IMPLEMENTED.md](file:///Users/sammishthundiyil/oropendola/KILOCODE_ENHANCEMENTS_IMPLEMENTED.md)** - Task management patterns

## 🔐 Environment Variables

The extension does not use environment variables for API configuration. All configuration is managed through VS Code settings for security and portability.

**Not Used**:
- ❌ `OROPENDOLA_API_URL`
- ❌ `.env` files
- ❌ Hardcoded API keys

**Used Instead**:
- ✅ VS Code settings (`oropendola.api.url`)
- ✅ Secure storage for session cookies
- ✅ Configuration UI in Settings tab

## 📝 Best Practices

1. **Always use HTTPS**: Never configure HTTP URLs for production
2. **Keep defaults**: Use `https://oropendola.ai` unless you have a specific reason
3. **Monitor logs**: Check Developer Console for API errors
4. **Update regularly**: Keep extension updated for security fixes
5. **Secure storage**: Don't share session cookies or export settings

---

**Last Updated**: 2025-10-18  
**Extension Version**: 2.0.0  
**API Base URL**: `https://oropendola.ai:443`  
**Protocol**: HTTPS (TLS 1.2+)  
**Authentication**: Frappe session-based (cookies)
