# ============================================
# BACKEND FIX FOR 417 ERROR
# ============================================
# File: ai_assistant/ai_assistant/api.py
# Purpose: Fix "Document has been modified" error (417)
# 
# NOTE: This is a BACKEND Python file for your Frappe server.
#       The linter errors about 'frappe' are expected here.
#       This file should be copied to your backend server.
# 
# INSTRUCTIONS:
# 1. SSH into your backend server: ssh user@oropendola.ai
# 2. Navigate to: cd ~/frappe-bench/apps/ai_assistant/ai_assistant/
# 3. Edit api.py: nano api.py
# 4. Replace the update_conversation_stats() function with the code below
# 5. Save and restart: bench restart
# 6. Test Accept/Reject buttons in VS Code
# ============================================

import frappe
from frappe import _


def update_conversation_stats(conversation_id, feedback):
    """
    Update conversation statistics with feedback data using direct SQL
    
    This version uses direct SQL to bypass Frappe's timestamp validation,
    preventing 417 errors when multiple feedback requests arrive concurrently.
    
    Args:
        conversation_id (str): Conversation ID
        feedback (str): 'accept' or 'reject'
    """
    try:
        # Count total feedbacks for this conversation using SQL
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
        
        # Update using direct SQL - bypasses timestamp check completely
        frappe.db.sql("""
            UPDATE `tabAI Conversation`
            SET 
                total_feedbacks = %s,
                accepted_count = %s,
                acceptance_rate = %s
            WHERE name = %s
        """, (total_feedback, accepted_count, acceptance_rate, conversation_id))
        
        frappe.db.commit()
        
        frappe.logger().info(f"Updated conversation stats: {conversation_id} - {total_feedback} total, {accepted_count} accepted ({acceptance_rate:.2f}%)")
        
    except Exception as e:
        # Don't fail the main operation if stats update fails
        frappe.log_error(f"Stats Update Error for conversation {conversation_id}: {str(e)}")


# ============================================
# ALTERNATIVE FIX (If you don't need stats)
# ============================================
# Simply comment out the update_conversation_stats() call
# in the message_feedback() function:
#
# @frappe.whitelist(allow_guest=False)
# def message_feedback(conversation_id, message_content, feedback):
#     try:
#         # ... validation code ...
#         
#         feedback_doc.insert(ignore_permissions=False)
#         frappe.db.commit()
#         
#         # Optional: Update conversation statistics
#         # update_conversation_stats(conversation_id, feedback)  # ← COMMENTED OUT
#         
#         return {
#             'success': True,
#             'feedback_id': feedback_doc.name,
#             'message': 'Feedback recorded successfully'
#         }
# ============================================
