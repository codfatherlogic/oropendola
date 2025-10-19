# ============================================
# CRITICAL BACKEND FIX - Conversation Flow
# ============================================
# File: ai_assistant/ai_assistant/api.py
# Purpose: Fix continuous AI conversation by accepting messages array
# 
# ⚠️ IMPORTANT: This is a PYTHON file for your Frappe backend server
#    The linter errors (frappe import, etc.) are EXPECTED and NORMAL
#    This file should NOT be in the VS Code extension - copy it to backend
# 
# ISSUE: Frontend now sends full conversation history as 'messages' array
#        Backend was expecting single 'message' string
# RESULT: AI couldn't see tool execution results, conversation stopped
#
# INSTRUCTIONS:
# 1. SSH into your backend server: ssh user@oropendola.ai
# 2. Navigate to: cd ~/frappe-bench/apps/ai_assistant/ai_assistant/
# 3. Backup current api.py: cp api.py api.py.backup
# 4. Edit api.py: nano api.py
# 5. Replace the chat() function with the code below
# 6. Save and restart: bench restart
# 7. Test in VS Code with "create full function app"
# ============================================

import frappe
from frappe import _
import json


@frappe.whitelist(allow_guest=False)
def chat(messages=None, message=None, conversation_id=None, mode='agent', context=None):
    """
    AI Chat API - Enhanced to support conversation history
    
    **NEW FORMAT** (v2.1.0+):
        messages: List of conversation messages including tool results
        Example: [
            {"role": "user", "content": "create app"},
            {"role": "assistant", "content": "Creating..."},
            {"role": "user", "content": "File created successfully"}  # Tool result
        ]
    
    **OLD FORMAT** (backwards compatible):
        message: Single message string
    
    Args:
        messages (list): Conversation history (preferred)
        message (str): Single message (fallback)
        conversation_id (str): Conversation ID for context
        mode (str): 'agent' or 'ask'
        context (dict): Workspace and file context
    
    Returns:
        dict: {
            'success': True,
            'response': str,  # AI response text
            'conversation_id': str
        }
    """
    try:
        # === STEP 1: Parse and validate messages ===
        
        # Convert old format to new format
        if messages is None and message is not None:
            frappe.logger().info("Using legacy single message format")
            messages = [{"role": "user", "content": message}]
        elif messages is not None:
            # Parse if JSON string
            if isinstance(messages, str):
                try:
                    messages = json.loads(messages)
                except json.JSONDecodeError:
                    frappe.throw("Invalid messages JSON format")
        else:
            frappe.throw("Either 'messages' or 'message' parameter is required")
        
        # Validate messages structure
        if not isinstance(messages, list) or len(messages) == 0:
            frappe.throw("Messages must be a non-empty array")
        
        # === STEP 2: Extract metadata ===
        
        last_message = messages[-1].get('content', '') if messages else ""
        message_count = len(messages)
        
        frappe.logger().info(f"[AI Chat] Conversation: {conversation_id}, Mode: {mode}")
        frappe.logger().info(f"[AI Chat] Messages in history: {message_count}")
        frappe.logger().info(f"[AI Chat] Last message: {last_message[:100]}...")
        
        # === STEP 3: Build AI conversation history ===
        
        conversation_history = []
        
        for msg in messages:
            role = msg.get('role', 'user')
            content = msg.get('content', '')
            
            # Map frontend roles to AI model roles
            # Frontend sends 'tool_result' which AI sees as 'user' message
            if role == 'tool_result':
                role = 'user'
                frappe.logger().info(f"[AI Chat] Tool result: {content[:100]}...")
            
            conversation_history.append({
                'role': role,
                'content': content
            })
        
        # === STEP 4: Call AI model ===
        
        frappe.logger().info(f"[AI Chat] Calling AI with {len(conversation_history)} messages")
        
        # TODO: Replace with your actual AI model call
        # This is where you integrate with OpenAI, Anthropic, or your custom model
        ai_response = call_ai_model(
            messages=conversation_history,
            conversation_id=conversation_id,
            mode=mode,
            context=context
        )
        
        # === STEP 5: Generate conversation ID if needed ===
        
        if not conversation_id:
            conversation_id = frappe.generate_hash(length=12)
            frappe.logger().info(f"[AI Chat] Generated new conversation ID: {conversation_id}")
        
        # === STEP 6: Store conversation (optional) ===
        
        try:
            store_conversation_history(
                conversation_id=conversation_id,
                messages=messages,
                ai_response=ai_response,
                mode=mode
            )
        except Exception as e:
            # Don't fail the request if storage fails
            frappe.log_error(f"Conversation storage failed: {str(e)}")
        
        # === STEP 7: Return response ===
        
        frappe.logger().info(f"[AI Chat] Response generated ({len(ai_response)} chars)")
        
        return {
            'success': True,
            'response': ai_response,
            'conversation_id': conversation_id,
            'message_count': message_count
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
    Call your AI model with conversation history
    
    This is a placeholder - replace with your actual AI integration
    (OpenAI, Anthropic, Google Gemini, local model, etc.)
    
    Args:
        messages (list): Conversation history
        conversation_id (str): Conversation ID
        mode (str): 'agent' or 'ask'
        context (dict): Additional context
    
    Returns:
        str: AI response text
    """
    # === EXAMPLE: OpenAI Integration ===
    
    try:
        import openai
        
        # Configure OpenAI (use your API key from settings)
        openai.api_key = frappe.conf.get("openai_api_key") or frappe.db.get_single_value("AI Settings", "openai_api_key")
        
        # Build system prompt based on mode
        system_prompt = get_system_prompt(mode, context)
        
        # Prepare messages for OpenAI
        openai_messages = [{"role": "system", "content": system_prompt}]
        openai_messages.extend(messages)
        
        # Call OpenAI
        response = openai.ChatCompletion.create(
            model="gpt-4",  # or gpt-3.5-turbo
            messages=openai_messages,
            temperature=0.7,
            max_tokens=4096
        )
        
        ai_response = response.choices[0].message.content
        
        frappe.logger().info(f"[AI Model] OpenAI response: {len(ai_response)} chars")
        
        return ai_response
        
    except Exception as e:
        frappe.logger().error(f"[AI Model] Error: {str(e)}")
        raise


def get_system_prompt(mode, context=None):
    """
    Generate system prompt based on mode and context
    
    Args:
        mode (str): 'agent' or 'ask'
        context (dict): Workspace context
    
    Returns:
        str: System prompt
    """
    if mode == 'agent':
        prompt = """You are an AI coding assistant with file manipulation capabilities.

**Agent Mode Rules:**
1. You CAN create, modify, and read files
2. Use tool calls to perform file operations
3. Work autonomously to complete multi-step tasks
4. After executing a tool, you will see the result and can continue

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
- create_file: Create a new file
- modify_file: Edit existing file
- read_file: Read file contents

**Important:**
- Always explain what you're doing before tool calls
- After seeing tool results, continue with next steps
- Keep building until task is complete
"""
    else:  # ask mode
        prompt = """You are an AI coding assistant in read-only mode.

**Ask Mode Rules:**
1. You CANNOT create, modify, or read files
2. Provide answers, explanations, and suggestions only
3. Help users understand code and best practices
4. NO tool calls allowed

Be helpful, clear, and educational."""
    
    # Add context if available
    if context:
        workspace = context.get('workspace')
        active_file = context.get('activeFile')
        
        if workspace:
            prompt += f"\n\nCurrent workspace: {workspace}"
        if active_file:
            prompt += f"\nActive file: {active_file.get('path')} ({active_file.get('language')})"
    
    return prompt


def store_conversation_history(conversation_id, messages, ai_response, mode):
    """
    Store conversation in database (optional)
    
    Args:
        conversation_id (str): Conversation ID
        messages (list): Message history
        ai_response (str): AI's response
        mode (str): Conversation mode
    """
    try:
        # Check if conversation exists
        if frappe.db.exists("AI Conversation", conversation_id):
            # Update existing
            doc = frappe.get_doc("AI Conversation", conversation_id)
        else:
            # Create new
            doc = frappe.new_doc("AI Conversation")
            doc.name = conversation_id
            doc.mode = mode
        
        # Update fields
        doc.message_count = len(messages)
        doc.last_message = messages[-1].get('content', '')[:500]  # Truncate
        doc.last_response = ai_response[:500]  # Truncate
        doc.modified = frappe.utils.now()
        
        # Save
        doc.save(ignore_permissions=True)
        frappe.db.commit()
        
        frappe.logger().info(f"[Storage] Conversation {conversation_id} saved")
        
    except Exception as e:
        frappe.logger().error(f"[Storage] Error: {str(e)}")
        # Don't fail - storage is optional


# ============================================
# TESTING
# ============================================
# Test with curl or Postman:
#
# curl -X POST https://oropendola.ai/api/method/ai_assistant.api.chat \
#   -H "Content-Type: application/json" \
#   -H "Cookie: sid=YOUR_SESSION_ID" \
#   -d '{
#     "messages": [
#       {"role": "user", "content": "create a hello world app"}
#     ],
#     "mode": "agent"
#   }'
#
# Expected response:
# {
#   "message": {
#     "success": true,
#     "response": "I'll create a hello world app...",
#     "conversation_id": "abc123"
#   }
# }
# ============================================

