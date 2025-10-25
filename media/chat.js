(function () {
    const vscode = acquireVsCodeApi();
    const messagesContainer = document.getElementById('messages');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');

    let isLoading = false;

    // Handle send button click
    sendButton.addEventListener('click', sendMessage);

    // Handle Enter key (Shift+Enter for new line)
    messageInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    function sendMessage() {
        const text = messageInput.value.trim();
        if (!text || isLoading) {return;}

        // Add user message to chat
        addMessageToChat({
            role: 'user',
            content: text,
            timestamp: Date.now()
        });

        // Send to extension
        vscode.postMessage({
            command: 'sendMessage',
            text
        });

        // Clear input
        messageInput.value = '';
        messageInput.style.height = 'auto';

        // Show loading
        setLoading(true);
    }

    function addMessageToChat(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.role}`;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        // Process content for code blocks
        contentDiv.innerHTML = formatMessageContent(message.content);

        messageDiv.appendChild(contentDiv);
        messagesContainer.appendChild(messageDiv);

        // Add code action buttons
        messageDiv.querySelectorAll('pre').forEach(pre => {
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'code-actions';

            const copyBtn = document.createElement('button');
            copyBtn.className = 'code-action-btn';
            copyBtn.textContent = 'Copy';
            copyBtn.onclick = () => {
                const code = pre.querySelector('code')?.textContent || pre.textContent;
                vscode.postMessage({
                    command: 'copyCode',
                    code
                });
            };

            const insertBtn = document.createElement('button');
            insertBtn.className = 'code-action-btn';
            insertBtn.textContent = 'Insert';
            insertBtn.onclick = () => {
                const code = pre.querySelector('code')?.textContent || pre.textContent;
                vscode.postMessage({
                    command: 'insertCode',
                    code
                });
            };

            actionsDiv.appendChild(copyBtn);
            actionsDiv.appendChild(insertBtn);
            pre.style.position = 'relative';
            pre.appendChild(actionsDiv);
        });

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function formatMessageContent(content) {
        // Simple markdown-like formatting for code blocks
        return content
            .replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
                return `<pre><code class="language-${lang || 'text'}">${escapeHtml(code.trim())}</code></pre>`;
            })
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function setLoading(loading) {
        isLoading = loading;
        sendButton.disabled = loading;

        if (loading) {
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'message assistant';
            loadingDiv.id = 'loading-indicator';
            loadingDiv.innerHTML = `
                <div class="message-content">
                    <span class="loading"></span>
                </div>
            `;
            messagesContainer.appendChild(loadingDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } else {
            const loadingIndicator = document.getElementById('loading-indicator');
            if (loadingIndicator) {
                loadingIndicator.remove();
            }
        }
    }

    // Handle messages from extension
    window.addEventListener('message', event => {
        const message = event.data;

        switch (message.command) {
            case 'addMessage':
                setLoading(false);
                addMessageToChat(message.message);
                break;
            case 'showLoading':
                setLoading(true);
                break;
        }
    });

    // Auto-resize textarea
    messageInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 150) + 'px';
    });

    // Focus input on load
    messageInput.focus();
})();
