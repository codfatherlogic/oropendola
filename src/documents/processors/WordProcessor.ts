import * as fs from 'fs';
import * as path from 'path';
// @ts-ignore - mammoth types may not be available
import * as mammoth from 'mammoth';
import type {
    ProcessedDocument,
    DocumentMetadata,
    DocumentImage,
    DocumentTable
} from '../../types';

/**
 * WordProcessor - Processes Microsoft Word documents (.docx)
 * Extracts text, images, tables, and metadata
 */
export class WordProcessor {
    /**
     * Process a Word document
     * @param filePath - Path to DOCX file
     * @param metadata - Document metadata
     * @returns Processed document
     */
    async process(
        filePath: string,
        metadata: DocumentMetadata
    ): Promise<ProcessedDocument> {
        try {
            // Read file as buffer
            const buffer = fs.readFileSync(filePath);

            // Extract text with mammoth
            const textResult = await mammoth.extractRawText({ buffer });
            const content = this.cleanText(textResult.value);

            // Extract HTML to get images and tables
            const htmlResult = await mammoth.convertToHtml({ buffer }, {
                includeDefaultStyleMap: true,
                includeEmbeddedStyleMap: true
            });

            // Update metadata
            metadata.wordCount = this.countWords(content);
            metadata.pageCount = this.estimatePageCount(content);

            // Extract images and tables from HTML
            const images = await this.extractImages(htmlResult.value, filePath);
            const tables = this.extractTables(htmlResult.value);

            // Log any warnings from mammoth
            if (textResult.messages.length > 0) {
                console.warn('Word processing warnings:', textResult.messages);
            }

            const result: ProcessedDocument = {
                content,
                metadata,
                images,
                tables
            };

            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to process Word document: ${errorMessage}`);
        }
    }

    /**
     * Clean extracted text
     * @param text - Raw text from Word document
     * @returns Cleaned text
     */
    private cleanText(text: string): string {
        return text
            // Normalize whitespace
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            // Remove excessive newlines
            .replace(/\n{3,}/g, '\n\n')
            // Trim leading/trailing whitespace
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
     * Estimate page count based on word count
     * Assumes ~250 words per page (standard estimate)
     * @param text - Text content
     * @returns Estimated page count
     */
    private estimatePageCount(text: string): number {
        const wordCount = this.countWords(text);
        return Math.max(1, Math.ceil(wordCount / 250));
    }

    /**
     * Extract images from HTML
     * @param html - HTML content from mammoth
     * @param filePath - Original file path
     * @returns Array of images
     */
    private async extractImages(html: string, _filePath: string): Promise<DocumentImage[]> {
        const images: DocumentImage[] = [];

        // Match img tags in HTML
        const imgRegex = /<img[^>]+src="data:image\/([^;]+);base64,([^"]+)"[^>]*>/g;
        let match;
        let index = 0;

        while ((match = imgRegex.exec(html)) !== null) {
            const [, format, base64Data] = match;

            images.push({
                url: `data:image/${format};base64,${base64Data}`,
                caption: undefined,
                width: undefined,
                height: undefined,
                index: index++
            });
        }

        return images;
    }

    /**
     * Extract tables from HTML
     * @param html - HTML content from mammoth
     * @returns Array of tables
     */
    private extractTables(html: string): DocumentTable[] {
        const tables: DocumentTable[] = [];

        // Parse HTML to extract tables
        const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/g;
        let tableMatch;

        while ((tableMatch = tableRegex.exec(html)) !== null) {
            const tableHtml = tableMatch[1];

            // Extract rows
            const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
            const rows: string[][] = [];
            let rowMatch;

            while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
                const rowHtml = rowMatch[1];

                // Extract cells (th or td)
                const cellRegex = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g;
                const cells: string[] = [];
                let cellMatch;

                while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
                    // Remove HTML tags and clean text
                    const cellText = cellMatch[1]
                        .replace(/<[^>]+>/g, '')
                        .replace(/&nbsp;/g, ' ')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&amp;/g, '&')
                        .trim();
                    cells.push(cellText);
                }

                if (cells.length > 0) {
                    rows.push(cells);
                }
            }

            // First row is typically headers
            if (rows.length > 0) {
                const headers = rows[0];
                const data = rows.slice(1);

                tables.push({
                    headers,
                    rows: data,
                    caption: undefined
                });
            }
        }

        return tables;
    }

    /**
     * Convert Word document to HTML
     * Useful for previewing or further processing
     * @param filePath - Path to DOCX file
     * @returns HTML string
     */
    async convertToHtml(filePath: string): Promise<string> {
        try {
            const buffer = fs.readFileSync(filePath);
            const result = await mammoth.convertToHtml({ buffer }, {
                includeDefaultStyleMap: true,
                styleMap: [
                    "p[style-name='Heading 1'] => h1:fresh",
                    "p[style-name='Heading 2'] => h2:fresh",
                    "p[style-name='Heading 3'] => h3:fresh",
                    "p[style-name='Code'] => pre:fresh"
                ]
            });

            if (result.messages.length > 0) {
                console.warn('HTML conversion warnings:', result.messages);
            }

            return result.value;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to convert to HTML: ${errorMessage}`);
        }
    }

    /**
     * Convert Word document to Markdown
     * Useful for documentation workflows
     * @param filePath - Path to DOCX file
     * @returns Markdown string
     */
    async convertToMarkdown(filePath: string): Promise<string> {
        try {
            // mammoth doesn't have built-in Markdown conversion
            // Convert to HTML first, then basic HTML to Markdown
            const html = await this.convertToHtml(filePath);

            // Basic HTML to Markdown conversion
            let markdown = html
                .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
                .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
                .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
                .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
                .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
                .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
                .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
                .replace(/<ul[^>]*>|<\/ul>/gi, '\n')
                .replace(/<ol[^>]*>|<\/ol>/gi, '\n')
                .replace(/<[^>]+>/g, ''); // Remove remaining HTML tags

            return markdown.trim();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to convert to Markdown: ${errorMessage}`);
        }
    }

    /**
     * Get document metadata without full processing
     * @param filePath - Path to DOCX file
     * @returns Basic metadata
     */
    async getMetadata(filePath: string): Promise<Partial<DocumentMetadata>> {
        try {
            const buffer = fs.readFileSync(filePath);
            const stats = fs.statSync(filePath);

            // Quick text extraction for word count
            const textResult = await mammoth.extractRawText({ buffer });
            const wordCount = this.countWords(textResult.value);

            return {
                fileName: path.basename(filePath),
                filePath,
                fileSize: stats.size,
                wordCount,
                pageCount: this.estimatePageCount(textResult.value),
                createdAt: stats.birthtime,
                modifiedAt: stats.mtime
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to get Word metadata: ${errorMessage}`);
        }
    }
}
