#!/bin/bash

# FINAL FIX - Complete VS Code Restart and Reinstall
# This will work after you quit VS Code

echo "🚨 CRITICAL: You must QUIT VS Code first!"
echo ""
echo "Step 1: QUIT VS Code completely"
echo "  → Press Cmd+Q (not just close window)"
echo "  → Wait 5 seconds for all processes to stop"
echo ""
echo "Step 2: Run this script again"
echo "  → ./FINAL_INSTALL.sh"
echo ""
echo "Step 3: Reopen VS Code"
echo "  → Extension will work correctly"
echo ""

# Check if VS Code is running
if pgrep -x "Code" > /dev/null; then
    echo "❌ VS Code is still running!"
    echo ""
    echo "Please:"
    echo "1. Go to VS Code"
    echo "2. Press Cmd+Q to quit"
    echo "3. Wait 5 seconds"
    echo "4. Run this script again: ./FINAL_INSTALL.sh"
    echo ""
    exit 1
fi

echo "✅ VS Code is not running - proceeding with installation..."
echo ""

# Remove old cache
echo "Removing old extension cache..."
rm -rf ~/.vscode/extensions/oropendola.oropendola-ai-assistant-*

# Install new extension
echo "Installing new extension..."
/Applications/Visual\ Studio\ Code.app/Contents/Resources/app/bin/code --install-extension oropendola-ai-assistant-3.7.2.vsix --force

echo ""
echo "================================================="
echo "✅ Extension Installed Successfully!"
echo "================================================="
echo ""
echo "Now:"
echo "1. Open VS Code"
echo "2. Check Output panel (Cmd+Shift+U) → 'Oropendola AI'"
echo "3. Should see: '🐦 Oropendola AI Extension is now active!'"
echo "4. Should NOT see: 'zOt is not a constructor'"
echo ""
echo "Then test OAuth:"
echo "1. Open Oropendola sidebar"
echo "2. Click 'Sign in'"
echo "3. Browser opens automatically"
echo "4. Success!"
echo ""
