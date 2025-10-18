#!/bin/bash
# Oropendola v2.0 Build Script
# Creates a production-ready .vsix package

set -e  # Exit on error

echo "🐦 Oropendola v2.0 Build Script"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Clean previous builds
echo -e "${BLUE}[1/6]${NC} Cleaning previous builds..."
rm -f *.vsix
echo -e "${GREEN}✓${NC} Cleaned"
echo ""

# Step 2: Verify dependencies
echo -e "${BLUE}[2/6]${NC} Verifying dependencies..."
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠${NC} node_modules not found. Installing dependencies..."
    npm install
else
    echo -e "${GREEN}✓${NC} Dependencies verified"
fi
echo ""

# Step 3: Run linter
echo -e "${BLUE}[3/6]${NC} Running linter..."
if npm run lint 2>&1 | grep -q "error"; then
    echo -e "${RED}✗${NC} Linting failed. Please fix errors before building."
    exit 1
else
    echo -e "${GREEN}✓${NC} Linting passed"
fi
echo ""

# Step 4: Verify critical files exist
echo -e "${BLUE}[4/6]${NC} Verifying critical files..."
REQUIRED_FILES=(
    "extension.js"
    "package.json"
    "README.md"
    "src/autocomplete/autocomplete-provider.js"
    "src/edit/edit-mode.js"
    "src/ai/providers/oropendola-provider.js"
    "src/sidebar/sidebar-provider.js"
    "media/icon.png"
)

MISSING_FILES=()
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -ne 0 ]; then
    echo -e "${RED}✗${NC} Missing required files:"
    for file in "${MISSING_FILES[@]}"; do
        echo "  - $file"
    done
    exit 1
else
    echo -e "${GREEN}✓${NC} All required files present"
fi
echo ""

# Step 5: Get version info
VERSION=$(node -p "require('./package.json').version")
echo -e "${BLUE}[5/6]${NC} Building version: ${GREEN}v${VERSION}${NC}"
echo ""

# Step 6: Package extension
echo -e "${BLUE}[6/6]${NC} Packaging extension..."
npx vsce package

# Success!
VSIX_FILE="oropendola-ai-assistant-${VERSION}.vsix"
if [ -f "$VSIX_FILE" ]; then
    FILE_SIZE=$(du -h "$VSIX_FILE" | cut -f1)
    echo ""
    echo -e "${GREEN}================================${NC}"
    echo -e "${GREEN}✓ Build successful!${NC}"
    echo -e "${GREEN}================================${NC}"
    echo ""
    echo -e "📦 Package: ${BLUE}${VSIX_FILE}${NC}"
    echo -e "📏 Size: ${BLUE}${FILE_SIZE}${NC}"
    echo -e "🚀 Version: ${BLUE}v${VERSION}${NC}"
    echo ""
    echo -e "Next steps:"
    echo -e "  1. Test: ${YELLOW}code --install-extension ${VSIX_FILE}${NC}"
    echo -e "  2. Publish: ${YELLOW}npx vsce publish${NC}"
    echo ""
else
    echo -e "${RED}✗ Build failed - package not created${NC}"
    exit 1
fi
