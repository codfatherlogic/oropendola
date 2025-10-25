import * as fs from 'fs';
import * as path from 'path';
import type {
    ProcessedDocument,
    DocumentMetadata,
    DocumentImage,
    DocumentTable
} from '../../types';

// @ts-ignore - pdf-parse doesn't have proper TypeScript types
const pdfParse = require('pdf-parse');

/**
 * PdfProcessor - Processes PDF documents
 * Extracts text, metadata, and optionally images
 */
export class PdfProcessor {
    /**
     * Process a PDF file
     * @param filePath - Path to PDF file
     * @param metadata - Document metadata
     * @returns Processed document
     */
    async process(
        filePath: string,
        metadata: DocumentMetadata
    ): Promise<ProcessedDocument> {
        try {
            // Read PDF file
            const dataBuffer = fs.readFileSync(filePath);

            // Parse PDF
            const pdfData = await pdfParse(dataBuffer, {
                // Extract maximum text
                max: 0,
                version: 'default'
            });

            // Extract text content
            const content = this.cleanText(pdfData.text);

            // Update metadata
            metadata.pageCount = pdfData.numpages;
            metadata.wordCount = this.countWords(content);

            // Extract additional metadata from PDF info
            if (pdfData.info) {
                metadata.author = pdfData.info.Author;
                metadata.title = pdfData.info.Title;
                metadata.subject = pdfData.info.Subject;
                metadata.keywords = pdfData.info.Keywords?.split(',').map((k: string) => k.trim());

                // Parse PDF dates (format: D:YYYYMMDDHHmmSS)
                if (pdfData.info.CreationDate) {
                    metadata.createdAt = this.parsePdfDate(pdfData.info.CreationDate);
                }
                if (pdfData.info.ModDate) {
                    metadata.modifiedAt = this.parsePdfDate(pdfData.info.ModDate);
                }
            }

            // Structure the result
            const result: ProcessedDocument = {
                content,
                metadata,
                images: await this.extractImages(filePath),
                tables: this.extractTables(content)
            };

            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to process PDF: ${errorMessage}`);
        }
    }

    /**
     * Clean extracted text
     * @param text - Raw text from PDF
     * @returns Cleaned text
     */
    private cleanText(text: string): string {
        return text
            // Normalize whitespace
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            // Remove excessive newlines
            .replace(/\n{3,}/g, '\n\n')
            // Remove null bytes
            .replace(/\0/g, '')
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
     * Parse PDF date format (D:YYYYMMDDHHmmSS)
     * @param pdfDate - PDF date string
     * @returns JavaScript Date object
     */
    private parsePdfDate(pdfDate: string): Date {
        try {
            // Remove 'D:' prefix if present
            const dateStr = pdfDate.replace(/^D:/, '');

            // Extract date components
            const year = parseInt(dateStr.substring(0, 4), 10);
            const month = parseInt(dateStr.substring(4, 6), 10) - 1; // Months are 0-indexed
            const day = parseInt(dateStr.substring(6, 8), 10);
            const hours = parseInt(dateStr.substring(8, 10), 10) || 0;
            const minutes = parseInt(dateStr.substring(10, 12), 10) || 0;
            const seconds = parseInt(dateStr.substring(12, 14), 10) || 0;

            return new Date(year, month, day, hours, minutes, seconds);
        } catch (error) {
            // If parsing fails, return current date
            return new Date();
        }
    }

    /**
     * Extract images from PDF
     * Note: pdf-parse doesn't support image extraction directly.
     * This would require backend processing or additional libraries like pdf.js
     * @param filePath - Path to PDF file
     * @returns Array of images (empty for now)
     */
    private async extractImages(_filePath: string): Promise<DocumentImage[]> {
        // TODO: Image extraction requires more sophisticated PDF parsing
        // This would typically be done on the backend with libraries like PyMuPDF
        // For now, return empty array
        return [];
    }

    /**
     * Extract tables from text
     * Simple heuristic-based table detection
     * @param text - Text content
     * @returns Array of detected tables
     */
    private extractTables(text: string): DocumentTable[] {
        const tables: DocumentTable[] = [];
        const lines = text.split('\n');

        let currentTable: string[] = [];
        let inTable = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Detect table-like structures (lines with multiple tabs or spaces)
            const hasMultipleColumns = line.split(/\s{2,}|\t/).length >= 3;
            const hasTableSeparator = /^[─│┌┐└┘├┤┬┴┼\-+=|]+$/.test(line);

            if (hasMultipleColumns || hasTableSeparator) {
                if (!inTable) {
                    inTable = true;
                    currentTable = [];
                }
                if (!hasTableSeparator) {
                    currentTable.push(line);
                }
            } else {
                if (inTable && currentTable.length >= 2) {
                    // End of table, process it
                    const tableData = this.parseTableData(currentTable);
                    if (tableData) {
                        tables.push(tableData);
                    }
                }
                inTable = false;
                currentTable = [];
            }
        }

        // Handle table at end of document
        if (inTable && currentTable.length >= 2) {
            const tableData = this.parseTableData(currentTable);
            if (tableData) {
                tables.push(tableData);
            }
        }

        return tables;
    }

    /**
     * Parse table data from lines
     * @param lines - Array of table lines
     * @returns Parsed table data
     */
    private parseTableData(lines: string[]): DocumentTable | null {
        try {
            const rows: string[][] = lines.map(line => {
                // Split by multiple spaces or tabs
                return line.split(/\s{2,}|\t/)
                    .map(cell => cell.trim())
                    .filter(cell => cell.length > 0);
            });

            // Filter out empty rows
            const validRows = rows.filter(row => row.length > 0);

            if (validRows.length < 2) {
                return null;
            }

            // Assume first row is header
            const headers = validRows[0];
            const data = validRows.slice(1);

            return {
                headers,
                rows: data,
                caption: undefined
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Get PDF metadata without full processing
     * Useful for quick file info
     * @param filePath - Path to PDF file
     * @returns Basic metadata
     */
    async getMetadata(filePath: string): Promise<Partial<DocumentMetadata>> {
        try {
            const dataBuffer = fs.readFileSync(filePath);
            const pdfData = await pdfParse(dataBuffer, {
                max: 0,
                pagerender: () => '' // Don't render pages, just get metadata
            });

            return {
                fileName: path.basename(filePath),
                filePath,
                pageCount: pdfData.numpages,
                author: pdfData.info?.Author,
                title: pdfData.info?.Title,
                subject: pdfData.info?.Subject,
                keywords: pdfData.info?.Keywords?.split(',').map((k: string) => k.trim())
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to get PDF metadata: ${errorMessage}`);
        }
    }
}
