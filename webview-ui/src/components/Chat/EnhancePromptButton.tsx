/**
 * EnhancePromptButton Component
 * 
 * Button that uses AI to improve/enhance user prompts before sending
 * Matches Roo-Code's prompt enhancement pattern
 */

import React, { useState } from 'react'
import { Sparkles } from 'lucide-react'
import './EnhancePromptButton.css'

export interface EnhancePromptButtonProps {
  /** Current prompt text */
  prompt: string
  
  /** Callback when enhanced prompt is ready */
  onEnhanced: (enhancedPrompt: string) => void
  
  /** Callback to request enhancement (calls backend) */
  onRequestEnhancement?: (prompt: string) => Promise<string>
  
  /** Disabled state */
  disabled?: boolean
  
  /** Additional CSS classes */
  className?: string
}

export const EnhancePromptButton: React.FC<EnhancePromptButtonProps> = ({
  prompt,
  onEnhanced,
  onRequestEnhancement,
  disabled = false,
  className = '',
}) => {
  const [isEnhancing, setIsEnhancing] = useState(false)

  const handleEnhance = async () => {
    if (!prompt.trim() || disabled || isEnhancing) {
      return
    }

    setIsEnhancing(true)

    try {
      // If custom enhancement function provided, use it
      if (onRequestEnhancement) {
        const enhanced = await onRequestEnhancement(prompt)
        onEnhanced(enhanced)
      } else {
        // Fallback: simple enhancement (add context prompts)
        const enhanced = enhancePromptLocally(prompt)
        onEnhanced(enhanced)
      }
    } catch (error) {
      console.error('Failed to enhance prompt:', error)
      // Could show error toast here
    } finally {
      setIsEnhancing(false)
    }
  }

  const isDisabled = disabled || !prompt.trim() || isEnhancing

  return (
    <button
      className={`enhance-prompt-button ${className} ${isEnhancing ? 'enhancing' : ''}`}
      onClick={handleEnhance}
      disabled={isDisabled}
      title="Enhance this prompt with AI suggestions"
      aria-label="Enhance prompt"
    >
      <Sparkles size={16} className="enhance-icon" />
      <span className="enhance-text">
        {isEnhancing ? 'Enhancing...' : 'Enhance'}
      </span>
    </button>
  )
}

/**
 * Local prompt enhancement (fallback when no backend enhancement available)
 * Adds helpful context and structure to user prompts
 */
function enhancePromptLocally(prompt: string): string {
  const trimmed = prompt.trim()
  
  // Don't enhance if already detailed (>100 chars)
  if (trimmed.length > 100) {
    return trimmed
  }

  // Add helpful context based on prompt patterns
  if (isCodeRequest(trimmed)) {
    return `${trimmed}

Please provide:
- Clean, well-commented code
- Error handling where appropriate
- Type safety (if applicable)
- Brief explanation of the approach`
  }

  if (isDebugRequest(trimmed)) {
    return `${trimmed}

Please help me:
1. Identify the root cause
2. Explain why it's happening
3. Suggest a fix with code example
4. Recommend how to prevent similar issues`
  }

  if (isRefactorRequest(trimmed)) {
    return `${trimmed}

Please:
- Suggest improvements to code structure
- Identify potential bugs or edge cases
- Recommend best practices
- Maintain existing functionality`
  }

  // Generic enhancement
  return `${trimmed}

Please provide a detailed and thorough response.`
}

/**
 * Detect if prompt is asking for code
 */
function isCodeRequest(prompt: string): boolean {
  const codeKeywords = [
    'write', 'create', 'implement', 'build', 'make',
    'function', 'class', 'component', 'script', 'code'
  ]
  const lower = prompt.toLowerCase()
  return codeKeywords.some(keyword => lower.includes(keyword))
}

/**
 * Detect if prompt is asking for debugging help
 */
function isDebugRequest(prompt: string): boolean {
  const debugKeywords = [
    'debug', 'fix', 'error', 'bug', 'issue', 'problem',
    'not working', 'broken', 'fails', 'crash'
  ]
  const lower = prompt.toLowerCase()
  return debugKeywords.some(keyword => lower.includes(keyword))
}

/**
 * Detect if prompt is asking for refactoring
 */
function isRefactorRequest(prompt: string): boolean {
  const refactorKeywords = [
    'refactor', 'improve', 'optimize', 'clean up',
    'better', 'restructure', 'rewrite'
  ]
  const lower = prompt.toLowerCase()
  return refactorKeywords.some(keyword => lower.includes(keyword))
}

export default EnhancePromptButton
