import * as vscode from 'vscode';

export enum SyncStatus {
    SYNCED = 'synced',
    SYNCING = 'syncing',
    ERROR = 'error',
    OFFLINE = 'offline',
    CONFLICT = 'conflict'
}

export enum SyncItemType {
    SETTINGS = 'settings',
    PROMPTS = 'prompts',
    CHECKPOINTS = 'checkpoints',
    CONVERSATIONS = 'conversations',
    CUSTOM_MODES = 'custom_modes',
    CODE_INDEX = 'code_index'
}

export interface SyncItem {
    id: string;
    type: SyncItemType;
    data: any;
    version: number;
    lastModified: number;
    lastSync?: number;
    hash: string;
}

export interface SyncConfig {
    enabled: boolean;
    endpoint: string;
    apiKey: string;
    organizationId?: string;
    autoSync: boolean;
    syncInterval: number; // milliseconds
    itemsToSync: SyncItemType[];
}

export interface SyncConflict {
    itemId: string;
    type: SyncItemType;
    localVersion: number;
    remoteVersion: number;
    localData: any;
    remoteData: any;
    timestamp: number;
}

export interface SyncLog {
    timestamp: number;
    action: 'push' | 'pull' | 'conflict' | 'error';
    itemType: SyncItemType;
    itemId: string;
    message: string;
    success: boolean;
}

export class CloudSyncService {
    private static instance: CloudSyncService;
    private config: SyncConfig;
    private status: SyncStatus;
    private conflicts: Map<string, SyncConflict>;
    private syncLogs: SyncLog[];
    private syncTimer?: NodeJS.Timeout;
    private onStatusChange?: (status: SyncStatus) => void;
    private onConflict?: (conflict: SyncConflict) => void;

    private constructor() {
        this.config = {
            enabled: false,
            endpoint: '',
            apiKey: '',
            autoSync: false,
            syncInterval: 300000, // 5 minutes
            itemsToSync: [
                SyncItemType.SETTINGS,
                SyncItemType.PROMPTS,
                SyncItemType.CUSTOM_MODES
            ]
        };
        this.status = SyncStatus.OFFLINE;
        this.conflicts = new Map();
        this.syncLogs = [];
    }

    public static getInstance(): CloudSyncService {
        if (!CloudSyncService.instance) {
            CloudSyncService.instance = new CloudSyncService();
        }
        return CloudSyncService.instance;
    }

    public setStatusChangeCallback(callback: (status: SyncStatus) => void): void {
        this.onStatusChange = callback;
    }

    public setConflictCallback(callback: (conflict: SyncConflict) => void): void {
        this.onConflict = callback;
    }

    private updateStatus(status: SyncStatus): void {
        this.status = status;
        if (this.onStatusChange) {
            this.onStatusChange(status);
        }
    }

    public getStatus(): SyncStatus {
        return this.status;
    }

    public getConfig(): SyncConfig {
        return { ...this.config };
    }

    public async updateConfig(updates: Partial<SyncConfig>): Promise<void> {
        this.config = { ...this.config, ...updates };

        // Update auto-sync timer
        if (this.config.autoSync && this.config.enabled) {
            this.startAutoSync();
        } else {
            this.stopAutoSync();
        }

        // Save to workspace configuration
        const vsConfig = vscode.workspace.getConfiguration('oropendola');
        await vsConfig.update('cloudSync', this.config, vscode.ConfigurationTarget.Global);
    }

    public async connect(): Promise<boolean> {
        if (!this.config.endpoint || !this.config.apiKey) {
            this.updateStatus(SyncStatus.ERROR);
            throw new Error('Cloud sync endpoint and API key are required');
        }

        try {
            this.updateStatus(SyncStatus.SYNCING);

            // Test connection
            const response = await this.makeRequest('GET', '/health');

            if (response.ok) {
                this.updateStatus(SyncStatus.SYNCED);
                this.config.enabled = true;

                if (this.config.autoSync) {
                    this.startAutoSync();
                }

                this.addLog('pull', SyncItemType.SETTINGS, 'connection', 'Connected to cloud sync', true);
                return true;
            } else {
                throw new Error('Connection test failed');
            }
        } catch (error) {
            this.updateStatus(SyncStatus.ERROR);
            this.addLog('pull', SyncItemType.SETTINGS, 'connection', `Connection failed: ${error}`, false);
            throw error;
        }
    }

    public async disconnect(): Promise<void> {
        this.stopAutoSync();
        this.config.enabled = false;
        this.updateStatus(SyncStatus.OFFLINE);
        this.addLog('pull', SyncItemType.SETTINGS, 'connection', 'Disconnected from cloud sync', true);
    }

    private startAutoSync(): void {
        this.stopAutoSync();
        this.syncTimer = setInterval(() => {
            this.syncAll().catch(error => {
                console.error('Auto-sync error:', error);
            });
        }, this.config.syncInterval);
    }

    private stopAutoSync(): void {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = undefined;
        }
    }

    public async syncAll(): Promise<void> {
        if (!this.config.enabled) {
            throw new Error('Cloud sync is not enabled');
        }

        this.updateStatus(SyncStatus.SYNCING);

        try {
            for (const itemType of this.config.itemsToSync) {
                await this.syncItem(itemType);
            }
            this.updateStatus(SyncStatus.SYNCED);
        } catch (error) {
            this.updateStatus(SyncStatus.ERROR);
            throw error;
        }
    }

    public async syncItem(type: SyncItemType): Promise<void> {
        // Get local items
        const localItems = await this.getLocalItems(type);

        // Get remote items
        const remoteItems = await this.getRemoteItems(type);

        // Compare and sync
        for (const localItem of localItems) {
            const remoteItem = remoteItems.find(r => r.id === localItem.id);

            if (!remoteItem) {
                // Push new item to cloud
                await this.pushItem(localItem);
            } else if (localItem.lastModified > remoteItem.lastModified) {
                // Local is newer, push
                await this.pushItem(localItem);
            } else if (localItem.lastModified < remoteItem.lastModified) {
                // Remote is newer, pull
                await this.pullItem(remoteItem);
            } else if (localItem.hash !== remoteItem.hash) {
                // Same timestamp but different content - conflict
                this.handleConflict(localItem, remoteItem);
            }
        }

        // Pull items that don't exist locally
        for (const remoteItem of remoteItems) {
            const localItem = localItems.find(l => l.id === remoteItem.id);
            if (!localItem) {
                await this.pullItem(remoteItem);
            }
        }
    }

    private async getLocalItems(type: SyncItemType): Promise<SyncItem[]> {
        // This would retrieve items from local storage
        // Implementation depends on how data is stored locally
        const items: SyncItem[] = [];

        switch (type) {
            case SyncItemType.SETTINGS:
                // Get settings from VS Code configuration
                const config = vscode.workspace.getConfiguration('oropendola');
                items.push({
                    id: 'settings',
                    type: SyncItemType.SETTINGS,
                    data: config,
                    version: 1,
                    lastModified: Date.now(),
                    hash: this.generateHash(config)
                });
                break;

            case SyncItemType.PROMPTS:
            case SyncItemType.CUSTOM_MODES:
            case SyncItemType.CHECKPOINTS:
            case SyncItemType.CONVERSATIONS:
            case SyncItemType.CODE_INDEX:
                // Get data from respective managers
                // Would be implemented based on actual data sources
                break;
        }

        return items;
    }

    private async getRemoteItems(type: SyncItemType): Promise<SyncItem[]> {
        try {
            const response = await this.makeRequest('GET', `/sync/${type}`);

            if (response.ok) {
                const data = await response.json();
                return data.items || [];
            } else {
                throw new Error(`Failed to fetch remote items: ${response.statusText}`);
            }
        } catch (error) {
            this.addLog('pull', type, 'fetch', `Failed to fetch remote items: ${error}`, false);
            throw error;
        }
    }

    private async pushItem(item: SyncItem): Promise<void> {
        try {
            const response = await this.makeRequest('POST', `/sync/${item.type}/${item.id}`, item);

            if (response.ok) {
                item.lastSync = Date.now();
                this.addLog('push', item.type, item.id, 'Item pushed to cloud', true);
            } else {
                throw new Error(`Push failed: ${response.statusText}`);
            }
        } catch (error) {
            this.addLog('push', item.type, item.id, `Push failed: ${error}`, false);
            throw error;
        }
    }

    private async pullItem(item: SyncItem): Promise<void> {
        try {
            // Apply remote item to local storage
            await this.applyLocalItem(item);
            item.lastSync = Date.now();
            this.addLog('pull', item.type, item.id, 'Item pulled from cloud', true);
        } catch (error) {
            this.addLog('pull', item.type, item.id, `Pull failed: ${error}`, false);
            throw error;
        }
    }

    private handleConflict(localItem: SyncItem, remoteItem: SyncItem): void {
        const conflict: SyncConflict = {
            itemId: localItem.id,
            type: localItem.type,
            localVersion: localItem.version,
            remoteVersion: remoteItem.version,
            localData: localItem.data,
            remoteData: remoteItem.data,
            timestamp: Date.now()
        };

        this.conflicts.set(localItem.id, conflict);
        this.updateStatus(SyncStatus.CONFLICT);
        this.addLog('conflict', localItem.type, localItem.id, 'Sync conflict detected', false);

        if (this.onConflict) {
            this.onConflict(conflict);
        }
    }

    public async resolveConflict(itemId: string, useLocal: boolean): Promise<void> {
        const conflict = this.conflicts.get(itemId);
        if (!conflict) {
            throw new Error('Conflict not found');
        }

        const itemToUse: SyncItem = {
            id: conflict.itemId,
            type: conflict.type,
            data: useLocal ? conflict.localData : conflict.remoteData,
            version: Math.max(conflict.localVersion, conflict.remoteVersion) + 1,
            lastModified: Date.now(),
            hash: this.generateHash(useLocal ? conflict.localData : conflict.remoteData)
        };

        if (useLocal) {
            // Push local to cloud
            await this.pushItem(itemToUse);
        } else {
            // Pull remote to local
            await this.pullItem(itemToUse);
        }

        this.conflicts.delete(itemId);

        if (this.conflicts.size === 0) {
            this.updateStatus(SyncStatus.SYNCED);
        }

        this.addLog('conflict', conflict.type, itemId, `Conflict resolved (used ${useLocal ? 'local' : 'remote'})`, true);
    }

    private async applyLocalItem(item: SyncItem): Promise<void> {
        switch (item.type) {
            case SyncItemType.SETTINGS:
                // Apply settings to VS Code configuration
                const config = vscode.workspace.getConfiguration('oropendola');
                for (const [key, value] of Object.entries(item.data)) {
                    await config.update(key, value, vscode.ConfigurationTarget.Global);
                }
                break;

            case SyncItemType.PROMPTS:
            case SyncItemType.CUSTOM_MODES:
            case SyncItemType.CHECKPOINTS:
            case SyncItemType.CONVERSATIONS:
            case SyncItemType.CODE_INDEX:
                // Apply to respective managers
                // Would be implemented based on actual data destinations
                break;
        }
    }

    private async makeRequest(method: string, path: string, body?: any): Promise<Response> {
        const url = `${this.config.endpoint}${path}`;
        const headers: HeadersInit = {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
        };

        if (this.config.organizationId) {
            headers['X-Organization-ID'] = this.config.organizationId;
        }

        const options: RequestInit = {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        };

        return fetch(url, options);
    }

    private generateHash(data: any): string {
        // Simple hash generation (in production, use a proper hash function)
        return JSON.stringify(data).split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0).toString(36);
    }

    private addLog(action: SyncLog['action'], itemType: SyncItemType, itemId: string, message: string, success: boolean): void {
        const log: SyncLog = {
            timestamp: Date.now(),
            action,
            itemType,
            itemId,
            message,
            success
        };

        this.syncLogs.unshift(log);

        // Keep only last 100 logs
        if (this.syncLogs.length > 100) {
            this.syncLogs = this.syncLogs.slice(0, 100);
        }
    }

    public getSyncLogs(limit?: number): SyncLog[] {
        return limit ? this.syncLogs.slice(0, limit) : this.syncLogs;
    }

    public getConflicts(): SyncConflict[] {
        return Array.from(this.conflicts.values());
    }

    public clearConflicts(): void {
        this.conflicts.clear();
        if (this.status === SyncStatus.CONFLICT) {
            this.updateStatus(SyncStatus.SYNCED);
        }
    }

    public getStatistics() {
        const logs = this.syncLogs;
        const successfulSyncs = logs.filter(l => l.success).length;
        const failedSyncs = logs.filter(l => !l.success).length;
        const conflicts = this.conflicts.size;

        const lastSync = logs.length > 0 ? logs[0].timestamp : null;

        return {
            totalSyncs: logs.length,
            successfulSyncs,
            failedSyncs,
            activeConflicts: conflicts,
            lastSync,
            status: this.status,
            enabled: this.config.enabled,
            autoSync: this.config.autoSync
        };
    }
}
