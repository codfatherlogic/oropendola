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
}

module.exports = {
    activate,
    deactivate,
    updateResponseTime
};
