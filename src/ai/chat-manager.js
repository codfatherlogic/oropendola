/* eslint-disable */
const vscode = require('vscode');
const path = require('path');

/**
 * ChatManager - Manages AI chat interface and conversations
 * Provides WebView-based chat panel with context awareness
 */
class ChatManager {
    constructor() {
        this.chatPanel = null;
        this.conversations = new Map();
        this.currentProvider = null;
        this.currentConversationId = null;
        this.context = {
            workspace: null,
            openFiles: [],
            recentChanges: [],
            analysisData: null
        };
    }

    /**
     * Set the AI provider to use for chat
     * @param {Object} provider - The AI provider instance
     */
    setProvider(provider) {
        this.currentProvider = provider;
    }

    /**
     * Initialize AI provider based on configuration
     */
    initializeProvider() {
        const config = vscode.workspace.getConfiguration('oropendola');
        const providerName = config.get('ai.provider', 'oropendola');
        
        try {
            this.currentProvider = this.createProvider(providerName);
        } catch (error) {
            // Silent fail - provider will be created on first use
            console.log(`AI provider will be initialized on first use: ${providerName}`);
        }
    }

    /**
     * Create AI provider instance
     * @param {string} providerName - Name of the AI provider
     * @returns {Object} Provider instance
     */
    createProvider(providerName) {
        const config = vscode.workspace.getConfiguration('oropendola');
        const apiKey = config.get('ai.apiKey');
        const model = config.get('ai.model');
        const customEndpoint = config.get('ai.customEndpoint');
        
        if (!apiKey && providerName !== 'local') {
            throw new Error(`API key not configured for ${providerName}`);
        }
        
        const providerConfig = {
            apiKey,
            model,
            endpoint: customEndpoint,
            temperature: config.get('chat.temperature', 0.7)
        };
        
        switch (providerName) {
            case 'openai':
                const OpenAIProvider = require('./providers/openai-provider');
                return new OpenAIProvider(providerConfig);
            case 'anthropic':
                const AnthropicProvider = require('./providers/anthropic-provider');
                return new AnthropicProvider(providerConfig);
            case 'local':
                const LocalProvider = require('./providers/local-provider');
                return new LocalProvider(providerConfig);
            case 'custom':
                const CustomProvider = require('./providers/custom-provider');
                return new CustomProvider(providerConfig);
            default:
                throw new Error(`Unsupported AI provider: ${providerName}`);
        }
    }

    /**
     * Open or reveal the chat panel
     */
    openChatPanel() {
        if (this.chatPanel) {
            this.chatPanel.reveal(vscode.ViewColumn.Beside);
            return;
        }

        this.chatPanel = vscode.window.createWebviewPanel(
            'oropendolaChat',
            'Oropendola AI Chat',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(__dirname, '../../media'))
                ]
            }
        );

        this.chatPanel.webview.html = this.getChatHtml();
        this.setupMessageHandling();
        
        // Handle panel disposal
        this.chatPanel.onDidDispose(() => {
            this.chatPanel = null;
        }, null);
        
        // Initialize provider if not already done
        if (!this.currentProvider) {
            this.initializeProvider();
        }
        
        // Create new conversation
        this.currentConversationId = this.createConversation();
    }

    /**
     * Get HTML content for chat WebView
     * @returns {string} HTML content
     */
    getChatHtml() {
        /* eslint-disable */
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
    <title>Oropendola AI Chat</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            height: 100vh;
            overflow: hidden;
        }
        
        .chat-container {
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .chat-header {
            padding: 12px 16px;
            background-color: var(--vscode-titleBar-activeBackground);
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .chat-header h2 {
            font-size: 14px;
            font-weight: 600;
            color: var(--vscode-titleBar-activeForeground);
        }
        
        .clear-button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 4px 12px;
            border-radius: 2px;
            cursor: pointer;
            font-size: 12px;
        }
        
        .clear-button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        .messages {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        
        .message {
            max-width: 85%;
            padding: 10px 14px;
            border-radius: 8px;
            line-height: 1.5;
            word-wrap: break-word;
        }
        
        .user-message {
            align-self: flex-end;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        
        .ai-message {
            align-self: flex-start;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
        }
        
        .system-message {
            align-self: center;
            background-color: var(--vscode-notifications-background);
            color: var(--vscode-notifications-foreground);
            font-size: 12px;
            font-style: italic;
            max-width: 90%;
            text-align: center;
        }
        
        .message-time {
            font-size: 10px;
            opacity: 0.7;
            margin-top: 4px;
        }
        
        .typing-indicator {
            align-self: flex-start;
            padding: 10px 14px;
            background-color: var(--vscode-input-background);
            border-radius: 8px;
            display: none;
        }
        
        .typing-indicator.active {
            display: block;
        }
        
        .typing-indicator span {
            display: inline-block;
            width: 6px;
            height: 6px;
            background-color: var(--vscode-foreground);
            border-radius: 50%;
            margin: 0 2px;
            animation: typing 1.4s infinite;
        }
        
        .typing-indicator span:nth-child(2) {
            animation-delay: 0.2s;
        }
        
        .typing-indicator span:nth-child(3) {
            animation-delay: 0.4s;
        }
        
        @keyframes typing {
            0%, 60%, 100% { opacity: 0.3; }
            30% { opacity: 1; }
        }
        
        .input-container {
            padding: 12px 16px;
            background-color: var(--vscode-panel-background);
            border-top: 1px solid var(--vscode-panel-border);
            display: flex;
            gap: 8px;
        }
        
        .input-field {
            flex: 1;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 8px 12px;
            border-radius: 4px;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            resize: none;
            min-height: 36px;
            max-height: 120px;
        }
        
        .input-field:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }
        
        .send-button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
            white-space: nowrap;
        }
        
        .send-button:hover:not(:disabled) {
            background: var(--vscode-button-hoverBackground);
        }
        
        .send-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .context-info {
            padding: 8px 16px;
            background-color: var(--vscode-editorWidget-background);
            border-top: 1px solid var(--vscode-panel-border);
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
        }
        
        code {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 2px 4px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
        }
        
        pre {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 8px;
            border-radius: 4px;
            overflow-x: auto;
            margin: 8px 0;
        }
        
        pre code {
            background: none;
            padding: 0;
        }
    </style>
</head>
<body>
    <div class="chat-container">
        <div class="chat-header">
            <h2>🐦 Oropendola AI Assistant</h2>
            <button class="clear-button" onclick="clearChat()">Clear Chat</button>
        </div>
        
        <div class="messages" id="messages">
            <div class="system-message">
                Welcome to Oropendola AI! I can help you understand your code, analyze repositories, and answer questions.
            </div>
        </div>
        
        <div class="typing-indicator" id="typingIndicator">
            <span></span><span></span><span></span>
        </div>
        
        <div class="context-info" id="contextInfo">
            Context: Workspace not loaded
        </div>
        
        <div class="input-container">
            <textarea 
                id="messageInput" 
                class="input-field" 
                placeholder="Ask about your code..."
                rows="1"
            ></textarea>
            <button class="send-button" onclick="sendMessage()" id="sendButton">Send</button>
        </div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        // Auto-resize textarea
        const messageInput = document.getElementById('messageInput');
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });
        
        // Send on Enter (Shift+Enter for newline)
        messageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        function sendMessage() {
            const input = document.getElementById('messageInput');
            const message = input.value.trim();
            const sendButton = document.getElementById('sendButton');
            
            if (message) {
                addMessage(message, 'user');
                vscode.postMessage({ type: 'sendMessage', message });
                input.value = '';
                input.style.height = 'auto';
                sendButton.disabled = true;
                showTypingIndicator();
            }
        }
        
        function addMessage(content, sender, time = null) {
            const messages = document.getElementById('messages');
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message ' + sender + '-message';
            
            // Simple markdown-like formatting
            content = content
                .replace(/\\\`([^\\\`]+)\\\`/g, '<code>$1</code>')
                .replace(/\\n/g, '<br>');
            
            messageDiv.innerHTML = content;
            
            if (time) {
                const timeDiv = document.createElement('div');
                timeDiv.className = 'message-time';
                timeDiv.textContent = time;
                messageDiv.appendChild(timeDiv);
            }
            
            messages.appendChild(messageDiv);
            messages.scrollTop = messages.scrollHeight;
        }
        
        function showTypingIndicator() {
            document.getElementById('typingIndicator').classList.add('active');
            const messages = document.getElementById('messages');
            messages.scrollTop = messages.scrollHeight;
        }
        
        function hideTypingIndicator() {
            document.getElementById('typingIndicator').classList.remove('active');
        }
        
        function clearChat() {
            const messages = document.getElementById('messages');
            messages.innerHTML = '<div class="system-message">Chat cleared. How can I help you?</div>';
            vscode.postMessage({ type: 'clearChat' });
        }
        
        function updateContextInfo(info) {
            document.getElementById('contextInfo').textContent = 'Context: ' + info;
        }
        
        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            const sendButton = document.getElementById('sendButton');
            
            switch (message.type) {
                case 'aiResponse':
                    hideTypingIndicator();
                    addMessage(message.content, 'ai', message.time);
                    sendButton.disabled = false;
                    break;
                    
                case 'error':
                    hideTypingIndicator();
                    addMessage('Error: ' + message.content, 'system');
                    sendButton.disabled = false;
                    break;
                    
                case 'contextUpdate':
                    updateContextInfo(message.info);
                    break;
                    
                case 'systemMessage':
                    addMessage(message.content, 'system');
                    break;
            }
        });
        
        // Initial focus
        messageInput.focus();
    </script>
</body>
</html>`;
        /* eslint-enable */
    }

    /**
     * Setup message handling between WebView and extension
     */
    setupMessageHandling() {
        this.chatPanel.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'sendMessage':
                    await this.handleUserMessage(message.message);
                    break;
                    
                case 'clearChat':
                    this.clearConversation();
                    break;
            }
        }, null);
    }

    /**
     * Handle user message and generate AI response
     * @param {string} userMessage - User's message
     */
    async handleUserMessage(userMessage) {
        if (!this.currentProvider) {
            this.sendErrorToChat('AI provider not initialized. Please check your settings.');
            return;
        }
        
        try {
            // Build context
            const context = await this.buildContext();
            
            // Add message to conversation
            this.addMessageToConversation(userMessage, 'user');
            
            // Get AI response
            const response = await this.currentProvider.chat(userMessage, context);
            
            // Add response to conversation
            this.addMessageToConversation(response, 'assistant');
            
            // Send response to WebView
            this.chatPanel.webview.postMessage({
                type: 'aiResponse',
                content: response,
                time: new Date().toLocaleTimeString()
            });
            
        } catch (error) {
            console.error('Chat error:', error);
            this.sendErrorToChat(error.message);
        }
    }

    /**
     * Build context from current workspace
     * @returns {Promise<Object>} Context object
     */
    async buildContext() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const context = {
            workspace: workspaceFolders ? workspaceFolders[0].name : null,
            openFiles: [],
            activeFile: null,
            selection: null,
            analysisData: this.context.analysisData
        };

        // Add active editor info
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            context.activeFile = {
                path: activeEditor.document.fileName,
                language: activeEditor.document.languageId,
                content: activeEditor.document.getText()
            };
            
            // Add selected text if any
            const selection = activeEditor.selection;
            if (!selection.isEmpty) {
                context.selection = activeEditor.document.getText(selection);
            }
        }

        // Add open files (limited to prevent context overflow)
        const openDocuments = vscode.workspace.textDocuments.slice(0, 5);
        for (const doc of openDocuments) {
            if (!doc.isUntitled && doc.languageId !== 'log' && doc.fileName !== context.activeFile?.path) {
                context.openFiles.push({
                    path: doc.fileName,
                    language: doc.languageId,
                    preview: doc.getText().substring(0, 500)
                });
            }
        }
        
        // Update context info in UI
        this.updateContextDisplay(context);
        
        return context;
    }

    /**
     * Update context display in chat UI
     * @param {Object} context - Context object
     */
    updateContextDisplay(context) {
        let info = [];
        if (context.workspace) info.push(context.workspace);
        if (context.activeFile) info.push(path.basename(context.activeFile.path));
        if (context.openFiles.length > 0) info.push(`${context.openFiles.length} files open`);
        if (context.analysisData) info.push('Repository analyzed');
        
        this.chatPanel?.webview.postMessage({
            type: 'contextUpdate',
            info: info.join(' • ') || 'No context'
        });
    }

    /**
     * Add analysis context from repository analyzer
     * @param {Object} analysis - Analysis data
     */
    addAnalysisContext(analysis) {
        this.context.analysisData = analysis;
        
        if (this.chatPanel) {
            this.chatPanel.webview.postMessage({
                type: 'systemMessage',
                content: 'Repository analysis added to context'
            });
            this.updateContextDisplay(this.context);
        }
    }

    /**
     * Create a new conversation
     * @returns {string} Conversation ID
     */
    createConversation() {
        const id = Date.now().toString();
        this.conversations.set(id, {
            id,
            messages: [],
            createdAt: new Date(),
            context: {}
        });
        return id;
    }

    /**
     * Add message to current conversation
     * @param {string} content - Message content
     * @param {string} role - Message role (user/assistant)
     */
    addMessageToConversation(content, role) {
        if (!this.currentConversationId) return;
        
        const conversation = this.conversations.get(this.currentConversationId);
        if (conversation) {
            conversation.messages.push({
                role,
                content,
                timestamp: new Date()
            });
            
            // Trim conversation history based on config
            const config = vscode.workspace.getConfiguration('oropendola');
            const maxHistory = config.get('chat.historySize', 50);
            
            if (conversation.messages.length > maxHistory) {
                conversation.messages = conversation.messages.slice(-maxHistory);
            }
        }
    }

    /**
     * Clear current conversation
     */
    clearConversation() {
        if (this.currentConversationId) {
            const conversation = this.conversations.get(this.currentConversationId);
            if (conversation) {
                conversation.messages = [];
            }
        }
    }

    /**
     * Send error message to chat
     * @param {string} errorMessage - Error message
     */
    sendErrorToChat(errorMessage) {
        if (this.chatPanel) {
            this.chatPanel.webview.postMessage({
                type: 'error',
                content: errorMessage
            });
        }
    }

    /**
     * Dispose chat manager resources
     */
    dispose() {
        if (this.chatPanel) {
            this.chatPanel.dispose();
        }
        this.conversations.clear();
    }
}

module.exports = ChatManager;
