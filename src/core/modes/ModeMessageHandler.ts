/**
 * Webview Mode Message Handler
 * 
 * Handles mode-related messages between webview and extension
 */

import * as vscode from 'vscode'
import { ModeManager } from '../modes/ModeManager'
import { AssistantMode, getModeConfig } from '../modes'

export class ModeMessageHandler {
    constructor(
        private readonly modeManager: ModeManager
    ) {
        // Listen for mode changes to notify webview
        this.modeManager.onModeChange(() => {
            this.notifyModeChange()
        })
    }
    
    /**
     * Handle incoming messages from webview
     */
    public async handleMessage(message: any, webview: vscode.Webview): Promise<void> {
        switch (message.type) {
            case 'getModes':
                await this.sendModesToWebview(webview)
                break
                
            case 'switchMode':
                await this.handleModeSwitch(message.modeId, webview)
                break
        }
    }
    
    /**
     * Send available modes to webview
     */
    private async sendModesToWebview(webview: vscode.Webview): Promise<void> {
        const availableModes = this.modeManager.getAvailableModes()
        const currentMode = this.modeManager.getCurrentModeConfig()
        
        webview.postMessage({
            type: 'modesLoaded',
            modes: availableModes.map(mode => ({
                id: mode.id,
                name: mode.name,
                description: mode.description,
                icon: mode.icon,
                color: mode.color,
                canModifyFiles: mode.canModifyFiles,
                canExecuteCommands: mode.canExecuteCommands,
                enabled: mode.enabled
            })),
            currentMode: {
                id: currentMode.id,
                name: currentMode.name,
                description: currentMode.description,
                icon: currentMode.icon,
                color: currentMode.color,
                canModifyFiles: currentMode.canModifyFiles,
                canExecuteCommands: currentMode.canExecuteCommands,
                enabled: currentMode.enabled
            }
        })
    }
    
    /**
     * Handle mode switch request from webview
     */
    private async handleModeSwitch(modeId: string, webview: vscode.Webview): Promise<void> {
        try {
            const mode = modeId as AssistantMode
            
            // Validate mode
            const validation = this.modeManager.canSwitchToMode(mode)
            if (!validation.allowed) {
                webview.postMessage({
                    type: 'modeChangeFailed',
                    error: validation.reason
                })
                return
            }
            
            // Switch mode
            await this.modeManager.switchMode(mode, 'user')
            
            // Send confirmation
            const newModeConfig = getModeConfig(mode)
            webview.postMessage({
                type: 'modeChanged',
                mode: {
                    id: newModeConfig.id,
                    name: newModeConfig.name,
                    description: newModeConfig.description,
                    icon: newModeConfig.icon,
                    color: newModeConfig.color,
                    canModifyFiles: newModeConfig.canModifyFiles,
                    canExecuteCommands: newModeConfig.canExecuteCommands,
                    enabled: newModeConfig.enabled
                }
            })
        } catch (error) {
            webview.postMessage({
                type: 'modeChangeFailed',
                error: error instanceof Error ? error.message : 'Unknown error'
            })
        }
    }
    
    /**
     * Notify webview of mode change (from extension-side triggers)
     */
    private notifyModeChange(): void {
        // This will be called by the extension when needed
        // Webview reference needs to be passed in or stored
    }
    
    /**
     * Get current mode info for webview
     */
    public getCurrentModeInfo() {
        const config = this.modeManager.getCurrentModeConfig()
        return {
            id: config.id,
            name: config.name,
            description: config.description,
            icon: config.icon,
            color: config.color,
            canModifyFiles: config.canModifyFiles,
            canExecuteCommands: config.canExecuteCommands,
            enabled: config.enabled
        }
    }
}
