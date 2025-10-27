/**
 * ProgressIndicator Component
 *
 * Displays an animated loading spinner for in-progress operations.
 * Used for API requests, command execution, and other async operations.
 * Matches Roo Code's implementation with VSCodeProgressRing scaled to 0.55.
 */

import { VSCodeProgressRing } from "@vscode/webview-ui-toolkit/react"

export const ProgressIndicator = () => (
	<div
		style={{
			width: "16px",
			height: "16px",
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
		}}>
		<div style={{ transform: "scale(0.55)", transformOrigin: "center" }}>
			<VSCodeProgressRing />
		</div>
	</div>
)
