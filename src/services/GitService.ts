/**
 * Git Service
 * Provides git commit history and repository info for @git mentions
 */

import * as vscode from 'vscode'
import { execSync } from 'child_process'
import * as path from 'path'

export interface GitCommit {
	hash: string
	shortHash: string
	author: string
	date: Date
	message: string
	files: string[]
}

export interface GitBranch {
	name: string
	current: boolean
	remote?: string
}

export class GitService {
	/**
	 * Get git repository root
	 */
	public getGitRoot(): string | null {
		const workspaceFolders = vscode.workspace.workspaceFolders
		if (!workspaceFolders || workspaceFolders.length === 0) {
			return null
		}

		try {
			const root = execSync('git rev-parse --show-toplevel', {
				cwd: workspaceFolders[0].uri.fsPath,
				encoding: 'utf-8'
			}).trim()
			return root
		} catch {
			return null
		}
	}

	/**
	 * Check if workspace is a git repository
	 */
	public isGitRepository(): boolean {
		return this.getGitRoot() !== null
	}

	/**
	 * Get git commit history
	 */
	public getCommitHistory(maxCount: number = 20, branch: string = 'HEAD'): GitCommit[] {
		const gitRoot = this.getGitRoot()
		if (!gitRoot) {
			return []
		}

		try {
			// Get commit hashes
			const hashesOutput = execSync(
				`git log ${branch} --format=%H -n ${maxCount}`,
				{ cwd: gitRoot, encoding: 'utf-8' }
			)
			const hashes = hashesOutput.trim().split('\n').filter(Boolean)

			// Get commit details
			return hashes.map(hash => this.getCommit(hash, gitRoot!))
		} catch (error) {
			console.error('Failed to get git history:', error)
			return []
		}
	}

	/**
	 * Get single commit details
	 */
	public getCommit(hash: string, gitRoot?: string): GitCommit {
		const root = gitRoot || this.getGitRoot()
		if (!root) {
			throw new Error('Not a git repository')
		}

		try {
			// Get commit info
			const infoOutput = execSync(
				`git show ${hash} --format="%H%n%h%n%an%n%ai%n%s" --no-patch`,
				{ cwd: root, encoding: 'utf-8' }
			)
			const [fullHash, shortHash, author, dateStr, message] = infoOutput.trim().split('\n')

			// Get changed files
			const filesOutput = execSync(
				`git diff-tree --no-commit-id --name-only -r ${hash}`,
				{ cwd: root, encoding: 'utf-8' }
			)
			const files = filesOutput.trim().split('\n').filter(Boolean)

			return {
				hash: fullHash,
				shortHash,
				author,
				date: new Date(dateStr),
				message,
				files
			}
		} catch (error) {
			throw new Error(`Failed to get commit ${hash}: ${error}`)
		}
	}

	/**
	 * Get current branch
	 */
	public getCurrentBranch(): string | null {
		const gitRoot = this.getGitRoot()
		if (!gitRoot) {
			return null
		}

		try {
			return execSync('git branch --show-current', {
				cwd: gitRoot,
				encoding: 'utf-8'
			}).trim()
		} catch {
			return null
		}
	}

	/**
	 * Get all branches
	 */
	public getBranches(): GitBranch[] {
		const gitRoot = this.getGitRoot()
		if (!gitRoot) {
			return []
		}

		try {
			const output = execSync('git branch -a', {
				cwd: gitRoot,
				encoding: 'utf-8'
			})

			return output
				.split('\n')
				.filter(Boolean)
				.map(line => {
					const isCurrent = line.startsWith('*')
					const name = line.replace(/^\*?\s+/, '').trim()
					const isRemote = name.startsWith('remotes/')

					return {
						name: isRemote ? name.replace('remotes/', '') : name,
						current: isCurrent,
						remote: isRemote ? name.split('/')[1] : undefined
					}
				})
		} catch {
			return []
		}
	}

	/**
	 * Get uncommitted changes
	 */
	public getUncommittedChanges(): string[] {
		const gitRoot = this.getGitRoot()
		if (!gitRoot) {
			return []
		}

		try {
			const output = execSync('git status --porcelain', {
				cwd: gitRoot,
				encoding: 'utf-8'
			})

			return output
				.split('\n')
				.filter(Boolean)
				.map(line => line.trim())
		} catch {
			return []
		}
	}

	/**
	 * Format git history for AI context
	 */
	public formatHistoryForContext(
		maxCommits: number = 10,
		branch: string = 'HEAD'
	): string {
		if (!this.isGitRepository()) {
			return '⚠️  Not a git repository'
		}

		const commits = this.getCommitHistory(maxCommits, branch)
		const currentBranch = this.getCurrentBranch()
		const uncommitted = this.getUncommittedChanges()

		let output = `## Git Repository\n\n`
		output += `📁 Branch: ${currentBranch || 'detached HEAD'}\n`
		output += `📝 Commits: ${commits.length}\n`
		
		if (uncommitted.length > 0) {
			output += `⚠️  Uncommitted changes: ${uncommitted.length}\n`
		}
		
		output += `\n### Recent Commits:\n\n`

		commits.forEach((commit, index) => {
			output += `${index + 1}. **${commit.shortHash}** - ${commit.message}\n`
			output += `   Author: ${commit.author}\n`
			output += `   Date: ${commit.date.toLocaleDateString()}\n`
			if (commit.files.length > 0) {
				output += `   Files: ${commit.files.slice(0, 5).join(', ')}`
				if (commit.files.length > 5) {
					output += ` (+${commit.files.length - 5} more)`
				}
				output += '\n'
			}
			output += '\n'
		})

		if (uncommitted.length > 0) {
			output += `### Uncommitted Changes:\n\n`
			uncommitted.slice(0, 20).forEach(change => {
				output += `- ${change}\n`
			})
			if (uncommitted.length > 20) {
				output += `\n... and ${uncommitted.length - 20} more\n`
			}
		}

		return output
	}

	/**
	 * Get file history
	 */
	public getFileHistory(filePath: string, maxCount: number = 10): GitCommit[] {
		const gitRoot = this.getGitRoot()
		if (!gitRoot) {
			return []
		}

		try {
			const relativePath = path.relative(gitRoot, filePath)
			const hashesOutput = execSync(
				`git log --format=%H -n ${maxCount} -- "${relativePath}"`,
				{ cwd: gitRoot, encoding: 'utf-8' }
			)
			const hashes = hashesOutput.trim().split('\n').filter(Boolean)

			return hashes.map(hash => this.getCommit(hash, gitRoot!))
		} catch {
			return []
		}
	}
}

// Export singleton
export const gitService = new GitService()
