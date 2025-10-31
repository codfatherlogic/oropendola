/**
 * Mention Service
 *
 * Parses and resolves @mentions in chat input.
 */

import {
  Mention,
  MentionType,
  MentionSuggestion,
  MentionContext,
  MentionParser,
} from '../types/mentions'
import vscode from '../vscode-api'
import { workspaceService } from './WorkspaceService'

class MentionServiceImpl implements MentionParser {
  private mentionRegex = /@(file|folder|problems|terminal|git|url|code):([^\s]+)/gi

  /**
   * Parse mentions from input text
   */
  parse(input: string): Mention[] {
    const mentions: Mention[] = []
    let match: RegExpExecArray | null

    // Reset regex
    this.mentionRegex.lastIndex = 0

    while ((match = this.mentionRegex.exec(input)) !== null) {
      const type = match[1] as MentionType
      const value = match[2]

      mentions.push({
        type,
        text: match[0],
        value,
        start: match.index,
        end: match.index + match[0].length,
      })
    }

    return mentions
  }

  /**
   * Get mention suggestions based on current input
   */
  async getSuggestions(input: string, cursorPosition: number): Promise<MentionSuggestion[]> {
    // Find if cursor is after @ symbol
    const beforeCursor = input.slice(0, cursorPosition)
    const lastAtIndex = beforeCursor.lastIndexOf('@')

    if (lastAtIndex === -1) {
      return []
    }

    const afterAt = beforeCursor.slice(lastAtIndex + 1)
    const parts = afterAt.split(':')

    // If no colon yet, suggest mention types
    if (parts.length === 1) {
      const query = parts[0].toLowerCase()
      return this.getMentionTypeSuggestions(query)
    }

    // If has colon, suggest values for that type
    const type = parts[0] as MentionType
    const query = parts.slice(1).join(':')

    return this.getMentionValueSuggestions(type, query)
  }

  /**
   * Get mention type suggestions
   */
  private getMentionTypeSuggestions(query: string): MentionSuggestion[] {
    const types: Array<{ type: MentionType; description: string; icon: string }> = [
      { type: 'file', description: 'Reference a file', icon: '📄' },
      { type: 'folder', description: 'Reference a folder', icon: '📁' },
      { type: 'problems', description: 'Include problems/errors', icon: '⚠️' },
      { type: 'terminal', description: 'Include terminal output', icon: '💻' },
      { type: 'git', description: 'Include git status/diff', icon: '🔀' },
      { type: 'url', description: 'Fetch content from URL', icon: '🔗' },
      { type: 'code', description: 'Reference code selection', icon: '📝' },
    ]

    return types
      .filter((t) => t.type.includes(query) || t.description.toLowerCase().includes(query))
      .map((t) => ({
        type: t.type,
        text: `@${t.type}:`,
        value: '',
        description: t.description,
        icon: t.icon,
      }))
  }

  /**
   * Get mention value suggestions for a specific type
   */
  private async getMentionValueSuggestions(
    type: MentionType,
    query: string
  ): Promise<MentionSuggestion[]> {
    switch (type) {
      case 'file':
        return this.getFileSuggestions(query)
      case 'folder':
        return this.getFolderSuggestions(query)
      case 'problems':
        return [
          {
            type: 'problems',
            text: '@problems:all',
            value: 'all',
            description: 'All problems in workspace',
          },
          {
            type: 'problems',
            text: '@problems:errors',
            value: 'errors',
            description: 'Only errors',
          },
          {
            type: 'problems',
            text: '@problems:warnings',
            value: 'warnings',
            description: 'Only warnings',
          },
        ]
      case 'terminal':
        return [
          {
            type: 'terminal',
            text: '@terminal:latest',
            value: 'latest',
            description: 'Latest terminal output',
          },
          {
            type: 'terminal',
            text: '@terminal:all',
            value: 'all',
            description: 'All terminal history',
          },
        ]
      case 'git':
        return [
          {
            type: 'git',
            text: '@git:status',
            value: 'status',
            description: 'Git status',
          },
          {
            type: 'git',
            text: '@git:diff',
            value: 'diff',
            description: 'Git diff (unstaged)',
          },
          {
            type: 'git',
            text: '@git:staged',
            value: 'staged',
            description: 'Git diff (staged)',
          },
        ]
      default:
        return []
    }
  }

  /**
   * Get file suggestions (requests from extension)
   */
  private async getFileSuggestions(query: string): Promise<MentionSuggestion[]> {
    const files = await workspaceService.searchFiles(query, 10)

    return files.map((file) => ({
      type: 'file' as MentionType,
      text: `@file:${file.relativePath}`,
      value: file.relativePath,
      description: file.name,
      path: file.relativePath,
      icon: '📄',
    }))
  }

  /**
   * Get folder suggestions (requests from extension)
   */
  private async getFolderSuggestions(query: string): Promise<MentionSuggestion[]> {
    const folders = await workspaceService.searchFolders(query, 10)

    return folders.map((folder) => ({
      type: 'folder' as MentionType,
      text: `@folder:${folder.relativePath}`,
      value: folder.relativePath,
      description: folder.name,
      path: folder.relativePath,
      icon: '📁',
    }))
  }

  /**
   * Resolve mention to actual context
   */
  async resolveContext(mention: Mention): Promise<MentionContext> {
    switch (mention.type) {
      case 'file':
        return this.resolveFile(mention.value)
      case 'folder':
        return this.resolveFolder(mention.value)
      case 'problems':
        return this.resolveProblems(mention.value)
      case 'terminal':
        return this.resolveTerminal(mention.value)
      case 'git':
        return this.resolveGit(mention.value)
      case 'url':
        return this.resolveUrl(mention.value)
      case 'code':
        return this.resolveCode(mention.value)
      default:
        throw new Error(`Unknown mention type: ${mention.type}`)
    }
  }

  /**
   * Resolve file mention
   */
  private async resolveFile(path: string): Promise<MentionContext> {
    try {
      const content = await workspaceService.getFileContent(path)

      // Detect language from file extension
      const ext = path.split('.').pop()?.toLowerCase() || ''
      const languageMap: Record<string, string> = {
        ts: 'typescript',
        tsx: 'typescript',
        js: 'javascript',
        jsx: 'javascript',
        py: 'python',
        java: 'java',
        cpp: 'cpp',
        c: 'c',
        cs: 'csharp',
        go: 'go',
        rs: 'rust',
        rb: 'ruby',
        php: 'php',
        html: 'html',
        css: 'css',
        json: 'json',
        md: 'markdown',
        yml: 'yaml',
        yaml: 'yaml',
      }

      return {
        content: content || `// File: ${path}\n// (Empty or could not load)`,
        contentType: 'code',
        language: languageMap[ext] || ext,
        path,
      }
    } catch (error) {
      return {
        content: `// File: ${path}\n// Error loading file: ${error}`,
        contentType: 'code',
        path,
      }
    }
  }

  /**
   * Resolve folder mention
   */
  private async resolveFolder(path: string): Promise<MentionContext> {
    return {
      content: `Folder: ${path}\n(File tree will be loaded)`,
      contentType: 'text',
      path,
    }
  }

  /**
   * Resolve problems mention
   */
  private async resolveProblems(filter: string): Promise<MentionContext> {
    return {
      content: `Problems (${filter})\n(Problems will be loaded from workspace)`,
      contentType: 'text',
    }
  }

  /**
   * Resolve terminal mention
   */
  private async resolveTerminal(filter: string): Promise<MentionContext> {
    return {
      content: `Terminal Output (${filter})\n(Terminal content will be loaded)`,
      contentType: 'text',
    }
  }

  /**
   * Resolve git mention
   */
  private async resolveGit(command: string): Promise<MentionContext> {
    return {
      content: `Git ${command}\n(Git information will be loaded)`,
      contentType: 'code',
      language: 'diff',
    }
  }

  /**
   * Resolve URL mention
   */
  private async resolveUrl(url: string): Promise<MentionContext> {
    return {
      content: `URL: ${url}\n(Content will be fetched)`,
      contentType: 'text',
    }
  }

  /**
   * Resolve code selection mention
   */
  private async resolveCode(identifier: string): Promise<MentionContext> {
    return {
      content: `Code Selection: ${identifier}\n(Code will be loaded)`,
      contentType: 'code',
    }
  }

  /**
   * Replace mentions in text with their resolved context
   */
  async replaceMentions(text: string): Promise<string> {
    const mentions = this.parse(text)

    if (mentions.length === 0) {
      return text
    }

    let result = text
    const replacements: Array<{ start: number; end: number; content: string }> = []

    // Resolve all mentions
    for (const mention of mentions) {
      try {
        const context = await this.resolveContext(mention)
        replacements.push({
          start: mention.start,
          end: mention.end,
          content: `\n\n---\n${context.content}\n---\n`,
        })
      } catch (error) {
        console.error(`[Mentions] Failed to resolve ${mention.text}:`, error)
      }
    }

    // Apply replacements in reverse order to maintain positions
    replacements.reverse().forEach((replacement) => {
      result =
        result.slice(0, replacement.start) + replacement.content + result.slice(replacement.end)
    })

    return result
  }
}

// Singleton instance
export const mentionService = new MentionServiceImpl()
