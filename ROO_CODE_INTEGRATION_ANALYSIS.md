# Roo Code Integration Analysis

**Repository**: https://github.com/RooCodeInc/Roo-Code.git  
**Analysis Date**: January 2025  
**Purpose**: Document frontend-backend integration patterns for Oropendola Thinking Indicator

---

## Executive Summary

Roo Code uses a sophisticated **AsyncGenerator streaming architecture** where:
1. **Backend providers** yield `ApiStreamChunk` objects (`text`, `reasoning`, `usage`, `grounding`, `error`)
2. **Task.ts** consumes the stream and emits `say` messages to the webview
3. **Frontend ReasoningBlock** displays reasoning chunks with real-time timer updates
4. **NO SSE/EventSource** - Roo Code uses direct TypeScript async generators, not HTTP SSE

---

## 1. Stream Architecture

### Core Type Definitions

```typescript
// src/api/transform/stream.ts
export type ApiStream = AsyncGenerator<ApiStreamChunk>

export type ApiStreamChunk =
  | ApiStreamTextChunk
  | ApiStreamUsageChunk
  | ApiStreamReasoningChunk
  | ApiStreamGroundingChunk
  | ApiStreamError

export interface ApiStreamTextChunk {
  type: "text"
  text: string
}

export interface ApiStreamReasoningChunk {
  type: "reasoning"
  text: string
}

export interface ApiStreamUsageChunk {
  type: "usage"
  inputTokens: number
  outputTokens: number
  cacheWriteTokens?: number
  cacheReadTokens?: number
  reasoningTokens?: number
  totalCost?: number
}
```

---

## 2. Provider Implementation Patterns

### Example: OpenAI Native Handler (Responses API)

```typescript
// src/api/providers/openai-native.ts
private async *handleStreamResponse(
  body: ReadableStream<Uint8Array>, 
  model: OpenAiNativeModel
): ApiStream {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6).trim()
        if (data === "[DONE]") continue

        const parsed = JSON.parse(data)

        // Text delta
        if (parsed.type === "response.text.delta") {
          yield { type: "text", text: parsed.delta }
        }

        // Reasoning delta
        if (parsed.type === "response.reasoning.delta") {
          yield { type: "reasoning", text: parsed.delta }
        }

        // Usage
        if (parsed.usage) {
          yield {
            type: "usage",
            inputTokens: parsed.usage.input_tokens,
            outputTokens: parsed.usage.output_tokens,
            totalCost: parsed.usage.cost
          }
        }
      }
    }
  }
}
```

### Example: Anthropic Handler

```typescript
// src/api/providers/anthropic.ts
async *createMessage(
  systemPrompt: string,
  messages: Anthropic.Messages.MessageParam[]
): ApiStream {
  const stream = await this.client.messages.create({
    model: this.getModel().id,
    system: systemPrompt,
    messages,
    stream: true
  })

  for await (const chunk of stream) {
    switch (chunk.type) {
      case "content_block_start":
        if (chunk.content_block.type === "thinking") {
          yield { type: "reasoning", text: chunk.content_block.thinking }
        } else if (chunk.content_block.type === "text") {
          yield { type: "text", text: chunk.content_block.text }
        }
        break

      case "content_block_delta":
        if (chunk.delta.type === "thinking_delta") {
          yield { type: "reasoning", text: chunk.delta.thinking }
        } else if (chunk.delta.type === "text_delta") {
          yield { type: "text", text: chunk.delta.text }
        }
        break

      case "message_delta":
        yield {
          type: "usage",
          inputTokens: 0,
          outputTokens: chunk.usage.output_tokens
        }
        break
    }
  }
}
```

---

## 3. Task.ts Stream Consumption

### Main Loop

```typescript
// src/core/task/Task.ts (lines 1937-2020)
public async recursivelyMakeClineRequests(
  userContent: Anthropic.Messages.ContentBlockParam[]
): Promise<boolean> {
  // Start API request stream
  const stream = this.attemptApiRequest()
  let assistantMessage = ""
  let reasoningMessage = ""
  this.isStreaming = true

  const iterator = stream[Symbol.asyncIterator]()
  let item = await iterator.next()

  while (!item.done) {
    const chunk = item.value

    switch (chunk.type) {
      case "reasoning": {
        reasoningMessage += chunk.text
        
        // Format reasoning with line breaks before **Section Headers**
        let formattedReasoning = reasoningMessage.replace(
          /([.!?])\*\*([^*]+)\*\*/g,
          "$1\n\n**$2**"
        )
        
        // Emit to webview (partial = true for streaming)
        await this.say(
          "reasoning",
          formattedReasoning,
          undefined,
          true  // partial
        )
        break
      }

      case "text": {
        assistantMessage += chunk.text
        
        // Parse into tool calls using AssistantMessageParser
        this.assistantMessageContent = 
          this.assistantMessageParser.processChunk(chunk.text)
        
        // Present to user
        await this.presentAssistantMessage()
        break
      }

      case "usage": {
        inputTokens = chunk.inputTokens
        outputTokens = chunk.outputTokens
        totalCost = chunk.totalCost
        break
      }
    }

    item = await iterator.next()
  }

  this.isStreaming = false

  // Final non-partial message
  if (reasoningMessage) {
    await this.say("reasoning", formattedReasoning, undefined, false)
  }
}
```

### Say Method (Emits to Webview)

```typescript
// src/core/task/Task.ts (lines 1092-1150)
async say(
  type: ClineSay,  // "reasoning" | "text" | "tool" | ...
  text?: string,
  images?: string[],
  partial?: boolean,  // true = streaming, false = complete
  checkpoint?: Record<string, unknown>,
  progressStatus?: ToolProgressStatus
): Promise<undefined> {
  if (this.abort) {
    throw new Error(`task ${this.taskId} aborted`)
  }

  if (partial !== undefined) {
    const lastMessage = this.clineMessages.at(-1)
    const isUpdatingPreviousPartial = 
      lastMessage?.partial && lastMessage.type === "say" && lastMessage.say === type

    if (partial) {
      if (isUpdatingPreviousPartial) {
        // Update existing partial message
        lastMessage.text = text
        lastMessage.ts = Date.now()
      } else {
        // Create new partial message
        this.clineMessages.push({
          ts: Date.now(),
          type: "say",
          say: type,
          text,
          images,
          partial: true
        })
      }
    } else {
      // Completion of partial message
      if (isUpdatingPreviousPartial) {
        lastMessage.text = text
        lastMessage.partial = false
      }
    }
  } else {
    // Complete non-streaming message
    this.clineMessages.push({
      ts: Date.now(),
      type: "say",
      say: type,
      text,
      images
    })
  }

  await this.saveClineMessages()
  await this.providerRef.deref()?.postStateToWebview()
}
```

---

## 4. Frontend ReasoningBlock Component

### Component Structure

```tsx
// webview-ui/src/components/reasoning/ReasoningBlock.tsx
interface ReasoningBlockProps {
  content: string
  ts: number
  isStreaming: boolean
  isLast: boolean
  metadata?: ReasoningMetadata
}

export const ReasoningBlock: React.FC<ReasoningBlockProps> = ({
  content,
  ts,
  isStreaming,
  isLast,
  metadata
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)

  // Timer effect for streaming
  useEffect(() => {
    if (isStreaming && isLast) {
      const startTime = Date.now()
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
      
      return () => clearInterval(interval)
    }
  }, [isStreaming, isLast])

  return (
    <div className="reasoning-block">
      <div className="reasoning-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <span className="icon">🧠</span>
        <span className="title">AI Thinking</span>
        {isStreaming && isLast && (
          <span className="timer">{elapsedTime}s</span>
        )}
        <span className="collapse-icon">{isCollapsed ? "▶" : "▼"}</span>
      </div>
      
      {!isCollapsed && (
        <div className="reasoning-content">
          <MarkdownBlock markdown={content} />
        </div>
      )}
    </div>
  )
}
```

### ChatRow Integration

```tsx
// webview-ui/src/components/chat/ChatRow.tsx (lines 1008-1044)
case "reasoning":
  return (
    <ReasoningBlock
      content={message.text || ""}
      ts={message.ts}
      isStreaming={isStreaming}
      isLast={isLast}
      metadata={message.metadata as any}
    />
  )
```

---

## 5. Message Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                       BACKEND (Python)                       │
│ /api/method/ai_assistant.api.chat_completion                │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ HTTP POST
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                  PROVIDER (TypeScript)                       │
│ buildApiHandler() → createMessage()                         │
│                                                              │
│ async *createMessage(): ApiStream {                         │
│   for await (const event of stream) {                       │
│     yield { type: "reasoning", text: event.delta }          │
│     yield { type: "text", text: event.content }             │
│     yield { type: "usage", inputTokens, outputTokens }      │
│   }                                                          │
│ }                                                            │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ AsyncGenerator<ApiStreamChunk>
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                     TASK.TS CONSUMER                         │
│ recursivelyMakeClineRequests()                              │
│                                                              │
│ const stream = this.attemptApiRequest()                     │
│ for await (const chunk of stream) {                         │
│   switch (chunk.type) {                                     │
│     case "reasoning":                                        │
│       await this.say("reasoning", chunk.text, [], true)     │
│       break                                                  │
│     case "text":                                             │
│       await this.say("text", chunk.text)                    │
│       break                                                  │
│   }                                                          │
│ }                                                            │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ postStateToWebview()
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                   WEBVIEW (React)                            │
│ ChatRow → ReasoningBlock                                    │
│                                                              │
│ useEffect(() => {                                            │
│   if (isStreaming && isLast) {                              │
│     const interval = setInterval(() => {                    │
│       setElapsedTime((prev) => prev + 1)                    │
│     }, 1000)                                                 │
│     return () => clearInterval(interval)                    │
│   }                                                          │
│ }, [isStreaming, isLast])                                   │
│                                                              │
│ <div className="timer">{elapsedTime}s</div>                 │
│ <MarkdownBlock markdown={content} />                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Critical Differences: Roo Code vs Oropendola

### Roo Code Architecture
- ✅ **Direct TypeScript async generators** - no HTTP SSE
- ✅ **Provider layer** handles all API differences (OpenAI, Anthropic, etc.)
- ✅ **Task.ts** consumes generator and emits `say` messages
- ✅ **Partial messages** track streaming state (`partial: true/false`)
- ✅ **Timer in frontend** updates every second during streaming

### Oropendola Current State (Extension Logs)
- ❌ **Missing system prompt** - "System prompt present: ✗ NO"
- ❌ **No SSE streaming** - Backend only has HTTP POST endpoint
- ❌ **WebSocket not emitting reasoning** - Connected but silent
- ❌ **better_sqlite3 failure** - Task Manager can't initialize
- ⚠️ **Frontend components exist** but no data stream

---

## 7. Integration Requirements for Oropendola

### Backend Changes (Frappe)

#### 1. Add SSE Streaming Endpoint

```python
# backend/ai_assistant/api.py

@frappe.whitelist(allow_guest=False)
def chat_completion_stream(messages, model="gpt-4o", mode="agent"):
    """
    SSE streaming endpoint for chat with reasoning.
    Returns: text/event-stream
    """
    import json
    from openai import OpenAI
    
    client = OpenAI(api_key=frappe.conf.openai_api_key)
    
    def generate():
        try:
            stream = client.chat.completions.create(
                model=model,
                messages=messages,
                stream=True
            )
            
            for chunk in stream:
                delta = chunk.choices[0].delta
                
                # Reasoning chunk
                if hasattr(delta, 'reasoning_content') and delta.reasoning_content:
                    yield f"data: {json.dumps({'type': 'reasoning', 'text': delta.reasoning_content})}\n\n"
                
                # Text chunk
                if delta.content:
                    yield f"data: {json.dumps({'type': 'text', 'text': delta.content})}\n\n"
                
                # Usage (final chunk)
                if chunk.usage:
                    yield f"data: {json.dumps({'type': 'usage', 'inputTokens': chunk.usage.prompt_tokens, 'outputTokens': chunk.usage.completion_tokens})}\n\n"
            
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    frappe.local.response['type'] = 'text/event-stream'
    frappe.local.response['headers'] = {
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
    }
    
    return generate()
```

#### 2. Alternative: Emit via WebSocket

```python
# backend/ai_assistant/api.py

@frappe.whitelist(allow_guest=False)
def chat_completion_realtime(messages, model="gpt-4o", mode="agent"):
    """
    Chat endpoint that emits reasoning chunks via Socket.IO.
    Returns: Final response only
    """
    from openai import OpenAI
    import frappe.realtime
    
    client = OpenAI(api_key=frappe.conf.openai_api_key)
    user = frappe.session.user
    
    stream = client.chat.completions.create(
        model=model,
        messages=messages,
        stream=True
    )
    
    full_response = ""
    reasoning_text = ""
    
    for chunk in stream:
        delta = chunk.choices[0].delta
        
        # Emit reasoning chunks via WebSocket
        if hasattr(delta, 'reasoning_content') and delta.reasoning_content:
            reasoning_text += delta.reasoning_content
            frappe.realtime.emit(
                'ai_progress',
                {
                    'type': 'reasoning',
                    'text': delta.reasoning_content,
                    'partial': True
                },
                user=user,
                namespace='/oropendola'
            )
        
        # Accumulate text
        if delta.content:
            full_response += delta.content
            frappe.realtime.emit(
                'ai_progress',
                {
                    'type': 'text',
                    'text': delta.content,
                    'partial': True
                },
                user=user,
                namespace='/oropendola'
            )
    
    # Final completion
    frappe.realtime.emit(
        'ai_progress',
        {'type': 'complete'},
        user=user,
        namespace='/oropendola'
    )
    
    return {
        'response': full_response,
        'reasoning': reasoning_text
    }
```

### Frontend Changes (TypeScript)

#### 1. Use Existing RealtimeManager (Recommended)

```typescript
// src/services/RealtimeManager.ts (already exists!)

// Add event listener
realtimeManager.on('ai_progress', (data: AIProgressEvent) => {
  const { type, text, partial } = data
  
  switch (type) {
    case 'reasoning':
      // Update reasoning block
      setReasoningContent(prev => partial ? prev + text : text)
      setIsStreaming(partial)
      break
    
    case 'text':
      // Update chat message
      setChatContent(prev => partial ? prev + text : text)
      break
    
    case 'complete':
      setIsStreaming(false)
      break
  }
})
```

#### 2. Alternative: SSE Implementation

```typescript
// src/api/chat.ts

export async function* streamChatCompletion(
  messages: Message[],
  model: string = "gpt-4o"
): AsyncGenerator<ApiStreamChunk> {
  const response = await fetch(
    `${API_BASE_URL}/api/method/ai_assistant.api.chat_completion_stream`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': document.cookie  // Session auth
      },
      body: JSON.stringify({ messages, model })
    }
  )
  
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ""
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim()
        if (data === '[DONE]') return
        
        try {
          const chunk = JSON.parse(data)
          yield chunk as ApiStreamChunk
        } catch (e) {
          console.error('Failed to parse SSE chunk:', e)
        }
      }
    }
  }
}
```

#### 3. ChatView Integration

```typescript
// webview-ui/src/components/chat/ChatView.tsx

const handleSendMessage = async (text: string) => {
  const messages = [
    { role: 'user', content: text }
  ]
  
  // Using WebSocket (recommended)
  const response = await fetch('/api/method/ai_assistant.api.chat_completion_realtime', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages })
  })
  
  // RealtimeManager automatically handles ai_progress events
  // ReasoningBlock updates automatically via state
}

// OR using SSE
const handleSendMessageSSE = async (text: string) => {
  const messages = [{ role: 'user', content: text }]
  
  for await (const chunk of streamChatCompletion(messages)) {
    switch (chunk.type) {
      case 'reasoning':
        setReasoningContent(prev => prev + chunk.text)
        break
      case 'text':
        setChatContent(prev => prev + chunk.text)
        break
    }
  }
}
```

---

## 8. System Prompt Implementation

### Critical Fix Needed

```typescript
// Extension logs show:
// ❌ CRITICAL: System prompt is missing! AI will not think out loud.
// 🔍 System prompt present: ✗ NO
```

### Roo Code Pattern

```typescript
// src/core/task/Task.ts (lines 2507-2527)
private async getSystemPrompt(): Promise<string> {
  const state = await this.providerRef.deref()?.getState()
  const { mode, customInstructions } = state ?? {}
  
  // Load base prompt from file
  const basePrompt = await fs.readFile(
    path.join(__dirname, '../prompts/system.txt'),
    'utf-8'
  )
  
  // Add mode-specific instructions
  const modePrompt = getModePrompt(mode)
  
  // Add custom instructions
  const customPrompt = customInstructions || ""
  
  return `${basePrompt}\n\n${modePrompt}\n\n${customPrompt}`
}
```

### Fix for Oropendola

```typescript
// src/services/PromptManager.ts (needs to be created)

export class PromptManager {
  async getSystemPrompt(mode: string = 'agent'): Promise<string> {
    const basePrompt = `You are Oropendola AI Assistant, a helpful coding assistant.

When solving problems, think through your approach step-by-step using the reasoning field.

Available modes:
- agent: Full autonomy with tool use
- chat: Conversational responses only

Current mode: ${mode}

Respond with:
1. reasoning: Your internal thought process (shown to user)
2. content: Your final response or tool calls`

    return basePrompt
  }
}

// src/api/ChatManager.ts (update)
async sendMessage(text: string) {
  const promptManager = new PromptManager()
  const systemPrompt = await promptManager.getSystemPrompt(this.mode)
  
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: text }
  ]
  
  // Send to backend...
}
```

---

## 9. Testing Strategy

### Backend Testing

```bash
# Test SSE endpoint
curl -N -H "Cookie: sid=50f6a1a059..." \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Explain async generators"}]}' \
  https://oropendola.ai/api/method/ai_assistant.api.chat_completion_stream

# Expected output:
# data: {"type":"reasoning","text":"Let me break down async generators..."}
# 
# data: {"type":"text","text":"Async generators in JavaScript..."}
# 
# data: [DONE]
```

### Frontend Testing

```typescript
// Test ReasoningBlock streaming
const TestReasoningStream = () => {
  const [content, setContent] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  
  const testStream = async () => {
    setIsStreaming(true)
    
    const chunks = [
      "Let me think about this problem...",
      " First, I need to understand the requirements.",
      " Then, I'll design the solution.",
      " Finally, I'll implement it step by step."
    ]
    
    for (const chunk of chunks) {
      await new Promise(resolve => setTimeout(resolve, 500))
      setContent(prev => prev + chunk)
    }
    
    setIsStreaming(false)
  }
  
  return (
    <div>
      <button onClick={testStream}>Test Stream</button>
      <ReasoningBlock
        content={content}
        ts={Date.now()}
        isStreaming={isStreaming}
        isLast={true}
      />
    </div>
  )
}
```

---

## 10. Recommended Implementation Path

### Phase 1: Backend SSE (2-3 hours)
1. ✅ Create `chat_completion_stream()` endpoint
2. ✅ Test with cURL
3. ✅ Verify reasoning chunks emit separately from text

### Phase 2: System Prompt Fix (1 hour)
1. ✅ Create `PromptManager` class
2. ✅ Load base prompt for each mode
3. ✅ Verify in extension logs: "✅ System prompt present: YES"

### Phase 3: Frontend Connection (2 hours)
1. ✅ Connect ChatView to SSE endpoint
2. ✅ Update ReasoningBlock state on chunks
3. ✅ Verify timer updates during streaming

### Phase 4: Alternative WebSocket Path (1 hour)
1. ✅ Emit `ai_progress` events from backend
2. ✅ RealtimeManager already listens
3. ✅ Update ChatView to handle events

### Phase 5: Better SQLite3 Fix (1 hour)
```bash
cd /Users/sammishthundiyil/oropendola
npm rebuild better_sqlite3

# OR replace with alternative
npm uninstall better_sqlite3
npm install @vscode/sqlite3
```

### Total Estimated Time: **7-8 hours**

---

## 11. Key Takeaways

### ✅ What Works in Roo Code
1. **AsyncGenerator pattern** eliminates SSE complexity
2. **Partial messages** track streaming state elegantly
3. **Provider abstraction** handles all API differences
4. **Timer in frontend** creates live progress feel

### ❌ What's Missing in Oropendola
1. **System prompt** - Critical for reasoning output
2. **SSE streaming** - Backend only has POST endpoint
3. **WebSocket emission** - Connected but not sending chunks
4. **Native module** - better_sqlite3 not compiled for M1/M2

### 🎯 Priority Actions
1. **CRITICAL**: Fix system prompt (blocks all reasoning)
2. **HIGH**: Implement SSE or WebSocket streaming
3. **HIGH**: Connect ReasoningBlock to stream
4. **MEDIUM**: Fix better_sqlite3 or disable Task Manager
5. **LOW**: Fix telemetry 417 error

---

## 12. References

### Roo Code Key Files
- `src/api/transform/stream.ts` - Stream type definitions
- `src/api/providers/openai-native.ts` - SSE parsing example
- `src/api/providers/anthropic.ts` - Native SDK streaming
- `src/core/task/Task.ts` (lines 1937-2020) - Stream consumption
- `webview-ui/src/components/reasoning/ReasoningBlock.tsx` - UI component
- `webview-ui/src/components/chat/ChatRow.tsx` - Integration point

### Oropendola Current Files
- `src/services/RealtimeManager.ts` - ✅ WebSocket working
- `webview-ui/src/components/ReasoningBlock.tsx` - ✅ UI ready
- `backend/api.py` - ❌ Needs SSE streaming
- Extension logs - ❌ System prompt missing

### External Resources
- OpenAI Responses API: https://platform.openai.com/docs/api-reference/responses
- Anthropic Streaming: https://docs.anthropic.com/en/api/streaming
- MDN SSE: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events

---

**Next Step**: Implement system prompt fix (blocking all other work)
