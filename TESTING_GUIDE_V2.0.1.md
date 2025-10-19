# Testing & Installation Guide - v2.0.1

## 🎯 Quick Start

### Installation Steps
```bash
# 1. Navigate to extension directory
cd /Users/sammishthundiyil/oropendola

# 2. Verify no syntax errors
npm install  # Install/verify dependencies

# 3. Install extension
./install-extension.sh

# 4. Reload VSCode
# Command Palette (Cmd+Shift+P) > Developer: Reload Window
```

## 🧪 Test Scenarios

### Test 1: Offline Startup ✅ CRITICAL
**Purpose**: Verify graceful handling when network is unavailable

**Steps**:
1. Disconnect network (turn off WiFi)
2. Reload VSCode window
3. Wait 5 seconds

**Expected Results**:
- ✅ Status bar shows "⚠️ Oropendola: Offline"
- ✅ No error popups
- ✅ Console shows: "⚠️ Network check failed: getaddrinfo ENOTFOUND"
- ✅ Console shows: "⚠️ Network unavailable, skipping subscription check"
- ❌ NO console spam
- ❌ NO repeated retry attempts

**Acceptance Criteria**:
```
Console Output:
🐦 Oropendola AI Extension is now active!
✅ Sidebar provider registered
✅ AuthManager initialized
✅ Commands registered successfully
⚠️ Network check failed: getaddrinfo ENOTFOUND oropendola.ai
⚠️ Network unavailable, skipping subscription check

Status Bar: ⚠️ Oropendola: Offline
```

---

### Test 2: Network Recovery ✅ CRITICAL
**Purpose**: Verify successful reconnection after network restore

**Steps**:
1. Start with network disconnected (from Test 1)
2. Reconnect network (turn on WiFi)
3. Wait for network to stabilize (5s)
4. Click status bar "⚠️ Oropendola: Offline"

**Expected Results**:
- ✅ Subscription check succeeds
- ✅ Status bar updates to "🐦 Oropendola AI" or "🟢 N requests"
- ✅ Console shows: "🔍 Checking subscription (attempt 1/2)..."
- ✅ Console shows: "✅ Oropendola provider created"

**Acceptance Criteria**:
```
User Action: Click status bar
Console Output:
🔍 Checking subscription (attempt 1/2)...
✅ Subscription check successful
✅ Oropendola provider created

Status Bar: 🐦 Oropendola AI (or 🟢 N requests)
```

---

### Test 3: DNS Resolution Failure
**Purpose**: Verify handling of invalid domain

**Steps**:
1. Open VSCode Settings
2. Set `oropendola.api.url` to `https://invalid-domain-that-does-not-exist.com`
3. Reload VSCode window
4. Wait 5 seconds

**Expected Results**:
- ✅ Status bar shows "⚠️ Oropendola: Offline"
- ✅ Console shows DNS failure message
- ✅ No repeated retry attempts
- ✅ Extension remains functional

**Acceptance Criteria**:
```
Console Output:
⚠️ Network check failed: getaddrinfo ENOTFOUND invalid-domain-that-does-not-exist.com
⚠️ Network unavailable, skipping subscription check

Status Bar: ⚠️ Oropendola: Offline
```

**Cleanup**: Reset `oropendola.api.url` to `https://oropendola.ai`

---

### Test 4: Backend Timeout
**Purpose**: Verify timeout handling for unresponsive server

**Steps**:
1. Configure API URL to point to slow/unresponsive endpoint
2. Reload VSCode window
3. Observe retry behavior

**Expected Results**:
- ✅ First attempt times out after 5 seconds
- ✅ Retry after 1 second delay
- ✅ Second attempt times out after 5 seconds
- ✅ Retry after 2 second delay
- ✅ After max retries, enters offline mode
- ✅ Total time: ~13 seconds (3s delay + 5s + 1s + 5s)

**Acceptance Criteria**:
```
Timeline:
T+0s: Extension starts
T+3s: Network check begins
T+8s: First timeout (5s)
T+9s: Retry 1 starts (after 1s delay)
T+14s: Second timeout (5s)
T+16s: Retry 2 starts (after 2s delay)
T+21s: Final timeout
T+21s: Enter offline mode

Console Output:
🔍 Checking subscription (attempt 1/2)...
⏳ Network issue detected. Retrying in 1s... (attempt 1)
🔍 Checking subscription (attempt 2/2)...
⏳ Network issue detected. Retrying in 2s... (attempt 2)
⚠️ Cannot connect to Oropendola servers. Please check your network connection.

Status Bar: ⚠️ Oropendola: Offline
```

---

### Test 5: Successful Authenticated Startup
**Purpose**: Verify normal operation with good network

**Steps**:
1. Ensure network is connected
2. Ensure valid API credentials configured
3. Reload VSCode window
4. Wait 5 seconds

**Expected Results**:
- ✅ 3-second startup delay
- ✅ Network check passes
- ✅ Subscription check succeeds
- ✅ Status bar shows quota or active status
- ✅ Clean console output

**Acceptance Criteria**:
```
Console Output:
🐦 Oropendola AI Extension is now active!
✅ Sidebar provider registered
✅ AuthManager initialized
✅ Commands registered successfully
🔍 Checking subscription (attempt 1/2)...
✅ Subscription check successful
✅ Oropendola provider created

Status Bar: 🐦 Oropendola AI (or 🟢 N requests)
```

---

### Test 6: Manual Subscription Check
**Purpose**: Verify manual check command works

**Steps**:
1. With network connected
2. Click status bar OR press F7 (if configured)
3. OR run command: `Oropendola: Check Subscription`

**Expected Results**:
- ✅ Subscription info displayed in popup
- ✅ Console shows check attempt
- ✅ Status bar updates if needed

**Acceptance Criteria**:
```
Info Message:
📊 Subscription Status

Tier: [tier_name]
Remaining Requests: [number]
Total Requests: [number]
Expires: [date]
Status: ✅ Active
```

---

### Test 7: Login Flow with Network Check
**Purpose**: Verify login works with network validation

**Steps**:
1. Clear credentials (logout if logged in)
2. Press F2 or run `Oropendola: Sign In`
3. Complete login
4. Verify subscription check triggers

**Expected Results**:
- ✅ Login panel appears
- ✅ After successful login, network check runs
- ✅ Subscription check completes
- ✅ Status bar updates to active

---

### Test 8: Console Error Volume
**Purpose**: Verify reduced error spam

**Steps**:
1. Start with network disconnected
2. Open Developer Tools (Help > Toggle Developer Tools)
3. Go to Console tab
4. Reload window
5. Count error messages

**Expected Results**:
- ✅ Maximum 3-4 error lines
- ❌ NO infinite retry loops
- ❌ NO repeated "Network issue detected" messages (max 2)

**Before (v2.0.0)**:
```
Expected ~20-50 error lines
```

**After (v2.0.1)**:
```
Expected ~2-4 error lines
```

---

## 📊 Verification Checklist

### Code Quality
- [x] No syntax errors in JavaScript files
- [x] All modified files pass linting
- [x] Function signatures unchanged (backward compatible)
- [x] No breaking changes to API

### Functionality
- [ ] Test 1: Offline Startup ✅
- [ ] Test 2: Network Recovery ✅
- [ ] Test 3: DNS Failure ✅
- [ ] Test 4: Backend Timeout ✅
- [ ] Test 5: Normal Startup ✅
- [ ] Test 6: Manual Check ✅
- [ ] Test 7: Login Flow ✅
- [ ] Test 8: Console Volume ✅

### Documentation
- [x] NETWORK_ERROR_FIX_V2.0.1.md created
- [x] NETWORK_TROUBLESHOOTING.md created
- [x] NETWORK_FIX_SUMMARY.md created
- [x] NETWORK_FIX_VISUAL_GUIDE.md created
- [x] This testing guide created

### Version Control
- [x] Version bumped to 2.0.1 in package.json
- [ ] CHANGELOG.md updated (recommended)
- [ ] Git commit created
- [ ] Changes pushed to repository

## 🔧 Debug Tools

### View Extension Logs
```javascript
// In Developer Tools Console:
// Filter logs by Oropendola
console.log('🔍 Oropendola logs only')

// Or filter by emoji
🐦  // Extension start
✅  // Success messages
⚠️  // Warnings
❌  // Errors
```

### Inspect Network Requests
```javascript
// Developer Tools > Network Tab
// Filter: oropendola.ai
// Check:
- Request headers (Authorization)
- Response codes (200, 401, 402, 429, 503)
- Request timing (should be < 5s for subscription)
```

### Check Extension State
```javascript
// Command Palette
> Developer: Show Running Extensions

// Find: Oropendola AI Assistant
// Status should be: "Activated"
```

## 🐛 Common Issues During Testing

### Issue 1: Status Bar Not Updating
**Symptom**: Status bar stuck on old status  
**Fix**: 
```bash
# Completely reload extension
Command Palette > Developer: Reload Window
```

### Issue 2: Credentials Not Persisting
**Symptom**: Have to login every time  
**Check**:
```javascript
// VSCode Settings
"oropendola.api.key": "should_be_present"
"oropendola.api.secret": "should_be_present"
"oropendola.user.email": "should_be_present"
```

### Issue 3: Network Check Always Fails
**Symptom**: Always shows offline even with good network  
**Debug**:
```bash
# Test DNS manually
ping oropendola.ai

# Test API connectivity
curl -I https://oropendola.ai

# Check VSCode proxy settings
Settings > Search "proxy"
```

### Issue 4: External Errors Still Appearing
**Symptom**: GitHub Copilot errors in console  
**Note**: These are NOT from Oropendola
```
[GlobalSettingsService] Realtime subscription error: CLOSED
api.github.com/copilot_internal/user:1 Failed to load resource
```
**Action**: Ignore or disable GitHub Copilot extension

## 📈 Performance Metrics to Verify

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Startup delay (offline) | 3-4s | Time from reload to "Offline" status |
| Startup delay (online) | 8-10s | Time from reload to "Active" status |
| Console error count (offline) | < 5 lines | Count lines with ❌ or ⚠️ |
| Timeout per attempt | ~5s | Observe timing in console logs |
| Retry delay 1 | 1s | Time between attempt 1 and 2 |
| Retry delay 2 | 2s | Time between attempt 2 and 3 |
| Max retry attempts | 2 | Count "Checking subscription" logs |

## ✅ Sign-off Criteria

Before marking as complete, verify:
- [ ] All 8 test scenarios pass
- [ ] Console error volume reduced by >80%
- [ ] Status bar accurately reflects connection state
- [ ] Network recovery works reliably
- [ ] No regressions in normal operation
- [ ] Documentation complete and accurate
- [ ] Code quality checks pass

## 🚀 Post-Testing Actions

### If All Tests Pass
1. Update CHANGELOG.md
2. Create git commit:
   ```bash
   git add .
   git commit -m "v2.0.1: Network error handling improvements
   
   - Added network connectivity pre-flight checks
   - Implemented exponential backoff retry logic
   - Added 5-second timeout for subscription checks
   - Enhanced offline mode with graceful degradation
   - Improved error messages and status indicators
   - Reduced console error spam by 90%+"
   ```
3. Push to repository
4. Notify users of update

### If Tests Fail
1. Document failing scenario
2. Review error logs
3. Adjust implementation
4. Re-test
5. Repeat until all tests pass

## 📞 Support

**Issues During Testing**: sammish@Oropendola.ai  
**Documentation**: See /NETWORK_TROUBLESHOOTING.md  
**Architecture**: See /ARCHITECTURE.md

---

**Version**: 2.0.1  
**Testing Status**: ⏳ Ready for Testing  
**Last Updated**: 2025-10-19
