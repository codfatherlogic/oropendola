"""
Week 11 Phase 4: Custom Code Actions API Endpoints

Add these endpoints to ai_assistant/api/__init__.py
"""

import frappe
import json


@frappe.whitelist()
def code_create_custom_action(
    action_name,
    description,
    action_type,
    prompt_template,
    language="any",
    parameters=None,
    output_format="json",
    is_public=False
):
    """
    Create a new custom code action

    Args:
        action_name: Name of the custom action
        description: Description of what the action does
        action_type: Type of action (analysis, transformation, validation, generation)
        prompt_template: AI prompt template with placeholders like {{code}}, {{language}}
        language: Specific language or 'any'
        parameters: Optional custom parameters (JSON string or dict)
        output_format: Output format (json, text, code)
        is_public: Share with other users

    Returns:
        Created action ID and details
    """
    from ai_assistant.core.code_actions import create_custom_action

    # Parse parameters if string
    if isinstance(parameters, str):
        try:
            parameters = json.loads(parameters)
        except:
            parameters = {}

    # Convert is_public to boolean
    if isinstance(is_public, str):
        is_public = is_public.lower() in ["true", "1", "yes"]

    result = create_custom_action(
        action_name=action_name,
        description=description,
        action_type=action_type,
        prompt_template=prompt_template,
        language=language,
        parameters=parameters,
        output_format=output_format,
        is_public=is_public
    )
    return result


@frappe.whitelist()
def code_execute_custom_action(action_id, code, language="python", custom_params=None):
    """
    Execute a custom action on code

    Args:
        action_id: ID of the custom action to execute
        code: Source code to process
        language: Programming language
        custom_params: Optional custom parameters (JSON string or dict)

    Returns:
        Result of the custom action execution
    """
    from ai_assistant.core.code_actions import execute_custom_action

    # Parse custom_params if string
    if isinstance(custom_params, str):
        try:
            custom_params = json.loads(custom_params)
        except:
            custom_params = {}

    result = execute_custom_action(
        action_id=action_id,
        code=code,
        language=language,
        custom_params=custom_params
    )
    return result


@frappe.whitelist()
def code_list_custom_actions(action_type=None, language=None, include_public=True, limit=50):
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
    from ai_assistant.core.code_actions import list_custom_actions

    # Convert include_public to boolean
    if isinstance(include_public, str):
        include_public = include_public.lower() in ["true", "1", "yes"]

    # Convert limit to int
    if isinstance(limit, str):
        limit = int(limit)

    result = list_custom_actions(
        action_type=action_type,
        language=language,
        include_public=include_public,
        limit=limit
    )
    return result


@frappe.whitelist()
def code_get_custom_action_details(action_id):
    """
    Get detailed information about a custom action

    Args:
        action_id: ID of the custom action

    Returns:
        Detailed action information including recent executions
    """
    from ai_assistant.core.code_actions import get_custom_action_details
    result = get_custom_action_details(action_id)
    return result
