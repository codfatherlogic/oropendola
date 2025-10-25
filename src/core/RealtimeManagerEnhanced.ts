import { io, Socket } from 'socket.io-client';
import { EventEmitter } from 'events';
import * as vscode from 'vscode';
import type { ConnectionState, ConnectionStateData, RealtimeManagerConfig } from '../types';

/**
 * Connection status details
 */
interface ConnectionStatus {
  state: ConnectionState;
  connected: boolean;
  socketId: string | null;
  reconnectAttempts: number;
  maxAttempts: number;
  totalReconnectAttempts: number;
  lastError: string | null;
  lastConnectionTime: Date | null;
  apiUrl: string;
}

/**
 * Connection info for UI
 */
interface ConnectionInfo {
  state: ConnectionState;
  message: string;
  canRetry: boolean;
  details: ConnectionStatus;
}

/**
 * Enhanced RealtimeManager with exponential backoff and better error recovery
 * Manages WebSocket connection to oropendola.ai backend
 *
 * @fires connected - When successfully connected
 * @fires disconnected - When connection is lost
 * @fires error - When connection error occurs
 * @fires connection_state_changed - When connection state changes
 * @fires ai_progress - When AI progress event received
 */
export class RealtimeManager extends EventEmitter {
  private apiUrl: string;
  private sessionCookies: string;
  private socket: Socket | null;
  private connected: boolean;
  private reconnectAttempts: number;
  private maxReconnectAttempts: number;
  private baseReconnectInterval: number;
  private maxReconnectInterval: number;
  private connectionState: ConnectionState;
  private lastError: Error | null;
  private reconnectTimer: NodeJS.Timeout | null;
  private lastConnectionTime: Date | null;
  private totalReconnectAttempts: number;

  constructor(apiUrl: string, sessionCookies: string, config?: Partial<RealtimeManagerConfig>) {
    super();
    this.apiUrl = apiUrl;
    this.sessionCookies = sessionCookies;
    this.socket = null;
    this.connected = false;
    this.reconnectAttempts = 0;

    // Load configuration from VS Code settings or use defaults
    const vscodeConfig = vscode.workspace.getConfiguration('oropendola');
    this.maxReconnectAttempts = config?.maxReconnectAttempts ||
      vscodeConfig.get<number>('maxReconnectAttempts', 10);
    this.baseReconnectInterval = config?.baseReconnectInterval ||
      vscodeConfig.get<number>('reconnectInterval', 1000);
    this.maxReconnectInterval = config?.maxReconnectInterval || 30000; // Max 30 seconds

    // Connection state tracking
    this.connectionState = 'disconnected';
    this.lastError = null;
    this.reconnectTimer = null;
    this.lastConnectionTime = null;
    this.totalReconnectAttempts = 0;

    console.log(`[RealtimeManager] Initialized with max ${this.maxReconnectAttempts} reconnect attempts`);
  }

  /**
   * Calculate exponential backoff delay
   * 1s, 2s, 4s, 8s, 16s, max 30s
   * @returns Delay in milliseconds
   */
  private _getReconnectDelay(): number {
    const exponentialDelay = this.baseReconnectInterval * Math.pow(2, this.reconnectAttempts);
    return Math.min(exponentialDelay, this.maxReconnectInterval);
  }

  /**
   * Update connection state and emit event
   * @param newState - New connection state
   * @param details - Additional details
   */
  private _setConnectionState(newState: ConnectionState, details: Record<string, any> = {}): void {
    const previousState = this.connectionState;
    this.connectionState = newState;

    console.log(`[RealtimeManager] State: ${previousState} → ${newState}`);

    this.emit('connection_state_changed', {
      state: newState,
      previousState,
      ...details,
      reconnectAttempts: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts
    } as ConnectionStateData);
  }

  /**
   * Connect to oropendola.ai Socket.IO server
   * Uses session cookies for authentication
   */
  connect(): void {
    console.log('[RealtimeManager] connect() called');
    console.log('[RealtimeManager] Current state:', this.connectionState);

    // Already connected
    if (this.socket && this.connected) {
      console.log('[RealtimeManager] Already connected');
      return;
    }

    // Currently connecting
    if (this.connectionState === 'connecting') {
      console.log('[RealtimeManager] Connection already in progress');
      return;
    }

    this._setConnectionState('connecting');

    // Parse cookies for authentication
    const cookies = this._parseCookies(this.sessionCookies);
    const sid = cookies.sid;

    if (!sid) {
      const error = new Error('No session ID found - please sign in first');
      console.error('[RealtimeManager]', error.message);
      this.lastError = error;
      this._setConnectionState('error', { error: error.message });
      this.emit('error', error);
      return;
    }

    console.log('[RealtimeManager] Connecting to:', this.apiUrl);
    console.log('[RealtimeManager] Session ID:', sid.substring(0, 10) + '...');

    try {
      // Disable socket.io built-in reconnection (we handle it manually for better control)
      this.socket = io(this.apiUrl, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        auth: {
          sid: sid
        },
        extraHeaders: {
          'Cookie': this.sessionCookies
        },
        reconnection: false, // We handle reconnection manually
        timeout: 20000,
        autoConnect: true
      });

      console.log('[RealtimeManager] Socket created successfully');
      this._setupEventHandlers();
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      console.error('[RealtimeManager] Failed to create socket:', err);
      this.lastError = err;
      this._setConnectionState('error', { error: err.message });
      this.emit('error', err);
    }
  }

  /**
   * Manual reconnection with exponential backoff
   */
  private _scheduleReconnect(): void {
    // Clear any existing timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Check if we've exceeded max attempts
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      const error = new Error(`Failed to connect after ${this.maxReconnectAttempts} attempts`);
      console.error('[RealtimeManager]', error.message);
      this.lastError = error;
      this._setConnectionState('error', { error: error.message, giveUp: true });
      this.emit('error', error);
      return;
    }

    const delay = this._getReconnectDelay();
    this.reconnectAttempts++;
    this.totalReconnectAttempts++;

    console.log(`[RealtimeManager] Scheduling reconnect #${this.reconnectAttempts} in ${delay}ms`);
    console.log(`[RealtimeManager] Using exponential backoff: ${delay/1000}s`);

    this._setConnectionState('reconnecting', {
      attempt: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      delay
    });

    this.reconnectTimer = setTimeout(() => {
      console.log(`[RealtimeManager] Attempting reconnect #${this.reconnectAttempts}...`);
      this.connect();
    }, delay);
  }

  /**
   * Manual retry (user-triggered)
   */
  retry(): void {
    console.log('[RealtimeManager] Manual retry triggered');

    // Reset attempts for manual retry
    this.reconnectAttempts = 0;
    this.lastError = null;

    // Clear any scheduled reconnection
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Disconnect current socket if any
    if (this.socket) {
      this.socket.disconnect();
      this.socket.removeAllListeners();
      this.socket = null;
    }

    // Attempt connection
    this.connect();
  }

  /**
   * Set up Socket.IO event handlers
   */
  private _setupEventHandlers(): void {
    if (!this.socket) return;

    console.log('[RealtimeManager] Setting up event handlers');

    // Connection established
    this.socket.on('connect', () => {
      console.log('✅ [RealtimeManager] Connected to oropendola.ai');
      console.log('   Socket ID:', this.socket?.id);

      this.connected = true;
      this.reconnectAttempts = 0;
      this.lastError = null;
      this.lastConnectionTime = new Date();

      this._setConnectionState('connected', {
        socketId: this.socket?.id,
        connectedAt: this.lastConnectionTime,
        timestamp: Date.now()
      });

      this.emit('connected', {
        socketId: this.socket?.id,
        apiUrl: this.apiUrl
      });
    });

    // Connection lost
    this.socket.on('disconnect', (reason: string) => {
      console.log('❌ [RealtimeManager] Disconnected:', reason);

      this.connected = false;

      this._setConnectionState('disconnected', { reason });
      this.emit('disconnected', reason);

      // Schedule reconnection for specific disconnect reasons
      if (reason === 'io server disconnect' || reason === 'transport close') {
        console.log('[RealtimeManager] Server initiated disconnect, will reconnect');
        this._scheduleReconnect();
      } else if (reason === 'io client disconnect') {
        console.log('[RealtimeManager] Client initiated disconnect, not reconnecting');
      } else {
        // Unknown reason, attempt reconnect
        console.log('[RealtimeManager] Unknown disconnect reason, will reconnect');
        this._scheduleReconnect();
      }
    });

    // Connection error
    this.socket.on('connect_error', (error: Error) => {
      console.error('❌ [RealtimeManager] Connection error:', error.message);

      this.lastError = error;

      this._setConnectionState('error', {
        error: error.message,
        attempt: this.reconnectAttempts + 1
      });

      // Schedule reconnection
      this._scheduleReconnect();
    });

    // === Frappe Events ===

    // AI Progress events (primary use case)
    this.socket.on('ai_progress', (data: any) => {
      console.log('📊 [RealtimeManager] AI Progress:', data.type);
      this.emit('ai_progress', data);
    });

    // Frappe msgprint (notifications)
    this.socket.on('msgprint', (data: any) => {
      console.log('📢 [RealtimeManager] Message:', data);
      this.emit('msgprint', data);
    });

    // Frappe eval_js
    this.socket.on('eval_js', (data: any) => {
      console.log('⚙️  [RealtimeManager] Eval JS:', data);
      this.emit('eval_js', data);
    });

    // New comment
    this.socket.on('new_comment', (data: any) => {
      console.log('💬 [RealtimeManager] New comment:', data);
      this.emit('new_comment', data);
    });

    // Intent classification (v3.2.2)
    this.socket.on('intent_classified', (data: any) => {
      console.log('🎯 [RealtimeManager] Intent classified:', data);
      this.emit('intent_classified', data);
    });

    // Privacy filter (v3.2.2)
    this.socket.on('privacy_filter', (data: any) => {
      console.log('🔒 [RealtimeManager] Privacy filter:', data);
      this.emit('privacy_filter', data);
    });

    // Catch-all for custom events
    this.socket.onAny((eventName: string, ...args: any[]) => {
      if (!eventName.startsWith('connect') && !eventName.startsWith('disconnect')) {
        console.log('🔔 [RealtimeManager] Custom event:', eventName);
        this.emit('custom_event', { eventName, args });
      }
    });
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    console.log('[RealtimeManager] Disconnecting');

    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Disconnect socket
    if (this.socket) {
      this.socket.disconnect();
      this.socket.removeAllListeners();
      this.socket = null;
    }

    this.connected = false;
    this.reconnectAttempts = 0;

    this._setConnectionState('disconnected', { manual: true });
  }

  /**
   * Parse cookies string into object
   * @param cookieString - Cookie string from HTTP header
   * @returns Parsed cookies as object
   */
  private _parseCookies(cookieString: string): Record<string, string> {
    const cookies: Record<string, string> = {};
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
   * @returns True if connected
   */
  isConnected(): boolean {
    return this.connected && !!this.socket && this.socket.connected;
  }

  /**
   * Get detailed connection status
   * @returns Connection status
   */
  getStatus(): ConnectionStatus {
    return {
      state: this.connectionState,
      connected: this.isConnected(),
      socketId: this.socket?.id || null,
      reconnectAttempts: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      totalReconnectAttempts: this.totalReconnectAttempts,
      lastError: this.lastError ? this.lastError.message : null,
      lastConnectionTime: this.lastConnectionTime,
      apiUrl: this.apiUrl
    };
  }

  /**
   * Get connection state for UI display
   * @returns Connection info for UI
   */
  getConnectionInfo(): ConnectionInfo {
    const status = this.getStatus();

    // User-friendly messages
    const messages: Record<ConnectionState, string> = {
      connected: '✅ Connected to oropendola.ai',
      connecting: '🔄 Connecting...',
      disconnected: '⚠️  Disconnected',
      reconnecting: `🔄 Reconnecting (${status.reconnectAttempts}/${status.maxAttempts})...`,
      error: `❌ Connection failed: ${status.lastError || 'Unknown error'}`
    };

    return {
      state: status.state,
      message: messages[status.state] || 'Unknown state',
      canRetry: status.state === 'error' || status.state === 'disconnected',
      details: status
    };
  }
}
