/**
 * Mode Integration Service
 * 
 * Connects the mode system with backend API requests
 */

import * as vscode from 'vscode'
import { ModeManager } from '../modes/ModeManager'
import { AssistantMode } from '../modes/types'

export class ModeIntegrationService {
    constructor(
        private readonly modeManager: ModeManager
    ) {}
    
    /**
     * Prepare context for API request with mode information
     */
    public prepareApiContext(baseContext: any = {}): any {
        const modeContext = this.modeManager.getModeContext()
        const config = this.modeManager.getCurrentModeConfig()
        
        return {
            ...baseContext,
            mode: modeContext.mode,
            modeSettings: {
                verbosityLevel: config.verbosityLevel,
                canModifyFiles: config.canModifyFiles,
                canExecuteCommands: config.canExecuteCommands,
                modeName: config.name,
                modeDescription: config.description
            },
            systemPrompt: this.modeManager.getCurrentPrompt(modeContext.customPrompt)
        }
    }
    
    /**
     * Validate if an action is allowed in current mode
     */
    public async validateAction(action: 'modifyFiles' | 'executeCommands'): Promise<{ allowed: boolean; reason?: string }> {
        const canPerform = this.modeManager.canPerformAction(action)
        const currentMode = this.modeManager.getCurrentModeConfig()
        
        if (canPerform) {
            return { allowed: true }
        }
        
        // Build helpful error message
        let reason = `This action requires ${action === 'modifyFiles' ? 'file modification' : 'command execution'} permission.\n\n`
        reason += `You are currently in **${currentMode.name}** which is `
        
        if (!currentMode.canModifyFiles && !currentMode.canExecuteCommands) {
            reason += 'a read-only mode.'
        } else if (!currentMode.canModifyFiles) {
            reason += 'not allowed to modify files.'
        } else {
            reason += 'not allowed to execute commands.'
        }
        
        reason += '\n\nWould you like to switch to '
        
        if (action === 'modifyFiles') {
            reason += '**Code Mode** or **Debug Mode**?'
        } else {
            reason += '**Code Mode** or **Debug Mode**?'
        }
        
        return { allowed: false, reason }
    }
    
    /**
     * Show mode restriction warning to user
     */
    public async showModeRestrictionWarning(action: string): Promise<'switch' | 'cancel'> {
        const currentMode = this.modeManager.getCurrentModeConfig()
        
        const message = `${currentMode.name} doesn't allow ${action}. Switch to Code Mode?`
        
        const choice = await vscode.window.showWarningMessage(
            message,
            'Switch to Code Mode',
            'Cancel'
        )
        
        if (choice === 'Switch to Code Mode') {
            await this.modeManager.switchMode(AssistantMode.CODE, 'user')
            return 'switch'
        }
        
        return 'cancel'
    }
    
    /**
     * Get current mode for display
     */
    public getCurrentModeInfo() {
        const config = this.modeManager.getCurrentModeConfig()
        return {
            id: config.id,
            name: config.name,
            icon: config.icon,
            color: config.color,
            description: config.description
        }
    }
    
    /**
     * Add mode indicator to status bar
     */
    public createModeStatusBarItem(): vscode.StatusBarItem {
        const statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        )
        
        this.updateStatusBarItem(statusBarItem)
        
        // Update when mode changes
        this.modeManager.onModeChange(() => {
            this.updateStatusBarItem(statusBarItem)
        })
        
        statusBarItem.command = 'oropendola.switchMode'
        statusBarItem.tooltip = 'Click to switch AI assistant mode'
        statusBarItem.show()
        
        return statusBarItem
    }
    
    /**
     * Update status bar item with current mode
     */
    private updateStatusBarItem(statusBarItem: vscode.StatusBarItem): void {
        const config = this.modeManager.getCurrentModeConfig()
        
        const modeIcons: Record<string, string> = {
            code: '$(code)',
            architect: '$(symbol-structure)',
            ask: '$(question)',
            debug: '$(debug-alt)'
        }
        
        const icon = modeIcons[config.id] || '$(gear)'
        statusBarItem.text = `${icon} ${config.name}`
    }
    
    /**
     * Enrich error messages with mode context
     */
    public enrichErrorMessage(error: Error, action?: string): Error {
        const currentMode = this.modeManager.getCurrentModeConfig()
        
        let message = error.message
        
        // Add mode context to certain errors
        if (action === 'modifyFiles' && !currentMode.canModifyFiles) {
            message += `\n\nNote: You are in ${currentMode.name} which is read-only. Switch to Code Mode to modify files.`
        } else if (action === 'executeCommands' && !currentMode.canExecuteCommands) {
            message += `\n\nNote: You are in ${currentMode.name} which cannot execute commands. Switch to Code Mode or Debug Mode.`
        }
        
        return new Error(message)
    }
}
