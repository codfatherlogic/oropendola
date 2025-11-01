import * as vscode from 'vscode';
import * as path from 'path';
import * as crypto from 'crypto';
import { QdrantService, VectorPoint } from './QdrantService';
import axios from 'axios';

export interface CodeChunk {
    id: string;
    filePath: string;
    content: string;
    language: string;
    functionName?: string;
    className?: string;
    startLine: number;
    endLine: number;
}

export interface IndexStats {
    totalFiles: number;
    totalChunks: number;
    indexedFiles: number;
    indexedChunks: number;
    lastIndexTime?: number;
}

export class CodeIndexer {
    private static instance: CodeIndexer;
    private qdrant: QdrantService;
    private indexing: boolean = false;
    private stats: IndexStats;
    private embeddingApiKey: string;
    private embeddingProvider: string;

    private constructor() {
        this.qdrant = QdrantService.getInstance();
        this.stats = {
            totalFiles: 0,
            totalChunks: 0,
            indexedFiles: 0,
            indexedChunks: 0
        };

        const config = vscode.workspace.getConfiguration('oropendola');
        this.embeddingApiKey = config.get<string>('codeIndex.embeddingApiKey', '');
        this.embeddingProvider = config.get<string>('codeIndex.embeddingProvider', 'openai');
    }

    public static getInstance(): CodeIndexer {
        if (!CodeIndexer.instance) {
            CodeIndexer.instance = new CodeIndexer();
        }
        return CodeIndexer.instance;
    }

    public async indexWorkspace(
        progressCallback?: (progress: number, message: string) => void
    ): Promise<void> {
        if (this.indexing) {
            throw new Error('Indexing already in progress');
        }

        this.indexing = true;

        try {
            await this.qdrant.initialize();

            // Get workspace configuration
            const config = vscode.workspace.getConfiguration('oropendola');
            const includeFileTypes = config.get<string[]>('workspace.indexing.includeFileTypes', []);
            const excludePatterns = config.get<string[]>('workspace.indexing.excludePatterns', []);
            const maxFileSize = config.get<number>('workspace.indexing.maxFileSize', 5242880);

            // Find all files in workspace
            const files = await this.findFiles(includeFileTypes, excludePatterns);
            this.stats.totalFiles = files.length;

            progressCallback?.(0, `Found ${files.length} files to index`);

            // Process files in batches
            const batchSize = 10;
            for (let i = 0; i < files.length; i += batchSize) {
                const batch = files.slice(i, i + batchSize);
                await this.indexFileBatch(batch, maxFileSize);

                const progress = ((i + batch.length) / files.length) * 100;
                progressCallback?.(progress, `Indexed ${i + batch.length}/${files.length} files`);
            }

            this.stats.lastIndexTime = Date.now();
            progressCallback?.(100, 'Indexing complete');
        } catch (error) {
            console.error('Indexing failed:', error);
            throw error;
        } finally {
            this.indexing = false;
        }
    }

    private async findFiles(
        includeFileTypes: string[],
        excludePatterns: string[]
    ): Promise<vscode.Uri[]> {
        if (includeFileTypes.length === 0) {
            // Index all text files
            includeFileTypes = ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'go', 'rs'];
        }

        const includePattern = `**/*.{${includeFileTypes.join(',')}}`;
        const excludePattern = `{${excludePatterns.join(',')}}`;

        return await vscode.workspace.findFiles(includePattern, excludePattern);
    }

    private async indexFileBatch(files: vscode.Uri[], maxFileSize: number): Promise<void> {
        const points: VectorPoint[] = [];

        for (const file of files) {
            try {
                const chunks = await this.parseFile(file, maxFileSize);

                for (const chunk of chunks) {
                    const embedding = await this.generateEmbedding(chunk.content);

                    points.push({
                        id: chunk.id,
                        vector: embedding,
                        payload: {
                            filePath: chunk.filePath,
                            content: chunk.content,
                            language: chunk.language,
                            functionName: chunk.functionName,
                            className: chunk.className,
                            startLine: chunk.startLine,
                            endLine: chunk.endLine,
                            lastModified: Date.now()
                        }
                    });
                }

                this.stats.indexedFiles++;
                this.stats.indexedChunks += chunks.length;
            } catch (error) {
                console.error(`Failed to index file ${file.fsPath}:`, error);
            }
        }

        if (points.length > 0) {
            await this.qdrant.upsertPoints(points);
        }
    }

    private async parseFile(file: vscode.Uri, maxFileSize: number): Promise<CodeChunk[]> {
        const stat = await vscode.workspace.fs.stat(file);

        if (stat.size > maxFileSize) {
            console.log(`Skipping large file: ${file.fsPath} (${stat.size} bytes)`);
            return [];
        }

        const content = await vscode.workspace.fs.readFile(file);
        const text = Buffer.from(content).toString('utf8');
        const language = this.detectLanguage(file.fsPath);

        // For now, chunk by function or class
        // In a real implementation, you'd use a language parser
        return this.chunkByLines(file.fsPath, text, language);
    }

    private chunkByLines(
        filePath: string,
        content: string,
        language: string,
        linesPerChunk: number = 50
    ): CodeChunk[] {
        const lines = content.split('\n');
        const chunks: CodeChunk[] = [];

        for (let i = 0; i < lines.length; i += linesPerChunk) {
            const chunkLines = lines.slice(i, i + linesPerChunk);
            const chunkContent = chunkLines.join('\n');

            if (chunkContent.trim().length === 0) {
                continue;
            }

            const id = this.generateChunkId(filePath, i, i + chunkLines.length);

            chunks.push({
                id,
                filePath,
                content: chunkContent,
                language,
                startLine: i,
                endLine: i + chunkLines.length
            });
        }

        return chunks;
    }

    private detectLanguage(filePath: string): string {
        const ext = path.extname(filePath).toLowerCase();
        const languageMap: Record<string, string> = {
            '.js': 'javascript',
            '.jsx': 'javascriptreact',
            '.ts': 'typescript',
            '.tsx': 'typescriptreact',
            '.py': 'python',
            '.java': 'java',
            '.c': 'c',
            '.cpp': 'cpp',
            '.h': 'c',
            '.go': 'go',
            '.rs': 'rust',
            '.rb': 'ruby',
            '.php': 'php',
            '.cs': 'csharp',
            '.swift': 'swift',
            '.kt': 'kotlin'
        };

        return languageMap[ext] || 'plaintext';
    }

    private generateChunkId(filePath: string, startLine: number, endLine: number): string {
        const data = `${filePath}:${startLine}:${endLine}`;
        return crypto.createHash('md5').update(data).digest('hex');
    }

    private async generateEmbedding(text: string): Promise<number[]> {
        if (!this.embeddingApiKey) {
            throw new Error('Embedding API key not configured');
        }

        if (this.embeddingProvider === 'openai') {
            return await this.generateOpenAIEmbedding(text);
        } else {
            throw new Error(`Unsupported embedding provider: ${this.embeddingProvider}`);
        }
    }

    private async generateOpenAIEmbedding(text: string): Promise<number[]> {
        try {
            const response = await axios.post(
                'https://api.openai.com/v1/embeddings',
                {
                    input: text,
                    model: 'text-embedding-ada-002'
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.embeddingApiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data.data[0].embedding;
        } catch (error) {
            console.error('Failed to generate embedding:', error);
            throw new Error('Failed to generate embedding');
        }
    }

    public async indexFile(filePath: string): Promise<void> {
        const uri = vscode.Uri.file(filePath);
        const config = vscode.workspace.getConfiguration('oropendola');
        const maxFileSize = config.get<number>('workspace.indexing.maxFileSize', 5242880);

        await this.indexFileBatch([uri], maxFileSize);
    }

    public async deleteFileFromIndex(filePath: string): Promise<void> {
        await this.qdrant.deleteByFilter({
            must: [
                {
                    key: 'filePath',
                    match: { value: filePath }
                }
            ]
        });
    }

    public async clearIndex(): Promise<void> {
        await this.qdrant.clearCollection();
        this.stats = {
            totalFiles: 0,
            totalChunks: 0,
            indexedFiles: 0,
            indexedChunks: 0
        };
    }

    public getStats(): IndexStats {
        return { ...this.stats };
    }

    public isIndexing(): boolean {
        return this.indexing;
    }

    public async getIndexedFiles(): Promise<string[]> {
        const files = new Set<string>();
        let offset: string | undefined;

        while (true) {
            const result = await this.qdrant.scrollPoints(100, offset);

            result.points.forEach(point => {
                files.add(point.payload.filePath);
            });

            if (!result.nextOffset) {
                break;
            }

            offset = result.nextOffset;
        }

        return Array.from(files);
    }
}
