/**
 * Marketplace Client
 *
 * Client for VS Code Marketplace API (Phase 1)
 * Will integrate with custom Oropendola backend in Phase 2
 *
 * Week 8: Marketplace & Plugins - Phase 1
 */

import { MarketplaceExtension, MarketplaceSearchOptions, MarketplaceSearchResult } from '../types';

export class MarketplaceClient {
    private static instance: MarketplaceClient;
    private baseUrl: string = 'https://marketplace.visualstudio.com/_apis/public/gallery';
    private cache: Map<string, { data: any; timestamp: number }> = new Map();
    private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes

    private constructor() {}

    public static getInstance(): MarketplaceClient {
        if (!MarketplaceClient.instance) {
            MarketplaceClient.instance = new MarketplaceClient();
        }
        return MarketplaceClient.instance;
    }

    /**
     * Search extensions in VS Code Marketplace
     */
    public async searchExtensions(options: MarketplaceSearchOptions = {}): Promise<MarketplaceSearchResult> {
        const {
            query = '',
            category = undefined,
            pageSize = 20,
            pageNumber = 1,
            sortBy = 'Installs'
        } = options;

        // Check cache
        const cacheKey = `search:${query}:${category}:${pageSize}:${pageNumber}:${sortBy}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            // Build filters array
            const filters: any[] = [];
            const criteria: any[] = [];

            // Add search text
            if (query) {
                criteria.push({
                    filterType: 10, // SearchText
                    value: query
                });
            }

            // Add category filter
            if (category) {
                criteria.push({
                    filterType: 5, // Category
                    value: category
                });
            }

            // Add target filter (VS Code)
            criteria.push({
                filterType: 8, // Target
                value: 'Microsoft.VisualStudio.Code'
            });

            // Add exclude non-validated
            criteria.push({
                filterType: 12, // ExcludeWithFlags
                value: '4096' // Exclude non-validated
            });

            filters.push({
                criteria,
                pageNumber,
                pageSize,
                sortBy: this.getSortByValue(sortBy),
                sortOrder: 'Descending'
            });

            // Build request body
            const requestBody = {
                filters,
                assetTypes: [],
                flags: 914 // Include all metadata
            };

            // Make request
            const response = await fetch(`${this.baseUrl}/extensionquery`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json;api-version=3.0-preview.1'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const results = this.parseSearchResults(data);

            // Cache results
            this.saveToCache(cacheKey, results);

            return results;
        } catch (error) {
            console.error('Failed to search marketplace:', error);
            return {
                extensions: [],
                total: 0,
                pageNumber: pageNumber,
                pageSize: pageSize
            };
        }
    }

    /**
     * Get extension details by ID
     */
    public async getExtension(extensionId: string): Promise<MarketplaceExtension | null> {
        // extensionId format: publisher.name
        const [publisher, name] = extensionId.split('.');

        if (!publisher || !name) {
            console.error('Invalid extension ID format. Expected: publisher.name');
            return null;
        }

        // Check cache
        const cacheKey = `extension:${extensionId}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            const requestBody = {
                filters: [{
                    criteria: [
                        { filterType: 7, value: `${publisher}.${name}` }
                    ],
                    pageNumber: 1,
                    pageSize: 1
                }],
                flags: 914
            };

            const response = await fetch(`${this.baseUrl}/extensionquery`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json;api-version=3.0-preview.1'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const results = this.parseSearchResults(data);

            if (results.extensions.length === 0) {
                return null;
            }

            const extension = results.extensions[0];

            // Cache result
            this.saveToCache(cacheKey, extension);

            return extension;
        } catch (error) {
            console.error(`Failed to get extension ${extensionId}:`, error);
            return null;
        }
    }

    /**
     * Get featured/trending extensions
     */
    public async getFeatured(category?: string): Promise<MarketplaceExtension[]> {
        const cacheKey = `featured:${category || 'all'}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }

        try {
            const result = await this.searchExtensions({
                category,
                pageSize: 10,
                sortBy: 'Installs'
            });

            const featured = result.extensions;
            this.saveToCache(cacheKey, featured);

            return featured;
        } catch (error) {
            console.error('Failed to get featured extensions:', error);
            return [];
        }
    }

    /**
     * Parse search results from API response
     */
    private parseSearchResults(data: any): MarketplaceSearchResult {
        const result: MarketplaceSearchResult = {
            extensions: [],
            total: 0,
            pageNumber: 1,
            pageSize: 20
        };

        if (!data.results || data.results.length === 0) {
            return result;
        }

        const firstResult = data.results[0];
        result.total = firstResult.resultMetadata?.[0]?.metadataItems?.[0]?.count || 0;

        if (!firstResult.extensions || firstResult.extensions.length === 0) {
            return result;
        }

        result.extensions = firstResult.extensions.map((ext: any) => {
            const versions = ext.versions || [];
            const latestVersion = versions[0] || {};
            const statistics = ext.statistics || [];
            const properties = latestVersion.properties || [];

            // Get install count
            const installStat = statistics.find((s: any) => s.statisticName === 'install');
            const installs = installStat ? parseInt(installStat.value, 10) : 0;

            // Get rating
            const ratingStat = statistics.find((s: any) => s.statisticName === 'averagerating');
            const rating = ratingStat ? parseFloat(ratingStat.value) : 0;

            const ratingCountStat = statistics.find((s: any) => s.statisticName === 'ratingcount');
            const ratingCount = ratingCountStat ? parseInt(ratingCountStat.value, 10) : 0;

            // Get repository URL
            const repoProp = properties.find((p: any) => p.key === 'Microsoft.VisualStudio.Services.Links.GitHub');
            const repository = repoProp?.value || '';

            // Get categories
            const categories = ext.categories?.map((c: string) => c.toLowerCase()) || [];

            // Get icon
            const iconAsset = latestVersion.files?.find((f: any) => f.assetType === 'Microsoft.VisualStudio.Services.Icons.Default');
            const iconUrl = iconAsset?.source || '';

            return {
                id: ext.extensionId,
                extensionId: ext.extensionId,
                publisher: ext.publisher.publisherName,
                name: ext.extensionName,
                displayName: ext.displayName,
                shortDescription: ext.shortDescription || '',
                description: latestVersion.description || ext.shortDescription || '',
                version: latestVersion.version || '1.0.0',
                installs,
                downloads: installs, // VS Code uses 'installs'
                rating,
                ratingCount,
                categories,
                tags: ext.tags || [],
                repository,
                homepage: ext.publisher.domain || '',
                iconUrl,
                lastUpdated: new Date(ext.lastUpdated || Date.now()),
                publishedDate: new Date(ext.publishedDate || ext.releaseDate || Date.now())
            };
        });

        return result;
    }

    /**
     * Get sort value for API
     */
    private getSortByValue(sortBy: string): number {
        const sortMap: Record<string, number> = {
            'Installs': 4,
            'Rating': 12,
            'Name': 2,
            'PublishedDate': 10,
            'UpdatedDate': 1
        };
        return sortMap[sortBy] || 4; // Default to Installs
    }

    /**
     * Get from cache
     */
    private getFromCache(key: string): any | null {
        const cached = this.cache.get(key);
        if (!cached) {
            return null;
        }

        const age = Date.now() - cached.timestamp;
        if (age > this.cacheTimeout) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    }

    /**
     * Save to cache
     */
    private saveToCache(key: string, data: any): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Clear cache
     */
    public clearCache(): void {
        this.cache.clear();
    }
}

export function getInstance(): MarketplaceClient {
    return MarketplaceClient.getInstance();
}
