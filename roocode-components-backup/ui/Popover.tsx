/**
 * Popover Component
 *
 * A floating panel that appears relative to a trigger element.
 * Used for dropdowns, menus, and contextual information.
 */

import React, { useRef, useEffect, useState, createContext, useContext } from 'react'
import './Popover.css'

interface PopoverContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const PopoverContext = createContext<PopoverContextValue | undefined>(undefined)

interface PopoverProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

export const Popover: React.FC<PopoverProps> = ({
  open: controlledOpen,
  onOpenChange,
  children,
}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)

  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen
  const setOpen = (newOpen: boolean) => {
    if (controlledOpen === undefined) {
      setUncontrolledOpen(newOpen)
    }
    onOpenChange?.(newOpen)
  }

  return (
    <PopoverContext.Provider value={{ open, setOpen }}>
      <div className="popover-root">{children}</div>
    </PopoverContext.Provider>
  )
}

interface PopoverTriggerProps {
  children: React.ReactNode
  disabled?: boolean
  className?: string
}

export const PopoverTrigger: React.FC<PopoverTriggerProps> = ({
  children,
  disabled,
  className = '',
}) => {
  const context = useContext(PopoverContext)
  if (!context) throw new Error('PopoverTrigger must be used within Popover')

  const handleClick = () => {
    if (!disabled) {
      context.setOpen(!context.open)
    }
  }

  return (
    <button
      type="button"
      className={`popover-trigger ${className}`}
      onClick={handleClick}
      disabled={disabled}
      aria-expanded={context.open}
    >
      {children}
    </button>
  )
}

interface PopoverContentProps {
  children: React.ReactNode
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
  className?: string
  onOpenAutoFocus?: (e: Event) => void
}

export const PopoverContent: React.FC<PopoverContentProps> = ({
  children,
  align = 'start',
  sideOffset = 4,
  className = '',
  onOpenAutoFocus,
}) => {
  const context = useContext(PopoverContext)
  if (!context) throw new Error('PopoverContent must be used within Popover')

  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!context.open) return

    const handleClickOutside = (e: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(e.target as Node)) {
        // Check if click is on trigger
        const trigger = contentRef.current.previousElementSibling
        if (trigger && trigger.contains(e.target as Node)) return

        context.setOpen(false)
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        context.setOpen(false)
      }
    }

    // Prevent auto-focus if specified
    if (onOpenAutoFocus) {
      const event = new Event('openAutoFocus')
      onOpenAutoFocus(event)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [context.open, context.setOpen, onOpenAutoFocus])

  if (!context.open) return null

  return (
    <div
      ref={contentRef}
      className={`popover-content popover-content-${align} ${className}`}
      style={{ marginTop: `${sideOffset}px` }}
    >
      {children}
    </div>
  )
}
