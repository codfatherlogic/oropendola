# Oropendola AI VS Code Extension

🐦 **Oropendola AI** is a powerful AI-powered coding assistant for Visual Studio Code that helps you understand, review, fix, and improve your code with real-time streaming responses.

> **Built with inspiration from [Roo-Code](https://github.com/RooCodeInc/Roo-Code)** - We've adapted their excellent architecture and simplified it for a focused, single-provider experience.

## ✨ Features

### 🤖💬 Agent & Ask Modes

Oropendola offers **two interaction modes** for flexible AI assistance:

**🤖 Agent Mode (Default)**
- ✅ Autonomous file discovery and modification
- ✅ Multi-step operations with error correction
- ✅ Full workspace access
- 🎯 Perfect for: Building features, complex refactoring, autonomous tasks

**💬 Ask Mode (Safe)**
- 🛡️ Read-only, no file modifications
- ✅ Answer questions and explain code
- ✅ Safe exploration and learning
- 🎯 Perfect for: Understanding code, getting suggestions, code review

**🔄 Switch between modes anytime** with a single click in the sidebar!

📚 **Learn more**: 
- Quick Start: [`QUICK_START_MODES.md`](./QUICK_START_MODES.md)
- Complete Guide: [`AGENT_ASK_MODE_GUIDE.md`](./AGENT_ASK_MODE_GUIDE.md)

---

### 🌊 Real-time Streaming
Get AI responses token-by-token as they're generated for a smooth, interactive experience.

### 🤖 Powered by Oropendola AI
One powerful AI assistant that handles everything:
- **Intelligent Responses** - Context-aware code understanding
- **Real-time Streaming** - Token-by-token responses
- **No Configuration** - Just login and start coding
- **Consistent Performance** - Optimized for your needs

### 💬 AI Chat Interface
- Beautiful WebView-based chat panel
- Context-aware responses
- Conversation history
- Code syntax highlighting

### 📝 Code Operations
- **Explain Code** - Understand what any code does
- **Fix Code** - Identify and resolve issues
- **Improve Code** - Get optimization suggestions
- **Review Code** - Comprehensive code quality analysis

### 🔧 GitHub Integration
- Fork repositories directly from VS Code
- Clone repositories to workspace
- Automatic repository analysis
- Find similar repositories

### 📊 Subscription Management
- Real-time usage tracking
- Status bar indicator with color coding:
  - 🟢 Green: Plenty of requests remaining
  - 🟡 Yellow: Running low (< 30%)
  - 🔴 Red: Very low (< 10%)

### ⚡ Advanced Features
- Repository analysis and insights
- Dependency detection
- Language statistics
- Code complexity metrics
- Smart context building

## 📦 Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X` or `Cmd+Shift+X`)
3. Search for "Oropendola"
4. Click **Install**

### Manual Installation

```bash
# Clone the repository
git clone https://github.com/your-org/oropendola-extension.git
cd oropendola-extension

# Install dependencies
npm install

# Package the extension
npm run package

# Install the .vsix file
code --install-extension oropendola-ai-assistant-1.0.0.vsix
```

## 🚀 Getting Started

### 1. Get API Credentials

1. Visit [oropendola.ai](https://oropendola.ai)
2. Sign up for an account
3. Get your API key and secret from the dashboard

### 2. Configure the Extension

**Option A: Using Setup Command (Recommended)**
1. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Run `Oropendola: Setup`
3. Enter your API key
4. Enter your API secret

**Option B: Manual Configuration**
1. Open VS Code Settings
2. Navigate to Extensions → Oropendola
3. Enter your API credentials

### 3. Start Using Oropendola

Open the chat panel:
```
Ctrl+Shift+P → Oropendola: Chat
```

Or right-click on code and select Oropendola actions!

## ⚙️ Configuration

### API Settings

```json
{
  "oropendola.api.url": "https://oropendola.ai",
  "oropendola.api.key": "your-api-key",
  "oropendola.api.secret": "your-api-secret"
}
```

### AI Model Settings

```json
{
  "oropendola.ai.model": "auto",  // auto, gpt, claude, gemini, local
  "oropendola.ai.temperature": 0.7,  // 0.0-2.0 (creativity level)
  "oropendola.ai.maxTokens": 4096  // Maximum response length
}
```

### GitHub Settings

```json
{
  "oropendola.github.token": "your-github-token",
  "oropendola.github.defaultOrg": "your-org"
}
```

### Analysis Settings

```json
{
  "oropendola.analysis.autoAnalyze": true,
  "oropendola.analysis.excludePatterns": [
    "node_modules",
    ".git",
    "dist",
    "build"
  ]
}
```

## 💳 Subscription Tiers

| Tier | Price | Requests | Features |
|------|-------|----------|----------|
| **Trial** | ₹199 | 200 total | All models, Basic support |
| **Weekly** | ₹849 | 300/day | All models, Priority support |
| **Monthly** | ₹2999 | Unlimited | All models, Premium support |

Visit [oropendola.ai/pricing](https://oropendola.ai/pricing) for current pricing.

## 🎯 Commands

### Main Commands

- `Oropendola: Setup` - Configure API credentials
- `Oropendola: Chat` - Open AI chat panel
- `Oropendola: Check Subscription` - View usage and subscription status
- `Oropendola: Change AI Model` - Switch between AI models

### Code Operations

- `Oropendola: Explain Code` - Understand selected code
- `Oropendola: Fix Code` - Identify and fix issues
- `Oropendola: Improve Code` - Get optimization suggestions
- `Oropendola: Review Code` - Comprehensive code review
- `Oropendola: Analyze Code` - Analyze current file

### GitHub Operations

- `Oropendola: Fork Repository` - Fork a GitHub repository
- `Oropendola: List My Repositories` - Browse your repositories
- `Oropendola: Find Similar Repositories` - Find similar projects

## 🖱️ Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|--------------|-------|
| Open Chat | `Ctrl+Shift+P` → Oropendola: Chat | `Cmd+Shift+P` → Oropendola: Chat |
| Explain Code | Right-click → Explain Code | Right-click → Explain Code |
| Fix Code | Right-click → Fix Code | Right-click → Fix Code |

## 🔧 API Reference

### Streaming Endpoint

```
POST https://oropendola.ai/api/method/ai_assistant.api.streaming_chat_completion
```

### Authentication

```
Authorization: token YOUR_API_KEY:YOUR_API_SECRET
```

### Request Format

```json
{
  "message": "Your question here",
  "stream": true,
  "model_preference": "gpt|claude|gemini|local|auto",
  "temperature": 0.7,
  "max_tokens": 4096
}
```

### Response Format (Streaming)

Server-Sent Events (SSE) format:
```
data: {"choices":[{"delta":{"content":"token"}}],"remaining_requests":250}
data: {"choices":[{"delta":{"content":" here"}}],"remaining_requests":250}
data: [DONE]
```

## 📚 Examples

### Example 1: Explain Complex Code

1. Select the code you want to understand
2. Right-click and choose "Explain Code"
3. Read the detailed explanation in the chat panel

### Example 2: Fix Buggy Code

1. Select problematic code
2. Right-click and choose "Fix Code"
3. Get the fixed version with explanations

### Example 3: Fork and Analyze Repository

```
1. Cmd/Ctrl+Shift+P → Oropendola: Fork Repository
2. Enter GitHub URL: https://github.com/microsoft/vscode
3. Wait for cloning and analysis
4. Ask questions about the repository in chat
```

### Example 4: Get Code Improvements

1. Select your code
2. Right-click and choose "Improve Code"
3. Review optimization suggestions

## 🐛 Troubleshooting

### "Oropendola not configured" Error

**Solution:** Run `Oropendola: Setup` command and enter your API credentials.

### "Subscription expired" Error

**Solution:** 
1. Run `Oropendola: Check Subscription` to see your status
2. Visit [oropendola.ai](https://oropendola.ai) to upgrade your plan

### API Connection Issues

**Solution:**
- Check your internet connection
- Verify API credentials are correct
- Try switching to a different AI model

### GitHub Authentication Failed

**Solution:**
- Go to GitHub Settings → Developer settings → Personal access tokens
- Create a new token with `repo` scope
- Add to VS Code settings: `oropendola.github.token`

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- 🌐 Website: [oropendola.ai](https://oropendola.ai)
- 📧 Support: support@oropendola.ai
- 🐛 Issues: [GitHub Issues](https://github.com/your-org/oropendola-extension/issues)
- 📖 Documentation: [docs.oropendola.ai](https://docs.oropendola.ai)

## 🙏 Acknowledgments

Built with:
- VS Code Extension API
- Octokit (GitHub API)
- Axios (HTTP client)
- Simple Git (Git operations)

---

Made with ❤️ by the Oropendola team
