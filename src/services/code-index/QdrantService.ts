import * as vscode from 'vscode';
import axios, { AxiosInstance } from 'axios';

export interface VectorPoint {
    id: string;
    vector: number[];
    payload: {
        filePath: string;
        content: string;
        language: string;
        functionName?: string;
        className?: string;
        startLine: number;
        endLine: number;
        lastModified: number;
    };
}

export interface SearchResult {
    id: string;
    score: number;
    payload: VectorPoint['payload'];
}

export class QdrantService {
    private static instance: QdrantService;
    private client: AxiosInstance;
    private collectionName: string = 'oropendola_code_index';
    private vectorSize: number = 1536; // OpenAI embedding size
    private initialized: boolean = false;

    private constructor() {
        const config = vscode.workspace.getConfiguration('oropendola');
        const qdrantUrl = config.get<string>('codeIndex.qdrantUrl', 'http://localhost:6333');

        this.client = axios.create({
            baseURL: qdrantUrl,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    public static getInstance(): QdrantService {
        if (!QdrantService.instance) {
            QdrantService.instance = new QdrantService();
        }
        return QdrantService.instance;
    }

    public async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        try {
            // Check if collection exists
            const collections = await this.listCollections();
            const exists = collections.includes(this.collectionName);

            if (!exists) {
                // Create collection
                await this.createCollection();
            }

            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize Qdrant:', error);
            throw new Error('Qdrant initialization failed. Is Qdrant running?');
        }
    }

    private async createCollection(): Promise<void> {
        await this.client.put(`/collections/${this.collectionName}`, {
            vectors: {
                size: this.vectorSize,
                distance: 'Cosine'
            },
            optimizers_config: {
                default_segment_number: 2
            },
            replication_factor: 1
        });
    }

    private async listCollections(): Promise<string[]> {
        const response = await this.client.get('/collections');
        return response.data.result.collections.map((c: any) => c.name);
    }

    public async upsertPoints(points: VectorPoint[]): Promise<void> {
        if (!this.initialized) {
            await this.initialize();
        }

        if (points.length === 0) {
            return;
        }

        await this.client.put(`/collections/${this.collectionName}/points`, {
            points: points.map(p => ({
                id: p.id,
                vector: p.vector,
                payload: p.payload
            }))
        });
    }

    public async search(
        vector: number[],
        limit: number = 10,
        filter?: any
    ): Promise<SearchResult[]> {
        if (!this.initialized) {
            await this.initialize();
        }

        const response = await this.client.post(
            `/collections/${this.collectionName}/points/search`,
            {
                vector,
                limit,
                filter,
                with_payload: true
            }
        );

        return response.data.result.map((r: any) => ({
            id: r.id,
            score: r.score,
            payload: r.payload
        }));
    }

    public async deletePoints(ids: string[]): Promise<void> {
        if (!this.initialized) {
            await this.initialize();
        }

        if (ids.length === 0) {
            return;
        }

        await this.client.post(`/collections/${this.collectionName}/points/delete`, {
            points: ids
        });
    }

    public async deleteByFilter(filter: any): Promise<void> {
        if (!this.initialized) {
            await this.initialize();
        }

        await this.client.post(`/collections/${this.collectionName}/points/delete`, {
            filter
        });
    }

    public async scrollPoints(
        limit: number = 100,
        offset?: string
    ): Promise<{ points: VectorPoint[]; nextOffset?: string }> {
        if (!this.initialized) {
            await this.initialize();
        }

        const response = await this.client.post(
            `/collections/${this.collectionName}/points/scroll`,
            {
                limit,
                offset,
                with_payload: true,
                with_vector: false
            }
        );

        return {
            points: response.data.result.points.map((p: any) => ({
                id: p.id,
                vector: [],
                payload: p.payload
            })),
            nextOffset: response.data.result.next_page_offset
        };
    }

    public async getCollectionInfo(): Promise<any> {
        if (!this.initialized) {
            await this.initialize();
        }

        const response = await this.client.get(`/collections/${this.collectionName}`);
        return response.data.result;
    }

    public async clearCollection(): Promise<void> {
        if (!this.initialized) {
            await this.initialize();
        }

        // Delete all points
        await this.client.post(`/collections/${this.collectionName}/points/delete`, {
            filter: {
                must: []
            }
        });
    }

    public async deleteCollection(): Promise<void> {
        try {
            await this.client.delete(`/collections/${this.collectionName}`);
            this.initialized = false;
        } catch (error) {
            console.error('Failed to delete collection:', error);
        }
    }

    public async healthCheck(): Promise<boolean> {
        try {
            const response = await this.client.get('/');
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }
}
