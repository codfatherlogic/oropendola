/**
 * Enhanced Chat Input with @Mentions Autocomplete
 * Week 4.3: Performance Optimizations
 * - Debounced search (250ms)
 * - LRU cache for search results
 * - Virtual scrolling for 100+ items
 */

(function () {
    const vscode = acquireVsCodeApi();
    const messagesContainer = document.getElementById('messages');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');

    let isLoading = false;
    let mentionAutocomplete = null;
    let mentionSuggestions = [];
    let selectedSuggestionIndex = 0;
    let autocompleteVisible = false;

    // Performance optimizations
    let searchDebounceTimer = null;
    const DEBOUNCE_DELAY = 250; // ms
    const searchCache = new Map();
    const MAX_CACHE_SIZE = 100;
    const VIRTUAL_SCROLL_THRESHOLD = 50; // Enable virtual scrolling for 50+ items

    // Handle send button click
    sendButton.addEventListener('click', sendMessage);

    // Handle Enter key (Shift+Enter for new line)
    messageInput.addEventListener('keydown', handleKeyDown);

    // Handle input for mention detection
    messageInput.addEventListener('input', handleInput);

    // Debounce function
    function debounce(func, delay) {
        let timer = null;
        return function debounced(...args) {
            clearTimeout(timer);
            timer = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // Debounced autocomplete search
    const debouncedShowAutocomplete = debounce((query) => {
        showAutocompleteImpl(query);
    }, DEBOUNCE_DELAY);

    // Simple LRU Cache implementation
    function cacheSearchResult(query, results) {
        if (searchCache.size >= MAX_CACHE_SIZE) {
            // Remove oldest entry
            const firstKey = searchCache.keys().next().value;
            searchCache.delete(firstKey);
        }
        searchCache.set(query, {
            results,
            timestamp: Date.now()
        });
    }

    function getCachedSearchResult(query) {
        const cached = searchCache.get(query);
        if (!cached) return null;

        // Expire after 5 minutes
        if (Date.now() - cached.timestamp > 5 * 60 * 1000) {
            searchCache.delete(query);
            return null;
        }

        return cached.results;
    }

    function handleKeyDown(e) {
        // Handle autocomplete keyboard navigation
        if (autocompleteVisible) {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    navigateSuggestions(1);
                    return;
                case 'ArrowUp':
                    e.preventDefault();
                    navigateSuggestions(-1);
                    return;
                case 'Enter':
                case 'Tab':
                    if (mentionSuggestions.length > 0) {
                        e.preventDefault();
                        selectSuggestion(selectedSuggestionIndex);
                        return;
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    hideAutocomplete();
                    return;
            }
        }

        // Regular Enter key handling
        if (e.key === 'Enter' && !e.shiftKey && !autocompleteVisible) {
            e.preventDefault();
            sendMessage();
        }
    }

    function handleInput(e) {
        const text = messageInput.value;
        const cursorPosition = messageInput.selectionStart;

        // Check for mention trigger (@)
        if (isMentionTrigger(text, cursorPosition)) {
            const query = getMentionQuery(text, cursorPosition);
            // Use debounced search
            debouncedShowAutocomplete(query);
        } else {
            hideAutocomplete();
        }

        // Auto-resize (immediate, not debounced)
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 150) + 'px';
    }

    function isMentionTrigger(text, cursorPosition) {
        if (cursorPosition === 0) return false;

        const textBeforeCursor = text.slice(0, cursorPosition);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');

        if (lastAtIndex === -1) return false;

        // Check if there's whitespace or start of text before @
        if (lastAtIndex === 0) return true;

        const charBeforeAt = textBeforeCursor[lastAtIndex - 1];
        return /\s/.test(charBeforeAt);
    }

    function getMentionQuery(text, cursorPosition) {
        const textBeforeCursor = text.slice(0, cursorPosition);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        return textBeforeCursor.slice(lastAtIndex + 1);
    }

    // Wrapper function that checks cache first
    function showAutocomplete(query) {
        // Check cache first
        const cached = getCachedSearchResult(query);
        if (cached) {
            renderSuggestions(cached);
            return;
        }

        // If not in cache, fetch from extension
        showAutocompleteImpl(query);
    }

    // Implementation that actually makes the search request
    function showAutocompleteImpl(query) {
        // Request file search from extension
        vscode.postMessage({
            command: 'searchFiles',
            query,
            maxResults: 100 // Increased for virtual scrolling
        });

        // Create autocomplete UI if not exists
        if (!mentionAutocomplete) {
            createAutocompleteUI();
        }

        // Show loading state
        mentionAutocomplete.classList.add('loading');
        const listContainer = mentionAutocomplete.querySelector('.mention-autocomplete-list');
        listContainer.innerHTML = `
            <div class="mention-autocomplete-loading">
                <div class="mention-loading-spinner"></div>
                <span>Searching files...</span>
            </div>
        `;

        mentionAutocomplete.style.display = 'block';
        autocompleteVisible = true;
    }

    function hideAutocomplete() {
        if (mentionAutocomplete) {
            mentionAutocomplete.style.display = 'none';
        }
        autocompleteVisible = false;
        mentionSuggestions = [];
    }

    function createAutocompleteUI() {
        mentionAutocomplete = document.createElement('div');
        mentionAutocomplete.className = 'mention-autocomplete';
        mentionAutocomplete.innerHTML = `
            <div class="mention-autocomplete-header">
                <span class="mention-autocomplete-title">Mentions</span>
                <span class="mention-autocomplete-hint">↑↓ navigate • Enter select • Esc close</span>
            </div>
            <div class="mention-autocomplete-list" id="mention-suggestions"></div>
        `;

        // Position above input
        const inputContainer = document.getElementById('input-container');
        inputContainer.parentNode.insertBefore(mentionAutocomplete, inputContainer);
    }

    function renderSuggestions(suggestions, cacheKey = null) {
        if (!mentionAutocomplete) return;

        // Remove loading state
        mentionAutocomplete.classList.remove('loading');

        // Cache results if cache key provided
        if (cacheKey) {
            cacheSearchResult(cacheKey, suggestions);
        }

        mentionSuggestions = suggestions;
        const listContainer = mentionAutocomplete.querySelector('.mention-autocomplete-list');
        listContainer.innerHTML = '';

        // Empty state with icon
        if (suggestions.length === 0) {
            listContainer.innerHTML = `
                <div class="mention-autocomplete-empty">
                    <div class="mention-autocomplete-empty-icon">📂</div>
                    <div>No matches found</div>
                </div>
            `;
            return;
        }

        mentionAutocomplete.style.display = 'block';

        // Use virtual scrolling for large lists
        if (suggestions.length > VIRTUAL_SCROLL_THRESHOLD) {
            renderVirtualScrollList(suggestions, listContainer);
        } else {
            renderFullList(suggestions, listContainer);
        }

        // Reset selection to first item
        selectedSuggestionIndex = 0;
    }

    // Render full list for small result sets
    function renderFullList(suggestions, container) {
        suggestions.forEach((suggestion, index) => {
            const item = createSuggestionItem(suggestion, index);
            container.appendChild(item);
        });
    }

    // Virtual scrolling for large result sets (100+ items)
    function renderVirtualScrollList(suggestions, container) {
        const itemHeight = 44; // Approximate height in pixels
        const visibleItems = 10; // Show 10 items at a time
        const totalHeight = suggestions.length * itemHeight;

        container.style.height = `${visibleItems * itemHeight}px`;
        container.style.position = 'relative';
        container.style.overflowY = 'scroll';

        // Create virtual scroll container
        const scrollContainer = document.createElement('div');
        scrollContainer.style.height = `${totalHeight}px`;
        scrollContainer.style.position = 'relative';

        let lastScrollTop = 0;

        function renderVisibleItems(scrollTop) {
            const startIndex = Math.floor(scrollTop / itemHeight);
            const endIndex = Math.min(startIndex + visibleItems + 2, suggestions.length);

            // Clear old items
            scrollContainer.innerHTML = '';

            // Render only visible items
            for (let i = startIndex; i < endIndex; i++) {
                const item = createSuggestionItem(suggestions[i], i);
                item.style.position = 'absolute';
                item.style.top = `${i * itemHeight}px`;
                item.style.width = '100%';
                scrollContainer.appendChild(item);
            }
        }

        // Initial render
        renderVisibleItems(0);

        // Update on scroll
        container.addEventListener('scroll', () => {
            const scrollTop = container.scrollTop;
            if (Math.abs(scrollTop - lastScrollTop) > itemHeight) {
                renderVisibleItems(scrollTop);
                lastScrollTop = scrollTop;
            }
        });

        container.appendChild(scrollContainer);
    }

    // Create single suggestion item
    function createSuggestionItem(suggestion, index) {
        const item = document.createElement('div');
        item.className = `mention-autocomplete-item ${suggestion.type} ${index === selectedSuggestionIndex ? 'selected' : ''}`;
        item.innerHTML = `
            <span class="mention-icon">${suggestion.icon || '📄'}</span>
            <div class="mention-content">
                <div class="mention-label">${escapeHtml(suggestion.label)}</div>
                ${suggestion.description ? `<div class="mention-description">${escapeHtml(suggestion.description)}</div>` : ''}
            </div>
            <span class="mention-type-badge">${suggestion.type}</span>
        `;

        item.onclick = () => selectSuggestion(index);
        item.onmouseenter = () => {
            selectedSuggestionIndex = index;
            updateSelectedSuggestion();
        };

        return item;
    }

    function navigateSuggestions(direction) {
        selectedSuggestionIndex = (selectedSuggestionIndex + direction + mentionSuggestions.length) % mentionSuggestions.length;
        updateSelectedSuggestion();
    }

    function updateSelectedSuggestion() {
        const items = mentionAutocomplete.querySelectorAll('.mention-autocomplete-item');
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === selectedSuggestionIndex);
        });

        // Scroll selected item into view
        const selectedItem = items[selectedSuggestionIndex];
        if (selectedItem) {
            selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    function selectSuggestion(index) {
        const suggestion = mentionSuggestions[index];
        if (!suggestion) return;

        // Insert mention into textarea
        const text = messageInput.value;
        const cursorPosition = messageInput.selectionStart;
        const textBeforeCursor = text.slice(0, cursorPosition);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');

        const before = text.slice(0, lastAtIndex);
        const after = text.slice(cursorPosition);
        const mention = `@${suggestion.value}`;

        messageInput.value = before + mention + ' ' + after;
        
        // Add success animation
        messageInput.classList.add('mention-inserted');
        setTimeout(() => messageInput.classList.remove('mention-inserted'), 400);
        
        messageInput.focus();

        // Set cursor after mention
        const newCursorPos = before.length + mention.length + 1;
        messageInput.setSelectionRange(newCursorPos, newCursorPos);

        hideAutocomplete();
    }

    function sendMessage() {
        const text = messageInput.value.trim();
        if (!text || isLoading) return;

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
        hideAutocomplete();

        // Show loading
        setLoading(true);
    }

    function addMessageToChat(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.role}`;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        // Process content for code blocks and mentions
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
        // Format code blocks
        let formatted = content
            .replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
                return `<pre><code class="language-${lang || 'text'}">${escapeHtml(code.trim())}</code></pre>`;
            })
            .replace(/`([^`]+)`/g, '<code>$1</code>');

        // Format @mentions with colors
        formatted = formatted.replace(
            /@(?:problems|terminal(?:\s+\d+)?|git(?:\s+[\w-]+)?|https?:\/\/[^\s]+|(?:\.?\.?\/)?(?:[^\s@]|\\ )+(?:\.[a-zA-Z0-9]+|\/))/gi,
            (mention) => {
                const type = detectMentionType(mention);
                return `<span class="mention mention-${type}">${escapeHtml(mention)}</span>`;
            }
        );

        // Format line breaks
        formatted = formatted.replace(/\n/g, '<br>');

        return formatted;
    }

    function detectMentionType(mention) {
        if (/^@(problems|terminal|git)/i.test(mention)) return 'special';
        if (/^@https?:\/\//i.test(mention)) return 'url';
        if (mention.endsWith('/')) return 'folder';
        return 'file';
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
                    <span class="loading">Thinking...</span>
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

        switch (message.type) {
            case 'fileSearchResults':
                if (autocompleteVisible) {
                    if (message.error) {
                        showError(message.error);
                    } else {
                        // Cache results with query as key
                        renderSuggestions(message.results || [], message.query);
                    }
                }
                break;
            case 'triggerQuickMention':
                // Cmd+K triggered - show quick file picker
                handleQuickMention();
                break;
            case 'insertMention':
                // Insert mention from external command
                insertMentionAtCursor(message.mention);
                break;
            case 'mentionContexts':
                // Show context extraction indicator
                if (message.contexts && message.contexts.length > 0) {
                    showContextIndicator(message.contexts.length);
                }
                break;
        }
    });

    function showError(errorMessage) {
        // Remove loading state
        if (mentionAutocomplete) {
            mentionAutocomplete.classList.remove('loading');
        }

        // Show error message
        const listContainer = mentionAutocomplete.querySelector('.mention-autocomplete-list');
        listContainer.innerHTML = `
            <div class="mention-error">
                <span class="mention-error-icon">⚠️</span>
                <span>${escapeHtml(errorMessage)}</span>
            </div>
        `;
    }

    function showContextIndicator(count) {
        // Create context indicator badge
        const indicator = document.createElement('div');
        indicator.className = 'mention-context-indicator';
        indicator.innerHTML = `
            <span>📎 ${count} context${count > 1 ? 's' : ''} extracted</span>
            <span class="mention-context-count">${count}</span>
        `;

        // Add to last user message
        const messages = messagesContainer.querySelectorAll('.message.user');
        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            lastMessage.appendChild(indicator);

            // Remove after 3 seconds
            setTimeout(() => {
                indicator.style.opacity = '0';
                setTimeout(() => indicator.remove(), 300);
            }, 3000);
        }
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function handleQuickMention() {
        // Focus input and trigger autocomplete with @
        messageInput.focus();
        const cursorPos = messageInput.selectionStart;
        const text = messageInput.value;
        const before = text.slice(0, cursorPos);
        const after = text.slice(cursorPos);

        // Insert @ if not already typing a mention
        if (!isMentionTrigger(text, cursorPos)) {
            messageInput.value = before + '@' + after;
            messageInput.selectionStart = messageInput.selectionEnd = cursorPos + 1;
        }

        // Trigger autocomplete
        showAutocomplete('');
    }

    function insertMentionAtCursor(mention) {
        // Insert mention at current cursor position
        messageInput.focus();
        const cursorPos = messageInput.selectionStart;
        const text = messageInput.value;
        const before = text.slice(0, cursorPos);
        const after = text.slice(cursorPos);

        messageInput.value = before + mention + ' ' + after;
        messageInput.selectionStart = messageInput.selectionEnd = cursorPos + mention.length + 1;
        messageInput.dispatchEvent(new Event('input'));
    }

    // Focus input on load
    messageInput.focus();
})();
