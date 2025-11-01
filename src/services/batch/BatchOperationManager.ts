import * as fs from 'fs/promises';
import * as path from 'path';

export enum OperationType {
    CREATE = 'create',
    EDIT = 'edit',
    DELETE = 'delete',
    MOVE = 'move',
    COPY = 'copy'
}

export enum OperationStatus {
    PENDING = 'pending',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    FAILED = 'failed',
    ROLLED_BACK = 'rolled_back'
}

export interface FileOperation {
    id: string;
    type: OperationType;
    status: OperationStatus;
    filePath: string;
    targetPath?: string; // For move/copy operations
    content?: string; // For create/edit operations
    backup?: string; // Backup of original content
    error?: string;
}

export interface BatchOperation {
    id: string;
    name: string;
    description: string;
    operations: FileOperation[];
    status: OperationStatus;
    createdAt: number;
    startedAt?: number;
    completedAt?: number;
    progress: {
        total: number;
        completed: number;
        failed: number;
    };
}

export interface BatchOperationOptions {
    createBackups?: boolean;
    stopOnError?: boolean;
    autoRollback?: boolean;
    validateBeforeExecute?: boolean;
}

export class BatchOperationManager {
    private static instance: BatchOperationManager;
    private activeBatch: BatchOperation | null;
    private batchHistory: BatchOperation[];
    private onProgressUpdate?: (batch: BatchOperation) => void;

    private constructor() {
        this.activeBatch = null;
        this.batchHistory = [];
    }

    public static getInstance(): BatchOperationManager {
        if (!BatchOperationManager.instance) {
            BatchOperationManager.instance = new BatchOperationManager();
        }
        return BatchOperationManager.instance;
    }

    public setProgressCallback(callback: (batch: BatchOperation) => void): void {
        this.onProgressUpdate = callback;
    }

    public createBatch(name: string, description: string): BatchOperation {
        const batch: BatchOperation = {
            id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name,
            description,
            operations: [],
            status: OperationStatus.PENDING,
            createdAt: Date.now(),
            progress: {
                total: 0,
                completed: 0,
                failed: 0
            }
        };

        this.activeBatch = batch;
        return batch;
    }

    public addOperation(operation: Omit<FileOperation, 'id' | 'status'>): void {
        if (!this.activeBatch) {
            throw new Error('No active batch. Create a batch first.');
        }

        const fileOp: FileOperation = {
            id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            status: OperationStatus.PENDING,
            ...operation
        };

        this.activeBatch.operations.push(fileOp);
        this.activeBatch.progress.total++;
    }

    public async executeBatch(options: BatchOperationOptions = {}): Promise<boolean> {
        if (!this.activeBatch) {
            throw new Error('No active batch to execute.');
        }

        const {
            createBackups = true,
            stopOnError = false,
            autoRollback = true,
            validateBeforeExecute = true
        } = options;

        this.activeBatch.status = OperationStatus.IN_PROGRESS;
        this.activeBatch.startedAt = Date.now();

        // Validate operations
        if (validateBeforeExecute) {
            const validation = await this.validateOperations(this.activeBatch.operations);
            if (!validation.valid) {
                this.activeBatch.status = OperationStatus.FAILED;
                throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
            }
        }

        let allSuccessful = true;

        // Execute operations
        for (const operation of this.activeBatch.operations) {
            try {
                operation.status = OperationStatus.IN_PROGRESS;
                this.notifyProgress();

                // Create backup if needed
                if (createBackups && (operation.type === OperationType.EDIT || operation.type === OperationType.DELETE)) {
                    operation.backup = await this.createBackup(operation.filePath);
                }

                // Execute operation
                await this.executeOperation(operation);

                operation.status = OperationStatus.COMPLETED;
                this.activeBatch.progress.completed++;
            } catch (error) {
                operation.status = OperationStatus.FAILED;
                operation.error = error instanceof Error ? error.message : String(error);
                this.activeBatch.progress.failed++;
                allSuccessful = false;

                if (stopOnError) {
                    if (autoRollback) {
                        await this.rollbackBatch();
                    }
                    break;
                }
            }

            this.notifyProgress();
        }

        this.activeBatch.status = allSuccessful ? OperationStatus.COMPLETED : OperationStatus.FAILED;
        this.activeBatch.completedAt = Date.now();
        this.batchHistory.push(this.activeBatch);
        this.activeBatch = null;

        return allSuccessful;
    }

    private async validateOperations(operations: FileOperation[]): Promise<{ valid: boolean; errors: string[] }> {
        const errors: string[] = [];

        for (const op of operations) {
            try {
                switch (op.type) {
                    case OperationType.CREATE:
                        // Check if file already exists
                        try {
                            await fs.access(op.filePath);
                            errors.push(`File already exists: ${op.filePath}`);
                        } catch {
                            // File doesn't exist, which is what we want
                        }
                        break;

                    case OperationType.EDIT:
                    case OperationType.DELETE:
                        // Check if file exists
                        try {
                            await fs.access(op.filePath);
                        } catch {
                            errors.push(`File not found: ${op.filePath}`);
                        }
                        break;

                    case OperationType.MOVE:
                    case OperationType.COPY:
                        // Check source exists
                        try {
                            await fs.access(op.filePath);
                        } catch {
                            errors.push(`Source file not found: ${op.filePath}`);
                        }
                        // Check target doesn't exist
                        if (op.targetPath) {
                            try {
                                await fs.access(op.targetPath);
                                errors.push(`Target file already exists: ${op.targetPath}`);
                            } catch {
                                // Target doesn't exist, which is what we want
                            }
                        }
                        break;
                }
            } catch (error) {
                errors.push(`Validation error for ${op.filePath}: ${error}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    private async createBackup(filePath: string): Promise<string> {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            return content;
        } catch (error) {
            throw new Error(`Failed to create backup for ${filePath}: ${error}`);
        }
    }

    private async executeOperation(operation: FileOperation): Promise<void> {
        switch (operation.type) {
            case OperationType.CREATE:
                await this.createFile(operation.filePath, operation.content || '');
                break;

            case OperationType.EDIT:
                await this.editFile(operation.filePath, operation.content || '');
                break;

            case OperationType.DELETE:
                await this.deleteFile(operation.filePath);
                break;

            case OperationType.MOVE:
                if (!operation.targetPath) {
                    throw new Error('Target path required for move operation');
                }
                await this.moveFile(operation.filePath, operation.targetPath);
                break;

            case OperationType.COPY:
                if (!operation.targetPath) {
                    throw new Error('Target path required for copy operation');
                }
                await this.copyFile(operation.filePath, operation.targetPath);
                break;
        }
    }

    private async createFile(filePath: string, content: string): Promise<void> {
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(filePath, content, 'utf-8');
    }

    private async editFile(filePath: string, content: string): Promise<void> {
        await fs.writeFile(filePath, content, 'utf-8');
    }

    private async deleteFile(filePath: string): Promise<void> {
        await fs.unlink(filePath);
    }

    private async moveFile(sourcePath: string, targetPath: string): Promise<void> {
        const targetDir = path.dirname(targetPath);
        await fs.mkdir(targetDir, { recursive: true });
        await fs.rename(sourcePath, targetPath);
    }

    private async copyFile(sourcePath: string, targetPath: string): Promise<void> {
        const targetDir = path.dirname(targetPath);
        await fs.mkdir(targetDir, { recursive: true });
        await fs.copyFile(sourcePath, targetPath);
    }

    public async rollbackBatch(): Promise<void> {
        if (!this.activeBatch) {
            throw new Error('No active batch to rollback.');
        }

        // Rollback in reverse order
        const completedOps = this.activeBatch.operations.filter(
            op => op.status === OperationStatus.COMPLETED
        ).reverse();

        for (const operation of completedOps) {
            try {
                await this.rollbackOperation(operation);
                operation.status = OperationStatus.ROLLED_BACK;
            } catch (error) {
                console.error(`Failed to rollback operation ${operation.id}:`, error);
            }
        }

        this.activeBatch.status = OperationStatus.ROLLED_BACK;
    }

    private async rollbackOperation(operation: FileOperation): Promise<void> {
        switch (operation.type) {
            case OperationType.CREATE:
                // Delete the created file
                await fs.unlink(operation.filePath);
                break;

            case OperationType.EDIT:
                // Restore from backup
                if (operation.backup) {
                    await fs.writeFile(operation.filePath, operation.backup, 'utf-8');
                }
                break;

            case OperationType.DELETE:
                // Restore from backup
                if (operation.backup) {
                    await fs.writeFile(operation.filePath, operation.backup, 'utf-8');
                }
                break;

            case OperationType.MOVE:
                // Move back to original location
                if (operation.targetPath) {
                    await fs.rename(operation.targetPath, operation.filePath);
                }
                break;

            case OperationType.COPY:
                // Delete the copied file
                if (operation.targetPath) {
                    await fs.unlink(operation.targetPath);
                }
                break;
        }
    }

    private notifyProgress(): void {
        if (this.activeBatch && this.onProgressUpdate) {
            this.onProgressUpdate(this.activeBatch);
        }
    }

    public getActiveBatch(): BatchOperation | null {
        return this.activeBatch;
    }

    public getBatchHistory(limit?: number): BatchOperation[] {
        const history = [...this.batchHistory].reverse();
        return limit ? history.slice(0, limit) : history;
    }

    public cancelActiveBatch(): void {
        if (this.activeBatch) {
            this.activeBatch.status = OperationStatus.FAILED;
            this.batchHistory.push(this.activeBatch);
            this.activeBatch = null;
        }
    }

    public clearHistory(): void {
        this.batchHistory = [];
    }

    public getStatistics() {
        const total = this.batchHistory.length;
        const completed = this.batchHistory.filter(b => b.status === OperationStatus.COMPLETED).length;
        const failed = this.batchHistory.filter(b => b.status === OperationStatus.FAILED).length;
        const rolledBack = this.batchHistory.filter(b => b.status === OperationStatus.ROLLED_BACK).length;

        const totalOperations = this.batchHistory.reduce((sum, b) => sum + b.progress.total, 0);
        const completedOperations = this.batchHistory.reduce((sum, b) => sum + b.progress.completed, 0);

        return {
            totalBatches: total,
            completedBatches: completed,
            failedBatches: failed,
            rolledBackBatches: rolledBack,
            totalOperations,
            completedOperations,
            successRate: total > 0 ? (completed / total) * 100 : 0
        };
    }
}
