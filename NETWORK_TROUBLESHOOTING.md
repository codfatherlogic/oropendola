# Network Error Troubleshooting Guide

## Quick Reference

### Common Errors and Solutions

#### ❌ `getaddrinfo ENOTFOUND oropendola.ai`
**What it means**: Cannot resolve the backend domain name  
**Solution**: 
1. Check internet connection
2. Verify DNS settings
3. Check firewall/proxy configuration
4. Extension will automatically enter offline mode

#### ⏳ `Network issue detected. Retrying...`
**What it means**: Temporary network problem, automatic retry in progress  
**Solution**: Wait for retry to complete (max 2 attempts with exponential backoff)

#### ⚠️ `Request timed out`
**What it means**: Backend server not responding within 5 seconds  
**Solution**:
1. Check backend server status
2. Verify API URL configuration
3. Extension enters offline mode automatically

#### 🔒 `Authentication failed`
**What it means**: API credentials invalid or expired  
**Solution**: Sign in again via Chat tab (F3)

## Status Bar Indicators

| Icon | Status | Action |
|------|--------|--------|
| 🔒 Oropendola: Sign In | Not logged in | Click or press F2 to login |
| 🐦 Oropendola AI | Connected & authenticated | Click to check subscription |
| ⚠️ Oropendola: Offline | Network unavailable | Click to retry connection |
| 🟢 Oropendola: N requests | Active with quota | Shows remaining requests |

## Network Connectivity Test

### Manual Test
```bash
# Test DNS resolution
ping oropendola.ai

# Test HTTPS connectivity
curl -I https://oropendola.ai

# Test API endpoint
curl -X GET https://oropendola.ai/api/method/ping
```

### From VSCode
1. Open Developer Tools: `Help > Toggle Developer Tools`
2. Check Console tab for network errors
3. Look for Oropendola-specific logs (prefixed with 🐦, ✅, ❌)

## Offline Mode Features

When network is unavailable, the extension:
- ✅ Displays offline status in status bar
- ✅ Prevents unnecessary retry attempts
- ✅ Allows retry via status bar click
- ✅ Maintains previous session data
- ❌ Cannot send new chat messages
- ❌ Cannot check subscription status
- ❌ Cannot refresh AI responses

## Recovery Steps

### Auto-Recovery
Extension automatically:
1. Detects network issues (DNS failure, timeout, connection refused)
2. Switches to offline mode
3. Waits for manual retry via status bar click

### Manual Recovery
1. Fix network connectivity
2. Click status bar "⚠️ Oropendola: Offline"
3. Extension attempts reconnection
4. If successful, status updates to "🐦 Oropendola AI"

## Advanced Configuration

### Custom API URL
```json
{
  "oropendola.api.url": "https://your-backend.com"
}
```

### Behind Corporate Proxy
VSCode inherits system proxy settings. To configure:
1. `File > Preferences > Settings`
2. Search for "proxy"
3. Set `http.proxy` and `http.proxyStrictSSL`

Example:
```json
{
  "http.proxy": "http://proxy.company.com:8080",
  "http.proxyStrictSSL": false
}
```

## External Extension Errors (Safe to Ignore)

These errors are **NOT** from Oropendola:

### GitHub Copilot Errors
```
[GlobalSettingsService] Realtime subscription error: CLOSED
api.github.com/copilot_internal/v2/token: Failed to load resource
```
**Source**: GitHub Copilot extension  
**Fix**: Check Copilot subscription or disable the extension

### Telemetry Errors
```
default.exp-tas.com/vscode/ab:1 Failed to load resource: ERR_INTERNET_DISCONNECTED
```
**Source**: VSCode telemetry  
**Fix**: Disable telemetry in VSCode settings or ignore

## Debugging Network Issues

### Enable Verbose Logging
1. Open VSCode Developer Tools: `Help > Toggle Developer Tools`
2. Go to Console tab
3. Filter by "Oropendola" or "🐦"

### Check Extension Logs
Look for these log patterns:
- `🔍 Checking subscription (attempt X/2)...` - Subscription check started
- `⏳ Network issue detected. Retrying...` - Retry in progress
- `⚠️ Network check failed:` - DNS resolution failed
- `✅ Authentication check passed` - Login successful

### Network Request Inspection
1. Developer Tools > Network tab
2. Filter: `oropendola.ai`
3. Check request status codes:
   - `200` = Success
   - `401` = Authentication failed
   - `402` = Subscription expired
   - `429` = Rate limited
   - `503` = Service unavailable

## Performance Tuning

### Adjust Timeouts (Advanced)
Edit `src/ai/providers/oropendola-provider.js`:
```javascript
// Subscription check timeout (default: 5000ms)
const timeout = 5000;

// Streaming request timeout (default: 60000ms)
timeout: 60000
```

### Reduce Retry Attempts
Edit `src/ai/providers/oropendola-provider.js`:
```javascript
// Maximum retry attempts (default: 2)
const maxRetries = 2;
```

## Support Checklist

Before contacting support, gather:
- [ ] Network connectivity status (`ping oropendola.ai`)
- [ ] VSCode version (`Help > About`)
- [ ] Extension version (Check `package.json` or Extensions view)
- [ ] Error messages from Developer Tools console
- [ ] API URL configuration
- [ ] Proxy/firewall configuration (if applicable)

Contact: sammish@Oropendola.ai
