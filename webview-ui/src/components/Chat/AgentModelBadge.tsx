import React from 'react'
import './AgentModelBadge.css'

interface AgentModelBadgeProps {
  model: string
  selectionReason?: string
  compact?: boolean
}

/**
 * AgentModelBadge - Displays the auto-selected AI model from Agent Mode
 * Shows which model Oropendola chose and optionally why
 */
export const AgentModelBadge: React.FC<AgentModelBadgeProps> = ({
  model,
  selectionReason,
  compact = false
}) => {
  // Model-specific styling
  const getModelClass = (modelName: string): string => {
    const normalized = modelName.toLowerCase()
    if (normalized.includes('claude')) return 'model-claude'
    if (normalized.includes('gpt') || normalized.includes('openai')) return 'model-gpt'
    if (normalized.includes('deepseek')) return 'model-deepseek'
    if (normalized.includes('grok')) return 'model-grok'
    if (normalized.includes('gemini')) return 'model-gemini'
    return 'model-other'
  }

  // Model icons
  const getModelIcon = (modelName: string): string => {
    const normalized = modelName.toLowerCase()
    if (normalized.includes('claude')) return '🤖'
    if (normalized.includes('gpt')) return '🧠'
    if (normalized.includes('deepseek')) return '🔍'
    if (normalized.includes('grok')) return '⚡'
    if (normalized.includes('gemini')) return '✨'
    return '🎯'
  }

  if (compact) {
    return (
      <div className={`agent-model-badge compact ${getModelClass(model)}`} title={selectionReason || 'Auto-selected by Oropendola'}>
        <span className="model-icon">{getModelIcon(model)}</span>
        <span className="model-name">{model}</span>
      </div>
    )
  }

  return (
    <div className={`agent-model-badge ${getModelClass(model)}`}>
      <div className="model-header">
        <span className="model-icon">{getModelIcon(model)}</span>
        <span className="model-name">{model}</span>
        <span className="agent-badge">Auto</span>
      </div>
      {selectionReason && (
        <div className="selection-reason">
          {selectionReason}
        </div>
      )}
    </div>
  )
}
