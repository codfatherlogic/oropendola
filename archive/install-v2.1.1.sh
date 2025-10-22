#!/bin/bash

# Install Oropendola AI Assistant v2.1.1
# Fixed syntax errors in system prompt (removed backticks inside template literal)

VSIX_FILE="oropendola-ai-assistant-2.1.1.vsix"

echo "🔧 Installing Oropendola AI Assistant v2.1.1..."

if [ ! -f "$VSIX_FILE" ]; then
    echo "❌ Error: $VSIX_FILE not found!"
    exit 1
fi

# Try different code command locations
if command -v code &> /dev/null; then
    code --install-extension "$VSIX_FILE" --force
elif [ -f "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" ]; then
    "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" --install-extension "$VSIX_FILE" --force
else
    echo "⚠️  'code' command not found in PATH."
    echo ""
    echo "📋 Manual installation steps:"
    echo "1. Open VS Code"
    echo "2. Press Cmd+Shift+P"
    echo "3. Type 'Extensions: Install from VSIX'"
    echo "4. Select: $(pwd)/$VSIX_FILE"
    echo "5. Reload VS Code when prompted"
    exit 1
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "🔄 Please reload VS Code to activate the extension:"
echo "   Press Cmd+Shift+P → 'Developer: Reload Window'"
echo ""
echo "🎯 What's new in v2.1.1:"
echo "   • AI now verbalizes its thinking process"
echo "   • Shows step-by-step analysis before actions"
echo "   • Uses emojis to make reasoning visible: 🤔 💭 🔍 ✓ ⚠️ 💡"
echo "   • Fixed syntax errors from v2.1.0"
echo ""
echo "🧪 Test it:"
echo "   Open Oropendola sidebar → Ask: 'Create a POS app using Electron'"
echo "   You should see AI thinking out loud with detailed analysis"
