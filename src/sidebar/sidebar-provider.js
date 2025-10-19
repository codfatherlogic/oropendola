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
                        this._handleRejectPlan(message.messageContent);
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

        // Clear session data
        this._isLoggedIn = false;
        this._messages = [];
        this._sessionId = null;
        this._sessionCookies = null;
        this._userInfo = null;
        this._conversationId = null;  // Clear conversation ID

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
            this._todoManager.toggleTodo(todoId);
            this._updateTodoDisplay();

            // Sync with backend if conversation exists
            if (this._conversationId && this._sessionCookies) {
                const todo = this._todoManager.getAllTodos().find(t => t.id === todoId);
                if (todo) {
                    await this._syncTodoWithBackend(todoId, todo.completed);
                }
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
    _handleClearTodos() {
        try {
            console.log('🗑️ Clearing all TODOs');
            this._todoManager.clearAll();
            this._updateTodoDisplay();
            vscode.window.showInformationMessage('✅ All TODOs cleared');
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
            const config = vscode.workspace.getConfiguration('oropendola');
            const apiUrl = config.get('api.url', 'https://oropendola.ai');

            if (!this._sessionCookies || !this._conversationId) {
                vscode.window.showWarningMessage('Please start a conversation first');
                return;
            }

            const axios = require('axios');

            // Send TODOs to backend using the new save_todos endpoint
            const response = await axios.post(
                `${apiUrl}/api/method/ai_assistant.api.save_todos`,
                {
                    conversation_id: this._conversationId,
                    todos: this._todoManager.getAllTodos()
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Cookie': this._sessionCookies
                    },
                    timeout: 10000
                }
            );

            if (response.data && response.data.message && response.data.message.success) {
                const count = response.data.message.saved_count || 0;
                vscode.window.showInformationMessage(`✅ ${count} TODOs synced successfully`);
                console.log(`✅ ${count} TODOs synced to backend`);
            } else {
                throw new Error(response.data.message?.error || response.data.error || 'Sync failed');
            }

        } catch (error) {
            console.error('Sync TODOs error:', error);
            vscode.window.showErrorMessage(`Failed to sync TODOs: ${error.message}`);
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
                        content: '🚀 Creating files and running setup commands...'
                    }
                });

                this._view.webview.postMessage({ type: 'showTyping' });
            }

            // Send the plan back to AI for execution
            // AI can now create files AND run terminal commands for complete project setup
            await this._handleSendMessage('Execute the plan you just outlined. Create all the files with their complete implementation. Then run any necessary setup commands (npm install, git init, etc.) to complete the project and make it ready to use.', []);

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
        task.on('assistantMessage', (taskId, message) => {
            console.log('🤖 Assistant response received');

            // Parse TODOs from the AI response
            this._parseTodosFromResponse(message);

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'addMessage',
                    message: {
                        role: 'assistant',
                        content: message
                    }
                });
            }
        });

        // Task cleanup (ALWAYS hide typing indicator)
        task.on('taskCleanup', (_taskId) => {
            console.log('🧹 Task cleanup event received');
            if (this._view) {
                this._view.webview.postMessage({ type: 'hideTyping' });
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
    async _handleSendMessage(text, attachments = []) {
        if (!text || !text.trim()) {
            return;
        }

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

        // Show user message in UI (original text, not enhanced)
        if (this._view) {
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
                    consecutiveMistakeLimit: 3
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
     * Get chat interface HTML - shown after successful authentication
     */
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
        'body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); background-color: var(--vscode-sideBar-background); height: 100vh; display: flex; flex-direction: column; }' +
        '.header { padding: 14px 16px; border-bottom: 1px solid var(--vscode-panel-border); display: flex; align-items: center; justify-content: space-between; background: var(--vscode-sideBar-background); }' +
        '.header-title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--vscode-foreground); }' +
        '.header-title img { width: 24px; height: 24px; object-fit: contain; }' +
        '.header-actions { display: flex; gap: 4px; }' +
        '.icon-button { background: transparent; border: none; color: var(--vscode-descriptionForeground); cursor: pointer; padding: 6px; border-radius: 4px; font-size: 14px; transition: all 0.2s; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; }' +
        '.icon-button:hover { background: var(--vscode-toolbar-hoverBackground); color: var(--vscode-foreground); }' +
        '.messages-container { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }' +
        '.message { padding: 12px; border-radius: 8px; max-width: 90%; word-wrap: break-word; font-size: 13px; line-height: 1.5; display: flex; gap: 12px; align-items: flex-start; width: fit-content; }' +
        '.message-content { flex: 1; min-width: 0; overflow-wrap: break-word; }' +
        '.message pre { background: var(--vscode-textCodeBlock-background); padding: 8px; border-radius: 4px; overflow-x: auto; margin: 8px 0; }' +
        '.message code { font-family: var(--vscode-editor-font-family); font-size: 12px; background: var(--vscode-textCodeBlock-background); padding: 2px 4px; border-radius: 3px; }' +
        '.message pre code { background: none; padding: 0; }' +
        '.message-actions { display: flex !important; flex-direction: column; gap: 4px; align-self: flex-start; margin-left: auto; flex-shrink: 0; min-width: 70px; }' +

        '.message-action-btn { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 11px; white-space: nowrap; min-width: 70px; }' +
        '.message-action-btn:hover { background: var(--vscode-button-secondaryHoverBackground); }' +
        '.message-action-accept { background: var(--vscode-button-background); color: var(--vscode-button-foreground); font-weight: 600; }' +
        '.message-action-accept:hover { background: var(--vscode-button-hoverBackground); }' +
        '.message-action-accept:disabled { opacity: 0.5; cursor: not-allowed; }' +
        '.message-action-reject { background: transparent; border: 1px solid var(--vscode-button-secondaryBackground); }' +
        '.message-action-reject:hover { background: rgba(255, 80, 80, 0.1); border-color: rgba(255, 80, 80, 0.5); color: #FF5252; }' +
        '.message-user { align-self: flex-end; background: #2D2D2D; color: #FFFFFF; border-radius: 12px 12px 4px 12px; }' +
        '.message-assistant { align-self: flex-start; background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); }' +
        '.message-error { align-self: center; background: var(--vscode-inputValidation-errorBackground); border: 1px solid var(--vscode-inputValidation-errorBorder); color: var(--vscode-errorForeground); font-size: 12px; }' +
        '.message-system { align-self: center; background: var(--vscode-editor-inactiveSelectionBackground); border: 1px solid var(--vscode-panel-border); color: var(--vscode-descriptionForeground); font-size: 12px; max-width: 85%; text-align: center; }' +
        '.typing-indicator { align-self: flex-start; background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border); padding: 12px 16px; border-radius: 8px; max-width: 90%; font-size: 13px; color: var(--vscode-descriptionForeground); display: flex; align-items: center; gap: 10px; }' +
        '.typing-dots { display: flex; gap: 4px; }' +
        '.typing-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--vscode-descriptionForeground); opacity: 0.4; animation: typing-bounce 1.4s infinite ease-in-out both; }' +
        '.typing-dot:nth-child(1) { animation-delay: -0.32s; }' +
        '.typing-dot:nth-child(2) { animation-delay: -0.16s; }' +
        '@keyframes typing-bounce { 0%, 80%, 100% { transform: scale(0); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }' +
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
        '.todo-checkbox { width: 16px; height: 16px; min-width: 16px; border-radius: 50%; border: 2px solid var(--vscode-descriptionForeground); background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0; }' +
        '.todo-checkbox:hover { border-color: var(--vscode-button-background); }' +
        '.todo-checkbox.checked { background: var(--vscode-button-background); border-color: var(--vscode-button-background); }' +
        '.todo-checkbox.checked::before { content: "✓"; color: white; font-size: 11px; font-weight: bold; }' +
        '.todo-number { font-weight: 600; color: var(--vscode-descriptionForeground); min-width: 20px; font-size: 11px; }' +
        '.todo-text { color: var(--vscode-foreground); flex: 1; line-height: 1.4; }' +
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
        'window.addEventListener("message", function(event) { const message = event.data; switch (message.type) { case "addMessage": addMessageToUI(message.message); if (message.message.role === "assistant" || message.message.role === "error") { resetInputState(); } break; case "showTyping": showTypingIndicator(); break; case "hideTyping": hideTypingIndicator(); resetInputState(); break; case "appendContext": if (messageInput && message.context) { const currentValue = messageInput.value; messageInput.value = currentValue + message.context; messageInput.style.height = "auto"; messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + "px"; messageInput.focus(); } break; case "updateInput": if (messageInput && message.text) { messageInput.value = message.text; messageInput.style.height = "auto"; messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + "px"; optimizeButton.disabled = false; optimizeButton.innerHTML = "&#10024;"; messageInput.focus(); } break; case "resetOptimizeButton": optimizeButton.disabled = false; optimizeButton.innerHTML = "&#10024;"; break; case "updateTodos": renderTodos(message.todos, message.stats, message.context); break; } });' +
        'let typingElement = null;' +
        'function showTypingIndicator() { if (emptyState) emptyState.style.display = "none"; hideTypingIndicator(); typingElement = document.createElement("div"); typingElement.className = "typing-indicator"; const textSpan = document.createElement("span"); textSpan.textContent = "Oropendola AI thinking"; typingElement.appendChild(textSpan); const dotsContainer = document.createElement("div"); dotsContainer.className = "typing-dots"; for (let i = 0; i < 3; i++) { const dot = document.createElement("div"); dot.className = "typing-dot"; dotsContainer.appendChild(dot); } typingElement.appendChild(dotsContainer); messagesContainer.appendChild(typingElement); messagesContainer.scrollTop = messagesContainer.scrollHeight; }' +
        'function hideTypingIndicator() { if (typingElement) { typingElement.remove(); typingElement = null; } }' +
        'function addMessageToUI(message) { const hadTypingIndicator = !!typingElement; if (hadTypingIndicator) hideTypingIndicator(); const messageDiv = document.createElement("div"); messageDiv.className = "message message-" + message.role; const contentDiv = document.createElement("div"); contentDiv.className = "message-content"; contentDiv.innerHTML = formatMessageContent(message.content); messageDiv.appendChild(contentDiv); if (message.role === "assistant") { const numberedPlanPattern = new RegExp("(^|\\n)[ \\t]*[0-9]+[.)][ \\t]"); const hasNumberedPlan = numberedPlanPattern.test(message.content); console.log("[DEBUG] Checking numbered plan:", hasNumberedPlan, message.content.substring(0, 100)); const actionsDiv = document.createElement("div"); actionsDiv.className = "message-actions"; if (hasNumberedPlan && !message.accepted) { console.log("[DEBUG] Showing Accept/Reject buttons"); const rejectBtn = document.createElement("button"); rejectBtn.className = "message-action-btn message-action-reject"; rejectBtn.textContent = "Reject"; rejectBtn.onclick = function() { console.log("Plan rejected by user"); rejectBtn.style.display = "none"; const acceptBtn = actionsDiv.querySelector(".message-action-accept"); if (acceptBtn) acceptBtn.style.display = "none"; safePostMessage({ type: "rejectPlan", messageContent: message.content }); }; const acceptBtn = document.createElement("button"); acceptBtn.className = "message-action-btn message-action-accept"; acceptBtn.textContent = "Accept"; acceptBtn.onclick = function() { console.log("Plan accepted by user"); acceptBtn.textContent = "Executing..."; acceptBtn.disabled = true; rejectBtn.style.display = "none"; message.accepted = true; safePostMessage({ type: "acceptPlan", messageContent: message.content }); }; actionsDiv.appendChild(rejectBtn); actionsDiv.appendChild(acceptBtn); } else { console.log("[DEBUG] Showing Copy button, hasNumberedPlan=", hasNumberedPlan, "accepted=", message.accepted); const copyBtn = document.createElement("button"); copyBtn.className = "message-action-btn"; copyBtn.textContent = "Copy"; copyBtn.onclick = function() { navigator.clipboard.writeText(message.content); copyBtn.textContent = "Copied!"; setTimeout(function() { copyBtn.textContent = "Copy"; }, 2000); }; actionsDiv.appendChild(copyBtn); } messageDiv.appendChild(actionsDiv); } messagesContainer.appendChild(messageDiv); if (hadTypingIndicator) showTypingIndicator(); messagesContainer.scrollTop = messagesContainer.scrollHeight; }' +
        'function formatMessageContent(text) { if (!text) return ""; var formatted = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); var codeBlockParts = formatted.split("```"); for (var i = 1; i < codeBlockParts.length; i += 2) { var block = codeBlockParts[i]; var newlineIdx = block.indexOf("\\\\n"); var code = newlineIdx > 0 ? block.substring(newlineIdx + 1) : block; codeBlockParts[i] = "<pre><code>" + code + "</code></pre>"; } formatted = codeBlockParts.join(""); var inlineCodeParts = formatted.split("`"); for (var j = 1; j < inlineCodeParts.length; j += 2) { inlineCodeParts[j] = "<code>" + inlineCodeParts[j] + "</code>"; } formatted = inlineCodeParts.join(""); var boldParts = formatted.split("**"); for (var k = 1; k < boldParts.length; k += 2) { boldParts[k] = "<strong>" + boldParts[k] + "</strong>"; } formatted = boldParts.join(""); formatted = formatted.replace(/\\\\n/g, "<br>"); return formatted; }' +
        'function renderTodos(todos, stats, context) { try { if (!todoPanel || !todoList || !todoStats) return; if (!todos || todos.length === 0) { todoPanel.classList.remove("visible"); todoList.innerHTML = "<div class=\\"todo-empty\\">No tasks yet. Ask AI to create something!</div>"; return; } todoPanel.classList.add("visible"); const completedCount = stats ? stats.completed : 0; const totalCount = stats ? stats.total : todos.length; todoStats.textContent = "(" + completedCount + "/" + totalCount + ")"; if (context && todoContext && todoContextText) { todoContextText.textContent = context; todoContext.style.display = "block"; } if (todoCreatedMessage && todoCreatedText && totalCount > 0) { todoCreatedText.textContent = "Created " + totalCount + " todo" + (totalCount !== 1 ? "s" : ""); todoCreatedMessage.style.display = "flex"; setTimeout(function() { todoCreatedMessage.style.display = "none"; }, 5000); } todoList.innerHTML = todos.map(function(todo, index) { const num = (index + 1); const itemClass = "todo-item" + (todo.completed ? " completed" : ""); const checkboxClass = "todo-checkbox" + (todo.completed ? " checked" : ""); const todoIdEscaped = todo.id.replace(/["]/g, "&quot;"); return "<div class=\\"" + itemClass + "\\" data-todo-id=\\"" + todoIdEscaped + "\\" onclick=\\"toggleTodoItem(this.dataset.todoId)\\"><div class=\\"" + checkboxClass + "\\"></div><span class=\\"todo-number\\">" + num + ".</span><span class=\\"todo-text\\">" + escapeHtml(todo.text) + "</span></div>"; }).join(""); } catch(e) { console.error("[renderTodos error]", e); } }' +
        'function toggleTodoItem(todoId) { try { safePostMessage({ type: "toggleTodo", todoId: todoId }); } catch(e) { console.error("[toggleTodo error]", e); } }' +
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
