/**
 * Browser Automation Client
 *
 * Client for browser automation backend using Playwright
 * Integrates with https://oropendola.ai/ browser automation APIs
 *
 * Week 6: Browser Automation
 */

import { BackendConfig, getInstance as getBackendConfig } from '../config/BackendConfig';
import {
    BrowserSession,
    BrowserSessionOptions,
    NavigateOptions,
    ClickOptions,
    TypeOptions,
    SelectOptions,
    ScrollOptions,
    ScreenshotOptions,
    PdfOptions,
    BrowserFile
} from '../types';

export class BrowserAutomationClient {
    private static instance: BrowserAutomationClient;
    private backendConfig: BackendConfig;
    private csrfToken: string = '';

    private constructor() {
        this.backendConfig = getBackendConfig();
    }

    public static getInstance(): BrowserAutomationClient {
        if (!BrowserAutomationClient.instance) {
            BrowserAutomationClient.instance = new BrowserAutomationClient();
        }
        return BrowserAutomationClient.instance;
    }

    /**
     * Get CSRF token for authenticated requests
     */
    private async getCsrfToken(): Promise<string> {
        if (this.csrfToken) {
            return this.csrfToken;
        }

        try {
            const response = await fetch(
                this.backendConfig.getApiUrl('/api/method/ai_assistant.api.get_csrf_token'),
                {
                    method: 'GET',
                    credentials: 'include'
                }
            );

            const data = await response.json() as any;
            this.csrfToken = data.message || data.csrf_token || '';
            return this.csrfToken;
        } catch (error) {
            console.warn('Failed to get CSRF token:', error);
            return '';
        }
    }

    // ========================================================================
    // SESSION MANAGEMENT
    // ========================================================================

    /**
     * Create a new browser session
     */
    public async createSession(options: BrowserSessionOptions = {}): Promise<{
        success: boolean;
        sessionId?: string;
        message?: string;
    }> {
        try {
            const response = await fetch(
                this.backendConfig.getApiUrl('/api/method/ai_assistant.api.browser_create_session'),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Frappe-CSRF-Token': await this.getCsrfToken()
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        session_name: options.sessionName,
                        headless: options.headless !== false,
                        viewport_width: options.viewportWidth || 1920,
                        viewport_height: options.viewportHeight || 1080,
                        user_agent: options.userAgent,
                        workspace_id: options.workspaceId
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json() as any;
            const result = data.message || data;

            return {
                success: result.success || false,
                sessionId: result.session_id,
                message: result.message
            };
        } catch (error) {
            console.error('Failed to create session:', error);
            return { success: false, message: `Error: ${error}` };
        }
    }

    /**
     * Close a browser session
     */
    public async closeSession(sessionId: string): Promise<{ success: boolean; message?: string }> {
        try {
            const response = await fetch(
                this.backendConfig.getApiUrl('/api/method/ai_assistant.api.browser_close_session'),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Frappe-CSRF-Token': await this.getCsrfToken()
                    },
                    credentials: 'include',
                    body: JSON.stringify({ session_id: sessionId })
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json() as any;
            const result = data.message || data;

            return {
                success: result.success || false,
                message: result.message
            };
        } catch (error) {
            console.error('Failed to close session:', error);
            return { success: false, message: `Error: ${error}` };
        }
    }

    /**
     * List browser sessions
     */
    public async listSessions(options: {
        workspaceId?: string;
        status?: string;
    } = {}): Promise<{ success: boolean; sessions: BrowserSession[] }> {
        try {
            const response = await fetch(
                this.backendConfig.getApiUrl('/api/method/ai_assistant.api.browser_list_sessions'),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Frappe-CSRF-Token': await this.getCsrfToken()
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        workspace_id: options.workspaceId,
                        status: options.status
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json() as any;
            const result = data.message || data;

            const sessions: BrowserSession[] = (result.sessions || []).map((s: any) => ({
                id: s.id,
                sessionName: s.session_name,
                status: s.status,
                currentUrl: s.current_url,
                pageTitle: s.page_title,
                createdAt: new Date(s.created_at),
                lastActivity: new Date(s.last_activity),
                viewportWidth: s.viewport_width,
                viewportHeight: s.viewport_height
            }));

            return { success: true, sessions };
        } catch (error) {
            console.error('Failed to list sessions:', error);
            return { success: false, sessions: [] };
        }
    }

    /**
     * Get session info
     */
    public async getSessionInfo(sessionId: string): Promise<{
        success: boolean;
        session?: BrowserSession;
    }> {
        try {
            const response = await fetch(
                this.backendConfig.getApiUrl('/api/method/ai_assistant.api.browser_get_session_info'),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Frappe-CSRF-Token': await this.getCsrfToken()
                    },
                    credentials: 'include',
                    body: JSON.stringify({ session_id: sessionId })
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json() as any;
            const s = data.message || data;

            const session: BrowserSession = {
                id: s.id,
                sessionName: s.session_name,
                status: s.status,
                currentUrl: s.current_url,
                pageTitle: s.page_title,
                createdAt: new Date(s.created_at),
                lastActivity: new Date(s.last_activity),
                viewportWidth: s.viewport_width,
                viewportHeight: s.viewport_height
            };

            return { success: true, session };
        } catch (error) {
            console.error('Failed to get session info:', error);
            return { success: false };
        }
    }

    // ========================================================================
    // NAVIGATION
    // ========================================================================

    /**
     * Navigate to URL
     */
    public async navigate(sessionId: string, url: string, options: NavigateOptions = {}): Promise<{
        success: boolean;
        url?: string;
        title?: string;
        message?: string;
    }> {
        try {
            const response = await fetch(
                this.backendConfig.getApiUrl('/api/method/ai_assistant.api.browser_navigate'),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Frappe-CSRF-Token': await this.getCsrfToken()
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        session_id: sessionId,
                        url,
                        wait_until: options.waitUntil || 'load',
                        timeout: options.timeout || 30000
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json() as any;
            const result = data.message || data;

            return {
                success: result.success || false,
                url: result.url,
                title: result.title,
                message: result.message
            };
        } catch (error) {
            console.error('Failed to navigate:', error);
            return { success: false, message: `Error: ${error}` };
        }
    }

    /**
     * Go back
     */
    public async goBack(sessionId: string): Promise<{ success: boolean; url?: string }> {
        try {
            const response = await fetch(
                this.backendConfig.getApiUrl('/api/method/ai_assistant.api.browser_go_back'),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Frappe-CSRF-Token': await this.getCsrfToken()
                    },
                    credentials: 'include',
                    body: JSON.stringify({ session_id: sessionId })
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json() as any;
            const result = data.message || data;

            return { success: result.success || false, url: result.url };
        } catch (error) {
            console.error('Failed to go back:', error);
            return { success: false };
        }
    }

    /**
     * Go forward
     */
    public async goForward(sessionId: string): Promise<{ success: boolean; url?: string }> {
        try {
            const response = await fetch(
                this.backendConfig.getApiUrl('/api/method/ai_assistant.api.browser_go_forward'),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Frappe-CSRF-Token': await this.getCsrfToken()
                    },
                    credentials: 'include',
                    body: JSON.stringify({ session_id: sessionId })
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json() as any;
            const result = data.message || data;

            return { success: result.success || false, url: result.url };
        } catch (error) {
            console.error('Failed to go forward:', error);
            return { success: false };
        }
    }

    /**
     * Reload page
     */
    public async reload(sessionId: string): Promise<{ success: boolean }> {
        try {
            const response = await fetch(
                this.backendConfig.getApiUrl('/api/method/ai_assistant.api.browser_reload'),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Frappe-CSRF-Token': await this.getCsrfToken()
                    },
                    credentials: 'include',
                    body: JSON.stringify({ session_id: sessionId })
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json() as any;
            const result = data.message || data;

            return { success: result.success || false };
        } catch (error) {
            console.error('Failed to reload:', error);
            return { success: false };
        }
    }

    /**
     * Get current URL
     */
    public async getCurrentUrl(sessionId: string): Promise<{ success: boolean; url?: string; title?: string }> {
        try {
            const response = await fetch(
                this.backendConfig.getApiUrl('/api/method/ai_assistant.api.browser_get_url'),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Frappe-CSRF-Token': await this.getCsrfToken()
                    },
                    credentials: 'include',
                    body: JSON.stringify({ session_id: sessionId })
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json() as any;
            const result = data.message || data;

            return {
                success: result.success || false,
                url: result.url,
                title: result.title
            };
        } catch (error) {
            console.error('Failed to get URL:', error);
            return { success: false };
        }
    }

    // ========================================================================
    // INTERACTION
    // ========================================================================

    /**
     * Click element
     */
    public async click(sessionId: string, selector: string, options: ClickOptions = {}): Promise<{
        success: boolean;
        message?: string;
    }> {
        try {
            const response = await fetch(
                this.backendConfig.getApiUrl('/api/method/ai_assistant.api.browser_click'),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Frappe-CSRF-Token': await this.getCsrfToken()
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        session_id: sessionId,
                        selector,
                        timeout: options.timeout || 30000
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json() as any;
            const result = data.message || data;

            return {
                success: result.success || false,
                message: result.message
            };
        } catch (error) {
            console.error('Failed to click:', error);
            return { success: false, message: `Error: ${error}` };
        }
    }

    /**
     * Type text
     */
    public async type(sessionId: string, selector: string, text: string, options: TypeOptions = {}): Promise<{
        success: boolean;
        message?: string;
    }> {
        try {
            const response = await fetch(
                this.backendConfig.getApiUrl('/api/method/ai_assistant.api.browser_type'),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Frappe-CSRF-Token': await this.getCsrfToken()
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        session_id: sessionId,
                        selector,
                        text,
                        delay: options.delay || 0,
                        timeout: options.timeout || 30000
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json() as any;
            const result = data.message || data;

            return {
                success: result.success || false,
                message: result.message
            };
        } catch (error) {
            console.error('Failed to type:', error);
            return { success: false, message: `Error: ${error}` };
        }
    }

    /**
     * Select option
     */
    public async select(sessionId: string, selector: string, value: string, options: SelectOptions = {}): Promise<{
        success: boolean;
        message?: string;
    }> {
        try {
            const response = await fetch(
                this.backendConfig.getApiUrl('/api/method/ai_assistant.api.browser_select'),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Frappe-CSRF-Token': await this.getCsrfToken()
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        session_id: sessionId,
                        selector,
                        value,
                        timeout: options.timeout || 30000
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json() as any;
            const result = data.message || data;

            return {
                success: result.success || false,
                message: result.message
            };
        } catch (error) {
            console.error('Failed to select:', error);
            return { success: false, message: `Error: ${error}` };
        }
    }

    /**
     * Scroll page
     */
    public async scroll(sessionId: string, options: ScrollOptions): Promise<{ success: boolean }> {
        try {
            const response = await fetch(
                this.backendConfig.getApiUrl('/api/method/ai_assistant.api.browser_scroll'),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Frappe-CSRF-Token': await this.getCsrfToken()
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        session_id: sessionId,
                        x: options.x || 0,
                        y: options.y || 0
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json() as any;
            const result = data.message || data;

            return { success: result.success || false };
        } catch (error) {
            console.error('Failed to scroll:', error);
            return { success: false };
        }
    }

    // ========================================================================
    // DATA EXTRACTION
    // ========================================================================

    /**
     * Get page content
     */
    public async getContent(sessionId: string, format: 'html' | 'text' | 'markdown' = 'html'): Promise<{
        success: boolean;
        content?: string;
        url?: string;
        title?: string;
    }> {
        try {
            const response = await fetch(
                this.backendConfig.getApiUrl('/api/method/ai_assistant.api.browser_get_content'),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Frappe-CSRF-Token': await this.getCsrfToken()
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        session_id: sessionId,
                        format
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json() as any;
            const result = data.message || data;

            return {
                success: result.success || false,
                content: result.content,
                url: result.url,
                title: result.title
            };
        } catch (error) {
            console.error('Failed to get content:', error);
            return { success: false };
        }
    }

    /**
     * Execute JavaScript
     */
    public async evaluate(sessionId: string, script: string): Promise<{
        success: boolean;
        result?: any;
        message?: string;
    }> {
        try {
            const response = await fetch(
                this.backendConfig.getApiUrl('/api/method/ai_assistant.api.browser_evaluate'),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Frappe-CSRF-Token': await this.getCsrfToken()
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        session_id: sessionId,
                        script
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json() as any;
            const result = data.message || data;

            return {
                success: result.success || false,
                result: result.result,
                message: result.message
            };
        } catch (error) {
            console.error('Failed to evaluate:', error);
            return { success: false, message: `Error: ${error}` };
        }
    }

    // ========================================================================
    // SCREENSHOT & PDF
    // ========================================================================

    /**
     * Take screenshot
     */
    public async screenshot(sessionId: string, options: ScreenshotOptions = {}): Promise<{
        success: boolean;
        fileId?: string;
        filePath?: string;
        fileSize?: number;
        message?: string;
    }> {
        try {
            const response = await fetch(
                this.backendConfig.getApiUrl('/api/method/ai_assistant.api.browser_screenshot'),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Frappe-CSRF-Token': await this.getCsrfToken()
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        session_id: sessionId,
                        full_page: options.fullPage !== false,
                        format: options.format || 'png',
                        quality: options.quality
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json() as any;
            const result = data.message || data;

            return {
                success: result.success || false,
                fileId: result.file_id,
                filePath: result.file_path,
                fileSize: result.file_size,
                message: result.message
            };
        } catch (error) {
            console.error('Failed to take screenshot:', error);
            return { success: false, message: `Error: ${error}` };
        }
    }

    /**
     * Generate PDF
     */
    public async generatePdf(sessionId: string, options: PdfOptions = {}): Promise<{
        success: boolean;
        fileId?: string;
        filePath?: string;
        fileSize?: number;
        message?: string;
    }> {
        try {
            const response = await fetch(
                this.backendConfig.getApiUrl('/api/method/ai_assistant.api.browser_pdf'),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Frappe-CSRF-Token': await this.getCsrfToken()
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        session_id: sessionId,
                        format: options.format || 'A4',
                        print_background: options.printBackground !== false,
                        margin: options.margin
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json() as any;
            const result = data.message || data;

            return {
                success: result.success || false,
                fileId: result.file_id,
                filePath: result.file_path,
                fileSize: result.file_size,
                message: result.message
            };
        } catch (error) {
            console.error('Failed to generate PDF:', error);
            return { success: false, message: `Error: ${error}` };
        }
    }

    /**
     * Get file info
     */
    public async getFile(fileId: string): Promise<{
        success: boolean;
        file?: BrowserFile;
    }> {
        try {
            const response = await fetch(
                this.backendConfig.getApiUrl('/api/method/ai_assistant.api.browser_get_file'),
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Frappe-CSRF-Token': await this.getCsrfToken()
                    },
                    credentials: 'include',
                    body: JSON.stringify({ file_id: fileId })
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json() as any;
            const f = data.message || data;

            const file: BrowserFile = {
                id: f.id,
                sessionId: f.session_id,
                fileType: f.file_type,
                fileFormat: f.file_format,
                filePath: f.file_path,
                fileSize: f.file_size,
                width: f.width,
                height: f.height,
                url: f.url,
                createdAt: new Date(f.created_at),
                expiresAt: f.expires_at ? new Date(f.expires_at) : undefined
            };

            return { success: true, file };
        } catch (error) {
            console.error('Failed to get file:', error);
            return { success: false };
        }
    }
}

export function getInstance(): BrowserAutomationClient {
    return BrowserAutomationClient.getInstance();
}
