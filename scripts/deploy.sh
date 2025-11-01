#!/bin/bash

###############################################################################
# Deployment Script for Oropendola AI Assistant
# Automates the deployment process to VS Code Marketplace
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if required tools are installed
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi

    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi

    if ! command -v git &> /dev/null; then
        log_error "git is not installed"
        exit 1
    fi

    log_success "All prerequisites installed"
}

# Check if working directory is clean
check_git_status() {
    log_info "Checking git status..."

    if [[ -n $(git status -s) ]]; then
        log_warning "Working directory is not clean"
        git status -s
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_error "Deployment cancelled"
            exit 1
        fi
    else
        log_success "Working directory is clean"
    fi
}

# Run tests
run_tests() {
    log_info "Running tests..."

    npm run lint || {
        log_error "Linting failed"
        exit 1
    }

    npm run typecheck || {
        log_error "Type checking failed"
        exit 1
    }

    npm test || {
        log_error "Tests failed"
        exit 1
    }

    log_success "All tests passed"
}

# Build extension
build_extension() {
    log_info "Building extension..."

    npm run build || {
        log_error "Build failed"
        exit 1
    }

    log_success "Build completed"
}

# Package extension
package_extension() {
    log_info "Packaging extension..."

    npx vsce package || {
        log_error "Packaging failed"
        exit 1
    }

    # Find the generated .vsix file
    VSIX_FILE=$(ls -t *.vsix | head -1)
    log_success "Extension packaged: $VSIX_FILE"
}

# Publish to VS Code Marketplace
publish_marketplace() {
    log_info "Publishing to VS Code Marketplace..."

    if [[ -z "$VSCE_TOKEN" ]]; then
        log_error "VSCE_TOKEN environment variable not set"
        exit 1
    fi

    npx vsce publish -p "$VSCE_TOKEN" || {
        log_error "Publishing to Marketplace failed"
        exit 1
    }

    log_success "Published to VS Code Marketplace"
}

# Publish to Open VSX
publish_openvsx() {
    log_info "Publishing to Open VSX..."

    if [[ -z "$OVSX_TOKEN" ]]; then
        log_warning "OVSX_TOKEN not set, skipping Open VSX"
        return
    fi

    npx ovsx publish -p "$OVSX_TOKEN" || {
        log_warning "Publishing to Open VSX failed (non-fatal)"
    }

    log_success "Published to Open VSX"
}

# Create Git tag
create_git_tag() {
    VERSION=$(node -p "require('./package.json').version")
    log_info "Creating git tag v$VERSION..."

    if git rev-parse "v$VERSION" >/dev/null 2>&1; then
        log_warning "Tag v$VERSION already exists"
        return
    fi

    git tag -a "v$VERSION" -m "Release v$VERSION" || {
        log_error "Failed to create git tag"
        exit 1
    }

    log_success "Created git tag v$VERSION"
}

# Push to remote
push_to_remote() {
    log_info "Pushing to remote repository..."

    git push origin main || {
        log_warning "Failed to push to main branch"
    }

    VERSION=$(node -p "require('./package.json').version")
    git push origin "v$VERSION" || {
        log_error "Failed to push tag"
        exit 1
    }

    log_success "Pushed to remote repository"
}

# Create GitHub release
create_github_release() {
    log_info "Creating GitHub release..."

    if ! command -v gh &> /dev/null; then
        log_warning "GitHub CLI not installed, skipping release creation"
        return
    fi

    VERSION=$(node -p "require('./package.json').version")
    VSIX_FILE=$(ls -t *.vsix | head -1)

    # Extract release notes from CHANGELOG
    RELEASE_NOTES=$(sed -n "/## \[$VERSION\]/,/## \[/p" CHANGELOG.md | sed '1d;$d')

    gh release create "v$VERSION" \
        --title "Release v$VERSION" \
        --notes "$RELEASE_NOTES" \
        "$VSIX_FILE" || {
        log_warning "Failed to create GitHub release (non-fatal)"
    }

    log_success "Created GitHub release"
}

# Send notifications
send_notifications() {
    log_info "Sending notifications..."

    VERSION=$(node -p "require('./package.json').version")

    # Slack notification
    if [[ -n "$SLACK_WEBHOOK" ]]; then
        curl -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{\"text\": \"🚀 Oropendola AI Assistant v$VERSION has been released!\"}" \
            || log_warning "Failed to send Slack notification"
    fi

    # Discord notification
    if [[ -n "$DISCORD_WEBHOOK" ]]; then
        curl -X POST "$DISCORD_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{\"content\": \"🚀 **Oropendola AI Assistant v$VERSION** has been released!\"}" \
            || log_warning "Failed to send Discord notification"
    fi

    log_success "Notifications sent"
}

# Cleanup
cleanup() {
    log_info "Cleaning up..."

    # Keep the .vsix file but clean temporary files
    rm -rf dist/.cache

    log_success "Cleanup completed"
}

# Main deployment flow
main() {
    echo "╔═══════════════════════════════════════════════════════╗"
    echo "║   Oropendola AI Assistant - Deployment Script        ║"
    echo "╚═══════════════════════════════════════════════════════╝"
    echo

    # Check command line arguments
    SKIP_TESTS=false
    DRY_RUN=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                echo "Usage: $0 [--skip-tests] [--dry-run]"
                exit 1
                ;;
        esac
    done

    check_prerequisites
    check_git_status

    if [[ "$SKIP_TESTS" == false ]]; then
        run_tests
    else
        log_warning "Skipping tests as requested"
    fi

    build_extension
    package_extension

    if [[ "$DRY_RUN" == true ]]; then
        log_warning "Dry run mode - skipping publication"
        log_info "Would publish: $(ls -t *.vsix | head -1)"
        exit 0
    fi

    # Confirm before publishing
    echo
    log_warning "Ready to publish to marketplaces"
    read -p "Continue with publication? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_error "Deployment cancelled"
        exit 1
    fi

    publish_marketplace
    publish_openvsx
    create_git_tag
    push_to_remote
    create_github_release
    send_notifications
    cleanup

    echo
    echo "╔═══════════════════════════════════════════════════════╗"
    echo "║              Deployment Successful! 🎉                ║"
    echo "╚═══════════════════════════════════════════════════════╝"
    echo
    log_success "Oropendola AI Assistant has been deployed successfully!"
    log_info "Version: $(node -p "require('./package.json').version")"
    log_info "Marketplace: https://marketplace.visualstudio.com/items?itemName=oropendola.oropendola-ai-assistant"
}

# Run main function
main "$@"
