# Accept/Reject Button Testing Guide

## Issue Reported
User experiencing functionality issues after clicking Accept/Reject buttons.

## Diagnostic Tests

### Test 1: Check Browser Console
1. Open VS Code Developer Tools (Cmd+Option+I / Ctrl+Shift+I)
2. Click Accept button
3. Look for errors in Console tab

**Expected Output:**
```
👍 Feedback: accept for message: Sure, I can help with that...
✅ Feedback sent to backend
```

**Or if backend unavailable:**
```
👍 Feedback: accept for message: Sure, I can help with that...
⚠️ Could not send feedback to backend: [error message]
```

**Problem Indicators:**
- ❌ JavaScript errors (undefined, null reference, etc.)
- ❌ "Uncaught ReferenceError"
- ❌ "Cannot read property of undefined"

---

### Test 2: Check Extension Host Console
1. Open Command Palette (Cmd+Shift+P)
2. Run: "Developer: Show Logs..."
3. Select "Extension Host"
4. Click Accept button
5. Look for logs

**Expected Output:**
```
👍 Feedback: accept for message: Sure, I can help...
✅ Feedback sent to backend
```

**Problem Indicators:**
- ❌ No logs appearing (handler not called)
- ❌ Errors in feedback handler
- ❌ Session cookie errors

---

### Test 3: Verify Button State After Click
**Steps:**
1. Send a message to AI
2. Wait for response
3. Click "👍 Accept" button
4. Observe button state

**Expected Behavior:**
- ✅ Button text changes to "✅ Accepted"
- ✅ Button turns green
- ✅ Button becomes disabled
- ✅ Reject button becomes grayed out (disabled)
- ✅ Toast notification appears

**Problem Indicators:**
- ❌ Buttons disappear
- ❌ Entire message disappears
- ❌ Chat input becomes unresponsive
- ❌ Send button stops working

---

### Test 4: Test Other Functionality After Accept
**After clicking Accept, test:**

1. **Send New Message**
   - Type a new message
   - Click Send ▶
   - Expected: New message sent successfully
   
2. **Paste Image**
   - Copy screenshot
   - Paste into input (Cmd+V)
   - Expected: Image preview appears
   
3. **Switch Mode**
   - Click Agent/Ask mode button
   - Expected: Mode switches
   
4. **Attach File**
   - Click 📎 button
   - Select file
   - Expected: File attached

**Problem Indicators:**
- ❌ Input field not accepting text
- ❌ Send button not responding
- ❌ No response from AI
- ❌ Mode switch not working

---

### Test 5: Check for Event Listener Issues

**Potential Issue:** The `handleAcceptReject` function might be preventing event propagation or breaking the event loop.

**Test:**
1. Send message
2. Click Accept
3. Try clicking anywhere in the chat
4. Try typing in input field

**Expected:**
- ✅ All interactions still work

**Problem Indicators:**
- ❌ Click events not working
- ❌ Keyboard input not working
- ❌ UI frozen/unresponsive

---

## Known Issues & Fixes

### Issue 1: Backend API Call Blocking UI

**Symptom:** UI freezes while sending feedback to backend

**Root Cause:** `await axios.post()` in feedback handler

**Current Code:**
```javascript
async _handleMessageFeedback(action, message) {
    try {
        // ... code ...
        if (this._sessionCookies && this._conversationId) {
            try {
                const axios = require('axios');
                await axios.post(...);  // ← This could block
                console.log('✅ Feedback sent to backend');
            } catch (err) {
                console.warn('⚠️ Could not send feedback to backend:', err.message);
            }
        }
        // ... rest of code ...
    }
}
```

**Status:** ✅ Should not block (async + try-catch)

---

### Issue 2: Message Object Corruption

**Symptom:** Passing large message object could cause memory issues

**Root Cause:** Entire message object passed to backend

**Current Code:**
```javascript
vscode.postMessage({
    type: 'messageFeedback',
    action: action,
    message: message  // ← Could be very large if message.content is long
});
```

**Potential Fix:** Only pass message ID or first 500 chars

---

### Issue 3: Button State Not Persisting

**Symptom:** Buttons reset when new message arrives

**Root Cause:** DOM re-render clearing button states

**Test:**
1. Click Accept on first message
2. Send new message
3. Check if first message still shows "Accepted"

**Expected:** ✅ Should persist
**If Not:** Need to store feedback state in message object

---

## Recommended Fixes

### Fix 1: Non-Blocking Backend Call

```javascript
async _handleMessageFeedback(action, message) {
    try {
        console.log(`👍 Feedback: ${action} for message:`, message.content.substring(0, 50));

        // Show user confirmation immediately (don't wait for backend)
        const emoji = action === 'accept' ? '✅' : '❌';
        const verb = action === 'accept' ? 'accepted' : 'rejected';
        vscode.window.showInformationMessage(`${emoji} You ${verb} this response`);

        // Send to backend asynchronously (don't await - fire and forget)
        const config = vscode.workspace.getConfiguration('oropendola');
        const apiUrl = config.get('api.url', 'https://oropendola.ai');

        if (this._sessionCookies && this._conversationId) {
            // Don't await - let it run in background
            this._sendFeedbackToBackend(apiUrl, action, message).catch(err => {
                console.warn('⚠️ Could not send feedback to backend:', err.message);
            });
        }

    } catch (error) {
        console.error('Feedback error:', error);
    }
}

async _sendFeedbackToBackend(apiUrl, action, message) {
    const axios = require('axios');
    await axios.post(
        `${apiUrl}/api/method/ai_assistant.api.message_feedback`,
        {
            conversation_id: this._conversationId,
            message_content: message.content.substring(0, 500), // Limit size
            feedback: action
        },
        {
            headers: {
                'Content-Type': 'application/json',
                'Cookie': this._sessionCookies
            },
            timeout: 5000 // 5 second timeout
        }
    );
    console.log('✅ Feedback sent to backend');
}
```

### Fix 2: Limit Message Size in Feedback

```javascript
function handleAcceptReject(message, action, acceptBtn, rejectBtn) {
    // ... existing button state code ...
    
    // Send minimal data to extension
    vscode.postMessage({
        type: 'messageFeedback',
        action: action,
        message: {
            content: message.content.substring(0, 500), // First 500 chars only
            role: message.role,
            timestamp: message.timestamp
        }
    });
}
```

### Fix 3: Add Timeout Protection

```javascript
async _handleMessageFeedback(action, message) {
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Feedback timeout')), 3000)
    );
    
    try {
        // Race between feedback and timeout
        await Promise.race([
            this._sendFeedbackToBackend(action, message),
            timeoutPromise
        ]);
        console.log('✅ Feedback sent successfully');
    } catch (error) {
        console.warn('⚠️ Feedback failed:', error.message);
        // Still show success to user - feedback is optional
    }
    
    // Always show confirmation
    const emoji = action === 'accept' ? '✅' : '❌';
    vscode.window.showInformationMessage(`${emoji} You ${action}ed this response`);
}
```

---

## Testing Checklist After Fix

- [ ] Click Accept → buttons update correctly
- [ ] Click Accept → toast notification appears
- [ ] Click Accept → can send new message
- [ ] Click Accept → can paste image
- [ ] Click Accept → can switch modes
- [ ] Click Reject → all above work
- [ ] Multiple Accept clicks on different messages
- [ ] Accept + Reject on different messages
- [ ] Check console - no errors
- [ ] Check network - backend called (if available)
- [ ] Reload VS Code - feedback state persists (if implemented)

---

## Debug Commands

### Check Current State
```javascript
// In browser console (webview)
console.log('Current messages:', messagesContainer.children.length);
console.log('Input disabled:', messageInput.disabled);
console.log('Send button visible:', sendButton.style.display);
```

### Manual Test
```javascript
// Simulate feedback without clicking
vscode.postMessage({
    type: 'messageFeedback',
    action: 'accept',
    message: { content: 'test', role: 'assistant' }
});
```

---

## Next Steps

1. **Gather Logs**: Check both consoles for errors
2. **Test Incrementally**: Test each function after Accept click
3. **Identify Root Cause**: Determine which function breaks
4. **Apply Fix**: Implement appropriate fix from above
5. **Rebuild & Test**: Create new build and verify
6. **Report Back**: Share console logs if issue persists
