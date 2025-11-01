# Backend Authentication Issues - URGENT

## Issue Summary

The VS Code extension authentication flow is experiencing 403 (Forbidden) errors on critical authentication endpoints, preventing users from authenticating properly.

## Affected Endpoints

### 1. `/api/method/oropendola_ai.oropendola_ai.api.vscode_auth.initiate_auth` (GET)
- **Status**: INTERMITTENT 403 errors
- **Expected**: Should be publicly accessible (no authentication required)
- **Impact**: Prevents new authentication flows from starting

### 2. `/api/method/oropendola_ai.oropendola_ai.api.vscode_auth.check_auth_status` (GET)
- **Status**: CONSISTENT 403 errors
- **Expected**: Should be publicly accessible (no authentication required)
- **Impact**: Prevents extension from detecting completed browser logins
- **Critical**: This is the most severe issue - users complete login in browser but extension can't detect it

### 3. `/api/method/oropendola_ai.oropendola_ai.api.vscode_extension.agent` (POST) - **NEW**
- **Status**: CONSISTENT 403 errors (even with valid access token)
- **Expected**: Should accept authenticated requests with valid X-Access-Token header
- **Impact**: **CRITICAL** - Users cannot send messages to AI, extension is completely non-functional
- **Note**: Authentication works, but this endpoint rejects all requests

## Symptoms Observed

1. User clicks "Sign In" in VS Code extension
2. `initiate_auth` endpoint sometimes returns 403 (but sometimes works)
3. When it works, browser opens with login page
4. User successfully completes login in browser
5. Browser shows "Sign in success - Redirecting to your profile in 4 seconds"
6. **Extension polling fails** - `check_auth_status` returns 403
7. Extension never receives the access/refresh tokens
8. User is left in a "limbo" state

## Request Details

### Expected Request Headers
```http
GET /api/method/oropendola_ai.oropendola_ai.api.vscode_auth.initiate_auth HTTP/1.1
Host: oropendola.ai
Content-Type: application/json
User-Agent: Oropendola-VSCode-Extension/3.12.0
```

```http
GET /api/method/oropendola_ai.oropendola_ai.api.vscode_auth.check_auth_status?auth_request_id=76ae6234603004e95126 HTTP/1.1
Host: oropendola.ai
```

## Possible Root Causes

### 1. CORS Configuration
- **Check**: Are OPTIONS preflight requests being handled correctly?
- **Check**: Are the following headers set?
  - `Access-Control-Allow-Origin: *` (or specific VS Code origin)
  - `Access-Control-Allow-Methods: GET, POST, OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type, User-Agent, X-Access-Token`

### 2. Rate Limiting
- **Check**: Is there aggressive rate limiting on these endpoints?
- **Expected**: These endpoints should allow frequent polling (every 2 seconds for up to 5 minutes)
- **Fix**: Whitelist VS Code extension User-Agent or increase rate limits

### 3. WAF/Security Rules
- **Check**: Is Cloudflare, AWS WAF, or other security layer blocking these requests?
- **Check**: Are automated/bot detection rules too aggressive?
- **Fix**: Whitelist the User-Agent `Oropendola-VSCode-Extension/*`

### 4. IP-Based Restrictions
- **Check**: Are there IP whitelisting rules in place?
- **Expected**: These endpoints must be publicly accessible from any IP

### 5. Authentication Requirements
- **Check**: Are these endpoints accidentally requiring authentication?
- **Expected**: Both endpoints should be PUBLIC (no auth required)
  - `initiate_auth` creates a new auth request
  - `check_auth_status` checks if a request is completed

## Required Fixes

### Critical (Must Fix Immediately)
1. **Remove authentication requirement** from:
   - `vscode_auth.initiate_auth`
   - `vscode_auth.check_auth_status`

2. **Configure CORS properly**:
   ```python
   @frappe.whitelist(allow_guest=True, methods=["GET", "OPTIONS"])
   def initiate_auth():
       frappe.local.response["http_status_code"] = 200
       # Enable CORS
       frappe.local.response.headers.update({
           "Access-Control-Allow-Origin": "*",
           "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
           "Access-Control-Allow-Headers": "Content-Type, User-Agent"
       })
       # ... rest of implementation
   ```

3. **Increase rate limits** for these endpoints:
   - Allow at least 150 requests per 5 minutes
   - Allow burst of 1 request per 2 seconds

### Recommended (Best Practices)
1. Add logging to identify why 403 is being returned
2. Add monitoring/alerting for 403 errors on auth endpoints
3. Document API endpoint requirements and CORS settings

## Verification Steps

After fixes are deployed, verify:

1. **Test initiate_auth**:
   ```bash
   curl -v https://oropendola.ai/api/method/oropendola_ai.oropendola_ai.api.vscode_auth.initiate_auth \
     -H "Content-Type: application/json" \
     -H "User-Agent: Oropendola-VSCode-Extension/3.12.0"
   ```
   Expected: HTTP 200 with JSON response containing `auth_request_id` and `login_url`

2. **Test check_auth_status**:
   ```bash
   curl -v "https://oropendola.ai/api/method/oropendola_ai.oropendola_ai.api.vscode_auth.check_auth_status?auth_request_id=test123"
   ```
   Expected: HTTP 200 with JSON response (status: "pending" or "expired")

3. **Test CORS preflight**:
   ```bash
   curl -v -X OPTIONS https://oropendola.ai/api/method/oropendola_ai.oropendola_ai.api.vscode_auth.initiate_auth \
     -H "Origin: vscode-file://vscode-app" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type"
   ```
   Expected: HTTP 200 with Access-Control headers

4. **Test rapid polling**:
   ```bash
   for i in {1..10}; do
     curl -s "https://oropendola.ai/api/method/oropendola_ai.oropendola_ai.api.vscode_auth.check_auth_status?auth_request_id=test123"
     sleep 2
   done
   ```
   Expected: All requests return HTTP 200 (no rate limiting)

## Client-Side Workaround (Temporary)

The VS Code extension has been updated to:
- Fall back to cached credentials when authentication endpoints fail
- Show clear error messages indicating backend configuration issues
- Provide better logging for debugging

However, **this is not a solution** - the backend endpoints must be fixed for new users to authenticate.

## Contact

For questions or updates, please contact:
- Extension Developer: Sammish (sammish@oropendola.ai)
- Backend Team: backend@oropendola.ai

## Timeline

- **Issue Identified**: 2025-11-02
- **Severity**: CRITICAL - Blocking new user authentication
- **Required Fix Date**: ASAP (within 24 hours)

---

**Note**: Until these backend issues are resolved, only users who have previously authenticated successfully can use the extension (via cached credentials). New users cannot authenticate at all.
