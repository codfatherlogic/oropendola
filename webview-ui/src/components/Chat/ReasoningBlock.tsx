/**
 * ReasoningBlock Component
 *
 * Displays AI thinking/reasoning process with collapsible UI and elapsed time tracking.
 * Matches Roo Code's implementation with Lightbulb icon, timer, and MarkdownBlock content.
 */

import React, { useEffect, useRef, useState } from "react"
import { Lightbulb, ChevronUp } from "lucide-react"
import { MarkdownBlock } from "./MarkdownBlock"
import { useChatContext } from "../../context/ChatContext"

interface ReasoningBlockProps {
	content: string
	ts?: number
	isStreaming: boolean
	isLast: boolean
	metadata?: any
}

export const ReasoningBlock: React.FC<ReasoningBlockProps> = ({
	content,
	isStreaming,
	isLast,
}) => {
	const { reasoningBlockCollapsed, setReasoningBlockCollapsed } = useChatContext()
	const [isCollapsed, setIsCollapsed] = useState(reasoningBlockCollapsed)

	const startTimeRef = useRef<number>(Date.now())
	const [elapsed, setElapsed] = useState<number>(0)

	// Sync with context state
	useEffect(() => {
		setIsCollapsed(reasoningBlockCollapsed)
	}, [reasoningBlockCollapsed])

	// Timer logic
	useEffect(() => {
		if (isLast && isStreaming) {
			const tick = () => setElapsed(Date.now() - startTimeRef.current)
			tick() // Initial call

			const interval = setInterval(tick, 1000)
			return () => clearInterval(interval)
		}
	}, [isLast, isStreaming])

	const handleToggle = () => {
		const newCollapsed = !isCollapsed
		setIsCollapsed(newCollapsed)
		setReasoningBlockCollapsed(newCollapsed)
	}

	const seconds = Math.floor(elapsed / 1000)

	return (
		<div className="group">
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					cursor: "pointer",
					padding: "8px 0",
				}}
				onClick={handleToggle}>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<Lightbulb
						style={{
							width: "16px",
							height: "16px",
							color: "var(--vscode-foreground)",
						}}
					/>
					<span style={{ fontWeight: "bold" }}>Thinking</span>
					{elapsed > 0 && (
						<span
							style={{
								fontSize: "14px",
								color: "var(--vscode-descriptionForeground)",
							}}>
							{seconds}s
						</span>
					)}
				</div>
				<ChevronUp
					style={{
						width: "16px",
						height: "16px",
						transform: isCollapsed ? "rotate(180deg)" : "rotate(0deg)",
						transition: "transform 0.2s ease",
						color: "var(--vscode-foreground)",
					}}
				/>
			</div>
			{!isCollapsed && (
				<div style={{ paddingLeft: "24px", marginTop: "8px" }}>
					<MarkdownBlock markdown={content} partial={isStreaming} />
				</div>
			)}
		</div>
	)
}
