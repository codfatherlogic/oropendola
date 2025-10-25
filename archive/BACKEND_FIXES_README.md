# Backend Fixes Required - Oropendola AI Extension

## 🎯 Overview

Your **frontend (VS Code extension)** is complete with dynamic framework understanding. However, your **backend (Frappe server)** requires 2 critical fixes to work properly.

---

## ✅ Frontend Status (COMPLETE)

### **Implemented Features:**

| Feature | Status | Description |
|---------|--------|-------------|
| **Dynamic Pattern Discovery** | ✅ Complete | Analyzes ANY codebase (Python, JS, Go, etc.) |
| **CodebasePatternAnalyzer** | ✅ Implemented | Discovers dependencies, file patterns, imports |
| **DynamicContextBuilder** | ✅ Implemented | Builds AI context from real code examples |
| **ConversationTask Integration** | ✅ Complete | System prompt includes dynamic analysis |
| **Smart Report Generation** | ✅ Complete | Only complex tasks generate reports |

### **How Dynamic Discovery Works:**

```
User opens ANY project (Frappe, Django, Laravel, Rails, Go, etc.)
  ↓
CodebasePatternAnalyzer scans:
  - Dependencies (requirements.txt, package.json, go.mod, etc.)
  - File patterns (*.doctype.py, *.component.tsx, etc.)
  - Import frequency ("import frappe" used 47 times)
  - Code examples (actual code from user's files)
  - Commands (bench, npm scripts, make targets)
  - Documentation (README content)
  ↓
DynamicContextBuilder formats discoveries:
  "I found these patterns:
   - Files: *.doctype.py (23 files)
   - Imports: 'frappe' used 47 times
   - Commands: bench migrate, bench new-app
   - Code example: [shows actual doctype code]
   Figure out what to do based on these patterns!"
  ↓
AI receives context and infers conventions
  ↓
AI generates code matching YOUR project style
```

**NO hardcoded knowledge. NO manual updates. Works with ANY framework!**

---

## ⚠️ Backend Fixes Required

Your backend server at `oropendola.ai` needs these fixes:

### **Fix #1: Image Attachment Processing** 🖼️

**Current Issue:**
```
User pastes image → Backend crashes
Error: 'list' object has no attribute 'strip'
```

**What's wrong:**
Backend code incorrectly calls `.strip()` on the attachments **list** instead of iterating through it.

**Bad code (current):**
```python
# ❌ WRONG
attachments = context.get('attachments')
if attachments:
    attachments.strip()  # ERROR: list has no .strip()
```

**Fixed code (needed):**
```python
# ✅ CORRECT
def process_image_attachments(context):
    attachments = context.get('attachments', [])

    if not isinstance(attachments, list):
        return []

    processed_images = []

    for attachment in attachments:
        if attachment.get('isImage'):
            content = attachment.get('content', '')
            # Extract base64 from data URL
            base64_data = content.split(',', 1)[1] if ',' in content else content

            processed_images.append({
                'type': 'image_url',
                'image_url': {
                    'url': f"data:{attachment['type']};base64,{base64_data}",
                    'detail': 'high'
                }
            })

    return processed_images
```

**Fix File:** [`BACKEND_IMAGE_ATTACHMENT_FIX.py`](BACKEND_IMAGE_ATTACHMENT_FIX.py)

**Impact:** Users can paste images and AI can analyze them (requires GPT-4V/Claude 3)

---

### **Fix #2: Tool Call Block Stripping** 🔧

**Current Issue:**
```
AI response includes tool calls
  ↓
User sees raw JSON in chat:
  "I'll create a file...

   ```tool_call
   {"action": "create_file", "path": "app.js"}
   ```

   Done!"
```

**What's wrong:**
Backend sends tool_call blocks to frontend instead of stripping them.

**Fixed code (needed):**
```python
def strip_tool_call_blocks(text):
    """Remove ```tool_call blocks from response"""
    pattern = r'```tool_call\s*\n.*?\n```'
    cleaned_text = re.sub(pattern, '', text, flags=re.DOTALL)
    cleaned_text = re.sub(r'\n{3,}', '\n\n', cleaned_text)
    return cleaned_text.strip()

def _parse_tool_calls(response_text):
    tool_calls = []

    # Extract tool calls
    pattern = r'```tool_call\s*\n(.*?)\n```'
    matches = re.finditer(pattern, response_text, re.DOTALL)

    for match in matches:
        tool_call = json.loads(match.group(1))
        tool_calls.append(tool_call)

    # ✨ Strip blocks from text
    cleaned_text = strip_tool_call_blocks(response_text)

    return cleaned_text, tool_calls
```

**Fix File:** [`BACKEND_TOOL_CALL_FIX.py`](BACKEND_TOOL_CALL_FIX.py)

**Impact:** Clean chat messages, tool calls execute silently in background

---

## 🚀 Deployment Instructions

### **Option 1: Manual Deployment (Recommended)**

#### Step 1: SSH to Backend
```bash
ssh your_username@oropendola.ai
cd ~/frappe-bench/apps/ai_assistant/ai_assistant/
```

#### Step 2: Backup Current Code
```bash
cp api.py api.py.backup.$(date +%Y%m%d_%H%M%S)
ls -lh api.py.backup.*
```

#### Step 3: Apply Fix #1 (Image Attachments)

Edit `api.py`:
```bash
nano api.py
```

Add these functions from [`BACKEND_IMAGE_ATTACHMENT_FIX.py`](BACKEND_IMAGE_ATTACHMENT_FIX.py):
- `process_image_attachments(context)` (lines 34-112)
- `build_multipart_message(text, images)` (lines 115-145)

Update `chat_completion()` endpoint:
```python
# BEFORE calling AI model, add:
processed_images = process_image_attachments(context)

if processed_images:
    text_content = messages[-1]['content']
    multi_part_content = build_multipart_message(text_content, processed_images)
    messages[-1] = {
        'role': 'user',
        'content': multi_part_content
    }
```

#### Step 4: Apply Fix #2 (Tool Call Stripping)

Add this function from [`BACKEND_TOOL_CALL_FIX.py`](BACKEND_TOOL_CALL_FIX.py):
- `strip_tool_call_blocks(text)` (lines 27-67)

Update `_parse_tool_calls()`:
```python
def _parse_tool_calls(response_text):
    tool_calls = []

    # ... existing code to extract tool calls ...

    # ✨ NEW: Strip tool_call blocks
    cleaned_text = strip_tool_call_blocks(response_text)

    return cleaned_text, tool_calls
```

Update `chat()` endpoint to use cleaned text:
```python
ai_response_clean, tool_calls = _parse_tool_calls(ai_response_raw)

return {
    'success': True,
    'role': 'assistant',
    'content': ai_response_clean,  # ← CLEANED TEXT
    'tool_calls': tool_calls
}
```

#### Step 5: Test Functions
```bash
bench console
```

```python
>>> from ai_assistant.api import test_image_processing
>>> test_image_processing()

# Expected output:
# ✅ Input: 1 attachment(s)
# ✅ Output: 1 processed image(s)
# ✅ Message structure: [{'type': 'text', ...}, {'type': 'image_url', ...}]
```

#### Step 6: Restart Backend
```bash
bench restart
```

#### Step 7: Test in VS Code
1. Open Oropendola extension
2. Paste an image (Cmd+V / Ctrl+V)
3. Send message: "What's in this image?"
4. Should work without errors ✅
5. Chat should NOT show raw `tool_call` blocks ✅

---

### **Option 2: Automated Deployment Script**

Run the deployment script:
```bash
bash BACKEND_DEPLOYMENT_GUIDE.sh
```

This will:
- Backup current code
- Check for existing issues
- Provide step-by-step instructions
- Generate verification script

---

## 🧪 Testing & Verification

### **Test #1: Image Processing**

**Before fix:**
```
User: *pastes image*
Result: ❌ Error: 'list' object has no attribute 'strip'
```

**After fix:**
```
User: *pastes image* "What's in this screenshot?"
AI: "This appears to be a VS Code interface showing..." ✅
```

### **Test #2: Tool Call Stripping**

**Before fix:**
```
AI: I'll create a file...

```tool_call
{"action": "create_file", "path": "app.js"}
```

Done!
```

**After fix:**
```
AI: I'll create a file...

Done!
```
(Tool executes silently in background)

### **Verification Checklist**

Run this on backend after deployment:

```bash
#!/bin/bash
cd ~/frappe-bench/apps/ai_assistant/ai_assistant/

# Check functions exist
grep -q "def process_image_attachments" api.py && echo "✅ Image processing" || echo "❌ Missing"
grep -q "def strip_tool_call_blocks" api.py && echo "✅ Tool call stripping" || echo "❌ Missing"

# Check logs
tail -20 ~/frappe-bench/logs/*.log | grep -i "error" || echo "✅ No errors"

# Test in VS Code
echo "Now test in VS Code:
1. Paste image
2. Ask about image
3. Check for errors
4. Check chat for tool_call blocks"
```

---

## 📋 Complete File Reference

| File | Purpose | Lines |
|------|---------|-------|
| [BACKEND_IMAGE_ATTACHMENT_FIX.py](BACKEND_IMAGE_ATTACHMENT_FIX.py) | Complete image processing fix | 327 |
| [BACKEND_TOOL_CALL_FIX.py](BACKEND_TOOL_CALL_FIX.py) | Complete tool call stripping fix | 327 |
| [IMAGE_ATTACHMENT_ANALYSIS.md](IMAGE_ATTACHMENT_ANALYSIS.md) | Detailed technical analysis | ~500 |
| [BACKEND_DEPLOYMENT_GUIDE.sh](BACKEND_DEPLOYMENT_GUIDE.sh) | Automated deployment script | 200+ |
| [BACKEND_FIXES_README.md](BACKEND_FIXES_README.md) | This file | - |

---

## 🔧 Technical Details

### **AI Model Requirements**

To analyze images, your backend must route to a **vision-enabled model**:

| Provider | Model | Supports Images |
|----------|-------|-----------------|
| OpenAI | `gpt-4o` | ✅ Multiple images |
| OpenAI | `gpt-4-vision-preview` | ✅ 1-10 images |
| Claude | `claude-3-opus-20240229` | ✅ Multiple images |
| Claude | `claude-3-sonnet-20240229` | ✅ Multiple images |
| Gemini | `gemini-pro-vision` | ✅ Multiple images |

Make sure your backend switches to a vision model when `processed_images` is not empty.

### **Message Format**

After fixes, messages with images use this format:

```python
{
    'role': 'user',
    'content': [
        {
            'type': 'text',
            'text': 'What is in this image?'
        },
        {
            'type': 'image_url',
            'image_url': {
                'url': 'data:image/png;base64,iVBORw0KGgo...',
                'detail': 'high'
            }
        }
    ]
}
```

This is compatible with OpenAI, Claude, and Gemini APIs.

---

## 🐛 Troubleshooting

### Issue: Still seeing `.strip()` error

**Cause:** Image processing fix not applied
**Solution:**
1. Verify `process_image_attachments()` exists in api.py
2. Check `chat_completion()` calls it before AI request
3. Restart bench: `bench restart`

### Issue: Still seeing tool_call blocks in chat

**Cause:** Tool call stripping not applied
**Solution:**
1. Verify `strip_tool_call_blocks()` exists in api.py
2. Check `_parse_tool_calls()` returns cleaned text
3. Check `chat()` endpoint uses `cleaned_text` not `raw_text`
4. Restart bench: `bench restart`

### Issue: AI can't analyze images

**Cause:** Not using vision-enabled model
**Solution:**
1. Check AI model configuration
2. Switch to GPT-4V, Claude 3, or Gemini Pro Vision
3. Verify model receives multi-part content

### Issue: Permission errors on file paths

**Cause:** AI generating absolute paths
**Solution:**
1. Verify `_sanitize_file_path()` is in api.py
2. Check tool calls use sanitized paths
3. Convert `/Users/john/project/app.js` → `app.js`

---

## 📊 Impact Summary

### **Before Fixes:**
- ❌ Image pasting crashes backend
- ❌ Raw tool_call JSON in chat
- ❌ Permission errors from absolute paths
- ❌ Poor user experience

### **After Fixes:**
- ✅ Images analyzed correctly
- ✅ Clean chat messages
- ✅ Relative paths used
- ✅ Smooth user experience
- ✅ Tool calls execute silently
- ✅ AI can see screenshots

---

## 🎯 Next Steps

1. **Review fix files:**
   - Read [BACKEND_IMAGE_ATTACHMENT_FIX.py](BACKEND_IMAGE_ATTACHMENT_FIX.py)
   - Read [BACKEND_TOOL_CALL_FIX.py](BACKEND_TOOL_CALL_FIX.py)

2. **Deploy to backend:**
   - SSH to `oropendola.ai`
   - Apply both fixes to `api.py`
   - Test functions
   - Restart bench

3. **Verify in VS Code:**
   - Test image pasting
   - Check chat messages are clean
   - Verify tools execute correctly

4. **Monitor logs:**
   ```bash
   tail -f ~/frappe-bench/logs/oropendola.ai.log
   ```

---

## 💡 Summary

**Frontend (VS Code Extension):** ✅ **COMPLETE**
- Dynamic framework understanding implemented
- Works with ANY language/framework
- No hardcoded knowledge
- Pattern discovery from actual codebase
- Smart report generation

**Backend (Frappe Server):** ⚠️ **FIXES NEEDED**
- Image attachment processing (327 lines)
- Tool call block stripping (327 lines)
- Both fixes documented and ready to deploy

**Deployment:** Manual application required
- SSH to backend
- Edit api.py
- Add functions from fix files
- Test and restart

**Result:** Fully functional AI assistant with dynamic framework understanding and proper image/tool handling

---

For detailed deployment instructions, run:
```bash
bash BACKEND_DEPLOYMENT_GUIDE.sh
```

For technical analysis, read:
- [IMAGE_ATTACHMENT_ANALYSIS.md](IMAGE_ATTACHMENT_ANALYSIS.md)
