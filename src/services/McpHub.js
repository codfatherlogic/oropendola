/**
 * MCP Hub - Model Context Protocol Integration
 *
 * Manages connections to MCP servers and provides tools/resources
 * MCP servers can be local processes or remote endpoints
 */

const { EventEmitter } = require('events');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class McpHub extends EventEmitter {
    constructor() {
        super();
        this.servers = new Map(); // serverName -> serverConnection
        this.tools = new Map(); // toolName -> { server, toolSchema }
        this.resources = new Map(); // resourceUri -> { server, resourceSchema }
        this.prompts = new Map(); // promptName -> { server, promptSchema }
        this.isInitialized = false;
        this.reconnectAttempts = new Map(); // serverName -> attemptCount
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000; // Start with 1 second
    }

    /**
     * Initialize MCP Hub - load server configurations
     */
    async initialize(workspacePath) {
        if (this.isInitialized) {
            return;
        }

        this.workspacePath = workspacePath;

        // Load MCP server configs from workspace
        try {
            const configPath = path.join(workspacePath, '.mcp-servers.json');
            const configExists = await fs.access(configPath).then(() => true).catch(() => false);

            if (configExists) {
                const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
                await this.loadServerConfigs(config);
            }
        } catch (error) {
            console.warn('Failed to load MCP server config:', error.message);
        }

        this.isInitialized = true;
        this.emit('initialized');
    }

    /**
     * Load server configurations
     */
    async loadServerConfigs(config) {
        const { servers = {} } = config;

        for (const [serverName, serverConfig] of Object.entries(servers)) {
            try {
                await this.connectServer(serverName, serverConfig);
            } catch (error) {
                console.error(`Failed to connect to MCP server ${serverName}:`, error);
            }
        }
    }

    /**
     * Connect to an MCP server
     */
    async connectServer(serverName, config) {
        const { command, args = [], env = {}, enabled = true } = config;

        if (!enabled) {
            console.log(`MCP server ${serverName} is disabled`);
            return;
        }

        console.log(`Connecting to MCP server: ${serverName}`);

        try {
            // Spawn MCP server process
            const serverProcess = spawn(command, args, {
                env: { ...process.env, ...env },
                stdio: ['pipe', 'pipe', 'pipe']
            });

            const connection = {
                name: serverName,
                process: serverProcess,
                config,
                tools: [],
                resources: [],
                prompts: [],
                status: 'connecting'
            };

            // Handle server communication
            let buffer = '';
            serverProcess.stdout.on('data', (data) => {
                buffer += data.toString();

                // Process JSON-RPC messages
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim()) {
                        this._handleServerMessage(serverName, line);
                    }
                }
            });

            serverProcess.stderr.on('data', (data) => {
                const errorMessage = data.toString();
                console.error(`MCP server ${serverName} stderr:`, errorMessage);
                this.emit('serverError', { serverName, error: errorMessage });
            });

            serverProcess.on('error', (error) => {
                console.error(`MCP server ${serverName} process error:`, error);
                connection.status = 'error';
                this.emit('serverError', { serverName, error: error.message });
            });

            serverProcess.on('exit', (code, signal) => {
                console.log(`MCP server ${serverName} exited with code ${code}, signal ${signal}`);

                // Clean up connection
                const wasConnected = connection.status === 'connected';
                connection.status = 'disconnected';

                // Remove tools, resources, and prompts for this server
                for (const tool of connection.tools) {
                    this.tools.delete(tool.name);
                }
                for (const resource of connection.resources) {
                    this.resources.delete(resource.uri);
                }
                for (const prompt of connection.prompts) {
                    this.prompts.delete(prompt.name);
                }

                this.servers.delete(serverName);
                this.emit('serverDisconnected', serverName);

                // Attempt reconnection if it was connected and didn't exit cleanly
                if (wasConnected && code !== 0) {
                    this._attemptReconnect(serverName, config);
                }
            });

            this.servers.set(serverName, connection);

            // Initialize connection - send initialize request
            await this._sendServerRequest(serverName, 'initialize', {
                protocolVersion: '2024-11-05',
                clientInfo: {
                    name: 'oropendola-ai',
                    version: '3.7.2'
                }
            });

            // List available tools
            await this._sendServerRequest(serverName, 'tools/list', {});

            // List available resources
            await this._sendServerRequest(serverName, 'resources/list', {});

            // List available prompts
            try {
                await this._sendServerRequest(serverName, 'prompts/list', {});
            } catch (error) {
                // Prompts are optional, server might not support them
                console.log(`Server ${serverName} does not support prompts`);
            }

            connection.status = 'connected';
            this.emit('serverConnected', serverName);

        } catch (error) {
            console.error(`Failed to connect to MCP server ${serverName}:`, error);
            throw error;
        }
    }

    /**
     * Disconnect from an MCP server
     */
    async disconnectServer(serverName) {
        const connection = this.servers.get(serverName);
        if (!connection) {
            return;
        }

        // Remove tools, resources, and prompts
        for (const tool of connection.tools) {
            this.tools.delete(tool.name);
        }
        for (const resource of connection.resources) {
            this.resources.delete(resource.uri);
        }
        for (const prompt of connection.prompts) {
            this.prompts.delete(prompt.name);
        }

        // Kill server process
        if (connection.process) {
            connection.process.kill();
        }

        this.servers.delete(serverName);
        this.emit('serverDisconnected', serverName);
    }

    /**
     * Handle server message
     */
    _handleServerMessage(serverName, message) {
        try {
            const data = JSON.parse(message);
            const connection = this.servers.get(serverName);

            if (!connection) {
                console.warn(`Received message from unknown server: ${serverName}`);
                return;
            }

            // Validate JSON-RPC format
            if (!data.jsonrpc || data.jsonrpc !== '2.0') {
                console.warn(`Invalid JSON-RPC message from ${serverName}:`, data);
                return;
            }

            // Handle different message types
            if (data.method === 'tools/list') {
                // Server sent tools list
                connection.tools = data.result?.tools || [];

                // Register tools
                for (const tool of connection.tools) {
                    this.tools.set(tool.name, {
                        server: serverName,
                        schema: tool
                    });
                }

                console.log(`Registered ${connection.tools.length} tools from ${serverName}`);
            } else if (data.method === 'resources/list') {
                // Server sent resources list
                connection.resources = data.result?.resources || [];

                // Register resources
                for (const resource of connection.resources) {
                    this.resources.set(resource.uri, {
                        server: serverName,
                        schema: resource
                    });
                }

                console.log(`Registered ${connection.resources.length} resources from ${serverName}`);
            } else if (data.method === 'prompts/list') {
                // Server sent prompts list
                connection.prompts = data.result?.prompts || [];

                // Register prompts
                for (const prompt of connection.prompts) {
                    this.prompts.set(prompt.name, {
                        server: serverName,
                        schema: prompt
                    });
                }

                console.log(`Registered ${connection.prompts.length} prompts from ${serverName}`);
            }

            this.emit('serverMessage', { serverName, data });
        } catch (error) {
            console.error(`Failed to parse MCP message from ${serverName}:`, error);
            console.error('Raw message:', message);

            // Emit error event for monitoring
            this.emit('serverError', {
                serverName,
                error: `Message parsing error: ${error.message}`,
                rawMessage: message.substring(0, 200) // Truncate for safety
            });
        }
    }

    /**
     * Send request to MCP server
     */
    async _sendServerRequest(serverName, method, params) {
        const connection = this.servers.get(serverName);
        if (!connection || !connection.process) {
            throw new Error(`MCP server ${serverName} not connected`);
        }

        const request = {
            jsonrpc: '2.0',
            id: Date.now(),
            method,
            params
        };

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`MCP request timeout: ${method}`));
            }, 30000);

            const messageHandler = ({ serverName: msgServerName, data }) => {
                if (msgServerName === serverName && data.id === request.id) {
                    clearTimeout(timeout);
                    this.off('serverMessage', messageHandler);

                    if (data.error) {
                        reject(new Error(data.error.message || 'MCP request failed'));
                    } else {
                        resolve(data.result);
                    }
                }
            };

            this.on('serverMessage', messageHandler);

            // Send request
            connection.process.stdin.write(JSON.stringify(request) + '\n');
        });
    }

    /**
     * Execute MCP tool
     */
    async executeTool(toolName, args = {}) {
        const toolInfo = this.tools.get(toolName);

        if (!toolInfo) {
            throw new Error(`MCP tool not found: ${toolName}`);
        }

        const { server } = toolInfo;

        try {
            const result = await this._sendServerRequest(server, 'tools/call', {
                name: toolName,
                arguments: args
            });

            return {
                success: true,
                content: result.content || result,
                isError: false
            };
        } catch (error) {
            return {
                success: false,
                content: error.message,
                isError: true
            };
        }
    }

    /**
     * Access MCP resource
     */
    async accessResource(resourceUri) {
        const resourceInfo = this.resources.get(resourceUri);

        if (!resourceInfo) {
            throw new Error(`MCP resource not found: ${resourceUri}`);
        }

        const { server } = resourceInfo;

        try {
            const result = await this._sendServerRequest(server, 'resources/read', {
                uri: resourceUri
            });

            return {
                success: true,
                content: result.contents || result,
                mimeType: result.mimeType
            };
        } catch (error) {
            return {
                success: false,
                content: error.message,
                isError: true
            };
        }
    }

    /**
     * List available tools
     */
    listTools() {
        const toolsList = [];

        for (const [name, info] of this.tools) {
            toolsList.push({
                name,
                server: info.server,
                description: info.schema.description,
                inputSchema: info.schema.inputSchema
            });
        }

        return toolsList;
    }

    /**
     * List available resources
     */
    listResources() {
        const resourcesList = [];

        for (const [uri, info] of this.resources) {
            resourcesList.push({
                uri,
                server: info.server,
                name: info.schema.name,
                description: info.schema.description,
                mimeType: info.schema.mimeType
            });
        }

        return resourcesList;
    }

    /**
     * List available prompts
     */
    listPrompts() {
        const promptsList = [];

        for (const [name, info] of this.prompts) {
            promptsList.push({
                name,
                server: info.server,
                description: info.schema.description,
                arguments: info.schema.arguments
            });
        }

        return promptsList;
    }

    /**
     * Get a prompt with arguments
     */
    async getPrompt(promptName, args = {}) {
        const promptInfo = this.prompts.get(promptName);

        if (!promptInfo) {
            throw new Error(`MCP prompt not found: ${promptName}`);
        }

        const { server } = promptInfo;

        try {
            const result = await this._sendServerRequest(server, 'prompts/get', {
                name: promptName,
                arguments: args
            });

            return {
                success: true,
                messages: result.messages || [],
                description: result.description
            };
        } catch (error) {
            return {
                success: false,
                content: error.message,
                isError: true
            };
        }
    }

    /**
     * Create a message using sampling (LLM completion)
     * This allows MCP servers to request AI completions
     */
    async createSamplingMessage(params) {
        const { messages, modelPreferences, systemPrompt, maxTokens } = params;

        // This method should be implemented by the client
        // For now, we'll emit an event that the ConversationTask can handle
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Sampling request timeout'));
            }, 60000);

            this.once('samplingResponse', (response) => {
                clearTimeout(timeout);
                resolve(response);
            });

            this.emit('samplingRequest', {
                messages,
                modelPreferences,
                systemPrompt,
                maxTokens: maxTokens || 1000
            });
        });
    }

    /**
     * Get server status
     */
    getServerStatus(serverName) {
        const connection = this.servers.get(serverName);

        if (!connection) {
            return { status: 'disconnected' };
        }

        return {
            status: connection.status,
            toolCount: connection.tools.length,
            resourceCount: connection.resources.length,
            promptCount: connection.prompts.length
        };
    }

    /**
     * Disconnect all servers
     */
    async disconnectAll() {
        for (const serverName of this.servers.keys()) {
            await this.disconnectServer(serverName);
        }
    }

    /**
     * Attempt to reconnect to a server with exponential backoff
     */
    async _attemptReconnect(serverName, config) {
        const attempts = this.reconnectAttempts.get(serverName) || 0;

        if (attempts >= this.maxReconnectAttempts) {
            console.error(`Max reconnection attempts reached for ${serverName}`);
            this.reconnectAttempts.delete(serverName);
            return;
        }

        this.reconnectAttempts.set(serverName, attempts + 1);

        // Exponential backoff: 1s, 2s, 4s, 8s, 16s
        const delay = this.reconnectDelay * Math.pow(2, attempts);

        console.log(`Attempting to reconnect to ${serverName} in ${delay}ms (attempt ${attempts + 1}/${this.maxReconnectAttempts})`);

        setTimeout(async () => {
            try {
                await this.connectServer(serverName, config);
                console.log(`Successfully reconnected to ${serverName}`);
                this.reconnectAttempts.delete(serverName);
            } catch (error) {
                console.error(`Failed to reconnect to ${serverName}:`, error);
                // Will try again if attempts < max
                this._attemptReconnect(serverName, config);
            }
        }, delay);
    }

    /**
     * Check connection health and reconnect if needed
     */
    async checkConnectionHealth() {
        for (const [serverName, connection] of this.servers) {
            if (connection.status === 'error' || connection.status === 'disconnected') {
                console.log(`Connection health check: ${serverName} is ${connection.status}, attempting reconnect`);
                this._attemptReconnect(serverName, connection.config);
            }
        }
    }

    /**
     * Reset reconnection attempts for a server
     */
    resetReconnectAttempts(serverName) {
        this.reconnectAttempts.delete(serverName);
    }
}

module.exports = McpHub;
