const vscode = require('vscode');
const { backendTodoService } = require('../services/backendTodoService');

/**
 * Todo Panel - Displays and manages todos from backend
 * Shows todos extracted from AI conversations
 */
class TodoPanel {
    constructor(context) {
        this.context = context;
        this.panel = null;
        this.todos = [];
        this.filter = { status: 'all', priority: 'all' };

        // Listen for todo updates
        backendTodoService.on('todosExtracted', () => this.refresh());
        backendTodoService.on('todoUpdated', () => this.refresh());
    }

    /**
     * Show todo panel
     */
    async show() {
        if (this.panel) {
            this.panel.reveal();
            return;
        }

        // Create panel
        this.panel = vscode.window.createWebviewPanel(
            'oropendolaTodos',
            'Oropendola Todos',
            vscode.ViewColumn.Two,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        // Set icon
        this.panel.iconPath = {
            light: vscode.Uri.file(this.context.asAbsolutePath('media/icon.svg')),
            dark: vscode.Uri.file(this.context.asAbsolutePath('media/icon.svg'))
        };

        // Handle messages from webview
        this.panel.webview.onDidReceiveMessage(
            async message => await this.handleMessage(message),
            undefined,
            this.context.subscriptions
        );

        // Handle panel disposal
        this.panel.onDidDispose(
            () => { this.panel = null; },
            null,
            this.context.subscriptions
        );

        // Load initial data
        await this.refresh();
    }

    /**
     * Refresh todo list
     */
    async refresh() {
        if (!this.panel) {return;}

        try {
            // Get todos with current filter
            const filters = {};
            if (this.filter.status !== 'all') {
                filters.status = this.filter.status;
            }
            if (this.filter.priority !== 'all') {
                filters.priority = this.filter.priority;
            }
            filters.limit = 100;

            this.todos = await backendTodoService.getTodos(filters);

            // Get statistics
            const stats = await backendTodoService.getTodoStats();

            // Update webview
            this.panel.webview.html = this.getHtmlContent(this.todos, stats);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to load todos: ${error.message}`);
        }
    }

    /**
     * Handle messages from webview
     */
    async handleMessage(message) {
        switch (message.command) {
            case 'refresh':
                await this.refresh();
                break;

            case 'filter':
                this.filter = message.filter;
                await this.refresh();
                break;

            case 'complete':
                await this.completeTodo(message.todoId);
                break;

            case 'start':
                await this.startTodo(message.todoId);
                break;

            case 'updatePriority':
                await this.updatePriority(message.todoId, message.priority);
                break;

            case 'extractFromText':
                await this.extractFromText();
                break;

            case 'showStats':
                await this.showStatistics();
                break;
        }
    }

    /**
     * Complete a todo
     */
    async completeTodo(todoId) {
        try {
            await backendTodoService.completeTodo(todoId);
            vscode.window.showInformationMessage('✅ Todo completed');
            await this.refresh();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to complete todo: ${error.message}`);
        }
    }

    /**
     * Start working on todo
     */
    async startTodo(todoId) {
        try {
            await backendTodoService.startTodo(todoId);
            vscode.window.showInformationMessage('⏳ Todo started');
            await this.refresh();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to start todo: ${error.message}`);
        }
    }

    /**
     * Update todo priority
     */
    async updatePriority(todoId, priority) {
        try {
            await backendTodoService.updateTodoPriority(todoId, priority);
            await this.refresh();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to update priority: ${error.message}`);
        }
    }

    /**
     * Extract todos from selected text or input
     */
    async extractFromText() {
        const editor = vscode.window.activeTextEditor;
        let text = '';

        if (editor && editor.selection && !editor.selection.isEmpty) {
            text = editor.document.getText(editor.selection);
        }

        if (!text) {
            text = await vscode.window.showInputBox({
                prompt: 'Enter text to extract todos from',
                placeHolder: 'e.g., We need to: 1. Fix bug 2. Add tests 3. Update docs',
                value: text
            });
        }

        if (!text) {return;}

        try {
            const todos = await backendTodoService.extractTodos(text, 'Manual extraction', true);
            vscode.window.showInformationMessage(`✅ Extracted ${todos.length} todo(s)`);
            await this.refresh();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to extract todos: ${error.message}`);
        }
    }

    /**
     * Show todo statistics
     */
    async showStatistics() {
        try {
            const stats = await backendTodoService.getTodoStats();

            const message = `
📊 **Todo Statistics**

**Total**: ${stats.total}
**Open**: ${stats.open}
**In Progress**: ${stats.working}
**Completed**: ${stats.completed}

**By Priority**:
- 🔴 High: ${stats.high_priority}
- 🟡 Medium: ${stats.medium_priority}
- 🟢 Low: ${stats.low_priority}

**Completion Rate**: ${stats.completion_rate}%
            `;

            vscode.window.showInformationMessage(message, { modal: true });
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to get statistics: ${error.message}`);
        }
    }

    /**
     * Generate HTML content
     */
    getHtmlContent(todos, stats) {
        const todosByStatus = {
            'Open': todos.filter(t => t.status === 'Open'),
            'Working': todos.filter(t => t.status === 'Working'),
            'Completed': todos.filter(t => t.status === 'Completed')
        };

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Oropendola Todos</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-foreground);
                    background: var(--vscode-editor-background);
                    padding: 20px;
                    line-height: 1.6;
                }
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 1px solid var(--vscode-widget-border);
                }
                h1 {
                    font-size: 24px;
                    font-weight: 600;
                }
                .stats {
                    display: flex;
                    gap: 20px;
                    margin-bottom: 20px;
                    padding: 15px;
                    background: var(--vscode-editor-inactiveSelectionBackground);
                    border-radius: 6px;
                }
                .stat-item {
                    text-align: center;
                }
                .stat-value {
                    font-size: 24px;
                    font-weight: bold;
                    color: var(--vscode-textLink-foreground);
                }
                .stat-label {
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                    margin-top: 4px;
                }
                .actions {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 20px;
                }
                button {
                    padding: 8px 16px;
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 13px;
                    transition: background 0.2s;
                }
                button:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                button.secondary {
                    background: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                }
                button.secondary:hover {
                    background: var(--vscode-button-secondaryHoverBackground);
                }
                .filters {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 20px;
                }
                select {
                    padding: 6px 12px;
                    background: var(--vscode-dropdown-background);
                    color: var(--vscode-dropdown-foreground);
                    border: 1px solid var(--vscode-dropdown-border);
                    border-radius: 4px;
                    font-size: 13px;
                }
                .status-section {
                    margin-bottom: 30px;
                }
                .status-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 15px;
                    font-size: 18px;
                    font-weight: 600;
                }
                .status-icon {
                    font-size: 24px;
                }
                .todo-item {
                    background: var(--vscode-editor-inactiveSelectionBackground);
                    border-radius: 6px;
                    padding: 15px;
                    margin-bottom: 10px;
                    transition: background 0.2s;
                }
                .todo-item:hover {
                    background: var(--vscode-list-hoverBackground);
                }
                .todo-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 8px;
                }
                .priority-badge {
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 600;
                }
                .priority-high {
                    background: rgba(255, 59, 48, 0.2);
                    color: #ff3b30;
                }
                .priority-medium {
                    background: rgba(255, 204, 0, 0.2);
                    color: #ffcc00;
                }
                .priority-low {
                    background: rgba(52, 199, 89, 0.2);
                    color: #34c759;
                }
                .todo-description {
                    flex: 1;
                    font-size: 14px;
                }
                .todo-meta {
                    display: flex;
                    gap: 15px;
                    margin-top: 8px;
                    font-size: 12px;
                    color: var(--vscode-descriptionForeground);
                }
                .todo-actions {
                    display: flex;
                    gap: 8px;
                    margin-top: 10px;
                }
                .todo-actions button {
                    padding: 4px 12px;
                    font-size: 12px;
                }
                .empty-state {
                    text-align: center;
                    padding: 60px 20px;
                    color: var(--vscode-descriptionForeground);
                }
                .empty-icon {
                    font-size: 48px;
                    margin-bottom: 15px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📋 Todos</h1>
                <button onclick="refresh()">🔄 Refresh</button>
            </div>

            <div class="stats">
                <div class="stat-item">
                    <div class="stat-value">${stats.total}</div>
                    <div class="stat-label">Total</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.open}</div>
                    <div class="stat-label">Open</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.working}</div>
                    <div class="stat-label">In Progress</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.completed}</div>
                    <div class="stat-label">Completed</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.completion_rate}%</div>
                    <div class="stat-label">Complete</div>
                </div>
            </div>

            <div class="actions">
                <button onclick="extractTodos()">✨ Extract from Text</button>
                <button class="secondary" onclick="showStats()">📊 Statistics</button>
            </div>

            <div class="filters">
                <select id="statusFilter" onchange="applyFilters()">
                    <option value="all">All Status</option>
                    <option value="Open">Open</option>
                    <option value="Working">In Progress</option>
                    <option value="Completed">Completed</option>
                </select>
                <select id="priorityFilter" onchange="applyFilters()">
                    <option value="all">All Priority</option>
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                </select>
            </div>

            ${todosByStatus.Open.length > 0 ? `
            <div class="status-section">
                <div class="status-header">
                    <span class="status-icon">📋</span>
                    <span>Open (${todosByStatus.Open.length})</span>
                </div>
                ${todosByStatus.Open.map(todo => this.renderTodoItem(todo)).join('')}
            </div>
            ` : ''}

            ${todosByStatus.Working.length > 0 ? `
            <div class="status-section">
                <div class="status-header">
                    <span class="status-icon">⏳</span>
                    <span>In Progress (${todosByStatus.Working.length})</span>
                </div>
                ${todosByStatus.Working.map(todo => this.renderTodoItem(todo)).join('')}
            </div>
            ` : ''}

            ${todosByStatus.Completed.length > 0 ? `
            <div class="status-section">
                <div class="status-header">
                    <span class="status-icon">✅</span>
                    <span>Completed (${todosByStatus.Completed.length})</span>
                </div>
                ${todosByStatus.Completed.map(todo => this.renderTodoItem(todo)).join('')}
            </div>
            ` : ''}

            ${todos.length === 0 ? `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <h2>No todos yet</h2>
                <p>Todos will automatically appear here when extracted from AI conversations</p>
                <button onclick="extractTodos()" style="margin-top: 20px">✨ Extract Todos</button>
            </div>
            ` : ''}

            <script>
                const vscode = acquireVsCodeApi();

                function refresh() {
                    vscode.postMessage({ command: 'refresh' });
                }

                function applyFilters() {
                    const status = document.getElementById('statusFilter').value;
                    const priority = document.getElementById('priorityFilter').value;
                    vscode.postMessage({
                        command: 'filter',
                        filter: { status, priority }
                    });
                }

                function completeTodo(todoId) {
                    vscode.postMessage({ command: 'complete', todoId });
                }

                function startTodo(todoId) {
                    vscode.postMessage({ command: 'start', todoId });
                }

                function updatePriority(todoId, priority) {
                    vscode.postMessage({ command: 'updatePriority', todoId, priority });
                }

                function extractTodos() {
                    vscode.postMessage({ command: 'extractFromText' });
                }

                function showStats() {
                    vscode.postMessage({ command: 'showStats' });
                }
            </script>
        </body>
        </html>`;
    }

    /**
     * Render single todo item
     */
    renderTodoItem(todo) {
        const priorityClass = `priority-${todo.priority?.toLowerCase() || 'medium'}`;
        const priorityIcon = todo.priority === 'High' ? '🔴' :
            todo.priority === 'Medium' ? '🟡' : '🟢';

        const actions = todo.status === 'Open' ? `
            <button onclick="startTodo('${todo.name}')">▶️ Start</button>
            <button onclick="completeTodo('${todo.name}')">✅ Complete</button>
        ` : todo.status === 'Working' ? `
            <button onclick="completeTodo('${todo.name}')">✅ Complete</button>
        ` : '';

        return `
        <div class="todo-item">
            <div class="todo-header">
                <span class="priority-badge ${priorityClass}">${priorityIcon} ${todo.priority || 'Medium'}</span>
                <span class="todo-description">${this.escapeHtml(todo.description)}</span>
            </div>
            <div class="todo-meta">
                <span>ID: ${todo.name}</span>
                ${todo.created_at ? `<span>Created: ${new Date(todo.created_at).toLocaleDateString()}</span>` : ''}
                ${todo.assigned_to ? `<span>Assigned: ${todo.assigned_to}</span>` : ''}
            </div>
            ${actions ? `<div class="todo-actions">${actions}</div>` : ''}
        </div>
        `;
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

module.exports = TodoPanel;
