/**
 * Mode Manager
 * 
 * Manages assistant mode state, switching, and persistence.
 */

import * as vscode from 'vscode'
import { AssistantMode, ModeChangeEvent, ModeContext } from './types'
import { getModeConfig, getModePrompt } from './prompts'

/**
 * Manages the active assistant mode
 */
export class ModeManager {
    private currentMode: AssistantMode = AssistantMode.CODE
    private modeHistory: ModeChangeEvent[] = []
    private readonly context: vscode.ExtensionContext
    private readonly onModeChangeEmitter = new vscode.EventEmitter<ModeChangeEvent>()
    
    /** Event fired when mode changes */
    public readonly onModeChange = this.onModeChangeEmitter.event
    
    constructor(context: vscode.ExtensionContext) {
        this.context = context
        this.loadSavedMode()
    }
    
    /**
     * Get the current active mode
     */
    public getCurrentMode(): AssistantMode {
        return this.currentMode
    }
    
    /**
     * Get the current mode configuration
     */
    public getCurrentModeConfig() {
        return getModeConfig(this.currentMode)
    }
    
    /**
     * Get the current mode's system prompt
     */
    public getCurrentPrompt(customPrompt?: string): string {
        return getModePrompt(this.currentMode, customPrompt)
    }
    
    /**
     * Switch to a different mode
     */
    public async switchMode(newMode: AssistantMode, triggeredBy: 'user' | 'system' = 'user'): Promise<void> {
        if (newMode === this.currentMode) {
            return // Already in this mode
        }
        
        const previousMode = this.currentMode
        this.currentMode = newMode
        
        // Create mode change event
        const event: ModeChangeEvent = {
            previousMode,
            newMode,
            timestamp: new Date(),
            triggeredBy
        }
        
        // Add to history
        this.modeHistory.push(event)
        
        // Persist to storage
        await this.saveModeToStorage(newMode)
        
        // Fire event
        this.onModeChangeEmitter.fire(event)
        
        // Show notification
        const config = getModeConfig(newMode)
        vscode.window.showInformationMessage(
            `Switched to ${config.name}`,
            { detail: config.description }
        )
    }
    
    /**
     * Get mode context for API requests
     */
    public getModeContext(customPrompt?: string): ModeContext {
        return {
            mode: this.currentMode,
            customPrompt,
            settings: {
                verbosityLevel: this.getCurrentModeConfig().verbosityLevel,
                canModifyFiles: this.getCurrentModeConfig().canModifyFiles,
                canExecuteCommands: this.getCurrentModeConfig().canExecuteCommands
            }
        }
    }
    
    /**
     * Check if current mode can perform an action
     */
    public canPerformAction(action: 'modifyFiles' | 'executeCommands'): boolean {
        const config = this.getCurrentModeConfig()
        
        switch (action) {
            case 'modifyFiles':
                return config.canModifyFiles
            case 'executeCommands':
                return config.canExecuteCommands
            default:
                return false
        }
    }
    
    /**
     * Get mode history
     */
    public getModeHistory(): ModeChangeEvent[] {
        return [...this.modeHistory]
    }
    
    /**
     * Clear mode history
     */
    public clearHistory(): void {
        this.modeHistory = []
    }
    
    /**
     * Save current mode to persistent storage
     */
    private async saveModeToStorage(mode: AssistantMode): Promise<void> {
        await this.context.globalState.update('assistantMode', mode)
    }
    
    /**
     * Load saved mode from storage
     */
    private loadSavedMode(): void {
        const savedMode = this.context.globalState.get<AssistantMode>('assistantMode')
        
        if (savedMode && Object.values(AssistantMode).includes(savedMode)) {
            this.currentMode = savedMode
        }
    }
    
    /**
     * Reset to default mode
     */
    public async resetToDefault(): Promise<void> {
        await this.switchMode(AssistantMode.CODE, 'system')
    }
    
    /**
     * Get available modes
     */
    public getAvailableModes() {
        return [
            AssistantMode.CODE,
            AssistantMode.ARCHITECT,
            AssistantMode.ASK,
            AssistantMode.DEBUG
        ].map(mode => getModeConfig(mode))
    }
    
    /**
     * Validate if a mode change is allowed
     */
    public canSwitchToMode(mode: AssistantMode): { allowed: boolean; reason?: string } {
        const config = getModeConfig(mode)
        
        if (!config.enabled) {
            return {
                allowed: false,
                reason: `${config.name} is currently disabled`
            }
        }
        
        return { allowed: true }
    }
    
    /**
     * Dispose resources
     */
    public dispose(): void {
        this.onModeChangeEmitter.dispose()
    }
}
