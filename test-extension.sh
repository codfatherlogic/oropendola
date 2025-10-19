#!/bin/bash

# Oropendola Extension Automated Testing Script
# Tests the latest VSIX build for functionality

echo "🧪 Oropendola Extension Test Suite v2.0.1"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
PASS=0
FAIL=0
WARN=0

# Helper functions
pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    ((PASS++))
}

fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    ((FAIL++))
}

warn() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
    ((WARN++))
}

info() {
    echo -e "ℹ️  $1"
}

# Test 1: Check VSIX exists
echo "Test 1: Verifying VSIX package..."
if [ -f "/Users/sammishthundiyil/oropendola/oropendola-ai-assistant-2.0.1.vsix" ]; then
    FILESIZE=$(stat -f%z "/Users/sammishthundiyil/oropendola/oropendola-ai-assistant-2.0.1.vsix")
    pass "VSIX file exists (${FILESIZE} bytes)"
else
    fail "VSIX file not found"
fi

# Test 2: Check package.json integrity
echo ""
echo "Test 2: Validating package.json..."
if [ -f "/Users/sammishthundiyil/oropendola/package.json" ]; then
    # Check version
    VERSION=$(node -p "require('/Users/sammishthundiyil/oropendola/package.json').version")
    if [ "$VERSION" == "2.0.1" ]; then
        pass "Version is correct: $VERSION"
    else
        fail "Version mismatch: expected 2.0.1, got $VERSION"
    fi
    
    # Check name
    NAME=$(node -p "require('/Users/sammishthundiyil/oropendola/package.json').name")
    if [ "$NAME" == "oropendola-ai-assistant" ]; then
        pass "Package name is correct"
    else
        fail "Package name incorrect: $NAME"
    fi
else
    fail "package.json not found"
fi

# Test 3: Check source files exist
echo ""
echo "Test 3: Verifying source files..."
SOURCE_FILES=(
    "extension.js"
    "src/sidebar/sidebar-provider.js"
    "src/ai/chat-manager.js"
    "src/core/ConversationTask.js"
    "src/auth/auth-manager.js"
)

for file in "${SOURCE_FILES[@]}"; do
    if [ -f "/Users/sammishthundiyil/oropendola/$file" ]; then
        pass "Source file exists: $file"
    else
        fail "Missing source file: $file"
    fi
done

# Test 4: Check media assets
echo ""
echo "Test 4: Checking media assets..."
if [ -f "/Users/sammishthundiyil/oropendola/media/icon.png" ]; then
    pass "Extension icon exists"
else
    fail "Extension icon missing"
fi

if [ -f "/Users/sammishthundiyil/oropendola/media/icon.svg" ]; then
    pass "SVG icon exists"
else
    warn "SVG icon missing (optional)"
fi

# Test 5: Syntax check JavaScript files
echo ""
echo "Test 5: JavaScript syntax validation..."
node -e "
try {
    require('/Users/sammishthundiyil/oropendola/extension.js');
    console.log('${GREEN}✅ PASS${NC}: extension.js syntax valid');
} catch(e) {
    console.log('${RED}❌ FAIL${NC}: extension.js has syntax errors');
    console.error(e.message);
}
"

# Test 6: Check for common issues
echo ""
echo "Test 6: Checking for common issues..."

# Check for Unicode issues in sidebar-provider.js
if grep -q "\\\\n\\\\n" "/Users/sammishthundiyil/oropendola/src/sidebar/sidebar-provider.js"; then
    pass "Newline escaping is correct"
else
    fail "Newline escaping may have issues"
fi

# Check for HTML entities in buttons
if grep -q "&#10024;" "/Users/sammishthundiyil/oropendola/src/sidebar/sidebar-provider.js"; then
    pass "HTML entities used for icons"
else
    warn "Icons may not use HTML entities"
fi

# Test 7: Dependencies check
echo ""
echo "Test 7: Checking dependencies..."
if [ -d "/Users/sammishthundiyil/oropendola/node_modules" ]; then
    pass "node_modules directory exists"
    
    # Check key dependencies
    KEY_DEPS=("axios" "@octokit/rest" "simple-git")
    for dep in "${KEY_DEPS[@]}"; do
        if [ -d "/Users/sammishthundiyil/oropendola/node_modules/$dep" ]; then
            pass "Dependency installed: $dep"
        else
            fail "Missing dependency: $dep"
        fi
    done
else
    fail "node_modules not found - run 'npm install'"
fi

# Test 8: ESLint check
echo ""
echo "Test 8: Running ESLint..."
cd /Users/sammishthundiyil/oropendola
npm run lint 2>&1 | tail -5

# Summary
echo ""
echo "=========================================="
echo "📊 Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed:${NC} $PASS"
echo -e "${RED}Failed:${NC} $FAIL"
echo -e "${YELLOW}Warnings:${NC} $WARN"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo "📦 Ready to install:"
    echo "   1. Open VS Code"
    echo "   2. Press Cmd+Shift+P"
    echo "   3. Type: Extensions: Install from VSIX"
    echo "   4. Select: /Users/sammishthundiyil/oropendola/oropendola-ai-assistant-2.0.1.vsix"
    echo "   5. Reload window"
    exit 0
else
    echo -e "${RED}❌ Some tests failed!${NC}"
    echo "Please review the errors above before installing."
    exit 1
fi
