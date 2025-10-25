/**
 * Tests for HtmlProcessor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HtmlProcessor } from '../processors/HtmlProcessor';
import * as fs from 'fs';

describe('HtmlProcessor', () => {
    let processor;

    beforeEach(() => {
        processor = new HtmlProcessor();
    });

    describe('Basic Processing', () => {
        it('should process simple HTML', async () => {
            const testFile = '/tmp/test.html';
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Test Document</title>
                    <meta name="author" content="Test Author">
                    <meta name="description" content="Test Description">
                </head>
                <body>
                    <h1>Main Heading</h1>
                    <p>This is a test paragraph with some words.</p>
                    <p>Another paragraph here.</p>
                </body>
                </html>
            `;

            fs.writeFileSync(testFile, html);

            try {
                const metadata = {
                    fileName: 'test.html',
                    filePath: testFile,
                    fileSize: html.length,
                    mimeType: 'text/html',
                    documentType: 'html'
                };

                const result = await processor.process(testFile, metadata);

                expect(result.content).toContain('Main Heading');
                expect(result.content).toContain('test paragraph');
                expect(result.metadata.title).toBe('Test Document');
                expect(result.metadata.author).toBe('Test Author');
                expect(result.metadata.description).toBe('Test Description');
                expect(result.metadata.wordCount).toBeGreaterThan(0);
            } finally {
                if (fs.existsSync(testFile)) {
                    fs.unlinkSync(testFile);
                }
            }
        });

        it('should extract images from HTML', async () => {
            const testFile = '/tmp/test-images.html';
            const html = `
                <html>
                <body>
                    <img src="image1.jpg" alt="Image 1" width="100" height="200">
                    <img src="image2.png" alt="Image 2">
                </body>
                </html>
            `;

            fs.writeFileSync(testFile, html);

            try {
                const metadata = {
                    fileName: 'test-images.html',
                    filePath: testFile,
                    fileSize: html.length,
                    mimeType: 'text/html',
                    documentType: 'html'
                };

                const result = await processor.process(testFile, metadata);

                expect(result.images).toBeDefined();
                expect(result.images.length).toBe(2);
                expect(result.images[0].caption).toBe('Image 1');
                expect(result.images[0].width).toBe(100);
                expect(result.images[0].height).toBe(200);
                expect(result.images[1].caption).toBe('Image 2');
            } finally {
                if (fs.existsSync(testFile)) {
                    fs.unlinkSync(testFile);
                }
            }
        });

        it('should extract tables from HTML', async () => {
            const testFile = '/tmp/test-tables.html';
            const html = `
                <html>
                <body>
                    <table>
                        <caption>Test Table</caption>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Age</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Alice</td>
                                <td>30</td>
                            </tr>
                            <tr>
                                <td>Bob</td>
                                <td>25</td>
                            </tr>
                        </tbody>
                    </table>
                </body>
                </html>
            `;

            fs.writeFileSync(testFile, html);

            try {
                const metadata = {
                    fileName: 'test-tables.html',
                    filePath: testFile,
                    fileSize: html.length,
                    mimeType: 'text/html',
                    documentType: 'html'
                };

                const result = await processor.process(testFile, metadata);

                expect(result.tables).toBeDefined();
                expect(result.tables.length).toBe(1);
                expect(result.tables[0].caption).toBe('Test Table');
                expect(result.tables[0].headers).toEqual(['Name', 'Age']);
                expect(result.tables[0].rows).toHaveLength(2);
                expect(result.tables[0].rows[0]).toEqual(['Alice', '30']);
                expect(result.tables[0].rows[1]).toEqual(['Bob', '25']);
            } finally {
                if (fs.existsSync(testFile)) {
                    fs.unlinkSync(testFile);
                }
            }
        });

        it('should remove script and style tags', async () => {
            const testFile = '/tmp/test-clean.html';
            const html = `
                <html>
                <head>
                    <style>body { color: red; }</style>
                </head>
                <body>
                    <p>Visible content</p>
                    <script>console.log('hidden');</script>
                </body>
                </html>
            `;

            fs.writeFileSync(testFile, html);

            try {
                const metadata = {
                    fileName: 'test-clean.html',
                    filePath: testFile,
                    fileSize: html.length,
                    mimeType: 'text/html',
                    documentType: 'html'
                };

                const result = await processor.process(testFile, metadata);

                expect(result.content).toContain('Visible content');
                expect(result.content).not.toContain('color: red');
                expect(result.content).not.toContain('console.log');
            } finally {
                if (fs.existsSync(testFile)) {
                    fs.unlinkSync(testFile);
                }
            }
        });
    });

    describe('Link Extraction', () => {
        it('should extract links from HTML', () => {
            const testFile = '/tmp/test-links.html';
            const html = `
                <html>
                <body>
                    <a href="https://example.com">Example</a>
                    <a href="/page" title="Internal Page">Page</a>
                </body>
                </html>
            `;

            fs.writeFileSync(testFile, html);

            try {
                const links = processor.extractLinks(testFile);

                expect(links).toHaveLength(2);
                expect(links[0]).toEqual({
                    text: 'Example',
                    href: 'https://example.com',
                    title: undefined
                });
                expect(links[1]).toEqual({
                    text: 'Page',
                    href: '/page',
                    title: 'Internal Page'
                });
            } finally {
                if (fs.existsSync(testFile)) {
                    fs.unlinkSync(testFile);
                }
            }
        });
    });

    describe('Heading Extraction', () => {
        it('should extract headings from HTML', () => {
            const testFile = '/tmp/test-headings.html';
            const html = `
                <html>
                <body>
                    <h1>Title</h1>
                    <h2>Subtitle</h2>
                    <h3>Section</h3>
                </body>
                </html>
            `;

            fs.writeFileSync(testFile, html);

            try {
                const headings = processor.extractHeadings(testFile);

                expect(headings).toHaveLength(3);
                expect(headings[0]).toEqual({ level: 1, text: 'Title' });
                expect(headings[1]).toEqual({ level: 2, text: 'Subtitle' });
                expect(headings[2]).toEqual({ level: 3, text: 'Section' });
            } finally {
                if (fs.existsSync(testFile)) {
                    fs.unlinkSync(testFile);
                }
            }
        });
    });

    describe('Metadata Extraction', () => {
        it('should extract metadata without full processing', async () => {
            const testFile = '/tmp/test-metadata.html';
            const html = `
                <html lang="en">
                <head>
                    <title>Metadata Test</title>
                    <meta name="author" content="John Doe">
                    <meta name="keywords" content="test, html, metadata">
                </head>
                <body>Content</body>
                </html>
            `;

            fs.writeFileSync(testFile, html);

            try {
                const metadata = await processor.getMetadata(testFile);

                expect(metadata.title).toBe('Metadata Test');
                expect(metadata.author).toBe('John Doe');
                expect(metadata.keywords).toEqual(['test', 'html', 'metadata']);
                expect(metadata.language).toBe('en');
            } finally {
                if (fs.existsSync(testFile)) {
                    fs.unlinkSync(testFile);
                }
            }
        });
    });
});
