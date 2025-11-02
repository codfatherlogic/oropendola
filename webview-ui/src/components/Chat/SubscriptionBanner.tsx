/**
 * Subscription Banner Component
 *
 * Displays a warning banner when subscription/trial has expired
 */

import React from 'react'
import './SubscriptionBanner.css'

interface Subscription {
  plan_name: string
  status: 'Active' | 'Trial' | 'Expired' | 'Cancelled' | 'Pending'
  is_active: boolean
  is_trial: boolean
  days_remaining: number
  expired_days_ago?: number
  end_date: string
}

interface SubscriptionBannerProps {
  subscription: Subscription | null
  onRenew: () => void
}

export const SubscriptionBanner: React.FC<SubscriptionBannerProps> = ({ subscription, onRenew }) => {
  console.log('🎗️ [SubscriptionBanner] Rendering with subscription:', subscription)

  if (!subscription) {
    console.log('🎗️ [SubscriptionBanner] No subscription data - hiding banner')
    return null
  }

  console.log('🎗️ [SubscriptionBanner] Subscription status:', subscription.status, 'is_active:', subscription.is_active)

  // Don't show banner if subscription is active
  if (subscription.is_active) {
    console.log('🎗️ [SubscriptionBanner] Subscription is active - hiding banner')
    return null
  }

  // Show banner only for expired subscriptions
  if (subscription.status !== 'Expired') {
    console.log('🎗️ [SubscriptionBanner] Subscription not expired (status:', subscription.status, ') - hiding banner')
    return null
  }

  console.log('🎗️ [SubscriptionBanner] SHOWING BANNER - subscription expired')

  const isTrial = subscription.is_trial
  const daysAgo = subscription.expired_days_ago || 0

  let message = ''
  if (isTrial) {
    if (daysAgo === 0) {
      message = 'Your TRIAL has expired. Renew to continue.'
    } else if (daysAgo === 1) {
      message = 'Your TRIAL expired 1 day ago. Renew to continue.'
    } else {
      message = `Your TRIAL expired ${daysAgo} days ago. Renew to continue.`
    }
  } else {
    if (daysAgo === 0) {
      message = 'Your subscription has expired. Renew to continue.'
    } else if (daysAgo === 1) {
      message = 'Your subscription expired 1 day ago. Renew to continue.'
    } else {
      message = `Your subscription expired ${daysAgo} days ago. Renew to continue.`
    }
  }

  return (
    <div className="subscription-banner">
      <div className="subscription-banner-content">
        <span className="subscription-banner-icon">⚠</span>
        <span className="subscription-banner-message">{message}</span>
      </div>
      <button className="subscription-banner-button" onClick={onRenew}>
        Renew Now
      </button>
    </div>
  )
}
