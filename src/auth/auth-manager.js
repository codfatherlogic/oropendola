const vscode = require('vscode');
const axios = require('axios');

/**
 * AuthManager - Handles user authentication and session management
 */
class AuthManager {
    constructor() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.sessionToken = null;
        this.loginPanel = null;
        this.onAuthSuccess = null;
    }

    /**
     * Set callback for successful authentication
     */
    setAuthSuccessCallback(callback) {
        this.onAuthSuccess = callback;
    }

    /**
     * Show login panel
     */
    showLoginPanel() {
        if (this.loginPanel) {
            this.loginPanel.reveal(vscode.ViewColumn.One);
            return;
        }

        this.loginPanel = vscode.window.createWebviewPanel(
            'oropendolaLogin',
            'Oropendola - Sign In',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        this.loginPanel.webview.html = this.getLoginHtml();
        this.setupLoginMessageHandling();

        this.loginPanel.onDidDispose(() => {
            this.loginPanel = null;
        }, null);
    }

    /**
     * Get HTML for login panel
     */
    getLoginHtml() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
    <title>Oropendola Sign In</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #333;
        }
        
        .login-container {
            background: rgba(255, 255, 255, 0.95);
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            width: 90%;
            max-width: 400px;
            animation: slideIn 0.5s ease-out;
        }
        
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(-30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .logo {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .logo-icon {
            font-size: 60px;
            margin-bottom: 10px;
        }
        
        h1 {
            text-align: center;
            color: #333;
            font-size: 28px;
            margin-bottom: 10px;
            font-weight: 600;
        }
        
        .subtitle {
            text-align: center;
            color: #666;
            margin-bottom: 30px;
            font-size: 14px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        label {
            display: block;
            margin-bottom: 8px;
            color: #555;
            font-weight: 500;
            font-size: 14px;
        }
        
        .input-wrapper {
            position: relative;
        }
        
        .input-icon {
            position: absolute;
            left: 15px;
            top: 50%;
            transform: translateY(-50%);
            color: #999;
            font-size: 18px;
        }
        
        input {
            width: 100%;
            padding: 14px 15px 14px 45px;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-size: 15px;
            transition: all 0.3s ease;
            background: white;
        }
        
        input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .btn-signin {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 10px;
        }
        
        .btn-signin:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
        }
        
        .btn-signin:active {
            transform: translateY(0);
        }
        
        .btn-signin:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        
        .divider {
            text-align: center;
            margin: 25px 0;
            position: relative;
        }
        
        .divider::before {
            content: '';
            position: absolute;
            left: 0;
            right: 0;
            top: 50%;
            height: 1px;
            background: #e0e0e0;
        }
        
        .divider span {
            background: rgba(255, 255, 255, 0.95);
            padding: 0 15px;
            position: relative;
            color: #999;
            font-size: 13px;
        }
        
        .btn-create {
            width: 100%;
            padding: 12px;
            background: white;
            color: #667eea;
            border: 2px solid #667eea;
            border-radius: 10px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .btn-create:hover {
            background: #667eea;
            color: white;
        }
        
        .error-message {
            background: #fee;
            color: #c33;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: none;
            font-size: 14px;
        }
        
        .error-message.show {
            display: block;
            animation: shake 0.5s;
        }
        
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
        }
        
        .loading {
            display: none;
            text-align: center;
            margin-top: 10px;
        }
        
        .loading.show {
            display: block;
        }
        
        .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #999;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="logo">
            <div class="logo-icon">🐦</div>
        </div>
        
        <h1>Welcome Back</h1>
        <p class="subtitle">Sign in to continue to your workspace</p>
        
        <div id="errorMessage" class="error-message"></div>
        
        <form id="loginForm">
            <div class="form-group">
                <label for="email">Email Address</label>
                <div class="input-wrapper">
                    <span class="input-icon">📧</span>
                    <input 
                        type="email" 
                        id="email" 
                        placeholder="Enter your email"
                        required
                        autocomplete="email"
                    >
                </div>
            </div>
            
            <div class="form-group">
                <label for="password">Password</label>
                <div class="input-wrapper">
                    <span class="input-icon">🔒</span>
                    <input 
                        type="password" 
                        id="password" 
                        placeholder="Enter your password"
                        required
                        autocomplete="current-password"
                    >
                </div>
            </div>
            
            <button type="submit" class="btn-signin" id="signinBtn">
                Sign In →
            </button>
        </form>
        
        <div class="loading" id="loading">
            <div class="spinner"></div>
        </div>
        
        <div class="divider">
            <span>Don't have an account?</span>
        </div>
        
        <button class="btn-create" id="createAccountBtn">
            Create Account
        </button>
        
        <div class="footer">
            © 2025 Oropendola AI. All rights reserved.
        </div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        const loginForm = document.getElementById('loginForm');
        const signinBtn = document.getElementById('signinBtn');
        const createAccountBtn = document.getElementById('createAccountBtn');
        const errorMessage = document.getElementById('errorMessage');
        const loading = document.getElementById('loading');
        
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            
            if (!email || !password) {
                showError('Please enter both email and password');
                return;
            }
            
            // Show loading
            signinBtn.disabled = true;
            signinBtn.textContent = 'Signing in...';
            loading.classList.add('show');
            errorMessage.classList.remove('show');
            
            // Send login request to extension
            vscode.postMessage({
                command: 'login',
                email: email,
                password: password
            });
        });
        
        createAccountBtn.addEventListener('click', () => {
            vscode.postMessage({
                command: 'createAccount'
            });
        });
        
        function showError(message) {
            errorMessage.textContent = message;
            errorMessage.classList.add('show');
            signinBtn.disabled = false;
            signinBtn.textContent = 'Sign In →';
            loading.classList.remove('show');
        }
        
        // Listen for messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
                case 'loginError':
                    showError(message.error);
                    break;
                case 'loginSuccess':
                    signinBtn.textContent = '✓ Success!';
                    setTimeout(() => {
                        // Extension will close this panel
                    }, 500);
                    break;
            }
        });
    </script>
</body>
</html>`;
    }

    /**
     * Setup message handling for login panel
     */
    setupLoginMessageHandling() {
        this.loginPanel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'login':
                    await this.handleLogin(message.email, message.password);
                    break;
                case 'createAccount':
                    this.handleCreateAccount();
                    break;
            }
        });
    }

    /**
     * Handle user login
     */
    async handleLogin(email, password) {
        try {
            const config = vscode.workspace.getConfiguration('oropendola');
            const apiUrl = config.get('api.url', 'https://oropendola.ai');

            // Use Frappe's standard login endpoint
            const response = await axios.post(`${apiUrl}/api/method/login`, {
                usr: email,
                pwd: password
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.data) {
                // Frappe's standard login returns user info directly or in message
                const userData = response.data.message || response.data;

                // Store authentication data
                this.isAuthenticated = true;
                this.currentUser = {
                    email: email,
                    name: userData.full_name || userData.user || email,
                    token: userData.token || userData.api_key || userData.sid,
                    secret: userData.api_secret
                };
                this.sessionToken = userData.token || userData.api_key || userData.sid;

                // Save to workspace configuration
                await config.update('user.email', email, vscode.ConfigurationTarget.Global);
                await config.update('user.token', this.sessionToken, vscode.ConfigurationTarget.Global);

                if (userData.api_key) {
                    await config.update('api.key', userData.api_key, vscode.ConfigurationTarget.Global);
                }
                if (userData.api_secret) {
                    await config.update('api.secret', userData.api_secret, vscode.ConfigurationTarget.Global);
                }

                // Notify login panel of success
                if (this.loginPanel) {
                    this.loginPanel.webview.postMessage({
                        command: 'loginSuccess'
                    });
                }

                // Call success callback
                if (this.onAuthSuccess) {
                    this.onAuthSuccess();
                }

                // Close login panel and show chat
                setTimeout(() => {
                    if (this.loginPanel) {
                        this.loginPanel.dispose();
                        this.loginPanel = null;
                    }

                    // Trigger chat panel opening
                    vscode.commands.executeCommand('oropendola.openChat');
                }, 1000);

                vscode.window.showInformationMessage(`✅ Welcome back, ${this.currentUser.name}!`);
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error) {
            console.error('Login error:', error);

            let errorMessage = 'Login failed. Please check your credentials.';
            if (error.response) {
                errorMessage = error.response.data?.message || error.response.data?.exc || errorMessage;
            } else if (error.message) {
                errorMessage = error.message;
            }

            // Notify login panel of error
            if (this.loginPanel) {
                this.loginPanel.webview.postMessage({
                    command: 'loginError',
                    error: errorMessage
                });
            }
        }
    }

    /**
     * Handle create account
     */
    handleCreateAccount() {
        // Open Oropendola signup page
        const config = vscode.workspace.getConfiguration('oropendola');
        const apiUrl = config.get('api.url', 'https://oropendola.ai');
        vscode.env.openExternal(vscode.Uri.parse(`${apiUrl}/signup`));
    }

    /**
     * Check if user is authenticated
     */
    async checkAuthentication() {
        const config = vscode.workspace.getConfiguration('oropendola');
        const token = config.get('user.token');
        const email = config.get('user.email');

        if (token && email) {
            this.isAuthenticated = true;
            this.sessionToken = token;
            this.currentUser = {
                email: email,
                token: token
            };
            return true;
        }

        return false;
    }

    /**
     * Logout user
     */
    async logout() {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.sessionToken = null;

        const config = vscode.workspace.getConfiguration('oropendola');
        await config.update('user.email', undefined, vscode.ConfigurationTarget.Global);
        await config.update('user.token', undefined, vscode.ConfigurationTarget.Global);
        await config.update('api.key', undefined, vscode.ConfigurationTarget.Global);
        await config.update('api.secret', undefined, vscode.ConfigurationTarget.Global);

        vscode.window.showInformationMessage('✅ Logged out successfully');
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }
}

module.exports = AuthManager;
