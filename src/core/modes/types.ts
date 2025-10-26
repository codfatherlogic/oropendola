/**
 * Multi-Mode System Types
 * 
 * Defines different AI behavior modes for the assistant.
 * Each mode has specific characteristics and use cases.
 */

/**
 * Available AI assistant modes
 */
export enum AssistantMode {
    /** Default mode for everyday coding, edits, and file operations */
    CODE = 'code',
    
    /** Planning and architecture mode for system design */
    ARCHITECT = 'architect',
    
    /** Question-answering mode without file modifications */
    ASK = 'ask',
    
    /** Debugging mode focused on finding and fixing issues */
    DEBUG = 'debug',
    
    /** Custom user-defined modes (future feature) */
    CUSTOM = 'custom'
}

/**
 * Mode configuration and metadata
 */
export interface ModeConfig {
    /** Unique mode identifier */
    id: AssistantMode
    
    /** Display name for UI */
    name: string
    
    /** Short description of mode purpose */
    description: string
    
    /** Icon identifier for UI (codicon name) */
    icon: string
    
    /** System prompt template for this mode */
    systemPrompt: string
    
    /** Whether this mode can modify files */
    canModifyFiles: boolean
    
    /** Whether this mode can execute terminal commands */
    canExecuteCommands: boolean
    
    /** Maximum verbosity level (1-5, 5 = most verbose) */
    verbosityLevel: number
    
    /** Color theme for UI (hex color) */
    color: string
    
    /** Whether mode is enabled */
    enabled: boolean
}

/**
 * Mode switching event data
 */
export interface ModeChangeEvent {
    /** Previous mode */
    previousMode: AssistantMode
    
    /** New active mode */
    newMode: AssistantMode
    
    /** Timestamp of mode change */
    timestamp: Date
    
    /** User who triggered the change */
    triggeredBy: 'user' | 'system'
}

/**
 * Mode context for API requests
 */
export interface ModeContext {
    /** Active mode */
    mode: AssistantMode
    
    /** Custom system prompt override (optional) */
    customPrompt?: string
    
    /** Mode-specific settings */
    settings?: Record<string, any>
}

/**
 * Custom mode definition (for future use)
 */
export interface CustomModeDefinition {
    /** Unique identifier */
    id: string
    
    /** Display name */
    name: string
    
    /** Description */
    description: string
    
    /** Custom system prompt */
    systemPrompt: string
    
    /** Custom icon */
    icon?: string
    
    /** Capabilities */
    capabilities: {
        modifyFiles: boolean
        executeCommands: boolean
        readFiles: boolean
    }
    
    /** Creator */
    createdBy?: string
    
    /** Creation timestamp */
    createdAt?: Date
}
