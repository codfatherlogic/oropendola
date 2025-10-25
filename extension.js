const vscode = require('vscode');
const GitHubManager = require('./src/github/api');
const ChatManager = require('./src/ai/chat-manager');
const RepositoryAnalyzer = require('./src/analysis/repository-analyzer');
const OropendolaProvider = require('./src/ai/providers/oropendola-provider');
const AuthManager = require('./src/auth/auth-manager');
const OropendolaSidebarProvider = require('./src/sidebar/sidebar-provider');
// const OropendolaSettingsProvider = require('./src/sidebar/settings-provider'); // Removed
const OropendolaAutocompleteProvider = require('./src/autocomplete/autocomplete-provider');
const EditMode = require('./src/edit/edit-mode');

// Enterprise Features
const { EnhancedAuthManager } = require('./src/auth/AuthManager');
const { WorkspaceIndexer } = require('./src/workspace/WorkspaceIndexer');
const { OropendolaInlineCompletionProvider } = require('./src/providers/InlineCompletionProvider');
const { OropendolaDiagnosticsProvider } = require('./src/providers/DiagnosticsProvider');
const { OropendolaCodeActionProvider } = require('./src/providers/CodeActionProvider');
const { TelemetryService } = require('./src/telemetry/TelemetryService');
const { SettingsProvider } = require('./src/settings/SettingsProvider');
const { CopilotChatPanel } = require('./src/views/CopilotChatPanel');

// Backend Integration v2.0 - New Panels
const TodoPanel = require('./src/panels/TodoPanel');

// v3.4.3: Workspace Memory and Status Bar
const WorkspaceMemoryService = require('./src/memory/WorkspaceMemoryService');
const StatusBarManager = require('./src/ui/StatusBarManager');

// Sprint 1-2: Task Persistence Layer
const TaskManager = require('./src/services/tasks/TaskManager');

let gitHubManager;
let chatManager;
let repositoryAnalyzer;
let oropendolaProvider;
let authManager;
let sidebarProvider;
// let settingsProvider; // Removed
let statusBarItem;
let lastResponseTime = 0;
let autocompleteProvider;
let editMode;
let extensionContext; // Store context for later use

// Enterprise services
let enhancedAuthManager;
let workspaceIndexer;
let inlineCompletionProvider;
let diagnosticsProvider;
let codeActionProvider;
let telemetryService;
let settingsProvider;
let inlineCompletionStatusBar;

// Backend Integration v2.0 - UI Panels
let todoPanel;

// v3.4.3: Workspace Memory and Status Bar
let workspaceMemory;
let statusBarManager;

// Week 3.1: Internationalization
let i18nManager;

// Sprint 1-2: Task Manager
let taskManager;

/**
 * Extension activation
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    extensionContext = context; // Store for later registration
    console.log('🐦 Oropendola AI Extension is now active!');

    // Register sidebar webview provider FIRST
    sidebarProvider = new OropendolaSidebarProvider(context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'oropendola.chatView',
            sidebarProvider,
            {
                webviewOptions: {
                    retainContextWhenHidden: true
                }
            }
        )
    );
    console.log('✅ Sidebar provider registered');

    // v3.4.3: Initialize Status Bar Manager
    try {
        statusBarManager = new StatusBarManager();
        context.subscriptions.push(statusBarManager);

        // Initialize with default state
        const config = vscode.workspace.getConfiguration('oropendola');
        const mode = config.get('chat.mode', 'agent');
        statusBarManager.updateMode(mode);
        statusBarManager.updateConnection(false); // Will update when connected

        console.log('✅ Status Bar Manager initialized');
    } catch (error) {
        console.error('❌ Status Bar Manager error:', error);
    }

    // v3.4.3: Initialize Workspace Memory Service (if workspace available)
    try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const workspacePath = workspaceFolders[0].uri.fsPath;
            workspaceMemory = new WorkspaceMemoryService(workspacePath);
            console.log('✅ Workspace Memory Service initialized');
        } else {
            console.log('ℹ️  No workspace folder - memory service not initialized');
        }
    } catch (error) {
        console.error('❌ Workspace Memory Service error:', error);
    }

    // Week 3.1: Initialize I18n Manager
    try {
        const { getInstance: getI18nManager } = require('./src/i18n/I18nManager');
        i18nManager = getI18nManager();

        // Get saved language or detect from browser
        const config = vscode.workspace.getConfiguration('oropendola');
        const savedLanguage = config.get('language', 'en');

        // Initialize i18n (async, don't block extension activation)
        i18nManager.initialize(savedLanguage).then(() => {
            console.log('✅ I18n Manager initialized with language:', savedLanguage);
        }).catch(err => {
            console.warn('⚠️  I18n initialization warning:', err);
        });
    } catch (error) {
        console.error('❌ I18n Manager error:', error);
    }

    // Week 8: Initialize Plugin Manager (Phase 1)
    try {
        const { getInstance: getPluginManager } = require('./src/marketplace/PluginManager');
        const pluginManager = getPluginManager();
        pluginManager.initialize(context);
        console.log('✅ Plugin Manager initialized');
    } catch (error) {
        console.error('❌ Plugin Manager error:', error);
    }

    // Sprint 1-2: Initialize Task Manager
    try {
        const path = require('path');
        const os = require('os');
        const storagePath = path.join(os.homedir(), '.oropendola');
        taskManager = new TaskManager(storagePath);

        // Initialize TaskManager (async, but don't block extension activation)
        taskManager.initialize().then(() => {
            console.log('✅ Task Manager initialized');

            // Connect task manager to sidebar provider
            if (sidebarProvider) {
                sidebarProvider.setTaskManager(taskManager);
                console.log('✅ TaskManager connected to sidebar');
            }

            // Set up event listeners
            taskManager.on('taskCreated', task => {
                console.log(`📝 Task created: ${task.id}`);
            });

            taskManager.on('taskCompleted', task => {
                console.log(`✅ Task completed: ${task.id}`);
            });

            taskManager.on('taskFailed', (task, error) => {
                console.error(`❌ Task failed: ${task.id}`, error);
            });
        }).catch(err => {
            console.error('⚠️  Task Manager initialization error:', err);
        });
    } catch (error) {
        console.error('❌ Task Manager error:', error);
    }

    // Initialize managers with error handling
    try {
        authManager = new AuthManager();
        console.log('✅ AuthManager initialized');

        // Set up authentication success callback
        authManager.setAuthSuccessCallback(() => {
            initializeOropendolaProvider();
            updateStatusBarForAuthenticated();
            // Settings view removed
            // if (settingsProvider) {
            //     settingsProvider.refreshSettings();
            // }
        });
    } catch (error) {
        console.error('❌ AuthManager error:', error);
    }

    // Settings provider removed - no longer needed
    // settingsProvider = new OropendolaSettingsProvider(context, authManager);
    // context.subscriptions.push(
    //     vscode.window.registerWebviewViewProvider(
    //         'oropendola.settingsView',
    //         settingsProvider,
    //         {
    //             webviewOptions: {
    //                 retainContextWhenHidden: true
    //             }
    //         }
    //     )
    // );
    // console.log('✅ Settings provider registered');

    // Register all commands
    console.log('🔧 Registering commands...');
    registerCommands(context);
    console.log('✅ Commands registered successfully');

    // Register browser automation commands (Week 6)
    registerBrowserAutomationCommands(context);

    // Register code actions commands (Week 11)
    registerCodeActionsCommands(context);

    // Now initialize managers with error handling
    try {
        gitHubManager = new GitHubManager();
        console.log('✅ GitHubManager initialized');
    } catch (error) {
        console.error('❌ GitHubManager error:', error);
    }

    try {
        chatManager = new ChatManager();
        console.log('✅ ChatManager initialized');

        // Connect chat manager to sidebar provider
        if (sidebarProvider) {
            sidebarProvider.setChatManager(chatManager);
            console.log('✅ ChatManager connected to sidebar');
        }
    } catch (error) {
        console.error('❌ ChatManager error:', error);
    }

    try {
        repositoryAnalyzer = new RepositoryAnalyzer();
        console.log('✅ RepositoryAnalyzer initialized');
    } catch (error) {
        console.error('❌ RepositoryAnalyzer error:', error);
    }

    // Check if user is already authenticated
    if (authManager) {
        authManager.checkAuthentication().then(isAuth => {
            if (isAuth) {
                initializeOropendolaProvider();
                updateStatusBarForAuthenticated();
            } else {
                updateStatusBarForLogin();
            }
        }).catch(err => {
            console.error('Auth check failed:', err);
            updateStatusBarForLogin();
        });
    }

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    context.subscriptions.push(statusBarItem);

    // Show initial login status
    updateStatusBarForLogin();

    // Setup context menu providers
    try {
        setupProviders(context);
        console.log('✅ Providers setup complete');
    } catch (error) {
        console.error('❌ Provider setup error:', error);
    }

    // Check subscription status on startup if authenticated (with delay to allow network to stabilize)
    if (authManager && authManager.isAuthenticated) {
        setTimeout(() => {
            checkSubscriptionStatus(false, true); // silent check with network validation
        }, 3000); // Wait 3 seconds after activation
    }

    // Set workspace context
    vscode.commands.executeCommand('setContext', 'oropendola.enabled', true);

    // Welcome notification removed - silent activation
    // setTimeout(() => {
    //     vscode.window.showInformationMessage(
    //         '🐦 Oropendola AI Assistant activated! Press Cmd+Shift+L (Ctrl+Shift+L on Windows/Linux) to login or Cmd+Shift+H for help.',
    //         'View Shortcuts', 'Login Now'
    //     ).then(selection => {
    //         if (selection === 'View Shortcuts') {
    //             vscode.commands.executeCommand('workbench.action.openGlobalKeybindings', '@ext:oropendola.oropendola-ai-assistant');
    //         } else if (selection === 'Login Now') {
    //             vscode.commands.executeCommand('oropendola.login');
    //         }
    //     });
    // }, 1000);

    // Initialize enterprise features
    initializeEnterpriseFeatures(context);

    console.log('✅ Oropendola AI Assistant fully activated!');
}

/**
 * Initialize Oropendola AI Provider and related services
 */
function initializeOropendolaProvider() {
    console.log('🔧 Initializing Oropendola provider...');
    const config = vscode.workspace.getConfiguration('oropendola');
    const apiKey = config.get('api.key');
    const apiSecret = config.get('api.secret');
    const sessionCookies = config.get('session.cookies');

    console.log(`🔍 API Key: ${apiKey ? 'Present' : 'Missing'}`);
    console.log(`🔍 API Secret: ${apiSecret ? 'Present' : 'Missing'}`);
    console.log(`🔍 Session Cookies: ${sessionCookies ? 'Present' : 'Missing'}`);

    // Support both authentication methods
    if ((apiKey && apiSecret) || sessionCookies) {
        oropendolaProvider = new OropendolaProvider({
            apiUrl: config.get('api.url', 'https://oropendola.ai'),
            apiKey: apiKey || 'session', // Use 'session' as placeholder if using cookies
            apiSecret: apiSecret || sessionCookies, // Pass cookies as secret if no API secret
            temperature: config.get('ai.temperature', 0.7),
            maxTokens: config.get('ai.maxTokens', 4096),
            sessionCookies // Pass cookies explicitly
        });

        oropendolaProvider.setStatusBarItem(statusBarItem);
        console.log('✅ Oropendola provider created');

        // Initialize autocomplete provider
        if (!autocompleteProvider && config.get('autocomplete.enabled', true)) {
            autocompleteProvider = new OropendolaAutocompleteProvider(oropendolaProvider);
            console.log('✅ Autocomplete provider initialized');

            // Register with VS Code immediately
            if (extensionContext) {
                extensionContext.subscriptions.push(
                    vscode.languages.registerInlineCompletionItemProvider(
                        { pattern: '**' }, // All files
                        autocompleteProvider
                    )
                );
                console.log('✅ Autocomplete provider registered for all languages');
            } else {
                console.error('❌ extensionContext not available for autocomplete registration');
            }
        }

        // Initialize edit mode
        if (!editMode) {
            editMode = new EditMode(oropendolaProvider);
            console.log('✅ Edit mode initialized');
        }
    } else {
        console.error('❌ Cannot initialize Oropendola provider - no credentials found');
        console.error('   Please check that either (api.key + api.secret) or session.cookies are set');
    }
}

/**
 * Register all extension commands
 * @param {vscode.ExtensionContext} context
 */
function registerCommands(context) {
    console.log('🔧 Registering Oropendola commands...');

    // Test command first - minimal dependencies
    const testCommand = vscode.commands.registerCommand('oropendola.test', () => {
        vscode.window.showInformationMessage('🎉 Oropendola Test Command Works!');
        console.log('🎉 Test command executed successfully!');
    });
    context.subscriptions.push(testCommand);
    console.log('✅ oropendola.test command registered');

    // Oropendola: Login - Focus sidebar instead of opening separate panel
    const loginCommand = vscode.commands.registerCommand('oropendola.login', async () => {
        console.log('🚀 Login command executed!');
        try {
            // First, ensure the Oropendola sidebar container is visible
            await vscode.commands.executeCommand('workbench.view.extension.oropendola-sidebar');
            console.log('✅ Opened Oropendola sidebar container');

            // Then focus on the chat view within it
            await vscode.commands.executeCommand('oropendola.chatView.focus');
            console.log('✅ Focused on Oropendola chat view for login');
        } catch (error) {
            console.error('❌ Error opening sidebar:', error);
            vscode.window.showErrorMessage(`Could not open Oropendola sidebar: ${error.message}`);
        }
    });
    context.subscriptions.push(loginCommand);
    console.log('✅ oropendola.login command registered');    // Oropendola: Logout
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.logout', async () => {
            console.log('🚪 Logout command executed!');
            await authManager.logout();
            oropendolaProvider = null;
            updateStatusBarForLogin();

            // Settings view removed
            // if (settingsProvider) {
            //     await settingsProvider.refreshSettings();
            // }

            // Refresh sidebar to show login screen
            if (sidebarProvider && sidebarProvider._view) {
                await vscode.commands.executeCommand('oropendola.chatView.focus');
            }
        })
    );

    // Keep old setup command for backwards compatibility
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.setup', async () => {
            authManager.showLoginPanel();
        })
    );

    // Show keyboard shortcuts
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.showShortcuts', () => {
            vscode.window.showInformationMessage(
                'Oropendola AI Shortcuts:\n' +
                '• Cmd+Shift+L (Ctrl+Shift+L) → Login\n' +
                '• Cmd+Shift+C (Ctrl+Shift+C) → Open Chat\n' +
                '• Cmd+Shift+E (Ctrl+Shift+E) → Explain Code (select code first)\n' +
                '• Cmd+Shift+F (Ctrl+Shift+F) → Fix Code (select code first)\n' +
                '• Cmd+Shift+I (Ctrl+Shift+I) → Improve Code (select code first)\n' +
                '• Cmd+Shift+H (Ctrl+Shift+H) → Show this help',
                { modal: true }
            );
        })
    );

    // Oropendola: Chat - Open sidebar instead of panel
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.openChat', async () => {
            // Focus on the Oropendola sidebar view
            await vscode.commands.executeCommand('oropendola.chatView.focus');
        })
    );

    // Oropendola: Check Subscription
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.checkSubscription', async () => {
            await checkSubscriptionStatus(true);
        })
    );

    // Fork Repository
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.forkRepository', async () => {
            await forkRepository();
        })
    );

    // Analyze Code
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.analyzeCode', async () => {
            await analyzeCurrentFile();
        })
    );

    // Review Code
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.reviewCode', async () => {
            await reviewCode();
        })
    );

    // Explain Code (DISABLED - duplicate registration, see line 2104 for active version)
    // context.subscriptions.push(
    //     vscode.commands.registerCommand('oropendola.explainCode', async () => {
    //         await explainCode();
    //     })
    // );

    // Fix Code
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.fixCode', async () => {
            await fixCode();
        })
    );

    // Improve Code
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.improveCode', async () => {
            await improveCode();
        })
    );

    // Edit Code (Cmd+I)
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.editCode', async () => {
            if (!oropendolaProvider || !editMode) {
                vscode.window.showWarningMessage('Please sign in first to use Edit Mode');
                return;
            }
            await editMode.startEdit();
        })
    );

    // Toggle Autocomplete
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.toggleAutocomplete', () => {
            if (!autocompleteProvider) {
                vscode.window.showWarningMessage('Autocomplete not initialized. Please sign in first.');
                return;
            }
            const newState = !autocompleteProvider.isEnabled;
            autocompleteProvider.setEnabled(newState);
            vscode.window.showInformationMessage(
                `Autocomplete ${newState ? 'enabled' : 'disabled'} ✨`
            );
        })
    );

    // Clear Autocomplete Cache
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.clearAutocompleteCache', () => {
            if (autocompleteProvider) {
                autocompleteProvider.clearCache();
                vscode.window.showInformationMessage('Autocomplete cache cleared');
            }
        })
    );

    // Find Similar Repositories
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.findSimilar', async () => {
            await findSimilarRepositories();
        })
    );

    // List Repositories
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.listRepositories', async () => {
            await listRepositories();
        })
    );

    // Debug Autocomplete Status
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.debugAutocomplete', async () => {
            const editor = vscode.window.activeTextEditor;
            const config = vscode.workspace.getConfiguration('oropendola');

            const debugInfo = [
                '🔍 **Autocomplete Debug Info**\n',
                `Provider Initialized: ${autocompleteProvider ? '✅ YES' : '❌ NO'}`,
                `Provider Enabled: ${autocompleteProvider?.isEnabled ? '✅ YES' : '❌ NO'}`,
                `Oropendola Provider Ready: ${oropendolaProvider ? '✅ YES' : '❌ NO'}`,
                `Config Setting Enabled: ${config.get('autocomplete.enabled', true) ? '✅ YES' : '❌ NO'}`,
                `Debounce Delay: ${config.get('autocomplete.debounceDelay', 200)}ms`,
                `Cache Size: ${autocompleteProvider?.cache?.size || 0} items`,
                '\n📄 **Active Editor**',
                `File: ${editor?.document?.fileName || 'No file open'}`,
                `Language: ${editor?.document?.languageId || 'N/A'}`,
                `Position: Line ${editor?.selection?.active?.line || 0}, Col ${editor?.selection?.active?.character || 0}`
            ].join('\n');

            console.log(debugInfo);
            vscode.window.showInformationMessage(
                'Check Output panel (View → Output → Oropendola AI) for debug info',
                'Open Output'
            ).then(choice => {
                if (choice === 'Open Output') {
                    vscode.commands.executeCommand('workbench.action.output.toggleOutput');
                }
            });
        })
    );

    // v3.4.3: Workspace Memory Commands
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.setPreferredApp', async () => {
            if (!workspaceMemory) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }

            const appName = await vscode.window.showInputBox({
                prompt: 'Enter your preferred Frappe app name',
                placeHolder: 'e.g., erpnext, custom_app',
                validateInput: value => {
                    return value.trim() ? null : 'App name cannot be empty';
                }
            });

            if (appName) {
                await workspaceMemory.setPreferredApp(appName.trim());
                vscode.window.showInformationMessage(`✅ Preferred app set to: ${appName.trim()}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.clearWorkspaceMemory', async () => {
            if (!workspaceMemory) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }

            const confirm = await vscode.window.showWarningMessage(
                'Are you sure you want to clear all workspace memory? This cannot be undone.',
                { modal: true },
                'Clear Memory',
                'Cancel'
            );

            if (confirm === 'Clear Memory') {
                await workspaceMemory.clear();
                vscode.window.showInformationMessage('🗑️  Workspace memory cleared');
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.showWorkspaceMemory', async () => {
            if (!workspaceMemory) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }

            const exists = await workspaceMemory.exists();
            if (!exists) {
                vscode.window.showInformationMessage('No workspace memory found');
                return;
            }

            const stats = await workspaceMemory.getStatistics();
            const preferredApp = await workspaceMemory.getPreferredApp();
            const recentReports = await workspaceMemory.getLastReports(5);
            const size = await workspaceMemory.getMemorySize();

            // v3.4.3 fix: Handle undefined size
            const sizeStr = size !== undefined && size !== null
                ? `${(size / 1024).toFixed(2)} KB`
                : 'Unknown';

            const info = [
                '📊 **Workspace Memory Status**',
                '',
                '**Statistics:**',
                `- Total Tasks: ${stats.totalTasks || 0}`,
                `- Total Files Changed: ${stats.totalFiles || 0}`,
                `- Last Task: ${stats.lastTaskDate ? new Date(stats.lastTaskDate).toLocaleString() : 'Never'}`,
                '',
                '**Preferences:**',
                `- Preferred App: ${preferredApp || 'Not set'}`,
                '',
                '**Recent Reports:**',
                `- ${recentReports.length} reports stored`,
                '',
                `**Memory Size:** ${sizeStr}`
            ].join('\n');

            vscode.window.showInformationMessage(info, { modal: true });
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.viewLastReport', async () => {
            if (!workspaceMemory) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }

            const reports = await workspaceMemory.getLastReports(1);
            if (reports.length === 0) {
                vscode.window.showInformationMessage('No task reports found');
                return;
            }

            const report = reports[0];
            if (report.filepath) {
                const doc = await vscode.workspace.openTextDocument(report.filepath);
                await vscode.window.showTextDocument(doc, { preview: false });
            } else {
                vscode.window.showErrorMessage('Report file not found');
            }
        })
    );

    // v3.4.3: Status Bar Commands
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.showFrameworkInfo', async () => {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                vscode.window.showInformationMessage('No workspace folder open');
                return;
            }

            // Show quick pick with framework detection info
            vscode.window.showInformationMessage(
                'Framework detection runs automatically when you send a message to the AI. The detected framework is shown in the status bar.',
                'OK'
            );
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.toggleMode', async () => {
            const config = vscode.workspace.getConfiguration('oropendola');
            const modes = ['chat', 'agent', 'code'];
            const currentMode = config.get('chat.mode', 'agent');
            const nextMode = modes[(modes.indexOf(currentMode) + 1) % modes.length];

            await config.update('chat.mode', nextMode, vscode.ConfigurationTarget.Workspace);

            if (statusBarManager) {
                statusBarManager.updateMode(nextMode);
            }

            const modeDescriptions = {
                'chat': 'Simple Q&A without tool execution',
                'agent': 'Full autonomy with tools (recommended)',
                'code': 'Optimized for code generation'
            };

            vscode.window.showInformationMessage(
                `🔄 Mode changed to: ${nextMode.toUpperCase()}\n${modeDescriptions[nextMode]}`
            );
        })
    );

    // Document Processing Commands (Week 2.2)
    console.log('🔧 Registering document processing commands...');

    // Oropendola: Analyze Document
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.analyzeDocument', async uri => {
            try {
                const { getInstance } = require('./src/documents/DocumentProcessor');
                const documentProcessor = getInstance();

                // Get file URI from context or file explorer
                const fileUri = uri || await vscode.window.showOpenDialog({
                    canSelectFiles: true,
                    canSelectFolders: false,
                    canSelectMany: false,
                    filters: {
                        'Documents': ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'html', 'htm', 'txt', 'md'],
                        'All Files': ['*']
                    },
                    title: 'Select Document to Analyze'
                }).then(uris => uris && uris[0]);

                if (!fileUri) {
                    return; // User cancelled
                }

                const filePath = fileUri.fsPath || fileUri.path;
                console.log(`📄 Analyzing document: ${filePath}`);

                // Process document
                const result = await documentProcessor.processDocument(filePath, {
                    analyzeWithAI: true,
                    analysisType: 'comprehensive'
                });

                // Show result in sidebar or output
                if (sidebarProvider) {
                    const summary = `📄 **${result.metadata.fileName}**\n\n` +
                        `**Type:** ${result.metadata.documentType}\n` +
                        `**Pages:** ${result.metadata.pageCount || 'N/A'}\n` +
                        `**Words:** ${result.metadata.wordCount || 'N/A'}\n\n` +
                        `**Content Preview:**\n${result.content.substring(0, 500)}${result.content.length > 500 ? '...' : ''}`;

                    // Send to chat for AI analysis
                    await sidebarProvider.sendMessage(
                        `Analyze this document:\n\n${summary}`,
                        'system'
                    );
                }

                vscode.window.showInformationMessage(
                    `✅ Document analyzed: ${result.metadata.wordCount} words, ${result.metadata.pageCount} pages`
                );
            } catch (error) {
                console.error('❌ Document analysis error:', error);
                vscode.window.showErrorMessage(`Document analysis failed: ${error.message}`);
            }
        })
    );
    console.log('✅ oropendola.analyzeDocument command registered');

    // Oropendola: Process Document
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.processDocument', async uri => {
            try {
                const { getInstance } = require('./src/documents/DocumentProcessor');
                const documentProcessor = getInstance();

                // Get file URI
                const fileUri = uri || await vscode.window.showOpenDialog({
                    canSelectFiles: true,
                    canSelectFolders: false,
                    canSelectMany: false,
                    filters: {
                        'Documents': ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'html', 'htm', 'txt', 'md']
                    },
                    title: 'Select Document to Process'
                }).then(uris => uris && uris[0]);

                if (!fileUri) {
                    return;
                }

                const filePath = fileUri.fsPath || fileUri.path;
                console.log(`📄 Processing document: ${filePath}`);

                // Process document
                const result = await documentProcessor.processDocument(filePath);

                // Create new document with extracted content
                const doc = await vscode.workspace.openTextDocument({
                    content: result.content,
                    language: 'markdown'
                });
                await vscode.window.showTextDocument(doc);

                vscode.window.showInformationMessage(
                    `✅ Document processed: ${result.metadata.wordCount} words extracted`
                );
            } catch (error) {
                console.error('❌ Document processing error:', error);
                vscode.window.showErrorMessage(`Document processing failed: ${error.message}`);
            }
        })
    );
    console.log('✅ oropendola.processDocument command registered');

    // Oropendola: Upload Document to Backend
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.uploadDocument', async uri => {
            try {
                if (!authManager || !authManager.isAuthenticated) {
                    vscode.window.showWarningMessage('Please login first to upload documents.');
                    return;
                }

                const { getInstance } = require('./src/documents/DocumentProcessor');
                const documentProcessor = getInstance();

                // Get file URI
                const fileUri = uri || await vscode.window.showOpenDialog({
                    canSelectFiles: true,
                    canSelectFolders: false,
                    canSelectMany: false,
                    filters: {
                        'Documents': ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'html', 'htm']
                    },
                    title: 'Select Document to Upload'
                }).then(uris => uris && uris[0]);

                if (!fileUri) {
                    return;
                }

                const filePath = fileUri.fsPath || fileUri.path;
                console.log(`📤 Uploading document: ${filePath}`);

                // Upload to backend
                const result = await documentProcessor.uploadToBackend(filePath, {
                    extractImages: true,
                    extractTables: true,
                    ocr: false
                });

                vscode.window.showInformationMessage(
                    `✅ Document uploaded successfully! ID: ${result.documentId}`,
                    'Check Status'
                ).then(selection => {
                    if (selection === 'Check Status') {
                        vscode.commands.executeCommand('oropendola.checkDocumentStatus', result.documentId);
                    }
                });
            } catch (error) {
                console.error('❌ Document upload error:', error);
                vscode.window.showErrorMessage(`Document upload failed: ${error.message}`);
            }
        })
    );
    console.log('✅ oropendola.uploadDocument command registered');

    console.log('✅ All document processing commands registered');

    // Semantic Search Commands (Week 3.2)
    console.log('🔧 Registering semantic search commands...');

    // Oropendola: Index Current File
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.indexCurrentFile', async () => {
            try {
                const { getInstance } = require('./src/vector/SemanticSearchProvider');
                const searchProvider = getInstance();
                await searchProvider.indexCurrentFile();
            } catch (error) {
                console.error('❌ Index file error:', error);
                vscode.window.showErrorMessage(`Index file failed: ${error.message}`);
            }
        })
    );
    console.log('✅ oropendola.indexCurrentFile command registered');

    // Oropendola: Index Workspace (DISABLED - duplicate registration, see line 2926 for active enterprise version)
    // context.subscriptions.push(
    //     vscode.commands.registerCommand('oropendola.indexWorkspace', async () => {
    //         try {
    //             const { getInstance } = require('./src/vector/SemanticSearchProvider');
    //             const searchProvider = getInstance();
    //             await searchProvider.indexWorkspace();
    //         } catch (error) {
    //             console.error('❌ Index workspace error:', error);
    //             vscode.window.showErrorMessage(`Index workspace failed: ${error.message}`);
    //         }
    //     })
    // );
    // console.log('✅ oropendola.indexWorkspace command registered');

    // Oropendola: Semantic Search
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.semanticSearch', async () => {
            try {
                const query = await vscode.window.showInputBox({
                    prompt: 'Enter your search query',
                    placeHolder: 'e.g., "function that handles authentication"'
                });

                if (!query) {
                    return;
                }

                const { getInstance } = require('./src/vector/SemanticSearchProvider');
                const searchProvider = getInstance();

                const { codeContext } = await searchProvider.searchContext(query, {
                    includeCode: true,
                    includeMemories: false,
                    maxResults: 10
                });

                if (codeContext.length === 0) {
                    vscode.window.showInformationMessage('No results found. Try indexing your workspace first.');
                    return;
                }

                // Show results in quick pick
                const items = codeContext.map(result => ({
                    label: result.filePath ? `$(file) ${result.filePath}` : '$(code) Code snippet',
                    description: `Similarity: ${(result.similarity * 100).toFixed(1)}%`,
                    detail: result.content.substring(0, 100) + '...',
                    result
                }));

                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: `Found ${codeContext.length} results`,
                    matchOnDescription: true,
                    matchOnDetail: true
                });

                if (selected && selected.result.filePath) {
                    // Open file at location
                    const uri = vscode.Uri.file(selected.result.filePath);
                    const document = await vscode.workspace.openTextDocument(uri);
                    const editor = await vscode.window.showTextDocument(document);

                    if (selected.result.lineNumber) {
                        const position = new vscode.Position(selected.result.lineNumber - 1, 0);
                        editor.selection = new vscode.Selection(position, position);
                        editor.revealRange(new vscode.Range(position, position));
                    }
                }
            } catch (error) {
                console.error('❌ Semantic search error:', error);
                vscode.window.showErrorMessage(`Semantic search failed: ${error.message}`);
            }
        })
    );
    console.log('✅ oropendola.semanticSearch command registered');

    // Oropendola: Show Vector Stats
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.showVectorStats', async () => {
            try {
                const { getInstance } = require('./src/vector/SemanticSearchProvider');
                const searchProvider = getInstance();
                const stats = await searchProvider.getStats();

                const message = `Vector Database Statistics:

Total Vectors: ${stats.totalVectors}
Total Memories: ${stats.totalMemories}
Vectors by Type: ${JSON.stringify(stats.vectorsByType, null, 2)}
Avg Embedding Time: ${stats.averageEmbeddingTime}ms
Last Indexed: ${stats.lastIndexed || 'Never'}`;

                vscode.window.showInformationMessage(message, { modal: true });
            } catch (error) {
                console.error('❌ Vector stats error:', error);
                vscode.window.showErrorMessage(`Failed to get stats: ${error.message}`);
            }
        })
    );
    console.log('✅ oropendola.showVectorStats command registered');

    console.log('✅ All semantic search commands registered');

    // ========================================================================
    // TERMINAL COMMANDS (Week 7)
    // ========================================================================
    console.log('🔧 Registering enhanced terminal commands...');

    // Oropendola: Terminal AI Suggest Command
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.terminalSuggestCommand', async () => {
            try {
                const { getInstance } = require('./src/terminal/TerminalAIAssistant');
                const aiAssistant = getInstance();
                const command = await aiAssistant.naturalLanguageCommand();

                if (command) {
                    // Send to active terminal
                    const terminal = vscode.window.activeTerminal || vscode.window.createTerminal('Oropendola');
                    terminal.show();
                    terminal.sendText(command, false); // Don't execute, let user review
                }
            } catch (error) {
                console.error('❌ Terminal suggest error:', error);
                vscode.window.showErrorMessage(`Terminal suggest failed: ${error.message}`);
            }
        })
    );
    console.log('✅ oropendola.terminalSuggestCommand registered');

    // Oropendola: Terminal Build Command
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.terminalBuildCommand', async () => {
            try {
                const { getInstance } = require('./src/terminal/TerminalAIAssistant');
                const aiAssistant = getInstance();
                const command = await aiAssistant.buildCommand();

                if (command) {
                    const terminal = vscode.window.activeTerminal || vscode.window.createTerminal('Oropendola');
                    terminal.show();
                    terminal.sendText(command, false);
                }
            } catch (error) {
                console.error('❌ Terminal build error:', error);
                vscode.window.showErrorMessage(`Terminal build failed: ${error.message}`);
            }
        })
    );
    console.log('✅ oropendola.terminalBuildCommand registered');

    // Oropendola: Explain Terminal Command
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.explainTerminalCommand', async () => {
            try {
                const command = await vscode.window.showInputBox({
                    prompt: 'Enter command to explain',
                    placeHolder: 'e.g., tar -xzvf archive.tar.gz'
                });

                if (!command) {
                    return;
                }

                const { getInstance } = require('./src/terminal/TerminalAIAssistant');
                const aiAssistant = getInstance();
                await aiAssistant.showCommandExplanation(command);
            } catch (error) {
                console.error('❌ Explain command error:', error);
                vscode.window.showErrorMessage(`Explain command failed: ${error.message}`);
            }
        })
    );
    console.log('✅ oropendola.explainTerminalCommand registered');

    // Oropendola: Terminal Command History
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.terminalHistory', async () => {
            try {
                const { getInstance } = require('./src/terminal/TerminalHistoryProvider');
                const historyProvider = getInstance();
                const history = await historyProvider.getHistory({ limit: 50 });

                if (history.length === 0) {
                    vscode.window.showInformationMessage('No command history available');
                    return;
                }

                const items = history.map(cmd => ({
                    label: cmd.command,
                    description: cmd.exitCode === 0 ? '✅ Success' : `❌ Error (${cmd.exitCode})`,
                    detail: `${cmd.shell} • ${cmd.cwd} • ${cmd.timestamp?.toLocaleString()}`,
                    command: cmd
                }));

                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: 'Select a command from history',
                    matchOnDescription: true,
                    matchOnDetail: true
                });

                if (selected) {
                    const terminal = vscode.window.activeTerminal || vscode.window.createTerminal('Oropendola');
                    terminal.show();
                    terminal.sendText(selected.command.command, false);
                }
            } catch (error) {
                console.error('❌ Terminal history error:', error);
                vscode.window.showErrorMessage(`Terminal history failed: ${error.message}`);
            }
        })
    );
    console.log('✅ oropendola.terminalHistory registered');

    // Oropendola: Terminal Clear History
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.terminalClearHistory', async () => {
            try {
                const confirm = await vscode.window.showWarningMessage(
                    'Are you sure you want to clear command history?',
                    { modal: true },
                    'Clear Local Only',
                    'Clear Cloud History',
                    'Cancel'
                );

                if (!confirm || confirm === 'Cancel') {
                    return;
                }

                const { getInstance } = require('./src/terminal/TerminalHistoryProvider');
                const historyProvider = getInstance();

                if (confirm === 'Clear Local Only') {
                    historyProvider.clearLocalHistory();
                    vscode.window.showInformationMessage('Local command history cleared');
                } else {
                    const count = await historyProvider.clearCloudHistory();
                    vscode.window.showInformationMessage(`Cleared ${count} commands from cloud history`);
                }
            } catch (error) {
                console.error('❌ Clear history error:', error);
                vscode.window.showErrorMessage(`Clear history failed: ${error.message}`);
            }
        })
    );
    console.log('✅ oropendola.terminalClearHistory registered');

    // Oropendola: Terminal Statistics
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.terminalStatistics', async () => {
            try {
                const { getInstance } = require('./src/terminal/TerminalHistoryProvider');
                const historyProvider = getInstance();
                const stats = historyProvider.getStatistics();

                const message = `Terminal Statistics:

Total Commands: ${stats.totalCommands}
Successful: ${stats.successfulCommands}
Failed: ${stats.failedCommands}
Unique Commands: ${stats.uniqueCommands}
Most Used: ${stats.mostUsedCommand || 'N/A'}
Avg Duration: ${stats.averageDuration ? stats.averageDuration.toFixed(0) + 'ms' : 'N/A'}`;

                vscode.window.showInformationMessage(message, { modal: true });
            } catch (error) {
                console.error('❌ Terminal stats error:', error);
                vscode.window.showErrorMessage(`Terminal stats failed: ${error.message}`);
            }
        })
    );
    console.log('✅ oropendola.terminalStatistics registered');

    // Oropendola: Export Terminal History
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.terminalExportHistory', async () => {
            try {
                const format = await vscode.window.showQuickPick(['JSON', 'CSV'], {
                    placeHolder: 'Select export format'
                });

                if (!format) {
                    return;
                }

                const { getInstance } = require('./src/terminal/TerminalHistoryProvider');
                const historyProvider = getInstance();
                const data = historyProvider.exportHistory({ format: format.toLowerCase() });

                // Save to file
                const uri = await vscode.window.showSaveDialog({
                    filters: {
                        [format]: [format.toLowerCase()]
                    },
                    defaultUri: vscode.Uri.file(`terminal-history.${format.toLowerCase()}`)
                });

                if (uri) {
                    const fs = require('fs');
                    fs.writeFileSync(uri.fsPath, data);
                    vscode.window.showInformationMessage(`History exported to ${uri.fsPath}`);
                }
            } catch (error) {
                console.error('❌ Export history error:', error);
                vscode.window.showErrorMessage(`Export failed: ${error.message}`);
            }
        })
    );
    console.log('✅ oropendola.terminalExportHistory registered');

    console.log('✅ All enhanced terminal commands registered');

    // ========================================================================
    // MARKETPLACE COMMANDS (Week 8 - Phase 1)
    // ========================================================================
    console.log('🔧 Registering marketplace commands...');

    // Oropendola: Search Extensions
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.searchExtensions', async () => {
            try {
                const query = await vscode.window.showInputBox({
                    prompt: 'Search VS Code Marketplace',
                    placeHolder: 'e.g., python, theme, snippets'
                });

                if (!query) {
                    return;
                }

                const { getInstance: getMarketplaceClient } = require('./src/marketplace/MarketplaceClient');
                const client = getMarketplaceClient();

                const result = await client.searchExtensions({ query, pageSize: 20 });

                if (result.extensions.length === 0) {
                    vscode.window.showInformationMessage('No extensions found');
                    return;
                }

                // Show results in Quick Pick
                const items = result.extensions.map(ext => ({
                    label: `$(extensions) ${ext.displayName}`,
                    description: `${ext.publisher} • ${ext.installs.toLocaleString()} installs • ⭐ ${ext.rating.toFixed(1)}`,
                    detail: ext.shortDescription,
                    extension: ext
                }));

                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: `Found ${result.total.toLocaleString()} extensions`,
                    matchOnDescription: true,
                    matchOnDetail: true
                });

                if (selected) {
                    // Show extension details and install option
                    const action = await vscode.window.showInformationMessage(
                        `${selected.extension.displayName}\n\n${selected.extension.description}\n\nVersion: ${selected.extension.version}\nInstalls: ${selected.extension.installs.toLocaleString()}`,
                        { modal: true },
                        'Install',
                        'View in Marketplace'
                    );

                    if (action === 'Install') {
                        const { getInstance: getPluginManager } = require('./src/marketplace/PluginManager');
                        const pluginManager = getPluginManager();
                        const installResult = await pluginManager.installPlugin(selected.extension.extensionId);

                        if (installResult.success) {
                            vscode.window.showInformationMessage(installResult.message || 'Extension installed successfully');
                        } else {
                            vscode.window.showErrorMessage(installResult.message || 'Installation failed');
                        }
                    } else if (action === 'View in Marketplace') {
                        vscode.env.openExternal(vscode.Uri.parse(`https://marketplace.visualstudio.com/items?itemName=${selected.extension.extensionId}`));
                    }
                }
            } catch (error) {
                console.error('❌ Search extensions error:', error);
                vscode.window.showErrorMessage(`Search failed: ${error.message}`);
            }
        })
    );
    console.log('✅ oropendola.searchExtensions registered');

    // Oropendola: Browse Featured Extensions
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.browseFeatured', async () => {
            try {
                const { getInstance: getMarketplaceClient } = require('./src/marketplace/MarketplaceClient');
                const client = getMarketplaceClient();

                const featured = await client.getFeatured();

                if (featured.length === 0) {
                    vscode.window.showInformationMessage('No featured extensions available');
                    return;
                }

                const items = featured.map(ext => ({
                    label: `$(star-full) ${ext.displayName}`,
                    description: `${ext.publisher} • ${ext.installs.toLocaleString()} installs`,
                    detail: ext.shortDescription,
                    extension: ext
                }));

                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: 'Featured Extensions',
                    matchOnDescription: true,
                    matchOnDetail: true
                });

                if (selected) {
                    const action = await vscode.window.showInformationMessage(
                        `${selected.extension.displayName}\n\n${selected.extension.description}`,
                        { modal: true },
                        'Install',
                        'View in Marketplace'
                    );

                    if (action === 'Install') {
                        const { getInstance: getPluginManager } = require('./src/marketplace/PluginManager');
                        const pluginManager = getPluginManager();
                        await pluginManager.installPlugin(selected.extension.extensionId);
                    } else if (action === 'View in Marketplace') {
                        vscode.env.openExternal(vscode.Uri.parse(`https://marketplace.visualstudio.com/items?itemName=${selected.extension.extensionId}`));
                    }
                }
            } catch (error) {
                console.error('❌ Browse featured error:', error);
                vscode.window.showErrorMessage(`Browse failed: ${error.message}`);
            }
        })
    );
    console.log('✅ oropendola.browseFeatured registered');

    // Oropendola: View Installed Plugins
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.viewInstalledPlugins', async () => {
            try {
                const { getInstance: getPluginManager } = require('./src/marketplace/PluginManager');
                const pluginManager = getPluginManager();

                const installed = pluginManager.getInstalledPlugins();

                if (installed.length === 0) {
                    vscode.window.showInformationMessage('No plugins installed');
                    return;
                }

                const items = installed.map(plugin => ({
                    label: plugin.enabled ? `$(check) ${plugin.displayName}` : `$(circle-outline) ${plugin.displayName}`,
                    description: `v${plugin.version} • ${plugin.publisher}`,
                    detail: plugin.enabled ? 'Enabled' : 'Disabled',
                    plugin
                }));

                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: `${installed.length} plugins installed`,
                    matchOnDescription: true
                });

                if (selected) {
                    const actions = selected.plugin.enabled
                        ? ['Disable', 'Uninstall', 'Open']
                        : ['Enable', 'Uninstall', 'Open'];

                    const action = await vscode.window.showQuickPick(actions, {
                        placeHolder: `What do you want to do with ${selected.plugin.displayName}?`
                    });

                    if (action === 'Enable') {
                        await pluginManager.enablePlugin(selected.plugin.id);
                        vscode.window.showInformationMessage(`Enabled ${selected.plugin.displayName}`);
                    } else if (action === 'Disable') {
                        await pluginManager.disablePlugin(selected.plugin.id);
                        vscode.window.showInformationMessage(`Disabled ${selected.plugin.displayName}`);
                    } else if (action === 'Uninstall') {
                        await pluginManager.uninstallPlugin(selected.plugin.id);
                    } else if (action === 'Open') {
                        await pluginManager.openExtension(selected.plugin.id);
                    }
                }
            } catch (error) {
                console.error('❌ View installed error:', error);
                vscode.window.showErrorMessage(`View installed failed: ${error.message}`);
            }
        })
    );
    console.log('✅ oropendola.viewInstalledPlugins registered');

    // Oropendola: Install Extension by ID
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.installExtension', async () => {
            try {
                const extensionId = await vscode.window.showInputBox({
                    prompt: 'Enter extension ID (publisher.name)',
                    placeHolder: 'e.g., ms-python.python',
                    validateInput: value => {
                        if (!value || !value.includes('.')) {
                            return 'Invalid format. Use publisher.name';
                        }
                        return null;
                    }
                });

                if (!extensionId) {
                    return;
                }

                const { getInstance: getPluginManager } = require('./src/marketplace/PluginManager');
                const pluginManager = getPluginManager();

                const result = await pluginManager.installPlugin(extensionId);

                if (result.success) {
                    vscode.window.showInformationMessage(result.message || 'Extension installed');
                } else {
                    vscode.window.showErrorMessage(result.message || 'Installation failed');
                }
            } catch (error) {
                console.error('❌ Install extension error:', error);
                vscode.window.showErrorMessage(`Install failed: ${error.message}`);
            }
        })
    );
    console.log('✅ oropendola.installExtension registered');

    // Oropendola: Plugin Statistics
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.pluginStatistics', async () => {
            try {
                const { getInstance: getPluginManager } = require('./src/marketplace/PluginManager');
                const pluginManager = getPluginManager();

                const stats = pluginManager.getPluginStats();

                const message = `Plugin Statistics:

Total Installed: ${stats.total}
Enabled: ${stats.enabled}
Disabled: ${stats.disabled}`;

                vscode.window.showInformationMessage(message, { modal: true });
            } catch (error) {
                console.error('❌ Plugin stats error:', error);
                vscode.window.showErrorMessage(`Stats failed: ${error.message}`);
            }
        })
    );
    console.log('✅ oropendola.pluginStatistics registered');

    // Oropendola: Export Plugin List
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.exportPluginList', async () => {
            try {
                const { getInstance: getPluginManager } = require('./src/marketplace/PluginManager');
                const pluginManager = getPluginManager();

                const data = pluginManager.exportPluginList();

                const uri = await vscode.window.showSaveDialog({
                    filters: { 'JSON': ['json'] },
                    defaultUri: vscode.Uri.file('plugins.json')
                });

                if (uri) {
                    const fs = require('fs');
                    fs.writeFileSync(uri.fsPath, data);
                    vscode.window.showInformationMessage(`Plugin list exported to ${uri.fsPath}`);
                }
            } catch (error) {
                console.error('❌ Export error:', error);
                vscode.window.showErrorMessage(`Export failed: ${error.message}`);
            }
        })
    );
    console.log('✅ oropendola.exportPluginList registered');

    // Oropendola: Import Plugin List
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.importPluginList', async () => {
            try {
                const uri = await vscode.window.showOpenDialog({
                    filters: { 'JSON': ['json'] },
                    canSelectMany: false
                });

                if (!uri || uri.length === 0) {
                    return;
                }

                const fs = require('fs');
                const data = fs.readFileSync(uri[0].fsPath, 'utf8');

                const { getInstance: getPluginManager } = require('./src/marketplace/PluginManager');
                const pluginManager = getPluginManager();

                const result = await pluginManager.importPluginList(data);

                const message = `Import Results:
Installed: ${result.installed}
Failed: ${result.failed}
${result.errors.length > 0 ? '\nErrors:\n' + result.errors.join('\n') : ''}`;

                vscode.window.showInformationMessage(message, { modal: true });
            } catch (error) {
                console.error('❌ Import error:', error);
                vscode.window.showErrorMessage(`Import failed: ${error.message}`);
            }
        })
    );
    console.log('✅ oropendola.importPluginList registered');

    console.log('✅ All marketplace commands registered');
}

/**
 * Register browser automation commands
 * Week 6: Browser Automation
 */
function registerBrowserAutomationCommands(context) {
    console.log('🌐 Registering browser automation commands...');

    // Command: Create Browser Session
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.browserCreateSession', async () => {
            try {
                const BrowserAutomationClient = require('./src/browser/BrowserAutomationClient');
                const client = BrowserAutomationClient.getInstance();

                // Prompt for session name (optional)
                const sessionName = await vscode.window.showInputBox({
                    prompt: 'Enter session name (optional)',
                    placeHolder: 'My Browser Session'
                });

                // Create session
                const result = await client.createSession({
                    sessionName: sessionName || undefined,
                    headless: true,
                    viewportWidth: 1920,
                    viewportHeight: 1080
                });

                if (result.success && result.sessionId) {
                    vscode.window.showInformationMessage(
                        `✅ Browser session created: ${result.sessionId}`
                    );
                } else {
                    vscode.window.showErrorMessage(
                        `❌ Failed to create session: ${result.message || 'Unknown error'}`
                    );
                }
            } catch (error) {
                console.error('❌ Create session error:', error);
                vscode.window.showErrorMessage(`Failed to create browser session: ${error.message}`);
            }
        })
    );
    console.log('✅ oropendola.browserCreateSession registered');

    // Command: Navigate to URL
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.browserNavigate', async () => {
            try {
                const BrowserAutomationClient = require('./src/browser/BrowserAutomationClient');
                const client = BrowserAutomationClient.getInstance();

                // Get active sessions
                const sessionsResult = await client.listSessions({ status: 'active' });
                if (!sessionsResult.success || !sessionsResult.sessions || sessionsResult.sessions.length === 0) {
                    const create = await vscode.window.showInformationMessage(
                        'No active browser sessions found. Create one?',
                        'Create Session',
                        'Cancel'
                    );
                    if (create === 'Create Session') {
                        await vscode.commands.executeCommand('oropendola.browserCreateSession');
                    }
                    return;
                }

                // Select session
                const sessionItems = sessionsResult.sessions.map(s => ({
                    label: s.sessionName || s.id,
                    description: s.currentUrl || 'No URL',
                    sessionId: s.id
                }));

                const selectedSession = await vscode.window.showQuickPick(sessionItems, {
                    placeHolder: 'Select browser session'
                });

                if (!selectedSession) {
                    return;
                }

                // Prompt for URL
                const url = await vscode.window.showInputBox({
                    prompt: 'Enter URL to navigate to',
                    placeHolder: 'https://example.com',
                    validateInput: value => {
                        if (!value || value.trim().length === 0) {
                            return 'URL is required';
                        }
                        if (!value.startsWith('http://') && !value.startsWith('https://')) {
                            return 'URL must start with http:// or https://';
                        }
                        return null;
                    }
                });

                if (!url) {
                    return;
                }

                // Navigate
                const result = await client.navigate(selectedSession.sessionId, url, {
                    waitUntil: 'load',
                    timeout: 30000
                });

                if (result.success) {
                    vscode.window.showInformationMessage(
                        `✅ Navigated to: ${result.title || result.url}`
                    );
                } else {
                    vscode.window.showErrorMessage(
                        `❌ Navigation failed: ${result.message || 'Unknown error'}`
                    );
                }
            } catch (error) {
                console.error('❌ Navigate error:', error);
                vscode.window.showErrorMessage(`Navigation failed: ${error.message}`);
            }
        })
    );
    console.log('✅ oropendola.browserNavigate registered');

    // Command: Take Screenshot
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.browserScreenshot', async () => {
            try {
                const BrowserAutomationClient = require('./src/browser/BrowserAutomationClient');
                const client = BrowserAutomationClient.getInstance();

                // Get active sessions
                const sessionsResult = await client.listSessions({ status: 'active' });
                if (!sessionsResult.success || !sessionsResult.sessions || sessionsResult.sessions.length === 0) {
                    vscode.window.showWarningMessage('No active browser sessions found.');
                    return;
                }

                // Select session
                const sessionItems = sessionsResult.sessions.map(s => ({
                    label: s.sessionName || s.id,
                    description: s.currentUrl || 'No URL',
                    sessionId: s.id
                }));

                const selectedSession = await vscode.window.showQuickPick(sessionItems, {
                    placeHolder: 'Select browser session for screenshot'
                });

                if (!selectedSession) {
                    return;
                }

                // Screenshot options
                const fullPage = await vscode.window.showQuickPick(
                    [
                        { label: 'Full Page', value: true },
                        { label: 'Viewport Only', value: false }
                    ],
                    { placeHolder: 'Screenshot type' }
                );

                if (!fullPage) {
                    return;
                }

                // Take screenshot
                const result = await client.screenshot(selectedSession.sessionId, {
                    fullPage: fullPage.value,
                    format: 'png'
                });

                if (result.success && result.filePath) {
                    const size = (result.fileSize / 1024).toFixed(2);
                    vscode.window.showInformationMessage(
                        `✅ Screenshot saved: ${result.filePath} (${size} KB)`
                    );
                } else {
                    vscode.window.showErrorMessage(
                        `❌ Screenshot failed: ${result.message || 'Unknown error'}`
                    );
                }
            } catch (error) {
                console.error('❌ Screenshot error:', error);
                vscode.window.showErrorMessage(`Screenshot failed: ${error.message}`);
            }
        })
    );
    console.log('✅ oropendola.browserScreenshot registered');

    // Command: Generate PDF
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.browserGeneratePdf', async () => {
            try {
                const BrowserAutomationClient = require('./src/browser/BrowserAutomationClient');
                const client = BrowserAutomationClient.getInstance();

                // Get active sessions
                const sessionsResult = await client.listSessions({ status: 'active' });
                if (!sessionsResult.success || !sessionsResult.sessions || sessionsResult.sessions.length === 0) {
                    vscode.window.showWarningMessage('No active browser sessions found.');
                    return;
                }

                // Select session
                const sessionItems = sessionsResult.sessions.map(s => ({
                    label: s.sessionName || s.id,
                    description: s.currentUrl || 'No URL',
                    sessionId: s.id
                }));

                const selectedSession = await vscode.window.showQuickPick(sessionItems, {
                    placeHolder: 'Select browser session for PDF'
                });

                if (!selectedSession) {
                    return;
                }

                // PDF format
                const format = await vscode.window.showQuickPick(
                    ['A4', 'Letter', 'Legal', 'Tabloid'],
                    { placeHolder: 'Select PDF format' }
                );

                if (!format) {
                    return;
                }

                // Generate PDF
                const result = await client.generatePdf(selectedSession.sessionId, {
                    format,
                    printBackground: true
                });

                if (result.success && result.filePath) {
                    const size = (result.fileSize / 1024).toFixed(2);
                    vscode.window.showInformationMessage(
                        `✅ PDF saved: ${result.filePath} (${size} KB)`
                    );
                } else {
                    vscode.window.showErrorMessage(
                        `❌ PDF generation failed: ${result.message || 'Unknown error'}`
                    );
                }
            } catch (error) {
                console.error('❌ PDF generation error:', error);
                vscode.window.showErrorMessage(`PDF generation failed: ${error.message}`);
            }
        })
    );
    console.log('✅ oropendola.browserGeneratePdf registered');

    // Command: List Browser Sessions
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.browserListSessions', async () => {
            try {
                const BrowserAutomationClient = require('./src/browser/BrowserAutomationClient');
                const client = BrowserAutomationClient.getInstance();

                // Get all sessions
                const result = await client.listSessions({ includeInactive: true });

                if (!result.success) {
                    vscode.window.showErrorMessage(
                        `❌ Failed to list sessions: ${result.message || 'Unknown error'}`
                    );
                    return;
                }

                if (!result.sessions || result.sessions.length === 0) {
                    vscode.window.showInformationMessage('No browser sessions found.');
                    return;
                }

                // Show sessions with actions
                const sessionItems = result.sessions.map(s => ({
                    label: `${s.status === 'active' ? '🟢' : '🔴'} ${s.sessionName || s.id}`,
                    description: s.currentUrl || 'No URL',
                    detail: `Status: ${s.status} | Last activity: ${new Date(s.lastActivity).toLocaleString()}`,
                    sessionId: s.id,
                    status: s.status
                }));

                const selected = await vscode.window.showQuickPick(sessionItems, {
                    placeHolder: 'Browser Sessions (select to view details or close)'
                });

                if (!selected) {
                    return;
                }

                // Show actions for selected session
                const actions = [];
                if (selected.status === 'active') {
                    actions.push('Navigate', 'Screenshot', 'Generate PDF', 'Close Session');
                }

                const action = await vscode.window.showQuickPick(actions, {
                    placeHolder: `Actions for ${selected.label}`
                });

                if (!action) {
                    return;
                }

                // Execute action
                switch (action) {
                    case 'Navigate':
                        await vscode.commands.executeCommand('oropendola.browserNavigate');
                        break;
                    case 'Screenshot':
                        await vscode.commands.executeCommand('oropendola.browserScreenshot');
                        break;
                    case 'Generate PDF':
                        await vscode.commands.executeCommand('oropendola.browserGeneratePdf');
                        break;
                    case 'Close Session':
                        const closeResult = await client.closeSession(selected.sessionId);
                        if (closeResult.success) {
                            vscode.window.showInformationMessage('✅ Session closed');
                        } else {
                            vscode.window.showErrorMessage(`❌ ${closeResult.message}`);
                        }
                        break;
                }
            } catch (error) {
                console.error('❌ List sessions error:', error);
                vscode.window.showErrorMessage(`Failed to list sessions: ${error.message}`);
            }
        })
    );
    console.log('✅ oropendola.browserListSessions registered');

    // Command: Close Browser Session
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.browserCloseSession', async () => {
            try {
                const BrowserAutomationClient = require('./src/browser/BrowserAutomationClient');
                const client = BrowserAutomationClient.getInstance();

                // Get active sessions
                const sessionsResult = await client.listSessions({ status: 'active' });
                if (!sessionsResult.success || !sessionsResult.sessions || sessionsResult.sessions.length === 0) {
                    vscode.window.showInformationMessage('No active browser sessions to close.');
                    return;
                }

                // Select session to close
                const sessionItems = sessionsResult.sessions.map(s => ({
                    label: s.sessionName || s.id,
                    description: s.currentUrl || 'No URL',
                    detail: `Last activity: ${new Date(s.lastActivity).toLocaleString()}`,
                    sessionId: s.id
                }));

                const selected = await vscode.window.showQuickPick(sessionItems, {
                    placeHolder: 'Select session to close'
                });

                if (!selected) {
                    return;
                }

                // Confirm closure
                const confirm = await vscode.window.showWarningMessage(
                    `Close browser session: ${selected.label}?`,
                    { modal: true },
                    'Close'
                );

                if (confirm !== 'Close') {
                    return;
                }

                // Close session
                const result = await client.closeSession(selected.sessionId);

                if (result.success) {
                    vscode.window.showInformationMessage('✅ Browser session closed');
                } else {
                    vscode.window.showErrorMessage(
                        `❌ Failed to close session: ${result.message || 'Unknown error'}`
                    );
                }
            } catch (error) {
                console.error('❌ Close session error:', error);
                vscode.window.showErrorMessage(`Failed to close session: ${error.message}`);
            }
        })
    );
    console.log('✅ oropendola.browserCloseSession registered');

    console.log('✅ All browser automation commands registered');
}

/**
 * Register code actions commands
 * Week 11: Advanced Code Actions - Phase 1
 */
function registerCodeActionsCommands(context) {
    console.log('🔍 Registering code actions commands...');

    // Command: Analyze Current File
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.analyzeCurrentFile', async () => {
            try {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    vscode.window.showWarningMessage('No file is currently open.');
                    return;
                }

                const document = editor.document;
                const code = document.getText();
                const language = document.languageId;
                const filePath = document.uri.fsPath;

                // Show progress
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: 'Analyzing code...',
                    cancellable: false
                }, async progress => {
                    const { getInstance } = require('./src/code-actions/CodeActionsClient');
                    const client = getInstance();

                    progress.report({ increment: 30, message: 'Scanning for issues...' });

                    const result = await client.analyzeCode(code, language, {
                        filePath,
                        analysisTypes: ['quality', 'security', 'performance']
                    });

                    progress.report({ increment: 70, message: 'Analysis complete!' });

                    // Show results
                    const stats = client.getIssueStats(result.issues);
                    const criticalCount = stats.critical + stats.high;

                    if (result.issues.length === 0) {
                        vscode.window.showInformationMessage('✅ No issues found! Code looks good.');
                    } else {
                        const message = `Found ${result.issues.length} issue(s): ${stats.critical} critical, ${stats.high} high, ${stats.medium} medium`;

                        const action = await vscode.window.showWarningMessage(
                            message,
                            'View Details',
                            'Dismiss'
                        );

                        if (action === 'View Details') {
                            // Show detailed issues
                            const sortedIssues = client.sortIssuesBySeverity(result.issues);
                            const details = sortedIssues.map((issue, index) =>
                                `${index + 1}. [${issue.severity.toUpperCase()}] ${issue.title}\n   Line ${issue.line_start}: ${issue.description}`
                            ).join('\n\n');

                            const outputChannel = vscode.window.createOutputChannel('Oropendola Code Analysis');
                            outputChannel.clear();
                            outputChannel.appendLine('=== CODE ANALYSIS RESULTS ===\n');
                            outputChannel.appendLine(`File: ${filePath}`);
                            outputChannel.appendLine(`Language: ${language}`);
                            outputChannel.appendLine(`Total Issues: ${result.issues.length}\n`);
                            outputChannel.appendLine(details);
                            outputChannel.show();
                        }
                    }
                });
            } catch (error) {
                console.error('❌ Code analysis error:', error);
                vscode.window.showErrorMessage(`Code analysis failed: ${error.message}`);
            }
        })
    );
    console.log('✅ oropendola.analyzeCurrentFile registered');

    // Command: Scan for Security Issues
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.scanSecurity', async () => {
            try {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    vscode.window.showWarningMessage('No file is currently open.');
                    return;
                }

                const document = editor.document;
                const code = document.getText();
                const language = document.languageId;

                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: 'Scanning for security vulnerabilities...',
                    cancellable: false
                }, async progress => {
                    const { getInstance } = require('./src/code-actions/CodeActionsClient');
                    const client = getInstance();

                    const result = await client.scanSecurity(code, language);

                    if (result.vulnerabilities.length === 0) {
                        vscode.window.showInformationMessage('✅ No security vulnerabilities detected.');
                    } else {
                        const criticalVulns = result.vulnerabilities.filter(v => v.severity === 'critical' || v.severity === 'high');

                        vscode.window.showWarningMessage(
                            `⚠️ Found ${result.vulnerabilities.length} security issue(s), ${criticalVulns.length} critical/high`,
                            'View Details'
                        ).then(action => {
                            if (action === 'View Details') {
                                const details = result.vulnerabilities.map((vuln, index) => {
                                    let info = `${index + 1}. [${vuln.severity.toUpperCase()}] ${vuln.title}`;
                                    if (vuln.cve_id) {info += ` (${vuln.cve_id})`;}
                                    if (vuln.cvss_score) {info += ` - CVSS: ${vuln.cvss_score}`;}
                                    info += `\n   ${vuln.description}`;
                                    return info;
                                }).join('\n\n');

                                const outputChannel = vscode.window.createOutputChannel('Oropendola Security Scan');
                                outputChannel.clear();
                                outputChannel.appendLine('=== SECURITY SCAN RESULTS ===\n');
                                outputChannel.appendLine(`Total Vulnerabilities: ${result.vulnerabilities.length}\n`);
                                outputChannel.appendLine(details);
                                outputChannel.show();
                            }
                        });
                    }
                });
            } catch (error) {
                console.error('❌ Security scan error:', error);
                vscode.window.showErrorMessage(`Security scan failed: ${error.message}`);
            }
        })
    );
    console.log('✅ oropendola.scanSecurity registered');

    // Command: Get Refactoring Suggestions
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.suggestRefactoring', async () => {
            try {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    vscode.window.showWarningMessage('No file is currently open.');
                    return;
                }

                const selection = editor.selection;
                const code = selection.isEmpty ? editor.document.getText() : editor.document.getText(selection);
                const language = editor.document.languageId;

                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: 'Generating refactoring suggestions...',
                    cancellable: false
                }, async progress => {
                    const { getInstance } = require('./src/code-actions/CodeActionsClient');
                    const client = getInstance();

                    const result = await client.suggestRefactorings(code, language);

                    if (result.suggestions.length === 0) {
                        vscode.window.showInformationMessage('No refactoring suggestions available.');
                    } else {
                        // Show suggestions in Quick Pick
                        const items = result.suggestions.map(s => ({
                            label: s.title,
                            description: `Confidence: ${(s.confidence * 100).toFixed(0)}%`,
                            detail: s.description,
                            suggestion: s
                        }));

                        const selected = await vscode.window.showQuickPick(items, {
                            placeHolder: 'Select a refactoring suggestion to view details'
                        });

                        if (selected) {
                            const outputChannel = vscode.window.createOutputChannel('Oropendola Refactoring');
                            outputChannel.clear();
                            outputChannel.appendLine('=== REFACTORING SUGGESTION ===\n');
                            outputChannel.appendLine(`Title: ${selected.suggestion.title}`);
                            outputChannel.appendLine(`Type: ${selected.suggestion.refactor_type}`);
                            outputChannel.appendLine(`Confidence: ${(selected.suggestion.confidence * 100).toFixed(0)}%\n`);
                            outputChannel.appendLine(`Description:\n${selected.suggestion.description}\n`);
                            outputChannel.appendLine(`Reasoning:\n${selected.suggestion.reasoning}\n`);
                            outputChannel.appendLine('=== ORIGINAL CODE ===');
                            outputChannel.appendLine(selected.suggestion.original_code);
                            outputChannel.appendLine('\n=== REFACTORED CODE ===');
                            outputChannel.appendLine(selected.suggestion.refactored_code);
                            outputChannel.show();
                        }
                    }
                });
            } catch (error) {
                console.error('❌ Refactoring suggestion error:', error);
                vscode.window.showErrorMessage(`Refactoring suggestion failed: ${error.message}`);
            }
        })
    );
    console.log('✅ oropendola.suggestRefactoring registered');

    // Command: Explain Code
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.explainCode', async () => {
            try {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    vscode.window.showWarningMessage('No file is currently open.');
                    return;
                }

                const selection = editor.selection;
                if (selection.isEmpty) {
                    vscode.window.showWarningMessage('Please select code to explain.');
                    return;
                }

                const code = editor.document.getText(selection);
                const language = editor.document.languageId;

                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: 'Generating code explanation...',
                    cancellable: false
                }, async progress => {
                    const { getInstance } = require('./src/code-actions/CodeActionsClient');
                    const client = getInstance();

                    const result = await client.explainCode(code, language);

                    const outputChannel = vscode.window.createOutputChannel('Oropendola Code Explanation');
                    outputChannel.clear();
                    outputChannel.appendLine('=== CODE EXPLANATION ===\n');
                    outputChannel.appendLine(`Summary:\n${result.explanation.summary}\n`);
                    outputChannel.appendLine(`Purpose:\n${result.explanation.purpose}\n`);
                    outputChannel.appendLine(`Complexity: ${result.explanation.complexity}\n`);

                    if (result.explanation.breakdown && result.explanation.breakdown.length > 0) {
                        outputChannel.appendLine('=== DETAILED BREAKDOWN ===\n');
                        result.explanation.breakdown.forEach((item, index) => {
                            outputChannel.appendLine(`${index + 1}. Lines ${item.line_start}-${item.line_end}:`);
                            outputChannel.appendLine(`   ${item.explanation}\n`);
                        });
                    }

                    if (result.explanation.patterns_used && result.explanation.patterns_used.length > 0) {
                        outputChannel.appendLine(`Patterns Used: ${result.explanation.patterns_used.join(', ')}\n`);
                    }

                    if (result.explanation.potential_issues && result.explanation.potential_issues.length > 0) {
                        outputChannel.appendLine('⚠️ Potential Issues:');
                        result.explanation.potential_issues.forEach(issue => {
                            outputChannel.appendLine(`   - ${issue}`);
                        });
                        outputChannel.appendLine('');
                    }

                    if (result.explanation.recommendations && result.explanation.recommendations.length > 0) {
                        outputChannel.appendLine('💡 Recommendations:');
                        result.explanation.recommendations.forEach(rec => {
                            outputChannel.appendLine(`   - ${rec}`);
                        });
                    }

                    outputChannel.show();
                });
            } catch (error) {
                console.error('❌ Code explanation error:', error);
                vscode.window.showErrorMessage(`Code explanation failed: ${error.message}`);
            }
        })
    );
    console.log('✅ oropendola.explainCode registered');

    // Command: Scan Dependencies for Vulnerabilities
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.scanDependencies', async () => {
            try {
                // Find package files in workspace
                const packageFiles = await vscode.workspace.findFiles(
                    '{package.json,requirements.txt,Gemfile,pom.xml,build.gradle,go.mod,Cargo.toml}',
                    '**/node_modules/**',
                    10
                );

                if (packageFiles.length === 0) {
                    vscode.window.showWarningMessage('No package files found in workspace.');
                    return;
                }

                // Let user select file if multiple
                let selectedFile;
                if (packageFiles.length === 1) {
                    selectedFile = packageFiles[0];
                } else {
                    const items = packageFiles.map(f => ({
                        label: vscode.workspace.asRelativePath(f),
                        file: f
                    }));

                    const selected = await vscode.window.showQuickPick(items, {
                        placeHolder: 'Select package file to scan'
                    });

                    if (!selected) {return;}
                    selectedFile = selected.file;
                }

                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: 'Scanning dependencies for vulnerabilities...',
                    cancellable: false
                }, async progress => {
                    const { getInstance } = require('./src/code-actions/CodeActionsClient');
                    const client = getInstance();

                    const result = await client.scanDependencies(selectedFile.fsPath);

                    if (result.vulnerable_packages.length === 0) {
                        vscode.window.showInformationMessage('✅ No vulnerable dependencies found.');
                    } else {
                        vscode.window.showWarningMessage(
                            `⚠️ Found ${result.vulnerable_packages.length} vulnerable package(s)`,
                            'View Details'
                        ).then(action => {
                            if (action === 'View Details') {
                                const outputChannel = vscode.window.createOutputChannel('Oropendola Dependency Scan');
                                outputChannel.clear();
                                outputChannel.appendLine('=== DEPENDENCY VULNERABILITY SCAN ===\n');
                                outputChannel.appendLine(`File: ${vscode.workspace.asRelativePath(selectedFile)}`);
                                outputChannel.appendLine(`Vulnerable Packages: ${result.vulnerable_packages.length}\n`);

                                result.vulnerable_packages.forEach((pkg, index) => {
                                    outputChannel.appendLine(`${index + 1}. ${pkg.package} @ ${pkg.version}`);
                                    outputChannel.appendLine(`   Vulnerability: ${pkg.vulnerability.title}`);
                                    if (pkg.vulnerability.cve_id) {
                                        outputChannel.appendLine(`   CVE: ${pkg.vulnerability.cve_id}`);
                                    }
                                    if (pkg.vulnerability.cvss_score) {
                                        outputChannel.appendLine(`   CVSS Score: ${pkg.vulnerability.cvss_score}`);
                                    }
                                    outputChannel.appendLine(`   Severity: ${pkg.vulnerability.severity.toUpperCase()}`);
                                    if (pkg.vulnerability.fixed_in) {
                                        outputChannel.appendLine(`   Fixed in: ${pkg.vulnerability.fixed_in}`);
                                    }
                                    outputChannel.appendLine('');
                                });

                                outputChannel.show();
                            }
                        });
                    }
                });
            } catch (error) {
                console.error('❌ Dependency scan error:', error);
                vscode.window.showErrorMessage(`Dependency scan failed: ${error.message}`);
            }
        })
    );
    console.log('✅ oropendola.scanDependencies registered');

    // Command: Quick Code Check (Analyze Selection)
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.quickCodeCheck', async () => {
            try {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    vscode.window.showWarningMessage('No file is currently open.');
                    return;
                }

                const selection = editor.selection;
                if (selection.isEmpty) {
                    vscode.window.showInformationMessage('Please select code to check, or use "Analyze Current File" for the entire file.');
                    return;
                }

                const code = editor.document.getText(selection);
                const language = editor.document.languageId;

                const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
                statusBarItem.text = '$(loading~spin) Checking code...';
                statusBarItem.show();

                try {
                    const { getInstance } = require('./src/code-actions/CodeActionsClient');
                    const client = getInstance();

                    const result = await client.analyzeCode(code, language, {
                        analysisTypes: ['quality', 'security']
                    });

                    statusBarItem.dispose();

                    const stats = client.getIssueStats(result.issues);

                    if (result.issues.length === 0) {
                        vscode.window.showInformationMessage('✅ No issues found in selection.');
                    } else {
                        const message = `Found ${result.issues.length} issue(s): ${stats.critical} critical, ${stats.high} high`;
                        vscode.window.showWarningMessage(message);
                    }
                } finally {
                    statusBarItem.dispose();
                }
            } catch (error) {
                console.error('❌ Quick code check error:', error);
                vscode.window.showErrorMessage(`Quick code check failed: ${error.message}`);
            }
        })
    );
    console.log('✅ oropendola.quickCodeCheck registered');

    // Command: View Code Analysis Statistics
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.codeAnalysisStats', async () => {
            try {
                const { getInstance } = require('./src/code-actions/CodeActionsClient');
                const client = getInstance();

                const cacheStats = client.getCacheStats();

                const message = `Code Analysis Cache:
Cached Results: ${cacheStats.size}

Tip: Cached analyses are reused for identical code, saving AI API costs and time!`;

                vscode.window.showInformationMessage(message, { modal: true });
            } catch (error) {
                console.error('❌ Stats error:', error);
                vscode.window.showErrorMessage(`Failed to get statistics: ${error.message}`);
            }
        })
    );
    console.log('✅ oropendola.codeAnalysisStats registered');

    // Command: Clear Code Analysis Cache
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.clearCodeAnalysisCache', async () => {
            try {
                const { getInstance } = require('./src/code-actions/CodeActionsClient');
                const client = getInstance();

                const confirm = await vscode.window.showWarningMessage(
                    'Clear all cached code analysis results?',
                    { modal: true },
                    'Clear Cache'
                );

                if (confirm === 'Clear Cache') {
                    client.clearCache();
                    vscode.window.showInformationMessage('✅ Code analysis cache cleared.');
                }
            } catch (error) {
                console.error('❌ Clear cache error:', error);
                vscode.window.showErrorMessage(`Failed to clear cache: ${error.message}`);
            }
        })
    );
    console.log('✅ oropendola.clearCodeAnalysisCache registered');

    console.log('✅ All code actions commands registered');
}

/**
 * Check subscription status
 * @param {boolean} showMessage - Show info message
 * @param {boolean} validateNetwork - Check network connectivity first
 */
async function checkSubscriptionStatus(showMessage = false, validateNetwork = false) {
    if (!oropendolaProvider) {
        if (showMessage) {
            vscode.window.showWarningMessage('Oropendola not configured. Run "Oropendola: Setup" first.');
        }
        return;
    }

    try {
        // Check network connectivity first if requested
        if (validateNetwork) {
            const isOnline = await checkNetworkConnectivity();
            if (!isOnline) {
                console.log('⚠️ Network unavailable, skipping subscription check');
                if (showMessage) {
                    vscode.window.showWarningMessage('⚠️ Network unavailable. Subscription check skipped. Working in offline mode.');
                }
                updateStatusBarForOffline();
                return;
            }
        }

        const subscription = await oropendolaProvider.checkSubscription();

        if (showMessage) {
            const message = `📊 Subscription Status
            
Tier: ${subscription.tier}
Remaining Requests: ${subscription.remainingRequests}
${subscription.totalRequests ? `Total Requests: ${subscription.totalRequests}` : ''}
${subscription.expiresAt ? `Expires: ${new Date(subscription.expiresAt).toLocaleDateString()}` : ''}
Status: ${subscription.isActive ? '✅ Active' : '❌ Inactive'}`;

            vscode.window.showInformationMessage(message);
        }

        oropendolaProvider.updateStatusBar();
    } catch (error) {
        console.error('Subscription check failed:', error);

        // Check if it's a network error
        const isNetworkError = error.message.includes('ENOTFOUND') ||
                               error.message.includes('ETIMEDOUT') ||
                               error.message.includes('ECONNREFUSED') ||
                               error.message.includes('Network error');

        if (isNetworkError) {
            updateStatusBarForOffline();
            if (showMessage) {
                vscode.window.showWarningMessage('⚠️ Cannot connect to Oropendola servers. Please check your network connection.');
            }
        } else if (showMessage) {
            vscode.window.showErrorMessage(`Failed to check subscription: ${error.message}`);
        }
    }
}

/**
 * Fork a GitHub repository
 */
async function forkRepository() {
    const repoUrl = await vscode.window.showInputBox({
        prompt: 'Enter GitHub repository URL to fork',
        placeHolder: 'https://github.com/owner/repo',
        validateInput: value => {
            if (!value) {return 'URL is required';}
            if (!value.includes('github.com')) {return 'Must be a GitHub URL';}
            return null;
        }
    });

    if (!repoUrl) {return;}

    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Forking repository...',
            cancellable: false
        }, async progress => {
            progress.report({ increment: 0, message: 'Authenticating with GitHub...' });

            const forkedRepo = await gitHubManager.forkRepository(repoUrl);

            progress.report({ increment: 50, message: 'Cloning repository...' });

            const clonePath = await gitHubManager.cloneRepository(forkedRepo.clone_url);

            progress.report({ increment: 75, message: 'Analyzing repository...' });

            // Auto-analyze if enabled
            const config = vscode.workspace.getConfiguration('oropendola');
            if (config.get('analysis.autoAnalyze', true)) {
                const analysis = await repositoryAnalyzer.analyzeRepository(clonePath);
                chatManager.addAnalysisContext(analysis);
            }

            progress.report({ increment: 100, message: 'Complete!' });
        });
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to fork repository: ${error.message}`);
    }
}

/**
 * Analyze current file
 */
async function analyzeCurrentFile() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No active file to analyze');
        return;
    }

    try {
        const analysis = await repositoryAnalyzer.analyzeFile(editor.document.uri.fsPath);
        chatManager.addAnalysisContext(analysis);

        const message = `📊 File Analysis

Language: ${analysis.language}
Lines: ${analysis.lines}
Functions: ${analysis.functions.length}
Classes: ${analysis.classes.length}
Imports: ${analysis.imports.length}

Complexity:
- Code Lines: ${analysis.complexity.codeLines}
- Comment Lines: ${analysis.complexity.commentLines}`;

        vscode.window.showInformationMessage(message);
    } catch (error) {
        vscode.window.showErrorMessage(`Analysis failed: ${error.message}`);
    }
}

/**
 * Review code with AI
 */
async function reviewCode() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No active file to review');
        return;
    }

    if (!oropendolaProvider) {
        vscode.window.showWarningMessage('Oropendola not configured');
        return;
    }

    const document = editor.document;
    const selection = editor.selection;
    const code = selection.isEmpty ? document.getText() : document.getText(selection);

    const prompt = `Please review this ${document.languageId} code for:
- Best practices and code quality
- Potential bugs or issues
- Performance improvements
- Security concerns
- Code style and readability

Code:
\`\`\`${document.languageId}
${code}
\`\`\``;

    chatManager.setProvider(oropendolaProvider);
    chatManager.openChatPanel();

    // Simulate sending the review request
    setTimeout(() => {
        chatManager.handleUserMessage(prompt);
    }, 500);
}

/**
 * Explain code with AI
 */
async function explainCode() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('No code selected');
        return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
        vscode.window.showWarningMessage('Please select code to explain');
        return;
    }

    const code = editor.document.getText(selection);
    const language = editor.document.languageId;

    const prompt = `Please explain what this ${language} code does in detail:

\`\`\`${language}
${code}
\`\`\``;

    chatManager.setProvider(oropendolaProvider);
    chatManager.openChatPanel();
    setTimeout(() => {
        chatManager.handleUserMessage(prompt);
    }, 500);
}

/**
 * Fix code with AI
 */
async function fixCode() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {return;}

    const selection = editor.selection;
    if (selection.isEmpty) {
        vscode.window.showWarningMessage('Please select code to fix');
        return;
    }

    const code = editor.document.getText(selection);
    const language = editor.document.languageId;

    const prompt = `Please identify and fix any issues in this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Provide the corrected code and explain what was fixed.`;

    chatManager.setProvider(oropendolaProvider);
    chatManager.openChatPanel();
    setTimeout(() => {
        chatManager.handleUserMessage(prompt);
    }, 500);
}

/**
 * Improve code with AI
 */
async function improveCode() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {return;}

    const selection = editor.selection;
    if (selection.isEmpty) {
        vscode.window.showWarningMessage('Please select code to improve');
        return;
    }

    const code = editor.document.getText(selection);
    const language = editor.document.languageId;

    const prompt = `Please suggest improvements for this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Focus on:
- Performance optimization
- Code readability
- Best practices
- Modern language features`;

    chatManager.setProvider(oropendolaProvider);
    chatManager.openChatPanel();
    setTimeout(() => {
        chatManager.handleUserMessage(prompt);
    }, 500);
}

/**
 * Find similar repositories
 */
async function findSimilarRepositories() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showWarningMessage('No workspace folder open');
        return;
    }

    try {
        const analysis = await repositoryAnalyzer.analyzeRepository(workspaceFolder.uri.fsPath);

        const languages = Object.keys(analysis.languages).join(', ');
        const prompt = `Based on this repository analysis, suggest 5 similar open-source repositories:

Languages: ${languages}
Primary: ${analysis.statistics.primaryLanguages.map(l => l.language).join(', ')}
Has Tests: ${analysis.statistics.hasTests ? 'Yes' : 'No'}
Has Documentation: ${analysis.statistics.hasDocumentation ? 'Yes' : 'No'}

Please suggest repositories with similar technology stacks and purposes.`;

        chatManager.setProvider(oropendolaProvider);
        chatManager.openChatPanel();
        setTimeout(() => {
            chatManager.handleUserMessage(prompt);
        }, 500);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to analyze repository: ${error.message}`);
    }
}

/**
 * List GitHub repositories
 */
async function listRepositories() {
    try {
        const repos = await gitHubManager.listRepositories();

        const items = repos.map(repo => ({
            label: repo.full_name,
            description: repo.description || 'No description',
            detail: `⭐ ${repo.stargazers_count} | 🍴 ${repo.forks_count} | Updated: ${new Date(repo.updated_at).toLocaleDateString()}`,
            repo
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a repository to open',
            matchOnDescription: true,
            matchOnDetail: true
        });

        if (selected) {
            vscode.env.openExternal(vscode.Uri.parse(selected.repo.html_url));
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to list repositories: ${error.message}`);
    }
}

/**
 * Check network connectivity
 * @returns {Promise<boolean>} True if online
 */
async function checkNetworkConnectivity() {
    const config = vscode.workspace.getConfiguration('oropendola');
    const apiUrl = config.get('api.url', 'https://oropendola.ai');

    try {
        // Extract hostname from API URL
        const url = new URL(apiUrl);
        const dns = require('dns').promises;

        // Try to resolve the hostname
        await dns.resolve(url.hostname);
        return true;
    } catch (error) {
        console.log(`Network check failed: ${error.message}`);
        return false;
    }
}

/**
 * Update status bar for offline state
 */
function updateStatusBarForOffline() {
    if (statusBarItem) {
        statusBarItem.text = '⚠️ Oropendola: Offline';
        statusBarItem.tooltip = 'Oropendola AI is offline\nClick to retry connection';
        statusBarItem.command = 'oropendola.checkSubscription';
        statusBarItem.show();
    }
}

/**
 * Setup context menu providers
 */
function setupProviders(_context) {
    // Could add tree view providers for repositories, etc.
}

/**
 * Update status bar for login state
 */
function updateStatusBarForLogin() {
    if (statusBarItem) {
        statusBarItem.text = '🔒 Oropendola: Sign In';
        statusBarItem.tooltip = 'Sign in to Oropendola AI\nShortcut: F2\nClick to open login window';
        statusBarItem.command = 'oropendola.login';
        statusBarItem.show();
    }
}

/**
 * Update status bar for authenticated state
 */
function updateStatusBarForAuthenticated() {
    if (statusBarItem) {
        const timeText = lastResponseTime > 0 ? ` ⏱️ ${lastResponseTime}ms` : '';
        statusBarItem.text = `🐦 Oropendola AI${timeText}`;
        statusBarItem.tooltip = `Oropendola AI Assistant${lastResponseTime > 0 ? ` (Last response: ${lastResponseTime}ms)` : ''}\nClick to check subscription status\nShortcuts: F3 (chat), F4 (explain), F5 (fix), F6 (improve)`;
        statusBarItem.command = 'oropendola.checkSubscription';
        statusBarItem.show();
    }
}

/**
 * Initialize enterprise-grade features
 * @param {vscode.ExtensionContext} context
 */
function initializeEnterpriseFeatures(context) {
    console.log('🚀 Initializing enterprise features...');

    try {
        // Initialize Settings Provider
        settingsProvider = new SettingsProvider();
        const serverUrl = settingsProvider.getServerUrl();
        console.log(`✅ Settings provider initialized (Server: ${serverUrl})`);

        // Initialize Telemetry Service
        if (settingsProvider.getTelemetryEnabled()) {
            telemetryService = new TelemetryService(serverUrl);
            context.subscriptions.push({
                dispose: () => telemetryService.dispose()
            });
            telemetryService.trackEvent('extension_activated');
            console.log('✅ Telemetry service initialized');
        }

        // Initialize Enhanced Auth Manager (new enterprise auth)
        if (EnhancedAuthManager) {
            enhancedAuthManager = new EnhancedAuthManager(context, serverUrl);
            context.subscriptions.push(enhancedAuthManager);
            console.log('✅ Enhanced auth manager initialized');
        }

        // Initialize Workspace Indexer
        if (WorkspaceIndexer && settingsProvider.getIndexingEnabled()) {
            workspaceIndexer = new WorkspaceIndexer(serverUrl);
            context.subscriptions.push({
                dispose: () => workspaceIndexer.dispose()
            });

            // Setup file watcher for active workspace
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
                workspaceIndexer.setupFileWatcher(workspaceFolders[0]);

                // Index on startup if enabled
                if (settingsProvider.getIndexingOnStartup()) {
                    setTimeout(() => {
                        workspaceIndexer.indexWorkspace(workspaceFolders[0]);
                    }, 5000); // Wait 5 seconds after activation
                }
            }
            console.log('✅ Workspace indexer initialized');
        }

        // Create status bar for inline completions
        inlineCompletionStatusBar = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            99
        );
        inlineCompletionStatusBar.text = '$(check) Oropendola AI';
        context.subscriptions.push(inlineCompletionStatusBar);

        // Initialize Inline Completion Provider
        if (OropendolaInlineCompletionProvider && settingsProvider.getInlineCompletionsEnabled()) {
            inlineCompletionProvider = new OropendolaInlineCompletionProvider(
                serverUrl,
                inlineCompletionStatusBar
            );

            const inlineDisposable = vscode.languages.registerInlineCompletionItemProvider(
                { pattern: '**' },
                inlineCompletionProvider
            );
            context.subscriptions.push(inlineDisposable);
            context.subscriptions.push({
                dispose: () => inlineCompletionProvider.dispose()
            });
            console.log('✅ Inline completion provider registered');
        }

        // Initialize Diagnostics Provider
        if (OropendolaDiagnosticsProvider && settingsProvider.getDiagnosticsEnabled()) {
            diagnosticsProvider = new OropendolaDiagnosticsProvider(serverUrl);
            context.subscriptions.push({
                dispose: () => diagnosticsProvider.dispose()
            });

            // Run diagnostics on save if enabled
            if (settingsProvider.getDiagnosticsOnSave()) {
                context.subscriptions.push(
                    vscode.workspace.onDidSaveTextDocument(doc => {
                        if (doc.languageId !== 'plaintext') {
                            diagnosticsProvider.analyzeDiagnostics(doc);
                        }
                    })
                );
            }
            console.log('✅ Diagnostics provider initialized');
        }

        // Initialize Code Action Provider
        if (OropendolaCodeActionProvider && settingsProvider.getCodeActionsEnabled()) {
            codeActionProvider = new OropendolaCodeActionProvider(serverUrl);

            const codeActionDisposable = vscode.languages.registerCodeActionsProvider(
                { pattern: '**' },
                codeActionProvider,
                {
                    providedCodeActionKinds: [
                        vscode.CodeActionKind.QuickFix,
                        vscode.CodeActionKind.Refactor,
                        vscode.CodeActionKind.RefactorRewrite,
                        vscode.CodeActionKind.Source
                    ]
                }
            );
            context.subscriptions.push(codeActionDisposable);
            context.subscriptions.push({
                dispose: () => codeActionProvider.dispose()
            });
            console.log('✅ Code action provider registered');
        }

        // Register enterprise commands
        registerEnterpriseCommands(context);

        console.log('✅ All enterprise features initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing enterprise features:', error);
        if (telemetryService) {
            telemetryService.trackError(error, 'enterprise_initialization');
        }
    }
}

/**
 * Register enterprise feature commands
 * @param {vscode.ExtensionContext} context
 */
function registerEnterpriseCommands(context) {
    // Enhanced Auth Commands
    if (enhancedAuthManager) {
        context.subscriptions.push(
            vscode.commands.registerCommand('oropendola.enhancedLogin', async () => {
                await enhancedAuthManager.authenticate();
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('oropendola.enhancedLogout', async () => {
                await enhancedAuthManager.logout();
            })
        );
    }

    // Workspace Indexing Commands
    if (workspaceIndexer) {
        context.subscriptions.push(
            vscode.commands.registerCommand('oropendola.indexWorkspace', async () => {
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (workspaceFolders && workspaceFolders.length > 0) {
                    await workspaceIndexer.indexWorkspace(workspaceFolders[0]);
                    if (telemetryService) {
                        telemetryService.trackEvent('workspace_indexed');
                    }
                } else {
                    vscode.window.showWarningMessage('No workspace folder open');
                }
            })
        );
    }

    // AI Chat Panel Command
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.openAIChat', () => {
            const serverUrl = settingsProvider?.getServerUrl() || 'http://localhost:8000';
            CopilotChatPanel.createOrShow(context.extensionUri, serverUrl);
            if (telemetryService) {
                telemetryService.trackEvent('ai_chat_opened');
            }
        })
    );

    // Code Action Commands
    if (codeActionProvider) {
        context.subscriptions.push(
            vscode.commands.registerCommand('oropendola.applyAIFix', async (document, diagnostic) => {
                await codeActionProvider.applyAIFix(document, diagnostic);
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('oropendola.refactorCode', async (document, range) => {
                await codeActionProvider.refactorCode(document, range);
            })
        );
    }

    // Diagnostics Commands
    if (diagnosticsProvider) {
        context.subscriptions.push(
            vscode.commands.registerCommand('oropendola.runDiagnostics', async () => {
                const editor = vscode.window.activeTextEditor;
                if (editor) {
                    await diagnosticsProvider.analyzeDiagnostics(editor.document);
                    if (telemetryService) {
                        telemetryService.trackEvent('diagnostics_run');
                    }
                }
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('oropendola.clearDiagnostics', () => {
                const editor = vscode.window.activeTextEditor;
                if (editor && diagnosticsProvider) {
                    diagnosticsProvider.clear(editor.document);
                }
            })
        );
    }

    // Settings Commands
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.openSettings', () => {
            vscode.commands.executeCommand('workbench.action.openSettings', 'oropendola');
        })
    );

    console.log('✅ Enterprise commands registered');

    // ========================================
    // Backend Integration v2.0 Commands
    // ========================================
    registerBackendIntegrationCommands(context);
}

/**
 * Register Backend Integration v2.0 Commands
 * Todo management, analytics, conversation history
 */
function registerBackendIntegrationCommands(context) {
    console.log('🔧 Registering Backend Integration v2.0 commands...');

    // Initialize panels
    todoPanel = new TodoPanel(context);

    // Show Todos Panel
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.showTodos', async () => {
            try {
                await todoPanel.show();
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to show todos: ${error.message}`);
            }
        })
    );

    // Show Usage Analytics
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.showAnalytics', async () => {
            try {
                const { apiClient } = require('./src/api/client');
                const stats = await apiClient.getUsageStats(30, 'all');

                // v3.4.3 fix: Handle undefined cost values
                const totalRequests = stats.total_requests || 0;
                const totalTokens = stats.total_tokens || 0;
                const totalCost = stats.total_cost !== undefined && stats.total_cost !== null
                    ? `$${stats.total_cost.toFixed(2)}`
                    : 'Unknown';
                const avgResponseTime = stats.avg_response_time || 'N/A';

                // Format provider stats
                const providerStats = Object.entries(stats.by_provider || {}).map(([provider, data]) => {
                    const cost = data.cost !== undefined && data.cost !== null
                        ? `$${data.cost.toFixed(2)}`
                        : 'Unknown';
                    return `• ${provider}: ${data.requests || 0} requests, ${cost}`;
                }).join('\n');

                // Format message
                const message = `
📊 **Usage Analytics (Last 30 Days)**

**Total Requests**: ${totalRequests}
**Total Tokens**: ${totalTokens.toLocaleString()}
**Total Cost**: ${totalCost}

**By Provider**:
${providerStats || 'No data available'}

**Average Response Time**: ${avgResponseTime}s
                `.trim();

                vscode.window.showInformationMessage(message, { modal: true });
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to get analytics: ${error.message}`);
            }
        })
    );

    // Show Conversation History
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.showConversations', async () => {
            try {
                const { conversationHistoryService } = require('./src/services/conversationHistoryService');
                const conversations = await conversationHistoryService.getRecentConversations(20);

                if (conversations.length === 0) {
                    vscode.window.showInformationMessage('No conversations found');
                    return;
                }

                // Show quick pick
                const items = conversations.map(conv => ({
                    label: conv.title || 'Untitled Conversation',
                    description: `${conv.message_count} messages`,
                    detail: `Last updated: ${new Date(conv.last_message).toLocaleString()}`,
                    conversation: conv
                }));

                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: 'Select a conversation to view',
                    matchOnDescription: true,
                    matchOnDetail: true
                });

                if (selected) {
                    // Get full conversation
                    const conv = await conversationHistoryService.getConversation(
                        selected.conversation.conversation_id
                    );

                    // Export to markdown and show
                    const markdown = await conversationHistoryService.exportToMarkdown(
                        selected.conversation.conversation_id
                    );

                    const doc = await vscode.workspace.openTextDocument({
                        content: markdown,
                        language: 'markdown'
                    });

                    await vscode.window.showTextDocument(doc);
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to show conversations: ${error.message}`);
            }
        })
    );

    // Test Backend Connection
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.testBackend', async () => {
            try {
                vscode.window.showInformationMessage('🧪 Testing backend connection...');

                const { apiClient } = require('./src/api/client');

                // Test chat completion
                const result = await apiClient.chatCompletion({
                    messages: [{ role: 'user', content: 'Hello! Please respond with "Backend is working!"' }],
                    mode: 'chat',
                    model: 'auto',
                    max_tokens: 50
                });

                // v3.4.3 fix: Handle undefined values in backend response
                const response = result.response || 'No response';
                const model = result.model || 'Unknown';
                const provider = result.provider || 'Unknown';
                const tokens = result.usage?.total_tokens || 'Unknown';
                const cost = result.cost !== undefined && result.cost !== null
                    ? `$${result.cost.toFixed(6)}`
                    : 'Unknown';

                const message = `
✅ **Backend Connection Successful!**

**Response**: ${response}
**Model**: ${model}
**Provider**: ${provider}
**Tokens**: ${tokens}
**Cost**: ${cost}
                `.trim();

                vscode.window.showInformationMessage(message, { modal: true });
            } catch (error) {
                vscode.window.showErrorMessage(`❌ Backend test failed: ${error.message}`, { modal: true });
                console.error('Backend test error:', error);
            }
        })
    );

    // Extract Todos from Selection
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.extractTodos', async () => {
            try {
                const editor = vscode.window.activeTextEditor;
                if (!editor || editor.selection.isEmpty) {
                    vscode.window.showWarningMessage('Please select text to extract todos from');
                    return;
                }

                const text = editor.document.getText(editor.selection);
                const { backendTodoService } = require('./src/services/backendTodoService');

                vscode.window.showInformationMessage('🔍 Extracting todos...');

                const todos = await backendTodoService.extractTodos(text, 'Manual extraction', true);

                vscode.window.showInformationMessage(
                    `✅ Extracted ${todos.length} todo(s)! View them with "Show Todos" command.`
                );

                // Optionally open todo panel
                if (todos.length > 0) {
                    const response = await vscode.window.showInformationMessage(
                        'Would you like to view the todos now?',
                        'Yes', 'No'
                    );

                    if (response === 'Yes') {
                        await todoPanel.show();
                    }
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to extract todos: ${error.message}`);
            }
        })
    );

    // Show Model Selection
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.selectModel', async () => {
            const models = [
                { label: '🤖 Auto (Recommended)', description: 'Backend selects best model', value: 'auto' },
                { label: '🧠 Claude Sonnet 4.5', description: 'Best for complex tasks', value: 'claude' },
                { label: '⚡ DeepSeek', description: 'Fast and cost-effective', value: 'deepseek' },
                { label: '🌟 Gemini 2.0 Flash', description: 'FREE, fast responses', value: 'gemini' },
                { label: '💬 GPT-4o', description: 'General purpose', value: 'gpt' },
                { label: '🏠 Local (Qwen)', description: 'Privacy-first, offline', value: 'local' }
            ];

            const selected = await vscode.window.showQuickPick(models, {
                placeHolder: 'Select AI model',
                matchOnDescription: true
            });

            if (selected) {
                const config = vscode.workspace.getConfiguration('oropendola');
                await config.update('chat.model', selected.value, vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage(`✅ Model set to: ${selected.label}`);
            }
        })
    );

    console.log('✅ Backend Integration v2.0 commands registered');
}

/**
 * Update response time in status bar
 */
function updateResponseTime(milliseconds) {
    lastResponseTime = milliseconds;
    if (authManager && authManager.isAuthenticated) {
        updateStatusBarForAuthenticated();
    }
}

/**
 * Extension deactivation
 */
function deactivate() {
    if (chatManager) {
        chatManager.dispose();
    }
    if (statusBarItem) {
        statusBarItem.dispose();
    }
    if (telemetryService) {
        telemetryService.trackEvent('extension_deactivated');
        telemetryService.dispose();
    }
}

module.exports = {
    activate,
    deactivate,
    updateResponseTime
};
