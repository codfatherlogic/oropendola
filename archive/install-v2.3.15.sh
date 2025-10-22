#!/bin/bash

echo "🚀 Installing Oropendola AI v2.3.15 with Claude-Style UI"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Uninstall old version
echo "📦 Step 1: Uninstalling old version..."
code --uninstall-extension oropendola.oropendola-ai-assistant 2>/dev/null
echo "✅ Old version uninstalled (if it existed)"
echo ""

# Step 2: Install new version
echo "📦 Step 2: Installing v2.3.15..."
if [ ! -f "oropendola-ai-assistant-2.3.15.vsix" ]; then
    echo "❌ ERROR: oropendola-ai-assistant-2.3.15.vsix not found!"
    echo "   Make sure you're running this script from the oropendola directory"
    exit 1
fi

code --install-extension oropendola-ai-assistant-2.3.15.vsix
echo "✅ v2.3.15 installed"
echo ""

# Step 3: Instructions
echo "⚠️  IMPORTANT NEXT STEPS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. 🔴 CLOSE ALL VS CODE WINDOWS (This is critical!)"
echo "   - Mac: Press Cmd+Q to fully quit VS Code"
echo "   - Windows/Linux: Close all windows"
echo ""
echo "2. 🟢 REOPEN VS CODE"
echo "   - Open it fresh (single window for testing)"
echo ""
echo "3. 🔄 RELOAD WINDOW"
echo "   - Press Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows/Linux)"
echo "   - Type: 'Developer: Reload Window'"
echo "   - Press Enter"
echo ""
echo "4. 🎨 OPEN OROPENDOLA & TEST"
echo "   - Click Oropendola icon in sidebar"
echo "   - Send a test message: 'create simple app'"
echo ""
echo "✨ YOU SHOULD NOW SEE:"
echo "   ✅ Thinking indicator with blue background (VISIBLE!)"
echo "   ✅ Your messages with blue left stripe"
echo "   ✅ AI responses with purple-blue left stripe"
echo "   ✅ TODOs updating in real-time"
echo ""
echo "📖 For troubleshooting, see: CRITICAL_INSTALL_v2.3.15.md"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Installation complete! Now close ALL VS Code windows and reopen."
