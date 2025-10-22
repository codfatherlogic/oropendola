# Backend API Setup for Oropendola AI Assistant

## Overview

Your VS Code extension (v1.5.3) now works with Frappe's standard login. But for full functionality, you'll need to create these backend API endpoints in your Frappe app.

## File Structure

```
frappe-bench/
└── apps/
    └── ai_assistant/
        └── ai_assistant/
            ├── api.py  ← Create this file
            └── hooks.py
```

## Create `api.py`

Create this file at: `apps/ai_assistant/ai_assistant/api.py`

```python
import frappe
from frappe import _
import json

# ============================================
# AUTHENTICATION
# ============================================

@frappe.whitelist(allow_guest=True)
def login(usr, pwd):
    """
    Login endpoint for Oropendola AI Assistant
    """
    try:
        # Authenticate user
        frappe.local.login_manager.authenticate(usr, pwd)
        frappe.local.login_manager.post_login()
        
        # Get user details
        user = frappe.get_doc("User", usr)
        
        # Generate API key and secret if not exists
        if not user.api_key:
            user.api_key = frappe.generate_hash(length=15)
            user.api_secret = frappe.generate_hash(length=15)
            user.save(ignore_permissions=True)
        
        return {
            "success": True,
            "full_name": user.full_name,
            "email": user.email,
            "api_key": user.api_key,
            "api_secret": user.api_secret,
            "token": user.api_key
        }
        
    except frappe.exceptions.AuthenticationError:
        frappe.throw(_("Invalid email or password"), frappe.AuthenticationError)


# ============================================
# CHAT / AI ENDPOINTS
# ============================================

@frappe.whitelist()
def chat(message, context=None):
    """
    Main chat endpoint for AI assistant
    
    Args:
        message (str): User's message
        context (dict): Optional context (current file, workspace, etc.)
    
    Returns:
        dict: AI response with content and metadata
    """
    # Verify authentication
    if not frappe.session.user or frappe.session.user == "Guest":
        frappe.throw(_("Authentication required"), frappe.PermissionError)
    
    try:
        # TODO: Integrate with your AI service (OpenAI, Claude, etc.)
        # Example:
        # from openai import OpenAI
        # client = OpenAI(api_key=get_api_key())
        # response = client.chat.completions.create(...)
        
        # For now, return a mock response
        return {
            "success": True,
            "content": f"Echo: {message}",
            "model": "mock-model",
            "usage": {
                "prompt_tokens": 10,
                "completion_tokens": 20,
                "total_tokens": 30
            }
        }
        
    except Exception as e:
        frappe.log_error(f"Chat error: {str(e)}")
        frappe.throw(_("Failed to process chat request"))


@frappe.whitelist()
def stream_chat(message, context=None):
    """
    Streaming chat endpoint for real-time responses
    
    Args:
        message (str): User's message
        context (dict): Optional context
    
    Yields:
        str: Server-sent events (SSE) format
    """
    # Verify authentication
    if not frappe.session.user or frappe.session.user == "Guest":
        frappe.throw(_("Authentication required"), frappe.PermissionError)
    
    try:
        # TODO: Implement streaming response
        # Example with OpenAI:
        # for chunk in client.chat.completions.create(stream=True, ...):
        #     yield f"data: {json.dumps({'content': chunk.choices[0].delta.content})}\n\n"
        
        # Mock streaming response
        words = "This is a mock streaming response".split()
        for word in words:
            yield f"data: {json.dumps({'content': word + ' '})}\n\n"
        
        yield "data: [DONE]\n\n"
        
    except Exception as e:
        frappe.log_error(f"Stream chat error: {str(e)}")
        yield f"data: {json.dumps({'error': str(e)})}\n\n"


# ============================================
# CODE ANALYSIS
# ============================================

@frappe.whitelist()
def analyze_code(code, language, task):
    """
    Analyze code and provide insights
    
    Args:
        code (str): Code to analyze
        language (str): Programming language
        task (str): 'explain', 'fix', 'improve', etc.
    
    Returns:
        dict: Analysis results
    """
    if not frappe.session.user or frappe.session.user == "Guest":
        frappe.throw(_("Authentication required"), frappe.PermissionError)
    
    try:
        # TODO: Implement code analysis with AI
        return {
            "success": True,
            "analysis": f"Analysis of {language} code: {task}",
            "suggestions": [
                "Consider adding error handling",
                "Could optimize performance"
            ]
        }
        
    except Exception as e:
        frappe.log_error(f"Code analysis error: {str(e)}")
        frappe.throw(_("Failed to analyze code"))


# ============================================
# REPOSITORY / WORKSPACE
# ============================================

@frappe.whitelist()
def analyze_repository(repo_path, options=None):
    """
    Analyze repository structure and contents
    
    Args:
        repo_path (str): Path to repository
        options (dict): Analysis options
    
    Returns:
        dict: Repository analysis
    """
    if not frappe.session.user or frappe.session.user == "Guest":
        frappe.throw(_("Authentication required"), frappe.PermissionError)
    
    try:
        # TODO: Implement repository analysis
        return {
            "success": True,
            "structure": {
                "total_files": 0,
                "languages": {},
                "frameworks": []
            },
            "insights": []
        }
        
    except Exception as e:
        frappe.log_error(f"Repository analysis error: {str(e)}")
        frappe.throw(_("Failed to analyze repository"))


@frappe.whitelist()
def get_workspace_context():
    """
    Get current workspace context for the user
    
    Returns:
        dict: Workspace information
    """
    if not frappe.session.user or frappe.session.user == "Guest":
        frappe.throw(_("Authentication required"), frappe.PermissionError)
    
    try:
        # Get user's recent activity, projects, etc.
        return {
            "success": True,
            "user": frappe.session.user,
            "recent_projects": [],
            "preferences": {}
        }
        
    except Exception as e:
        frappe.log_error(f"Get context error: {str(e)}")
        frappe.throw(_("Failed to get workspace context"))


# ============================================
# GITHUB INTEGRATION
# ============================================

@frappe.whitelist()
def github_connect(token):
    """
    Connect GitHub account
    
    Args:
        token (str): GitHub personal access token
    
    Returns:
        dict: Connection status
    """
    if not frappe.session.user or frappe.session.user == "Guest":
        frappe.throw(_("Authentication required"), frappe.PermissionError)
    
    try:
        # TODO: Validate and store GitHub token
        # Store encrypted in User or custom DocType
        return {
            "success": True,
            "message": "GitHub connected successfully"
        }
        
    except Exception as e:
        frappe.log_error(f"GitHub connect error: {str(e)}")
        frappe.throw(_("Failed to connect GitHub"))


@frappe.whitelist()
def github_list_repos():
    """
    List user's GitHub repositories
    
    Returns:
        list: Repository list
    """
    if not frappe.session.user or frappe.session.user == "Guest":
        frappe.throw(_("Authentication required"), frappe.PermissionError)
    
    try:
        # TODO: Fetch from GitHub API using stored token
        return {
            "success": True,
            "repositories": []
        }
        
    except Exception as e:
        frappe.log_error(f"GitHub list error: {str(e)}")
        frappe.throw(_("Failed to list repositories"))
```

## Installation Steps

### 1. Create the API file
```bash
cd frappe-bench/apps/ai_assistant
touch ai_assistant/api.py
# Then copy the code above into it
```

### 2. Restart bench
```bash
bench restart
```

### 3. Test the endpoint
```bash
# Test login endpoint
curl -X POST http://localhost:8000/api/method/ai_assistant.api.login \
  -H "Content-Type: application/json" \
  -d '{"usr": "your@email.com", "pwd": "your_password"}'

# Test chat endpoint (after login)
curl -X POST http://localhost:8000/api/method/ai_assistant.api.chat \
  -H "Content-Type: application/json" \
  -H "Cookie: sid=YOUR_SESSION_ID" \
  -d '{"message": "Hello!"}'
```

## Required Packages

Add to `apps/ai_assistant/requirements.txt`:

```txt
openai>=1.0.0  # If using OpenAI
anthropic>=0.5.0  # If using Claude
requests>=2.31.0
PyGithub>=2.0.0  # For GitHub integration
```

Install:
```bash
cd frappe-bench
bench pip install -r apps/ai_assistant/requirements.txt
bench restart
```

## Environment Variables

Add to `frappe-bench/sites/common_site_config.json`:

```json
{
    "ai_settings": {
        "openai_api_key": "sk-...",
        "default_model": "gpt-4",
        "max_tokens": 2000
    }
}
```

Or use `.env`:
```bash
# frappe-bench/.env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

## Testing Checklist

1. **Login works** ✓
   - Standard Frappe login: `/api/method/login`
   - Custom login: `/api/method/ai_assistant.api.login`

2. **Chat endpoint**
   ```bash
   POST /api/method/ai_assistant.api.chat
   ```

3. **Streaming chat**
   ```bash
   POST /api/method/ai_assistant.api.stream_chat
   ```

4. **Code analysis**
   ```bash
   POST /api/method/ai_assistant.api.analyze_code
   ```

## Security Notes

1. **API Key Storage**: Store API keys encrypted in Frappe
2. **Rate Limiting**: Add rate limits to prevent abuse
3. **Authentication**: All endpoints check `frappe.session.user`
4. **CORS**: Configure for VS Code extension origin
5. **Logging**: Log all API calls for debugging

## Next Steps

1. ✅ Install v1.5.3 extension (uses standard Frappe login)
2. 📝 Create `api.py` with the code above
3. 🔧 Integrate with your AI provider (OpenAI, Claude, etc.)
4. 🧪 Test each endpoint individually
5. 🎨 Customize responses for your use case

---

**Questions?** Let me know which part you want to implement first!
