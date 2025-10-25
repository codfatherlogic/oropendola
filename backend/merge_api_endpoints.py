"""
API Endpoints Merger Script
============================

This script merges all API endpoint files into ai_assistant/api/__init__.py

Run this ON THE SERVER after uploading files:
    cd /home/frappe/frappe-bench/apps/ai_assistant
    python3 merge_api_endpoints.py

Author: Claude (AI Assistant)
Date: October 25, 2025
"""

import os
import re
from datetime import datetime

# Configuration
API_INIT_FILE = "/home/frappe/frappe-bench/apps/ai_assistant/ai_assistant/api/__init__.py"
BACKEND_DIR = "/home/frappe/frappe-bench/apps/ai_assistant"

# Files to merge
API_FILES = [
    f"{BACKEND_DIR}/backend/week_11_phase_2_api_endpoints.py",
    f"{BACKEND_DIR}/backend/week_11_phase_3_api_endpoints.py",
    f"{BACKEND_DIR}/backend/week_11_phase_4_api_endpoints.py",
    f"{BACKEND_DIR}/backend/week_9_analytics_api_endpoints.py",
    f"{BACKEND_DIR}/backend/week_12_security_api_endpoints.py",
]

# Module imports to add
MODULE_IMPORTS = """
# Week 11: Code Intelligence
from ai_assistant.core import week_11_phase_2_code_actions_extension as code_actions_p2
from ai_assistant.core import week_11_phase_3_code_actions_extension as code_actions_p3
from ai_assistant.core import week_11_phase_4_custom_actions as custom_actions

# Week 9: Analytics
from ai_assistant.core import analytics_orm as analytics

# Week 12: Security
from ai_assistant.core import security as security_core
"""

def backup_file(filepath):
    """Create a backup of the file"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{filepath}.backup_{timestamp}"

    if os.path.exists(filepath):
        with open(filepath, 'r') as f:
            content = f.read()
        with open(backup_path, 'w') as f:
            f.write(content)
        print(f"✓ Backup created: {backup_path}")
        return backup_path
    return None

def read_api_file(filepath):
    """Read and extract API functions from a file"""
    if not os.path.exists(filepath):
        print(f"⚠ File not found: {filepath}")
        return []

    with open(filepath, 'r') as f:
        content = f.read()

    # Extract all @frappe.whitelist() decorated functions
    functions = []

    # Find all function blocks
    pattern = r'(@frappe\.whitelist\(\).*?(?=\n@frappe\.whitelist\(\)|\nclass |\Z))'
    matches = re.findall(pattern, content, re.DOTALL)

    for match in matches:
        # Clean up the function
        func_content = match.strip()
        if func_content:
            functions.append(func_content)

    return functions

def merge_api_endpoints():
    """Merge all API endpoint files into api/__init__.py"""

    print("=" * 80)
    print("API ENDPOINTS MERGER")
    print("=" * 80)
    print()

    # Check if api/__init__.py exists
    if not os.path.exists(API_INIT_FILE):
        print(f"✗ API init file not found: {API_INIT_FILE}")
        return False

    # Create backup
    print("Creating backup...")
    backup_path = backup_file(API_INIT_FILE)

    # Read existing content
    with open(API_INIT_FILE, 'r') as f:
        existing_content = f.read()

    # Collect all new API functions
    all_new_functions = []

    for api_file in API_FILES:
        filename = os.path.basename(api_file)
        print(f"\nReading {filename}...")

        functions = read_api_file(api_file)

        if functions:
            print(f"  Found {len(functions)} API functions")
            all_new_functions.extend([
                f"\n\n# ===== From {filename} =====\n" + func
                for func in functions
            ])
        else:
            print(f"  ⚠ No functions found")

    if not all_new_functions:
        print("\n✗ No new API functions found to merge")
        return False

    # Check if imports already exist
    if MODULE_IMPORTS.strip() not in existing_content:
        # Add imports after existing imports
        import_section_end = existing_content.rfind("import")
        if import_section_end != -1:
            # Find the end of that import line
            next_newline = existing_content.find("\n\n", import_section_end)
            if next_newline != -1:
                existing_content = (
                    existing_content[:next_newline] +
                    "\n" + MODULE_IMPORTS +
                    existing_content[next_newline:]
                )
                print("\n✓ Added module imports")
            else:
                existing_content += "\n" + MODULE_IMPORTS
                print("\n✓ Appended module imports")
        else:
            existing_content = MODULE_IMPORTS + "\n\n" + existing_content
            print("\n✓ Prepended module imports")
    else:
        print("\n✓ Module imports already present")

    # Append all new functions
    new_content = existing_content + "\n\n" + "\n".join(all_new_functions)

    # Write back to file
    with open(API_INIT_FILE, 'w') as f:
        f.write(new_content)

    print("\n" + "=" * 80)
    print("✓ API endpoints merged successfully!")
    print("=" * 80)
    print()
    print(f"Total new API functions added: {len(all_new_functions)}")
    print(f"Backup location: {backup_path}")
    print()
    print("Next steps:")
    print("1. Verify the merged file:")
    print(f"   cat {API_INIT_FILE} | grep '@frappe.whitelist' | wc -l")
    print()
    print("2. Restart Frappe:")
    print("   cd /home/frappe/frappe-bench")
    print("   bench --site oropendola.ai clear-cache")
    print("   bench restart")
    print()

    return True

if __name__ == "__main__":
    try:
        success = merge_api_endpoints()
        exit(0 if success else 1)
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
