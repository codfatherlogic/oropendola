/**
 * Diagnostics Service
 * Extracts VS Code problems/diagnostics for @problems mentions
 */

import * as vscode from 'vscode'

export interface DiagnosticInfo {
	file: string
	line: number
	column: number
	severity: 'error' | 'warning' | 'info' | 'hint'
	message: string
	source?: string
	code?: string | number
}

export class DiagnosticsService {
	/**
	 * Get all diagnostics from workspace
	 */
	public getAllDiagnostics(): DiagnosticInfo[] {
		const diagnostics: DiagnosticInfo[] = []
		const allDiagnostics = vscode.languages.getDiagnostics()

		for (const [uri, fileDiagnostics] of allDiagnostics) {
			for (const diagnostic of fileDiagnostics) {
				diagnostics.push({
					file: uri.fsPath,
					line: diagnostic.range.start.line + 1, // 1-indexed
					column: diagnostic.range.start.character + 1,
					severity: this.getSeverityString(diagnostic.severity),
					message: diagnostic.message,
					source: diagnostic.source,
					code: diagnostic.code?.toString()
				})
			}
		}

		return diagnostics
	}

	/**
	 * Get diagnostics for specific file
	 */
	public getFileDiagnostics(filePath: string): DiagnosticInfo[] {
		const uri = vscode.Uri.file(filePath)
		const diagnostics = vscode.languages.getDiagnostics(uri)

		return diagnostics.map(diagnostic => ({
			file: filePath,
			line: diagnostic.range.start.line + 1,
			column: diagnostic.range.start.character + 1,
			severity: this.getSeverityString(diagnostic.severity),
			message: diagnostic.message,
			source: diagnostic.source,
			code: diagnostic.code?.toString()
		}))
	}

	/**
	 * Get diagnostics filtered by severity
	 */
	public getDiagnosticsBySeverity(
		severity: 'error' | 'warning' | 'info' | 'hint'
	): DiagnosticInfo[] {
		return this.getAllDiagnostics().filter(d => d.severity === severity)
	}

	/**
	 * Get error count
	 */
	public getErrorCount(): number {
		return this.getDiagnosticsBySeverity('error').length
	}

	/**
	 * Get warning count
	 */
	public getWarningCount(): number {
		return this.getDiagnosticsBySeverity('warning').length
	}

	/**
	 * Format diagnostics as text for AI context
	 */
	public formatDiagnosticsForContext(maxItems: number = 50): string {
		const diagnostics = this.getAllDiagnostics().slice(0, maxItems)
		
		if (diagnostics.length === 0) {
			return '✅ No problems found in workspace'
		}

		const errors = diagnostics.filter(d => d.severity === 'error')
		const warnings = diagnostics.filter(d => d.severity === 'warning')

		let output = `📊 Workspace Problems Summary:\n`
		output += `- Errors: ${errors.length}\n`
		output += `- Warnings: ${warnings.length}\n`
		output += `- Total: ${diagnostics.length}\n\n`

		// Show errors first
		if (errors.length > 0) {
			output += `🔴 Errors:\n`
			errors.slice(0, 20).forEach((d, i) => {
				output += `${i + 1}. ${d.file}:${d.line}:${d.column}\n`
				output += `   ${d.message}\n`
				if (d.source) output += `   Source: ${d.source}\n`
				output += `\n`
			})
		}

		// Show warnings
		if (warnings.length > 0 && errors.length < 20) {
			output += `⚠️  Warnings:\n`
			const warningsToShow = Math.min(warnings.length, maxItems - errors.length)
			warnings.slice(0, warningsToShow).forEach((d, i) => {
				output += `${i + 1}. ${d.file}:${d.line}:${d.column}\n`
				output += `   ${d.message}\n`
				output += `\n`
			})
		}

		return output
	}

	/**
	 * Convert VS Code severity to string
	 */
	private getSeverityString(severity: vscode.DiagnosticSeverity): 'error' | 'warning' | 'info' | 'hint' {
		switch (severity) {
			case vscode.DiagnosticSeverity.Error:
				return 'error'
			case vscode.DiagnosticSeverity.Warning:
				return 'warning'
			case vscode.DiagnosticSeverity.Information:
				return 'info'
			case vscode.DiagnosticSeverity.Hint:
				return 'hint'
			default:
				return 'info'
		}
	}

	/**
	 * Watch for diagnostic changes
	 */
	public onDiagnosticsChange(
		callback: (diagnostics: DiagnosticInfo[]) => void
	): vscode.Disposable {
		return vscode.languages.onDidChangeDiagnostics(() => {
			callback(this.getAllDiagnostics())
		})
	}
}

// Export singleton
export const diagnosticsService = new DiagnosticsService()
