const vscode = require('vscode');
const path = require('path');

/**
 * Generate descriptive report names based on workspace and task context
 */
class ReportNameGenerator {
    /**
     * Generate descriptive report name based on workspace and task
     * @param {Object} context - Task context
     * @param {string} context.workspaceName - Name of the workspace
     * @param {Object} context.fileChanges - File changes summary
     * @param {Object} context.todos - TODO summary
     * @param {number} context.errors - Number of errors
     * @returns {string} Report filename
     */
    static generate(context) {
        const parts = [];

        // 1. Workspace name (sanitized)
        if (context.workspaceName) {
            parts.push(this.sanitize(context.workspaceName));
        }

        // 2. Task type inference from changes
        const taskType = this.inferTaskType(context);
        if (taskType) {
            parts.push(taskType);
        }

        // 3. Date (YYYY-MM-DD format)
        const date = new Date().toISOString().split('T')[0];
        parts.push(date);

        // 4. Time (HH-MM for uniqueness)
        const time = new Date().toTimeString().slice(0, 5).replace(':', '-');
        parts.push(time);

        return parts.join('_') + '.md';
    }

    /**
     * Infer task type from file changes and TODOs
     * @param {Object} context - Task context
     * @returns {string} Task type
     */
    static inferTaskType(context) {
        const { fileChanges, todos, errors } = context;

        // Check for specific patterns
        if (errors > 0) {return 'bugfix';}

        const created = fileChanges.created?.length || 0;
        const modified = fileChanges.modified?.length || 0;

        if (created > modified * 2) {return 'feature';}
        if (modified > created) {return 'refactor';}

        // Check TODO keywords
        if (todos && todos.length > 0) {
            const allTodoText = todos.map(t => t.title || '').join(' ').toLowerCase();

            if (allTodoText.includes('fix') || allTodoText.includes('bug')) {return 'bugfix';}
            if (allTodoText.includes('add') || allTodoText.includes('create')) {return 'feature';}
            if (allTodoText.includes('refactor') || allTodoText.includes('improve')) {return 'refactor';}
            if (allTodoText.includes('test')) {return 'testing';}
            if (allTodoText.includes('doc')) {return 'documentation';}
        }

        return 'task'; // Default
    }

    /**
     * Sanitize string for filename
     * @param {string} str - String to sanitize
     * @returns {string} Sanitized string
     */
    static sanitize(str) {
        return str
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 30);
    }
}

module.exports = ReportNameGenerator;
