# 🔧 Troubleshooting: "No AI response in server reply"

## What's Happening

Your VSCode extension logs show:
```
❌ AI request error (attempt 1): No AI response in server reply
```

This error occurs in [`ConversationTask.js:221`](src/core/ConversationTask.js#L221) when the backend doesn't return the expected response format.

---

## 🔍 Root Cause Analysis

### Frontend Expectation
The extension looks for the AI response in this order:

```javascript
const aiResponse = response.data?.message?.response ||  // Try this first
                  response.data?.message?.content ||   // Then this
                  response.data?.message?.text;        // Finally this

if (!aiResponse) {
    throw new Error('No AI response in server reply');  // ← YOUR ERROR
}
```

### What's Wrong
Your backend at `https://oropendola.ai/api/method/ai_assistant.api.chat` is:

1. ❌ **Not implemented** - Endpoint doesn't exist
2. ❌ **Wrong format** - Returns data but not as `{response: "text"}`
3. ❌ **AI call failing** - Backend exists but AI model call crashes

---

## ✅ Quick Diagnosis

### Test 1: Check if Endpoint Exists

```bash
# Replace YOUR_SESSION_ID with your actual session cookie
curl -X POST https://oropendola.ai/api/method/ai_assistant.api.chat \
  -H "Content-Type: application/json" \
  -H "Cookie: sid=YOUR_SESSION_ID" \
  -d '{"messages":[{"role":"user","content":"test"}]}' \
  -v
```

**Expected responses:**

✅ **Working (200 OK):**
```json
{
  "message": {
    "success": true,
    "response": "AI response text here",
    "conversation_id": "abc123"
  }
}
```

❌ **Not Implemented (500):**
```json
{
  "exception": "AttributeError: module 'ai_assistant.api' has no attribute 'chat'"
}
```

❌ **Wrong Format (200 but no 'response'):**
```json
{
  "message": {
    "success": true,
    "text": "..."  // ← Wrong key, should be 'response'
  }
}
```

### Test 2: Get Your Session ID

**From Browser Console:**
```javascript
// Open https://oropendola.ai in browser
// Press F12 or Cmd+Option+I
// Console tab:
document.cookie.split(';').find(c => c.includes('sid'))
// Copy the value after 'sid='
```

**Or from VSCode:**
```javascript
// In VSCode Extension Host console:
// Look for logs like:
"🔍 Session Cookies: sid=XXXXX; ..."
```

### Test 3: Check Backend Logs

SSH into your server:
```bash
ssh user@oropendola.ai

# Watch real-time logs
tail -f ~/frappe-bench/sites/*/logs/web.log
tail -f ~/frappe-bench/sites/*/logs/error.log
```

Then try sending a message in VSCode. Watch for:
- ✅ Request received by backend
- ❌ Python errors/exceptions
- ❌ Missing module errors

---

## 🛠️ Solutions by Scenario

### Scenario 1: Endpoint Doesn't Exist

**Symptom:**
```
AttributeError: module 'ai_assistant.api' has no attribute 'chat'
```

**Solution:**
1. Deploy the backend code (see [`DEPLOYMENT_INSTRUCTIONS.md`](DEPLOYMENT_INSTRUCTIONS.md))
2. Create `~/frappe-bench/apps/ai_assistant/ai_assistant/api.py`
3. Add the `chat()` function
4. Run `bench restart`

### Scenario 2: OpenAI Library Missing

**Symptom:**
```
ImportError: No module named 'openai'
```

**Solution:**
```bash
cd ~/frappe-bench
bench pip install openai
bench restart
```

### Scenario 3: API Key Not Configured

**Symptom:**
```
Exception: OpenAI API key not configured
```

**Solution:**
```bash
cd ~/frappe-bench/sites/your-site/
nano site_config.json

# Add:
{
  "openai_api_key": "sk-..."
}

# Save and restart
bench restart
```

### Scenario 4: Wrong Response Format

**Symptom:**
- Backend returns 200 OK
- But frontend still says "No AI response"

**Check backend return value:**
```python
# ✅ CORRECT:
return {
    'success': True,
    'response': ai_text,  # ← Must be 'response'
    'conversation_id': conv_id
}

# ❌ WRONG:
return {
    'success': True,
    'text': ai_text,      # ← Wrong key
    'conversation_id': conv_id
}

# ❌ WRONG:
return {
    'success': True,
    'content': ai_text,   # ← Wrong key (unless as fallback)
    'conversation_id': conv_id
}
```

### Scenario 5: Frappe Wrapping Issue

Frappe automatically wraps returns in a `message` key:

```python
# Your code returns:
return {'success': True, 'response': 'Hello'}

# Frappe sends to client:
{
  "message": {
    "success": true,
    "response": "Hello"
  }
}
```

This is normal and expected. The frontend handles it.

---

## 🎯 Step-by-Step Resolution

### Step 1: Verify Backend Exists
```bash
ssh user@oropendola.ai
ls ~/frappe-bench/apps/ai_assistant/ai_assistant/api.py
```

If file doesn't exist → Deploy it (see DEPLOYMENT_INSTRUCTIONS.md)

### Step 2: Check File Content
```bash
nano ~/frappe-bench/apps/ai_assistant/ai_assistant/api.py

# Look for:
@frappe.whitelist(allow_guest=False)
def chat(messages=None, ...):
```

If function doesn't exist → Add it

### Step 3: Test Backend Directly
```bash
# From your server:
cd ~/frappe-bench
bench console

# In Python console:
>>> import ai_assistant.api
>>> ai_assistant.api.chat
<function chat at 0x...>  # ← Should show function

# If error:
>>> AttributeError: module 'ai_assistant.api' has no attribute 'chat'
# → Function not defined
```

### Step 4: Test API Call
```python
# Still in bench console:
>>> from ai_assistant.api import chat
>>> result = chat(
...     messages=[{"role": "user", "content": "test"}],
...     mode="ask"
... )
>>> print(result)
# Should print: {'success': True, 'response': '...', 'conversation_id': '...'}
```

If this works → Backend is fine, check frontend cookies

### Step 5: Check Authentication
```bash
# Test with session cookie:
curl -X POST https://oropendola.ai/api/method/ai_assistant.api.chat \
  -H "Content-Type: application/json" \
  -H "Cookie: sid=YOUR_SID_HERE" \
  -d '{"messages":[{"role":"user","content":"test"}]}'
```

If 403/401 → Cookie expired or invalid

### Step 6: Restart Everything
```bash
# On server:
bench restart

# In VSCode:
Cmd+Shift+P → "Developer: Reload Window"
```

---

## 🔍 Advanced Debugging

### Enable Detailed Logging

**In your backend `api.py`:**
```python
@frappe.whitelist(allow_guest=False)
def chat(messages=None, message=None, **kwargs):
    frappe.logger().info("=" * 50)
    frappe.logger().info("CHAT API CALLED")
    frappe.logger().info(f"messages type: {type(messages)}")
    frappe.logger().info(f"messages value: {messages}")
    frappe.logger().info(f"kwargs: {kwargs}")
    frappe.logger().info("=" * 50)
    
    # ... rest of your code
    
    result = {
        'success': True,
        'response': 'Test response',
        'conversation_id': 'test123'
    }
    
    frappe.logger().info("=" * 50)
    frappe.logger().info("RETURNING:")
    frappe.logger().info(f"{result}")
    frappe.logger().info("=" * 50)
    
    return result
```

Then watch logs:
```bash
tail -f ~/frappe-bench/sites/*/logs/web.log | grep "CHAT API"
```

### Check Frontend Request

**In ConversationTask.js, add logging before line 170:**
```javascript
console.log('🔍 API Request:', {
    url: `${this.apiUrl}/api/method/ai_assistant.api.chat`,
    data: {
        messages: apiMessages,
        conversation_id: this.conversationId,
        mode: this.mode
    },
    headers: {
        'Content-Type': 'application/json',
        'Cookie': this.sessionCookies
    }
});

const response = await axios({...});

console.log('🔍 API Response:', response.data);
```

Then check VSCode's Extension Host console:
1. Cmd+Shift+P
2. "Developer: Show Logs"
3. Select "Extension Host"

---

## 📋 Diagnostic Checklist

Run through this checklist:

- [ ] Backend file exists: `~/frappe-bench/apps/ai_assistant/ai_assistant/api.py`
- [ ] File contains `chat()` function with `@frappe.whitelist()` decorator
- [ ] OpenAI installed: `bench pip list | grep openai`
- [ ] API key configured in `site_config.json`
- [ ] Frappe restarted after changes: `bench restart`
- [ ] Can access endpoint via curl (with valid session)
- [ ] Logs show request received by backend
- [ ] Backend returns `{success: True, response: '...'}`
- [ ] Frontend receives response (check console)
- [ ] No CORS errors in browser console

---

## 🚨 Emergency Bypass (Temporary Test)

To test if the issue is backend or frontend, temporarily modify the frontend to use a mock response:

**In `src/core/ConversationTask.js` around line 170:**
```javascript
// TEMPORARY TEST - REMOVE AFTER DEBUGGING
if (process.env.MOCK_API) {
    console.log('🧪 Using mock response for testing');
    
    const mockResponse = {
        data: {
            message: {
                success: true,
                response: "This is a mock response for testing. If you see this, the frontend is working correctly. The issue is in the backend API.",
                conversation_id: "mock-123"
            }
        }
    };
    
    // Skip to response handling
    const aiResponse = mockResponse.data.message.response;
    this.addMessage('assistant', aiResponse);
    return aiResponse;
}
```

Then in VSCode terminal:
```bash
export MOCK_API=true
# Restart extension
```

If mock works → Backend issue
If mock fails → Frontend issue

---

## 📞 Still Stuck?

Provide these details:

1. **Backend test result:**
   ```bash
   curl -X POST ... | jq .
   ```

2. **Backend logs:**
   ```bash
   tail -50 ~/frappe-bench/sites/*/logs/web.log
   tail -50 ~/frappe-bench/sites/*/logs/error.log
   ```

3. **Frontend console output:**
   - Extension Host logs
   - Browser DevTools console

4. **File verification:**
   ```bash
   ls -la ~/frappe-bench/apps/ai_assistant/ai_assistant/api.py
   head -20 ~/frappe-bench/apps/ai_assistant/ai_assistant/api.py
   ```

This will help identify the exact issue.
