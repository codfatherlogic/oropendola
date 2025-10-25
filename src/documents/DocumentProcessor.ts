import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import type {
    DocumentType,
    ProcessedDocument,
    DocumentMetadata,
    DocumentProcessingOptions,
    DocumentAnalysisResult
} from '../types';
import { BackendConfig, getInstance as getBackendConfig } from '../config/BackendConfig';

/**
 * DocumentProcessor - Main coordinator for document processing
 * Handles routing to appropriate processors and backend integration
 */
export class DocumentProcessor {
    private backendConfig: BackendConfig;
    private processingQueue: Map<string, ProcessingTask>;

    constructor() {
        this.backendConfig = getBackendConfig();
        this.processingQueue = new Map();
    }

    /**
     * Process a document file
     * @param filePath - Path to the document file
     * @param options - Processing options
     * @returns Processed document result
     */
    async processDocument(
        filePath: string,
        options: DocumentProcessingOptions = {}
    ): Promise<ProcessedDocument> {
        // Validate file exists
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        // Get file stats
        const stats = fs.statSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const documentType = this.getDocumentType(ext);

        // Create metadata
        const metadata: DocumentMetadata = {
            fileName: path.basename(filePath),
            filePath,
            fileSize: stats.size,
            mimeType: this.getMimeType(ext),
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
            documentType,
            pageCount: 0,
            wordCount: 0
        };

        // Show progress
        return vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Processing ${metadata.fileName}...`,
                cancellable: false
            },
            async (progress) => {
                try {
                    progress.report({ increment: 10, message: 'Reading file...' });

                    // Process based on type
                    let result: ProcessedDocument;

                    switch (documentType) {
                        case 'pdf':
                            result = await this.processPdf(filePath, metadata, progress);
                            break;
                        case 'docx':
                            result = await this.processWord(filePath, metadata, progress);
                            break;
                        case 'xlsx':
                            result = await this.processExcel(filePath, metadata, progress);
                            break;
                        case 'html':
                            result = await this.processHtml(filePath, metadata, progress);
                            break;
                        case 'txt':
                        case 'md':
                            result = await this.processText(filePath, metadata, progress);
                            break;
                        default:
                            throw new Error(`Unsupported document type: ${documentType}`);
                    }

                    progress.report({ increment: 90, message: 'Processing complete!' });

                    // Optionally send to backend for AI analysis
                    if (options.analyzeWithAI) {
                        await this.analyzeWithBackend(result, options);
                    }

                    return result;
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    vscode.window.showErrorMessage(`Document processing failed: ${errorMessage}`);
                    throw error;
                }
            }
        );
    }

    /**
     * Upload and process document on backend
     * @param filePath - Path to the document
     * @param options - Processing options
     * @returns Document ID and status
     */
    async uploadToBackend(
        filePath: string,
        options: DocumentProcessingOptions = {}
    ): Promise<{ documentId: string; status: string }> {
        try {
            const fileBuffer = fs.readFileSync(filePath);
            const fileName = path.basename(filePath);
            const formData = new FormData();

            // Create blob from buffer
            const blob = new Blob([fileBuffer]);
            formData.append('file', blob, fileName);
            formData.append('extract_images', String(options.extractImages ?? false));
            formData.append('extract_tables', String(options.extractTables ?? false));
            formData.append('ocr', String(options.ocr ?? false));

            const response = await fetch(this.backendConfig.endpoints.documents.upload, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${await this.getAuthToken()}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }

            const result = await response.json() as any;
            return {
                documentId: result.data.document_id,
                status: result.data.status
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to upload document: ${errorMessage}`);
        }
    }

    /**
     * Get processing status from backend
     * @param documentId - Document ID
     * @returns Processing status
     */
    async getProcessingStatus(documentId: string): Promise<{
        status: string;
        progress: number;
        result?: ProcessedDocument;
    }> {
        try {
            const url = `${this.backendConfig.endpoints.documents.status}?document_id=${documentId}`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${await this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`Status check failed: ${response.statusText}`);
            }

            const result = await response.json() as any;
            return result.data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to get status: ${errorMessage}`);
        }
    }

    /**
     * Analyze document with AI
     * @param document - Processed document
     * @param options - Analysis options
     * @returns Analysis result
     */
    private async analyzeWithBackend(
        document: ProcessedDocument,
        options: DocumentProcessingOptions
    ): Promise<DocumentAnalysisResult> {
        try {
            const response = await fetch(this.backendConfig.endpoints.documents.analyze, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await this.getAuthToken()}`
                },
                body: JSON.stringify({
                    content: document.content,
                    metadata: document.metadata,
                    analysis_type: options.analysisType || 'summary'
                })
            });

            if (!response.ok) {
                throw new Error(`Analysis failed: ${response.statusText}`);
            }

            const result = await response.json() as any;
            return result.data;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to analyze document: ${errorMessage}`);
        }
    }

    /**
     * Process PDF document (delegates to PdfProcessor)
     */
    private async processPdf(
        filePath: string,
        metadata: DocumentMetadata,
        progress: vscode.Progress<{ increment?: number; message?: string }>
    ): Promise<ProcessedDocument> {
        progress.report({ increment: 20, message: 'Processing PDF...' });
        const { PdfProcessor } = await import('./processors/PdfProcessor');
        const processor = new PdfProcessor();
        return processor.process(filePath, metadata);
    }

    /**
     * Process Word document (delegates to WordProcessor)
     */
    private async processWord(
        filePath: string,
        metadata: DocumentMetadata,
        progress: vscode.Progress<{ increment?: number; message?: string }>
    ): Promise<ProcessedDocument> {
        progress.report({ increment: 20, message: 'Processing Word document...' });
        const { WordProcessor } = await import('./processors/WordProcessor');
        const processor = new WordProcessor();
        return processor.process(filePath, metadata);
    }

    /**
     * Process Excel document (delegates to ExcelProcessor)
     */
    private async processExcel(
        filePath: string,
        metadata: DocumentMetadata,
        progress: vscode.Progress<{ increment?: number; message?: string }>
    ): Promise<ProcessedDocument> {
        progress.report({ increment: 20, message: 'Processing Excel spreadsheet...' });
        const { ExcelProcessor } = await import('./processors/ExcelProcessor');
        const processor = new ExcelProcessor();
        return processor.process(filePath, metadata);
    }

    /**
     * Process HTML document (delegates to HtmlProcessor)
     */
    private async processHtml(
        filePath: string,
        metadata: DocumentMetadata,
        progress: vscode.Progress<{ increment?: number; message?: string }>
    ): Promise<ProcessedDocument> {
        progress.report({ increment: 20, message: 'Processing HTML...' });
        const { HtmlProcessor } = await import('./processors/HtmlProcessor');
        const processor = new HtmlProcessor();
        return processor.process(filePath, metadata);
    }

    /**
     * Process plain text document
     */
    private async processText(
        filePath: string,
        metadata: DocumentMetadata,
        progress: vscode.Progress<{ increment?: number; message?: string }>
    ): Promise<ProcessedDocument> {
        progress.report({ increment: 20, message: 'Processing text file...' });
        const content = fs.readFileSync(filePath, 'utf-8');

        // Update metadata
        metadata.wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
        metadata.pageCount = 1;

        return {
            content,
            metadata,
            images: [],
            tables: []
        };
    }

    /**
     * Get document type from file extension
     */
    private getDocumentType(ext: string): DocumentType {
        const extMap: Record<string, DocumentType> = {
            '.pdf': 'pdf',
            '.doc': 'docx',
            '.docx': 'docx',
            '.xls': 'xlsx',
            '.xlsx': 'xlsx',
            '.ppt': 'pptx',
            '.pptx': 'pptx',
            '.html': 'html',
            '.htm': 'html',
            '.txt': 'txt',
            '.md': 'md',
            '.markdown': 'md'
        };

        return extMap[ext] || 'txt';
    }

    /**
     * Get MIME type from file extension
     */
    private getMimeType(ext: string): string {
        const mimeMap: Record<string, string> = {
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.ppt': 'application/vnd.ms-powerpoint',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            '.html': 'text/html',
            '.htm': 'text/html',
            '.txt': 'text/plain',
            '.md': 'text/markdown'
        };

        return mimeMap[ext] || 'application/octet-stream';
    }

    /**
     * Get authentication token for backend requests
     */
    private async getAuthToken(): Promise<string> {
        // Get token from VS Code secret storage
        const token = await vscode.workspace.getConfiguration('oropendola').get<string>('authToken');
        return token || '';
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this.processingQueue.clear();
    }
}

/**
 * Interface for processing tasks
 */
interface ProcessingTask {
    documentId: string;
    status: string;
    progress: number;
    startTime: Date;
}

/**
 * Singleton instance
 */
let instance: DocumentProcessor | null = null;

/**
 * Get DocumentProcessor singleton instance
 */
export function getInstance(): DocumentProcessor {
    if (!instance) {
        instance = new DocumentProcessor();
    }
    return instance;
}
