import React from 'react'
import * as RadixTooltip from '@radix-ui/react-tooltip'

export interface TooltipProps {
  children: React.ReactNode
  content?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
}

export const Tooltip: React.FC<TooltipProps> = ({ children, content, side = 'top' }) => {
  if (!content) return <>{children}</>

  return (
    <RadixTooltip.Provider>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>
          {children}
        </RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content side={side} className="tooltip-content">
            {content}
            <RadixTooltip.Arrow className="tooltip-arrow" />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  )
}
