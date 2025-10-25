import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import type {
    ProcessedDocument,
    DocumentMetadata,
    DocumentTable
} from '../../types';

/**
 * ExcelProcessor - Processes Microsoft Excel spreadsheets (.xlsx, .xls)
 * Extracts data from sheets, converts to tables and text
 */
export class ExcelProcessor {
    /**
     * Process an Excel file
     * @param filePath - Path to Excel file
     * @param metadata - Document metadata
     * @returns Processed document
     */
    async process(
        filePath: string,
        metadata: DocumentMetadata
    ): Promise<ProcessedDocument> {
        try {
            // Read Excel file
            const workbook = XLSX.readFile(filePath);

            // Extract all sheets as tables
            const tables = this.extractTables(workbook);

            // Convert to text representation
            const content = this.convertTablesToText(tables, workbook.SheetNames);

            // Update metadata
            metadata.wordCount = this.countWords(content);
            metadata.pageCount = workbook.SheetNames.length; // One "page" per sheet

            // Add Excel-specific metadata
            metadata.sheets = workbook.SheetNames;
            metadata.sheetCount = workbook.SheetNames.length;

            const result: ProcessedDocument = {
                content,
                metadata,
                images: [], // Excel image extraction would require more complex processing
                tables
            };

            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to process Excel file: ${errorMessage}`);
        }
    }

    /**
     * Extract tables from all sheets
     * @param workbook - XLSX workbook object
     * @returns Array of tables
     */
    private extractTables(workbook: XLSX.WorkBook): DocumentTable[] {
        const tables: DocumentTable[] = [];

        for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];

            // Convert sheet to JSON
            const data: any[][] = XLSX.utils.sheet_to_json(worksheet, {
                header: 1,
                defval: '',
                blankrows: false
            });

            // Skip empty sheets
            if (data.length === 0) {
                continue;
            }

            // Determine headers (first row with data or column letters)
            let headers: string[];
            let rows: string[][];

            if (data.length > 0 && data[0].length > 0) {
                // Use first row as headers if it looks like headers
                const firstRow = data[0].map(cell => String(cell));
                const hasNonNumericFirstRow = firstRow.some(cell => isNaN(Number(cell)));

                if (hasNonNumericFirstRow) {
                    headers = firstRow;
                    rows = data.slice(1).map(row => row.map(cell => String(cell)));
                } else {
                    // Use column letters as headers (A, B, C, ...)
                    const colCount = Math.max(...data.map(row => row.length));
                    headers = this.generateColumnHeaders(colCount);
                    rows = data.map(row => row.map(cell => String(cell)));
                }

                tables.push({
                    headers,
                    rows,
                    caption: sheetName
                });
            }
        }

        return tables;
    }

    /**
     * Generate column headers (A, B, C, ... Z, AA, AB, ...)
     * @param count - Number of columns
     * @returns Array of column letters
     */
    private generateColumnHeaders(count: number): string[] {
        const headers: string[] = [];
        for (let i = 0; i < count; i++) {
            headers.push(this.numberToColumnLetter(i));
        }
        return headers;
    }

    /**
     * Convert column number to letter (0=A, 1=B, ..., 26=AA, ...)
     * @param num - Column number
     * @returns Column letter
     */
    private numberToColumnLetter(num: number): string {
        let letter = '';
        while (num >= 0) {
            letter = String.fromCharCode((num % 26) + 65) + letter;
            num = Math.floor(num / 26) - 1;
        }
        return letter;
    }

    /**
     * Convert tables to text representation
     * @param tables - Array of tables
     * @param sheetNames - Sheet names
     * @returns Text representation
     */
    private convertTablesToText(tables: DocumentTable[], sheetNames: string[]): string {
        const textParts: string[] = [];

        for (let i = 0; i < tables.length; i++) {
            const table = tables[i];
            const sheetName = table.caption || sheetNames[i] || `Sheet ${i + 1}`;

            textParts.push(`\n=== ${sheetName} ===\n`);

            // Add headers
            textParts.push(table.headers.join(' | '));
            textParts.push(table.headers.map(() => '---').join(' | '));

            // Add rows
            for (const row of table.rows) {
                textParts.push(row.join(' | '));
            }

            textParts.push('');
        }

        return textParts.join('\n').trim();
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
     * Export sheet as CSV
     * @param filePath - Path to Excel file
     * @param sheetName - Name of sheet to export
     * @returns CSV string
     */
    async exportSheetAsCSV(filePath: string, sheetName?: string): Promise<string> {
        try {
            const workbook = XLSX.readFile(filePath);

            // Use first sheet if not specified
            const targetSheet = sheetName || workbook.SheetNames[0];
            const worksheet = workbook.Sheets[targetSheet];

            if (!worksheet) {
                throw new Error(`Sheet "${targetSheet}" not found`);
            }

            // Convert to CSV
            const csv = XLSX.utils.sheet_to_csv(worksheet);
            return csv;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to export CSV: ${errorMessage}`);
        }
    }

    /**
     * Export sheet as JSON
     * @param filePath - Path to Excel file
     * @param sheetName - Name of sheet to export
     * @returns JSON array
     */
    async exportSheetAsJSON(filePath: string, sheetName?: string): Promise<any[]> {
        try {
            const workbook = XLSX.readFile(filePath);

            // Use first sheet if not specified
            const targetSheet = sheetName || workbook.SheetNames[0];
            const worksheet = workbook.Sheets[targetSheet];

            if (!worksheet) {
                throw new Error(`Sheet "${targetSheet}" not found`);
            }

            // Convert to JSON
            const json = XLSX.utils.sheet_to_json(worksheet);
            return json;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to export JSON: ${errorMessage}`);
        }
    }

    /**
     * Get specific cell value
     * @param filePath - Path to Excel file
     * @param sheetName - Sheet name
     * @param cellAddress - Cell address (e.g., 'A1', 'B5')
     * @returns Cell value
     */
    getCellValue(filePath: string, sheetName: string, cellAddress: string): any {
        try {
            const workbook = XLSX.readFile(filePath);
            const worksheet = workbook.Sheets[sheetName];

            if (!worksheet) {
                throw new Error(`Sheet "${sheetName}" not found`);
            }

            const cell = worksheet[cellAddress];
            return cell ? cell.v : null;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to get cell value: ${errorMessage}`);
        }
    }

    /**
     * Get range of cells
     * @param filePath - Path to Excel file
     * @param sheetName - Sheet name
     * @param range - Cell range (e.g., 'A1:C10')
     * @returns 2D array of cell values
     */
    getCellRange(filePath: string, sheetName: string, range: string): any[][] {
        try {
            const workbook = XLSX.readFile(filePath);
            const worksheet = workbook.Sheets[sheetName];

            if (!worksheet) {
                throw new Error(`Sheet "${sheetName}" not found`);
            }

            // Parse range
            const rangeObj = XLSX.utils.decode_range(range);
            const data: any[][] = [];

            for (let row = rangeObj.s.r; row <= rangeObj.e.r; row++) {
                const rowData: any[] = [];
                for (let col = rangeObj.s.c; col <= rangeObj.e.c; col++) {
                    const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                    const cell = worksheet[cellAddress];
                    rowData.push(cell ? cell.v : null);
                }
                data.push(rowData);
            }

            return data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to get cell range: ${errorMessage}`);
        }
    }

    /**
     * Get document metadata without full processing
     * @param filePath - Path to Excel file
     * @returns Basic metadata
     */
    async getMetadata(filePath: string): Promise<Partial<DocumentMetadata>> {
        try {
            const workbook = XLSX.readFile(filePath, { bookProps: true });
            const stats = fs.statSync(filePath);

            // Count total cells across all sheets
            let totalCells = 0;
            for (const sheetName of workbook.SheetNames) {
                const worksheet = workbook.Sheets[sheetName];
                const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
                totalCells += (range.e.r - range.s.r + 1) * (range.e.c - range.s.c + 1);
            }

            return {
                fileName: path.basename(filePath),
                filePath,
                fileSize: stats.size,
                pageCount: workbook.SheetNames.length,
                sheets: workbook.SheetNames,
                sheetCount: workbook.SheetNames.length,
                createdAt: stats.birthtime,
                modifiedAt: stats.mtime,
                // Excel-specific properties
                author: workbook.Props?.Author,
                title: workbook.Props?.Title,
                subject: workbook.Props?.Subject,
                keywords: workbook.Props?.Keywords?.split(',').map(k => k.trim())
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to get Excel metadata: ${errorMessage}`);
        }
    }
}
