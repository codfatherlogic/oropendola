import { BackendConfig, getInstance as getBackendConfig } from '../config/BackendConfig';
import type {
    VectorEntry,
    VectorSearchResult,
    VectorSearchOptions,
    VectorIndexOptions,
    ConversationMemory,
    VectorDBStats
} from '../types';

/**
 * VectorDBClient - Client for interacting with vector database
 * Implements semantic search and memory storage using backend API
 */
export class VectorDBClient {
    private backendConfig: BackendConfig;
    private cache: Map<string, VectorSearchResult[]> = new Map();
    private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes

    constructor() {
        this.backendConfig = getBackendConfig();
    }

    /**
     * Index content for semantic search
     * @param content - Text content to index
     * @param options - Indexing options
     * @returns Indexed vector entry
     */
    async indexContent(content: string, options: VectorIndexOptions = {}): Promise<VectorEntry> {
        try {
            const response = await fetch(
                this.backendConfig.getApiUrl('/api/method/ai_assistant.api.vector_index'),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Frappe-CSRF-Token': await this.getCsrfToken()
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        content,
                        file_path: options.filePath,
                        metadata: options.metadata ? JSON.stringify(options.metadata) : undefined,
                        type: options.type || 'code',
                        workspace_id: options.workspaceId,
                        user_id: options.userId
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`Indexing failed: ${response.statusText}`);
            }

            const data = await response.json() as any;

            if (!data.success) {
                throw new Error(data.message || 'Indexing failed');
            }

            return {
                id: data.data.vector_id,
                content,
                embedding: [], // Not returned by backend
                metadata: options.metadata || {},
                type: options.type || 'code',
                similarity: 1.0,
                timestamp: new Date()
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Vector indexing error:', errorMessage);
            throw new Error(`Failed to index content: ${errorMessage}`);
        }
    }

    /**
     * Batch index multiple content items
     * @param items - Array of content items to index
     * @returns Array of indexed vector entries
     */
    async batchIndex(items: Array<{ content: string; options: VectorIndexOptions }>): Promise<VectorEntry[]> {
        const results: VectorEntry[] = [];

        // Process in parallel with concurrency limit
        const batchSize = 5;
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const batchPromises = batch.map(item => this.indexContent(item.content, item.options));
            const batchResults = await Promise.allSettled(batchPromises);

            for (const result of batchResults) {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                } else {
                    console.error('Batch index item failed:', result.reason);
                }
            }
        }

        return results;
    }

    /**
     * Search for similar content using semantic search
     * @param query - Search query
     * @param options - Search options
     * @returns Array of search results
     */
    async search(query: string, options: VectorSearchOptions = {}): Promise<VectorSearchResult[]> {
        try {
            // Check cache first
            const cacheKey = this.getCacheKey(query, options);
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                console.log('✅ Vector search cache hit');
                return cached;
            }

            const response = await fetch(
                this.backendConfig.getApiUrl('/api/method/ai_assistant.api.vector_search'),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Frappe-CSRF-Token': await this.getCsrfToken()
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        query,
                        limit: options.limit || 10,
                        type: options.type,
                        workspace_id: options.workspaceId,
                        user_id: options.userId,
                        min_similarity: options.minSimilarity || 0.5
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`Search failed: ${response.statusText}`);
            }

            const data = await response.json() as any;

            if (!data.success) {
                throw new Error(data.message || 'Search failed');
            }

            // Transform results
            const results: VectorSearchResult[] = (data.data.results || []).map((result: any) => ({
                id: result.id,
                content: result.content,
                similarity: result.score,
                metadata: result.metadata || {},
                type: result.type || 'code',
                timestamp: result.timestamp ? new Date(result.timestamp) : new Date(),
                filePath: result.metadata?.file_path,
                lineNumber: result.metadata?.line_number
            }));

            // Cache results
            this.saveToCache(cacheKey, results);

            return results;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Vector search error:', errorMessage);
            throw new Error(`Failed to search: ${errorMessage}`);
        }
    }

    /**
     * Store conversation memory for long-term context
     * @param conversation - Conversation messages
     * @param summary - Optional summary of the conversation
     * @returns Stored memory entry
     */
    async storeMemory(
        conversation: Array<{ role: string; content: string }>,
        summary?: string
    ): Promise<ConversationMemory> {
        try {
            const response = await fetch(
                this.backendConfig.getApiUrl('/api/method/ai_assistant.api.vector_store_memory'),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Frappe-CSRF-Token': await this.getCsrfToken()
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        conversation: JSON.stringify(conversation),
                        summary: summary || this.generateSummary(conversation)
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`Memory storage failed: ${response.statusText}`);
            }

            const data = await response.json() as any;

            if (!data.success) {
                throw new Error(data.message || 'Memory storage failed');
            }

            return {
                id: data.data.memory_id,
                conversation,
                summary: summary || this.generateSummary(conversation),
                timestamp: new Date(),
                relevance: 1.0
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Memory storage error:', errorMessage);
            throw new Error(`Failed to store memory: ${errorMessage}`);
        }
    }

    /**
     * Retrieve relevant memories based on query
     * @param query - Search query
     * @param limit - Maximum number of memories to retrieve
     * @returns Array of relevant conversation memories
     */
    async retrieveMemories(query: string, limit: number = 5): Promise<ConversationMemory[]> {
        try {
            const response = await fetch(
                this.backendConfig.getApiUrl('/api/method/ai_assistant.api.vector_retrieve_memories'),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Frappe-CSRF-Token': await this.getCsrfToken()
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        query,
                        limit
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`Memory retrieval failed: ${response.statusText}`);
            }

            const data = await response.json() as any;

            if (!data.success) {
                throw new Error(data.message || 'Memory retrieval failed');
            }

            // Transform results
            const memories: ConversationMemory[] = (data.data.memories || []).map((memory: any) => ({
                id: memory.id,
                conversation: JSON.parse(memory.conversation || '[]'),
                summary: memory.summary,
                timestamp: memory.timestamp ? new Date(memory.timestamp) : new Date(),
                relevance: memory.score || 0
            }));

            return memories;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Memory retrieval error:', errorMessage);
            throw new Error(`Failed to retrieve memories: ${errorMessage}`);
        }
    }

    /**
     * Delete a vector entry by ID
     * @param vectorId - ID of vector to delete
     * @returns Success status
     */
    async deleteVector(vectorId: string): Promise<boolean> {
        try {
            const response = await fetch(
                this.backendConfig.getApiUrl('/api/method/ai_assistant.api.vector_delete'),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Frappe-CSRF-Token': await this.getCsrfToken()
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        vector_id: vectorId
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`Deletion failed: ${response.statusText}`);
            }

            const data = await response.json() as any;
            return data.success === true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Vector deletion error:', errorMessage);
            return false;
        }
    }

    /**
     * Get vector database statistics
     * @returns Database statistics
     */
    async getStats(): Promise<VectorDBStats> {
        try {
            const response = await fetch(
                this.backendConfig.getApiUrl('/api/method/ai_assistant.api.vector_get_stats'),
                {
                    method: 'GET',
                    headers: {
                        'X-Frappe-CSRF-Token': await this.getCsrfToken()
                    },
                    credentials: 'include'
                }
            );

            if (!response.ok) {
                throw new Error(`Stats retrieval failed: ${response.statusText}`);
            }

            const data = await response.json() as any;

            if (!data.success) {
                throw new Error(data.message || 'Stats retrieval failed');
            }

            return {
                totalVectors: data.data.total_vectors || 0,
                totalMemories: data.data.total_memories || 0,
                vectorsByType: data.data.vectors_by_type || {},
                averageEmbeddingTime: data.data.avg_embedding_time || 0,
                lastIndexed: data.data.last_indexed ? new Date(data.data.last_indexed) : undefined
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Stats retrieval error:', errorMessage);
            return {
                totalVectors: 0,
                totalMemories: 0,
                vectorsByType: {},
                averageEmbeddingTime: 0
            };
        }
    }

    /**
     * Clear local cache
     */
    clearCache(): void {
        this.cache.clear();
        console.log('✅ Vector search cache cleared');
    }

    /**
     * Generate cache key for search results
     */
    private getCacheKey(query: string, options: VectorSearchOptions): string {
        return `${query}|${options.type || 'all'}|${options.limit || 10}|${options.minSimilarity || 0.5}`;
    }

    /**
     * Get results from cache if not expired
     */
    private getFromCache(key: string): VectorSearchResult[] | null {
        const cached = this.cache.get(key);
        if (!cached) {
            return null;
        }

        // Check if cache is still valid (not implemented timestamp check for simplicity)
        return cached;
    }

    /**
     * Save results to cache
     */
    private saveToCache(key: string, results: VectorSearchResult[]): void {
        this.cache.set(key, results);

        // Auto-clear cache after timeout
        setTimeout(() => {
            this.cache.delete(key);
        }, this.cacheTimeout);
    }

    /**
     * Generate a simple summary from conversation
     */
    private generateSummary(conversation: Array<{ role: string; content: string }>): string {
        // Extract key points from conversation
        const userMessages = conversation.filter(msg => msg.role === 'user');
        const lastUserMessage = userMessages[userMessages.length - 1];

        if (lastUserMessage) {
            // Use first 150 characters of last user message as summary
            return lastUserMessage.content.substring(0, 150) + (lastUserMessage.content.length > 150 ? '...' : '');
        }

        return 'Conversation summary';
    }

    /**
     * Get CSRF token for authenticated requests
     */
    private async getCsrfToken(): Promise<string> {
        try {
            // Try to get from cookie
            if (typeof document !== 'undefined') {
                const cookies = document.cookie.split(';');
                for (const cookie of cookies) {
                    const [name, value] = cookie.trim().split('=');
                    if (name === 'csrf_token') {
                        return value;
                    }
                }
            }

            // If not found, request may still work with session auth
            return '';
        } catch {
            return '';
        }
    }
}

/**
 * Singleton instance
 */
let instance: VectorDBClient | null = null;

/**
 * Get VectorDBClient singleton instance
 */
export function getInstance(): VectorDBClient {
    if (!instance) {
        instance = new VectorDBClient();
    }
    return instance;
}
