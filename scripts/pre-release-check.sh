#!/bin/bash

###############################################################################
# Pre-Release Validation Script
# Comprehensive checks before releasing to production
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

ERRORS=0
WARNINGS=0

check_and_log() {
    if [ $? -eq 0 ]; then
        log_success "$1"
    else
        log_error "$1"
        ((ERRORS++))
    fi
}

warn_and_log() {
    log_warning "$1"
    ((WARNINGS++))
}

echo "╔═══════════════════════════════════════════════════════╗"
echo "║        Pre-Release Validation Checklist               ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo

# 1. Git Status
log_info "1. Checking git status..."
if [[ -z $(git status -s) ]]; then
    log_success "Working directory is clean"
else
    warn_and_log "Working directory has uncommitted changes"
    git status -s
fi

# 2. Current Branch
log_info "2. Checking current branch..."
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" == "main" ]]; then
    log_success "On main branch"
else
    warn_and_log "Not on main branch (current: $CURRENT_BRANCH)"
fi

# 3. Git Sync
log_info "3. Checking if local is in sync with remote..."
git fetch > /dev/null 2>&1
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse @{u} 2>/dev/null || echo "")
BASE=$(git merge-base @ @{u} 2>/dev/null || echo "")

if [[ -z "$REMOTE" ]]; then
    warn_and_log "No upstream branch configured"
elif [[ "$LOCAL" == "$REMOTE" ]]; then
    log_success "Local is in sync with remote"
elif [[ "$LOCAL" == "$BASE" ]]; then
    warn_and_log "Local is behind remote"
elif [[ "$REMOTE" == "$BASE" ]]; then
    warn_and_log "Local is ahead of remote"
else
    warn_and_log "Local and remote have diverged"
fi

# 4. Dependencies
log_info "4. Checking dependencies..."
npm outdated > /dev/null 2>&1
if [ $? -eq 0 ]; then
    log_success "All dependencies are up to date"
else
    warn_and_log "Some dependencies are outdated"
    npm outdated
fi

# 5. Security Vulnerabilities
log_info "5. Checking for security vulnerabilities..."
npm audit --audit-level=moderate > /dev/null 2>&1
check_and_log "No security vulnerabilities found"

# 6. Linting
log_info "6. Running linter..."
npm run lint > /dev/null 2>&1
check_and_log "Linting passed"

# 7. Type Checking
log_info "7. Running type checker..."
npx tsc --noEmit > /dev/null 2>&1
check_and_log "Type checking passed"

# 8. Unit Tests
log_info "8. Running unit tests..."
npm test > /dev/null 2>&1
check_and_log "Unit tests passed"

# 9. Build
log_info "9. Building extension..."
npm run build > /dev/null 2>&1
check_and_log "Build successful"

# 10. Package
log_info "10. Packaging extension..."
npx vsce package > /dev/null 2>&1
check_and_log "Packaging successful"

# 11. Version Consistency
log_info "11. Checking version consistency..."
PKG_VERSION=$(node -p "require('./package.json').version")
# Check if version is in CHANGELOG
if grep -q "\[$PKG_VERSION\]" CHANGELOG.md; then
    log_success "Version $PKG_VERSION found in CHANGELOG"
else
    warn_and_log "Version $PKG_VERSION not found in CHANGELOG"
fi

# 12. Required Files
log_info "12. Checking required files..."
REQUIRED_FILES=(
    "README.md"
    "LICENSE"
    "CHANGELOG.md"
    "package.json"
    "tsconfig.json"
    ".vscodeignore"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        log_success "$file exists"
    else
        log_error "$file is missing"
        ((ERRORS++))
    fi
done

# 13. Package Size
log_info "13. Checking package size..."
VSIX_FILE=$(ls -t *.vsix | head -1)
if [[ -f "$VSIX_FILE" ]]; then
    SIZE=$(du -h "$VSIX_FILE" | cut -f1)
    log_info "Package size: $SIZE"

    SIZE_BYTES=$(stat -f%z "$VSIX_FILE" 2>/dev/null || stat -c%s "$VSIX_FILE")
    MAX_SIZE=$((50 * 1024 * 1024)) # 50 MB

    if [[ $SIZE_BYTES -lt $MAX_SIZE ]]; then
        log_success "Package size is acceptable"
    else
        warn_and_log "Package size exceeds 50MB"
    fi
fi

# 14. Environment Variables (for CI/CD)
log_info "14. Checking environment variables..."
if [[ -n "$VSCE_TOKEN" ]]; then
    log_success "VSCE_TOKEN is set"
else
    warn_and_log "VSCE_TOKEN not set (required for marketplace publishing)"
fi

# 15. Documentation
log_info "15. Checking documentation..."
if [[ -s "README.md" ]] && [[ $(wc -l < README.md) -gt 50 ]]; then
    log_success "README.md has content"
else
    warn_and_log "README.md seems incomplete"
fi

# Summary
echo
echo "╔═══════════════════════════════════════════════════════╗"
echo "║                  Validation Summary                   ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo

if [[ $ERRORS -eq 0 ]] && [[ $WARNINGS -eq 0 ]]; then
    log_success "All checks passed! ✨"
    echo
    log_success "Ready for release! 🚀"
    exit 0
elif [[ $ERRORS -eq 0 ]]; then
    log_warning "$WARNINGS warning(s) found"
    echo
    log_info "Review warnings before releasing"
    exit 0
else
    log_error "$ERRORS error(s) and $WARNINGS warning(s) found"
    echo
    log_error "Fix errors before releasing"
    exit 1
fi
