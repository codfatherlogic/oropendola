const vscode = require('vscode');

const ConversationTask = require('../core/ConversationTask');

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
            switch (message.type) {
                case 'login':
                    await this._handleLogin(message.email, message.password);
                    break;
                case 'sendMessage':
                    await this._handleSendMessage(message.text, message.attachments);
                    break;
                case 'openSettings':
                    await vscode.commands.executeCommand('workbench.action.openSettings', 'oropendola');
                    break;
                case 'newChat':
                    this._messages = [];
                    this._conversationId = null;  // Reset conversation ID
                    break;
                case 'renewSubscription':
                    await this._handleRenewSubscription();
                    break;
                case 'logout':
                    await this._handleLogout();
                    break;
                case 'switchMode':
                    this._mode = message.mode;
                    console.log(`🔄 Switched to ${this._mode} mode`);
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
                        }
                    }
                    break;
                case 'messageFeedback':
                    await this._handleMessageFeedback(message.action, message.message);
                    break;
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
     * Handle sending a chat message (Enhanced with ConversationTask)
     */
    async _handleSendMessage(text, attachments = []) {
        if (!text || !text.trim()) {
            return;
        }

        // Add user message to history
        this._messages.push({
            role: 'user',
            content: text,
            timestamp: new Date().toISOString()
        });

        // Show user message in UI
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
            await this._currentTask.run(text, attachments);

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
    _getLoginHtml(_webview) {
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
            font-size: 64px;
            margin-bottom: 10px;
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
            <div class="logo-icon">🐦</div>
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
    _getChatHtml(_webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Oropendola AI Chat</title>
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
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .header {
            padding: 12px 16px;
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .header-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            font-size: 14px;
        }
        
        .header-actions {
            display: flex;
            gap: 8px;
        }
        
        /* Mode Toggle Styles */
        .mode-selector {
            padding: 8px 12px;
            margin: 0 8px;
            border-bottom: 1px solid var(--vscode-panel-border);
            background: var(--vscode-editor-background);
        }
        
        .mode-label {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
            font-weight: 600;
        }
        
        .mode-toggle {
            display: flex;
            gap: 8px;
        }
        
        .mode-button {
            flex: 1;
            padding: 8px 16px;
            background: transparent;
            color: var(--vscode-foreground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }
        
        .mode-button:hover {
            background: var(--vscode-toolbar-hoverBackground);
            border-color: var(--vscode-focusBorder);
        }
        
        .mode-button.active {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border-color: var(--vscode-button-background);
            font-weight: 600;
        }
        
        .mode-icon {
            font-size: 16px;
        }
        
        .mode-description {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-top: 6px;
            line-height: 1.4;
            padding: 0 4px;
        }
        
        .icon-button {
            background: transparent;
            border: none;
            color: var(--vscode-foreground);
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 16px;
        }
        
        .icon-button:hover {
            background: var(--vscode-toolbar-hoverBackground);
        }
        
        .messages-container {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        
        .message {
            padding: 12px;
            border-radius: 8px;
            max-width: 90%;
            word-wrap: break-word;
            animation: slideIn 0.3s ease-out;
            font-size: 13px;
            line-height: 1.5;
        }
        
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .message-user {
            align-self: flex-end;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        
        .message-assistant {
            align-self: flex-start;
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            position: relative;
        }
        
        .message-actions {
            display: flex;
            gap: 8px;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid var(--vscode-panel-border);
        }
        
        .action-button {
            background: transparent;
            border: 1px solid var(--vscode-panel-border);
            color: var(--vscode-foreground);
            padding: 4px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 4px;
            transition: all 0.2s;
        }
        
        .action-button:hover {
            background: var(--vscode-toolbar-hoverBackground);
        }
        
        .action-button.accepted {
            background: var(--vscode-testing-iconPassed);
            border-color: var(--vscode-testing-iconPassed);
            color: white;
        }
        
        .action-button.rejected {
            background: var(--vscode-testing-iconFailed);
            border-color: var(--vscode-testing-iconFailed);
            color: white;
        }
        
        .action-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .message-error {
            align-self: center;
            background: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            color: var(--vscode-errorForeground);
            font-size: 12px;
        }
        
        .typing-indicator {
            align-self: flex-start;
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            padding: 12px;
            border-radius: 8px;
            max-width: 90%;
            font-size: 13px;
            line-height: 1.5;
            color: var(--vscode-descriptionForeground);
        }
        
        .typing-dots {
            display: inline-block;
        }
        
        .typing-dots::after {
            content: '●●●';
            animation: typing 1.4s infinite;
            letter-spacing: 2px;
        }
        
        @keyframes typing {
            0%, 60% { opacity: 0.3; }
            30% { opacity: 1; }
        }
        
        .empty-state {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 20px;
            color: var(--vscode-descriptionForeground);
        }
        
        .empty-icon {
            font-size: 64px;
            margin-bottom: 16px;
        }
        
        .empty-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 8px;
            color: var(--vscode-foreground);
        }
        
        .empty-desc {
            font-size: 13px;
            max-width: 250px;
        }
        
        .suggestions {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 20px;
            width: 100%;
            max-width: 250px;
        }
        
        .suggestion-btn {
            padding: 8px 12px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            text-align: left;
            transition: background 0.2s;
        }
        
        .suggestion-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        
        .input-container {
            padding: 12px 16px;
            border-top: 1px solid var(--vscode-panel-border);
            background: var(--vscode-sideBar-background);
        }
        
        .input-wrapper {
            display: flex;
            gap: 8px;
            align-items: flex-end;
        }
        
        .input-field {
            flex: 1;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 6px;
            padding: 10px 12px;
            font-family: var(--vscode-font-family);
            font-size: 13px;
            resize: none;
            min-height: 38px;
            max-height: 120px;
            line-height: 1.5;
        }
        
        .input-field:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }
        
        .input-field::placeholder {
            color: var(--vscode-input-placeholderForeground);
        }
        
        .send-button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 6px;
            padding: 0 16px;
            height: 38px;
            cursor: pointer;
            font-size: 18px;
            transition: background 0.2s;
            flex-shrink: 0;
        }
        
        .send-button:hover:not(:disabled) {
            background: var(--vscode-button-hoverBackground);
        }
        
        .send-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .stop-button {
            background: var(--vscode-errorForeground);
            color: white;
            border: none;
            border-radius: 6px;
            padding: 0 16px;
            height: 38px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.2s;
            flex-shrink: 0;
            display: none;
        }
        
        .stop-button:hover {
            opacity: 0.9;
            transform: scale(1.02);
        }
        
        .stop-button.visible {
            display: block;
        }
        
        .attach-button {
            background: transparent;
            color: var(--vscode-foreground);
            border: none;
            border-radius: 4px;
            padding: 0 8px;
            height: 38px;
            cursor: pointer;
            font-size: 18px;
            transition: background 0.2s;
            flex-shrink: 0;
        }
        
        .attach-button:hover {
            background: var(--vscode-toolbar-hoverBackground);
        }
        
        .attachments-preview {
            display: flex;
            gap: 8px;
            padding: 8px 0;
            flex-wrap: wrap;
        }
        
        .attachment-chip {
            display: flex;
            align-items: center;
            gap: 6px;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            max-width: 200px;
        }
        
        .attachment-chip.image-preview {
            flex-direction: column;
            max-width: 150px;
            padding: 6px;
        }
        
        .attachment-image {
            width: 100%;
            max-height: 100px;
            object-fit: cover;
            border-radius: 4px;
            margin-bottom: 4px;
        }
        
        .attachment-name {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .attachment-remove {
            background: transparent;
            border: none;
            color: currentColor;
            cursor: pointer;
            padding: 0;
            font-size: 14px;
            opacity: 0.7;
        }
        
        .attachment-remove:hover {
            opacity: 1;
        }
        
        .mode-selector {
            display: flex;
            gap: 4px;
            padding: 8px 16px;
            border-top: 1px solid var(--vscode-panel-border);
            background: var(--vscode-sideBar-background);
        }
        
        .mode-button {
            flex: 1;
            padding: 6px 12px;
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
        }
        
        .mode-button:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        
        .mode-button.active {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border-color: var(--vscode-button-background);
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-title">
            <span>🐦</span>
            <span>Oropendola AI</span>
        </div>
        <div class="header-actions">
            <button class="icon-button" onclick="newChat()" title="New Chat">➕</button>
            <button class="icon-button" onclick="openSettings()" title="Settings">⚙️</button>
            <button class="icon-button" onclick="signOut()" title="Sign Out">🚪</button>
        </div>
    </div>
    
    <div class="mode-selector">
        <div class="mode-label">Mode</div>
        <div class="mode-toggle">
            <button class="mode-button active" id="agentMode" onclick="switchMode('agent')">
                <span class="mode-icon">🤖</span>
                <span>Agent</span>
            </button>
            <button class="mode-button" id="askMode" onclick="switchMode('ask')">
                <span class="mode-icon">💬</span>
                <span>Ask</span>
            </button>
        </div>
        <div class="mode-description" id="modeDescription">
            Agent mode can execute actions and modify your workspace files.
        </div>
    </div>
    
    <div class="messages-container" id="messagesContainer">
            <div class="empty-state" id="emptyState">
            <div class="empty-icon">💬</div>
            <div class="empty-title" id="emptyTitle">Build with agent mode</div>
            <div class="empty-desc">AI responses may be inaccurate.</div>
            <div class="suggestions">
                <button class="suggestion-btn" onclick="sendSuggestion('Explain this code')">
                    🔍 Explain selected code
                </button>
                <button class="suggestion-btn" onclick="sendSuggestion('Fix bugs in this code')">
                    🐛 Fix bugs in code
                </button>
                <button class="suggestion-btn" onclick="sendSuggestion('Add comments to this code')">
                    📝 Add code comments
                </button>
                <button class="suggestion-btn" onclick="sendSuggestion('Improve code performance')">
                    ⚡ Improve performance
                </button>
            </div>
        </div>
    </div>
    
    <div class="input-container">
        <div id="attachmentsPreview" class="attachments-preview" style="display: none;"></div>
        <div class="input-wrapper">
            <button class="attach-button" onclick="triggerFileInput()" title="Attach file">
                📎
            </button>
            <input type="file" id="fileInput" style="display: none;" multiple onchange="handleFileSelect(event)" />
            <textarea 
                id="messageInput" 
                class="input-field" 
                placeholder="Add context (#), extensions (@), commands (/)"
                rows="1"
            ></textarea>
            <button id="sendButton" class="send-button" onclick="sendMessage()">
                ▶
            </button>
            <button id="stopButton" class="stop-button" onclick="stopGeneration()">
                ⏹ Stop
            </button>
        </div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        const messagesContainer = document.getElementById('messagesContainer');
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        const stopButton = document.getElementById('stopButton');
        const emptyState = document.getElementById('emptyState');
        const fileInput = document.getElementById('fileInput');
        const attachmentsPreview = document.getElementById('attachmentsPreview');
        
        let attachedFiles = [];
        let isGenerating = false;
        
        // Clipboard paste handler for images
        messageInput.addEventListener('paste', function(e) {
            const items = e.clipboardData.items;
            
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    e.preventDefault();
                    
                    const blob = items[i].getAsFile();
                    const reader = new FileReader();
                    
                    reader.onload = function(event) {
                        const timestamp = new Date().getTime();
                        attachedFiles.push({
                            name: 'pasted-image-' + timestamp + '.png',
                            type: blob.type,
                            size: blob.size,
                            content: event.target.result,
                            isImage: true
                        });
                        updateAttachmentsPreview();
                    };
                    
                    reader.readAsDataURL(blob);
                    break;
                }
            }
        });
        
        // Auto-resize textarea
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });
        
        // Send on Enter (Shift+Enter for new line)
        messageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        function sendMessage() {
            const text = messageInput.value.trim();
            if (!text) return;
            
            // Hide empty state
            if (emptyState) {
                emptyState.style.display = 'none';
            }
            
            // Set generating state
            isGenerating = true;
            sendButton.style.display = 'none';
            stopButton.classList.add('visible');
            messageInput.disabled = true;
            
            // Send to extension
            vscode.postMessage({
                type: 'sendMessage',
                text: text,
                attachments: attachedFiles
            });
            
            // Clear input and attachments
            messageInput.value = '';
            attachedFiles = [];
            updateAttachmentsPreview();
            messageInput.style.height = 'auto';
        }
        
        function triggerFileInput() {
            fileInput.click();
        }
        
        function handleFileSelect(event) {
            const files = Array.from(event.target.files);
            
            files.forEach(file => {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    attachedFiles.push({
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        content: e.target.result,
                        isImage: file.type.startsWith('image/')
                    });
                    updateAttachmentsPreview();
                };
                
                // Read file as base64
                if (file.type.startsWith('image/')) {
                    reader.readAsDataURL(file);
                } else {
                    reader.readAsText(file);
                }
            });
            
            // Clear file input
            fileInput.value = '';
        }
        
        function removeAttachment(index) {
            attachedFiles.splice(index, 1);
            updateAttachmentsPreview();
        }
        
        function updateAttachmentsPreview() {
            if (attachedFiles.length === 0) {
                attachmentsPreview.style.display = 'none';
                attachmentsPreview.innerHTML = '';
                return;
            }
            
            attachmentsPreview.style.display = 'flex';
            attachmentsPreview.innerHTML = attachedFiles.map((file, index) => {
                if (file.isImage) {
                    return '<div class="attachment-chip image-preview">' +
                        '<img src="' + file.content + '" class="attachment-image" alt="' + file.name + '" />' +
                        '<div style="display: flex; align-items: center; gap: 4px; width: 100%;">' +
                            '<span class="attachment-name" title="' + file.name + '">' + file.name + '</span>' +
                            '<button class="attachment-remove" onclick="removeAttachment(' + index + ')" title="Remove">×</button>' +
                        '</div>' +
                    '</div>';
                } else {
                    return '<div class="attachment-chip">' +
                        '<span>📎</span>' +
                        '<span class="attachment-name" title="' + file.name + '">' + file.name + '</span>' +
                        '<button class="attachment-remove" onclick="removeAttachment(' + index + ')" title="Remove">×</button>' +
                    '</div>';
                }
            }).join('');
        }
        
        function sendSuggestion(text) {
            messageInput.value = text;
            sendMessage();
        }
        
        function stopGeneration() {
            isGenerating = false;
            vscode.postMessage({ type: 'stopGeneration' });
            resetInputState();
        }
        
        function resetInputState() {
            isGenerating = false;
            sendButton.style.display = 'block';
            stopButton.classList.remove('visible');
            messageInput.disabled = false;
            messageInput.focus();
        }
        
        function newChat() {
            messagesContainer.innerHTML = '<div class="empty-state" id="emptyState"><div class="empty-icon">💬</div><div class="empty-title">Build with agent mode</div><div class="empty-desc">AI responses may be inaccurate.</div><div class="suggestions"><button class="suggestion-btn" onclick="sendSuggestion(' + "'Explain this code'" + ')">🔍 Explain selected code</button><button class="suggestion-btn" onclick="sendSuggestion(' + "'Fix bugs in this code'" + ')">🐛 Fix bugs in code</button><button class="suggestion-btn" onclick="sendSuggestion(' + "'Add comments to this code'" + ')">📝 Add code comments</button><button class="suggestion-btn" onclick="sendSuggestion(' + "'Improve code performance'" + ')">⚡ Improve performance</button></div></div>';
            messageInput.value = '';
            messageInput.focus();
            vscode.postMessage({ type: 'newChat' });
        }
        
        function openSettings() {
            vscode.postMessage({ type: 'openSettings' });
        }
        
        function signOut() {
            // Send logout message without confirm dialog (webview sandbox blocks modals)
            vscode.postMessage({ type: 'logout' });
        }
        
        let currentMode = 'agent';  // Default to agent mode
        
        function switchMode(mode) {
            currentMode = mode;
            
            // Update button states
            const agentBtn = document.getElementById('agentMode');
            const askBtn = document.getElementById('askMode');
            const modeDesc = document.getElementById('modeDescription');
            const emptyTitle = document.getElementById('emptyTitle');
            
            // Remove active from all
            agentBtn.classList.remove('active');
            askBtn.classList.remove('active');
            
            // Mode-specific updates
            if (mode === 'agent') {
                agentBtn.classList.add('active');
                modeDesc.textContent = 'Agent mode autonomously finds context and makes multi-file edits with error correction.';
                if (emptyTitle) {
                    emptyTitle.textContent = 'Build with agent mode';
                }
            } else {
                askBtn.classList.add('active');
                modeDesc.textContent = 'Ask mode provides answers and suggestions without modifying files.';
                if (emptyTitle) {
                    emptyTitle.textContent = 'Ask questions';
                }
            }
            
            console.log('🔄 Switched to', mode, 'mode');
            
            // Notify extension
            vscode.postMessage({
                type: 'switchMode',
                mode: mode
            });
        }
        
        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
                case 'addMessage':
                    addMessageToUI(message.message);
                    if (message.message.role === 'assistant' || message.message.role === 'error') {
                        resetInputState();
                    }
                    break;
                case 'showTyping':
                    showTypingIndicator();
                    break;
                case 'hideTyping':
                    hideTypingIndicator();
                    resetInputState();
                    break;
            }
        });
        
        let typingElement = null;
        
        function showTypingIndicator() {
            // Hide empty state
            if (emptyState) {
                emptyState.style.display = 'none';
            }
            
            // Remove existing typing indicator
            hideTypingIndicator();
            
            // Add new typing indicator
            typingElement = document.createElement('div');
            typingElement.className = 'typing-indicator';
            typingElement.innerHTML = 'AI is thinking<span class="typing-dots"></span>';
            
            messagesContainer.appendChild(typingElement);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        
        function hideTypingIndicator() {
            if (typingElement) {
                typingElement.remove();
                typingElement = null;
            }
        }
        
        function addMessageToUI(message) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message message-' + message.role;
            
            // Create message content
            const contentDiv = document.createElement('div');
            contentDiv.textContent = message.content;
            messageDiv.appendChild(contentDiv);
            
            // Add Accept/Reject buttons for assistant messages
            if (message.role === 'assistant') {
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'message-actions';
                
                const acceptBtn = document.createElement('button');
                acceptBtn.className = 'action-button accept-button';
                acceptBtn.innerHTML = '👍 Accept';
                acceptBtn.onclick = function() {
                    handleAcceptReject(message, 'accept', acceptBtn, rejectBtn);
                };
                
                const rejectBtn = document.createElement('button');
                rejectBtn.className = 'action-button reject-button';
                rejectBtn.innerHTML = '👎 Reject';
                rejectBtn.onclick = function() {
                    handleAcceptReject(message, 'reject', acceptBtn, rejectBtn);
                };
                
                actionsDiv.appendChild(acceptBtn);
                actionsDiv.appendChild(rejectBtn);
                messageDiv.appendChild(actionsDiv);
            }
            
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        
        function handleAcceptReject(message, action, acceptBtn, rejectBtn) {
            try {
                // Update button states
                if (action === 'accept') {
                    acceptBtn.classList.add('accepted');
                    acceptBtn.innerHTML = '✅ Accepted';
                    acceptBtn.disabled = true;
                    rejectBtn.disabled = true;
                    rejectBtn.style.opacity = '0.3';
                } else {
                    rejectBtn.classList.add('rejected');
                    rejectBtn.innerHTML = '❌ Rejected';
                    rejectBtn.disabled = true;
                    acceptBtn.disabled = true;
                    acceptBtn.style.opacity = '0.3';
                }

                // Send feedback to extension (fire and forget - don't block UI)
                vscode.postMessage({
                    type: 'messageFeedback',
                    action: action,
                    message: {
                        content: message.content || '',
                        role: message.role || 'assistant',
                        timestamp: message.timestamp || new Date().toISOString()
                    }
                });
                
                console.log('👍 Feedback sent to extension:', action);
            } catch (error) {
                console.error('❌ Error in handleAcceptReject:', error);
                // Reset button states if error occurs
                if (acceptBtn) {
                    acceptBtn.disabled = false;
                    acceptBtn.classList.remove('accepted');
                    acceptBtn.innerHTML = '👍 Accept';
                }
                if (rejectBtn) {
                    rejectBtn.disabled = false;
                    rejectBtn.classList.remove('rejected');
                    rejectBtn.innerHTML = '👎 Reject';
                }
            }
        }
    </script>
</body>
</html>`;
    }
}

module.exports = OropendolaSidebarProvider;
