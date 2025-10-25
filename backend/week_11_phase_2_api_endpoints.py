"""
Week 11 Phase 2: API Endpoints
Add these to ai_assistant/api/__init__.py

8 new API endpoints for Phase 2
"""

# ============================================================================
# WEEK 11 PHASE 2: CODE ACTIONS - REFACTORING & REVIEW APIs
# ============================================================================

@frappe.whitelist()
def code_apply_refactor(suggestion_id, confirmation=False):
    """
    Apply a refactoring suggestion

    Args:
        suggestion_id: ID of the refactoring suggestion
        confirmation: User confirmation (bool or string "true"/"false")

    Returns:
        {
            "success": bool,
            "refactored_code": str,
            "message": str
        }
    """
    from ai_assistant.core.code_actions import apply_refactoring

    # Convert string boolean to actual boolean
    if isinstance(confirmation, str):
        confirmation = confirmation.lower() == "true"

    result = apply_refactoring(suggestion_id, confirmation)
    return result


@frappe.whitelist()
def code_auto_fix(issue_id=None, issue_ids=None):
    """
    Automatically fix code issues

    Args:
        issue_id: Single issue ID (optional)
        issue_ids: JSON array of issue IDs (optional)

    Returns:
        {
            "success": bool,
            "fixed_count": int,
            "applied_fixes": [
                {
                    "issue_id": str,
                    "title": str,
                    "original": str,
                    "fixed": str
                }
            ]
        }
    """
    from ai_assistant.core.code_actions import auto_fix
    import json

    # Parse issue_ids if it's a JSON string
    if isinstance(issue_ids, str):
        issue_ids = json.loads(issue_ids)

    result = auto_fix(issue_id=issue_id, issue_ids=issue_ids)
    return result


@frappe.whitelist()
def code_fix_batch(analysis_id, fix_types=None):
    """
    Fix multiple issues from an analysis at once

    Args:
        analysis_id: Analysis ID
        fix_types: JSON array of fix types (optional)

    Returns:
        {
            "success": bool,
            "fixed_count": int,
            "remaining_count": int
        }
    """
    from ai_assistant.core.code_actions import fix_batch
    import json

    # Parse fix_types if it's a JSON string
    if isinstance(fix_types, str):
        fix_types = json.loads(fix_types)

    result = fix_batch(analysis_id, fix_types=fix_types)
    return result


@frappe.whitelist()
def code_extract_function(code, start_line, end_line, function_name, language="python"):
    """
    Extract code into a function

    Args:
        code: Full code
        start_line: Start line number (int)
        end_line: End line number (int)
        function_name: Name for new function
        language: Programming language

    Returns:
        {
            "success": bool,
            "refactored_code": str,
            "function_definition": str
        }
    """
    from ai_assistant.core.code_actions import extract_function

    # Ensure line numbers are integers
    start_line = int(start_line)
    end_line = int(end_line)

    result = extract_function(code, start_line, end_line, function_name, language)
    return result


@frappe.whitelist()
def code_extract_variable(code, expression, variable_name, language="python"):
    """
    Extract expression into a variable

    Args:
        code: Full code
        expression: Expression to extract
        variable_name: Name for new variable
        language: Programming language

    Returns:
        {
            "success": bool,
            "refactored_code": str
        }
    """
    from ai_assistant.core.code_actions import extract_variable

    result = extract_variable(code, expression, variable_name, language)
    return result


@frappe.whitelist()
def code_rename_symbol(code, old_name, new_name, language="python", scope="local"):
    """
    Rename a symbol (variable, function, class)

    Args:
        code: Code containing the symbol
        old_name: Current name
        new_name: New name
        language: Programming language
        scope: Renaming scope (local, file, global)

    Returns:
        {
            "success": bool,
            "refactored_code": str,
            "occurrences_renamed": int
        }
    """
    from ai_assistant.core.code_actions import rename_symbol

    result = rename_symbol(code, old_name, new_name, language, scope)
    return result


@frappe.whitelist()
def code_review(code, context=None, language="python"):
    """
    Perform AI code review

    Args:
        code: Code to review
        context: Additional context (optional)
        language: Programming language

    Returns:
        {
            "success": bool,
            "review": {
                "score": int,
                "summary": str,
                "comments": [
                    {
                        "line": int,
                        "severity": str,
                        "comment": str,
                        "suggestion": str
                    }
                ],
                "strengths": [str],
                "improvements": [str],
                "security_concerns": [str]
            }
        }
    """
    from ai_assistant.core.code_actions import review_code

    result = review_code(code, context=context, language=language)
    return result


@frappe.whitelist()
def code_review_pr(pr_diff, pr_url=None, context=None):
    """
    Review a pull request

    Args:
        pr_diff: Git diff of the PR
        pr_url: URL of the PR (optional)
        context: Additional context (optional)

    Returns:
        {
            "success": bool,
            "review": {
                "recommendation": str,  # approve, request_changes, comment
                "summary": str,
                "file_reviews": [
                    {
                        "file": str,
                        "comments": [str],
                        "score": int
                    }
                ],
                "security_impact": str,
                "performance_impact": str,
                "breaking_changes": [str],
                "requires_tests": bool,
                "requires_docs": bool
            }
        }
    """
    from ai_assistant.core.code_actions import review_pull_request

    result = review_pull_request(pr_diff, pr_url=pr_url, context=context)
    return result


# Summary of Phase 2 endpoints:
# 1. code_apply_refactor - Apply refactoring suggestion
# 2. code_auto_fix - Auto-fix single or multiple issues
# 3. code_fix_batch - Fix all auto-fixable issues in analysis
# 4. code_extract_function - Extract code into function
# 5. code_extract_variable - Extract expression into variable
# 6. code_rename_symbol - Rename symbol safely
# 7. code_review - Comprehensive code review
# 8. code_review_pr - Pull request review
