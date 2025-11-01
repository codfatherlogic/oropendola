# Backend Reasoning Streaming Implementation Guide

## ⚠️ ROOT CAUSE IDENTIFIED (October 27, 2025)

**Issue**: VSCode extension calls `chat_completion()` endpoint, which uses **NON-STREAMING** `gateway.generate()`. No WebSocket events are emitted during AI generation.

**Fix Location**: `ai_assistant/api/__init__.py` - Function `_generate_cloud_response()` (Line ~275)

**Required Change**: Replace `gateway.generate()` with `gateway.stream_generate()` and add `frappe.publish_realtime()` calls for each chunk.

**Impact**: ~50 lines of code, 10 minutes to implement, **massive UX improvement**.

See **Section: Root Cause Analysis & Fix** below for complete implementation.

---

## Overview

This guide explains how to implement reasoning chunk streaming from the Frappe backend to the Oropendola frontend extension. The frontend is **fully ready** - all components, WebSocket listeners, and UI are in place. You only need to implement the backend emission.

## Current Status

### ✅ Frontend Ready
- SystemPromptBuilder loading 9 modules (16,338 chars)
- System prompt contains "THINK OUT LOUD" instructions
- WebSocket connected (Socket ID: X1KqnBtBloUlhy8FAAAH verified in logs)
- RealtimeManager listening for `ai_progress` events
- ReasoningBlock component ready to display reasoning
- Timer component ready for live updates

### ❌ Backend Missing
- `chat_completion()` endpoint uses NON-STREAMING `gateway.generate()`
- No `ai_progress` events being emitted during streaming
- Frontend receives no `type: "reasoning"` messages
- Events only fire AFTER AI completes (too late)

## Required Backend Implementation

### 🚨 CRITICAL FIX: Replace Non-Streaming with Streaming

**File**: `ai_assistant/api/__init__.py`  
**Function**: `_generate_cloud_response()` (Line ~275)  
**Problem**: Uses `gateway.generate()` which waits for complete response  
**Solution**: Use `gateway.stream_generate()` with WebSocket emissions  

**Current Code (BROKEN)**:
```python
def _generate_cloud_response(messages, provider, model, ...):
    gateway = get_unified_gateway()
    
    # ❌ NON-STREAMING - Waits for complete response
    result = gateway.generate(
        messages=messages,
        preferred_provider=provider,
        model=model,
        temperature=temperature,
        max_tokens=max_tokens
    )
    
    # Returns after AI finishes (no realtime updates)
    return {
        "success": True,
        "response": result.get('content', ''),
        ...
    }
```

**Fixed Code (WORKING)**:
```python
def _generate_cloud_response(messages, provider, model, temperature=0.7, max_tokens=1000, conversation_id=None):
    """Generate response using cloud AI providers WITH WEBSOCKET STREAMING"""
    from ai_assistant.core.unified_gateway import get_unified_gateway
    from frappe.utils import now_datetime
    
    gateway = get_unified_gateway()
    user = frappe.session.user
    task_id = f"task_{conversation_id or frappe.generate_hash(length=8)}"
    
    # Accumulators
    response_text = ""
    reasoning_text = ""
    input_tokens = 0
    output_tokens = 0
    
    try:
        # ✅ USE STREAMING GENERATOR
        for chunk in gateway.stream_generate(
            messages=messages,
            preferred_provider=provider,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens
        ):
            # REASONING CHUNKS
            if chunk.get("type") == "reasoning":
                reasoning_chunk = chunk.get("text", "")
                reasoning_text += reasoning_chunk
                
                # ✅ EMIT WEBSOCKET EVENT
                try:
                    frappe.publish_realtime(
                        event='ai_progress',
                        message={
                            'type': 'reasoning',
                            'text': reasoning_chunk,
                            'partial': True,
                            'task_id': task_id,
                            'timestamp': now_datetime().isoformat()
                        },
                        user=user
                    )
                    frappe.db.commit()  # ⚠️ CRITICAL for real-time delivery
                except Exception as ws_error:
                    frappe.logger().warning(f"WebSocket reasoning emit failed: {ws_error}")
            
            # TEXT CHUNKS
            elif chunk.get("type") == "text":
                text_chunk = chunk.get("text", "")
                response_text += text_chunk
                
                # ✅ EMIT WEBSOCKET EVENT
                try:
                    frappe.publish_realtime(
                        event='ai_progress',
                        message={
                            'type': 'text',
                            'text': text_chunk,
                            'partial': True,
                            'task_id': task_id,
                            'timestamp': now_datetime().isoformat()
                        },
                        user=user
                    )
                    frappe.db.commit()
                except Exception as ws_error:
                    frappe.logger().warning(f"WebSocket text emit failed: {ws_error}")
            
            # USAGE STATS
            elif chunk.get("type") == "usage":
                input_tokens = chunk.get("input_tokens", 0)
                output_tokens = chunk.get("output_tokens", 0)
        
        # ✅ EMIT COMPLETION EVENT
        try:
            frappe.publish_realtime(
                event='ai_progress',
                message={
                    'type': 'completion',
                    'text': response_text,
                    'reasoning': reasoning_text,
                    'partial': False,
                    'task_id': task_id,
                    'timestamp': now_datetime().isoformat()
                },
                user=user
            )
            frappe.db.commit()
        except Exception as ws_error:
            frappe.logger().warning(f"WebSocket completion emit failed: {ws_error}")
        
        # Return final response
        return {
            "success": True,
            "response": response_text,
            "reasoning": reasoning_text,
            "usage": {
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": input_tokens + output_tokens
            },
            "provider": provider,
            "model": model
        }
    
    except Exception as e:
        frappe.logger().error(f"Cloud response generation failed: {str(e)}")
        import traceback
        frappe.logger().error(f"Traceback: {traceback.format_exc()}")
        return {
            "success": False,
            "error": str(e),
            "response": "",
            "usage": {}
        }
```

**Key Changes**:
1. ✅ Replace `gateway.generate()` with `gateway.stream_generate()`
2. ✅ Add loop to process chunks
3. ✅ Emit `ai_progress` WebSocket events for reasoning chunks
4. ✅ Emit `ai_progress` WebSocket events for text chunks
5. ✅ Call `frappe.db.commit()` after each emit (CRITICAL!)
6. ✅ Emit completion event when stream finishes

---

### 1. WebSocket Event Structure

The frontend expects this exact event format:

```python
import frappe

# Emit reasoning chunk
frappe.realtime.emit(
    'ai_progress',
    {
        'type': 'reasoning',
        'text': 'Analyzing the user request...',  # Reasoning text
        'partial': True,  # True for streaming chunks, False for final
        'task_id': task_id  # Optional: task identifier
    },
    room=None,  # Broadcast to all, or specify user
    user=frappe.session.user  # Send to specific user
)
```

### 2. Event Types

The frontend handles these event types:

| Type | Purpose | Example |
|------|---------|---------|
| `reasoning` | AI's thinking process | "Let me analyze the file structure..." |
| `text` | Regular response text | "I'll create the following files..." |
| `tool_call` | Tool execution notification | "Executing: create_file" |
| `completion` | Task completed | "Task finished successfully" |

### 3. Implementation in `/api/method/ai_assistant.api.chat_completion`

Here's how to modify your chat completion endpoint:

```python
# File: ai_assistant/api/chat_completion.py

import frappe
from frappe import _
import json

@frappe.whitelist(allow_guest=False)
def chat_completion(messages, mode='agent', conversation_id=None, **kwargs):
    """
    Chat completion endpoint with reasoning streaming
    """
    try:
        # Get task ID for WebSocket room
        task_id = kwargs.get('task_id', f"task_{frappe.utils.now()}")
        user = frappe.session.user
        
        # Initialize AI model (DeepSeek, OpenAI, etc.)
        model = get_ai_model()
        
        # Build system prompt (already done in your system)
        system_prompt = build_system_prompt(mode)
        
        # Prepare messages
        full_messages = [
            {"role": "system", "content": system_prompt},
            *messages
        ]
        
        # **CRITICAL: Stream reasoning chunks**
        response_text = ""
        reasoning_text = ""
        
        # Create streaming request to AI model
        stream = model.chat.completions.create(
            model="deepseek-reasoner",  # or your model
            messages=full_messages,
            stream=True,
            # Enable reasoning if model supports it
            reasoning_effort="high"  # DeepSeek-specific
        )
        
        # Process streaming chunks
        for chunk in stream:
            delta = chunk.choices[0].delta
            
            # **EMIT REASONING CHUNKS**
            if hasattr(delta, 'reasoning_content') and delta.reasoning_content:
                reasoning_chunk = delta.reasoning_content
                reasoning_text += reasoning_chunk
                
                # Emit to frontend via WebSocket
                frappe.realtime.emit(
                    'ai_progress',
                    {
                        'type': 'reasoning',
                        'text': reasoning_chunk,
                        'partial': True,
                        'task_id': task_id,
                        'timestamp': frappe.utils.now()
                    },
                    user=user
                )
                
                # Commit to ensure real-time delivery
                frappe.db.commit()
            
            # **EMIT TEXT CHUNKS**
            if hasattr(delta, 'content') and delta.content:
                text_chunk = delta.content
                response_text += text_chunk
                
                frappe.realtime.emit(
                    'ai_progress',
                    {
                        'type': 'text',
                        'text': text_chunk,
                        'partial': True,
                        'task_id': task_id
                    },
                    user=user
                )
                
                frappe.db.commit()
        
        # **EMIT COMPLETION**
        frappe.realtime.emit(
            'ai_progress',
            {
                'type': 'completion',
                'text': response_text,
                'reasoning': reasoning_text,
                'partial': False,
                'task_id': task_id
            },
            user=user
        )
        
        # Return final response
        return {
            'success': True,
            'role': 'assistant',
            'content': response_text,
            'reasoning': reasoning_text,
            'conversation_id': conversation_id or frappe.generate_hash()
        }
        
    except Exception as e:
        frappe.log_error(f"Chat completion error: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }
```

### 4. DeepSeek Reasoner Specific Implementation

If using DeepSeek Reasoner model:

```python
from openai import OpenAI

def stream_deepseek_reasoning(messages, task_id, user):
    """
    Stream reasoning from DeepSeek Reasoner model
    """
    client = OpenAI(
        api_key=frappe.conf.get('deepseek_api_key'),
        base_url="https://api.deepseek.com"
    )
    
    response = client.chat.completions.create(
        model="deepseek-reasoner",
        messages=messages,
        stream=True
    )
    
    reasoning_content = ""
    response_content = ""
    
    for chunk in response:
        if chunk.choices[0].delta.reasoning_content:
            # **REASONING CHUNK**
            reasoning_chunk = chunk.choices[0].delta.reasoning_content
            reasoning_content += reasoning_chunk
            
            # Emit immediately
            frappe.realtime.emit(
                'ai_progress',
                {
                    'type': 'reasoning',
                    'text': reasoning_chunk,
                    'partial': True,
                    'task_id': task_id
                },
                user=user
            )
            frappe.db.commit()
        
        if chunk.choices[0].delta.content:
            # **RESPONSE CHUNK**
            response_chunk = chunk.choices[0].delta.content
            response_content += response_chunk
            
            frappe.realtime.emit(
                'ai_progress',
                {
                    'type': 'text',
                    'text': response_chunk,
                    'partial': True,
                    'task_id': task_id
                },
                user=user
            )
            frappe.db.commit()
    
    return {
        'reasoning': reasoning_content,
        'response': response_content
    }
```

### 5. OpenAI Implementation (if applicable)

```python
from openai import OpenAI

def stream_openai_reasoning(messages, task_id, user):
    """
    Stream with OpenAI - simulate reasoning from CoT
    """
    client = OpenAI(api_key=frappe.conf.get('openai_api_key'))
    
    # Add explicit reasoning instruction to system prompt
    system_msg = {
        "role": "system",
        "content": "Think step-by-step. Show your reasoning before answering."
    }
    
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[system_msg] + messages,
        stream=True
    )
    
    full_text = ""
    in_reasoning = False
    reasoning_buffer = ""
    
    for chunk in response:
        if chunk.choices[0].delta.content:
            text = chunk.choices[0].delta.content
            full_text += text
            
            # Detect reasoning section (if model uses markers)
            if "<thinking>" in text or "Let me think" in text:
                in_reasoning = True
            
            if in_reasoning:
                reasoning_buffer += text
                frappe.realtime.emit(
                    'ai_progress',
                    {
                        'type': 'reasoning',
                        'text': text,
                        'partial': True,
                        'task_id': task_id
                    },
                    user=user
                )
            else:
                frappe.realtime.emit(
                    'ai_progress',
                    {
                        'type': 'text',
                        'text': text,
                        'partial': True,
                        'task_id': task_id
                    },
                    user=user
                )
            
            frappe.db.commit()
            
            if "</thinking>" in text or in_reasoning and len(reasoning_buffer) > 500:
                in_reasoning = False
    
    return full_text
```

## Frontend Integration (Already Implemented)

The frontend already has these listeners in place:

### WebSocket Listener (src/core/ConversationTask.js)

```javascript
// Already listening for ai_progress events
this.realtimeManager.on('ai_progress', (data) => {
    if (data.type === 'reasoning') {
        // Update reasoning block
        this.sidebar.say('thinking', data.text, [], data.partial);
    } else if (data.type === 'text') {
        // Update response text
        this.sidebar.say('text', data.text, [], data.partial);
    }
});
```

### ReasoningBlock Component (webview-ui/src/components/chat/ReasoningBlock.tsx)

```typescript
// Already rendering reasoning with timer
const ReasoningBlock = ({ reasoning, isStreaming }) => {
    const [elapsed, setElapsed] = useState(0);
    
    useEffect(() => {
        if (isStreaming) {
            const interval = setInterval(() => {
                setElapsed(prev => prev + 1);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [isStreaming]);
    
    return (
        <div className="reasoning-block">
            <div className="thinking-indicator">
                💭 Thinking {elapsed}s
            </div>
            <div className="reasoning-content">
                {reasoning}
            </div>
        </div>
    );
};
```

## Testing the Implementation

### 1. Backend Test

```python
# Test WebSocket emission
@frappe.whitelist()
def test_reasoning_stream():
    """Test reasoning emission"""
    user = frappe.session.user
    task_id = "test_task"
    
    # Emit test reasoning chunks
    for i in range(5):
        frappe.realtime.emit(
            'ai_progress',
            {
                'type': 'reasoning',
                'text': f'Thinking step {i+1}...\n',
                'partial': True,
                'task_id': task_id
            },
            user=user
        )
        frappe.db.commit()
        import time
        time.sleep(1)
    
    # Final completion
    frappe.realtime.emit(
        'ai_progress',
        {
            'type': 'completion',
            'text': 'All done!',
            'partial': False,
            'task_id': task_id
        },
        user=user
    )
    
    return {'success': True}
```

### 2. Frontend Verification

Check Developer Console for these logs:

```
✅ [RealtimeManager] Connected to realtime server
🆔 [RealtimeManager] Socket ID: [some-id]
🔥 [ConversationTask] Setting up ai_progress listener...
💭 [Received] ai_progress: {type: 'reasoning', text: 'Thinking...'}
```

### 3. Expected UI Behavior

1. **Before reasoning**: No indicator visible
2. **During reasoning**: 
   ```
   💭 Thinking 3s
   Analyzing the user request...
   Considering the file structure...
   Planning the implementation...
   ```
3. **After reasoning**: Indicator disappears, response shown

## Common Issues & Solutions

### Issue 1: No WebSocket Events Received

**Symptom**: Frontend shows "Socket connected" but no `ai_progress` events

**Solution**:
```python
# Ensure you're committing after each emit
frappe.realtime.emit('ai_progress', data, user=user)
frappe.db.commit()  # CRITICAL!
```

### Issue 2: Events Arrive but No UI Update

**Symptom**: Console shows events but thinking indicator doesn't appear

**Check**:
1. Event type is exactly `'reasoning'` (lowercase)
2. Data includes `partial: True`
3. Frontend RealtimeManager is connected

### Issue 3: Reasoning Appears in Response Instead of Indicator

**Symptom**: Reasoning text mixed with response

**Solution**: Separate reasoning from response before emitting:
```python
# Parse model response
if '<thinking>' in response:
    reasoning_part = extract_between(response, '<thinking>', '</thinking>')
    response_part = response.replace(f'<thinking>{reasoning_part}</thinking>', '')
    
    # Emit separately
    emit_reasoning(reasoning_part)
    emit_text(response_part)
```

## Model-Specific Configurations

### DeepSeek Reasoner
- ✅ Native reasoning support
- Field: `delta.reasoning_content`
- Separate from response content

### OpenAI GPT-4
- ❌ No native reasoning field
- Use system prompt to encourage thinking
- Parse response for reasoning markers

### Anthropic Claude
- ⚠️ Thinking tags in response
- Parse `<thinking>` blocks
- Emit as reasoning chunks

### Google Gemini
- ⚠️ Similar to Claude
- May need parsing

## Performance Optimization

### 1. Batch Small Chunks

```python
reasoning_buffer = ""
buffer_size = 50  # chars

for chunk in stream:
    reasoning_buffer += chunk.reasoning_content
    
    if len(reasoning_buffer) >= buffer_size:
        frappe.realtime.emit('ai_progress', {
            'type': 'reasoning',
            'text': reasoning_buffer,
            'partial': True
        }, user=user)
        reasoning_buffer = ""
        frappe.db.commit()
```

### 2. Throttle Emissions

```python
import time

last_emit = time.time()
emit_interval = 0.1  # 100ms

if time.time() - last_emit > emit_interval:
    frappe.realtime.emit(...)
    frappe.db.commit()
    last_emit = time.time()
```

## Next Steps

1. **Implement Backend**: Add WebSocket emissions to your chat endpoint
2. **Test Locally**: Use `test_reasoning_stream()` endpoint
3. **Verify Frontend**: Check Developer Console for events
4. **Deploy**: Push backend changes to production
5. **Monitor**: Watch for `ai_progress` events in logs

## Reference Implementation

See the complete reference in:
- `ROO_CODE_INTEGRATION_ANALYSIS.md` - Section 7 (Backend SSE Streaming)
- Frontend code already implements all listeners
- All UI components ready (ReasoningBlock, ThinkingIndicator)

## Support

If you encounter issues:
1. Check WebSocket connection logs
2. Verify `ai_progress` events in browser console
3. Ensure `frappe.db.commit()` after each emit
4. Confirm event structure matches frontend expectations

---

**Status**: Frontend ✅ Ready | Backend ⏳ Needs Implementation

The frontend extension is **fully prepared** to display reasoning. You only need to implement the backend WebSocket emissions as shown in this guide.
