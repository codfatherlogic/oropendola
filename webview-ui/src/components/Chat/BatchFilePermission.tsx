/**
 * BatchFilePermission Component
 *
 * UI for approving/denying individual files in batch read operations.
 * Matches Roo Code's implementation with individual file approval controls.
 */

import React, { useState } from "react"
import { Eye } from "lucide-react"
import "./BatchFilePermission.css"

interface FilePermissionItem {
	path: string
	key: string
}

interface BatchFilePermissionProps {
	files: FilePermissionItem[]
	onPermissionResponse: (response: Record<string, boolean>) => void
	ts: number
}

export const BatchFilePermission: React.FC<BatchFilePermissionProps> = ({
	files,
	onPermissionResponse,
}) => {
	const [selectedFiles, setSelectedFiles] = useState<Record<string, boolean>>({})

	const handleFileClick = (key: string) => {
		setSelectedFiles((prev) => ({
			...prev,
			[key]: !prev[key],
		}))
	}

	const handleApprove = (key: string) => {
		const response = { [key]: true }
		onPermissionResponse(response)
	}

	const handleDeny = (key: string) => {
		const response = { [key]: false }
		onPermissionResponse(response)
	}

	return (
		<div className="batch-file-permission">
			{files.map((file) => (
				<div
					key={file.key}
					className={`batch-file-item ${selectedFiles[file.key] ? "selected" : ""}`}
					onClick={() => handleFileClick(file.key)}>
					<div className="batch-file-header">
						<Eye className="batch-file-icon" />
						<span className="batch-file-path">{file.path}</span>
					</div>
					<div className="batch-file-actions">
						<button
							className="batch-file-approve"
							onClick={(e) => {
								e.stopPropagation()
								handleApprove(file.key)
							}}>
							Approve
						</button>
						<button
							className="batch-file-deny"
							onClick={(e) => {
								e.stopPropagation()
								handleDeny(file.key)
							}}>
							Deny
						</button>
					</div>
				</div>
			))}
		</div>
	)
}
