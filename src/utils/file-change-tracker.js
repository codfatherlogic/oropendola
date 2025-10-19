/**
 * FileChangeTracker - Track file changes during task execution
 * Based on Qoder's file review workflow
 *
 * Status flow: GENERATING → APPLYING → APPLIED → ACCEPTED/REJECTED
 */

class FileChangeTracker {
    constructor() {
        this.changes = new Map(); // filePath → changeInfo
        this.changeHistory = []; // Historical record
    }

    /**
     * Add a file change
     * @param {string} filePath - Relative path to file
     * @param {string} action - 'create' | 'modify' | 'delete'
     * @param {object} options - Additional options
     */
    addChange(filePath, action, options = {}) {
        const changeId = `change_${Date.now()}_${this.changes.size}`;

        const changeInfo = {
            id: changeId,
            filePath,
            action, // 'create', 'modify', 'delete'
            status: 'generating', // 'generating' → 'applying' → 'applied' → 'accepted'/'rejected'
            createdAt: new Date().toISOString(),
            description: options.description || '',
            oldContent: options.oldContent || null,
            newContent: options.newContent || null,
            diff: options.diff || null,
            error: null,
            appliedAt: null,
            reviewedAt: null
        };

        this.changes.set(filePath, changeInfo);
        return changeInfo;
    }

    /**
     * Update change status
     * @param {string} filePath - File path
     * @param {string} status - New status
     * @param {object} data - Additional data
     */
    updateStatus(filePath, status, data = {}) {
        const change = this.changes.get(filePath);
        if (!change) return;

        change.status = status;

        if (status === 'applied') {
            change.appliedAt = new Date().toISOString();
        }

        if (status === 'accepted' || status === 'rejected') {
            change.reviewedAt = new Date().toISOString();

            // Move to history
            this.changeHistory.push({ ...change });

            if (status === 'accepted') {
                // Keep in current changes for reference
            } else {
                // Remove rejected changes
                this.changes.delete(filePath);
            }
        }

        if (data.error) {
            change.error = data.error;
            change.status = 'failed';
        }

        if (data.diff) {
            change.diff = data.diff;
        }

        if (data.newContent !== undefined) {
            change.newContent = data.newContent;
        }
    }

    /**
     * Get change by file path
     */
    getChange(filePath) {
        return this.changes.get(filePath);
    }

    /**
     * Get all changes
     */
    getAllChanges() {
        return Array.from(this.changes.values());
    }

    /**
     * Get changes by status
     */
    getChangesByStatus(status) {
        return this.getAllChanges().filter(c => c.status === status);
    }

    /**
     * Get pending changes (not yet reviewed)
     */
    getPendingChanges() {
        return this.getAllChanges().filter(c =>
            c.status !== 'accepted' && c.status !== 'rejected'
        );
    }

    /**
     * Accept a change
     */
    acceptChange(filePath) {
        this.updateStatus(filePath, 'accepted');
    }

    /**
     * Reject a change
     */
    rejectChange(filePath) {
        this.updateStatus(filePath, 'rejected');
    }

    /**
     * Accept all changes
     */
    acceptAll() {
        for (const filePath of this.changes.keys()) {
            this.acceptChange(filePath);
        }
    }

    /**
     * Reject all changes
     */
    rejectAll() {
        for (const filePath of this.changes.keys()) {
            this.rejectChange(filePath);
        }
    }

    /**
     * Get statistics
     */
    getStats() {
        const all = this.getAllChanges();
        const byStatus = {
            generating: 0,
            applying: 0,
            applied: 0,
            accepted: 0,
            rejected: 0,
            failed: 0
        };

        const byAction = {
            create: 0,
            modify: 0,
            delete: 0
        };

        for (const change of all) {
            byStatus[change.status] = (byStatus[change.status] || 0) + 1;
            byAction[change.action] = (byAction[change.action] || 0) + 1;
        }

        return {
            total: all.length,
            pending: this.getPendingChanges().length,
            byStatus,
            byAction
        };
    }

    /**
     * Generate summary report
     */
    generateSummary() {
        const stats = this.getStats();
        const changes = this.getAllChanges();

        const summary = {
            overview: {
                totalChanges: stats.total,
                filesCreated: stats.byAction.create,
                filesModified: stats.byAction.modify,
                filesDeleted: stats.byAction.delete,
                accepted: stats.byStatus.accepted,
                rejected: stats.byStatus.rejected,
                pending: stats.pending
            },
            changes: changes.map(c => ({
                filePath: c.filePath,
                action: c.action,
                status: c.status,
                description: c.description,
                createdAt: c.createdAt,
                reviewedAt: c.reviewedAt
            })),
            generatedAt: new Date().toISOString()
        };

        return summary;
    }

    /**
     * Clear all changes
     */
    clear() {
        this.changes.clear();
        this.changeHistory = [];
    }

    /**
     * Get change history
     */
    getHistory() {
        return this.changeHistory;
    }
}

module.exports = FileChangeTracker;

