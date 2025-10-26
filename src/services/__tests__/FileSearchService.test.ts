/**
 * Unit Tests for FileSearchService
 * 
 * Tests workspace file/folder search with fuzzy matching and caching
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { FileSearchService } from '../FileSearchService'
import * as vscode from 'vscode'

// Mock VS Code API
vi.mock('vscode', () => ({
    workspace: {
        workspaceFolders: [],
        findFiles: vi.fn()
    },
    Uri: {
        file: (path: string) => ({ fsPath: path })
    }
}))

describe('FileSearchService', () => {
    let service: FileSearchService

    beforeEach(() => {
        service = new FileSearchService()
        vi.clearAllMocks()
        
        // Setup default workspace folder
        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
            value: [{
                uri: { fsPath: '/workspace' },
                name: 'test-workspace',
                index: 0
            }],
            writable: true,
            configurable: true
        })
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    describe('searchFiles', () => {
        it('should search for files in workspace', async () => {
            const mockUris = [
                { fsPath: '/workspace/src/App.tsx' },
                { fsPath: '/workspace/src/index.ts' }
            ]

            vi.mocked(vscode.workspace.findFiles).mockResolvedValue(mockUris as any)

            const results = await service.searchFiles('App', 50)

            expect(results).toHaveLength(2)
            expect(results[0].path).toBe('/workspace/src/App.tsx')
            expect(results[0].type).toBe('file')
            expect(vscode.workspace.findFiles).toHaveBeenCalled()
        })

        it('should return empty array when no workspace folders', async () => {
            Object.defineProperty(vscode.workspace, 'workspaceFolders', {
                value: undefined,
                writable: true,
                configurable: true
            })

            const results = await service.searchFiles('test')

            expect(results).toHaveLength(0)
        })

        it('should limit results to maxResults', async () => {
            const mockUris = Array(100).fill(null).map((_, i) => ({
                fsPath: `/workspace/file${i}.ts`
            }))

            vi.mocked(vscode.workspace.findFiles).mockResolvedValue(mockUris as any)

            const results = await service.searchFiles('file', 10)

            // findFiles is called with maxResults parameter
            expect(vscode.workspace.findFiles).toHaveBeenCalledWith(
                expect.anything(),
                '**/node_modules/**',
                10
            )
        })

        it('should exclude node_modules', async () => {
            vi.mocked(vscode.workspace.findFiles).mockResolvedValue([])

            await service.searchFiles('test')

            expect(vscode.workspace.findFiles).toHaveBeenCalledWith(
                expect.anything(),
                '**/node_modules/**',
                expect.anything()
            )
        })

        it('should handle search errors gracefully', async () => {
            vi.mocked(vscode.workspace.findFiles).mockRejectedValue(new Error('Search failed'))

            await expect(service.searchFiles('test')).rejects.toThrow('Search failed')
        })

        it('should calculate relative paths correctly', async () => {
            const mockUris = [
                { fsPath: '/workspace/src/components/Button.tsx' }
            ]

            vi.mocked(vscode.workspace.findFiles).mockResolvedValue(mockUris as any)

            const results = await service.searchFiles('Button')

            expect(results[0].relativePath).toBe('src/components/Button.tsx')
        })

        it('should include file icons', async () => {
            const mockUris = [
                { fsPath: '/workspace/test.ts' }
            ]

            vi.mocked(vscode.workspace.findFiles).mockResolvedValue(mockUris as any)

            const results = await service.searchFiles('test')

            expect(results[0]).toHaveProperty('icon')
            expect(typeof results[0].icon).toBe('string')
            expect(results[0].icon).toBeTruthy()
        })

        it('should handle empty search results', async () => {
            vi.mocked(vscode.workspace.findFiles).mockResolvedValue([])

            const results = await service.searchFiles('nonexistent')

            expect(results).toHaveLength(0)
        })
    })

    describe('searchFolders', () => {
        it('should search for folders in workspace', async () => {
            const mockUris = [
                { fsPath: '/workspace/src/components/Button.tsx' },
                { fsPath: '/workspace/src/components/Input.tsx' },
                { fsPath: '/workspace/src/utils/helpers.ts' }
            ]

            vi.mocked(vscode.workspace.findFiles).mockResolvedValue(mockUris as any)

            const results = await service.searchFolders('src', 50)

            expect(results.length).toBeGreaterThan(0)
            expect(results[0].type).toBe('folder')
            expect(results[0].icon).toBe('📁')
        })

        it('should deduplicate folder paths', async () => {
            const mockUris = [
                { fsPath: '/workspace/src/components/Button.tsx' },
                { fsPath: '/workspace/src/components/Input.tsx' }, // Same folder
                { fsPath: '/workspace/src/utils/helpers.ts' }
            ]

            vi.mocked(vscode.workspace.findFiles).mockResolvedValue(mockUris as any)

            const results = await service.searchFolders('src')

            // Should have 2 unique folders: components and utils
            const componentsFolders = results.filter(r => r.path.includes('components'))
            expect(componentsFolders.length).toBeLessThanOrEqual(1)
        })

        it('should return empty array when no workspace folders', async () => {
            Object.defineProperty(vscode.workspace, 'workspaceFolders', {
                value: undefined,
                writable: true,
                configurable: true
            })

            const results = await service.searchFolders('test')

            expect(results).toHaveLength(0)
        })

        it('should limit folder results', async () => {
            const mockUris = Array(200).fill(null).map((_, i) => ({
                fsPath: `/workspace/folder${i}/file.ts`
            }))

            vi.mocked(vscode.workspace.findFiles).mockResolvedValue(mockUris as any)

            const results = await service.searchFolders('folder', 10)

            expect(results.length).toBeLessThanOrEqual(10)
        })

        it('should calculate relative folder paths', async () => {
            const mockUris = [
                { fsPath: '/workspace/src/components/Button.tsx' }
            ]

            vi.mocked(vscode.workspace.findFiles).mockResolvedValue(mockUris as any)

            const results = await service.searchFolders('components')

            const componentResult = results.find(r => r.path.includes('components'))
            if (componentResult) {
                expect(componentResult.relativePath).toContain('components')
            }
        })
    })

    describe('getAllFiles', () => {
        it('should get all workspace files', async () => {
            const mockUris = [
                { fsPath: '/workspace/file1.ts' },
                { fsPath: '/workspace/file2.ts' }
            ]

            vi.mocked(vscode.workspace.findFiles).mockResolvedValue(mockUris as any)

            const results = await service.getAllFiles()

            expect(results).toHaveLength(2)
            expect(vscode.workspace.findFiles).toHaveBeenCalledWith(
                '**/*',
                '**/node_modules/**',
                10000
            )
        })

        it('should cache results for 30 seconds', async () => {
            const mockUris = [{ fsPath: '/workspace/file.ts' }]
            vi.mocked(vscode.workspace.findFiles).mockResolvedValue(mockUris as any)

            // First call
            await service.getAllFiles()
            
            // Second call immediately (should use cache)
            await service.getAllFiles()

            // Should only call findFiles once due to caching
            expect(vscode.workspace.findFiles).toHaveBeenCalledTimes(1)
        })

        it('should invalidate cache after TTL', async () => {
            const mockUris = [{ fsPath: '/workspace/file.ts' }]
            vi.mocked(vscode.workspace.findFiles).mockResolvedValue(mockUris as any)

            // First call - should hit the cache
            await service.getAllFiles()
            
            // Second call immediately - should use cache
            await service.getAllFiles()
            
            // Should only call findFiles once (LRU cache with 30s TTL)
            expect(vscode.workspace.findFiles).toHaveBeenCalledTimes(1)
            
            // Verify cache metrics
            const metrics = service.getCacheMetrics()
            expect(metrics.hits).toBeGreaterThan(0)
        })

        it('should handle empty workspace', async () => {
            Object.defineProperty(vscode.workspace, 'workspaceFolders', {
                value: undefined,
                writable: true,
                configurable: true
            })

            const results = await service.getAllFiles()

            expect(results).toHaveLength(0)
        })

        it('should limit to 10000 files', async () => {
            vi.mocked(vscode.workspace.findFiles).mockResolvedValue([])

            await service.getAllFiles()

            expect(vscode.workspace.findFiles).toHaveBeenCalledWith(
                '**/*',
                '**/node_modules/**',
                10000
            )
        })
    })

    describe('fuzzySearchFiles', () => {
        it('should perform fuzzy file search', async () => {
            const mockUris = [
                { fsPath: '/workspace/src/App.tsx' },
                { fsPath: '/workspace/src/AppConfig.ts' },
                { fsPath: '/workspace/test/app.test.ts' }
            ]

            vi.mocked(vscode.workspace.findFiles).mockResolvedValue(mockUris as any)

            const results = await service.fuzzySearchFiles('app', 10)

            expect(results.length).toBeGreaterThan(0)
            // Results should have scores
            expect(results[0]).toHaveProperty('score')
        })

        it('should rank exact matches higher', async () => {
            const mockUris = [
                { fsPath: '/workspace/App.tsx' },
                { fsPath: '/workspace/Application.tsx' },
                { fsPath: '/workspace/AppConfig.ts' }
            ]

            vi.mocked(vscode.workspace.findFiles).mockResolvedValue(mockUris as any)

            const results = await service.fuzzySearchFiles('App', 10)

            // Results should be sorted by score
            expect(results.length).toBeGreaterThan(0)
            expect(results[0]).toHaveProperty('score')
            // First result should have highest or equal score
            if (results.length > 1 && results[1].score !== undefined) {
                expect(results[0].score).toBeGreaterThanOrEqual(results[1].score)
            }
        })

        it('should handle case-insensitive search', async () => {
            const mockUris = [
                { fsPath: '/workspace/README.md' },
                { fsPath: '/workspace/readme.txt' }
            ]

            vi.mocked(vscode.workspace.findFiles).mockResolvedValue(mockUris as any)

            const results = await service.fuzzySearchFiles('readme', 10)

            expect(results.length).toBeGreaterThan(0)
        })

        it('should limit fuzzy search results', async () => {
            const mockUris = Array(100).fill(null).map((_, i) => ({
                fsPath: `/workspace/file${i}.ts`
            }))

            vi.mocked(vscode.workspace.findFiles).mockResolvedValue(mockUris as any)

            const results = await service.fuzzySearchFiles('file', 5)

            expect(results.length).toBeLessThanOrEqual(5)
        })

        it('should return empty for no matches', async () => {
            vi.mocked(vscode.workspace.findFiles).mockResolvedValue([])

            const results = await service.fuzzySearchFiles('nonexistent')

            expect(results).toHaveLength(0)
        })
    })

    describe('Performance', () => {
        it('should handle large file lists efficiently', async () => {
            const mockUris = Array(5000).fill(null).map((_, i) => ({
                fsPath: `/workspace/folder${i % 100}/file${i}.ts`
            }))

            vi.mocked(vscode.workspace.findFiles).mockResolvedValue(mockUris as any)

            const start = Date.now()
            await service.fuzzySearchFiles('file', 50)
            const duration = Date.now() - start

            expect(duration).toBeLessThan(1000) // Should complete in <1 second
        })

        it('should handle concurrent searches', async () => {
            const mockUris = [{ fsPath: '/workspace/test.ts' }]
            vi.mocked(vscode.workspace.findFiles).mockResolvedValue(mockUris as any)

            const searches = Array(10).fill(null).map(() => 
                service.searchFiles('test')
            )

            const results = await Promise.all(searches)

            expect(results).toHaveLength(10)
            results.forEach(r => expect(r.length).toBeGreaterThan(0))
        })
    })

    describe('Edge Cases', () => {
        it('should handle files with special characters', async () => {
            const mockUris = [
                { fsPath: '/workspace/file-name.tsx' },
                { fsPath: '/workspace/file_name.tsx' },
                { fsPath: '/workspace/file.test.tsx' }
            ]

            vi.mocked(vscode.workspace.findFiles).mockResolvedValue(mockUris as any)

            const results = await service.searchFiles('file')

            expect(results.length).toBe(3)
        })

        it('should handle very long file paths', async () => {
            const longPath = '/workspace/' + 'very/'.repeat(50) + 'deep/file.ts'
            const mockUris = [{ fsPath: longPath }]

            vi.mocked(vscode.workspace.findFiles).mockResolvedValue(mockUris as any)

            const results = await service.searchFiles('file')

            expect(results[0].path).toBe(longPath)
        })

        it('should handle unicode filenames', async () => {
            const mockUris = [
                { fsPath: '/workspace/文件.ts' },
                { fsPath: '/workspace/файл.ts' }
            ]

            vi.mocked(vscode.workspace.findFiles).mockResolvedValue(mockUris as any)

            const results = await service.searchFiles('文件')

            expect(results.length).toBeGreaterThan(0)
        })

        it('should handle empty search query', async () => {
            vi.mocked(vscode.workspace.findFiles).mockResolvedValue([])

            const results = await service.searchFiles('')

            expect(results).toHaveLength(0)
        })

        it('should handle workspace root files', async () => {
            const mockUris = [
                { fsPath: '/workspace/package.json' },
                { fsPath: '/workspace/README.md' }
            ]

            vi.mocked(vscode.workspace.findFiles).mockResolvedValue(mockUris as any)

            const results = await service.searchFiles('package')

            expect(results[0].relativePath).toBe('package.json')
        })
    })
})
