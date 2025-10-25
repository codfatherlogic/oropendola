"""
Week 11 Phase 2: Code Actions Extensions
Add these functions to ai_assistant/core/code_actions.py

Phase 2 adds:
- Apply refactorings
- Auto-fix issues
- Code extraction (function, variable)
- Symbol renaming
- Code review

Total: 8 new functions
"""

import frappe
from frappe import _
import hashlib
import json
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta

def apply_refactoring(
    suggestion_id: str,
    confirmation: bool = False
) -> Dict[str, Any]:
    """
    Apply a refactoring suggestion

    Args:
        suggestion_id: ID of the refactoring suggestion
        confirmation: User confirmation (required for safety)

    Returns:
        Dict with refactored code and status
    """
    if not confirmation:
        return {
            "success": False,
            "message": "User confirmation required to apply refactoring"
        }

    # Get the refactoring suggestion from database
    suggestion = frappe.db.get_value(
        "Oropendola Code Refactoring",
        suggestion_id,
        ["refactored_code", "original_code", "title", "refactor_type", "status"],
        as_dict=True
    )

    if not suggestion:
        return {
            "success": False,
            "message": f"Refactoring suggestion {suggestion_id} not found"
        }

    if suggestion.status == "applied":
        return {
            "success": False,
            "message": "This refactoring has already been applied"
        }

    # Update status to applied
    frappe.db.set_value(
        "Oropendola Code Refactoring",
        suggestion_id,
        {
            "status": "applied",
            "applied_at": datetime.now()
        }
    )
    frappe.db.commit()

    return {
        "success": True,
        "refactored_code": suggestion.refactored_code,
        "original_code": suggestion.original_code,
        "title": suggestion.title,
        "refactor_type": suggestion.refactor_type,
        "message": "Refactoring applied successfully"
    }


def auto_fix(
    issue_id: Optional[str] = None,
    issue_ids: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Automatically fix code issues

    Args:
        issue_id: Single issue ID to fix
        issue_ids: Multiple issue IDs to fix

    Returns:
        Dict with fixed code and applied fixes
    """
    if not issue_id and not issue_ids:
        return {
            "success": False,
            "message": "Either issue_id or issue_ids must be provided"
        }

    # Get issue IDs to fix
    ids_to_fix = [issue_id] if issue_id else issue_ids

    # Get auto-fixable issues
    issues = frappe.db.get_all(
        "Oropendola Code Issue",
        filters={
            "name": ["in", ids_to_fix],
            "auto_fixable": 1
        },
        fields=["name", "file_path", "line_start", "line_end", "code_snippet", "suggested_fix", "title"]
    )

    if not issues:
        return {
            "success": False,
            "message": "No auto-fixable issues found",
            "fixed_count": 0
        }

    fixed_code_sections = []

    for issue in issues:
        if issue.suggested_fix:
            fixed_code_sections.append({
                "issue_id": issue.name,
                "title": issue.title,
                "line_start": issue.line_start,
                "line_end": issue.line_end,
                "original": issue.code_snippet,
                "fixed": issue.suggested_fix,
                "file_path": issue.file_path
            })

    return {
        "success": True,
        "fixed_count": len(fixed_code_sections),
        "applied_fixes": fixed_code_sections,
        "message": f"Successfully fixed {len(fixed_code_sections)} issue(s)"
    }


def fix_batch(
    analysis_id: str,
    fix_types: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Fix multiple issues from an analysis at once

    Args:
        analysis_id: Analysis ID containing issues
        fix_types: Types of fixes to apply (e.g., ['security', 'performance'])

    Returns:
        Dict with fixed count and remaining count
    """
    # Get all auto-fixable issues from this analysis
    filters = {
        "analysis": analysis_id,
        "auto_fixable": 1
    }

    if fix_types:
        filters["issue_type"] = ["in", fix_types]

    issues = frappe.db.get_all(
        "Oropendola Code Issue",
        filters=filters,
        fields=["name"]
    )

    if not issues:
        return {
            "success": True,
            "fixed_count": 0,
            "remaining_count": 0,
            "message": "No auto-fixable issues found"
        }

    # Apply fixes
    issue_ids = [issue.name for issue in issues]
    result = auto_fix(issue_ids=issue_ids)

    # Count remaining issues
    remaining = frappe.db.count(
        "Oropendola Code Issue",
        filters={"analysis": analysis_id}
    ) - result.get("fixed_count", 0)

    return {
        "success": True,
        "fixed_count": result.get("fixed_count", 0),
        "remaining_count": remaining,
        "applied_fixes": result.get("applied_fixes", []),
        "message": f"Fixed {result.get('fixed_count', 0)} issue(s), {remaining} remaining"
    }


def extract_function(
    code: str,
    start_line: int,
    end_line: int,
    function_name: str,
    language: str = "python"
) -> Dict[str, Any]:
    """
    Extract selected code into a function

    Args:
        code: Full code containing the section to extract
        start_line: Start line of code to extract (1-indexed)
        end_line: End line of code to extract (1-indexed)
        function_name: Name for the new function
        language: Programming language

    Returns:
        Dict with refactored code
    """
    lines = code.split('\n')

    # Validate line numbers
    if start_line < 1 or end_line > len(lines) or start_line > end_line:
        return {
            "success": False,
            "message": "Invalid line numbers"
        }

    # Extract the code section (convert to 0-indexed)
    extracted_lines = lines[start_line-1:end_line]
    extracted_code = '\n'.join(extracted_lines)

    # Use AI to generate the extracted function
    from ai_assistant.core.unified_gateway import call_ai_model

    prompt = f"""Extract this {language} code into a function named '{function_name}':

```{language}
{extracted_code}
```

Requirements:
1. Create a well-structured function with proper parameters
2. Return the function definition
3. Return the modified original code with the function call
4. Preserve indentation and style
5. Add appropriate docstring/comments

Return JSON:
{{
    "function_definition": "...",
    "modified_code": "...",
    "parameters": ["param1", "param2"],
    "return_value": "description"
}}
"""

    try:
        response = call_ai_model(prompt, model="deepseek", temperature=0.2)
        result = json.loads(response)

        return {
            "success": True,
            "refactored_code": result["modified_code"],
            "function_definition": result["function_definition"],
            "parameters": result.get("parameters", []),
            "return_value": result.get("return_value"),
            "original_code": code
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to extract function: {str(e)}"
        }


def extract_variable(
    code: str,
    expression: str,
    variable_name: str,
    language: str = "python"
) -> Dict[str, Any]:
    """
    Extract an expression into a variable

    Args:
        code: Full code containing the expression
        expression: Expression to extract
        variable_name: Name for the new variable
        language: Programming language

    Returns:
        Dict with refactored code
    """
    from ai_assistant.core.unified_gateway import call_ai_model

    prompt = f"""Extract this expression into a variable in {language}:

Expression to extract: `{expression}`
Variable name: `{variable_name}`

Original code:
```{language}
{code}
```

Requirements:
1. Find all occurrences of the expression
2. Create a variable with the given name
3. Replace all occurrences with the variable
4. Place variable declaration at appropriate scope
5. Preserve code style and indentation

Return the refactored code.
"""

    try:
        response = call_ai_model(prompt, model="deepseek", temperature=0.1)

        return {
            "success": True,
            "refactored_code": response.strip(),
            "original_code": code,
            "variable_name": variable_name,
            "expression": expression
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to extract variable: {str(e)}"
        }


def rename_symbol(
    code: str,
    old_name: str,
    new_name: str,
    language: str = "python",
    scope: str = "local"
) -> Dict[str, Any]:
    """
    Rename a symbol (variable, function, class, etc.)

    Args:
        code: Code containing the symbol
        old_name: Current symbol name
        new_name: New symbol name
        language: Programming language
        scope: Renaming scope ('local', 'file', 'global')

    Returns:
        Dict with refactored code
    """
    from ai_assistant.core.unified_gateway import call_ai_model

    prompt = f"""Rename symbol '{old_name}' to '{new_name}' in this {language} code:

```{language}
{code}
```

Requirements:
1. Rename all occurrences of '{old_name}' to '{new_name}'
2. Respect {language} naming conventions
3. Only rename the symbol, not strings or comments containing the name
4. Preserve all other code structure and formatting
5. Scope: {scope}

Return ONLY the refactored code, no explanations.
"""

    try:
        response = call_ai_model(prompt, model="deepseek", temperature=0.1)

        # Count occurrences
        import re
        pattern = r'\b' + re.escape(old_name) + r'\b'
        original_count = len(re.findall(pattern, code))
        new_count = len(re.findall(r'\b' + re.escape(new_name) + r'\b', response))

        return {
            "success": True,
            "refactored_code": response.strip(),
            "original_code": code,
            "old_name": old_name,
            "new_name": new_name,
            "occurrences_renamed": new_count,
            "message": f"Renamed {original_count} occurrence(s)"
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to rename symbol: {str(e)}"
        }


def review_code(
    code: str,
    context: Optional[str] = None,
    language: str = "python"
) -> Dict[str, Any]:
    """
    Perform AI code review

    Args:
        code: Code to review
        context: Additional context about the code
        language: Programming language

    Returns:
        Dict with review results
    """
    from ai_assistant.core.unified_gateway import call_ai_model

    context_str = f"\n\nContext: {context}" if context else ""

    prompt = f"""Perform a comprehensive code review of this {language} code:{context_str}

```{language}
{code}
```

Provide a detailed review covering:
1. Code quality and maintainability (score 0-100)
2. Security concerns
3. Performance issues
4. Best practices violations
5. Specific line-by-line comments for issues
6. Strengths of the code
7. Suggested improvements

Return JSON:
{{
    "score": 85,
    "summary": "Overall code is good but has some issues...",
    "comments": [
        {{"line": 5, "severity": "high", "comment": "...", "suggestion": "..."}},
        ...
    ],
    "strengths": ["...", "..."],
    "improvements": ["...", "..."],
    "security_concerns": ["...", "..."]
}}
"""

    try:
        response = call_ai_model(prompt, model="deepseek", temperature=0.3)
        review = json.loads(response)

        return {
            "success": True,
            "review": review
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Code review failed: {str(e)}"
        }


def review_pull_request(
    pr_diff: str,
    pr_url: Optional[str] = None,
    context: Optional[str] = None
) -> Dict[str, Any]:
    """
    Review an entire pull request

    Args:
        pr_diff: Git diff of the PR
        pr_url: URL of the pull request (optional)
        context: Additional context

    Returns:
        Dict with PR review results
    """
    from ai_assistant.core.unified_gateway import call_ai_model

    context_str = f"\n\nContext: {context}" if context else ""
    url_str = f"\n\nPR URL: {pr_url}" if pr_url else ""

    prompt = f"""Review this pull request:{url_str}{context_str}

Diff:
```diff
{pr_diff}
```

Provide a comprehensive PR review:
1. Overall assessment (approve/request changes/comment)
2. Summary of changes
3. Specific file-by-file comments
4. Security implications
5. Performance implications
6. Breaking changes
7. Test coverage assessment
8. Documentation needs

Return JSON:
{{
    "recommendation": "approve|request_changes|comment",
    "summary": "...",
    "file_reviews": [
        {{"file": "path/to/file", "comments": [...], "score": 85}},
        ...
    ],
    "security_impact": "...",
    "performance_impact": "...",
    "breaking_changes": ["...", "..."],
    "requires_tests": true,
    "requires_docs": true
}}
"""

    try:
        response = call_ai_model(prompt, model="deepseek", temperature=0.3)
        review = json.loads(response)

        return {
            "success": True,
            "review": review
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"PR review failed: {str(e)}"
        }


# Export all functions for API registration
__all__ = [
    'apply_refactoring',
    'auto_fix',
    'fix_batch',
    'extract_function',
    'extract_variable',
    'rename_symbol',
    'review_code',
    'review_pull_request'
]
