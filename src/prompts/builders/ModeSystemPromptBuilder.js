/**
 * Mode-Aware System Prompt Builder
 * 
 * Integrates mode-specific system prompts with the existing prompt builder
 */

const { SystemPromptBuilder } = require('./SystemPromptBuilder')
const { getModePrompt, getModeConfig } = require('../../core/modes/prompts')
const { AssistantMode } = require('../../core/modes/types')

class ModeSystemPromptBuilder extends SystemPromptBuilder {
    /**
     * Build system prompt with mode-specific behavior
     * @param {Object} options - Options for prompt building
     * @param {string} options.mode - AssistantMode (code, architect, ask, debug)
     * @param {string} options.customPrompt - Custom prompt override
     * @param {boolean} options.includeDynamicContext - Include dynamic context
     * @param {string[]} options.excludeSections - Sections to exclude
     * @returns {string} Complete mode-aware system prompt
     */
    buildWithMode(options = {}) {
        const {
            mode = AssistantMode.CODE,
            customPrompt,
            includeDynamicContext = true,
            excludeSections = []
        } = options
        
        // Get mode-specific prompt
        const modePrompt = getModePrompt(mode, customPrompt)
        const modeConfig = getModeConfig(mode)
        
        // Build base prompt with mode-specific additions
        let systemPrompt = ''
        
        // 1. Start with mode-specific prompt (primary behavior)
        systemPrompt += modePrompt + '\n\n'
        
        // 2. Add mode configuration context
        systemPrompt += this.buildModeContext(modeConfig) + '\n\n'
        
        // 3. Add modular prompts (capabilities, tool usage, etc.)
        // Exclude sections that conflict with mode restrictions
        const modeExclusions = this.getModeExclusions(modeConfig)
        const allExclusions = [...excludeSections, ...modeExclusions]
        
        const basePrompt = super.build({
            includeDynamicContext: false, // We'll add it separately
            excludeSections: allExclusions
        })
        
        if (basePrompt) {
            systemPrompt += basePrompt + '\n\n'
        }
        
        // 4. Add dynamic context
        if (includeDynamicContext && this.dynamicContext) {
            systemPrompt += this.dynamicContext + '\n\n'
        }
        
        // 5. Add mode restrictions reminder
        systemPrompt += this.buildModeRestrictions(modeConfig)
        
        return systemPrompt.trim()
    }
    
    /**
     * Build mode context section
     */
    buildModeContext(modeConfig) {
        return `**Current Mode**: ${modeConfig.name}

**Mode Capabilities**:
- Can modify files: ${modeConfig.canModifyFiles ? '✅ YES' : '❌ NO'}
- Can execute commands: ${modeConfig.canExecuteCommands ? '✅ YES' : '❌ NO'}
- Verbosity level: ${modeConfig.verbosityLevel}/5

**Mode Purpose**: ${modeConfig.description}`
    }
    
    /**
     * Get sections to exclude based on mode
     */
    getModeExclusions(modeConfig) {
        const exclusions = []
        
        // Exclude file modification sections if mode doesn't allow it
        if (!modeConfig.canModifyFiles) {
            exclusions.push('file-operations', 'code-editing', 'refactoring')
        }
        
        // Exclude command execution sections if mode doesn't allow it
        if (!modeConfig.canExecuteCommands) {
            exclusions.push('terminal-commands', 'package-management', 'build-tools')
        }
        
        return exclusions
    }
    
    /**
     * Build mode restrictions reminder
     */
    buildModeRestrictions(modeConfig) {
        if (modeConfig.canModifyFiles && modeConfig.canExecuteCommands) {
            return '' // No restrictions
        }
        
        let restrictions = '**⚠️ MODE RESTRICTIONS**:\n'
        
        if (!modeConfig.canModifyFiles) {
            restrictions += '- You are in READ-ONLY mode. Do NOT attempt to modify, create, or delete files.\n'
            restrictions += '- You can analyze code, answer questions, and provide explanations.\n'
            restrictions += '- If the user requests file changes, politely explain you\'re in ${modeConfig.name} and suggest switching to Code Mode.\n'
        }
        
        if (!modeConfig.canExecuteCommands) {
            restrictions += '- You CANNOT execute terminal commands in this mode.\n'
            restrictions += '- You can suggest commands but cannot run them.\n'
            restrictions += '- If command execution is needed, recommend switching to Code Mode or Debug Mode.\n'
        }
        
        return restrictions
    }
    
    /**
     * Validate that mode restrictions are being followed
     * Can be used to check AI responses before sending
     */
    validateModeRestrictions(response, modeConfig) {
        const violations = []
        
        // Check for file modification attempts in read-only mode
        if (!modeConfig.canModifyFiles) {
            const fileModPatterns = [
                /create.*file/i,
                /write.*to.*file/i,
                /modify.*file/i,
                /delete.*file/i,
                /fs\.write/i,
                /fs\.unlink/i
            ]
            
            for (const pattern of fileModPatterns) {
                if (pattern.test(response)) {
                    violations.push('Attempted file modification in read-only mode')
                    break
                }
            }
        }
        
        // Check for command execution attempts when not allowed
        if (!modeConfig.canExecuteCommands) {
            const commandPatterns = [
                /exec\(/i,
                /spawn\(/i,
                /run.*command/i,
                /execute.*in.*terminal/i
            ]
            
            for (const pattern of commandPatterns) {
                if (pattern.test(response)) {
                    violations.push('Attempted command execution when not allowed')
                    break
                }
            }
        }
        
        return {
            valid: violations.length === 0,
            violations
        }
    }
}

module.exports = { ModeSystemPromptBuilder }
