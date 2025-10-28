# 🤖 Agent Mode Integration - Developer Guide

## Overview

Agent Mode has been fully integrated into the Oropendola extension. The backend automatically selects the best AI model for each request based on:

- **Cost Weight** (from user's subscription plan)
- **Performance Score** (model capability)
- **Availability** (real-time health status)
- **Latency** (response time)
- **Success Rate** (reliability metrics)

**Users don't select models - Oropendola does it automatically.**

---

## Architecture

### 1. Agent API Client (`src/api/agent-client.js`)

Singleton client that communicates with Oropendola's Agent Mode API:

```javascript
const { agentClient } = require('../api/agent-client');

// Make an agent request
const response = await agentClient.agent({
  prompt: "Your question here",
  conversation_id: "optional-uuid",
  context: { /* optional context */ }
});

// Response includes:
// - model: The auto-selected model (e.g., "Claude", "GPT-4")
// - selection_reason: Why this model was chosen
// - response.content: The AI's response
// - usage: Token usage statistics
// - cost: Request cost
```

#### Available Methods

- `agent(params)` - General AI queries with automatic model selection
- `codeCompletion(params)` - Code completion tasks
- `codeExplanation(params)` - Code explanations
- `codeRefactor(params)` - Code refactoring suggestions
- `healthCheck()` - API health status
- `validateApiKey(apiKey)` - Validate API credentials
- `getUsageStats()` - Get usage statistics
- `streamAgent(params, onChunk, onComplete, onError)` - Streaming responses

### 2. ConversationTask Integration (`src/core/ConversationTask.js`)

The `ConversationTask` class now supports Agent Mode:

```javascript
class ConversationTask {
  constructor(taskId, options = {}) {
    // ...
    this.useAgentMode = options.useAgentMode !== false; // Default: true
    this.selectedModel = null;  // Tracks which model was chosen
    this.modelSelectionReason = null;  // Why it was chosen
  }

  async _makeAIRequestWithRetry(retryCount = 0) {
    // Check if Agent Mode is enabled
    if (this.useAgentMode && this.mode === 'agent') {
      return this._makeAgentModeRequest(retryCount);
    }
    // Otherwise use traditional endpoint
    return /* traditional request */;
  }

  async _makeAgentModeRequest(retryCount = 0) {
    // Calls agentClient.agent() with conversation context
    // Stores model selection metadata
    // Returns response compatible with existing code
  }
}
```

**Events Emitted:**

- `modelSelected` - Fired when a model is auto-selected
  ```javascript
  task.on('modelSelected', (data) => {
    console.log('Model:', data.model);
    console.log('Reason:', data.reason);
    console.log('Agent Mode:', data.agentMode);
  });
  ```

### 3. UI Integration

#### Message Types (`webview-ui/src/types/cline-message.ts`)

```typescript
export interface ApiMetrics {
  cost?: number
  tokensIn?: number
  tokensOut?: number
  // Agent Mode metadata
  agentMode?: boolean
  selectedModel?: string
  selectionReason?: string
}
```

#### AgentModelBadge Component (`webview-ui/src/components/Chat/AgentModelBadge.tsx`)

Displays which model was auto-selected:

```tsx
<AgentModelBadge 
  model="Claude"
  selectionReason="Optimized for cost, performance, and availability"
  compact={true}
/>
```

**Supported Models:**
- Claude (🤖 purple)
- GPT-4 (🧠 blue)
- DeepSeek (🔍 green)
- Grok (⚡ yellow)
- Gemini (✨ orange)

#### ChatRow Integration (`webview-ui/src/components/Chat/ChatRow.tsx`)

The ChatRow component automatically displays the model badge when Agent Mode is used:

```tsx
{hasAgentMode && message.apiMetrics && (
  <AgentModelBadge 
    model={message.apiMetrics.selectedModel || ''}
    selectionReason={message.apiMetrics.selectionReason}
    compact={true}
  />
)}
```

---

## Configuration

### Extension Settings (`package.json`)

```json
{
  "oropendola.agentMode.enabled": {
    "type": "boolean",
    "default": true,
    "description": "Enable Agent Mode for automatic AI model selection"
  },
  "oropendola.agentMode.showModelBadge": {
    "type": "boolean",
    "default": true,
    "description": "Show which model was auto-selected in chat messages"
  }
}
```

### VS Code Settings

Users can configure Agent Mode in their VS Code settings:

```json
{
  "oropendola.agentMode.enabled": true,
  "oropendola.agentMode.showModelBadge": true,
  "oropendola.api.key": "your-api-key-here"
}
```

---

## API Endpoints

All endpoints use the base URL:
```
https://oropendola.ai/api/method/oropendola_ai.oropendola_ai.api.vscode_extension
```

### Primary Endpoint: `.agent`

```bash
POST /api/method/oropendola_ai.oropendola_ai.api.vscode_extension.agent
Content-Type: application/json

{
  "api_key": "your-api-key",
  "prompt": "Your question or task",
  "conversation_id": "optional-uuid",
  "context": { /* optional */ }
}
```

**Response:**
```json
{
  "status": 200,
  "model": "Claude",
  "agent_mode": true,
  "selection_reason": "Optimized for cost, performance, and availability",
  "response": {
    "content": "AI response here..."
  },
  "usage": {
    "input_tokens": 100,
    "output_tokens": 200
  },
  "cost": 0.0015
}
```

### Specialized Endpoints

All use Agent Mode internally:

- `.code_completion` - Code completion
- `.code_explanation` - Code explanations  
- `.code_refactor` - Code refactoring

---

## Usage Examples

### Example 1: Simple Query

```javascript
const { agentClient } = require('./src/api/agent-client');

async function askQuestion() {
  const response = await agentClient.agent({
    prompt: "What is a closure in JavaScript?"
  });

  console.log('Model used:', response.model);
  console.log('Answer:', response.response.content);
  console.log('Cost:', response.cost);
}
```

### Example 2: Code Completion

```javascript
const response = await agentClient.codeCompletion({
  code: "function fibonacci(n) {",
  language: "javascript"
});

console.log('Model:', response.model);
console.log('Completion:', response.completion);
```

### Example 3: With ConversationTask

```javascript
const task = new ConversationTask('task-123', {
  apiUrl: 'https://oropendola.ai',
  mode: 'agent',
  useAgentMode: true  // Enable Agent Mode
});

// Listen for model selection
task.on('modelSelected', (data) => {
  console.log(`${data.model} selected: ${data.reason}`);
});

// Run the task
await task.run("Write a Python function to sort a list");
```

---

## How It Works

### Request Flow

```
User Input
    ↓
ConversationTask._makeAIRequestWithRetry()
    ↓
Check: useAgentMode && mode === 'agent'?
    ↓ YES
ConversationTask._makeAgentModeRequest()
    ↓
agentClient.agent()
    ↓
POST https://oropendola.ai/.../agent
    ↓
Backend Evaluates:
  - Cost weights from user's plan
  - Model performance scores
  - Real-time availability
  - Latency metrics
  - Success rates
    ↓
Backend Selects Best Model
    ↓
Response with model metadata
    ↓
Store model selection info
    ↓
Emit 'modelSelected' event
    ↓
Display in UI with AgentModelBadge
```

### Retry Logic

Agent Mode requests include exponential backoff retry:

- **Max Retries:** 3
- **Backoff:** 1s, 2s, 4s, 8s (max 60s)
- **Retryable Errors:** Network errors, 5xx status codes
- **Non-retryable:** 4xx errors, user cancellations

---

## Testing

### Test Agent Mode Integration

```javascript
// In VS Code Developer Console (Ctrl+Shift+I)

// Get the extension
const ext = vscode.extensions.getExtension('oropendola.oropendola-ai-assistant');
const api = ext.exports;

// Test agent client
const { agentClient } = require('./src/api/agent-client');

// Simple test
const response = await agentClient.agent({
  prompt: "What is 2+2?"
});

console.log('Model:', response.model);
console.log('Answer:', response.response.content);
```

### Validate API Key

```javascript
const isValid = await agentClient.validateApiKey();
console.log('Valid:', isValid);
```

### Check Health

```javascript
const health = await agentClient.healthCheck();
console.log('Status:', health);
```

---

## Troubleshooting

### Agent Mode Not Working

1. **Check API Key:**
   ```javascript
   const config = vscode.workspace.getConfiguration('oropendola');
   console.log('API Key set:', !!config.get('api.key'));
   ```

2. **Check Agent Mode Enabled:**
   ```javascript
   const enabled = config.get('agentMode.enabled', true);
   console.log('Agent Mode:', enabled);
   ```

3. **Check Logs:**
   - Look for `[AgentAPI]` prefixed logs in the console
   - Check for `🤖 Using Agent Mode API` messages

### Model Badge Not Showing

1. Verify `oropendola.agentMode.showModelBadge` is `true`
2. Check that `message.apiMetrics.agentMode` is `true`
3. Ensure `message.apiMetrics.selectedModel` is set

### Common Errors

**"API key is required"**
- Solution: Set `oropendola.api.key` in settings

**Network timeout**
- Agent Mode has 20-minute timeout for complex requests
- Check internet connection
- Verify API URL is correct

**Model selection not tracked**
- Ensure `useAgentMode: true` in ConversationTask options
- Verify mode is `'agent'`

---

## Migration Notes

### For Existing Code

Agent Mode is **backward compatible**. Existing code continues to work:

```javascript
// Old code - still works
const task = new ConversationTask(id, { mode: 'agent' });

// Automatically uses Agent Mode if enabled in settings
```

### Disabling Agent Mode

Per-task override:

```javascript
const task = new ConversationTask(id, {
  mode: 'agent',
  useAgentMode: false  // Disable for this task
});
```

Global disable:

```json
{
  "oropendola.agentMode.enabled": false
}
```

---

## Performance Considerations

### Benefits

- **Automatic optimization** - Always uses the best available model
- **Cost efficiency** - Balances performance with cost
- **High availability** - Routes around unhealthy models
- **No manual selection** - Reduces user decision fatigue

### Overhead

- Minimal additional latency (~50-100ms for model selection)
- Response includes extra metadata (model, reason, etc.)
- Slightly larger response payload

---

## Future Enhancements

Planned features:

1. **User preferences** - Allow users to bias selection (e.g., prefer cost over speed)
2. **Model history** - Track which models are used most often
3. **A/B testing** - Compare responses from different models
4. **Manual override** - Allow temporary model forcing for testing

---

## Support

For issues or questions:

- **Documentation:** [oropendola.ai/docs](https://oropendola.ai/docs)
- **Support:** [oropendola.ai/support](https://oropendola.ai/support)
- **GitHub:** [github.com/codfatherlogic/oropendola](https://github.com/codfatherlogic/oropendola)

---

**Agent Mode: Simple. Intelligent. Automatic.** 🚀
