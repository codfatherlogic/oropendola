"""
Week 11 Phase 3: Advanced Code Analysis Features
Performance, Complexity, Style, Vulnerability Analysis

This module extends ai_assistant/core/code_actions.py with advanced analysis features.

Functions:
- check_performance: Detailed performance analysis
- check_complexity: Cyclomatic complexity analysis
- check_style: Style guide compliance check
- check_vulnerabilities: Comprehensive vulnerability scan
- suggest_improvements: AI-powered improvement suggestions
- compare_quality: Compare code quality over time
"""

import frappe
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import json
import hashlib


def check_performance(code: str, language: str, file_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Detailed performance analysis of code

    Args:
        code: Source code to analyze
        language: Programming language
        file_path: Optional file path

    Returns:
        Performance analysis with bottlenecks, optimization suggestions, and scores
    """
    from ai_assistant.core.unified_gateway import call_ai_model

    prompt = f"""Analyze this {language} code for performance issues and optimization opportunities.

```{language}
{code}
```

Provide a detailed performance analysis with:

1. **Performance Score** (0-100): Overall performance rating
2. **Bottlenecks**: Identify specific performance bottlenecks with:
   - Line number
   - Issue description
   - Impact level (critical/high/medium/low)
   - Time complexity (e.g., O(n²))
   - Space complexity
3. **Optimization Suggestions**: Specific optimizations with:
   - Description
   - Expected improvement (%)
   - Implementation difficulty (easy/medium/hard)
   - Code example
4. **Best Practices**: Performance best practices for {language}

Return JSON:
{{
    "performance_score": 75,
    "bottlenecks": [
        {{
            "line": 10,
            "issue": "Nested loop causing O(n²) complexity",
            "impact": "high",
            "time_complexity": "O(n²)",
            "space_complexity": "O(1)"
        }}
    ],
    "optimizations": [
        {{
            "description": "Use hash map instead of nested loop",
            "expected_improvement": 80,
            "difficulty": "medium",
            "code_example": "use dict for O(1) lookup"
        }}
    ],
    "best_practices": ["Use list comprehensions", "Avoid global variables"]
}}
"""

    try:
        response = call_ai_model(prompt, model="deepseek", temperature=0.2)
        analysis = json.loads(response)

        # Store in database
        doc = frappe.get_doc({
            "doctype": "Oropendola Code Analysis",
            "code_hash": hashlib.sha256(code.encode()).hexdigest(),
            "language": language,
            "file_path": file_path,
            "analysis_type": "performance",
            "analysis_result": json.dumps(analysis),
            "score": analysis.get("performance_score", 0),
            "created_at": datetime.now()
        })
        doc.insert(ignore_permissions=True)
        frappe.db.commit()

        return {
            "success": True,
            "analysis_id": doc.name,
            "performance_score": analysis.get("performance_score", 0),
            "bottlenecks": analysis.get("bottlenecks", []),
            "optimizations": analysis.get("optimizations", []),
            "best_practices": analysis.get("best_practices", []),
            "language": language
        }

    except Exception as e:
        frappe.log_error(f"Performance analysis failed: {str(e)}")
        return {
            "success": False,
            "message": f"Performance analysis failed: {str(e)}"
        }


def check_complexity(code: str, language: str, file_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Cyclomatic complexity analysis

    Args:
        code: Source code to analyze
        language: Programming language
        file_path: Optional file path

    Returns:
        Complexity metrics including cyclomatic complexity, cognitive complexity, and recommendations
    """
    from ai_assistant.core.unified_gateway import call_ai_model

    prompt = f"""Analyze the complexity of this {language} code.

```{language}
{code}
```

Calculate and provide:

1. **Cyclomatic Complexity**: Number of linearly independent paths
2. **Cognitive Complexity**: How difficult the code is to understand
3. **Function/Method Breakdown**: Complexity per function
4. **Nesting Depth**: Maximum nesting level
5. **Recommendations**: How to reduce complexity

Return JSON:
{{
    "overall_complexity": {{
        "cyclomatic": 15,
        "cognitive": 12,
        "grade": "B",
        "maintainability_index": 65
    }},
    "functions": [
        {{
            "name": "process_data",
            "line_start": 10,
            "cyclomatic": 8,
            "cognitive": 7,
            "nesting_depth": 3,
            "recommendation": "Extract nested logic into separate function"
        }}
    ],
    "recommendations": [
        "Reduce nesting depth in process_data()",
        "Extract complex conditions into named variables"
    ]
}}
"""

    try:
        response = call_ai_model(prompt, model="deepseek", temperature=0.2)
        analysis = json.loads(response)

        # Store in database
        doc = frappe.get_doc({
            "doctype": "Oropendola Code Analysis",
            "code_hash": hashlib.sha256(code.encode()).hexdigest(),
            "language": language,
            "file_path": file_path,
            "analysis_type": "complexity",
            "analysis_result": json.dumps(analysis),
            "score": analysis.get("overall_complexity", {}).get("maintainability_index", 0),
            "created_at": datetime.now()
        })
        doc.insert(ignore_permissions=True)
        frappe.db.commit()

        return {
            "success": True,
            "analysis_id": doc.name,
            "overall_complexity": analysis.get("overall_complexity", {}),
            "functions": analysis.get("functions", []),
            "recommendations": analysis.get("recommendations", []),
            "language": language
        }

    except Exception as e:
        frappe.log_error(f"Complexity analysis failed: {str(e)}")
        return {
            "success": False,
            "message": f"Complexity analysis failed: {str(e)}"
        }


def check_style(code: str, language: str, style_guide: str = "standard") -> Dict[str, Any]:
    """
    Style guide compliance check

    Args:
        code: Source code to check
        language: Programming language
        style_guide: Style guide to use (standard, google, airbnb, pep8, etc.)

    Returns:
        Style violations and compliance score
    """
    from ai_assistant.core.unified_gateway import call_ai_model

    # Map style guides by language
    style_guides = {
        "python": {"pep8": "PEP 8", "google": "Google Python Style Guide", "standard": "PEP 8"},
        "javascript": {"airbnb": "Airbnb", "google": "Google", "standard": "StandardJS"},
        "java": {"google": "Google Java Style", "oracle": "Oracle Code Conventions", "standard": "Google Java Style"},
        "go": {"standard": "Effective Go", "google": "Google Go Style"},
    }

    guide = style_guides.get(language, {}).get(style_guide, f"{language} standard style")

    prompt = f"""Check this {language} code against {guide} style guide.

```{language}
{code}
```

Identify all style violations with:

1. **Line number**
2. **Violation type** (naming, spacing, formatting, documentation, etc.)
3. **Severity** (critical/high/medium/low)
4. **Description** of the violation
5. **How to fix** it
6. **Auto-fixable** (boolean)

Also provide:
- **Compliance score** (0-100)
- **Summary** of most common violations

Return JSON:
{{
    "compliance_score": 85,
    "total_violations": 12,
    "violations": [
        {{
            "line": 5,
            "type": "naming",
            "severity": "medium",
            "description": "Function name should be snake_case",
            "fix": "Rename 'ProcessData' to 'process_data'",
            "auto_fixable": true
        }}
    ],
    "summary": {{
        "naming": 3,
        "spacing": 5,
        "documentation": 4
    }}
}}
"""

    try:
        response = call_ai_model(prompt, model="deepseek", temperature=0.1)
        analysis = json.loads(response)

        # Store violations in database
        for violation in analysis.get("violations", []):
            if violation.get("severity") in ["critical", "high"]:
                frappe.get_doc({
                    "doctype": "Oropendola Code Issue",
                    "issue_type": "style",
                    "severity": violation.get("severity"),
                    "title": violation.get("description"),
                    "description": violation.get("fix"),
                    "line_start": violation.get("line"),
                    "line_end": violation.get("line"),
                    "auto_fixable": 1 if violation.get("auto_fixable") else 0,
                    "language": language
                }).insert(ignore_permissions=True)

        frappe.db.commit()

        return {
            "success": True,
            "compliance_score": analysis.get("compliance_score", 0),
            "style_guide": guide,
            "total_violations": analysis.get("total_violations", 0),
            "violations": analysis.get("violations", []),
            "summary": analysis.get("summary", {}),
            "language": language
        }

    except Exception as e:
        frappe.log_error(f"Style check failed: {str(e)}")
        return {
            "success": False,
            "message": f"Style check failed: {str(e)}"
        }


def check_vulnerabilities(code: str, language: str, file_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Comprehensive vulnerability scan

    Args:
        code: Source code to scan
        language: Programming language
        file_path: Optional file path

    Returns:
        Security vulnerabilities with CWE IDs and CVSS scores
    """
    from ai_assistant.core.unified_gateway import call_ai_model

    prompt = f"""Perform a comprehensive security vulnerability scan of this {language} code.

```{language}
{code}
```

Identify all security vulnerabilities:

1. **OWASP Top 10** vulnerabilities
2. **CWE (Common Weakness Enumeration)** IDs
3. **CVSS scores** (if applicable)
4. **Exploitability** (how easy to exploit)
5. **Impact** (what damage could be done)
6. **Remediation** (how to fix)

Return JSON:
{{
    "security_score": 65,
    "total_vulnerabilities": 5,
    "critical_count": 1,
    "high_count": 2,
    "medium_count": 2,
    "vulnerabilities": [
        {{
            "type": "sql_injection",
            "severity": "critical",
            "cwe_id": "CWE-89",
            "cvss_score": 9.8,
            "line": 45,
            "description": "SQL query built with string concatenation",
            "exploitability": "easy",
            "impact": "Complete database compromise",
            "remediation": "Use parameterized queries or ORM",
            "code_example": "Use cursor.execute(query, (user_input,))"
        }}
    ],
    "owasp_categories": {{
        "A01:2021-Broken Access Control": 0,
        "A02:2021-Cryptographic Failures": 1,
        "A03:2021-Injection": 2
    }}
}}
"""

    try:
        response = call_ai_model(prompt, model="deepseek", temperature=0.1)
        analysis = json.loads(response)

        # Store vulnerabilities in database
        for vuln in analysis.get("vulnerabilities", []):
            doc = frappe.get_doc({
                "doctype": "Oropendola Security Vulnerability",
                "vulnerability_type": vuln.get("type"),
                "severity": vuln.get("severity"),
                "cwe_id": vuln.get("cwe_id"),
                "cvss_score": vuln.get("cvss_score", 0),
                "file_path": file_path,
                "line_number": vuln.get("line"),
                "description": vuln.get("description"),
                "impact": vuln.get("impact"),
                "remediation": vuln.get("remediation"),
                "exploitability": vuln.get("exploitability"),
                "status": "detected",
                "language": language,
                "detected_at": datetime.now()
            })
            doc.insert(ignore_permissions=True)

        frappe.db.commit()

        return {
            "success": True,
            "security_score": analysis.get("security_score", 0),
            "total_vulnerabilities": analysis.get("total_vulnerabilities", 0),
            "critical_count": analysis.get("critical_count", 0),
            "high_count": analysis.get("high_count", 0),
            "medium_count": analysis.get("medium_count", 0),
            "vulnerabilities": analysis.get("vulnerabilities", []),
            "owasp_categories": analysis.get("owasp_categories", {}),
            "language": language
        }

    except Exception as e:
        frappe.log_error(f"Vulnerability scan failed: {str(e)}")
        return {
            "success": False,
            "message": f"Vulnerability scan failed: {str(e)}"
        }


def suggest_improvements(code: str, language: str, context: Optional[str] = None) -> Dict[str, Any]:
    """
    AI-powered improvement suggestions

    Args:
        code: Source code
        language: Programming language
        context: Optional context about what the code does

    Returns:
        Comprehensive improvement suggestions across all categories
    """
    from ai_assistant.core.unified_gateway import call_ai_model

    context_str = f"\n\nContext: {context}" if context else ""

    prompt = f"""Provide comprehensive improvement suggestions for this {language} code.{context_str}

```{language}
{code}
```

Analyze and suggest improvements in these categories:

1. **Performance**: Speed and efficiency improvements
2. **Readability**: Make code more understandable
3. **Maintainability**: Easier to maintain and modify
4. **Security**: Security enhancements
5. **Best Practices**: Language-specific best practices
6. **Architecture**: Design pattern improvements

For each suggestion provide:
- Category
- Priority (critical/high/medium/low)
- Description
- Before/After code example
- Estimated impact (0-100)
- Implementation effort (easy/medium/hard)

Return JSON:
{{
    "total_suggestions": 8,
    "suggestions": [
        {{
            "category": "performance",
            "priority": "high",
            "title": "Use dict comprehension instead of loop",
            "description": "Replace the for loop with a dict comprehension for better performance",
            "before": "result = {{}}\\nfor item in items:\\n    result[item.id] = item.name",
            "after": "result = {{item.id: item.name for item in items}}",
            "impact": 60,
            "effort": "easy"
        }}
    ],
    "summary": {{
        "performance": 3,
        "readability": 2,
        "security": 1,
        "best_practices": 2
    }}
}}
"""

    try:
        response = call_ai_model(prompt, model="claude", temperature=0.3)
        analysis = json.loads(response)

        # Store high-priority suggestions as refactoring items
        for suggestion in analysis.get("suggestions", []):
            if suggestion.get("priority") in ["critical", "high"]:
                frappe.get_doc({
                    "doctype": "Oropendola Code Refactoring",
                    "refactor_type": suggestion.get("category"),
                    "title": suggestion.get("title"),
                    "description": suggestion.get("description"),
                    "original_code": suggestion.get("before", ""),
                    "refactored_code": suggestion.get("after", ""),
                    "reasoning": f"Impact: {suggestion.get('impact')}%, Effort: {suggestion.get('effort')}",
                    "impact": json.dumps({
                        "improvement": suggestion.get("impact", 0),
                        "effort": suggestion.get("effort")
                    }),
                    "confidence": min(suggestion.get("impact", 50), 100),
                    "status": "suggested",
                    "language": language
                }).insert(ignore_permissions=True)

        frappe.db.commit()

        return {
            "success": True,
            "total_suggestions": analysis.get("total_suggestions", 0),
            "suggestions": analysis.get("suggestions", []),
            "summary": analysis.get("summary", {}),
            "language": language
        }

    except Exception as e:
        frappe.log_error(f"Improvement suggestions failed: {str(e)}")
        return {
            "success": False,
            "message": f"Improvement suggestions failed: {str(e)}"
        }


def compare_quality(
    current_code: str,
    previous_code: Optional[str] = None,
    language: str = "python",
    file_path: Optional[str] = None
) -> Dict[str, Any]:
    """
    Compare code quality over time

    Args:
        current_code: Current version of the code
        previous_code: Previous version to compare against (optional, can lookup from history)
        language: Programming language
        file_path: File path (used to lookup previous versions if previous_code not provided)

    Returns:
        Quality comparison showing improvements or regressions
    """
    from ai_assistant.core.unified_gateway import call_ai_model

    # If previous_code not provided, try to get from database
    if not previous_code and file_path:
        code_hash = hashlib.sha256(current_code.encode()).hexdigest()

        # Look for previous analysis of the same file
        previous_analyses = frappe.db.get_all(
            "Oropendola Code Analysis",
            filters={
                "file_path": file_path,
                "language": language,
                "code_hash": ["!=", code_hash]
            },
            fields=["code_hash", "score", "created_at"],
            order_by="created_at desc",
            limit=1
        )

        if not previous_analyses:
            return {
                "success": False,
                "message": "No previous version found for comparison"
            }

    # Perform quality analysis on both versions
    prompt = f"""Compare the quality of these two versions of {language} code.

CURRENT VERSION:
```{language}
{current_code}
```

PREVIOUS VERSION:
```{language}
{previous_code or "Not provided"}
```

Provide a detailed comparison:

1. **Overall Quality Score**: Current vs Previous (0-100)
2. **Metrics Comparison**:
   - Lines of code
   - Cyclomatic complexity
   - Test coverage (if visible)
   - Documentation quality
3. **Improvements**: What got better
4. **Regressions**: What got worse
5. **Recommendations**: Further improvements

Return JSON:
{{
    "current_score": 85,
    "previous_score": 75,
    "delta": 10,
    "trend": "improving",
    "metrics": {{
        "lines_of_code": {{"current": 150, "previous": 180, "delta": -30}},
        "complexity": {{"current": 8, "previous": 12, "delta": -4}},
        "documentation": {{"current": 90, "previous": 60, "delta": 30}}
    }},
    "improvements": [
        "Reduced complexity from 12 to 8",
        "Added comprehensive docstrings",
        "Removed duplicate code"
    ],
    "regressions": [
        "Added nested loop increasing time complexity"
    ],
    "recommendations": [
        "Add unit tests",
        "Extract magic numbers into constants"
    ]
}}
"""

    try:
        response = call_ai_model(prompt, model="claude", temperature=0.2)
        comparison = json.loads(response)

        # Store comparison in database
        doc = frappe.get_doc({
            "doctype": "Oropendola Code Analysis",
            "code_hash": hashlib.sha256(current_code.encode()).hexdigest(),
            "language": language,
            "file_path": file_path,
            "analysis_type": "quality_comparison",
            "analysis_result": json.dumps(comparison),
            "score": comparison.get("current_score", 0),
            "created_at": datetime.now()
        })
        doc.insert(ignore_permissions=True)
        frappe.db.commit()

        return {
            "success": True,
            "current_score": comparison.get("current_score", 0),
            "previous_score": comparison.get("previous_score", 0),
            "delta": comparison.get("delta", 0),
            "trend": comparison.get("trend", "unknown"),
            "metrics": comparison.get("metrics", {}),
            "improvements": comparison.get("improvements", []),
            "regressions": comparison.get("regressions", []),
            "recommendations": comparison.get("recommendations", []),
            "language": language
        }

    except Exception as e:
        frappe.log_error(f"Quality comparison failed: {str(e)}")
        return {
            "success": False,
            "message": f"Quality comparison failed: {str(e)}"
        }
