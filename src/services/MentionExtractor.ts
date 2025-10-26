/**
 * Mention Extractor
 * Extracts context content from parsed mentions
 */

import * as vscode from 'vscode'
import * as fs from 'fs/promises'
import { MentionMatch, MentionType, MentionContext } from '../core/mentions/types'
import { fileSearchService } from './FileSearchService'
import { diagnosticsService } from './DiagnosticsService'
import { terminalService } from './TerminalService'
import { gitService } from './GitService'

export class MentionExtractor {
	/**
	 * Extract context from all mentions
	 * Uses parallel extraction for better performance
	 */
	public async extractContext(mentions: MentionMatch[]): Promise<MentionContext[]> {
		// Limit mention count to prevent performance issues
		const MAX_MENTIONS = 50
		if (mentions.length > MAX_MENTIONS) {
			console.warn(`Large mention count: ${mentions.length}. Limiting to ${MAX_MENTIONS}.`)
			mentions = mentions.slice(0, MAX_MENTIONS)
		}

		// Extract contexts in parallel for better performance
		const contextPromises = mentions.map(mention =>
			this.extractSingleContext(mention)
				.catch(error => ({
					type: mention.type,
					content: `⚠️ Failed to extract context: ${error instanceof Error ? error.message : 'Unknown error'}`,
					metadata: { error: true, mention: mention.raw }
				}))
		)

		const contexts = await Promise.all(contextPromises)

		return contexts.filter(ctx => ctx !== null) as MentionContext[]
	}

	/**
	 * Extract context from single mention
	 */
	private async extractSingleContext(mention: MentionMatch): Promise<MentionContext | null> {
		switch (mention.type) {
			case MentionType.FILE:
				return this.extractFileContext(mention.value)
			
			case MentionType.FOLDER:
				return this.extractFolderContext(mention.value)
			
			case MentionType.PROBLEMS:
				return this.extractProblemsContext()
			
			case MentionType.TERMINAL:
				return this.extractTerminalContext(mention.value)
			
			case MentionType.GIT:
				return this.extractGitContext(mention.value)
			
			case MentionType.URL:
				return this.extractUrlContext(mention.value)
			
			default:
				return null
		}
	}

	/**
	 * Extract file content
	 */
	private async extractFileContext(filePath: string): Promise<MentionContext> {
		try {
			// Resolve to absolute path
			const absolutePath = await this.resolveFilePath(filePath)
			
			// Get file stats
			const stats = await fs.stat(absolutePath)
			
			// Check file size limit (1 MB)
			const MAX_FILE_SIZE = 1024 * 1024
			if (stats.size > MAX_FILE_SIZE) {
				const sizeMB = (stats.size / (1024 * 1024)).toFixed(2)
				return {
					type: MentionType.FILE,
					content: `## File: ${filePath}\n\n⚠️ **File too large** (${sizeMB} MB)\n\nMaximum supported size is 1 MB. Large files are not included to prevent performance issues.`,
					metadata: {
						path: absolutePath,
						size: stats.size,
						modified: stats.mtime,
						tooLarge: true
					}
				}
			}
			
			// Check if binary file
			if (await this.isBinaryFile(absolutePath)) {
				const ext = absolutePath.split('.').pop() || 'unknown'
				return {
					type: MentionType.FILE,
					content: `## File: ${filePath}\n\n📦 **Binary file** (.${ext}, ${stats.size} bytes)\n\nBinary files cannot be displayed as text.`,
					metadata: {
						path: absolutePath,
						size: stats.size,
						modified: stats.mtime,
						binary: true,
						extension: ext
					}
				}
			}
			
			// Read file content
			const content = await fs.readFile(absolutePath, 'utf-8')
			
			return {
				type: MentionType.FILE,
				content: `## File: ${filePath}\n\n\`\`\`\n${content}\n\`\`\``,
				metadata: {
					path: absolutePath,
					size: stats.size,
					modified: stats.mtime
				}
			}
		} catch (error) {
			throw new Error(`Cannot read file "${filePath}": ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	}

	/**
	 * Check if file is binary by looking for null bytes
	 */
	private async isBinaryFile(filePath: string): Promise<boolean> {
		try {
			const buffer = await fs.readFile(filePath)
			// Check first 8KB for null bytes (common in binary files)
			const sampleSize = Math.min(buffer.length, 8000)
			for (let i = 0; i < sampleSize; i++) {
				if (buffer[i] === 0) {
					return true
				}
			}
			return false
		} catch {
			// If we can't read the file, assume it's not binary
			return false
		}
	}

	/**
	 * Extract folder contents
	 */
	private async extractFolderContext(folderPath: string): Promise<MentionContext> {
		try {
			// Resolve to absolute path
			const absolutePath = await this.resolveFolderPath(folderPath)
			
			// Read directory
			const entries = await fs.readdir(absolutePath, { withFileTypes: true })
			
			// Format directory listing
			let content = `## Folder: ${folderPath}\n\n`
			content += `📁 Files and folders:\n\n`
			
			const folders = entries.filter(e => e.isDirectory())
			const files = entries.filter(e => e.isFile())
			
			if (folders.length > 0) {
				content += `**Folders (${folders.length}):**\n`
				folders.forEach(f => {
					content += `- 📁 ${f.name}/\n`
				})
				content += '\n'
			}
			
			if (files.length > 0) {
				content += `**Files (${files.length}):**\n`
				files.forEach(f => {
					content += `- 📄 ${f.name}\n`
				})
			}
			
			return {
				type: MentionType.FOLDER,
				content,
				metadata: {
					path: absolutePath,
					fileCount: files.length,
					folderCount: folders.length
				}
			}
		} catch (error) {
			throw new Error(`Cannot read folder "${folderPath}": ${error instanceof Error ? error.message : 'Unknown error'}`)
		}
	}

	/**
	 * Extract VS Code problems/diagnostics
	 */
	private extractProblemsContext(): MentionContext {
		const diagnosticsText = diagnosticsService.formatDiagnosticsForContext(50)
		
		return {
			type: MentionType.PROBLEMS,
			content: diagnosticsText,
			metadata: {
				errorCount: diagnosticsService.getErrorCount(),
				warningCount: diagnosticsService.getWarningCount()
			}
		}
	}

	/**
	 * Extract terminal output
	 */
	private async extractTerminalContext(terminalId: string): Promise<MentionContext> {
		const terminalText = terminalService.formatTerminalForContext(terminalId)
		const terminals = await terminalService.getAllTerminals()
		
		return {
			type: MentionType.TERMINAL,
			content: terminalText,
			metadata: {
				terminalId,
				terminals
			}
		}
	}

	/**
	 * Extract git history
	 */
	private extractGitContext(branch: string): MentionContext {
		const gitText = gitService.formatHistoryForContext(10, branch)
		
		return {
			type: MentionType.GIT,
			content: gitText,
			metadata: {
				branch,
				isRepository: gitService.isGitRepository(),
				currentBranch: gitService.getCurrentBranch()
			}
		}
	}

	/**
	 * Extract URL content (placeholder)
	 */
	private async extractUrlContext(url: string): Promise<MentionContext> {
		// TODO: Implement URL fetching (use existing URLAnalyzer service)
		return {
			type: MentionType.URL,
			content: `## URL: ${url}\n\n⚠️  URL content fetching not yet implemented.\nWill integrate with existing URLAnalyzer service.`,
			metadata: {
				url
			}
		}
	}

	/**
	 * Resolve file path to absolute path
	 * Supports multi-root workspaces
	 */
	private async resolveFilePath(filePath: string): Promise<string> {
		const workspaceFolders = vscode.workspace.workspaceFolders
		
		// Check workspace exists
		if (!workspaceFolders || workspaceFolders.length === 0) {
			throw new Error('No workspace folder open. Please open a folder to use @mentions.')
		}
		
		// If absolute, verify it exists
		if (filePath.startsWith('/') || /^[A-Z]:/i.test(filePath)) {
			try {
				await fs.access(filePath)
				return filePath
			} catch {
				throw new Error(`File not found: ${filePath}`)
			}
		}

		// Try each workspace folder (multi-root support)
		for (const folder of workspaceFolders) {
			const absolutePath = `${folder.uri.fsPath}/${filePath}`
			try {
				await fs.access(absolutePath)
				const stats = await fs.stat(absolutePath)
				if (stats.isFile()) {
					return absolutePath
				}
			} catch {
				// Try next workspace folder
				continue
			}
		}
		
		// Try fuzzy search as last resort
		try {
			const results = await fileSearchService.fuzzySearchFiles(filePath, 1)
			if (results.length > 0) {
				return results[0].path
			}
		} catch {
			// Fuzzy search failed, continue to error
		}

		throw new Error(`File not found: "${filePath}". Check the path and try again.`)
	}

	/**
	 * Resolve folder path to absolute path
	 * Supports multi-root workspaces
	 */
	private async resolveFolderPath(folderPath: string): Promise<string> {
		// Remove trailing slash if present
		const cleanPath = folderPath.replace(/\/$/, '')
		
		const workspaceFolders = vscode.workspace.workspaceFolders
		
		// Check workspace exists
		if (!workspaceFolders || workspaceFolders.length === 0) {
			throw new Error('No workspace folder open. Please open a folder to use @mentions.')
		}
		
		// If absolute, verify it exists
		if (cleanPath.startsWith('/') || /^[A-Z]:/i.test(cleanPath)) {
			try {
				const stats = await fs.stat(cleanPath)
				if (stats.isDirectory()) {
					return cleanPath
				}
				throw new Error(`Path exists but is not a folder: ${cleanPath}`)
			} catch (error) {
				if (error instanceof Error && error.message.includes('not a folder')) {
					throw error
				}
				throw new Error(`Folder not found: ${cleanPath}`)
			}
		}

		// Try each workspace folder (multi-root support)
		for (const folder of workspaceFolders) {
			const absolutePath = `${folder.uri.fsPath}/${cleanPath}`
			try {
				const stats = await fs.stat(absolutePath)
				if (stats.isDirectory()) {
					return absolutePath
				}
			} catch {
				// Try next workspace folder
				continue
			}
		}
		
		// Try fuzzy search
		try {
			const results = await fileSearchService.searchFolders(cleanPath, 1)
			if (results.length > 0) {
				return results[0].path
			}
		} catch {
			// Fuzzy search failed, continue to error
		}

		throw new Error(`Folder not found: "${folderPath}". Check the path and try again.`)
	}
}

// Export singleton
export const mentionExtractor = new MentionExtractor()
