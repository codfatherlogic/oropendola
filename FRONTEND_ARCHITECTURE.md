# Oropendola VS Code Extension - Frontend Architecture

## 📋 Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Core Components](#core-components)
5. [Data Flow](#data-flow)
6. [Key Features](#key-features)
7. [Architecture Diagram](#architecture-diagram)

---

## Overview

Oropendola is a **VS Code Extension** that provides AI-powered coding assistance through:
- Chat interface (sidebar)
- Inline code completions
- Code actions and diagnostics
- Repository analysis
- URL detection and analysis

**Type**: VS Code Native Extension (not a webview-only app)
**Language**: JavaScript (Node.js runtime in VS Code)
**UI**: HTML/CSS in VS Code Webview + Native VS Code APIs

---

## Technology Stack

### Core Framework
```
VS Code Extension API v1.74.0+
├── Extension Host (Node.js)
│   ├── JavaScript (ES6+)
│   ├── CommonJS modules (require/module.exports)
│   └── Event-driven architecture
│
└── Webview API
    ├── HTML5
    ├── CSS3
    └── Vanilla JavaScript (no React/Vue/Angular)
```

### Key Dependencies

**Communication & HTTP**:
- `axios` - HTTP client for backend API calls
- `socket.io-client` - Real-time WebSocket communication

**Data Processing**:
- `marked` - Markdown parsing
- `marked-highlight` - Code syntax highlighting in markdown
- `highlight.js` - Syntax highlighting

**Security**:
- `@vscode/webview-ui-toolkit` - VS Code native UI components
- `keytar` (optional) - Secure credential storage

**Development**:
- `vsce` - VS Code Extension packager
- `eslint` - Code linting

---

## Project Structure

```
oropendola/
│
├── extension.js                      # 🚀 ENTRY POINT
│   └── activate() - Extension initialization
│
├── package.json                      # Extension manifest & config
│
└── src/
    │
    ├── 📁 sidebar/                   # Chat UI (Main Interface)
    │   └── sidebar-provider.js       # Webview provider, message handling
    │
    ├── 📁 core/                      # Core Business Logic
    │   ├── ConversationTask.js       # Task execution, AI requests
    │   └── RealtimeManager.js        # WebSocket connection manager
    │
    ├── 📁 auth/                      # Authentication
    │   ├── auth-manager.js           # Session management
    │   └── AuthManager.js            # Enhanced auth with enterprise
    │
    ├── 📁 ai/                        # AI Provider Integrations
    │   ├── chat-manager.js           # AI routing logic
    │   └── providers/
    │       ├── oropendola-provider.js   # Main backend provider
    │       ├── openai-provider.js       # OpenAI integration
    │       ├── anthropic-provider.js    # Claude integration
    │       └── local-provider.js        # Local models
    │
    ├── 📁 autocomplete/              # Inline Completions
    │   └── autocomplete-provider.js  # Code suggestions
    │
    ├── 📁 edit/                      # Code Editing Features
    │   └── edit-mode.js              # Inline edit functionality
    │
    ├── 📁 editor/                    # Editor Integrations
    │   ├── DiffPreviewManager.js     # Show diffs before applying
    │   └── ChangeApprovalManager.js  # Accept/reject changes
    │
    ├── 📁 workspace/                 # Workspace Analysis
    │   ├── LocalWorkspaceAnalyzer.js # Analyze project structure
    │   └── WorkspaceIndexer.js       # Index files for search
    │
    ├── 📁 analysis/                  # Code Analysis
    │   ├── repository-analyzer.js    # Repo structure analysis
    │   └── url-analyzer.js           # GitHub URL detection
    │
    ├── 📁 github/                    # GitHub Integration
    │   └── api.js                    # GitHub API client
    │
    ├── 📁 utils/                     # Utilities
    │   ├── todo-manager.js           # TODO list management
    │   ├── file-change-tracker.js    # Track file modifications
    │   ├── task-summary-generator.js # Generate task reports
    │   └── report-name-generator.js  # Generate report filenames
    │
    ├── 📁 telemetry/                 # Analytics
    │   └── TelemetryService.js       # Usage tracking
    │
    ├── 📁 providers/                 # VS Code Providers
    │   ├── InlineCompletionProvider.js  # Inline suggestions
    │   ├── DiagnosticsProvider.js       # Error detection
    │   └── CodeActionProvider.js        # Quick fixes
    │
    ├── 📁 panels/                    # UI Panels
    │   └── TodoPanel.js              # TODO list view
    │
    ├── 📁 services/                  # Business Services
    │   ├── contextService.js         # Context gathering
    │   ├── conversationHistoryService.js  # Chat history
    │   └── backendTodoService.js     # Backend TODO sync
    │
    └── 📁 api/                       # API Clients
        ├── client.js                 # Base HTTP client
        ├── chat.js                   # Chat API
        ├── workspace.js              # Workspace API
        └── git.js                    # Git operations API
```

---

## Core Components

### 1. Extension Entry Point

**File**: `extension.js`

```javascript
// Main activation function
async function activate(context) {
    console.log('🐦 Oropendola AI Extension is now active!');

    // 1. Initialize providers
    const sidebarProvider = new OropendolaSidebarProvider(context);
    const authManager = new AuthManager(serverUrl);
    const chatManager = new ChatManager();

    // 2. Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.openChat', ...),
        vscode.commands.registerCommand('oropendola.login', ...),
        // ... more commands
    );

    // 3. Register webview provider
    vscode.window.registerWebviewViewProvider(
        'oropendola-sidebar',
        sidebarProvider
    );

    // 4. Initialize enterprise features
    initializeEnterpriseFeatures(context);
}
```

**What it does**:
- Entry point when VS Code loads
- Initializes all services
- Registers commands (Cmd+Shift+P commands)
- Sets up sidebar webview

---

### 2. Sidebar Provider (Chat UI)

**File**: `src/sidebar/sidebar-provider.js`

**Architecture**:
```
┌─────────────────────────────────────┐
│   OropendolaSidebarProvider         │
│   (VS Code WebviewViewProvider)     │
├─────────────────────────────────────┤
│                                     │
│  resolveWebviewView()               │
│  ├─ Generate HTML                   │
│  ├─ Set up message handlers         │
│  └─ Initialize webview              │
│                                     │
│  _handleSendMessage()               │
│  ├─ Process user input              │
│  ├─ Detect URLs                     │
│  ├─ Create ConversationTask         │
│  └─ Send to backend                 │
│                                     │
│  _handleMessage(message)            │
│  ├─ sendMessage                     │
│  ├─ login                           │
│  ├─ logout                          │
│  ├─ addContext                      │
│  ├─ feedback                        │
│  └─ todoActions                     │
│                                     │
└─────────────────────────────────────┘
```

**Key Responsibilities**:
- Render chat interface (HTML/CSS/JS in webview)
- Handle user input
- Display AI responses
- Manage TODOs
- Show file changes
- Display typing indicators

**Communication**:
```javascript
// Extension → Webview
this._view.webview.postMessage({
    type: 'addMessage',
    message: { role: 'assistant', content: 'Hello!' }
});

// Webview → Extension
window.addEventListener('message', event => {
    const message = event.data;
    if (message.type === 'sendMessage') {
        // Handle user message
    }
});
```

---

### 3. Conversation Task

**File**: `src/core/ConversationTask.js`

**Architecture**:
```
┌─────────────────────────────────────┐
│      ConversationTask               │
│      (EventEmitter)                 │
├─────────────────────────────────────┤
│                                     │
│  run(userMessage, attachments)      │
│  ├─ Add message to history          │
│  ├─ Gather workspace context        │
│  ├─ Call backend API                │
│  ├─ Parse response & tool calls     │
│  ├─ Execute tools                   │
│  └─ Continue until done             │
│                                     │
│  _makeAIRequestWithRetry()          │
│  ├─ Build request payload           │
│  ├─ Add context (files, git, etc)   │
│  ├─ Handle retries (4 attempts)     │
│  └─ Return AI response              │
│                                     │
│  _executeToolCall(toolCall)         │
│  ├─ create_file                     │
│  ├─ modify_file                     │
│  ├─ delete_file                     │
│  ├─ run_terminal_command            │
│  └─ read_file                       │
│                                     │
│  _shouldGenerateReport()            │
│  └─ Determine if report needed      │
│                                     │
└─────────────────────────────────────┘
```

**Purpose**: Manages a single conversation task from start to finish

**Flow**:
1. User sends message
2. Task gathers context (workspace, git, open files)
3. Task sends request to backend
4. Backend returns AI response + tool calls
5. Task executes tool calls (create files, run commands)
6. Task continues conversation if needed
7. Task completes and optionally generates report

---

### 4. Realtime Manager

**File**: `src/core/RealtimeManager.js`

**Architecture**:
```
┌─────────────────────────────────────┐
│      RealtimeManager                │
│      (EventEmitter)                 │
├─────────────────────────────────────┤
│                                     │
│  connect()                          │
│  ├─ Create Socket.IO client         │
│  ├─ Authenticate with session       │
│  └─ Set up event handlers           │
│                                     │
│  Events Emitted:                    │
│  ├─ 'connected'                     │
│  ├─ 'disconnected'                  │
│  ├─ 'ai_progress' (from backend)    │
│  └─ 'error'                         │
│                                     │
└─────────────────────────────────────┘
```

**Purpose**: Maintains persistent WebSocket connection to backend for real-time updates

**Events**:
```javascript
// Backend sends progress updates
socket.on('ai_progress', (data) => {
    if (data.type === 'toolExecutionStart') {
        // Show "Creating file..." in UI
    }
    if (data.type === 'toolExecutionComplete') {
        // Show "✅ File created" in UI
    }
});
```

---

### 5. URL Analyzer

**File**: `src/analysis/url-analyzer.js`

**Purpose**: Automatically detect and analyze repository URLs in chat

```javascript
class URLAnalyzer {
    detectURLs(text) {
        // Regex patterns for:
        // - github.com/owner/repo
        // - gitlab.com/owner/repo
        // - bitbucket.org/owner/repo
        return detectedUrls;
    }

    async analyzeGitHubRepo(urlInfo) {
        // Fetch repo metadata
        // Get file structure
        // Get README
        // Get languages
        return analysis;
    }
}
```

**Flow**:
```
User: "Check out https://github.com/facebook/react"
   ↓
URLAnalyzer detects GitHub URL
   ↓
URLAnalyzer fetches repo info from GitHub API
   ↓
AI receives repo context:
   - Description
   - Languages
   - File structure
   - README excerpt
```

---

### 6. TODO Manager

**File**: `src/utils/todo-manager.js`

**Purpose**: Manage task list displayed in sidebar

```javascript
class TodoManager {
    addTodo(content, activeForm) {
        // Add new TODO
    }

    updateTodoStatus(index, status) {
        // Update TODO status: pending → in_progress → completed
    }

    getAllTodos() {
        // Return all TODOs
    }
}
```

**Display**:
```
Tracking progress

#1 Project metadata          [IN PROGRESS]
#2 Basic scripts             [PENDING]
#3 Frappe framework dep      [PENDING]
#4 Entry point set to index  [PENDING]
```

---

## Data Flow

### User Message → AI Response Flow

```
┌──────────┐
│   User   │ Types message in chat
└────┬─────┘
     │
     ↓
┌────────────────────────┐
│  Sidebar Provider      │ Receives message
│  (sidebar-provider.js) │
└────┬───────────────────┘
     │
     ↓
┌────────────────────────┐
│  URL Analyzer          │ Detects URLs (optional)
│  (url-analyzer.js)     │
└────┬───────────────────┘
     │
     ↓
┌────────────────────────┐
│  ConversationTask      │ Creates new task
│  (ConversationTask.js) │
└────┬───────────────────┘
     │
     ↓
┌────────────────────────┐
│  Workspace Analyzer    │ Gathers context
│  (LocalWorkspace...)   │ - File list
└────┬───────────────────┘ - Git info
     │                      - Open files
     ↓
┌────────────────────────┐
│  Backend API           │ POST /api/method/ai_assistant.api.chat
│  (oropendola.ai)       │ {messages, context, mode}
└────┬───────────────────┘
     │
     ↓
┌────────────────────────┐
│  AI Model              │ DeepSeek/Claude/GPT-4
│  (Backend)             │ Processes request
└────┬───────────────────┘
     │
     ↓
┌────────────────────────┐
│  Response Parser       │ Extracts:
│  (ConversationTask.js) │ - Text response
└────┬───────────────────┘ - Tool calls
     │                      - TODOs
     ↓
┌────────────────────────┐
│  Tool Executor         │ Executes tool calls:
│  (ConversationTask.js) │ - create_file
└────┬───────────────────┘ - modify_file
     │                      - run_terminal_command
     ↓
┌────────────────────────┐
│  File Change Tracker   │ Tracks all changes
│  (file-change-tracker) │
└────┬───────────────────┘
     │
     ↓
┌────────────────────────┐
│  Sidebar Provider      │ Updates UI:
│  (sidebar-provider.js) │ - Show AI message
└────┬───────────────────┘ - Show file changes
     │                      - Update TODOs
     ↓
┌──────────┐
│   User   │ Sees response
└──────────┘
```

---

### Real-time Progress Updates Flow

```
Backend executes tool
    ↓
Backend emits Socket.IO event
    ↓
RealtimeManager receives event
    ↓
ConversationTask handles event
    ↓
Sidebar Provider updates UI
    ↓
User sees live progress
```

**Example**:
```
Backend: emit('ai_progress', {type: 'toolExecutionStart', tool_name: 'create_file'})
    ↓
UI: "Creating package.json..."
    ↓
Backend: emit('ai_progress', {type: 'toolExecutionComplete', success: true})
    ↓
UI: "✅ Created package.json"
```

---

## Key Features

### 1. **Inline Code Completions**

**File**: `src/autocomplete/autocomplete-provider.js`

```javascript
class AutocompleteProvider {
    async provideInlineCompletionItems(document, position) {
        // Get code context
        // Call backend API
        // Return completion suggestions
    }
}
```

**Trigger**: User types in editor
**Result**: Ghost text suggestion appears

---

### 2. **Code Actions (Quick Fixes)**

**File**: `src/providers/CodeActionProvider.js`

```javascript
class CodeActionProvider {
    provideCodeActions(document, range, context) {
        // Analyze diagnostics
        // Provide quick fix actions
        return actions;
    }
}
```

**Trigger**: User clicks lightbulb icon
**Result**: Shows "Fix with AI" option

---

### 3. **Diagnostics (Error Detection)**

**File**: `src/providers/DiagnosticsProvider.js`

```javascript
class DiagnosticsProvider {
    provideDiagnostics(document) {
        // Analyze code for issues
        // Return warnings/errors
    }
}
```

**Result**: Red squiggly lines under potential issues

---

### 4. **Diff Preview Manager**

**File**: `src/editor/DiffPreviewManager.js`

**Purpose**: Show side-by-side diff before applying changes

```javascript
class DiffPreviewManager {
    showDiff(originalContent, modifiedContent, filepath) {
        // Create virtual document
        // Open diff editor
        // Show Accept/Reject buttons
    }
}
```

**UI**:
```
┌────────────────┬────────────────┐
│   Original     │    Modified    │
├────────────────┼────────────────┤
│ const x = 1;   │ const x = 2;   │ ← Changed
│                │ const y = 3;   │ ← Added
├────────────────┴────────────────┤
│  [Accept]  [Reject]             │
└─────────────────────────────────┘
```

---

### 5. **Report Generation**

**Files**:
- `src/utils/task-summary-generator.js`
- `src/utils/report-name-generator.js`

**Purpose**: Generate markdown reports for complex tasks

**Triggers**:
- 3+ files modified
- 5+ TODOs
- 10+ messages
- 2+ errors
- User explicitly requests

**Output**:
```markdown
# Task Report: myapp_task_2025-10-23

## Summary
Created 5 files, completed 8/10 tasks

## Files Created
- package.json
- main.js
- index.html
...
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         VS Code Editor                          │
│                                                                 │
│  ┌────────────┐  ┌─────────────┐  ┌──────────────┐            │
│  │  Inline    │  │   Code      │  │  Diagnostics │            │
│  │ Completion │  │   Actions   │  │   Provider   │            │
│  └────────────┘  └─────────────┘  └──────────────┘            │
│         ↑               ↑                  ↑                    │
└─────────┼───────────────┼──────────────────┼────────────────────┘
          │               │                  │
          └───────────────┴──────────────────┘
                          │
          ┌───────────────┴───────────────┐
          │     Extension Host            │
          │     (Node.js Runtime)         │
          │                               │
          │  ┌─────────────────────────┐  │
          │  │   extension.js          │  │ ← Entry Point
          │  └───────────┬─────────────┘  │
          │              │                 │
          │  ┌───────────┴─────────────┐  │
          │  │  Sidebar Provider       │  │
          │  │  (sidebar-provider.js)  │  │
          │  └───────────┬─────────────┘  │
          │              │                 │
          │  ┌───────────┴─────────────┐  │
          │  │  ConversationTask       │  │
          │  │  (Task Orchestrator)    │  │
          │  └───────────┬─────────────┘  │
          │              │                 │
          │     ┌────────┴────────┐        │
          │     │                 │        │
          │  ┌──┴────┐      ┌────┴──┐     │
          │  │ URL   │      │ TODO  │     │
          │  │Analyzer      │Manager│     │
          │  └───────┘      └───────┘     │
          │                               │
          │  ┌─────────────────────────┐  │
          │  │  Realtime Manager       │  │
          │  │  (WebSocket Client)     │  │
          │  └───────────┬─────────────┘  │
          └──────────────┼─────────────────┘
                         │
          ┌──────────────┴─────────────────┐
          │                                │
          ↓ HTTP (axios)        ↓ WebSocket (socket.io)
          │                                │
┌─────────┴────────────────────────────────┴─────────┐
│              Backend Server                        │
│              (oropendola.ai)                       │
│                                                    │
│  ┌──────────────┐  ┌──────────────┐              │
│  │  Chat API    │  │  WebSocket   │              │
│  │  /api/chat   │  │  Server      │              │
│  └──────┬───────┘  └──────┬───────┘              │
│         │                  │                       │
│  ┌──────┴──────────────────┴───────┐              │
│  │    AI Model Router              │              │
│  │  (DeepSeek/Claude/GPT-4)        │              │
│  └─────────────────────────────────┘              │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## Communication Patterns

### 1. Request-Response (HTTP)

```javascript
// Frontend → Backend
const response = await axios.post(
    'https://oropendola.ai/api/method/ai_assistant.api.chat',
    {
        messages: [...],
        context: {...},
        mode: 'agent'
    }
);

// Backend → Frontend
{
    success: true,
    content: "AI response text",
    tool_calls: [{action: 'create_file', ...}],
    conversation_id: "uuid"
}
```

### 2. Real-time Events (WebSocket)

```javascript
// Backend → Frontend
socket.emit('ai_progress', {
    type: 'toolExecutionStart',
    tool_name: 'create_file',
    file_path: 'package.json'
});

// Frontend listens
socket.on('ai_progress', (data) => {
    // Update UI with progress
});
```

### 3. Extension ↔ Webview (postMessage)

```javascript
// Extension → Webview
webview.postMessage({
    type: 'addMessage',
    message: {role: 'assistant', content: 'Hello!'}
});

// Webview → Extension
vscode.postMessage({
    type: 'sendMessage',
    text: 'User message',
    attachments: []
});
```

---

## Framework Summary

| Component | Framework/Library | Purpose |
|-----------|------------------|---------|
| **Extension** | VS Code Extension API | Core framework |
| **UI** | HTML/CSS/Vanilla JS in Webview | Chat interface |
| **HTTP** | Axios | Backend communication |
| **WebSocket** | Socket.IO Client | Real-time updates |
| **Markdown** | Marked + Highlight.js | Format AI responses |
| **State** | Event-driven (EventEmitter) | Component communication |
| **Storage** | VS Code SecretStorage | Credentials |

---

## Entry Points & Initialization

### 1. Extension Activation

```javascript
// extension.js
exports.activate = async function(context) {
    // Called when VS Code starts or when extension is needed

    // Phase 1: Initialize core services
    const authManager = new AuthManager();
    const chatManager = new ChatManager();

    // Phase 2: Register providers
    const sidebarProvider = new OropendolaSidebarProvider(context);
    vscode.window.registerWebviewViewProvider('oropendola-sidebar', sidebarProvider);

    // Phase 3: Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.openChat', () => {...})
    );

    // Phase 4: Initialize enterprise features
    await initializeEnterpriseFeatures(context);
};
```

### 2. Sidebar Initialization

```javascript
// src/sidebar/sidebar-provider.js
class OropendolaSidebarProvider {
    resolveWebviewView(webviewView) {
        // Called when sidebar is opened

        // 1. Configure webview
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [...]
        };

        // 2. Generate HTML
        webviewView.webview.html = this._getHtmlForWebview();

        // 3. Set up message handlers
        webviewView.webview.onDidReceiveMessage(message => {
            this._handleMessage(message);
        });
    }
}
```

---

## Configuration

**File**: `package.json` → `contributes.configuration`

```json
{
  "oropendola.serverUrl": {
    "type": "string",
    "default": "https://oropendola.ai",
    "description": "Backend server URL"
  },
  "oropendola.github.token": {
    "type": "string",
    "description": "GitHub Personal Access Token"
  }
}
```

**Access in code**:
```javascript
const config = vscode.workspace.getConfiguration('oropendola');
const serverUrl = config.get('serverUrl');
const githubToken = config.get('github.token');
```

---

## Summary

**Oropendola VS Code Extension** is built with:

✅ **Pure VS Code Extension API** (no external frameworks like Electron/React)
✅ **Node.js** runtime in Extension Host
✅ **HTML/CSS/Vanilla JS** for chat UI (in webview)
✅ **Event-driven architecture** (EventEmitter pattern)
✅ **Axios** for HTTP communication
✅ **Socket.IO** for real-time updates
✅ **Modular structure** with clear separation of concerns

**Key Strength**: Native VS Code integration with direct access to editor APIs, file system, terminal, and workspace.

**No external frontend frameworks**: Everything is built on VS Code's native APIs and vanilla JavaScript for maximum performance and compatibility.
