# Quick Start: Test Reasoning Integration NOW

## ⚡ 5-Minute Verification

### Prerequisites
- ✅ Backend deployed (you confirmed this)
- ✅ VSCode with Oropendola extension installed
- ✅ Access to https://oropendola.ai

---

## Method 1: Test with Real AI Chat (RECOMMENDED)

### Step 1: Open Oropendola in VSCode
```
1. Open VSCode
2. Click Oropendola icon in sidebar
3. Sign in to oropendola.ai
```

### Step 2: Open Browser DevTools
```
1. Press F12 or Cmd+Option+I
2. Click "Console" tab
3. Keep this open
```

### Step 3: Send AI Message
```
In Oropendola chat, type:
"Design a REST API for user authentication"

Press Enter
```

### Step 4: Watch for Logs

**✅ SUCCESS INDICATORS:**

**In Browser Console:**
```javascript
🔥🔥🔥 [ConversationTask] ========== RECEIVED AI_PROGRESS ==========
📊 [ConversationTask task_123...] AI Progress [reasoning]: Analyzing...
🔥 [ConversationTask] Emitting aiProgress to sidebar...
```

**In VSCode Chat:**
```
💡 Thinking 1s
Analyzing the user request...

💡 Thinking 3s  
Analyzing the user request...
Considering REST principles...

💡 Thinking 5s
Analyzing the user request...
Considering REST principles...
Planning architecture layers...
```

**❌ If you don't see thinking indicator:**
- Check console for errors
- Look for `RECEIVED AI_PROGRESS` logs
- Verify WebSocket connected (look for Socket ID in logs)

---

## Method 2: Test with Browser Script (FRONTEND ONLY)

If you want to test the frontend UI without backend:

### Step 1: Load Test Script
```javascript
// Copy contents of test-reasoning-frontend.js
// Paste into browser console
```

### Step 2: Run Test
```javascript
testReasoningFrontend()
```

### Step 3: Watch Chat
You should see (if events propagate correctly):
```
💡 Thinking 0s
Analyzing the user request...

💡 Thinking 2s
Analyzing the user request...
Considering REST API principles...
```

**⚠️ Note:** This method only tests if the UI components render. It doesn't test the full WebSocket pipeline.

---

## Method 3: Test Backend Directly

### Get Your Session Cookie
```bash
# In browser DevTools, run:
document.cookie
# Copy the 'sid=...' value
```

### Call Test Endpoint
```bash
curl -X POST https://oropendola.ai/api/method/ai_assistant.api.oropendola.test_reasoning_stream \
  -H 'Cookie: sid=YOUR_SESSION_HERE' \
  -v
```

### Expected Response
```
✅ 200 OK
{
  "message": "Test reasoning events emitted",
  "task_id": "test_task",
  "events_sent": 5
}
```

### Watch Browser Console
While curl is running, browser console should show:
```
🔥 [RealtimeManager] ========== AI_PROGRESS EVENT RECEIVED ==========
📊 [RealtimeManager] Event type: reasoning
📊 [RealtimeManager] Full data: {"type":"reasoning","text":"Thinking step 1..."}
```

---

## Troubleshooting Quick Fixes

### Issue: No logs at all
```bash
# Check extension is running
# Look for Oropendola icon in VSCode activity bar
# Click it to activate
```

### Issue: Logs show "Socket not connected"
```bash
# Check backend services
supervisorctl status frappe-bench-node-socketio
# Should be: RUNNING

# If not:
supervisorctl restart frappe-bench-node-socketio
```

### Issue: Events in console but no UI
```javascript
// In browser console:
// 1. Check for React errors
// 2. Look for "ReasoningBlock" in Elements tab
// 3. Verify CSS isn't hiding component
```

### Issue: Timer stuck at 0s
```javascript
// Check console for:
// isStreaming: true
// isLast: true
// If both are true, timer should update
```

---

## What Should Work NOW

Based on your backend deployment announcement:

✅ **Backend**: frappe.publish_realtime() emitting ai_progress  
✅ **Frontend**: ReasoningBlock component ready  
✅ **Frontend**: ConversationTask listening for events  
✅ **Frontend**: ChatRow rendering reasoning messages  

**Expected Result**: Send AI message → See thinking indicator → See timer increment → See reasoning text

---

## Next Steps After Testing

### If Everything Works ✅
1. Update TODO: Mark "Fix backend reasoning streaming" as COMPLETE
2. Document results in verification guide
3. Test with multiple concurrent chats
4. Test collapse/expand functionality
5. Test on different models (GPT-4, Claude)

### If Issues Found ❌
1. Note specific error messages
2. Check which component is failing:
   - WebSocket connection?
   - Event reception?
   - UI rendering?
3. Follow troubleshooting in WEBSOCKET_INTEGRATION_VERIFICATION.md
4. Report specific failure point

---

## Success Checklist

- [ ] Browser console shows `RECEIVED AI_PROGRESS` logs
- [ ] VSCode shows `💡 Thinking` indicator
- [ ] Timer increments every second (1s, 2s, 3s...)
- [ ] Reasoning text updates progressively
- [ ] Indicator disappears when complete
- [ ] Final AI response displays

**If all checkboxes ✅ → Integration WORKS! 🎉**

---

## Quick Reference

**Start Test**: Send message in Oropendola chat  
**Check Logs**: Browser DevTools Console  
**Expected**: `💡 Thinking Xs` in VSCode  
**Docs**: WEBSOCKET_INTEGRATION_VERIFICATION.md (full details)
