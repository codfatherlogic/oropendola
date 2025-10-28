#!/bin/bash

# Oropendola AI - OAuth Backend Deployment Script
# This script deploys the OAuth authentication files to the Frappe server

set -e  # Exit on error

echo "🚀 Deploying Oropendola OAuth Backend Files"
echo "==========================================="
echo ""

# Configuration
FRAPPE_USER="frappe"
FRAPPE_HOST="oropendola.ai"
FRAPPE_PATH="/home/frappe/frappe-bench/apps/oropendola_ai"
APP_NAME="oropendola_ai"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Copying backend API file${NC}"
scp backend/vscode_extension.py ${FRAPPE_USER}@${FRAPPE_HOST}:${FRAPPE_PATH}/${APP_NAME}/api/
echo -e "${GREEN}✓ vscode_extension.py copied${NC}"
echo ""

echo -e "${BLUE}Step 2: Creating vscode-auth directory${NC}"
ssh ${FRAPPE_USER}@${FRAPPE_HOST} "mkdir -p ${FRAPPE_PATH}/www/vscode-auth"
echo -e "${GREEN}✓ Directory created${NC}"
echo ""

echo -e "${BLUE}Step 3: Copying authentication page files${NC}"
scp backend/www/vscode-auth/index.html ${FRAPPE_USER}@${FRAPPE_HOST}:${FRAPPE_PATH}/www/vscode-auth/
scp backend/www/vscode-auth/index.py ${FRAPPE_USER}@${FRAPPE_HOST}:${FRAPPE_PATH}/www/vscode-auth/
echo -e "${GREEN}✓ Authentication page files copied${NC}"
echo ""

echo -e "${BLUE}Step 4: Clearing Frappe cache${NC}"
ssh ${FRAPPE_USER}@${FRAPPE_HOST} "cd /home/frappe/frappe-bench && bench --site oropendola.ai clear-cache"
echo -e "${GREEN}✓ Cache cleared${NC}"
echo ""

echo -e "${BLUE}Step 5: Restarting Frappe${NC}"
ssh ${FRAPPE_USER}@${FRAPPE_HOST} "cd /home/frappe/frappe-bench && bench restart"
echo -e "${GREEN}✓ Frappe restarted${NC}"
echo ""

echo -e "${BLUE}Step 6: Testing endpoints${NC}"
echo -e "${YELLOW}Testing health check endpoint...${NC}"
HEALTH_CHECK=$(curl -s https://oropendola.ai/api/method/oropendola_ai.oropendola_ai.api.vscode_extension.health_check)
if echo "$HEALTH_CHECK" | grep -q "\"success\": true"; then
    echo -e "${GREEN}✓ Health check passed!${NC}"
else
    echo -e "${YELLOW}⚠ Health check response:${NC}"
    echo "$HEALTH_CHECK"
fi
echo ""

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}✓ Deployment Complete!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Install extension: code --install-extension oropendola-oauth.vsix"
echo "2. Reload VS Code: Cmd+Shift+P → 'Developer: Reload Window'"
echo "3. Open Oropendola sidebar and click 'Sign in'"
echo ""
echo -e "${BLUE}Test URLs:${NC}"
echo "- Health Check: https://oropendola.ai/api/method/oropendola_ai.oropendola_ai.api.vscode_extension.health_check"
echo "- Auth Page: https://oropendola.ai/vscode-auth"
echo ""
echo -e "${YELLOW}Logs:${NC}"
echo "- Backend: ssh ${FRAPPE_USER}@${FRAPPE_HOST} 'tail -f /home/frappe/frappe-bench/logs/bench-start.log'"
echo "- Extension: VS Code → Output → Oropendola AI"
echo ""
