/**
 * File Search Service
 * Provides workspace file/folder search with fuzzy matching
 * Optimized with LRU cache and disposal pattern
 */

import * as vscode from 'vscode'
import * as path from 'path'
import { LRUCache } from 'lru-cache'
import { FileSearchResult } from '../core/mentions/types'

export class FileSearchService implements vscode.Disposable {
	// LRU cache with size limit and TTL
	private fileCache = new LRUCache<string, FileSearchResult[]>({
		max: 100, // Max 100 cached searches
		ttl: 30000, // 30 second TTL
		updateAgeOnGet: true // Refresh TTL on access
	})

	private folderCache = new LRUCache<string, FileSearchResult[]>({
		max: 50, // Max 50 cached folder searches
		ttl: 30000,
		updateAgeOnGet: true
	})

	// Cache statistics for monitoring
	private cacheStats = {
		hits: 0,
		misses: 0,
		getHitRate: () => {
			const total = this.cacheStats.hits + this.cacheStats.misses
			return total > 0 ? this.cacheStats.hits / total : 0
		}
	}

	/**
	 * Search for files in workspace
	 */
	public async searchFiles(
		query: string,
		maxResults: number = 50
	): Promise<FileSearchResult[]> {
		const workspaceFolders = vscode.workspace.workspaceFolders
		if (!workspaceFolders || workspaceFolders.length === 0) {
			return []
		}

		// Use VS Code's file search API
		const pattern = this.buildSearchPattern(query)
		const uris = await vscode.workspace.findFiles(
			pattern,
			'**/node_modules/**', // Exclude node_modules
			maxResults
		)

		return this.convertToSearchResults(uris, workspaceFolders[0].uri.fsPath)
	}

	/**
	 * Search for folders in workspace
	 */
	public async searchFolders(
		query: string,
		maxResults: number = 50
	): Promise<FileSearchResult[]> {
		const workspaceFolders = vscode.workspace.workspaceFolders
		if (!workspaceFolders || workspaceFolders.length === 0) {
			return []
		}

		// Find all directories by looking for folders
		const pattern = this.buildSearchPattern(query, true)
		const uris = await vscode.workspace.findFiles(
			pattern,
			'**/node_modules/**',
			maxResults * 2 // Get more to account for filtering
		)

		// Extract unique folder paths
		const folders = new Set<string>()
		for (const uri of uris) {
			folders.add(path.dirname(uri.fsPath))
		}

		const workspaceRoot = workspaceFolders[0].uri.fsPath
		return Array.from(folders)
			.slice(0, maxResults)
			.map(folderPath => ({
				path: folderPath,
				relativePath: path.relative(workspaceRoot, folderPath),
				type: 'folder' as const,
				icon: '📁'
			}))
	}

	/**
	 * Get all workspace files (cached)
	 */
	public async getAllFiles(): Promise<FileSearchResult[]> {
		const cacheKey = 'all-files'

		// Return cached results if still valid
		const cached = this.fileCache.get(cacheKey)
		if (cached) {
			this.cacheStats.hits++
			return cached
		}

		this.cacheStats.misses++

		const workspaceFolders = vscode.workspace.workspaceFolders
		if (!workspaceFolders || workspaceFolders.length === 0) {
			return []
		}

		// Find all files
		const uris = await vscode.workspace.findFiles(
			'**/*',
			'**/node_modules/**',
			10000 // Limit to 10k files
		)

		const results = this.convertToSearchResults(uris, workspaceFolders[0].uri.fsPath)

		// Update cache
		this.fileCache.set(cacheKey, results)

		return results
	}

	/**
	 * Fuzzy search files (simple implementation)
	 */
	public async fuzzySearchFiles(
		query: string,
		maxResults: number = 50
	): Promise<FileSearchResult[]> {
		const allFiles = await this.getAllFiles()
		
		if (!query) {
			return allFiles.slice(0, maxResults)
		}

		// Simple fuzzy matching: check if query chars appear in order
		const scoredFiles = allFiles
			.map(file => ({
				...file,
				score: this.fuzzyScore(query.toLowerCase(), file.relativePath.toLowerCase())
			}))
			.filter(file => file.score > 0)
			.sort((a, b) => b.score - a.score)
			.slice(0, maxResults)

		return scoredFiles
	}

	/**
	 * Simple fuzzy scoring algorithm
	 */
	private fuzzyScore(query: string, target: string): number {
		let score = 0
		let queryIndex = 0
		let targetIndex = 0
		let consecutiveMatches = 0

		while (queryIndex < query.length && targetIndex < target.length) {
			if (query[queryIndex] === target[targetIndex]) {
				// Match found
				score += 1 + consecutiveMatches * 5 // Bonus for consecutive matches
				consecutiveMatches++
				queryIndex++
			} else {
				consecutiveMatches = 0
			}
			targetIndex++
		}

		// If we didn't match all query characters, return 0
		if (queryIndex < query.length) {
			return 0
		}

		// Bonus for exact match at start
		if (target.startsWith(query)) {
			score += 100
		}

		// Bonus for match in filename (not just path)
		const filename = path.basename(target)
		if (filename.toLowerCase().includes(query)) {
			score += 50
		}

		return score
	}

	/**
	 * Build glob pattern from query
	 */
	private buildSearchPattern(query: string, foldersOnly: boolean = false): string {
		if (!query) {
			return foldersOnly ? '**/*/' : '**/*'
		}

		// Clean query
		const cleaned = query.replace(/^[@\/]+/, '').trim()
		
		if (!cleaned) {
			return foldersOnly ? '**/*/' : '**/*'
		}

		// Build pattern
		if (cleaned.includes('/')) {
			// Path-based search
			return `**/${cleaned}*`
		} else {
			// Filename search
			return `**/*${cleaned}*`
		}
	}

	/**
	 * Convert URIs to search results
	 */
	private convertToSearchResults(
		uris: vscode.Uri[],
		workspaceRoot: string
	): FileSearchResult[] {
		return uris.map(uri => {
			const relativePath = path.relative(workspaceRoot, uri.fsPath)
			const ext = path.extname(uri.fsPath).slice(1)
			
			return {
				path: uri.fsPath,
				relativePath,
				type: 'file' as const,
				icon: this.getFileIcon(ext)
			}
		})
	}

	/**
	 * Get icon for file extension
	 */
	private getFileIcon(ext: string): string {
		const iconMap: Record<string, string> = {
			ts: '📘',
			js: '📜',
			tsx: '⚛️',
			jsx: '⚛️',
			json: '📋',
			md: '📝',
			txt: '📄',
			py: '🐍',
			rb: '💎',
			go: '🔷',
			rs: '🦀',
			java: '☕',
			cpp: '⚙️',
			c: '⚙️',
			css: '🎨',
			scss: '🎨',
			html: '🌐',
			xml: '📰',
			yml: '⚙️',
			yaml: '⚙️',
			sh: '🐚',
			bat: '🪟'
		}

		return iconMap[ext] || '📄'
	}

	/**
	 * Clear cache
	 */
	public clearCache(): void {
		this.fileCache.clear()
		this.folderCache.clear()
		this.cacheStats.hits = 0
		this.cacheStats.misses = 0
	}

	/**
	 * Get cache performance metrics
	 */
	public getCacheMetrics() {
		return {
			hits: this.cacheStats.hits,
			misses: this.cacheStats.misses,
			hitRate: this.cacheStats.getHitRate(),
			filesCacheSize: this.fileCache.size,
			foldersCacheSize: this.folderCache.size
		}
	}

	/**
	 * Dispose and cleanup resources
	 */
	public dispose(): void {
		this.clearCache()
	}
}

// Export singleton
export const fileSearchService = new FileSearchService()
