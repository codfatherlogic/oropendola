# Oropendola AI VS Code Extension

🐦 **Oropendola AI** is a powerful AI-powered coding assistant for Visual Studio Code that helps you understand, review, fix, and improve your code with real-time streaming responses.

> **Built with inspiration from [Roo-Code](https://github.com/RooCodeInc/Roo-Code)** - We've adapted their excellent architecture and simplified it for a focused, single-provider experience.

## ✨ Features

### 🎨 Multi-Mode AI Assistant (NEW in v3.7.0)

Oropendola offers **four specialized AI modes** for different workflows:

**💻 Code Mode (Default)**
- ⚡ Fast, practical implementations
- ✅ Can modify files and run commands
- 🎯 Perfect for: Quick feature development, bug fixes, refactoring

**🏗️ Architect Mode**
- 📐 Comprehensive system design
- ✅ Can modify files (for docs)
- ❌ No command execution
- 🎯 Perfect for: Architecture planning, design reviews, documentation

**� Ask Mode (Learning)**
- � Educational explanations
- ❌ Read-only, no modifications
- 🎯 Perfect for: Understanding code, learning concepts, code review

**🐛 Debug Mode**
- 🔍 Systematic troubleshooting
- ✅ Can modify files and run commands
- 🎯 Perfect for: Bug investigation, root cause analysis, performance issues

**🔄 Switch modes instantly** with `Cmd+M` (Mac) or `Ctrl+M` (Windows/Linux)!

📚 **Learn more**: 
- User Guide: [`docs/MULTI_MODE_USER_GUIDE.md`](./docs/MULTI_MODE_USER_GUIDE.md)
- Developer Guide: [`docs/MULTI_MODE_DEVELOPER_GUIDE.md`](./docs/MULTI_MODE_DEVELOPER_GUIDE.md)
- Quick Reference: [`docs/MULTI_MODE_QUICK_REFERENCE.md`](./docs/MULTI_MODE_QUICK_REFERENCE.md)

---

### 🌊 Real-time Streaming
Get AI responses token-by-token as they're generated for a smooth, interactive experience.

### 🤖 Powered by Oropendola AI
One powerful AI assistant that handles everything:
- **Intelligent Responses** - Context-aware code understanding
- **Real-time Streaming** - Token-by-token responses
- **Agent Mode (NEW!)** - Automatic AI model selection for optimal cost and performance
- **No Configuration** - Just login and start coding
- **Consistent Performance** - Optimized for your needs

#### 🎯 Agent Mode - Automatic Model Selection
Oropendola automatically selects the best AI model for each request based on:
- **Cost Efficiency** - Balances performance with your subscription plan
- **Performance** - Matches task complexity with model capability
- **Availability** - Routes around unhealthy models automatically
- **Latency** - Optimizes for response time

**You don't choose models - Oropendola does it automatically!**

Supported models: Claude, GPT-4, DeepSeek, Grok, Gemini

📚 **Learn more**: [`AGENT_MODE_INTEGRATION.md`](./AGENT_MODE_INTEGRATION.md)

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

### 🔗 Intelligent URL Analysis (NEW!)
- **Auto-detect Git URLs** - Paste GitHub, GitLab, or Bitbucket links for instant analysis
- **Repository insights** - Get structure, languages, README, and metadata automatically
- **Context-aware responses** - AI understands repository patterns and generates relevant code
- **Multi-platform support** - Works with GitHub, GitLab, Bitbucket, and generic Git URLs
- **Web URL support** - Analyze documentation, blogs, and technical articles

📚 **Quick Start**: [`QUICK_START_URL_ANALYSIS.md`](./docs/QUICK_START_URL_ANALYSIS.md)  
📖 **Full Guide**: [`URL_ANALYSIS_FEATURE.md`](./docs/URL_ANALYSIS_FEATURE.md)

### 💾 Task Persistence & History (NEW!)
Never lose your work! Every conversation is automatically saved and browsable.

- **Automatic Saving** - All conversations saved to local SQLite database
- **History View** - Browse all past tasks with search and filters
- **Resume Conversations** - Click any task to continue from where you left off
- **Export Options** - Export tasks to JSON, Markdown, or plain text
- **Full-Text Search** - Find tasks instantly with FTS5-powered search
- **Task Metrics** - Track tokens, costs, and completion status
- **Offline-First** - Works completely offline, data stored locally

📚 **Learn more**:
- User Guide: [`TASK_PERSISTENCE_USER_GUIDE.md`](./TASK_PERSISTENCE_USER_GUIDE.md)
- Developer Guide: [`TASK_PERSISTENCE_DEV_GUIDE.md`](./TASK_PERSISTENCE_DEV_GUIDE.md)

**How it works:**
1. Start a conversation - Task automatically created
2. Chat with AI - State auto-saved after each response
3. Click "History" tab - See all your tasks
4. Click any task - Continue the conversation!

### 🎯 @Mentions System (NEW!)
Reference files, folders, and project context directly in your conversations!

Type `@` to trigger intelligent autocomplete and inject context into your prompts:

- **📄 @/file.ts** - Include file contents
- **📁 @/folder/** - Reference folder structure  
- **⚠️ @problems** - Include workspace diagnostics
- **💻 @terminal** - Share terminal output
- **🔀 @git** - Include git history
- **🌐 @https://...** - Reference external docs

**Features:**
- ⚡ Fuzzy search with scoring
- 🚀 Parallel context extraction (3-5x faster)
- 💾 LRU cache with 30s TTL
- 🎯 Autocomplete with 150ms debounce
- 📊 Supports up to 50 mentions per message

📚 **Learn more**:
- User Guide: [`docs/MENTIONS_USER_GUIDE.md`](./docs/MENTIONS_USER_GUIDE.md)
- API Documentation: [`docs/MENTIONS_API.md`](./docs/MENTIONS_API.md)

**Examples:**
```
Review @/src/UserService.ts for security issues

What's in @/src/components/ folder?

Fix @problems in the project

@terminal shows an error, help debug it
```

### 📊 Subscription Management
- Real-time usage tracking
- **User API Integration (NEW!)** - Manage API keys and view subscription details
  - Get/regenerate API key directly from extension
  - View daily quota and monthly budget
  - Track subscription status
  - Auto-fetch profile after login
- Status bar indicator with color coding:
  - 🟢 Green: Plenty of requests remaining
  - 🟡 Yellow: Running low (< 30%)
  - 🔴 Red: Very low (< 10%)

📚 **Learn more**: [`USER_API_INTEGRATION.md`](./USER_API_INTEGRATION.md)

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

### 1. Sign In to Oropendola

1. Install the extension
2. Click the **Oropendola icon** in the Activity Bar (left sidebar)
3. Click **"Sign In"** yellow button
4. Enter your email and password
5. ✅ Done! Your API key and subscription are loaded automatically

> **No manual API key configuration needed!** The extension uses session-based authentication and automatically fetches your API key and subscription details after login.

### 2. View Your Subscription

After signing in, you can:
- View your API key (first time only - store it securely!)
- Check daily quota remaining
- Monitor monthly budget usage
- Regenerate API key if needed

📚 See [`USER_API_INTEGRATION.md`](./USER_API_INTEGRATION.md) for details

### 3. Start Coding with AI

Open the chat panel and ask questions:
```
"Explain this code"
"Fix the bug in my function"
"Create a REST API endpoint"
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
