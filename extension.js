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
            sessionCookies: sessionCookies // Pass cookies explicitly
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

    // Explain Code
    context.subscriptions.push(
        vscode.commands.registerCommand('oropendola.explainCode', async () => {
            await explainCode();
        })
    );

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
                validateInput: (value) => {
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
        validateInput: (value) => {
            if (!value) return 'URL is required';
            if (!value.includes('github.com')) return 'Must be a GitHub URL';
            return null;
        }
    });

    if (!repoUrl) return;

    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Forking repository...',
            cancellable: false
        }, async (progress) => {
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
    if (!editor) return;

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
    if (!editor) return;

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
