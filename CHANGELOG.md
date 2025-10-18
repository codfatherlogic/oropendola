# Changelog

All notable changes to the Oropendola AI Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2025-10-18

### 🐛 Fixed

#### Settings Tab Authentication UX Enhancement
- ✅ Enhanced "Not Signed In" message for clarity
- ✅ Added "Go to Chat Tab to Sign In" button
- ✅ Improved user guidance for authentication flow
- ✅ Clarified that Settings tab doesn't provide direct authentication
- 📚 **Note**: Settings tab correctly directs users to Chat tab for sign-in (by design)

### 🛠️ Changed
- 🔄 Reverted to two-mode system (Agent & Ask only)
- 📝 Mode selector now shows two buttons instead of three
- 🎯 Simplified user experience with clear Agent/Ask choice

### 🗑️ Removed
- ❌ Edit mode removed from UI
- ❌ Working set management code removed from ConversationTask
- ❌ Edit mode documentation files removed
- 📚 **Reason**: Maintaining simple, clear two-mode interaction model

---

## [2.0.0] - 2025-10-18

### 🎉 Major Release: Agent & Ask Modes

#### Added
- 🤖 **Agent Mode**: Full workspace access with file creation/modification capabilities
- 💬 **Ask Mode**: Safe, read-only mode for learning and exploration
- 🔄 **Mode Switching**: Instant toggle between Agent and Ask modes
- 🎨 **Visual Mode Selector**: Clean, modern UI for mode selection
- 📝 **Mode Descriptions**: Dynamic text explaining current mode behavior
- 🔒 **Safety Controls**: Ask mode prevents all file modifications
- 📄 **Comprehensive Documentation**: Three new guide documents

#### Mode Features

**Agent Mode (🤖)**:
- ✅ Create new files with complete code
- ✅ Modify existing files
- ✅ Execute tool calls automatically
- ✅ Multi-step operations
- ✅ Full workspace manipulation
- 📅 **Default mode** for backward compatibility

**Ask Mode (💬)**:
- ✅ Answer questions and explain code
- ✅ Provide suggestions and best practices
- ✅ Code review and analysis
- ✅ Learning and exploration
- ❌ Tool calls disabled (read-only)
- ❌ No file modifications
- 🛡️ **Safe mode** for risk-free exploration

#### User Interface
- 🎯 **Mode selector** positioned between header and messages
- 📊 **Active state highlighting** with VS Code theme colors
- 🖄️ **Smooth transitions** between modes
- 💬 **Dynamic empty state** title based on selected mode
- 📝 **Real-time mode description** updates

#### Technical Improvements
- 🛠️ **ConversationTask**: Mode-aware tool call parsing
- 📡 **Message handling**: switchMode event support
- 🔍 **Console logging**: Clear mode switch indicators
- 🏛️ **Architecture**: Clean separation of mode behaviors

#### Documentation
- 📚 **AGENT_ASK_MODE_GUIDE.md**: Complete 300+ line user guide
- 📝 **AGENT_ASK_MODE_IMPLEMENTATION.md**: Technical details and architecture
- ⚡ **QUICK_START_MODES.md**: Fast-start guide with examples
- 📊 **Comparison tables**: Mode capabilities and use cases
- 🧩 **Troubleshooting**: Common issues and solutions

#### Inspired By
- 💙 GitHub Copilot Chat (mode separation pattern)
- 🤖 Colabot (Do/Ask interaction model)
- 🎨 VS Code design language

### Changed
- 🔄 Updated sidebar HTML with mode selector
- 🎨 Enhanced CSS with mode-specific styles
- 🛠️ Refactored tool call parsing logic
- 📝 Improved console logging for debugging

### Fixed
- 🐛 Mode persistence during session
- ✅ Tool call execution respects selected mode
- 💬 Empty state adapts to current mode

### Security
- 🔒 Ask mode provides safe, read-only access
- ⚠️ Agent mode clearly labeled for workspace modifications
- 🛡️ User control over AI capabilities

---

## [1.0.0] - 2025-10-14

### Added
- 🌊 Real-time streaming AI responses
- 🤖 Multiple AI model support (GPT-4, Claude, Gemini, Local)
- 💬 Beautiful WebView-based chat interface
- 📝 Code operations: Explain, Fix, Improve, Review
- 🔧 GitHub repository forking and cloning
- 📊 Repository analysis and insights
- 💰 Subscription management and usage tracking
- 🎯 Status bar indicator with color-coded request count
- ⚡ Smart model routing with automatic fallback
- 📈 Code complexity metrics and statistics
- 🔍 Language detection and dependency analysis
- 🎨 Context-aware AI responses
- ⌨️ Keyboard shortcuts and context menu integration
- 🛠️ Comprehensive configuration options
- 📚 Extensive documentation and examples

### Features

#### AI Capabilities
- Real-time token-by-token streaming
- Support for OpenAI GPT-4
- Support for Anthropic Claude
- Support for Google Gemini
- Support for local AI models
- Automatic model selection and fallback
- Customizable temperature and token limits
- Context-aware responses with file content

#### Code Operations
- Explain selected code
- Fix code issues automatically
- Improve code with optimization suggestions
- Comprehensive code review
- Analyze file structure and complexity

#### GitHub Integration
- Fork any GitHub repository
- Clone repositories to workspace
- Automatic post-fork analysis
- List user repositories
- Find similar repositories

#### Repository Analysis
- Language detection and statistics
- Dependency analysis (npm, Python, Ruby, Go, Rust)
- Code structure analysis
- Test file detection
- Documentation file detection
- Complexity metrics
- File and directory statistics

#### User Interface
- WebView-based chat panel
- Syntax highlighting in chat
- Typing indicators
- Context information display
- Clear chat functionality
- Auto-resizing input field
- Send on Enter (Shift+Enter for newline)

#### Subscription Management
- Real-time usage tracking
- Status bar indicator
- Color-coded warnings (Green/Yellow/Red)
- Subscription status command
- Remaining request count
- Tier information display

### Configuration Options
- API URL, key, and secret
- Model preference (auto/gpt/claude/gemini/local)
- Temperature control (0.0 - 2.0)
- Max tokens setting
- GitHub token for repository operations
- Auto-analyze on fork
- Exclude patterns for analysis
- Chat history size

### Commands
- `Oropendola: Setup` - Configure API credentials
- `Oropendola: Chat` - Open AI chat
- `Oropendola: Check Subscription` - View usage
- `Oropendola: Change AI Model` - Switch models
- `Oropendola: Fork Repository` - Fork GitHub repo
- `Oropendola: List My Repositories` - Browse repos
- `Oropendola: Analyze Code` - Analyze current file
- `Oropendola: Review Code` - Review code quality
- `Oropendola: Explain Code` - Explain selected code
- `Oropendola: Fix Code` - Fix code issues
- `Oropendola: Improve Code` - Get improvements
- `Oropendola: Find Similar Repositories` - Find similar projects

### Technical Details
- Built with VS Code Extension API 1.74.0+
- Node.js 16+ required
- Axios for HTTP requests
- Octokit for GitHub API
- Simple Git for repository operations
- Server-Sent Events (SSE) for streaming
- WebView with React-like patterns

### Documentation
- Comprehensive README.md
- Development guide (DEVELOPMENT.md)
- API documentation
- Configuration examples
- Troubleshooting guide
- Contributing guidelines

## [Unreleased]

### Planned Features
- [ ] Multi-file context analysis
- [ ] Code generation from natural language
- [ ] Refactoring suggestions
- [ ] Test generation
- [ ] Documentation generation
- [ ] Git commit message generation
- [ ] Pull request description generation
- [ ] Code snippet library
- [ ] Custom prompt templates
- [ ] Team collaboration features
- [ ] VSCode extension marketplace integration
- [ ] Telemetry and analytics (opt-in)
- [ ] Offline mode support
- [ ] Cache management
- [ ] Export chat history
- [ ] Conversation branching
- [ ] Multiple chat panels
- [ ] Custom keybindings
- [ ] Themes for chat interface

---

For detailed information about each release, see the [GitHub Releases](https://github.com/your-org/oropendola-extension/releases) page.
