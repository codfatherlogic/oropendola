# Backend Fixes Required

## Issues Identified

### 1. ❌ Image Attachments Not Being Analyzed
**Problem:** When user attaches images, the AI doesn't analyze them

**Frontend sends:**
```javascript
{
    type: 'sendMessage',
    text: "Create POS App...",
    attachments: [{
        name: "interface.png",
        type: "image/png",
        content: "data:image/png;base64,iVBORw0KG...",
        isImage: true
    }]
}
```

**Backend needs to:**
- Extract base64 image data from attachments
- Convert to format AI provider accepts (OpenAI Vision, Claude Vision, etc.)
- Include images in the AI request
- Use vision-capable models (gpt-4-vision, claude-3-opus, etc.)

**Fix in `ai_assistant.api.chat`:**
```python
@frappe.whitelist(allow_guest=False)
def chat(messages=None, message=None, conversation_id=None, mode='agent', context=None):
    # Parse attachments from context
    attachments = []
    if context:
        ctx = json.loads(context) if isinstance(context, str) else context
        attachments = ctx.get('attachments', [])
    
    # Process images for vision models
    image_contents = []
    for att in attachments:
        if att.get('isImage') and att.get('content'):
            # Extract base64 data
            base64_data = att['content'].split(',')[1] if ',' in att['content'] else att['content']
            image_contents.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:{att['type']};base64,{base64_data}"
                }
            })
    
    # Add images to the last user message
    if image_contents and messages:
        last_msg = messages[-1]
        if last_msg['role'] == 'user':
            # Convert simple text to multi-part content
            last_msg['content'] = [
                {"type": "text", "text": last_msg['content']},
                *image_contents
            ]
```

---

### 2. ❌ Files Created All at Once (No Streaming)
**Problem:** All files appear instantly instead of one-by-one

**Current behavior:**
```
✅ create_file: package.json
✅ create_file: main.js  
✅ create_file: index.html
✅ create_file: styles.css
✅ create_file: renderer.js
[All appear at same time]
```

**Expected behavior:**
```
Creating package.json... ✅
Creating main.js... ✅
Creating index.html... ✅
[Each appears as it's being processed]
```

**Backend needs to implement Server-Sent Events (SSE) streaming:**

```python
from frappe import _

@frappe.whitelist(allow_guest=False)
def chat_stream(messages=None, message=None, conversation_id=None, mode='agent', context=None):
    """Streaming chat endpoint"""
    
    def generate():
        try:
            # Initialize AI client
            client = get_ai_client()
            
            # Stream AI response
            for chunk in client.chat.completions.create(
                model="gpt-4",
                messages=messages,
                stream=True
            ):
                content = chunk.choices[0].delta.content or ""
                
                # Send each chunk as SSE
                yield f"data: {json.dumps({'type': 'content', 'data': content})}\\n\\n"
            
            # Signal completion
            yield f"data: {json.dumps({'type': 'done'})}\\n\\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\\n\\n"
    
    # Return SSE response
    return frappe.response.Response(
        generate(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no'
        }
    )
```

**Frontend needs to consume SSE:**
(Already implemented in ConversationTask.js - just needs backend endpoint)

---

### 3. ❌ Tool Call Details Showing Instead of Clean Output
**Problem:** User sees raw tool calls instead of clean summaries

**Current output:**
```
tool_call {
  "action": "create_file",
  "path": "package.json",
  "content": {...}
}
```

**Expected output:**
```
✅ Created package.json
✅ Created main.js
```

**Backend needs to:**
1. Parse tool calls from AI response
2. Execute tool calls (create files, modify files, etc.)
3. Return clean status messages to frontend

**Fix:**
```python
def process_ai_response(ai_response):
    """Process AI response and extract/execute tool calls"""
    
    # Extract tool calls from response
    tool_calls = extract_tool_calls(ai_response)
    
    results = []
    for tool in tool_calls:
        if tool['action'] == 'create_file':
            # Execute file creation
            success = create_file(tool['path'], tool['content'])
            
            # Return clean message
            results.append({
                'type': 'tool_result',
                'action': 'create_file',
                'path': tool['path'],
                'success': success,
                'message': f"✅ Created {tool['path']}" if success else f"❌ Failed to create {tool['path']}"
            })
    
    # Return only clean messages to frontend
    return {
        'success': True,
        'response': "\\n".join([r['message'] for r in results]),
        'tool_results': results  # Optional: include detailed results
    }
```

---

### 4. ❌ "Oropendola AI Thinking" Position
**Status:** ✅ Already fixed on frontend
- Thinking indicator correctly appends to bottom of messages container
- Scrolls to bottom automatically
- If it appears at top, the issue is messages being inserted incorrectly

---

## Quick Test Checklist

To verify backend is working correctly:

### Test 1: Image Analysis
```bash
curl -X POST https://oropendola.ai/api/method/ai_assistant.api.chat \\
  -H "Cookie: sid=your_session_id" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [{"role": "user", "content": "What is in this image?"}],
    "mode": "agent",
    "context": "{\"attachments\": [{\"type\": \"image/png\", \"content\": \"data:image/png;base64,iVBORw0KG...\", \"isImage\": true}]}"
  }'
```

**Expected:** AI describes the image content

---

### Test 2: Streaming
```bash
curl -N https://oropendola.ai/api/method/ai_assistant.api.chat_stream \\
  -H "Cookie: sid=your_session_id" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [{"role": "user", "content": "Count to 5 slowly"}],
    "mode": "ask"
  }'
```

**Expected:** Response arrives incrementally, not all at once

---

### Test 3: Tool Execution
```bash
curl -X POST https://oropendola.ai/api/method/ai_assistant.api.chat \\
  -H "Cookie: sid=your_session_id" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [{"role": "user", "content": "Create a file called test.txt with content Hello"}],
    "mode": "agent"
  }'
```

**Expected:**
```json
{
  "success": true,
  "response": "✅ Created test.txt",
  "tool_results": [...]
}
```

**NOT:**
```json
{
  "response": "tool_call { action: create_file, path: test.txt ... }"
}
```

---

## Implementation Priority

1. **HIGH:** Fix tool call execution and clean output (Issue #3)
2. **HIGH:** Enable image analysis (Issue #1)  
3. **MEDIUM:** Implement streaming (Issue #2)
4. **LOW:** Verify thinking indicator position (already fixed on frontend)

---

## Frontend Status

✅ **Already implemented and working:**
- Image attachment upload (paste from clipboard, file picker)
- SSE streaming consumer (ready to receive streamed responses)
- Clean message display
- Thinking indicator at bottom
- Accept/Reject feedback buttons

⏳ **Waiting on backend:**
- Image processing
- Streaming endpoint
- Clean tool execution results
