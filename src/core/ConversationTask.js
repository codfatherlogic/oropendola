/**
 * ConversationTask - Task-based conversation management
 * Inspired by KiloCode's Task abstraction pattern
 *
 * Encapsulates a single conversation instance with:
 * - Message history
 * - Tool execution
 * - Error recovery
 * - State management
 * - File change tracking (Qoder-style)
 */

const EventEmitter = require('events');
const vscode = require('vscode');
const FileChangeTracker = require('../utils/file-change-tracker');
const RealtimeManager = require('./RealtimeManager');

class ConversationTask extends EventEmitter {
    constructor(taskId, options = {}) {
        super();

        this.taskId = taskId;
        this.instanceId = Date.now();
        this.status = 'idle'; // 'idle' | 'running' | 'waiting' | 'paused' | 'completed' | 'error'
        this.createdAt = new Date();

        // Configuration
        this.apiUrl = options.apiUrl;
        this.sessionCookies = options.sessionCookies;
        this.mode = options.mode || 'agent'; // 'ask' | 'edit' | 'agent'
        this.providerRef = options.providerRef; // WeakRef to parent provider

        // Conversation state
        this.messages = [];
        this.toolResults = [];
        this.conversationId = null;

        // Error handling
        this.consecutiveMistakeCount = 0;
        this.consecutiveMistakeLimit = options.consecutiveMistakeLimit || 3;
        this.retryCount = 0;
        this.maxRetries = 3;

        // Context management
        this.maxContextTokens = 128000; // GPT-4 default

        // Abort control
        this.abort = false;
        this.abortController = null;

        // File change tracking (Qoder-style)
        this.fileChangeTracker = new FileChangeTracker();
        this.taskStartTime = null;
        this.taskEndTime = null;
        this.errors = [];

        // Real-time WebSocket connection
        this.realtimeManager = null;
        this.realtimeConnected = false;

        // Initialize realtime connection if session cookies provided
        if (options.sessionCookies && options.apiUrl) {
            this._setupRealtimeConnection(options.apiUrl, options.sessionCookies);
        } else {
            console.warn('⚠️ [ConversationTask] No session cookies - realtime updates disabled');
        }
    }

    /**
     * Set up WebSocket connection for real-time progress updates
     * Connects to oropendola.ai's Socket.IO server
     *
     * @param {string} apiUrl - Base URL (https://oropendola.ai)
     * @param {string} sessionCookies - Session cookies for authentication
     */
    _setupRealtimeConnection(apiUrl, sessionCookies) {
        console.log('🔌 [ConversationTask] Setting up realtime connection for task:', this.taskId);

        try {
            this.realtimeManager = new RealtimeManager(apiUrl, sessionCookies);

            // Forward ai_progress events to task listeners
            this.realtimeManager.on('ai_progress', (data) => {
                console.log(`📊 [ConversationTask ${this.taskId}] AI Progress [${data.type}]:`, data.message || '');

                // Emit to sidebar webview
                this.emit('aiProgress', this.taskId, data);

                // Update task status based on progress type
                if (data.type === 'thinking') {
                    this.status = 'thinking';
                } else if (data.type === 'working') {
                    this.status = 'executing';
                } else if (data.type === 'complete') {
                    this.status = 'completed';
                } else if (data.type === 'error') {
                    this.status = 'failed';
                }
            });

            // Handle connection events
            this.realtimeManager.on('connected', () => {
                console.log(`✅ [ConversationTask ${this.taskId}] Realtime connection established`);
                this.realtimeConnected = true;
                this.emit('realtimeConnected', this.taskId);
            });

            this.realtimeManager.on('disconnected', (reason) => {
                console.log(`❌ [ConversationTask ${this.taskId}] Realtime connection lost:`, reason);
                this.realtimeConnected = false;
                this.emit('realtimeDisconnected', this.taskId, reason);
            });

            this.realtimeManager.on('error', (error) => {
                console.error(`❌ [ConversationTask ${this.taskId}] Realtime error:`, error);
                this.emit('realtimeError', this.taskId, error);
            });

            // Connect immediately
            this.realtimeManager.connect();

        } catch (error) {
            console.error(`❌ [ConversationTask ${this.taskId}] Failed to setup realtime:`, error);
        }
    }

    /**
     * Start the task execution loop
     */
    async run(initialMessage, images = []) {
        try {
            this.status = 'running';
            this.taskStartTime = new Date().toISOString();
            this.emit('taskStarted', this.taskId);

            console.log(`🚀 Task ${this.taskId} started`);

            // Add initial user message
            this.addMessage('user', initialMessage, images);

            // Main execution loop
            while (!this.abort && this.status === 'running') {
                try {
                    // Make AI request with retry logic
                    const response = await this._makeAIRequestWithRetry();

                    if (!response) {
                        console.log('ℹ️ No response from AI (user canceled or error), ending task');
                        break;
                    }

                    // Parse tool calls from response
                    const toolCalls = this._parseToolCalls(response);

                    if (toolCalls.length > 0) {
                        console.log(`🔧 Found ${toolCalls.length} tool call(s) to execute`);

                        // Emit tool execution event (keeps thinking indicator visible)
                        this.emit('toolsExecuting', this.taskId, toolCalls.length);

                        // Execute all tool calls
                        const toolResults = await this._executeToolCalls(toolCalls);

                        // Add tool results to conversation
                        for (const result of toolResults) {
                            this.addMessage('tool_result', result.content, [], result.tool_name);
                        }

                        // Mark that tools were executed - we'll want one more AI response to summarize
                        this.toolsExecutedInLastIteration = true;

                        // Continue loop with tool results - AI will see results and continue
                        this.consecutiveMistakeCount = 0; // Reset on successful tool execution

                        // Continue the conversation loop automatically
                        continue;
                    } else {
                        console.log('ℹ️ No tool calls found, final response');

                        // Clean the response - remove any remaining tool_call blocks
                        const cleanedResponse = this._cleanToolCallsFromResponse(response);

                        // ONLY emit assistant message when task is truly done (no tool calls)
                        // Include TODOs and file_changes if available
                        try {
                            console.log('🔔 Emitting assistantMessage with extras keys:', response ? Object.keys(response).filter(k=>k.startsWith('_') || k==='todos' || k==='file_changes' || k==='todo_stats') : []);
                        } catch(e) {
                            // Log parsing error
                            console.warn('Failed to log extras keys:', e);
                        }
                        this.emit('assistantMessage', this.taskId, cleanedResponse, {
                            todos: response._todos,
                            todo_stats: response._todo_stats,
                            file_changes: response._file_changes
                        });

                        // Check if task is complete or needs continuation
                        const shouldContinue = await this._checkTaskCompletion();

                        if (!shouldContinue) {
                            break;
                        }

                        this.consecutiveMistakeCount++;
                    }

                    // Check consecutive mistakes
                    if (this.consecutiveMistakeCount >= this.consecutiveMistakeLimit) {
                        console.warn(`⚠️ Consecutive mistake limit reached (${this.consecutiveMistakeCount})`);

                        // Ask user for guidance
                        const shouldRetry = await this._handleMistakeLimit();
                        if (!shouldRetry) {
                            break;
                        }

                        this.consecutiveMistakeCount = 0;
                    }

                } catch (loopError) {
                    // Check if this is a user cancellation - not a real error
                    if (loopError.name === 'CanceledError' || loopError.code === 'ERR_CANCELED' || loopError.message?.includes('cancel')) {
                        console.log('⏹ Task loop canceled by user');
                        break; // Exit loop gracefully, don't treat as error
                    }

                    console.error('❌ Error in task loop:', loopError);

                    // Handle context window errors
                    if (this._isContextWindowError(loopError)) {
                        await this._handleContextWindowError();
                        continue; // Retry with reduced context
                    }

                    // Handle rate limit errors
                    if (this._isRateLimitError(loopError)) {
                        await this._handleRateLimitError();
                        continue; // Retry after delay
                    }

                    // Other errors - re-throw
                    throw loopError;
                }
            }

            // Task completed
            this.status = 'completed';
            this.taskEndTime = new Date().toISOString();
            this.emit('taskCompleted', this.taskId);
            console.log(`✅ Task ${this.taskId} completed`);

            // Generate and emit task summary
            this._emitTaskSummary();

        } catch (error) {
            // Don't emit error event for user cancellations
            if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED' || error.message?.includes('cancel')) {
                console.log('⏹ Task canceled by user - completing normally');
                this.status = 'completed';
                this.emit('taskCompleted', this.taskId);
                return; // Exit without throwing
            }

            this.status = 'error';
            this.emit('taskError', this.taskId, error);
            console.error(`❌ Task ${this.taskId} error:`, error);
            throw error;
        } finally {
            // ALWAYS ensure typing indicator is hidden, regardless of how task ended
            console.log('🧹 Task cleanup: ensuring typing indicator is hidden');
            this.emit('taskCleanup', this.taskId);

            // Disconnect realtime connection
            this._cleanupRealtimeConnection();
        }
    }

    /**
     * Clean up realtime WebSocket connection
     */
    _cleanupRealtimeConnection() {
        if (this.realtimeManager) {
            console.log(`🔌 [ConversationTask ${this.taskId}] Disconnecting realtime connection`);
            this.realtimeManager.disconnect();
            this.realtimeManager.removeAllListeners();
            this.realtimeManager = null;
            this.realtimeConnected = false;
        }
    }

    /**
     * Make AI request with exponential backoff retry logic
     * KiloCode pattern: Retry with progressive delays
     */
    async _makeAIRequestWithRetry(retryCount = 0) {
        const axios = require('axios');
        const http = require('http');
        const https = require('https');

        try {
            // Check context window before making request
            this._ensureContextWithinLimits();

            // Build messages for API
            const apiMessages = this._buildApiMessages();

            // Create abort controller for this request
            this.abortController = new AbortController();

            console.log(`📤 Making AI request (attempt ${retryCount + 1}/${this.maxRetries + 1})`);
            console.log(`🔍 DEBUG: Sending mode = '${this.mode}'`);
            console.log(`🔍 DEBUG: API URL = ${this.apiUrl}/api/method/ai_assistant.api.chat`);

            // Create custom HTTP/HTTPS agents to bypass Expect header
            const httpAgent = new http.Agent({ keepAlive: true });
            const httpsAgent = new https.Agent({ keepAlive: true });

            const requestData = {
                messages: apiMessages,  // Send full conversation history
                conversation_id: this.conversationId,
                mode: this.mode,  // CRITICAL: This should be 'agent' for tool calls
                context: this._buildContext()
            };

            console.log('🔍 DEBUG: Request payload:', JSON.stringify({
                message_count: apiMessages.length,
                conversation_id: this.conversationId,
                mode: this.mode,
                has_context: !!this._buildContext(),
                has_images: apiMessages.some(m => Array.isArray(m.content)),
                payload_size_kb: Math.round(Buffer.byteLength(JSON.stringify(requestData)) / 1024)
            }, null, 2));

            const response = await axios({
                method: 'POST',
                url: `${this.apiUrl}/api/method/ai_assistant.api.chat`,
                data: requestData,
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': this.sessionCookies,
                    'Content-Length': Buffer.byteLength(JSON.stringify({
                        messages: apiMessages,
                        conversation_id: this.conversationId,
                        mode: this.mode,
                        context: this._buildContext()
                    }))
                },
                timeout: 120000,
                signal: this.abortController.signal,
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                httpAgent: httpAgent,
                httpsAgent: httpsAgent,
                // Prevent axios from adding any automatic headers
                transformRequest: [(data) => {
                    return JSON.stringify(data);
                }],
                // Add request/response interceptors for better debugging
                validateStatus: function (status) {
                    return status >= 200 && status < 600; // Accept all status codes to handle manually
                }
            });

            console.log('✅ Received response from API');
            console.log('🔍 Response status:', response.status);
            console.log('🔍 Response data keys:', Object.keys(response.data || {}));
            console.log('🔍 Response data:', JSON.stringify(response.data, null, 2).substring(0, 500));

            // Check for HTTP errors
            if (response.status >= 400) {
                console.error('❌ HTTP Error:', response.status, response.statusText);
                console.error('❌ Error data:', response.data);
                throw new Error(`HTTP ${response.status}: ${response.data?.message || response.statusText}`);
            }

            // Save conversation ID
            if (response.data?.message?.conversation_id) {
                this.conversationId = response.data.message.conversation_id;
            }

            // Extract AI response and tool_calls
            const messageData = response.data?.message || {};
            const responseText = messageData.response ||
                                messageData.content ||
                                messageData.text;

            console.log('🔍 AI Response extracted:', responseText ? `${responseText.substring(0, 200)}...` : 'NONE');

            if (!responseText) {
                console.error('❌ No AI response found in:', response.data);
                throw new Error('No AI response in server reply');
            }

            // Create a response object that can hold both text and tool_calls
            const aiResponse = {
                toString: function() { return responseText; },
                valueOf: function() { return responseText; },
                text: responseText,
                // For backward compatibility with code expecting a string
                substring: function(...args) { return responseText.substring(...args); },
                includes: function(...args) { return responseText.includes(...args); },
                indexOf: function(...args) { return responseText.indexOf(...args); },
                replace: function(...args) { return responseText.replace(...args); },
                replaceAll: function(...args) { return responseText.replaceAll(...args); },
                split: function(...args) { return responseText.split(...args); },
                trim: function(...args) { return responseText.trim(...args); },
                toLowerCase: function(...args) { return responseText.toLowerCase(...args); },
                toUpperCase: function(...args) { return responseText.toUpperCase(...args); },
                match: function(...args) { return responseText.match(...args); },
                search: function(...args) { return responseText.search(...args); },
                slice: function(...args) { return responseText.slice(...args); },
                startsWith: function(...args) { return responseText.startsWith(...args); },
                endsWith: function(...args) { return responseText.endsWith(...args); },
                charAt: function(...args) { return responseText.charAt(...args); },
                charCodeAt: function(...args) { return responseText.charCodeAt(...args); },
                length: responseText.length
            };

            // Check for tool_calls in backend response (if backend returns them separately)
            if (messageData.tool_calls && Array.isArray(messageData.tool_calls)) {
                console.log(`🔧 Backend returned ${messageData.tool_calls.length} tool_call(s) in response`);
                // Store tool_calls on the response object
                aiResponse._backendToolCalls = messageData.tool_calls;
            }

            // Store TODOs and file_changes if provided by backend
            if (messageData.todos) {
                aiResponse._todos = messageData.todos;
                console.log(`📋 Backend returned ${messageData.todos.length} TODO(s)`);
            }
            if (messageData.todo_stats) {
                aiResponse._todo_stats = messageData.todo_stats;
                console.log(`📊 TODO stats: ${messageData.todo_stats.completed}/${messageData.todo_stats.total}`);
            }
            if (messageData.file_changes) {
                aiResponse._file_changes = messageData.file_changes;
                const totalFiles = (messageData.file_changes.created?.length || 0) +
                                  (messageData.file_changes.modified?.length || 0) +
                                  (messageData.file_changes.deleted?.length || 0);
                console.log(`📂 File changes: ${totalFiles} files affected`);
            }

            // Add AI response to messages (convert to string)
            this.addMessage('assistant', responseText);

            // Reset retry count on success
            this.retryCount = 0;

            return aiResponse;

        } catch (error) {
            // Check if error is due to user abort - this is NOT an error, it's expected behavior
            if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED' || error.message?.includes('cancel')) {
                console.log('⏹ Request canceled by user');
                return null; // Return null to indicate cancellation, not error
            }

            console.error(`❌ AI request error (attempt ${retryCount + 1}):`, error.message);
            console.error('🔍 Error details:', {
                code: error.code,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                headers: error.response?.headers
            });

            // Check if we should retry
            if (retryCount < this.maxRetries && this._shouldRetry(error)) {
                // Calculate exponential backoff delay
                // 1s, 2s, 4s, 8s... up to 60s max
                const delay = Math.min(Math.pow(2, retryCount) * 1000, 60000);

                console.log(`⏳ Retrying in ${delay / 1000}s...`);

                // Emit retry event
                this.emit('taskRetrying', this.taskId, retryCount + 1, delay);

                // Wait with exponential backoff
                await new Promise(resolve => setTimeout(resolve, delay));

                // Retry
                return this._makeAIRequestWithRetry(retryCount + 1);
            }

            // Max retries exceeded or non-retryable error
            throw error;
        }
    }

    /**
     * Check if error is retryable
     */
    _shouldRetry(error) {
        // Retry on timeout
        if (error.code === 'ECONNABORTED') return true;

        // Retry on network errors
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') return true;

        // Retry on rate limits
        if (error.response?.status === 429) return true;

        // Retry on 417 Expectation Failed (axios Expect header issue)
        if (error.response?.status === 417) return true;

        // Retry on server errors (500-599)
        if (error.response?.status >= 500) return true;

        // Don't retry on client errors (400-499) except 429 and 417
        if (error.response?.status >= 400 && error.response?.status < 500) return false;

        return false;
    }

    /**
     * Parse tool calls from AI response
     * Supports markdown format (current Oropendola backend)
     * Modes:
     * - ASK: Tool calls are ignored (read-only)
     * - AGENT: All tool calls allowed + autonomous context discovery
     */
    _parseToolCalls(aiResponse) {
        // In ASK mode, ignore all tool calls - just return empty array
        if (this.mode === 'ask') {
            console.log('ℹ️ ASK mode: Ignoring tool calls (read-only mode)');
            return [];
        }

        // AGENT mode: Parse tool calls
        const toolCalls = [];

        try {
            // Check if backend already parsed and returned tool_calls
            if (aiResponse._backendToolCalls && Array.isArray(aiResponse._backendToolCalls)) {
                console.log(`🔧 Using ${aiResponse._backendToolCalls.length} tool_call(s) from backend response`);
                return aiResponse._backendToolCalls.map((tc, idx) => ({
                    id: `call_${this.taskId}_${Date.now()}_${idx}`,
                    ...tc
                }));
            }

            // Fallback: Parse from markdown format (in case backend returns text with tool_call blocks)
            const toolCallRegex = /```tool_call\s*\n([\s\S]*?)\n```/g;
            let match;
            let callIndex = 0;

            while ((match = toolCallRegex.exec(aiResponse)) !== null) {
                callIndex++;
                console.log(`🔍 Found tool call #${callIndex}`);

                const jsonStr = match[1].trim();

                try {
                    // Try direct JSON parse first
                    const toolCall = JSON.parse(jsonStr);

                    toolCalls.push({
                        id: `call_${this.taskId}_${Date.now()}_${callIndex}`,
                        ...toolCall
                    });
                    console.log(`✅ Parsed tool call #${callIndex}:`, toolCall.action);

                } catch (parseError) {
                    console.log(`⚠️ Direct parse failed for call #${callIndex}, using manual extraction`);

                    // Fallback: Manual field extraction (handles newlines)
                    const toolCall = this._extractToolCallManually(jsonStr);
                    if (toolCall) {
                        toolCalls.push({
                            id: `call_${this.taskId}_${Date.now()}_${callIndex}`,
                            ...toolCall
                        });
                        console.log(`✅ Manually extracted tool call #${callIndex}:`, toolCall.action);
                    }
                }
            }

            console.log(`📊 Total tool calls found: ${toolCalls.length}`);

        } catch (error) {
            console.error('❌ Error parsing tool calls:', error);
        }

        return toolCalls;
    }

    /**
     * Clean tool call blocks from response text
     * This prevents raw tool calls from being displayed to users
     */
    _cleanToolCallsFromResponse(responseText) {
        if (!responseText) return '';

        // Remove ```tool_call ... ``` blocks
        let cleaned = responseText.replace(/```tool_call[\s\S]*?```/g, '');

        // Remove extra whitespace and empty lines
        cleaned = cleaned
            .split('\n')
            .filter(line => line.trim().length > 0)
            .join('\n')
            .trim();

        return cleaned || 'Task completed.';
    }

    /**
     * Manually extract tool call fields (handles malformed JSON)
     * KiloCode pattern: Fallback extraction for robustness
     */
    _extractToolCallManually(jsonStr) {
        try {
            const actionMatch = jsonStr.match(/"action"\s*:\s*"([^"]+)"/);
            const pathMatch = jsonStr.match(/"path"\s*:\s*"([^"]+)"/);
            const descMatch = jsonStr.match(/"description"\s*:\s*"([^"]+)"/);

            // Extract content field (may have newlines)
            const contentStart = jsonStr.indexOf('"content"');
            let content = '';

            if (contentStart !== -1) {
                const afterContent = jsonStr.substring(contentStart);
                const contentValueStart = afterContent.indexOf('"', afterContent.indexOf(':') + 1) + 1;
                let contentEnd = afterContent.indexOf('",', contentValueStart);

                if (contentEnd === -1) {
                    contentEnd = afterContent.lastIndexOf('"', afterContent.length - 2);
                }

                content = afterContent.substring(contentValueStart, contentEnd);
            }

            return {
                action: actionMatch ? actionMatch[1] : 'unknown',
                path: pathMatch ? pathMatch[1] : '',
                content: content,
                description: descMatch ? descMatch[1] : ''
            };

        } catch (error) {
            console.error('❌ Manual extraction failed:', error);
            return null;
        }
    }

    /**
     * Execute multiple tool calls
     * KiloCode pattern: Sequential execution with results tracking
     */
    async _executeToolCalls(toolCalls) {
        const results = [];

        this.status = 'running'; // Ensure we're in running state
        this.emit('toolsExecuting', this.taskId, toolCalls.length);

        for (let i = 0; i < toolCalls.length; i++) {
            if (this.abort) {
                console.log('⏹ Tool execution aborted');
                break;
            }

            const tool = toolCalls[i];
            console.log(`🔧 [${i + 1}/${toolCalls.length}] Executing: ${tool.action}`);

            try {
                const result = await this._executeSingleTool(tool);
                results.push(result);

                this.emit('toolCompleted', this.taskId, tool, result);

            } catch (toolError) {
                console.error('❌ Tool execution error:', toolError);

                results.push({
                    tool_use_id: tool.id,
                    tool_name: tool.action,
                    content: `Error: ${toolError.message}`,
                    success: false
                });

                this.emit('toolError', this.taskId, tool, toolError);
            }
        }

        return results;
    }

    /**
     * Execute a single tool call
     */
    async _executeSingleTool(toolCall) {
        const { action, path, content, description, command } = toolCall;

        switch (action) {
            case 'create_file':
                return await this._executeCreateFile(path, content, description);

            case 'modify_file':
            case 'edit_file':
                return await this._executeModifyFile(path, content, description);

            case 'read_file':
                return await this._executeReadFile(path);

            case 'run_terminal':
            case 'execute_command':
                return await this._executeTerminalCommand(command || content, description);

            default:
                throw new Error(`Unknown tool action: ${action}`);
        }
    }

    /**
     * Execute create_file tool
     */
    async _executeCreateFile(filePath, content, description) {
        const fs = require('fs').promises;
        const pathModule = require('path');

        try {
            // Track file change - GENERATING
            const change = this.fileChangeTracker.addChange(filePath, 'create', {
                description,
                newContent: typeof content === 'object' ? JSON.stringify(content, null, 2) : content
            });
            this.emit('fileChangeAdded', change);

            // Update status - APPLYING
            this.fileChangeTracker.updateStatus(filePath, 'applying');
            this.emit('fileChangeUpdated', change);

            // Get workspace path
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error('No workspace folder open');
            }

            const workspacePath = workspaceFolders[0].uri.fsPath;
            const fullPath = pathModule.join(workspacePath, filePath);

            // Create directory if needed
            const dirPath = pathModule.dirname(fullPath);
            await fs.mkdir(dirPath, { recursive: true });

            // Handle content - convert object to string if needed
            let fileContent = content || '';
            if (typeof fileContent === 'object') {
                // AI sometimes sends JSON objects instead of strings for package.json
                fileContent = JSON.stringify(fileContent, null, 2);
                console.log(`ℹ️ Converted object content to JSON string for ${filePath}`);
            }

            // Write file
            await fs.writeFile(fullPath, fileContent, 'utf8');

            // Update status - APPLIED
            this.fileChangeTracker.updateStatus(filePath, 'applied', {
                newContent: fileContent
            });
            this.emit('fileChangeUpdated', this.fileChangeTracker.getChange(filePath));

            // Open file in editor
            const document = await vscode.workspace.openTextDocument(fullPath);
            await vscode.window.showTextDocument(document);

            console.log(`✅ Created file: ${filePath}`);

            return {
                tool_use_id: this.taskId,
                tool_name: 'create_file',
                content: `Successfully created file: ${filePath}`,
                success: true
            };

        } catch (error) {
            // Track error
            this.fileChangeTracker.updateStatus(filePath, 'failed', {
                error: error.message
            });
            this.errors.push(error);
            this.emit('fileChangeUpdated', this.fileChangeTracker.getChange(filePath));

            throw new Error(`Failed to create file ${filePath}: ${error.message}`);
        }
    }

    /**
     * Execute modify_file tool
     */
    async _executeModifyFile(filePath, newContent, _description) {
        const fs = require('fs').promises;
        const pathModule = require('path');

        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error('No workspace folder open');
            }

            const workspacePath = workspaceFolders[0].uri.fsPath;
            const fullPath = pathModule.join(workspacePath, filePath);

            // Write updated content
            await fs.writeFile(fullPath, newContent, 'utf8');

            console.log(`✅ Modified file: ${filePath}`);

            return {
                tool_use_id: this.taskId,
                tool_name: 'modify_file',
                content: `Successfully modified file: ${filePath}`,
                success: true
            };

        } catch (error) {
            throw new Error(`Failed to modify file ${filePath}: ${error.message}`);
        }
    }

    /**
     * Execute read_file tool
     */
    async _executeReadFile(filePath) {
        const fs = require('fs').promises;
        const pathModule = require('path');

        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error('No workspace folder open');
            }

            const workspacePath = workspaceFolders[0].uri.fsPath;
            const fullPath = pathModule.join(workspacePath, filePath);

            const content = await fs.readFile(fullPath, 'utf8');

            return {
                tool_use_id: this.taskId,
                tool_name: 'read_file',
                content: content,
                success: true
            };

        } catch (error) {
            throw new Error(`Failed to read file ${filePath}: ${error.message}`);
        }
    }

    /**
     * Execute terminal command in VS Code's integrated terminal
     * Shows command execution in the terminal panel at bottom of VS Code
     */
    async _executeTerminalCommand(command, _description) {
        try {
            // Get workspace path
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error('No workspace folder open');
            }

            const workspacePath = workspaceFolders[0].uri.fsPath;

            console.log(`💻 Executing command in terminal: ${command}`);
            console.log(`📁 Working directory: ${workspacePath}`);

            // Get or create Oropendola terminal
            let terminal = this._getOropendolaTerminal();

            if (!terminal) {
                // Create new dedicated terminal for Oropendola AI
                terminal = vscode.window.createTerminal({
                    name: 'Oropendola AI',
                    cwd: workspacePath,
                    hideFromUser: false // Make visible in terminal panel
                });

                // Store reference for reuse
                this._terminal = terminal;

                console.log('✨ Created new Oropendola AI terminal');
            }

            // Show the terminal panel (but don't steal focus from editor)
            terminal.show(false);

            // Show notification
            vscode.window.showInformationMessage(`⚙️ Running: ${command}`);

            // Send command to terminal (will be visible to user)
            terminal.sendText(command);

            console.log(`✅ Command sent to terminal: ${command}`);

            // Note: We can't wait for command completion with terminal.sendText()
            // It executes asynchronously. User sees real-time output in terminal.

            return {
                tool_use_id: this.taskId,
                tool_name: 'run_terminal',
                content: `Command executed successfully: $ ${command}

Output will appear in the "Oropendola AI" terminal.`,
                success: true
            };

        } catch (error) {
            console.error(`❌ Terminal command failed: ${command}`);
            console.error(`Error: ${error.message}`);

            vscode.window.showErrorMessage(`❌ Command failed: ${command}`);

            throw new Error(`Failed to execute command "${command}": ${error.message}`);
        }
    }

    /**
     * Get existing Oropendola terminal or null
     * Checks if stored terminal still exists and is active
     */
    _getOropendolaTerminal() {
        // Check if we have a stored terminal reference
        if (this._terminal) {
            // Verify it still exists in VS Code's terminal list
            const exists = vscode.window.terminals.some(t => t === this._terminal);
            if (exists) {
                console.log('♻️ Reusing existing Oropendola AI terminal');
                return this._terminal;
            } else {
                // Terminal was closed by user
                this._terminal = null;
            }
        }

        // Look for any existing "Oropendola AI" terminal
        const existingTerminal = vscode.window.terminals.find(
            t => t.name === 'Oropendola AI'
        );

        if (existingTerminal) {
            this._terminal = existingTerminal;
            console.log('♻️ Found existing Oropendola AI terminal');
            return existingTerminal;
        }

        return null;
    }

    /**
     * Context window management
     * KiloCode pattern: Auto-reduction when approaching limits
     */
    _ensureContextWithinLimits() {
        const totalTokens = this._estimateTokenCount();
        const maxTokens = this.maxContextTokens * 0.9; // 90% threshold

        if (totalTokens > maxTokens) {
            console.warn(`⚠️ Context window nearly full (${totalTokens}/${this.maxContextTokens}), reducing...`);
            this._reduceContext();
        }
    }

    /**
     * Estimate token count (rough approximation)
     */
    _estimateTokenCount() {
        let totalChars = 0;

        for (const msg of this.messages) {
            totalChars += (msg.content || '').length;
        }

        // Rough estimate: 1 token ≈ 4 characters
        return Math.ceil(totalChars / 4);
    }

    /**
     * Reduce context by keeping only recent messages
     */
    _reduceContext() {
        const keepCount = 15; // Keep last 15 messages

        if (this.messages.length > keepCount) {
            const removed = this.messages.length - keepCount;
            this.messages = this.messages.slice(-keepCount);
            console.log(`📉 Reduced context: removed ${removed} old messages, kept ${keepCount} recent messages`);

            this.emit('contextReduced', this.taskId, removed, keepCount);
        }
    }

    /**
     * Handle context window error
     */
    async _handleContextWindowError() {
        console.warn('⚠️ Context window exceeded, reducing by 50%...');

        const keepCount = Math.floor(this.messages.length / 2);
        this.messages = this.messages.slice(-keepCount);

        console.log(`📉 Kept ${keepCount} most recent messages`);
    }

    /**
     * Handle rate limit error
     */
    async _handleRateLimitError() {
        const delay = 5000; // 5 seconds
        console.warn(`⚠️ Rate limit hit, waiting ${delay / 1000}s...`);

        this.emit('rateLimited', this.taskId, delay);

        await new Promise(resolve => setTimeout(resolve, delay));
    }

    /**
     * Check if error is context window related
     */
    _isContextWindowError(error) {
        const message = error.message?.toLowerCase() || '';
        return message.includes('context') ||
               message.includes('token') ||
               message.includes('length') ||
               error.response?.status === 413; // Payload too large
    }

    /**
     * Check if error is rate limit related
     */
    _isRateLimitError(error) {
        return error.response?.status === 429 ||
               error.message?.toLowerCase().includes('rate limit');
    }

    /**
     * Check if task should continue
     */
    async _checkTaskCompletion() {
        // If tools were just executed, allow one more AI response to summarize
        if (this.toolsExecutedInLastIteration) {
            console.log('ℹ️ Tools were executed, allowing one more response for summary');
            this.toolsExecutedInLastIteration = false;
            return false; // End task after this summary response
        }

        // Task is complete - conversation will continue with next user message
        return false;  // Task completes, waiting for next user input
    }

    /**
     * Handle consecutive mistake limit
     */
    async _handleMistakeLimit() {
        console.warn('⚠️ AI made too many mistakes, requesting user guidance');

        // Emit event for UI to show prompt
        this.emit('mistakeLimitReached', this.taskId, this.consecutiveMistakeCount);

        // For now, just continue
        // In future, wait for user response
        return true;
    }

    /**
     * Build API messages
     */
    _buildApiMessages() {
        return this.messages.map(msg => {
            const apiMsg = {
                role: msg.role === 'tool_result' ? 'user' : msg.role
            };

            // If message has images, format as multi-part content (for vision models)
            if (msg.images && msg.images.length > 0) {
                apiMsg.content = [
                    {
                        type: 'text',
                        text: msg.content
                    },
                    ...msg.images.map(img => ({
                        type: 'image_url',
                        image_url: {
                            url: img.content || img.url, // Support both base64 content and URLs
                            detail: 'high' // Request high-detail analysis
                        }
                    }))
                ];
            } else {
                // Simple text message
                apiMsg.content = msg.content;
            }

            return apiMsg;
        });
    }

    /**
     * Build context object
     */
    _buildContext() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const activeEditor = vscode.window.activeTextEditor;

        const context = {
            workspace: workspaceFolders ? workspaceFolders[0].name : null,
            activeFile: activeEditor ? {
                path: activeEditor.document.fileName,
                language: activeEditor.document.languageId
            } : null
        };

        // Include attachments from the most recent user message if any
        const lastUserMessage = [...this.messages].reverse().find(m => m.role === 'user');
        if (lastUserMessage && lastUserMessage.images && lastUserMessage.images.length > 0) {
            context.attachments = lastUserMessage.images.map(img => ({
                type: img.type || 'image/png',
                content: img.content || img.url,
                isImage: img.isImage !== undefined ? img.isImage : true,
                name: img.name || 'attachment'
            }));
        }

        return context;
    }

    /**
     * Add message to conversation
     */
    addMessage(role, content, images = [], toolName = null) {
        // Truncate very long messages to prevent backend errors
        const MAX_MESSAGE_LENGTH = 1500; // Conservative limit
        let truncatedContent = content;

        if (content && content.length > MAX_MESSAGE_LENGTH) {
            truncatedContent = content.substring(0, MAX_MESSAGE_LENGTH) +
                '\n\n... [Message truncated due to length]';
            console.log(`⚠️ Truncated ${role} message from ${content.length} to ${truncatedContent.length} chars`);
        }

        this.messages.push({
            role: role,
            content: truncatedContent,
            images: images,
            toolName: toolName,
            timestamp: new Date()
        });
    }

    /**
     * Abort the task
     */
    abortTask() {
        console.log(`⏹ Aborting task ${this.taskId}`);
        this.abort = true;
        this.status = 'completed';

        if (this.abortController) {
            this.abortController.abort();
        }

        this.emit('taskAborted', this.taskId);
    }

    /**
     * Get task summary
     */
    getSummary() {
        return {
            taskId: this.taskId,
            instanceId: this.instanceId,
            status: this.status,
            messageCount: this.messages.length,
            conversationId: this.conversationId,
            createdAt: this.createdAt,
            duration: Date.now() - this.createdAt.getTime()
        };
    }

    /**
     * Generate and emit task summary (Qoder-style)
     * @private
     */
    _emitTaskSummary() {
        const TaskSummaryGenerator = require('../utils/task-summary-generator');

        // Get provider reference to access TODOs
        const provider = this.providerRef?.deref?.();
        const todos = provider?._todoManager?.getAllTodos() || [];

        const summary = TaskSummaryGenerator.generate({
            taskId: this.taskId,
            startTime: this.taskStartTime,
            endTime: this.taskEndTime,
            fileChanges: this.fileChangeTracker.getAllChanges(),
            todos: todos,
            toolResults: this.toolResults,
            errors: this.errors,
            mode: this.mode
        });

        console.log('📊 Task Summary Generated:', summary.overview.summary);
        this.emit('taskSummaryGenerated', this.taskId, summary);
    }

    /**
     * Get file changes
     */
    getFileChanges() {
        return this.fileChangeTracker.getAllChanges();
    }

    /**
     * Get file change statistics
     */
    getFileChangeStats() {
        return this.fileChangeTracker.getStats();
    }
}

module.exports = ConversationTask;
