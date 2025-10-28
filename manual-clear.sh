#!/bin/bash
echo "Clearing VS Code settings for Oropendola..."

# On macOS, VS Code settings are stored in ~/Library/Application Support/Code/User/settings.json
# But workspace settings use a SQLite database

# The easiest way is to use the command inside VS Code
echo "Please run this command in VS Code:"
echo "  Cmd+Shift+P -> 'Oropendola: Clear Session Data'"
echo ""
echo "Or run:"
echo "  Cmd+Shift+P -> 'Oropendola: Sign Out'"
echo ""
echo "Then reload the window with Cmd+R"
