# Oropendola Migration Guide: Fork Roo-Code

**Date**: 2025-11-02
**Target**: Migrate from Oropendola v3.14.0 to Roo-Code Fork
**Timeline**: 4 weeks
**Preserve**: All Oropendola user data, subscriptions, authentication

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-Migration Checklist](#pre-migration-checklist)
3. [Week 1: Fork Setup & OropendolaHandler](#week-1-fork-setup--oropendolahandler)
4. [Week 2: Authentication Migration](#week-2-authentication-migration)
5. [Week 3: Subscription & Settings](#week-3-subscription--settings)
6. [Week 4: Branding, Testing, Deployment](#week-4-branding-testing-deployment)
7. [Data Migration Plan](#data-migration-plan)
8. [Rollback Strategy](#rollback-strategy)

---

## Overview

### What We're Doing

**From**: Oropendola standalone extension (JavaScript, custom backend)
**To**: Roo-Code fork with OropendolaHandler provider (TypeScript, multi-provider)

### What We're Preserving

✅ **User Data**
- Stored authentication (session cookies)
- User preferences/settings
- Chat history
- Workspace contexts

✅ **Backend Integration**
- Oropendola.ai API endpoints
- Agent Mode API
- Subscription management
- Usage quota tracking

✅ **Features**
- OAuth authentication flow
- Subscription banner
- Real-time WebSocket connections
- All Oropendola-specific UI elements

### What We're Gaining

🎉 **New Features**
- 40+ AI provider support (OpenAI, Anthropic, etc.)
- Browser automation
- MCP (Model Context Protocol)
- Advanced diff strategies
- Checkpoint/rollback system
- Better TypeScript architecture

---

## Pre-Migration Checklist

### Step 1: Backup Current Oropendola

```bash
# Backup entire codebase
cd /Users/sammishthundiyil
cp -r oropendola oropendola-backup-$(date +%Y%m%d)

# Export user data
cd oropendola
node scripts/export-user-data.js  # We'll create this
```

### Step 2: Document Custom Features

Create a list of ALL Oropendola-specific features:

**File**: `/Users/sammishthundiyil/oropendola/OROPENDOLA_FEATURES.md`

```markdown
# Oropendola-Specific Features

## Authentication
- OAuth via https://oropendola.ai/api/method/frappe.integrations.oauth2.authorize
- Session cookies stored in VSCode SecretStorage
- Session refresh mechanism
- Sign out clears cookies

## Subscription Management
- API: /api/method/oropendola_ai.oropendola_ai.api.user_api.get_my_subscription
- Subscription banner in UI
- Quota display (200/200 format)
- Trial period handling
- Expiration warnings

## Agent Mode API
- Endpoint: /api/method/oropendola_ai.oropendola_ai.api.vscode_extension.agent
- Automatic model selection
- Streaming via SSE
- WebSocket real-time updates
- Cost calculation server-side

## UI Components
- SubscriptionBanner (webview-ui/src/components/SubscriptionBanner.tsx)
- RooStyleTextArea with sign-in button
- AgentModelBadge
- Account settings page

## Data Storage
- VSCode SecretStorage for session cookies
- VSCode GlobalState for settings
- Task history in ~/.oropendola/tasks/
```

### Step 3: List All API Endpoints

**File**: `/Users/sammishthundiyil/oropendola/OROPENDOLA_API_ENDPOINTS.md`

```markdown
# Oropendola API Endpoints

Base URL: https://oropendola.ai

## Authentication
- POST /api/method/frappe.integrations.oauth2.authorize
- POST /api/method/frappe.integrations.oauth2.get_token
- POST /api/method/logout

## User Profile
- POST /api/method/oropendola_ai.oropendola_ai.api.user_api.get_my_profile

## Subscription
- POST /api/method/oropendola_ai.oropendola_ai.api.user_api.get_my_subscription
- POST /api/method/oropendola_ai.oropendola_ai.api.user_api.get_my_api_key

## Agent Mode (AI Requests)
- POST /api/method/oropendola_ai.oropendola_ai.api.vscode_extension.agent
  - Parameters: prompt, conversation_id, temperature, max_tokens, context
  - Response: streaming SSE with model selection info

## WebSocket (Real-time)
- WS wss://oropendola.ai/socket.io
  - Events: ai_progress, connected, disconnected, error
```

### Step 4: Export User Settings

```bash
# Create export script
cat > /Users/sammishthundiyil/oropendola/scripts/export-settings.js << 'EOF'
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

async function exportSettings() {
    const config = vscode.workspace.getConfiguration('oropendola');
    const settings = {
        serverUrl: config.get('serverUrl'),
        autoApprove: config.get('autoApprove'),
        soundEnabled: config.get('soundEnabled'),
        // Add all settings
    };

    const exportPath = path.join(process.env.HOME, '.oropendola-migration');
    fs.mkdirSync(exportPath, { recursive: true });
    fs.writeFileSync(
        path.join(exportPath, 'settings.json'),
        JSON.stringify(settings, null, 2)
    );

    console.log('Settings exported to:', exportPath);
}

exportSettings();
EOF
```

---

## Week 1: Fork Setup & OropendolaHandler

### Day 1: Fork Roo-Code Repository

```bash
# Clone Roo-Code
cd /tmp
git clone https://github.com/RooVetGit/Roo-Code.git
cd Roo-Code

# Create new branch for Oropendola integration
git checkout -b oropendola-integration

# Install dependencies
pnpm install
```

### Day 2: Set Up Development Environment

**1. Update package.json for branding**

```json
// package.json
{
  "name": "oropendola-ai-assistant",
  "displayName": "Oropendola AI Assistant",
  "description": "AI coding assistant powered by Oropendola",
  "version": "4.0.0",
  "publisher": "oropendola",
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/oropendola-roo-fork"
  }
}
```

**2. Configure TypeScript**

```bash
# Ensure TypeScript is working
pnpm run typecheck
```

**3. Test build**

```bash
# Build extension
pnpm run build

# Test that it works
code --install-extension ./releases/*.vsix --force
```

### Day 3-5: Create OropendolaHandler Provider

**File**: `/tmp/Roo-Code/src/api/providers/oropendola.ts`

```typescript
import { Anthropic } from "@anthropic-ai/sdk"
import axios, { AxiosInstance } from "axios"

import type { ApiHandlerOptions, ModelInfo } from "../../shared/api"
import { ApiStream } from "../transform/stream"
import type { ApiHandlerCreateMessageMetadata } from "../index"
import { BaseProvider } from "./base-provider"

/**
 * OropendolaHandler - Integration with Oropendola.ai Agent Mode API
 *
 * Features:
 * - Automatic model selection by backend
 * - Session cookie authentication
 * - Streaming via SSE
 * - Server-side cost calculation
 */
export class OropendolaHandler extends BaseProvider {
    private client: AxiosInstance
    private sessionCookies: string | null = null
    private baseURL: string

    constructor(options: ApiHandlerOptions) {
        super({
            ...options,
            providerName: "Oropendola AI",
        })

        this.baseURL = process.env.OROPENDOLA_API_URL || "https://oropendola.ai"

        // Create axios client similar to current agent-client.js
        this.client = axios.create({
            baseURL: this.baseURL,
            timeout: 1200000, // 20 minutes for AI requests
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            withCredentials: true,
            maxRedirects: 5
        })

        // Set up request interceptor for cookies
        this.client.interceptors.request.use(
            config => {
                if (this.sessionCookies) {
                    config.headers['Cookie'] = this.sessionCookies
                }
                return config
            },
            error => Promise.reject(error)
        )
    }

    /**
     * Update session cookies (called after authentication)
     */
    updateSessionCookies(cookies: string) {
        this.sessionCookies = cookies
    }

    /**
     * Create AI message using Agent Mode API
     */
    override async *createMessage(
        systemPrompt: string,
        messages: Anthropic.Messages.MessageParam[],
        metadata?: ApiHandlerCreateMessageMetadata,
    ): ApiStream {
        if (!this.sessionCookies) {
            throw new Error('Not authenticated. Please sign in to Oropendola.')
        }

        // Convert Anthropic messages to Oropendola format
        const prompt = this.convertMessagesToPrompt(systemPrompt, messages)

        // Call Agent Mode API
        const endpoint = '/api/method/oropendola_ai.oropendola_ai.api.vscode_extension.agent'

        try {
            const response = await this.client.post(endpoint, {
                prompt,
                conversation_id: metadata?.taskId,
                context: this.extractContext(messages),
                temperature: this.options.apiTemperature,
                max_tokens: this.options.apiMaxTokens,
            }, {
                responseType: 'stream'
            })

            // Parse SSE stream
            yield* this.parseSSEStream(response.data)

        } catch (error: any) {
            // Check for session expiration
            if (error.response?.data?.session_expired === 1) {
                throw new Error('Your session has expired. Please sign in again.')
            }
            throw error
        }
    }

    /**
     * Parse Server-Sent Events stream from Oropendola backend
     */
    private async *parseSSEStream(stream: any): ApiStream {
        let buffer = ''
        let totalCost = 0
        let inputTokens = 0
        let outputTokens = 0

        for await (const chunk of stream) {
            buffer += chunk.toString()

            // Split by newlines
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.substring(6))

                        // Text content
                        if (data.content) {
                            yield {
                                type: "text",
                                text: data.content,
                            }
                        }

                        // Reasoning (if supported)
                        if (data.reasoning) {
                            yield {
                                type: "reasoning",
                                text: data.reasoning,
                            }
                        }

                        // Usage/cost info
                        if (data.usage) {
                            totalCost = data.cost || 0
                            inputTokens = data.usage.input_tokens || 0
                            outputTokens = data.usage.output_tokens || 0
                        }

                    } catch (e) {
                        console.warn('[OropendolaHandler] Failed to parse SSE:', e)
                    }
                }
            }
        }

        // Yield final usage
        if (inputTokens > 0 || outputTokens > 0) {
            yield {
                type: "usage",
                inputTokens,
                outputTokens,
                totalCost,
            }
        }
    }

    /**
     * Convert Anthropic message format to simple prompt string
     */
    private convertMessagesToPrompt(
        systemPrompt: string,
        messages: Anthropic.Messages.MessageParam[]
    ): string {
        let prompt = systemPrompt + '\n\n'

        for (const msg of messages) {
            const role = msg.role === 'user' ? 'User' : 'Assistant'
            const content = Array.isArray(msg.content)
                ? msg.content.map(c => typeof c === 'string' ? c : c.text).join('\n')
                : msg.content

            prompt += `${role}: ${content}\n\n`
        }

        return prompt
    }

    /**
     * Extract context information from messages
     */
    private extractContext(messages: Anthropic.Messages.MessageParam[]): any {
        // Extract file paths, code snippets, etc.
        const context: any = {
            files: [],
            code_snippets: []
        }

        for (const msg of messages) {
            if (Array.isArray(msg.content)) {
                for (const block of msg.content) {
                    if (typeof block !== 'string' && block.type === 'tool_use') {
                        // Extract tool usage context
                        context.tools_used = context.tools_used || []
                        context.tools_used.push(block.name)
                    }
                }
            }
        }

        return context
    }

    override getModel(): { id: string; info: ModelInfo } {
        return {
            id: "oropendola-agent-mode",
            info: {
                maxTokens: 16_384,
                contextWindow: 262_144,
                supportsImages: false,
                supportsReasoningEffort: false,
                supportsPromptCache: true,
                inputPrice: 0,
                outputPrice: 0,
            }
        }
    }

    override async countTokens(content: Anthropic.Messages.ContentBlockParam[]): Promise<number> {
        // Use tiktoken estimation (inherited from BaseProvider)
        return super.countTokens(content)
    }
}
```

**Add to provider list:**

```typescript
// src/api/index.ts
import { OropendolaHandler } from "./providers/oropendola"

export function buildApiHandler(configuration: ProviderSettings): ApiHandler {
    const { apiProvider, ...options } = configuration

    switch (apiProvider) {
        case "oropendola":
            return new OropendolaHandler(options)
        case "anthropic":
            return new AnthropicHandler(options)
        // ... rest of providers
    }
}
```

**Add Oropendola to types:**

```typescript
// packages/types/src/api.ts
export type ApiProvider =
    | "anthropic"
    | "oropendola"  // Add this
    | "openai"
    // ... rest
```

---

## Week 2: Authentication Migration

### Day 1-2: Create OropendolaAuthService

**File**: `/tmp/Roo-Code/packages/cloud/src/OropendolaAuthService.ts`

```typescript
import crypto from "crypto"
import EventEmitter from "events"
import type { ExtensionContext } from "vscode"
import axios from "axios"

import type {
    CloudUserInfo,
    CloudOrganizationMembership,
    AuthService,
    AuthServiceEvents,
    AuthState,
} from "@roo-code/types"

import { importVscode } from "./importVscode.js"

const AUTH_STATE_KEY = "oropendola-auth-state"
const SESSION_COOKIES_KEY = "oropendola-session-cookies"

export class OropendolaAuthService extends EventEmitter<AuthServiceEvents> implements AuthService {
    private context: ExtensionContext
    private state: AuthState = "initializing"
    private sessionCookies: string | null = null
    private userInfo: CloudUserInfo | null = null
    private log: (...args: unknown[]) => void

    constructor(context: ExtensionContext, log?: (...args: unknown[]) => void) {
        super()
        this.context = context
        this.log = log || console.log
    }

    async initialize(): Promise<void> {
        this.log("[OropendolaAuth] Initializing...")

        // Load stored session cookies
        const storedCookies = await this.context.secrets.get(SESSION_COOKIES_KEY)
        if (storedCookies) {
            this.sessionCookies = storedCookies
            this.log("[OropendolaAuth] Restored session cookies from storage")

            // Validate and fetch user info
            await this.validateAndRefreshSession()
        } else {
            this.setState("logged-out")
        }
    }

    async signIn(): Promise<void> {
        this.log("[OropendolaAuth] Starting OAuth sign-in...")

        // Open OAuth URL
        const vscode = importVscode()
        const baseUrl = process.env.OROPENDOLA_API_URL || "https://oropendola.ai"

        // Generate OAuth state for CSRF protection
        const state = crypto.randomBytes(16).toString('hex')

        const authUrl = `${baseUrl}/api/method/frappe.integrations.oauth2.authorize?` +
            `client_id=oropendola-vscode-extension&` +
            `redirect_uri=vscode://oropendola.oropendola-ai-assistant/oauth-callback&` +
            `response_type=code&` +
            `state=${state}`

        // Open browser
        await vscode.env.openExternal(vscode.Uri.parse(authUrl))

        // Wait for OAuth callback (handled by extension.ts URI handler)
        // The URI handler will call handleOAuthCallback()
    }

    /**
     * Handle OAuth callback from VSCode URI handler
     */
    async handleOAuthCallback(code: string, state: string): Promise<void> {
        this.log("[OropendolaAuth] OAuth callback received")

        try {
            const baseUrl = process.env.OROPENDOLA_API_URL || "https://oropendola.ai"

            // Exchange code for session
            const response = await axios.post(
                `${baseUrl}/api/method/frappe.integrations.oauth2.get_token`,
                {
                    grant_type: 'authorization_code',
                    code,
                    client_id: 'oropendola-vscode-extension',
                    redirect_uri: 'vscode://oropendola.oropendola-ai-assistant/oauth-callback'
                },
                { withCredentials: true }
            )

            // Extract session cookies from response
            const setCookieHeaders = response.headers['set-cookie']
            if (setCookieHeaders && setCookieHeaders.length > 0) {
                this.sessionCookies = setCookieHeaders.map(cookie => {
                    return cookie.split(';')[0]
                }).join('; ')

                // Store in VSCode secrets
                await this.context.secrets.store(SESSION_COOKIES_KEY, this.sessionCookies)
                this.log("[OropendolaAuth] Session cookies stored")

                // Fetch user info
                await this.fetchUserInfo()

                this.setState("logged-in")
            } else {
                throw new Error('No session cookies received')
            }

        } catch (error: any) {
            this.log("[OropendolaAuth] OAuth callback failed:", error.message)
            this.setState("logged-out")
            throw error
        }
    }

    async signOut(): Promise<void> {
        this.log("[OropendolaAuth] Signing out...")

        // Clear session cookies
        this.sessionCookies = null
        this.userInfo = null
        await this.context.secrets.delete(SESSION_COOKIES_KEY)

        this.setState("logged-out")
    }

    getSessionToken(): string | undefined {
        return this.sessionCookies || undefined
    }

    getUserInfo(): CloudUserInfo | null {
        return this.userInfo
    }

    getState(): AuthState {
        return this.state
    }

    /**
     * Validate session and fetch user info
     */
    private async validateAndRefreshSession(): Promise<void> {
        if (!this.sessionCookies) {
            this.setState("logged-out")
            return
        }

        try {
            await this.fetchUserInfo()
            this.setState("logged-in")
        } catch (error: any) {
            this.log("[OropendolaAuth] Session validation failed:", error.message)

            // Session expired
            this.sessionCookies = null
            await this.context.secrets.delete(SESSION_COOKIES_KEY)
            this.setState("logged-out")
        }
    }

    /**
     * Fetch user profile from Oropendola API
     */
    private async fetchUserInfo(): Promise<void> {
        if (!this.sessionCookies) {
            throw new Error('No session cookies available')
        }

        const baseUrl = process.env.OROPENDOLA_API_URL || "https://oropendola.ai"

        const response = await axios.post(
            `${baseUrl}/api/method/oropendola_ai.oropendola_ai.api.user_api.get_my_profile`,
            {},
            {
                headers: {
                    'Cookie': this.sessionCookies,
                    'Content-Type': 'application/json'
                }
            }
        )

        const profile = response.data.message

        this.userInfo = {
            id: profile.email,
            email: profile.email,
            firstName: profile.first_name || '',
            lastName: profile.last_name || '',
            imageUrl: profile.user_image || undefined,
        }

        this.emit("user-info", this.userInfo)
    }

    private setState(newState: AuthState) {
        const oldState = this.state
        this.state = newState
        this.log(`[OropendolaAuth] State: ${oldState} → ${newState}`)
        this.emit("auth-state-changed", { state: newState })
    }
}
```

### Day 3: Integrate with CloudService

**Modify**: `/tmp/Roo-Code/packages/cloud/src/CloudService.ts`

```typescript
// Add import
import { OropendolaAuthService } from "./OropendolaAuthService.js"

// In initialize() method:
public async initialize(): Promise<void> {
    if (this.isInitialized) {
        return
    }

    try {
        // Check if using Oropendola auth
        const useOropendola = process.env.USE_OROPENDOLA_AUTH === "true"

        if (useOropendola) {
            this._authService = new OropendolaAuthService(this.context, this.log)
            this.log("[CloudService] Using Oropendola authentication")
        } else {
            // Default: use Clerk auth
            const cloudToken = process.env.ROO_CODE_CLOUD_TOKEN
            if (cloudToken && cloudToken.length > 0) {
                this._authService = new StaticTokenAuthService(this.context, cloudToken, this.log)
                this._isCloudAgent = true
            } else {
                this._authService = new WebAuthService(this.context, this.log)
            }
        }

        this._authService.on("auth-state-changed", this.authStateListener)
        this._authService.on("user-info", this.authUserInfoListener)
        await this._authService.initialize()

        // ... rest of initialization
    }
}
```

### Day 4: Handle OAuth Callback in Extension

**Modify**: `/tmp/Roo-Code/src/extension.ts`

```typescript
import { CloudService } from "@roo-code/cloud"
import type { OropendolaAuthService } from "../packages/cloud/src/OropendolaAuthService"

export async function activate(context: vscode.ExtensionContext) {
    // ... existing activation code

    // Register URI handler for OAuth callback
    context.subscriptions.push(
        vscode.window.registerUriHandler({
            handleUri: async (uri: vscode.Uri) => {
                if (uri.path === '/oauth-callback') {
                    const query = new URLSearchParams(uri.query)
                    const code = query.get('code')
                    const state = query.get('state')

                    if (code && state) {
                        const authService = CloudService.instance?.authService as OropendolaAuthService
                        if (authService && 'handleOAuthCallback' in authService) {
                            try {
                                await authService.handleOAuthCallback(code, state)
                                vscode.window.showInformationMessage('Successfully signed in to Oropendola!')
                            } catch (error: any) {
                                vscode.window.showErrorMessage(`Sign in failed: ${error.message}`)
                            }
                        }
                    }
                }
            }
        })
    )
}
```

### Day 5: Update OropendolaHandler to use CloudService

```typescript
// src/api/providers/oropendola.ts
import { CloudService } from "@roo-code/cloud"
import type { OropendolaAuthService } from "../../../packages/cloud/src/OropendolaAuthService"

export class OropendolaHandler extends BaseProvider {
    constructor(options: ApiHandlerOptions) {
        super({
            ...options,
            providerName: "Oropendola AI",
        })

        // Get session cookies from auth service
        this.updateSessionCookiesFromAuth()

        // Listen for auth changes
        CloudService.instance?.authService?.on('auth-state-changed', () => {
            this.updateSessionCookiesFromAuth()
        })

        // ... rest of constructor
    }

    private updateSessionCookiesFromAuth() {
        const authService = CloudService.instance?.authService as OropendolaAuthService
        if (authService && 'getSessionToken' in authService) {
            const sessionToken = authService.getSessionToken()
            if (sessionToken) {
                this.updateSessionCookies(sessionToken)
            }
        }
    }

    // ... rest of class
}
```

---

## Week 3: Subscription & Settings

### Day 1-2: Create OropendolaSettingsService

**File**: `/tmp/Roo-Code/packages/cloud/src/OropendolaSettingsService.ts`

```typescript
import EventEmitter from "events"
import type { ExtensionContext } from "vscode"
import axios from "axios"

import type {
    SettingsService,
    SettingsServiceEvents,
    OrganizationSettings,
    UserSettingsData,
} from "@roo-code/types"

import type { OropendolaAuthService } from "./OropendolaAuthService.js"

interface OropendolaSubscription {
    id: string
    status: string
    plan_name: string
    plan_type: string
    start_date: string
    end_date: string
    is_active: boolean
    is_trial: boolean
    quota: {
        daily_limit: number
        daily_remaining: number
        usage_percent: number
    }
}

export class OropendolaSettingsService extends EventEmitter<SettingsServiceEvents> implements SettingsService {
    private context: ExtensionContext
    private authService: OropendolaAuthService
    private subscription: OropendolaSubscription | null = null
    private log: (...args: unknown[]) => void

    constructor(
        context: ExtensionContext,
        authService: OropendolaAuthService,
        log?: (...args: unknown[]) => void
    ) {
        super()
        this.context = context
        this.authService = authService
        this.log = log || console.log
    }

    async initialize(): Promise<void> {
        this.log("[OropendolaSettings] Initializing...")

        // Listen for auth changes
        this.authService.on('auth-state-changed', async (data) => {
            if (data.state === 'logged-in') {
                await this.fetchSubscription()
            } else {
                this.subscription = null
            }
        })

        // Fetch subscription if already logged in
        if (this.authService.getState() === 'logged-in') {
            await this.fetchSubscription()
        }

        // Poll subscription every 5 minutes
        setInterval(() => this.fetchSubscription(), 5 * 60 * 1000)
    }

    async fetchSubscription(): Promise<void> {
        const sessionToken = this.authService.getSessionToken()
        if (!sessionToken) {
            return
        }

        try {
            const baseUrl = process.env.OROPENDOLA_API_URL || "https://oropendola.ai"

            const response = await axios.post(
                `${baseUrl}/api/method/oropendola_ai.oropendola_ai.api.user_api.get_my_subscription`,
                {},
                {
                    headers: {
                        'Cookie': sessionToken,
                        'Content-Type': 'application/json'
                    }
                }
            )

            this.subscription = response.data.message.subscription
            this.log("[OropendolaSettings] Subscription fetched:", this.subscription?.plan_name)

            // Emit settings update
            this.emit("settings-updated", this.convertToUserSettings())

        } catch (error: any) {
            this.log("[OropendolaSettings] Failed to fetch subscription:", error.message)
        }
    }

    getOrganizationSettings(): OrganizationSettings | null {
        // Oropendola doesn't have organization concept, return null
        return null
    }

    getUserSettings(): UserSettingsData | null {
        return this.convertToUserSettings()
    }

    private convertToUserSettings(): UserSettingsData {
        if (!this.subscription) {
            return {
                features: {},
                limits: {}
            }
        }

        return {
            features: {
                hasActiveSubscription: this.subscription.is_active,
                isTrial: this.subscription.is_trial,
            },
            limits: {
                dailyQuota: this.subscription.quota.daily_limit,
                dailyRemaining: this.subscription.quota.daily_remaining,
                usagePercent: this.subscription.quota.usage_percent,
            },
            subscription: {
                plan: this.subscription.plan_name,
                status: this.subscription.status,
                endDate: this.subscription.end_date,
            }
        }
    }
}
```

### Day 3: Integrate Settings Service

**Modify**: `/tmp/Roo-Code/packages/cloud/src/CloudService.ts`

```typescript
import { OropendolaSettingsService } from "./OropendolaSettingsService.js"

// In initialize():
if (useOropendola) {
    this._authService = new OropendolaAuthService(this.context, this.log)
    await this._authService.initialize()

    // Create Oropendola settings service
    const oropendolaSettingsService = new OropendolaSettingsService(
        this.context,
        this._authService as OropendolaAuthService,
        this.log
    )
    oropendolaSettingsService.on("settings-updated", this.settingsListener)
    await oropendolaSettingsService.initialize()

    this._settingsService = oropendolaSettingsService
} else {
    // Default Clerk auth and settings
    // ... existing code
}
```

### Day 4-5: Update UI Components for Subscription

**Modify**: `/tmp/Roo-Code/webview-ui/src/components/SubscriptionBanner.tsx`

Port the Oropendola subscription banner to work with new settings service:

```typescript
// webview-ui/src/components/SubscriptionBanner.tsx
import { useEffect, useState } from 'react'
import { vscode } from '../utils/vscode'

export function SubscriptionBanner() {
    const [subscription, setSubscription] = useState<any>(null)

    useEffect(() => {
        // Listen for settings updates from extension
        const handleMessage = (event: MessageEvent) => {
            const message = event.data
            if (message.type === 'subscriptionUpdate') {
                setSubscription(message.subscription)
            }
        }

        window.addEventListener('message', handleMessage)

        // Request initial subscription data
        vscode.postMessage({ type: 'getSubscription' })

        return () => window.removeEventListener('message', handleMessage)
    }, [])

    if (!subscription || subscription.status === 'Active') {
        return null // Hide banner if active
    }

    // Show expiration warning
    return (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4">
            <p className="text-yellow-700">
                {subscription.plan} expires on {subscription.endDate}
            </p>
            <button onClick={() => window.open('https://oropendola.ai/subscribe', '_blank')}>
                Upgrade Now
            </button>
        </div>
    )
}
```

---

## Week 4: Branding, Testing, Deployment

### Day 1: Branding Changes

**1. Update package.json**

```json
{
  "name": "oropendola-ai-assistant",
  "displayName": "Oropendola AI Assistant",
  "description": "AI coding assistant powered by Oropendola with multi-provider support",
  "version": "4.0.0",
  "publisher": "oropendola",
  "icon": "assets/oropendola-icon.png",
  "repository": {
    "type": "git",
    "url": "https://github.com/oropendola/oropendola-vscode"
  }
}
```

**2. Replace Icons**

```bash
# Copy Oropendola icons
cp /Users/sammishthundiyil/oropendola/assets/* /tmp/Roo-Code/assets/
```

**3. Update All UI Strings**

Find and replace:
- "Roo-Code" → "Oropendola"
- "Roo" → "Oropendola"
- "Cline" → "Oropendola Assistant"

```bash
cd /tmp/Roo-Code
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.json" \) \
  -exec sed -i '' 's/Roo-Code/Oropendola/g' {} +
```

### Day 2-3: Testing

**1. Test Authentication**

```typescript
// Test sign-in flow
✓ Open extension
✓ Click "Sign In"
✓ Browser opens OAuth page
✓ Login with Oropendola credentials
✓ Redirected back to VSCode
✓ Extension shows logged-in state
✓ User info displayed correctly
```

**2. Test AI Requests**

```typescript
// Test Agent Mode API
✓ Send message to Oropendola AI
✓ Response streams correctly
✓ Model selection info displayed
✓ Cost/usage tracked
✓ Session persists across reloads
```

**3. Test Subscription**

```typescript
// Test subscription management
✓ Subscription status displayed
✓ Quota shown correctly (200/200)
✓ Banner shows when near expiration
✓ Upgrade button links to oropendola.ai
```

**4. Test Provider Switching**

```typescript
// Test switching between providers
✓ Can switch to Anthropic provider
✓ Can switch to OpenAI provider
✓ Can switch back to Oropendola
✓ Settings persist correctly
```

**5. Test Data Migration**

```typescript
// Test that old data still works
✓ Old chat history accessible
✓ Old settings preserved
✓ Old authentication migrates
✓ No data loss
```

### Day 4: Create Migration Script for Users

**File**: `/tmp/Roo-Code/scripts/migrate-from-oropendola.ts`

```typescript
/**
 * Migration script to move user data from old Oropendola extension
 * to new Roo-Code fork with Oropendola provider
 */

import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'

export async function migrateOropendolaData(context: vscode.ExtensionContext) {
    console.log('[Migration] Starting Oropendola data migration...')

    try {
        // 1. Migrate session cookies
        const oldCookies = await context.secrets.get('oropendola.sessionCookies')
        if (oldCookies) {
            await context.secrets.store('oropendola-session-cookies', oldCookies)
            console.log('[Migration] ✓ Session cookies migrated')
        }

        // 2. Migrate settings
        const oldConfig = vscode.workspace.getConfiguration('oropendola')
        const newConfig = vscode.workspace.getConfiguration('roo-code')

        // Copy relevant settings
        const settingsToMigrate = [
            'autoApprove',
            'soundEnabled',
            'maxContextTokens',
            // Add all settings that should be preserved
        ]

        for (const setting of settingsToMigrate) {
            const value = oldConfig.get(setting)
            if (value !== undefined) {
                await newConfig.update(setting, value, vscode.ConfigurationTarget.Global)
            }
        }
        console.log('[Migration] ✓ Settings migrated')

        // 3. Migrate chat history
        const oldHistoryPath = path.join(context.globalStorageUri.fsPath, '../oropendola-ai-assistant/tasks')
        const newHistoryPath = path.join(context.globalStorageUri.fsPath, 'tasks')

        if (fs.existsSync(oldHistoryPath)) {
            fs.mkdirSync(newHistoryPath, { recursive: true })

            // Copy all task files
            const files = fs.readdirSync(oldHistoryPath)
            for (const file of files) {
                const oldPath = path.join(oldHistoryPath, file)
                const newPath = path.join(newHistoryPath, file)
                fs.copyFileSync(oldPath, newPath)
            }
            console.log(`[Migration] ✓ Chat history migrated (${files.length} tasks)`)
        }

        // 4. Set default provider to Oropendola
        await newConfig.update('apiProvider', 'oropendola', vscode.ConfigurationTarget.Global)
        console.log('[Migration] ✓ Default provider set to Oropendola')

        // 5. Mark migration as complete
        await context.globalState.update('oropendolaMigrationComplete', true)

        vscode.window.showInformationMessage(
            'Successfully migrated from Oropendola! Your settings and chat history are preserved.'
        )

    } catch (error: any) {
        console.error('[Migration] Failed:', error)
        vscode.window.showErrorMessage(
            `Migration failed: ${error.message}. Please contact support.`
        )
    }
}

// Auto-run on first activation
export async function checkAndMigrate(context: vscode.ExtensionContext) {
    const migrationComplete = context.globalState.get('oropendolaMigrationComplete')

    if (!migrationComplete) {
        const oldExtension = vscode.extensions.getExtension('oropendola.oropendola-ai-assistant')
        if (oldExtension) {
            // Old extension is installed, offer to migrate
            const response = await vscode.window.showInformationMessage(
                'Detected old Oropendola installation. Migrate your data?',
                'Yes', 'No'
            )

            if (response === 'Yes') {
                await migrateOropendolaData(context)
            }
        }
    }
}
```

### Day 5: Deployment

**1. Build Production Package**

```bash
cd /tmp/Roo-Code

# Build everything
pnpm run build

# Package extension
pnpm run package
```

**2. Test Installation**

```bash
# Install the new extension
code --install-extension ./releases/oropendola-ai-assistant-4.0.0.vsix --force

# Test that it works
# - Sign in
# - Send message
# - Check subscription
```

**3. Publish to Marketplace**

```bash
# Create publisher if needed
vsce create-publisher oropendola

# Login
vsce login oropendola

# Publish
vsce publish
```

**4. Update Documentation**

Create migration guide for users:
```markdown
# Migrating to Oropendola 4.0

## What's New

- Built on Roo-Code foundation
- Support for 40+ AI providers
- Improved performance and reliability
- All your data is preserved

## Migration Steps

1. Uninstall old Oropendola extension
2. Install new Oropendola 4.0
3. Your data will auto-migrate on first launch
4. Sign in with your Oropendola account
5. Start using!

## What's Preserved

✓ Chat history
✓ Settings
✓ Authentication
✓ Subscriptions
```

---

## Data Migration Plan

### User Data to Preserve

**1. Authentication**
```
OLD: context.secrets.get('oropendola.sessionCookies')
NEW: context.secrets.get('oropendola-session-cookies')
```

**2. Settings**
```
OLD: vscode.workspace.getConfiguration('oropendola')
NEW: vscode.workspace.getConfiguration('roo-code')
     + apiProvider = 'oropendola'
```

**3. Chat History**
```
OLD: ~/.vscode/extensions/oropendola.oropendola-ai-assistant-3.14.0/tasks/
NEW: ~/.vscode/extensions/oropendola.oropendola-ai-assistant-4.0.0/tasks/
```

**4. Workspace Contexts**
```
OLD: workspaceState in old extension
NEW: workspaceState in new extension
```

### Migration Strategy

**Option A: Automatic Migration (Recommended)**
- Detect old extension on first launch
- Offer to migrate data
- Copy all data to new locations
- Mark migration complete

**Option B: Manual Export/Import**
- Old extension exports data to JSON
- User installs new extension
- New extension imports JSON
- More control but more steps

**We recommend Option A** - automated migration for best user experience.

---

## Rollback Strategy

### If Migration Fails

**1. Keep Old Extension as Backup**
```bash
# Don't uninstall old extension until migration confirmed working
# Users can switch back if needed
```

**2. Export Before Migration**
```bash
# Auto-export all data before migration
# Store in ~/.oropendola-backup/
```

**3. Version Compatibility**
```typescript
// Support reading old data formats
// Gradually migrate over time
// Don't force immediate migration
```

### Rollback Process

If users need to go back:

```bash
# 1. Uninstall new extension
code --uninstall-extension oropendola.oropendola-ai-assistant

# 2. Reinstall old extension
code --install-extension oropendola-ai-assistant-3.14.0.vsix

# 3. Restore from backup
# Data is still in old locations, nothing lost
```

---

## Testing Checklist

### Pre-Migration
- [ ] Export current user data
- [ ] Document all custom features
- [ ] List all API endpoints
- [ ] Backup codebase

### Fork Setup
- [ ] Clone Roo-Code successfully
- [ ] Install dependencies (pnpm install)
- [ ] Build extension (pnpm run build)
- [ ] Test installation

### OropendolaHandler
- [ ] Created provider file
- [ ] Implements ApiHandler interface
- [ ] Handles streaming correctly
- [ ] Transforms messages properly
- [ ] Error handling works
- [ ] Added to provider list

### Authentication
- [ ] OropendolaAuthService created
- [ ] OAuth flow works
- [ ] Session cookies stored correctly
- [ ] User info fetched
- [ ] Session refresh works
- [ ] Sign out clears data

### Subscription
- [ ] OropendolaSettingsService created
- [ ] Subscription data fetched
- [ ] Quota displayed correctly
- [ ] Banner shows when needed
- [ ] Updates on poll

### Branding
- [ ] Package.json updated
- [ ] Icons replaced
- [ ] All strings updated
- [ ] README updated
- [ ] Documentation updated

### Data Migration
- [ ] Migration script created
- [ ] Auto-detects old extension
- [ ] Copies session cookies
- [ ] Copies settings
- [ ] Copies chat history
- [ ] Sets default provider
- [ ] Shows success message

### End-to-End
- [ ] Install fresh
- [ ] Sign in works
- [ ] Send message works
- [ ] Subscription shown
- [ ] Chat history preserved
- [ ] Settings preserved
- [ ] Can switch providers
- [ ] All features work

---

## Timeline Summary

| Week | Focus | Deliverables |
|------|-------|--------------|
| **Week 1** | Fork & Provider | Working OropendolaHandler |
| **Week 2** | Authentication | OAuth + CloudService integration |
| **Week 3** | Subscription | Settings service + UI |
| **Week 4** | Polish | Branding, testing, deployment |

**Total**: 4 weeks to complete migration

---

## Support & Resources

### Documentation
- Roo-Code API Docs: https://github.com/RooVetGit/Roo-Code/wiki
- VSCode Extension API: https://code.visualstudio.com/api
- TypeScript Handbook: https://www.typescriptlang.org/docs/

### Key Files to Reference

**From Oropendola:**
- `/Users/sammishthundiyil/oropendola/src/api/agent-client.js` - API client pattern
- `/Users/sammishthundiyil/oropendola/src/sidebar/sidebar-provider.js` - OAuth flow
- `/Users/sammishthundiyil/oropendola/webview-ui/src/components/SubscriptionBanner.tsx` - UI components

**From Roo-Code:**
- `/tmp/Roo-Code/src/api/providers/roo.ts` - Provider pattern
- `/tmp/Roo-Code/packages/cloud/src/WebAuthService.ts` - Auth pattern
- `/tmp/Roo-Code/src/core/task/Task.ts` - Task architecture

---

## Questions?

As we implement this migration, questions may arise:

1. **How to handle feature X from Oropendola?**
   - Check if Roo-Code has equivalent
   - If not, add as custom extension to provider

2. **How to preserve data Y?**
   - Add to migration script
   - Test before full rollout

3. **What if Z breaks?**
   - Refer to rollback strategy
   - Keep old extension as backup

---

**Next Steps**:

Ready to start? Let's begin with Week 1, Day 1:

```bash
cd /tmp
git clone https://github.com/RooVetGit/Roo-Code.git
cd Roo-Code
git checkout -b oropendola-integration
pnpm install
```

Let me know when you're ready to start, and I'll guide you through each step!
