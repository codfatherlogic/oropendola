#!/bin/bash

###############################################################################
# Version Bump Script for Oropendola AI Assistant
# Automates version bumping and changelog updates
###############################################################################

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
log_info "Current version: $CURRENT_VERSION"

# Parse version type from argument
VERSION_TYPE=${1:-patch}

if [[ ! "$VERSION_TYPE" =~ ^(major|minor|patch)$ ]]; then
    log_warning "Invalid version type: $VERSION_TYPE"
    echo "Usage: $0 [major|minor|patch]"
    exit 1
fi

log_info "Bumping $VERSION_TYPE version..."

# Bump version in package.json
npm version "$VERSION_TYPE" --no-git-tag-version

# Get new version
NEW_VERSION=$(node -p "require('./package.json').version")
log_success "Version bumped to: $NEW_VERSION"

# Update CHANGELOG.md
log_info "Updating CHANGELOG.md..."

DATE=$(date +%Y-%m-%d)
CHANGELOG_ENTRY="## [$NEW_VERSION] - $DATE

### Added
-

### Changed
-

### Fixed
-

"

# Insert new entry after the "# Changelog" header
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "/# Changelog/a\\
$CHANGELOG_ENTRY" CHANGELOG.md
else
    # Linux
    sed -i "/# Changelog/a $CHANGELOG_ENTRY" CHANGELOG.md
fi

log_success "CHANGELOG.md updated"

# Show what changed
echo
log_info "Version bump summary:"
echo "  Old version: $CURRENT_VERSION"
echo "  New version: $NEW_VERSION"
echo "  Changelog entry created for $DATE"
echo

log_warning "Next steps:"
echo "  1. Edit CHANGELOG.md and fill in the changes"
echo "  2. Review changes: git diff"
echo "  3. Commit changes: git add . && git commit -m 'chore: bump version to v$NEW_VERSION'"
echo "  4. Run deployment: npm run deploy"
