/**
 * @Mentions System - Core Types
 * Sprint 5-6: Tier 1 Implementation
 */

export enum MentionType {
	FILE = 'file',
	FOLDER = 'folder',
	PROBLEMS = 'problems',
	TERMINAL = 'terminal',
	GIT = 'git',
	URL = 'url'
}

export interface MentionMatch {
	type: MentionType
	raw: string // Original text including @ symbol
	value: string // Parsed value (path, URL, etc.)
	startIndex: number
	endIndex: number
}

export interface FileSearchResult {
	path: string
	relativePath: string
	type: 'file' | 'folder'
	icon?: string
	score?: number // For fuzzy search ranking
}

export interface MentionContext {
	type: MentionType
	content: string
	metadata?: Record<string, any>
}

export interface AutocompleteItem {
	label: string
	value: string
	type: MentionType
	icon?: string
	description?: string
	score?: number
}

export interface MentionParserOptions {
	enableFiles?: boolean
	enableFolders?: boolean
	enableProblems?: boolean
	enableTerminal?: boolean
	enableGit?: boolean
	enableUrls?: boolean
	maxResults?: number
}

export const DEFAULT_MENTION_OPTIONS: MentionParserOptions = {
	enableFiles: true,
	enableFolders: true,
	enableProblems: true,
	enableTerminal: true,
	enableGit: true,
	enableUrls: true,
	maxResults: 50
}
