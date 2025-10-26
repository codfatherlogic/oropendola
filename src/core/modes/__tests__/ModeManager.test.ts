/**
 * Mode Manager Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as vscode from 'vscode'
import { ModeManager } from '../ModeManager'
import { AssistantMode } from '../types'

// Mock VS Code API
vi.mock('vscode', () => {
    class EventEmitter {
        private listeners: any[] = []
        
        get event() {
            return (listener: any) => {
                this.listeners.push(listener)
                return { dispose: () => {} }
            }
        }
        
        fire(event: any) {
            this.listeners.forEach(listener => listener(event))
        }
        
        dispose() {
            this.listeners = []
        }
    }
    
    return {
        EventEmitter,
        window: {
            showInformationMessage: vi.fn()
        }
    }
})

describe('ModeManager', () => {
    let mockContext: vscode.ExtensionContext
    let modeManager: ModeManager
    
    beforeEach(() => {
        // Mock extension context
        mockContext = {
            globalState: {
                get: vi.fn(),
                update: vi.fn().mockResolvedValue(undefined)
            }
        } as any
        
        modeManager = new ModeManager(mockContext)
    })
    
    describe('Initialization', () => {
        it('should start in CODE mode by default', () => {
            expect(modeManager.getCurrentMode()).toBe(AssistantMode.CODE)
        })
        
        it('should load saved mode from storage', () => {
            vi.mocked(mockContext.globalState.get).mockReturnValue(AssistantMode.DEBUG)
            
            const manager = new ModeManager(mockContext)
            
            expect(manager.getCurrentMode()).toBe(AssistantMode.DEBUG)
        })
        
        it('should ignore invalid saved modes', () => {
            vi.mocked(mockContext.globalState.get).mockReturnValue('invalid-mode' as any)
            
            const manager = new ModeManager(mockContext)
            
            expect(manager.getCurrentMode()).toBe(AssistantMode.CODE)
        })
    })
    
    describe('Mode Switching', () => {
        it('should switch to a new mode', async () => {
            await modeManager.switchMode(AssistantMode.DEBUG)
            
            expect(modeManager.getCurrentMode()).toBe(AssistantMode.DEBUG)
        })
        
        it('should save mode to storage when switching', async () => {
            await modeManager.switchMode(AssistantMode.ARCHITECT)
            
            expect(mockContext.globalState.update).toHaveBeenCalledWith(
                'assistantMode',
                AssistantMode.ARCHITECT
            )
        })
        
        it('should not switch if already in the same mode', async () => {
            const updateSpy = vi.mocked(mockContext.globalState.update)
            updateSpy.mockClear()
            
            await modeManager.switchMode(AssistantMode.CODE)
            
            expect(updateSpy).not.toHaveBeenCalled()
        })
        
        it('should fire mode change event', async () => {
            const listener = vi.fn()
            modeManager.onModeChange(listener)
            
            await modeManager.switchMode(AssistantMode.ASK)
            
            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({
                    previousMode: AssistantMode.CODE,
                    newMode: AssistantMode.ASK,
                    triggeredBy: 'user'
                })
            )
        })
        
        it('should track mode history', async () => {
            await modeManager.switchMode(AssistantMode.DEBUG)
            await modeManager.switchMode(AssistantMode.ASK)
            await modeManager.switchMode(AssistantMode.ARCHITECT)
            
            const history = modeManager.getModeHistory()
            
            expect(history).toHaveLength(3)
            expect(history[0].newMode).toBe(AssistantMode.DEBUG)
            expect(history[1].newMode).toBe(AssistantMode.ASK)
            expect(history[2].newMode).toBe(AssistantMode.ARCHITECT)
        })
    })
    
    describe('Mode Configuration', () => {
        it('should return current mode config', () => {
            const config = modeManager.getCurrentModeConfig()
            
            expect(config.id).toBe(AssistantMode.CODE)
            expect(config.name).toBe('Code Mode')
        })
        
        it('should return current mode prompt', () => {
            const prompt = modeManager.getCurrentPrompt()
            
            expect(prompt).toContain('Code Mode')
            expect(prompt).toContain('coding assistant')
        })
        
        it('should use custom prompt if provided', () => {
            const customPrompt = 'Custom system prompt'
            const prompt = modeManager.getCurrentPrompt(customPrompt)
            
            expect(prompt).toBe(customPrompt)
        })
        
        it('should return different prompts for different modes', async () => {
            const codePrompt = modeManager.getCurrentPrompt()
            
            await modeManager.switchMode(AssistantMode.ARCHITECT)
            const architectPrompt = modeManager.getCurrentPrompt()
            
            expect(codePrompt).not.toBe(architectPrompt)
            expect(architectPrompt).toContain('architect')
        })
    })
    
    describe('Capabilities', () => {
        it('should allow file modifications in CODE mode', () => {
            expect(modeManager.canPerformAction('modifyFiles')).toBe(true)
        })
        
        it('should allow command execution in CODE mode', () => {
            expect(modeManager.canPerformAction('executeCommands')).toBe(true)
        })
        
        it('should not allow file modifications in ASK mode', async () => {
            await modeManager.switchMode(AssistantMode.ASK)
            
            expect(modeManager.canPerformAction('modifyFiles')).toBe(false)
        })
        
        it('should not allow command execution in ASK mode', async () => {
            await modeManager.switchMode(AssistantMode.ASK)
            
            expect(modeManager.canPerformAction('executeCommands')).toBe(false)
        })
        
        it('should not allow command execution in ARCHITECT mode', async () => {
            await modeManager.switchMode(AssistantMode.ARCHITECT)
            
            expect(modeManager.canPerformAction('executeCommands')).toBe(false)
        })
        
        it('should allow file modifications in DEBUG mode', async () => {
            await modeManager.switchMode(AssistantMode.DEBUG)
            
            expect(modeManager.canPerformAction('modifyFiles')).toBe(true)
        })
    })
    
    describe('Mode Context', () => {
        it('should return mode context for API requests', () => {
            const context = modeManager.getModeContext()
            
            expect(context).toEqual({
                mode: AssistantMode.CODE,
                customPrompt: undefined,
                settings: expect.objectContaining({
                    verbosityLevel: expect.any(Number),
                    canModifyFiles: true,
                    canExecuteCommands: true
                })
            })
        })
        
        it('should include custom prompt in context', () => {
            const customPrompt = 'Custom prompt'
            const context = modeManager.getModeContext(customPrompt)
            
            expect(context.customPrompt).toBe(customPrompt)
        })
        
        it('should update context when mode changes', async () => {
            await modeManager.switchMode(AssistantMode.ASK)
            
            const context = modeManager.getModeContext()
            
            expect(context.mode).toBe(AssistantMode.ASK)
            expect(context.settings?.canModifyFiles).toBe(false)
        })
    })
    
    describe('Available Modes', () => {
        it('should return list of available modes', () => {
            const modes = modeManager.getAvailableModes()
            
            expect(modes).toHaveLength(4)
            expect(modes.map(m => m.id)).toEqual([
                AssistantMode.CODE,
                AssistantMode.ARCHITECT,
                AssistantMode.ASK,
                AssistantMode.DEBUG
            ])
        })
        
        it('should validate mode switching', () => {
            const result = modeManager.canSwitchToMode(AssistantMode.DEBUG)
            
            expect(result.allowed).toBe(true)
            expect(result.reason).toBeUndefined()
        })
        
        it('should prevent switching to disabled modes', () => {
            const result = modeManager.canSwitchToMode(AssistantMode.CUSTOM)
            
            expect(result.allowed).toBe(false)
            expect(result.reason).toContain('disabled')
        })
    })
    
    describe('History Management', () => {
        it('should track mode switch timestamps', async () => {
            await modeManager.switchMode(AssistantMode.DEBUG)
            
            const history = modeManager.getModeHistory()
            
            expect(history[0].timestamp).toBeInstanceOf(Date)
        })
        
        it('should track who triggered mode change', async () => {
            await modeManager.switchMode(AssistantMode.DEBUG, 'user')
            await modeManager.switchMode(AssistantMode.ASK, 'system')
            
            const history = modeManager.getModeHistory()
            
            expect(history[0].triggeredBy).toBe('user')
            expect(history[1].triggeredBy).toBe('system')
        })
        
        it('should clear history', async () => {
            await modeManager.switchMode(AssistantMode.DEBUG)
            await modeManager.switchMode(AssistantMode.ASK)
            
            modeManager.clearHistory()
            
            expect(modeManager.getModeHistory()).toHaveLength(0)
        })
    })
    
    describe('Reset', () => {
        it('should reset to CODE mode', async () => {
            await modeManager.switchMode(AssistantMode.DEBUG)
            
            await modeManager.resetToDefault()
            
            expect(modeManager.getCurrentMode()).toBe(AssistantMode.CODE)
        })
        
        it('should trigger system mode change on reset', async () => {
            await modeManager.switchMode(AssistantMode.DEBUG)
            
            const listener = vi.fn()
            modeManager.onModeChange(listener)
            
            await modeManager.resetToDefault()
            
            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({
                    triggeredBy: 'system'
                })
            )
        })
    })
    
    describe('Disposal', () => {
        it('should dispose event emitter', () => {
            expect(() => modeManager.dispose()).not.toThrow()
        })
    })
})
