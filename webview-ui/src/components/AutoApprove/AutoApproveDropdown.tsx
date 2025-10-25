/**
 * AutoApproveDropdown Component
 *
 * Provides a dropdown interface for configuring auto-approval settings.
 * Users can enable/disable automatic approval for 10 different permission types.
 */

import React, { useState, useCallback, useMemo } from 'react'
import { ListChecks, X, CheckCheck, Settings } from 'lucide-react'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  Tooltip,
  ToggleSwitch,
} from '../ui'
import {
  AutoApproveSetting,
  AutoApproveToggles,
  autoApproveSettingsConfig,
  getEnabledCount,
  getTotalCount,
  isEffectivelyEnabled,
} from '../../types/auto-approve'
import './AutoApproveDropdown.css'

interface AutoApproveDropdownProps {
  disabled?: boolean
  triggerClassName?: string
  // State management
  autoApprovalEnabled: boolean
  toggles: AutoApproveToggles
  // Callbacks for state changes
  onAutoApprovalEnabledChange: (enabled: boolean) => void
  onToggleChange: (key: AutoApproveSetting, value: boolean) => void
}

export const AutoApproveDropdown: React.FC<AutoApproveDropdownProps> = ({
  disabled = false,
  triggerClassName = '',
  autoApprovalEnabled,
  toggles,
  onAutoApprovalEnabledChange,
  onToggleChange,
}) => {
  const [open, setOpen] = useState(false)

  // Calculate counts
  const enabledCount = useMemo(() => getEnabledCount(toggles), [toggles])
  const totalCount = useMemo(() => getTotalCount(), [])
  const effectivelyEnabled = useMemo(
    () => isEffectivelyEnabled(toggles, autoApprovalEnabled),
    [toggles, autoApprovalEnabled]
  )

  // Handle individual toggle change
  const handleToggleChange = useCallback(
    (key: AutoApproveSetting, value: boolean) => {
      onToggleChange(key, value)

      // If enabling any option, ensure master switch is on
      if (value && !autoApprovalEnabled) {
        onAutoApprovalEnabledChange(true)
      }
    },
    [autoApprovalEnabled, onAutoApprovalEnabledChange, onToggleChange]
  )

  // Handle Select All
  const handleSelectAll = useCallback(() => {
    Object.keys(autoApproveSettingsConfig).forEach((key) => {
      onToggleChange(key as AutoApproveSetting, true)
    })
    // Enable master switch if not already
    if (!autoApprovalEnabled) {
      onAutoApprovalEnabledChange(true)
    }
  }, [autoApprovalEnabled, onAutoApprovalEnabledChange, onToggleChange])

  // Handle Select None
  const handleSelectNone = useCallback(() => {
    Object.keys(autoApproveSettingsConfig).forEach((key) => {
      onToggleChange(key as AutoApproveSetting, false)
    })
  }, [onToggleChange])

  // Handle master toggle
  const handleMasterToggle = useCallback(() => {
    onAutoApprovalEnabledChange(!autoApprovalEnabled)
  }, [autoApprovalEnabled, onAutoApprovalEnabledChange])

  // Tooltip text
  const tooltipText = useMemo(() => {
    if (!effectivelyEnabled || enabledCount === 0) {
      return 'Manage auto-approval settings'
    }

    const enabledSettings = Object.entries(toggles)
      .filter(([_, value]) => value)
      .map(([key]) => autoApproveSettingsConfig[key as AutoApproveSetting].label)
      .join(', ')

    return `Auto-approving: ${enabledSettings}`
  }, [effectivelyEnabled, enabledCount, toggles])

  // Settings array for rendering
  const settingsArray = useMemo(
    () => Object.values(autoApproveSettingsConfig),
    []
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip content={tooltipText}>
        <PopoverTrigger disabled={disabled} className={triggerClassName}>
          <div className="auto-approve-trigger">
            {!effectivelyEnabled ? (
              <X className="auto-approve-icon" />
            ) : (
              <CheckCheck className="auto-approve-icon" />
            )}
            <span className="auto-approve-label">
              {!effectivelyEnabled
                ? 'Off'
                : enabledCount === totalCount
                ? 'All'
                : enabledCount}
            </span>
          </div>
        </PopoverTrigger>
      </Tooltip>

      <PopoverContent
        className="auto-approve-content"
        onOpenAutoFocus={(e: Event) => e.preventDefault()}
      >
        <div className="auto-approve-container">
          {/* Header */}
          <div className="auto-approve-header">
            <div className="auto-approve-header-top">
              <h4 className="auto-approve-title">Auto-Approval</h4>
              <Settings
                className="auto-approve-settings-icon"
                onClick={() => {
                  // TODO: Open settings panel
                  console.log('Open settings')
                }}
              />
            </div>
            <p className="auto-approve-description">
              Automatically approve specific actions without asking for permission
            </p>
          </div>

          {/* Toggle Grid */}
          <div className="auto-approve-grid">
            {settingsArray.map(({ key, label, description, icon }) => {
              const isEnabled = toggles[key]
              return (
                <Tooltip key={key} content={description}>
                  <button
                    onClick={() => handleToggleChange(key, !isEnabled)}
                    className={`auto-approve-toggle-button ${
                      isEnabled ? 'enabled' : 'disabled'
                    } ${!effectivelyEnabled ? 'master-disabled' : ''}`}
                    disabled={!effectivelyEnabled}
                  >
                    <span className={`codicon codicon-${icon}`} />
                    <span className="auto-approve-toggle-label">{label}</span>
                  </button>
                </Tooltip>
              )
            })}
          </div>

          {/* Footer with Select All/None and Master Toggle */}
          <div className="auto-approve-footer">
            <div className="auto-approve-footer-buttons">
              <button
                onClick={handleSelectAll}
                disabled={!effectivelyEnabled}
                className="auto-approve-footer-button"
                aria-label="Select all"
              >
                <ListChecks className="auto-approve-footer-icon" />
                <span>All</span>
              </button>
              <button
                onClick={handleSelectNone}
                disabled={!effectivelyEnabled}
                className="auto-approve-footer-button"
                aria-label="Select none"
              >
                <X className="auto-approve-footer-icon" />
                <span>None</span>
              </button>
            </div>

            <label
              className="auto-approve-master-toggle"
              onClick={(e) => {
                // Prevent label click when clicking on the toggle itself
                if ((e.target as HTMLElement).closest('[role="switch"]')) {
                  e.preventDefault()
                  return
                }
                handleMasterToggle()
              }}
            >
              <ToggleSwitch
                checked={effectivelyEnabled}
                onChange={handleMasterToggle}
                aria-label="Toggle auto-approval"
              />
              <span className="auto-approve-master-label">Enabled</span>
            </label>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
