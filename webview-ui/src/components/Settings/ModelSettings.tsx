/**
 * Model Settings Component
 *
 * Comprehensive model configuration including:
 * - Model selection
 * - API key management
 * - Temperature control
 * - Token limits
 * - Context window display
 * - Streaming preferences
 * - Cache control
 * - Cost tracking
 */

import React from 'react'
import './ModelSettings.css'

interface ModelSettingsProps {
  settings: {
    apiKey: string
    apiSecret: string
    temperature: number
    maxTokens: number
    agentModeEnabled: boolean
    agentModeShowBadge: boolean
    streamingEnabled?: boolean
    cacheEnabled?: boolean
    model?: string
    apiProvider?: string
  }
  onUpdate: (key: string, value: any) => void
  costData?: {
    totalCost: number
    requestCount: number
    tokensUsed: number
  }
}

const AVAILABLE_MODELS = [
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', contextWindow: 200000, description: 'Best overall model - balanced performance and cost' },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'Anthropic', contextWindow: 200000, description: 'Most capable for complex tasks' },
  { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', provider: 'Anthropic', contextWindow: 200000, description: 'Balanced performance and speed' },
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'Anthropic', contextWindow: 200000, description: 'Fastest responses' },
  { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo', provider: 'OpenAI', contextWindow: 128000, description: 'Latest GPT-4 with extended context' },
  { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI', contextWindow: 8192, description: 'Standard GPT-4' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI', contextWindow: 16385, description: 'Fast and cost-effective' }
]

export const ModelSettings: React.FC<ModelSettingsProps> = ({ settings, onUpdate, costData }) => {
  const selectedModel = AVAILABLE_MODELS.find(m => m.id === settings.model) || AVAILABLE_MODELS[0]

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`
  }

  const formatNumber = (num: number) => {
    return num.toLocaleString()
  }

  const validateApiKey = (key: string) => {
    if (!key) return { valid: false, message: 'API key required' }
    if (key.length < 20) return { valid: false, message: 'Invalid key format' }
    if (!key.startsWith('sk-') && !key.startsWith('sk_')) return { valid: false, message: 'Should start with sk-' }
    return { valid: true, message: 'Valid' }
  }

  const apiKeyValidation = validateApiKey(settings.apiKey)

  return (
    <section className="settings-section model-settings">
      <h3 className="section-title">🤖 Model Settings</h3>

      {/* Agent Mode Toggle */}
      <div className="setting-group">
        <div className="setting-row">
          <div className="setting-info">
            <label className="setting-label">Agent Mode</label>
            <p className="setting-description">
              Automatically select the best model based on task complexity, cost, and availability
            </p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.agentModeEnabled}
              onChange={(e) => onUpdate('agentModeEnabled', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        {settings.agentModeEnabled && (
          <div className="setting-subrow">
            <div className="setting-info">
              <label className="setting-label">Show Model Badge</label>
              <p className="setting-description">
                Display which model was selected in chat messages
              </p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.agentModeShowBadge}
                onChange={(e) => onUpdate('agentModeShowBadge', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        )}
      </div>

      {/* Model Selection */}
      {!settings.agentModeEnabled && (
        <div className="setting-group">
          <label className="setting-label">Model</label>
          <p className="setting-description">
            Choose the AI model to use for code generation and conversation
          </p>

          <div className="model-selector">
            {AVAILABLE_MODELS.map(model => (
              <div
                key={model.id}
                className={`model-card ${settings.model === model.id ? 'selected' : ''}`}
                onClick={() => onUpdate('model', model.id)}
              >
                <div className="model-header">
                  <div className="model-name">{model.name}</div>
                  <div className="model-provider">{model.provider}</div>
                </div>
                <div className="model-description">{model.description}</div>
                <div className="model-specs">
                  <span className="model-spec">
                    <span className="spec-label">Context:</span> {formatNumber(model.contextWindow)} tokens
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Context Window Display */}
      <div className="setting-group context-window-display">
        <div className="setting-info">
          <label className="setting-label">Context Window</label>
          <p className="setting-description">
            Maximum conversation length for selected model
          </p>
        </div>
        <div className="context-window-value">
          {formatNumber(selectedModel.contextWindow)} tokens
        </div>
      </div>

      {/* API Key Input */}
      <div className="setting-group">
        <label className="setting-label">API Key</label>
        <p className="setting-description">
          Your API key from oropendola.ai dashboard
        </p>

        <div className="api-key-input-wrapper">
          <input
            type="password"
            className={`api-key-input ${apiKeyValidation.valid ? 'valid' : settings.apiKey ? 'invalid' : ''}`}
            value={settings.apiKey}
            onChange={(e) => onUpdate('apiKey', e.target.value)}
            placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
          />
          <div className={`validation-indicator ${apiKeyValidation.valid ? 'valid' : 'invalid'}`}>
            {settings.apiKey && (
              <>
                {apiKeyValidation.valid ? '✓' : '✗'} {apiKeyValidation.message}
              </>
            )}
          </div>
        </div>
      </div>

      {/* API Secret */}
      <div className="setting-group">
        <label className="setting-label">API Secret</label>
        <p className="setting-description">
          Your API secret (keep this secure)
        </p>

        <input
          type="password"
          className="api-secret-input"
          value={settings.apiSecret}
          onChange={(e) => onUpdate('apiSecret', e.target.value)}
          placeholder="••••••••••••••••••••••••"
        />
      </div>

      {/* Temperature Slider */}
      <div className="setting-group">
        <label className="setting-label">
          Temperature: <span className="setting-value">{settings.temperature.toFixed(2)}</span>
        </label>
        <p className="setting-description">
          Controls randomness: 0.0 = focused and deterministic, 2.0 = creative and varied
        </p>

        <div className="temperature-slider-wrapper">
          <span className="slider-label">Focused</span>
          <input
            type="range"
            className="temperature-slider"
            min="0"
            max="2"
            step="0.1"
            value={settings.temperature}
            onChange={(e) => onUpdate('temperature', parseFloat(e.target.value))}
          />
          <span className="slider-label">Creative</span>
        </div>

        <div className="temperature-presets">
          <button
            className={`preset-btn ${settings.temperature === 0 ? 'active' : ''}`}
            onClick={() => onUpdate('temperature', 0)}
          >
            Deterministic (0.0)
          </button>
          <button
            className={`preset-btn ${settings.temperature === 0.7 ? 'active' : ''}`}
            onClick={() => onUpdate('temperature', 0.7)}
          >
            Balanced (0.7)
          </button>
          <button
            className={`preset-btn ${settings.temperature === 1.5 ? 'active' : ''}`}
            onClick={() => onUpdate('temperature', 1.5)}
          >
            Creative (1.5)
          </button>
        </div>
      </div>

      {/* Max Tokens Input */}
      <div className="setting-group">
        <label className="setting-label">Max Tokens</label>
        <p className="setting-description">
          Maximum response length in tokens (affects cost and response size)
        </p>

        <div className="max-tokens-input-wrapper">
          <input
            type="number"
            className="max-tokens-input"
            min="256"
            max="32768"
            step="256"
            value={settings.maxTokens}
            onChange={(e) => onUpdate('maxTokens', parseInt(e.target.value, 10))}
          />
          <span className="tokens-label">tokens</span>
        </div>

        <div className="token-presets">
          <button
            className={`preset-btn ${settings.maxTokens === 2048 ? 'active' : ''}`}
            onClick={() => onUpdate('maxTokens', 2048)}
          >
            Short (2K)
          </button>
          <button
            className={`preset-btn ${settings.maxTokens === 4096 ? 'active' : ''}`}
            onClick={() => onUpdate('maxTokens', 4096)}
          >
            Medium (4K)
          </button>
          <button
            className={`preset-btn ${settings.maxTokens === 8192 ? 'active' : ''}`}
            onClick={() => onUpdate('maxTokens', 8192)}
          >
            Long (8K)
          </button>
          <button
            className={`preset-btn ${settings.maxTokens === 16384 ? 'active' : ''}`}
            onClick={() => onUpdate('maxTokens', 16384)}
          >
            Very Long (16K)
          </button>
        </div>
      </div>

      {/* Streaming Toggle */}
      <div className="setting-group">
        <div className="setting-row">
          <div className="setting-info">
            <label className="setting-label">Streaming Responses</label>
            <p className="setting-description">
              Show responses as they're generated (faster feedback)
            </p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.streamingEnabled !== false}
              onChange={(e) => onUpdate('streamingEnabled', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      {/* Cache Control */}
      <div className="setting-group">
        <div className="setting-row">
          <div className="setting-info">
            <label className="setting-label">Prompt Caching</label>
            <p className="setting-description">
              Cache prompts for faster responses and lower costs (recommended)
            </p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.cacheEnabled !== false}
              onChange={(e) => onUpdate('cacheEnabled', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      {/* Cost Tracking Display */}
      {costData && (
        <div className="setting-group cost-tracking">
          <label className="setting-label">Usage & Cost</label>
          <p className="setting-description">
            Track your API usage and costs
          </p>

          <div className="cost-display">
            <div className="cost-stat">
              <div className="cost-stat-label">Total Cost</div>
              <div className="cost-stat-value">{formatCost(costData.totalCost)}</div>
            </div>
            <div className="cost-stat">
              <div className="cost-stat-label">Requests</div>
              <div className="cost-stat-value">{formatNumber(costData.requestCount)}</div>
            </div>
            <div className="cost-stat">
              <div className="cost-stat-label">Tokens Used</div>
              <div className="cost-stat-value">{formatNumber(costData.tokensUsed)}</div>
            </div>
          </div>

          <button className="button-secondary cost-reset-btn" onClick={() => {
            if (confirm('Reset cost tracking data? This cannot be undone.')) {
              onUpdate('resetCostTracking', true)
            }
          }}>
            Reset Tracking
          </button>
        </div>
      )}
    </section>
  )
}
