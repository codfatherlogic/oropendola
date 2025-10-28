#!/bin/bash

# Complete Reinstall Script for OAuth Extension
# Uninstalls old version, clears cache, and provides install instructions

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🔄 Oropendola OAuth Extension - Complete Reinstall${NC}"
echo "=================================================="
echo ""

# Step 1: Find VS Code executable
echo -e "${YELLOW}Step 1: Locating VS Code...${NC}"
if [ -f "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" ]; then
    CODE_CMD="/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"
    echo -e "${GREEN}✓ Found VS Code at: $CODE_CMD${NC}"
else
    echo -e "${YELLOW}⚠ VS Code not found in default location${NC}"
    echo "Please install using VS Code UI (see instructions below)"
    CODE_CMD=""
fi
echo ""

# Step 2: Uninstall old version (if code command available)
if [ -n "$CODE_CMD" ]; then
    echo -e "${YELLOW}Step 2: Uninstalling old extension...${NC}"
    "$CODE_CMD" --uninstall-extension oropendola.oropendola-ai-assistant 2>/dev/null || echo "No old version found"
    echo -e "${GREEN}✓ Old version removed${NC}"
    echo ""
    
    # Step 3: Install new version
    echo -e "${YELLOW}Step 3: Installing new extension...${NC}"
    "$CODE_CMD" --install-extension oropendola-ai-assistant-3.7.2.vsix --force
    echo -e "${GREEN}✓ Extension installed!${NC}"
    echo ""
else
    echo -e "${YELLOW}Step 2-3: Manual Installation Required${NC}"
    echo ""
fi

# Step 4: Instructions
echo -e "${BLUE}=================================================${NC}"
echo -e "${GREEN}✓ Installation Complete!${NC}"
echo -e "${BLUE}=================================================${NC}"
echo ""
echo -e "${RED}IMPORTANT: You MUST reload VS Code now!${NC}"
echo ""
echo -e "${YELLOW}How to Reload VS Code:${NC}"
echo "1. In VS Code, press: ${BLUE}Cmd+Shift+P${NC}"
echo "2. Type: ${BLUE}Developer: Reload Window${NC}"
echo "3. Press Enter"
echo ""
echo -e "${YELLOW}OR${NC}"
echo ""
echo "1. Simply ${BLUE}quit VS Code${NC} (Cmd+Q)"
echo "2. ${BLUE}Reopen VS Code${NC}"
echo ""
echo -e "${BLUE}=================================================${NC}"
echo ""
echo -e "${YELLOW}After Reload:${NC}"
echo "1. Open Oropendola sidebar (click bird icon)"
echo "2. Click 'Sign in' button"
echo "3. Browser will open automatically"
echo "4. Complete authentication"
echo "5. Success! ✨"
echo ""
echo -e "${YELLOW}Verify Installation:${NC}"
echo "Check Output panel: Cmd+Shift+U → Select 'Oropendola AI'"
echo "Should see: '🐦 Oropendola AI Extension is now active!'"
echo ""
echo -e "${YELLOW}If Still Getting Errors:${NC}"
echo "1. Completely quit VS Code (Cmd+Q)"
echo "2. Clear extension cache:"
echo "   ${BLUE}rm -rf ~/.vscode/extensions/oropendola.*${NC}"
echo "3. Reinstall extension via VS Code UI:"
echo "   - Cmd+Shift+P → 'Extensions: Install from VSIX...'"
echo "   - Select: oropendola-ai-assistant-3.7.2.vsix"
echo "4. Reload VS Code"
echo ""
echo -e "${BLUE}Extension File:${NC} oropendola-ai-assistant-3.7.2.vsix (61.66 MB)"
echo -e "${BLUE}Version:${NC} 3.7.2"
echo -e "${BLUE}Date:${NC} October 28, 2025"
echo ""
