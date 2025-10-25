#!/bin/bash

################################################################################
# OROPENDOLA AI - ROLLBACK SCRIPT
################################################################################
#
# This script rolls back the deployment if something goes wrong.
#
# Usage: bash ROLLBACK.sh
#
# Author: Claude (AI Assistant)
# Date: October 25, 2025
#
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SERVER="frappe@oropendola.ai"
REMOTE_PATH="/home/frappe/frappe-bench/apps/ai_assistant"

print_header() {
    echo -e "\n${RED}========================================${NC}"
    echo -e "${RED}$1${NC}"
    echo -e "${RED}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_header "ROLLBACK SCRIPT"

print_warning "This will rollback the recent deployment!"
echo ""
read -p "Are you sure you want to rollback? (yes/no): " response

if [[ ! "$response" =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Rollback cancelled."
    exit 0
fi

print_info "Connecting to server..."

ssh $SERVER << 'ENDSSH'
    cd /home/frappe/frappe-bench/apps/ai_assistant

    echo ""
    echo "=========================================="
    echo "Finding most recent backup..."
    echo "=========================================="

    # Find most recent backup directory
    BACKUP_DIR=$(ls -td backup_* 2>/dev/null | head -1)

    if [ -z "$BACKUP_DIR" ]; then
        echo "✗ No backup found!"
        echo "Cannot rollback without a backup."
        exit 1
    fi

    echo "Found backup: $BACKUP_DIR"
    echo ""

    # List backup contents
    echo "Backup contents:"
    ls -lh $BACKUP_DIR/
    echo ""

    read -p "Restore from this backup? (yes/no): " confirm
    if [[ ! "$confirm" =~ ^[Yy][Ee][Ss]$ ]]; then
        echo "Rollback cancelled."
        exit 0
    fi

    echo ""
    echo "=========================================="
    echo "Restoring files from backup..."
    echo "=========================================="

    # Restore cron_jobs.py if it exists
    if [ -f "$BACKUP_DIR/cron_jobs.py" ]; then
        cp $BACKUP_DIR/cron_jobs.py ai_assistant/
        echo "✓ Restored cron_jobs.py"
    fi

    # Restore hooks.py if it exists
    if [ -f "$BACKUP_DIR/hooks.py" ]; then
        cp $BACKUP_DIR/hooks.py ai_assistant/
        echo "✓ Restored hooks.py"
    fi

    # Restore api/__init__.py if it exists
    if [ -f "$BACKUP_DIR/__init__.py" ]; then
        cp $BACKUP_DIR/__init__.py ai_assistant/api/
        echo "✓ Restored api/__init__.py"
    fi

    echo ""
    echo "=========================================="
    echo "Restarting Frappe services..."
    echo "=========================================="

    cd /home/frappe/frappe-bench

    # Clear cache
    bench --site oropendola.ai clear-cache

    # Restart scheduler
    bench --site oropendola.ai scheduler restart

    # Restart bench
    bench restart

    echo ""
    echo "=========================================="
    echo "✓ Rollback completed successfully"
    echo "=========================================="
    echo ""
    echo "Services have been restored to previous state."
    echo ""
ENDSSH

print_success "Rollback completed!"
print_info ""
print_info "Next steps:"
print_info "1. Verify the system is working"
print_info "2. Check logs: tail -f /home/frappe/frappe-bench/logs/frappe.log"
print_info "3. Review what went wrong before redeploying"
print_info ""
