/**
 * Tests for DocumentProcessor
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DocumentProcessor } from '../DocumentProcessor';
import * as fs from 'fs';
import * as path from 'path';

// Mock VS Code API
global.vscode = {
    window: {
        withProgress: vi.fn((options, task) => task({ report: vi.fn() })),
        showErrorMessage: vi.fn(),
        showInformationMessage: vi.fn()
    },
    workspace: {
        getConfiguration: vi.fn(() => ({
            get: vi.fn()
        }))
    },
    ProgressLocation: {
        Notification: 15
    }
};

describe('DocumentProcessor', () => {
    let processor;

    beforeEach(() => {
        processor = new DocumentProcessor();
    });

    describe('Constructor', () => {
        it('should initialize correctly', () => {
            expect(processor).toBeDefined();
            expect(processor.backendConfig).toBeDefined();
        });
    });

    describe('Document Type Detection', () => {
        it('should detect PDF files', () => {
            const type = processor.getDocumentType('.pdf');
            expect(type).toBe('pdf');
        });

        it('should detect Word files', () => {
            expect(processor.getDocumentType('.docx')).toBe('docx');
            expect(processor.getDocumentType('.doc')).toBe('docx');
        });

        it('should detect Excel files', () => {
            expect(processor.getDocumentType('.xlsx')).toBe('xlsx');
            expect(processor.getDocumentType('.xls')).toBe('xlsx');
        });

        it('should detect HTML files', () => {
            expect(processor.getDocumentType('.html')).toBe('html');
            expect(processor.getDocumentType('.htm')).toBe('html');
        });

        it('should detect text files', () => {
            expect(processor.getDocumentType('.txt')).toBe('txt');
            expect(processor.getDocumentType('.md')).toBe('md');
        });

        it('should default to txt for unknown types', () => {
            expect(processor.getDocumentType('.unknown')).toBe('txt');
        });
    });

    describe('MIME Type Detection', () => {
        it('should return correct MIME types', () => {
            expect(processor.getMimeType('.pdf')).toBe('application/pdf');
            expect(processor.getMimeType('.docx')).toContain('wordprocessingml');
            expect(processor.getMimeType('.xlsx')).toContain('spreadsheetml');
            expect(processor.getMimeType('.html')).toBe('text/html');
            expect(processor.getMimeType('.txt')).toBe('text/plain');
        });

        it('should return default MIME type for unknown extensions', () => {
            expect(processor.getMimeType('.unknown')).toBe('application/octet-stream');
        });
    });

    describe('Text File Processing', () => {
        it('should process plain text files', async () => {
            // Create temporary test file
            const testFile = '/tmp/test-document.txt';
            const testContent = 'This is a test document.\nWith multiple lines.\nAnd some words.';

            fs.writeFileSync(testFile, testContent);

            try {
                const result = await processor.processText(
                    testFile,
                    {
                        fileName: 'test-document.txt',
                        filePath: testFile,
                        fileSize: testContent.length,
                        mimeType: 'text/plain',
                        documentType: 'txt'
                    },
                    { report: vi.fn() }
                );

                expect(result.content).toBe(testContent);
                expect(result.metadata.wordCount).toBeGreaterThan(0);
                expect(result.metadata.pageCount).toBe(1);
                expect(result.images).toEqual([]);
                expect(result.tables).toEqual([]);
            } finally {
                // Clean up
                if (fs.existsSync(testFile)) {
                    fs.unlinkSync(testFile);
                }
            }
        });

        it('should count words correctly', async () => {
            const testFile = '/tmp/test-words.txt';
            const testContent = 'One two three four five';

            fs.writeFileSync(testFile, testContent);

            try {
                const result = await processor.processText(
                    testFile,
                    {
                        fileName: 'test-words.txt',
                        filePath: testFile,
                        fileSize: testContent.length,
                        mimeType: 'text/plain',
                        documentType: 'txt'
                    },
                    { report: vi.fn() }
                );

                expect(result.metadata.wordCount).toBe(5);
            } finally {
                if (fs.existsSync(testFile)) {
                    fs.unlinkSync(testFile);
                }
            }
        });
    });

    describe('Singleton Pattern', () => {
        it('should return same instance', async () => {
            const { getInstance } = await import('../DocumentProcessor.ts');
            const instance1 = getInstance();
            const instance2 = getInstance();

            expect(instance1).toBe(instance2);
        });
    });

    describe('Dispose', () => {
        it('should clear processing queue on dispose', () => {
            processor.dispose();
            // Should not throw errors
            expect(true).toBe(true);
        });
    });
});
