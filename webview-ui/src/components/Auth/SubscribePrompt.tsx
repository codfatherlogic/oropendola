/**
 * Subscribe Prompt Component
 *
 * Shown after sign-in when user has no active subscription
 * Prompts user to subscribe before accessing chat
 */

import React from 'react'
import './SubscribePrompt.css'

interface Subscription {
  plan_name: string
  status: 'Active' | 'Trial' | 'Expired' | 'Cancelled' | 'Pending'
  is_active: boolean
  is_trial: boolean
  days_remaining?: number
  expired_days_ago?: number
  end_date?: string
}

interface SubscribePromptProps {
  subscription: Subscription | null
  userEmail?: string | null
  onSubscribe: () => void
}

export const SubscribePrompt: React.FC<SubscribePromptProps> = ({
  subscription,
  userEmail,
  onSubscribe
}) => {
  console.log('🔒 [SubscribePrompt] Rendering with subscription:', subscription)

  // Determine the message based on subscription status
  let title = 'Welcome to Oropendola AI'
  let message = 'Start your AI-powered coding journey'
  let ctaText = 'Subscribe Now'

  if (subscription) {
    if (subscription.status === 'Expired') {
      if (subscription.is_trial) {
        title = 'Your Trial Has Ended'
        message = 'Your free trial has expired. Subscribe to continue using Oropendola AI.'
        ctaText = 'Subscribe to Continue'
      } else {
        title = 'Subscription Expired'
        message = 'Your subscription has expired. Renew to continue using Oropendola AI.'
        ctaText = 'Renew Subscription'
      }
    } else if (subscription.status === 'Cancelled') {
      title = 'Subscription Cancelled'
      message = 'Your subscription was cancelled. Subscribe again to continue using Oropendola AI.'
      ctaText = 'Subscribe Now'
    } else if (subscription.status === 'Pending') {
      title = 'Payment Pending'
      message = 'Your payment is being processed. You\'ll have access once payment is confirmed.'
      ctaText = 'View Subscription'
    }
  }

  return (
    <div className="subscribe-prompt">
      <div className="subscribe-prompt-container">
        {/* Icon */}
        <div className="subscribe-prompt-icon">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="38" stroke="currentColor" strokeWidth="3" opacity="0.2"/>
            <path d="M40 20L50 30L40 40L30 30L40 20Z" fill="currentColor" opacity="0.6"/>
            <path d="M40 40L50 50L40 60L30 50L40 40Z" fill="currentColor"/>
            <circle cx="40" cy="40" r="8" fill="currentColor"/>
          </svg>
        </div>

        {/* Content */}
        <div className="subscribe-prompt-content">
          <h1 className="subscribe-prompt-title">{title}</h1>
          {userEmail && (
            <p className="subscribe-prompt-email">Signed in as {userEmail}</p>
          )}
          <p className="subscribe-prompt-message">{message}</p>

          {/* Features List */}
          <div className="subscribe-prompt-features">
            <div className="feature-item">
              <span className="feature-icon">✨</span>
              <span>AI-powered code generation</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🔍</span>
              <span>Advanced code analysis</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🚀</span>
              <span>Productivity tools & automation</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">💡</span>
              <span>Smart suggestions & refactoring</span>
            </div>
          </div>

          {/* CTA Button */}
          <button
            className="subscribe-prompt-button"
            onClick={onSubscribe}
          >
            {ctaText}
          </button>

          {/* Pending status message */}
          {subscription?.status === 'Pending' && (
            <p className="subscribe-prompt-note">
              This usually takes a few minutes. Refresh the page if payment is complete.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
