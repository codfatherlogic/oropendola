/**
 * Mention Component
 * Renders text with @mention support
 * 
 * Phase 2: Enhanced with mention parsing and highlighting
 */

import React, { useMemo } from 'react'
import './Mention.css'

export interface MentionProps {
	text: string
}

interface ParsedSegment {
	type: 'text' | 'mention'
	content: string
	mentionType?: 'file' | 'folder' | 'special' | 'url'
}

/**
 * Mention renderer with parsing and highlighting
 */
export const Mention: React.FC<MentionProps> = ({ text }) => {
	if (!text) return null

	// Parse text into segments (text and mentions)
	const segments = useMemo(() => {
		return parseMentions(text)
	}, [text])

	return (
		<span className="mention-container whitespace-pre-wrap break-words">
			{segments.map((segment, index) => {
				if (segment.type === 'text') {
					return <span key={index}>{segment.content}</span>
				}
				
				// Render mention with highlighting
				return (
					<span
						key={index}
						className={`mention mention-${segment.mentionType || 'default'}`}
						title={segment.content}
					>
						{segment.content}
					</span>
				)
			})}
		</span>
	)
}

/**
 * Parse text into segments (simple implementation)
 * Full implementation will use MentionParser from core/mentions
 */
function parseMentions(text: string): ParsedSegment[] {
	const segments: ParsedSegment[] = []
	
	// Simple regex for basic mention detection
	// TODO: Replace with full MentionParser integration
	const mentionRegex = /@(?:problems|terminal(?:\s+\d+)?|git(?:\s+[\w-]+)?|https?:\/\/[^\s]+|(?:\.?\.?\/)?(?:[^\s@]|\\ )+(?:\.[a-zA-Z0-9]+|\/))/gi
	
	let lastIndex = 0
	let match: RegExpExecArray | null
	
	while ((match = mentionRegex.exec(text)) !== null) {
		// Add text before mention
		if (match.index > lastIndex) {
			segments.push({
				type: 'text',
				content: text.slice(lastIndex, match.index)
			})
		}
		
		// Add mention
		const mention = match[0]
		segments.push({
			type: 'mention',
			content: mention,
			mentionType: detectMentionType(mention)
		})
		
		lastIndex = match.index + mention.length
	}
	
	// Add remaining text
	if (lastIndex < text.length) {
		segments.push({
			type: 'text',
			content: text.slice(lastIndex)
		})
	}
	
	return segments.length > 0 ? segments : [{ type: 'text', content: text }]
}

/**
 * Detect mention type from text
 */
function detectMentionType(mention: string): 'file' | 'folder' | 'special' | 'url' {
	if (/^@(problems|terminal|git)/i.test(mention)) {
		return 'special'
	}
	if (/^@https?:\/\//i.test(mention)) {
		return 'url'
	}
	if (mention.endsWith('/')) {
		return 'folder'
	}
	return 'file'
}
