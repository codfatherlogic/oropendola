import * as vscode from 'vscode';
import type { BackendEndpoints, Environment } from '../types';

/**
 * Validation result for URL
 */
interface UrlValidation {
  valid: boolean;
  error: string | null;
}

/**
 * Connection information
 */
interface ConnectionInfo {
  url: string;
  environment: Environment;
  isDefault: boolean;
  isLocal: boolean;
  endpoints: number;
}

/**
 * BackendConfig - Centralized backend URL management for oropendola.ai
 * Provides single source of truth for all backend endpoints
 */
export class BackendConfig {
  private config: vscode.WorkspaceConfiguration | null;
  private baseUrl: string;

  constructor() {
    this.config = null;
    this.baseUrl = 'https://oropendola.ai';
    this.updateConfig();

    // Listen for configuration changes
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('oropendola')) {
        console.log('[BackendConfig] Configuration changed, reloading...');
        this.updateConfig();
      }
    });
  }

  /**
   * Update configuration from VS Code settings
   */
  private updateConfig(): void {
    this.config = vscode.workspace.getConfiguration('oropendola');

    // Load backend URL (default: https://oropendola.ai)
    this.baseUrl = this.config.get<string>('serverUrl', 'https://oropendola.ai');

    // Remove trailing slash if present
    this.baseUrl = this.baseUrl.replace(/\/$/, '');

    console.log('[BackendConfig] Backend URL:', this.baseUrl);
  }

  /**
   * Get base backend URL
   * @returns Base URL (e.g., https://oropendola.ai)
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Get full API endpoint URL
   * @param path - API path (e.g., '/api/method/oropendola.chat')
   * @returns Full URL
   */
  getApiUrl(path: string = ''): string {
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${normalizedPath}`;
  }

  /**
   * Get WebSocket URL for realtime connection
   * @returns WebSocket URL
   */
  getWebSocketUrl(): string {
    // Convert https:// to wss:// or http:// to ws://
    return this.baseUrl.replace(/^http/, 'ws');
  }

  /**
   * Get Socket.IO URL (for Frappe realtime)
   * @returns Socket.IO URL
   */
  getSocketIOUrl(): string {
    // Socket.IO uses same base URL, path is configured in socket options
    return this.baseUrl;
  }

  /**
   * Common API endpoints
   */
  get endpoints(): BackendEndpoints {
    return {
      // Authentication
      login: this.getApiUrl('/api/method/oropendola.auth.login'),
      logout: this.getApiUrl('/api/method/oropendola.auth.logout'),
      verifySession: this.getApiUrl('/api/method/oropendola.auth.verify_session'),

      // Chat & AI
      chat: this.getApiUrl('/api/method/oropendola.chat.send_message'),
      chatStream: this.getApiUrl('/api/method/oropendola.chat.stream'),
      chatHistory: this.getApiUrl('/api/method/oropendola.chat.get_history'),

      // User
      userInfo: this.getApiUrl('/api/method/oropendola.user.get_info'),
      userSettings: this.getApiUrl('/api/method/oropendola.user.get_settings'),
      updateSettings: this.getApiUrl('/api/method/oropendola.user.update_settings'),

      // Subscription
      checkSubscription: this.getApiUrl('/api/method/oropendola.subscription.check'),
      subscriptionInfo: this.getApiUrl('/api/method/oropendola.subscription.get_info'),

      // Workspace
      indexWorkspace: this.getApiUrl('/api/method/oropendola.workspace.index'),
      searchCode: this.getApiUrl('/api/method/oropendola.workspace.search'),
      workspaceMemory: this.getApiUrl('/api/method/oropendola.workspace.get_memory'),

      // Files & Context
      uploadFile: this.getApiUrl('/api/method/oropendola.files.upload'),
      analyzeFile: this.getApiUrl('/api/method/oropendola.files.analyze'),

      // Documents (Week 2.2)
      documents: {
        upload: this.getApiUrl('/api/method/oropendola.documents.upload'),
        status: this.getApiUrl('/api/method/oropendola.documents.get_status'),
        get: this.getApiUrl('/api/method/oropendola.documents.get'),
        analyze: this.getApiUrl('/api/method/oropendola.documents.analyze')
      },

      // Realtime
      socketIO: this.getSocketIOUrl(),
      webSocket: this.getWebSocketUrl()
    };
  }

  /**
   * Check if using default backend
   * @returns True if using default backend
   */
  isDefaultBackend(): boolean {
    return this.baseUrl === 'https://oropendola.ai';
  }

  /**
   * Check if using local development backend
   * @returns True if using local backend
   */
  isLocalBackend(): boolean {
    return this.baseUrl.includes('localhost') || this.baseUrl.includes('127.0.0.1');
  }

  /**
   * Get backend environment
   * @returns Environment type
   */
  getEnvironment(): Environment {
    if (this.isDefaultBackend()) return 'production';
    if (this.isLocalBackend()) return 'development';
    return 'custom';
  }

  /**
   * Validate backend URL format
   * @param url - URL to validate
   * @returns Validation result
   */
  validateUrl(url: string): UrlValidation {
    if (!url) {
      return { valid: false, error: 'URL cannot be empty' };
    }

    // Check for valid protocol
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return { valid: false, error: 'URL must start with http:// or https://' };
    }

    // Check for valid URL format
    try {
      new URL(url);
    } catch (error) {
      return { valid: false, error: 'Invalid URL format' };
    }

    // Warn about HTTP (not HTTPS)
    if (url.startsWith('http://') && !this.isLocalBackend()) {
      console.warn('[BackendConfig] Warning: Using HTTP instead of HTTPS');
    }

    return { valid: true, error: null };
  }

  /**
   * Update backend URL programmatically
   * @param newUrl - New backend URL
   * @returns Success status
   */
  async setBackendUrl(newUrl: string): Promise<boolean> {
    const validation = this.validateUrl(newUrl);

    if (!validation.valid) {
      throw new Error(`Invalid backend URL: ${validation.error}`);
    }

    // Remove trailing slash
    newUrl = newUrl.replace(/\/$/, '');

    if (!this.config) {
      throw new Error('Configuration not initialized');
    }

    // Update VS Code configuration
    await this.config.update('serverUrl', newUrl, vscode.ConfigurationTarget.Global);

    console.log('[BackendConfig] Backend URL updated to:', newUrl);

    // Configuration will auto-reload via onDidChangeConfiguration listener

    return true;
  }

  /**
   * Reset to default backend
   * @returns Success status
   */
  async resetToDefault(): Promise<boolean> {
    return await this.setBackendUrl('https://oropendola.ai');
  }

  /**
   * Get connection info for status display
   * @returns Connection information
   */
  getConnectionInfo(): ConnectionInfo {
    return {
      url: this.baseUrl,
      environment: this.getEnvironment(),
      isDefault: this.isDefaultBackend(),
      isLocal: this.isLocalBackend(),
      endpoints: Object.keys(this.endpoints).length
    };
  }
}

// Singleton instance
let instance: BackendConfig | null = null;

/**
 * Get BackendConfig singleton instance
 * @returns BackendConfig instance
 */
export function getInstance(): BackendConfig {
  if (!instance) {
    instance = new BackendConfig();
  }
  return instance;
}
