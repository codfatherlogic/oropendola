/**
 * FollowupQuestionPrompt Component
 *
 * Displays an interactive followup question from the AI with suggested answer buttons.
 * Supports timeout-based auto-selection when auto-approve is enabled.
 */

import React, { useState, useEffect } from 'react'
import './FollowupQuestionPrompt.css'

interface FollowupQuestionPromptProps {
  question: string
  suggestedAnswers?: string[]
  timeout?: number
  autoApproveEnabled?: boolean
  onAnswer: (answer: string) => void
}

export const FollowupQuestionPrompt: React.FC<FollowupQuestionPromptProps> = ({
  question,
  suggestedAnswers = [],
  timeout = 30000,
  autoApproveEnabled = false,
  onAnswer,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(
    autoApproveEnabled && timeout > 0 ? timeout : null
  )
  const [customAnswer, setCustomAnswer] = useState('')

  // Countdown timer effect
  useEffect(() => {
    if (!autoApproveEnabled || !timeout || timeout <= 0) {
      setTimeRemaining(null)
      return
    }

    setTimeRemaining(timeout)

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 100) {
          clearInterval(interval)
          return 0
        }
        return prev - 100
      })
    }, 100)

    const timeoutId = setTimeout(() => {
      // Auto-select first suggested answer or "Continue"
      const defaultAnswer = suggestedAnswers.length > 0 ? suggestedAnswers[0] : 'Continue'
      onAnswer(defaultAnswer)
    }, timeout)

    return () => {
      clearInterval(interval)
      clearTimeout(timeoutId)
    }
  }, [autoApproveEnabled, timeout, suggestedAnswers, onAnswer])

  const handleSuggestedAnswer = (answer: string) => {
    onAnswer(answer)
  }

  const handleCustomAnswer = () => {
    if (customAnswer.trim()) {
      onAnswer(customAnswer.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleCustomAnswer()
    }
  }

  // Calculate progress percentage for visual feedback
  const progressPercentage = timeRemaining !== null && timeout > 0
    ? ((timeout - timeRemaining) / timeout) * 100
    : 0

  return (
    <div className="followup-question-prompt">
      <div className="followup-question-header">
        <span className="followup-question-icon">❓</span>
        <span className="followup-question-title">Question from AI</span>
        {timeRemaining !== null && timeRemaining > 0 && (
          <span className="followup-question-timer">
            Auto-selecting in {Math.ceil(timeRemaining / 1000)}s
          </span>
        )}
      </div>

      <div className="followup-question-content">
        <p className="followup-question-text">{question}</p>

        {/* Progress bar for timeout visualization */}
        {timeRemaining !== null && timeout > 0 && (
          <div className="followup-question-progress-container">
            <div
              className="followup-question-progress-bar"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        )}

        {/* Suggested answer buttons */}
        {suggestedAnswers.length > 0 && (
          <div className="followup-question-suggestions">
            <span className="followup-question-label">Quick answers:</span>
            <div className="followup-question-buttons">
              {suggestedAnswers.map((answer, index) => (
                <button
                  key={index}
                  className="followup-question-button"
                  onClick={() => handleSuggestedAnswer(answer)}
                  title={`Select: ${answer}`}
                >
                  {answer}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom answer input */}
        <div className="followup-question-custom">
          <input
            type="text"
            className="followup-question-input"
            placeholder="Or type your own answer..."
            value={customAnswer}
            onChange={(e) => setCustomAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus={suggestedAnswers.length === 0}
          />
          <button
            className="followup-question-submit"
            onClick={handleCustomAnswer}
            disabled={!customAnswer.trim()}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  )
}
