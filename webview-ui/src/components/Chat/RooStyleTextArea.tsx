/**
 * RooStyleTextArea - Roo-Code visual styling adapted for Oropendola
 *
 * This component provides the exact visual appearance of Roo-Code's ChatTextArea
 * while integrating with Oropendola's existing backend architecture.
 */

import React, { forwardRef, useCallback, useState, useMemo, useRef } from 'react'
import DynamicTextArea from 'react-textarea-autosize'
import { Image, Sparkles, Send } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Tooltip } from '../ui'
import { AutoApproveDropdown } from '../AutoApprove/AutoApproveDropdown'
import { AutoApproveToggles, AutoApproveSetting } from '../../types/auto-approve'

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
  // Auto-approval props
  autoApprovalEnabled: boolean
  autoApproveToggles: AutoApproveToggles
  onAutoApprovalEnabledChange: (enabled: boolean) => void
  onAutoApproveToggleChange: (key: AutoApproveSetting, value: boolean) => void
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
      autoApprovalEnabled,
      autoApproveToggles,
      onAutoApprovalEnabledChange,
      onAutoApproveToggleChange,
    },
    ref
  ) => {
    const [isDraggingOver, setIsDraggingOver] = useState(false)
    const [isFocused, setIsFocused] = useState(false)
    const textAreaRef = useRef<HTMLTextAreaElement | null>(null)

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

    const placeholderBottomText = `\n(Add context with @, drag files/images)`

    // Available modes (simplified for Oropendola)
    const availableModes = [
      { value: 'architect', label: 'Architect', description: 'Plan and build autonomously' },
      { value: 'code', label: 'Code', description: 'Code editing mode' },
      { value: 'ask', label: 'Ask', description: 'Ask questions' },
    ]

    return (
      <div className={cn(
        "flex flex-col gap-1 bg-editor-background outline-none border border-none box-border",
        "relative px-1.5 pb-1 w-[calc(100%-16px)] ml-auto mr-auto"
      )}>
        <div className={cn("relative")}>
          <div
            className={cn("chat-text-area", "relative", "flex", "flex-col", "outline-none")}
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

            <div className={cn(
              "relative",
              "flex-1",
              "flex",
              "flex-col-reverse",
              "min-h-0",
              "overflow-hidden",
              "rounded",
            )}>
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
                minRows={3}
                maxRows={15}
                autoFocus={true}
                className={cn(
                  "w-full",
                  "text-vscode-input-foreground",
                  "font-vscode-font-family",
                  "text-vscode-editor-font-size",
                  "leading-vscode-editor-line-height",
                  "cursor-text",
                  "py-2 pl-2",
                  isFocused
                    ? "border border-vscode-focusBorder outline outline-vscode-focusBorder"
                    : isDraggingOver
                      ? "border-2 border-dashed border-vscode-focusBorder"
                      : "border border-transparent",
                  isDraggingOver
                    ? "bg-[color-mix(in_srgb,var(--vscode-input-background)_95%,var(--vscode-focusBorder))]"
                    : "bg-vscode-input-background",
                  "transition-background-color duration-150 ease-in-out",
                  "min-h-[94px]",
                  "box-border",
                  "rounded",
                  "resize-none",
                  "overflow-x-hidden",
                  "overflow-y-auto",
                  "pr-9",
                  "flex-none flex-grow",
                  "z-[2]",
                )}
              />

              {/* Action buttons - right side of textarea */}
              <div className="absolute bottom-2 right-1 z-30 flex flex-col items-center gap-0">
                <Tooltip content="Add images">
                  <button
                    aria-label="Add images"
                    disabled={shouldDisableImages}
                    onClick={!shouldDisableImages ? onSelectImages : undefined}
                    className={cn(
                      "relative inline-flex items-center justify-center",
                      "bg-transparent border-none p-1.5",
                      "rounded-md min-w-[28px] min-h-[28px]",
                      "text-vscode-descriptionForeground hover:text-vscode-foreground",
                      "transition-all duration-1000",
                      "cursor-pointer",
                      !shouldDisableImages
                        ? "opacity-50 hover:opacity-100 delay-750 pointer-events-auto"
                        : "opacity-0 pointer-events-none duration-200 delay-0",
                      !shouldDisableImages &&
                        "hover:bg-[rgba(255,255,255,0.03)] hover:border-[rgba(255,255,255,0.15)]",
                      "focus:outline-none focus-visible:ring-1 focus-visible:ring-vscode-focusBorder",
                      !shouldDisableImages && "active:bg-[rgba(255,255,255,0.1)]",
                    )}>
                    <Image className="w-4 h-4" />
                  </button>
                </Tooltip>

                <Tooltip content="Enhance prompt">
                  <button
                    aria-label="Enhance prompt"
                    disabled={false}
                    onClick={() => {}}  // TODO: Implement enhance prompt
                    className={cn(
                      "relative inline-flex items-center justify-center",
                      "bg-transparent border-none p-1.5",
                      "rounded-md min-w-[28px] min-h-[28px]",
                      "text-vscode-descriptionForeground hover:text-vscode-foreground",
                      "transition-all duration-1000",
                      "cursor-pointer",
                      hasInputContent
                        ? "opacity-50 hover:opacity-100 delay-750 pointer-events-auto"
                        : "opacity-0 pointer-events-none duration-200 delay-0",
                      hasInputContent &&
                        "hover:bg-[rgba(255,255,255,0.03)] hover:border-[rgba(255,255,255,0.15)]",
                      "focus:outline-none focus-visible:ring-1 focus-visible:ring-vscode-focusBorder",
                      hasInputContent && "active:bg-[rgba(255,255,255,0.1)]",
                    )}>
                    <Sparkles className="w-4 h-4" />
                  </button>
                </Tooltip>

                <Tooltip content="Send message">
                  <button
                    aria-label="Send message"
                    disabled={false}
                    onClick={onSend}
                    className={cn(
                      "relative inline-flex items-center justify-center",
                      "bg-transparent border-none p-1.5",
                      "rounded-md min-w-[28px] min-h-[28px]",
                      "text-vscode-descriptionForeground hover:text-vscode-foreground",
                      "transition-all duration-200",
                      hasInputContent
                        ? "opacity-100 hover:opacity-100 pointer-events-auto"
                        : "opacity-0 pointer-events-none",
                      hasInputContent &&
                        "hover:bg-[rgba(255,255,255,0.03)] hover:border-[rgba(255,255,255,0.15)]",
                      "focus:outline-none focus-visible:ring-1 focus-visible:ring-vscode-focusBorder",
                      hasInputContent && "active:bg-[rgba(255,255,255,0.1)]",
                      hasInputContent && "cursor-pointer",
                    )}>
                    <Send className="w-4 h-4" />
                  </button>
                </Tooltip>
              </div>

              {/* Bottom placeholder text */}
              {!inputValue && (
                <div
                  className={cn(
                    "absolute left-2 z-30 flex items-center h-8 font-vscode-font-family text-vscode-editor-font-size leading-vscode-editor-line-height",
                    "pr-9",
                  )}
                  style={{
                    bottom: "0.75rem",
                    color: "color-mix(in oklab, var(--vscode-input-foreground) 50%, transparent)",
                    userSelect: "none",
                    pointerEvents: "none",
                  }}>
                  {placeholderBottomText}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom controls bar - matching Roo-Code exactly */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 min-w-0 overflow-clip flex-1">
            {/* Mode selector */}
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className={cn(
                "text-ellipsis overflow-hidden flex-shrink-0",
                "bg-vscode-input-background",
                "text-vscode-input-foreground",
                "border border-vscode-input-border",
                "rounded px-2 py-1",
                "text-xs",
                "cursor-pointer",
                "hover:bg-vscode-list-hoverBackground",
              )}
              title="Select mode">
              {availableModes.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            {/* API Config selector (simplified) */}
            <select
              className={cn(
                "min-w-[28px] text-ellipsis overflow-hidden flex-shrink",
                "bg-vscode-input-background",
                "text-vscode-input-foreground",
                "border border-vscode-input-border",
                "rounded px-2 py-1",
                "text-xs",
                "cursor-pointer",
                "hover:bg-vscode-list-hoverBackground",
              )}
              title="Select API configuration">
              <option>Claude 3.5 Sonnet</option>
            </select>

            {/* Auto-approve dropdown */}
            <AutoApproveDropdown
              autoApprovalEnabled={autoApprovalEnabled}
              toggles={autoApproveToggles}
              onAutoApprovalEnabledChange={onAutoApprovalEnabledChange}
              onToggleChange={onAutoApproveToggleChange}
              triggerClassName="min-w-[28px] text-ellipsis overflow-hidden flex-shrink"
            />
          </div>
        </div>
      </div>
    )
  }
)

RooStyleTextArea.displayName = 'RooStyleTextArea'
