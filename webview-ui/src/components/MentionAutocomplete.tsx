/**
 * Mention Autocomplete Component
 * Displays autocomplete suggestions for @mentions
 */

import React, { useEffect, useRef } from 'react'
import './MentionAutocomplete.css'

export interface MentionSuggestion {
	label: string
	value: string
	type: 'file' | 'folder' | 'special'
	icon?: string
	description?: string
	score?: number
}

interface MentionAutocompleteProps {
	suggestions: MentionSuggestion[]
	selectedIndex: number
	position?: { top: number; left: number }
	onSelect: (suggestion: MentionSuggestion) => void
	onHover: (index: number) => void
}

export const MentionAutocomplete: React.FC<MentionAutocompleteProps> = ({
	suggestions,
	selectedIndex,
	position,
	onSelect,
	onHover
}) => {
	const listRef = useRef<HTMLDivElement>(null)
	const selectedItemRef = useRef<HTMLDivElement>(null)

	// Scroll selected item into view
	useEffect(() => {
		if (selectedItemRef.current) {
			selectedItemRef.current.scrollIntoView({
				block: 'nearest',
				behavior: 'smooth'
			})
		}
	}, [selectedIndex])

	if (suggestions.length === 0) {
		return null
	}

	return (
		<div
			ref={listRef}
			className="mention-autocomplete"
			style={position ? {
				top: `${position.top}px`,
				left: `${position.left}px`
			} : undefined}
		>
			<div className="mention-autocomplete-header">
				<span className="mention-autocomplete-title">Mentions</span>
				<span className="mention-autocomplete-hint">↑↓ navigate • Enter select • Esc close</span>
			</div>
			<div className="mention-autocomplete-list">
				{suggestions.map((suggestion, index) => (
					<div
						key={`${suggestion.type}-${suggestion.value}-${index}`}
						ref={index === selectedIndex ? selectedItemRef : null}
						className={`mention-autocomplete-item ${index === selectedIndex ? 'selected' : ''} ${suggestion.type}`}
						onClick={() => onSelect(suggestion)}
						onMouseEnter={() => onHover(index)}
					>
						<span className="mention-icon">{suggestion.icon || '📄'}</span>
						<div className="mention-content">
							<div className="mention-label">{suggestion.label}</div>
							{suggestion.description && (
								<div className="mention-description">{suggestion.description}</div>
							)}
						</div>
						{suggestion.type === 'file' && <span className="mention-type-badge">file</span>}
						{suggestion.type === 'folder' && <span className="mention-type-badge">folder</span>}
						{suggestion.type === 'special' && <span className="mention-type-badge">special</span>}
					</div>
				))}
			</div>
			{suggestions.length === 0 && (
				<div className="mention-autocomplete-empty">
					No matches found
				</div>
			)}
		</div>
	)
}
