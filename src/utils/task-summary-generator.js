/**
 * TaskSummaryGenerator - Generate task completion reports
 * Based on Qoder's Task Report feature
 */

class TaskSummaryGenerator {
    /**
     * Generate a comprehensive task summary
     * @param {object} options - Summary options
     * @returns {object} Summary report
     */
    static generate(options = {}) {
        const {
            taskId,
            startTime,
            endTime,
            fileChanges = [],
            todos = [],
            toolResults = [],
            errors = [],
            mode = 'agent'
        } = options;

        const duration = endTime && startTime ?
            Math.round((new Date(endTime) - new Date(startTime)) / 1000) : 0;

        return {
            taskId,
            mode,
            duration: {
                seconds: duration,
                formatted: this._formatDuration(duration)
            },
            timestamp: {
                started: startTime,
                completed: endTime,
                generatedAt: new Date().toISOString()
            },
            overview: this._generateOverview(fileChanges, todos, errors),
            fileChanges: this._summarizeFileChanges(fileChanges),
            todos: this._summarizeTodos(todos),
            toolExecution: this._summarizeTools(toolResults),
            validation: this._generateValidation(fileChanges, errors),
            recommendations: this._generateRecommendations(fileChanges, errors)
        };
    }

    /**
     * Generate overview section
     * @private
     */
    static _generateOverview(fileChanges, todos, errors) {
        const filesCreated = fileChanges.filter(c => c.action === 'create').length;
        const filesModified = fileChanges.filter(c => c.action === 'modify').length;
        const todosCompleted = todos.filter(t => t.completed).length;
        const hasErrors = errors.length > 0;

        return {
            summary: this._generateOverviewText(
                filesCreated,
                filesModified,
                todosCompleted,
                todos.length,
                hasErrors
            ),
            filesCreated,
            filesModified,
            todosCompleted,
            todosTotal: todos.length,
            errorCount: errors.length,
            status: hasErrors ? 'completed_with_errors' : 'completed_successfully'
        };
    }

    /**
     * Generate overview text
     * @private
     */
    static _generateOverviewText(created, modified, completed, total, hasErrors) {
        const parts = [];

        if (created > 0) {
            parts.push(`Created ${created} ${created === 1 ? 'file' : 'files'}`);
        }

        if (modified > 0) {
            parts.push(`modified ${modified} ${modified === 1 ? 'file' : 'files'}`);
        }

        if (total > 0) {
            parts.push(`completed ${completed}/${total} tasks`);
        }

        let text = parts.join(', ');

        if (hasErrors) {
            text += '. Some errors were encountered during execution.';
        } else {
            text += '. All tasks completed successfully.';
        }

        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    /**
     * Summarize file changes
     * @private
     */
    static _summarizeFileChanges(fileChanges) {
        const grouped = {
            created: [],
            modified: [],
            deleted: [],
            failed: []
        };

        for (const change of fileChanges) {
            const summary = {
                filePath: change.filePath,
                description: change.description,
                status: change.status,
                linesAdded: this._countLines(change.newContent) -
                           this._countLines(change.oldContent || ''),
                error: change.error
            };

            if (change.status === 'failed') {
                grouped.failed.push(summary);
            } else {
                grouped[change.action]?.push(summary);
            }
        }

        return grouped;
    }

    /**
     * Summarize TODOs
     * @private
     */
    static _summarizeTodos(todos) {
        return {
            total: todos.length,
            completed: todos.filter(t => t.completed).length,
            pending: todos.filter(t => !t.completed).length,
            byType: this._groupByType(todos),
            completionRate: todos.length > 0 ?
                Math.round((todos.filter(t => t.completed).length / todos.length) * 100) : 0
        };
    }

    /**
     * Group todos by type
     * @private
     */
    static _groupByType(todos) {
        const groups = {};
        for (const todo of todos) {
            groups[todo.type] = (groups[todo.type] || 0) + 1;
        }
        return groups;
    }

    /**
     * Summarize tool execution
     * @private
     */
    static _summarizeTools(toolResults) {
        const grouped = {};
        let successCount = 0;
        let failureCount = 0;

        for (const result of toolResults) {
            const toolName = result.tool_name || 'unknown';
            grouped[toolName] = (grouped[toolName] || 0) + 1;

            if (result.success) {
                successCount++;
            } else {
                failureCount++;
            }
        }

        return {
            total: toolResults.length,
            successful: successCount,
            failed: failureCount,
            byTool: grouped
        };
    }

    /**
     * Generate validation report
     * @private
     */
    static _generateValidation(fileChanges, errors) {
        const issues = [];

        // Check for failed file changes
        const failed = fileChanges.filter(c => c.status === 'failed');
        if (failed.length > 0) {
            issues.push({
                severity: 'error',
                message: `${failed.length} file operation(s) failed`,
                files: failed.map(f => f.filePath)
            });
        }

        // Add recorded errors
        for (const error of errors) {
            issues.push({
                severity: 'error',
                message: error.message || String(error),
                stack: error.stack
            });
        }

        return {
            passed: issues.length === 0,
            issueCount: issues.length,
            issues
        };
    }

    /**
     * Generate recommendations
     * @private
     */
    static _generateRecommendations(fileChanges, errors) {
        const recommendations = [];

        // Check for many created files
        const created = fileChanges.filter(c => c.action === 'create').length;
        if (created > 10) {
            recommendations.push({
                type: 'review',
                message: `${created} files were created. Review each file to ensure correctness.`
            });
        }

        // Check for errors
        if (errors.length > 0) {
            recommendations.push({
                type: 'fix',
                message: 'Some errors occurred. Review error details and fix before accepting changes.'
            });
        }

        // Check for rejected changes
        const rejected = fileChanges.filter(c => c.status === 'rejected').length;
        if (rejected > 0) {
            recommendations.push({
                type: 'info',
                message: `${rejected} change(s) were rejected and not applied.`
            });
        }

        return recommendations;
    }

    /**
     * Format duration
     * @private
     */
    static _formatDuration(seconds) {
        if (seconds < 60) {
            return `${seconds}s`;
        } else if (seconds < 3600) {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins}m ${secs}s`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            return `${hours}h ${mins}m`;
        }
    }

    /**
     * Count lines in content
     * @private
     */
    static _countLines(content) {
        if (!content) return 0;
        return content.split('\n').length;
    }

    /**
     * Generate markdown report
     */
    static generateMarkdown(summary, context = {}) {
        const { workspaceName, version, reportId, taskDescription } = context;
        let md = '';

        // Header with emoji and metadata
        const statusIcon = summary.overview.status === 'completed_successfully' ? '✅' : '⚠️';
        md += `# ${statusIcon} Task Completion Report\n\n`;
        md += `**Workspace:** ${workspaceName || 'Unknown'}\n`;
        md += `**Date:** ${new Date().toLocaleString()}\n`;
        md += `**Status:** ${summary.overview.status === 'completed_successfully' ? '✅ Success' : '⚠️ Completed with issues'}\n`;
        md += `**Duration:** ${summary.duration.formatted}\n\n`;

        if (taskDescription) {
            md += `## 📋 Task Description\n\n`;
            md += `${taskDescription}\n\n`;
        }

        // Executive Summary
        md += `## 📊 Executive Summary\n\n`;
        md += `${summary.overview.summary}\n\n`;

        // Statistics Table
        md += `### Statistics\n\n`;
        md += `| Metric | Count |\n`;
        md += `|--------|-------|\n`;
        md += `| Files Created | ${summary.overview.filesCreated} |\n`;
        md += `| Files Modified | ${summary.overview.filesModified} |\n`;
        md += `| Files Deleted | ${summary.fileChanges.deleted?.length || 0} |\n`;
        md += `| TODOs Completed | ${summary.overview.todosCompleted}/${summary.overview.todosTotal} |\n`;
        if (summary.overview.todosTotal > 0) {
            const completionRate = Math.round((summary.overview.todosCompleted / summary.overview.todosTotal) * 100);
            md += `| TODO Completion Rate | ${completionRate}% |\n`;
        }
        md += `| Errors | ${summary.overview.errorCount} |\n\n`;

        // File Changes - Detailed
        if (summary.fileChanges.created.length > 0) {
            md += `## 📄 Files Created\n\n`;
            summary.fileChanges.created.forEach(file => {
                md += `### ${file.filePath}\n\n`;
                md += `**Status:** ✅ ${file.status || 'Created'}\n`;
                if (file.description) {
                    md += `**Description:** ${file.description}\n`;
                }
                md += `\n`;
            });
        }

        if (summary.fileChanges.modified.length > 0) {
            md += `## ✏️ Files Modified\n\n`;
            summary.fileChanges.modified.forEach(file => {
                md += `### ${file.filePath}\n\n`;
                md += `**Status:** ✅ ${file.status || 'Modified'}\n`;
                if (file.description) {
                    md += `**Description:** ${file.description}\n`;
                }
                md += `\n`;
            });
        }

        if (summary.fileChanges.deleted && summary.fileChanges.deleted.length > 0) {
            md += `## 🗑️ Files Deleted\n\n`;
            summary.fileChanges.deleted.forEach(file => {
                md += `- ${file.filePath}\n`;
            });
            md += `\n`;
        }

        // TODO Execution
        if (summary.overview.todosTotal > 0) {
            md += `## ✅ TODO Execution\n\n`;
            const completionRate = Math.round((summary.overview.todosCompleted / summary.overview.todosTotal) * 100);
            md += `**Completion Rate:** ${completionRate}% (${summary.overview.todosCompleted}/${summary.overview.todosTotal})\n\n`;

            const completedTodos = summary.todos.completed || [];
            const pendingTodos = summary.todos.pending || [];

            if (completedTodos.length > 0) {
                md += `### Completed Tasks\n\n`;
                completedTodos.forEach((todo, i) => {
                    md += `${i + 1}. ✅ ${todo.title || todo}\n`;
                });
                md += `\n`;
            }

            if (pendingTodos.length > 0) {
                md += `### Pending Tasks\n\n`;
                pendingTodos.forEach((todo, i) => {
                    md += `${i + 1}. ⏳ ${todo.title || todo}\n`;
                });
                md += `\n`;
            }
        }

        // Errors and Warnings
        if (summary.overview.errorCount > 0 || summary.validation.issues.length > 0) {
            md += `## ⚠️ Issues Encountered\n\n`;

            if (summary.fileChanges.failed && summary.fileChanges.failed.length > 0) {
                md += `### Failed Operations\n\n`;
                summary.fileChanges.failed.forEach(file => {
                    md += `- ❌ ${file.filePath}: ${file.error || 'Unknown error'}\n`;
                });
                md += `\n`;
            }

            if (summary.validation.issues.length > 0) {
                md += `### Validation Issues\n\n`;
                summary.validation.issues.forEach(issue => {
                    const icon = issue.severity === 'error' ? '🔴' : issue.severity === 'warning' ? '🟡' : 'ℹ️';
                    md += `- ${icon} **${issue.severity.toUpperCase()}**: ${issue.message}\n`;
                });
                md += `\n`;
            }
        }

        // Recommendations
        if (summary.recommendations.length > 0) {
            md += `## 💡 Recommendations\n\n`;
            summary.recommendations.forEach(rec => {
                const icon = rec.type === 'warning' ? '⚠️' : rec.type === 'info' ? 'ℹ️' : '💡';
                md += `${icon} ${rec.message}\n\n`;
            });
        }

        // Footer
        md += `---\n\n`;
        md += `**Generated by:** Oropendola AI v${version || '2.6.0'}\n`;
        md += `**Report ID:** ${reportId || summary.taskId}\n`;
        md += `**Generated at:** ${new Date(summary.timestamp.generatedAt).toLocaleString()}\n`;

        return md;
    }
}

module.exports = TaskSummaryGenerator;
