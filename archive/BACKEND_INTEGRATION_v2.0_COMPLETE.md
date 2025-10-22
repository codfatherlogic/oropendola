# Backend Integration v2.0 - Complete

**Status**: ✅ **INTEGRATION COMPLETE**
**Date**: 2025-10-22
**Backend API Version**: 2.0
**Backend URL**: https://oropendola.ai

---

## 📋 Summary

The Oropendola VS Code extension has been fully updated to integrate with the Oropendola.ai backend API v2.0. All endpoints, authentication methods, and response formats now match the official backend specification.

---

## ✅ Completed Updates

### 1. **API Client Enhancements** ([src/api/client.js](src/api/client.js))

**Changes**:
- ✅ Added API Key/Secret authentication (preferred method)
- ✅ Maintained session cookie authentication (fallback)
- ✅ Updated base URL to `https://oropendola.ai`
- ✅ Increased timeout to 120 seconds for AI requests
- ✅ Added Frappe response format handling (`{ message: { ... } }`)
- ✅ Implemented all backend API v2.0 methods:
  - `chatCompletion()` - Primary AI endpoint
  - `getConversationHistory()` - Fetch conversation
  - `listConversations()` - List all conversations
  - `extractTodos()` - AI todo extraction
  - `getTodos()` - Fetch todos with filters
  - `updateTodo()` - Update todo status/priority
  - `getUsageStats()` - API usage analytics

**Authentication Methods**:
```javascript
// Method 1: API Key/Secret (Preferred)
headers['Authorization'] = `token ${apiKey}:${apiSecret}`;

// Method 2: Session Cookies (Fallback)
headers['Cookie'] = sessionCookies;
```

---

### 2. **ConversationTask Updates** ([src/core/ConversationTask.js](src/core/ConversationTask.js))

**Changes**:
- ✅ Updated endpoint: `/api/method/ai_assistant.api.chat` → `/api/method/ai_assistant.api.chat.chat_completion`
- ✅ Added authentication header injection (API Key/Secret priority)
- ✅ Fixed response parsing for Frappe format:
  ```javascript
  const messageData = response.data?.message || response.data;
  const responseText = messageData.response;
  ```
- ✅ Added model and provider logging
- ✅ Added token usage tracking
- ✅ Added cost tracking display
- ✅ Improved error handling for Frappe error format

**API Request Format**:
```javascript
{
  messages: [...],           // Full conversation history
  mode: 'agent',            // 'chat', 'agent', or 'code'
  model: 'auto',            // Model selection
  conversation_id: 'uuid',  // Conversation tracking
  context: {...}            // Workspace context
}
```

**API Response Format**:
```javascript
{
  message: {
    success: true,
    response: "AI response text...",
    model: "claude-3-5-sonnet-20241022",
    provider: "claude",
    usage: {
      input_tokens: 45,
      output_tokens: 156,
      total_tokens: 201
    },
    cost: 0.000603,
    conversation_id: "conv-abc123",
    todos: [...],
    metadata: {...}
  }
}
```

---

### 3. **New Service: Conversation History** ([src/services/conversationHistoryService.js](src/services/conversationHistoryService.js))

**Features**:
- ✅ Fetch conversation history by ID
- ✅ List all conversations with pagination
- ✅ Search conversations by title/content
- ✅ Get conversation metadata
- ✅ Export conversations to Markdown
- ✅ Get conversation statistics
- ✅ Intelligent caching (1-minute TTL)

**Usage**:
```javascript
const { conversationHistoryService } = require('./services/conversationHistoryService');

// Get conversation
const conv = await conversationHistoryService.getConversation(conversationId);

// List recent
const recent = await conversationHistoryService.getRecentConversations(10);

// Search
const results = await conversationHistoryService.searchConversations('bug fix');

// Export
const markdown = await conversationHistoryService.exportToMarkdown(conversationId);

// Stats
const stats = await conversationHistoryService.getConversationStats(conversationId);
```

---

### 4. **New Service: Backend Todo Management** ([src/services/backendTodoService.js](src/services/backendTodoService.js))

**Features**:
- ✅ AI-powered todo extraction from text
- ✅ Get todos with filters (status, priority)
- ✅ Update todo status and priority
- ✅ Auto-extract todos from AI responses
- ✅ Get todo statistics
- ✅ Format todos as Markdown
- ✅ Event-based updates
- ✅ Intelligent caching (30-second TTL)

**Usage**:
```javascript
const { backendTodoService } = require('./services/backendTodoService');

// Extract todos from AI response
const todos = await backendTodoService.extractTodos(aiResponse, context);

// Get open todos
const openTodos = await backendTodoService.getOpenTodos();

// Complete a todo
await backendTodoService.completeTodo(todoId);

// Get statistics
const stats = await backendTodoService.getTodoStats();

// Auto-extract from response
const extracted = await backendTodoService.autoExtractFromResponse(aiResponse);

// Listen for updates
backendTodoService.on('todoUpdated', (data) => {
  console.log('Todo updated:', data);
});
```

---

### 5. **Package.json Configuration Updates** ([package.json](package.json))

**New Settings**:
```json
{
  "oropendola.chat.model": {
    "default": "auto",
    "enum": [
      "auto",           // Backend auto-selection
      "claude",         // Claude Sonnet 4.5
      "deepseek",       // DeepSeek (cost-effective)
      "gemini",         // Gemini 2.0 Flash (free)
      "gpt",            // GPT-4o
      "local"           // Qwen 2.5 Coder (offline)
    ]
  },
  "oropendola.chat.mode": {
    "default": "agent",
    "enum": ["chat", "agent", "code"]
  },
  "oropendola.chat.enableTodoExtraction": {
    "default": true
  },
  "oropendola.chat.streamResponses": {
    "default": false
  },
  "oropendola.analytics.showCost": {
    "default": true
  },
  "oropendola.analytics.showTokenUsage": {
    "default": true
  },
  "oropendola.history.maxConversations": {
    "default": 100
  },
  "oropendola.history.autoSave": {
    "default": true
  }
}
```

---

## 🔧 Configuration Guide

### Step 1: Set API Credentials

**Option A: API Key/Secret (Recommended)**
```json
{
  "oropendola.api.url": "https://oropendola.ai",
  "oropendola.api.key": "YOUR_API_KEY",
  "oropendola.api.secret": "YOUR_API_SECRET"
}
```

**How to get API Key/Secret**:
1. Log in to https://oropendola.ai
2. Go to User → API Access
3. Click "Generate Keys"
4. Copy API Key and API Secret
5. Add to VS Code settings

**Option B: Session Cookies (Fallback)**
```json
{
  "oropendola.session.cookies": "sid=YOUR_SESSION_ID; ..."
}
```

### Step 2: Configure Model Selection
```json
{
  "oropendola.chat.model": "auto"  // or specific model
}
```

### Step 3: Set Interaction Mode
```json
{
  "oropendola.chat.mode": "agent"  // Full autonomy with tools
}
```

### Step 4: Enable Features
```json
{
  "oropendola.chat.enableTodoExtraction": true,
  "oropendola.analytics.showCost": true,
  "oropendola.analytics.showTokenUsage": true
}
```

---

## 🚀 Available Models

### Auto Selection (Recommended)
- **Model**: `auto`
- **Behavior**: Backend automatically selects best model based on:
  - Task complexity
  - Provider health
  - Load balancing
  - Cost optimization

### Claude (Anthropic)
- **Models**: `claude-3-5-sonnet-20241022`, `claude-3-5-haiku-20241022`
- **Best for**: Complex coding tasks, reasoning
- **Cost**: $3/$15 per 1M tokens (input/output)
- **Cache**: 90% off cached tokens

### DeepSeek
- **Models**: `deepseek-chat`, `deepseek-reasoner`
- **Best for**: Fast coding, cost-effective
- **Cost**: $0.28/$0.42 per 1M tokens
- **Cache**: 90% off cached tokens

### Gemini (Google)
- **Models**: `gemini-2.0-flash-exp`, `gemini-1.5-pro`
- **Best for**: Fast responses, multimodal
- **Cost**: FREE (15 RPM limit)

### GPT (OpenAI)
- **Models**: `gpt-4o`, `gpt-4-turbo`
- **Best for**: General purpose
- **Cost**: Varies by model

### Local (Ollama)
- **Model**: `qwen2.5-coder:32b`
- **Best for**: Privacy, offline work
- **Cost**: $0 (runs locally)
- **Requires**: 16GB+ RAM

---

## 🎯 Interaction Modes

### 1. Chat Mode
```javascript
{ mode: 'chat' }
```
- Simple Q&A
- No tool execution
- Context-aware responses
- Fast and lightweight

### 2. Agent Mode (Default)
```javascript
{ mode: 'agent' }
```
- Full autonomy
- Tool execution enabled
- Multi-step reasoning
- File operations
- Terminal commands

### 3. Code Mode
```javascript
{ mode: 'code' }
```
- Optimized for code generation
- Lower temperature (0.3)
- Code-specialized models preferred
- Minimal explanations

---

## 📊 Analytics & Cost Tracking

### Usage Statistics
```javascript
const { apiClient } = require('./api/client');

// Get usage for last 7 days
const stats = await apiClient.getUsageStats(7, 'all');

console.log(stats);
// {
//   total_requests: 150,
//   total_tokens: 75000,
//   total_cost: 2.45,
//   by_provider: {
//     claude: { requests: 100, cost: 1.80 },
//     deepseek: { requests: 50, cost: 0.65 }
//   }
// }
```

### Display in UI
- Token usage shown per request
- Cost calculated automatically
- Provider and model logged
- Cache hit rate tracked

---

## 🔄 Real-time Updates (WebSocket)

The extension already has WebSocket support via [RealtimeManager](src/core/RealtimeManager.js):

**Features**:
- Real-time AI progress updates
- Tool execution notifications
- Thinking indicators
- Completion events

**Events**:
- `ai_progress` - AI is thinking/working
- `connected` - WebSocket connected
- `disconnected` - Connection lost
- `error` - Connection error

---

## 📝 Todo Integration

### Automatic Todo Extraction
When `oropendola.chat.enableTodoExtraction` is enabled:
1. AI responses are analyzed
2. Todos are automatically extracted
3. Created in backend database
4. Synced across conversations

### Manual Todo Management
```javascript
const { backendTodoService } = require('./services/backendTodoService');

// Create from text
await backendTodoService.extractTodos(
  "We need to: 1. Fix bug 2. Add tests 3. Deploy",
  "Code review context"
);

// Get todos
const todos = await backendTodoService.getTodos({
  status: 'Open',
  priority: 'High'
});

// Update status
await backendTodoService.completeTodo(todoId);
```

---

## 🧪 Testing Guide

### Test API Connection
```bash
curl -X POST https://oropendola.ai/api/method/ai_assistant.api.chat.chat_completion \
  -H "Authorization: token YOUR_KEY:YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}],
    "mode": "chat",
    "model": "auto"
  }'
```

### Test in Extension
1. Set API credentials in settings
2. Open chat panel (Cmd+L)
3. Send a test message
4. Check developer console for logs:
   - `🔐 Using API Key/Secret authentication`
   - `✅ Received response from API`
   - `🤖 Model used: claude-3-5-sonnet-20241022`
   - `📊 Token usage: {...}`
   - `💰 Cost: 0.000603`

---

## 🔍 Troubleshooting

### Issue: 401 Unauthorized
**Solution**:
- Check API Key/Secret are correct
- Ensure keys haven't expired
- Verify user has API access enabled

### Issue: 429 Rate Limit
**Solution**:
- Wait for rate limit reset
- Upgrade to paid tier
- Use model with higher limits (e.g., Gemini)

### Issue: No response from API
**Solution**:
- Check network connectivity
- Verify `oropendola.api.url` is correct
- Check firewall/proxy settings
- Review backend logs at https://oropendola.ai

### Issue: Tool calls not working
**Solution**:
- Ensure mode is set to `agent` (not `chat`)
- Check backend API version supports tool calls
- Verify authentication has proper permissions

---

## 📚 API Reference

### Complete Endpoint List

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/method/ai_assistant.api.chat.chat_completion` | POST | Main AI chat |
| `/api/method/ai_assistant.api.chat.get_conversation_history` | GET | Fetch conversation |
| `/api/method/ai_assistant.api.chat.list_conversations` | GET | List conversations |
| `/api/method/ai_assistant.api.todo.extract_todos` | POST | Extract todos |
| `/api/method/ai_assistant.api.todo.get_todos` | GET | Get todos |
| `/api/method/ai_assistant.api.todo.update_todo` | POST | Update todo |
| `/api/method/ai_assistant.api.analytics.get_usage_stats` | GET | Usage stats |

---

## 🎉 What's New

### v2.0 Integration Features
1. ✅ **Multi-provider AI** - Claude, DeepSeek, Gemini, GPT, Local
2. ✅ **Auto model selection** - Backend chooses best model
3. ✅ **Cost tracking** - Real-time cost calculation
4. ✅ **Todo extraction** - AI-powered todo management
5. ✅ **Conversation history** - Full persistence and search
6. ✅ **Usage analytics** - Track API usage and costs
7. ✅ **Better authentication** - API Key/Secret support
8. ✅ **Streaming support** - Real-time WebSocket updates

---

## 📈 Next Steps

### Optional Enhancements
1. Add UI for model selection dropdown
2. Create analytics dashboard view
3. Add conversation browser panel
4. Implement streaming chat UI
5. Add todo panel with filtering
6. Create cost budget alerts
7. Add offline mode with local models

---

## 📞 Support

- **Backend Issues**: Check logs at https://oropendola.ai/app/error-log
- **API Questions**: Review integration guide in this file
- **Feature Requests**: Submit via GitHub Issues
- **API Documentation**: See `VS Code Extension Integration Report`

---

**Integration Status**: ✅ **COMPLETE AND TESTED**
**Last Updated**: 2025-10-22
**Backend Version**: 2.0
**Compatible Extension Version**: 2.5.1+
