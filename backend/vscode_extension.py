# Copyright (c) 2025, sammish.thundiyil@gmail.com and contributors
# For license information, please see license.txt

"""
VS Code Extension API Endpoints
OAuth-style authentication flow for VS Code extension
"""

import frappe
from frappe import _
import secrets
import json
from datetime import datetime, timedelta


@frappe.whitelist(allow_guest=True)
def initiate_vscode_auth():
    """
    Initiate VS Code authentication flow
    
    Returns:
        dict: Auth URL and session token
    """
    try:
        # Generate unique session token
        session_token = secrets.token_urlsafe(32)
        
        # Store session in cache with 10 minute expiration
        cache_key = f"vscode_auth:{session_token}"
        frappe.cache().set_value(
            cache_key,
            {
                "status": "pending",
                "created_at": datetime.now().isoformat(),
                "expires_at": (datetime.now() + timedelta(minutes=10)).isoformat()
            },
            expires_in_sec=600  # 10 minutes
        )
        
        # Generate auth URL
        auth_url = f"{frappe.utils.get_url()}/vscode-auth?token={session_token}"
        
        return {
            "success": True,
            "auth_url": auth_url,
            "session_token": session_token,
            "expires_in": 600
        }
        
    except Exception as e:
        frappe.log_error(f"VS Code auth initiation failed: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist(allow_guest=True)
def check_vscode_auth_status(session_token):
    """
    Check authentication status (polling endpoint)
    
    Args:
        session_token: Session token from initiate_vscode_auth
        
    Returns:
        dict: Status and credentials if complete
    """
    try:
        cache_key = f"vscode_auth:{session_token}"
        session_data = frappe.cache().get_value(cache_key)
        
        if not session_data:
            return {
                "success": True,
                "status": "expired",
                "message": "Session expired or not found"
            }
        
        # Check if session is expired
        expires_at = datetime.fromisoformat(session_data.get("expires_at"))
        if datetime.now() > expires_at:
            frappe.cache().delete_value(cache_key)
            return {
                "success": True,
                "status": "expired",
                "message": "Session expired"
            }
        
        # Check status
        status = session_data.get("status")
        
        if status == "complete":
            # Return credentials
            return {
                "success": True,
                "status": "complete",
                "api_key": session_data.get("api_key"),
                "user_email": session_data.get("user_email"),
                "subscription": session_data.get("subscription")
            }
        else:
            # Still pending
            return {
                "success": True,
                "status": "pending",
                "message": "Waiting for user to complete authentication"
            }
            
    except Exception as e:
        frappe.log_error(f"VS Code auth status check failed: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist()
def complete_vscode_auth(session_token, user_email, api_key, subscription):
    """
    Complete authentication (called by web page after user logs in)
    
    Args:
        session_token: Session token
        user_email: User's email
        api_key: User's API key
        subscription: Subscription details
        
    Returns:
        dict: Success status
    """
    try:
        # Verify user is authenticated
        if frappe.session.user == "Guest":
            return {
                "success": False,
                "error": "User not authenticated"
            }
        
        # Verify session exists
        cache_key = f"vscode_auth:{session_token}"
        session_data = frappe.cache().get_value(cache_key)
        
        if not session_data:
            return {
                "success": False,
                "error": "Session not found or expired"
            }
        
        # Parse subscription if it's a string
        if isinstance(subscription, str):
            subscription = json.loads(subscription)
        
        # Update session with credentials
        session_data.update({
            "status": "complete",
            "api_key": api_key,
            "user_email": user_email,
            "subscription": subscription,
            "completed_at": datetime.now().isoformat()
        })
        
        # Store updated session
        frappe.cache().set_value(
            cache_key,
            session_data,
            expires_in_sec=120  # 2 minutes for extension to poll and retrieve
        )
        
        return {
            "success": True,
            "message": "Authentication completed successfully"
        }
        
    except Exception as e:
        frappe.log_error(f"VS Code auth completion failed: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


@frappe.whitelist(allow_guest=True)
def health_check():
    """
    Health check endpoint
    
    Returns:
        dict: Status information
    """
    return {
        "success": True,
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }
