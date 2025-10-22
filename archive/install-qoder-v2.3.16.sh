#!/bin/bash

echo "🚀 Installing Oropendola AI v2.3.16 in Qoder"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if running in correct directory
if [ ! -f "oropendola-ai-assistant-2.3.16.vsix" ]; then
    echo "❌ ERROR: oropendola-ai-assistant-2.3.16.vsix not found!"
    echo "   Run this script from the oropendola directory"
    exit 1
fi

# Step 1: Uninstall old version
echo "📦 Step 1: Removing old extension..."
/Applications/Qoder.app/Contents/Resources/app/bin/code --uninstall-extension oropendola.oropendola-ai-assistant 2>/dev/null
echo "✅ Uninstalled (if existed)"
echo ""

# Step 2: Remove cached files
echo "🧹 Step 2: Clearing extension cache..."
rm -rf ~/.qoder/extensions/oropendola.oropendola-ai-assistant-* 2>/dev/null
rm -rf ~/.vscode/extensions/oropendola.oropendola-ai-assistant-* 2>/dev/null
echo "✅ Cache cleared"
echo ""

# Step 3: Kill Qoder processes
echo "🛑 Step 3: Stopping Qoder processes..."
killall Qoder 2>/dev/null
killall "Qoder Helper" 2>/dev/null
sleep 2
echo "✅ Qoder stopped"
echo ""

# Step 4: Install new version
echo "📦 Step 4: Installing v2.3.16..."
/Applications/Qoder.app/Contents/Resources/app/bin/code --install-extension oropendola-ai-assistant-2.3.16.vsix
echo "✅ v2.3.16 installed"
echo ""

# Final instructions
echo "⚠️  IMPORTANT NEXT STEPS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. 🟢 OPEN QODER"
echo "   - Open Qoder fresh (single window for testing)"
echo ""
echo "2. 🔄 RELOAD WINDOW (CRITICAL!)"
echo "   - Press Cmd+Shift+P"
echo "   - Type: 'Developer: Reload Window'"
echo "   - Press Enter"
echo ""
echo "3. ✅ VERIFY VERSION"
echo "   - Open Extensions (Cmd+Shift+X)"
echo "   - Search 'Oropendola'"
echo "   - Version MUST show: 2.3.16"
echo ""
echo "4. 🔍 VERIFY HTML VERSION"
echo "   - Open Oropendola sidebar"
echo "   - Right-click → Inspect Element"
echo "   - Look for HTML comment: <!-- Oropendola AI v2.3.16 -->"
echo ""
echo "5. 🎨 TEST THE UI"
echo "   - Open Oropendola sidebar"
echo "   - Send message: 'create simple app'"
echo ""
echo "✨ YOU SHOULD SEE:"
echo "   ✅ Thinking indicator with BLUE background (VISIBLE!)"
echo "   ✅ Your messages with BLUE left stripe"
echo "   ✅ AI responses with PURPLE-BLUE left stripe"
echo "   ✅ All messages have colored borders"
echo "   ✅ TODOs update: ⬜ → ⏳ → ✅"
echo ""
echo "📖 For troubleshooting: see QODER_INSTALL_v2.3.16.md"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Installation complete!"
echo ""
echo "🚀 NOW: Open Qoder and reload the window (Cmd+Shift+P → Reload Window)"
