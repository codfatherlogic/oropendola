import * as vscode from 'vscode';
import { VectorDBClient, getInstance as getVectorClient } from './VectorDBClient';
import type { VectorSearchResult, ConversationMemory } from '../types';

/**
 * SemanticSearchProvider - Provides semantic search capabilities for chat integration
 * Enables context-aware AI responses by retrieving relevant code and memories
 */
export class SemanticSearchProvider {
    private vectorClient: VectorDBClient;
    private enabled: boolean = true;
    private searchCache: Map<string, {
        results: VectorSearchResult[];
        timestamp: number;
    }> = new Map();
    private cacheTimeout: number = 10 * 60 * 1000; // 10 minutes

    constructor() {
        this.vectorClient = getVectorClient();
        this.loadSettings();
    }

    /**
     * Load settings from VS Code configuration
     */
    private loadSettings(): void {
        const config = vscode.workspace.getConfiguration('oropendola');
        this.enabled = config.get('semanticSearch.enabled', true);
    }

    /**
     * Search for relevant context based on user query
     * @param query - User's question or message
     * @param options - Search options
     * @returns Relevant context for AI
     */
    async searchContext(
        query: string,
        options: {
            includeCode?: boolean;
            includeMemories?: boolean;
            maxResults?: number;
        } = {}
    ): Promise<{
        codeContext: VectorSearchResult[];
        memories: ConversationMemory[];
        contextString: string;
    }> {
        if (!this.enabled) {
            return {
                codeContext: [],
                memories: [],
                contextString: ''
            };
        }

        const maxResults = options.maxResults || 5;
        const includeCode = options.includeCode !== false; // Default true
        const includeMemories = options.includeMemories !== false; // Default true

        try {
            // Parallel search for code and memories
            const [codeContext, memories] = await Promise.all([
                includeCode
                    ? this.searchCodeContext(query, maxResults)
                    : Promise.resolve([]),
                includeMemories
                    ? this.searchMemories(query, Math.ceil(maxResults / 2))
                    : Promise.resolve([])
            ]);

            // Build context string for AI
            const contextString = this.buildContextString(codeContext, memories);

            return {
                codeContext,
                memories,
                contextString
            };
        } catch (error) {
            console.error('Semantic search error:', error);
            return {
                codeContext: [],
                memories: [],
                contextString: ''
            };
        }
    }

    /**
     * Search for relevant code context
     */
    private async searchCodeContext(query: string, limit: number): Promise<VectorSearchResult[]> {
        try {
            // Check cache
            const cached = this.getCachedResults(query);
            if (cached) {
                return cached.slice(0, limit);
            }

            // Search for code
            const results = await this.vectorClient.search(query, {
                limit,
                type: 'code',
                minSimilarity: 0.6 // Higher threshold for code relevance
            });

            // Cache results
            this.cacheResults(query, results);

            return results;
        } catch (error) {
            console.error('Code context search error:', error);
            return [];
        }
    }

    /**
     * Search for relevant conversation memories
     */
    private async searchMemories(query: string, limit: number): Promise<ConversationMemory[]> {
        try {
            const memories = await this.vectorClient.retrieveMemories(query, limit);
            return memories.filter(m => m.relevance > 0.5); // Filter low-relevance memories
        } catch (error) {
            console.error('Memory search error:', error);
            return [];
        }
    }

    /**
     * Build context string for AI from search results
     */
    private buildContextString(
        codeContext: VectorSearchResult[],
        memories: ConversationMemory[]
    ): string {
        const parts: string[] = [];

        // Add code context
        if (codeContext.length > 0) {
            parts.push('=== Relevant Code Context ===');
            for (const result of codeContext) {
                const location = result.filePath
                    ? `\nFile: ${result.filePath}${result.lineNumber ? `:${result.lineNumber}` : ''}`
                    : '';
                parts.push(`\n[Similarity: ${(result.similarity * 100).toFixed(1)}%]${location}\n${result.content}\n`);
            }
        }

        // Add memories
        if (memories.length > 0) {
            parts.push('\n=== Relevant Past Conversations ===');
            for (const memory of memories) {
                parts.push(`\n[Relevance: ${(memory.relevance * 100).toFixed(1)}%]`);
                parts.push(`Summary: ${memory.summary}`);

                // Include last 2 messages from conversation
                const recentMessages = memory.conversation.slice(-2);
                for (const msg of recentMessages) {
                    parts.push(`${msg.role}: ${msg.content.substring(0, 200)}${msg.content.length > 200 ? '...' : ''}`);
                }
                parts.push('');
            }
        }

        return parts.join('\n');
    }

    /**
     * Store current conversation as memory
     */
    async storeConversation(
        messages: Array<{ role: string; content: string }>,
        summary?: string
    ): Promise<void> {
        if (!this.enabled) {
            return;
        }

        try {
            await this.vectorClient.storeMemory(messages, summary);
            console.log('✅ Conversation stored as memory');
        } catch (error) {
            console.error('Failed to store conversation:', error);
        }
    }

    /**
     * Index current file for semantic search
     */
    async indexCurrentFile(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor');
            return;
        }

        const document = editor.document;
        const content = document.getText();
        const filePath = document.uri.fsPath;

        if (content.length === 0) {
            vscode.window.showWarningMessage('File is empty');
            return;
        }

        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Indexing file for semantic search...',
                cancellable: false
            }, async (progress) => {
                progress.report({ increment: 0, message: 'Processing...' });

                // Split into chunks if file is large
                const chunks = this.splitIntoChunks(content, 500);

                for (let i = 0; i < chunks.length; i++) {
                    await this.vectorClient.indexContent(chunks[i], {
                        filePath,
                        metadata: {
                            file_path: filePath,
                            language: document.languageId,
                            chunk: i,
                            total_chunks: chunks.length
                        },
                        type: 'code'
                    });

                    progress.report({
                        increment: (100 / chunks.length),
                        message: `Chunk ${i + 1}/${chunks.length}`
                    });
                }
            });

            vscode.window.showInformationMessage(
                `✅ File indexed successfully: ${document.fileName}`
            );

            // Clear cache to include new content
            this.clearCache();
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to index file: ${errorMsg}`);
        }
    }

    /**
     * Index entire workspace
     */
    async indexWorkspace(): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showWarningMessage('No workspace folder open');
            return;
        }

        try {
            const confirm = await vscode.window.showWarningMessage(
                'Index entire workspace? This may take several minutes.',
                'Yes', 'No'
            );

            if (confirm !== 'Yes') {
                return;
            }

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Indexing workspace...',
                cancellable: true
            }, async (progress, token) => {
                // Find all code files
                const files = await vscode.workspace.findFiles(
                    '**/*.{js,ts,jsx,tsx,py,java,cpp,c,h,cs,go,rs,php,rb,swift,kt}',
                    '**/node_modules/**',
                    1000 // Limit to 1000 files
                );

                progress.report({ increment: 0, message: `Found ${files.length} files` });

                let indexed = 0;
                for (const file of files) {
                    if (token.isCancellationRequested) {
                        break;
                    }

                    try {
                        const document = await vscode.workspace.openTextDocument(file);
                        const content = document.getText();

                        if (content.length > 0 && content.length < 100000) { // Skip very large files
                            const chunks = this.splitIntoChunks(content, 500);

                            for (let i = 0; i < chunks.length; i++) {
                                await this.vectorClient.indexContent(chunks[i], {
                                    filePath: file.fsPath,
                                    metadata: {
                                        file_path: file.fsPath,
                                        language: document.languageId,
                                        chunk: i,
                                        total_chunks: chunks.length
                                    },
                                    type: 'code'
                                });
                            }
                        }

                        indexed++;
                        progress.report({
                            increment: (100 / files.length),
                            message: `${indexed}/${files.length} files`
                        });
                    } catch (error) {
                        console.error(`Failed to index ${file.fsPath}:`, error);
                    }
                }

                vscode.window.showInformationMessage(
                    `✅ Workspace indexed: ${indexed} files`
                );

                // Clear cache
                this.clearCache();
            });
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Workspace indexing failed: ${errorMsg}`);
        }
    }

    /**
     * Split text into chunks for indexing
     */
    private splitIntoChunks(text: string, maxLines: number = 500): string[] {
        const lines = text.split('\n');
        const chunks: string[] = [];

        for (let i = 0; i < lines.length; i += maxLines) {
            const chunk = lines.slice(i, i + maxLines).join('\n');
            if (chunk.trim().length > 0) {
                chunks.push(chunk);
            }
        }

        return chunks.length > 0 ? chunks : [text];
    }

    /**
     * Get cached search results
     */
    private getCachedResults(query: string): VectorSearchResult[] | null {
        const cached = this.searchCache.get(query);
        if (!cached) {
            return null;
        }

        // Check if cache is expired
        if (Date.now() - cached.timestamp > this.cacheTimeout) {
            this.searchCache.delete(query);
            return null;
        }

        return cached.results;
    }

    /**
     * Cache search results
     */
    private cacheResults(query: string, results: VectorSearchResult[]): void {
        this.searchCache.set(query, {
            results,
            timestamp: Date.now()
        });
    }

    /**
     * Clear search cache
     */
    clearCache(): void {
        this.searchCache.clear();
        this.vectorClient.clearCache();
        console.log('✅ Semantic search cache cleared');
    }

    /**
     * Enable/disable semantic search
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        console.log(`Semantic search ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Check if semantic search is enabled
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Get statistics
     */
    async getStats() {
        return this.vectorClient.getStats();
    }
}

/**
 * Singleton instance
 */
let instance: SemanticSearchProvider | null = null;

/**
 * Get SemanticSearchProvider singleton instance
 */
export function getInstance(): SemanticSearchProvider {
    if (!instance) {
        instance = new SemanticSearchProvider();
    }
    return instance;
}
