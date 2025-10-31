/**
 * Workspace Service
 *
 * Communicates with VS Code extension to get workspace information.
 */

import vscode from '../vscode-api'

export interface WorkspaceFile {
  path: string
  name: string
  relativePath: string
  isDirectory: boolean
}

class WorkspaceServiceImpl {
  private fileCache: WorkspaceFile[] | null = null
  private folderCache: WorkspaceFile[] | null = null
  private cacheTimestamp: number = 0
  private readonly CACHE_TTL = 60000 // 1 minute

  /**
   * Get all files in workspace
   */
  async getFiles(): Promise<WorkspaceFile[]> {
    // Use cache if fresh
    if (this.fileCache && Date.now() - this.cacheTimestamp < this.CACHE_TTL) {
      return this.fileCache
    }

    return new Promise((resolve) => {
      // Request files from extension
      const messageId = Date.now().toString()

      const handler = (event: MessageEvent) => {
        const message = event.data
        if (message.type === 'workspaceFilesResponse' && message.id === messageId) {
          this.fileCache = message.files || []
          this.cacheTimestamp = Date.now()
          window.removeEventListener('message', handler)
          resolve(this.fileCache)
        }
      }

      window.addEventListener('message', handler)

      // Send request to extension
      vscode.postMessage({
        type: 'getWorkspaceFiles',
        id: messageId,
      })

      // Timeout after 5 seconds
      setTimeout(() => {
        window.removeEventListener('message', handler)
        resolve([])
      }, 5000)
    })
  }

  /**
   * Get all folders in workspace
   */
  async getFolders(): Promise<WorkspaceFile[]> {
    // Use cache if fresh
    if (this.folderCache && Date.now() - this.cacheTimestamp < this.CACHE_TTL) {
      return this.folderCache
    }

    return new Promise((resolve) => {
      const messageId = Date.now().toString()

      const handler = (event: MessageEvent) => {
        const message = event.data
        if (message.type === 'workspaceFoldersResponse' && message.id === messageId) {
          this.folderCache = message.folders || []
          this.cacheTimestamp = Date.now()
          window.removeEventListener('message', handler)
          resolve(this.folderCache)
        }
      }

      window.addEventListener('message', handler)

      vscode.postMessage({
        type: 'getWorkspaceFolders',
        id: messageId,
      })

      setTimeout(() => {
        window.removeEventListener('message', handler)
        resolve([])
      }, 5000)
    })
  }

  /**
   * Search files with fuzzy matching
   */
  async searchFiles(query: string, limit: number = 20): Promise<WorkspaceFile[]> {
    if (!query) {
      return []
    }

    const files = await this.getFiles()
    return this.fuzzySearch(files, query, limit)
  }

  /**
   * Search folders with fuzzy matching
   */
  async searchFolders(query: string, limit: number = 20): Promise<WorkspaceFile[]> {
    if (!query) {
      return []
    }

    const folders = await this.getFolders()
    return this.fuzzySearch(folders, query, limit)
  }

  /**
   * Fuzzy search implementation
   */
  private fuzzySearch(
    items: WorkspaceFile[],
    query: string,
    limit: number
  ): WorkspaceFile[] {
    const lowerQuery = query.toLowerCase()

    // Score each item
    const scored = items
      .map((item) => {
        const name = item.name.toLowerCase()
        const path = item.relativePath.toLowerCase()

        let score = 0

        // Exact match
        if (name === lowerQuery) {
          score += 1000
        }

        // Starts with query
        if (name.startsWith(lowerQuery)) {
          score += 500
        }

        if (path.startsWith(lowerQuery)) {
          score += 400
        }

        // Contains query
        if (name.includes(lowerQuery)) {
          score += 200
        }

        if (path.includes(lowerQuery)) {
          score += 100
        }

        // Fuzzy match (all characters in order)
        if (this.fuzzyMatch(name, lowerQuery)) {
          score += 50
        }

        // Bonus for shorter paths (prefer top-level files)
        const depth = item.relativePath.split('/').length
        score -= depth * 5

        return { item, score }
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ item }) => item)

    return scored
  }

  /**
   * Check if all characters of query appear in target in order
   */
  private fuzzyMatch(target: string, query: string): boolean {
    let queryIndex = 0

    for (let i = 0; i < target.length && queryIndex < query.length; i++) {
      if (target[i] === query[queryIndex]) {
        queryIndex++
      }
    }

    return queryIndex === query.length
  }

  /**
   * Clear cache (useful when files change)
   */
  clearCache(): void {
    this.fileCache = null
    this.folderCache = null
    this.cacheTimestamp = 0
  }

  /**
   * Get file content
   */
  async getFileContent(path: string): Promise<string> {
    return new Promise((resolve) => {
      const messageId = Date.now().toString()

      const handler = (event: MessageEvent) => {
        const message = event.data
        if (message.type === 'fileContentResponse' && message.id === messageId) {
          window.removeEventListener('message', handler)
          resolve(message.content || '')
        }
      }

      window.addEventListener('message', handler)

      vscode.postMessage({
        type: 'getFileContent',
        id: messageId,
        path,
      })

      setTimeout(() => {
        window.removeEventListener('message', handler)
        resolve('')
      }, 5000)
    })
  }
}

// Singleton instance
export const workspaceService = new WorkspaceServiceImpl()
