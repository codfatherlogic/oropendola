/**
 * @Mentions System - Main Export
 */

export * from './types'
export * from './mention-regex'
export * from './MentionParser'
export { fileSearchService } from '../../services/FileSearchService'
export { diagnosticsService } from '../../services/DiagnosticsService'
export { terminalService } from '../../services/TerminalService'
export { gitService } from '../../services/GitService'
export { mentionExtractor } from '../../services/MentionExtractor'

// Re-export main parser instance
import { mentionParser } from './MentionParser'
export { mentionParser }

/**
 * Convenience function to parse and extract context from text
 */
export async function processMentions(text: string) {
	const { mentionParser } = await import('./MentionParser')
	const { mentionExtractor } = await import('../../services/MentionExtractor')
	
	const mentions = mentionParser.parseMentions(text)
	const contexts = await mentionExtractor.extractContext(mentions)
	
	return { mentions, contexts }
}
