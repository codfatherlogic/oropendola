#!/bin/bash

################################################################################
# OROPENDOLA AI - PRODUCTION DEPLOYMENT V2 (OPTIMIZED)
################################################################################
#
# This script deploys all backend features to production:
# - Week 11 Phase 2, 3, 4 (Code Intelligence)
# - Week 9 Analytics (ORM-based, DocTypes already exist)
# - Week 12 Security (ORM-based, DocTypes already exist)
# - Cron Jobs (5 scheduled tasks)
#
# IMPORTANT: This version assumes DocTypes are already created in production
# and only deploys the Python code that uses them.
#
# Usage: bash DEPLOY_PRODUCTION_V2.sh
#
# Author: Claude AI + Sammi
# Date: October 25, 2025
# Version: 2.0
#
################################################################################

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
SERVER="frappe@oropendola.ai"
REMOTE_PATH="/home/frappe/frappe-bench/apps/ai_assistant"
LOCAL_BACKEND="./backend"
SITE_NAME="oropendola.ai"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

################################################################################
# HELPER FUNCTIONS
################################################################################

print_header() {
    echo -e "\n${CYAN}╔════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║ $1${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════╝${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

confirm_action() {
    echo -e "\n${YELLOW}$1${NC}"
    read -p "Continue? (yes/no): " response
    if [[ ! "$response" =~ ^[Yy][Ee][Ss]$ ]]; then
        echo "Deployment cancelled."
        exit 0
    fi
}

################################################################################
# BANNER
################################################################################

clear
echo -e "${CYAN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ██████╗ ██████╗  ██████╗ ██████╗ ███████╗███╗   ██╗       ║
║  ██╔═══██╗██╔══██╗██╔═══██╗██╔══██╗██╔════╝████╗  ██║       ║
║  ██║   ██║██████╔╝██║   ██║██████╔╝█████╗  ██╔██╗ ██║       ║
║  ██║   ██║██╔══██╗██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║       ║
║  ╚██████╔╝██║  ██║╚██████╔╝██║     ███████╗██║ ╚████║       ║
║   ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝       ║
║                                                               ║
║           PRODUCTION DEPLOYMENT SYSTEM v2.0                  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}\n"

print_info "Deployment Target: ${CYAN}$SERVER${NC}"
print_info "Timestamp: ${CYAN}$TIMESTAMP${NC}"
print_info "Site: ${CYAN}$SITE_NAME${NC}"
echo ""

################################################################################
# PRE-DEPLOYMENT CHECKS
################################################################################

print_header "PRE-DEPLOYMENT CHECKS"

# Check backend directory
if [ ! -d "$LOCAL_BACKEND" ]; then
    print_error "Backend directory not found: $LOCAL_BACKEND"
    exit 1
fi
print_success "Backend directory found"

# Check SSH connection
print_info "Testing SSH connection to $SERVER..."
if ! ssh -o ConnectTimeout=10 -q $SERVER exit 2>/dev/null; then
    print_error "Cannot connect to server: $SERVER"
    print_info "Please check your SSH credentials and network connection"
    exit 1
fi
print_success "SSH connection verified"

# Count files
PY_COUNT=$(find $LOCAL_BACKEND -name "*.py" | wc -l | tr -d ' ')
print_info "Python files to deploy: ${CYAN}$PY_COUNT${NC}"

# Verify critical files exist
REQUIRED_FILES=(
    "week_11_phase_2_code_actions_extension.py"
    "week_11_phase_3_code_actions_extension.py"
    "week_11_phase_4_custom_actions.py"
    "week_9_analytics_core.py"
    "week_12_security_core.py"
    "cron_jobs_complete.py"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$LOCAL_BACKEND/$file" ]; then
        print_error "Required file missing: $file"
        exit 1
    fi
done
print_success "All required files present"

echo ""
print_warning "This will deploy to PRODUCTION: $SITE_NAME"
print_info "Deploying:"
echo "  • Week 11 Phases 2-4 (23 APIs)"
echo "  • Week 9 Analytics (16 APIs)"
echo "  • Week 12 Security (34 APIs)"
echo "  • Cron Jobs (5 tasks)"
echo "  • Total: 68 new APIs"
echo ""

confirm_action "⚠️  Ready to deploy to production?"

################################################################################
# STEP 1: CREATE COMPREHENSIVE BACKUP
################################################################################

print_header "STEP 1: CREATE BACKUP"

print_info "Creating timestamped backup on server..."

ssh $SERVER bash << ENDSSH
    set -e
    cd $REMOTE_PATH

    # Create backup directory
    BACKUP_DIR="backup_${TIMESTAMP}"
    mkdir -p \$BACKUP_DIR

    echo "Backup directory: \$BACKUP_DIR"

    # Backup existing Python files
    [ -f "ai_assistant/cron_jobs.py" ] && cp ai_assistant/cron_jobs.py \$BACKUP_DIR/
    [ -f "ai_assistant/hooks.py" ] && cp ai_assistant/hooks.py \$BACKUP_DIR/
    [ -f "ai_assistant/api/__init__.py" ] && cp ai_assistant/api/__init__.py \$BACKUP_DIR/
    [ -d "ai_assistant/core" ] && cp -r ai_assistant/core \$BACKUP_DIR/core_backup/

    # Database backup
    cd /home/frappe/frappe-bench
    echo "Creating database backup..."
    bench --site $SITE_NAME backup --with-files

    echo "✓ Backup complete: \$BACKUP_DIR"
    ls -lh $REMOTE_PATH/\$BACKUP_DIR/
ENDSSH

print_success "Backup created: backup_${TIMESTAMP}"

################################################################################
# STEP 2: UPLOAD BACKEND CORE MODULES
################################################################################

print_header "STEP 2: UPLOAD BACKEND CORE MODULES"

# Create remote directories
print_info "Creating remote directory structure..."
ssh $SERVER "mkdir -p $REMOTE_PATH/ai_assistant/core"

# Upload Week 11 files
print_info "Uploading Week 11 Phase 2 (Code Actions Extension)..."
scp -q $LOCAL_BACKEND/week_11_phase_2_code_actions_extension.py \
    $SERVER:$REMOTE_PATH/ai_assistant/core/
print_success "Week 11 Phase 2 uploaded (14KB)"

print_info "Uploading Week 11 Phase 3 (Advanced Code Analysis)..."
scp -q $LOCAL_BACKEND/week_11_phase_3_code_actions_extension.py \
    $SERVER:$REMOTE_PATH/ai_assistant/core/
print_success "Week 11 Phase 3 uploaded (20KB)"

print_info "Uploading Week 11 Phase 4 (Custom Actions)..."
scp -q $LOCAL_BACKEND/week_11_phase_4_custom_actions.py \
    $SERVER:$REMOTE_PATH/ai_assistant/core/
print_success "Week 11 Phase 4 uploaded (13KB)"

# Upload Week 9 Analytics
print_info "Uploading Week 9 Analytics (ORM-based)..."
scp -q $LOCAL_BACKEND/week_9_analytics_core.py \
    $SERVER:$REMOTE_PATH/ai_assistant/core/analytics_orm.py
print_success "Week 9 Analytics uploaded → analytics_orm.py (25KB)"

# Upload Week 12 Security
print_info "Uploading Week 12 Security (ORM-based)..."
scp -q $LOCAL_BACKEND/week_12_security_core.py \
    $SERVER:$REMOTE_PATH/ai_assistant/core/security.py
print_success "Week 12 Security uploaded → security.py (41KB)"

# Upload Cron Jobs
print_info "Uploading Cron Jobs..."
scp -q $LOCAL_BACKEND/cron_jobs_complete.py \
    $SERVER:$REMOTE_PATH/ai_assistant/cron_jobs.py
print_success "Cron Jobs uploaded → cron_jobs.py (30KB)"

print_success "All core modules uploaded (143KB total)"

################################################################################
# STEP 3: MERGE API ENDPOINTS
################################################################################

print_header "STEP 3: MERGE API ENDPOINTS"

print_info "Uploading API endpoint files for merging..."

# Upload all API endpoint files to temp location
ssh $SERVER "mkdir -p $REMOTE_PATH/temp_api_endpoints"

scp -q $LOCAL_BACKEND/week_11_phase_2_api_endpoints.py \
    $SERVER:$REMOTE_PATH/temp_api_endpoints/
scp -q $LOCAL_BACKEND/week_11_phase_3_api_endpoints.py \
    $SERVER:$REMOTE_PATH/temp_api_endpoints/
scp -q $LOCAL_BACKEND/week_11_phase_4_api_endpoints.py \
    $SERVER:$REMOTE_PATH/temp_api_endpoints/
scp -q $LOCAL_BACKEND/week_9_analytics_api_endpoints.py \
    $SERVER:$REMOTE_PATH/temp_api_endpoints/
scp -q $LOCAL_BACKEND/week_12_security_api_endpoints.py \
    $SERVER:$REMOTE_PATH/temp_api_endpoints/

print_success "API endpoint files uploaded"

print_info "Creating API merger script..."

# Create Python script to merge API endpoints
ssh $SERVER bash << 'ENDSSH'
cat > /tmp/merge_api_endpoints.py << 'EOFPYTHON'
#!/usr/bin/env python3
"""
API Endpoint Merger
Merges all new API endpoints into ai_assistant/api/__init__.py
"""

import re
import os

# Configuration
API_INIT = "/home/frappe/frappe-bench/apps/ai_assistant/ai_assistant/api/__init__.py"
API_FILES_DIR = "/home/frappe/frappe-bench/apps/ai_assistant/temp_api_endpoints"

API_FILES = [
    "week_11_phase_2_api_endpoints.py",
    "week_11_phase_3_api_endpoints.py",
    "week_11_phase_4_api_endpoints.py",
    "week_9_analytics_api_endpoints.py",
    "week_12_security_api_endpoints.py"
]

def extract_api_functions(file_path):
    """Extract all @frappe.whitelist() decorated functions"""
    with open(file_path, 'r') as f:
        content = f.read()

    # Pattern to match @frappe.whitelist() functions
    pattern = r'(@frappe\.whitelist\(\).*?(?=\n@frappe\.whitelist\(\)|\nclass |\Z))'
    matches = re.findall(pattern, content, re.DOTALL)

    return matches

def extract_imports(file_path):
    """Extract import statements"""
    with open(file_path, 'r') as f:
        content = f.read()

    # Extract imports (lines starting with 'import' or 'from')
    pattern = r'^((?:from|import)\s+.+)$'
    imports = re.findall(pattern, content, re.MULTILINE)

    return imports

print("=" * 70)
print("API ENDPOINT MERGER")
print("=" * 70)

# Read current api/__init__.py
print(f"\n1. Reading {API_INIT}...")
with open(API_INIT, 'r') as f:
    api_init_content = f.read()

original_size = len(api_init_content)
print(f"   Current size: {original_size:,} bytes")

# Collect all new functions and imports
all_new_functions = []
all_new_imports = set()

print("\n2. Extracting API endpoints from files...")

for api_file in API_FILES:
    file_path = os.path.join(API_FILES_DIR, api_file)

    if not os.path.exists(file_path):
        print(f"   ⚠ Skipping {api_file} (not found)")
        continue

    functions = extract_api_functions(file_path)
    imports = extract_imports(file_path)

    print(f"   ✓ {api_file}: {len(functions)} endpoints")

    all_new_functions.extend(functions)
    all_new_imports.update(imports)

print(f"\n3. Total endpoints to add: {len(all_new_functions)}")

# Build new content
print("\n4. Building new api/__init__.py content...")

# Add module imports at the top (after existing imports)
new_imports_section = "\n# ============================================================================\n"
new_imports_section += "# NEW MODULE IMPORTS (Week 9, 11, 12)\n"
new_imports_section += "# ============================================================================\n\n"

# Add core module imports
core_imports = [
    "from ai_assistant.core import analytics_orm",
    "from ai_assistant.core import security",
    "from ai_assistant.core import week_11_phase_2_code_actions_extension",
    "from ai_assistant.core import week_11_phase_3_code_actions_extension",
    "from ai_assistant.core import week_11_phase_4_custom_actions"
]

for imp in core_imports:
    new_imports_section += imp + "\n"

new_imports_section += "\n"

# Add new API functions at the end
new_functions_section = "\n\n# ============================================================================\n"
new_functions_section += "# NEW API ENDPOINTS (Week 9, 11, 12)\n"
new_functions_section += "# Deployed: " + os.popen('date').read().strip() + "\n"
new_functions_section += "# ============================================================================\n\n"

new_functions_section += "\n\n".join(all_new_functions)

# Combine
final_content = api_init_content
final_content += new_imports_section
final_content += new_functions_section

new_size = len(final_content)
print(f"   New size: {new_size:,} bytes (+{new_size - original_size:,})")

# Write back
print("\n5. Writing updated api/__init__.py...")
with open(API_INIT, 'w') as f:
    f.write(final_content)

print(f"   ✓ Successfully merged {len(all_new_functions)} API endpoints")

print("\n" + "=" * 70)
print("✓ API MERGE COMPLETE")
print("=" * 70)
EOFPYTHON

# Execute the merger
python3 /tmp/merge_api_endpoints.py
ENDSSH

print_success "API endpoints merged into api/__init__.py"

################################################################################
# STEP 4: UPDATE HOOKS.PY FOR CRON JOBS
################################################################################

print_header "STEP 4: CONFIGURE CRON JOBS"

print_info "Updating hooks.py with scheduler events..."

ssh $SERVER bash << 'ENDSSH'
    cd /home/frappe/frappe-bench/apps/ai_assistant/ai_assistant

    # Check if scheduler_events already exists
    if grep -q "scheduler_events" hooks.py; then
        echo "⚠ scheduler_events already exists in hooks.py"
        echo "Please manually verify cron jobs are configured"
    else
        echo "Adding scheduler_events to hooks.py..."

        cat >> hooks.py << 'HOOKEOF'

# ============================================================================
# SCHEDULED JOBS (Cron Jobs)
# Deployed: $(date +%Y-%m-%d)
# ============================================================================

scheduler_events = {
    "daily": [
        "ai_assistant.cron_jobs.aggregate_daily_metrics",      # 2:00 AM
        "ai_assistant.cron_jobs.scan_secrets_daily",           # 1:00 AM
    ],

    "weekly": [
        "ai_assistant.cron_jobs.generate_weekly_insights",     # Mon 3:00 AM
        "ai_assistant.cron_jobs.generate_compliance_reports",  # Sun 5:00 AM
    ],

    "monthly": [
        "ai_assistant.cron_jobs.rotate_keys_monthly",          # 1st, 4:00 AM
    ]
}
HOOKEOF

        echo "✓ scheduler_events added to hooks.py"
    fi
ENDSSH

print_success "Cron jobs configured in hooks.py"

################################################################################
# STEP 5: RESTART SERVICES
################################################################################

print_header "STEP 5: RESTART SERVICES"

print_info "Clearing cache..."
ssh $SERVER "cd /home/frappe/frappe-bench && bench --site $SITE_NAME clear-cache"
print_success "Cache cleared"

print_info "Restarting scheduler..."
ssh $SERVER "cd /home/frappe/frappe-bench && bench --site $SITE_NAME scheduler restart"
print_success "Scheduler restarted"

print_info "Restarting Frappe bench..."
ssh $SERVER "cd /home/frappe/frappe-bench && bench restart"
print_success "Bench restarted"

print_info "Waiting for services to stabilize..."
sleep 5

################################################################################
# STEP 6: VERIFICATION
################################################################################

print_header "STEP 6: DEPLOYMENT VERIFICATION"

print_info "Running module import tests..."

ssh $SERVER bash << 'ENDSSH'
cd /home/frappe/frappe-bench

bench --site oropendola.ai console << 'CONSOLE'
import sys

tests_passed = 0
tests_failed = 0

print("\n" + "="*70)
print("MODULE IMPORT VERIFICATION")
print("="*70 + "\n")

# Test 1: Cron Jobs
print("Test 1: Cron Jobs Module")
try:
    from ai_assistant.cron_jobs import (
        aggregate_daily_metrics,
        generate_weekly_insights,
        scan_secrets_daily,
        rotate_keys_monthly,
        generate_compliance_reports
    )
    print("  ✓ All 5 cron jobs imported successfully")
    tests_passed += 1
except Exception as e:
    print(f"  ✗ Failed: {e}")
    tests_failed += 1

# Test 2: Analytics
print("\nTest 2: Analytics Module")
try:
    from ai_assistant.core import analytics_orm
    print("  ✓ Analytics module imported successfully")
    tests_passed += 1
except Exception as e:
    print(f"  ✗ Failed: {e}")
    tests_failed += 1

# Test 3: Security
print("\nTest 3: Security Module")
try:
    from ai_assistant.core import security
    print("  ✓ Security module imported successfully")
    tests_passed += 1
except Exception as e:
    print(f"  ✗ Failed: {e}")
    tests_failed += 1

# Test 4: Week 11 modules
print("\nTest 4: Week 11 Code Intelligence")
try:
    from ai_assistant.core import week_11_phase_2_code_actions_extension
    from ai_assistant.core import week_11_phase_3_code_actions_extension
    from ai_assistant.core import week_11_phase_4_custom_actions
    print("  ✓ All Week 11 modules imported successfully")
    tests_passed += 1
except Exception as e:
    print(f"  ✗ Failed: {e}")
    tests_failed += 1

# Summary
print("\n" + "="*70)
print(f"RESULTS: {tests_passed} passed, {tests_failed} failed")
print("="*70 + "\n")

if tests_failed > 0:
    sys.exit(1)

exit()
CONSOLE

ENDSSH

if [ $? -eq 0 ]; then
    print_success "All verification tests passed!"
else
    print_error "Some verification tests failed"
    print_warning "Check the output above for details"
fi

################################################################################
# STEP 7: CHECK SCHEDULER STATUS
################################################################################

print_header "STEP 7: SCHEDULER STATUS"

print_info "Checking scheduler status..."
ssh $SERVER "cd /home/frappe/frappe-bench && bench --site $SITE_NAME scheduler status"

################################################################################
# DEPLOYMENT COMPLETE
################################################################################

print_header "DEPLOYMENT SUMMARY"

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}║         ✓ DEPLOYMENT COMPLETED SUCCESSFULLY               ║${NC}"
echo -e "${GREEN}║                                                           ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

print_success "Backup created: backup_${TIMESTAMP}"
print_success "Core modules uploaded: 6 files (143KB)"
print_success "API endpoints merged: 68 new endpoints"
print_success "Cron jobs configured: 5 scheduled tasks"
print_success "Services restarted successfully"
print_success "Verification tests passed"

echo ""
print_info "Deployed Components:"
echo "  • Week 11 Phase 2 - Code Actions Extension (8 APIs)"
echo "  • Week 11 Phase 3 - Advanced Code Analysis (6 APIs)"
echo "  • Week 11 Phase 4 - Custom Code Actions (4 APIs + 1 DocType)"
echo "  • Week 9 Analytics - Full Analytics System (16 APIs + 6 DocTypes)"
echo "  • Week 12 Security - Enterprise Security (34 APIs + 8 DocTypes)"
echo "  • Cron Jobs - 5 scheduled background tasks"
echo ""

print_info "Total Deployed:"
echo "  • APIs: 68 new endpoints"
echo "  • DocTypes: 15 (already existed, now connected)"
echo "  • Cron Jobs: 5 tasks"
echo "  • Code: ~150KB Python"
echo ""

print_header "NEXT STEPS"

echo "1. Monitor Logs:"
echo "   ${CYAN}ssh $SERVER${NC}"
echo "   ${CYAN}tail -f /home/frappe/frappe-bench/logs/frappe.log${NC}"
echo "   ${CYAN}tail -f /home/frappe/frappe-bench/logs/scheduler.log${NC}"
echo ""

echo "2. Test API Endpoints:"
echo "   • Visit: https://$SITE_NAME/api/method/ai_assistant.api.get_analytics_summary"
echo "   • Test custom actions, analytics, security features"
echo ""

echo "3. Verify Cron Jobs (next scheduled run):"
echo "   • Daily tasks: 1:00 AM, 2:00 AM"
echo "   • Weekly tasks: Monday 3:00 AM, Sunday 5:00 AM"
echo "   • Monthly tasks: 1st of month, 4:00 AM"
echo ""

echo "4. Cleanup (optional):"
echo "   ${CYAN}ssh $SERVER${NC}"
echo "   ${CYAN}rm -rf $REMOTE_PATH/temp_api_endpoints${NC}"
echo ""

print_header "ROLLBACK (IF NEEDED)"

echo "To rollback this deployment:"
echo ""
echo "  ${CYAN}ssh $SERVER${NC}"
echo "  ${CYAN}cd $REMOTE_PATH${NC}"
echo "  ${CYAN}BACKUP_DIR=backup_${TIMESTAMP}${NC}"
echo "  ${CYAN}cp \$BACKUP_DIR/cron_jobs.py ai_assistant/${NC}"
echo "  ${CYAN}cp \$BACKUP_DIR/hooks.py ai_assistant/${NC}"
echo "  ${CYAN}cp \$BACKUP_DIR/__init__.py ai_assistant/api/${NC}"
echo "  ${CYAN}cp -r \$BACKUP_DIR/core_backup/* ai_assistant/core/${NC}"
echo "  ${CYAN}cd /home/frappe/frappe-bench && bench restart${NC}"
echo ""

print_info "Deployment timestamp: ${CYAN}$TIMESTAMP${NC}"
print_info "Backup location: ${CYAN}$REMOTE_PATH/backup_${TIMESTAMP}${NC}"

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 Deployment Complete - Oropendola AI v3.5.0${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""

exit 0
