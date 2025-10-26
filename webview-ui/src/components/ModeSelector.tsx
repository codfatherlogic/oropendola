/**
 * Mode Selector Component
 * 
 * Dropdown selector for switching AI assistant modes
 */

import React, { useState, useRef, useEffect } from 'react'
import './ModeSelector.css'

export interface Mode {
    id: string
    name: string
    description: string
    icon: string
    color: string
    canModifyFiles: boolean
    canExecuteCommands: boolean
    enabled: boolean
}

interface ModeSelectorProps {
    currentMode: Mode
    availableModes: Mode[]
    onModeChange: (mode: Mode) => void
    className?: string
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
    currentMode,
    availableModes,
    onModeChange,
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false)
    const [isSwitching, setIsSwitching] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)
    
    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false)
            }
        }
        
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])
    
    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Ctrl/Cmd + M to toggle mode selector
            if ((event.ctrlKey || event.metaKey) && event.key === 'm') {
                event.preventDefault()
                setIsOpen(prev => !prev)
            }
            
            // Escape to close
            if (event.key === 'Escape' && isOpen) {
                setIsOpen(false)
            }
            
            // Arrow keys to navigate when open
            if (isOpen) {
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                    event.preventDefault()
                    // TODO: Implement keyboard navigation
                }
            }
        }
        
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [isOpen])
    
    const handleModeSelect = (mode: Mode) => {
        if (mode.id === currentMode.id || !mode.enabled) {
            return
        }
        
        setIsSwitching(true)
        setIsOpen(false)
        
        // Animate mode switch
        setTimeout(() => {
            onModeChange(mode)
            setTimeout(() => setIsSwitching(false), 300)
        }, 150)
    }
    
    const toggleDropdown = () => {
        setIsOpen(prev => !prev)
    }
    
    const getModeClassName = (modeId: string) => {
        return `mode-${modeId.toLowerCase()}`
    }
    
    return (
        <div className={`mode-selector-container ${className}`}>
            <span className="mode-selector-label">Mode</span>
            
            <div className="mode-selector">
                <button
                    ref={buttonRef}
                    className={`mode-selector-button ${isOpen ? 'active' : ''} ${isSwitching ? 'mode-switching' : ''}`}
                    onClick={toggleDropdown}
                    aria-label="Select AI mode"
                    aria-expanded={isOpen}
                >
                    <span className={`mode-icon codicon codicon-${currentMode.icon}`} />
                    <span className="mode-name">{currentMode.name}</span>
                    <span className="mode-dropdown-arrow codicon codicon-chevron-down" />
                </button>
                
                <div
                    ref={dropdownRef}
                    className={`mode-dropdown ${isOpen ? 'open' : ''}`}
                    role="menu"
                >
                    {availableModes.map(mode => (
                        <div
                            key={mode.id}
                            className={`mode-option ${getModeClassName(mode.id)} ${
                                mode.id === currentMode.id ? 'selected' : ''
                            } ${!mode.enabled ? 'disabled' : ''}`}
                            onClick={() => handleModeSelect(mode)}
                            role="menuitem"
                            aria-selected={mode.id === currentMode.id}
                        >
                            <div className="mode-color-indicator" />
                            <div className={`mode-option-icon codicon codicon-${mode.icon}`} />
                            
                            <div className="mode-option-content">
                                <div className="mode-option-name">
                                    {mode.name}
                                    {!mode.canModifyFiles && (
                                        <span className="mode-option-badge read-only">
                                            Read-Only
                                        </span>
                                    )}
                                    {mode.canModifyFiles && !mode.canExecuteCommands && (
                                        <span className="mode-option-badge limited">
                                            No Commands
                                        </span>
                                    )}
                                </div>
                                
                                <div className="mode-option-description">
                                    {mode.description}
                                </div>
                                
                                <div className="mode-option-capabilities">
                                    <div className={`mode-capability ${mode.canModifyFiles ? 'enabled' : 'disabled'}`}>
                                        <span className={`mode-capability-icon codicon codicon-${mode.canModifyFiles ? 'check' : 'close'}`} />
                                        <span>Edit files</span>
                                    </div>
                                    
                                    <div className={`mode-capability ${mode.canExecuteCommands ? 'enabled' : 'disabled'}`}>
                                        <span className={`mode-capability-icon codicon codicon-${mode.canExecuteCommands ? 'check' : 'close'}`} />
                                        <span>Run commands</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="mode-keyboard-hint">
                <kbd>⌘M</kbd>
            </div>
        </div>
    )
}

/**
 * Current Mode Indicator Badge
 * Shows the active mode in chat messages
 */
interface ModeIndicatorProps {
    mode: Mode
    className?: string
}

export const ModeIndicator: React.FC<ModeIndicatorProps> = ({ mode, className = '' }) => {
    return (
        <div className={`chat-mode-indicator mode-${mode.id.toLowerCase()} ${className}`}>
            <span className={`codicon codicon-${mode.icon}`} />
            <span>{mode.name}</span>
        </div>
    )
}
