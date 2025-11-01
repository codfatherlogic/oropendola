import * as vscode from 'vscode';
import { QdrantService, SearchResult } from './QdrantService';
import axios from 'axios';

export interface SearchOptions {
    limit?: number;
    language?: string;
    filePath?: string;
    threshold?: number;
}

export interface SemanticSearchResult {
    filePath: string;
    content: string;
    score: number;
    language: string;
    startLine: number;
    endLine: number;
    functionName?: string;
    className?: string;
    context?: string;
}

export class SemanticSearch {
    private static instance: SemanticSearch;
    private qdrant: QdrantService;
    private embeddingApiKey: string;
    private embeddingProvider: string;

    private constructor() {
        this.qdrant = QdrantService.getInstance();

        const config = vscode.workspace.getConfiguration('oropendola');
        this.embeddingApiKey = config.get<string>('codeIndex.embeddingApiKey', '');
        this.embeddingProvider = config.get<string>('codeIndex.embeddingProvider', 'openai');
    }

    public static getInstance(): SemanticSearch {
        if (!SemanticSearch.instance) {
            SemanticSearch.instance = new SemanticSearch();
        }
        return SemanticSearch.instance;
    }

    public async search(
        query: string,
        options: SearchOptions = {}
    ): Promise<SemanticSearchResult[]> {
        const {
            limit = 10,
            language,
            filePath,
            threshold = 0.7
        } = options;

        // Generate embedding for query
        const queryEmbedding = await this.generateEmbedding(query);

        // Build filter
        const filter = this.buildFilter(language, filePath);

        // Search in Qdrant
        const results = await this.qdrant.search(queryEmbedding, limit, filter);

        // Filter by threshold and format results
        return results
            .filter(r => r.score >= threshold)
            .map(r => this.formatResult(r));
    }

    public async findSimilarCode(
        code: string,
        options: SearchOptions = {}
    ): Promise<SemanticSearchResult[]> {
        const {
            limit = 5,
            language,
            threshold = 0.8
        } = options;

        // Generate embedding for the code
        const codeEmbedding = await this.generateEmbedding(code);

        // Build filter
        const filter = this.buildFilter(language);

        // Search in Qdrant
        const results = await this.qdrant.search(codeEmbedding, limit, filter);

        // Filter by threshold and format results
        return results
            .filter(r => r.score >= threshold)
            .map(r => this.formatResult(r));
    }

    public async findRelatedFunctions(
        functionName: string,
        options: SearchOptions = {}
    ): Promise<SemanticSearchResult[]> {
        const {
            limit = 10,
            language
        } = options;

        // Search by function name in payload
        const filter: any = {
            must: [
                {
                    key: 'functionName',
                    match: { value: functionName }
                }
            ]
        };

        if (language) {
            filter.must.push({
                key: 'language',
                match: { value: language }
            });
        }

        // For simplicity, use a dummy vector
        // In practice, you might want to search by function content embedding
        const dummyVector = new Array(1536).fill(0);
        const results = await this.qdrant.search(dummyVector, limit, filter);

        return results.map(r => this.formatResult(r));
    }

    public async getContextForFile(
        filePath: string,
        maxChunks: number = 5
    ): Promise<SemanticSearchResult[]> {
        const filter = {
            must: [
                {
                    key: 'filePath',
                    match: { value: filePath }
                }
            ]
        };

        // Use a dummy vector since we're filtering by file path
        const dummyVector = new Array(1536).fill(0);
        const results = await this.qdrant.search(dummyVector, maxChunks, filter);

        return results.map(r => this.formatResult(r));
    }

    public async getRelevantContext(
        query: string,
        maxTokens: number = 2000
    ): Promise<string> {
        const results = await this.search(query, { limit: 10, threshold: 0.7 });

        let context = '';
        let tokenCount = 0;
        const estimatedTokensPerChar = 0.25; // Rough estimate

        for (const result of results) {
            const chunk = `// ${result.filePath}:${result.startLine}-${result.endLine}\n${result.content}\n\n`;
            const chunkTokens = Math.ceil(chunk.length * estimatedTokensPerChar);

            if (tokenCount + chunkTokens > maxTokens) {
                break;
            }

            context += chunk;
            tokenCount += chunkTokens;
        }

        return context;
    }

    private buildFilter(language?: string, filePath?: string): any {
        const must: any[] = [];

        if (language) {
            must.push({
                key: 'language',
                match: { value: language }
            });
        }

        if (filePath) {
            must.push({
                key: 'filePath',
                match: { value: filePath }
            });
        }

        return must.length > 0 ? { must } : undefined;
    }

    private formatResult(result: SearchResult): SemanticSearchResult {
        return {
            filePath: result.payload.filePath,
            content: result.payload.content,
            score: result.score,
            language: result.payload.language,
            startLine: result.payload.startLine,
            endLine: result.payload.endLine,
            functionName: result.payload.functionName,
            className: result.payload.className
        };
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

    public async searchWithExplanation(
        query: string,
        options: SearchOptions = {}
    ): Promise<{ results: SemanticSearchResult[]; explanation: string }> {
        const results = await this.search(query, options);

        const explanation = `Found ${results.length} relevant code chunks for query: "${query}"
Average similarity score: ${(results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(3)}
Languages: ${Array.from(new Set(results.map(r => r.language))).join(', ')}`;

        return { results, explanation };
    }
}
