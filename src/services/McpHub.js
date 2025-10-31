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
        this.isInitialized = false;
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
                console.error(`MCP server ${serverName} stderr:`, data.toString());
            });

            serverProcess.on('exit', (code) => {
                console.log(`MCP server ${serverName} exited with code ${code}`);
                this.servers.delete(serverName);
                this.emit('serverDisconnected', serverName);
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

        // Remove tools and resources
        for (const tool of connection.tools) {
            this.tools.delete(tool.name);
        }
        for (const resource of connection.resources) {
            this.resources.delete(resource.uri);
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
            }

            this.emit('serverMessage', { serverName, data });
        } catch (error) {
            console.error(`Failed to parse MCP message from ${serverName}:`, error);
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
            resourceCount: connection.resources.length
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
}

module.exports = McpHub;
