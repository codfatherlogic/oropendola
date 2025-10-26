/**
 * Mention Autocomplete Hook
 * Handles mention detection and autocomplete suggestions
 */

import { useState, useEffect, useCallback, useRef } from 'react'

export interface MentionSuggestion {
	label: string
	value: string
	type: 'file' | 'folder' | 'special'
	icon?: string
	description?: string
	score?: number
}

export interface UseMentionAutocompleteOptions {
	onSelect?: (suggestion: MentionSuggestion) => void
	maxSuggestions?: number
	debounceMs?: number
}

export function useMentionAutocomplete(
	text: string,
	cursorPosition: number,
	options: UseMentionAutocompleteOptions = {}
) {
	const {
		onSelect,
		maxSuggestions = 10,
		debounceMs = 150
	} = options

	const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([])
	const [isActive, setIsActive] = useState(false)
	const [selectedIndex, setSelectedIndex] = useState(0)
	const [mentionQuery, setMentionQuery] = useState<string | null>(null)
	const debounceTimerRef = useRef<NodeJS.Timeout>()

	/**
	 * Check if cursor is in mention context
	 */
	const checkMentionTrigger = useCallback(() => {
		if (cursorPosition === 0) {
			setIsActive(false)
			setMentionQuery(null)
			return
		}

		const textBeforeCursor = text.slice(0, cursorPosition)
		const lastAtIndex = textBeforeCursor.lastIndexOf('@')

		if (lastAtIndex === -1) {
			setIsActive(false)
			setMentionQuery(null)
			return
		}

		// Check if there's whitespace or start of text before @
		const isValidTrigger = 
			lastAtIndex === 0 || /\s/.test(textBeforeCursor[lastAtIndex - 1])

		if (!isValidTrigger) {
			setIsActive(false)
			setMentionQuery(null)
			return
		}

		// Extract query after @
		const query = textBeforeCursor.slice(lastAtIndex + 1)
		
		// Check if there's a space after @ (which would close the mention)
		if (query.includes(' ') && !query.endsWith('\\ ')) {
			setIsActive(false)
			setMentionQuery(null)
			return
		}

		setIsActive(true)
		setMentionQuery(query)
	}, [text, cursorPosition])

	/**
	 * Fetch suggestions based on query
	 */
	const fetchSuggestions = useCallback(async (query: string) => {
		if (!query) {
			// Show special mentions and recent files
			setSuggestions([
				{ label: '@problems', value: 'problems', type: 'special', icon: '⚠️', description: 'VS Code diagnostics' },
				{ label: '@terminal', value: 'terminal', type: 'special', icon: '📟', description: 'Terminal output' },
				{ label: '@git', value: 'git', type: 'special', icon: '🔀', description: 'Git commit history' }
			])
			return
		}

		// Detect mention type
		const lowerQuery = query.toLowerCase()
		
		if (lowerQuery.startsWith('problem') || lowerQuery.startsWith('terminal') || lowerQuery.startsWith('git')) {
			// Special mentions
			const specials: MentionSuggestion[] = [
				{ label: '@problems', value: 'problems', type: 'special' as const, icon: '⚠️', description: 'VS Code diagnostics' },
				{ label: '@terminal', value: 'terminal', type: 'special' as const, icon: '📟', description: 'Terminal output' },
				{ label: '@git', value: 'git', type: 'special' as const, icon: '🔀', description: 'Git commit history' }
			].filter(s => s.label.toLowerCase().includes(lowerQuery))
			
			setSuggestions(specials)
			return
		}

		// File/folder search via VS Code API
		try {
			// @ts-ignore - vscodeApi is injected by VS Code webview
			window.vscodeApi?.postMessage({
				type: 'searchFiles',
				query,
				maxResults: maxSuggestions
			})

			// Response will be handled by message listener
		} catch (error) {
			console.error('Failed to fetch file suggestions:', error)
			setSuggestions([])
		}
	}, [maxSuggestions])

	/**
	 * Handle debounced query changes
	 */
	useEffect(() => {
		if (!isActive || mentionQuery === null) {
			setSuggestions([])
			return
		}

		// Clear previous timer
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current)
		}

		// Set new timer
		debounceTimerRef.current = setTimeout(() => {
			fetchSuggestions(mentionQuery)
		}, debounceMs)

		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current)
			}
		}
	}, [isActive, mentionQuery, fetchSuggestions, debounceMs])

	/**
	 * Check for mention trigger on text/cursor changes
	 */
	useEffect(() => {
		checkMentionTrigger()
	}, [checkMentionTrigger])

	/**
	 * Listen for file search results from extension
	 */
	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			const message = event.data
			
			if (message.type === 'fileSearchResults') {
				const fileSuggestions: MentionSuggestion[] = message.results.map((file: any) => ({
					label: `@${file.relativePath}`,
					value: file.relativePath,
					type: file.type,
					icon: file.icon || (file.type === 'folder' ? '📁' : '📄'),
					description: file.path,
					score: file.score
				}))
				
				setSuggestions(fileSuggestions)
			}
		}

		window.addEventListener('message', handleMessage)
		return () => window.removeEventListener('message', handleMessage)
	}, [])

	/**
	 * Keyboard navigation
	 */
	const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
		if (!isActive || suggestions.length === 0) {
			return false
		}

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault()
				setSelectedIndex(prev => (prev + 1) % suggestions.length)
				return true

			case 'ArrowUp':
				event.preventDefault()
				setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length)
				return true

			case 'Enter':
			case 'Tab':
				event.preventDefault()
				if (suggestions[selectedIndex]) {
					onSelect?.(suggestions[selectedIndex])
				}
				setIsActive(false)
				return true

			case 'Escape':
				event.preventDefault()
				setIsActive(false)
				setSuggestions([])
				return true

			default:
				return false
		}
	}, [isActive, suggestions, selectedIndex, onSelect])

	/**
	 * Select suggestion by index
	 */
	const selectSuggestion = useCallback((index: number) => {
		if (suggestions[index]) {
			onSelect?.(suggestions[index])
			setIsActive(false)
		}
	}, [suggestions, onSelect])

	return {
		isActive,
		suggestions,
		selectedIndex,
		mentionQuery,
		handleKeyDown,
		selectSuggestion,
		setSelectedIndex
	}
}
