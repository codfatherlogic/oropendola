# 🎓 Backend API Structure - Learning Summary

Based on: https://github.com/codfatherlogic/ai_assistant

## 📋 **Authentication System Overview**

### **Current Implementation: Token-Based Auth**

The backend uses **Frappe's API key/secret authentication** with two approaches:

#### 1. **Login Flow** (Initial Authentication)
```python
# Endpoint: POST /api/method/ai_assistant.api.session_login
# Alternative: POST /api/method/ai_assistant.api.generate_api_token

@frappe.whitelist(allow_guest=True)
def session_login(usr: str, pwd: str):
    """
    User logs in with username/password
    Returns: api_key + api_secret stored in User document
    """
    from frappe.auth import LoginManager
    
    login_manager = LoginManager()
    login_manager.authenticate(usr, pwd)
    login_manager.post_login()
    
    user_doc = frappe.get_doc("User", usr)
    
    # Auto-generate API credentials if not exists
    if not user_doc.api_key:
        user_doc.api_key = frappe.generate_hash(length=15)
        user_doc.api_secret = frappe.generate_hash(length=15)
        user_doc.save(ignore_permissions=True)
    
    return {
        "success": True,
        "api_key": user_doc.api_key,
        "api_secret": user_doc.api_secret,
        "user": {...}
    }
```

**Key Discovery**: Login returns BOTH `api_key` AND `api_secret` - they are stored in the User document, not just session tokens!

---

## 🔐 **API Authentication Pattern**

### **All Protected Endpoints Require:**
```
Authorization: token <API_KEY>:<API_SECRET>
```

**Example:**
```bash
curl -H "Authorization: token abc123:xyz789" \
     -H "Content-Type: application/json" \
     https://oropendola.ai/api/method/ai_assistant.api.streaming_chat_completion
```

---

## 📊 **Core API Endpoints**

### 1. **Streaming Chat Completion** (Primary AI Endpoint)
```python
POST /api/method/ai_assistant.api.streaming_chat_completion

Headers:
  Authorization: token API_KEY:API_SECRET
  Content-Type: application/json

Body:
{
  "message": "Your question here",
  "stream": true,
  "model_preference": "auto|gpt|claude|gemini|local",
  "conversation_id": "optional",
  "system_prompt": "optional",
  "temperature": 0.7,
  "max_tokens": 4096
}

Response: Server-Sent Events (SSE) Stream
  data: {"type": "text", "text": "Hello", "provider": "openai"}
  data: {"type": "text", "text": " world", "provider": "openai"}
  data: {"type": "usage", "input_tokens": 10, "output_tokens": 20}
  data: [DONE]
```

**Implementation Details:**
- Rate-limited by subscription tier
- Supports streaming (SSE) and non-streaming modes
- Auto-routes to best available AI model
- Includes RAG (Retrieval Augmented Generation) if codebase indexed

---

### 2. **Subscription Status** (Check User Limits)
```python
GET /api/method/ai_assistant.api.get_subscription_status

Headers:
  Authorization: token API_KEY:API_SECRET

Response:
{
  "success": true,
  "subscription_status": "active|trial|expired",
  "tier": "trial|weekly|monthly",
  "plan": "Trial|Weekly|Monthly",
  "end_date": "2025-11-12",
  "api_calls_remaining": 150,
  "api_calls_limit": 200,
  "trial_days_remaining": 25
}
```

**Subscription Tiers:**
- **Trial**: ₹0 - 200 total requests (30 days)
- **Weekly**: ₹849 - 300 requests/day  
- **Monthly**: ₹2999 - Unlimited requests

---

### 3. **Get Capabilities** (Service Info)
```python
GET /api/method/ai_assistant.api.get_oropendola_capabilities

Response:
{
  "name": "Oropendola AI Assistant",
  "version": "1.6.0",
  "capabilities": {
    "streaming": true,
    "code_completion": true,
    "image_analysis": true
  },
  "subscription": {
    "tier": "monthly",
    "status": "Active"
  }
}
```

---

## 🔄 **Authentication Flow in VS Code Extension**

### **What Your Extension Does (Correct Implementation):**

```javascript
// 1. Login - Get API Key + Secret
async _handleLogin() {
  const response = await axios.post(
    'https://oropendola.ai/api/method/login',
    { usr: email, pwd: password }
  );
  
  // IMPORTANT: Backend returns BOTH
  const apiKey = response.data.message.api_key;
  const apiSecret = response.data.message.api_secret;
  
  // Store BOTH in VS Code settings
  await config.update('api.key', apiKey, true);
  await config.update('api.secret', apiSecret, true);
}

// 2. Make AI Request - Use BOTH in Provider
async _handleSendMessage(message) {
  const apiKey = config.get('api.key');
  const apiSecret = config.get('api.secret');  // ✅ FIXED: Now retrieved
  
  const provider = new OropendolaProvider({
    apiKey: apiKey,
    apiSecret: apiSecret,  // ✅ FIXED: Now passed
    apiUrl: config.get('api.url', 'https://oropendola.ai')
  });
  
  const response = await provider.chat(message);
}
```

---

## 🐛 **The Bug We Just Fixed**

### **Problem:**
```javascript
// ❌ BEFORE - Missing apiSecret
new OropendolaProvider({
  apiKey: apiKey,
  endpoint: config.get('api.url')  // Wrong parameter name
});
```

**Error:** `"Oropendola API credentials not configured"`

**Root Cause:** OropendolaProvider requires BOTH `apiKey` AND `apiSecret`, but only `apiKey` was passed.

### **Solution:**
```javascript
// ✅ AFTER - Complete credentials
const apiKey = config.get('api.key');
const apiSecret = config.get('api.secret');

new OropendolaProvider({
  apiKey: apiKey,
  apiSecret: apiSecret,
  apiUrl: config.get('api.url', 'https://oropendola.ai')
});
```

---

## 📚 **Key Backend Concepts Learned**

### **1. User Document Structure**
```python
# Frappe User DocType stores API credentials
User {
  name: "user@example.com"
  email: "user@example.com"
  api_key: "abc123..."      # 15-char hash
  api_secret: "xyz789..."   # 15-char hash
  enabled: 1
}
```

### **2. Oropendola Subscription DocType**
```python
OropendolaSubscription {
  user: Link(User)
  tier: "trial|weekly|monthly"
  status: "Active|Expired"
  start_date: Date
  end_date: Date
  requests_used_total: Int
  requests_total_limit: Int
  requests_daily_limit: Int
}
```

### **3. Rate Limiting Logic**
```python
def check_rate_limit(user_id):
    """Check if user can make API request"""
    
    # Get active subscription
    subscription = frappe.db.get_value(
        "Oropendola Subscription",
        {"user": user_id, "status": "Active"}
    )
    
    # Trial users: 200 total requests
    if subscription.tier == "trial":
        if subscription.requests_used_total >= 200:
            return False, "Trial limit exceeded"
    
    # Weekly users: 300/day
    elif subscription.tier == "weekly":
        if subscription.requests_today_used >= 300:
            return False, "Daily limit exceeded"
    
    # Monthly: Unlimited
    return True, None
```

---

## 🔍 **Authentication Methods Available**

The backend provides **3 authentication methods** (for backward compatibility):

### **Method 1: session_login** (Preferred ✅)
```python
POST /api/method/ai_assistant.api.session_login
Body: {"usr": "email", "pwd": "password"}
Returns: api_key + api_secret + session cookies
```

### **Method 2: generate_api_token** (Original)
```python
POST /api/method/ai_assistant.api.generate_api_token
Body: {"username": "email", "password": "password"}
Returns: Same as session_login
Note: May have cv2 (OpenCV) dependency issues
```

### **Method 3: Standard Frappe Login** (Fallback)
```python
POST /api/method/login
Body: {"usr": "email", "pwd": "password"}
Returns: Session cookies only (need to extract api_key from User doc)
```

**Your Extension Uses:** Standard Frappe login + extracts api_key/api_secret from response

---

## 🎯 **Subscription Validation Pattern**

### **Backend Logic:**
```python
@frappe.whitelist(allow_guest=True)
def get_subscription_status():
    user = frappe.session.user
    
    # Get active subscription
    sub = frappe.db.get_value(
        "Oropendola Subscription",
        {"user": user, "status": "Active"}
    )
    
    if sub:
        # Active subscription
        return {
            "subscription_status": "active",
            "tier": sub.tier,
            "end_date": sub.end_date
        }
    
    # Check for trial (30 days from user creation)
    user_doc = frappe.get_doc("User", user)
    days_since_creation = (now() - user_doc.creation).days
    
    if days_since_creation <= 30:
        return {
            "subscription_status": "trial",
            "trial_days_remaining": 30 - days_since_creation
        }
    
    # Expired
    return {"subscription_status": "expired"}
```

---

## 🌊 **SSE Streaming Implementation**

### **Backend Streaming Response:**
```python
def streaming_chat_completion(message, stream=True):
    """SSE streaming for real-time AI responses"""
    
    def generate():
        for chunk in llm.stream(message):
            # Send text chunks
            yield f"data: {json.dumps({
                'type': 'text',
                'text': chunk.text,
                'provider': chunk.provider
            })}\n\n"
        
        # Send usage stats
        yield f"data: {json.dumps({
            'type': 'usage',
            'input_tokens': usage.input_tokens,
            'output_tokens': usage.output_tokens
        })}\n\n"
        
        # Signal completion
        yield "data: [DONE]\n\n"
    
    return Response(generate(), mimetype='text/event-stream')
```

### **Frontend Streaming Consumption:**
```javascript
const response = await fetch(url, {
  headers: { 'Authorization': `token ${apiKey}:${apiSecret}` }
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const {done, value} = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') return;
      
      const parsed = JSON.parse(data);
      if (parsed.type === 'text') {
        handleTextChunk(parsed.text);
      }
    }
  }
}
```

---

## 🚀 **Production Deployment Notes**

### **Current Setup:**
- **Domain**: https://oropendola.ai
- **Framework**: Frappe/ERPNext
- **Database**: MariaDB (stores User + Subscription data)
- **AI Models**: OpenAI GPT, Anthropic Claude, Google Gemini, Local models

### **Deployment Checklist:**
```bash
# 1. Install Frappe app
bench get-app ai_assistant https://github.com/codfatherlogic/ai_assistant.git
bench --site oropendola.ai install-app ai_assistant

# 2. Set API keys in AI Assistant Settings
bench --site oropendola.ai set-config ai_assistant_openai_key "sk-..."
bench --site oropendola.ai set-config ai_assistant_claude_key "sk-ant-..."

# 3. Enable API access
bench --site oropendola.ai enable-api

# 4. Restart services
bench restart
```

---

## 📝 **VS Code Extension Integration Guide**

### **Minimum Required Implementation:**

```javascript
// 1. Login
async function login(email, password) {
  const response = await axios.post(
    'https://oropendola.ai/api/method/login',
    { usr: email, pwd: password }
  );
  
  // Store credentials
  const apiKey = response.data.message.api_key;
  const apiSecret = response.data.message.api_secret;
  
  await vscode.workspace.getConfiguration('oropendola')
    .update('api.key', apiKey, true);
  await vscode.workspace.getConfiguration('oropendola')
    .update('api.secret', apiSecret, true);
}

// 2. Check Subscription
async function checkSubscription() {
  const config = vscode.workspace.getConfiguration('oropendola');
  const apiKey = config.get('api.key');
  const apiSecret = config.get('api.secret');
  
  const response = await axios.get(
    'https://oropendola.ai/api/method/ai_assistant.api.get_subscription_status',
    {
      headers: {
        'Authorization': `token ${apiKey}:${apiSecret}`
      }
    }
  );
  
  return response.data;
}

// 3. Send Chat Message
async function chat(message) {
  const config = vscode.workspace.getConfiguration('oropendola');
  const apiKey = config.get('api.key');
  const apiSecret = config.get('api.secret');
  
  // Use OropendolaProvider
  const provider = new OropendolaProvider({
    apiKey: apiKey,
    apiSecret: apiSecret,  // ← CRITICAL
    apiUrl: 'https://oropendola.ai'
  });
  
  return await provider.chat(message);
}
```

---

## ✅ **Lessons Learned**

### **1. API Credentials Pattern**
- Login returns **TWO** credentials: `api_key` + `api_secret`
- **BOTH** must be passed to AI provider
- Format for Authorization header: `token KEY:SECRET`

### **2. Configuration Management**
- Store credentials in VS Code workspace settings
- Use separate keys: `api.key` and `api.secret`
- Always retrieve BOTH before making requests

### **3. Error Handling**
- "Oropendola API credentials not configured" = Missing apiSecret
- 401/403 = Invalid credentials (need to re-login)
- 429 = Rate limit exceeded (check subscription)

### **4. Subscription Logic**
- Check subscription status after login
- Display appropriate UI based on tier
- Handle trial expiration gracefully

---

## 🎉 **Summary**

The Oropendola backend is a **Frappe-based AI assistant** that:

1. **Authenticates** users with username/password → returns api_key + api_secret
2. **Manages subscriptions** in OropendolaSubscription DocType
3. **Provides streaming AI chat** via SSE with rate limiting
4. **Supports multiple AI models** (GPT, Claude, Gemini, local)

**Critical Fix Applied:**
- **Problem**: OropendolaProvider was missing `apiSecret` parameter
- **Solution**: Retrieve and pass both `api.key` AND `api.secret` from VS Code settings
- **Result**: Chat functionality now works correctly ✅

---

## 📚 **Additional Resources**

- **Backend Repo**: https://github.com/codfatherlogic/ai_assistant
- **API Docs**: See `KILOCODE_INTEGRATION_GUIDE.md` in repo
- **Auth Guide**: See `VSCODE_AUTH_GUIDE.md` in repo
- **Subscription System**: See `SUBSCRIPTION_SYSTEM_GUIDE.md` in repo

---

**Generated**: October 14, 2025  
**Extension Version**: 2.0.0  
**Backend API Version**: 1.6.0
