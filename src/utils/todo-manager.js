/**
 * TODO List Manager
 * Manages TODO items extracted from AI responses
 * Enhanced with GitHub Copilot-style features:
 * - Context/reasoning boxes
 * - File associations
 * - Hierarchical sub-tasks
 * - File previews
 */

class TodoManager {
    constructor() {
        this.todos = [];
        this.idCounter = 0;
        this.context = null; // AI's reasoning/context for the TODO list
        this.relatedFiles = []; // Files associated with these TODOs
    }

    /**
     * Parse AI response to extract TODO items
     * @param {string} aiResponse - AI assistant response text
     * @param {Object} options - Parsing options
     * @returns {Array} Extracted TODO items
     */
    parseFromAIResponse(aiResponse, options = {}) {
        console.log('🔍 [TodoManager] parseFromAIResponse called');
        console.log('🔍 [TodoManager] Response length:', aiResponse?.length);
        console.log('🔍 [TodoManager] Response type:', typeof aiResponse);

        if (!aiResponse || typeof aiResponse !== 'string') {
            console.warn('⚠️ [TodoManager] Invalid response:', aiResponse);
            return [];
        }

        const newTodos = [];
        const lines = aiResponse.split('\n');
        let currentParent = null; // Track parent for sub-tasks
        let lastIndentLevel = 0;

        console.log('🔍 [TodoManager] Analyzing', lines.length, 'lines');

        // Extract context/reasoning (first 1-3 sentences or paragraph before numbered list)
        this._extractContext(aiResponse);

        // Extract related files from the response
        this._extractRelatedFiles(aiResponse);

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            // Skip empty lines
            if (!trimmedLine) continue;

            // Calculate indent level for hierarchical tasks
            const indentLevel = line.length - line.trimStart().length;
            const isIndented = indentLevel > lastIndentLevel;

            // Pattern 1: Numbered lists (1. Create file, 2. Edit config, etc.)
            const numberedMatch = trimmedLine.match(/^(\d+)[.)\s]+(.+)$/);
            if (numberedMatch) {
                console.log('🔍 [TodoManager] Found numbered todo:', numberedMatch[2]);
                const todo = this._createTodo(numberedMatch[2], 'numbered', numberedMatch[1]);
                
                // If indented, mark as sub-task
                if (isIndented && currentParent) {
                    todo.parentId = currentParent.id;
                    todo.level = 1;
                } else {
                    currentParent = todo;
                    todo.level = 0;
                }
                
                newTodos.push(todo);
                lastIndentLevel = indentLevel;
                continue;
            }

            // Pattern 2: Bullet points (- Create file, * Edit config, etc.)
            const bulletMatch = trimmedLine.match(/^[-*+]\s+(.+)$/);
            if (bulletMatch) {
                const todo = this._createTodo(bulletMatch[1], 'bullet');
                
                if (isIndented && currentParent) {
                    todo.parentId = currentParent.id;
                    todo.level = 1;
                } else {
                    currentParent = todo;
                    todo.level = 0;
                }
                
                newTodos.push(todo);
                lastIndentLevel = indentLevel;
                continue;
            }

            // Pattern 3: Explicit TODO markers (TODO: Fix bug, TO-DO: Add feature, etc.)
            const todoMatch = trimmedLine.match(/^(?:TODO|TO-DO|To Do|To-Do):\s*(.+)$/i);
            if (todoMatch) {
                newTodos.push(this._createTodo(todoMatch[1], 'explicit'));
                continue;
            }

            // Pattern 4: Checkbox format ([ ] Task, [x] Completed task)
            const checkboxMatch = trimmedLine.match(/^\[(\s|x|X)\]\s+(.+)$/);
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
            const actionMatch = trimmedLine.match(actionPattern);

            // Only add as TODO if it's short enough (likely a task, not a paragraph)
            if (actionMatch && trimmedLine.length < 150) {
                newTodos.push(this._createTodo(trimmedLine, 'action'));
                continue;
            }
        }

        console.log('🔍 [TodoManager] Parsing complete:', newTodos.length, 'todos found');
        if (newTodos.length > 0) {
            console.log('🔍 [TodoManager] First 3 todos:', newTodos.slice(0, 3).map(t => ({ text: t.text, type: t.type })));
        }

        return newTodos;
    }

    /**
     * Create a TODO item
     * @private
     */
    _createTodo(text, type, order = null, completed = false) {
        this.idCounter++;

        // Summarize verbose descriptions to max 60 characters
        const summarizedText = this._summarizeTodo(text.trim());

        return {
            id: `todo_${Date.now()}_${this.idCounter}`,
            text: summarizedText,
            fullText: text.trim(), // Keep original for reference
            type: type,
            order: order ? parseInt(order) : null,
            status: completed ? 'completed' : 'pending', // 'pending' | 'in_progress' | 'completed' | 'failed'
            completed: completed,
            createdAt: new Date().toISOString(),
            completedAt: null,
            startedAt: null,
            parentId: null, // For sub-tasks
            level: 0, // Hierarchy level (0 = top-level, 1 = sub-task)
            relatedFile: null // File associated with this task
        };
    }

    /**
     * Summarize verbose TODO descriptions to concise format
     * @private
     * @param {string} description - Original description
     * @returns {string} Summarized description (max 60 chars)
     */
    _summarizeTodo(description) {
        // Remove markdown formatting (**, `, etc.)
        let summary = description
            .replace(/\*\*/g, '')  // Remove bold
            .replace(/`/g, '')      // Remove code ticks
            .replace(/_/g, '')      // Remove italics
            .trim();

        // Extract just the action part before any colon or explanation
        const colonIndex = summary.indexOf(':');
        if (colonIndex > 0 && colonIndex < 60) {
            summary = summary.substring(0, colonIndex).trim();
        }

        // Take first sentence only (stop at period, exclamation, question mark)
        const sentenceMatch = summary.match(/^[^.!?]+[.!?]/);
        if (sentenceMatch) {
            summary = sentenceMatch[0].replace(/[.!?]$/, '').trim();
        }

        // If still too long, truncate to 60 characters
        if (summary.length > 60) {
            summary = summary.substring(0, 57) + '...';
        }

        return summary;
    }

    /**
     * Extract context/reasoning from AI response (GitHub Copilot-style)
     * @private
     */
    _extractContext(aiResponse) {
        // Look for a paragraph before the numbered list or bullet points
        const contextMatch = aiResponse.match(/^(.+?)(?=\n\s*\d+\.|\n\s*[-*+]\s)/s);
        
        if (contextMatch) {
            // Get first 2-3 sentences
            const sentences = contextMatch[1].match(/[^.!?]+[.!?]+/g);
            if (sentences && sentences.length > 0) {
                this.context = sentences.slice(0, 3).join(' ').trim();
                return;
            }
        }

        // Fallback: Get first 200 chars
        if (aiResponse.length > 200) {
            this.context = aiResponse.substring(0, 200) + '...';
        } else {
            this.context = aiResponse.substring(0, aiResponse.indexOf('\n') || aiResponse.length);
        }
    }

    /**
     * Extract related files from AI response
     * @private
     */
    _extractRelatedFiles(aiResponse) {
        const filePatterns = [
            /(?:create|edit|modify|update)\s+[`"]?([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)[`"]?/gi,
            /[`"]([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)[`"]/gi,
            /(?:file|path):\s*[`"]?([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)[`"]?/gi
        ];

        const files = new Set();

        filePatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(aiResponse)) !== null) {
                const file = match[1];
                // Filter out common false positives
                if (!file.includes('http') && !file.includes('.com') && file.length < 100) {
                    files.add(file);
                }
            }
        });

        this.relatedFiles = Array.from(files).slice(0, 10); // Limit to 10 files
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
     * @returns {Object} Stats object with pending/in_progress/completed breakdown
     */
    getStats() {
        const total = this.todos.length;
        const completed = this.todos.filter(t => t.status === 'completed').length;
        const inProgress = this.todos.filter(t => t.status === 'in_progress').length;
        const pending = this.todos.filter(t => t.status === 'pending').length;
        const failed = this.todos.filter(t => t.status === 'failed').length;

        return {
            total,
            completed,
            pending,
            in_progress: inProgress,
            failed,
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
        };
    }

    /**
     * Get context/reasoning for the TODO list (GitHub Copilot-style)
     * @returns {string|null} Context text
     */
    getContext() {
        return this.context;
    }

    /**
     * Get related files for the TODO list
     * @returns {Array} Array of file paths
     */
    getRelatedFiles() {
        return this.relatedFiles;
    }

    /**
     * Set context manually
     * @param {string} context - Context text
     */
    setContext(context) {
        this.context = context;
    }

    /**
     * Get hierarchical TODO structure (parent-child relationships)
     * @returns {Array} Root-level todos with nested children
     */
    getHierarchicalTodos() {
        const rootTodos = this.todos.filter(t => !t.parentId);
        
        return rootTodos.map(root => ({
            ...root,
            children: this.todos.filter(t => t.parentId === root.id)
        }));
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
