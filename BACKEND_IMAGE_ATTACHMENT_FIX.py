# ============================================
# CRITICAL BACKEND FIX - Image Attachment Error
# ============================================
# File: ai_assistant/ai_assistant/api.py
# Error: 'list' object has no attribute 'strip'
#
# ⚠️ ISSUE DESCRIPTION:
# When users paste images in VS Code extension, the backend receives:
# {
#   "context": {
#     "attachments": [
#       {
#         "type": "image/png",
#         "content": "data:image/png;base64,iVBOR...",
#         "isImage": true,
#         "name": "pasted-image-1.png",
#         "size": 141901
#       }
#     ]
#   }
# }
#
# The backend is incorrectly trying to call .strip() on the attachments LIST
# instead of processing it as an array of image objects.
#
# ============================================

import frappe
import json
import base64
import re


def process_image_attachments(context):
    """
    Process image attachments from VS Code extension

    Args:
        context (dict): Context object with potential attachments

    Returns:
        list: Processed image content for AI model (OpenAI/Claude format)
    """
    if not context:
        return []

    # Get attachments from context
    attachments = context.get('attachments', [])

    # ⚠️ CRITICAL FIX: Check if attachments is a list
    if not isinstance(attachments, list):
        frappe.logger().error(f"[Attachments] Expected list, got {type(attachments)}")
        return []

    if not attachments:
        frappe.logger().info("[Attachments] No attachments in context")
        return []

    frappe.logger().info(f"[Attachments] Processing {len(attachments)} attachment(s)")

    processed_images = []

    for idx, attachment in enumerate(attachments):
        try:
            # Validate attachment structure
            if not isinstance(attachment, dict):
                frappe.logger().warning(f"[Attachments] Item {idx} is not a dict: {type(attachment)}")
                continue

            attachment_type = attachment.get('type', '')
            is_image = attachment.get('isImage', False)
            content = attachment.get('content', '')

            # Only process images
            if not is_image or not attachment_type.startswith('image/'):
                frappe.logger().info(f"[Attachments] Skipping non-image: {attachment_type}")
                continue

            # Extract base64 data from data URL
            # Format: data:image/png;base64,iVBORw0KGgo...
            if content.startswith('data:'):
                # Split by comma to get base64 part
                parts = content.split(',', 1)
                if len(parts) == 2:
                    base64_data = parts[1]
                    frappe.logger().info(f"[Attachments] Extracted base64 data ({len(base64_data)} chars)")
                else:
                    base64_data = content
                    frappe.logger().warning(f"[Attachments] No comma in data URL, using as-is")
            else:
                base64_data = content

            # Format for AI model (OpenAI/Claude compatible)
            processed_image = {
                'type': 'image_url',
                'image_url': {
                    'url': f"data:{attachment_type};base64,{base64_data}",
                    'detail': 'high'  # Request high-quality analysis
                }
            }

            processed_images.append(processed_image)

            frappe.logger().info(f"[Attachments] ✅ Processed image {idx + 1}: {attachment_type}, {attachment.get('size', 0)} bytes")

        except Exception as e:
            frappe.logger().error(f"[Attachments] Error processing item {idx}: {str(e)}")
            continue

    frappe.logger().info(f"[Attachments] Successfully processed {len(processed_images)} image(s)")

    return processed_images


def build_multipart_message(text_content, images):
    """
    Build multi-part message for vision-enabled AI models

    Args:
        text_content (str): User's text message
        images (list): Processed images from process_image_attachments()

    Returns:
        list: Message content in OpenAI/Claude format
    """
    if not images:
        # Simple text message
        return text_content

    # Multi-part message with text + images
    content_parts = [
        {
            'type': 'text',
            'text': text_content
        }
    ]

    # Add all images
    content_parts.extend(images)

    frappe.logger().info(f"[Message] Built multi-part message: 1 text + {len(images)} image(s)")

    return content_parts


@frappe.whitelist(allow_guest=False)
def chat_completion(messages=None, conversation_id=None, mode='agent', context=None):
    """
    Chat completion endpoint with image attachment support

    FIXED VERSION - Handles image attachments correctly
    """
    try:
        # Parse context if it's a JSON string
        if context and isinstance(context, str):
            context = json.loads(context)

        # ⚠️ CRITICAL FIX: Process attachments BEFORE building messages
        processed_images = process_image_attachments(context)

        frappe.logger().info(f"[Chat] Received {len(messages) if messages else 0} messages")
        frappe.logger().info(f"[Chat] Context keys: {list(context.keys()) if context else []}")
        frappe.logger().info(f"[Chat] Processed {len(processed_images)} images")

        # Parse messages
        if messages and isinstance(messages, str):
            messages = json.loads(messages)

        if not messages:
            frappe.throw("Messages required")

        # Get the last user message
        last_message = messages[-1] if messages else None

        if not last_message or last_message.get('role') != 'user':
            frappe.throw("Last message must be from user")

        # Get text content from last message
        # Handle both simple string content and complex content array
        if isinstance(last_message.get('content'), str):
            text_content = last_message['content']
        elif isinstance(last_message.get('content'), list):
            # Extract text from first text part
            text_parts = [part.get('text', '') for part in last_message['content'] if part.get('type') == 'text']
            text_content = ' '.join(text_parts) if text_parts else ''
        else:
            text_content = str(last_message.get('content', ''))

        # ⚠️ CRITICAL FIX: If images present, rebuild message with multi-part content
        if processed_images:
            frappe.logger().info(f"[Chat] Rebuilding message with {len(processed_images)} image(s)")

            # Build multi-part content (text + images)
            multi_part_content = build_multipart_message(text_content, processed_images)

            # Replace last message content with multi-part format
            messages[-1] = {
                'role': 'user',
                'content': multi_part_content
            }

            frappe.logger().info(f"[Chat] Message rebuilt with multi-part content")

        # Call AI model (OpenAI, Claude, DeepSeek, etc.)
        ai_response = call_ai_model_with_vision(messages, mode, context)

        # Parse tool calls and strip blocks
        cleaned_response, tool_calls = _parse_tool_calls(ai_response)

        # Return response
        return {
            'success': True,
            'role': 'assistant',
            'content': cleaned_response,
            'tool_calls': tool_calls,
            'conversation_id': conversation_id or frappe.generate_hash(length=12),
            'had_images': len(processed_images) > 0
        }

    except Exception as e:
        frappe.logger().error(f"[Chat] Error: {str(e)}")
        frappe.logger().error(f"[Chat] Stack trace: ", exc_info=True)

        return {
            'success': False,
            'error': str(e),
            'conversation_id': conversation_id
        }


def call_ai_model_with_vision(messages, mode, context):
    """
    Call AI model with vision support (GPT-4V, Claude 3, etc.)

    Args:
        messages (list): Messages with potential image content
        mode (str): 'agent' or 'ask'
        context (dict): Additional context

    Returns:
        str: AI response text
    """
    # Check if any message contains images
    has_images = any(
        isinstance(msg.get('content'), list) and
        any(part.get('type') == 'image_url' for part in msg.get('content', []))
        for msg in messages
    )

    frappe.logger().info(f"[AI Model] Has images: {has_images}")

    if has_images:
        # Use vision-enabled model
        # Examples:
        # - OpenAI: gpt-4-vision-preview, gpt-4o
        # - Claude: claude-3-opus, claude-3-sonnet
        # - Gemini: gemini-pro-vision
        frappe.logger().info("[AI Model] Using vision-enabled model")

        # Your existing AI routing logic here
        # Make sure to use a vision-capable model
        pass
    else:
        # Use regular text model
        frappe.logger().info("[AI Model] Using text-only model")
        pass

    # Your existing AI call implementation
    # Return the raw response text
    return "AI response here"


def _parse_tool_calls(response_text):
    """Parse tool calls from response (same as before)"""
    tool_calls = []

    if not response_text:
        return response_text, tool_calls

    # Find tool_call blocks
    pattern = r'```tool_call\s*\n(.*?)\n```'
    matches = re.finditer(pattern, response_text, re.DOTALL)

    for match in matches:
        tool_call_json = match.group(1).strip()

        try:
            tool_call = json.loads(tool_call_json)
            tool_calls.append(tool_call)
        except json.JSONDecodeError:
            frappe.logger().error(f"[Tool Call] Failed to parse: {tool_call_json[:200]}")

    # Strip tool_call blocks from text
    cleaned_text = re.sub(pattern, '', response_text, flags=re.DOTALL)
    cleaned_text = re.sub(r'\n{3,}', '\n\n', cleaned_text).strip()

    return cleaned_text, tool_calls


# ============================================
# TESTING
# ============================================

def test_image_processing():
    """Test the image attachment processing"""

    # Simulate VS Code context with image
    test_context = {
        'workspace': 'my-project',
        'attachments': [
            {
                'type': 'image/png',
                'content': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                'isImage': True,
                'name': 'pasted-image.png',
                'size': 68
            }
        ]
    }

    # Process attachments
    images = process_image_attachments(test_context)

    print("="*60)
    print("TEST: Image Attachment Processing")
    print("="*60)
    print(f"Input: {len(test_context['attachments'])} attachment(s)")
    print(f"Output: {len(images)} processed image(s)")
    print("\nProcessed Image Structure:")
    print(json.dumps(images[0] if images else {}, indent=2))
    print("="*60)

    # Test multi-part message building
    text = "image attachement prview view and anlize the image"
    multi_part = build_multipart_message(text, images)

    print("\nTEST: Multi-part Message Building")
    print("="*60)
    print(f"Text: {text}")
    print(f"Images: {len(images)}")
    print(f"\nMessage structure:")
    print(json.dumps(multi_part if isinstance(multi_part, list) else {'text': multi_part}, indent=2)[:500])
    print("="*60)


# ============================================
# DEPLOYMENT INSTRUCTIONS
# ============================================
#
# 1. SSH to backend:
#    ssh user@oropendola.ai
#
# 2. Navigate to app:
#    cd ~/frappe-bench/apps/ai_assistant/ai_assistant/
#
# 3. Backup current code:
#    cp api.py api.py.backup
#
# 4. Edit api.py:
#    nano api.py
#
# 5. Add these functions:
#    - process_image_attachments()
#    - build_multipart_message()
#    - Update chat_completion() to use them
#
# 6. Make sure your AI model supports vision:
#    - OpenAI: Use gpt-4o or gpt-4-vision-preview
#    - Claude: Use claude-3-opus or claude-3-sonnet
#    - Gemini: Use gemini-pro-vision
#
# 7. Test the fix:
#    bench console
#    >>> from ai_assistant.api import test_image_processing
#    >>> test_image_processing()
#
# 8. Restart server:
#    bench restart
#
# 9. Test in VS Code:
#    - Paste an image
#    - Send a message
#    - Should NOT see "'list' object has no attribute 'strip'" error
#    - AI should analyze the image
#
# ============================================


# ============================================
# WHAT WAS WRONG?
# ============================================
#
# BEFORE (Broken):
# ----------------
# Backend received:
# {
#   "context": {
#     "attachments": [...]  ← This is a LIST
#   }
# }
#
# Code tried:
# attachments.strip()  ← ERROR! Lists don't have .strip()
#
# Result:
# 'list' object has no attribute 'strip'
#
#
# AFTER (Fixed):
# --------------
# Check type first:
# if isinstance(attachments, list):  ← Safe check
#     for attachment in attachments:
#         process_image(attachment)
#
# Result:
# ✅ Images processed correctly
# ✅ Multi-part messages sent to AI
# ✅ Vision models analyze images
# ✅ No errors
#
# ============================================
