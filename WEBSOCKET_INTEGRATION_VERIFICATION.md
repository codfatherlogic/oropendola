# WebSocket Reasoning Integration - Verification Guide

## 🎯 Status: Backend DEPLOYED ✅ | Frontend READY ✅ | Testing PENDING ⏳

**Date**: October 27, 2025  
**Backend Implementation**: COMPLETE  
**Frontend Components**: VERIFIED READY

---

## Backend Implementation Confirmed

### WebSocket Event Structure (MATCHES FRONTEND EXPECTATIONS ✅)

```python
# Backend emits via frappe.publish_realtime()
frappe.publish_realtime(
    event='ai_progress',
    message={
        'type': 'reasoning',        # ✅ Frontend checks: data.type === 'reasoning'
        'text': chunk_text,          # ✅ Frontend uses: message.text
        'partial': True,             # ✅ Frontend uses: isStreaming flag
        'task_id': task_id,          # ✅ Frontend uses for task association
        'timestamp': iso_timestamp   # Optional metadata
    },
    user=frappe.session.user         # ✅ Ensures user-specific delivery
)
frappe.db.commit()  # ✅ CRITICAL for real-time delivery
```

### Event Flow Verification

```
Backend (Frappe)
    ↓ frappe.publish_realtime('ai_progress', {...})
    ↓ frappe.db.commit()
    ↓
WebSocket Server (Socket.IO)
    ↓ Emits to connected clients
    ↓
Frontend (VSCode Extension)
    ↓ RealtimeManager receives 'ai_progress'
    ↓ ConversationTask.js forwards to webview
    ↓ ChatRow.tsx renders ReasoningBlock
    ↓ User sees: 💡 Thinking 3s
```

---

## Frontend Components Verified

### 1. RealtimeManager (src/core/RealtimeManager.js)
✅ Listens for `ai_progress` WebSocket events  
✅ Forwards to ConversationTask  
✅ Handles connection/disconnection gracefully

### 2. ConversationTask (src/core/ConversationTask.js)
```javascript
// Lines 153-162: AI Progress Handler
this.realtimeManager.on('ai_progress', data => {
    console.log('🔥 [ConversationTask] RECEIVED AI_PROGRESS:', data.type);
    
    // Emit to sidebar webview
    this.emit('aiProgress', this.taskId, data);
    
    // Update task status
    if (data.type === 'thinking' || data.type === 'reasoning') {
        this.status = 'thinking';
    }
});
```
✅ Enhanced logging already in place  
✅ Forwards `aiProgress` events to webview  
✅ Updates task status for reasoning

### 3. ChatRow Component (webview-ui/src/components/Chat/ChatRow.tsx)
```tsx
// Lines 112-123: Reasoning Message Rendering
if (isAssistant && message.say === 'reasoning') {
    return (
        <div className="chat-row chat-row-assistant">
            <ReasoningBlock
                content={message.text || ''}
                ts={message.ts}
                isStreaming={isStreaming}
                isLast={_isLast}
            />
        </div>
    )
}
```
✅ Checks for `message.say === 'reasoning'`  
✅ Renders ReasoningBlock component  
✅ Passes `isStreaming` flag for timer

### 4. ReasoningBlock Component (webview-ui/src/components/Chat/ReasoningBlock.tsx)
```tsx
// Lines 21-105: Complete Implementation
export const ReasoningBlock: React.FC<ReasoningBlockProps> = ({
    content,
    isStreaming,
    isLast,
}) => {
    const [elapsed, setElapsed] = useState<number>(0)
    const startTimeRef = useRef<number>(Date.now())
    
    // Timer updates every second during streaming
    useEffect(() => {
        if (isLast && isStreaming) {
            const tick = () => setElapsed(Date.now() - startTimeRef.current)
            const interval = setInterval(tick, 1000)
            return () => clearInterval(interval)
        }
    }, [isLast, isStreaming])
    
    return (
        <div>
            <Lightbulb icon />
            <span>Thinking</span>
            {elapsed > 0 && <span>{Math.floor(elapsed / 1000)}s</span>}
            <MarkdownBlock markdown={content} partial={isStreaming} />
        </div>
    )
}
```
✅ Live timer updates every second  
✅ Lightbulb icon (💡) displayed  
✅ Collapsible with ChevronUp toggle  
✅ Markdown rendering with streaming support

---

## Verification Steps

### Step 1: Check WebSocket Connection

**Open VS Code Developer Tools**: `Help > Toggle Developer Tools`

**Expected Console Logs**:
```
✅ [RealtimeManager] Connected to realtime server
🆔 [RealtimeManager] Socket ID: abcd1234...
🔥 [RealtimeManager] Socket connected: true
```

**If Missing**:
- Check backend WebSocket server is running: `supervisorctl status frappe-bench-node-socketio`
- Verify session cookie is valid
- Check firewall/proxy settings

---

### Step 2: Test Backend WebSocket Emission

**Method 1: Use Test Endpoint**

```bash
# Open terminal and run:
curl -X POST https://oropendola.ai/api/method/ai_assistant.api.oropendola.test_reasoning_stream \
  -H 'Cookie: sid=YOUR_SESSION_COOKIE'
```

**Expected Browser Console Output**:
```
🔥 [ConversationTask] RECEIVED AI_PROGRESS: reasoning
📊 AI Progress [reasoning]: Thinking step 1...
🔥 [ConversationTask] RECEIVED AI_PROGRESS: reasoning
📊 AI Progress [reasoning]: Thinking step 2...
...
🔥 [ConversationTask] RECEIVED AI_PROGRESS: completion
```

**Expected UI**:
```
┌─────────────────────────────┐
│ 💡 Thinking 0s              │
│ Thinking step 1...          │
└─────────────────────────────┘

(Timer updates to 1s, 2s, 3s...)

┌─────────────────────────────┐
│ 💡 Thinking 5s              │
│ Thinking step 5...          │
└─────────────────────────────┘
```

**Method 2: Real AI Chat**

1. Open Oropendola chat interface
2. Send message: "Design a scalable REST API architecture"
3. Watch for reasoning display

**Expected UI Flow**:
```
You:
Design a scalable REST API architecture

💡 Thinking 1s
Analyzing the requirements...

💡 Thinking 3s  
Analyzing the requirements...
Considering REST principles...

💡 Thinking 5s
Analyzing the requirements...
Considering REST principles...
Planning the architecture layers...

(Thinking indicator disappears, response appears)
Assistant response appears here...

---

### Step 3: Verify Message Structure

**Check WebSocket Message Format**

Open browser DevTools Network tab → Filter by "ws" (WebSocket) → Look for `ai_progress` events

**Expected Message Structure**:
```json
{
  "event": "ai_progress",
  "message": {
    "type": "reasoning",
    "text": "Analyzing the user request...",
    "partial": true,
    "task_id": "task_1730049600000",
    "timestamp": "2025-10-27T10:30:00.000000"
  }
}
```

**Frontend Processing**:
```javascript
// ConversationTask.js receives and logs:
console.log('🔥 [ConversationTask] RECEIVED AI_PROGRESS:', data.type)
// Output: 🔥 [ConversationTask] RECEIVED AI_PROGRESS: reasoning

console.log('�� AI Progress [reasoning]:', data.text)
// Output: 📊 AI Progress [reasoning]: Analyzing the user request...
```

---

## Troubleshooting

### Issue 1: No WebSocket Events Received

**Symptoms**:
- ✅ WebSocket connected
- ❌ No `ai_progress` events in console
- ❌ No thinking indicator appears

**Diagnosis**:
```bash
# 1. Check backend logs
tail -f ~/frappe-bench/logs/worker.error.log | grep "ai_progress"

# 2. Check Socket.IO server
supervisorctl status frappe-bench-node-socketio
# Should be: RUNNING

# 3. Test emission directly
curl -X POST https://oropendola.ai/api/method/ai_assistant.api.oropendola.test_reasoning_stream \
  -H 'Cookie: sid=YOUR_SESSION'
```

**Solutions**:
1. Restart Socket.IO server: `supervisorctl restart frappe-bench-node-socketio`
2. Check `frappe.db.commit()` is called after each emit (CRITICAL!)
3. Verify session cookie is valid and user is authenticated
4. Check firewall allows WebSocket connections (port varies)

---

### Issue 2: Events Received But No UI Update

**Symptoms**:
- ✅ Console shows `ai_progress` events
- ❌ No thinking indicator visible in chat

**Diagnosis**:
```javascript
// Check console for these logs:
// ✅ Should see: 🔥 [ConversationTask] RECEIVED AI_PROGRESS: reasoning
// ✅ Should see: 📊 AI Progress [reasoning]: ...
// ❌ If missing: Check RealtimeManager connection
```

**Solutions**:
1. Check `data.type` is exactly `'reasoning'` (case-sensitive)
2. Verify ChatRow is checking `message.say === 'reasoning'`
3. Ensure ReasoningBlock component is imported and rendered
4. Check CSS isn't hiding the component

**Verification Code**:
```javascript
// Add to ConversationTask.js line 156:
if (data.type === 'reasoning') {
    console.log('✅ REASONING DETECTED - Creating message:', {
        type: 'say',
        say: 'reasoning',
        text: data.text || data.message,
        partial: data.partial
    });
}
```

---

### Issue 3: Timer Not Updating

**Symptoms**:
- ✅ Reasoning block appears
- ✅ Content displays
- ❌ Timer stuck at "0s"

**Diagnosis**:
```javascript
// Check ReasoningBlock props:
console.log('ReasoningBlock props:', {
    isStreaming,  // Should be: true
    isLast,       // Should be: true
    content       // Should have text
});
```

**Solutions**:
1. Ensure `isStreaming={true}` is passed
2. Verify `isLast={true}` for the latest message
3. Check `useEffect` dependency array includes `[isLast, isStreaming]`
4. Ensure `partial: true` is in backend emission

---

### Issue 4: Multiple Thinking Indicators

**Symptoms**:
- Multiple "Thinking" blocks appear
- Duplicated reasoning text

**Causes**:
- Backend emitting duplicate events
- Frontend creating multiple messages

**Solutions**:
1. **Backend**: Ensure `frappe.db.commit()` isn't called multiple times per chunk
2. **Frontend**: Check message deduplication by `ts` (timestamp)
3. **Frontend**: Verify `partial: false` is sent for final chunk to close streaming

---

## Success Criteria

✅ **WebSocket Connected**: Console shows Socket ID  
✅ **Events Emitted**: Backend logs show `frappe.publish_realtime()`  
✅ **Events Received**: Frontend logs show `RECEIVED AI_PROGRESS`  
✅ **UI Displays**: 💡 Thinking indicator appears  
✅ **Timer Updates**: Timer increments every second  
✅ **Content Streams**: Reasoning text updates progressively  
✅ **Completion**: Indicator disappears when `partial: false`  

---

## Backend Code Reference

### Current Implementation (DEPLOYED)

```python
# ai_assistant/api/__init__.py (Lines ~500-550)
for chunk in stream:
    delta = chunk.choices[0].delta
    
    # REASONING CHUNKS
    if hasattr(delta, 'reasoning_content') and delta.reasoning_content:
        frappe.publish_realtime(
            event='ai_progress',
            message={
                'type': 'reasoning',
                'text': delta.reasoning_content,
                'partial': True,
                'task_id': task_id,
                'timestamp': now_datetime().isoformat()
            },
            user=frappe.session.user
        )
        frappe.db.commit()  # ⚠️ CRITICAL - DO NOT REMOVE
    
    # TEXT CHUNKS
    if hasattr(delta, 'content') and delta.content:
        frappe.publish_realtime(
            event='ai_progress',
            message={
                'type': 'text',
                'text': delta.content,
                'partial': True,
                'task_id': task_id
            },
            user=frappe.session.user
        )
        frappe.db.commit()

# COMPLETION
frappe.publish_realtime(
    event='ai_progress',
    message={
        'type': 'completion',
        'text': response_text,
        'reasoning': reasoning_text,
        'partial': False,
        'task_id': task_id
    },
    user=frappe.session.user
)
```

---

## Frontend Code Reference

### Message Flow

```
1. WebSocket receives event
   ↓
2. RealtimeManager.on('ai_progress')
   ↓
3. ConversationTask.emit('aiProgress')
   ↓
4. SidebarProvider creates message:
   {
     type: 'say',
     say: 'reasoning',  // ← KEY: This determines ChatRow rendering
     text: data.text,
     partial: data.partial,
     ts: Date.now()
   }
   ↓
5. ChatRow.tsx checks:
   if (message.say === 'reasoning')
   ↓
6. ReasoningBlock renders:
   - Lightbulb icon (💡)
   - "Thinking" label
   - Timer (updates every 1s)
   - Markdown content
```

---

## Expected Logs (Complete Example)

### Backend Logs
```
[INFO] Streaming chat completion started for task_1730049600000
[DEBUG] frappe.publish_realtime('ai_progress', {'type': 'reasoning', ...})
[DEBUG] frappe.db.commit() completed in 3ms
[DEBUG] frappe.publish_realtime('ai_progress', {'type': 'reasoning', ...})
[DEBUG] frappe.db.commit() completed in 2ms
...
[INFO] Streaming completed, sent 45 reasoning chunks, 230 text chunks
```

### Frontend Logs
```
✅ [RealtimeManager] Connected to realtime server
🆔 [RealtimeManager] Socket ID: XyZ123...
🔥 [ConversationTask] Setting up ai_progress listener...
🔥🔥🔥 [ConversationTask] ========== RECEIVED AI_PROGRESS FROM REALTIME MANAGER ==========
📊 [ConversationTask task_1730049600000] AI Progress [reasoning]: Analyzing the user request...
🔥 [ConversationTask] Full progress data: {"type":"reasoning","text":"Analyzing...","partial":true}
🔥 [ConversationTask] Emitting aiProgress to sidebar...
🔥 [ConversationTask] aiProgress emitted
🔥🔥🔥 [ConversationTask] ========== AI_PROGRESS FORWARDING COMPLETE ==========
...
🏁 [ConversationTask] Backend signaled complete, disconnecting WebSocket
```

---

## Performance Metrics (Expected)

- **WebSocket Latency**: 10-50ms per event
- **Emission Rate**: 20-50 chunks/second (backend)
- **UI Update Rate**: 1 FPS (timer), instant (text)
- **Memory Overhead**: ~5MB per active stream
- **Network Overhead**: ~100-500 bytes per chunk

---

## Related Documentation

- **Implementation Guide**: `BACKEND_REASONING_STREAMING_GUIDE.md`
- **Architecture Analysis**: `ROO_CODE_VS_OROPENDOLA_ANALYSIS.md`
- **Integration Analysis**: `ROO_CODE_INTEGRATION_ANALYSIS.md`

---

## Quick Reference Commands

```bash
# Test WebSocket emission
curl -X POST https://oropendola.ai/api/method/ai_assistant.api.oropendola.test_reasoning_stream \
  -H 'Cookie: sid=YOUR_SESSION'

# Check Socket.IO server
supervisorctl status frappe-bench-node-socketio

# Restart Socket.IO server
supervisorctl restart frappe-bench-node-socketio

# Monitor backend logs
tail -f ~/frappe-bench/logs/worker.error.log | grep "ai_progress"

# Check all services
supervisorctl status
```

---

**Status**: ✅ READY FOR TESTING  
**Next Step**: User verification in VSCode extension

