#!/bin/bash

# Install Oropendola AI Assistant v2.1.2
# Fixes: Think Out Loud + Chat History Persistence + New Chat Button

VSIX_FILE="oropendola-ai-assistant-2.1.2.vsix"

echo "🔧 Installing Oropendola AI Assistant v2.1.2..."
echo ""

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
    echo "2. Press Cmd+Shift+P (macOS) or Ctrl+Shift+P (Windows/Linux)"
    echo "3. Type 'Extensions: Install from VSIX'"
    echo "4. Select: $(pwd)/$VSIX_FILE"
    echo "5. Click Install"
    echo "6. Reload VS Code when prompted"
    echo ""
    exit 1
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "🔄 Please reload VS Code to activate the extension:"
echo "   Press Cmd+Shift+P → 'Developer: Reload Window'"
echo ""
echo "🎯 What's fixed in v2.1.2:"
echo ""
echo "   1. ✅ Think Out Loud Feature Now Working"
echo "      - AI now verbalizes its thinking process step-by-step"
echo "      - Shows analysis, planning, and decision-making"
echo "      - Uses emojis: 🤔 💭 🔍 ✓ ⚠️ 💡"
echo ""
echo "   2. 💾 Chat History Persistence"
echo "      - All messages saved automatically"
echo "      - History restored when VS Code reopens"
echo "      - Conversation ID preserved across sessions"
echo ""
echo "   3. 🆕 New Chat Button Fixed"
echo "      - Properly clears all state"
echo "      - Resets conversation ID"
echo "      - Forces new system prompt"
echo ""
echo "🧪 Test the fixes:"
echo ""
echo "   Test 1 - Think Out Loud:"
echo "   → Open Oropendola sidebar"
echo "   → Send: 'Create a simple Express.js REST API'"
echo "   → You should see: '🤔 Let me think through this...'"
echo ""
echo "   Test 2 - Chat Persistence:"
echo "   → Send a few messages"
echo "   → Close VS Code (Cmd+Q)"
echo "   → Reopen VS Code"
echo "   → Your chat history should be restored! 📥"
echo ""
echo "   Test 3 - New Chat:"
echo "   → Click the '+' button in header"
echo "   → Chat should clear completely"
echo "   → Next AI response will show thinking process"
echo ""
echo "📚 Read more:"
echo "   - INSTALL_v2.1.2.md (Installation guide)"
echo "   - RELEASE_NOTES_v2.1.2.md (Detailed changelog)"
echo ""
echo "🎉 Enjoy the improved Oropendola AI Assistant!"
