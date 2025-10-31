/**
 * Mentions System Types
 *
 * @mentions for referencing files, folders, and other context in chat.
 */

export type MentionType = 'file' | 'folder' | 'problems' | 'terminal' | 'git' | 'url' | 'code'

export interface Mention {
  /** Type of mention */
  type: MentionType

  /** Display text */
  text: string

  /** Underlying value (file path, URL, etc.) */
  value: string

  /** Start position in input */
  start: number

  /** End position in input */
  end: number

  /** Additional metadata */
  metadata?: Record<string, any>
}

export interface MentionSuggestion {
  type: MentionType
  text: string
  value: string
  description?: string
  icon?: string
  score?: number
}

export interface MentionContext {
  /** Raw content */
  content: string

  /** Content type */
  contentType: 'text' | 'code' | 'json' | 'markdown'

  /** Language for code content */
  language?: string

  /** File path if applicable */
  path?: string

  /** Line numbers if applicable */
  lines?: { start: number; end: number }
}

export interface MentionParser {
  parse: (input: string) => Mention[]
  getSuggestions: (input: string, cursorPosition: number) => Promise<MentionSuggestion[]>
  resolveContext: (mention: Mention) => Promise<MentionContext>
}
