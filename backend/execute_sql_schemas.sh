#!/bin/bash

################################################################################
# SQL SCHEMAS EXECUTION SCRIPT
################################################################################
#
# Run this script ON THE SERVER after uploading files
#
# Usage:
#   scp execute_sql_schemas.sh frappe@oropendola.ai:/home/frappe/frappe-bench/apps/ai_assistant/
#   ssh frappe@oropendola.ai
#   cd /home/frappe/frappe-bench/apps/ai_assistant
#   bash execute_sql_schemas.sh
#
################################################################################

set -e

echo "=========================================="
echo "SQL Schemas Execution Script"
echo "=========================================="
echo ""

# Change to bench directory
cd /home/frappe/frappe-bench

# Check if schemas exist
if [ ! -f "apps/ai_assistant/sql_schemas/week_9_analytics_schema.sql" ]; then
    echo "Error: SQL schema files not found!"
    echo "Please run DEPLOY_TO_PRODUCTION.sh first"
    exit 1
fi

echo "Found SQL schema files:"
ls -lh apps/ai_assistant/sql_schemas/
echo ""

# Execute Week 9 Analytics Schema
echo "Executing Week 9 Analytics Schema..."
echo "Creating 6 DocTypes..."
bench --site oropendola.ai mariadb < apps/ai_assistant/sql_schemas/week_9_analytics_schema.sql
echo "✓ Week 9 Analytics schema executed"
echo ""

# Execute Week 11 Phase 4 Schema
echo "Executing Week 11 Phase 4 Custom Actions Schema..."
echo "Creating 2 DocTypes..."
bench --site oropendola.ai mariadb < apps/ai_assistant/sql_schemas/week_11_phase_4_custom_actions_schema.sql
echo "✓ Week 11 Phase 4 schema executed"
echo ""

# Execute Week 12 Security Schema
echo "Executing Week 12 Security Schema..."
echo "Creating 11 DocTypes..."
bench --site oropendola.ai mariadb < apps/ai_assistant/sql_schemas/week_12_security_schema.sql
echo "✓ Week 12 Security schema executed"
echo ""

# Verify tables were created
echo "Verifying tables were created..."
bench --site oropendola.ai mariadb -e "SHOW TABLES LIKE '%analytics%';" | head -10
bench --site oropendola.ai mariadb -e "SHOW TABLES LIKE '%custom%';" | head -5
bench --site oropendola.ai mariadb -e "SHOW TABLES LIKE '%security%';" | head -10
echo ""

echo "=========================================="
echo "✓ All SQL schemas executed successfully!"
echo "=========================================="
echo ""
echo "Total DocTypes created: 19"
echo "  • Week 9 Analytics: 6 tables"
echo "  • Week 11 Phase 4: 2 tables"
echo "  • Week 12 Security: 11 tables"
echo ""
echo "Next step: Update API endpoints in api/__init__.py"
echo ""
