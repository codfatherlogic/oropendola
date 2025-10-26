/**
 * Mode Commands
 * 
 * VS Code commands for mode management
 */

import * as vscode from 'vscode'
import { ModeManager } from './ModeManager'
import { AssistantMode } from './index'

export class ModeCommands {
    constructor(
        private readonly modeManager: ModeManager
    ) {}
    
    /**
     * Register all mode-related commands
     */
    public register(): vscode.Disposable[] {
        const disposables: vscode.Disposable[] = []
        
        // Command: Switch Mode (with picker)
        disposables.push(
            vscode.commands.registerCommand('oropendola.switchMode', async () => {
                await this.showModePicker()
            })
        )
        
        // Command: Switch to Code Mode
        disposables.push(
            vscode.commands.registerCommand('oropendola.switchToCodeMode', async () => {
                await this.modeManager.switchMode(AssistantMode.CODE, 'user')
            })
        )
        
        // Command: Switch to Architect Mode
        disposables.push(
            vscode.commands.registerCommand('oropendola.switchToArchitectMode', async () => {
                await this.modeManager.switchMode(AssistantMode.ARCHITECT, 'user')
            })
        )
        
        // Command: Switch to Ask Mode
        disposables.push(
            vscode.commands.registerCommand('oropendola.switchToAskMode', async () => {
                await this.modeManager.switchMode(AssistantMode.ASK, 'user')
            })
        )
        
        // Command: Switch to Debug Mode
        disposables.push(
            vscode.commands.registerCommand('oropendola.switchToDebugMode', async () => {
                await this.modeManager.switchMode(AssistantMode.DEBUG, 'user')
            })
        )
        
        // Command: Show Mode Info
        disposables.push(
            vscode.commands.registerCommand('oropendola.showModeInfo', async () => {
                await this.showModeInfo()
            })
        )
        
        return disposables
    }
    
    /**
     * Show quick pick menu to select mode
     */
    private async showModePicker(): Promise<void> {
        const availableModes = this.modeManager.getAvailableModes()
        const currentMode = this.modeManager.getCurrentMode()
        
        interface ModeQuickPickItem extends vscode.QuickPickItem {
            mode: AssistantMode
        }
        
        const items: ModeQuickPickItem[] = availableModes.map(config => ({
            label: config.id === currentMode ? `$(check) ${config.name}` : config.name,
            description: config.description,
            detail: this.getModeCapabilitiesText(config),
            mode: config.id,
            iconPath: new vscode.ThemeIcon(config.icon)
        }))
        
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select AI Assistant Mode',
            title: 'Switch AI Mode',
            matchOnDescription: true,
            matchOnDetail: true
        })
        
        if (selected && selected.mode !== currentMode) {
            await this.modeManager.switchMode(selected.mode, 'user')
        }
    }
    
    /**
     * Get capabilities text for mode
     */
    private getModeCapabilitiesText(config: any): string {
        const capabilities: string[] = []
        
        if (config.canModifyFiles) {
            capabilities.push('✓ Edit files')
        } else {
            capabilities.push('✗ Edit files')
        }
        
        if (config.canExecuteCommands) {
            capabilities.push('✓ Run commands')
        } else {
            capabilities.push('✗ Run commands')
        }
        
        return capabilities.join('  •  ')
    }
    
    /**
     * Show current mode information
     */
    private async showModeInfo(): Promise<void> {
        const config = this.modeManager.getCurrentModeConfig()
        const history = this.modeManager.getModeHistory()
        
        const info = `**Current Mode**: ${config.name}

**Description**: ${config.description}

**Capabilities**:
- Modify Files: ${config.canModifyFiles ? '✅ Yes' : '❌ No'}
- Execute Commands: ${config.canExecuteCommands ? '✅ Yes' : '❌ No'}
- Verbosity Level: ${config.verbosityLevel}/5

**Mode History** (last 5):
${history.slice(-5).reverse().map(h => 
    `- ${h.newMode} (${h.timestamp.toLocaleTimeString()})`
).join('\n') || 'No history'}

**Keyboard Shortcut**: Ctrl/Cmd + M`
        
        const panel = vscode.window.createWebviewPanel(
            'modeInfo',
            'AI Mode Information',
            vscode.ViewColumn.Beside,
            { enableScripts: false }
        )
        
        panel.webview.html = this.getModeInfoHtml(info, config)
    }
    
    /**
     * Get HTML for mode info webview
     */
    private getModeInfoHtml(info: string, config: any): string {
        const colorMap: Record<string, string> = {
            code: '#007ACC',
            architect: '#8B5CF6',
            ask: '#10B981',
            debug: '#EF4444'
        }
        
        const color = colorMap[config.id] || '#666'
        
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            line-height: 1.6;
        }
        h1 {
            color: ${color};
            border-left: 4px solid ${color};
            padding-left: 12px;
        }
        .info-section {
            margin: 20px 0;
            padding: 15px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 4px;
        }
        .capability {
            margin: 8px 0;
        }
        code {
            background-color: var(--vscode-textBlockQuote-background);
            padding: 2px 6px;
            border-radius: 3px;
        }
    </style>
</head>
<body>
    <h1>🤖 ${config.name}</h1>
    <div class="info-section">
        ${info.split('\n').map(line => {
            if (line.startsWith('**')) {
                return `<strong>${line.replace(/\*\*/g, '')}</strong>`
            }
            return line
        }).join('<br>')}
    </div>
</body>
</html>`
    }
}
