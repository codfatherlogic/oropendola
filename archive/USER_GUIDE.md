# Oropendola AI Assistant - User Guide

**Version:** 3.5.0+
**Last Updated:** 2025-10-26

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Getting Started](#getting-started)
4. [Seven Views Overview](#seven-views-overview)
5. [Chat View](#chat-view)
6. [History View](#history-view)
7. [Terminal View](#terminal-view)
8. [Browser Automation View](#browser-automation-view)
9. [Marketplace View](#marketplace-view)
10. [Vector Search View](#vector-search-view)
11. [Settings View](#settings-view)
12. [Keyboard Shortcuts](#keyboard-shortcuts)
13. [Tips & Best Practices](#tips--best-practices)
14. [Troubleshooting](#troubleshooting)
15. [FAQ](#faq)

---

## Introduction

Oropendola AI Assistant is a powerful VS Code extension that brings AI-powered development tools directly into your editor. With 7 integrated views, you can chat with AI, manage tasks, control terminals, automate browsers, discover extensions, search code semantically, and customize your experience—all without leaving VS Code.

### Key Features

- **AI Chat** - Intelligent conversation with context-aware code assistance
- **Task Persistence** - Automatic task history and management
- **AI Terminal** - Command suggestions, explanations, and fixes
- **Browser Automation** - Control web browsers with natural language
- **Extension Marketplace** - Discover and install VS Code extensions
- **Semantic Search** - Find code using natural language queries
- **Multi-language Support** - UI in English, Spanish, French, German, and Arabic

---

## Installation

### From VSIX File

1. Download the latest `.vsix` file from releases
2. Open VS Code
3. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
4. Type "Extensions: Install from VSIX"
5. Select the downloaded `.vsix` file
6. Reload VS Code when prompted

### From VS Code Marketplace (Coming Soon)

1. Open VS Code
2. Click Extensions icon in sidebar (or press `Ctrl+Shift+X`)
3. Search for "Oropendola AI Assistant"
4. Click Install

---

## Getting Started

### First Time Setup

1. **Open Oropendola Panel**
   - Click the Oropendola icon in the activity bar (left sidebar)
   - Or press `Ctrl+Shift+O` (Windows/Linux) or `Cmd+Shift+O` (Mac)

2. **Login**
   - Enter your oropendola.ai email and password
   - Or create a new account at https://oropendola.ai

3. **Configure Settings** (Optional)
   - Click Settings view (Ctrl+7)
   - Choose your language
   - Configure preferences

### Quick Tour

Once logged in, you'll see the **Chat View** with a navigation bar showing all 7 views:

```
┌─────────────────────────────────────────────────────────────┐
│  Chat  │ History │ Terminal │ Browser │ Marketplace │ Vector │ Settings │
│ Ctrl+1 │ Ctrl+2  │  Ctrl+3  │ Ctrl+4  │   Ctrl+5    │ Ctrl+6 │  Ctrl+7  │
└─────────────────────────────────────────────────────────────┘
```

Click any tab or use keyboard shortcuts to switch between views.

---

## Seven Views Overview

### 1. Chat View (Ctrl+1)
The main AI conversation interface where you can ask questions, request code changes, and get development help.

### 2. History View (Ctrl+2)
View all your past tasks, conversations, and their outcomes. Search, filter, and revisit previous work.

### 3. Terminal View (Ctrl+3)
AI-powered terminal with command suggestions, explanations, and automatic fixes for failed commands.

### 4. Browser Automation View (Ctrl+4)
Control web browsers using natural language commands. Automate testing, scraping, and web interactions.

### 5. Marketplace View (Ctrl+5)
Browse and install VS Code extensions. Discover new tools to enhance your development workflow.

### 6. Vector Search View (Ctrl+6)
Search your codebase using natural language. Find code by describing what it does, not just keywords.

### 7. Settings View (Ctrl+7)
Customize the extension with language selection, theme preferences, and privacy controls.

---

## Chat View

The Chat View is your primary interface for AI-powered development assistance.

### Features

**AI Conversation**
- Ask coding questions in natural language
- Request code generation, refactoring, or debugging
- Get explanations for complex code
- Receive step-by-step guidance

**Context Awareness**
- AI automatically understands your current file
- Workspace context included in responses
- Previous conversation history maintained

**Auto-Approval Mode**
- Toggle between "Ask" and "Agent" modes
- **Ask Mode**: AI shows plan and waits for approval
- **Agent Mode**: AI executes low-risk actions automatically

### How to Use

1. **Start a Conversation**
   ```
   Type your question in the input box at the bottom
   Example: "How do I sort this array alphabetically?"
   ```

2. **Send Code for Review**
   ```
   Select code in editor → Right-click → "Send to Oropendola AI"
   Or paste code directly into chat
   ```

3. **Request Changes**
   ```
   "Refactor this function to use async/await"
   "Add error handling to this code"
   "Convert this to TypeScript"
   ```

4. **Get Explanations**
   ```
   "Explain what this regex does"
   "How does this algorithm work?"
   "What's the time complexity?"
   ```

### Tips

- Be specific in your requests
- Include relevant context (file names, error messages)
- Use follow-up questions to refine responses
- Review AI suggestions before applying changes

---

## History View

Track all your AI interactions and revisit past tasks.

### Features

- **Complete Task History** - Every conversation saved automatically
- **Smart Filtering** - Filter by date, status, or keywords
- **Quick Search** - Find tasks by description or content
- **Task Stats** - See total tasks completed
- **Export Options** - Export tasks as JSON or Markdown

### How to Use

1. **View All Tasks**
   - Switch to History view (Ctrl+2)
   - Scroll through chronological list

2. **Filter Tasks**
   - Use filter buttons: All / Completed / Failed
   - Search by keywords in task description

3. **Load Previous Task**
   - Click any task to view details
   - Review conversation and outcomes
   - Resume or repeat similar tasks

4. **Export Tasks**
   - Click export button on any task
   - Choose JSON or Markdown format
   - Save to desired location

### Task Information

Each task shows:
- **Description** - What you asked AI to do
- **Status** - Completed, Failed, or In Progress
- **Duration** - How long it took
- **File Changes** - Which files were modified
- **Messages** - Full conversation history

---

## Terminal View

AI-powered terminal with intelligent command assistance.

### Features

**AI Command Suggestions**
- Type natural language, get command suggestions
- Context-aware based on your current directory
- Confidence scores for each suggestion
- Platform-specific (Windows/Mac/Linux)

**Command Explanation**
- Hover over any command for explanation
- Understand complex flags and options
- Learn by doing with AI guidance

**Auto-Fix Failed Commands**
- AI detects command errors
- Suggests corrections automatically
- Explains what went wrong

**Output Analysis**
- AI analyzes terminal output
- Highlights errors and warnings
- Suggests next steps

### How to Use

1. **Get Command Suggestions**
   ```
   Type: "install dependencies for this project"
   AI suggests: npm install

   Type: "show all files including hidden"
   AI suggests: ls -la (Mac/Linux) or dir /a (Windows)
   ```

2. **Execute Commands**
   - Type command directly
   - Or click suggested command to execute
   - View output in integrated terminal

3. **Explain Unknown Commands**
   ```
   Type: git rebase -i HEAD~3
   Click "Explain" button
   AI explains: "Interactive rebase of last 3 commits..."
   ```

4. **Fix Failed Commands**
   ```
   Command fails: npm i -g typescript
   AI suggests: sudo npm install -g typescript
   Explains: "Needs elevated permissions"
   ```

5. **Analyze Output**
   - Select output text
   - Click "Analyze" button
   - AI explains errors and suggests fixes

### Supported Platforms

- **Linux** - bash, zsh, fish
- **macOS** - bash, zsh, fish
- **Windows** - PowerShell, cmd, Git Bash

---

## Browser Automation View

Control web browsers with natural language commands.

### Features

**Session Management**
- Create multiple browser sessions
- Each session is an independent browser instance
- Sessions persist until manually closed

**Natural Language Control**
- "Click the login button"
- "Fill in the email field with test@example.com"
- "Take a screenshot of the page"
- "Extract all product prices"

**Visual Feedback**
- See current page URL and title
- View screenshots inline
- Track action history

**Powerful Automation**
- Combine multiple actions in one command
- Error handling and retries
- Save screenshots and PDFs

### How to Use

1. **Create Browser Session**
   ```
   Click "New Session" button
   Name your session (e.g., "Testing Login")
   Session opens in background
   ```

2. **Navigate to Website**
   ```
   Enter URL: https://example.com
   Click "Go" or press Enter
   ```

3. **Execute Actions**
   ```
   Natural language:
   - "Click the search button"
   - "Type 'hello world' in the search box"
   - "Scroll to bottom of page"
   - "Click all links with class 'nav-item'"
   ```

4. **Take Screenshots**
   ```
   Click "Screenshot" button
   Screenshot appears inline
   Saved to workspace
   ```

5. **Manual Control**
   ```
   Use selector-based commands:
   - Click: #login-button
   - Type: input[name='email'], user@example.com
   - Select: select[name='country'], USA
   ```

6. **Close Session**
   ```
   Click "Close Session"
   Browser window closes
   Session removed from list
   ```

### Use Cases

- **Automated Testing** - Test web apps without manual clicking
- **Data Extraction** - Scrape data from websites
- **Form Filling** - Auto-fill repetitive forms
- **Screenshots** - Capture page states for documentation
- **Multi-step Workflows** - Automate complex processes

### Example Workflows

**Login Flow**
```
1. Navigate to https://app.example.com
2. "Click the login link"
3. "Type 'user@example.com' in the email field"
4. "Type 'password123' in the password field"
5. "Click the submit button"
6. "Take a screenshot"
```

**Data Collection**
```
1. Navigate to https://shop.example.com/products
2. "Extract all product names"
3. "Extract all prices"
4. "Click next page"
5. Repeat
```

---

## Marketplace View

Discover and install VS Code extensions without leaving Oropendola.

### Features

**Extension Search**
- Search all VS Code extensions
- Filter by category (AI, Themes, Languages, etc.)
- See ratings, downloads, and version info

**Installation Management**
- Install extensions with one click
- Uninstall extensions you don't need
- See which extensions are already installed

**Extension Details**
- Full description and readme
- Publisher information
- License and links
- User ratings and reviews

### How to Use

1. **Browse Extensions**
   ```
   View featured extensions on load
   Scroll through popular extensions
   ```

2. **Search for Extensions**
   ```
   Type in search box: "python"
   Press Enter or click Search
   Results appear instantly
   ```

3. **Filter by Category**
   ```
   Click category buttons:
   - All
   - AI
   - Productivity
   - Themes
   - Languages
   - Snippets
   - Debuggers
   ```

4. **View Extension Details**
   ```
   Click any extension card
   See full description
   Check compatibility
   Read user reviews
   ```

5. **Install Extension**
   ```
   Click "Install" button
   Extension downloads and installs
   Reload VS Code when prompted
   ```

6. **Uninstall Extension**
   ```
   Find installed extension (green "Installed" badge)
   Click extension card
   Click "Uninstall" button
   ```

### Categories

- **AI** - AI-powered coding assistants and tools
- **Productivity** - Tools to boost your workflow
- **Themes** - Color themes and icon packs
- **Languages** - Language support and syntax highlighting
- **Snippets** - Code snippet libraries
- **Debuggers** - Debugging tools
- **Linters** - Code quality and linting tools
- **Formatters** - Code formatting utilities

---

## Vector Search View

Semantic code search powered by AI embeddings.

### Features

**Natural Language Search**
- Search code by describing what it does
- No need for exact keywords
- AI understands intent and context

**Semantic Understanding**
- Finds conceptually similar code
- Works across different variable names
- Understands programming patterns

**Smart Results**
- Results ranked by relevance (similarity score)
- See code context around matches
- Jump directly to file and line number

**Workspace Indexing**
- Index entire codebase for fast search
- Updates automatically on file changes
- Excludes `node_modules` and build artifacts

### How to Use

1. **Index Your Workspace** (First Time)
   ```
   Switch to Vector view (Ctrl+6)
   Click "Index Management" tab
   Click "Index Workspace" button
   Wait for indexing to complete (shows progress)
   ```

2. **Search for Code**
   ```
   Type natural language query:
   - "Find authentication logic"
   - "Where do we validate user input?"
   - "Show me error handling code"
   - "Find API endpoint definitions"
   ```

3. **Review Results**
   ```
   Results show:
   - File path and line number
   - Code context (surrounding lines)
   - Similarity score (0.0 - 1.0)
   - File type icon
   ```

4. **Jump to Code**
   ```
   Click any result
   File opens at exact line
   Code is highlighted
   ```

5. **Re-index** (After Major Changes)
   ```
   Click "Index Management"
   View indexed files count
   Click "Re-index Workspace"
   ```

### Example Queries

**Finding Functionality**
```
"Find where we send emails"
"Show database connection code"
"Where do we handle file uploads?"
```

**Finding Patterns**
```
"Find all API routes"
"Show validation functions"
"Find error handling middleware"
```

**Finding Examples**
```
"Show me how we use React hooks"
"Find examples of async/await"
"Where do we use TypeScript generics?"
```

### Tips for Better Results

- Be specific but natural ("find login validation" not "login")
- Use programming terminology when relevant
- Try different phrasings if results aren't ideal
- Higher similarity scores (>0.8) are better matches
- Index regularly for fresh results

---

## Settings View

Customize Oropendola to match your preferences.

### Features

**Language Selection**
- 5 supported languages
- RTL support for Arabic
- Instant switching

**Theme Preferences**
- Light / Dark / High Contrast
- Matches VS Code theme

**App Settings**
- Auto-save on change
- Notification preferences
- Keyboard shortcut toggles

**Privacy Controls**
- Telemetry on/off
- Error reporting on/off
- Data sync preferences

### How to Use

1. **Change Language**
   ```
   Click Settings view (Ctrl+7)
   Click desired language card:
   - English
   - Español (Spanish)
   - Français (French)
   - Deutsch (German)
   - العربية (Arabic - RTL)

   UI updates immediately
   ```

2. **Configure Theme**
   ```
   Click Theme dropdown
   Select: Light / Dark / High Contrast
   ```

3. **Toggle Settings**
   ```
   Click toggle switches:
   - Auto-Save: Save settings automatically
   - Notifications: Show success/error messages
   - Keyboard Shortcuts: Enable/disable hotkeys
   ```

4. **Privacy Settings**
   ```
   Under Privacy section:
   - Telemetry: Anonymous usage data
   - Error Reporting: Crash reports
   - Data Sync: Cloud synchronization
   ```

5. **View Extension Info**
   ```
   Under About section:
   - Version number
   - License (MIT)
   - Links to GitHub, Docs, Support
   ```

6. **Reset Settings** (Danger Zone)
   ```
   Scroll to bottom
   Click "Reset All Settings"
   Confirm action
   Settings return to defaults
   ```

---

## Keyboard Shortcuts

### View Navigation

| Shortcut | Action |
|----------|--------|
| `Ctrl+1` | Switch to Chat view |
| `Ctrl+2` | Switch to History view |
| `Ctrl+3` | Switch to Terminal view |
| `Ctrl+4` | Switch to Browser view |
| `Ctrl+5` | Switch to Marketplace view |
| `Ctrl+6` | Switch to Vector Search view |
| `Ctrl+7` | Switch to Settings view |
| `Ctrl+Shift+H` | Toggle between Chat and History |

### Chat View

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift+Enter` | New line in message |
| `Ctrl+L` | Clear conversation |
| `Ctrl+/` | Focus message input |

### Terminal View

| Shortcut | Action |
|----------|--------|
| `Enter` | Execute command |
| `Up Arrow` | Previous command in history |
| `Down Arrow` | Next command in history |
| `Tab` | Accept AI suggestion |
| `Esc` | Clear input |

### Global

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+O` | Open/Close Oropendola panel |
| `Ctrl+Shift+P` | Command palette |
| `Escape` | Close modals/dialogs |

### Customization

To customize keyboard shortcuts:
1. Open VS Code settings (`Ctrl+,`)
2. Search for "Oropendola"
3. Click "Edit in settings.json"
4. Modify keybindings as needed

---

## Tips & Best Practices

### Chat View
- ✅ Be specific in your requests
- ✅ Include error messages and stack traces
- ✅ Provide file names and line numbers for context
- ✅ Break complex tasks into smaller steps
- ❌ Avoid vague requests like "fix my code"

### Terminal View
- ✅ Use natural language for command suggestions
- ✅ Review AI-suggested commands before executing
- ✅ Learn from AI explanations
- ✅ Let AI fix failed commands automatically
- ❌ Don't blindly execute commands you don't understand

### Browser Automation
- ✅ Name sessions descriptively
- ✅ Take screenshots for documentation
- ✅ Close sessions when done to free resources
- ✅ Use natural language for complex workflows
- ❌ Don't leave too many sessions open simultaneously

### Marketplace
- ✅ Read extension descriptions before installing
- ✅ Check ratings and download counts
- ✅ Uninstall unused extensions to reduce clutter
- ✅ Update extensions regularly
- ❌ Don't install extensions from untrusted publishers

### Vector Search
- ✅ Index workspace before first search
- ✅ Re-index after major code changes
- ✅ Use specific, descriptive queries
- ✅ Try multiple phrasings for better results
- ❌ Don't search without indexing first

### Settings
- ✅ Choose language you're comfortable with
- ✅ Enable auto-save for convenience
- ✅ Review privacy settings
- ✅ Backup settings before resetting
- ❌ Don't reset settings without backing up preferences

---

## Troubleshooting

### Common Issues

**Problem: "Not logged in" error**
```
Solution:
1. Click Settings view
2. Check server URL is https://oropendola.ai
3. Click logout then login again
4. Check internet connection
```

**Problem: AI responses are slow**
```
Solution:
1. Check backend connection at https://oropendola.ai
2. Verify internet speed
3. Try shorter, more focused questions
4. Check VS Code extensions causing conflicts
```

**Problem: Vector search returns no results**
```
Solution:
1. Ensure workspace is indexed (Vector view → Index Workspace)
2. Check if files are in supported languages
3. Try different search phrases
4. Re-index workspace
```

**Problem: Browser automation not working**
```
Solution:
1. Check if session is created successfully
2. Verify URL is valid (must include https://)
3. Check popup blockers aren't interfering
4. Review backend logs for Playwright errors
```

**Problem: Terminal commands not executing**
```
Solution:
1. Verify terminal is active
2. Check command syntax
3. Try manual execution first
4. Review terminal output for errors
```

**Problem: Extensions won't install from Marketplace**
```
Solution:
1. Check VS Code version compatibility
2. Verify internet connection
3. Try installing from VS Code marketplace directly
4. Check disk space
```

### Error Messages

**"Backend connection failed"**
- Backend server at https://oropendola.ai is down
- Check internet connection
- Contact support if issue persists

**"CSRF token invalid"**
- Session expired
- Logout and login again
- Clear browser cache in VS Code

**"Workspace not indexed"**
- Vector search requires indexing first
- Click "Index Workspace" in Vector view
- Wait for indexing to complete

**"Permission denied"**
- Terminal command needs elevated privileges
- Try with `sudo` (Mac/Linux) or admin PowerShell (Windows)
- Review command for security implications

### Getting Help

**Documentation**
- User Guide (this document)
- API Documentation
- Developer Setup Guide
- GitHub Issues: https://github.com/anthropics/oropendola/issues

**Support**
- Email: support@oropendola.ai
- Discord: https://discord.gg/oropendola
- GitHub Discussions: https://github.com/anthropics/oropendola/discussions

**Report Bugs**
1. Open GitHub Issues
2. Include VS Code version
3. Include Oropendola version
4. Describe steps to reproduce
5. Attach logs if available

---

## FAQ

**Q: Is Oropendola free?**
A: Oropendola offers a free tier with limited features and a paid tier with full access. Check https://oropendola.ai/pricing for details.

**Q: Does Oropendola send my code to servers?**
A: Only when you explicitly interact with AI features. Code is sent securely to https://oropendola.ai for processing. You can disable telemetry in Settings.

**Q: Which programming languages are supported?**
A: All languages supported by VS Code. AI assistance quality varies by language popularity.

**Q: Can I use Oropendola offline?**
A: Some features work offline (terminal execution, marketplace cache), but AI features require internet connection.

**Q: How do I uninstall Oropendola?**
A: Extensions → Search "Oropendola" → Click uninstall → Reload VS Code.

**Q: Can I use my own AI backend?**
A: Yes, configure custom backend URL in Settings → Server URL. Requires compatible API.

**Q: Does browser automation work on any website?**
A: Yes, but some sites with bot detection may block automation. Respect robots.txt and terms of service.

**Q: How accurate is semantic search?**
A: Accuracy depends on code quality and query specificity. Typical accuracy: 80-95%.

**Q: Can I search code in specific directories only?**
A: Currently searches entire indexed workspace. Directory filtering coming in future release.

**Q: How do I update the extension?**
A: VS Code auto-updates extensions. Or manually: Extensions → Oropendola → Update.

**Q: What's the difference between Ask and Agent modes?**
A: Ask mode requires approval for all actions. Agent mode executes low-risk actions automatically, only asks for high-risk changes.

**Q: Can multiple people use the same account?**
A: Account sharing is discouraged. Each developer should have their own account for proper attribution and limits.

**Q: Is my chat history private?**
A: Yes, chat history is tied to your account and not shared. Enable encryption in Settings for extra security.

**Q: What data does telemetry collect?**
A: Anonymous usage statistics (feature usage, error rates). No code or personal data. Disable in Settings → Privacy.

**Q: Can I export my data?**
A: Yes, export tasks from History view as JSON or Markdown. Full account export available at https://oropendola.ai/account.

---

## Conclusion

Oropendola AI Assistant transforms VS Code into an AI-powered development environment. With 7 integrated views, you have everything you need to code smarter, faster, and more efficiently.

**Get Started:**
1. Install the extension
2. Login to oropendola.ai
3. Start chatting with AI (Ctrl+1)
4. Explore other views (Ctrl+2-7)

**Need Help?**
- Read this guide
- Check FAQ section
- Visit https://docs.oropendola.ai
- Contact support@oropendola.ai

**Stay Updated:**
- Follow @oropendola_ai on Twitter
- Join our Discord community
- Star our GitHub repository
- Subscribe to our newsletter

---

*Happy coding with Oropendola AI!* 🐦

**Version:** 3.5.0+
**Last Updated:** 2025-10-26
**License:** MIT
**Website:** https://oropendola.ai
