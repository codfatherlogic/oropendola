# 🚀 Backend Deployment Instructions

## Critical Issue
Your VSCode extension is working correctly, but the **backend API is not implemented** on your Frappe server at `https://oropendola.ai`.

## Error
```
❌ AI request error: No AI response in server reply
```

This happens because the backend endpoint `/api/method/ai_assistant.api.chat` either:
- Doesn't exist
- Exists but returns wrong format
- The AI model call is failing

---

## 📋 Step-by-Step Deployment

### Step 1: SSH into Your Server
```bash
ssh your-user@oropendola.ai
# Replace 'your-user' with your actual username
```

### Step 2: Navigate to Your Frappe App
```bash
cd ~/frappe-bench/apps/ai_assistant/ai_assistant/
```

### Step 3: Backup Current API File (if it exists)
```bash
cp api.py api.py.backup.$(date +%Y%m%d_%H%M%S)
# This creates a timestamped backup
```

### Step 4: Edit or Create api.py
```bash
nano api.py
```

### Step 5: Paste the Following Code

**Copy the entire content from `backend_chat_api_fix.py`** OR use this minimal working version:

```python
import frappe
from frappe import _
import json


@frappe.whitelist(allow_guest=False)
def chat(messages=None, message=None, conversation_id=None, mode='agent', context=None):
    """
    AI Chat API - Enhanced to support conversation history
    
    Args:
        messages (list): Conversation history (preferred)
        message (str): Single message (fallback)
        conversation_id (str): Conversation ID for context
        mode (str): 'agent' or 'ask'
        context (dict): Workspace and file context
    
    Returns:
        dict: {'success': True, 'response': str, 'conversation_id': str}
    """
    try:
        # === Parse messages ===
        if messages is None and message is not None:
            messages = [{"role": "user", "content": message}]
        elif messages is not None:
            if isinstance(messages, str):
                messages = json.loads(messages)
        else:
            frappe.throw("Either 'messages' or 'message' parameter is required")
        
        if not isinstance(messages, list) or len(messages) == 0:
            frappe.throw("Messages must be a non-empty array")
        
        # === Log request ===
        frappe.logger().info(f"[AI Chat] Conversation: {conversation_id}, Mode: {mode}")
        frappe.logger().info(f"[AI Chat] Messages: {len(messages)}")
        
        # === Build conversation for AI ===
        conversation_history = []
        for msg in messages:
            role = msg.get('role', 'user')
            content = msg.get('content', '')
            
            # Map 'tool_result' to 'user' for AI
            if role == 'tool_result':
                role = 'user'
            
            conversation_history.append({'role': role, 'content': content})
        
        # === Call AI model ===
        ai_response = call_ai_model(
            messages=conversation_history,
            conversation_id=conversation_id,
            mode=mode,
            context=context
        )
        
        # === Generate conversation ID ===
        if not conversation_id:
            conversation_id = frappe.generate_hash(length=12)
        
        # === Return response ===
        frappe.logger().info(f"[AI Chat] Success ({len(ai_response)} chars)")
        
        return {
            'success': True,
            'response': ai_response,  # ← CRITICAL: Must be 'response' key
            'conversation_id': conversation_id
        }
        
    except Exception as e:
        frappe.logger().error(f"[AI Chat] Error: {str(e)}")
        frappe.log_error(title="AI Chat Error", message=str(e))
        
        return {
            'success': False,
            'error': str(e),
            'conversation_id': conversation_id
        }


def call_ai_model(messages, conversation_id, mode, context=None):
    """
    Call your AI model - REPLACE THIS WITH YOUR ACTUAL IMPLEMENTATION
    
    Options:
    1. OpenAI API
    2. Anthropic Claude
    3. Google Gemini
    4. Local model (Ollama, etc.)
    """
    
    # === OPTION 1: OpenAI (Recommended) ===
    try:
        import openai
        
        # Get API key from Frappe settings
        api_key = frappe.conf.get("openai_api_key") or frappe.db.get_single_value("AI Settings", "openai_api_key")
        
        if not api_key:
            raise Exception("OpenAI API key not configured. Add 'openai_api_key' to site_config.json")
        
        client = openai.OpenAI(api_key=api_key)
        
        # Build system prompt
        system_prompt = get_system_prompt(mode, context)
        
        # Prepare messages
        api_messages = [{"role": "system", "content": system_prompt}]
        api_messages.extend(messages)
        
        # Call OpenAI
        response = client.chat.completions.create(
            model="gpt-4",  # or "gpt-3.5-turbo"
            messages=api_messages,
            temperature=0.7,
            max_tokens=4096
        )
        
        ai_response = response.choices[0].message.content
        
        frappe.logger().info(f"[AI] OpenAI response: {len(ai_response)} chars")
        
        return ai_response
        
    except ImportError:
        frappe.logger().error("[AI] OpenAI library not installed. Run: pip install openai")
        raise Exception("OpenAI library not installed on server")
    
    except Exception as e:
        frappe.logger().error(f"[AI] Error: {str(e)}")
        raise


def get_system_prompt(mode, context=None):
    """Generate system prompt based on mode"""
    
    if mode == 'agent':
        prompt = """You are an AI coding assistant with file manipulation capabilities.

**Agent Mode - You can perform actions:**
- Create files: Use tool_call blocks
- Modify files: Use tool_call blocks  
- Read files: Use tool_call blocks

**Tool Call Format:**
```tool_call
{
  "action": "create_file",
  "path": "path/to/file.js",
  "content": "file content here",
  "description": "What this file does"
}
```

**Available Actions:**
- create_file: Create new file
- modify_file: Edit existing file
- read_file: Read file contents

Work step-by-step to complete tasks."""
    
    else:  # ask mode
        prompt = """You are an AI coding assistant in read-only mode.

**Ask Mode - Read-only:**
- NO file creation/modification
- Provide answers and explanations only
- Help understand code and concepts

Be helpful and educational."""
    
    # Add context
    if context:
        workspace = context.get('workspace')
        active_file = context.get('activeFile')
        
        if workspace:
            prompt += f"\n\nWorkspace: {workspace}"
        if active_file:
            prompt += f"\nActive file: {active_file.get('path')}"
    
    return prompt


# === OPTION 2: For Testing - Mock Response ===
# Uncomment this to test without AI API
"""
def call_ai_model(messages, conversation_id, mode, context=None):
    last_message = messages[-1]['content'] if messages else ""
    
    return f\"\"\"I received your message: "{last_message[:100]}"

This is a test response from the backend. To use real AI:
1. Configure OpenAI API key in site_config.json
2. Install: bench pip install openai
3. Restart: bench restart

**Test Tool Call:**
```tool_call
{{
  "action": "create_file",
  "path": "test.txt",
  "content": "Hello from Oropendola!",
  "description": "Test file"
}}
```
\"\"\"
"""
```

### Step 6: Save and Exit
```bash
# In nano editor:
Ctrl + X  # Exit
Y         # Confirm save
Enter     # Confirm filename
```

### Step 7: Install OpenAI Library (if using OpenAI)
```bash
cd ~/frappe-bench
bench pip install openai
```

### Step 8: Configure API Key

**Option A: In site_config.json** (Recommended)
```bash
cd ~/frappe-bench/sites/your-site-name/
nano site_config.json
```

Add this line:
```json
{
  // ... existing config ...
  "openai_api_key": "sk-YOUR-OPENAI-API-KEY-HERE"
}
```

**Option B: In Frappe Settings** (via UI)
1. Login to Frappe at https://oropendola.ai
2. Go to "AI Settings" doctype (create if doesn't exist)
3. Add field "openai_api_key"
4. Save your API key

### Step 9: Restart Frappe
```bash
cd ~/frappe-bench
bench restart
```

### Step 10: Test the API

**From terminal:**
```bash
curl -X POST https://oropendola.ai/api/method/ai_assistant.api.chat \
  -H "Content-Type: application/json" \
  -H "Cookie: sid=YOUR_SESSION_ID" \
  -d '{
    "messages": [{"role": "user", "content": "Hello, can you help me?"}],
    "mode": "ask"
  }'
```

**Expected response:**
```json
{
  "message": {
    "success": true,
    "response": "Hello! I'd be happy to help you...",
    "conversation_id": "abc123xyz"
  }
}
```

---

## 🔍 Debugging

### Check Frappe Logs
```bash
# Real-time logs
tail -f ~/frappe-bench/sites/your-site-name/logs/web.log

# Error logs
tail -f ~/frappe-bench/sites/your-site-name/logs/error.log
```

### Test from VSCode Extension
1. Open VSCode
2. Open Oropendola AI sidebar
3. Send message: "Hello"
4. Check browser console (Cmd+Option+I)
5. Check extension logs in VSCode Output panel

### Common Issues

#### 1. "Module 'openai' not found"
```bash
cd ~/frappe-bench
bench pip install openai
bench restart
```

#### 2. "API key not configured"
- Add to `site_config.json` as shown above
- Or create AI Settings doctype

#### 3. "AttributeError: module 'ai_assistant.api' has no attribute 'chat'"
- File not in correct location
- Should be: `~/frappe-bench/apps/ai_assistant/ai_assistant/api.py`
- Restart: `bench restart`

#### 4. Still getting "No AI response"
- Check the response format in logs
- Must return: `{'success': True, 'response': 'text here'}`
- Frappe wraps it in `message` key automatically

---

## 🧪 Testing Checklist

- [ ] Backend API file created at correct path
- [ ] OpenAI library installed (`bench pip install openai`)
- [ ] API key configured in `site_config.json`
- [ ] Frappe restarted (`bench restart`)
- [ ] Test with curl command returns valid response
- [ ] VSCode extension connects successfully
- [ ] Chat messages receive AI responses
- [ ] Tool calls work (create_file, etc.)

---

## 🚨 Quick Test (Without OpenAI)

If you want to test the backend without OpenAI API:

1. Use the mock response version in the code above
2. Comment out the OpenAI code
3. Uncomment the mock `call_ai_model` function
4. Restart Frappe
5. Test in VSCode - you should get mock responses

This proves the backend is working before adding real AI.

---

## 📞 Need Help?

If deployment doesn't work:
1. Share Frappe logs: `~/frappe-bench/sites/*/logs/web.log`
2. Share curl test output
3. Share VSCode console errors
4. Confirm file locations and permissions

---

## ✅ Success Indicators

You'll know it's working when:
1. ✅ No errors in Frappe logs
2. ✅ Curl test returns valid JSON
3. ✅ VSCode chat gets AI responses
4. ✅ Tool calls execute (files created)
5. ✅ Conversation continues (multi-turn works)
