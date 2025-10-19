/**
 * TODO List Manager
 * Manages TODO items extracted from AI responses
 */

class TodoManager {
    constructor() {
        this.todos = [];
        this.idCounter = 0;
    }

    /**
     * Parse AI response to extract TODO items
     * @param {string} aiResponse - AI assistant response text
     * @returns {Array} Extracted TODO items
     */
    parseFromAIResponse(aiResponse) {
        if (!aiResponse || typeof aiResponse !== 'string') {
            return [];
        }

        const newTodos = [];
        const lines = aiResponse.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Skip empty lines
            if (!line) continue;

            // Pattern 1: Numbered lists (1. Create file, 2. Edit config, etc.)
            const numberedMatch = line.match(/^(\d+)[.)\s]+(.+)$/);
            if (numberedMatch) {
                newTodos.push(this._createTodo(numberedMatch[2], 'numbered', numberedMatch[1]));
                continue;
            }

            // Pattern 2: Bullet points (- Create file, * Edit config, etc.)
            const bulletMatch = line.match(/^[-*+]\s+(.+)$/);
            if (bulletMatch) {
                newTodos.push(this._createTodo(bulletMatch[1], 'bullet'));
                continue;
            }

            // Pattern 3: Explicit TODO markers (TODO: Fix bug, TO-DO: Add feature, etc.)
            const todoMatch = line.match(/^(?:TODO|TO-DO|To Do|To-Do):\s*(.+)$/i);
            if (todoMatch) {
                newTodos.push(this._createTodo(todoMatch[1], 'explicit'));
                continue;
            }

            // Pattern 4: Checkbox format ([ ] Task, [x] Completed task)
            const checkboxMatch = line.match(/^\[(\s|x|X)\]\s+(.+)$/);
            if (checkboxMatch) {
                const completed = checkboxMatch[1].toLowerCase() === 'x';
                newTodos.push(this._createTodo(checkboxMatch[2], 'checkbox', null, completed));
                continue;
            }

            // Pattern 5: Action verbs at start (Create, Build, Implement, Fix, etc.)
            const actionVerbs = [
                'create', 'build', 'make', 'generate', 'develop', 'implement',
                'add', 'insert', 'include', 'append',
                'fix', 'resolve', 'correct', 'repair',
                'update', 'modify', 'edit', 'change', 'revise',
                'remove', 'delete', 'erase',
                'test', 'verify', 'validate', 'check',
                'install', 'setup', 'configure',
                'write', 'code', 'program',
                'design', 'plan', 'draft',
                'review', 'analyze', 'examine'
            ];

            const actionPattern = new RegExp(`^(${actionVerbs.join('|')})\\s+(.+)$`, 'i');
            const actionMatch = line.match(actionPattern);

            // Only add as TODO if it's short enough (likely a task, not a paragraph)
            if (actionMatch && line.length < 150) {
                newTodos.push(this._createTodo(line, 'action'));
                continue;
            }
        }

        return newTodos;
    }

    /**
     * Create a TODO item
     * @private
     */
    _createTodo(text, type, order = null, completed = false) {
        this.idCounter++;
        return {
            id: `todo_${Date.now()}_${this.idCounter}`,
            text: text.trim(),
            type: type,
            order: order ? parseInt(order) : null,
            status: completed ? 'completed' : 'pending', // 'pending' | 'in_progress' | 'completed' | 'failed'
            completed: completed,
            createdAt: new Date().toISOString(),
            completedAt: null,
            startedAt: null
        };
    }

    /**
     * Add TODO items to the list
     * @param {Array} todos - Array of TODO items
     */
    addTodos(todos) {
        if (!Array.isArray(todos)) return;

        todos.forEach(todo => {
            // Check if similar TODO already exists
            const exists = this.todos.some(existing =>
                this._isSimilar(existing.text, todo.text)
            );

            if (!exists) {
                this.todos.push(todo);
            }
        });
    }

    /**
     * Check if two TODO texts are similar (prevent duplicates)
     * @private
     */
    _isSimilar(text1, text2) {
        const normalize = (text) => text.toLowerCase().replace(/[^\w\s]/g, '').trim();
        return normalize(text1) === normalize(text2);
    }

    /**
     * Toggle TODO completion status
     * @param {string} todoId - TODO ID
     */
    toggleTodo(todoId) {
        const todo = this.todos.find(t => t.id === todoId);
        if (todo) {
            todo.completed = !todo.completed;
            todo.status = todo.completed ? 'completed' : 'pending';
            todo.completedAt = todo.completed ? new Date().toISOString() : null;
        }
    }

    /**
     * Update TODO status (Qoder-style: pending → in_progress → completed/failed)
     * @param {string} todoId - TODO ID
     * @param {string} status - New status
     */
    updateStatus(todoId, status) {
        const todo = this.todos.find(t => t.id === todoId);
        if (!todo) return;

        const validStatuses = ['pending', 'in_progress', 'completed', 'failed'];
        if (!validStatuses.includes(status)) {
            console.warn(`Invalid TODO status: ${status}`);
            return;
        }

        todo.status = status;

        if (status === 'in_progress' && !todo.startedAt) {
            todo.startedAt = new Date().toISOString();
        }

        if (status === 'completed') {
            todo.completed = true;
            todo.completedAt = new Date().toISOString();
        }

        if (status === 'failed') {
            todo.completed = false;
            todo.completedAt = new Date().toISOString();
        }
    }

    /**
     * Delete a TODO
     * @param {string} todoId - TODO ID
     */
    deleteTodo(todoId) {
        this.todos = this.todos.filter(t => t.id !== todoId);
    }

    /**
     * Clear all TODOs
     */
    clearAll() {
        this.todos = [];
        this.idCounter = 0;
    }

    /**
     * Get all TODOs
     * @returns {Array} All TODO items
     */
    getAllTodos() {
        return this.todos;
    }

    /**
     * Get active (non-completed) TODOs
     * @returns {Array} Active TODO items
     */
    getActiveTodos() {
        return this.todos.filter(t => !t.completed);
    }

    /**
     * Get completed TODOs
     * @returns {Array} Completed TODO items
     */
    getCompletedTodos() {
        return this.todos.filter(t => t.completed);
    }

    /**
     * Get TODO statistics
     * @returns {Object} Stats object
     */
    getStats() {
        const total = this.todos.length;
        const completed = this.getCompletedTodos().length;
        const active = this.getActiveTodos().length;

        return {
            total,
            completed,
            active,
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
        };
    }

    /**
     * Export TODOs as JSON
     * @returns {string} JSON string
     */
    exportToJSON() {
        return JSON.stringify({
            todos: this.todos,
            stats: this.getStats(),
            exportedAt: new Date().toISOString()
        }, null, 2);
    }

    /**
     * Import TODOs from JSON
     * @param {string} jsonString - JSON string
     */
    importFromJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.todos && Array.isArray(data.todos)) {
                this.todos = data.todos;
                this.idCounter = this.todos.length;
            }
        } catch (error) {
            console.error('Failed to import TODOs:', error);
        }
    }
}

module.exports = TodoManager;
