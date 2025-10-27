/**
 * BatchDiffApproval Component
 *
 * UI for approving/denying individual diffs in batch write operations.
 * Matches Roo Code's implementation with expandable diff views.
 */

import React, { useState } from "react"
import { FileDiff } from "lucide-react"
import { CodeAccordian } from "./CodeAccordian"
import "./BatchDiffApproval.css"

interface FileDiff {
	path: string
	changeCount: number
	key: string
	content: string
	diffs?: Array<{ content: string; startLine?: number }>
}

interface BatchDiffApprovalProps {
	files: FileDiff[]
	onApprove: (key: string) => void
	onDeny: (key: string) => void
	ts: number
}

export const BatchDiffApproval: React.FC<BatchDiffApprovalProps> = ({
	files,
	onApprove,
	onDeny,
}) => {
	const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({})

	const handleToggleExpand = (key: string) => {
		setExpandedFiles((prev) => ({
			...prev,
			[key]: !prev[key],
		}))
	}

	return (
		<div className="batch-diff-approval">
			{files.map((file) => (
				<div key={file.key} className="batch-diff-item">
					<div className="batch-diff-header">
						<FileDiff className="batch-diff-icon" />
						<span className="batch-diff-path">{file.path}</span>
						<span className="batch-diff-changes">
							{file.changeCount} {file.changeCount === 1 ? "change" : "changes"}
						</span>
					</div>

					<CodeAccordian
						code={file.content}
						language="diff"
						path={file.path}
						isExpanded={expandedFiles[file.key] || false}
						onToggleExpand={() => handleToggleExpand(file.key)}
					/>

					<div className="batch-diff-actions">
						<button
							className="batch-diff-approve"
							onClick={() => onApprove(file.key)}>
							Approve
						</button>
						<button
							className="batch-diff-deny"
							onClick={() => onDeny(file.key)}>
							Deny
						</button>
					</div>
				</div>
			))}
		</div>
	)
}
