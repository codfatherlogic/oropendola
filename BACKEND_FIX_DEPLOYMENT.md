# Backend Streaming Fix - Deployment Checklist

**Date**: October 27, 2025  
**Issue**: No reasoning indicator in VSCode extension  
**Root Cause**: `chat_completion()` endpoint uses non-streaming `gateway.generate()`  
**Fix**: Replace with `gateway.stream_generate()` + WebSocket emissions  

---

## Pre-Deployment Checklist

### ✅ Verification Complete
- [x] Root cause identified (`_generate_cloud_response()` uses non-streaming API)
- [x] Frontend confirmed ready (Socket ID: X1KqnBtBloUlhy8FAAAH)
- [x] Fix documented in `BACKEND_REASONING_STREAMING_GUIDE.md`
- [x] Expected behavior documented
- [x] Test procedures prepared

### ⏳ Implementation Required
- [ ] Backend developer reviews `BACKEND_REASONING_STREAMING_GUIDE.md` lines 20-150
- [ ] Code changes made to `ai_assistant/api/__init__.py` line ~275
- [ ] Local testing completed
- [ ] Code committed to version control

---

## Implementation Steps

### Step 1: Locate the Code

**File**: `ai_assistant/api/__init__.py`  
**Function**: `_generate_cloud_response()`  
**Line**: ~275  

```bash
cd ~/frappe-bench/apps/ai_assistant
grep -n "def _generate_cloud_response" ai_assistant/api/__init__.py
# Should show line number
```

### Step 2: Replace Non-Streaming Call

**Find this code**:
```python
result = gateway.generate(
    messages=messages,
    preferred_provider=provider,
    model=model,
    temperature=temperature,
    max_tokens=max_tokens
)
```

**Replace with streaming version** (see `BACKEND_REASONING_STREAMING_GUIDE.md` lines 50-130)

### Step 3: Add Required Imports

At top of function:
```python
from frappe.utils import now_datetime
```

### Step 4: Test Locally

```bash
# Start Frappe development server
cd ~/frappe-bench
bench start

# In another terminal, run test
curl -X POST http://localhost:8000/api/method/ai_assistant.api.chat_completion \
  -H 'Cookie: sid=YOUR_DEV_SESSION' \
  -H 'Content-Type: application/json' \
  -d '{
    "messages": [{"role": "user", "content": "Explain microservices"}],
    "mode": "agent"
  }'
```

**Expected Output in Logs**:
```
[WebSocket] 💭 REASONING emitted: 45 chars
[WebSocket] 💭 REASONING emitted: 62 chars
[WebSocket] 📝 TEXT emitted: 128 chars
[WebSocket] ✅ COMPLETION emitted
```

---

## Deployment Steps

### Step 1: Commit Changes

```bash
cd ~/frappe-bench/apps/ai_assistant
git add ai_assistant/api/__init__.py
git commit -m "feat: Add WebSocket reasoning streaming to chat_completion endpoint

- Replace gateway.generate() with gateway.stream_generate()
- Emit ai_progress events for reasoning chunks
- Emit ai_progress events for text chunks
- Add completion event after streaming finishes
- Fixes thinking indicator in VSCode extension"

git push origin main
```

### Step 2: Pull on Production

```bash
# SSH to production server
ssh oropendola-production

# Navigate to bench
cd ~/frappe-bench

# Pull latest code
bench update --apps ai_assistant

# Or if not using bench update:
cd apps/ai_assistant
git pull origin main
cd ~/frappe-bench
```

### Step 3: Restart Services

```bash
# Restart all bench services
bench restart

# Or restart specific services
supervisorctl restart frappe-bench:frappe-web
supervisorctl restart frappe-bench:frappe-socketio
supervisorctl restart frappe-bench:frappe-worker-short
supervisorctl restart frappe-bench:frappe-worker-long

# Verify services are running
supervisorctl status
```

**Expected Output**:
```
frappe-bench:frappe-web                RUNNING   pid 12345, uptime 0:00:05
frappe-bench:frappe-socketio           RUNNING   pid 12346, uptime 0:00:05
frappe-bench:frappe-worker-short       RUNNING   pid 12347, uptime 0:00:05
frappe-bench:frappe-worker-long        RUNNING   pid 12348, uptime 0:00:05
```

---

## Post-Deployment Testing

### Test 1: Check Backend Logs

```bash
# Monitor worker logs for WebSocket emissions
tail -f ~/frappe-bench/logs/worker.error.log | grep -i "websocket\|ai_progress"

# Expected output when AI request is made:
[2025-10-27 12:34:56] [WebSocket] 💭 REASONING emitted: 45 chars
[2025-10-27 12:34:57] [WebSocket] 💭 REASONING emitted: 62 chars
[2025-10-27 12:34:58] [WebSocket] 📝 TEXT emitted: 128 chars
[2025-10-27 12:35:00] [WebSocket] ✅ COMPLETION emitted
```

### Test 2: Check Socket.IO Server

```bash
# Verify Socket.IO server is accepting connections
supervisorctl status frappe-bench-node-socketio
# Should be: RUNNING

# Check Socket.IO logs
tail -f ~/frappe-bench/logs/socketio.log

# Expected: Connection logs from VSCode clients
```

### Test 3: Frontend Console Test

1. **Open VSCode extension**
2. **Open Browser DevTools** (F12)
3. **Go to Console tab**
4. **Send AI message**: "Design a REST API"
5. **Watch for logs**:

**Expected Console Output**:
```javascript
✅ [RealtimeManager] Connected to realtime server
🆔 [RealtimeManager] Socket ID: X1KqnBtBloUlhy8FAAAH
🔥🔥🔥 [RealtimeManager] ========== AI_PROGRESS EVENT RECEIVED ==========
📊 [RealtimeManager] Event type: reasoning
📊 [RealtimeManager] Full data: {"type":"reasoning","text":"Analyzing...","partial":true}
🔥🔥🔥 [RealtimeManager] ========== AI_PROGRESS EVENT RECEIVED ==========
📊 [RealtimeManager] Event type: reasoning
📊 [RealtimeManager] Full data: {"type":"reasoning","text":"Considering...","partial":true}
...
🔥🔥🔥 [RealtimeManager] ========== AI_PROGRESS EVENT RECEIVED ==========
📊 [RealtimeManager] Event type: completion
```

### Test 4: Visual UI Test

**Expected Behavior in VSCode**:

**T=0s**: User sends message  
**T=0.5s**: `💡 Thinking 0s` appears  
**T=1.5s**: `💡 Thinking 1s` (timer increments)  
**T=2.5s**: `💡 Thinking 2s`  
**T=3.0s**: Thinking indicator disappears  
**T=3.1s**: AI response text starts appearing  

---

## Success Criteria

### ✅ Backend Working
- [ ] Worker logs show WebSocket emissions
- [ ] Socket.IO server running and accepting connections
- [ ] No errors in `worker.error.log`

### ✅ Frontend Working
- [ ] Browser console shows `ai_progress` events
- [ ] Events have correct structure: `{type: 'reasoning', text: '...', partial: true}`
- [ ] Events include task_id

### ✅ UI Working
- [ ] Thinking indicator (`💡 Thinking Xs`) appears during AI generation
- [ ] Timer increments every second
- [ ] Reasoning text updates progressively
- [ ] Indicator disappears when AI finishes
- [ ] Final response displays correctly

---

## Rollback Procedure (If Needed)

If the fix causes issues:

### Step 1: Revert Code

```bash
cd ~/frappe-bench/apps/ai_assistant
git revert HEAD
git push origin main
```

### Step 2: Pull on Production

```bash
ssh oropendola-production
cd ~/frappe-bench/apps/ai_assistant
git pull origin main
```

### Step 3: Restart Services

```bash
bench restart
```

### Step 4: Verify Rollback

Test that chat still works (without thinking indicator)

---

## Monitoring

### Metrics to Watch

1. **WebSocket Connection Count**
   - Check: Number of active Socket.IO connections
   - Expected: Increases when users open VSCode extension

2. **Event Emission Rate**
   - Check: Number of `ai_progress` events per second
   - Expected: 5-20 events per AI request

3. **Error Rate**
   - Check: WebSocket emission errors in logs
   - Expected: 0 errors (or <1% if network issues)

4. **Response Time**
   - Check: Time from user message to first reasoning event
   - Expected: <500ms

### Alerting

Watch for these issues:

- ❌ Socket.IO server crashes
- ❌ High error rate in WebSocket emissions
- ❌ Slow event delivery (>1s delay)
- ❌ Memory leaks from unclosed connections

---

## Known Issues & Solutions

### Issue 1: Events Not Appearing

**Symptoms**: Backend logs show emissions, but frontend doesn't receive them

**Possible Causes**:
1. Socket.IO server not running
2. Firewall blocking WebSocket connections
3. Session cookie mismatch

**Solutions**:
```bash
# Check Socket.IO server
supervisorctl status frappe-bench-node-socketio

# Restart if needed
supervisorctl restart frappe-bench-node-socketio

# Check firewall (if applicable)
sudo ufw status
```

### Issue 2: High Latency

**Symptoms**: Events arrive 2-5 seconds late

**Possible Causes**:
1. `frappe.db.commit()` not called after each emit
2. Network latency
3. Server overload

**Solutions**:
```python
# Ensure commit is called
frappe.publish_realtime(...)
frappe.db.commit()  # CRITICAL!
```

### Issue 3: Memory Leaks

**Symptoms**: Memory usage grows over time

**Possible Causes**:
1. WebSocket connections not closed
2. Event listeners not cleaned up

**Solutions**:
```bash
# Monitor memory usage
watch -n 1 'ps aux | grep frappe'

# Restart workers if memory high
supervisorctl restart frappe-bench:frappe-worker-short
supervisorctl restart frappe-bench:frappe-worker-long
```

---

## Documentation Updates

After successful deployment:

- [ ] Update `CHANGELOG.md` with fix
- [ ] Update `README.md` if needed
- [ ] Mark "Fix backend reasoning streaming" TODO as complete
- [ ] Notify frontend team that fix is deployed

---

## Timeline

**Estimated Time**:
- Implementation: 10 minutes
- Local testing: 5 minutes
- Deployment: 5 minutes
- Post-deployment testing: 10 minutes
- **Total**: 30 minutes

**Scheduled Deployment**: As soon as ready (low-risk change)

---

## Contact

**Backend Developer**: [Your Name]  
**Frontend Developer**: [VSCode Extension Team]  
**DevOps**: [Server Admin]  

**Issue Tracking**: GitHub Issue #XXX or Jira Ticket

---

## References

- **Implementation Guide**: `BACKEND_REASONING_STREAMING_GUIDE.md`
- **Root Cause Analysis**: Lines 1-20 of implementation guide
- **Frontend Verification**: `WEBSOCKET_INTEGRATION_VERIFICATION.md`
- **Quick Test Guide**: `QUICK_TEST_GUIDE.md`

---

**Status**: Ready to Deploy  
**Risk Level**: Low (graceful degradation if WebSocket fails)  
**Impact**: High (major UX improvement)  

✅ **DEPLOY WHEN READY**
