import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';
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
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(filePath);

            // Get sheet names
            const sheetNames = workbook.worksheets.map(ws => ws.name);

            // Extract all sheets as tables
            const tables = this.extractTables(workbook);

            // Convert to text representation
            const content = this.convertTablesToText(tables, sheetNames);

            // Update metadata
            metadata.wordCount = this.countWords(content);
            metadata.pageCount = sheetNames.length; // One "page" per sheet

            // Add Excel-specific metadata
            metadata.sheets = sheetNames;
            metadata.sheetCount = sheetNames.length;

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
     * @param workbook - ExcelJS workbook object
     * @returns Array of tables
     */
    private extractTables(workbook: ExcelJS.Workbook): DocumentTable[] {
        const tables: DocumentTable[] = [];

        for (const worksheet of workbook.worksheets) {
            // Extract all rows as 2D array
            const data: any[][] = [];

            worksheet.eachRow((row, _rowNumber) => {
                const rowData: any[] = [];
                row.eachCell({ includeEmpty: true }, (cell, _colNumber) => {
                    rowData.push(cell.value !== null && cell.value !== undefined ? String(cell.value) : '');
                });
                data.push(rowData);
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
                    caption: worksheet.name
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
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(filePath);

            // Use first sheet if not specified
            const targetSheet = sheetName || workbook.worksheets[0]?.name;
            const worksheet = workbook.getWorksheet(targetSheet || '');

            if (!worksheet) {
                throw new Error(`Sheet "${targetSheet}" not found`);
            }

            // Convert to CSV
            const csvRows: string[] = [];
            worksheet.eachRow((row, _rowNumber) => {
                const rowData: string[] = [];
                row.eachCell({ includeEmpty: true }, (cell, _colNumber) => {
                    const value = cell.value !== null && cell.value !== undefined ? String(cell.value) : '';
                    // Escape CSV values
                    const escaped = value.includes(',') || value.includes('"') || value.includes('\n')
                        ? `"${value.replace(/"/g, '""')}"`
                        : value;
                    rowData.push(escaped);
                });
                csvRows.push(rowData.join(','));
            });

            return csvRows.join('\n');
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
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(filePath);

            // Use first sheet if not specified
            const targetSheet = sheetName || workbook.worksheets[0]?.name;
            const worksheet = workbook.getWorksheet(targetSheet || '');

            if (!worksheet) {
                throw new Error(`Sheet "${targetSheet}" not found`);
            }

            // Convert to JSON array of objects
            const json: any[] = [];
            let headers: string[] = [];

            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) {
                    // First row becomes headers
                    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                        headers.push(cell.value !== null && cell.value !== undefined ? String(cell.value) : `Column${colNumber}`);
                    });
                } else {
                    // Subsequent rows become objects
                    const rowObj: any = {};
                    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                        const header = headers[colNumber - 1] || `Column${colNumber}`;
                        rowObj[header] = cell.value !== null && cell.value !== undefined ? cell.value : null;
                    });
                    json.push(rowObj);
                }
            });

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
    async getCellValue(filePath: string, sheetName: string, cellAddress: string): Promise<any> {
        try {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(filePath);
            const worksheet = workbook.getWorksheet(sheetName);

            if (!worksheet) {
                throw new Error(`Sheet "${sheetName}" not found`);
            }

            const cell = worksheet.getCell(cellAddress);
            return cell ? cell.value : null;
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
    async getCellRange(filePath: string, sheetName: string, range: string): Promise<any[][]> {
        try {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(filePath);
            const worksheet = workbook.getWorksheet(sheetName);

            if (!worksheet) {
                throw new Error(`Sheet "${sheetName}" not found`);
            }

            // Parse range (e.g., 'A1:C10')
            const [startCell, endCell] = range.split(':');
            const startRef = this.parseCellAddress(startCell);
            const endRef = this.parseCellAddress(endCell);

            const data: any[][] = [];

            for (let row = startRef.row; row <= endRef.row; row++) {
                const rowData: any[] = [];
                for (let col = startRef.col; col <= endRef.col; col++) {
                    const cell = worksheet.getCell(row, col);
                    rowData.push(cell ? cell.value : null);
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
     * Parse cell address (e.g., 'A1' -> {row: 1, col: 1})
     * @param address - Cell address
     * @returns Row and column numbers
     */
    private parseCellAddress(address: string): { row: number; col: number } {
        const match = address.match(/^([A-Z]+)(\d+)$/);
        if (!match) {
            throw new Error(`Invalid cell address: ${address}`);
        }

        const colLetters = match[1];
        const rowNumber = parseInt(match[2], 10);

        // Convert column letters to number (A=1, B=2, ..., Z=26, AA=27, ...)
        let colNumber = 0;
        for (let i = 0; i < colLetters.length; i++) {
            colNumber = colNumber * 26 + (colLetters.charCodeAt(i) - 64);
        }

        return { row: rowNumber, col: colNumber };
    }

    /**
     * Get document metadata without full processing
     * @param filePath - Path to Excel file
     * @returns Basic metadata
     */
    async getMetadata(filePath: string): Promise<Partial<DocumentMetadata>> {
        try {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(filePath);
            const stats = fs.statSync(filePath);

            // Get sheet names
            const sheetNames = workbook.worksheets.map(ws => ws.name);

            // Count total cells across all sheets
            let totalCells = 0;
            for (const worksheet of workbook.worksheets) {
                const dimensions = worksheet.dimensions;
                if (dimensions) {
                    const rowCount = dimensions.bottom - dimensions.top + 1;
                    const colCount = dimensions.right - dimensions.left + 1;
                    totalCells += rowCount * colCount;
                }
            }

            return {
                fileName: path.basename(filePath),
                filePath,
                fileSize: stats.size,
                pageCount: sheetNames.length,
                sheets: sheetNames,
                sheetCount: sheetNames.length,
                createdAt: stats.birthtime,
                modifiedAt: stats.mtime,
                // Excel-specific properties
                author: workbook.creator,
                title: workbook.title,
                subject: workbook.subject,
                keywords: workbook.keywords?.split(',').map(k => k.trim())
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to get Excel metadata: ${errorMessage}`);
        }
    }
}
