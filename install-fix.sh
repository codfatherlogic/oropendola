#!/bin/bash

# Oropendola AI Assistant - Quick Installation Script
# Fixes HTTP 417 error by installing updated VSIX package

echo "🐦 Oropendola AI Assistant - Installation Script"
echo "================================================"
echo ""

# Set colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
VSIX_FILE="$SCRIPT_DIR/oropendola-ai-assistant-2.0.0.vsix"

# Check if VSIX file exists
if [ ! -f "$VSIX_FILE" ]; then
    echo -e "${RED}❌ Error: VSIX file not found at: $VSIX_FILE${NC}"
    echo ""
    echo "Please ensure the VSIX file is in the same directory as this script."
    exit 1
fi

echo -e "${GREEN}✅ Found VSIX file:${NC}"
echo "   $VSIX_FILE"
echo ""

# Check if 'code' command is available
if command -v code &> /dev/null; then
    echo -e "${YELLOW}Installing via 'code' CLI...${NC}"
    echo ""
    
    # Uninstall old version first
    echo "Uninstalling old version (if exists)..."
    code --uninstall-extension oropendola.oropendola-ai-assistant 2>/dev/null
    
    echo ""
    echo "Installing new version..."
    code --install-extension "$VSIX_FILE" --force
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ Installation successful!${NC}"
        echo ""
        echo "Next steps:"
        echo "1. Press Cmd+Shift+P"
        echo "2. Type: 'Developer: Reload Window'"
        echo "3. Open the Oropendola sidebar and test the chat"
        echo ""
        echo "The HTTP 417 error should now be fixed! 🎉"
    else
        echo ""
        echo -e "${RED}❌ Installation failed${NC}"
        echo ""
        echo "Please try manual installation:"
        echo "1. Press Cmd+Shift+P"
        echo "2. Type: 'Extensions: Install from VSIX'"
        echo "3. Select: $VSIX_FILE"
    fi
else
    echo -e "${YELLOW}⚠️  'code' CLI not found${NC}"
    echo ""
    echo "Please install manually:"
    echo ""
    echo "1. Open VS Code"
    echo "2. Press Cmd+Shift+P"
    echo "3. Type: 'Extensions: Install from VSIX'"
    echo "4. Navigate to: $VSIX_FILE"
    echo "5. Click 'Install'"
    echo ""
    echo "After installation:"
    echo "- Press Cmd+Shift+P"
    echo "- Type: 'Developer: Reload Window'"
    echo ""
fi

echo ""
echo "================================================"
echo "📚 For more information, see: HTTP_417_FIX.md"
echo "================================================"
