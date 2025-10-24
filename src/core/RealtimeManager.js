const io = require('socket.io-client');
const EventEmitter = require('events');

/**
 * Manages WebSocket connection to Frappe backend for real-time updates
 * Connects VS Code Extension to oropendola.ai's Socket.IO server
 *
 * @fires RealtimeManager#connected - When successfully connected
 * @fires RealtimeManager#disconnected - When connection is lost
 * @fires RealtimeManager#error - When connection error occurs
 * @fires RealtimeManager#ai_progress - When AI progress event received
 */
class RealtimeManager extends EventEmitter {
    constructor(apiUrl, sessionCookies) {
        super();
        this.apiUrl = apiUrl;
        this.sessionCookies = sessionCookies;
        this.socket = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    /**
     * Connect to Frappe's Socket.IO server
     * Uses session cookies for authentication
     */
    connect() {
        console.log('🔥 [RealtimeManager] connect() called');
        console.log('🔥 [RealtimeManager] Current socket:', this.socket ? 'EXISTS' : 'NULL');
        console.log('🔥 [RealtimeManager] Current connected:', this.connected);

        if (this.socket && this.connected) {
            console.log('🔌 [RealtimeManager] Already connected to server');
            return;
        }

        console.log('🔌 [RealtimeManager] Connecting to:', this.apiUrl);
        console.log('🔌 [RealtimeManager] Session cookies length:', this.sessionCookies ? this.sessionCookies.length : 0);

        // Parse cookies for authentication
        const cookies = this._parseCookies(this.sessionCookies);
        console.log('🔥 [RealtimeManager] Parsed cookies:', Object.keys(cookies).join(', '));
        const sid = cookies.sid;

        if (!sid) {
            const error = new Error('No session ID found in cookies - authentication required');
            console.error('❌ [RealtimeManager]', error.message);
            console.error('❌ [RealtimeManager] Available cookie keys:', Object.keys(cookies).join(', '));
            this.emit('error', error);
            return;
        }

        console.log('🔐 [RealtimeManager] Authenticating with session ID:', sid.substring(0, 10) + '...');
        console.log('🔥 [RealtimeManager] Socket.IO config:', {
            path: '/socket.io',
            transports: ['websocket', 'polling'],
            reconnection: true,
            timeout: 20000
        });

        // Connect to Frappe's Socket.IO server
        // Path: /socket.io/ (Frappe's default)
        // Transport: WebSocket preferred, polling fallback
        console.log('🔥 [RealtimeManager] Creating Socket.IO client...');
        try {
            this.socket = io(this.apiUrl, {
                path: '/socket.io',
                transports: ['websocket', 'polling'],
                auth: {
                    sid: sid
                },
                extraHeaders: {
                    'Cookie': this.sessionCookies
                },
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                reconnectionAttempts: this.maxReconnectAttempts,
                timeout: 20000,
                autoConnect: true
            });
            console.log('🔥 [RealtimeManager] Socket.IO client created successfully');
            console.log('🔥 [RealtimeManager] Socket instance:', this.socket ? 'EXISTS' : 'NULL');
        } catch (error) {
            console.error('❌ [RealtimeManager] Failed to create Socket.IO client:', error);
            console.error('❌ [RealtimeManager] Error stack:', error.stack);
            this.emit('error', error);
            return;
        }

        // Set up event handlers
        console.log('🔥 [RealtimeManager] Setting up event handlers...');
        this._setupEventHandlers();
        console.log('🔥 [RealtimeManager] Event handlers setup complete');
    }

    /**
     * Set up Socket.IO event handlers
     */
    _setupEventHandlers() {
        console.log('🔥 [RealtimeManager] _setupEventHandlers() called');

        // Connection established
        this.socket.on('connect', () => {
            console.log('🔥🔥🔥 [RealtimeManager] ========== CONNECT EVENT FIRED ==========');
            console.log('✅ [RealtimeManager] Connected to realtime server');
            console.log('🆔 [RealtimeManager] Socket ID:', this.socket.id);
            console.log('🔥 [RealtimeManager] Socket connected:', this.socket.connected);
            console.log('🔥 [RealtimeManager] Socket active:', this.socket.active);
            this.connected = true;
            this.reconnectAttempts = 0;
            console.log('🔥 [RealtimeManager] Emitting "connected" event to listeners');
            this.emit('connected');
            console.log('🔥🔥🔥 [RealtimeManager] ========== CONNECT EVENT COMPLETE ==========');
        });

        // Connection lost
        this.socket.on('disconnect', (reason) => {
            console.log('❌ [RealtimeManager] Disconnected:', reason);
            this.connected = false;
            this.emit('disconnected', reason);

            // Auto-reconnect if server disconnected
            if (reason === 'io server disconnect') {
                console.log('🔄 [RealtimeManager] Server disconnected, reconnecting...');
                this.socket.connect();
            }
        });

        // Connection error
        this.socket.on('connect_error', (error) => {
            this.reconnectAttempts++;
            console.error('🔥🔥🔥 [RealtimeManager] ========== CONNECT_ERROR EVENT FIRED ==========');
            console.error(`❌ [RealtimeManager] Connection error (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}):`, error.message);
            console.error('❌ [RealtimeManager] Error type:', error.type);
            console.error('❌ [RealtimeManager] Error description:', error.description);
            console.error('❌ [RealtimeManager] Full error:', error);

            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.error('❌ [RealtimeManager] Max reconnection attempts reached');
                this.emit('error', new Error('Failed to connect after ' + this.maxReconnectAttempts + ' attempts'));
            }
            console.error('🔥🔥🔥 [RealtimeManager] ========== CONNECT_ERROR EVENT COMPLETE ==========');
        });

        // Reconnection attempt
        this.socket.on('reconnect_attempt', (attemptNumber) => {
            console.log(`🔄 [RealtimeManager] Reconnection attempt ${attemptNumber}...`);
        });

        // Successfully reconnected
        this.socket.on('reconnect', (attemptNumber) => {
            console.log(`✅ [RealtimeManager] Reconnected after ${attemptNumber} attempts`);
            this.reconnectAttempts = 0;
        });

        // === Subscribe to Frappe events ===

        // AI Progress events (our main use case)
        this.socket.on('ai_progress', (data) => {
            console.log('🔥🔥🔥 [RealtimeManager] ========== AI_PROGRESS EVENT RECEIVED ==========');
            console.log('📊 [RealtimeManager] Event type:', data.type);
            console.log('📊 [RealtimeManager] Full data:', JSON.stringify(data, null, 2));
            console.log('🔥 [RealtimeManager] Emitting ai_progress to listeners');
            this.emit('ai_progress', data);
            console.log('🔥🔥🔥 [RealtimeManager] ========== AI_PROGRESS EVENT COMPLETE ==========');
        });

        // Frappe msgprint (notifications)
        this.socket.on('msgprint', (data) => {
            console.log('📢 [RealtimeManager] Received msgprint:', data);
            this.emit('msgprint', data);
        });

        // Frappe eval_js (execute JavaScript - use carefully)
        this.socket.on('eval_js', (data) => {
            console.log('⚙️ [RealtimeManager] Received eval_js:', data);
            this.emit('eval_js', data);
        });

        // Frappe new comment event
        this.socket.on('new_comment', (data) => {
            console.log('💬 [RealtimeManager] Received new_comment:', data);
            this.emit('new_comment', data);
        });

        // Intent Classification events (v3.2.2 - UI Enhancement)
        this.socket.on('intent_classified', (data) => {
            console.log('🎯 [RealtimeManager] Received intent_classified:', data);
            this.emit('intent_classified', data);
        });

        // Privacy Filter events (v3.2.2 - UI Enhancement)
        this.socket.on('privacy_filter', (data) => {
            console.log('🔒 [RealtimeManager] Received privacy_filter:', data);
            this.emit('privacy_filter', data);
        });

        // Custom events (extend as needed)
        this.socket.onAny((eventName, ...args) => {
            console.log('🔔 [RealtimeManager] Received event:', eventName, args);
            this.emit('custom_event', { eventName, args });
        });
    }

    /**
     * Disconnect from server
     */
    disconnect() {
        if (this.socket) {
            console.log('🔌 [RealtimeManager] Disconnecting from server');
            this.socket.disconnect();
            this.socket.removeAllListeners();
            this.socket = null;
            this.connected = false;
        }
    }

    /**
     * Parse cookies string into key-value object
     * @param {string} cookieString - Raw cookie string from HTTP headers
     * @returns {object} Parsed cookies
     */
    _parseCookies(cookieString) {
        const cookies = {};
        if (!cookieString) return cookies;

        cookieString.split(';').forEach(cookie => {
            const parts = cookie.trim().split('=');
            if (parts.length === 2) {
                cookies[parts[0]] = parts[1];
            }
        });

        return cookies;
    }

    /**
     * Check if currently connected
     * @returns {boolean}
     */
    isConnected() {
        return this.connected && this.socket && this.socket.connected;
    }

    /**
     * Get connection status details
     * @returns {object}
     */
    getStatus() {
        return {
            connected: this.isConnected(),
            socketId: this.socket ? this.socket.id : null,
            reconnectAttempts: this.reconnectAttempts,
            apiUrl: this.apiUrl
        };
    }
}

module.exports = RealtimeManager;
