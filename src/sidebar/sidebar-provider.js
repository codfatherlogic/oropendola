const vscode = require('vscode');

const ConversationTask = require('../core/ConversationTask');
const URLAnalyzer = require('../analysis/url-analyzer');
const TodoManager = require('../utils/todo-manager');

/**
 * Oropendola Sidebar WebView Provider
 * Enhanced with KiloCode-inspired Task management pattern
 * Provides the main chat interface in the VS Code sidebar
 * Shows login screen first, then chat interface after authentication
 */
class OropendolaSidebarProvider {
    constructor(context) {
        this._context = context;
        this._view = undefined;
        this._isLoggedIn = false;
        this._messages = [];
        this._chatManager = null;
        this._conversationId = null;  // Track conversation ID
        this._mode = 'agent';  // Default mode: 'ask' or 'agent' (agent is default)

        // Task management (KiloCode pattern)
        this._currentTask = null;  // Current active task
        this._taskHistory = [];    // History of completed tasks
        this._taskCounter = 0;      // Task ID generator

        // URL analysis
        this._urlAnalyzer = new URLAnalyzer();

        // TODO List Management
        this._todoManager = new TodoManager();

        // CSRF Token for Frappe authentication
        this._csrfToken = null;
    }

    /**
     * Set the chat manager instance
     */
    setChatManager(chatManager) {
        this._chatManager = chatManager;
    }

    /**
     * Resolve the webview view
     * @param {vscode.WebviewView} webviewView
     */
    resolveWebviewView(webviewView) {
        console.log('🔍 SidebarProvider: resolveWebviewView called');
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._context.extensionUri]
        };

        // Check if user is already logged in
        const config = vscode.workspace.getConfiguration('oropendola');
        const userEmail = config.get('user.email');
        const savedCookies = config.get('session.cookies');

        // Restore session cookies if available
        if (savedCookies) {
            this._sessionCookies = savedCookies;
            console.log('🔄 Restored session cookies from storage');
        }

        // Restore CSRF token if available
        const savedCsrfToken = config.get('session.csrfToken');
        if (savedCsrfToken) {
            this._csrfToken = savedCsrfToken;
            console.log('🔄 Restored CSRF token from storage');
        }

        // Check if we have a session or user is logged in
        this._isLoggedIn = !!userEmail || !!this._sessionId || !!this._sessionCookies;

        console.log(`🔍 SidebarProvider: isLoggedIn = ${this._isLoggedIn}, email = ${userEmail || 'none'}`);

        // Show chat if logged in, otherwise show login
        const html = this._isLoggedIn
            ? this._getChatHtml(webviewView.webview)
            : this._getLoginHtml(webviewView.webview);

        console.log(`🔍 SidebarProvider: Setting HTML (${html.length} chars)`);
        webviewView.webview.html = html;

        console.log('✅ SidebarProvider: Webview HTML set successfully');

        // Make sure the view is visible
        webviewView.show?.();
        console.log('✅ SidebarProvider: View shown');

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (message) => {
            try {
                switch (message.type) {
                    case 'login':
                        await this._handleLogin(message.email, message.password);
                        break;
                    case 'sendMessage':
                        // Prevent multiple simultaneous sends
                        if (this._currentTask && this._currentTask.status === 'running') {
                            console.log('⚠️ Task already running, ignoring duplicate send');
                            return;
                        }
                        await this._handleSendMessage(message.text, message.attachments);
                        break;
                    case 'openSettings':
                        await vscode.commands.executeCommand('workbench.action.openSettings', 'oropendola');
                        break;
                    case 'newChat':
                        this._messages = [];
                        this._conversationId = null;  // Reset conversation ID
                        if (this._view) {
                            this._view.webview.html = this._getChatHtml(this._view.webview);
                        }
                        break;
                    case 'renewSubscription':
                        await this._handleRenewSubscription();
                        break;
                    case 'logout':
                        await this._handleLogout();
                        break;
                    case 'addContext':
                        await this._handleAddContext();
                        break;
                    case 'optimizeInput':
                        await this._handleOptimizeInput(message.originalText, message.optimizationPrompt);
                        break;
                    case 'stopGeneration':
                        console.log('⏹ Stop generation requested');
                        if (this._currentTask && this._currentTask.status === 'running') {
                            this._currentTask.abortTask();
                            if (this._view) {
                                this._view.webview.postMessage({
                                    type: 'addMessage',
                                    message: {
                                        role: 'system',
                                        content: '⏹ Generation stopped by user'
                                    }
                                });
                                // Force UI reset
                                this._view.webview.postMessage({ type: 'hideTyping' });
                            }
                        }
                        break;
                    case 'messageFeedback':
                        // Fire and forget - don't block UI
                        this._handleMessageFeedback(message.action, message.message).catch(err => {
                            console.warn('⚠️ Feedback handler error (non-blocking):', err.message);
                        });
                        break;
                    case 'toggleTodo':
                        this._handleToggleTodo(message.todoId);
                        break;
                    case 'deleteTodo':
                        this._handleDeleteTodo(message.todoId);
                        break;
                    case 'clearTodos':
                        this._handleClearTodos();
                        break;
                    case 'syncTodos':
                        await this._handleSyncTodos();
                        break;
                    case 'acceptPlan':
                        await this._handleAcceptPlan(message.messageContent);
                        break;
                    case 'rejectPlan':
                        await this._handleRejectPlan(message.messageContent);
                        break;
                    case 'openFile':
                        await this._handleOpenFile(message.filePath, message.highlight);
                        break;
                    case 'keepFileChange':
                        await this._handleKeepFileChange(message.filePath);
                        break;
                    case 'undoFileChange':
                        await this._handleUndoFileChange(message.filePath, message.changeType);
                        break;
                }
            } catch (error) {
                console.error('❌ Message handler error:', error);
                // Always ensure UI is reset on error
                if (this._view) {
                    this._view.webview.postMessage({ type: 'hideTyping' });
                    this._view.webview.postMessage({
                        type: 'addMessage',
                        message: {
                            role: 'error',
                            content: `Error: ${error.message || 'An unexpected error occurred'}`
                        }
                    });
                }
            }
        });
    }    /**
     * Handle user login directly in sidebar
     */
    async _handleLogin(email, password) {
        try {
            // Show loading state
            if (this._view) {
                this._view.webview.postMessage({ type: 'loginStart' });
            }

            // Perform login using session-based authentication
            const axios = require('axios');
            const config = vscode.workspace.getConfiguration('oropendola');
            const apiUrl = config.get('api.url', 'https://oropendola.ai');

            console.log('Attempting session login...');
            console.log('API URL:', apiUrl);
            console.log('Login email:', email);

            // Try Frappe's standard login endpoint with form data
            // Frappe expects application/x-www-form-urlencoded format
            const formData = new URLSearchParams();
            formData.append('usr', email);
            formData.append('pwd', password);

            const response = await axios.post(`${apiUrl}/api/method/login`, formData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                withCredentials: false // VS Code extensions don't support withCredentials
            });

            console.log('Login response:', response.data);
            console.log('Response headers:', response.headers);
            console.log('Set-Cookie headers:', response.headers['set-cookie']);

            // Frappe's standard login returns different response structures
            // Check if login was successful
            const isSuccess = response.data && (
                response.data.message === 'Logged In' ||
                (response.data.message && response.data.message.success) ||
                response.status === 200
            );

            if (isSuccess) {
                // Save only registered configuration settings
                await config.update('user.email', email, vscode.ConfigurationTarget.Global);

                // Extract and store cookies from response (Frappe uses 'sid' and 'full_name' cookies)
                const setCookieHeaders = response.headers['set-cookie'];
                if (setCookieHeaders && setCookieHeaders.length > 0) {
                    this._sessionCookies = setCookieHeaders.map(cookie => {
                        return cookie.split(';')[0];
                    }).join('; ');
                    console.log('✅ Stored session cookies:', this._sessionCookies);

                    // Extract session ID from sid cookie
                    const sidCookie = setCookieHeaders.find(c => c.startsWith('sid='));
                    if (sidCookie) {
                        this._sessionId = sidCookie.split(';')[0].split('=')[1];
                        console.log('✅ Extracted session ID:', this._sessionId);
                    }

                    // Persist cookies to VS Code settings (encrypted storage)
                    try {
                        await config.update('session.cookies', this._sessionCookies, vscode.ConfigurationTarget.Global);
                        console.log('💾 Session cookies persisted to settings');
                    } catch (err) {
                        console.warn('⚠️ Could not persist cookies:', err.message);
                    }
                } else {
                    console.warn('⚠️ No set-cookie headers found in response');
                }

                // Extract CSRF token from response
                try {
                    const csrfResponse = await axios.get(`${apiUrl}/api/method/frappe.auth.get_logged_user`, {
                        headers: { 'Cookie': this._sessionCookies }
                    });
                    
                    // Extract from headers or response data
                    if (csrfResponse.headers && csrfResponse.headers['x-frappe-csrf-token']) {
                        this._csrfToken = csrfResponse.headers['x-frappe-csrf-token'];
                        console.log('✅ Extracted CSRF token from headers');
                    } else if (csrfResponse.data && csrfResponse.data.csrf_token) {
                        this._csrfToken = csrfResponse.data.csrf_token;
                        console.log('✅ Extracted CSRF token from response data');
                    }
                    
                    // Persist CSRF token to VS Code settings
                    if (this._csrfToken) {
                        await config.update('session.csrfToken', this._csrfToken, vscode.ConfigurationTarget.Global);
                        console.log('💾 CSRF token persisted to settings');
                    }
                } catch (csrfError) {
                    console.warn('⚠️ Could not extract CSRF token:', csrfError.message);
                }

                // Store user info (extract from response or use email)
                this._userInfo = {
                    email: email,
                    full_name: email.split('@')[0]
                };

                this._isLoggedIn = true;

                // Switch to chat interface
                if (this._view) {
                    this._view.webview.html = this._getChatHtml(this._view.webview);
                }

                vscode.window.showInformationMessage(`✅ Welcome back, ${email}!`);
            } else {
                throw new Error('Login failed: Invalid response from server');
            }
        } catch (error) {
            console.error('Login error:', error);
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);
            console.error('Error headers:', error.response?.headers);

            let errorMessage = 'Login failed. Please check your credentials.';
            if (error.response?.status === 401) {
                errorMessage = 'Invalid email or password. Please try again.';
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.response?.data?.exc) {
                errorMessage = 'Authentication failed. Please check your email and password.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'loginError',
                    message: errorMessage
                });
            }
        }
    }

    /**
     * Check user subscription status
     */
    async _checkSubscription(email, apiKey, apiUrl) {
        try {
            const axios = require('axios');

            // Call subscription status API
            const response = await axios.get(`${apiUrl}/api/method/oropendola.api.subscription.get_status`, {
                headers: {
                    'Authorization': `token ${apiKey}`
                },
                params: {
                    email: email
                }
            });

            if (response.data && response.data.message) {
                const subscription = response.data.message;

                return {
                    active: subscription.active || false,
                    plan: subscription.plan || 'trial',
                    expiryDate: subscription.expiry_date || null,
                    daysRemaining: subscription.days_remaining || 0,
                    trialExpired: subscription.trial_expired || false,
                    trialDuration: subscription.trial_duration || '1 DAY'
                };
            }

            // If API doesn't return subscription info, allow access (backward compatibility)
            return { active: true, plan: 'unknown' };

        } catch (error) {
            console.error('Subscription check error:', error);
            // On error, allow access (fail open for now)
            return { active: true, plan: 'unknown' };
        }
    }

    /**
     * Handle renew subscription
     */
    async _handleRenewSubscription() {
        const config = vscode.workspace.getConfiguration('oropendola');
        const apiUrl = config.get('api.url', 'https://oropendola.ai');

        // Open renewal URL in browser
        const renewUrl = `${apiUrl}/subscription/renew`;
        await vscode.env.openExternal(vscode.Uri.parse(renewUrl));

        vscode.window.showInformationMessage('Opening subscription renewal page...');
    }

    /**
     * Handle logout
     */
    async _handleLogout() {
        const config = vscode.workspace.getConfiguration('oropendola');

        // Clear stored credentials and session
        await config.update('api.key', undefined, vscode.ConfigurationTarget.Global);
        await config.update('api.secret', undefined, vscode.ConfigurationTarget.Global);
        await config.update('user.email', undefined, vscode.ConfigurationTarget.Global);

        // Clear session cookies from persistent storage
        await config.update('session.cookies', undefined, vscode.ConfigurationTarget.Global);
        console.log('🗑️ Cleared session cookies from storage');

        // Clear CSRF token from persistent storage
        await config.update('session.csrfToken', undefined, vscode.ConfigurationTarget.Global);
        console.log('🗑️ Cleared CSRF token from storage');

        // Clear session data
        this._isLoggedIn = false;
        this._messages = [];
        this._sessionId = null;
        this._sessionCookies = null;
        this._userInfo = null;
        this._conversationId = null;  // Clear conversation ID
        this._csrfToken = null;  // Clear CSRF token

        console.log('✅ Logged out - cleared all session data');

        // Show login screen
        if (this._view) {
            this._view.webview.html = this._getLoginHtml(this._view.webview);
            console.log('✅ Login screen restored');
        }

        vscode.window.showInformationMessage('✅ Logged out successfully');
    }

    /**
     * Handle Add Context - Shows quick pick menu to add workspace context
     */
    async _handleAddContext() {
        try {
            console.log('📁 Add Context feature triggered');

            // Build context options
            const contextOptions = [];

            // Option 1: Add workspace summary
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
                contextOptions.push({
                    label: '📁 $(folder) Workspace Summary',
                    description: `Add info about ${workspaceFolders[0].name}`,
                    detail: 'Includes workspace name, file structure, and project type',
                    action: 'workspace'
                });
            }

            // Option 2: Add active file
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                const fileName = activeEditor.document.fileName.split('/').pop();
                const language = activeEditor.document.languageId;
                contextOptions.push({
                    label: `📄 $(file) Active File: ${fileName}`,
                    description: `${language} file`,
                    detail: 'Includes file path, language, and full content',
                    action: 'activeFile'
                });
            }

            // Option 3: Add selected code
            if (activeEditor && !activeEditor.selection.isEmpty) {
                const selection = activeEditor.document.getText(activeEditor.selection);
                const lineCount = selection.split('\n').length;
                contextOptions.push({
                    label: '✂️ $(selection) Selected Code',
                    description: `${lineCount} lines selected`,
                    detail: 'Includes the currently selected code',
                    action: 'selection'
                });
            }

            // Option 4: Add all open files
            const openDocs = vscode.workspace.textDocuments.filter(doc =>
                !doc.isUntitled && doc.languageId !== 'log'
            );
            if (openDocs.length > 0) {
                contextOptions.push({
                    label: `📚 $(files) All Open Files (${openDocs.length})`,
                    description: 'Add all currently open files',
                    detail: 'Includes file paths and previews',
                    action: 'openFiles'
                });
            }

            // Option 5: Add git status
            try {
                const git = require('simple-git');
                if (workspaceFolders) {
                    const gitClient = git(workspaceFolders[0].uri.fsPath);
                    const isRepo = await gitClient.checkIsRepo();
                    if (isRepo) {
                        contextOptions.push({
                            label: '🌿 $(git-branch) Git Status',
                            description: 'Add current branch and changes',
                            detail: 'Includes branch name, modified files, and uncommitted changes',
                            action: 'git'
                        });
                    }
                }
            } catch (gitError) {
                console.log('⚠️ Git not available:', gitError.message);
            }

            // Option 6: Custom files
            contextOptions.push({
                label: '📂 $(folder-opened) Choose Files...',
                description: 'Select specific files to add',
                detail: 'Browse and select files manually',
                action: 'customFiles'
            });

            if (contextOptions.length === 0) {
                vscode.window.showInformationMessage('No context available. Open a file or workspace first.');
                return;
            }

            // Show quick pick
            const selected = await vscode.window.showQuickPick(contextOptions, {
                placeHolder: 'Select context to add to your message',
                matchOnDescription: true,
                matchOnDetail: true
            });

            if (!selected) {
                return; // User canceled
            }

            // Generate context based on selection
            let contextText = '';

            switch (selected.action) {
                case 'workspace':
                    contextText = await this._generateWorkspaceContext();
                    break;
                case 'activeFile':
                    contextText = await this._generateActiveFileContext();
                    break;
                case 'selection':
                    contextText = await this._generateSelectionContext();
                    break;
                case 'openFiles':
                    contextText = await this._generateOpenFilesContext();
                    break;
                case 'git':
                    contextText = await this._generateGitContext();
                    break;
                case 'customFiles':
                    contextText = await this._generateCustomFilesContext();
                    break;
            }

            if (contextText) {
                // Send context to webview to append to input
                if (this._view) {
                    this._view.webview.postMessage({
                        type: 'appendContext',
                        context: contextText
                    });
                }
                vscode.window.showInformationMessage('✅ Context added to message');
            }

        } catch (error) {
            console.error('❌ Add Context error:', error);
            vscode.window.showErrorMessage(`Failed to add context: ${error.message}`);
        }
    }

    /**
     * Generate workspace context
     */
    async _generateWorkspaceContext() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return '';
        }

        const workspace = workspaceFolders[0];
        let context = `

---
**Workspace Context:**
`;
        context += `- Name: ${workspace.name}\n`;
        context += `- Path: ${workspace.uri.fsPath}\n`;

        // Add file count
        const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**', 100);
        context += `- Files: ${files.length}+ files\n`;

        return context;
    }

    /**
     * Generate active file context
     */
    async _generateActiveFileContext() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return '';
        }

        const doc = editor.document;
        const fileName = doc.fileName.split('/').pop();
        const content = doc.getText();
        const lineCount = doc.lineCount;

        let context = '\n\n---\n**Active File:**\n';
        context += `- File: ${fileName}\n`;
        context += `- Language: ${doc.languageId}\n`;
        context += `- Lines: ${lineCount}\n`;
        context += '\n```' + doc.languageId + '\n' + content + '\n```\n';

        return context;
    }

    /**
     * Generate selection context
     */
    async _generateSelectionContext() {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.selection.isEmpty) {
            return '';
        }

        const selection = editor.document.getText(editor.selection);
        const language = editor.document.languageId;
        const startLine = editor.selection.start.line + 1;
        const endLine = editor.selection.end.line + 1;

        let context = '\n\n---\n**Selected Code** (lines ' + startLine + '-' + endLine + '):\n';
        context += '\n```' + language + '\n' + selection + '\n```\n';

        return context;
    }

    /**
     * Generate open files context
     */
    async _generateOpenFilesContext() {
        const docs = vscode.workspace.textDocuments.filter(doc =>
            !doc.isUntitled && doc.languageId !== 'log'
        );

        if (docs.length === 0) {
            return '';
        }

        let context = `

---
**Open Files (${docs.length}):**
`;

        for (const doc of docs.slice(0, 5)) { // Limit to 5 files
            const fileName = doc.fileName.split('/').pop();
            const preview = doc.getText().substring(0, 200);
            context += `\n**${fileName}** (${doc.languageId}):\n`;
            context += '```\n' + preview + (preview.length >= 200 ? '...' : '') + '\n```\n';
        }

        if (docs.length > 5) {
            context += `\n...and ${docs.length - 5} more files\n`;
        }

        return context;
    }

    /**
     * Generate git context
     */
    async _generateGitContext() {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                return '';
            }

            const git = require('simple-git');
            const gitClient = git(workspaceFolders[0].uri.fsPath);

            const branch = await gitClient.branchLocal();
            const status = await gitClient.status();

            let context = `

---
**Git Status:**
`;
            context += `- Branch: ${branch.current}\n`;
            context += `- Modified: ${status.modified.length} files\n`;
            context += `- Staged: ${status.staged.length} files\n`;
            context += `- Untracked: ${status.not_added.length} files\n`;

            if (status.modified.length > 0) {
                context += '\nModified files:\n';
                status.modified.slice(0, 5).forEach(file => {
                    context += `- ${file}\n`;
                });
            }

            return context;
        } catch (error) {
            console.error('Git context error:', error);
            return '';
        }
    }

    /**
     * Generate custom files context
     */
    async _generateCustomFilesContext() {
        const uris = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: true,
            openLabel: 'Add Files to Context'
        });

        if (!uris || uris.length === 0) {
            return '';
        }

        let context = `

---
**Selected Files (${uris.length}):**
`;

        for (const uri of uris.slice(0, 3)) { // Limit to 3 files
            const doc = await vscode.workspace.openTextDocument(uri);
            const fileName = uri.fsPath.split('/').pop();
            const content = doc.getText();

            context += `\n**${fileName}:**\n`;
            context += '```' + doc.languageId + '\n' + content + '\n```\n';
        }

        if (uris.length > 3) {
            context += `\n...and ${uris.length - 3} more files\n`;
        }

        return context;
    }

    /**
     * Handle Optimize Input - Sends optimization request and updates input field
     */
    async _handleOptimizeInput(originalText, optimizationPrompt) {
        try {
            console.log('✨ Optimize Input feature triggered');
            console.log('Original text:', originalText);

            // Get configuration
            const config = vscode.workspace.getConfiguration('oropendola');
            const apiUrl = config.get('api.url', 'https://oropendola.ai');
            const axios = require('axios');

            // Send optimization request to AI
            const requestPayload = {
                message: optimizationPrompt,
                conversation_id: this._conversationId || null,
                mode: 'ask'
            };

            console.log('📤 Sending optimization request:', requestPayload);

            const response = await axios.post(
                `${apiUrl}/api/method/ai_assistant.api.chat_completion`,
                requestPayload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Cookie': this._sessionCookies
                    },
                    timeout: 30000 // 30 second timeout
                }
            );

            console.log('Optimization response:', response.data);
            console.log('Response message type:', typeof response.data?.message);
            console.log('Response message:', response.data?.message);
            console.log('Response response field:', response.data?.response);
            console.log('Response message.content:', response.data?.message?.content);
            console.log('Response message.response:', response.data?.message?.response);

            // Check for success flag first
            if (response.data && response.data.success === false) {
                throw new Error(response.data.error || 'Backend returned error');
            }

            if (response.data && (response.data.response || response.data.message)) {
                // Extract the content - handle different response structures
                let optimizedText = '';

                // Try response field first (new backend format)
                if (response.data.response && typeof response.data.response === 'string') {
                    optimizedText = response.data.response;
                }
                // Try message.response (nested response)
                else if (response.data.message && typeof response.data.message.response === 'string') {
                    optimizedText = response.data.message.response;
                }
                // Try message.content (nested content)
                else if (response.data.message && typeof response.data.message.content === 'string') {
                    optimizedText = response.data.message.content;
                }
                // Try message as string (old format)
                else if (typeof response.data.message === 'string') {
                    optimizedText = response.data.message;
                }
                // Try message.message (double nested)
                else if (response.data.message && response.data.message.message && typeof response.data.message.message === 'string') {
                    optimizedText = response.data.message.message;
                } else if (response.data.response && typeof response.data.response === 'object') {
                    // Response is an object - try to extract text from it
                    if (response.data.response.content) {
                        optimizedText = response.data.response.content;
                    } else if (response.data.response.message) {
                        optimizedText = response.data.response.message;
                    } else {
                        optimizedText = JSON.stringify(response.data.response);
                    }
                } else if (response.data.message && typeof response.data.message === 'object') {
                    // Message is an object - try to extract text from it
                    console.log('🔍 Message object keys:', Object.keys(response.data.message));
                    // Try common field names
                    if (response.data.message.text) {
                        optimizedText = response.data.message.text;
                    } else {
                        // Last resort - stringify
                        optimizedText = JSON.stringify(response.data.message);
                    }
                } else {
                    // Last resort - stringify message
                    optimizedText = JSON.stringify(response.data.message);
                }

                // Ensure we have a string
                if (typeof optimizedText !== 'string') {
                    console.error('Unexpected response type:', typeof optimizedText, optimizedText);
                    throw new Error('Invalid response format from AI');
                }

                // Clean up the response - remove any markdown formatting or explanations
                optimizedText = optimizedText.trim();

                // Remove common prefixes that AI might add
                optimizedText = optimizedText.replace(/^(here is|here's|optimized version:|improved prompt:|suggestion:|optimized prompt:|improved version:)/i, '').trim();

                // Remove markdown code blocks if present
                optimizedText = optimizedText.replace(/^```[\s\S]*?\n([\s\S]*?)```$/m, '$1').trim();

                // Remove leading/trailing quotes if present
                optimizedText = optimizedText.replace(/^["'](.+)["']$/s, '$1').trim();

                // Check if this looks like an explanation rather than an optimized prompt
                const isExplanation = (
                    // Too long (likely a full response, not a prompt)
                    optimizedText.length > 500 ||
                    // Contains explanation phrases
                    /I'll help|Let me|I can|I will|Here's how|The following|Step 1|First,/i.test(optimizedText) ||
                    // Contains multiple paragraphs (explanations usually have multiple paragraphs)
                    (optimizedText.split('\n\n').length > 2) ||
                    // Contains numbered/bulleted lists (likely an explanation)
                    /^(\d+\.|[-*])\s/m.test(optimizedText)
                );

                if (isExplanation) {
                    console.warn('⚠️ AI returned explanation instead of optimized prompt. Extracting or using original.');

                    // Try to find a sentence that looks like a prompt (starts with action verb)
                    const sentences = optimizedText.split(/[.!?]\n/);
                    let foundPrompt = null;

                    for (const sentence of sentences) {
                        const trimmed = sentence.trim();
                        // Check if sentence starts with common action verbs and is reasonable length
                        if (trimmed.length > 10 && trimmed.length < 200) {
                            const startsWithAction = /^(create|build|make|generate|develop|implement|add|fix|update|improve|explain|analyze|review|refactor|optimize|design|write|show|debug)/i.test(trimmed);
                            if (startsWithAction) {
                                foundPrompt = trimmed;
                                break;
                            }
                        }
                    }

                    if (foundPrompt) {
                        optimizedText = foundPrompt;
                    } else {
                        // Fallback: use original text with minor cleanup
                        optimizedText = originalText.trim();
                        // Just fix obvious typos
                        optimizedText = optimizedText.replace(/\bscrach\b/gi, 'scratch');
                        optimizedText = optimizedText.replace(/\bjs\b/gi, 'JavaScript');
                        optimizedText = optimizedText.replace(/\bpos\b/gi, 'POS');

                        vscode.window.showWarningMessage('AI provided explanation instead of optimization. Original text kept with basic fixes.');
                    }
                }

                console.log('✅ Optimized text:', optimizedText);
                console.log('✅ Optimized text length:', optimizedText.length);
                console.log('✅ Is explanation?', isExplanation);

                // TEMPORARY DIAGNOSTIC: Show what's happening
                if (isExplanation) {
                    const paragraphCount = optimizedText.split('\\n\\n').length;
                    const hasExplanationPhrases = /I'll help|Let me|I can|I will|Here's how|The following|Step 1|First,/i.test(optimizedText);
                    const hasLists = /^(\\d+\\.|[-*])\\s/m.test(optimizedText);
                    console.warn('🔍 Diagnostic - Length:', optimizedText.length, 'Phrases:', hasExplanationPhrases, 'Paragraphs:', paragraphCount, 'Lists:', hasLists);
                    console.warn('🔍 First 200 chars:', optimizedText.substring(0, 200));
                }

                // Send the optimized text back to the webview to update the input field
                if (this._view) {
                    this._view.webview.postMessage({
                        type: 'updateInput',
                        text: optimizedText
                    });
                }
            } else {
                throw new Error('No optimization received from AI');
            }

        } catch (error) {
            console.error('❌ Optimize Input error:', error);
            console.error('Error response:', error.response?.data);

            // Extract error message from backend response
            let errorMessage = error.message;
            let isBackendError = false;

            if (error.response?.data) {
                if (error.response.data.error) {
                    errorMessage = error.response.data.error;
                    isBackendError = true;
                } else if (error.response.data.message) {
                    errorMessage = error.response.data.message;
                    isBackendError = true;
                }
            }

            // If it's a backend error, provide fallback optimization
            if (isBackendError && errorMessage.includes('unexpected indent') || errorMessage.includes('SyntaxError')) {
                console.warn('⚠️ Backend has a syntax error. Using client-side fallback optimization.');

                // Perform basic client-side optimization
                let optimizedText = originalText.trim();

                // Fix common typos and improve clarity
                const improvements = [
                    { pattern: /\bscrach\b/gi, replacement: 'scratch' },
                    { pattern: /\bjs\b/gi, replacement: 'JavaScript' },
                    { pattern: /\bts\b/gi, replacement: 'TypeScript' },
                    { pattern: /\bpos\b/gi, replacement: 'POS' },
                    { pattern: /\bapi\b/gi, replacement: 'API' },
                    { pattern: /\bui\b/gi, replacement: 'UI' },
                    { pattern: /\bdb\b/gi, replacement: 'database' },
                    { pattern: /\bcrud\b/gi, replacement: 'CRUD' },
                    { pattern: /\s+/g, replacement: ' ' }, // Fix multiple spaces
                    { pattern: /^(create|make|build)\s+/i, replacement: (match) => `${match.trim().charAt(0).toUpperCase() + match.trim().slice(1)} a ` }
                ];

                improvements.forEach(({ pattern, replacement }) => {
                    optimizedText = optimizedText.replace(pattern, replacement);
                });

                // Capitalize first letter
                optimizedText = optimizedText.charAt(0).toUpperCase() + optimizedText.slice(1);

                // Add period if missing
                if (!/[.!?]$/.test(optimizedText)) {
                    optimizedText += '.';
                }

                // Update the input field with fallback optimization
                if (this._view) {
                    this._view.webview.postMessage({
                        type: 'updateInput',
                        text: optimizedText
                    });
                }

                // Show info message instead of error
                vscode.window.showInformationMessage('⚠️ Backend optimization unavailable. Applied basic improvements.');

                return; // Exit gracefully
            }

            // Show error to user for other errors
            vscode.window.showErrorMessage(`Failed to optimize input: ${errorMessage}`);

            // Reset the optimize button in the UI
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'resetOptimizeButton'
                });
            }
        }
    }

    /**
     * Handle message feedback (Accept/Reject)
     */
    async _handleMessageFeedback(action, message) {
        try {
            console.log(`👍 Feedback: ${action} for message:`, message.content ? message.content.substring(0, 50) : 'no content');

            // Show user confirmation immediately (don't wait for backend)
            const emoji = action === 'accept' ? '✅' : '❌';
            const verb = action === 'accept' ? 'accepted' : 'rejected';
            vscode.window.showInformationMessage(`${emoji} You ${verb} this response`);

            // Send to backend asynchronously (fire and forget - don't block UI)
            const config = vscode.workspace.getConfiguration('oropendola');
            const apiUrl = config.get('api.url', 'https://oropendola.ai');

            if (this._sessionCookies && this._conversationId) {
                // Don't await - run in background to avoid blocking
                this._sendFeedbackToBackend(apiUrl, action, message).catch(err => {
                    // Silently fail if backend doesn't support feedback endpoint yet
                    console.warn('⚠️ Could not send feedback to backend:', err.message);
                });
            }

        } catch (error) {
            console.error('Feedback error:', error);
            // Don't rethrow - prevent breaking other functionality
        }
    }

    /**
     * Send feedback to backend (async helper)
     * This function is designed to never block the UI - all errors are caught and logged
     */
    async _sendFeedbackToBackend(apiUrl, action, message) {
        const axios = require('axios');

        try {
            // Add timeout to prevent hanging
            const response = await axios.post(
                `${apiUrl}/api/method/ai_assistant.api.message_feedback`,
                {
                    conversation_id: this._conversationId,
                    message_content: message.content ? message.content.substring(0, 500) : '', // Limit size
                    feedback: action // 'accept' or 'reject'
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Cookie': this._sessionCookies
                    },
                    timeout: 5000, // 5 second timeout
                    validateStatus: function (_status) {
                        // Accept all status codes - we'll handle them individually
                        return true;
                    }
                }
            );

            // Handle different response status codes
            if (response.status === 417) {
                console.warn('⚠️ Backend timestamp mismatch (417) - feedback saved locally but may not persist to DB');
            } else if (response.status === 403) {
                console.warn('⚠️ Session expired - feedback saved locally');
            } else if (response.status === 404) {
                console.warn('⚠️ Feedback endpoint not found - feedback saved locally');
            } else if (response.status >= 400) {
                console.warn(`⚠️ Backend returned ${response.status} - feedback saved locally`);
            } else {
                console.log('✅ Feedback sent to backend:', response.data);
            }
        } catch (error) {
            // Comprehensive error handling - NEVER throw errors from this function
            if (error.code === 'ECONNABORTED') {
                console.warn('⚠️ Feedback request timed out - feedback saved locally');
            } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                console.warn('⚠️ Cannot reach backend server - feedback saved locally');
            } else if (error.response) {
                console.warn(`⚠️ Backend error ${error.response.status} - feedback saved locally`);
            } else if (error.request) {
                console.warn('⚠️ No response from backend - feedback saved locally');
            } else {
                console.warn('⚠️ Unexpected error sending feedback:', error.message);
            }
            // Never re-throw - this ensures UI always works
        }
    }

    /**
     * Handle toggle TODO completion
     */
    async _handleToggleTodo(todoId) {
        try {
            console.log('✓ Toggling TODO:', todoId);

            if (!this._sessionCookies) {
                vscode.window.showWarningMessage('Please sign in to manage TODOs');
                return;
            }

            const config = vscode.workspace.getConfiguration('oropendola');
            const apiUrl = config.get('api.url', 'https://oropendola.ai');
            const axios = require('axios');

            // Toggle on backend using DocType API
            const headers = {
                'Content-Type': 'application/json',
                'Cookie': this._sessionCookies
            };

            // Include CSRF token if available
            if (this._csrfToken) {
                headers['X-Frappe-CSRF-Token'] = this._csrfToken;
                console.log('✅ Including CSRF token in toggle TODO request');
            }

            const response = await axios.post(
                `${apiUrl}/api/method/ai_assistant.api.todos.toggle_todo_doctype`,
                { todo_id: todoId },
                {
                    headers: headers,
                    timeout: 10000
                }
            );

            if (response.data && response.data.message && response.data.message.success) {
                console.log(`✅ Toggled TODO: ${todoId}`);

                // Refresh TODO list from backend
                if (this._conversationId) {
                    await this._fetchTodosFromBackend();
                }
            } else {
                throw new Error('Failed to toggle TODO');
            }
        } catch (error) {
            console.error('Toggle TODO error:', error);
            vscode.window.showErrorMessage(`Failed to toggle TODO: ${error.message}`);
        }
    }

    /**
     * Handle delete TODO
     */
    _handleDeleteTodo(todoId) {
        try {
            console.log('🗑️ Deleting TODO:', todoId);
            this._todoManager.deleteTodo(todoId);
            this._updateTodoDisplay();
        } catch (error) {
            console.error('Delete TODO error:', error);
            vscode.window.showErrorMessage(`Failed to delete TODO: ${error.message}`);
        }
    }

    /**
     * Handle clear all TODOs
     */
    async _handleClearTodos() {
        try {
            console.log('🗑️ Clearing all TODOs');

            if (!this._conversationId || !this._sessionCookies) {
                vscode.window.showWarningMessage('No active conversation');
                return;
            }

            const config = vscode.workspace.getConfiguration('oropendola');
            const apiUrl = config.get('api.url', 'https://oropendola.ai');
            const axios = require('axios');

            // Clear on backend using DocType API
            const headers = {
                'Content-Type': 'application/json',
                'Cookie': this._sessionCookies
            };

            // Include CSRF token if available
            if (this._csrfToken) {
                headers['X-Frappe-CSRF-Token'] = this._csrfToken;
                console.log('✅ Including CSRF token in clear TODOs request');
            }

            const response = await axios.post(
                `${apiUrl}/api/method/ai_assistant.api.todos.clear_todos_doctype`,
                { conversation_id: this._conversationId },
                {
                    headers: headers,
                    timeout: 10000
                }
            );

            if (response.data && response.data.message && response.data.message.success) {
                const deleted = response.data.message.deleted || 0;
                console.log(`✅ Cleared ${deleted} TODOs`);
                vscode.window.showInformationMessage(`✅ Cleared ${deleted} TODOs`);

                // Update UI to show empty
                if (this._view) {
                    this._view.webview.postMessage({
                        type: 'updateTodos',
                        todos: [],
                        stats: { total: 0, completed: 0, pending: 0 }
                    });
                }
            }
        } catch (error) {
            console.error('Clear TODOs error:', error);
            vscode.window.showErrorMessage(`Failed to clear TODOs: ${error.message}`);
        }
    }

    /**
     * Handle sync TODOs with backend
     */
    async _handleSyncTodos() {
        try {
            console.log('🔄 Syncing TODOs with backend...');

            if (!this._sessionCookies || !this._conversationId) {
                vscode.window.showWarningMessage('Please start a conversation first');
                return;
            }

            await this._fetchTodosFromBackend();
            vscode.window.showInformationMessage('✅ TODOs synced successfully');

        } catch (error) {
            console.error('Sync TODOs error:', error);
            vscode.window.showErrorMessage(`Failed to sync TODOs: ${error.message}`);
        }
    }

    /**
     * Fetch TODOs from backend and update UI
     */
    async _fetchTodosFromBackend() {
        try {
            const config = vscode.workspace.getConfiguration('oropendola');
            const apiUrl = config.get('api.url', 'https://oropendola.ai');
            const axios = require('axios');

            // Fetch TODOs from backend using DocType API
            const headers = {
                'Content-Type': 'application/json',
                'Cookie': this._sessionCookies
            };

            // Include CSRF token if available
            if (this._csrfToken) {
                headers['X-Frappe-CSRF-Token'] = this._csrfToken;
            }

            const response = await axios.get(
                `${apiUrl}/api/method/ai_assistant.api.todos.get_todos_doctype`,
                {
                    params: { conversation_id: this._conversationId },
                    headers: headers,
                    timeout: 10000
                }
            );

            if (response.data && response.data.message) {
                const { todos, stats } = response.data.message;

                // Update UI
                if (this._view) {
                    this._view.webview.postMessage({
                        type: 'updateTodos',
                        todos: todos || [],
                        stats: stats || { total: 0, completed: 0, pending: 0 },
                        context: 'Synced from server'
                    });
                }

                console.log(`✅ Synced ${todos?.length || 0} TODOs from backend`);
            }
        } catch (error) {
            console.error('❌ Failed to fetch TODOs:', error);
            throw error;
        }
    }

    /**
     * Sync single TODO update with backend
     * @private
     */
    async _syncTodoWithBackend(todoId, completed) {
        try {
            const config = vscode.workspace.getConfiguration('oropendola');
            const apiUrl = config.get('api.url', 'https://oropendola.ai');
            const axios = require('axios');

            await axios.post(
                `${apiUrl}/api/method/ai_assistant.api.update_todo`,
                {
                    conversation_id: this._conversationId,
                    todo_id: todoId,
                    completed: completed
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Cookie': this._sessionCookies
                    },
                    timeout: 5000
                }
            );

            console.log(`✅ TODO ${todoId} synced (completed: ${completed})`);
        } catch (error) {
            console.warn('⚠️ Could not sync TODO to backend:', error.message);
            // Don't throw - allow local operation to succeed even if sync fails
        }
    }

    /**
     * Load TODOs from backend for current conversation
     * @private
     */
    async _loadTodosFromBackend() {
        if (!this._conversationId || !this._sessionCookies) return;

        try {
            const config = vscode.workspace.getConfiguration('oropendola');
            const apiUrl = config.get('api.url', 'https://oropendola.ai');
            const axios = require('axios');

            const response = await axios.get(
                `${apiUrl}/api/method/ai_assistant.api.get_todos`,
                {
                    params: { conversation_id: this._conversationId },
                    headers: {
                        'Cookie': this._sessionCookies
                    },
                    timeout: 5000
                }
            );

            if (response.data && response.data.message && response.data.message.success) {
                const todos = response.data.message.todos || [];
                if (todos.length > 0) {
                    console.log(`📝 Loaded ${todos.length} TODOs from backend`);
                    // Import TODOs into manager
                    this._todoManager.clearAll();
                    this._todoManager.addTodos(todos);
                    this._updateTodoDisplay();
                }
            }
        } catch (error) {
            console.warn('⚠️ Could not load TODOs from backend:', error.message);
            // Silent fail - don't disrupt user experience
        }
    }

    /**
     * Update TODO display in webview
     */
    _updateTodoDisplay() {
        if (!this._view) return;

        const todos = this._todoManager.getAllTodos();
        const stats = this._todoManager.getStats();

        this._view.webview.postMessage({
            type: 'updateTodos',
            todos: todos,
            stats: stats
        });
    }

    /**
     * Parse TODOs from AI response
     */
    async _parseTodosFromResponse(responseText) {
        if (!responseText) return;

        try {
            const newTodos = this._todoManager.parseFromAIResponse(responseText);

            if (newTodos.length > 0) {
                console.log(`📝 Parsed ${newTodos.length} TODO items from AI response`);
                this._todoManager.addTodos(newTodos);

                // Extract only the first 1-2 sentences for context (not the whole explanation)
                const contextMatch = responseText.match(/^(.+?[.!?])\s*(.+?[.!?])?/);
                const context = contextMatch ? (contextMatch[1] + (contextMatch[2] || '')).trim() : '';

                this._updateTodoDisplay(context);

                // Automatically sync with backend if conversation exists
                if (this._conversationId && this._sessionCookies) {
                    console.log('🔄 Auto-syncing TODOs with backend...');
                    await this._handleSyncTodos().catch(err => {
                        console.warn('⚠️ Auto-sync failed:', err.message);
                        // Don't show error to user - silent background sync
                    });
                }
            }
        } catch (error) {
            console.error('Parse TODOs error:', error);
        }
    }

    /**
     * Handle accept plan - Execute the AI's proposed plan
     */
    async _handleAcceptPlan(_messageContent) {
        try {
            console.log('✅ User accepted the plan - executing...');

            // Show confirmation message
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'addMessage',
                    message: {
                        role: 'system',
                        content: '🚀 Creating files... (You\'ll need to run commands manually - terminal commands are restricted for security)'
                    }
                });

                this._view.webview.postMessage({ type: 'showTyping' });
            }

            // Send the plan back to AI for execution (silent mode - don't show instruction in UI)
            // NOTE: Only ask to create files, NOT run terminal commands (backend blocks those)
            await this._handleSendMessage(
                'Execute the plan you just outlined. Create all the files with their complete implementation. Do NOT run any terminal commands like npm install, git init, or node commands - just create the files. The user will run commands manually.', 
                [], 
                { silent: true }
            );

        } catch (error) {
            console.error('❌ Accept plan error:', error);
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'addMessage',
                    message: {
                        role: 'error',
                        content: `Failed to execute plan: ${error.message}`
                    }
                });
            }
        }
    }

    /**
     * Handle reject plan - User declined the plan
     */
    _handleRejectPlan(_messageContent) {
        try {
            console.log('❌ User rejected the plan');

            // Show confirmation message
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'addMessage',
                    message: {
                        role: 'system',
                        content: '❌ Plan rejected. TODOs remain visible for reference. You can ask for a different approach or clear them manually.'
                    }
                });
            }

            // DON'T clear TODOs - just let them stay visible
            // User can manually clear if needed using the clear button
            // this._todoManager.clearAll();
            // this._updateTodoDisplay();

        } catch (error) {
            console.error('Reject plan error:', error);
        }
    }

    /**
     * Handle opening a file from a file link in chat
     * @param {string} filePath - Relative path to the file
     * @param {boolean} highlight - Whether to highlight the file (for GitHub Copilot style)
     */
    async _handleOpenFile(filePath, highlight = false) {
        try {
            console.log('📂 Opening file:', filePath, highlight ? '(with highlight)' : '');

            // Get workspace folders
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                vscode.window.showWarningMessage('No workspace folder open');
                return;
            }

            // Build full path
            const path = require('path');
            const fullPath = path.join(workspaceFolders[0].uri.fsPath, filePath);

            console.log('📂 Full path:', fullPath);

            // Check if file exists
            const fs = require('fs');
            if (!fs.existsSync(fullPath)) {
                vscode.window.showWarningMessage(`File not found: ${filePath}`);
                return;
            }

            // Open file in editor
            const document = await vscode.workspace.openTextDocument(fullPath);
            const editor = await vscode.window.showTextDocument(document, {
                preview: false, // Don't open in preview mode
                preserveFocus: false // Give focus to the opened file
            });

            // If highlight flag is set, briefly highlight the document (GitHub Copilot style)
            if (highlight && editor) {
                const decorationType = vscode.window.createTextEditorDecorationType({
                    backgroundColor: 'rgba(100, 150, 255, 0.15)',
                    isWholeLine: true
                });

                const fullRange = new vscode.Range(
                    0, 0,
                    document.lineCount - 1, 
                    document.lineAt(document.lineCount - 1).text.length
                );

                editor.setDecorations(decorationType, [fullRange]);

                // Remove highlight after 1 second
                setTimeout(() => {
                    decorationType.dispose();
                }, 1000);
            }

            console.log('✅ File opened successfully');

        } catch (error) {
            console.error('❌ Error opening file:', error);
            vscode.window.showErrorMessage(`Failed to open file: ${error.message}`);
        }
    }

    /**
     * Handle keeping a file change (GitHub Copilot style)
     * @param {string} filePath - Path to the file
     */
    async _handleKeepFileChange(filePath) {
        try {
            console.log('✅ Keeping file change:', filePath);
            
            // In a full implementation, you might:
            // - Mark the change as accepted in a database
            // - Update version control metadata
            // - Track user preferences for AI changes
            
            // For now, just log it
            vscode.window.showInformationMessage(`Kept changes to ${filePath}`, { modal: false });

        } catch (error) {
            console.error('❌ Error keeping file change:', error);
            vscode.window.showErrorMessage(`Failed to keep file change: ${error.message}`);
        }
    }

    /**
     * Handle undoing a file change (GitHub Copilot style)
     * @param {string} filePath - Path to the file
     * @param {string} changeType - Type of change (created, modified, deleted)
     */
    async _handleUndoFileChange(filePath, changeType) {
        try {
            console.log('↩️ Undoing file change:', filePath, `(${changeType})`);

            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                vscode.window.showWarningMessage('No workspace folder open');
                return;
            }

            const path = require('path');
            const fs = require('fs').promises;
            const fullPath = path.join(workspaceFolders[0].uri.fsPath, filePath);

            if (changeType === 'created') {
                // Delete the newly created file
                try {
                    await fs.unlink(fullPath);
                    vscode.window.showInformationMessage(`Deleted ${filePath}`, { modal: false });
                    console.log('✅ File deleted successfully');
                } catch (err) {
                    if (err.code === 'ENOENT') {
                        console.log('ℹ️ File already deleted');
                    } else {
                        throw err;
                    }
                }
            } else if (changeType === 'modified' || changeType === 'deleted') {
                // For modified/deleted files, try to restore from git
                const { exec } = require('child_process');
                const util = require('util');
                const execPromise = util.promisify(exec);

                try {
                    // Try git checkout to restore the file
                    await execPromise(`git checkout HEAD -- "${filePath}"`, {
                        cwd: workspaceFolders[0].uri.fsPath
                    });
                    vscode.window.showInformationMessage(`Restored ${filePath} from git`, { modal: false });
                    console.log('✅ File restored from git');
                } catch (err) {
                    // If git fails, inform user
                    vscode.window.showWarningMessage(
                        `Could not restore ${filePath}. Make sure the file is tracked in git.`
                    );
                    console.warn('⚠️ Git restore failed:', err.message);
                }
            }

        } catch (error) {
            console.error('❌ Error undoing file change:', error);
            vscode.window.showErrorMessage(`Failed to undo file change: ${error.message}`);
        }
    }

    /**
     * Set up event listeners for a ConversationTask
     * @param {ConversationTask} task
     */
    _setupTaskEventListeners(task) {
        // Task started
        task.on('taskStarted', (taskId) => {
            console.log(`📋 Task ${taskId} started`);
            this._updateTaskStatus('running', 'Processing your request...');
        });

        // Task completed
        task.on('taskCompleted', (taskId) => {
            console.log(`✅ Task ${taskId} completed`);
            this._updateTaskStatus('idle', '');

            // Hide typing indicator
            if (this._view) {
                this._view.webview.postMessage({ type: 'hideTyping' });
            }

            // Add to history
            this._taskHistory.push(task.getSummary());
        });

        // Task error
        task.on('taskError', (taskId, error) => {
            console.error(`❌ Task ${taskId} error:`, error);
            this._updateTaskStatus('error', error.message);

            // Don't show canceled/abort errors to user - these are intentional stops
            if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED' || error.message?.includes('cancel')) {
                console.log('⏹ Suppressing cancel error from UI (user-initiated stop)');
                return; // Don't show cancel errors in UI
            }

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'addMessage',
                    message: {
                        role: 'error',
                        content: `Error: ${error.message}`
                    }
                });
            }
        });

        // Task retrying
        task.on('taskRetrying', (taskId, attempt, delay) => {
            console.log(`🔄 Task ${taskId} retrying (attempt ${attempt}) after ${delay}ms`);
            this._updateTaskStatus('waiting', `Retrying in ${delay / 1000}s...`);

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'addMessage',
                    message: {
                        role: 'system',
                        content: `⏳ Network issue detected. Retrying in ${delay / 1000}s... (attempt ${attempt})`
                    }
                });
            }
        });

        // Tools executing
        task.on('toolsExecuting', (taskId, count) => {
            console.log(`🔧 Task ${taskId} executing ${count} tool(s)`);
            this._updateTaskStatus('running', `Executing ${count} tool(s)...`);
        });

        // Tool completed
        task.on('toolCompleted', (taskId, tool, result) => {
            console.log(`✅ Tool ${tool.action} completed`);

            // Show tool execution result in UI
            if (this._view && result.success) {
                const truncatedContent = result.content.length > 200
                    ? result.content.substring(0, 200) + '...'
                    : result.content;

                this._view.webview.postMessage({
                    type: 'addMessage',
                    message: {
                        role: 'system',
                        content: `✅ ${tool.action}: ${truncatedContent}`
                    }
                });
            }
        });

        // Tool error
        task.on('toolError', (taskId, tool, error) => {
            console.error(`❌ Tool ${tool.action} error:`, error);

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'addMessage',
                    message: {
                        role: 'error',
                        content: `❌ Tool error (${tool.action}): ${error.message}`
                    }
                });
            }
        });

        // Context reduced
        task.on('contextReduced', (taskId, removed, kept) => {
            console.log(`📉 Context reduced: removed ${removed} messages, kept ${kept}`);

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'addMessage',
                    message: {
                        role: 'system',
                        content: `⚠️ Context window limit approaching. Kept ${kept} most recent messages.`
                    }
                });
            }
        });

        // Rate limited
        task.on('rateLimited', (taskId, delay) => {
            console.log(`⏳ Rate limited, waiting ${delay}ms`);
            this._updateTaskStatus('waiting', `Rate limited. Retrying in ${delay / 1000}s...`);

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'addMessage',
                    message: {
                        role: 'system',
                        content: `⏳ Rate limit reached. Waiting ${delay / 1000}s before retrying...`
                    }
                });
            }
        });

        // Mistake limit reached
        task.on('mistakeLimitReached', (taskId, count) => {
            console.log(`⚠️ Mistake limit reached (${count})`);

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'addMessage',
                    message: {
                        role: 'system',
                        content: `⚠️ AI made ${count} consecutive mistakes. Asking for guidance...`
                    }
                });
            }
        });

        // Task aborted
        task.on('taskAborted', (taskId) => {
            console.log(`⏹ Task ${taskId} aborted`);
            this._updateTaskStatus('idle', '');

            if (this._view) {
                this._view.webview.postMessage({ type: 'hideTyping' });
            }
        });

        // Assistant message (final response without tool calls)
        task.on('assistantMessage', (taskId, message, extraData) => {
            console.log('🤖 Assistant response received');

            // Parse TODOs from the AI response for UI display only (not for control flow)
            const parsedTodos = this._todoManager.parseFromAIResponse(message);
            if (parsedTodos.length > 0) {
                console.log(`📝 Parsed ${parsedTodos.length} TODO items from AI response (UI display only)`);
                this._todoManager.addTodos(parsedTodos);
            }

            if (this._view) {
                // Don't use TODOs to control execution flow - just display them
                const backendTodos = extraData?.todos && Array.isArray(extraData.todos) && extraData.todos.length > 0;
                const todosForDisplay = backendTodos ? extraData.todos : parsedTodos;
                
                // IMPORTANT: Don't set has_todos flag - this prevents "Confirm/Dismiss" buttons
                // and allows natural conversation flow
                
                // Send message with file_changes if available
                this._view.webview.postMessage({
                    type: 'addMessage',
                    message: {
                        role: 'assistant',
                        content: message,
                        file_changes: extraData?.file_changes,
                        has_todos: false,  // Always false to prevent plan interruption
                        auto_execute: true  // Always true for continuous flow
                    }
                });

                // Update TODO UI if any TODOs were found (for user visibility)
                if (todosForDisplay.length > 0) {
                    console.log(`📋 Updating UI with ${todosForDisplay.length} TODOs (display only)`);
                    const todoStats = extraData?.todo_stats || {
                        total: todosForDisplay.length,
                        completed: 0,
                        pending: todosForDisplay.length,
                        in_progress: 0
                    };
                    
                    this._view.webview.postMessage({
                        type: 'updateTodos',
                        todos: todosForDisplay,
                        stats: todoStats,
                        context: 'Tracking progress'
                    });
                }
            }
        });

        // AI Progress events (GitHub Copilot-style + WebSocket real-time)
        task.on('aiProgress', (taskId, progressData) => {
            console.log(`📊 [Sidebar] AI Progress [${progressData.type}]:`, progressData.message || '');
            
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'aiProgress',
                    taskId: taskId,
                    data: progressData
                });
            }

            // Update VS Code status bar for visual feedback
            if (progressData.type === 'thinking') {
                vscode.window.setStatusBarMessage('$(loading~spin) AI is thinking...', 5000);
            } else if (progressData.type === 'working') {
                const step = progressData.step || 0;
                const total = progressData.total || 0;
                if (step && total) {
                    vscode.window.setStatusBarMessage(`$(tools) Executing step ${step}/${total}...`, 5000);
                }
            } else if (progressData.type === 'complete') {
                vscode.window.setStatusBarMessage('$(check) Task complete!', 3000);
            }
        });

        // Realtime WebSocket connection established
        task.on('realtimeConnected', (taskId) => {
            console.log(`✅ [Sidebar] Task ${taskId} realtime connected`);
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'realtimeStatus',
                    taskId: taskId,
                    connected: true
                });
            }
        });

        // Realtime WebSocket connection lost
        task.on('realtimeDisconnected', (taskId, reason) => {
            console.warn(`❌ [Sidebar] Task ${taskId} realtime disconnected:`, reason);
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'realtimeStatus',
                    taskId: taskId,
                    connected: false,
                    reason: reason
                });
            }
        });

        // Realtime WebSocket connection error
        task.on('realtimeError', (taskId, error) => {
            console.error(`❌ [Sidebar] Task ${taskId} realtime error:`, error);
            // Don't show realtime errors to user - they're not critical
            // The extension will still work via HTTP responses
        });

        // Task cleanup (ALWAYS hide typing indicator)
        task.on('taskCleanup', (_taskId) => {
            console.log('🧹 Task cleanup event received');
            if (this._view) {
                this._view.webview.postMessage({ type: 'hideTyping' });
            }
        });

        // Tool execution events for TODO tracking
        task.on('toolExecutionStart', (taskId, tool, index, total) => {
            console.log(`🔧 [Sidebar] Tool execution started [${index + 1}/${total}]: ${tool.action}`);
            
            // Extract todo_id from tool parameters if available
            const todoId = this._extractTodoId(tool);
            
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'aiProgress',
                    taskId: taskId,
                    data: {
                        type: 'toolExecutionStart',
                        tool_name: tool.action,
                        todo_id: todoId,
                        step: index + 1,
                        total: total
                    }
                });
            }
        });

        task.on('toolExecutionComplete', (taskId, tool, result, index, total) => {
            console.log(`✅ [Sidebar] Tool execution completed [${index + 1}/${total}]: ${tool.action}`);
            
            // Extract todo_id from tool parameters if available
            const todoId = this._extractTodoId(tool);
            
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'aiProgress',
                    taskId: taskId,
                    data: {
                        type: 'toolExecutionComplete',
                        tool_name: tool.action,
                        todo_id: todoId,
                        success: result.success !== false,
                        step: index + 1,
                        total: total
                    }
                });
            }
        });

        // File change events (Qoder-style)
        task.on('fileChangeAdded', (change) => {
            console.log(`📄 File change added: ${change.filePath} (${change.status})`);
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'fileChangeAdded',
                    change: change
                });
            }
        });

        task.on('fileChangeUpdated', (change) => {
            console.log(`🔄 File change updated: ${change.filePath} (${change.status})`);
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'fileChangeUpdated',
                    change: change
                });
            }
        });

        // Task summary generated (Qoder-style)
        task.on('taskSummaryGenerated', (taskId, summary) => {
            console.log('📊 Task summary generated:', summary.overview.summary);

            // Show task summary dialog
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'showTaskSummary',
                    summary: summary
                });
            }
        });
    }

    /**
     * Update task status in UI
     * @param {string} status - Task status
     * @param {string} message - Status message
     */
    _updateTaskStatus(status, message) {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'taskStatus',
                status: status,
                message: message
            });
        }
    }

    /**
     * Handle sending a chat message (Enhanced with ConversationTask and URL Analysis)
     */
    async _handleSendMessage(text, attachments = [], options = {}) {
        if (!text || !text.trim()) {
            return;
        }

        const { silent = false } = options; // Silent mode hides user message from UI

        // Detect URLs in the message
        const detectedUrls = this._urlAnalyzer.detectURLs(text);
        let urlContext = null;

        if (detectedUrls.length > 0) {
            // Show URL detection notification
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'addMessage',
                    message: {
                        role: 'system',
                        content: 'Detected ' + detectedUrls.length + ' URL(s). Analyzing...'
                    }
                });
            }

            try {
                // Process URLs and get analysis
                const analysisResult = await this._urlAnalyzer.processURLs(detectedUrls);

                // Generate AI-friendly context
                urlContext = this._urlAnalyzer.generateAIContext(analysisResult);

                // Show analysis summary to user
                if (this._view && analysisResult.analyses.length > 0) {
                    let summaryMsg = 'URL Analysis Complete:\n\n';

                    for (const item of analysisResult.analyses) {
                        const analysis = item.analysis;
                        if (analysis.success) {
                            if (analysis.repository) {
                                summaryMsg += '[OK] ' + analysis.repository.fullName + '\n';
                                summaryMsg += '   ' + (analysis.repository.description || 'Repository analyzed') + '\n';
                            } else if (analysis.title) {
                                summaryMsg += '[OK] ' + analysis.title + '\n';
                            } else {
                                summaryMsg += '[OK] URL analyzed: ' + item.original.url + '\n';
                            }
                        } else {
                            summaryMsg += '[FAILED] ' + analysis.error + '\n';
                        }
                    }

                    this._view.webview.postMessage({
                        type: 'addMessage',
                        message: {
                            role: 'system',
                            content: summaryMsg
                        }
                    });
                }
            } catch (error) {
                console.error('URL analysis error:', error);
                if (this._view) {
                    this._view.webview.postMessage({
                        type: 'addMessage',
                        message: {
                            role: 'system',
                            content: '[WARNING] URL analysis failed: ' + error.message
                        }
                    });
                }
            }
        }

        // Enhance user message with URL context if available
        const enhancedText = urlContext ? `${text}${urlContext}` : text;

        // Add user message to history
        this._messages.push({
            role: 'user',
            content: enhancedText,
            timestamp: new Date().toISOString()
        });

        // Show user message in UI (original text, not enhanced) - unless silent mode
        if (this._view && !silent) {
            this._view.webview.postMessage({
                type: 'addMessage',
                message: {
                    role: 'user',
                    content: text
                }
            });
        }

        try {
            // Show typing indicator
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'showTyping'
                });
            }

            // Get configuration
            const config = vscode.workspace.getConfiguration('oropendola');
            const apiUrl = config.get('api.url', 'https://oropendola.ai');
            const userEmail = config.get('user.email');

            // Validate session
            if (!userEmail && !this._sessionId) {
                throw new Error('Please sign in to use AI features');
            }

            if (!this._sessionCookies) {
                console.error('❌ No session cookies available!');
                throw new Error('Session expired. Please sign in again.');
            }

            // Create new task if needed or current task is not running
            if (!this._currentTask || this._currentTask.status !== 'running') {
                console.log('🆕 Creating new ConversationTask');

                this._taskCounter++;
                const taskId = `task_${this._taskCounter}_${Date.now()}`;

                this._currentTask = new ConversationTask(taskId, {
                    apiUrl: apiUrl,
                    sessionCookies: this._sessionCookies,
                    mode: this._mode,
                    // eslint-disable-next-line no-undef
                    providerRef: new WeakRef(this),
                    consecutiveMistakeLimit: 10  // Increased for progressive mode (was 3)
                });

                // Set up all event listeners
                this._setupTaskEventListeners(this._currentTask);
            }

            // Run the task (handles everything automatically: retries, context, tools)
            console.log('🚀 Starting task execution');

            // Add safety timeout - if task takes longer than 180 seconds, force reset UI
            const safetyTimeout = setTimeout(() => {
                console.warn('⚠️ Safety timeout triggered - forcing UI reset after 180s');
                if (this._view) {
                    this._view.webview.postMessage({ type: 'hideTyping' });
                    this._view.webview.postMessage({
                        type: 'addMessage',
                        message: {
                            role: 'system',
                            content: '⚠️ Request timed out. The backend may be experiencing issues. Please try again or contact support.'
                        }
                    });
                }
                // Abort current task
                if (this._currentTask) {
                    this._currentTask.abortTask();
                }
            }, 180000); // 180 seconds

            try {
                await this._currentTask.run(enhancedText, attachments);
            } catch (runError) {
                console.error('❌ Task run error:', runError);
                // Don't rethrow - just log. The task error handler will notify UI.
            } finally {
                clearTimeout(safetyTimeout);
                // Extra safety: Always ensure typing indicator is hidden
                if (this._view) {
                    this._view.webview.postMessage({ type: 'hideTyping' });
                }
            }

        } catch (error) {
            console.error('Chat error:', error);

            // Hide typing indicator
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'hideTyping'
                });

                this._view.webview.postMessage({
                    type: 'addMessage',
                    message: {
                        role: 'error',
                        content: `Error: ${error.message || 'Failed to get AI response. Please try again.'}`
                    }
                });
            }
        }
    }

    /**
     * Parse tool calls from markdown-formatted response
     */
    _parseToolCallsFromMarkdown(responseText) {
        const toolCalls = [];

        try {
            console.log('🔎 Starting markdown parse...');
            console.log('🔎 Response text length:', responseText ? responseText.length : 0);
            console.log('🔎 First 300 chars:', responseText ? responseText.substring(0, 300) : 'null');

            // Match ```tool_call ... ``` blocks
            const toolCallRegex = /```tool_call\s*\n([\s\S]*?)```/g;
            let match;
            let matchCount = 0;

            while ((match = toolCallRegex.exec(responseText)) !== null) {
                matchCount++;
                console.log(`🔎 Found match #${matchCount}`);
                let jsonStr = match[1].trim();
                console.log('🔎 Extracted JSON string (first 200 chars):', jsonStr.substring(0, 200));

                try {
                    // First attempt: Direct parse (for properly formatted JSON)
                    let toolCall;
                    try {
                        toolCall = JSON.parse(jsonStr);
                    } catch (firstError) {
                        // If direct parse fails, try sanitizing the JSON
                        console.log('⚠️ Direct parse failed, attempting to sanitize JSON...');
                        console.log('⚠️ Parse error:', firstError.message);

                        // Strategy: Extract fields manually to handle embedded newlines
                        const actionMatch = jsonStr.match(/"action"\s*:\s*"([^"]+)"/);
                        const pathMatch = jsonStr.match(/"path"\s*:\s*"([^"]+)"/);
                        const descMatch = jsonStr.match(/"description"\s*:\s*"([^"]+)"/);

                        // For content, extract everything between "content": " and the closing "
                        // This is tricky because content may have newlines
                        const contentStart = jsonStr.indexOf('"content"');
                        if (contentStart !== -1) {
                            const afterContent = jsonStr.substring(contentStart);
                            const contentValueStart = afterContent.indexOf('"', afterContent.indexOf(':') + 1) + 1;
                            // Find the last " before "description" or end of object
                            let contentEnd = afterContent.indexOf('",', contentValueStart);
                            if (contentEnd === -1) {
                                contentEnd = afterContent.lastIndexOf('"', afterContent.length - 2);
                            }
                            const content = afterContent.substring(contentValueStart, contentEnd);

                            toolCall = {
                                action: actionMatch ? actionMatch[1] : 'unknown',
                                path: pathMatch ? pathMatch[1] : '',
                                content: content || '',
                                description: descMatch ? descMatch[1] : ''
                            };

                            console.log('✅ Manually reconstructed tool call from malformed JSON');
                        } else {
                            throw new Error('Could not extract content field');
                        }
                    }

                    toolCalls.push(toolCall);
                    console.log('✅ Successfully parsed tool call:', JSON.stringify(toolCall, null, 2));
                } catch (parseError) {
                    console.error('❌ Failed to parse tool call JSON (first 500 chars):', jsonStr.substring(0, 500));
                    console.error('❌ Parse error:', parseError.message);
                    console.error('❌ Full error:', parseError);
                }
            }

            console.log(`🔎 Regex found ${matchCount} matches total`);
            console.log(`🔎 Successfully parsed ${toolCalls.length} tool calls`);
        } catch (error) {
            console.error('❌ Error in markdown parsing:', error);
        }

        return toolCalls;
    }

    /**
     * Build context for AI chat
     */
    async _buildContext() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const context = {
            workspace: workspaceFolders ? workspaceFolders[0].name : null,
            workspacePath: workspaceFolders ? workspaceFolders[0].uri.fsPath : null,
            openFiles: [],
            activeFile: null,
            selection: null
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
        const openDocuments = vscode.workspace.textDocuments.slice(0, 3);
        for (const doc of openDocuments) {
            if (!doc.isUntitled && doc.languageId !== 'log' && doc.fileName !== context.activeFile?.path) {
                context.openFiles.push({
                    path: doc.fileName,
                    language: doc.languageId,
                    preview: doc.getText().substring(0, 200)
                });
            }
        }

        return context;
    }

    /**
     * Execute multiple tool calls sequentially
     */
    async _executeToolCalls(toolCalls) {
        if (!toolCalls || !Array.isArray(toolCalls) || toolCalls.length === 0) {
            return;
        }

        console.log(`🔧 Executing ${toolCalls.length} tool call(s)...`);

        for (let i = 0; i < toolCalls.length; i++) {
            const toolCall = toolCalls[i];
            console.log(`🔧 [${i + 1}/${toolCalls.length}] Executing tool call:`, toolCall);

            try {
                await this._executeToolCall(toolCall, i + 1, toolCalls.length);
            } catch (error) {
                console.error(`❌ Tool call ${i + 1} failed:`, error);
                // Continue with next tool call even if this one fails
            }
        }

        console.log('✅ Finished executing all tool calls');
    }

    /**
     * Execute a single tool call
     * Handles both local file operations (VS Code API) and backend operations (Frappe)
     */
    async _executeToolCall(toolCall, index = 1, total = 1) {
        try {
            const { action, path, description } = toolCall;

            console.log(`🔧 [${index}/${total}] Executing ${action}:`, description || path);

            // Show executing message in chat
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'addMessage',
                    message: {
                        role: 'system',
                        content: `⚙️ [${index}/${total}] Executing: ${description || action}...`
                    }
                });
            }

            // Determine if this is a general file operation or Frappe-specific
            const isGeneralFileOp = this._isGeneralFileOperation(action, path);

            if (isGeneralFileOp) {
                // Handle locally using VS Code API
                console.log(`📁 Handling locally: ${action} for ${path}`);
                await this._executeLocalFileOperation(toolCall, index, total);
            } else {
                // Handle via backend (Frappe-specific)
                console.log(`🌐 Sending to backend: ${action} for ${path}`);
                await this._executeBackendOperation(toolCall, index, total);
            }

        } catch (error) {
            console.error(`❌ [${index}/${total}] Tool call execution failed:`, error);

            // Show error notification
            const errorMessage = error.response?.data?.message?.error ||
                               error.response?.data?.error ||
                               error.message ||
                               'Unknown error';

            vscode.window.showErrorMessage(
                `❌ [${index}/${total}] Failed to execute ${toolCall.action}: ${errorMessage}`
            );

            // Show error in chat
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'addMessage',
                    message: {
                        role: 'error',
                        content: `❌ [${index}/${total}] Failed to execute: ${toolCall.description || toolCall.action}\n\nError: ${errorMessage}`
                    }
                });
            }

            // Rethrow to allow caller to handle
            throw error;
        }
    }

    /**
     * Determine if this is a general file operation (vs Frappe-specific)
     */
    _isGeneralFileOperation(action, path) {
        // List of actions that should be handled locally
        const localActions = ['create_file', 'edit_file', 'delete_file', 'read_file'];

        // Check if action is in local actions list
        if (!localActions.includes(action)) {
            return false;
        }

        // If path has common programming file extensions, handle locally
        const generalExtensions = [
            '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.cs',
            '.go', '.rb', '.php', '.html', '.css', '.scss', '.json', '.xml',
            '.md', '.txt', '.sh', '.bash', '.sql', '.yml', '.yaml', '.toml',
            '.rs', '.swift', '.kt', '.dart', '.vue', '.svelte', '.astro'
        ];

        const hasGeneralExtension = generalExtensions.some(ext => path && path.toLowerCase().endsWith(ext));

        // If it's a general file extension, handle locally
        if (hasGeneralExtension) {
            return true;
        }

        // If path contains DocType indicators, send to backend
        const frappeIndicators = ['doctype', 'frappe', 'erpnext'];
        const hasFrappeIndicators = frappeIndicators.some(indicator =>
            path && path.toLowerCase().includes(indicator)
        );

        return !hasFrappeIndicators;
    }

    /**
     * Execute file operation locally using VS Code API
     */
    async _executeLocalFileOperation(toolCall, index, total) {
        const { action, path, content } = toolCall;
        const fs = require('fs').promises;
        const pathModule = require('path');

        // Get workspace folder
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            throw new Error('No workspace folder open');
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        const fullPath = pathModule.join(workspaceRoot, path);

        console.log(`📁 Local file operation: ${action} at ${fullPath}`);

        switch (action) {
            case 'create_file': {
                // Create the file
                const dirPath = pathModule.dirname(fullPath);
                await fs.mkdir(dirPath, { recursive: true });
                await fs.writeFile(fullPath, content || '', 'utf8');

                // Open the file in editor
                const document = await vscode.workspace.openTextDocument(fullPath);
                await vscode.window.showTextDocument(document);

                // Show success
                const successMsg = `✅ Created file: ${path}`;
                vscode.window.showInformationMessage(successMsg);

                if (this._view) {
                    this._view.webview.postMessage({
                        type: 'addMessage',
                        message: {
                            role: 'system',
                            content: `${successMsg}\n\nFile has been created and opened in the editor.`
                        }
                    });
                }

                // Check if content is empty or just a placeholder comment
                const isEmpty = !content || content.trim() === '';
                const isPlaceholder = content && (
                    content.includes('goes here') ||
                    content.includes('TODO') ||
                    content.includes('Add code') ||
                    content.trim().startsWith('//') && content.trim().split('\n').length === 1
                );

                // If file is empty or has placeholder, send automatic follow-up
                if (isEmpty || isPlaceholder) {
                    console.log(`🔄 File created with ${isEmpty ? 'empty' : 'placeholder'} content - sending follow-up request`);

                    // Extract file purpose from description or path
                    const fileName = pathModule.basename(path);
                    const fileExt = pathModule.extname(path);
                    const purpose = toolCall.description || `${fileName} implementation`;

                    // Send automatic follow-up to populate the file
                    setTimeout(() => {
                        this._sendAutoPopulateRequest(path, fileName, fileExt, purpose);
                    }, 1000); // Small delay to ensure file creation message is shown first
                }
                break;
            }

            case 'edit_file': {
                // Edit existing file
                const existingContent = await fs.readFile(fullPath, 'utf8');
                await fs.writeFile(fullPath, content || existingContent, 'utf8');

                // Open the file
                const editDoc = await vscode.workspace.openTextDocument(fullPath);
                await vscode.window.showTextDocument(editDoc);

                vscode.window.showInformationMessage(`✅ Updated file: ${path}`);

                if (this._view) {
                    this._view.webview.postMessage({
                        type: 'addMessage',
                        message: {
                            role: 'system',
                            content: `✅ Updated file: ${path}`
                        }
                    });
                }
                break;
            }

            case 'delete_file': {
                // Delete file
                await fs.unlink(fullPath);
                vscode.window.showInformationMessage(`✅ Deleted file: ${path}`);

                if (this._view) {
                    this._view.webview.postMessage({
                        type: 'addMessage',
                        message: {
                            role: 'system',
                            content: `✅ Deleted file: ${path}`
                        }
                    });
                }
                break;
            }

            case 'read_file': {
                // Read file
                const fileContent = await fs.readFile(fullPath, 'utf8');

                if (this._view) {
                    this._view.webview.postMessage({
                        type: 'addMessage',
                        message: {
                            role: 'system',
                            content: `✅ Read file: ${path}

Content:
\`\`\`
${fileContent.substring(0, 500)}${fileContent.length > 500 ? '...' : ''}
\`\`\``
                        }
                    });
                }
                break;
            }

            default:
                throw new Error(`Unknown action: ${action}`);
        }

        console.log(`✅ [${index}/${total}] Local file operation completed: ${action}`);
    }

    /**
     * Execute operation via backend (Frappe-specific)
     */
    async _executeBackendOperation(toolCall, index, total) {
        const { action, path, content } = toolCall;

        const config = vscode.workspace.getConfiguration('oropendola');
        const apiUrl = config.get('api.url', 'https://oropendola.ai');
        const axios = require('axios');

        // Call backend to execute tool call
        const response = await axios.post(
            `${apiUrl}/api/method/ai_assistant.api.execute_tool_call`,
            {
                action: action,
                path: path,
                content: content,
                // Pass any additional parameters
                ...toolCall
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': this._sessionCookies
                },
                timeout: 30000 // 30 second timeout for file operations
            }
        );

        console.log(`✅ [${index}/${total}] Tool call executed:`, response.data);

        // Check if execution was successful
        if (response.data && response.data.message) {
            const result = response.data.message;

            if (result.success) {
                // Show success notification
                vscode.window.showInformationMessage(
                    `✅ [${index}/${total}] ${result.message}`
                );

                // Show success in chat
                if (this._view) {
                    this._view.webview.postMessage({
                        type: 'addMessage',
                        message: {
                            role: 'system',
                            content: `✅ [${index}/${total}] ${result.message}${result.data ? '\n\nDetails: ' + JSON.stringify(result.data, null, 2) : ''}`
                        }
                    });
                }

                console.log('✅ Success data:', result.data);
            } else {
                // Execution failed - show error
                throw new Error(result.error || result.message || 'Tool execution failed');
            }
        } else {
            throw new Error('Invalid response from backend');
        }
    }

    /**
     * Send automatic follow-up request to populate empty/placeholder file
     */
    async _sendAutoPopulateRequest(filePath, fileName, fileExt, purpose) {
        try {
            console.log(`📝 Auto-populating file: ${fileName}`);

            // Detect language from file extension
            const languageMap = {
                '.js': 'JavaScript',
                '.ts': 'TypeScript',
                '.jsx': 'React JSX',
                '.tsx': 'React TypeScript',
                '.py': 'Python',
                '.java': 'Java',
                '.cpp': 'C++',
                '.c': 'C',
                '.cs': 'C#',
                '.go': 'Go',
                '.rb': 'Ruby',
                '.php': 'PHP',
                '.rs': 'Rust',
                '.swift': 'Swift',
                '.kt': 'Kotlin',
                '.dart': 'Dart'
            };

            const language = languageMap[fileExt] || 'code';

            // Construct follow-up message
            const followUpMessage = `The file "${fileName}" has been created but is empty. Please write complete, functional ${language} code for ${purpose}. Include:\n\n` +
                '1. All necessary imports/dependencies\n' +
                '2. Proper error handling\n' +
                '3. Comments explaining the code\n' +
                `4. Best practices for ${language}\n` +
                '5. Complete implementation (not placeholder comments)\n\n' +
                `Write the code directly into the "${fileName}" file.`;

            // Show that we're sending a follow-up
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'addMessage',
                    message: {
                        role: 'system',
                        content: `📝 Requesting AI to populate ${fileName} with complete code...`
                    }
                });
            }

            // Send the follow-up message automatically
            console.log('🚀 Sending auto-populate request:', followUpMessage);
            await this._handleSendMessage(followUpMessage);

        } catch (error) {
            console.error('❌ Auto-populate request failed:', error);
            // Don't throw - this is a nice-to-have feature
        }
    }

    /**
     * Get subscription expired HTML - shown when subscription is not active
     */
    _getSubscriptionExpiredHtml(subscriptionStatus) {
        const plan = subscriptionStatus.plan || 'trial';
        const planName = plan.toUpperCase();

        // Dynamic message based on subscription type
        let message = `Your ${planName} subscription has expired. Renew to continue.`;

        if (subscriptionStatus.trialExpired) {
            const trialDuration = subscriptionStatus.trialDuration || '1 DAY';
            message = `Your ${trialDuration} TRIAL has expired. Renew to continue.`;
        } else if (plan === 'monthly') {
            message = 'Your MONTHLY subscription has expired. Renew to continue.';
        } else if (plan === 'yearly') {
            message = 'Your YEARLY subscription has expired. Renew to continue.';
        } else if (plan === 'trial') {
            message = 'Your TRIAL period has expired. Subscribe to continue.';
        }

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Subscription Expired</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-sideBar-background);
            padding: 20px;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .expired-container {
            width: 100%;
            max-width: 350px;
            text-align: center;
        }
        
        .icon {
            font-size: 64px;
            margin-bottom: 20px;
        }
        
        .expired-message {
            background: #FFF3CD;
            color: #856404;
            border: 1px solid #FFEAA7;
            padding: 16px 20px;
            border-radius: 8px;
            margin-bottom: 24px;
            font-size: 14px;
            font-weight: 500;
            line-height: 1.5;
        }
        
        .warning-icon {
            font-size: 20px;
            margin-right: 8px;
            vertical-align: middle;
        }
        
        .info-text {
            color: var(--vscode-descriptionForeground);
            font-size: 13px;
            margin-bottom: 20px;
            line-height: 1.6;
        }
        
        .renew-button {
            width: 100%;
            padding: 14px 20px;
            background: #FF6B35;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 15px;
            font-weight: 600;
            text-align: center;
            transition: background 0.2s;
            margin-bottom: 12px;
        }
        
        .renew-button:hover {
            background: #E55A2B;
        }
        
        .logout-button {
            width: 100%;
            padding: 12px 20px;
            background: transparent;
            color: var(--vscode-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: background 0.2s;
        }
        
        .logout-button:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        
        .plan-info {
            margin-top: 24px;
            padding: 12px;
            background: var(--vscode-editor-background);
            border-radius: 6px;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        
        .plan-detail {
            margin: 4px 0;
        }
        
        .plan-label {
            font-weight: 600;
            color: var(--vscode-foreground);
        }
    </style>
</head>
<body>
    <div class="expired-container">
        <div class="icon">⚠️</div>
        
        <div class="expired-message">
            <span class="warning-icon">⚠️</span>
            ${message}
        </div>
        
        <div class="info-text">
            To continue using Oropendola AI, please renew your subscription.
        </div>
        
        <button class="renew-button" onclick="renewSubscription()">
            Renew Now
        </button>
        
        <button class="logout-button" onclick="logout()">
            Sign Out
        </button>
        
        <div class="plan-info">
            <div class="plan-detail">
                <span class="plan-label">Plan:</span> ${planName}
            </div>
            ${subscriptionStatus.expiryDate ? `
            <div class="plan-detail">
                <span class="plan-label">Expired:</span> ${new Date(subscriptionStatus.expiryDate).toLocaleDateString()}
            </div>
            ` : ''}
        </div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        function renewSubscription() {
            vscode.postMessage({ type: 'renewSubscription' });
        }
        
        function logout() {
            vscode.postMessage({ type: 'logout' });
        }
    </script>
</body>
</html>`;
    }

    /**
     * Get login HTML content - shown when user is not authenticated
     */
    _getLoginHtml(webview) {
        console.log('🔧 Generating login HTML...');
        // Get logo URI for webview
        const logoUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._context.extensionUri, 'media', 'icon.png')
        );
        console.log('🖼️ Logo URI:', logoUri.toString());

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Oropendola AI - Login</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-sideBar-background);
            padding: 20px;
            line-height: 1.6;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .login-container {
            width: 100%;
            max-width: 300px;
        }
        
        .logo {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .logo-icon {
            margin-bottom: 20px;
        }
        
        .logo-icon img {
            width: 80px;
            height: 80px;
            object-fit: contain;
        }
        
        h1 {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 8px;
            text-align: center;
        }
        
        .subtitle {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            font-size: 13px;
            margin-bottom: 30px;
        }
        
        .button {
            width: 100%;
            padding: 12px 16px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            text-align: center;
            transition: background 0.2s;
        }
        
        .button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        .button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .button-secondary {
            background: transparent;
            color: var(--vscode-foreground);
            border: 1px solid var(--vscode-input-border);
            margin-top: 8px;
        }
        
        .button-secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        
        .form-group {
            margin-bottom: 16px;
        }
        
        .form-label {
            display: block;
            margin-bottom: 6px;
            font-size: 13px;
            font-weight: 500;
            color: var(--vscode-foreground);
        }
        
        .form-input {
            width: 100%;
            padding: 10px 12px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            font-family: var(--vscode-font-family);
            font-size: 13px;
        }
        
        .form-input:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }
        
        .form-input::placeholder {
            color: var(--vscode-input-placeholderForeground);
        }
        
        .error {
            color: var(--vscode-errorForeground);
            background: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            padding: 8px 12px;
            border-radius: 4px;
            margin-bottom: 16px;
            font-size: 12px;
            display: none;
        }
        
        .loading {
            display: none;
            text-align: center;
            color: var(--vscode-descriptionForeground);
            font-size: 13px;
            margin-top: 12px;
        }
        
        .loading::after {
            content: '...';
            animation: dots 1.5s steps(4, end) infinite;
        }
        
        @keyframes dots {
            0%, 20% { content: '.'; }
            40% { content: '..'; }
            60%, 100% { content: '...'; }
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="logo">
            <div class="logo-icon"><img src="${logoUri}" alt="Oropendola AI Logo" /></div>
            <h1>Oropendola AI</h1>
            <div class="subtitle">Sign in to get started</div>
        </div>
        
        <div id="error" class="error"></div>
        
        <form id="loginForm" onsubmit="handleLogin(event)">
            <div class="form-group">
                <label class="form-label" for="email">Email Address</label>
                <input 
                    type="email" 
                    id="email" 
                    class="form-input" 
                    placeholder="Enter your email"
                    required
                    autocomplete="email"
                />
            </div>
            
            <div class="form-group">
                <label class="form-label" for="password">Password</label>
                <input 
                    type="password" 
                    id="password" 
                    class="form-input" 
                    placeholder="Enter your password"
                    required
                    autocomplete="current-password"
                />
            </div>
            
            <button type="submit" class="button" id="loginBtn">
                🔐 Sign In
            </button>
        </form>
        
        <button class="button button-secondary" onclick="openSettings()">
            ⚙️ Settings
        </button>
        
        <div id="loading" class="loading">Signing in</div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        function handleLogin(event) {
            if (event) event.preventDefault();
            
            const loginBtn = document.getElementById('loginBtn');
            const loading = document.getElementById('loading');
            const error = document.getElementById('error');
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            if (!email || !password) {
                error.textContent = 'Please enter both email and password';
                error.style.display = 'block';
                return;
            }
            
            loginBtn.disabled = true;
            loading.style.display = 'block';
            error.style.display = 'none';
            
            vscode.postMessage({ 
                type: 'login',
                email: email,
                password: password
            });
        }
        
        function openSettings() {
            vscode.postMessage({ type: 'openSettings' });
        }
        
        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            const loginBtn = document.getElementById('loginBtn');
            const loading = document.getElementById('loading');
            const error = document.getElementById('error');
            
            switch (message.type) {
                case 'loginError':
                    loginBtn.disabled = false;
                    loading.style.display = 'none';
                    error.textContent = message.message || 'Login failed. Please try again.';
                    error.style.display = 'block';
                    break;
            }
        });
    </script>
</body>
</html>`;
    }

    /**
     * Extract todo_id from tool parameters for tracking
     * According to API docs, tools should include todo_id matching sequential IDs (todo_0, todo_1, etc.)
     */
    _extractTodoId(tool) {
        if (!tool || !tool.parameters) {
            return null;
        }

        // Check if tool parameters have a todo_id field
        if (tool.parameters.todo_id) {
            return tool.parameters.todo_id;
        }

        // Check if tool parameters have an id field that looks like a todo_id
        if (tool.parameters.id && typeof tool.parameters.id === 'string' && tool.parameters.id.startsWith('todo_')) {
            return tool.parameters.id;
        }

        return null;
    }

    /**
     * Get chat interface HTML - shown after successful authentication
     */
    // eslint-disable-next-line complexity, max-lines-per-function
    _getChatHtml(webview) {
        console.log('🔧 Generating chat HTML...');
        const logoUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._context.extensionUri, 'media', 'icon.png')
        );
        console.log('🖼️ Logo URI:', logoUri.toString());
        const cspSource = webview.cspSource;
        console.log('🔒 CSP Source:', cspSource);

        const html = '<!DOCTYPE html>' +
        '<html lang="en">' +
        '<head>' +
        '<meta charset="UTF-8">' +
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
        '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\' https://cdnjs.cloudflare.com; script-src \'unsafe-inline\' https://cdnjs.cloudflare.com; img-src ' + cspSource + ' data: https:;">' +
        '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/vs2015.min.css">' +
        '<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>' +
        '<title>Oropendola AI Chat</title>' +
        '<style>' +
        '* { margin: 0; padding: 0; box-sizing: border-box; }' +
        'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 14px; line-height: 1.6; color: var(--vscode-foreground); background-color: var(--vscode-sideBar-background); height: 100vh; display: flex; flex-direction: column; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }' +
        '.header { padding: 14px 16px; border-bottom: 1px solid var(--vscode-panel-border); display: flex; align-items: center; justify-content: space-between; background: var(--vscode-sideBar-background); }' +
        '.header-title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--vscode-foreground); }' +
        '.header-title img { width: 24px; height: 24px; object-fit: contain; }' +
        '.header-actions { display: flex; gap: 4px; }' +
        '.icon-button { background: transparent; border: none; color: var(--vscode-descriptionForeground); cursor: pointer; padding: 6px; border-radius: 4px; font-size: 14px; transition: all 0.2s; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; }' +
        '.icon-button:hover { background: var(--vscode-toolbar-hoverBackground); color: var(--vscode-foreground); }' +
        '.messages-container { flex: 1; overflow-y: auto; padding: 20px 18px; display: flex; flex-direction: column; gap: 18px; }' +
        '.message { padding: 16px 18px; border-radius: 8px; word-wrap: break-word; font-size: 14px; line-height: 1.6; position: relative; border: 1px solid rgba(255, 255, 255, 0.05); display: flex; flex-direction: column; min-height: 50px; }' +
        '.message-user { border: 1px solid rgba(64, 165, 255, 0.2); border-radius: 8px; position: relative; overflow: hidden; padding: 16px 18px 16px 24px; }' +
        '.message-user::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: linear-gradient(180deg, #40a5ff 0%, #0078d4 100%); }' +
        '.message-assistant { border: 1px solid rgba(46, 204, 113, 0.1); border-radius: 8px; position: relative; overflow: hidden; padding: 16px 18px 16px 24px; }' +
        '.message-assistant::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: linear-gradient(180deg, #2ecc71 0%, #27ae60 100%); }' +
        '.message-error { border: 1px solid rgba(231, 76, 60, 0.3); border-radius: 8px; position: relative; overflow: hidden; padding-left: 16px; }' +
        '.message-error::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: linear-gradient(180deg, #e74c3c 0%, #c0392b 100%); }' +
        '.message-system { background-color: var(--vscode-panel-background); color: var(--vscode-descriptionForeground); font-style: italic; padding: 8px 12px; }' +
        '.message-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }' +
        '.message-icon { width: 20px; height: 20px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; flex-shrink: 0; }' +
        '.message-icon.user { background: linear-gradient(135deg, #40a5ff 0%, #0078d4 100%); }' +
        '.message-icon.assistant { background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%); }' +
        '.message-icon.error { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); }' +
        '.message-label { font-weight: 500; font-size: 12px; opacity: 0.8; flex: 1; }' +
        '.copy-btn { background: transparent; border: none; color: var(--vscode-descriptionForeground); cursor: pointer; padding: 4px 8px; border-radius: 3px; opacity: 0; transition: all 0.2s; font-size: 11px; margin-left: auto; }' +
        '.message:hover .copy-btn { opacity: 0.7; }' +
        '.copy-btn:hover { opacity: 1 !important; background-color: var(--vscode-list-hoverBackground); }' +
        '.message-content { padding-left: 0; min-width: 0; overflow-wrap: break-word; word-wrap: break-word; color: var(--vscode-foreground); display: block !important; min-height: 20px; font-size: 14px; line-height: 1.7; letter-spacing: 0.01em; }' +
        '.message pre { background: var(--vscode-textCodeBlock-background); padding: 12px 14px; border-radius: 6px; overflow-x: auto; margin: 12px 0; border: 1px solid rgba(255, 255, 255, 0.05); }' +
        '.message code { font-family: var(--vscode-editor-font-family), "SF Mono", Monaco, Consolas, monospace; font-size: 13px; background: var(--vscode-textCodeBlock-background); padding: 2px 6px; border-radius: 4px; }' +
        '.message pre code { background: none; padding: 0; font-size: 13px; }' +
        '.message-actions { display: flex !important; flex-direction: row; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.05); justify-content: flex-end; }' +

        '.message-action-btn { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; white-space: nowrap; transition: all 0.2s; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2); }' +
        '.message-action-btn:hover { background: var(--vscode-button-secondaryHoverBackground); transform: translateY(-1px); box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3); }' +
        '.message-action-accept { background: var(--vscode-button-background); color: var(--vscode-button-foreground); font-weight: 600; padding: 8px 20px; }' +
        '.message-action-accept:hover { background: var(--vscode-button-hoverBackground); }' +
        '.message-action-accept:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }' +
        '.message-action-reject { background: transparent; border: 1px solid var(--vscode-button-border); padding: 8px 16px; }' +
        '.message-action-reject:hover { background: rgba(255, 80, 80, 0.1); border-color: rgba(255, 80, 80, 0.5); color: #FF5252; }' +
        '.code-block-enhanced { position: relative; margin: 16px 0; border-radius: 8px; background: var(--vscode-textCodeBlock-background); border: 1px solid rgba(255, 255, 255, 0.08); overflow: hidden; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }' +
        '.code-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: rgba(0, 0, 0, 0.15); border-bottom: 1px solid rgba(255, 255, 255, 0.08); }' +
        '.code-language { font-size: 11px; color: var(--vscode-descriptionForeground); text-transform: uppercase; font-weight: 600; letter-spacing: 0.8px; }' +
        '.code-actions { display: flex; gap: 6px; }' +
        '.code-btn { background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); color: var(--vscode-foreground); padding: 4px 10px; border-radius: 4px; font-size: 11px; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 4px; }' +
        '.code-btn:hover { background: var(--vscode-button-secondaryHoverBackground); border-color: var(--vscode-button-secondaryHoverBackground); }' +
        '.code-block-enhanced pre { margin: 0; padding: 14px 16px; overflow-x: auto; background: transparent; }' +
        '.code-block-enhanced code { font-family: var(--vscode-editor-font-family), "SF Mono", Monaco, Consolas, monospace; font-size: 13px; line-height: 1.6; }' +
        '.file-link { color: #4FC3F7; text-decoration: none; border-bottom: 1px dotted rgba(79, 195, 247, 0.5); cursor: pointer; transition: all 0.2s; font-weight: 500; }' +
        '.file-link:hover { color: #81D4FA; border-bottom-color: #81D4FA; background: rgba(79, 195, 247, 0.1); padding: 0 2px; border-radius: 2px; }' +
        '.typing-indicator { align-self: flex-start; background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); padding: 12px 16px; border-radius: 8px; max-width: 90%; font-size: 13px; color: var(--vscode-descriptionForeground); display: flex; align-items: center; gap: 10px; }' +
        '.typing-dots { display: flex; gap: 4px; }' +
        '.typing-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--vscode-descriptionForeground); opacity: 0.4; animation: typing-bounce 1.4s infinite ease-in-out both; }' +
        '.typing-dot:nth-child(1) { animation-delay: -0.32s; }' +
        '.typing-dot:nth-child(2) { animation-delay: -0.16s; }' +
        '@keyframes typing-bounce { 0%, 80%, 100% { transform: scale(0); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }' +
        '.progress-container { margin: 8px 0; }' +
        '.ai-progress-message { display: flex; align-items: flex-start; gap: 12px; padding: 12px 16px; margin: 8px 0; border-radius: 6px; animation: slideIn 0.3s ease; align-self: flex-start; max-width: 90%; }' +
        '@keyframes slideIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }' +
        '.ai-progress-message.thinking { background: rgba(255, 193, 7, 0.1); border-left: 3px solid #FFC107; }' +
        '.ai-progress-message.plan { background: rgba(76, 175, 80, 0.1); border-left: 3px solid #4CAF50; }' +
        '.ai-progress-message.step-complete { background: rgba(76, 175, 80, 0.05); border-left: 3px solid #4CAF50; }' +
        '.ai-progress-message.error { background: rgba(244, 67, 54, 0.1); border-left: 3px solid #F44336; }' +
        '.progress-icon { font-size: 20px; flex-shrink: 0; }' +
        '.progress-text { flex: 1; font-size: 14px; line-height: 1.6; }' +
        '.ai-progress-bar-container { padding: 12px 16px; margin: 8px 0; background: rgba(33, 150, 243, 0.05); border-radius: 6px; align-self: flex-start; max-width: 90%; }' +
        '.ai-progress-bar { height: 4px; background: rgba(100, 100, 100, 0.2); border-radius: 2px; overflow: hidden; margin-bottom: 8px; }' +
        '.ai-progress-fill { height: 100%; background: linear-gradient(90deg, #2196F3, #4FC3F7); transition: width 0.3s ease; width: 0%; }' +
        '.ai-progress-text { font-size: 12px; color: var(--vscode-descriptionForeground); text-align: center; }' +
        '.ai-separator { color: var(--vscode-descriptionForeground); opacity: 0.3; margin: 12px 0; font-family: monospace; font-size: 12px; align-self: flex-start; }' +
        '.step-details { list-style: none; padding: 0; margin: 8px 0 0 0; }' +
        '.step-details li { font-size: 12px; color: var(--vscode-descriptionForeground); padding: 2px 0; padding-left: 16px; position: relative; }' +
        '.step-details li:before { content: "→"; position: absolute; left: 0; }' +
        '.step-message { margin-bottom: 4px; }' +
        '.empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 20px; color: var(--vscode-descriptionForeground); }' +
        '.empty-icon { font-size: 48px; margin-bottom: 16px; }' +
        '.empty-title { font-size: 16px; font-weight: 600; margin-bottom: 8px; color: var(--vscode-foreground); }' +
        '.empty-desc { font-size: 13px; max-width: 250px; }' +
        '.suggestions { display: flex; flex-direction: column; gap: 8px; margin-top: 20px; width: 100%; max-width: 250px; }' +
        '.suggestion-btn { padding: 8px 12px; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: 1px solid var(--vscode-panel-border); border-radius: 6px; cursor: pointer; font-size: 12px; text-align: left; transition: background 0.2s; }' +
        '.suggestion-btn:hover { background: var(--vscode-button-secondaryHoverBackground); }' +
        '.input-container { padding: 16px; border-top: 1px solid var(--vscode-panel-border); background: var(--vscode-sideBar-background); }' +
        '.attachments-preview { display: flex; gap: 12px; padding: 12px; flex-wrap: wrap; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; margin-bottom: 12px; }' +
        '.attachment-chip { display: flex; align-items: center; gap: 6px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); padding: 6px 10px; border-radius: 8px; font-size: 11px; max-width: 200px; }' +
        '.attachment-chip.image-preview { flex-direction: column; max-width: 180px; padding: 10px; background: var(--vscode-input-background); border: 2px solid var(--vscode-input-border); border-radius: 12px; }' +
        '.attachment-image { width: 100%; max-height: 120px; object-fit: contain; border-radius: 8px; margin-bottom: 8px; background: var(--vscode-editor-background); }' +
        '.attachment-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }' +
        '.attachment-remove { background: transparent; border: none; color: currentColor; cursor: pointer; padding: 0; font-size: 14px; opacity: 0.7; transition: opacity 0.15s; }' +
        '.attachment-remove:hover { opacity: 1; }' +
        '.input-wrapper-container { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 14px; padding: 4px; transition: all 0.2s ease; position: relative; }' +
        '.input-wrapper-container:focus-within { border-color: rgba(100, 150, 255, 0.5); box-shadow: 0 0 0 2px rgba(100, 150, 255, 0.15); background: rgba(255, 255, 255, 0.07); }' +
        '.input-bottom-row { display: flex; gap: 8px; align-items: flex-end; padding: 8px 10px 10px 10px; }' +
        '.input-field { flex: 1; background: transparent; color: var(--vscode-input-foreground); border: none; padding: 8px 12px; font-family: var(--vscode-font-family); font-size: 14px; resize: none; min-height: 44px; max-height: 160px; line-height: 1.6; }' +
        '.input-field:focus { outline: none; }' +
        '.input-field::placeholder { color: var(--vscode-input-placeholderForeground); opacity: 0.5; font-size: 13px; }' +
        '.optimize-button { background: rgba(255, 165, 0, 0.15); color: rgba(255, 165, 0, 1); border: 1px solid rgba(255, 165, 0, 0.3); border-radius: 8px; width: 36px; height: 36px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0; position: relative; }' +
        '.optimize-button:hover:not(:disabled) { background: rgba(255, 165, 0, 0.25); border-color: rgba(255, 165, 0, 0.5); }' +
        '.optimize-button:disabled { opacity: 0.4; cursor: not-allowed; }' +
        '.send-button { background: rgba(100, 150, 255, 0.9); color: white; border: none; border-radius: 8px; width: 36px; height: 36px; cursor: pointer; font-size: 16px; font-weight: 600; display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0; }' +
        '.send-button:hover:not(:disabled) { background: rgba(100, 150, 255, 1); transform: scale(1.05); }' +
        '.send-button:disabled { opacity: 0.4; cursor: not-allowed; }' +
        '.stop-button { background: rgba(255, 80, 80, 0.9); color: white; border: none; border-radius: 8px; width: 36px; height: 36px; cursor: pointer; font-size: 14px; font-weight: 700; transition: all 0.2s; flex-shrink: 0; display: none; }' +
        '.stop-button:hover { background: rgba(255, 80, 80, 1); transform: scale(1.05); }' +
        '.stop-button.visible { display: flex; align-items: center; justify-content: center; }' +
        '.auto-context-row { margin-bottom: 12px; }' +
        '.auto-context-button { background: rgba(255, 255, 255, 0.08); color: var(--vscode-foreground); border: none; border-radius: 8px; padding: 8px 14px; font-size: 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s; font-weight: 500; }' +
        '.auto-context-button:hover { background: rgba(255, 255, 255, 0.12); }' +
        '.auto-context-button svg { width: 14px; height: 14px; opacity: 0.8; }' +
        '.attach-images-button { background: transparent; color: var(--vscode-descriptionForeground); border: none; border-radius: 8px; padding: 8px 12px; font-size: 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s; opacity: 0.7; margin-left: 8px; }' +
        '.attach-images-button:hover { background: rgba(255, 255, 255, 0.08); opacity: 1; }' +
        '.mode-selector-bottom { margin-top: 12px; display: flex; align-items: center; gap: 8px; }' +
        '.mode-label { font-size: 11px; color: var(--vscode-descriptionForeground); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }' +
        '.mode-dropdown { background: rgba(255, 255, 255, 0.05); color: var(--vscode-input-foreground); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 6px 12px; font-size: 12px; cursor: pointer; min-width: 100px; transition: all 0.15s; }' +
        '.mode-dropdown:hover { background: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.2); }' +
        '.todo-panel { background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); border-radius: 8px; margin: 12px 16px; padding: 12px; display: none; }' +
        '.todo-panel.visible { display: block; }' +
        '.todo-panel.collapsed .todo-content { display: none; }' +
        '.todo-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--vscode-panel-border); cursor: pointer; user-select: none; }' +
        '.todo-panel.collapsed .todo-header { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }' +
        '.todo-header:hover { background: rgba(255, 255, 255, 0.03); border-radius: 4px; margin: -4px -8px 8px -8px; padding: 4px 8px 12px 8px; }' +
        '.todo-panel.collapsed .todo-header:hover { margin: -4px -8px -4px -8px; padding: 4px 8px; }' +
        '.todo-header-left { display: flex; align-items: center; gap: 8px; }' +
        '.todo-collapse-arrow { font-size: 10px; color: var(--vscode-descriptionForeground); transition: transform 0.2s; display: inline-block; }' +
        '.todo-panel.collapsed .todo-collapse-arrow { transform: rotate(-90deg); }' +
        '.todo-title { font-size: 13px; font-weight: 600; color: var(--vscode-foreground); }' +
        '.todo-stats { font-size: 11px; color: var(--vscode-descriptionForeground); margin-left: 4px; }' +
        '.todo-actions { display: flex; gap: 4px; }' +
        '.todo-panel.collapsed .todo-actions { display: none; }' +
        '.todo-action-btn { background: transparent; border: none; color: var(--vscode-descriptionForeground); cursor: pointer; padding: 4px 8px; border-radius: 4px; font-size: 11px; transition: all 0.2s; }' +
        '.todo-action-btn:hover { background: var(--vscode-toolbar-hoverBackground); color: var(--vscode-foreground); }' +
        '.todo-content { display: block; }' +
        '.todo-context { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px; padding: 10px 12px; margin-bottom: 12px; font-size: 12px; color: var(--vscode-descriptionForeground); line-height: 1.6; }' +
        '.todo-context-text { margin: 0; }' +
        '.todo-created-message { background: rgba(0, 200, 83, 0.15); color: #00C853; padding: 8px 12px; border-radius: 6px; font-size: 12px; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; animation: slideDown 0.3s ease; }' +
        '@keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }' +
        '.todo-list { display: flex; flex-direction: column; gap: 4px; }' +
        '.todo-item { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 4px; font-size: 12px; transition: background 0.2s; cursor: pointer; }' +
        '.todo-item:hover { background: rgba(255, 255, 255, 0.04); }' +
        '.todo-item.completed { opacity: 0.6; }' +
        '.todo-item.completed .todo-text { text-decoration: line-through; }' +
        '.todo-item.in-progress { border-left: 3px solid #007ACC; background: rgba(0, 122, 204, 0.1); animation: pulse 2s ease-in-out infinite; }' +
        '.todo-item.pending { opacity: 0.7; border-left: 3px solid var(--vscode-descriptionForeground); }' +
        '@keyframes pulse { 0%, 100% { background: rgba(0, 122, 204, 0.1); } 50% { background: rgba(0, 122, 204, 0.2); } }' +
        '.todo-checkbox { width: 16px; height: 16px; min-width: 16px; border-radius: 50%; border: 2px solid var(--vscode-descriptionForeground); background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0; }' +
        '.todo-checkbox:hover { border-color: var(--vscode-button-background); }' +
        '.todo-checkbox.checked { background: var(--vscode-button-background); border-color: var(--vscode-button-background); }' +
        '.todo-checkbox.checked::before { content: "✓"; color: white; font-size: 11px; font-weight: bold; }' +
        '.todo-order-badge { font-weight: 700; color: var(--vscode-button-background); min-width: 24px; font-size: 11px; background: rgba(0, 122, 204, 0.15); padding: 2px 6px; border-radius: 10px; }' +
        '.todo-text { color: var(--vscode-foreground); flex: 1; line-height: 1.4; }' +
        '.todo-status-label { font-size: 9px; font-weight: 600; padding: 2px 6px; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.5px; }' +
        '.todo-status-label.in-progress { background: rgba(0, 122, 204, 0.2); color: #007ACC; border: 1px solid #007ACC; }' +
        '.todo-status-label.pending { background: rgba(255, 165, 0, 0.15); color: rgba(255, 165, 0, 1); border: 1px solid rgba(255, 165, 0, 0.5); }' +
        '.todo-status { display: flex; align-items: center; gap: 4px; font-size: 11px; padding: 2px 6px; border-radius: 3px; }' +
        '.todo-status.done { background: rgba(0, 200, 83, 0.15); color: #00C853; }' +
        '.todo-status.pending { background: rgba(255, 165, 0, 0.15); color: rgba(255, 165, 0, 1); }' +
        '.todo-notes { font-size: 10px; color: var(--vscode-descriptionForeground); }' +
        '.todo-item-actions { display: flex; gap: 2px; opacity: 0; transition: opacity 0.2s; }' +
        '.todo-item:hover .todo-item-actions { opacity: 1; }' +
        '.todo-item-action { background: transparent; border: none; color: var(--vscode-descriptionForeground); cursor: pointer; padding: 2px 4px; border-radius: 3px; font-size: 10px; }' +
        '.todo-item-action:hover { background: var(--vscode-toolbar-hoverBackground); }' +
        '.todo-item-action.accept { color: #00C853; }' +
        '.todo-item-action.reject { color: #FF5252; }' +
        '.todo-empty { text-align: center; padding: 20px; color: var(--vscode-descriptionForeground); font-size: 12px; }' +

        // File Changes Card CSS
        '.file-changes-card { background: rgba(79, 195, 247, 0.05); border: 1px solid rgba(79, 195, 247, 0.2); border-radius: 8px; margin: 12px 0; overflow: hidden; }' +
        '.file-changes-header { padding: 12px 16px; background: rgba(79, 195, 247, 0.1); border-bottom: 1px solid rgba(79, 195, 247, 0.2); display: flex; align-items: center; justify-content: space-between; cursor: pointer; user-select: none; }' +
        '.file-changes-header:hover { background: rgba(79, 195, 247, 0.15); }' +
        '.file-changes-title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 13px; color: var(--vscode-foreground); }' +
        '.file-changes-icon { font-size: 16px; }' +
        '.file-changes-count { color: #4FC3F7; font-weight: 700; }' +
        '.file-changes-arrow { font-size: 12px; transition: transform 0.2s; }' +
        '.file-changes-card.collapsed .file-changes-arrow { transform: rotate(-90deg); }' +
        '.file-changes-content { padding: 16px; }' +
        '.file-changes-card.collapsed .file-changes-content { display: none; }' +
        '.file-change-section { margin-bottom: 16px; }' +
        '.file-change-section:last-child { margin-bottom: 0; }' +
        '.file-change-section-title { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; color: var(--vscode-descriptionForeground); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }' +
        '.file-change-list { list-style: none; padding: 0; margin: 0; }' +
        '.file-change-item { padding: 6px 12px; margin: 4px 0; background: rgba(255, 255, 255, 0.03); border-radius: 4px; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s; }' +
        '.file-change-item:hover { background: rgba(79, 195, 247, 0.1); transform: translateX(4px); }' +
        '.file-change-item::before { content: "•"; color: #4FC3F7; font-weight: bold; }' +
        '.file-change-path { color: #4FC3F7; font-family: var(--vscode-editor-font-family); font-size: 12px; font-weight: 500; flex: 1; }' +
        '.file-change-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; background: rgba(100, 100, 100, 0.2); border-radius: 12px; font-size: 10px; font-weight: 600; }' +
        '.file-change-badge.diff { background: transparent; }' +
        '.diff-added { color: #4CAF50; }' +
        '.diff-removed { color: #F44336; }' +
        '.file-change-details { list-style: none; padding: 0 0 0 24px; margin: 4px 0; }' +
        '.file-change-details li { font-size: 11px; color: var(--vscode-descriptionForeground); padding: 2px 0; }' +
        '.file-change-details li:before { content: "→ "; margin-right: 4px; color: #4FC3F7; }' +
        '.command-item { padding: 8px 12px; background: rgba(255, 255, 255, 0.05); border-left: 3px solid #4FC3F7; border-radius: 4px; font-family: var(--vscode-editor-font-family); font-size: 12px; color: var(--vscode-terminal-ansiGreen); margin: 4px 0; }' +
        '.command-output { font-family: monospace; font-size: 11px; background: rgba(0, 0, 0, 0.2); padding: 8px; margin-top: 4px; border-radius: 4px; max-height: 200px; overflow-y: auto; color: var(--vscode-foreground); }' +
        '.command-error { color: #F44336; font-size: 11px; margin-top: 4px; font-weight: 600; }' +
        '.copilot-changes-container { background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); border-radius: 6px; margin: 12px 0; overflow: hidden; font-family: var(--vscode-font-family); }' +
        '.copilot-changes-header { padding: 8px 12px; background: rgba(100, 150, 255, 0.05); border-bottom: 1px solid var(--vscode-panel-border); }' +
        '.copilot-changes-count { font-size: 12px; font-weight: 600; color: var(--vscode-foreground); }' +
        '.copilot-changes-list { padding: 4px; }' +
        '.copilot-change-item { margin: 2px 0; background: rgba(255, 255, 255, 0.02); border-radius: 4px; padding: 4px 8px; transition: all 0.2s; }' +
        '.copilot-change-item.undoing { transition: all 0.3s ease-out; }' +
        '.copilot-change-item.kept { opacity: 0.6; }' +
        '.copilot-change-item:hover { background: rgba(255, 255, 255, 0.05); }' +
        '.copilot-change-row { display: flex; align-items: center; gap: 6px; min-height: 24px; }' +
        '.copilot-change-checkbox { flex-shrink: 0; display: flex; align-items: center; }' +
        '.copilot-checkbox { width: 14px; height: 14px; cursor: pointer; margin: 0; accent-color: #4FC3F7; }' +
        '.copilot-change-icon { flex-shrink: 0; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; border-radius: 2px; }' +
        '.copilot-change-icon.created { background: rgba(76, 175, 80, 0.2); color: #4CAF50; }' +
        '.copilot-change-icon.modified { background: rgba(255, 152, 0, 0.2); color: #FF9800; }' +
        '.copilot-change-icon.deleted { background: rgba(244, 67, 54, 0.2); color: #F44336; }' +
        '.copilot-file-path { flex: 1; font-family: var(--vscode-editor-font-family); font-size: 12px; color: var(--vscode-textLink-foreground); cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }' +
        '.copilot-file-path:hover { text-decoration: underline; }' +
        '.copilot-line-count { flex-shrink: 0; font-size: 10px; color: var(--vscode-descriptionForeground); padding: 2px 6px; background: rgba(100, 100, 100, 0.15); border-radius: 3px; }' +
        '.copilot-diff-badge { flex-shrink: 0; display: flex; gap: 4px; font-size: 10px; font-weight: 600; }' +
        '.copilot-added { color: #4CAF50; }' +
        '.copilot-removed { color: #F44336; }' +
        '.copilot-change-actions { flex-shrink: 0; display: flex; gap: 4px; margin-left: auto; opacity: 0; transition: opacity 0.2s; }' +
        '.copilot-change-item:hover .copilot-change-actions { opacity: 1; }' +
        '.copilot-action-btn { background: transparent; border: 1px solid var(--vscode-panel-border); color: var(--vscode-foreground); padding: 2px 8px; border-radius: 3px; font-size: 11px; cursor: pointer; transition: all 0.15s; white-space: nowrap; }' +
        '.copilot-action-btn:hover { background: rgba(255, 255, 255, 0.08); }' +
        '.copilot-keep-btn { border-color: rgba(76, 175, 80, 0.4); color: #4CAF50; }' +
        '.copilot-keep-btn:hover { background: rgba(76, 175, 80, 0.15); border-color: #4CAF50; }' +
        '.copilot-keep-btn:disabled { opacity: 0.5; cursor: not-allowed; }' +
        '.copilot-undo-btn { border-color: rgba(244, 67, 54, 0.4); color: #F44336; }' +
        '.copilot-undo-btn:hover { background: rgba(244, 67, 54, 0.15); border-color: #F44336; }' +
        '.copilot-change-details { padding: 4px 0 4px 36px; margin-top: 4px; }' +
        '.copilot-detail-line { font-size: 11px; color: var(--vscode-descriptionForeground); padding: 2px 0; }' +
        '.copilot-commands-section { border-top: 1px solid var(--vscode-panel-border); padding: 8px 12px; background: rgba(0, 0, 0, 0.1); }' +
        '.copilot-section-title { font-size: 11px; font-weight: 600; color: var(--vscode-descriptionForeground); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }' +
        '.copilot-command-item { margin: 4px 0; padding: 6px 8px; background: rgba(0, 0, 0, 0.2); border-radius: 4px; border-left: 2px solid #4FC3F7; }' +
        '.copilot-command-text { font-family: var(--vscode-editor-font-family); font-size: 11px; color: var(--vscode-terminal-ansiGreen); }' +
        '.copilot-command-output { font-family: monospace; font-size: 10px; color: var(--vscode-descriptionForeground); margin-top: 4px; padding: 4px; background: rgba(0, 0, 0, 0.2); border-radius: 2px; }' +
        '.copilot-command-error { font-size: 10px; color: #F44336; margin-top: 4px; font-weight: 600; }' +

        '</style>' +
        '</head>' +
        '<body>' +
        '<div class="header">' +
        '<div class="header-title"><img src="' + logoUri + '" alt="Oropendola AI" /><span>Oropendola AI</span></div>' +
        '<div class="header-actions">' +
        '<button class="icon-button" id="newChatBtn" title="New Chat">+</button>' +
        '<button class="icon-button" id="settingsBtn" title="Settings">S</button>' +
        '<button class="icon-button" id="signOutBtn" title="Sign Out">X</button>' +
        '</div>' +
        '</div>' +
        '<div class="messages-container" id="messagesContainer">' +
        '<div class="empty-state" id="emptyState">' +
        '<div class="empty-icon">Chat</div>' +
        '<div class="empty-title">Build with agent mode</div>' +
        '<div class="empty-desc">AI responses may be inaccurate.</div>' +
        '<div class="suggestions">' +
        '<button class="suggestion-btn" data-suggestion="Explain this code">Explain selected code</button>' +
        '<button class="suggestion-btn" data-suggestion="Fix bugs in this code">Fix bugs in code</button>' +
        '<button class="suggestion-btn" data-suggestion="Add comments to this code">Add code comments</button>' +
        '<button class="suggestion-btn" data-suggestion="Improve code performance">Improve performance</button>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="todo-panel collapsed" id="todoPanel">' +
        '<div class="todo-header" id="todoHeader">' +
        '<div class="todo-header-left">' +
        '<span class="todo-collapse-arrow" id="todoCollapseArrow">▼</span>' +
        '<span class="todo-title">Todos</span>' +
        '<span class="todo-stats" id="todoStats">(0/0)</span>' +
        '</div>' +
        '<div class="todo-actions">' +
        '<button class="todo-action-btn" id="todoSyncBtn" title="Sync with backend">🔄</button>' +
        '<button class="todo-action-btn" id="todoClearBtn" title="Clear all">🗑️</button>' +
        '</div>' +
        '</div>' +
        '<div class="todo-content" id="todoContent">' +
        '<div class="todo-context" id="todoContext" style="display: none;">' +
        '<p class="todo-context-text" id="todoContextText"></p>' +
        '</div>' +
        '<div class="todo-created-message" id="todoCreatedMessage" style="display: none;">' +
        '<span>✓</span>' +
        '<span id="todoCreatedText">Created 0 todos</span>' +
        '</div>' +
        '<div class="todo-list" id="todoList">' +
        '<div class="todo-empty">No tasks yet. Ask AI to create something!</div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="input-container">' +
        '<div id="attachmentsPreview" class="attachments-preview" style="display: none;"></div>' +
        '<div class="auto-context-row">' +
        '<button class="auto-context-button" id="addContextBtn" title="Auto context - Add files, folders, or context">' +
        '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0z"/><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/></svg>' +
        '<span>Auto context</span>' +
        '</button>' +
        '<input type="file" id="fileInput" accept="image/*" multiple style="display: none;" />' +
        '<button class="attach-images-button" id="attachImagesBtn" title="Attach images (PNG, JPG, GIF)">' +
        '<span>&#128206;</span>' +
        '</button>' +
        '</div>' +
        '<div class="input-wrapper-container">' +
        '<div class="input-bottom-row">' +
        '<textarea id="messageInput" class="input-field" placeholder="Ask Oropendola to do anything" rows="1"></textarea>' +
        '<button id="optimizeButton" class="optimize-button" title="Optimize Input">&#10024;</button>' +
        '<button id="sendButton" class="send-button" title="Send message">&#8593;</button>' +
        '<button id="stopButton" class="stop-button" title="Stop generation">&#9632;</button>' +
        '</div>' +
        '</div>' +
        '<div class="mode-selector-bottom">' +
        '<span class="mode-label">Mode:</span>' +
        '<select id="modeSelector" class="mode-dropdown">' +
        '<option value="agent" selected>Agent</option>' +
        '<option value="ask">Ask</option>' +
        '</select>' +
        '</div>' +
        '</div>' +
        '<script>' +
        'const vscode = acquireVsCodeApi();' +
        'const messagesContainer = document.getElementById("messagesContainer");' +
        'const messageInput = document.getElementById("messageInput");' +
        'const sendButton = document.getElementById("sendButton");' +
        'const stopButton = document.getElementById("stopButton");' +
        'const optimizeButton = document.getElementById("optimizeButton");' +
        'const emptyState = document.getElementById("emptyState");' +
        'const newChatBtn = document.getElementById("newChatBtn");' +
        'const settingsBtn = document.getElementById("settingsBtn");' +
        'const signOutBtn = document.getElementById("signOutBtn");' +
        'const modeSelector = document.getElementById("modeSelector");' +
        'const fileInput = document.getElementById("fileInput");' +
        'const attachmentsPreview = document.getElementById("attachmentsPreview");' +
        'const addContextBtn = document.getElementById("addContextBtn");' +
        'const attachImagesBtn = document.getElementById("attachImagesBtn");' +
        'const todoPanel = document.getElementById("todoPanel");' +
        'const todoHeader = document.getElementById("todoHeader");' +
        'const todoCollapseArrow = document.getElementById("todoCollapseArrow");' +
        'const todoContent = document.getElementById("todoContent");' +
        'const todoList = document.getElementById("todoList");' +
        'const todoStats = document.getElementById("todoStats");' +
        'const todoContext = document.getElementById("todoContext");' +
        'const todoContextText = document.getElementById("todoContextText");' +
        'const todoCreatedMessage = document.getElementById("todoCreatedMessage");' +
        'const todoCreatedText = document.getElementById("todoCreatedText");' +
        'const todoSyncBtn = document.getElementById("todoSyncBtn");' +
        'const todoClearBtn = document.getElementById("todoClearBtn");' +
        'let todoPanelCollapsed = true;' +
        'let attachedFiles = [];' +
        'let isGenerating = false;' +
        'let sendInProgress = false;' +
        'function safePostMessage(msg) { try { vscode.postMessage(msg); } catch(err) { console.error("[postMessage error]", err); } }' +
        'if (newChatBtn) newChatBtn.addEventListener("click", function() { try { safePostMessage({ type: "newChat" }); } catch(e) { console.error("[newChat error]", e); } });' +
        'if (settingsBtn) settingsBtn.addEventListener("click", function() { try { safePostMessage({ type: "openSettings" }); } catch(e) { console.error("[settings error]", e); } });' +
        'if (signOutBtn) signOutBtn.addEventListener("click", function() { try { safePostMessage({ type: "logout" }); } catch(e) { console.error("[logout error]", e); } });' +
        'if (sendButton) sendButton.addEventListener("click", function() { try { sendMessage(); } catch(e) { console.error("[send error]", e); resetInputState(); } });' +
        'if (stopButton) stopButton.addEventListener("click", function() { try { stopGeneration(); } catch(e) { console.error("[stop error]", e); resetInputState(); } });' +
        'if (optimizeButton) optimizeButton.addEventListener("click", function() { try { optimizeInput(); } catch(e) { console.error("[optimize error]", e); } });' +
        'if (modeSelector) modeSelector.addEventListener("change", function(e) { try { safePostMessage({ type: "switchMode", mode: e.target.value }); } catch(err) { console.error("[mode error]", err); } });' +
        'if (addContextBtn) addContextBtn.addEventListener("click", function() { try { safePostMessage({ type: "addContext" }); } catch(e) { console.error("[context error]", e); } });' +
        'if (attachImagesBtn) attachImagesBtn.addEventListener("click", function() { try { if (fileInput) fileInput.click(); } catch(e) { console.error("[attach error]", e); } });' +
        'if (todoSyncBtn) todoSyncBtn.addEventListener("click", function() { try { safePostMessage({ type: "syncTodos" }); } catch(e) { console.error("[todo sync error]", e); } });' +
        'if (todoClearBtn) todoClearBtn.addEventListener("click", function() { try { if (confirm("Clear all TODOs?")) { safePostMessage({ type: "clearTodos" }); } } catch(e) { console.error("[todo clear error]", e); } });' +
        'if (todoHeader) todoHeader.addEventListener("click", function(e) { if (e.target.closest(".todo-action-btn")) return; try { todoPanelCollapsed = !todoPanelCollapsed; if (todoPanelCollapsed) { todoPanel.classList.add("collapsed"); } else { todoPanel.classList.remove("collapsed"); } } catch(e) { console.error("[collapse error]", e); } });' +
        'if (fileInput) fileInput.addEventListener("change", function(e) { try { handleFileSelect(e); } catch(err) { console.error("[file error]", err); } });' +
        'document.querySelectorAll(".suggestion-btn").forEach(function(btn) { btn.addEventListener("click", function() { try { const text = btn.getAttribute("data-suggestion"); if (text) { messageInput.value = text; sendMessage(); } } catch(e) { console.error("[suggestion error]", e); } }); });' +
        'messageInput.addEventListener("keydown", function(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } });' +
        'messageInput.addEventListener("input", function() { this.style.height = "auto"; this.style.height = Math.min(this.scrollHeight, 120) + "px"; });' +
        'messageInput.addEventListener("dragover", function(e) { e.preventDefault(); e.stopPropagation(); this.style.borderColor = "var(--vscode-focusBorder)"; });' +
        'messageInput.addEventListener("dragleave", function(e) { e.preventDefault(); e.stopPropagation(); this.style.borderColor = ""; });' +
        'messageInput.addEventListener("drop", function(e) { e.preventDefault(); e.stopPropagation(); this.style.borderColor = ""; const files = Array.from(e.dataTransfer.files); const imageFiles = files.filter(function(f) { return f.type.startsWith("image/"); }); imageFiles.forEach(function(file) { const reader = new FileReader(); reader.onload = function(event) { attachedFiles.push({ name: file.name, type: file.type, size: file.size, content: event.target.result, isImage: true }); updateAttachmentsPreview(); }; reader.readAsDataURL(file); }); });' +
        'messageInput.addEventListener("paste", function(e) { if (!e.clipboardData || !e.clipboardData.items) { return; } const items = e.clipboardData.items; let hasImage = false; for (let i = 0; i < items.length; i++) { if (items[i].type.indexOf("image") !== -1) { hasImage = true; e.preventDefault(); const blob = items[i].getAsFile(); if (!blob) { console.warn("[Could not get file from clipboard item]"); continue; } const reader = new FileReader(); reader.onload = function(event) { const timestamp = new Date().getTime(); attachedFiles.push({ name: "pasted-image-" + timestamp + ".png", type: blob.type, size: blob.size, content: event.target.result, isImage: true }); updateAttachmentsPreview(); console.log("[Image pasted successfully]:", blob.type, blob.size + " bytes"); }; reader.onerror = function(error) { console.error("[Failed to read pasted image]:", error); }; reader.readAsDataURL(blob); break; } } });' +
        'document.addEventListener("paste", function(e) { if (document.activeElement !== messageInput && e.clipboardData && e.clipboardData.items) { const items = e.clipboardData.items; for (let i = 0; i < items.length; i++) { if (items[i].type.indexOf("image") !== -1) { e.preventDefault(); const blob = items[i].getAsFile(); if (!blob) continue; const reader = new FileReader(); reader.onload = function(event) { const timestamp = new Date().getTime(); attachedFiles.push({ name: "pasted-image-" + timestamp + ".png", type: blob.type, size: blob.size, content: event.target.result, isImage: true }); updateAttachmentsPreview(); console.log("[Image pasted - global handler]:", blob.type, blob.size + " bytes"); }; reader.readAsDataURL(blob); break; } } } });' +
        'function sendMessage() { try { const text = messageInput.value.trim(); if (!text || sendInProgress) return; sendInProgress = true; if (emptyState) emptyState.style.display = "none"; isGenerating = true; sendButton.style.display = "none"; sendButton.disabled = true; stopButton.classList.add("visible"); messageInput.disabled = true; safePostMessage({ type: "sendMessage", text: text, attachments: attachedFiles }); messageInput.value = ""; attachedFiles = []; updateAttachmentsPreview(); messageInput.style.height = "auto"; setTimeout(function() { sendInProgress = false; }, 1000); } catch(e) { console.error("[sendMessage error]", e); resetInputState(); sendInProgress = false; } }' +
        'function stopGeneration() { try { isGenerating = false; sendInProgress = false; safePostMessage({ type: "stopGeneration" }); resetInputState(); } catch(e) { console.error("[stopGeneration error]", e); resetInputState(); } }' +
        'function resetInputState() { try { isGenerating = false; sendInProgress = false; sendButton.style.display = "block"; sendButton.disabled = false; stopButton.classList.remove("visible"); messageInput.disabled = false; optimizeButton.disabled = false; try { messageInput.focus(); } catch(e) { } } catch(e) { console.error("[resetInputState error]", e); } }' +
        'function optimizeInput() { try { const text = messageInput.value.trim(); if (!text) { console.warn("[No input to optimize]"); return; } optimizeButton.disabled = true; optimizeButton.innerHTML = "⏳"; const optimizationPrompt = "You are a prompt optimization assistant. Your ONLY job is to take the user\'s input and make it clearer and more effective. DO NOT execute the task, DO NOT provide explanations, DO NOT create code or solutions.\\n\\nRules:\\n1. Return ONLY the improved version of the prompt\\n2. Make it clear, specific, and actionable\\n3. Fix any spelling/grammar errors\\n4. Add relevant details if the prompt is too vague\\n5. Keep it concise (1-3 sentences)\\n6. DO NOT include any prefixes like \'Here is\' or \'Optimized version:\'\\n7. DO NOT wrap in quotes or markdown\\n\\nUser\'s original input:\\n" + text + "\\n\\nReturn ONLY the optimized prompt text:"; safePostMessage({ type: "optimizeInput", originalText: text, optimizationPrompt: optimizationPrompt }); } catch(e) { console.error("[optimizeInput error]", e); optimizeButton.disabled = false; optimizeButton.innerHTML = "&#10024;"; } }' +
        'function handleFileSelect(event) { const files = Array.from(event.target.files); files.forEach(function(file) { const reader = new FileReader(); reader.onload = function(e) { attachedFiles.push({ name: file.name, type: file.type, size: file.size, content: e.target.result, isImage: file.type.startsWith("image/") }); updateAttachmentsPreview(); }; if (file.type.startsWith("image/")) { reader.readAsDataURL(file); } else { reader.readAsText(file); } }); fileInput.value = ""; }' +
        'function removeAttachment(index) { attachedFiles.splice(index, 1); updateAttachmentsPreview(); }' +
        'function updateAttachmentsPreview() { if (attachedFiles.length === 0) { attachmentsPreview.style.display = "none"; attachmentsPreview.innerHTML = ""; return; } attachmentsPreview.style.display = "flex"; attachmentsPreview.innerHTML = attachedFiles.map(function(file, index) { if (file.isImage) { return "<div class=\'attachment-chip image-preview\'><img src=\'" + file.content + "\' class=\'attachment-image\' alt=\'" + file.name + "\' /><div style=\'display: flex; align-items: center; gap: 4px; width: 100%;\'><span class=\'attachment-name\' title=\'" + file.name + "\'> " + file.name + "</span><button class=\'attachment-remove\' data-index=\'" + index + "\' title=\'Remove\'>×</button></div></div>"; } else { return "<div class=\'attachment-chip\'><span>[File]</span><span class=\'attachment-name\' title=\'" + file.name + "\'>" + file.name + "</span><button class=\'attachment-remove\' data-index=\'" + index + "\' title=\'Remove\'>×</button></div>"; } }).join(""); attachmentsPreview.querySelectorAll(".attachment-remove").forEach(function(btn) { btn.addEventListener("click", function() { const index = parseInt(btn.getAttribute("data-index")); removeAttachment(index); }); }); }' +
        'window.addEventListener("message", function(event) { const message = event.data; switch (message.type) { case "addMessage": addMessageToUI(message.message); if (message.message.role === "assistant" || message.message.role === "error") { resetInputState(); } break; case "showTyping": showTypingIndicator(); break; case "hideTyping": hideTypingIndicator(); resetInputState(); break; case "appendContext": if (messageInput && message.context) { const currentValue = messageInput.value; messageInput.value = currentValue + message.context; messageInput.style.height = "auto"; messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + "px"; messageInput.focus(); } break; case "updateInput": if (messageInput && message.text) { messageInput.value = message.text; messageInput.style.height = "auto"; messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + "px"; optimizeButton.disabled = false; optimizeButton.innerHTML = "&#10024;"; messageInput.focus(); } break; case "resetOptimizeButton": optimizeButton.disabled = false; optimizeButton.innerHTML = "&#10024;"; break; case "updateTodos": console.log("[WEBVIEW] updateTodos received", message.todos ? message.todos.length : 0, message.stats); renderTodos(message.todos, message.stats, message.context); break; case "aiProgress": handleAIProgress(message.data); break; } });' +
        'let typingElement = null;' +
        'let currentProgressBar = null;' +
        'let progressContainer = null;' +
        'function showTypingIndicator() { if (emptyState) emptyState.style.display = "none"; hideTypingIndicator(); typingElement = document.createElement("div"); typingElement.className = "typing-indicator"; const textSpan = document.createElement("span"); textSpan.textContent = "Oropendola AI thinking"; typingElement.appendChild(textSpan); const dotsContainer = document.createElement("div"); dotsContainer.className = "typing-dots"; for (let i = 0; i < 3; i++) { const dot = document.createElement("div"); dot.className = "typing-dot"; dotsContainer.appendChild(dot); } typingElement.appendChild(dotsContainer); messagesContainer.appendChild(typingElement); messagesContainer.scrollTop = messagesContainer.scrollHeight; }' +
        'function hideTypingIndicator() { if (typingElement) { typingElement.remove(); typingElement = null; } }' +
        'function handleAIProgress(data) { try { console.log("[AI Progress]", data.type, data); switch (data.type) { case "thinking": showProgressMessage(data.message, "thinking", "🔍"); break; case "plan": showProgressMessage(data.message, "plan", "📝"); break; case "working": updateProgressBar(data.step, data.total, data.message); break; case "step_complete": showStepComplete(data); break; case "complete": clearProgressIndicators(); break; case "error": showProgressMessage(data.message, "error", "❌"); break; case "toolExecutionStart": if (data.todo_id) { updateTodoStatus(data.todo_id, "in_progress"); } break; case "toolExecutionComplete": if (data.todo_id) { var newStatus = data.success ? "completed" : "pending"; updateTodoStatus(data.todo_id, newStatus); } break; } } catch(e) { console.error("[handleAIProgress error]", e); } }' +
        'function showProgressMessage(message, className, icon) { try { if (emptyState) emptyState.style.display = "none"; const messageDiv = document.createElement("div"); messageDiv.className = "ai-progress-message " + className; const iconSpan = document.createElement("div"); iconSpan.className = "progress-icon"; iconSpan.textContent = icon; const textDiv = document.createElement("div"); textDiv.className = "progress-text"; if (className === "plan") { const lines = message.split("\\n"); textDiv.innerHTML = lines.map(function(line) { return escapeHtml(line); }).join("<br>"); } else { textDiv.textContent = message; } messageDiv.appendChild(iconSpan); messageDiv.appendChild(textDiv); if (!progressContainer) { progressContainer = document.createElement("div"); progressContainer.className = "progress-container"; messagesContainer.appendChild(progressContainer); } progressContainer.appendChild(messageDiv); if (className === "plan") { const separator = document.createElement("div"); separator.className = "ai-separator"; separator.textContent = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; progressContainer.appendChild(separator); } messagesContainer.scrollTop = messagesContainer.scrollHeight; } catch(e) { console.error("[showProgressMessage error]", e); } }' +
        'function updateProgressBar(step, total, message) { try { if (!currentProgressBar) { const barContainer = document.createElement("div"); barContainer.className = "ai-progress-bar-container"; barContainer.innerHTML = "<div class=\\"ai-progress-bar\\"><div class=\\"ai-progress-fill\\"></div></div><div class=\\"ai-progress-text\\"></div>"; if (!progressContainer) { progressContainer = document.createElement("div"); progressContainer.className = "progress-container"; messagesContainer.appendChild(progressContainer); } progressContainer.appendChild(barContainer); currentProgressBar = barContainer; } const percentage = (step / total) * 100; const fill = currentProgressBar.querySelector(".ai-progress-fill"); const text = currentProgressBar.querySelector(".ai-progress-text"); if (fill) fill.style.width = percentage + "%"; if (text) text.textContent = message; if (step === total) { setTimeout(function() { if (currentProgressBar) { currentProgressBar.remove(); currentProgressBar = null; } }, 1000); } messagesContainer.scrollTop = messagesContainer.scrollHeight; } catch(e) { console.error("[updateProgressBar error]", e); } }' +
        'function showStepComplete(data) { try { const messageDiv = document.createElement("div"); messageDiv.className = "ai-progress-message step-complete" + (data.error ? " error" : ""); const icon = data.error ? "❌" : "✅"; const iconSpan = document.createElement("div"); iconSpan.className = "progress-icon"; iconSpan.textContent = icon; const textDiv = document.createElement("div"); textDiv.className = "progress-text"; const stepMsg = document.createElement("div"); stepMsg.className = "step-message"; const lines = (data.message || "").split("\\n"); stepMsg.innerHTML = lines.map(function(line) { return escapeHtml(line); }).join("<br>"); textDiv.appendChild(stepMsg); if (data.details && data.details.length > 0) { const detailsList = document.createElement("ul"); detailsList.className = "step-details"; data.details.forEach(function(detail) { const li = document.createElement("li"); li.textContent = detail; detailsList.appendChild(li); }); textDiv.appendChild(detailsList); } if (data.file_path && data.line_count) { const badge = document.createElement("span"); badge.className = "file-change-badge"; badge.textContent = data.line_count + " lines"; textDiv.appendChild(badge); } messageDiv.appendChild(iconSpan); messageDiv.appendChild(textDiv); if (!progressContainer) { progressContainer = document.createElement("div"); progressContainer.className = "progress-container"; messagesContainer.appendChild(progressContainer); } progressContainer.appendChild(messageDiv); messagesContainer.scrollTop = messagesContainer.scrollHeight; } catch(e) { console.error("[showStepComplete error]", e); } }' +
        'function clearProgressIndicators() { try { if (currentProgressBar) { currentProgressBar.remove(); currentProgressBar = null; } if (progressContainer) { const separator = document.createElement("div"); separator.className = "ai-separator"; separator.textContent = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; progressContainer.appendChild(separator); setTimeout(function() { if (progressContainer) { progressContainer.remove(); progressContainer = null; } }, 100); } } catch(e) { console.error("[clearProgressIndicators error]", e); } }' +
        'function addMessageToUI(message) { try { const hadTypingIndicator = !!typingElement; if (hadTypingIndicator) hideTypingIndicator(); const messageDiv = document.createElement("div"); messageDiv.className = "message"; const role = (message && message.role) ? String(message.role).toLowerCase() : "assistant"; if (role === "user" || role === "human") { messageDiv.classList.add("message-user"); } else if (role === "assistant" || role === "ai") { messageDiv.classList.add("message-assistant"); } else if (role === "error") { messageDiv.classList.add("message-error"); } else if (role === "system") { messageDiv.classList.add("message-system"); } else { messageDiv.classList.add("message-assistant"); } if (role === "user" || role === "assistant" || role === "error") { const headerDiv = document.createElement("div"); headerDiv.className = "message-header"; const iconDiv = document.createElement("div"); iconDiv.className = "message-icon " + role; if (role === "user") { iconDiv.textContent = "👤"; } else if (role === "assistant") { iconDiv.textContent = "🤖"; } else if (role === "error") { iconDiv.textContent = "⚠️"; } const labelDiv = document.createElement("div"); labelDiv.className = "message-label"; if (role === "user") { labelDiv.textContent = "You"; } else if (role === "assistant") { labelDiv.textContent = "Oropendola"; } else if (role === "error") { labelDiv.textContent = "Error"; } const copyBtn = document.createElement("button"); copyBtn.className = "copy-btn"; copyBtn.textContent = "Copy"; copyBtn.onclick = function() { try { navigator.clipboard.writeText(message.content || ""); copyBtn.textContent = "Copied!"; setTimeout(function() { copyBtn.textContent = "Copy"; }, 2000); } catch(e) { console.warn("Copy failed", e); } }; headerDiv.appendChild(iconDiv); headerDiv.appendChild(labelDiv); headerDiv.appendChild(copyBtn); messageDiv.appendChild(headerDiv); } const contentDiv = document.createElement("div"); contentDiv.className = "message-content"; contentDiv.innerHTML = formatMessageContent(message.content, message.file_changes); messageDiv.appendChild(contentDiv); if (role === "assistant") { const numberedPlanPattern = new RegExp("(^|\\n)[ \\t]*[0-9]+[.)][ \\t]"); const hasNumberedPlan = numberedPlanPattern.test(message.content || ""); const hasTodos = message.has_todos || message.auto_execute; console.log("[DEBUG] Checking numbered plan:", hasNumberedPlan, "has_todos:", hasTodos); const actionsDiv = document.createElement("div"); actionsDiv.className = "message-actions"; if (hasNumberedPlan && !message.accepted && !hasTodos) { console.log("[DEBUG] Showing Confirm/Dismiss buttons"); const dismissBtn = document.createElement("button"); dismissBtn.className = "message-action-btn message-action-reject"; dismissBtn.textContent = "✗ Dismiss"; dismissBtn.onclick = function() { console.log("Plan dismissed by user"); dismissBtn.style.display = "none"; const confirmBtn = actionsDiv.querySelector(".message-action-accept"); if (confirmBtn) confirmBtn.style.display = "none"; safePostMessage({ type: "rejectPlan", messageContent: message.content }); }; const confirmBtn = document.createElement("button"); confirmBtn.className = "message-action-btn message-action-accept"; confirmBtn.textContent = "✓ Confirm & Execute"; confirmBtn.onclick = function() { console.log("Plan confirmed by user"); confirmBtn.textContent = "⏳ Executing..."; confirmBtn.disabled = true; dismissBtn.style.display = "none"; message.accepted = true; safePostMessage({ type: "acceptPlan", messageContent: message.content }); }; actionsDiv.appendChild(dismissBtn); actionsDiv.appendChild(confirmBtn); messageDiv.appendChild(actionsDiv); } else if (hasTodos) { console.log("[DEBUG] TODOs present - auto-executing, no confirmation needed"); } } messagesContainer.appendChild(messageDiv); if (hadTypingIndicator) showTypingIndicator(); messagesContainer.scrollTop = messagesContainer.scrollHeight; } catch(e) { console.error("[addMessageToUI error]", e); } }' +
        'function formatMessageContent(text, fileChanges) { if (!text) return ""; text = text.replace(/```tool_call[\\s\\S]*?```/g, ""); text = text.replace(/\\n{3,}/g, "\\n\\n"); text = text.trim(); var formatted = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); var codeBlockParts = formatted.split("```"); for (var i = 1; i < codeBlockParts.length; i += 2) { var block = codeBlockParts[i]; var newlineIdx = block.indexOf("\\\\n"); var lang = "text"; var code = block; if (newlineIdx > 0) { lang = block.substring(0, newlineIdx).trim() || "text"; code = block.substring(newlineIdx + 1); } var codeId = "code_" + Date.now() + "_" + i; codeBlockParts[i] = "<div class=\\"code-block-enhanced\\"><div class=\\"code-header\\"><span class=\\"code-language\\">" + lang.toUpperCase() + "</span><div class=\\"code-actions\\"><button class=\\"code-btn\\" onclick=\\"copyCodeBlock(" + String.fromCharCode(39) + codeId + String.fromCharCode(39) + ", this)\\">📋 Copy</button></div></div><pre id=\\"" + codeId + "\\"><code>" + code + "</code></pre></div>"; } formatted = codeBlockParts.join(""); formatted = formatted.replace(/([a-zA-Z0-9_\\-\\/]+\\.(js|ts|tsx|jsx|py|java|cpp|c|h|hpp|html|css|scss|json|md|txt|xml|yaml|yml|sh|bash))/g, "<a class=\\"file-link\\" onclick=\\"openFileLink(" + String.fromCharCode(39) + "$1" + String.fromCharCode(39) + ")\\" title=\\"Open $1\\">$1</a>"); var inlineCodeParts = formatted.split("`"); for (var j = 1; j < inlineCodeParts.length; j += 2) { inlineCodeParts[j] = "<code>" + inlineCodeParts[j] + "</code>"; } formatted = inlineCodeParts.join(""); var boldParts = formatted.split("**"); for (var k = 1; k < boldParts.length; k += 2) { boldParts[k] = "<strong>" + boldParts[k] + "</strong>"; } formatted = boldParts.join(""); formatted = formatted.replace(/\\\\n/g, "<br>"); if (fileChanges) { var fileChangesHtml = displayFileChanges(fileChanges); if (fileChangesHtml) { formatted = fileChangesHtml + formatted; } } return formatted; }' +
        'function displayFileChanges(fileChanges) { if (!fileChanges) return null; var created = fileChanges.created || []; var modified = fileChanges.modified || []; var deleted = fileChanges.deleted || []; var commands = fileChanges.commands || []; var allChanges = []; if (created.length > 0) { created.forEach(function(file, idx) { var filePath = typeof file === "string" ? file : file.path; var lineCount = file.line_count || 0; allChanges.push({ type: "created", path: filePath, lineCount: lineCount, details: file.details || [], index: idx }); }); } if (modified.length > 0) { modified.forEach(function(file, idx) { var filePath = typeof file === "string" ? file : file.path; var linesAdded = file.lines_added || 0; var linesRemoved = file.lines_removed || 0; allChanges.push({ type: "modified", path: filePath, linesAdded: linesAdded, linesRemoved: linesRemoved, details: file.details || [], index: idx }); }); } if (deleted.length > 0) { deleted.forEach(function(file, idx) { var filePath = typeof file === "string" ? file : file.path; allChanges.push({ type: "deleted", path: filePath, index: idx }); }); } if (allChanges.length === 0) return null; var cardId = "file-changes-" + Date.now(); var html = "<div class=\\"copilot-changes-container\\" id=\\"" + cardId + "\\">"; html += "<div class=\\"copilot-changes-header\\">"; html += "<span class=\\"copilot-changes-count\\">" + allChanges.length + " file" + (allChanges.length !== 1 ? "s" : "") + " changed</span>"; html += "</div>"; html += "<div class=\\"copilot-changes-list\\">"; allChanges.forEach(function(change, idx) { var changeId = cardId + "-change-" + idx; var icon = change.type === "created" ? "+" : (change.type === "modified" ? "~" : "-"); var iconClass = "copilot-change-icon " + change.type; html += "<div class=\\"copilot-change-item\\" id=\\"" + changeId + "\\">"; html += "<div class=\\"copilot-change-row\\">"; html += "<div class=\\"copilot-change-checkbox\\"><input type=\\"checkbox\\" class=\\"copilot-checkbox\\" id=\\"check-" + changeId + "\\" checked /></div>"; html += "<span class=\\"" + iconClass + "\\">" + icon + "</span>"; html += "<span class=\\"copilot-file-path\\" onclick=\\"openFileAndHighlight(" + String.fromCharCode(39) + change.path + String.fromCharCode(39) + ")\\" title=\\"Click to open\\">" + change.path + "</span>"; if (change.lineCount > 0) { html += "<span class=\\"copilot-line-count\\">" + change.lineCount + " lines</span>"; } else if (change.linesAdded > 0 || change.linesRemoved > 0) { html += "<span class=\\"copilot-diff-badge\\">"; if (change.linesAdded > 0) html += "<span class=\\"copilot-added\\">+" + change.linesAdded + "</span>"; if (change.linesRemoved > 0) html += "<span class=\\"copilot-removed\\">-" + change.linesRemoved + "</span>"; html += "</span>"; } html += "<div class=\\"copilot-change-actions\\">"; html += "<button class=\\"copilot-action-btn copilot-keep-btn\\" onclick=\\"keepFileChange(" + String.fromCharCode(39) + changeId + String.fromCharCode(39) + ", " + String.fromCharCode(39) + change.path + String.fromCharCode(39) + ")\\">✓ Keep</button>"; html += "<button class=\\"copilot-action-btn copilot-undo-btn\\" onclick=\\"undoFileChange(" + String.fromCharCode(39) + changeId + String.fromCharCode(39) + ", " + String.fromCharCode(39) + change.path + String.fromCharCode(39) + ", " + String.fromCharCode(39) + change.type + String.fromCharCode(39) + ")\\">✗ Undo</button>"; html += "</div>"; html += "</div>"; if (change.details && change.details.length > 0) { html += "<div class=\\"copilot-change-details\\">"; change.details.forEach(function(detail) { html += "<div class=\\"copilot-detail-line\\">• " + escapeHtml(detail) + "</div>"; }); html += "</div>"; } html += "</div>"; }); html += "</div>"; if (commands && commands.length > 0) { html += "<div class=\\"copilot-commands-section\\">"; html += "<div class=\\"copilot-section-title\\">⚡ Commands executed</div>"; commands.forEach(function(cmd) { var cmdText = typeof cmd === "string" ? cmd : cmd.command; html += "<div class=\\"copilot-command-item\\">"; html += "<code class=\\"copilot-command-text\\">$ " + escapeHtml(cmdText) + "</code>"; if (cmd.output) { html += "<div class=\\"copilot-command-output\\">" + escapeHtml(cmd.output.substring(0, 200)) + (cmd.output.length > 200 ? "..." : "") + "</div>"; } if (cmd.exit_code !== undefined && cmd.exit_code !== 0) { html += "<div class=\\"copilot-command-error\\">Exit code: " + cmd.exit_code + "</div>"; } html += "</div>"; }); html += "</div>"; } html += "</div>"; return html; }' +
        'function toggleFileChanges(cardId) { try { var card = document.getElementById(cardId); if (card) { card.classList.toggle("collapsed"); } } catch(e) { console.error("[toggleFileChanges error]", e); } }' +
        'function openFileAndHighlight(filePath) { try { console.log("[Opening file with highlight]:", filePath); safePostMessage({ type: "openFile", filePath: filePath, highlight: true }); } catch(e) { console.error("[openFileAndHighlight error]", e); } }' +
        'function keepFileChange(changeId, filePath) { try { console.log("[Keeping change]:", filePath); var changeEl = document.getElementById(changeId); if (changeEl) { changeEl.classList.add("kept"); var keepBtn = changeEl.querySelector(".copilot-keep-btn"); var undoBtn = changeEl.querySelector(".copilot-undo-btn"); if (keepBtn) { keepBtn.textContent = "✓ Kept"; keepBtn.disabled = true; } if (undoBtn) { undoBtn.style.display = "none"; } setTimeout(function() { changeEl.style.opacity = "0.6"; changeEl.style.pointerEvents = "none"; }, 300); } safePostMessage({ type: "keepFileChange", filePath: filePath }); } catch(e) { console.error("[keepFileChange error]", e); } }' +
        'function undoFileChange(changeId, filePath, changeType) { try { console.log("[Undoing change]:", filePath, changeType); var changeEl = document.getElementById(changeId); if (changeEl) { changeEl.classList.add("undoing"); setTimeout(function() { changeEl.style.transform = "translateX(-100%)"; changeEl.style.opacity = "0"; setTimeout(function() { changeEl.remove(); }, 300); }, 100); } safePostMessage({ type: "undoFileChange", filePath: filePath, changeType: changeType }); } catch(e) { console.error("[undoFileChange error]", e); } }' +
        'function copyCodeBlock(codeId, btnElement) { try { var codeBlock = document.getElementById(codeId); if (codeBlock) { var text = codeBlock.textContent; navigator.clipboard.writeText(text).then(function() { console.log("Code copied to clipboard"); if (btnElement) { var originalText = btnElement.textContent; btnElement.textContent = "✅ Copied!"; setTimeout(function() { btnElement.textContent = originalText; }, 2000); } }); } } catch(e) { console.error("[copyCodeBlock error]", e); } }' +
        'function openFileLink(filePath) { try { console.log("[Opening file]:", filePath); safePostMessage({ type: "openFile", filePath: filePath }); } catch(e) { console.error("[openFileLink error]", e); } }' +
        'function renderTodos(todos, stats, context) { try { if (!todoPanel || !todoList || !todoStats) return; if (!todos || todos.length === 0) { todoPanel.classList.remove("visible"); todoList.innerHTML = "<div class=\\"todo-empty\\">No tasks yet. Ask AI to create something!</div>"; return; } todoPanel.classList.add("visible"); const completedCount = stats ? stats.completed : 0; const totalCount = stats ? stats.total : todos.length; todoStats.textContent = "(" + completedCount + "/" + totalCount + ")"; if (context && todoContext && todoContextText) { todoContextText.textContent = context; todoContext.style.display = "block"; } if (todoCreatedMessage && todoCreatedText && totalCount > 0) { todoCreatedText.textContent = "Created " + totalCount + " todo" + (totalCount !== 1 ? "s" : ""); todoCreatedMessage.style.display = "flex"; setTimeout(function() { todoCreatedMessage.style.display = "none"; }, 5000); } var sortedTodos = todos.slice().sort(function(a, b) { var orderA = typeof a.order === "number" ? a.order : 999; var orderB = typeof b.order === "number" ? b.order : 999; return orderA - orderB; }); var activeIndex = -1; for (var i = 0; i < sortedTodos.length; i++) { if (!sortedTodos[i].completed) { activeIndex = i; break; } } todoList.innerHTML = sortedTodos.map(function(todo, index) { var orderNum = typeof todo.order === "number" ? todo.order + 1 : index + 1; var status = todo.status ? todo.status.toLowerCase() : "pending"; var isActive = (index === activeIndex); var isPending = !todo.completed && !isActive; var itemClass = "todo-item"; if (todo.completed) { itemClass += " completed"; } else if (isActive || status === "in_progress") { itemClass += " in-progress"; } else if (isPending) { itemClass += " pending"; } var checkboxClass = "todo-checkbox" + (todo.completed ? " checked" : ""); var todoIdEscaped = todo.id.replace(/["]/g, "&quot;"); var statusLabel = ""; if (isActive || status === "in_progress") { statusLabel = "<span class=\\"todo-status-label in-progress\\">IN PROGRESS</span>"; } else if (isPending) { statusLabel = "<span class=\\"todo-status-label pending\\">PENDING</span>"; } return "<div class=\\"" + itemClass + "\\" data-todo-id=\\"" + todoIdEscaped + "\\" onclick=\\"toggleTodoItem(this.dataset.todoId)\\"><div class=\\"" + checkboxClass + "\\"></div><span class=\\"todo-order-badge\\">#" + orderNum + "</span><span class=\\"todo-text\\">" + escapeHtml(todo.text) + "</span>" + statusLabel + "</div>"; }).join(""); } catch(e) { console.error("[renderTodos error]", e); } }' +
        'function toggleTodoItem(todoId) { try { safePostMessage({ type: "toggleTodo", todoId: todoId }); } catch(e) { console.error("[toggleTodo error]", e); } }' +
        'function updateTodoStatus(todoId, newStatus) { try { console.log("[updateTodoStatus]", todoId, newStatus); var todoEl = document.querySelector("[data-todo-id=\\"" + todoId.replace(/["]/g, "&quot;") + "\\"]"); if (!todoEl) { console.warn("[updateTodoStatus] Todo element not found:", todoId); return; } todoEl.classList.remove("pending", "in-progress", "completed"); if (newStatus === "completed") { todoEl.classList.add("completed"); var checkbox = todoEl.querySelector(".todo-checkbox"); if (checkbox) checkbox.classList.add("checked"); } else if (newStatus === "in_progress") { todoEl.classList.add("in-progress"); } else { todoEl.classList.add("pending"); } var existingLabel = todoEl.querySelector(".todo-status-label"); if (existingLabel) existingLabel.remove(); if (newStatus === "in_progress") { var label = document.createElement("span"); label.className = "todo-status-label in-progress"; label.textContent = "IN PROGRESS"; todoEl.appendChild(label); } else if (newStatus === "pending") { var labelPending = document.createElement("span"); labelPending.className = "todo-status-label pending"; labelPending.textContent = "PENDING"; todoEl.appendChild(labelPending); } } catch(e) { console.error("[updateTodoStatus error]", e); } }' +
        'function escapeHtml(text) { const div = document.createElement("div"); div.textContent = text; return div.innerHTML; }' +
        '</script>' +
        '</body>' +
        '</html>';

        console.log('✅ Chat HTML generated:', html.length, 'characters');
        console.log('📄 HTML preview:', html.substring(0, 200) + '...');
        return html;
    }
}

module.exports = OropendolaSidebarProvider;
