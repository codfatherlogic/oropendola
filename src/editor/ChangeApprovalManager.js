const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

/**
 * ChangeApprovalManager - Claude Code-style Change Approval Flow
 * Manages pending file changes and provides Accept/Reject UI
 * Works with DiffPreviewManager to show previews
 */
class ChangeApprovalManager {
    constructor(diffPreviewManager) {
        this._diffPreviewManager = diffPreviewManager;
        this._pendingChanges = [];
        this._approvalCallback = null;
        this._rejectionCallback = null;
    }

    /**
     * Add changes to pending approval queue
     * @param {Array} changes - Array of {path, content, type, tool}
     */
    addPendingChanges(changes) {
        console.log(`📋 Adding ${changes.length} change(s) to approval queue`);

        changes.forEach(change => {
            this._pendingChanges.push({
                id: this._generateChangeId(),
                path: change.path,
                content: change.content,
                type: change.type || 'modify', // 'create', 'modify', 'delete'
                tool: change.tool || 'unknown',
                timestamp: Date.now()
            });
        });

        console.log(`   Total pending: ${this._pendingChanges.length}`);
    }

    /**
     * Get all pending changes
     */
    getPendingChanges() {
        return this._pendingChanges;
    }

    /**
     * Get pending changes count
     */
    getPendingCount() {
        return this._pendingChanges.length;
    }

    /**
     * Clear all pending changes
     */
    clearPending() {
        this._pendingChanges = [];
        console.log('🗑️ Cleared all pending changes');
    }

    /**
     * Show approval UI with all pending changes
     * @param {Object} webview - VS Code webview instance
     * @returns {Promise<Object>} Approval data for webview
     */
    async showApprovalUI(webview) {
        if (this._pendingChanges.length === 0) {
            console.warn('⚠️ No pending changes to show');
            return null;
        }

        console.log(`📝 Showing approval UI for ${this._pendingChanges.length} change(s)`);

        // Prepare data for webview
        const approvalData = {
            changes: this._pendingChanges.map(change => ({
                id: change.id,
                path: change.path,
                fileName: path.basename(change.path),
                type: change.type,
                tool: change.tool,
                preview: this._getContentPreview(change.content),
                icon: this._getChangeIcon(change.type),
                badge: this._getChangeBadge(change.type)
            })),
            stats: {
                total: this._pendingChanges.length,
                created: this._pendingChanges.filter(c => c.type === 'create').length,
                modified: this._pendingChanges.filter(c => c.type === 'modify').length,
                deleted: this._pendingChanges.filter(c => c.type === 'delete').length
            }
        };

        // Send to webview
        if (webview) {
            webview.postMessage({
                type: 'showChangeApproval',
                data: approvalData
            });
        }

        return approvalData;
    }

    /**
     * Preview a specific change in diff editor
     * @param {string} changeId - Change ID to preview
     */
    async previewChange(changeId) {
        const change = this._pendingChanges.find(c => c.id === changeId);

        if (!change) {
            console.warn(`⚠️ Change not found: ${changeId}`);
            return;
        }

        console.log(`👁️ Previewing change: ${change.path}`);

        // Show diff using DiffPreviewManager
        await this._diffPreviewManager.showDiffFromChange(change);
    }

    /**
     * Preview all pending changes
     */
    async previewAllChanges() {
        console.log(`👁️ Previewing ${this._pendingChanges.length} change(s)...`);

        for (const change of this._pendingChanges) {
            await this._diffPreviewManager.showDiffFromChange(change);
            // Small delay between previews
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }

    /**
     * Accept all pending changes (apply them)
     * @param {Function} callback - Optional callback after applying changes
     * @returns {Promise<Object>} Result with applied changes
     */
    async acceptAllChanges(callback = null) {
        console.log(`✅ Accepting ${this._pendingChanges.length} change(s)...`);

        const results = {
            succeeded: [],
            failed: [],
            total: this._pendingChanges.length
        };

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open');
            return results;
        }

        const workspacePath = workspaceFolders[0].uri.fsPath;

        for (const change of this._pendingChanges) {
            try {
                await this._applyChange(change, workspacePath);
                results.succeeded.push(change.path);
                console.log(`   ✅ Applied: ${change.path}`);
            } catch (error) {
                results.failed.push({
                    path: change.path,
                    error: error.message
                });
                console.error(`   ❌ Failed: ${change.path}`, error.message);
            }
        }

        // Clear pending changes
        this.clearPending();

        // Execute callback if provided
        if (callback) {
            callback(results);
        }

        // Show summary
        const message = `Applied ${results.succeeded.length}/${results.total} changes`;
        if (results.failed.length > 0) {
            vscode.window.showWarningMessage(`${message} (${results.failed.length} failed)`);
        } else {
            vscode.window.showInformationMessage(message);
        }

        console.log(`✅ Accept complete: ${results.succeeded.length} succeeded, ${results.failed.length} failed`);

        return results;
    }

    /**
     * Reject all pending changes (discard them)
     * @param {Function} callback - Optional callback
     */
    async rejectAllChanges(callback = null) {
        console.log(`❌ Rejecting ${this._pendingChanges.length} change(s)...`);

        const count = this._pendingChanges.length;
        this.clearPending();

        // Execute callback if provided
        if (callback) {
            callback({ rejected: count });
        }

        vscode.window.showInformationMessage(`Rejected ${count} change(s)`);

        return { rejected: count };
    }

    /**
     * Accept a single change by ID
     */
    async acceptChange(changeId) {
        const change = this._pendingChanges.find(c => c.id === changeId);
        if (!change) {return;}

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {return;}

        const workspacePath = workspaceFolders[0].uri.fsPath;

        try {
            await this._applyChange(change, workspacePath);
            this._pendingChanges = this._pendingChanges.filter(c => c.id !== changeId);
            console.log(`✅ Accepted single change: ${change.path}`);
        } catch (error) {
            console.error(`❌ Failed to accept change: ${change.path}`, error);
            vscode.window.showErrorMessage(`Failed to apply change: ${error.message}`);
        }
    }

    /**
     * Reject a single change by ID
     */
    async rejectChange(changeId) {
        this._pendingChanges = this._pendingChanges.filter(c => c.id !== changeId);
        console.log(`❌ Rejected single change: ${changeId}`);
    }

    /**
     * Apply a single change to file system
     * @private
     */
    async _applyChange(change, workspacePath) {
        const fullPath = path.isAbsolute(change.path)
            ? change.path
            : path.join(workspacePath, change.path);

        switch (change.type) {
            case 'create':
            case 'modify':
                // Ensure directory exists
                const dir = path.dirname(fullPath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                // Write file
                fs.writeFileSync(fullPath, change.content, 'utf8');
                console.log(`   💾 Wrote: ${change.path}`);
                break;

            case 'delete':
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                    console.log(`   🗑️ Deleted: ${change.path}`);
                }
                break;

            default:
                throw new Error(`Unknown change type: ${change.type}`);
        }
    }

    /**
     * Get content preview (first 3 lines)
     * @private
     */
    _getContentPreview(content) {
        if (!content) {return '';}

        const lines = content.split('\n');
        const preview = lines.slice(0, 3).join('\n');

        return lines.length > 3 ? preview + '\n...' : preview;
    }

    /**
     * Get icon for change type
     * @private
     */
    _getChangeIcon(type) {
        const icons = {
            create: '✨',
            modify: '✏️',
            delete: '🗑️'
        };
        return icons[type] || '📄';
    }

    /**
     * Get badge text for change type
     * @private
     */
    _getChangeBadge(type) {
        const badges = {
            create: 'NEW',
            modify: 'MODIFIED',
            delete: 'DELETED'
        };
        return badges[type] || 'CHANGED';
    }

    /**
     * Generate unique change ID
     * @private
     */
    _generateChangeId() {
        return `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

module.exports = ChangeApprovalManager;
