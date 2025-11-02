const vscode = require('vscode');

const ConversationTask = require('../core/ConversationTask');
const URLAnalyzer = require('../analysis/url-analyzer');
const TodoManager = require('../utils/todo-manager');

// TEMPORARY FIX: Use the legacy auth manager to bypass bundler issue
// TODO: Debug why bundler returns module object instead of class for OAuth AuthManager
const AuthManager = require('../auth/auth-manager');

// Debugging: Check if AuthManager loaded correctly
console.log('🔍 [SidebarProvider] AuthManager type:', typeof AuthManager);
console.log('🔍 [SidebarProvider] AuthManager.name:', AuthManager?.name);

// Week 6-8: New Feature Clients
const TerminalManager = require('../services/terminal/TerminalManager');
// Note: TypeScript clients will be loaded dynamically when needed

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

        // OAuth Authentication
        this._authManager = new AuthManager(context);

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

        // Week 6-8: New Feature Managers
        this._terminalManager = TerminalManager; // Singleton instance
        this._browserClient = null; // Lazy-loaded TypeScript client
        this._marketplaceClient = null; // Lazy-loaded TypeScript client
        this._vectorClient = null; // Lazy-loaded TypeScript client
        this._i18nManager = null; // Lazy-loaded TypeScript client

        // Advanced features: Subtask orchestration and semantic search
        this._subtaskOrchestrator = null; // Initialized with TaskManager
        this._semanticSearchProvider = null; // Lazy-loaded

        // Checkpoint service for conversation state management
        this._checkpointService = null; // Initialized when task is created
    }

    /**
     * Set the chat manager instance
     */
    setChatManager(chatManager) {
        this._chatManager = chatManager;
    }

    /**
     * Set the task manager instance
     * Sprint 1-2: Task Persistence Layer
     */
    setTaskManager(taskManager) {
        this._taskManager = taskManager;
        
        // Initialize SubtaskOrchestrator
        try {
            const { SubtaskOrchestrator } = require('../core/SubtaskOrchestrator');
            this._subtaskOrchestrator = new SubtaskOrchestrator(taskManager, {
                maxDepth: 3,
                maxConcurrentSubtasks: 1,
                enablePauseResume: true,
                autoSaveInterval: 30000
            });
            
            // Restore task stack if available
            this._subtaskOrchestrator.restoreTaskStack().catch(err => {
                console.error('❌ Failed to restore task stack:', err);
            });
            
            console.log('✅ SubtaskOrchestrator initialized');
        } catch (error) {
            console.error('❌ Failed to initialize SubtaskOrchestrator:', error);
        }
    }

    /**
     * Set the mode manager instance
     * v3.7.0: Multi-Mode System
     */
    setModeManager(modeManager) {
        this._modeManager = modeManager;
        
        // Listen to mode changes
        if (modeManager) {
            modeManager.onModeChange(event => {
                this.postMessage({
                    type: 'modeChanged',
                    mode: event.newMode,
                    config: modeManager.getCurrentModeConfig()
                });
            });
        }
    }

    /**
     * Resolve the webview view
     * @param {vscode.WebviewView} webviewView
     */
    async resolveWebviewView(webviewView) {
        console.log('🔍 SidebarProvider: resolveWebviewView called');
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._context.extensionUri]
        };

        // Load authentication status from OAuth storage
        const authResult = await this._authManager.loadFromStorage();
        // Handle both object {authenticated: true} and boolean return types
        this._isLoggedIn = typeof authResult === 'object' ? authResult.authenticated : authResult;

        if (this._isLoggedIn) {
            const userEmail = this._authManager.getUserEmail();
            const apiKey = this._authManager.getApiKey();
            console.log(`✅ Loaded OAuth authentication for: ${userEmail}`);
            
            // Update agent client with API key
            const { agentClient } = require('../api/agent-client');
            agentClient.updateCredentials(apiKey);
            console.log('✅ Updated agent client with API key');
        } else {
            console.log('ℹ️ No OAuth authentication found');
        }

        // Always show chat interface (with sign-in prompt if needed)
        const html = this._getChatHtml(webviewView.webview);

        console.log(`🔍 SidebarProvider: Setting HTML (${html.length} chars)`);
        webviewView.webview.html = html;

        console.log('✅ SidebarProvider: Webview HTML set successfully');

        // Make sure the view is visible
        webviewView.show?.();
        console.log('✅ SidebarProvider: View shown');

        // Send authentication status to webview - retry multiple times to ensure delivery
        const sendAuthStatus = () => {
            if (this._view) {
                console.log('📤 Sending authentication status to webview');
                this._view.webview.postMessage({
                    type: 'authenticationStatus',
                    isAuthenticated: this._isLoggedIn,
                    message: this._isLoggedIn ? 'Authenticated' : 'Start by signing in'
                });
            }
        };
        
        // Send immediately and retry to ensure webview receives it
        setTimeout(sendAuthStatus, 500);
        setTimeout(sendAuthStatus, 1000);
        setTimeout(sendAuthStatus, 2000);
        setTimeout(sendAuthStatus, 3000);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async message => {
            try {
                switch (message.type) {
                    case 'login':
                        // OAuth flow authentication
                        console.log('🔐 Starting OAuth authentication flow');
                        try {
                            await this._authManager.authenticate();
                            this._isLoggedIn = true;
                            
                            // Update agent client with API key
                            const apiKey = this._authManager.getApiKey();
                            const { agentClient } = require('../api/agent-client');
                            agentClient.updateCredentials(apiKey);
                            console.log('✅ Updated agent client with API key');
                            
                            // Send success to webview
                            if (this._view) {
                                this._view.webview.postMessage({
                                    type: 'authenticationStatus',
                                    isAuthenticated: true,
                                    message: 'Authentication successful'
                                });
                            }
                        } catch (error) {
                            console.error('❌ Authentication failed:', error);
                            if (this._view) {
                                this._view.webview.postMessage({
                                    type: 'authenticationStatus',
                                    isAuthenticated: false,
                                    message: `Authentication failed: ${error.message}`
                                });
                            }
                        }
                        break;
                    case 'sendMessage':
                        // Check OAuth authentication first
                        if (!this._authManager.isAuthenticated()) {
                            console.log('⚠️ Cannot send message - not authenticated');
                            if (this._view) {
                                this._view.webview.postMessage({
                                    type: 'authenticationStatus',
                                    isAuthenticated: false,
                                    message: 'Please sign in to send messages'
                                });
                            }
                            return;
                        }
                        // Prevent multiple simultaneous sends
                        if (this._currentTask && this._currentTask.status === 'running') {
                            console.log('⚠️ Task already running, ignoring duplicate send');
                            return;
                        }
                        await this._handleSendMessage(message.text, message.attachments);
                        break;
                    case 'openBrowser':
                        // Open URL in external browser
                        if (message.url) {
                            console.log('🌐 Opening browser:', message.url);
                            await vscode.env.openExternal(vscode.Uri.parse(message.url));
                        }
                        break;
                    case 'openSettings':
                        await vscode.commands.executeCommand('workbench.action.openSettings', 'oropendola');
                        break;
                    case 'getAuthStatus':
                        // Webview is requesting current authentication status
                        console.log('🔐 Webview requesting auth status');
                        const isAuthenticated = this._authManager.isAuthenticated();
                        if (this._view) {
                            this._view.webview.postMessage({
                                type: 'authenticationStatus',
                                isAuthenticated: !!isAuthenticated,
                                message: !!isAuthenticated ? null : 'Start by signing in'
                            });
                        }
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
                    case 'getAccountData':
                        await this._handleGetAccountData();
                        break;
                    case 'openPricingPage':
                        await vscode.env.openExternal(vscode.Uri.parse('https://oropendola.ai/pricing'));
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
                    case 'approveTool':
                        console.log('✅ Tool approved:', message.tool?.action);
                        if (this._currentTask && message.tool) {
                            // Signal approval to the task
                            this._currentTask.emit('toolApproved', message.messageTs, message.tool);
                        }
                        break;
                    case 'rejectTool':
                        console.log('❌ Tool rejected:', message.tool?.action);
                        if (this._currentTask && message.tool) {
                            // Signal rejection to the task
                            this._currentTask.emit('toolRejected', message.messageTs, message.tool);
                        }
                        break;
                    case 'switchMode':
                        console.log(`🔄 Switching mode to: ${message.mode}`);
                        this._mode = message.mode;
                        if (this._view) {
                            const modeEmoji = message.mode === 'ask' ? '🤔' : '🤖';
                            const modeName = message.mode === 'ask' ? 'Ask Mode' : 'Agent Mode';
                            const modeDesc = message.mode === 'ask'
                                ? 'AI will show a plan and wait for your approval before making changes'
                                : 'AI will automatically execute low-risk actions, ask for confirmation on high-risk changes';

                            this._view.webview.postMessage({
                                type: 'addMessage',
                                message: {
                                    role: 'system',
                                    content: `${modeEmoji} Switched to **${modeName}**\n\n${modeDesc}`
                                }
                            });
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
                    case 'getFileWatcherStats':
                        await this._handleGetFileWatcherStats();
                        break;

                    // Sprint 1-2: Task Management handlers
                    case 'createTask':
                        await this._handleCreateTask(message.text, message.mode);
                        break;
                    case 'setTaskStatus':
                        await this._handleSetTaskStatus(message.taskId, message.status);
                        break;
                    case 'listTasks':
                        await this._handleListTasks(message.filters);
                        break;
                    case 'getTaskStats':
                        await this._handleGetTaskStats();
                        break;
                    case 'loadTask':
                        await this._handleLoadTask(message.taskId);
                        break;
                    case 'deleteTask':
                        await this._handleDeleteTask(message.taskId, message.permanent);
                        break;
                    case 'exportTask':
                        await this._handleExportTask(message.taskId, message.format);
                        break;

                    // Sprint 1-2 Week 5-6: Batch Operations
                    case 'batchSetStatus':
                        await this._handleBatchSetStatus(message.taskIds, message.status);
                        break;
                    case 'batchDelete':
                        await this._handleBatchDelete(message.taskIds);
                        break;
                    case 'batchExport':
                        await this._handleBatchExport(message.taskIds, message.format);
                        break;
                    case 'batchAddTags':
                        await this._handleBatchAddTags(message.taskIds, message.tags);
                        break;
                    case 'batchRemoveTags':
                        await this._handleBatchRemoveTags(message.taskIds, message.tags);
                        break;

                    // Week 7: Terminal View handlers
                    case 'getTerminalHistory':
                        await this._handleGetTerminalHistory();
                        break;
                    case 'getTerminalSuggestions':
                        await this._handleGetTerminalSuggestions(message.prompt);
                        break;
                    case 'executeTerminalCommand':
                        await this._handleExecuteTerminalCommand(message.command);
                        break;
                    case 'explainTerminalCommand':
                        await this._handleExplainTerminalCommand(message.command);
                        break;
                    case 'fixTerminalCommand':
                        await this._handleFixTerminalCommand(message.command, message.error);
                        break;
                    case 'analyzeTerminalOutput':
                        await this._handleAnalyzeTerminalOutput(message.output);
                        break;

                    // Week 6: Browser Automation handlers
                    case 'getBrowserSessions':
                        await this._handleGetBrowserSessions();
                        break;
                    case 'createBrowserSession':
                        await this._handleCreateBrowserSession(message.sessionName);
                        break;
                    case 'closeBrowserSession':
                        await this._handleCloseBrowserSession(message.sessionId);
                        break;
                    case 'browserNavigate':
                        await this._handleBrowserNavigate(message.sessionId, message.url);
                        break;
                    case 'browserExecuteAction':
                        await this._handleBrowserExecuteAction(message.sessionId, message.prompt);
                        break;
                    case 'browserScreenshot':
                        await this._handleBrowserScreenshot(message.sessionId);
                        break;
                    case 'browserClick':
                        await this._handleBrowserClick(message.sessionId, message.selector);
                        break;
                    case 'browserType':
                        await this._handleBrowserType(message.sessionId, message.selector, message.text);
                        break;

                    // Week 8: Marketplace handlers
                    case 'searchMarketplace':
                        await this._handleSearchMarketplace(message.query, message.category);
                        break;
                    case 'getInstalledExtensions':
                        await this._handleGetInstalledExtensions();
                        break;
                    case 'installExtension':
                        await this._handleInstallExtension(message.extensionId);
                        break;
                    case 'uninstallExtension':
                        await this._handleUninstallExtension(message.extensionId);
                        break;
                    case 'getExtensionDetails':
                        await this._handleGetExtensionDetails(message.extensionId);
                        break;

                    // Week 8: Vector Database handlers
                    case 'vectorSearch':
                        await this._handleVectorSearch(message.query, message.limit);
                        break;
                    case 'indexWorkspace':
                        await this._handleIndexWorkspace();
                        break;
                    case 'getIndexedFiles':
                        await this._handleGetIndexedFiles();
                        break;
                    case 'getIndexStats':
                        await this._handleGetIndexStats();
                        break;
                    case 'deleteIndex':
                        await this._handleDeleteIndex();
                        break;

                    // Settings & I18n handlers
                    case 'changeLanguage':
                        await this._handleChangeLanguage(message.language);
                        break;
                    case 'updateSettings':
                        await this._handleUpdateSettings(message.settings);
                        break;
                    case 'getSettings':
                        await this._handleGetSettings();
                        break;

                    // User API handlers
                    case 'getMyAPIKey':
                        await this._handleGetMyAPIKey();
                        break;
                    case 'getMySubscription':
                        await this._handleGetMySubscription();
                        break;
                    case 'regenerateAPIKey':
                        await this._handleRegenerateAPIKey();
                        break;
                    case 'getUserProfile':
                        await this._handleGetUserProfile();
                        break;

                    // Workspace handlers for @mentions feature
                    case 'getWorkspaceFiles':
                        await this._handleGetWorkspaceFiles(message.id);
                        break;
                    case 'getWorkspaceFolders':
                        await this._handleGetWorkspaceFolders(message.id);
                        break;
                    case 'getFileContent':
                        await this._handleGetFileContent(message.id, message.path);
                        break;

                    // Image selection handler
                    case 'selectImages':
                        await this._handleSelectImages(message.maxImages || 5);
                        break;

                    // Checkpoint handlers
                    case 'saveCheckpoint':
                        await this._handleSaveCheckpoint(message.conversationState);
                        break;
                    case 'restoreCheckpoint':
                        await this._handleRestoreCheckpoint(message.checkpointId);
                        break;
                    case 'listCheckpoints':
                        await this._handleListCheckpoints();
                        break;
                    case 'deleteCheckpoint':
                        await this._handleDeleteCheckpoint(message.checkpointId);
                        break;
                    case 'getCheckpointDiff':
                        await this._handleGetCheckpointDiff(message.checkpointId);
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

                    // Update agent client with session cookies
                    try {
                        const { agentClient } = require('../api/agent-client');
                        agentClient.updateSessionCookies(this._sessionCookies);
                        console.log('✅ Updated agent client with session cookies');
                    } catch (error) {
                        console.warn('⚠️ Could not update agent client:', error.message);
                    }

                    // Update user API client with session cookies
                    try {
                        const userAPIClient = require('../api/user-api-client');
                        // Convert cookie string to object format
                        const cookieObj = {};
                        this._sessionCookies.split('; ').forEach(cookie => {
                            const [key, value] = cookie.split('=');
                            if (key && value) {
                                cookieObj[key] = value;
                            }
                        });
                        userAPIClient.updateSessionCookies(cookieObj);
                        console.log('✅ Updated user API client with session cookies');
                    } catch (error) {
                        console.warn('⚠️ Could not update user API client:', error.message);
                    }

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
                    email,
                    full_name: email.split('@')[0]
                };

                this._isLoggedIn = true;

                // Switch to chat interface
                if (this._view) {
                    this._view.webview.html = this._getChatHtml(this._view.webview);
                }

                vscode.window.showInformationMessage(`✅ Welcome back, ${email}!`);

                // Auto-fetch user profile after login (non-blocking)
                setTimeout(async () => {
                    try {
                        await this._handleGetUserProfile();
                        console.log('✅ User profile fetched after login');
                    } catch (error) {
                        console.warn('⚠️ Could not fetch user profile:', error.message);
                    }
                }, 500);
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
                    email
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
     * Validate session asynchronously
     * @private
     */
    async _validateSession(savedCookies, userEmail, config, webviewView) {
        try {
            const axios = require('axios');
            const apiUrl = config.get('api.url', 'https://oropendola.ai');
            
            // Wait a bit for webview to fully load
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const response = await axios.get(`${apiUrl}/api/method/frappe.auth.get_logged_user`, {
                headers: { 'Cookie': savedCookies },
                timeout: 5000
            });
            
            if (response.data && response.data.message && response.data.message !== 'Guest') {
                console.log('✅ Session validated:', response.data.message);
                
                // Session is valid - mark as logged in
                this._isLoggedIn = true;
                this._sessionCookies = savedCookies;
                
                // Send authenticated status to webview
                if (this._view) {
                    this._view.webview.postMessage({
                        type: 'authenticationStatus',
                        isAuthenticated: true,
                        userEmail: response.data.message
                    });
                }
                
                console.log('✅ User authenticated - chat ready');
            } else {
                throw new Error('Session expired');
            }
        } catch (error) {
            console.warn('⚠️ Session validation failed:', error.message);
            // Clear invalid session
            this._isLoggedIn = false;
            this._sessionCookies = null;
            this._sessionId = null;
            
            await config.update('session.cookies', null, vscode.ConfigurationTarget.Global);
            await config.update('session.csrfToken', null, vscode.ConfigurationTarget.Global);
            await config.update('user.email', null, vscode.ConfigurationTarget.Global);
            
            // Clear agent client
            try {
                const { agentClient } = require('../api/agent-client');
                agentClient.updateSessionCookies(null);
            } catch (e) {
                console.warn('⚠️ Could not clear agent client:', e.message);
            }
            
            // Send unauthenticated status to webview
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'authenticationStatus',
                    isAuthenticated: false,
                    message: 'Your session has expired. Please sign in again.'
                });
            }
        }
    }

    /**
     * Handle logout
     */
    async _handleLogout() {
        // OAuth logout
        await this._authManager.logout();

        // Clear local state
        this._isLoggedIn = false;
        this._messages = [];
        this._conversationId = null;

        // Clear agent client API key
        try {
            const { agentClient } = require('../api/agent-client');
            agentClient.updateCredentials(null);
            console.log('✅ Cleared agent client API key');
        } catch (error) {
            console.warn('⚠️ Could not clear agent client:', error.message);
        }

        console.log('✅ Logged out - cleared all session data');

        // Send unauthenticated status to webview
        if (this._view) {
            this._view.webview.postMessage({
                type: 'authenticationStatus',
                isAuthenticated: false,
                message: 'You have been logged out. Please sign in to continue.'
            });
            console.log('✅ Sign-in prompt shown');
        }
    }

    /**
     * Handle get account data - Fetches user profile, subscription, usage, and analytics
     */
    async _handleGetAccountData() {
        try {
            console.log('📊 Fetching account data...');

            // Get profile data from auth manager
            const profileData = await this._authManager.getMyProfile();

            if (!profileData) {
                throw new Error('Failed to fetch profile data');
            }

            // Fetch subscription data separately
            console.log('📊 Fetching subscription data...');
            const subscription = await this._authManager.checkSubscription();

            // Add subscription to profile data
            const accountData = {
                ...profileData,
                subscription: subscription
            };

            console.log('📊 Account data includes subscription:', !!subscription);

            // Send data to webview
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'accountData',
                    data: accountData
                });
                console.log('✅ Account data sent to webview');
            }

        } catch (error) {
            console.error('❌ Failed to get account data:', error);

            // Check if user is still authenticated after error
            const isStillAuthenticated = await this._authManager.isAuthenticated();

            // Send error to webview
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'accountDataError',
                    error: error.message || 'Failed to load account data. Please try again.'
                });

                // If authentication was cleared (e.g., due to 403), update auth status
                if (!isStillAuthenticated) {
                    this._view.webview.postMessage({
                        type: 'authenticationStatus',
                        isAuthenticated: false,
                        message: 'Your session has expired. Please sign in again.'
                    });
                }
            }
        }
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
                    { pattern: /^(create|make|build)\s+/i, replacement: match => `${match.trim().charAt(0).toUpperCase() + match.trim().slice(1)} a ` }
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

            // Toggle locally FIRST (always works, instant feedback)
            this._todoManager.toggleTodo(todoId);
            this._updateTodoDisplay();

            // Then optionally sync with backend if authenticated
            if (this._sessionCookies && this._conversationId) {
                try {
                    const config = vscode.workspace.getConfiguration('oropendola');
                    const apiUrl = config.get('api.url', 'https://oropendola.ai');
                    const axios = require('axios');

                    const headers = {
                        'Content-Type': 'application/json',
                        'Cookie': this._sessionCookies
                    };

                    if (this._csrfToken) {
                        headers['X-Frappe-CSRF-Token'] = this._csrfToken;
                    }

                    const response = await axios.post(
                        `${apiUrl}/api/method/ai_assistant.api.todos.toggle_todo_doctype`,
                        { todo_id: todoId },
                        {
                            headers,
                            timeout: 10000
                        }
                    );

                    if (response.data && response.data.message && response.data.message.success) {
                        console.log(`✅ Synced TODO toggle with backend: ${todoId}`);
                    }
                } catch (backendError) {
                    // Backend sync failed, but local toggle already succeeded
                    console.warn('⚠️ Failed to sync TODO toggle with backend:', backendError.message);
                    // Don't show error to user - local state is already updated
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
                    headers,
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
                    headers,
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
                    completed
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
        if (!this._conversationId || !this._sessionCookies) {return;}

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
        if (!this._view) {return;}

        const todos = this._todoManager.getAllTodos();
        const stats = this._todoManager.getStats();

        this._view.webview.postMessage({
            type: 'updateTodos',
            todos,
            stats
        });
    }

    /**
     * Parse TODOs from AI response
     */
    async _parseTodosFromResponse(responseText) {
        if (!responseText) {return;}

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
        task.on('taskStarted', taskId => {
            console.log(`📋 Task ${taskId} started`);
            this._updateTaskStatus('running', 'Processing your request...');
        });

        // Task completed
        task.on('taskCompleted', taskId => {
            console.log(`✅ Task ${taskId} completed`);
            this._updateTaskStatus('idle', '');

            // Hide typing indicator
            if (this._view) {
                this._view.webview.postMessage({ type: 'hideTyping' });
            }

            // Add to history
            this._taskHistory.push(task.getSummary());
        });

        // Authentication error - session expired
        task.on('authenticationError', async (taskId, error) => {
            console.error(`🔐 Authentication error in task ${taskId}`);
            
            // Clear invalid session
            this._isLoggedIn = false;
            this._sessionCookies = null;
            this._sessionId = null;
            
            const config = vscode.workspace.getConfiguration('oropendola');
            await config.update('session.cookies', null, vscode.ConfigurationTarget.Global);
            await config.update('session.csrfToken', null, vscode.ConfigurationTarget.Global);
            await config.update('user.email', null, vscode.ConfigurationTarget.Global);
            
            // Send unauthenticated status to webview
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'authenticationStatus',
                    isAuthenticated: false,
                    message: 'Your session has expired. Please sign in again.'
                });
            }
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
        task.on('taskAborted', taskId => {
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

                // Send message with file_changes and metrics if available
                this._view.webview.postMessage({
                    type: 'addMessage',
                    message: {
                        role: 'assistant',
                        content: message,
                        file_changes: extraData?.file_changes,
                        tool_calls: extraData?.tool_calls,  // ✅ Pass tool_calls to webview
                        has_todos: false,  // Always false to prevent plan interruption
                        auto_execute: true,  // Always true for continuous flow
                        ts: Date.now(),
                        // Include API metrics if available from backend
                        apiMetrics: extraData?.apiMetrics || extraData?.metrics || extraData?.usage
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
                    taskId,
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
        task.on('realtimeConnected', taskId => {
            console.log(`✅ [Sidebar] Task ${taskId} realtime connected`);
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'realtimeStatus',
                    taskId,
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
                    taskId,
                    connected: false,
                    reason
                });
            }
        });

        // Realtime WebSocket connection error
        task.on('realtimeError', (taskId, error) => {
            console.error(`❌ [Sidebar] Task ${taskId} realtime error:`, error);
            // Don't show realtime errors to user - they're not critical
            // The extension will still work via HTTP responses
        });

        // UI Enhancement: Intent Classification (v3.2.2)
        task.on('intentClassified', (taskId, data) => {
            console.log(`🎯 [Sidebar] Intent classified for task ${taskId}:`, data);
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'intentClassified',
                    taskId,
                    data
                });
            }
        });

        // UI Enhancement: Privacy Filter (v3.2.2)
        task.on('privacyFilter', (taskId, data) => {
            console.log(`🔒 [Sidebar] Privacy filter activated for task ${taskId}:`, data);
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'privacyFilter',
                    taskId,
                    data
                });
            }
        });

        // Task cleanup (ALWAYS hide typing indicator)
        task.on('taskCleanup', _taskId => {
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
                    taskId,
                    data: {
                        type: 'toolExecutionStart',
                        tool_name: tool.action,
                        todo_id: todoId,
                        step: index + 1,
                        total
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
                    taskId,
                    data: {
                        type: 'toolExecutionComplete',
                        tool_name: tool.action,
                        todo_id: todoId,
                        success: result.success !== false,
                        step: index + 1,
                        total
                    }
                });
            }
        });

        // File change events (Qoder-style)
        task.on('fileChangeAdded', change => {
            console.log(`📄 File change added: ${change.filePath} (${change.status})`);
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'fileChangeAdded',
                    change
                });
            }
        });

        task.on('fileChangeUpdated', change => {
            console.log(`🔄 File change updated: ${change.filePath} (${change.status})`);
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'fileChangeUpdated',
                    change
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
                    summary
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
                status,
                message
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

        // Don't show user message here - ConversationTask will handle it via taskMessages
        // This prevents duplicate user messages in the chat UI
        // The task's addMessage() will add it to taskMessages which syncs to webview

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

            // Validate OAuth authentication
            if (!this._isLoggedIn) {
                if (this._view) {
                    this._view.webview.postMessage({
                        type: 'showSignInPrompt',
                        message: 'Please sign in to start chatting with Oropendola AI'
                    });
                }
                return;
            }

            // Create new task if needed or current task is not running
            if (!this._currentTask || this._currentTask.status !== 'running') {
                console.log('🆕 Creating new ConversationTask');

                this._taskCounter++;
                const taskId = `task_${this._taskCounter}_${Date.now()}`;

                // Initialize semantic search provider if not done
                if (!this._semanticSearchProvider) {
                    try {
                        const { SemanticSearchProvider } = require('../vector/SemanticSearchProvider');
                        this._semanticSearchProvider = new SemanticSearchProvider();
                        console.log('✅ SemanticSearchProvider initialized');
                    } catch (error) {
                        console.error('❌ Failed to initialize SemanticSearchProvider:', error);
                    }
                }

                this._currentTask = new ConversationTask(taskId, {
                    apiUrl,
                    sessionCookies: this._sessionCookies,
                    mode: this._mode,
                    // eslint-disable-next-line no-undef
                    providerRef: new WeakRef(this),
                    consecutiveMistakeLimit: 10,  // Increased for progressive mode (was 3)
                    // Sprint 1-2: Pass TaskManager for persistence
                    taskManager: this._taskManager,
                    // Advanced features
                    subtaskOrchestrator: this._subtaskOrchestrator,
                    semanticSearchProvider: this._semanticSearchProvider
                });

                // Set up all event listeners
                this._setupTaskEventListeners(this._currentTask);
            }

            // Run the task (handles everything automatically: retries, context, tools)
            console.log('🚀 Starting task execution');

            // Add progressive timeout warnings - complex requests can take time
            const warning5min = setTimeout(() => {
                console.log('ℹ️ Request taking longer than expected (5 minutes)');
                if (this._view) {
                    this._view.webview.postMessage({
                        type: 'addMessage',
                        message: {
                            role: 'system',
                            content: 'ℹ️ Still processing... Complex requests can take time.'
                        }
                    });
                }
            }, 300000); // 5 minutes

            const warning10min = setTimeout(() => {
                console.log('ℹ️ Request still processing (10 minutes)');
                if (this._view) {
                    this._view.webview.postMessage({
                        type: 'addMessage',
                        message: {
                            role: 'system',
                            content: 'ℹ️ Almost there... Working on it.'
                        }
                    });
                }
            }, 600000); // 10 minutes

            const warning15min = setTimeout(() => {
                console.log('ℹ️ Request taking longer than usual (15 minutes)');
                if (this._view) {
                    this._view.webview.postMessage({
                        type: 'addMessage',
                        message: {
                            role: 'system',
                            content: 'ℹ️ Still working on it... Large requests need extra time.'
                        }
                    });
                }
            }, 900000); // 15 minutes

            // Final safety timeout - 20 minutes
            const safetyTimeout = setTimeout(() => {
                console.warn('⚠️ Safety timeout triggered - forcing UI reset after 20 minutes');
                if (this._view) {
                    this._view.webview.postMessage({ type: 'hideTyping' });
                    this._view.webview.postMessage({
                        type: 'addMessage',
                        message: {
                            role: 'system',
                            content: '⚠️ Request timed out after 20 minutes. The backend may be experiencing issues. Please try again or contact support.'
                        }
                    });
                }
                // Abort current task
                if (this._currentTask) {
                    this._currentTask.abortTask();
                }
            }, 1200000); // 1200 seconds (20 minutes)

            try {
                await this._currentTask.run(enhancedText, attachments);
            } catch (runError) {
                console.error('❌ Task run error:', runError);
                // Don't rethrow - just log. The task error handler will notify UI.
            } finally {
                // Clear all timeouts
                clearTimeout(warning5min);
                clearTimeout(warning10min);
                clearTimeout(warning15min);
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
                const jsonStr = match[1].trim();
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
                action,
                path,
                content,
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
     * Handle get file watcher stats (v3.2.2 - UI Enhancement)
     */
    async _handleGetFileWatcherStats() {
        try {
            if (!this._sessionCookies) {
                return;
            }

            const config = vscode.workspace.getConfiguration('oropendola');
            const apiUrl = config.get('api.url', 'https://oropendola.ai');
            const axios = require('axios');

            const headers = {
                'Content-Type': 'application/json',
                'Cookie': this._sessionCookies
            };

            if (this._csrfToken) {
                headers['X-Frappe-CSRF-Token'] = this._csrfToken;
            }

            const response = await axios.get(
                `${apiUrl}/api/method/ai_assistant.api.workspace.get_all_file_watcher_stats`,
                {
                    headers,
                    timeout: 5000
                }
            );

            if (response.data && response.data.message && this._view) {
                this._view.webview.postMessage({
                    type: 'fileWatcherStats',
                    stats: response.data.message
                });
            }
        } catch (error) {
            // Silently fail - file watchers are optional
            console.log('File watcher stats not available:', error.message);
        }
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
    /**
     * Generate HTML for React-based webview
     * Loads the built React app from webview-ui/dist
     */
    _getChatHtml(webview) {
        console.log('🔧 Loading React webview...');

        // Get URIs for React build files
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._context.extensionUri, 'webview-ui', 'dist', 'assets', 'index.js')
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._context.extensionUri, 'webview-ui', 'dist', 'assets', 'index.css')
        );

        const cspSource = webview.cspSource;
        console.log('🔒 CSP Source:', cspSource);
        console.log('📦 Script URI:', scriptUri.toString());
        console.log('🎨 Style URI:', styleUri.toString());

        // Simple HTML that loads the React app
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="
        default-src 'none';
        style-src ${cspSource} 'unsafe-inline';
        script-src ${cspSource} 'wasm-unsafe-eval';
        img-src ${cspSource} data: https:;
        font-src ${cspSource} data:;
        connect-src ${cspSource} https://oropendola.ai;
    ">
    <title>Oropendola AI Assistant</title>
    <link rel="stylesheet" href="${styleUri}">
</head>
<body>
    <div id="root"></div>
    <script type="module" src="${scriptUri}"></script>
</body>
</html>`;

        console.log('📄 React HTML loaded');
        return html;
    }

    // ==================== Sprint 1-2: Task Management Handlers ====================

    /**
     * Handle createTask request
     * Creates a new task with optional name and mode
     */
    async _handleCreateTask(text, mode = 'agent') {
        try {
            if (!this._taskManager) {
                console.warn('⚠️  TaskManager not initialized');
                if (this._view) {
                    this._view.webview.postMessage({
                        type: 'taskCreated',
                        success: false,
                        error: 'Task manager not initialized'
                    });
                }
                return;
            }

            console.log('📝 Creating new task:', { text, mode });
            const task = await this._taskManager.createTask(text, mode);

            // Update current task
            this._currentTask = task;

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'taskCreated',
                    success: true,
                    task: task
                });
            }

            console.log(`✅ Task created with ID: ${task.id}`);
        } catch (error) {
            console.error('❌ Error creating task:', error);
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'taskCreated',
                    success: false,
                    error: error.message
                });
            }
        }
    }

    /**
     * Handle setTaskStatus request
     * Changes task status (active, completed, failed, terminated)
     */
    async _handleSetTaskStatus(taskId, status) {
        try {
            if (!this._taskManager) {
                console.warn('⚠️  TaskManager not initialized');
                if (this._view) {
                    this._view.webview.postMessage({
                        type: 'taskStatusChanged',
                        success: false,
                        error: 'Task manager not initialized'
                    });
                }
                return;
            }

            console.log(`🔄 Setting task ${taskId} status to: ${status}`);
            const task = await this._taskManager.setStatus(taskId, status);

            // Update current task if it's the one being modified
            if (this._currentTask?.id === taskId) {
                this._currentTask = task;
            }

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'taskStatusChanged',
                    success: true,
                    task: task
                });
            }

            console.log(`✅ Task ${taskId} status changed to: ${status}`);
        } catch (error) {
            console.error('❌ Error setting task status:', error);
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'taskStatusChanged',
                    success: false,
                    error: error.message
                });
            }
        }
    }

    /**
     * Handle listTasks request from history view
     */
    async _handleListTasks(filters = {}) {
        try {
            if (!this._taskManager) {
                console.warn('⚠️  TaskManager not initialized');
                if (this._view) {
                    this._view.webview.postMessage({
                        type: 'taskList',
                        tasks: []
                    });
                }
                return;
            }

            console.log('📋 Listing tasks with filters:', filters);
            const tasks = await this._taskManager.listTasks(filters);

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'taskList',
                    tasks: tasks
                });
            }

            console.log(`✅ Sent ${tasks.length} tasks to webview`);
        } catch (error) {
            console.error('❌ Error listing tasks:', error);
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'taskList',
                    tasks: [],
                    error: error.message
                });
            }
        }
    }

    /**
     * Handle getTaskStats request from history view
     */
    async _handleGetTaskStats() {
        try {
            if (!this._taskManager) {
                console.warn('⚠️  TaskManager not initialized');
                if (this._view) {
                    this._view.webview.postMessage({
                        type: 'taskStats',
                        stats: {
                            total: 0,
                            active: 0,
                            completed: 0,
                            failed: 0,
                            terminated: 0
                        }
                    });
                }
                return;
            }

            console.log('📊 Getting task statistics');
            const stats = await this._taskManager.getStats();

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'taskStats',
                    stats: stats
                });
            }

            console.log('✅ Sent task stats to webview:', stats);
        } catch (error) {
            console.error('❌ Error getting task stats:', error);
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'taskStats',
                    stats: {
                        total: 0,
                        active: 0,
                        completed: 0,
                        failed: 0,
                        terminated: 0
                    },
                    error: error.message
                });
            }
        }
    }

    /**
     * Handle loadTask request from history view
     */
    async _handleLoadTask(taskId) {
        try {
            if (!this._taskManager) {
                console.warn('⚠️  TaskManager not initialized');
                vscode.window.showErrorMessage('Task Manager not initialized');
                return;
            }

            console.log(`📖 Loading task: ${taskId}`);
            const task = await this._taskManager.loadTask(taskId);

            // Sprint 1-2: Restore task conversation state
            console.log(`🔄 Restoring ${task.messages.length} messages from task`);

            // Clear current messages
            this._messages = [];

            // Create a new ConversationTask if needed (to store the loaded state)
            if (this._currentTask) {
                // Dispose of current task if exists
                this._currentTask.dispose();
            }

            // Restore messages to UI
            if (this._view && task.messages && task.messages.length > 0) {
                // Send task loaded event
                this._view.webview.postMessage({
                    type: 'taskLoaded',
                    task: task
                });

                // Clear chat UI
                this._view.webview.postMessage({
                    type: 'clearChat'
                });

                // Show restore notification
                this._view.webview.postMessage({
                    type: 'addMessage',
                    message: {
                        role: 'system',
                        content: `📖 Restored task: ${task.text}\n\n**Status:** ${task.status}\n**Messages:** ${task.messages.length}\n**Created:** ${new Date(task.createdAt).toLocaleString()}\n\n*You can continue this conversation by sending a new message.*`
                    }
                });

                // Restore each message to UI
                for (const msg of task.messages) {
                    // Convert ClineMessage to UI message format
                    const role = msg.type === 'say' ? 'assistant' : msg.type === 'ask' ? 'user' : 'system';
                    const content = msg.text || msg.say || msg.ask || '';

                    if (content) {
                        this._view.webview.postMessage({
                            type: 'addMessage',
                            message: {
                                role: role,
                                content: content
                            }
                        });

                        // Also add to internal messages array
                        this._messages.push({
                            role: role,
                            content: content
                        });
                    }
                }

                console.log(`✅ Restored ${task.messages.length} messages to UI`);
            }

            vscode.window.showInformationMessage(`Task loaded: ${task.text}`);
            console.log('✅ Task loaded successfully');
        } catch (error) {
            console.error('❌ Error loading task:', error);
            vscode.window.showErrorMessage(`Failed to load task: ${error.message}`);
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'taskLoaded',
                    error: error.message
                });
            }
        }
    }

    /**
     * Handle deleteTask request from history view
     */
    async _handleDeleteTask(taskId) {
        try {
            if (!this._taskManager) {
                console.warn('⚠️  TaskManager not initialized');
                vscode.window.showErrorMessage('Task Manager not initialized');
                return;
            }

            console.log(`🗑️  Deleting task: ${taskId}`);
            await this._taskManager.deleteTask(taskId);

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'taskDeleted',
                    taskId: taskId
                });
            }

            vscode.window.showInformationMessage('Task deleted successfully');
            console.log('✅ Task deleted successfully');
        } catch (error) {
            console.error('❌ Error deleting task:', error);
            vscode.window.showErrorMessage(`Failed to delete task: ${error.message}`);
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'taskDeleted',
                    error: error.message
                });
            }
        }
    }

    /**
     * Handle exportTask request from history view
     */
    async _handleExportTask(taskId, format = 'json') {
        try {
            if (!this._taskManager) {
                console.warn('⚠️  TaskManager not initialized');
                vscode.window.showErrorMessage('Task Manager not initialized');
                return;
            }

            console.log(`📤 Exporting task ${taskId} as ${format}`);
            const exportedContent = await this._taskManager.exportTask(taskId, format);

            // Show save dialog
            const fileExtension = format === 'json' ? 'json' : format === 'md' ? 'md' : 'txt';
            const fileName = `task_${taskId.substring(0, 8)}.${fileExtension}`;

            const uri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(fileName),
                filters: {
                    [format.toUpperCase()]: [fileExtension]
                }
            });

            if (uri) {
                // Write file
                const fs = require('fs').promises;
                await fs.writeFile(uri.fsPath, exportedContent, 'utf-8');

                if (this._view) {
                    this._view.webview.postMessage({
                        type: 'taskExported',
                        taskId: taskId,
                        format: format,
                        path: uri.fsPath
                    });
                }

                vscode.window.showInformationMessage(`Task exported to ${uri.fsPath}`);
                console.log('✅ Task exported successfully');
            } else {
                console.log('ℹ️  Export cancelled by user');
            }
        } catch (error) {
            console.error('❌ Error exporting task:', error);
            vscode.window.showErrorMessage(`Failed to export task: ${error.message}`);
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'taskExported',
                    error: error.message
                });
            }
        }
    }

    // ========================================================================
    // BATCH OPERATION HANDLERS (Sprint 1-2 Week 5-6)
    // ========================================================================

    /**
     * Handle batch status change
     */
    async _handleBatchSetStatus(taskIds, status) {
        try {
            if (!this._taskManager) {
                vscode.window.showErrorMessage('Task Manager not initialized');
                return;
            }

            console.log(`🔄 Batch setting status to ${status} for ${taskIds.length} tasks`);
            const results = await this._taskManager.batchSetStatus(taskIds, status);

            const successMsg = results.succeeded.length > 0
                ? `${results.succeeded.length} task(s) updated to ${status}`
                : '';

            const failMsg = results.failed.length > 0
                ? `${results.failed.length} task(s) failed to update`
                : '';

            const message = [successMsg, failMsg].filter(Boolean).join(', ');

            if (results.succeeded.length > 0) {
                vscode.window.showInformationMessage(message);
            } else if (results.failed.length > 0) {
                vscode.window.showWarningMessage(message);
            }

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'batchOperationComplete',
                    operation: 'batchSetStatus',
                    results
                });
            }

            console.log(`✅ Batch status change complete: ${results.succeeded.length} succeeded, ${results.failed.length} failed`);
        } catch (error) {
            console.error('❌ Error in batch status change:', error);
            vscode.window.showErrorMessage(`Batch operation failed: ${error.message}`);
        }
    }

    /**
     * Handle batch delete
     */
    async _handleBatchDelete(taskIds) {
        try {
            if (!this._taskManager) {
                vscode.window.showErrorMessage('Task Manager not initialized');
                return;
            }

            console.log(`🗑️  Batch deleting ${taskIds.length} tasks`);
            const results = await this._taskManager.batchDelete(taskIds);

            const message = `Deleted ${results.succeeded.length} of ${taskIds.length} task(s)`;

            if (results.succeeded.length > 0) {
                vscode.window.showInformationMessage(message);
            }

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'batchOperationComplete',
                    operation: 'batchDelete',
                    results
                });
            }

            console.log(`✅ Batch delete complete: ${results.succeeded.length} succeeded, ${results.failed.length} failed`);
        } catch (error) {
            console.error('❌ Error in batch delete:', error);
            vscode.window.showErrorMessage(`Batch delete failed: ${error.message}`);
        }
    }

    /**
     * Handle batch export
     */
    async _handleBatchExport(taskIds, format = 'json') {
        try {
            if (!this._taskManager) {
                vscode.window.showErrorMessage('Task Manager not initialized');
                return;
            }

            console.log(`📤 Batch exporting ${taskIds.length} tasks as ${format}`);
            const results = await this._taskManager.batchExport(taskIds, format);

            if (results.succeeded.length === 0) {
                vscode.window.showWarningMessage('No tasks were exported');
                return;
            }

            // Save to single file with all tasks
            const fileExtension = format === 'json' ? 'json' : format === 'md' ? 'md' : 'txt';
            const fileName = `tasks_batch_${Date.now()}.${fileExtension}`;

            const uri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(fileName),
                filters: {
                    [format.toUpperCase()]: [fileExtension]
                }
            });

            if (uri) {
                const fs = require('fs').promises;

                // Combine all exports
                let combinedContent;
                if (format === 'json') {
                    combinedContent = JSON.stringify(results.succeeded.map(r => JSON.parse(r.data)), null, 2);
                } else {
                    combinedContent = results.succeeded.map(r => r.data).join('\n\n' + '='.repeat(80) + '\n\n');
                }

                await fs.writeFile(uri.fsPath, combinedContent, 'utf-8');

                vscode.window.showInformationMessage(
                    `Exported ${results.succeeded.length} task(s) to ${uri.fsPath}`
                );

                console.log(`✅ Batch export complete: ${results.succeeded.length} succeeded, ${results.failed.length} failed`);
            }

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'batchOperationComplete',
                    operation: 'batchExport',
                    results: {
                        succeeded: results.succeeded.map(r => ({ id: r.id })),
                        failed: results.failed
                    }
                });
            }
        } catch (error) {
            console.error('❌ Error in batch export:', error);
            vscode.window.showErrorMessage(`Batch export failed: ${error.message}`);
        }
    }

    /**
     * Handle batch add tags
     */
    async _handleBatchAddTags(taskIds, tags) {
        try {
            if (!this._taskManager) {
                vscode.window.showErrorMessage('Task Manager not initialized');
                return;
            }

            console.log(`🏷️  Batch adding tags [${tags.join(', ')}] to ${taskIds.length} tasks`);
            const results = await this._taskManager.batchAddTags(taskIds, tags);

            const message = `Added tags to ${results.succeeded.length} of ${taskIds.length} task(s)`;

            if (results.succeeded.length > 0) {
                vscode.window.showInformationMessage(message);
            }

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'batchOperationComplete',
                    operation: 'batchAddTags',
                    results
                });
            }

            console.log(`✅ Batch add tags complete: ${results.succeeded.length} succeeded, ${results.failed.length} failed`);
        } catch (error) {
            console.error('❌ Error in batch add tags:', error);
            vscode.window.showErrorMessage(`Batch add tags failed: ${error.message}`);
        }
    }

    /**
     * Handle batch remove tags
     */
    async _handleBatchRemoveTags(taskIds, tags) {
        try {
            if (!this._taskManager) {
                vscode.window.showErrorMessage('Task Manager not initialized');
                return;
            }

            console.log(`🏷️  Batch removing tags [${tags.join(', ')}] from ${taskIds.length} tasks`);
            const results = await this._taskManager.batchRemoveTags(taskIds, tags);

            const message = `Removed tags from ${results.succeeded.length} of ${taskIds.length} task(s)`;

            if (results.succeeded.length > 0) {
                vscode.window.showInformationMessage(message);
            }

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'batchOperationComplete',
                    operation: 'batchRemoveTags',
                    results
                });
            }

            console.log(`✅ Batch remove tags complete: ${results.succeeded.length} succeeded, ${results.failed.length} failed`);
        } catch (error) {
            console.error('❌ Error in batch remove tags:', error);
            vscode.window.showErrorMessage(`Batch remove tags failed: ${error.message}`);
        }
    }

    // ========================================================================
    // TERMINAL VIEW HANDLERS (Week 7)
    // ========================================================================

    /**
     * Get terminal command history
     */
    async _handleGetTerminalHistory() {
        try {
            const output = this._terminalManager.getActiveTerminalOutput(100);
            const history = output ? output.filter(line => {
                // Filter for commands (simple heuristic)
                const text = line.text.trim();
                return text.match(/^[$>%#]/) || text.includes('npm ') || text.includes('git ');
            }).map(line => ({
                command: line.text.trim(),
                timestamp: line.timestamp
            })) : [];

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'terminalHistory',
                    history
                });
            }
        } catch (error) {
            console.error('❌ Error getting terminal history:', error);
        }
    }

    /**
     * Get AI-powered terminal command suggestions
     */
    async _handleGetTerminalSuggestions(prompt) {
        try {
            // Get terminal context for better suggestions
            const terminalContext = this._terminalManager.getTerminalContext();

            // Call AI backend for command suggestions
            const response = await fetch('https://oropendola.ai/api/method/ai_assistant.api.terminal_suggest_command', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Frappe-CSRF-Token': this._csrfToken || ''
                },
                credentials: 'include',
                body: JSON.stringify({
                    prompt,
                    context: {
                        recent_output: terminalContext.recentOutput?.slice(-10) || [],
                        last_command: terminalContext.lastCommand || '',
                        platform: process.platform,
                        cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || ''
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const suggestions = data.message?.suggestions || data.suggestions || [];

            // Format suggestions for UI
            const formattedSuggestions = suggestions.map(s => ({
                command: s.command || s.cmd,
                description: s.description || s.desc || 'AI-generated command',
                confidence: s.confidence || s.score || 0.8,
                explanation: s.explanation || ''
            }));

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'terminalSuggestions',
                    suggestions: formattedSuggestions
                });
            }
        } catch (error) {
            console.error('❌ Error getting terminal suggestions:', error);

            // Fallback to basic suggestions on error
            const fallbackSuggestions = [{
                command: prompt.includes('install') ? 'npm install' : 'ls -la',
                description: 'Basic suggestion (AI unavailable)',
                confidence: 0.5
            }];

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'terminalSuggestions',
                    suggestions: fallbackSuggestions
                });
            }
        }
    }

    /**
     * Execute terminal command
     */
    async _handleExecuteTerminalCommand(command) {
        try {
            const terminal = this._terminalManager.getOrCreateTerminal();
            terminal.show();
            terminal.sendText(command);

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'terminalCommandExecuted',
                    command
                });
            }
        } catch (error) {
            console.error('❌ Error executing terminal command:', error);
        }
    }

    /**
     * Explain terminal command
     */
    async _handleExplainTerminalCommand(command) {
        try {
            // Call AI backend for command explanation
            const response = await fetch('https://oropendola.ai/api/method/ai_assistant.api.terminal_explain_command', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Frappe-CSRF-Token': this._csrfToken || ''
                },
                credentials: 'include',
                body: JSON.stringify({
                    command,
                    platform: process.platform
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const explanation = data.message?.explanation || data.explanation || `Command: ${command}`;

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'terminalCommandExplanation',
                    command,
                    explanation,
                    parts: data.message?.parts || data.parts || [],
                    warnings: data.message?.warnings || data.warnings || []
                });
            }
        } catch (error) {
            console.error('❌ Error explaining terminal command:', error);

            // Fallback explanation
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'terminalCommandExplanation',
                    command,
                    explanation: `Command: ${command}\n\nExplanation unavailable (AI service not connected)`,
                    error: true
                });
            }
        }
    }

    /**
     * Fix failed terminal command
     */
    async _handleFixTerminalCommand(command, error) {
        try {
            // Call AI backend to fix the command
            const response = await fetch('https://oropendola.ai/api/method/ai_assistant.api.terminal_fix_command', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Frappe-CSRF-Token': this._csrfToken || ''
                },
                credentials: 'include',
                body: JSON.stringify({
                    command,
                    error_message: error || '',
                    platform: process.platform,
                    context: {
                        recent_output: this._terminalManager.getActiveTerminalOutput(5) || [],
                        cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || ''
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const result = data.message || data;

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'terminalCommandFixed',
                    original: command,
                    fixed: result.fixed_command || result.command || command,
                    explanation: result.explanation || result.reason || 'AI-suggested fix',
                    confidence: result.confidence || 0.8,
                    alternatives: result.alternatives || []
                });
            }
        } catch (err) {
            console.error('❌ Error fixing terminal command:', err);

            // Fallback to basic fix
            const basicFix = command.replace('npm i', 'npm install').replace('git co', 'git checkout');
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'terminalCommandFixed',
                    original: command,
                    fixed: basicFix,
                    explanation: 'Basic fix (AI unavailable)',
                    error: true
                });
            }
        }
    }

    /**
     * Analyze terminal output
     */
    async _handleAnalyzeTerminalOutput(output) {
        try {
            // Call AI backend to analyze output
            const response = await fetch('https://oropendola.ai/api/method/ai_assistant.api.terminal_analyze_output', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Frappe-CSRF-Token': this._csrfToken || ''
                },
                credentials: 'include',
                body: JSON.stringify({
                    output: typeof output === 'string' ? output : JSON.stringify(output),
                    platform: process.platform
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const result = data.message || data;

            const analysis = {
                summary: result.summary || 'Output analysis',
                errors: result.errors || [],
                warnings: result.warnings || [],
                suggestions: result.suggestions || [],
                severity: result.severity || 'info',
                next_steps: result.next_steps || []
            };

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'terminalOutputAnalysis',
                    analysis
                });
            }
        } catch (error) {
            console.error('❌ Error analyzing terminal output:', error);

            // Fallback analysis
            const fallbackAnalysis = {
                summary: 'Basic analysis (AI unavailable)',
                errors: typeof output === 'string' && output.toLowerCase().includes('error')
                    ? ['Error detected in output'] : [],
                suggestions: ['Check command syntax and arguments'],
                severity: 'info'
            };

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'terminalOutputAnalysis',
                    analysis: fallbackAnalysis,
                    error: true
                });
            }
        }
    }

    // ========================================================================
    // BROWSER AUTOMATION HANDLERS (Week 6)
    // ========================================================================

    /**
     * Get browser sessions list
     */
    async _handleGetBrowserSessions() {
        try {
            if (!this._browserClient) {
                const { BrowserAutomationClient } = await import('../browser/BrowserAutomationClient.ts');
                this._browserClient = BrowserAutomationClient.getInstance();
            }

            const result = await this._browserClient.listSessions();

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'browserSessions',
                    sessions: result.sessions || []
                });
            }
        } catch (error) {
            console.error('❌ Error getting browser sessions:', error);
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'browserSessions',
                    sessions: [],
                    error: error.message
                });
            }
        }
    }

    /**
     * Create new browser session
     */
    async _handleCreateBrowserSession(sessionName) {
        try {
            if (!this._browserClient) {
                const { BrowserAutomationClient } = await import('../browser/BrowserAutomationClient.ts');
                this._browserClient = BrowserAutomationClient.getInstance();
            }

            const result = await this._browserClient.createSession({
                sessionName: sessionName || 'Session ' + Date.now()
            });

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'browserSessionCreated',
                    success: result.success,
                    sessionId: result.sessionId,
                    message: result.message
                });
            }
        } catch (error) {
            console.error('❌ Error creating browser session:', error);
        }
    }

    /**
     * Close browser session
     */
    async _handleCloseBrowserSession(sessionId) {
        try {
            if (!this._browserClient) {
                const { BrowserAutomationClient } = await import('../browser/BrowserAutomationClient.ts');
                this._browserClient = BrowserAutomationClient.getInstance();
            }

            const result = await this._browserClient.closeSession(sessionId);

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'browserSessionClosed',
                    success: result.success,
                    sessionId,
                    message: result.message
                });
            }
        } catch (error) {
            console.error('❌ Error closing browser session:', error);
        }
    }

    /**
     * Navigate browser to URL
     */
    async _handleBrowserNavigate(sessionId, url) {
        try {
            if (!this._browserClient) {
                const { BrowserAutomationClient } = await import('../browser/BrowserAutomationClient.ts');
                this._browserClient = BrowserAutomationClient.getInstance();
            }

            const result = await this._browserClient.navigate(sessionId, url);

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'browserNavigated',
                    success: result.success,
                    url: result.url,
                    title: result.title,
                    message: result.message
                });
            }
        } catch (error) {
            console.error('❌ Error navigating browser:', error);
        }
    }

    /**
     * Execute AI-powered browser action
     */
    async _handleBrowserExecuteAction(sessionId, prompt) {
        try {
            if (!this._browserClient) {
                const { BrowserAutomationClient } = await import('../browser/BrowserAutomationClient.ts');
                this._browserClient = BrowserAutomationClient.getInstance();
            }

            // Get current page context for better AI understanding
            const pageInfo = await this._browserClient.getCurrentUrl(sessionId);

            // Call AI backend to convert natural language to Playwright actions
            const response = await fetch('https://oropendola.ai/api/method/ai_assistant.api.browser_execute_ai_action', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Frappe-CSRF-Token': this._csrfToken || ''
                },
                credentials: 'include',
                body: JSON.stringify({
                    session_id: sessionId,
                    prompt,
                    context: {
                        current_url: pageInfo.url || '',
                        current_title: pageInfo.title || ''
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const result = data.message || data;

            // Execute the AI-generated actions
            const actions = result.actions || [];
            const results = [];

            for (const action of actions) {
                let actionResult;
                switch (action.type) {
                    case 'click':
                        actionResult = await this._browserClient.click(sessionId, action.selector);
                        break;
                    case 'type':
                        actionResult = await this._browserClient.type(sessionId, action.selector, action.text);
                        break;
                    case 'navigate':
                        actionResult = await this._browserClient.navigate(sessionId, action.url);
                        break;
                    case 'select':
                        actionResult = await this._browserClient.select(sessionId, action.selector, action.value);
                        break;
                    case 'scroll':
                        actionResult = await this._browserClient.scroll(sessionId, action.options || {});
                        break;
                    case 'screenshot':
                        actionResult = await this._browserClient.screenshot(sessionId);
                        break;
                    case 'evaluate':
                        actionResult = await this._browserClient.evaluate(sessionId, action.script);
                        break;
                    default:
                        actionResult = { success: false, message: `Unknown action type: ${action.type}` };
                }

                results.push({
                    action: action.type,
                    ...actionResult
                });

                // Stop on first failure if configured
                if (!actionResult.success && result.stop_on_error) {
                    break;
                }
            }

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'browserActionExecuted',
                    success: true,
                    action: prompt,
                    result: result.description || 'AI actions executed',
                    actions: actions.map(a => a.type),
                    results,
                    interpretation: result.interpretation || ''
                });
            }
        } catch (error) {
            console.error('❌ Error executing browser action:', error);

            // Fallback response
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'browserActionExecuted',
                    success: false,
                    action: prompt,
                    result: 'AI action execution failed (AI service unavailable)',
                    error: error.message
                });
            }
        }
    }

    /**
     * Take browser screenshot
     */
    async _handleBrowserScreenshot(sessionId) {
        try {
            if (!this._browserClient) {
                const { BrowserAutomationClient } = await import('../browser/BrowserAutomationClient.ts');
                this._browserClient = BrowserAutomationClient.getInstance();
            }

            const result = await this._browserClient.screenshot(sessionId);

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'browserScreenshot',
                    success: result.success,
                    fileId: result.fileId,
                    filePath: result.filePath,
                    message: result.message
                });
            }
        } catch (error) {
            console.error('❌ Error taking browser screenshot:', error);
        }
    }

    /**
     * Click element in browser
     */
    async _handleBrowserClick(sessionId, selector) {
        try {
            if (!this._browserClient) {
                const { BrowserAutomationClient } = await import('../browser/BrowserAutomationClient.ts');
                this._browserClient = BrowserAutomationClient.getInstance();
            }

            const result = await this._browserClient.click(sessionId, selector);

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'browserClicked',
                    success: result.success,
                    message: result.message
                });
            }
        } catch (error) {
            console.error('❌ Error clicking browser element:', error);
        }
    }

    /**
     * Type text in browser
     */
    async _handleBrowserType(sessionId, selector, text) {
        try {
            if (!this._browserClient) {
                const { BrowserAutomationClient } = await import('../browser/BrowserAutomationClient.ts');
                this._browserClient = BrowserAutomationClient.getInstance();
            }

            const result = await this._browserClient.type(sessionId, selector, text);

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'browserTyped',
                    success: result.success,
                    message: result.message
                });
            }
        } catch (error) {
            console.error('❌ Error typing in browser:', error);
        }
    }

    // ========================================================================
    // MARKETPLACE HANDLERS (Week 8)
    // ========================================================================

    /**
     * Search VS Code Marketplace
     */
    async _handleSearchMarketplace(query, category) {
        try {
            if (!this._marketplaceClient) {
                const { MarketplaceClient } = await import('../marketplace/MarketplaceClient.ts');
                this._marketplaceClient = MarketplaceClient.getInstance();
            }

            const result = await this._marketplaceClient.searchExtensions({
                query,
                category,
                pageSize: 20
            });

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'marketplaceSearchResults',
                    extensions: result.extensions,
                    total: result.total
                });
            }
        } catch (error) {
            console.error('❌ Error searching marketplace:', error);
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'marketplaceSearchResults',
                    extensions: [],
                    error: error.message
                });
            }
        }
    }

    /**
     * Get installed VS Code extensions
     */
    async _handleGetInstalledExtensions() {
        try {
            const installed = vscode.extensions.all
                .filter(ext => !ext.packageJSON.isBuiltin)
                .map(ext => ({
                    id: ext.id,
                    name: ext.packageJSON.name,
                    version: ext.packageJSON.version,
                    enabled: true
                }));

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'installedExtensions',
                    extensions: installed
                });
            }
        } catch (error) {
            console.error('❌ Error getting installed extensions:', error);
        }
    }

    /**
     * Install VS Code extension
     */
    async _handleInstallExtension(extensionId) {
        try {
            await vscode.commands.executeCommand('workbench.extensions.installExtension', extensionId);

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'extensionInstalled',
                    extensionId,
                    success: true
                });
            }

            vscode.window.showInformationMessage(`Extension ${extensionId} installation started`);
        } catch (error) {
            console.error('❌ Error installing extension:', error);
            vscode.window.showErrorMessage(`Failed to install ${extensionId}`);
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'extensionInstalled',
                    extensionId,
                    success: false,
                    error: error.message
                });
            }
        }
    }

    /**
     * Uninstall VS Code extension
     */
    async _handleUninstallExtension(extensionId) {
        try {
            await vscode.commands.executeCommand('workbench.extensions.uninstallExtension', extensionId);

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'extensionUninstalled',
                    extensionId,
                    success: true
                });
            }

            vscode.window.showInformationMessage(`Extension ${extensionId} uninstalled`);
        } catch (error) {
            console.error('❌ Error uninstalling extension:', error);
            vscode.window.showErrorMessage(`Failed to uninstall ${extensionId}`);
        }
    }

    /**
     * Get extension details from marketplace
     */
    async _handleGetExtensionDetails(extensionId) {
        try {
            if (!this._marketplaceClient) {
                const { MarketplaceClient } = await import('../marketplace/MarketplaceClient.ts');
                this._marketplaceClient = MarketplaceClient.getInstance();
            }

            const extension = await this._marketplaceClient.getExtension(extensionId);

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'extensionDetails',
                    extension
                });
            }
        } catch (error) {
            console.error('❌ Error getting extension details:', error);
        }
    }

    // ========================================================================
    // VECTOR DATABASE HANDLERS (Week 8)
    // ========================================================================

    /**
     * Perform semantic vector search
     */
    async _handleVectorSearch(query, limit = 50) {
        try {
            if (!this._vectorClient) {
                const { VectorDBClient } = await import('../vector/VectorDBClient.ts');
                this._vectorClient = new VectorDBClient();
            }

            const results = await this._vectorClient.search(query, {
                limit,
                minSimilarity: 0.5
            });

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'vectorSearchResults',
                    results
                });
            }
        } catch (error) {
            console.error('❌ Error performing vector search:', error);
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'vectorSearchResults',
                    results: [],
                    error: error.message
                });
            }
        }
    }

    /**
     * Index entire workspace
     */
    async _handleIndexWorkspace() {
        try {
            if (!this._vectorClient) {
                const { VectorDBClient } = await import('../vector/VectorDBClient.ts');
                this._vectorClient = new VectorDBClient();
            }

            // Get all files in workspace
            const files = await vscode.workspace.findFiles('**/*.{js,ts,jsx,tsx,py,java,cpp,c,go}', '**/node_modules/**', 1000);

            let indexed = 0;
            for (const file of files) {
                try {
                    const document = await vscode.workspace.openTextDocument(file);
                    const content = document.getText();

                    await this._vectorClient.indexContent(content, {
                        filePath: file.fsPath,
                        type: 'code'
                    });
                    indexed++;

                    // Send progress update
                    if (this._view && indexed % 10 === 0) {
                        this._view.webview.postMessage({
                            type: 'indexingProgress',
                            indexed,
                            total: files.length
                        });
                    }
                } catch (err) {
                    console.warn(`Failed to index ${file.fsPath}:`, err);
                }
            }

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'workspaceIndexed',
                    success: true,
                    filesIndexed: indexed
                });
            }

            vscode.window.showInformationMessage(`Indexed ${indexed} files`);
        } catch (error) {
            console.error('❌ Error indexing workspace:', error);
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'workspaceIndexed',
                    success: false,
                    error: error.message
                });
            }
        }
    }

    /**
     * Get list of indexed files
     */
    async _handleGetIndexedFiles() {
        try {
            // Mock response - would query backend for indexed files
            const indexedFiles = [];

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'indexedFiles',
                    files: indexedFiles
                });
            }
        } catch (error) {
            console.error('❌ Error getting indexed files:', error);
        }
    }

    /**
     * Get vector database statistics
     */
    async _handleGetIndexStats() {
        try {
            // Mock stats - would query backend
            const stats = {
                total: 0,
                indexed: 0,
                pending: 0
            };

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'indexStats',
                    stats
                });
            }
        } catch (error) {
            console.error('❌ Error getting index stats:', error);
        }
    }

    /**
     * Delete vector database index
     */
    async _handleDeleteIndex() {
        try {
            // Mock deletion - would call backend API
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'indexDeleted',
                    success: true
                });
            }

            vscode.window.showInformationMessage('Vector database index deleted');
        } catch (error) {
            console.error('❌ Error deleting index:', error);
        }
    }

    // ========================================================================
    // SETTINGS & I18N HANDLERS
    // ========================================================================

    /**
     * Change UI language
     */
    async _handleChangeLanguage(language) {
        try {
            if (!this._i18nManager) {
                const { I18nManager } = await import('../i18n/I18nManager.ts');
                this._i18nManager = new I18nManager();
            }

            // Save language preference
            const config = vscode.workspace.getConfiguration('oropendola');
            await config.update('language', language, vscode.ConfigurationTarget.Global);

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'languageChanged',
                    language,
                    success: true
                });
            }

            vscode.window.showInformationMessage(`Language changed to ${language}`);
        } catch (error) {
            console.error('❌ Error changing language:', error);
        }
    }

    /**
     * Update application settings
     */
    async _handleUpdateSettings(settings) {
        try {
            const config = vscode.workspace.getConfiguration('oropendola');

            for (const [key, value] of Object.entries(settings)) {
                await config.update(key, value, vscode.ConfigurationTarget.Global);
            }

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'settingsUpdated',
                    success: true
                });
            }
        } catch (error) {
            console.error('❌ Error updating settings:', error);
        }
    }

    /**
     * Get current application settings
     */
    async _handleGetSettings() {
        try {
            const config = vscode.workspace.getConfiguration('oropendola');
            const settings = {
                language: config.get('language', 'en'),
                theme: config.get('theme', 'dark'),
                autoSave: config.get('autoSave', true),
                notifications: config.get('notifications', true),
                telemetry: config.get('telemetry', false)
            };

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'settings',
                    settings
                });
            }
        } catch (error) {
            console.error('❌ Error getting settings:', error);
        }
    }

    // ============================================
    // User API Handlers
    // ============================================

    /**
     * Get user's API key
     */
    async _handleGetMyAPIKey() {
        try {
            const userAPIClient = require('../api/user-api-client');
            
            if (!userAPIClient.isAuthenticated()) {
                throw new Error('Not authenticated. Please sign in first.');
            }

            const data = await userAPIClient.getMyAPIKey();

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'apiKeyData',
                    data: data
                });
            }
        } catch (error) {
            console.error('❌ Error getting API key:', error);
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'error',
                    message: error.message
                });
            }
        }
    }

    /**
     * Get user's subscription details
     */
    async _handleGetMySubscription() {
        try {
            const userAPIClient = require('../api/user-api-client');
            
            if (!userAPIClient.isAuthenticated()) {
                throw new Error('Not authenticated. Please sign in first.');
            }

            const data = await userAPIClient.getMySubscription();

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'subscriptionData',
                    data: data
                });
            }
        } catch (error) {
            console.error('❌ Error getting subscription:', error);
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'error',
                    message: error.message
                });
            }
        }
    }

    /**
     * Regenerate user's API key
     */
    async _handleRegenerateAPIKey() {
        try {
            const userAPIClient = require('../api/user-api-client');
            
            if (!userAPIClient.isAuthenticated()) {
                throw new Error('Not authenticated. Please sign in first.');
            }

            // Confirm with user first
            const confirm = await vscode.window.showWarningMessage(
                '⚠️ This will revoke your current API key. Continue?',
                { modal: true },
                'Yes, Regenerate',
                'Cancel'
            );

            if (confirm !== 'Yes, Regenerate') {
                return;
            }

            const data = await userAPIClient.regenerateAPIKey();

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'apiKeyRegenerated',
                    data: data
                });
            }

            vscode.window.showInformationMessage('✅ API key regenerated successfully!');
        } catch (error) {
            console.error('❌ Error regenerating API key:', error);
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'error',
                    message: error.message
                });
            }
        }
    }

    /**
     * Get complete user profile (subscription + API key info)
     */
    async _handleGetUserProfile() {
        try {
            const userAPIClient = require('../api/user-api-client');
            
            if (!userAPIClient.isAuthenticated()) {
                throw new Error('Not authenticated. Please sign in first.');
            }

            const data = await userAPIClient.getUserProfile();

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'userProfile',
                    data: data
                });
            }
        } catch (error) {
            console.error('❌ Error getting user profile:', error);
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'error',
                    message: error.message
                });
            }
        }
    }

    /**
     * Handle getWorkspaceFiles - returns all files in workspace
     */
    async _handleGetWorkspaceFiles(messageId) {
        try {
            const vscode = require('vscode');
            const path = require('path');

            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                if (this._view) {
                    this._view.webview.postMessage({
                        type: 'workspaceFilesResponse',
                        id: messageId,
                        files: []
                    });
                }
                return;
            }

            // Get all files from workspace
            const files = await vscode.workspace.findFiles(
                '**/*',
                '**/node_modules/**'
            );

            const fileList = files.map(uri => {
                const relativePath = vscode.workspace.asRelativePath(uri);
                const fileName = path.basename(uri.fsPath);
                return {
                    path: uri.fsPath,
                    name: fileName,
                    relativePath: relativePath,
                    isDirectory: false
                };
            });

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'workspaceFilesResponse',
                    id: messageId,
                    files: fileList
                });
            }
        } catch (error) {
            console.error('❌ Error getting workspace files:', error);
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'workspaceFilesResponse',
                    id: messageId,
                    files: [],
                    error: error.message
                });
            }
        }
    }

    /**
     * Handle getWorkspaceFolders - returns all folders in workspace
     */
    async _handleGetWorkspaceFolders(messageId) {
        try {
            const vscode = require('vscode');
            const path = require('path');
            const fs = require('fs').promises;

            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                if (this._view) {
                    this._view.webview.postMessage({
                        type: 'workspaceFoldersResponse',
                        id: messageId,
                        folders: []
                    });
                }
                return;
            }

            // Recursively get all directories
            const getAllDirs = async (dirPath) => {
                const dirs = [];
                try {
                    const entries = await fs.readdir(dirPath, { withFileTypes: true });
                    for (const entry of entries) {
                        if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
                            const fullPath = path.join(dirPath, entry.name);
                            const relativePath = vscode.workspace.asRelativePath(fullPath);
                            dirs.push({
                                path: fullPath,
                                name: entry.name,
                                relativePath: relativePath,
                                isDirectory: true
                            });
                            // Recursively get subdirectories
                            const subdirs = await getAllDirs(fullPath);
                            dirs.push(...subdirs);
                        }
                    }
                } catch (error) {
                    // Skip directories we can't read
                    console.warn('⚠️ Could not read directory:', dirPath, error.message);
                }
                return dirs;
            };

            const allFolders = [];
            for (const folder of workspaceFolders) {
                const folders = await getAllDirs(folder.uri.fsPath);
                allFolders.push(...folders);
            }

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'workspaceFoldersResponse',
                    id: messageId,
                    folders: allFolders
                });
            }
        } catch (error) {
            console.error('❌ Error getting workspace folders:', error);
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'workspaceFoldersResponse',
                    id: messageId,
                    folders: [],
                    error: error.message
                });
            }
        }
    }

    /**
     * Handle getFileContent - returns content of a specific file
     */
    async _handleGetFileContent(messageId, filePath) {
        try {
            const vscode = require('vscode');
            const fs = require('fs').promises;
            const path = require('path');

            // Resolve relative paths
            let resolvedPath = filePath;
            if (!path.isAbsolute(filePath)) {
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (workspaceFolders && workspaceFolders.length > 0) {
                    resolvedPath = path.join(workspaceFolders[0].uri.fsPath, filePath);
                }
            }

            const content = await fs.readFile(resolvedPath, 'utf8');

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'fileContentResponse',
                    id: messageId,
                    content: content,
                    path: filePath
                });
            }
        } catch (error) {
            console.error('❌ Error getting file content:', error);
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'fileContentResponse',
                    id: messageId,
                    content: '',
                    error: error.message
                });
            }
        }
    }

    /**
     * Handle selectImages - opens file picker for image selection
     */
    async _handleSelectImages(maxImages) {
        try {
            const vscode = require('vscode');

            const options = {
                canSelectMany: maxImages > 1,
                canSelectFiles: true,
                canSelectFolders: false,
                filters: {
                    'Images': ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg']
                },
                openLabel: 'Select Images'
            };

            const fileUris = await vscode.window.showOpenDialog(options);

            if (fileUris && fileUris.length > 0) {
                const selectedImages = fileUris
                    .slice(0, maxImages)
                    .map(uri => uri.fsPath);

                if (this._view) {
                    this._view.webview.postMessage({
                        type: 'imagesSelected',
                        images: selectedImages
                    });
                }
            }
        } catch (error) {
            console.error('❌ Error selecting images:', error);
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'error',
                    message: `Failed to select images: ${error.message}`
                });
            }
        }
    }

    /**
     * Initialize checkpoint service for current task
     */
    _initializeCheckpointService() {
        if (!this._currentTask) {
            console.warn('⚠️ [Checkpoint] Cannot initialize: no active task');
            return;
        }

        const CheckpointService = require('../services/CheckpointService');
        const vscode = require('vscode');

        const taskId = this._currentTask.id || 'default';
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath || process.cwd();
        const storageRoot = this._context.globalStorageUri.fsPath;

        this._checkpointService = new CheckpointService(taskId, workspaceRoot, storageRoot);
        console.log(`✅ [Checkpoint] Service initialized for task ${taskId}`);
    }

    /**
     * Handle save checkpoint request
     */
    async _handleSaveCheckpoint(conversationState) {
        try {
            if (!this._checkpointService) {
                this._initializeCheckpointService();
            }

            if (!this._checkpointService) {
                throw new Error('Checkpoint service not available');
            }

            const result = await this._checkpointService.save(conversationState);

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'checkpointSaved',
                    checkpoint: result
                });
            }

            console.log(`💾 [Checkpoint] Saved: ${result.checkpointId}`);
        } catch (error) {
            console.error('❌ Error saving checkpoint:', error);
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'error',
                    message: `Failed to save checkpoint: ${error.message}`
                });
            }
        }
    }

    /**
     * Handle restore checkpoint request
     */
    async _handleRestoreCheckpoint(checkpointId) {
        try {
            if (!this._checkpointService) {
                throw new Error('Checkpoint service not initialized');
            }

            const conversationState = await this._checkpointService.restore(checkpointId);

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'checkpointRestored',
                    conversationState: conversationState,
                    checkpointId: checkpointId
                });
            }

            console.log(`🔄 [Checkpoint] Restored: ${checkpointId}`);
        } catch (error) {
            console.error('❌ Error restoring checkpoint:', error);
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'error',
                    message: `Failed to restore checkpoint: ${error.message}`
                });
            }
        }
    }

    /**
     * Handle list checkpoints request
     */
    async _handleListCheckpoints() {
        try {
            if (!this._checkpointService) {
                this._initializeCheckpointService();
            }

            if (!this._checkpointService) {
                throw new Error('Checkpoint service not available');
            }

            const checkpoints = await this._checkpointService.listCheckpoints();

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'checkpointsList',
                    checkpoints: checkpoints
                });
            }

            console.log(`📋 [Checkpoint] Listed ${checkpoints.length} checkpoints`);
        } catch (error) {
            console.error('❌ Error listing checkpoints:', error);
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'error',
                    message: `Failed to list checkpoints: ${error.message}`
                });
            }
        }
    }

    /**
     * Handle delete checkpoint request
     */
    async _handleDeleteCheckpoint(checkpointId) {
        try {
            if (!this._checkpointService) {
                throw new Error('Checkpoint service not initialized');
            }

            await this._checkpointService.deleteCheckpoint(checkpointId);

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'checkpointDeleted',
                    checkpointId: checkpointId
                });
            }

            console.log(`🗑️ [Checkpoint] Deleted: ${checkpointId}`);
        } catch (error) {
            console.error('❌ Error deleting checkpoint:', error);
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'error',
                    message: `Failed to delete checkpoint: ${error.message}`
                });
            }
        }
    }

    /**
     * Handle get checkpoint diff request
     */
    async _handleGetCheckpointDiff(checkpointId) {
        try {
            if (!this._checkpointService) {
                throw new Error('Checkpoint service not initialized');
            }

            const diff = await this._checkpointService.getDiff(checkpointId);

            if (this._view) {
                this._view.webview.postMessage({
                    type: 'checkpointDiff',
                    diff: diff,
                    checkpointId: checkpointId
                });
            }

            console.log(`📊 [Checkpoint] Got diff for: ${checkpointId}`);
        } catch (error) {
            console.error('❌ Error getting checkpoint diff:', error);
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'error',
                    message: `Failed to get checkpoint diff: ${error.message}`
                });
            }
        }
    }
}

module.exports = OropendolaSidebarProvider;
