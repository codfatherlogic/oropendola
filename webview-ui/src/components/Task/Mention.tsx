/**
 * Mention Component
 * Renders text with @mentions highlighted
 * Simple version for Phase 1
 */

import React from 'react'

export interface MentionProps {
  text?: string
}

export const Mention: React.FC<MentionProps> = ({ text }) => {
  if (!text) return null

  // Simple rendering without mention parsing for now
  // TODO: Add @file, @folder, @url mention parsing in Phase 2
  return <span className="whitespace-pre-wrap break-words">{text}</span>
}

export default Mention
