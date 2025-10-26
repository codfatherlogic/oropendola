/**
 * @Mentions System - Core Parser
 * Extracts mentions from text using regex patterns
 */

import { MentionType, MentionMatch, MentionParserOptions, DEFAULT_MENTION_OPTIONS } from './types'
import { MENTION_PATTERNS, unescapeSpaces } from './mention-regex'

export class MentionParser {
	private options: MentionParserOptions

	// Pre-compile regex patterns for better performance
	private static readonly FILE_REGEX = new RegExp(MENTION_PATTERNS.file)
	private static readonly FOLDER_REGEX = new RegExp(MENTION_PATTERNS.folder)
	private static readonly PROBLEMS_REGEX = new RegExp(MENTION_PATTERNS.problems)
	private static readonly TERMINAL_REGEX = new RegExp(MENTION_PATTERNS.terminal)
	private static readonly GIT_REGEX = new RegExp(MENTION_PATTERNS.git)
	private static readonly URL_REGEX = new RegExp(MENTION_PATTERNS.url)

	constructor(options: Partial<MentionParserOptions> = {}) {
		this.options = { ...DEFAULT_MENTION_OPTIONS, ...options }
	}

	/**
	 * Parse all mentions from text
	 */
	public parseMentions(text: string): MentionMatch[] {
		const mentions: MentionMatch[] = []

		// Parse each mention type
		if (this.options.enableFiles) {
			mentions.push(...this.parseFileMentions(text))
		}

		if (this.options.enableFolders) {
			mentions.push(...this.parseFolderMentions(text))
		}

		if (this.options.enableProblems) {
			mentions.push(...this.parseProblemsMentions(text))
		}

		if (this.options.enableTerminal) {
			mentions.push(...this.parseTerminalMentions(text))
		}

		if (this.options.enableGit) {
			mentions.push(...this.parseGitMentions(text))
		}

		if (this.options.enableUrls) {
			mentions.push(...this.parseUrlMentions(text))
		}

		// Sort by startIndex
		return mentions.sort((a, b) => a.startIndex - b.startIndex)
	}

	/**
	 * Parse @file mentions
	 */
	private parseFileMentions(text: string): MentionMatch[] {
		const matches: MentionMatch[] = []
		const regex = MentionParser.FILE_REGEX
		let match: RegExpExecArray | null

		while ((match = regex.exec(text)) !== null) {
			const raw = match[0]
			// Don't match if it's actually a folder (ends with /)
			if (!raw.endsWith('/')) {
				matches.push({
					type: MentionType.FILE,
					raw,
					value: unescapeSpaces(raw.slice(1)), // Remove @ and unescape
					startIndex: match.index,
					endIndex: match.index + raw.length
				})
			}
		}

		return matches
	}

	/**
	 * Parse @folder mentions
	 */
	private parseFolderMentions(text: string): MentionMatch[] {
		const matches: MentionMatch[] = []
		const regex = MentionParser.FOLDER_REGEX
		let match: RegExpExecArray | null

		while ((match = regex.exec(text)) !== null) {
			const raw = match[0]
			matches.push({
				type: MentionType.FOLDER,
				raw,
				value: unescapeSpaces(raw.slice(1)), // Remove @ and unescape
				startIndex: match.index,
				endIndex: match.index + raw.length
			})
		}

		return matches
	}

	/**
	 * Parse @problems mentions
	 */
	private parseProblemsMentions(text: string): MentionMatch[] {
		const matches: MentionMatch[] = []
		const regex = MentionParser.PROBLEMS_REGEX
		let match: RegExpExecArray | null

		while ((match = regex.exec(text)) !== null) {
			const raw = match[0]
			matches.push({
				type: MentionType.PROBLEMS,
				raw,
				value: 'problems',
				startIndex: match.index,
				endIndex: match.index + raw.length
			})
		}

		return matches
	}

	/**
	 * Parse @terminal mentions
	 */
	private parseTerminalMentions(text: string): MentionMatch[] {
		const matches: MentionMatch[] = []
		const regex = MentionParser.TERMINAL_REGEX
		let match: RegExpExecArray | null

		while ((match = regex.exec(text)) !== null) {
			const raw = match[0]
			const terminalId = match[1] || 'current' // Default to current terminal
			matches.push({
				type: MentionType.TERMINAL,
				raw,
				value: terminalId,
				startIndex: match.index,
				endIndex: match.index + raw.length
			})
		}

		return matches
	}

	/**
	 * Parse @git mentions
	 */
	private parseGitMentions(text: string): MentionMatch[] {
		const matches: MentionMatch[] = []
		const regex = MentionParser.GIT_REGEX
		let match: RegExpExecArray | null

		while ((match = regex.exec(text)) !== null) {
			const raw = match[0]
			const branch = match[1] || 'HEAD' // Default to HEAD
			matches.push({
				type: MentionType.GIT,
				raw,
				value: branch,
				startIndex: match.index,
				endIndex: match.index + raw.length
			})
		}

		return matches
	}

	/**
	 * Parse @url mentions
	 */
	private parseUrlMentions(text: string): MentionMatch[] {
		const matches: MentionMatch[] = []
		const regex = MentionParser.URL_REGEX
		let match: RegExpExecArray | null

		while ((match = regex.exec(text)) !== null) {
			const raw = match[0]
			const url = match[1] // URL without @ prefix
			matches.push({
				type: MentionType.URL,
				raw,
				value: url,
				startIndex: match.index,
				endIndex: match.index + raw.length
			})
		}

		return matches
	}

	/**
	 * Check if text contains any mentions
	 */
	public hasMentions(text: string): boolean {
		return this.parseMentions(text).length > 0
	}

	/**
	 * Replace mentions in text with custom formatter
	 */
	public replaceMentions(
		text: string,
		formatter: (mention: MentionMatch) => string
	): string {
		const mentions = this.parseMentions(text)
		let result = text
		let offset = 0

		for (const mention of mentions) {
			const replacement = formatter(mention)
			const before = result.slice(0, mention.startIndex + offset)
			const after = result.slice(mention.endIndex + offset)
			result = before + replacement + after
			offset += replacement.length - mention.raw.length
		}

		return result
	}
}

// Export singleton instance
export const mentionParser = new MentionParser()
