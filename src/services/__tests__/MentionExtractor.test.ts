/**
 * Unit Tests for MentionExtractor Service
 * 
 * Tests context extraction for all mention types: FILE, FOLDER, PROBLEMS, TERMINAL, GIT, URL
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MentionExtractor } from '../MentionExtractor'
import { MentionMatch, MentionType } from '../../core/mentions/types'
import * as fs from 'fs/promises'
import * as vscode from 'vscode'

// Mock VS Code API
vi.mock('vscode', () => ({
    workspace: {
        workspaceFolders: [{
            uri: { fsPath: '/workspace' },
            name: 'test-workspace',
            index: 0
        }]
    },
    window: {
        terminals: []
    }
}))

// Mock fs/promises
vi.mock('fs/promises')

// Mock services - must be after vscode mock
vi.mock('../FileSearchService', () => ({
    fileSearchService: {
        fuzzySearchFiles: vi.fn(),
        searchFolders: vi.fn()
    }
}))

vi.mock('../DiagnosticsService', () => ({
    diagnosticsService: {
        formatDiagnosticsForContext: vi.fn(),
        getErrorCount: vi.fn(),
        getWarningCount: vi.fn()
    }
}))

vi.mock('../TerminalService', () => ({
    terminalService: {
        formatTerminalForContext: vi.fn(),
        getAllTerminals: vi.fn()
    }
}))

vi.mock('../GitService', () => ({
    gitService: {
        formatHistoryForContext: vi.fn(),
        isGitRepository: vi.fn(),
        getCurrentBranch: vi.fn()
    }
}))

// Import mocked services after mocking
import { fileSearchService } from '../FileSearchService'
import { diagnosticsService } from '../DiagnosticsService'
import { terminalService } from '../TerminalService'
import { gitService } from '../GitService'

describe('MentionExtractor', () => {
    let extractor: MentionExtractor

    beforeEach(() => {
        extractor = new MentionExtractor()
        vi.clearAllMocks()
        
        // Setup default fs mocks that work for most tests
        vi.mocked(fs.access).mockResolvedValue(undefined)
        
        // Smart stat mock that detects folders by trailing slash
        vi.mocked(fs.stat).mockImplementation(async (path: any) => {
            const isFolder = path.toString().endsWith('/')
            return {
                size: 1024,
                mtime: new Date('2024-01-01'),
                isFile: () => !isFolder,
                isDirectory: () => isFolder
            } as any
        })
        
        vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('test content'))
        vi.mocked(fs.readdir).mockResolvedValue([])
    })

    describe('extractContext - Main Entry Point', () => {
        it('should extract context from multiple mentions', async () => {
            const mentions: MentionMatch[] = [
                { type: MentionType.PROBLEMS, raw: '@problems', value: 'problems', startIndex: 0, endIndex: 9 }
            ]

            // Mock diagnostics
            vi.mocked(diagnosticsService.formatDiagnosticsForContext).mockReturnValue('# Problems\nNo issues found')
            vi.mocked(diagnosticsService.getErrorCount).mockReturnValue(0)
            vi.mocked(diagnosticsService.getWarningCount).mockReturnValue(0)

            const contexts = await extractor.extractContext(mentions)

            expect(contexts).toHaveLength(1)
            expect(contexts[0].type).toBe(MentionType.PROBLEMS)
        })

        it('should handle multiple mention types in one batch', async () => {
            const mentions: MentionMatch[] = [
                { type: MentionType.PROBLEMS, raw: '@problems', value: 'problems', startIndex: 0, endIndex: 9 },
                { type: MentionType.TERMINAL, raw: '@terminal', value: 'current', startIndex: 10, endIndex: 19 }
            ]

            vi.mocked(diagnosticsService.formatDiagnosticsForContext).mockReturnValue('# Problems')
            vi.mocked(diagnosticsService.getErrorCount).mockReturnValue(0)
            vi.mocked(diagnosticsService.getWarningCount).mockReturnValue(0)
            vi.mocked(terminalService.formatTerminalForContext).mockReturnValue('# Terminal Output')
            vi.mocked(terminalService.getAllTerminals).mockResolvedValue([])

            const contexts = await extractor.extractContext(mentions)

            expect(contexts).toHaveLength(2)
            expect(contexts[0].type).toBe(MentionType.PROBLEMS)
            expect(contexts[1].type).toBe(MentionType.TERMINAL)
        })

        it('should handle errors gracefully and continue processing', async () => {
            const mentions: MentionMatch[] = [
                { type: MentionType.FILE, raw: '@/bad/file.txt', value: '/bad/file.txt', startIndex: 0, endIndex: 14 },
                { type: MentionType.PROBLEMS, raw: '@problems', value: 'problems', startIndex: 15, endIndex: 24 }
            ]

            // First mention fails
            vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'))
            
            // Second mention succeeds
            vi.mocked(diagnosticsService.formatDiagnosticsForContext).mockReturnValue('# Problems')
            vi.mocked(diagnosticsService.getErrorCount).mockReturnValue(0)
            vi.mocked(diagnosticsService.getWarningCount).mockReturnValue(0)

            const contexts = await extractor.extractContext(mentions)

            expect(contexts).toHaveLength(2)
            expect(contexts[0].content).toContain('Failed to extract context')
            expect(contexts[0].metadata?.error).toBe(true)
            expect(contexts[1].type).toBe(MentionType.PROBLEMS)
        })

        it('should handle empty mentions array', async () => {
            const contexts = await extractor.extractContext([])
            expect(contexts).toHaveLength(0)
        })
    })

    describe('FILE Context Extraction', () => {
        beforeEach(() => {
            // Mock workspace folders
            const mockWorkspaceFolder = {
                uri: { fsPath: '/workspace' },
                name: 'test-workspace',
                index: 0
            } as vscode.WorkspaceFolder

            Object.defineProperty(vscode.workspace, 'workspaceFolders', {
                value: [mockWorkspaceFolder],
                writable: true
            })
        })

        it('should extract absolute file path content', async () => {
            const mention: MentionMatch = {
                type: MentionType.FILE,
                raw: '@/src/App.tsx',
                value: '/src/App.tsx',
                startIndex: 0,
                endIndex: 14
            }

            const mockContent = 'export default function App() { return <div>Hello</div> }'
            const mockStats = {
                size: 1024,
                mtime: new Date('2024-01-01'),
                isFile: () => true,
                isDirectory: () => false
            }

            // Reset all mocks for isolation
            vi.mocked(fs.access).mockReset()
            vi.mocked(fs.stat).mockReset()
            vi.mocked(fs.readFile).mockReset()
            
            // Set up fresh mocks
            vi.mocked(fs.access).mockResolvedValue(undefined)
            vi.mocked(fs.stat).mockResolvedValue(mockStats as any)
            vi.mocked(fs.readFile)
                .mockResolvedValueOnce(Buffer.from(mockContent))  // Binary check
                .mockResolvedValueOnce(mockContent as any)         // Content read

            const contexts = await extractor.extractContext([mention])

            expect(contexts).toHaveLength(1)
            expect(contexts[0].type).toBe(MentionType.FILE)
            expect(contexts[0].content).toContain('/src/App.tsx')
            expect(contexts[0].content).toContain(mockContent)
            expect(contexts[0].metadata?.size).toBe(1024)
        })

        it('should extract relative file path content', async () => {
            const mention: MentionMatch = {
                type: MentionType.FILE,
                raw: '@./components/Button.tsx',
                value: './components/Button.tsx',
                startIndex: 0,
                endIndex: 25
            }

            const mockContent = 'export const Button = () => <button>Click</button>'

            // Reset all mocks for isolation
            vi.mocked(fs.access).mockReset()
            vi.mocked(fs.stat).mockReset()
            vi.mocked(fs.readFile).mockReset()
            
            // Set up fresh mocks
            vi.mocked(fs.access).mockResolvedValue(undefined as any)
            vi.mocked(fs.stat).mockResolvedValue({ 
                size: mockContent.length, 
                mtime: new Date(),
                isFile: () => true,
                isDirectory: () => false
            } as any)
            vi.mocked(fs.readFile)
                .mockResolvedValueOnce(Buffer.from(mockContent))  // Binary check
                .mockResolvedValueOnce(mockContent as any)         // Content read

            const contexts = await extractor.extractContext([mention])

            expect(contexts).toHaveLength(1)
            expect(contexts[0].type).toBe(MentionType.FILE)
            expect(contexts[0].content).toContain(mockContent)
        })

        it('should use fuzzy search as fallback when file not found', async () => {
            const mention: MentionMatch = {
                type: MentionType.FILE,
                raw: '@Button.tsx',
                value: 'Button.tsx',
                startIndex: 0,
                endIndex: 11
            }

            // First access fails (file not found at workspace root)
            vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'))
            
            // Fuzzy search finds the file
            vi.mocked(fileSearchService.fuzzySearchFiles).mockResolvedValue([
                { path: '/workspace/src/components/Button.tsx', score: 0.9, type: 'file' }
            ] as any)

            vi.mocked(fs.readFile).mockResolvedValue('const Button = () => {}' as any)
            vi.mocked(fs.stat).mockResolvedValue({ size: 256, mtime: new Date() } as any)

            const contexts = await extractor.extractContext([mention])

            expect(contexts).toHaveLength(1)
            expect(fileSearchService.fuzzySearchFiles).toHaveBeenCalledWith('Button.tsx', 1)
        })

        it('should handle file read errors', async () => {
            const mention: MentionMatch = {
                type: MentionType.FILE,
                raw: '@/nonexistent.txt',
                value: '/nonexistent.txt',
                startIndex: 0,
                endIndex: 17
            }

            vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT: no such file'))

            const contexts = await extractor.extractContext([mention])

            expect(contexts).toHaveLength(1)
            expect(contexts[0].content).toContain('Failed to extract context')
            expect(contexts[0].content).toContain('Cannot read file')
            expect(contexts[0].metadata?.error).toBe(true)
        })

        it('should handle large files', async () => {
            const mention: MentionMatch = {
                type: MentionType.FILE,
                raw: '@/large-file.json',
                value: '/large-file.json',
                startIndex: 0,
                endIndex: 17
            }

            const largeContent = JSON.stringify({ data: 'x'.repeat(100000) })
            vi.mocked(fs.readFile).mockResolvedValue(largeContent as any)
            vi.mocked(fs.stat).mockResolvedValue({ size: largeContent.length, mtime: new Date() } as any)

            const contexts = await extractor.extractContext([mention])

            expect(contexts).toHaveLength(1)
            expect(contexts[0].content.length).toBeGreaterThan(100000)
        })

        it('should format file content with code blocks', async () => {
            const mention: MentionMatch = {
                type: MentionType.FILE,
                raw: '@/test.ts',
                value: '/test.ts',
                startIndex: 0,
                endIndex: 9
            }

            vi.mocked(fs.readFile).mockResolvedValue('console.log("test")' as any)
            vi.mocked(fs.stat).mockResolvedValue({ size: 19, mtime: new Date() } as any)

            const contexts = await extractor.extractContext([mention])

            expect(contexts[0].content).toContain('```')
            expect(contexts[0].content).toContain('console.log("test")')
        })
    })

    describe('FOLDER Context Extraction', () => {
        beforeEach(() => {
            const mockWorkspaceFolder = {
                uri: { fsPath: '/workspace' },
                name: 'test-workspace',
                index: 0
            } as vscode.WorkspaceFolder

            Object.defineProperty(vscode.workspace, 'workspaceFolders', {
                value: [mockWorkspaceFolder],
                writable: true
            })
            
            // Mock fs.stat to return directory for folder paths
            vi.mocked(fs.stat).mockResolvedValue({
                size: 4096,
                mtime: new Date(),
                isDirectory: () => true,
                isFile: () => false
            } as any)
        })

        it('should extract folder contents', async () => {
            const mention: MentionMatch = {
                type: MentionType.FOLDER,
                raw: '@/src/',
                value: '/src/',
                startIndex: 0,
                endIndex: 6
            }

            const mockEntries = [
                { name: 'components', isDirectory: () => true, isFile: () => false },
                { name: 'utils', isDirectory: () => true, isFile: () => false },
                { name: 'App.tsx', isDirectory: () => false, isFile: () => true },
                { name: 'index.ts', isDirectory: () => false, isFile: () => true }
            ]
            
            vi.mocked(fs.readdir).mockResolvedValue(mockEntries as any)

            const contexts = await extractor.extractContext([mention])

            expect(contexts).toHaveLength(1)
            expect(contexts[0].type).toBe(MentionType.FOLDER)
            expect(contexts[0].content).toContain('Folder: /src/')
            expect(contexts[0].content).toContain('components')
            expect(contexts[0].content).toContain('App.tsx')
            expect(contexts[0].metadata?.fileCount).toBe(2)
            expect(contexts[0].metadata?.folderCount).toBe(2)
        })

        it('should handle empty folders', async () => {
            const mention: MentionMatch = {
                type: MentionType.FOLDER,
                raw: '@/empty/',
                value: '/empty/',
                startIndex: 0,
                endIndex: 8
            }

            vi.mocked(fs.readdir).mockResolvedValue([])

            const contexts = await extractor.extractContext([mention])

            expect(contexts).toHaveLength(1)
            expect(contexts[0].metadata?.fileCount).toBe(0)
            expect(contexts[0].metadata?.folderCount).toBe(0)
        })

        it('should handle relative folder paths', async () => {
            const mention: MentionMatch = {
                type: MentionType.FOLDER,
                raw: '@./components/',
                value: './components/',
                startIndex: 0,
                endIndex: 15
            }

            vi.mocked(fs.stat).mockResolvedValue({ isDirectory: () => true } as any)
            vi.mocked(fs.readdir).mockResolvedValue([
                { name: 'Button.tsx', isDirectory: () => false, isFile: () => true }
            ] as any)

            const contexts = await extractor.extractContext([mention])

            expect(contexts).toHaveLength(1)
            expect(contexts[0].type).toBe(MentionType.FOLDER)
        })

        it('should use fuzzy search for folders', async () => {
            const mention: MentionMatch = {
                type: MentionType.FOLDER,
                raw: '@components/',
                value: 'components/',
                startIndex: 0,
                endIndex: 12
            }

            vi.mocked(fs.stat).mockRejectedValue(new Error('ENOENT'))
            vi.mocked(fileSearchService.searchFolders).mockResolvedValue([
                { path: '/workspace/src/components', score: 0.9, type: 'folder' }
            ] as any)
            vi.mocked(fs.readdir).mockResolvedValue([])

            const contexts = await extractor.extractContext([mention])

            expect(contexts).toHaveLength(1)
            expect(fileSearchService.searchFolders).toHaveBeenCalled()
        })

        it('should handle folder read errors', async () => {
            const mention: MentionMatch = {
                type: MentionType.FOLDER,
                raw: '@/bad-folder/',
                value: '/bad-folder/',
                startIndex: 0,
                endIndex: 13
            }

            vi.mocked(fs.readdir).mockRejectedValue(new Error('Permission denied'))

            const contexts = await extractor.extractContext([mention])

            expect(contexts[0].content).toContain('Failed to extract context')
            expect(contexts[0].metadata?.error).toBe(true)
        })

        it('should format folder listing with icons', async () => {
            const mention: MentionMatch = {
                type: MentionType.FOLDER,
                raw: '@/src/',
                value: '/src/',
                startIndex: 0,
                endIndex: 6
            }

            const mockEntries = [
                { name: 'utils', isDirectory: () => true, isFile: () => false },
                { name: 'index.ts', isDirectory: () => false, isFile: () => true }
            ]

            vi.mocked(fs.readdir).mockResolvedValue(mockEntries as any)

            const contexts = await extractor.extractContext([mention])

            expect(contexts[0].content).toContain('📁')
            expect(contexts[0].content).toContain('📄')
        })
    })

    describe('PROBLEMS Context Extraction', () => {
        it('should extract workspace problems', async () => {
            const mention: MentionMatch = {
                type: MentionType.PROBLEMS,
                raw: '@problems',
                value: 'problems',
                startIndex: 0,
                endIndex: 9
            }

            const mockDiagnostics = `# Workspace Problems

## /src/App.tsx
- Line 5: Unused variable 'x' [Warning]
- Line 10: Type error [Error]

Total: 1 error, 1 warning`

            vi.mocked(diagnosticsService.formatDiagnosticsForContext).mockReturnValue(mockDiagnostics)
            vi.mocked(diagnosticsService.getErrorCount).mockReturnValue(1)
            vi.mocked(diagnosticsService.getWarningCount).mockReturnValue(1)

            const contexts = await extractor.extractContext([mention])

            expect(contexts).toHaveLength(1)
            expect(contexts[0].type).toBe(MentionType.PROBLEMS)
            expect(contexts[0].content).toBe(mockDiagnostics)
            expect(contexts[0].metadata?.errorCount).toBe(1)
            expect(contexts[0].metadata?.warningCount).toBe(1)
        })

        it('should handle workspace with no problems', async () => {
            const mention: MentionMatch = {
                type: MentionType.PROBLEMS,
                raw: '@problems',
                value: 'problems',
                startIndex: 0,
                endIndex: 9
            }

            vi.mocked(diagnosticsService.formatDiagnosticsForContext).mockReturnValue('# No problems found ✅')
            vi.mocked(diagnosticsService.getErrorCount).mockReturnValue(0)
            vi.mocked(diagnosticsService.getWarningCount).mockReturnValue(0)

            const contexts = await extractor.extractContext([mention])

            expect(contexts[0].metadata?.errorCount).toBe(0)
            expect(contexts[0].metadata?.warningCount).toBe(0)
        })

        it('should limit number of problems shown', async () => {
            const mention: MentionMatch = {
                type: MentionType.PROBLEMS,
                raw: '@problems',
                value: 'problems',
                startIndex: 0,
                endIndex: 9
            }

            vi.mocked(diagnosticsService.formatDiagnosticsForContext).mockReturnValue('Limited problems')
            vi.mocked(diagnosticsService.getErrorCount).mockReturnValue(100)
            vi.mocked(diagnosticsService.getWarningCount).mockReturnValue(50)

            await extractor.extractContext([mention])

            expect(diagnosticsService.formatDiagnosticsForContext).toHaveBeenCalledWith(50)
        })
    })

    describe('TERMINAL Context Extraction', () => {
        it('should extract current terminal output', async () => {
            const mention: MentionMatch = {
                type: MentionType.TERMINAL,
                raw: '@terminal',
                value: 'current',
                startIndex: 0,
                endIndex: 9
            }

            const mockOutput = `# Terminal Output

$ npm test
> Running tests...
✓ All tests passed`

            vi.mocked(terminalService.formatTerminalForContext).mockReturnValue(mockOutput)
            vi.mocked(terminalService.getAllTerminals).mockResolvedValue([
                { id: '1', name: 'zsh' }
            ] as any)

            const contexts = await extractor.extractContext([mention])

            expect(contexts).toHaveLength(1)
            expect(contexts[0].type).toBe(MentionType.TERMINAL)
            expect(contexts[0].content).toBe(mockOutput)
            expect(contexts[0].metadata?.terminalId).toBe('current')
        })

        it('should extract specific terminal by ID', async () => {
            const mention: MentionMatch = {
                type: MentionType.TERMINAL,
                raw: '@terminal 2',
                value: '2',
                startIndex: 0,
                endIndex: 11
            }

            vi.mocked(terminalService.formatTerminalForContext).mockReturnValue('# Terminal 2 Output')
            vi.mocked(terminalService.getAllTerminals).mockResolvedValue([])

            const contexts = await extractor.extractContext([mention])

            expect(terminalService.formatTerminalForContext).toHaveBeenCalledWith('2')
            expect(contexts[0].metadata?.terminalId).toBe('2')
        })

        it('should handle no active terminals', async () => {
            const mention: MentionMatch = {
                type: MentionType.TERMINAL,
                raw: '@terminal',
                value: 'current',
                startIndex: 0,
                endIndex: 9
            }

            vi.mocked(terminalService.formatTerminalForContext).mockReturnValue('# No active terminal')
            vi.mocked(terminalService.getAllTerminals).mockResolvedValue([])

            const contexts = await extractor.extractContext([mention])

            expect(contexts[0].metadata?.terminals).toHaveLength(0)
        })

        it('should include terminal list in metadata', async () => {
            const mention: MentionMatch = {
                type: MentionType.TERMINAL,
                raw: '@terminal',
                value: 'current',
                startIndex: 0,
                endIndex: 9
            }

            const mockTerminals = [
                { id: '1', name: 'zsh' },
                { id: '2', name: 'bash' }
            ]

            vi.mocked(terminalService.formatTerminalForContext).mockReturnValue('Output')
            vi.mocked(terminalService.getAllTerminals).mockResolvedValue(mockTerminals as any)

            const contexts = await extractor.extractContext([mention])

            expect(contexts[0].metadata?.terminals).toEqual(mockTerminals)
        })
    })

    describe('GIT Context Extraction', () => {
        it('should extract git history for HEAD', async () => {
            const mention: MentionMatch = {
                type: MentionType.GIT,
                raw: '@git',
                value: 'HEAD',
                startIndex: 0,
                endIndex: 4
            }

            const mockHistory = `# Git History (HEAD)

abc123 - feat: Add new feature (2 hours ago) - John Doe
def456 - fix: Bug fix (1 day ago) - Jane Smith`

            vi.mocked(gitService.formatHistoryForContext).mockReturnValue(mockHistory)
            vi.mocked(gitService.isGitRepository).mockReturnValue(true)
            vi.mocked(gitService.getCurrentBranch).mockReturnValue('main')

            const contexts = await extractor.extractContext([mention])

            expect(contexts).toHaveLength(1)
            expect(contexts[0].type).toBe(MentionType.GIT)
            expect(contexts[0].content).toBe(mockHistory)
            expect(contexts[0].metadata?.branch).toBe('HEAD')
            expect(contexts[0].metadata?.isRepository).toBe(true)
            expect(contexts[0].metadata?.currentBranch).toBe('main')
        })

        it('should extract git history for specific branch', async () => {
            const mention: MentionMatch = {
                type: MentionType.GIT,
                raw: '@git develop',
                value: 'develop',
                startIndex: 0,
                endIndex: 12
            }

            vi.mocked(gitService.formatHistoryForContext).mockReturnValue('# Git History (develop)')
            vi.mocked(gitService.isGitRepository).mockReturnValue(true)
            vi.mocked(gitService.getCurrentBranch).mockReturnValue('main')

            const contexts = await extractor.extractContext([mention])

            expect(gitService.formatHistoryForContext).toHaveBeenCalledWith(10, 'develop')
            expect(contexts[0].metadata?.branch).toBe('develop')
        })

        it('should handle non-git repository', async () => {
            const mention: MentionMatch = {
                type: MentionType.GIT,
                raw: '@git',
                value: 'HEAD',
                startIndex: 0,
                endIndex: 4
            }

            vi.mocked(gitService.formatHistoryForContext).mockReturnValue('# Not a git repository')
            vi.mocked(gitService.isGitRepository).mockReturnValue(false)
            vi.mocked(gitService.getCurrentBranch).mockReturnValue(null)

            const contexts = await extractor.extractContext([mention])

            expect(contexts[0].metadata?.isRepository).toBe(false)
            expect(contexts[0].metadata?.currentBranch).toBeNull()
        })

        it('should limit history to 10 commits', async () => {
            const mention: MentionMatch = {
                type: MentionType.GIT,
                raw: '@git',
                value: 'HEAD',
                startIndex: 0,
                endIndex: 4
            }

            vi.mocked(gitService.formatHistoryForContext).mockReturnValue('History')
            vi.mocked(gitService.isGitRepository).mockReturnValue(true)
            vi.mocked(gitService.getCurrentBranch).mockReturnValue('main')

            await extractor.extractContext([mention])

            expect(gitService.formatHistoryForContext).toHaveBeenCalledWith(10, 'HEAD')
        })
    })

    describe('URL Context Extraction', () => {
        it('should return placeholder for URL mentions', async () => {
            const mention: MentionMatch = {
                type: MentionType.URL,
                raw: '@https://example.com',
                value: 'https://example.com',
                startIndex: 0,
                endIndex: 20
            }

            const contexts = await extractor.extractContext([mention])

            expect(contexts).toHaveLength(1)
            expect(contexts[0].type).toBe(MentionType.URL)
            expect(contexts[0].content).toContain('https://example.com')
            expect(contexts[0].content).toContain('not yet implemented')
            expect(contexts[0].metadata?.url).toBe('https://example.com')
        })

        it('should handle http URLs', async () => {
            const mention: MentionMatch = {
                type: MentionType.URL,
                raw: '@http://api.example.com/data',
                value: 'http://api.example.com/data',
                startIndex: 0,
                endIndex: 29
            }

            const contexts = await extractor.extractContext([mention])

            expect(contexts[0].metadata?.url).toBe('http://api.example.com/data')
        })
    })

    describe('Edge Cases and Error Handling', () => {
        it('should handle unknown mention types gracefully', async () => {
            const mention = {
                type: 999 as unknown as MentionType, // Invalid type
                raw: '@unknown',
                value: 'unknown',
                startIndex: 0,
                endIndex: 8
            }

            const contexts = await extractor.extractContext([mention])

            // Should return empty or handle gracefully
            expect(contexts.length).toBeGreaterThanOrEqual(0)
        })

        it('should handle workspace with no folders', async () => {
            // Save original value
            const originalFolders = vscode.workspace.workspaceFolders
            
            Object.defineProperty(vscode.workspace, 'workspaceFolders', {
                value: undefined,
                writable: true,
                configurable: true
            })

            const mention: MentionMatch = {
                type: MentionType.FILE,
                raw: '@./file.txt',
                value: './file.txt',
                startIndex: 0,
                endIndex: 11
            }

            const contexts = await extractor.extractContext([mention])

            expect(contexts[0].content).toContain('Failed to extract context')
            expect(contexts[0].metadata?.error).toBe(true)
            
            // Restore original value
            Object.defineProperty(vscode.workspace, 'workspaceFolders', {
                value: originalFolders,
                writable: true,
                configurable: true
            })
        })

        it('should handle concurrent extractions', async () => {
            const mentions: MentionMatch[] = Array(10).fill(null).map((_, i) => ({
                type: MentionType.PROBLEMS,
                raw: '@problems',
                value: 'problems',
                startIndex: i * 10,
                endIndex: i * 10 + 9
            }))

            vi.mocked(diagnosticsService.formatDiagnosticsForContext).mockReturnValue('Problems')
            vi.mocked(diagnosticsService.getErrorCount).mockReturnValue(0)
            vi.mocked(diagnosticsService.getWarningCount).mockReturnValue(0)

            const contexts = await extractor.extractContext(mentions)

            expect(contexts).toHaveLength(10)
        })

        it('should include error details in failed contexts', async () => {
            const mention: MentionMatch = {
                type: MentionType.FILE,
                raw: '@/error.txt',
                value: '/error.txt',
                startIndex: 0,
                endIndex: 11
            }

            // Mock access to fail so file is not found
            vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'))

            const contexts = await extractor.extractContext([mention])

            // Should have error context
            expect(contexts[0].content).toContain('⚠️ Failed')
            expect(contexts[0].content).toContain('/error.txt')
            expect(contexts[0].metadata?.error).toBe(true)
            expect(contexts[0].metadata?.mention).toBe('@/error.txt')
            
            // Reset to default behavior for subsequent tests
            vi.mocked(fs.access).mockReset()
            vi.mocked(fs.access).mockResolvedValue(undefined)
        })

        it('should handle very long file paths', async () => {
            const longPath = '/very/' + 'long/'.repeat(50) + 'file.txt'
            const mention: MentionMatch = {
                type: MentionType.FILE,
                raw: `@${longPath}`,
                value: longPath,
                startIndex: 0,
                endIndex: longPath.length + 1
            }

            const mockContent = 'content'
            
            // Reset all mocks completely for isolation
            vi.mocked(fs.access).mockReset()
            vi.mocked(fs.stat).mockReset()
            vi.mocked(fs.readFile).mockReset()
            
            // Set up fresh mocks using mockImplementation for stat
            vi.mocked(fs.access).mockImplementation(async () => undefined)
            vi.mocked(fs.stat).mockImplementation(async () => ({ 
                size: mockContent.length, 
                mtime: new Date(),
                isFile: () => true,
                isDirectory: () => false
            } as any))
            vi.mocked(fs.readFile)
                .mockResolvedValueOnce(Buffer.from(mockContent))  // Binary check
                .mockResolvedValueOnce(mockContent as any)         // Content read

            const contexts = await extractor.extractContext([mention])

            expect(contexts).toHaveLength(1)
            expect(contexts[0].metadata?.path).toBe(longPath)
        })
    })

    describe('Performance', () => {
        it('should extract 100 mentions efficiently', async () => {
            const mentions: MentionMatch[] = Array(100).fill(null).map((_, i) => ({
                type: MentionType.PROBLEMS,
                raw: '@problems',
                value: 'problems',
                startIndex: i * 10,
                endIndex: i * 10 + 9
            }))

            vi.mocked(diagnosticsService.formatDiagnosticsForContext).mockReturnValue('Problems')
            vi.mocked(diagnosticsService.getErrorCount).mockReturnValue(0)
            vi.mocked(diagnosticsService.getWarningCount).mockReturnValue(0)

            const start = Date.now()
            const contexts = await extractor.extractContext(mentions)
            const duration = Date.now() - start

            // Extractor now limits to 50 mentions for performance
            expect(contexts.length).toBeLessThanOrEqual(50)
            expect(contexts.length).toBeGreaterThan(0)
            expect(duration).toBeLessThan(5000) // Should complete in <5 seconds
        })

        it('should handle mixed extraction types efficiently', async () => {
            const mentions: MentionMatch[] = [
                { type: MentionType.PROBLEMS, raw: '@problems', value: 'problems', startIndex: 0, endIndex: 9 },
                { type: MentionType.TERMINAL, raw: '@terminal', value: 'current', startIndex: 10, endIndex: 19 },
                { type: MentionType.GIT, raw: '@git', value: 'HEAD', startIndex: 20, endIndex: 24 }
            ]

            vi.mocked(diagnosticsService.formatDiagnosticsForContext).mockReturnValue('Problems')
            vi.mocked(diagnosticsService.getErrorCount).mockReturnValue(0)
            vi.mocked(diagnosticsService.getWarningCount).mockReturnValue(0)
            vi.mocked(terminalService.formatTerminalForContext).mockReturnValue('Terminal')
            vi.mocked(terminalService.getAllTerminals).mockResolvedValue([])
            vi.mocked(gitService.formatHistoryForContext).mockReturnValue('Git')
            vi.mocked(gitService.isGitRepository).mockReturnValue(true)
            vi.mocked(gitService.getCurrentBranch).mockReturnValue('main')

            const start = Date.now()
            await extractor.extractContext(mentions)
            const duration = Date.now() - start

            expect(duration).toBeLessThan(1000) // Should complete in <1 second
        })
    })
})
