# Oropendola AI Assistant - API Documentation

**Version:** 3.5.0+
**Last Updated:** 2025-10-26
**For:** Developers integrating with Oropendola

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Authentication](#authentication)
4. [Message Protocol](#message-protocol)
5. [Frontend to Extension Messages](#frontend-to-extension-messages)
6. [Extension to Frontend Messages](#extension-to-frontend-messages)
7. [Backend API Endpoints](#backend-api-endpoints)
8. [Backend Client Libraries](#backend-client-libraries)
9. [TypeScript Types](#typescript-types)
10. [Error Handling](#error-handling)
11. [Rate Limiting](#rate-limiting)
12. [Examples](#examples)

---

## Overview

Oropendola AI Assistant uses a three-tier architecture:

```
Frontend (React Webview) ←→ Extension (Node.js) ←→ Backend (Python/Frappe)
```

- **Frontend**: React app running in VS Code webview
- **Extension**: Node.js code with access to VS Code APIs
- **Backend**: Python/Frappe server at https://oropendola.ai

Communication uses:
- **Frontend ↔ Extension**: VS Code message passing (`postMessage`)
- **Extension ↔ Backend**: HTTP/HTTPS REST APIs with CSRF tokens

---

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    VS CODE EXTENSION                             │
│                                                                  │
│  ┌────────────────┐         ┌──────────────────────────────┐   │
│  │   Frontend     │ <────> │   Extension (sidebar-        │   │
│  │   (Webview)    │ Message │   provider.js)               │   │
│  │                │ Passing │                              │   │
│  │  - React UI    │         │  - Message Routing           │   │
│  │  - 7 Views     │         │  - Handler Methods           │   │
│  │  - User Input  │         │  - Backend Clients           │   │
│  └────────────────┘         └──────────────┬───────────────┘   │
│                                             │                    │
└─────────────────────────────────────────────┼────────────────────┘
                                              │ HTTPS
                                              │ REST API
                                              ▼
                                ┌──────────────────────────┐
                                │   Backend Server         │
                                │   (oropendola.ai)        │
                                │                          │
                                │  - AI Models             │
                                │  - Database              │
                                │  - Browser Sessions      │
                                │  - Vector Embeddings     │
                                └──────────────────────────┘
```

### Message Flow

1. User interacts with React UI (Frontend)
2. Frontend sends message via `vscode.postMessage()`
3. Extension receives in `webview.onDidReceiveMessage()`
4. Extension routes to appropriate handler
5. Handler calls backend client if needed
6. Backend client makes HTTP request to oropendola.ai
7. Response flows back through the chain
8. Extension sends result via `webview.postMessage()`
9. Frontend updates UI

---

## Authentication

### CSRF Token

All backend requests require a CSRF token for security.

**Getting CSRF Token:**

```javascript
const response = await fetch('https://oropendola.ai/api/method/ai_assistant.api.get_csrf_token', {
    method: 'GET',
    credentials: 'include'
});

const data = await response.json();
const csrfToken = data.message || data.csrf_token;
```

**Using CSRF Token:**

```javascript
const response = await fetch('https://oropendola.ai/api/method/ai_assistant.api.some_endpoint', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-Frappe-CSRF-Token': csrfToken
    },
    credentials: 'include',
    body: JSON.stringify({ /* data */ })
});
```

### Session Cookies

Authentication uses HTTP cookies set during login. Include `credentials: 'include'` in all fetch requests.

---

## Message Protocol

### Frontend to Extension

Messages sent from React webview to extension:

```typescript
interface WebviewMessage {
    type: string;
    [key: string]: any;
}
```

**Sending Message (Frontend):**

```typescript
import vscode from './vscode-api';

vscode.postMessage({
    type: 'searchMarketplace',
    query: 'python',
    category: 'Languages'
});
```

### Extension to Frontend

Messages sent from extension to React webview:

```typescript
if (this._view) {
    this._view.webview.postMessage({
        type: 'marketplaceSearchResults',
        extensions: [...],
        total: 42
    });
}
```

**Receiving Message (Frontend):**

```typescript
useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
        const message = event.data;
        switch (message.type) {
            case 'marketplaceSearchResults':
                setExtensions(message.extensions);
                break;
        }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
}, []);
```

---

## Frontend to Extension Messages

All message types the frontend can send to the extension.

### Terminal Messages

#### `getTerminalHistory`

Get terminal command history.

**Request:**
```typescript
vscode.postMessage({ type: 'getTerminalHistory' })
```

**Response:**
```typescript
{
    type: 'terminalHistory',
    history: Array<{
        command: string;
        timestamp: Date;
    }>
}
```

#### `getTerminalSuggestions`

Get AI command suggestions.

**Request:**
```typescript
vscode.postMessage({
    type: 'getTerminalSuggestions',
    prompt: 'install dependencies'
})
```

**Response:**
```typescript
{
    type: 'terminalSuggestions',
    suggestions: Array<{
        command: string;
        description: string;
        confidence: number; // 0.0 - 1.0
        explanation?: string;
    }>
}
```

#### `executeTerminalCommand`

Execute a command in the terminal.

**Request:**
```typescript
vscode.postMessage({
    type: 'executeTerminalCommand',
    command: 'npm install'
})
```

**Response:**
```typescript
{
    type: 'terminalCommandExecuted',
    command: string;
}
```

#### `explainTerminalCommand`

Get AI explanation of a command.

**Request:**
```typescript
vscode.postMessage({
    type: 'explainTerminalCommand',
    command: 'git rebase -i HEAD~3'
})
```

**Response:**
```typescript
{
    type: 'terminalCommandExplanation',
    command: string;
    explanation: string;
    parts?: Array<{ part: string; description: string }>;
    warnings?: string[];
}
```

#### `fixTerminalCommand`

Fix a failed command with AI.

**Request:**
```typescript
vscode.postMessage({
    type: 'fixTerminalCommand',
    command: 'npm i',
    error: 'command not found'
})
```

**Response:**
```typescript
{
    type: 'terminalCommandFixed',
    original: string;
    fixed: string;
    explanation: string;
    confidence: number;
    alternatives?: string[];
}
```

#### `analyzeTerminalOutput`

Analyze terminal output with AI.

**Request:**
```typescript
vscode.postMessage({
    type: 'analyzeTerminalOutput',
    output: 'Error: ENOENT: no such file or directory...'
})
```

**Response:**
```typescript
{
    type: 'terminalOutputAnalysis',
    analysis: {
        summary: string;
        errors: string[];
        warnings: string[];
        suggestions: string[];
        severity: 'info' | 'warning' | 'error';
        next_steps: string[];
    }
}
```

### Browser Messages

#### `getBrowserSessions`

List all browser sessions.

**Request:**
```typescript
vscode.postMessage({ type: 'getBrowserSessions' })
```

**Response:**
```typescript
{
    type: 'browserSessions',
    sessions: Array<{
        id: string;
        sessionName: string;
        status: 'active' | 'idle' | 'closed';
        currentUrl: string;
        pageTitle: string;
        createdAt: Date;
        lastActivity: Date;
    }>
}
```

#### `createBrowserSession`

Create a new browser session.

**Request:**
```typescript
vscode.postMessage({
    type: 'createBrowserSession',
    sessionName: 'My Session'
})
```

**Response:**
```typescript
{
    type: 'browserSessionCreated',
    success: boolean;
    sessionId: string;
    message: string;
}
```

#### `closeBrowserSession`

Close a browser session.

**Request:**
```typescript
vscode.postMessage({
    type: 'closeBrowserSession',
    sessionId: 'session-123'
})
```

**Response:**
```typescript
{
    type: 'browserSessionClosed',
    success: boolean;
    sessionId: string;
    message: string;
}
```

#### `browserNavigate`

Navigate to a URL.

**Request:**
```typescript
vscode.postMessage({
    type: 'browserNavigate',
    sessionId: 'session-123',
    url: 'https://example.com'
})
```

**Response:**
```typescript
{
    type: 'browserNavigated',
    success: boolean;
    url: string;
    title: string;
    message: string;
}
```

#### `browserExecuteAction`

Execute AI-powered browser action.

**Request:**
```typescript
vscode.postMessage({
    type: 'browserExecuteAction',
    sessionId: 'session-123',
    prompt: 'Click the login button and type username in email field'
})
```

**Response:**
```typescript
{
    type: 'browserActionExecuted',
    success: boolean;
    action: string;
    result: string;
    actions: string[]; // ['click', 'type']
    results: Array<{ action: string; success: boolean }>;
    interpretation: string;
}
```

#### `browserScreenshot`

Take a screenshot.

**Request:**
```typescript
vscode.postMessage({
    type: 'browserScreenshot',
    sessionId: 'session-123'
})
```

**Response:**
```typescript
{
    type: 'browserScreenshot',
    success: boolean;
    fileId: string;
    filePath: string;
    message: string;
}
```

#### `browserClick`

Click an element.

**Request:**
```typescript
vscode.postMessage({
    type: 'browserClick',
    sessionId: 'session-123',
    selector: '#login-button'
})
```

**Response:**
```typescript
{
    type: 'browserClicked',
    success: boolean;
    message: string;
}
```

#### `browserType`

Type text in an element.

**Request:**
```typescript
vscode.postMessage({
    type: 'browserType',
    sessionId: 'session-123',
    selector: 'input[name="email"]',
    text: 'user@example.com'
})
```

**Response:**
```typescript
{
    type: 'browserTyped',
    success: boolean;
    message: string;
}
```

### Marketplace Messages

#### `searchMarketplace`

Search VS Code extensions.

**Request:**
```typescript
vscode.postMessage({
    type: 'searchMarketplace',
    query: 'python',
    category: 'Languages'
})
```

**Response:**
```typescript
{
    type: 'marketplaceSearchResults',
    extensions: Array<MarketplaceExtension>;
    total: number;
}
```

#### `getInstalledExtensions`

Get list of installed extensions.

**Request:**
```typescript
vscode.postMessage({ type: 'getInstalledExtensions' })
```

**Response:**
```typescript
{
    type: 'installedExtensions',
    extensions: Array<{
        id: string;
        name: string;
        version: string;
        enabled: boolean;
    }>
}
```

#### `installExtension`

Install an extension.

**Request:**
```typescript
vscode.postMessage({
    type: 'installExtension',
    extensionId: 'ms-python.python'
})
```

**Response:**
```typescript
{
    type: 'extensionInstalled',
    extensionId: string;
    success: boolean;
}
```

#### `uninstallExtension`

Uninstall an extension.

**Request:**
```typescript
vscode.postMessage({
    type: 'uninstallExtension',
    extensionId: 'ms-python.python'
})
```

**Response:**
```typescript
{
    type: 'extensionUninstalled',
    extensionId: string;
    success: boolean;
}
```

#### `getExtensionDetails`

Get detailed extension information.

**Request:**
```typescript
vscode.postMessage({
    type: 'getExtensionDetails',
    extensionId: 'ms-python.python'
})
```

**Response:**
```typescript
{
    type: 'extensionDetails',
    extension: MarketplaceExtension;
}
```

### Vector Database Messages

#### `vectorSearch`

Semantic code search.

**Request:**
```typescript
vscode.postMessage({
    type: 'vectorSearch',
    query: 'authentication logic',
    limit: 50
})
```

**Response:**
```typescript
{
    type: 'vectorSearchResults',
    results: Array<{
        id: string;
        content: string;
        similarity: number; // 0.0 - 1.0
        filePath: string;
        lineNumber: number;
        metadata: object;
    }>
}
```

#### `indexWorkspace`

Index entire workspace.

**Request:**
```typescript
vscode.postMessage({ type: 'indexWorkspace' })
```

**Progress Response:**
```typescript
{
    type: 'indexingProgress',
    indexed: number;
    total: number;
}
```

**Completion Response:**
```typescript
{
    type: 'workspaceIndexed',
    success: boolean;
    filesIndexed: number;
}
```

#### `getIndexedFiles`

Get list of indexed files.

**Request:**
```typescript
vscode.postMessage({ type: 'getIndexedFiles' })
```

**Response:**
```typescript
{
    type: 'indexedFiles',
    files: Array<{
        path: string;
        indexed_at: Date;
        line_count: number;
    }>
}
```

#### `getIndexStats`

Get indexing statistics.

**Request:**
```typescript
vscode.postMessage({ type: 'getIndexStats' })
```

**Response:**
```typescript
{
    type: 'indexStats',
    stats: {
        total: number;
        indexed: number;
        pending: number;
    }
}
```

#### `deleteIndex`

Delete vector database index.

**Request:**
```typescript
vscode.postMessage({ type: 'deleteIndex' })
```

**Response:**
```typescript
{
    type: 'indexDeleted',
    success: boolean;
}
```

### Settings Messages

#### `changeLanguage`

Change UI language.

**Request:**
```typescript
vscode.postMessage({
    type: 'changeLanguage',
    language: 'es' // en, es, fr, de, ar
})
```

**Response:**
```typescript
{
    type: 'languageChanged',
    language: string;
    success: boolean;
}
```

#### `updateSettings`

Update app settings.

**Request:**
```typescript
vscode.postMessage({
    type: 'updateSettings',
    settings: {
        theme: 'dark',
        autoSave: true,
        notifications: false
    }
})
```

**Response:**
```typescript
{
    type: 'settingsUpdated',
    success: boolean;
}
```

#### `getSettings`

Get current settings.

**Request:**
```typescript
vscode.postMessage({ type: 'getSettings' })
```

**Response:**
```typescript
{
    type: 'settings',
    settings: {
        language: string;
        theme: string;
        autoSave: boolean;
        notifications: boolean;
        telemetry: boolean;
    }
}
```

---

## Extension to Frontend Messages

See "Frontend to Extension Messages" response sections above.

---

## Backend API Endpoints

All endpoints are at `https://oropendola.ai/api/method/ai_assistant.api.*`

### Terminal AI Endpoints

#### POST `/terminal_suggest_command`

Generate command suggestions.

**Request Body:**
```json
{
    "prompt": "install dependencies",
    "context": {
        "recent_output": ["..."],
        "last_command": "npm start",
        "platform": "darwin",
        "cwd": "/path/to/project"
    }
}
```

**Response:**
```json
{
    "success": true,
    "message": {
        "suggestions": [
            {
                "command": "npm install",
                "description": "Install dependencies from package.json",
                "confidence": 0.95,
                "explanation": "..."
            }
        ]
    }
}
```

#### POST `/terminal_explain_command`

Explain a command.

**Request Body:**
```json
{
    "command": "git rebase -i HEAD~3",
    "platform": "darwin"
}
```

**Response:**
```json
{
    "success": true,
    "message": {
        "explanation": "Interactive rebase of last 3 commits",
        "parts": [
            {
                "part": "git rebase",
                "description": "Reapply commits on top of another base"
            },
            {
                "part": "-i",
                "description": "Interactive mode"
            },
            {
                "part": "HEAD~3",
                "description": "Last 3 commits from current HEAD"
            }
        ],
        "warnings": [
            "Rewrites history - don't use on shared branches"
        ]
    }
}
```

#### POST `/terminal_fix_command`

Fix a failed command.

**Request Body:**
```json
{
    "command": "npm i -g typescript",
    "error_message": "EACCES: permission denied",
    "platform": "darwin",
    "context": {
        "recent_output": ["..."],
        "cwd": "/path"
    }
}
```

**Response:**
```json
{
    "success": true,
    "message": {
        "fixed_command": "sudo npm install -g typescript",
        "explanation": "Needs elevated permissions for global install",
        "confidence": 0.9,
        "alternatives": [
            "npm install -g typescript --prefix ~/.npm-global"
        ]
    }
}
```

#### POST `/terminal_analyze_output`

Analyze terminal output.

**Request Body:**
```json
{
    "output": "Error: Cannot find module 'express'...",
    "platform": "darwin"
}
```

**Response:**
```json
{
    "success": true,
    "message": {
        "summary": "Missing dependency 'express'",
        "errors": [
            "Module 'express' not found"
        ],
        "warnings": [],
        "suggestions": [
            "Run: npm install express",
            "Add express to package.json dependencies"
        ],
        "severity": "error",
        "next_steps": [
            "Install missing dependency",
            "Verify package.json"
        ]
    }
}
```

### Browser AI Endpoints

#### POST `/browser_execute_ai_action`

Execute AI-powered browser action.

**Request Body:**
```json
{
    "session_id": "session-123",
    "prompt": "Click login button and enter email",
    "context": {
        "current_url": "https://example.com",
        "current_title": "Login Page"
    }
}
```

**Response:**
```json
{
    "success": true,
    "message": {
        "description": "Clicked login button and entered email",
        "actions": [
            {
                "type": "click",
                "selector": "#login-btn"
            },
            {
                "type": "type",
                "selector": "input[name='email']",
                "text": "user@example.com"
            }
        ],
        "interpretation": "Login flow initiated",
        "stop_on_error": true
    }
}
```

### Browser Session Endpoints

See `src/browser/BrowserAutomationClient.ts` for complete list:

- `POST /browser_create_session`
- `POST /browser_close_session`
- `POST /browser_list_sessions`
- `POST /browser_get_session_info`
- `POST /browser_navigate`
- `POST /browser_click`
- `POST /browser_type`
- `POST /browser_select`
- `POST /browser_scroll`
- `POST /browser_screenshot`
- `POST /browser_pdf`
- `POST /browser_get_content`
- `POST /browser_evaluate`
- `POST /browser_get_url`
- `POST /browser_go_back`
- `POST /browser_go_forward`
- `POST /browser_reload`
- `POST /browser_get_file`

### Vector Database Endpoints

#### POST `/vector_search`

Semantic search.

**Request Body:**
```json
{
    "query": "authentication logic",
    "limit": 50,
    "type": "code",
    "workspace_id": "workspace-123",
    "user_id": "user-456",
    "min_similarity": 0.5
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "results": [
            {
                "id": "vec-1",
                "content": "const auth = ...",
                "score": 0.92,
                "metadata": {
                    "file_path": "src/auth.js",
                    "line_number": 42
                },
                "type": "code",
                "timestamp": "2025-10-26T..."
            }
        ]
    }
}
```

#### POST `/vector_index`

Index content.

**Request Body:**
```json
{
    "content": "const auth = ...",
    "file_path": "src/auth.js",
    "metadata": {
        "language": "javascript"
    },
    "type": "code",
    "workspace_id": "workspace-123",
    "user_id": "user-456"
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "vector_id": "vec-123"
    }
}
```

---

## Backend Client Libraries

### BrowserAutomationClient

Located: `src/browser/BrowserAutomationClient.ts`

```typescript
import { BrowserAutomationClient } from './BrowserAutomationClient';

const client = BrowserAutomationClient.getInstance();

// Create session
const session = await client.createSession({
    sessionName: 'My Session',
    headless: true
});

// Navigate
await client.navigate(session.sessionId, 'https://example.com');

// Click
await client.click(session.sessionId, '#button');

// Type
await client.type(session.sessionId, 'input', 'text');

// Screenshot
const screenshot = await client.screenshot(session.sessionId);

// Close
await client.closeSession(session.sessionId);
```

### MarketplaceClient

Located: `src/marketplace/MarketplaceClient.ts`

```typescript
import { MarketplaceClient } from './MarketplaceClient';

const client = MarketplaceClient.getInstance();

// Search
const results = await client.searchExtensions({
    query: 'python',
    category: 'Languages',
    pageSize: 20
});

// Get extension
const ext = await client.getExtension('ms-python.python');

// Get featured
const featured = await client.getFeatured('AI');
```

### VectorDBClient

Located: `src/vector/VectorDBClient.ts`

```typescript
import { VectorDBClient } from './VectorDBClient';

const client = new VectorDBClient();

// Index content
await client.indexContent('const auth = ...', {
    filePath: 'src/auth.js',
    type: 'code'
});

// Search
const results = await client.search('authentication logic', {
    limit: 50,
    minSimilarity: 0.5
});

// Batch index
await client.batchIndex([
    { content: '...', options: {...} }
]);
```

### I18nManager

Located: `src/i18n/I18nManager.ts`

```typescript
import { I18nManager } from './I18nManager';

const manager = new I18nManager();

// Initialize
await manager.initialize('en');

// Change language
await manager.changeLanguage('es');

// Get translation
const text = manager.t('key');

// Get available languages
const languages = manager.getAvailableLanguages();
```

---

## TypeScript Types

Key types used throughout the extension.

### MarketplaceExtension

```typescript
interface MarketplaceExtension {
    id: string;
    name: string;
    displayName: string;
    publisher: string;
    version: string;
    description: string;
    icon?: string;
    installs: number;
    rating: number;
    ratingCount: number;
    categories: string[];
    tags: string[];
    repositoryUrl?: string;
    homepageUrl?: string;
    license?: string;
    isInstalled: boolean;
}
```

### BrowserSession

```typescript
interface BrowserSession {
    id: string;
    sessionName: string;
    status: 'active' | 'idle' | 'closed';
    currentUrl: string;
    pageTitle: string;
    createdAt: Date;
    lastActivity: Date;
    viewportWidth: number;
    viewportHeight: number;
}
```

### VectorSearchResult

```typescript
interface VectorSearchResult {
    id: string;
    content: string;
    similarity: number; // 0.0 - 1.0
    metadata: {
        file_path?: string;
        line_number?: number;
        [key: string]: any;
    };
    type: 'code' | 'documentation' | 'conversation';
    timestamp: Date;
    filePath?: string;
    lineNumber?: number;
}
```

### ViewType

```typescript
type ViewType = 'chat' | 'history' | 'terminal' | 'browser' | 'marketplace' | 'vector' | 'settings';
```

---

## Error Handling

### Frontend Error Handling

```typescript
try {
    vscode.postMessage({ type: 'someAction' });
} catch (error) {
    console.error('Failed to send message:', error);
    // Show error to user
}
```

### Extension Error Handling

```typescript
async _handleSomeAction() {
    try {
        // Handler logic
        const result = await someOperation();

        if (this._view) {
            this._view.webview.postMessage({
                type: 'success',
                data: result
            });
        }
    } catch (error) {
        console.error('❌ Error in handler:', error);

        if (this._view) {
            this._view.webview.postMessage({
                type: 'error',
                error: error.message
            });
        }
    }
}
```

### Backend Error Responses

```json
{
    "success": false,
    "message": "Error description",
    "exc_type": "ValidationError",
    "exc": "Detailed stack trace"
}
```

---

## Rate Limiting

Backend APIs implement rate limiting:

- **Free tier**: 100 requests/hour
- **Pro tier**: 1000 requests/hour
- **Enterprise**: Custom limits

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1635724800
```

**429 Response:**
```json
{
    "success": false,
    "message": "Rate limit exceeded. Try again in 15 minutes."
}
```

---

## Examples

### Example 1: Custom Message Handler

```javascript
// In sidebar-provider.js

case 'myCustomAction':
    await this._handleMyCustomAction(message.data);
    break;

async _handleMyCustomAction(data) {
    try {
        // Your logic here
        const result = await processData(data);

        if (this._view) {
            this._view.webview.postMessage({
                type: 'myCustomActionResult',
                result
            });
        }
    } catch (error) {
        console.error('Error:', error);
    }
}
```

### Example 2: Frontend Component with Message

```typescript
// In React component

const MyComponent = () => {
    const [result, setResult] = useState(null);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data.type === 'myCustomActionResult') {
                setResult(event.data.result);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const triggerAction = () => {
        vscode.postMessage({
            type: 'myCustomAction',
            data: { foo: 'bar' }
        });
    };

    return (
        <button onClick={triggerAction}>
            Trigger Action
        </button>
    );
};
```

### Example 3: Backend API Call

```typescript
// Custom backend client

class MyCustomClient {
    async callApi(params) {
        const response = await fetch(
            'https://oropendola.ai/api/method/ai_assistant.api.my_endpoint',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Frappe-CSRF-Token': await this.getCsrfToken()
                },
                credentials: 'include',
                body: JSON.stringify(params)
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        return data.message || data;
    }

    private async getCsrfToken(): Promise<string> {
        // Implementation...
    }
}
```

---

## Conclusion

This API documentation provides all the information needed to:

- Integrate with Oropendola AI Assistant
- Extend functionality with custom features
- Build new views or components
- Connect to backend services

**Resources:**
- Source code: https://github.com/anthropics/oropendola
- User Guide: USER_GUIDE.md
- Developer Setup: DEVELOPER_SETUP.md
- Backend API: https://oropendola.ai/api/docs

**Support:**
- Email: dev@oropendola.ai
- Discord: https://discord.gg/oropendola-dev
- GitHub Issues: https://github.com/anthropics/oropendola/issues

---

*Oropendola AI Assistant - API Documentation v3.5.0+*
