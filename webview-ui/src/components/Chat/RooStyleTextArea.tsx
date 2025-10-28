/**
 * RooStyleTextArea - Roo-Code visual styling adapted for Oropendola
 *
 * This component provides the exact visual appearance of Roo-Code's ChatTextArea
 * while integrating with Oropendola's existing backend architecture.
 */

import React, { forwardRef, useCallback, useState, useMemo, useRef } from 'react'
import DynamicTextArea from 'react-textarea-autosize'
import { Image, Sparkles, Send } from 'lucide-react'
import { Tooltip } from '../ui'
import vscode from '../../vscode-api'

interface RooStyleTextAreaProps {
  inputValue: string
  setInputValue: (value: string) => void
  placeholderText: string
  selectedImages: string[]
  setSelectedImages: React.Dispatch<React.SetStateAction<string[]>>
  onSend: () => void
  onSelectImages: () => void
  shouldDisableImages: boolean
  onHeightChange?: (height: number) => void
  mode: string
  setMode: (value: string) => void
  // Authentication
  isAuthenticated?: boolean
  authMessage?: string | null
  // Auto-approval props (simplified for Roo Code style)
  autoApprovalEnabled: boolean
  onAutoApprovalEnabledChange: (enabled: boolean) => void
  // Unused but kept for compatibility
  autoApproveToggles?: any
  onAutoApproveToggleChange?: any
}

export const RooStyleTextArea = forwardRef<HTMLTextAreaElement, RooStyleTextAreaProps>(
  (
    {
      inputValue,
      setInputValue,
      placeholderText,
      selectedImages,
      setSelectedImages: _setSelectedImages,
      onSend,
      onSelectImages,
      shouldDisableImages,
      onHeightChange,
      mode,
      setMode,
      isAuthenticated = true,
      authMessage = null,
      autoApprovalEnabled,
      onAutoApprovalEnabledChange,
    },
    ref
  ) => {
    const [isDraggingOver, setIsDraggingOver] = useState(false)
    const [isFocused, setIsFocused] = useState(false)
    const textAreaRef = useRef<HTMLTextAreaElement | null>(null)

    // If not authenticated, show Sign In button instead of textarea
    console.log('🔐 [RooStyleTextArea] isAuthenticated:', isAuthenticated, 'authMessage:', authMessage)
    if (!isAuthenticated) {
      console.log('🔐 [RooStyleTextArea] Rendering Sign In button')
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
          padding: "24px 16px",
          backgroundColor: "var(--vscode-input-background)",
          borderRadius: "8px",
          border: "1px solid var(--vscode-input-border)",
          margin: "0 8px 8px 8px",
        }}>
          <div style={{
            fontSize: "14px",
            color: "var(--vscode-descriptionForeground)",
            textAlign: "center"
          }}>
            {authMessage || 'Start by signing in'}
          </div>
          <button
            onClick={() => {
              vscode.postMessage({ type: 'login' });
            }}
            style={{
              backgroundColor: 'var(--vscode-button-secondaryBackground)',
              color: 'var(--vscode-button-secondaryForeground)',
              border: '1px solid var(--vscode-button-border)',
              borderRadius: '2px',
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: 'normal',
              cursor: 'pointer',
              transition: 'background-color 0.1s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--vscode-button-secondaryHoverBackground)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--vscode-button-secondaryBackground)';
            }}
          >
            Sign in
          </button>
        </div>
      )
    }

    // Memoized check for whether the input has content
    const hasInputContent = useMemo(() => {
      return inputValue.trim().length > 0 || selectedImages.length > 0
    }, [inputValue, selectedImages])

    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault()
          onSend()
        }
      },
      [onSend]
    )

    // Available modes - Ask and Agent
    const availableModes = [
      { value: 'agent', label: 'Agent', description: 'AI agent mode' },
      { value: 'ask', label: 'Ask', description: 'Ask questions' },
    ]

    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        outline: "none",
        border: "none",
        boxSizing: "border-box",
        position: "relative",
        paddingLeft: "6px",
        paddingRight: "6px",
        paddingBottom: "4px",
        width: "calc(100% - 16px)",
        marginLeft: "auto",
        marginRight: "auto",
      }}>
        <div style={{ position: "relative" }}>
          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              outline: "none",
            }}
            className="chat-text-area"
            onDragOver={(e) => {
              if (!e.shiftKey) {
                setIsDraggingOver(false)
                return
              }
              e.preventDefault()
              setIsDraggingOver(true)
              e.dataTransfer.dropEffect = 'copy'
            }}
            onDragLeave={(e) => {
              e.preventDefault()
              const rect = e.currentTarget.getBoundingClientRect()
              if (
                e.clientX <= rect.left ||
                e.clientX >= rect.right ||
                e.clientY <= rect.top ||
                e.clientY >= rect.bottom
              ) {
                setIsDraggingOver(false)
              }
            }}>

            <div style={{
              position: "relative",
              flex: "1",
              display: "flex",
              flexDirection: "column-reverse",
              minHeight: "0",
              overflow: "hidden",
              borderRadius: "4px",
            }}>
              <DynamicTextArea
                ref={(el) => {
                  if (typeof ref === 'function') {
                    ref(el)
                  } else if (ref) {
                    ref.current = el
                  }
                  textAreaRef.current = el
                }}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onKeyDown={handleKeyDown}
                onBlur={() => setIsFocused(false)}
                onHeightChange={onHeightChange}
                placeholder={placeholderText}
                minRows={5}
                maxRows={15}
                autoFocus={true}
                style={
                  {
                    width: "100%",
                    color: "var(--vscode-input-foreground)",
                    backgroundColor: isDraggingOver
                      ? "color-mix(in srgb, var(--vscode-input-background) 95%, var(--vscode-focusBorder))"
                      : "var(--vscode-input-background)",
                    fontFamily: "var(--vscode-font-family)",
                    fontSize: "var(--vscode-editor-font-size)",
                    lineHeight: "var(--vscode-editor-line-height)",
                    cursor: "text",
                    padding: "8px 36px 8px 8px",
                    border: isFocused
                      ? "1px solid var(--vscode-focusBorder)"
                      : isDraggingOver
                        ? "2px dashed var(--vscode-focusBorder)"
                        : "1px solid transparent",
                    outline: isFocused ? "1px solid var(--vscode-focusBorder)" : "none",
                    transition: "background-color 150ms ease-in-out",
                    boxSizing: "border-box",
                    borderRadius: "4px",
                    resize: "none" as const,
                    overflowX: "hidden" as const,
                    overflowY: "auto" as const,
                  } as any
                }
                className="focus:outline-none"
              />

              {/* Action buttons - right side of textarea */}
              <div style={{
                position: "absolute",
                bottom: "8px",
                right: "4px",
                zIndex: 30,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0",
              }}>
                <Tooltip content="Add images">
                  <button
                    aria-label="Add images"
                    disabled={shouldDisableImages}
                    onClick={!shouldDisableImages ? onSelectImages : undefined}
                    style={{
                      position: "relative",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "transparent",
                      border: "none",
                      padding: "6px",
                      borderRadius: "6px",
                      minWidth: "28px",
                      minHeight: "28px",
                      color: "var(--vscode-descriptionForeground)",
                      transition: "all 1000ms",
                      cursor: "pointer",
                      opacity: !shouldDisableImages ? "0.5" : "0",
                      pointerEvents: !shouldDisableImages ? "auto" : "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!shouldDisableImages) {
                        e.currentTarget.style.opacity = "1";
                        e.currentTarget.style.color = "var(--vscode-foreground)";
                        e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!shouldDisableImages) {
                        e.currentTarget.style.opacity = "0.5";
                        e.currentTarget.style.color = "var(--vscode-descriptionForeground)";
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                    onMouseDown={(e) => {
                      if (!shouldDisableImages) {
                        e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)";
                      }
                    }}
                    onMouseUp={(e) => {
                      if (!shouldDisableImages) {
                        e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)";
                      }
                    }}
                  >
                    <Image style={{ width: "16px", height: "16px" }} />
                  </button>
                </Tooltip>

                <Tooltip content="Enhance prompt">
                  <button
                    aria-label="Enhance prompt"
                    disabled={false}
                    onClick={() => {}}  // TODO: Implement enhance prompt
                    style={{
                      position: "relative",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "transparent",
                      border: "none",
                      padding: "6px",
                      borderRadius: "6px",
                      minWidth: "28px",
                      minHeight: "28px",
                      color: "var(--vscode-descriptionForeground)",
                      transition: "all 1000ms",
                      cursor: "pointer",
                      opacity: hasInputContent ? "0.5" : "0",
                      pointerEvents: hasInputContent ? "auto" : "none",
                    }}
                    onMouseEnter={(e) => {
                      if (hasInputContent) {
                        e.currentTarget.style.opacity = "1";
                        e.currentTarget.style.color = "var(--vscode-foreground)";
                        e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (hasInputContent) {
                        e.currentTarget.style.opacity = "0.5";
                        e.currentTarget.style.color = "var(--vscode-descriptionForeground)";
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                    onMouseDown={(e) => {
                      if (hasInputContent) {
                        e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)";
                      }
                    }}
                    onMouseUp={(e) => {
                      if (hasInputContent) {
                        e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)";
                      }
                    }}
                  >
                    <Sparkles style={{ width: "16px", height: "16px" }} />
                  </button>
                </Tooltip>

                <Tooltip content="Send message">
                  <button
                    aria-label="Send message"
                    disabled={false}
                    onClick={onSend}
                    style={{
                      position: "relative",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "transparent",
                      border: "none",
                      padding: "6px",
                      borderRadius: "6px",
                      minWidth: "28px",
                      minHeight: "28px",
                      color: "var(--vscode-descriptionForeground)",
                      transition: "all 200ms",
                      cursor: hasInputContent ? "pointer" : "default",
                      opacity: hasInputContent ? "1" : "0",
                      pointerEvents: hasInputContent ? "auto" : "none",
                    }}
                    onMouseEnter={(e) => {
                      if (hasInputContent) {
                        e.currentTarget.style.color = "var(--vscode-foreground)";
                        e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (hasInputContent) {
                        e.currentTarget.style.color = "var(--vscode-descriptionForeground)";
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                    onMouseDown={(e) => {
                      if (hasInputContent) {
                        e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)";
                      }
                    }}
                    onMouseUp={(e) => {
                      if (hasInputContent) {
                        e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)";
                      }
                    }}
                  >
                    <Send style={{ width: "16px", height: "16px" }} />
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>

        {/* Helper text - Roo Code style */}
        <div style={{
          fontSize: "11px",
          color: "var(--vscode-descriptionForeground)",
          padding: "0 4px",
        }}>
          @ to add context, / for commands, hold shift to drag in files/images
        </div>

        {/* Bottom controls bar - Roo Code pattern: Mode pills and settings */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "0 4px",
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flex: "1",
          }}>
            {/* Mode selector as pill badge */}
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "4px",
                background: "var(--vscode-badge-background)",
                color: "var(--vscode-badge-foreground)",
                border: "none",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.8";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
              title="Select mode">
              {availableModes.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            {/* Auto-approve status - simple badge like Roo Code */}
            <button
              onClick={() => onAutoApprovalEnabledChange(!autoApprovalEnabled)}
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "4px",
                background: "var(--vscode-badge-background)",
                color: "var(--vscode-badge-foreground)",
                border: "none",
                outline: "none",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.8";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
              title="Toggle auto-approval">
              {autoApprovalEnabled ? '✓ Auto-approve on' : '✕ Auto-approve off'}
            </button>
          </div>
        </div>
      </div>
    )
  }
)

RooStyleTextArea.displayName = 'RooStyleTextArea'
