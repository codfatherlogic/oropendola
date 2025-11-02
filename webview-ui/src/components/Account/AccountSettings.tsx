/**
 * Account Settings Component
 *
 * Displays user profile, subscription details, usage statistics, and daily limits
 */

import React, { useState, useEffect } from 'react'
import vscode from '../../vscode-api'
import './AccountSettings.css'

interface UserProfile {
  name?: string
  email?: string
  phone?: string
  country?: string
}

interface Subscription {
  plan_name: string
  status: 'Active' | 'Trial' | 'Expired' | 'Cancelled' | 'Pending'
  start_date: string
  end_date: string
  is_active: boolean
  is_trial: boolean
  days_remaining: number
  expired_days_ago?: number
}

interface UsageStatistics {
  input_tokens: number
  output_tokens: number
  cached_tokens: number
}

interface DailyLimit {
  used_today: number
  remaining: number
  daily_limit: number
  resets_at: string
}

interface RequestAnalytics {
  total_requests: number
  last_request: string
  recent_activity: Array<{
    type: string
    timestamp: string
  }>
}

interface AccountData {
  profile?: UserProfile
  subscription?: Subscription | null
  usage?: UsageStatistics
  daily_limit?: DailyLimit
  analytics?: RequestAnalytics
}

interface AccountSettingsProps {
  onDone: () => void
  isAuthenticated: boolean
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({ onDone, isAuthenticated }) => {
  const [accountData, setAccountData] = useState<AccountData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load account data
  useEffect(() => {
    loadAccountData()

    // Listen for messages from extension
    const handleMessage = (event: MessageEvent) => {
      const message = event.data

      switch (message.type) {
        case 'accountData':
          setAccountData(message.data)
          setLoading(false)
          break

        case 'accountDataError':
          setError(message.error)
          setLoading(false)
          break

        case 'accountDataRefreshed':
          setAccountData(message.data)
          break
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const loadAccountData = () => {
    setLoading(true)
    setError(null)
    vscode.postMessage({ type: 'getAccountData' })
  }

  const handleRefresh = () => {
    loadAccountData()
  }

  const handleManagePlan = () => {
    vscode.postMessage({ type: 'openPricingPage' })
  }

  const handleLogin = () => {
    vscode.postMessage({ type: 'signIn' })
    // Return to chat view
    onDone()
  }

  const handleLogout = () => {
    vscode.postMessage({ type: 'logout' })
    // Automatically return to chat view after logout
    onDone()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatNumber = (num: number | undefined) => {
    if (num === undefined || num === null) return '0'
    return num.toLocaleString()
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'today'
    if (diffDays === 1) return '1 day ago'
    return `${diffDays} days ago`
  }

  if (loading) {
    return (
      <div className="account-settings">
        <div className="account-header">
          <button className="back-button" onClick={onDone}>
            ← Back
          </button>
          <h2>Settings</h2>
        </div>
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading account data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="account-settings">
        <div className="account-header">
          <div className="header-left">
            <button className="back-button" onClick={onDone}>
              ← Back
            </button>
            <h2>Settings</h2>
          </div>
          <div className="header-actions">
            {!isAuthenticated ? (
              <button className="logout-button" onClick={handleLogin}>
                Sign In
              </button>
            ) : (
              <button className="logout-button" onClick={handleLogout}>
                Logout
              </button>
            )}
          </div>
        </div>
        <div className="error-state">
          <p className="error-message">{error}</p>
          <p className="error-help">
            {!isAuthenticated
              ? 'Please sign in to view your account settings and usage data.'
              : 'Unable to load account data. Please try again.'}
          </p>
          <div className="error-actions">
            {!isAuthenticated ? (
              <button className="retry-button" onClick={handleLogin}>
                Sign In
              </button>
            ) : (
              <button className="retry-button" onClick={handleRefresh}>
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!accountData) {
    return null
  }

  const subscription = accountData.subscription
  const showExpiredBanner = subscription && !subscription.is_active && subscription.status === 'Expired'

  return (
    <div className="account-settings">
      {/* Header */}
      <div className="account-header">
        <div className="header-left">
          <button className="back-button" onClick={onDone}>
            ← Back
          </button>
          <h2>Settings</h2>
        </div>
        <div className="header-actions">
          <button className="save-button">Save</button>
          <button className="done-button" onClick={onDone}>Done</button>
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* Trial Expired Banner */}
      {showExpiredBanner && (
        <div className="trial-banner">
          <span className="warning-icon">⚠</span>
          <span className="banner-text">
            Your {subscription.is_trial ? 'trial' : 'subscription'} has expired{subscription.expired_days_ago ? ` ${subscription.expired_days_ago} day(s) ago` : ''}. Renew to continue.
          </span>
          <button className="renew-button" onClick={handleManagePlan}>
            Renew Now
          </button>
        </div>
      )}

      <div className="account-content">
        {/* Usage & Account Settings Header */}
        <div className="section-header">
          <h3>Usage & Account Settings</h3>
          <p className="section-subtitle">Monitor your AI usage and manage account details</p>
        </div>

        {/* Refresh Button */}
        <button className="refresh-button" onClick={handleRefresh}>
          <span className="refresh-icon">🔄</span>
          Refresh
        </button>

        {/* Account Information */}
        <div className="settings-section">
          <div className="section-title">
            <h4>Account Information</h4>
            <button className="update-profile-button">
              <span>✏️</span>
              Update Profile
            </button>
          </div>

          <div className="info-grid">
            <div className="info-item">
              <label>Name:</label>
              <div className="info-value">{accountData.profile?.name || 'Not available'}</div>
            </div>
            <div className="info-item">
              <label>Email:</label>
              <div className="info-value">{accountData.profile?.email || 'Not available'}</div>
            </div>
            <div className="info-item">
              <label>Phone:</label>
              <div className="info-value">{accountData.profile?.phone || 'Not available'}</div>
            </div>
            <div className="info-item">
              <label>Country:</label>
              <div className="info-value">{accountData.profile?.country || 'Not available'}</div>
            </div>
          </div>
        </div>

        {/* Subscription Details */}
        {subscription && (
          <div className="settings-section">
            <div className="section-title">
              <h4>Subscription Details</h4>
              <button className="manage-plan-button" onClick={handleManagePlan}>
                <span>⚙️</span>
                Manage Plan
              </button>
            </div>

            <div className="info-grid">
              <div className="info-item">
                <label>Subscription:</label>
                <div className="info-value">{subscription.plan_name}</div>
              </div>
              <div className="info-item">
                <label>Expires:</label>
                <div className={`info-value ${!subscription.is_active ? 'expired' : ''}`}>
                  {formatDateTime(subscription.end_date)} {!subscription.is_active && '(Expired)'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Usage Statistics */}
        <div className="settings-section">
          <h4>Usage Statistics</h4>
          <p className="section-description">Your current AI usage till date</p>

          <div className="usage-cards">
            <div className="usage-card">
              <div className="usage-icon input-icon">→</div>
              <div className="usage-info">
                <div className="usage-label">Input Tokens</div>
                <div className="usage-sublabel">Tokens sent to AI</div>
              </div>
              <div className="usage-value">{formatNumber(accountData.usage?.input_tokens)}</div>
            </div>

            <div className="usage-card">
              <div className="usage-icon output-icon">←</div>
              <div className="usage-info">
                <div className="usage-label">Output Tokens</div>
                <div className="usage-sublabel">Tokens received from AI</div>
              </div>
              <div className="usage-value">{formatNumber(accountData.usage?.output_tokens)}</div>
            </div>

            <div className="usage-card">
              <div className="usage-icon cached-icon">📦</div>
              <div className="usage-info">
                <div className="usage-label">Cached Tokens</div>
                <div className="usage-sublabel">Optimized cached responses</div>
              </div>
              <div className="usage-value">{formatNumber(accountData.usage?.cached_tokens)}</div>
            </div>
          </div>
        </div>

        {/* Daily Request Limit */}
        {accountData.daily_limit && (
          <div className="settings-section">
            <h4>Daily Request Limit</h4>
            <p className="section-description">Your daily AI request usage</p>

            <div className="limit-cards">
              <div className="limit-card">
                <div className="limit-icon used-icon">📊</div>
                <div className="limit-info">
                  <div className="limit-label">Used Today</div>
                  <div className="limit-sublabel">Requests sent today</div>
                </div>
                <div className="limit-value">{accountData.daily_limit.used_today}/{accountData.daily_limit.daily_limit}</div>
              </div>

              <div className="limit-card">
                <div className="limit-icon remaining-icon">→</div>
                <div className="limit-info">
                  <div className="limit-label">Remaining</div>
                  <div className="limit-sublabel">Requests left today</div>
                </div>
                <div className="limit-value">{accountData.daily_limit.remaining} requests</div>
              </div>

              <div className="limit-card">
                <div className="limit-icon daily-icon">📋</div>
                <div className="limit-info">
                  <div className="limit-label">Daily Limit</div>
                  <div className="limit-sublabel">Maximum requests per day</div>
                </div>
                <div className="limit-value">{accountData.daily_limit.daily_limit} requests</div>
              </div>

              <div className="limit-card">
                <div className="limit-icon reset-icon">🔄</div>
                <div className="limit-info">
                  <div className="limit-label">Resets At</div>
                  <div className="limit-sublabel">Next limit reset time</div>
                </div>
                <div className="limit-value reset-time">{accountData.daily_limit.resets_at}</div>
              </div>
            </div>
          </div>
        )}

        {/* Request Analytics */}
        {accountData.analytics && (
          <div className="settings-section">
            <h4>Request Analytics</h4>
            <p className="section-description">Your AI request activity and patterns</p>

            <div className="analytics-cards">
              <div className="analytics-card">
                <div className="analytics-icon total-icon">📊</div>
                <div className="analytics-info">
                  <div className="analytics-label">Total Requests</div>
                  <div className="analytics-sublabel">AI requests made</div>
                </div>
                <div className="analytics-value">{formatNumber(accountData.analytics.total_requests)}</div>
              </div>

              {accountData.analytics.last_request && (
                <div className="analytics-card">
                  <div className="analytics-icon recent-icon">🔄</div>
                  <div className="analytics-info">
                    <div className="analytics-label">Last Request</div>
                    <div className="analytics-sublabel">Most recent activity</div>
                  </div>
                  <div className="analytics-value time-ago">{getTimeAgo(accountData.analytics.last_request)}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {accountData.analytics?.recent_activity && accountData.analytics.recent_activity.length > 0 && (
          <div className="settings-section">
            <h4>Recent Activity</h4>

            <div className="activity-list">
              {accountData.analytics.recent_activity.map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-icon">🔧</div>
                  <div className="activity-details">
                    <div className="activity-type">{activity.type}</div>
                  </div>
                  <div className="activity-time">{formatDate(activity.timestamp)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
