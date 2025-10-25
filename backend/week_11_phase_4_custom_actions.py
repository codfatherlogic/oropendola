"""
Week 11 Phase 4: Custom Code Actions
User-defined custom code analysis and transformation actions

Functions:
- create_custom_action: Create a new custom action
- execute_custom_action: Execute a custom action on code
- list_custom_actions: List available custom actions
"""

import frappe
from typing import Dict, Any, List, Optional
from datetime import datetime
import json
import re
import time


def create_custom_action(
    action_name: str,
    description: str,
    action_type: str,
    prompt_template: str,
    language: str = "any",
    parameters: Optional[Dict] = None,
    output_format: str = "json",
    is_public: bool = False
) -> Dict[str, Any]:
    """
    Create a new custom code action

    Args:
        action_name: Name of the custom action
        description: Description of what the action does
        action_type: Type of action (analysis, transformation, validation, generation)
        prompt_template: AI prompt template with placeholders like {{code}}, {{language}}
        language: Specific language or 'any'
        parameters: Optional custom parameters
        output_format: Output format (json, text, code)
        is_public: Share with other users

    Returns:
        Created action ID and details
    """
    user_id = frappe.session.user

    # Validate action_type
    valid_types = ["analysis", "transformation", "validation", "generation"]
    if action_type not in valid_types:
        return {
            "success": False,
            "message": f"Invalid action_type. Must be one of: {', '.join(valid_types)}"
        }

    # Validate output_format
    valid_formats = ["json", "text", "code"]
    if output_format not in valid_formats:
        return {
            "success": False,
            "message": f"Invalid output_format. Must be one of: {', '.join(valid_formats)}"
        }

    # Check for required placeholders in prompt
    if "{{code}}" not in prompt_template:
        return {
            "success": False,
            "message": "Prompt template must contain {{code}} placeholder"
        }

    try:
        # Generate action_id
        action_id = f"CA-{datetime.now().strftime('%Y%m%d')}-{frappe.generate_hash(length=6)}"

        # Create custom action
        doc = frappe.get_doc({
            "doctype": "Oropendola Custom Code Action",
            "action_id": action_id,
            "action_name": action_name,
            "description": description,
            "action_type": action_type,
            "language": language,
            "prompt_template": prompt_template,
            "parameters": json.dumps(parameters or {}),
            "output_format": output_format,
            "is_public": 1 if is_public else 0,
            "created_by": user_id,
            "execution_count": 0,
            "average_rating": 0.0,
            "created_at": datetime.now(),
            "modified_at": datetime.now()
        })
        doc.insert(ignore_permissions=True)
        frappe.db.commit()

        return {
            "success": True,
            "action_id": action_id,
            "action_name": action_name,
            "message": f"Custom action '{action_name}' created successfully",
            "details": {
                "action_id": action_id,
                "action_type": action_type,
                "language": language,
                "output_format": output_format,
                "is_public": is_public
            }
        }

    except Exception as e:
        frappe.log_error(f"Failed to create custom action: {str(e)}")
        return {
            "success": False,
            "message": f"Failed to create custom action: {str(e)}"
        }


def execute_custom_action(
    action_id: str,
    code: str,
    language: str = "python",
    custom_params: Optional[Dict] = None
) -> Dict[str, Any]:
    """
    Execute a custom action on code

    Args:
        action_id: ID of the custom action to execute
        code: Source code to process
        language: Programming language
        custom_params: Optional custom parameters to pass to the template

    Returns:
        Result of the custom action execution
    """
    from ai_assistant.core.unified_gateway import call_ai_model

    user_id = frappe.session.user

    try:
        # Get custom action
        action = frappe.db.get_value(
            "Oropendola Custom Code Action",
            {"action_id": action_id},
            ["action_name", "prompt_template", "language", "parameters", "output_format", "created_by", "is_public"],
            as_dict=True
        )

        if not action:
            return {
                "success": False,
                "message": f"Custom action '{action_id}' not found"
            }

        # Check permissions (must be creator or action is public)
        if action.created_by != user_id and not action.is_public:
            return {
                "success": False,
                "message": "You don't have permission to execute this action"
            }

        # Check language compatibility
        if action.language != "any" and action.language != language:
            return {
                "success": False,
                "message": f"This action is designed for {action.language}, not {language}"
            }

        # Build prompt from template
        prompt = action.prompt_template

        # Replace standard placeholders
        prompt = prompt.replace("{{code}}", code)
        prompt = prompt.replace("{{language}}", language)

        # Replace custom parameter placeholders
        stored_params = json.loads(action.parameters) if action.parameters else {}
        params = {**stored_params, **(custom_params or {})}

        for key, value in params.items():
            placeholder = f"{{{{{key}}}}}"
            if placeholder in prompt:
                prompt = prompt.replace(placeholder, str(value))

        # Execute AI call
        start_time = time.time()
        response = call_ai_model(prompt, model="claude", temperature=0.3)
        execution_time_ms = int((time.time() - start_time) * 1000)

        # Parse response based on output_format
        if action.output_format == "json":
            try:
                result = json.loads(response)
            except json.JSONDecodeError:
                result = {"raw_response": response}
        else:
            result = response

        # Record execution
        execution_id = f"EXE-{datetime.now().strftime('%Y%m%d')}-{frappe.generate_hash(length=8)}"

        frappe.get_doc({
            "doctype": "Oropendola Custom Action Execution",
            "execution_id": execution_id,
            "action_id": action_id,
            "action_name": action.action_name,
            "user_id": user_id,
            "input_code": code[:5000],  # Limit stored code length
            "input_language": language,
            "output_result": json.dumps(result) if action.output_format == "json" else result[:5000],
            "execution_time_ms": execution_time_ms,
            "success": 1,
            "executed_at": datetime.now()
        }).insert(ignore_permissions=True)

        # Update execution count
        frappe.db.sql("""
            UPDATE `oropendola_custom_code_action`
            SET execution_count = execution_count + 1
            WHERE action_id = %s
        """, (action_id,))

        frappe.db.commit()

        return {
            "success": True,
            "execution_id": execution_id,
            "action_name": action.action_name,
            "result": result,
            "execution_time_ms": execution_time_ms,
            "output_format": action.output_format
        }

    except Exception as e:
        # Record failed execution
        try:
            execution_id = f"EXE-{datetime.now().strftime('%Y%m%d')}-{frappe.generate_hash(length=8)}"
            frappe.get_doc({
                "doctype": "Oropendola Custom Action Execution",
                "execution_id": execution_id,
                "action_id": action_id,
                "action_name": action.get("action_name", "Unknown"),
                "user_id": user_id,
                "input_code": code[:5000],
                "input_language": language,
                "success": 0,
                "error_message": str(e),
                "executed_at": datetime.now()
            }).insert(ignore_permissions=True)
            frappe.db.commit()
        except:
            pass

        frappe.log_error(f"Failed to execute custom action: {str(e)}")
        return {
            "success": False,
            "message": f"Failed to execute custom action: {str(e)}"
        }


def list_custom_actions(
    action_type: Optional[str] = None,
    language: Optional[str] = None,
    include_public: bool = True,
    limit: int = 50
) -> Dict[str, Any]:
    """
    List available custom actions

    Args:
        action_type: Filter by action type (optional)
        language: Filter by language (optional)
        include_public: Include public actions from other users
        limit: Maximum number of actions to return

    Returns:
        List of available custom actions
    """
    user_id = frappe.session.user

    try:
        # Build filters
        filters = []
        params = []

        # User's own actions or public actions
        if include_public:
            filters.append("(created_by = %s OR is_public = 1)")
            params.append(user_id)
        else:
            filters.append("created_by = %s")
            params.append(user_id)

        # Action type filter
        if action_type:
            filters.append("action_type = %s")
            params.append(action_type)

        # Language filter
        if language:
            filters.append("(language = %s OR language = 'any')")
            params.append(language)

        where_clause = " AND ".join(filters) if filters else "1=1"

        # Query custom actions
        actions = frappe.db.sql(f"""
            SELECT
                action_id,
                action_name,
                description,
                action_type,
                language,
                output_format,
                is_public,
                created_by,
                execution_count,
                average_rating,
                created_at
            FROM `oropendola_custom_code_action`
            WHERE {where_clause}
            ORDER BY execution_count DESC, created_at DESC
            LIMIT %s
        """, tuple(params + [limit]), as_dict=True)

        # Add "is_owner" flag
        for action in actions:
            action["is_owner"] = action.created_by == user_id
            action["is_public"] = bool(action.is_public)

        return {
            "success": True,
            "total_actions": len(actions),
            "actions": actions,
            "filters": {
                "action_type": action_type,
                "language": language,
                "include_public": include_public
            }
        }

    except Exception as e:
        frappe.log_error(f"Failed to list custom actions: {str(e)}")
        return {
            "success": False,
            "message": f"Failed to list custom actions: {str(e)}"
        }


def get_custom_action_details(action_id: str) -> Dict[str, Any]:
    """
    Get detailed information about a custom action

    Args:
        action_id: ID of the custom action

    Returns:
        Detailed action information including recent executions
    """
    user_id = frappe.session.user

    try:
        # Get action details
        action = frappe.db.get_value(
            "Oropendola Custom Code Action",
            {"action_id": action_id},
            ["*"],
            as_dict=True
        )

        if not action:
            return {
                "success": False,
                "message": f"Custom action '{action_id}' not found"
            }

        # Check if user has access
        if action.created_by != user_id and not action.is_public:
            return {
                "success": False,
                "message": "You don't have permission to view this action"
            }

        # Get recent executions
        recent_executions = frappe.db.sql("""
            SELECT
                execution_id,
                user_id,
                execution_time_ms,
                success,
                rating,
                executed_at
            FROM `oropendola_custom_action_execution`
            WHERE action_id = %s
            ORDER BY executed_at DESC
            LIMIT 10
        """, (action_id,), as_dict=True)

        return {
            "success": True,
            "action": {
                "action_id": action.action_id,
                "action_name": action.action_name,
                "description": action.description,
                "action_type": action.action_type,
                "language": action.language,
                "prompt_template": action.prompt_template if action.created_by == user_id else None,
                "parameters": json.loads(action.parameters) if action.parameters else {},
                "output_format": action.output_format,
                "is_public": bool(action.is_public),
                "created_by": action.created_by,
                "execution_count": action.execution_count,
                "average_rating": float(action.average_rating),
                "created_at": action.created_at,
                "is_owner": action.created_by == user_id
            },
            "recent_executions": recent_executions
        }

    except Exception as e:
        frappe.log_error(f"Failed to get custom action details: {str(e)}")
        return {
            "success": False,
            "message": f"Failed to get custom action details: {str(e)}"
        }
