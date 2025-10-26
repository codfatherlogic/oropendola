/**
 * @Mentions System - Regex Patterns
 * Based on Roo-Code's mention detection system
 */

// Escaped space pattern (e.g., @/path/to/file\ with\ spaces.txt)
export const ESCAPED_SPACE = '\\\\ '

// Mention patterns
export const MENTION_PATTERNS = {
	// @file mentions: @/path/to/file.ts or @./relative/path.ts
	// Must have a file extension and NOT end with /
	file: /@(?:\.?\.?\/)?(?:[^\s@]|\\ )+\.[a-zA-Z0-9]+(?!\/)/g,
	
	// @folder mentions: @/path/to/folder/ or @./relative/folder/ or @/
	// Must end with / and be followed by whitespace or end of string
	folder: /@(?:\.?\.?\/)?(?:[^\s@]|\\ )*\/(?=\s|$)/g,
	
	// @problems - include VS Code diagnostics
	problems: /@problems\b/gi,
	
	// @terminal - include terminal output (without any following text)
	terminal: /@terminal(?:\s+(\d+))?(?=\s|$)/gi,
	
	// @git - git commit history (ref is optional, must be word boundary after @git)
	git: /@git\b(?:\s+([\w\/-]+))?(?=\s|$)/gi,
	
	// @url - URLs (http/https)
	url: /@(https?:\/\/[^\s]+)/gi
}

// Combined global pattern for detecting any mention
export const MENTION_REGEX_GLOBAL = /@(?:problems|terminal(?:\s+\d+)?|git(?:\s+[\w-]+)?|https?:\/\/[^\s]+|(?:\.?\.?\/)?(?:[^\s@]|\\ )+(?:\.[a-zA-Z0-9]+|\/))/gi

// Non-global version for single match
export const MENTION_REGEX = /@(?:problems|terminal(?:\s+\d+)?|git(?:\s+[\w-]+)?|https?:\/\/[^\s]+|(?:\.?\.?\/)?(?:[^\s@]|\\ )+(?:\.[a-zA-Z0-9]+|\/))/i

/**
 * Escape spaces in file paths for mention format
 * Example: "/path/to/file name.txt" -> "/path/to/file\ name.txt"
 */
export function escapeSpaces(path: string): string {
	return path.replace(/ /g, '\\ ')
}

/**
 * Unescape spaces from mention format back to normal path
 * Example: "/path/to/file\ name.txt" -> "/path/to/file name.txt"
 */
export function unescapeSpaces(mention: string): string {
	return mention.replace(/\\ /g, ' ')
}

/**
 * Check if text starts with @ symbol (potential mention trigger)
 */
export function isMentionTrigger(text: string, cursorPosition: number): boolean {
	if (cursorPosition === 0) return false
	
	const textBeforeCursor = text.slice(0, cursorPosition)
	const lastAtIndex = textBeforeCursor.lastIndexOf('@')
	
	if (lastAtIndex === -1) return false
	
	// Check if there's whitespace or start of text before @
	if (lastAtIndex === 0) return true
	
	const charBeforeAt = textBeforeCursor[lastAtIndex - 1]
	return /\s/.test(charBeforeAt)
}

/**
 * Get the mention query text after @ symbol
 */
export function getMentionQuery(text: string, cursorPosition: number): string | null {
	if (!isMentionTrigger(text, cursorPosition)) return null
	
	const textBeforeCursor = text.slice(0, cursorPosition)
	const lastAtIndex = textBeforeCursor.lastIndexOf('@')
	
	return textBeforeCursor.slice(lastAtIndex + 1)
}

/**
 * Determine mention type from query text
 */
export function detectMentionType(query: string): 'file' | 'folder' | 'special' | null {
	if (!query) return null
	
	// Special mentions (problems, terminal, git)
	if (/^(problems|terminal|git)/i.test(query)) {
		return 'special'
	}
	
	// Folder (ends with /)
	if (query.endsWith('/')) {
		return 'folder'
	}
	
	// File (has extension or path separators)
	if (/\.[a-zA-Z0-9]+$/.test(query) || query.includes('/')) {
		return 'file'
	}
	
	return 'file' // Default to file search
}
