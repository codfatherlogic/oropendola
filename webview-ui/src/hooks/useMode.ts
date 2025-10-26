/**
 * Mode Management Hook
 * 
 * React hook for managing AI assistant modes in the webview
 */

import { useState, useEffect, useCallback } from 'react'
import { Mode } from '../components/ModeSelector'

// VS Code API type
declare const vscode: {
    postMessage: (message: any) => void
}

interface UseModeResult {
    currentMode: Mode
    availableModes: Mode[]
    switchMode: (mode: Mode) => void
    canPerformAction: (action: 'modifyFiles' | 'executeCommands') => boolean
    isLoading: boolean
}

/**
 * Hook for managing assistant modes
 */
export const useMode = (): UseModeResult => {
    const [currentMode, setCurrentMode] = useState<Mode>(getDefaultMode())
    const [availableModes, setAvailableModes] = useState<Mode[]>(getDefaultModes())
    const [isLoading, setIsLoading] = useState(false)
    
    // Request current mode from extension on mount
    useEffect(() => {
        if (typeof vscode !== 'undefined') {
            vscode.postMessage({
                type: 'getModes'
            })
        }
    }, [])
    
    // Listen for mode updates from extension
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data
            
            switch (message.type) {
                case 'modesLoaded':
                    setAvailableModes(message.modes)
                    if (message.currentMode) {
                        setCurrentMode(message.currentMode)
                    }
                    break
                    
                case 'modeChanged':
                    setCurrentMode(message.mode)
                    setIsLoading(false)
                    break
                    
                case 'modeChangeFailed':
                    console.error('Mode change failed:', message.error)
                    setIsLoading(false)
                    break
            }
        }
        
        window.addEventListener('message', handleMessage)
        return () => window.removeEventListener('message', handleMessage)
    }, [])
    
    /**
     * Switch to a different mode
     */
    const switchMode = useCallback((mode: Mode) => {
        if (mode.id === currentMode.id) {
            return
        }
        
        setIsLoading(true)
        
        if (typeof vscode !== 'undefined') {
            vscode.postMessage({
                type: 'switchMode',
                modeId: mode.id
            })
        }
    }, [currentMode])
    
    /**
     * Check if current mode can perform an action
     */
    const canPerformAction = useCallback((action: 'modifyFiles' | 'executeCommands'): boolean => {
        switch (action) {
            case 'modifyFiles':
                return currentMode.canModifyFiles
            case 'executeCommands':
                return currentMode.canExecuteCommands
            default:
                return false
        }
    }, [currentMode])
    
    return {
        currentMode,
        availableModes,
        switchMode,
        canPerformAction,
        isLoading
    }
}

/**
 * Get default mode (CODE)
 */
function getDefaultMode(): Mode {
    return {
        id: 'code',
        name: 'Code Mode',
        description: 'Everyday coding, edits, and file operations',
        icon: 'code',
        color: '#007ACC',
        canModifyFiles: true,
        canExecuteCommands: true,
        enabled: true
    }
}

/**
 * Get all default modes
 */
function getDefaultModes(): Mode[] {
    return [
        {
            id: 'code',
            name: 'Code Mode',
            description: 'Everyday coding, edits, and file operations',
            icon: 'code',
            color: '#007ACC',
            canModifyFiles: true,
            canExecuteCommands: true,
            enabled: true
        },
        {
            id: 'architect',
            name: 'Architect Mode',
            description: 'System design, planning, and technical specifications',
            icon: 'symbol-structure',
            color: '#8B5CF6',
            canModifyFiles: true,
            canExecuteCommands: false,
            enabled: true
        },
        {
            id: 'ask',
            name: 'Ask Mode',
            description: 'Questions, explanations, and documentation help',
            icon: 'question',
            color: '#10B981',
            canModifyFiles: false,
            canExecuteCommands: false,
            enabled: true
        },
        {
            id: 'debug',
            name: 'Debug Mode',
            description: 'Find and fix bugs, add logging, trace issues',
            icon: 'debug-alt',
            color: '#EF4444',
            canModifyFiles: true,
            canExecuteCommands: true,
            enabled: true
        }
    ]
}
