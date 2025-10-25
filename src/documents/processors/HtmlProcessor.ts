import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
import type {
    ProcessedDocument,
    DocumentMetadata,
    DocumentImage,
    DocumentTable
} from '../../types';

/**
 * HtmlProcessor - Processes HTML documents
 * Extracts text, images, tables, and metadata
 */
export class HtmlProcessor {
    /**
     * Process an HTML file
     * @param filePath - Path to HTML file
     * @param metadata - Document metadata
     * @returns Processed document
     */
    async process(
        filePath: string,
        metadata: DocumentMetadata
    ): Promise<ProcessedDocument> {
        try {
            // Read HTML file
            const html = fs.readFileSync(filePath, 'utf-8');

            // Load with cheerio
            const $ = cheerio.load(html);

            // Extract text content
            const content = this.extractText($);

            // Extract metadata from HTML
            this.extractHtmlMetadata($, metadata);

            // Update metadata
            metadata.wordCount = this.countWords(content);
            metadata.pageCount = 1;

            // Extract images and tables
            const images = this.extractImages($, filePath);
            const tables = this.extractTables($);

            const result: ProcessedDocument = {
                content,
                metadata,
                images,
                tables
            };

            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to process HTML: ${errorMessage}`);
        }
    }

    /**
     * Extract text content from HTML
     * @param $ - Cheerio instance
     * @returns Text content
     */
    private extractText($: cheerio.CheerioAPI): string {
        // Remove script and style elements
        $('script, style, noscript').remove();

        // Get text from body or entire document
        const bodyText = $('body').length > 0 ? $('body').text() : $.text();

        // Clean text
        return this.cleanText(bodyText);
    }

    /**
     * Extract metadata from HTML meta tags
     * @param $ - Cheerio instance
     * @param metadata - Metadata object to update
     */
    private extractHtmlMetadata($: cheerio.CheerioAPI, metadata: DocumentMetadata): void {
        // Title
        const title = $('title').text() || $('meta[property="og:title"]').attr('content');
        if (title) {
            metadata.title = title.trim();
        }

        // Description
        const description = $('meta[name="description"]').attr('content') ||
                          $('meta[property="og:description"]').attr('content');
        if (description) {
            metadata.description = description.trim();
        }

        // Author
        const author = $('meta[name="author"]').attr('content');
        if (author) {
            metadata.author = author.trim();
        }

        // Keywords
        const keywords = $('meta[name="keywords"]').attr('content');
        if (keywords) {
            metadata.keywords = keywords.split(',').map(k => k.trim());
        }

        // Language
        const lang = $('html').attr('lang');
        if (lang) {
            metadata.language = lang;
        }

        // Publication date
        const pubDate = $('meta[property="article:published_time"]').attr('content') ||
                       $('meta[name="date"]').attr('content');
        if (pubDate) {
            metadata.createdAt = new Date(pubDate);
        }

        // Modified date
        const modDate = $('meta[property="article:modified_time"]').attr('content');
        if (modDate) {
            metadata.modifiedAt = new Date(modDate);
        }
    }

    /**
     * Extract images from HTML
     * @param $ - Cheerio instance
     * @param filePath - Original file path for resolving relative URLs
     * @returns Array of images
     */
    private extractImages($: cheerio.CheerioAPI, filePath: string): DocumentImage[] {
        const images: DocumentImage[] = [];
        const baseDir = path.dirname(filePath);

        $('img').each((index, element) => {
            const $img = $(element);
            let url = $img.attr('src') || '';

            // Resolve relative URLs
            if (url && !url.startsWith('http') && !url.startsWith('data:')) {
                url = path.resolve(baseDir, url);
            }

            // Get other attributes
            const alt = $img.attr('alt');
            const width = $img.attr('width') ? parseInt($img.attr('width')!, 10) : undefined;
            const height = $img.attr('height') ? parseInt($img.attr('height')!, 10) : undefined;

            images.push({
                url,
                caption: alt,
                width,
                height,
                index
            });
        });

        return images;
    }

    /**
     * Extract tables from HTML
     * @param $ - Cheerio instance
     * @returns Array of tables
     */
    private extractTables($: cheerio.CheerioAPI): DocumentTable[] {
        const tables: DocumentTable[] = [];

        $('table').each((_, tableElement) => {
            const $table = $(tableElement);

            // Extract caption
            const caption = $table.find('caption').text().trim() || undefined;

            // Extract headers from thead or first row
            let headers: string[] = [];
            const $thead = $table.find('thead tr').first();
            if ($thead.length > 0) {
                $thead.find('th, td').each((_, cell) => {
                    headers.push($(cell).text().trim());
                });
            } else {
                // Try first row if no thead
                const $firstRow = $table.find('tr').first();
                $firstRow.find('th, td').each((_, cell) => {
                    headers.push($(cell).text().trim());
                });
            }

            // Extract data rows
            const rows: string[][] = [];
            const $tbody = $table.find('tbody');
            const $rows = $tbody.length > 0 ? $tbody.find('tr') : $table.find('tr').slice(1);

            $rows.each((_, rowElement) => {
                const row: string[] = [];
                $(rowElement).find('td, th').each((_, cell) => {
                    row.push($(cell).text().trim());
                });
                if (row.length > 0) {
                    rows.push(row);
                }
            });

            // Only add table if it has data
            if (headers.length > 0 || rows.length > 0) {
                // If no headers found, use column numbers
                if (headers.length === 0 && rows.length > 0) {
                    headers = rows[0].map((_, i) => `Column ${i + 1}`);
                }

                tables.push({
                    headers,
                    rows,
                    caption
                });
            }
        });

        return tables;
    }

    /**
     * Clean extracted text
     * @param text - Raw text
     * @returns Cleaned text
     */
    private cleanText(text: string): string {
        return text
            // Normalize whitespace
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            // Remove excessive newlines
            .replace(/\n{3,}/g, '\n\n')
            // Remove excessive spaces
            .replace(/[ \t]{2,}/g, ' ')
            // Trim lines
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('\n')
            // Trim overall
            .trim();
    }

    /**
     * Count words in text
     * @param text - Text content
     * @returns Word count
     */
    private countWords(text: string): number {
        return text.split(/\s+/).filter(word => word.length > 0).length;
    }

    /**
     * Extract links from HTML
     * @param filePath - Path to HTML file
     * @returns Array of links with text and href
     */
    extractLinks(filePath: string): Array<{ text: string; href: string; title?: string }> {
        try {
            const html = fs.readFileSync(filePath, 'utf-8');
            const $ = cheerio.load(html);

            const links: Array<{ text: string; href: string; title?: string }> = [];

            $('a[href]').each((_, element) => {
                const $a = $(element);
                const href = $a.attr('href');
                const text = $a.text().trim();
                const title = $a.attr('title');

                if (href) {
                    links.push({
                        text,
                        href,
                        title: title || undefined
                    });
                }
            });

            return links;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to extract links: ${errorMessage}`);
        }
    }

    /**
     * Extract headings from HTML
     * @param filePath - Path to HTML file
     * @returns Array of headings with level and text
     */
    extractHeadings(filePath: string): Array<{ level: number; text: string }> {
        try {
            const html = fs.readFileSync(filePath, 'utf-8');
            const $ = cheerio.load(html);

            const headings: Array<{ level: number; text: string }> = [];

            $('h1, h2, h3, h4, h5, h6').each((_, element) => {
                const $h = $(element);
                const tagName = element.tagName.toLowerCase();
                const level = parseInt(tagName.substring(1), 10);
                const text = $h.text().trim();

                if (text) {
                    headings.push({ level, text });
                }
            });

            return headings;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to extract headings: ${errorMessage}`);
        }
    }

    /**
     * Convert HTML to plain text
     * @param filePath - Path to HTML file
     * @returns Plain text
     */
    async convertToText(filePath: string): Promise<string> {
        const html = fs.readFileSync(filePath, 'utf-8');
        const $ = cheerio.load(html);
        return this.extractText($);
    }

    /**
     * Convert HTML to Markdown (basic conversion)
     * @param filePath - Path to HTML file
     * @returns Markdown string
     */
    async convertToMarkdown(filePath: string): Promise<string> {
        try {
            const html = fs.readFileSync(filePath, 'utf-8');
            const $ = cheerio.load(html);

            // Simple conversion (could be enhanced with a proper library)
            let markdown = '';

            // Title
            const title = $('title').text();
            if (title) {
                markdown += `# ${title}\n\n`;
            }

            // Headings
            $('h1, h2, h3, h4, h5, h6').each((_, element) => {
                const $h = $(element);
                const level = parseInt(element.tagName.substring(1), 10);
                const text = $h.text().trim();
                markdown += `${'#'.repeat(level)} ${text}\n\n`;
            });

            // Paragraphs
            $('p').each((_, element) => {
                const text = $(element).text().trim();
                if (text) {
                    markdown += `${text}\n\n`;
                }
            });

            // Lists
            $('ul, ol').each((_, element) => {
                const $list = $(element);
                const isOrdered = element.tagName.toLowerCase() === 'ol';
                $list.find('li').each((i, li) => {
                    const text = $(li).text().trim();
                    const prefix = isOrdered ? `${i + 1}.` : '-';
                    markdown += `${prefix} ${text}\n`;
                });
                markdown += '\n';
            });

            return markdown.trim();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to convert to Markdown: ${errorMessage}`);
        }
    }

    /**
     * Get document metadata without full processing
     * @param filePath - Path to HTML file
     * @returns Basic metadata
     */
    async getMetadata(filePath: string): Promise<Partial<DocumentMetadata>> {
        try {
            const html = fs.readFileSync(filePath, 'utf-8');
            const $ = cheerio.load(html);
            const stats = fs.statSync(filePath);

            const metadata: Partial<DocumentMetadata> = {
                fileName: path.basename(filePath),
                filePath,
                fileSize: stats.size,
                pageCount: 1,
                createdAt: stats.birthtime,
                modifiedAt: stats.mtime
            };

            this.extractHtmlMetadata($, metadata as DocumentMetadata);

            return metadata;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to get HTML metadata: ${errorMessage}`);
        }
    }
}
