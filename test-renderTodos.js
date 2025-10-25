// Extracted renderTodos function for testing
function renderTodos(todos, stats, context, relatedFiles) {
    try {
        console.log('[renderTodos] Called with todos:', todos ? todos.length : 0);
        if (!todos || todos.length === 0) {
            console.log('[renderTodos] No todos to render');
            return;
        }
        if (!messagesContainer) {
            console.error('[renderTodos] messagesContainer not found!');
            return;
        }

        const completedCount = stats ? stats.completed : 0;
        const totalCount = stats ? stats.total : todos.length;
        const activeTodos = todos.filter(t => { return t.status !== 'completed'; });
        console.log('[renderTodos] Active todos:', activeTodos.length);

        if (activeTodos.length === 0) {
            console.log('[renderTodos] No active todos');
            return;
        }

        // Remove existing todo cards
        const existingTodoCards = messagesContainer.querySelectorAll('.message.message-system .inline-todo-card');
        if (existingTodoCards.length > 0) {
            console.log('[renderTodos] Removing', existingTodoCards.length, 'existing todo cards');
            existingTodoCards.forEach(card => {
                const messageEl = card.closest('.message.message-system');
                if (messageEl) {messageEl.remove();}
            });
        }

        // Sort todos by order field for sequential execution
        const sortedTodos = activeTodos.slice().sort((a, b) => {
            const orderA = a.order !== undefined ? a.order : 999;
            const orderB = b.order !== undefined ? b.order : 999;
            return orderA - orderB;
        });

        // Find the current active todo (first non-completed)
        let activeIndex = -1;
        for (let i = 0; i < sortedTodos.length; i++) {
            if (sortedTodos[i].status !== 'completed') {
                activeIndex = i;
                break;
            }
        }

        const todoHtml = '<div class="inline-todo-card">' +
            '<div class="inline-todo-header">📋 Tasks (' + sortedTodos.length + ' total, ' + completedCount + ' completed)</div>' +
            sortedTodos.map((todo, index) => {
                const isActive = (index === activeIndex);
                const isCompleted = todo.status === 'completed';
                const isPending = !isActive && !isCompleted;

                let status, icon, statusClass;
                if (isCompleted) {
                    status = 'completed';
                    icon = '✅';
                    statusClass = 'completed';
                } else if (isActive) {
                    status = 'in_progress';
                    icon = '⏳';
                    statusClass = 'in_progress active';
                } else {
                    status = 'pending';
                    icon = '⬜';
                    statusClass = 'pending';
                }

                const todoId = 'todo_' + index;
                const orderBadge = (todo.order !== undefined) ? '<span class="todo-order">#' + (todo.order + 1) + '</span>' : '';

                console.log('[renderTodos] Creating todo', index, '- order:', todo.order, 'status:', status, 'isActive:', isActive);

                let html = '<div class="inline-todo-item ' + statusClass + '" data-todo-id="' + todoId + '" data-todo-text="' + escapeHtml(todo.text) + '" data-order="' + (todo.order || 0) + '">';
                html += '<div class="todo-item-content">';
                html += '<span class="todo-icon">' + icon + '</span>';
                html += '<span class="todo-text">' + escapeHtml(todo.text) + '</span>';
                html += orderBadge;
                html += '</div>';
                if (isActive) {html += '<div class="todo-status-label">IN PROGRESS</div>';}
                if (isPending) {html += '<div class="todo-status-label pending-label">PENDING</div>';}
                html += '</div>';
                return html;
            }).join('') +
            '</div>';

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message message-system';
        messageDiv.innerHTML = todoHtml;
        console.log('[renderTodos] Adding todo card to messagesContainer');
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        console.log('[renderTodos] Todo card added successfully with sequential execution');
    } catch(e) {
        console.error('[renderTodos error]', e);
    }
}

console.log('✅ JavaScript syntax is valid!');
