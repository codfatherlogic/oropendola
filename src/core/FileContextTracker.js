/**
 * FileContextTracker - Track file access and operations for context management
 *
 * Tracks:
 * - Which files were read/written/modified
 * - When and by which operation
 * - File access patterns
 * - Recently used files
 *
 * Used for:
 * - Showing relevant files in UI
 * - Auto-including context in prompts
 * - Usage analytics
 * - File access history
 */

class FileContextTracker {
    constructor() {
        this.fileAccesses = new Map(); // filePath -> Array<AccessRecord>
        this.recentFiles = []; // LRU list of recently accessed files
        this.maxRecentFiles = 50;
    }

    /**
     * Record a file access
     *
     * @param {string} filePath - Relative path to file
     * @param {string} operation - Type of operation (read, write, modify, delete, etc.)
     * @param {object} metadata - Additional metadata
     */
    trackAccess(filePath, operation, metadata = {}) {
        const record = {
            filePath,
            operation,
            timestamp: Date.now(),
            ...metadata
        };

        // Add to file's access history
        if (!this.fileAccesses.has(filePath)) {
            this.fileAccesses.set(filePath, []);
        }
        this.fileAccesses.get(filePath).push(record);

        // Update recent files (LRU)
        this._updateRecentFiles(filePath);

        return record;
    }

    /**
     * Update recent files list (Least Recently Used)
     */
    _updateRecentFiles(filePath) {
        // Remove if already exists
        const index = this.recentFiles.indexOf(filePath);
        if (index !== -1) {
            this.recentFiles.splice(index, 1);
        }

        // Add to front
        this.recentFiles.unshift(filePath);

        // Trim to max size
        if (this.recentFiles.length > this.maxRecentFiles) {
            this.recentFiles = this.recentFiles.slice(0, this.maxRecentFiles);
        }
    }

    /**
     * Get all accesses for a file
     */
    getFileAccesses(filePath) {
        return this.fileAccesses.get(filePath) || [];
    }

    /**
     * Get recently accessed files
     * @param {number} limit - Number of files to return
     * @param {string} operationType - Filter by operation type (optional)
     */
    getRecentFiles(limit = 10, operationType = null) {
        let files = this.recentFiles.slice(0, limit);

        if (operationType) {
            files = files.filter(filePath => {
                const accesses = this.getFileAccesses(filePath);
                return accesses.some(access => access.operation === operationType);
            });
        }

        return files;
    }

    /**
     * Get access statistics
     */
    getStats() {
        const totalFiles = this.fileAccesses.size;
        let totalAccesses = 0;
        const operationCounts = {};

        for (const accesses of this.fileAccesses.values()) {
            totalAccesses += accesses.length;
            for (const access of accesses) {
                operationCounts[access.operation] = (operationCounts[access.operation] || 0) + 1;
            }
        }

        return {
            totalFiles,
            totalAccesses,
            operationCounts,
            recentFilesCount: this.recentFiles.length
        };
    }

    /**
     * Get files accessed since a specific time
     * @param {number} since - Timestamp (Date.now())
     */
    getFilesSince(since) {
        const files = [];

        for (const [filePath, accesses] of this.fileAccesses.entries()) {
            const recentAccesses = accesses.filter(a => a.timestamp >= since);
            if (recentAccesses.length > 0) {
                files.push({
                    filePath,
                    accesses: recentAccesses
                });
            }
        }

        return files;
    }

    /**
     * Get most frequently accessed files
     * @param {number} limit - Number of files to return
     */
    getMostAccessedFiles(limit = 10) {
        const fileCounts = [];

        for (const [filePath, accesses] of this.fileAccesses.entries()) {
            fileCounts.push({
                filePath,
                accessCount: accesses.length
            });
        }

        // Sort by access count descending
        fileCounts.sort((a, b) => b.accessCount - a.accessCount);

        return fileCounts.slice(0, limit);
    }

    /**
     * Clear all tracking data
     */
    clear() {
        this.fileAccesses.clear();
        this.recentFiles = [];
    }

    /**
     * Clear old accesses (older than threshold)
     * @param {number} maxAge - Max age in milliseconds
     */
    clearOldAccesses(maxAge = 24 * 60 * 60 * 1000) { // Default: 24 hours
        const cutoff = Date.now() - maxAge;

        for (const [filePath, accesses] of this.fileAccesses.entries()) {
            const filtered = accesses.filter(a => a.timestamp >= cutoff);

            if (filtered.length === 0) {
                this.fileAccesses.delete(filePath);
            } else {
                this.fileAccesses.set(filePath, filtered);
            }
        }
    }

    /**
     * Export tracking data (for persistence)
     */
    export() {
        return {
            fileAccesses: Array.from(this.fileAccesses.entries()),
            recentFiles: this.recentFiles,
            timestamp: Date.now()
        };
    }

    /**
     * Import tracking data (from persistence)
     */
    import(data) {
        if (data.fileAccesses) {
            this.fileAccesses = new Map(data.fileAccesses);
        }
        if (data.recentFiles) {
            this.recentFiles = data.recentFiles;
        }
    }
}

module.exports = FileContextTracker;
