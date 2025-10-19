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
    static generateMarkdown(summary) {
        let md = '# Task Summary Report\n\n';
        md += `**Task ID:** ${summary.taskId}\n`;
        md += `**Duration:** ${summary.duration.formatted}\n`;
        md += `**Status:** ${summary.overview.status}\n\n`;

        md += '## Overview\n\n';
        md += `${summary.overview.summary}\n\n`;

        md += '### Statistics\n';
        md += `- Files Created: ${summary.overview.filesCreated}\n`;
        md += `- Files Modified: ${summary.overview.filesModified}\n`;
        md += `- Tasks Completed: ${summary.overview.todosCompleted}/${summary.overview.todosTotal}\n`;
        md += `- Errors: ${summary.overview.errorCount}\n\n`;

        if (summary.fileChanges.created.length > 0) {
            md += '## Files Created\n\n';
            for (const file of summary.fileChanges.created) {
                md += `- \`${file.filePath}\``;
                if (file.description) {
                    md += ` - ${file.description}`;
                }
                md += '\n';
            }
            md += '\n';
        }

        if (summary.fileChanges.modified.length > 0) {
            md += '## Files Modified\n\n';
            for (const file of summary.fileChanges.modified) {
                md += `- \`${file.filePath}\``;
                if (file.description) {
                    md += ` - ${file.description}`;
                }
                md += '\n';
            }
            md += '\n';
        }

        if (summary.validation.issues.length > 0) {
            md += '## Issues\n\n';
            for (const issue of summary.validation.issues) {
                md += `- **[${issue.severity.toUpperCase()}]** ${issue.message}\n`;
            }
            md += '\n';
        }

        if (summary.recommendations.length > 0) {
            md += '## Recommendations\n\n';
            for (const rec of summary.recommendations) {
                md += `- ${rec.message}\n`;
            }
            md += '\n';
        }

        md += '\n---\n';
        md += `*Generated at ${new Date(summary.timestamp.generatedAt).toLocaleString()}*\n`;

        return md;
    }
}

module.exports = TaskSummaryGenerator;
