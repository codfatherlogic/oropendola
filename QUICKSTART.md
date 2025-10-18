# 🚀 Quick Start Guide - Oropendola AI Extension

Get started with Oropendola in 5 minutes!

## Step 1: Install the Extension

### Option A: From Source (Development)
```bash
# Clone and install
git clone https://github.com/your-org/oropendola-extension.git
cd oropendola-extension
npm install

# Open in VS Code and press F5 to run
code .
```

### Option B: From VSIX Package
```bash
# If you have the .vsix file
code --install-extension oropendola-ai-assistant-1.0.0.vsix
```

## Step 2: Get Your API Credentials

1. Visit **[oropendola.ai](https://oropendola.ai)**
2. **Sign up** for an account
3. Go to your **Dashboard**
4. Copy your **API Key** and **API Secret**

## Step 3: Configure Oropendola

### Method 1: Setup Command (Recommended)

1. Open Command Palette: `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Type: `Oropendola: Setup`
3. Enter your **API Key**
4. Enter your **API Secret**
5. Done! ✅

### Method 2: Manual Configuration

1. Open VS Code Settings: `Ctrl+,` or `Cmd+,`
2. Search for "Oropendola"
3. Fill in:
   - **API URL**: `https://oropendola.ai` (default)
   - **API Key**: Your API key
   - **API Secret**: Your API secret

## Step 4: Start Using Oropendola!

### Try the Chat Interface

1. Open Command Palette: `Ctrl+Shift+P` / `Cmd+Shift+P`
2. Run: `Oropendola: Chat`
3. Ask a question like: "How do I create a REST API in Node.js?"

### Try Code Operations

1. **Open any code file**
2. **Select some code**
3. **Right-click** and choose:
   - **Explain Code** - Understand what it does
   - **Fix Code** - Find and fix issues
   - **Improve Code** - Get optimization tips

### Check Your Subscription

1. Look at the **status bar** (bottom right)
2. You'll see: `🟢 Oropendola: 200 requests`
3. Click it to see detailed subscription info

## Step 5: Explore Features

### Fork a GitHub Repository

```
Ctrl+Shift+P → Oropendola: Fork Repository
Enter: https://github.com/microsoft/vscode
```

The extension will:
- ✅ Fork the repository
- ✅ Clone it locally
- ✅ Analyze the codebase
- ✅ Add context to chat

### Analyze Your Code

```
Ctrl+Shift+P → Oropendola: Analyze Code
```

Get insights about:
- Programming languages used
- Dependencies
- Code complexity
- Test coverage
- Documentation

### Change AI Model

```
Ctrl+Shift+P → Oropendola: Change AI Model
Select: GPT, Claude, Gemini, or Auto
```

## Common Use Cases

### 1. Understanding Unfamiliar Code

```
1. Select the code you don't understand
2. Right-click → "Explain Code"
3. Read the detailed explanation
```

### 2. Debugging Issues

```
1. Select problematic code
2. Right-click → "Fix Code"
3. Get suggestions for fixes
```

### 3. Code Review

```
1. Open the file you want reviewed
2. Ctrl+Shift+P → "Oropendola: Review Code"
3. Get comprehensive feedback
```

### 4. Learning Best Practices

```
1. Select your code
2. Right-click → "Improve Code"
3. Learn better patterns
```

## Tips & Tricks

### 💡 Tip 1: Use Context
The AI understands your current file and workspace. You can ask:
- "What does this file do?"
- "How do I use this function?"
- "Find bugs in my code"

### 💡 Tip 2: Ask Follow-up Questions
The chat maintains conversation history:
```
You: "Explain this function"
AI: [Explains the function]
You: "Can you make it more efficient?"
AI: [Suggests improvements]
```

### 💡 Tip 3: Monitor Usage
Watch the status bar indicator:
- 🟢 **Green**: You're good!
- 🟡 **Yellow**: Running low (< 30%)
- 🔴 **Red**: Very low (< 10%)

### 💡 Tip 4: Use Keyboard Shortcuts
Speed up your workflow:
- Chat: `Ctrl+Shift+P` → type "chat"
- Setup: `Ctrl+Shift+P` → type "setup"
- Right-click code for quick actions

### 💡 Tip 5: Try Different Models
Different models have different strengths:
- **GPT**: Best for general coding
- **Claude**: Great for reasoning
- **Gemini**: Fast responses
- **Auto**: Let Oropendola choose

## Troubleshooting

### "Oropendola not configured"
➡️ Run `Oropendola: Setup` command

### "Subscription expired"
➡️ Visit [oropendola.ai](https://oropendola.ai) to upgrade

### Chat not opening
➡️ Check Output panel for errors
➡️ Reload VS Code window

### GitHub operations fail
➡️ Add GitHub token in settings:
```
Settings → Oropendola → GitHub Token
```

## Next Steps

- 📖 Read the [full documentation](README.md)
- 🛠️ Check the [development guide](DEVELOPMENT.md)
- 💬 Join our community
- ⭐ Star us on GitHub

## Need Help?

- 📧 Email: support@oropendola.ai
- 💬 Discord: [Join our Discord](https://discord.gg/oropendola)
- 🐛 Report issues: [GitHub Issues](https://github.com/your-org/oropendola-extension/issues)

---

**Happy Coding with Oropendola! 🐦**

## Quick Reference Card

| Action | Command |
|--------|---------|
| **Setup** | `Ctrl+Shift+P` → Oropendola: Setup |
| **Chat** | `Ctrl+Shift+P` → Oropendola: Chat |
| **Explain Code** | Right-click → Explain Code |
| **Fix Code** | Right-click → Fix Code |
| **Improve Code** | Right-click → Improve Code |
| **Review Code** | `Ctrl+Shift+P` → Oropendola: Review Code |
| **Analyze** | `Ctrl+Shift+P` → Oropendola: Analyze Code |
| **Fork Repo** | `Ctrl+Shift+P` → Oropendola: Fork Repository |
| **Check Subscription** | Click status bar or run command |
| **Change Model** | `Ctrl+Shift+P` → Oropendola: Change AI Model |
