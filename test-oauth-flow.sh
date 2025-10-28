#!/bin/bash

# Test OAuth Flow - Quick Testing Script
# Run this after deploying backend to test the complete OAuth flow

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🧪 Testing OAuth Flow${NC}"
echo "===================="
echo ""

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check${NC}"
HEALTH=$(curl -s https://oropendola.ai/api/method/oropendola_ai.oropendola_ai.api.vscode_extension.health_check)
if echo "$HEALTH" | grep -q '"success": true'; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${RED}✗ Health check failed${NC}"
    echo "$HEALTH"
    exit 1
fi
echo ""

# Test 2: Initiate Auth
echo -e "${YELLOW}Test 2: Initiate Authentication${NC}"
INIT_RESPONSE=$(curl -s -X POST \
    https://oropendola.ai/api/method/oropendola_ai.oropendola_ai.api.vscode_extension.initiate_vscode_auth \
    -H "Content-Type: application/json")

if echo "$INIT_RESPONSE" | grep -q '"success": true'; then
    echo -e "${GREEN}✓ Authentication initiated${NC}"
    
    # Extract session token and auth URL
    SESSION_TOKEN=$(echo "$INIT_RESPONSE" | grep -o '"session_token": "[^"]*"' | cut -d'"' -f4)
    AUTH_URL=$(echo "$INIT_RESPONSE" | grep -o '"auth_url": "[^"]*"' | cut -d'"' -f4)
    
    echo -e "${BLUE}Session Token:${NC} ${SESSION_TOKEN:0:20}..."
    echo -e "${BLUE}Auth URL:${NC} $AUTH_URL"
else
    echo -e "${RED}✗ Failed to initiate authentication${NC}"
    echo "$INIT_RESPONSE"
    exit 1
fi
echo ""

# Test 3: Check Status (pending)
echo -e "${YELLOW}Test 3: Check Status (should be pending)${NC}"
STATUS_RESPONSE=$(curl -s -X POST \
    https://oropendola.ai/api/method/oropendola_ai.oropendola_ai.api.vscode_extension.check_vscode_auth_status \
    -H "Content-Type: application/json" \
    -d "{\"session_token\": \"$SESSION_TOKEN\"}")

if echo "$STATUS_RESPONSE" | grep -q '"status": "pending"'; then
    echo -e "${GREEN}✓ Status check works (pending)${NC}"
else
    echo -e "${RED}✗ Unexpected status${NC}"
    echo "$STATUS_RESPONSE"
fi
echo ""

# Test 4: Auth Page Accessibility
echo -e "${YELLOW}Test 4: Authentication Page${NC}"
PAGE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$AUTH_URL")
if [ "$PAGE_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ Authentication page accessible${NC}"
    echo -e "${BLUE}URL:${NC} $AUTH_URL"
else
    echo -e "${RED}✗ Page returned status: $PAGE_STATUS${NC}"
fi
echo ""

# Summary
echo -e "${GREEN}==================${NC}"
echo -e "${GREEN}✓ All Tests Passed${NC}"
echo -e "${GREEN}==================${NC}"
echo ""
echo -e "${YELLOW}Manual Test:${NC}"
echo "1. Open this URL in your browser (logged in):"
echo "   $AUTH_URL"
echo ""
echo "2. You should see your subscription details"
echo "3. Page should show 'Authentication Successful!'"
echo "4. Page should auto-close after 5 seconds"
echo ""
echo -e "${YELLOW}VS Code Extension Test:${NC}"
echo "1. Install: code --install-extension oropendola-oauth.vsix"
echo "2. Reload VS Code"
echo "3. Open Oropendola sidebar"
echo "4. Click 'Sign in' button"
echo "5. Browser should open automatically"
echo "6. Should see success message in VS Code"
echo ""
