/**
 * Integration Tests for @Mentions System
 * 
 * Tests the complete flow from user input → parsing → extraction → context injection
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { MentionParser } from '../MentionParser'
import { MentionExtractor } from '../../../services/MentionExtractor'
import { MentionType, MentionContext } from '../types'
import * as vscode from 'vscode'
import * as fs from 'fs/promises'

// Mock VS Code API
vi.mock('vscode', () => ({
    workspace: {
        workspaceFolders: [{
            uri: { fsPath: '/test-workspace' },
            name: 'test-workspace',
            index: 0
        }],
        findFiles: vi.fn()
    },
    window: {
        terminals: [],
        onDidOpenTerminal: vi.fn(() => ({ dispose: vi.fn() })),
        onDidCloseTerminal: vi.fn(() => ({ dispose: vi.fn() }))
    },
    languages: {
        getDiagnostics: vi.fn()
    },
    Uri: {
        file: (path: string) => ({ fsPath: path })
    },
    DiagnosticSeverity: {
        Error: 0,
        Warning: 1,
        Information: 2,
        Hint: 3
    }
}))

vi.mock('fs/promises', () => ({
    readFile: vi.fn(),
    stat: vi.fn().mockResolvedValue({
        size: 1000,
        mtime: new Date('2024-01-01'),
        isFile: () => true,
        isDirectory: () => false
    }),
    access: vi.fn().mockResolvedValue(undefined), // File exists check
    readdir: vi.fn().mockResolvedValue([])
}))

describe('Mentions Integration Tests', () => {
    let parser: MentionParser
    let extractor: MentionExtractor

    beforeEach(() => {
        parser = new MentionParser()
        extractor = new MentionExtractor()
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    describe('End-to-End Flow: Parse → Extract → Context', () => {
        it('should handle complete FILE mention flow', async () => {
            // User types: "Check @/src/App.tsx for errors"
            const userInput = 'Check @/src/App.tsx for errors'

            // Step 1: Parse mentions
            const mentions = parser.parseMentions(userInput)

            expect(mentions).toHaveLength(1)
            expect(mentions[0].type).toBe(MentionType.FILE)
            expect(mentions[0].value).toBe('/src/App.tsx')

            // Step 2: Extract context
            const mockFileContent = `import React from 'react'
export default function App() {
    return <div>Hello World</div>
}`

            vi.mocked(fs.readFile).mockResolvedValue(mockFileContent as any)
            vi.mocked(fs.stat).mockResolvedValue({
                size: mockFileContent.length,
                mtime: new Date()
            } as any)

            const contexts = await extractor.extractContext(mentions)

            // Step 3: Verify context for AI
            expect(contexts).toHaveLength(1)
            expect(contexts[0].type).toBe(MentionType.FILE)
            expect(contexts[0].content).toContain('```')
            expect(contexts[0].content).toContain('App.tsx')
            expect(contexts[0].metadata?.path).toBe('/src/App.tsx')
        })

        it('should handle multiple mention types in single message', async () => {
            const userInput = 'Check @/src/App.tsx and look at @terminal output'

            const mentions = parser.parseMentions(userInput)

            expect(mentions).toHaveLength(2)
            expect(mentions[0].type).toBe(MentionType.FILE)
            expect(mentions[1].type).toBe(MentionType.TERMINAL)

            // Mock services
            vi.mocked(fs.readFile).mockResolvedValue('console.log("test")' as any)
            vi.mocked(fs.stat).mockResolvedValue({
                size: 20,
                mtime: new Date()
            } as any)

            const contexts = await extractor.extractContext(mentions)

            expect(contexts).toHaveLength(2)
            expect(contexts[0].type).toBe(MentionType.FILE)
            expect(contexts[1].type).toBe(MentionType.TERMINAL)
        })

        it('should handle FOLDER mention with file listing', async () => {
            const userInput = 'Analyze @/src/components/ folder'

            const mentions = parser.parseMentions(userInput)
            expect(mentions[0].type).toBe(MentionType.FOLDER)

            // Mock findFiles
            vi.mocked(vscode.workspace.findFiles).mockResolvedValue([
                { fsPath: '/src/components/Button.tsx' } as any,
                { fsPath: '/src/components/Card.tsx' } as any
            ])

            const contexts = await extractor.extractContext(mentions)

            expect(contexts[0].type).toBe(MentionType.FOLDER)
            expect(contexts[0].content).toContain('components')
        })

        it('should handle GIT mention with history', async () => {
            const userInput = 'Show me @git src/App.tsx changes'

            const mentions = parser.parseMentions(userInput)
            expect(mentions[0].type).toBe(MentionType.GIT)

            const contexts = await extractor.extractContext(mentions)

            expect(contexts[0].type).toBe(MentionType.GIT)
        })

        it('should handle PROBLEMS mention with diagnostics', async () => {
            const userInput = 'Fix @problems in the project'

            const mentions = parser.parseMentions(userInput)
            expect(mentions[0].type).toBe(MentionType.PROBLEMS)

            // Mock diagnostics
            vi.mocked(vscode.languages.getDiagnostics).mockReturnValue([])

            const contexts = await extractor.extractContext(mentions)

            expect(contexts[0].type).toBe(MentionType.PROBLEMS)
        })

        it('should handle TERMINAL mention with output', async () => {
            const userInput = 'What does @terminal output say?'

            const mentions = parser.parseMentions(userInput)
            expect(mentions[0].type).toBe(MentionType.TERMINAL)

            const contexts = await extractor.extractContext(mentions)

            expect(contexts[0].type).toBe(MentionType.TERMINAL)
        })
    })

    describe('Error Handling in Integration', () => {
        it('should gracefully handle file not found', async () => {
            const userInput = 'Check @/nonexistent.ts'

            const mentions = parser.parseMentions(userInput)

            vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT: file not found'))

            const contexts = await extractor.extractContext(mentions)

            // Should still return a context, possibly with error message in content
            expect(contexts).toHaveLength(1)
            expect(contexts[0].type).toBe(MentionType.FILE)
        })

        it('should continue processing after one mention fails', async () => {
            const userInput = 'Check @/bad.ts and @/good.ts'

            const mentions = parser.parseMentions(userInput)

            // Mock fs.access to fail for bad.ts, succeed for good.ts
            vi.mocked(fs.access)
                .mockRejectedValueOnce(new Error('ENOENT'))  // bad.ts fails
                .mockResolvedValue(undefined)  // good.ts succeeds

            vi.mocked(fs.stat)
                .mockResolvedValue({
                    size: 10,
                    mtime: new Date(),
                    isFile: () => true,
                    isDirectory: () => false
                } as any)

            const goodContent = 'const x = 1'
            vi.mocked(fs.readFile)
                .mockResolvedValueOnce(Buffer.from(goodContent))  // Binary check
                .mockResolvedValueOnce(goodContent as any)  // Actual content read

            const contexts = await extractor.extractContext(mentions)

            // Should get 2 contexts (one error, one success)
            expect(contexts).toHaveLength(2)
            
            // First context should be an error
            expect(contexts[0].content).toContain('⚠️ Failed')
            
            // Second context should have actual content
            expect(contexts[1].content).toContain(goodContent)
        })

        it('should handle empty mention values', async () => {
            const userInput = 'Check @ and @/ files'

            const mentions = parser.parseMentions(userInput)

            // Parser should filter invalid mentions
            const validMentions = mentions.filter(m => m.value && m.value.length > 0)

            const contexts = await extractor.extractContext(validMentions)

            // All contexts should have content
            contexts.forEach((ctx: MentionContext) => {
                expect(ctx.content).toBeTruthy()
                expect(ctx.type).toBeDefined()
            })
        })

        it('should handle very long input with many mentions', async () => {
            const mentionStrings = Array(100).fill(null).map((_, i) => `@/file${i}.ts`)
            const userInput = `Check ${mentionStrings.join(' ')} for issues`

            const mentions = parser.parseMentions(userInput)

            expect(mentions.length).toBeLessThanOrEqual(100)
        })

        it('should handle extraction timeout scenarios', async () => {
            const userInput = 'Check @/slow.ts'

            const mentions = parser.parseMentions(userInput)

            vi.mocked(fs.readFile).mockImplementation(() =>
                new Promise((resolve) => setTimeout(() => resolve('content' as any), 100))
            )

            const contexts = await extractor.extractContext(mentions)

            expect(contexts).toHaveLength(1)
        })
    })

    describe('Context Format for AI', () => {
        it('should format FILE context for AI consumption', async () => {
            const userInput = '@/src/utils.ts'

            const mentions = parser.parseMentions(userInput)

            const mockCode = `export function add(a: number, b: number) {
    return a + b
}`

            vi.mocked(fs.readFile).mockResolvedValue(mockCode as any)
            vi.mocked(fs.stat).mockResolvedValue({
                size: mockCode.length,
                mtime: new Date()
            } as any)

            const contexts = await extractor.extractContext(mentions)

            const fileContext = contexts[0]

            // Should have markdown code blocks
            expect(fileContext.content).toMatch(/```[\s\S]*?```/)

            // Should include file path
            expect(fileContext.content).toContain('utils.ts')

            // Should include metadata
            expect(fileContext.metadata).toBeDefined()
        })

        it('should format FOLDER context with structure', async () => {
            const userInput = '@/src/ folder'

            const mentions = parser.parseMentions(userInput)

            vi.mocked(vscode.workspace.findFiles).mockResolvedValue([
                { fsPath: '/src/index.ts' } as any,
                { fsPath: '/src/utils.ts' } as any,
                { fsPath: '/src/types.ts' } as any
            ])

            const contexts = await extractor.extractContext(mentions)

            const folderContext = contexts[0]

            // Should list files
            expect(folderContext.content).toBeTruthy()
        })

        it('should format PROBLEMS context with severity', async () => {
            const userInput = '@problems'

            const mentions = parser.parseMentions(userInput)

            vi.mocked(vscode.languages.getDiagnostics).mockReturnValue([
                [
                    { fsPath: '/test.ts' } as any,
                    [
                        {
                            severity: 0,
                            message: 'Error message',
                            range: {} as any
                        } as any
                    ]
                ]
            ])

            const contexts = await extractor.extractContext(mentions)

            expect(contexts[0].type).toBe(MentionType.PROBLEMS)
        })

        it('should include metadata for AI decision making', async () => {
            const userInput = '@/large-file.ts'

            const mentions = parser.parseMentions(userInput)

            const largeContent = 'x'.repeat(100000)

            vi.mocked(fs.readFile).mockResolvedValue(largeContent as any)

            const contexts = await extractor.extractContext(mentions)

            const metadata = contexts[0].metadata

            expect(metadata).toBeDefined()
            expect(metadata?.path).toBe('/large-file.ts')
        })
    })

    describe('Real-World Scenarios', () => {
        it('should handle code review request', async () => {
            const userInput = 'Review @/src/UserService.ts for potential bugs'

            const mentions = parser.parseMentions(userInput)

            const mockService = `class UserService {
    async getUser(id: string) {
        // Bug: no error handling
        return fetch('/api/user/' + id).then(r => r.json())
    }
}`

            vi.mocked(fs.readFile).mockResolvedValue(mockService as any)

            const contexts = await extractor.extractContext(mentions)

            expect(contexts[0].content).toContain('UserService')
            expect(contexts[0].content).toContain('getUser')
        })

        it('should handle debugging request', async () => {
            const userInput = 'Why is @/src/Calculator.ts failing? Check @problems and @terminal output'

            const mentions = parser.parseMentions(userInput)

            // Parser may find 2 or 3 mentions depending on implementation
            expect(mentions.length).toBeGreaterThanOrEqual(2)
            expect(mentions[0].type).toBe(MentionType.FILE)

            vi.mocked(fs.readFile).mockResolvedValue('function add() {}' as any)
            vi.mocked(vscode.languages.getDiagnostics).mockReturnValue([])

            const contexts = await extractor.extractContext(mentions)

            expect(contexts.length).toBeGreaterThan(0)
        })

        it('should handle folder analysis request', async () => {
            const userInput = 'What is the purpose of @/src/components/ folder?'

            const mentions = parser.parseMentions(userInput)

            vi.mocked(vscode.workspace.findFiles).mockResolvedValue([
                { fsPath: '/src/components/Button.tsx' } as any,
                { fsPath: '/src/components/Input.tsx' } as any,
                { fsPath: '/src/components/Card.tsx' } as any
            ])

            const contexts = await extractor.extractContext(mentions)

            expect(contexts.length).toBeGreaterThan(0)
            if (contexts[0]) {
                expect(contexts[0].type).toBe(MentionType.FOLDER)
            }
        })

        it('should handle test failure investigation', async () => {
            const userInput = 'Test failing in @/src/utils.test.ts, check @problems and @git src/utils.ts history'

            const mentions = parser.parseMentions(userInput)

            expect(mentions.length).toBeGreaterThanOrEqual(2)

            vi.mocked(fs.readFile).mockResolvedValue('test("add", () => {})' as any)
            vi.mocked(vscode.languages.getDiagnostics).mockReturnValue([])

            const contexts = await extractor.extractContext(mentions)

            expect(contexts.length).toBeGreaterThan(0)
        })

        it('should handle refactoring discussion', async () => {
            const userInput = 'Should we split @/src/LargeComponent.tsx? It has @problems'

            const mentions = parser.parseMentions(userInput)

            expect(mentions).toHaveLength(2)

            const largeComponent = 'export default function LargeComponent() {\n' + '  // 500 lines\n}'.repeat(100)

            vi.mocked(fs.readFile).mockResolvedValue(largeComponent as any)
            vi.mocked(vscode.languages.getDiagnostics).mockReturnValue([])

            const contexts = await extractor.extractContext(mentions)

            expect(contexts[0].metadata).toBeDefined()
            if (contexts[0].metadata?.path) {
                expect(contexts[0].metadata.path).toContain('LargeComponent.tsx')
            }
        })
    })

    describe('Performance at Scale', () => {
        it('should handle 50 file mentions in reasonable time', async () => {
            const mentions = Array(50).fill(null).map((_, i) => ({
                type: MentionType.FILE,
                value: `/src/file${i}.ts`,
                raw: `@/src/file${i}.ts`,
                startIndex: i * 20,
                endIndex: i * 20 + 15
            }))

            vi.mocked(fs.readFile).mockResolvedValue('const x = 1' as any)

            const start = Date.now()
            const contexts = await extractor.extractContext(mentions)
            const duration = Date.now() - start

            expect(contexts).toHaveLength(50)
            expect(duration).toBeLessThan(3000) // Should complete in < 3s
        })

        it('should handle mixed mention types efficiently', async () => {
            const mentions = [
                ...Array(10).fill(null).map((_, i) => ({
                    type: MentionType.FILE,
                    value: `/file${i}.ts`,
                    raw: `@/file${i}.ts`,
                    startIndex: 0,
                    endIndex: 10
                })),
                ...Array(10).fill(null).map((_, i) => ({
                    type: MentionType.FOLDER,
                    value: `/folder${i}`,
                    raw: `@/folder${i}`,
                    startIndex: 0,
                    endIndex: 10
                })),
                ...Array(10).fill(null).map((_, i) => ({
                    type: MentionType.TERMINAL,
                    value: `term${i}`,
                    raw: `@#term${i}`,
                    startIndex: 0,
                    endIndex: 10
                }))
            ]

            vi.mocked(fs.readFile).mockResolvedValue('content' as any)
            vi.mocked(vscode.workspace.findFiles).mockResolvedValue([])

            const start = Date.now()
            const contexts = await extractor.extractContext(mentions)
            const duration = Date.now() - start

            expect(contexts).toHaveLength(30)
            expect(duration).toBeLessThan(2000) // Should complete in < 2s
        })
    })
})
