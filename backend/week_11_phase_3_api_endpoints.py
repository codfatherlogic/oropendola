"""
Week 11 Phase 3: API Endpoint Definitions
Advanced Code Analysis APIs

Add these endpoints to ai_assistant/api/__init__.py
"""

import frappe


@frappe.whitelist()
def code_check_performance(code, language, file_path=None):
    """
    Detailed performance analysis

    Args:
        code: Source code to analyze
        language: Programming language
        file_path: Optional file path

    Returns:
        Performance analysis with bottlenecks and optimization suggestions
    """
    from ai_assistant.core.code_actions import check_performance
    result = check_performance(code, language, file_path=file_path)
    return result


@frappe.whitelist()
def code_check_complexity(code, language, file_path=None):
    """
    Cyclomatic complexity analysis

    Args:
        code: Source code to analyze
        language: Programming language
        file_path: Optional file path

    Returns:
        Complexity metrics including cyclomatic and cognitive complexity
    """
    from ai_assistant.core.code_actions import check_complexity
    result = check_complexity(code, language, file_path=file_path)
    return result


@frappe.whitelist()
def code_check_style(code, language, style_guide="standard"):
    """
    Style guide compliance check

    Args:
        code: Source code to check
        language: Programming language
        style_guide: Style guide to use (standard, google, airbnb, pep8, etc.)

    Returns:
        Style violations and compliance score
    """
    from ai_assistant.core.code_actions import check_style
    result = check_style(code, language, style_guide=style_guide)
    return result


@frappe.whitelist()
def code_check_vulnerabilities(code, language, file_path=None):
    """
    Comprehensive vulnerability scan

    Args:
        code: Source code to scan
        language: Programming language
        file_path: Optional file path

    Returns:
        Security vulnerabilities with CWE IDs and CVSS scores
    """
    from ai_assistant.core.code_actions import check_vulnerabilities
    result = check_vulnerabilities(code, language, file_path=file_path)
    return result


@frappe.whitelist()
def code_suggest_improvements(code, language, context=None):
    """
    AI-powered improvement suggestions

    Args:
        code: Source code
        language: Programming language
        context: Optional context about what the code does

    Returns:
        Comprehensive improvement suggestions across all categories
    """
    from ai_assistant.core.code_actions import suggest_improvements
    result = suggest_improvements(code, language, context=context)
    return result


@frappe.whitelist()
def code_compare_quality(current_code, language, previous_code=None, file_path=None):
    """
    Compare code quality over time

    Args:
        current_code: Current version of the code
        language: Programming language
        previous_code: Previous version to compare against (optional)
        file_path: File path (used to lookup previous versions if previous_code not provided)

    Returns:
        Quality comparison showing improvements or regressions
    """
    from ai_assistant.core.code_actions import compare_quality
    result = compare_quality(
        current_code=current_code,
        previous_code=previous_code,
        language=language,
        file_path=file_path
    )
    return result
