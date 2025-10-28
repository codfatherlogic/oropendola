// v3.4.3: Status Bar Manager
// Manages status bar indicators for framework, mode, and connection status
const vscode = require('vscode');

class StatusBarManager {
    constructor() {
        // Framework indicator
        this.frameworkItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
        this.frameworkItem.command = 'oropendola.showFrameworkInfo';

        // Mode indicator
        this.modeItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            99
        );
        this.modeItem.command = 'oropendola.toggleMode';

        // Connection status
        this.connectionItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            98
        );
        this.connectionItem.command = 'oropendola.testBackend';

        // Initialize with default states
        this.updateFramework(null, 0);
        this.updateMode('agent');
        this.updateConnection(false);
    }

    // ============================================
    // Framework Indicator
    // ============================================

    updateFramework(framework, confidence) {
        if (!framework) {
            this.frameworkItem.text = '$(question) No Framework';
            this.frameworkItem.tooltip = 'No framework detected\nClick to run detection';
            this.frameworkItem.backgroundColor = undefined;
        } else {
            const icon = this._getFrameworkIcon(framework);
            const percent = Math.round(confidence * 100);
            this.frameworkItem.text = `${icon} ${this._capitalizeFramework(framework)} ${percent}%`;
            this.frameworkItem.tooltip = `Detected: ${framework} (${percent}% confidence)\nClick for details`;

            // Color code by confidence
            if (confidence >= 0.8) {
                this.frameworkItem.backgroundColor = undefined; // Default (success)
            } else if (confidence >= 0.5) {
                this.frameworkItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            } else {
                this.frameworkItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
            }
        }
        this.frameworkItem.show();
    }

    _getFrameworkIcon(framework) {
        const icons = {
            'frappe': '$(database)',
            'django': '$(symbol-method)',
            'react': '$(symbol-class)',
            'nextjs': '$(rocket)',
            'next.js': '$(rocket)',
            'flask': '$(beaker)',
            'express': '$(server)',
            'vue': '$(symbol-interface)',
            'angular': '$(symbol-structure)'
        };
        return icons[framework.toLowerCase()] || '$(code)';
    }

    _capitalizeFramework(framework) {
        const special = {
            'frappe': 'Frappe',
            'django': 'Django',
            'react': 'React',
            'nextjs': 'Next.js',
            'next.js': 'Next.js',
            'flask': 'Flask',
            'express': 'Express',
            'vue': 'Vue',
            'angular': 'Angular'
        };
        return special[framework.toLowerCase()] || framework;
    }

    // ============================================
    // Mode Indicator
    // ============================================

    updateMode(mode) {
        const modeConfig = {
            'chat': {
                icon: '$(comment-discussion)',
                label: 'CHAT',
                tooltip: 'Chat Mode - Simple Q&A without tool execution\nClick to change mode'
            },
            'agent': {
                icon: '$(robot)',
                label: 'AGENT',
                tooltip: 'Agent Mode - Full autonomy with tools (recommended)\nClick to change mode'
            },
            'code': {
                icon: '$(code)',
                label: 'CODE',
                tooltip: 'Code Mode - Optimized for code generation\nClick to change mode'
            }
        };

        const config = modeConfig[mode] || modeConfig['agent'];
        this.modeItem.text = `${config.icon} ${config.label}`;
        this.modeItem.tooltip = config.tooltip;
        this.modeItem.show();
    }

    // ============================================
    // Connection Indicator
    // ============================================

    updateConnection(connected) {
        // Hidden - authentication is now handled via Sign In button in chat area
        this.connectionItem.hide();
    }

    // ============================================
    // Show/Hide Methods
    // ============================================

    showFramework() {
        this.frameworkItem.show();
    }

    hideFramework() {
        this.frameworkItem.hide();
    }

    showMode() {
        this.modeItem.show();
    }

    hideMode() {
        this.modeItem.hide();
    }

    showConnection() {
        this.connectionItem.show();
    }

    hideConnection() {
        this.connectionItem.hide();
    }

    showAll() {
        this.frameworkItem.show();
        this.modeItem.show();
        this.connectionItem.show();
    }

    hideAll() {
        this.frameworkItem.hide();
        this.modeItem.hide();
        this.connectionItem.hide();
    }

    // ============================================
    // Dispose
    // ============================================

    dispose() {
        this.frameworkItem.dispose();
        this.modeItem.dispose();
        this.connectionItem.dispose();
    }
}

module.exports = StatusBarManager;
