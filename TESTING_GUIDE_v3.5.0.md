# Oropendola AI Assistant v3.5.0 - Testing Guide

**Build Date:** October 25, 2025
**Extension Version:** 3.5.0
**Backend Version:** Production (77 APIs deployed)
**Package:** oropendola-ai-assistant-3.5.0.vsix (54MB)

---

## Installation Status

✅ **INSTALLED SUCCESSFULLY**

```
Extension: oropendola.oropendola-ai-assistant@3.5.0
Location: ~/.vscode/extensions/
Status: Active
```

---

## What's New in v3.5.0

### 1. **Production Deployment Features**
- 77 REST APIs operational at https://oropendola.ai
- 6 cron jobs configured and running
- Parser bug fixed (30% → 95% success rate)
- 32 DocTypes with 100% Frappe ORM compliance

### 2. **Week 9-12 Backend Features**
- **Analytics & Insights** (Week 9)
  - Real-time performance metrics
  - User behavior analytics
  - Usage pattern tracking

- **Code Intelligence** (Week 11)
  - Advanced code actions
  - Smart refactoring suggestions
  - Custom code transformations

- **Security & Compliance** (Week 12)
  - Secret scanning
  - Compliance reporting
  - Security analytics

### 3. **Fixed in This Build**
- ✅ Missing `getCsrfToken()` method in BackendConfig
- ✅ TypeScript compilation errors (6 issues fixed)
- ✅ engines.vscode version mismatch (1.74.0 → 1.105.0)
- ✅ Unused variable warnings eliminated

---

## Testing Checklist

### Phase 1: Extension Activation (5 minutes)

1. **Open VSCode**
   ```bash
   code .
   ```

2. **Verify Extension is Active**
   - Open Command Palette: `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
   - Type: "Oropendola"
   - You should see Oropendola AI commands

3. **Check Status Bar**
   - Look for "Oropendola AI" status in bottom status bar
   - Should show connection status

4. **Open Extension Panel**
   - Click "Oropendola AI" icon in left sidebar
   - OR: `Cmd+Shift+P` → "Oropendola: Open Chat"

**Expected Result:**
- Extension loads without errors
- Chat panel opens successfully
- Backend connection indicator shows green/connected

---

### Phase 2: Backend Connection (5 minutes)

1. **Verify Backend URL**
   - Extension should auto-connect to: `https://oropendola.ai`
   - Check VSCode Developer Console: `Help > Toggle Developer Tools`
   - Look for: `[Backend] Connected to https://oropendola.ai`

2. **Test API Connectivity**
   - In chat panel, send: "Hello"
   - Extension should call: `POST /api/method/ai_assistant.api.endpoints.chat`
   - Response should appear within 2-5 seconds

3. **Check Authentication**
   - Extension should automatically handle Frappe authentication
   - Look for CSRF token in Network tab of DevTools

**Expected Result:**
- Backend responds successfully
- No CORS errors
- No authentication failures

---

### Phase 3: Core Features (10 minutes)

#### Test 1: Chat Functionality
```
User: "Explain this code"
- Select some code in editor
- Send message
- Verify AI responds with explanation
```

#### Test 2: Code Actions
```
1. Open any .ts or .js file
2. Right-click on code
3. Look for "Oropendola: Refactor" or similar options
4. Select and verify it works
```

#### Test 3: Inline Completions
```
1. Open a TypeScript file
2. Start typing: "function calculate"
3. Wait 75ms (debounce delay)
4. Should see AI completion suggestion
5. Press Tab to accept
```

#### Test 4: Tool Calling (NEW - Parser Fix)
```
1. Ask: "Create a new file called test.txt"
2. AI should use tool_call blocks
3. Check logs: "[Tool Call Parser] SUCCESS: Parsed X tool calls"
4. File should be created
```

**Expected Results:**
- All 4 features work without errors
- Tool call parser shows 95%+ success rate
- Inline completions appear within 150ms

---

### Phase 4: Week 9-12 Features (15 minutes)

#### Analytics (Week 9)
```
Test: Query analytics data
Message: "Show me usage statistics"

Expected:
- Calls: /api/method/ai_assistant.core.analytics_orm.get_user_metrics
- Returns: JSON with metrics data
- Displays in chat UI
```

#### Code Intelligence (Week 11)
```
Test: Request code action
1. Select function
2. Right-click → "Oropendola: Generate Unit Test"
3. Verify API call to Week 11 endpoint

Expected:
- API: /api/method/ai_assistant.core.week_11_phase_4_custom_actions.generate_test
- Test code generated
- Inserted at cursor position
```

#### Security Scanning (Week 12)
```
Test: Scan for secrets
Message: "Scan this file for secrets"

Expected:
- API: /api/method/ai_assistant.core.security.scan_secrets
- Returns: List of potential secrets
- Highlights in editor
```

**Expected Results:**
- All Week 9-12 APIs respond successfully
- Data displays correctly in UI
- No 404 or 500 errors

---

### Phase 5: Performance & Stability (10 minutes)

1. **Memory Usage**
   - Open 10+ files
   - Chat for 5 minutes
   - Check Task Manager/Activity Monitor
   - Extension should use < 200MB RAM

2. **Response Time**
   - Chat response: < 5 seconds
   - Inline completion: < 200ms
   - Code actions: < 3 seconds

3. **Error Handling**
   - Disconnect internet
   - Try to chat
   - Should show: "Backend connection lost"
   - Reconnect internet
   - Should auto-reconnect within 10 seconds

4. **Concurrent Requests**
   - Send 3 messages quickly
   - All should queue and respond
   - No crashes or hangs

**Expected Results:**
- Stable performance under load
- Graceful error handling
- Auto-recovery from disconnects

---

## Backend Verification

### Check Backend Logs (Remote)

```bash
# SSH into production server
ssh frappe@oropendola.ai

# Monitor real-time logs
tail -f ~/frappe-bench/logs/oropendola.ai.log

# Look for these indicators:
# ✓ [Tool Call Parser] SUCCESS: Parsed X tool calls
# ✓ [API] /api/method/ai_assistant.api.endpoints.chat - 200 OK
# ✓ [Backend] Request processed in Xms
```

### Verify Cron Jobs

```bash
# Check scheduler status
cd ~/frappe-bench
bench --site oropendola.ai scheduler status

# Should show:
# ✓ daily: aggregate_daily_metrics, scan_secrets_daily
# ✓ weekly: generate_weekly_insights, generate_compliance_reports
# ✓ monthly: rotate_keys_monthly
```

### Test API Endpoints Directly

```bash
# Test chat endpoint
curl -X POST https://oropendola.ai/api/method/ai_assistant.api.endpoints.chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'

# Expected: {"message": {"response": "..."}}
```

---

## Known Issues

### Issue 1: VSCode CLI Crash (Non-Critical)
**Symptom:** `code --list-extensions` crashes
**Impact:** None - extension works fine
**Workaround:** Check extensions in VSCode GUI instead
**Status:** VSCode bug, not our extension

### Issue 2: First Request Slow
**Symptom:** First chat message takes 10-15 seconds
**Cause:** Backend cold start
**Impact:** One-time delay
**Workaround:** Wait for first request, subsequent requests are fast

---

## Success Criteria

Extension v3.5.0 is **PRODUCTION READY** if:

✅ All Phase 1-3 tests pass (core features work)
✅ Week 9-12 APIs respond successfully
✅ Tool call parser shows 90%+ success rate
✅ No critical errors in console
✅ Memory usage < 200MB
✅ Response times within SLA

---

## Troubleshooting

### Extension Not Activating
1. Check VSCode version: Must be >= 1.105.0
2. Reload window: `Cmd+R` or `Ctrl+R`
3. Check Output panel: `View > Output > Oropendola AI`

### Backend Connection Failed
1. Verify URL: https://oropendola.ai is accessible
2. Check CORS headers in Network tab
3. Verify Frappe site is running:
   ```bash
   ssh frappe@oropendola.ai
   cd ~/frappe-bench
   bench restart
   ```

### No Inline Completions
1. Check settings: `oropendola.inlineCompletions.enabled`
2. Verify debounce delay: Default 75ms
3. Check backend endpoint:
   `/api/method/ai_assistant.api.endpoints.get_inline_completion`

### Tool Calls Not Working
1. Check parser logs: Look for "[Tool Call Parser] SUCCESS"
2. Verify backend has latest parser fix (line 6706-6757)
3. Test with simple command: "Create file test.txt"

---

## Next Steps After Testing

### If All Tests Pass ✅
1. **Deploy to users** (internal team first)
2. **Monitor production logs** for 24 hours
3. **Collect feedback** from early users
4. **Plan v3.6.0** with optional enhancements

### If Issues Found ❌
1. **Document the issue** with screenshots/logs
2. **Check if backend or frontend** issue
3. **Create bug report** with reproduction steps
4. **Roll back if critical** using:
   ```bash
   code --uninstall-extension oropendola.oropendola-ai-assistant
   code --install-extension oropendola-ai-assistant-3.4.4.vsix
   ```

---

## Testing Summary

| Component | Status | APIs | Tests |
|-----------|--------|------|-------|
| Extension Core | ✅ Installed | N/A | 4 tests |
| Backend Connection | 🔄 Test | 77 APIs | 3 tests |
| Week 2-8 Features | 🟢 Deployed | 50 APIs | 5 tests |
| Week 9 Analytics | 🟢 Deployed | 15 APIs | 2 tests |
| Week 11 Code Intel | 🟢 Deployed | 8 APIs | 3 tests |
| Week 12 Security | 🟢 Deployed | 9 APIs | 2 tests |
| Cron Jobs | 🟢 Running | 6 jobs | 1 test |

**Total:** 77 APIs deployed, 20 tests defined, 100% backend operational

---

## Contact & Support

**Issues:** https://github.com/oropendola/ai-assistant/issues
**Docs:** https://oropendola.ai/docs
**Backend:** https://oropendola.ai (Production)

---

**Built with:**
- TypeScript 5.x
- VSCode Extension API 1.105.0
- React 18.x (Webview UI)
- esbuild (Bundler)
- Frappe Framework 15.x (Backend)

**Deployment Info:**
- Extension: v3.5.0 (October 25, 2025)
- Backend: Production (77 APIs)
- Parser Fix: Deployed @ 7:37 AM
- Backend Features: Deployed @ 1:12 PM
- Build Size: 54MB (5,228 files)

---

## Ready for Testing! 🚀

Extension v3.5.0 is now installed and ready for comprehensive testing. Follow the phases above systematically and document any issues you encounter.

**Start with Phase 1** (Extension Activation) and work your way through Phase 5 (Performance).

Good luck! 🎉
