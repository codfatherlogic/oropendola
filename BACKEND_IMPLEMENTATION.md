# Backend Implementation Guide

## Required Frappe Backend Changes

### 1. Create AI Message Feedback DocType

Create file: `ai_assistant/ai_assistant/doctype/ai_message_feedback/ai_message_feedback.json`

```json
{
 "actions": [],
 "allow_rename": 1,
 "autoname": "format:FEEDBACK-{####}",
 "creation": "2025-01-17 10:00:00.000000",
 "doctype": "DocType",
 "editable_grid": 1,
 "engine": "InnoDB",
 "field_order": [
  "conversation",
  "message_content",
  "feedback_type",
  "column_break_4",
  "user",
  "timestamp"
 ],
 "fields": [
  {
   "fieldname": "conversation",
   "fieldtype": "Link",
   "in_list_view": 1,
   "label": "Conversation",
   "options": "AI Conversation",
   "reqd": 1
  },
  {
   "fieldname": "message_content",
   "fieldtype": "Long Text",
   "label": "Message Content"
  },
  {
   "fieldname": "feedback_type",
   "fieldtype": "Select",
   "in_list_view": 1,
   "in_standard_filter": 1,
   "label": "Feedback Type",
   "options": "accept\nreject",
   "reqd": 1
  },
  {
   "fieldname": "user",
   "fieldtype": "Link",
   "in_list_view": 1,
   "label": "User",
   "options": "User",
   "reqd": 1
  },
  {
   "fieldname": "timestamp",
   "fieldtype": "Datetime",
   "in_list_view": 1,
   "label": "Timestamp",
   "reqd": 1
  },
  {
   "fieldname": "column_break_4",
   "fieldtype": "Column Break"
  }
 ],
 "index_web_pages_for_search": 1,
 "links": [],
 "modified": "2025-01-17 10:00:00.000000",
 "modified_by": "Administrator",
 "module": "AI Assistant",
 "name": "AI Message Feedback",
 "naming_rule": "Expression",
 "owner": "Administrator",
 "permissions": [
  {
   "create": 1,
   "delete": 1,
   "email": 1,
   "export": 1,
   "print": 1,
   "read": 1,
   "report": 1,
   "role": "System Manager",
   "share": 1,
   "write": 1
  }
 ],
 "sort_field": "modified",
 "sort_order": "DESC",
 "states": [],
 "track_changes": 1
}
```

### 2. Add Message Feedback API Endpoint

Add to file: `ai_assistant/ai_assistant/api.py`

```python
@frappe.whitelist(allow_guest=False)
def message_feedback(conversation_id, message_content, feedback):
    """
    Store user feedback for AI responses
    
    Args:
        conversation_id (str): UUID of the conversation
        message_content (str): The AI response text
        feedback (str): 'accept' or 'reject'
        
    Returns:
        dict: Success status and feedback record ID
    """
    try:
        # Validate inputs
        if not conversation_id or not message_content or not feedback:
            frappe.throw(_("Missing required parameters"))
            
        if feedback not in ['accept', 'reject']:
            frappe.throw(_("Invalid feedback type. Must be 'accept' or 'reject'"))
        
        # Verify conversation exists and user has access
        conversation = frappe.get_doc('AI Conversation', conversation_id)
        if conversation.user != frappe.session.user:
            frappe.throw(_("You don't have permission to access this conversation"))
        
        # Create feedback record
        feedback_doc = frappe.get_doc({
            'doctype': 'AI Message Feedback',
            'conversation': conversation_id,
            'message_content': message_content[:500],  # Limit length
            'feedback_type': feedback,
            'user': frappe.session.user,
            'timestamp': frappe.utils.now()
        })
        
        feedback_doc.insert(ignore_permissions=False)
        frappe.db.commit()
        
        # Optional: Update conversation statistics
        update_conversation_stats(conversation_id, feedback)
        
        return {
            'success': True,
            'feedback_id': feedback_doc.name,
            'message': f'Feedback recorded successfully'
        }
        
    except frappe.DoesNotExistError:
        frappe.log_error(f"Conversation {conversation_id} not found")
        return {
            'success': False,
            'error': 'Conversation not found'
        }
    except Exception as e:
        frappe.log_error(f"Feedback Error: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }


def update_conversation_stats(conversation_id, feedback):
    """
    Update conversation statistics with feedback data
    
    Args:
        conversation_id (str): Conversation ID
        feedback (str): 'accept' or 'reject'
    """
    try:
        # Count total feedbacks for this conversation
        total_feedback = frappe.db.count('AI Message Feedback', {
            'conversation': conversation_id
        })
        
        # Count accepted feedbacks
        accepted_count = frappe.db.count('AI Message Feedback', {
            'conversation': conversation_id,
            'feedback_type': 'accept'
        })
        
        # Calculate acceptance rate
        acceptance_rate = (accepted_count / total_feedback * 100) if total_feedback > 0 else 0
        
        # Update conversation document (if you have these fields)
        frappe.db.set_value('AI Conversation', conversation_id, {
            'total_feedbacks': total_feedback,
            'accepted_count': accepted_count,
            'acceptance_rate': acceptance_rate
        })
        
        frappe.db.commit()
        
    except Exception as e:
        # Don't fail the main operation if stats update fails
        frappe.log_error(f"Stats Update Error: {str(e)}")
```

### 3. Optional: Add Statistics Fields to AI Conversation

Modify: `ai_assistant/ai_assistant/doctype/ai_conversation/ai_conversation.json`

Add these fields to the AI Conversation DocType:

```json
{
  "fieldname": "feedback_section",
  "fieldtype": "Section Break",
  "label": "Feedback Statistics"
},
{
  "fieldname": "total_feedbacks",
  "fieldtype": "Int",
  "label": "Total Feedbacks",
  "read_only": 1,
  "default": "0"
},
{
  "fieldname": "accepted_count",
  "fieldtype": "Int",
  "label": "Accepted Count",
  "read_only": 1,
  "default": "0"
},
{
  "fieldname": "acceptance_rate",
  "fieldtype": "Percent",
  "label": "Acceptance Rate",
  "read_only": 1,
  "precision": "2"
}
```

### 4. Create Database Indexes for Performance

Run in Frappe console:

```python
# Create indexes for faster queries
frappe.db.sql("""
    CREATE INDEX idx_conversation_user 
    ON `tabAI Message Feedback` (conversation, user)
""")

frappe.db.sql("""
    CREATE INDEX idx_feedback_timestamp 
    ON `tabAI Message Feedback` (timestamp DESC)
""")

frappe.db.sql("""
    CREATE INDEX idx_feedback_type 
    ON `tabAI Message Feedback` (feedback_type)
""")
```

### 5. Optional: Analytics Queries

Add to `ai_assistant/ai_assistant/api.py`:

```python
@frappe.whitelist(allow_guest=False)
def get_feedback_analytics(conversation_id=None, user=None, days=30):
    """
    Get feedback analytics
    
    Args:
        conversation_id (str, optional): Specific conversation
        user (str, optional): Specific user
        days (int): Number of days to analyze
        
    Returns:
        dict: Analytics data
    """
    filters = {
        'timestamp': ['>=', frappe.utils.add_days(frappe.utils.now(), -days)]
    }
    
    if conversation_id:
        filters['conversation'] = conversation_id
    
    if user:
        filters['user'] = user
    elif not frappe.has_permission('AI Message Feedback', 'read'):
        # Non-admin users can only see their own feedback
        filters['user'] = frappe.session.user
    
    # Get all feedback records
    feedbacks = frappe.get_all(
        'AI Message Feedback',
        filters=filters,
        fields=['name', 'conversation', 'feedback_type', 'timestamp', 'user']
    )
    
    # Calculate statistics
    total = len(feedbacks)
    accepted = sum(1 for f in feedbacks if f.feedback_type == 'accept')
    rejected = sum(1 for f in feedbacks if f.feedback_type == 'reject')
    
    return {
        'total_feedbacks': total,
        'accepted': accepted,
        'rejected': rejected,
        'acceptance_rate': (accepted / total * 100) if total > 0 else 0,
        'rejection_rate': (rejected / total * 100) if total > 0 else 0,
        'feedbacks': feedbacks
    }
```

### 6. Migration Steps

Run these commands in order:

```bash
# 1. Navigate to Frappe bench directory
cd ~/frappe-bench

# 2. Create the new DocType files
bench --site your-site.local migrate

# 3. Clear cache
bench --site your-site.local clear-cache

# 4. Restart
bench restart

# 5. Verify DocType was created
bench --site your-site.local console
```

In console:
```python
frappe.get_doc('DocType', 'AI Message Feedback').name
# Should return 'AI Message Feedback'
```

### 7. Testing the Backend

#### Test 1: Create Feedback via API
```bash
curl -X POST https://oropendola.ai/api/method/ai_assistant.api.message_feedback \
  -H "Content-Type: application/json" \
  -H "Cookie: sid=your-session-id" \
  -d '{
    "conversation_id": "your-conversation-uuid",
    "message_content": "Test AI response",
    "feedback": "accept"
  }'
```

Expected response:
```json
{
  "message": {
    "success": true,
    "feedback_id": "FEEDBACK-0001",
    "message": "Feedback recorded successfully"
  }
}
```

#### Test 2: Get Analytics
```bash
curl https://oropendola.ai/api/method/ai_assistant.api.get_feedback_analytics \
  -H "Cookie: sid=your-session-id"
```

### 8. Frontend Testing Checklist

After backend is deployed:

- [ ] Sign in to extension
- [ ] Send a message to AI
- [ ] Click "👍 Accept" button
- [ ] Check browser console for success log
- [ ] Verify feedback record in Frappe backend
- [ ] Click "👎 Reject" button on another message
- [ ] Check conversation statistics updated
- [ ] Test with multiple conversations
- [ ] Verify permissions (users can only feedback their own conversations)

---

## Optional: Image Processing Backend

If you want enhanced image handling (separate upload endpoint):

### Add Image Upload Endpoint

```python
@frappe.whitelist(allow_guest=False)
def upload_chat_image(file_data, file_name, conversation_id):
    """
    Upload image attachment for chat
    
    Args:
        file_data (str): Base64 encoded image data
        file_name (str): Original filename
        conversation_id (str): Associated conversation
        
    Returns:
        dict: File URL and metadata
    """
    import base64
    from frappe.utils.file_manager import save_file
    
    try:
        # Validate conversation access
        conversation = frappe.get_doc('AI Conversation', conversation_id)
        if conversation.user != frappe.session.user:
            frappe.throw(_("Access denied"))
        
        # Decode base64 (remove data URL prefix if present)
        if ',' in file_data:
            file_data = file_data.split(',')[1]
        
        file_content = base64.b64decode(file_data)
        
        # Optional: Compress/resize image
        # file_content = compress_image(file_content)
        
        # Save to Frappe file system
        file_doc = save_file(
            fname=file_name,
            content=file_content,
            dt='AI Conversation',
            dn=conversation_id,
            is_private=1  # Private files require authentication
        )
        
        return {
            'success': True,
            'file_url': file_doc.file_url,
            'file_name': file_doc.file_name,
            'file_size': len(file_content)
        }
        
    except Exception as e:
        frappe.log_error(f"Image Upload Error: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }
```

---

## Summary

### Minimum Required:
1. ✅ Create `AI Message Feedback` DocType
2. ✅ Implement `message_feedback` API endpoint
3. ✅ Run migration

### Recommended:
4. ⭐ Add statistics fields to AI Conversation
5. ⭐ Create database indexes
6. ⭐ Implement analytics endpoint

### Optional:
7. 💡 Image upload endpoint (separate from base64)
8. 💡 Image compression/optimization
9. 💡 Feedback export/reporting tools

**Estimated Implementation Time**: 
- Minimum: 30 minutes
- Recommended: 1-2 hours
- With all optional features: 3-4 hours
