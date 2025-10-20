# 🔌 WebSocket Integration Guide - Connect Frontend to Backend Progress

**Goal**: Connect VS Code Extension to Frappe's real-time progress events

---

## 📋 Problem

- **Backend** emits progress via `frappe.publish_realtime('ai_progress', {...})`
- **Frontend** (VS Code Extension) runs locally on user's computer
- Need: Establish WebSocket connection from extension to oropendola.ai server

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│  USER'S COMPUTER                        │
│                                         │
│  ┌────────────────────────────────┐   │
│  │  VS Code Extension              │   │
│  │  - ConversationTask            │   │
│  │  - WebSocket Client            │   │
│  │  - Receives ai_progress events │   │
│  └───────────────┬────────────────┘   │
│                  │ WebSocket           │
│                  │ wss://              │
└──────────────────┼─────────────────────┘
                   │
             INTERNET (WSS)
                   │
┌──────────────────▼─────────────────────┐
│  OROPENDOLA.AI SERVER                  │
│                                         │
│  ┌────────────────────────────────┐   │
│  │  Frappe Backend                 │   │
│  │  - publish_realtime()          │   │
│  │  - socketio server             │   │
│  │  - Emits ai_progress events    │   │
│  └────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## 🛠️ Implementation Options

### Option 1: Use Frappe's Socket.IO Client (Recommended)

**Pros**:
- Uses Frappe's existing infrastructure
- Authentication handled automatically
- Built-in reconnection logic

**Cons**:
- Need socket.io-client npm package
- Must handle session cookies for auth

**Implementation**:

#### Step 1: Install socket.io-client

```bash
cd /Users/sammishthundiyil/oropendola
npm install socket.io-client --save
```

#### Step 2: Create WebSocket Manager

**File**: `src/core/RealtimeManager.js`

```javascript
const io = require('socket.io-client');
const EventEmitter = require('events');

/**
 * Manages WebSocket connection to Frappe backend for real-time updates
 */
class RealtimeManager extends EventEmitter {
    constructor(apiUrl, sessionCookies) {
        super();
        this.apiUrl = apiUrl;
        this.sessionCookies = sessionCookies;
        this.socket = null;
        this.connected = false;
    }

    /**
     * Connect to Frappe's socketio server
     */
    connect() {
        if (this.socket && this.connected) {
            console.log('🔌 Already connected to realtime server');
            return;
        }

        console.log('🔌 Connecting to realtime server:', this.apiUrl);

        // Parse cookies for auth
        const cookies = this._parseCookies(this.sessionCookies);
        const sid = cookies.sid;

        if (!sid) {
            console.error('❌ No session ID found in cookies');
            this.emit('error', new Error('No session ID for WebSocket auth'));
            return;
        }

        // Connect to Frappe's socketio
        this.socket = io(this.apiUrl, {
            path: '/socket.io',
            transports: ['websocket', 'polling'],
            auth: {
                sid: sid
            },
            extraHeaders: {
                'Cookie': this.sessionCookies
            },
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });

        // Connection events
        this.socket.on('connect', () => {
            console.log('✅ Connected to realtime server');
            this.connected = true;
            this.emit('connected');
        });

        this.socket.on('disconnect', (reason) => {
            console.log('❌ Disconnected from realtime server:', reason);
            this.connected = false;
            this.emit('disconnected', reason);
        });

        this.socket.on('connect_error', (error) => {
            console.error('❌ Realtime connection error:', error);
            this.emit('error', error);
        });

        // Subscribe to ai_progress events
        this.socket.on('ai_progress', (data) => {
            console.log('📊 Received ai_progress:', data.type);
            this.emit('ai_progress', data);
        });

        // Subscribe to other Frappe events
        this.socket.on('msgprint', (data) => {
            this.emit('msgprint', data);
        });

        this.socket.on('eval_js', (data) => {
            this.emit('eval_js', data);
        });
    }

    /**
     * Disconnect from server
     */
    disconnect() {
        if (this.socket) {
            console.log('🔌 Disconnecting from realtime server');
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
        }
    }

    /**
     * Parse cookies string into object
     */
    _parseCookies(cookieString) {
        const cookies = {};
        if (!cookieString) return cookies;

        cookieString.split(';').forEach(cookie => {
            const parts = cookie.trim().split('=');
            if (parts.length === 2) {
                cookies[parts[0]] = parts[1];
            }
        });

        return cookies;
    }

    /**
     * Check if connected
     */
    isConnected() {
        return this.connected && this.socket && this.socket.connected;
    }
}

module.exports = RealtimeManager;
```

#### Step 3: Integrate in ConversationTask

**File**: `src/core/ConversationTask.js`

Add at the top:
```javascript
const RealtimeManager = require('./RealtimeManager');
```

Add to constructor:
```javascript
constructor(taskId, config) {
    // ... existing code ...
    
    // Initialize realtime connection
    this._realtimeManager = null;
    if (config.sessionCookies) {
        this._setupRealtimeConnection(config.apiUrl, config.sessionCookies);
    }
}
```

Add new method:
```javascript
/**
 * Set up WebSocket connection for real-time progress updates
 */
_setupRealtimeConnection(apiUrl, sessionCookies) {
    console.log('🔌 Setting up realtime connection for task:', this.taskId);
    
    this._realtimeManager = new RealtimeManager(apiUrl, sessionCookies);
    
    // Forward ai_progress events
    this._realtimeManager.on('ai_progress', (data) => {
        console.log('📊 Realtime ai_progress received:', data.type);
        this.emit('aiProgress', this.taskId, data);
    });
    
    // Handle connection events
    this._realtimeManager.on('connected', () => {
        console.log('✅ Realtime connection established for task:', this.taskId);
    });
    
    this._realtimeManager.on('disconnected', (reason) => {
        console.log('❌ Realtime connection lost:', reason);
    });
    
    this._realtimeManager.on('error', (error) => {
        console.error('❌ Realtime connection error:', error);
    });
    
    // Connect immediately
    this._realtimeManager.connect();
}

/**
 * Clean up realtime connection
 */
async cleanup() {
    // ... existing cleanup code ...
    
    // Disconnect realtime
    if (this._realtimeManager) {
        this._realtimeManager.disconnect();
        this._realtimeManager = null;
    }
}
```

---

### Option 2: Polling (Fallback)

If WebSocket doesn't work, implement polling:

**File**: `src/core/ConversationTask.js`

```javascript
/**
 * Poll for progress updates (fallback if WebSocket fails)
 */
_startProgressPolling(conversationId) {
    if (this._progressPollingInterval) {
        clearInterval(this._progressPollingInterval);
    }
    
    this._progressPollingInterval = setInterval(async () => {
        try {
            const response = await axios.get(
                `${this._apiUrl}/api/method/ai_assistant.api.get_progress`,
                {
                    params: { conversation_id: conversationId },
                    headers: { 'Cookie': this._sessionCookies }
                }
            );
            
            if (response.data && response.data.message) {
                const progress = response.data.message;
                if (progress.updates && progress.updates.length > 0) {
                    progress.updates.forEach(update => {
                        this.emit('aiProgress', this.taskId, update);
                    });
                }
            }
        } catch (error) {
            console.error('❌ Progress polling error:', error);
        }
    }, 1000); // Poll every second
}

_stopProgressPolling() {
    if (this._progressPollingInterval) {
        clearInterval(this._progressPollingInterval);
        this._progressPollingInterval = null;
    }
}
```

---

## 🧪 Testing

### Test WebSocket Connection:

```javascript
// In extension.js or sidebar-provider.js

const RealtimeManager = require('./core/RealtimeManager');

// Test connection
const rtm = new RealtimeManager('https://oropendola.ai', sessionCookies);

rtm.on('connected', () => {
    console.log('✅ Test connection successful!');
});

rtm.on('ai_progress', (data) => {
    console.log('📊 Progress event:', data);
});

rtm.connect();

// Test for 30 seconds
setTimeout(() => {
    rtm.disconnect();
    console.log('🔌 Test complete');
}, 30000);
```

### Test Progress Flow:

1. **Start extension** with WebSocket enabled
2. **Send message** to AI
3. **Watch console** for:
   - "🔌 Connecting to realtime server"
   - "✅ Connected to realtime server"
   - "📊 Realtime ai_progress received: thinking"
   - "📊 Realtime ai_progress received: plan"
   - etc.
4. **Check UI** for progress display

---

## 📋 Backend Requirements

### Ensure Backend Emits Events:

**File**: `ai_assistant/api/__init__.py`

```python
@frappe.whitelist()
def chat(...):
    # Get current user
    user = frappe.session.user
    
    # Emit progress events with user-specific delivery
    frappe.publish_realtime(
        event='ai_progress',
        message={
            'type': 'thinking',
            'message': '🔍 Analyzing...'
        },
        user=user  # ← Important: sends only to this user
    )
    
    # ... rest of chat logic ...
```

### Test Backend Events:

```bash
# SSH to server
ssh oropendola.ai

# Watch socketio logs
tail -f logs/socketio.log | grep ai_progress

# Or watch web logs
tail -f logs/web.log | grep publish_realtime
```

---

## 🔧 Troubleshooting

### Issue: "Connection Timeout"

**Solution**:
- Check firewall allows WebSocket (port 443/WSS)
- Verify `https://oropendola.ai/socket.io/` is accessible
- Check nginx config allows WebSocket upgrade

### Issue: "Auth Failed"

**Solution**:
- Verify session cookies are valid
- Check `sid` cookie exists
- Ensure cookies are sent in WebSocket auth

### Issue: "No Events Received"

**Solution**:
- Check backend emits with correct user
- Verify event name is exactly 'ai_progress'
- Check socketio server is running (`supervisorctl status socketio`)

### Issue: "Multiple Connections"

**Solution**:
- Disconnect old connection before creating new one
- Use singleton pattern for RealtimeManager
- Check for memory leaks

---

## 📊 Expected Behavior

### Successful Connection:

```
Console Output:

🔌 Setting up realtime connection for task: task_1_1234567890
🔌 Connecting to realtime server: https://oropendola.ai
✅ Connected to realtime server
✅ Realtime connection established for task: task_1_1234567890

[User sends message]

📊 Realtime ai_progress received: thinking
📊 AI Progress [thinking]: 🔍 Analyzing your request...

📊 Realtime ai_progress received: plan
📊 AI Progress [plan]: 📝 Here's my plan: ...

📊 Realtime ai_progress received: working
📊 AI Progress [working]: ⚙️ Step 1/3: Creating file...

📊 Realtime ai_progress received: step_complete
📊 AI Progress [step_complete]: ✅ Created file.js

📊 Realtime ai_progress received: complete
📊 AI Progress [complete]: ✨ Done!

🔌 Disconnecting from realtime server
```

### UI Behavior:

1. User sends message → typing indicator
2. Backend starts → "🔍 Analyzing..." appears
3. Plan generated → "📝 Plan: 1. ..." appears
4. Tool execution → Progress bar animates
5. Tool complete → "✅ Created file" appears
6. All done → File changes card appears

---

## 🚀 Quick Start

### 1. Install Dependencies:

```bash
npm install socket.io-client --save
```

### 2. Create RealtimeManager:

Copy the code above to `src/core/RealtimeManager.js`

### 3. Update ConversationTask:

Add realtime connection setup

### 4. Build and Test:

```bash
npm run package
code --install-extension oropendola-ai-assistant-2.0.3.vsix
```

### 5. Send Test Message:

Open VS Code → Oropendola sidebar → Send "Create hello.js"

### 6. Verify Progress Display:

Check console (F12) and UI for progress updates

---

## ✅ Success Criteria

- ✅ WebSocket connects to oropendola.ai
- ✅ Session authenticated with sid cookie
- ✅ ai_progress events received in extension
- ✅ Events forwarded to webview
- ✅ UI displays progress in real-time
- ✅ Connection reconnects on disconnect
- ✅ No memory leaks

---

## 📈 Next Steps

1. **Implement RealtimeManager** (30 min)
2. **Integrate in ConversationTask** (15 min)
3. **Test connection** (10 min)
4. **Test progress display** (10 min)
5. **Handle edge cases** (15 min)

**Total**: ~1.5 hours

---

**You're almost there!** Just need to add the WebSocket connection and you'll have full GitHub Copilot-style progress tracking! 🎉
