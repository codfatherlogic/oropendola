#!/bin/bash

echo "🔧 Oropendola AI Assistant - Fresh Installation Script (WITH DEPENDENCIES)"
echo "=========================================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Path to VSIX
VSIX_PATH="/Users/sammishthundiyil/oropendola/oropendola-ai-assistant-2.0.0.vsix"

# Check if VSIX exists
if [ ! -f "$VSIX_PATH" ]; then
    echo -e "${RED}❌ ERROR: VSIX file not found at:${NC}"
    echo "   $VSIX_PATH"
    exit 1
fi

# Get file size
FILE_SIZE=$(du -h "$VSIX_PATH" | cut -f1)
echo -e "${GREEN}✅ Found VSIX package (${FILE_SIZE})${NC}"
echo -e "${BLUE}📦 This package includes all dependencies (@octokit/rest, axios, simple-git)${NC}"
echo ""

# Step 1: Uninstall old extension
echo -e "${YELLOW}Step 1: Uninstalling old extension...${NC}"
code --uninstall-extension oropendola.oropendola-ai-assistant 2>/dev/null
echo -e "${GREEN}✅ Old extension uninstalled (if it existed)${NC}"
echo ""

# Step 2: Install new extension
echo -e "${YELLOW}Step 2: Installing new extension...${NC}"
code --install-extension "$VSIX_PATH" --force

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ New extension installed successfully!${NC}"
    echo ""
    echo -e "${YELLOW}📋 NEXT STEPS:${NC}"
    echo "   1. Close and reopen VS Code (or reload window: Cmd+Shift+P → 'Reload Window')"
    echo "   2. Open the Oropendola sidebar"
    echo "   3. Open Developer Console (Cmd+Option+I → Console tab)"
    echo "   4. Test with: 'create POS interface in electron.js'"
    echo ""
    echo -e "${YELLOW}🔍 WHAT TO LOOK FOR:${NC}"
    echo "   You should see debug messages starting with:"
    echo "   🔍 TOOL CALL DEBUG START 🔍"
    echo "   🔎 Starting markdown parse..."
    echo "   ✅ Successfully parsed X tool call(s) from markdown!"
    echo ""
    echo -e "${GREEN}If you see these messages, the fix is working! 🎉${NC}"
else
    echo -e "${RED}❌ Installation failed!${NC}"
    echo ""
    echo "Try installing manually:"
    echo "   1. Open VS Code"
    echo "   2. Press Cmd+Shift+P"
    echo "   3. Type 'Extensions: Install from VSIX'"
    echo "   4. Select: $VSIX_PATH"
    exit 1
fi
