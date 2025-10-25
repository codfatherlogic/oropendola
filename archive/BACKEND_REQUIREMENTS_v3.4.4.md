# Backend Requirements for v3.4.4 Features

**Date**: October 24, 2025
**Extension Version**: 3.4.4
**Priority**: Medium (1 new endpoint needed)

---

## Summary

The v3.4.4 frontend implementation adds **4 new features**. Most work locally, but **1 feature requires a new backend endpoint**.

---

## 🔴 **REQUIRED: New Backend Endpoint**

### **POST `/api/v1/summarize`** - Conversation Summarization

**Purpose**: Summarize long conversations to manage context window efficiently

**When Called**:
- Automatically when conversation exceeds 20 messages
- Automatically when conversation exceeds ~50,000 tokens

**Request Format**:
```json
POST https://oropendola.ai/api/v1/summarize
Content-Type: application/json
Cookie: <session_cookies>

{
  "text": "User: Create a POS app\\n\\nAssistant: I'll help you build...\\n\\nUser: Add inventory...\\n\\n...",
  "max_length": 500,
  "instruction": "Summarize this conversation between a user and AI assistant. Focus on: 1) User's goals and requests, 2) Key decisions made, 3) Important context established, 4) Current state of the work. Be concise but preserve critical details."
}
```

**Response Format**:
```json
{
  "summary": "User requested a POS application with Electron.js. Implemented database schema with SQLite, created product management UI with React, added inventory tracking, and discussed pricing calculations. Current state: Core features complete, working on customer management module."
}
```

**Alternative Response Formats** (all supported):
```json
// Option 1: "summary" field
{ "summary": "The summarized text..." }

// Option 2: "text" field
{ "text": "The summarized text..." }

// Option 3: Direct string (deprecated but supported)
"The summarized text..."
```

**Authentication**:
- Uses session cookies from authenticated user
- Same auth as existing `/api/chat` endpoint

**Implementation Suggestions**:

**Option A: Use Oropendola AI's Main Model**
```python
@app.route('/api/v1/summarize', methods=['POST'])
@require_auth  # Your existing auth decorator
def summarize_conversation():
    data = request.get_json()
    text = data.get('text', '')
    max_length = data.get('max_length', 500)
    instruction = data.get('instruction', '')

    # Use your existing AI model with summarization prompt
    prompt = f"{instruction}\\n\\nConversation:\\n{text}"

    summary = call_ai_model(
        prompt=prompt,
        max_tokens=max_length,
        temperature=0.3,  # Lower temp for consistent summarization
        user_id=current_user.id
    )

    return jsonify({"summary": summary})
```

**Option B: Use Dedicated Summarization Model** (cheaper/faster)
```python
from transformers import pipeline

# Initialize once at startup
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")

@app.route('/api/v1/summarize', methods=['POST'])
@require_auth
def summarize_conversation():
    data = request.get_json()
    text = data.get('text', '')
    max_length = data.get('max_length', 500)

    # Use local summarization model
    summary = summarizer(text, max_length=max_length, min_length=100)[0]['summary_text']

    return jsonify({"summary": summary})
```

**Error Handling**:
```python
try:
    summary = generate_summary(text)
    return jsonify({"summary": summary}), 200
except Exception as e:
    # Extension has fallback, but still return error info
    return jsonify({
        "error": str(e),
        "fallback": True
    }), 500
```

**Performance Requirements**:
- Response time: < 30 seconds (extension timeout)
- Concurrent requests: Handle 10+ simultaneous
- Rate limiting: Use existing user rate limits

**Testing**:
```bash
curl -X POST https://oropendola.ai/api/v1/summarize \
  -H "Content-Type: application/json" \
  -H "Cookie: session_cookie_here" \
  -d '{
    "text": "User: Create a web app\n\nAssistant: I can help with that...",
    "max_length": 500,
    "instruction": "Summarize this conversation"
  }'
```

---

## 🟢 **OPTIONAL: Enhanced Context Fields**

The extension now sends **5 additional context fields** to existing `/api/chat` endpoint. Backend doesn't need to change anything, but you can use these fields for better AI responses:

### 1. **`context.detectedFrameworks`** (array)
Frameworks detected in active file using Tree-sitter AST parsing

**Example**:
```json
{
  "context": {
    "detectedFrameworks": ["React", "Express"]
  }
}
```

**Use Case**: Backend can include framework-specific instructions in system prompt

---

### 2. **`context.workspaceFrameworks`** (array)
Frameworks detected across entire workspace

**Example**:
```json
{
  "context": {
    "workspaceFrameworks": ["React", "Express", "Next.js", "TypeScript"]
  }
}
```

**Use Case**: Understand full tech stack of user's project

---

### 3. **`context.terminalInfo`** (object)
Terminal state and recent output

**Example**:
```json
{
  "context": {
    "terminalInfo": {
      "hasActiveTerminal": true,
      "terminalName": "Oropendola AI",
      "terminalCount": 2,
      "lastCommand": "npm run build",
      "recentOutput": "✓ 409 modules transformed\n✓ built in 553ms\n..."
    }
  }
}
```

**Use Case**:
- AI can see terminal errors and suggest fixes
- AI knows what commands user just ran
- Better debugging assistance

---

### 4. **`context.openTabs`** (array)
Files currently open in user's editor

**Example**:
```json
{
  "context": {
    "openTabs": [
      {
        "path": "src/App.tsx",
        "language": "typescriptreact",
        "isDirty": true,
        "lineCount": 245
      },
      {
        "path": "src/components/Header.tsx",
        "language": "typescriptreact",
        "isDirty": false,
        "lineCount": 89
      }
    ]
  }
}
```

**Use Case**: AI knows what files user is working on simultaneously

---

### 5. **`context.recentActivity`** (object)
Recent commands executed in session

**Example**:
```json
{
  "context": {
    "recentActivity": {
      "commandCount": 5,
      "lastCommand": "git commit -m 'Add header component'",
      "timeRange": "1 hour"
    }
  }
}
```

**Use Case**: AI understands recent user actions

---

## Backend Changes Summary

### ✅ **Must Implement**
1. **New Endpoint**: `POST /api/v1/summarize`
   - Accepts conversation text
   - Returns summary (500 words max)
   - Uses session cookie auth

### 🔄 **Optional Enhancements**
2. Use `context.detectedFrameworks` for framework-specific prompts
3. Use `context.terminalInfo.recentOutput` for debugging help
4. Use `context.openTabs` for multi-file awareness
5. Use `context.recentActivity` for session context

### ❌ **No Changes Needed**
- Existing `/api/chat` endpoint works as-is
- New context fields are additive (won't break existing logic)
- Authentication remains unchanged

---

## Implementation Priority

### **Phase 1: Essential** (Week 1)
- [ ] Implement `/api/v1/summarize` endpoint
- [ ] Test with session cookie authentication
- [ ] Deploy to production

### **Phase 2: Optional** (Week 2)
- [ ] Add framework-specific prompts using `detectedFrameworks`
- [ ] Use terminal output for better error debugging
- [ ] Track usage metrics for new context fields

---

## Testing Checklist

### Summarize Endpoint
- [ ] Returns valid summary for short conversation (5 messages)
- [ ] Returns valid summary for long conversation (30+ messages)
- [ ] Handles conversation with 50,000+ characters
- [ ] Responds within 30 seconds
- [ ] Handles missing `instruction` field gracefully
- [ ] Returns error if authentication fails
- [ ] Rate limits work correctly

### Context Fields (Optional)
- [ ] Backend receives `detectedFrameworks` array
- [ ] Backend receives `terminalInfo.recentOutput` string
- [ ] Backend receives `openTabs` array
- [ ] Existing functionality not broken by new fields

---

## Example Backend Implementation (Python/Flask)

```python
from flask import Flask, request, jsonify
from functools import wraps
import anthropic  # Or your chosen LLM

app = Flask(__name__)

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        session = request.cookies.get('session')
        if not session or not validate_session(session):
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated

@app.route('/api/v1/summarize', methods=['POST'])
@require_auth
def summarize_conversation():
    """
    Summarize a conversation using AI
    """
    try:
        data = request.get_json()

        # Extract parameters
        text = data.get('text', '')
        max_length = data.get('max_length', 500)
        instruction = data.get('instruction', 'Summarize this conversation concisely.')

        # Validate input
        if not text:
            return jsonify({"error": "Missing 'text' field"}), 400

        if len(text) > 200000:  # ~50K tokens
            return jsonify({"error": "Text too long"}), 413

        # Call AI model for summarization
        client = anthropic.Anthropic(api_key=YOUR_API_KEY)

        response = client.messages.create(
            model="claude-3-haiku-20240307",  # Fast, cheap model for summarization
            max_tokens=max_length,
            temperature=0.3,
            messages=[{
                "role": "user",
                "content": f"{instruction}\\n\\nConversation to summarize:\\n{text}"
            }]
        )

        summary = response.content[0].text

        # Return summary
        return jsonify({"summary": summary}), 200

    except Exception as e:
        app.logger.error(f"Summarization error: {str(e)}")
        return jsonify({
            "error": "Summarization failed",
            "details": str(e)
        }), 500

# Optional: Enhanced context usage in existing chat endpoint
@app.route('/api/chat', methods=['POST'])
@require_auth
def chat():
    data = request.get_json()
    context = data.get('context', {})

    # NEW: Use detected frameworks for better prompts
    frameworks = context.get('detectedFrameworks', [])
    if frameworks:
        system_prompt += f"\\n\\nUser is working with: {', '.join(frameworks)}"

    # NEW: Use terminal output for debugging
    terminal_output = context.get('terminalInfo', {}).get('recentOutput', '')
    if 'error' in terminal_output.lower():
        system_prompt += "\\n\\nUser has recent terminal errors. Help debug."

    # Rest of your existing chat logic...
    return jsonify({"response": ai_response})
```

---

## Cost Estimates

### Summarize Endpoint
**Per Request**:
- Input: ~10,000 tokens (long conversation)
- Output: ~500 tokens (summary)
- Model: Claude Haiku (cheap)
- Cost: ~$0.001 per request

**Monthly** (assuming 1000 users, 10 condenses each):
- Requests: 10,000
- Cost: ~$10/month

**Alternative**: Use local summarization model (free)
- Model: BART, T5, or similar
- Cost: $0 (runs on your server)

---

## Rollback Plan

If `/api/v1/summarize` endpoint has issues:

1. Extension has **fallback mode** that generates basic summaries locally
2. No error messages shown to users (graceful degradation)
3. Feature continues working with reduced quality

**No backend endpoint = Feature still works** (just with basic summaries)

---

## Questions for Backend Team

1. **Model Choice**: Which LLM should we use for summarization?
   - Option A: Use main Oropendola AI model (Claude Sonnet)
   - Option B: Use cheaper model (Claude Haiku, GPT-3.5-turbo)
   - Option C: Use local summarization model (BART, T5)

2. **Rate Limiting**: Should summarization have separate rate limits?
   - Current: Auto-triggers every 20 messages
   - Impact: ~1 summarization per 2-3 hour session

3. **Logging**: Should we log summarization requests for analytics?
   - Track: Conversation length, summary length, response time
   - Privacy: Don't log actual conversation content

4. **Deployment**: Timeline for `/api/v1/summarize` endpoint?
   - Target: This week? Next week?

---

## Contact

**Frontend Implementation**: Complete ✅
**Backend Implementation**: Waiting for `/api/v1/summarize` endpoint

**Questions?** Check:
- [ConversationCondenser.js](src/services/condense/ConversationCondenser.js) - Frontend implementation
- [OROPENDOLA_AI_EXCLUSIVE_v3.4.4.md](OROPENDOLA_AI_EXCLUSIVE_v3.4.4.md) - API exclusivity details

---

**Status**: 🟡 Waiting for Backend
**Priority**: Medium
**Blocking**: Auto-condense feature (has fallback)
**Timeline**: 1-2 days for backend implementation
