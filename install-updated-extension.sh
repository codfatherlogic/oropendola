#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔄 Installing Updated Oropendola Extension${NC}"
echo ""

# Step 1: Uninstall current extension
echo -e "${YELLOW}Step 1: Uninstalling current extension...${NC}"
code --uninstall-extension oropendola.oropendola-ai-assistant
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Extension uninstalled${NC}"
else
    echo -e "${RED}⚠ Could not uninstall (may not be installed)${NC}"
fi
echo ""

# Step 2: Install new VSIX
echo -e "${YELLOW}Step 2: Installing new VSIX...${NC}"
VSIX_PATH="/Users/sammishthundiyil/oropendola/oropendola-ai-assistant-3.7.0.vsix"

if [ -f "$VSIX_PATH" ]; then
    code --install-extension "$VSIX_PATH"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ New extension installed${NC}"
    else
        echo -e "${RED}✗ Installation failed${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ VSIX file not found at: $VSIX_PATH${NC}"
    exit 1
fi
echo ""

# Step 3: Instructions
echo -e "${GREEN}✅ Installation complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Press Cmd+Shift+P in VS Code"
echo "2. Type 'Reload Window' and press Enter"
echo "3. Open the Oropendola AI panel to see the new interface"
echo ""
echo -e "${YELLOW}Expected changes:${NC}"
echo "✓ No Chat/History/Terminal/Browser tabs at top"
echo "✓ Mode dropdown changes placeholder text dynamically"
echo "✓ Roo Code style message bubbles"
echo "✓ Clean, minimal interface"
echo ""
