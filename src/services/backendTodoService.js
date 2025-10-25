const { apiClient } = require('../api/client');
const EventEmitter = require('events');

/**
 * Backend Todo Service
 * Manages todos using Oropendola.ai backend API v2.0
 * Syncs with backend todo extraction and management
 */
class BackendTodoService extends EventEmitter {
    constructor() {
        super();
        this.cache = new Map();
        this.cacheTimeout = 30000; // 30 seconds
        this.autoExtraction = true;
    }

    /**
     * Extract todos from text using AI
     * @param {string} text - Text to analyze
     * @param {string} [context] - Additional context
     * @param {boolean} [autoCreate=true] - Auto-create todos
     * @returns {Promise<Array>} Extracted todos
     */
    async extractTodos(text, context = '', autoCreate = true) {
        try {
            console.log('🔍 Extracting todos from text...');
            const result = await apiClient.extractTodos(text, context, autoCreate);

            if (result.todos && result.todos.length > 0) {
                console.log(`✅ Extracted ${result.todos.length} todo(s)`);
                this.emit('todosExtracted', result.todos);

                // Clear cache since new todos were created
                if (autoCreate) {
                    this.clearCache();
                }

                return result.todos;
            }

            return [];
        } catch (error) {
            console.error('❌ Failed to extract todos:', error);
            throw error;
        }
    }

    /**
     * Get all todos with optional filters
     * @param {Object} [filters] - Filter options
     * @param {string} [filters.status] - Filter by status
     * @param {string} [filters.priority] - Filter by priority
     * @param {number} [filters.limit=50] - Maximum todos
     * @param {boolean} [filters.useCache=true] - Use cached data
     * @returns {Promise<Array>} List of todos
     */
    async getTodos(filters = {}) {
        const {
            status = null,
            priority = null,
            limit = 50,
            useCache = true
        } = filters;

        const cacheKey = `todos_${status}_${priority}_${limit}`;

        // Check cache
        if (useCache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                console.log('📦 Using cached todos');
                return cached.data;
            }
        }

        try {
            console.log('🔄 Fetching todos from backend');
            const result = await apiClient.getTodos(status, priority, limit);
            const todos = result.todos || [];

            // Cache the result
            this.cache.set(cacheKey, {
                data: todos,
                timestamp: Date.now()
            });

            return todos;
        } catch (error) {
            console.error('❌ Failed to fetch todos:', error);
            throw error;
        }
    }

    /**
     * Get open todos only
     * @param {number} [limit=50] - Maximum todos
     * @returns {Promise<Array>} Open todos
     */
    async getOpenTodos(limit = 50) {
        return this.getTodos({ status: 'Open', limit });
    }

    /**
     * Get completed todos
     * @param {number} [limit=50] - Maximum todos
     * @returns {Promise<Array>} Completed todos
     */
    async getCompletedTodos(limit = 50) {
        return this.getTodos({ status: 'Completed', limit });
    }

    /**
     * Get high priority todos
     * @param {number} [limit=50] - Maximum todos
     * @returns {Promise<Array>} High priority todos
     */
    async getHighPriorityTodos(limit = 50) {
        return this.getTodos({ priority: 'High', limit });
    }

    /**
     * Update todo status
     * @param {string} todoId - Todo ID
     * @param {string} status - New status
     * @returns {Promise<Object>} Updated todo
     */
    async updateTodoStatus(todoId, status) {
        try {
            console.log(`📝 Updating todo ${todoId} status to: ${status}`);
            const result = await apiClient.updateTodo(todoId, { status });

            // Clear cache
            this.clearCache();

            this.emit('todoUpdated', { todoId, status });
            return result;
        } catch (error) {
            console.error('❌ Failed to update todo:', error);
            throw error;
        }
    }

    /**
     * Mark todo as completed
     * @param {string} todoId - Todo ID
     * @returns {Promise<Object>} Updated todo
     */
    async completeTodo(todoId) {
        return this.updateTodoStatus(todoId, 'Completed');
    }

    /**
     * Mark todo as in progress
     * @param {string} todoId - Todo ID
     * @returns {Promise<Object>} Updated todo
     */
    async startTodo(todoId) {
        return this.updateTodoStatus(todoId, 'Working');
    }

    /**
     * Update todo priority
     * @param {string} todoId - Todo ID
     * @param {string} priority - New priority ('Low', 'Medium', 'High')
     * @returns {Promise<Object>} Updated todo
     */
    async updateTodoPriority(todoId, priority) {
        try {
            console.log(`📝 Updating todo ${todoId} priority to: ${priority}`);
            const result = await apiClient.updateTodo(todoId, { priority });

            // Clear cache
            this.clearCache();

            this.emit('todoUpdated', { todoId, priority });
            return result;
        } catch (error) {
            console.error('❌ Failed to update todo priority:', error);
            throw error;
        }
    }

    /**
     * Get todo statistics
     * @returns {Promise<Object>} Statistics
     */
    async getTodoStats() {
        try {
            const allTodos = await this.getTodos({ limit: 1000, useCache: false });

            const stats = {
                total: allTodos.length,
                open: allTodos.filter(t => t.status === 'Open').length,
                working: allTodos.filter(t => t.status === 'Working').length,
                completed: allTodos.filter(t => t.status === 'Completed').length,
                high_priority: allTodos.filter(t => t.priority === 'High').length,
                medium_priority: allTodos.filter(t => t.priority === 'Medium').length,
                low_priority: allTodos.filter(t => t.priority === 'Low').length
            };

            stats.completion_rate = stats.total > 0
                ? Math.round((stats.completed / stats.total) * 100)
                : 0;

            return stats;
        } catch (error) {
            console.error('❌ Failed to get todo stats:', error);
            throw error;
        }
    }

    /**
     * Auto-extract todos from AI responses
     * @param {string} aiResponse - AI response text
     * @param {string} [context] - Context of the conversation
     * @returns {Promise<Array>} Extracted todos (if any)
     */
    async autoExtractFromResponse(aiResponse, context = '') {
        if (!this.autoExtraction) {
            return [];
        }

        // Only extract if response contains todo-like patterns
        const hasTodoPatterns = /\b(todo|task|step|action|must|should|need to)\b/i.test(aiResponse) ||
                               /^[\s]*[-*]\s*\[[ x]\]/m.test(aiResponse) || // Markdown checkboxes
                               /^\d+\.\s+/m.test(aiResponse); // Numbered lists

        if (!hasTodoPatterns) {
            return [];
        }

        try {
            return await this.extractTodos(aiResponse, context, true);
        } catch (error) {
            console.warn('⚠️ Auto-extraction failed:', error.message);
            return [];
        }
    }

    /**
     * Enable/disable auto-extraction
     * @param {boolean} enabled - Enable auto-extraction
     */
    setAutoExtraction(enabled) {
        this.autoExtraction = enabled;
        console.log(`🔧 Auto-extraction ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('🗑️ Cleared todo cache');
    }

    /**
     * Format todos for display
     * @param {Array} todos - Todo list
     * @returns {string} Formatted markdown
     */
    formatTodosMarkdown(todos) {
        if (!todos || todos.length === 0) {
            return '*No todos found*';
        }

        let markdown = '## Todos\n\n';

        // Group by status
        const byStatus = {
            'Open': todos.filter(t => t.status === 'Open'),
            'Working': todos.filter(t => t.status === 'Working'),
            'Completed': todos.filter(t => t.status === 'Completed')
        };

        for (const [status, items] of Object.entries(byStatus)) {
            if (items.length === 0) {continue;}

            const icon = status === 'Completed' ? '✅' :
                status === 'Working' ? '⏳' : '📋';

            markdown += `### ${icon} ${status} (${items.length})\n\n`;

            for (const todo of items) {
                const checkbox = status === 'Completed' ? '[x]' : '[ ]';
                const priority = todo.priority ?
                    (todo.priority === 'High' ? '🔴' :
                        todo.priority === 'Medium' ? '🟡' : '🟢') : '';

                markdown += `- ${checkbox} ${priority} ${todo.description}`;

                if (todo.due_date) {
                    markdown += ` *(Due: ${todo.due_date})*`;
                }

                markdown += ` \`${todo.name}\`\n`;
            }

            markdown += '\n';
        }

        return markdown;
    }
}

// Singleton instance
const backendTodoService = new BackendTodoService();

module.exports = { backendTodoService, BackendTodoService };
