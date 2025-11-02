# Oropendola → Roo-Code Fork: Quick Reference

**Use this as a checklist while migrating**

---

## Critical Files to Create

### Week 1: Provider

**Create**: `/tmp/Roo-Code/src/api/providers/oropendola.ts`
- Extends `BaseProvider`
- Implements `createMessage()` for Agent Mode API
- Handles session cookie auth
- Parses SSE streaming responses
- ~300 lines of code

**Modify**: `/tmp/Roo-Code/src/api/index.ts`
```typescript
case "oropendola":
    return new OropendolaHandler(options)
```

**Modify**: `/tmp/Roo-Code/packages/types/src/api.ts`
```typescript
export type ApiProvider = "oropendola" | "anthropic" | ...
```

### Week 2: Authentication

**Create**: `/tmp/Roo-Code/packages/cloud/src/OropendolaAuthService.ts`
- Implements `AuthService` interface
- OAuth flow with https://oropendola.ai
- Session cookie storage in VSCode Secrets
- User profile fetching
- ~250 lines of code

**Modify**: `/tmp/Roo-Code/packages/cloud/src/CloudService.ts`
```typescript
if (useOropendola) {
    this._authService = new OropendolaAuthService(...)
}
```

**Modify**: `/tmp/Roo-Code/src/extension.ts`
```typescript
vscode.window.registerUriHandler({
    handleUri: async (uri) => {
        // Handle OAuth callback
    }
})
```

### Week 3: Subscription

**Create**: `/tmp/Roo-Code/packages/cloud/src/OropendolaSettingsService.ts`
- Implements `SettingsService` interface
- Fetches subscription from API
- Converts to Roo-Code format
- Polls every 5 minutes
- ~200 lines of code

**Modify**: `/tmp/Roo-Code/webview-ui/src/components/SubscriptionBanner.tsx`
- Port from Oropendola
- Listen for settings updates
- Show expiration warnings

### Week 4: Migration Script

**Create**: `/tmp/Roo-Code/scripts/migrate-from-oropendola.ts`
- Auto-detect old extension
- Copy session cookies
- Copy settings
- Copy chat history
- Set default provider to Oropendola
- ~150 lines of code

---

## API Endpoint Mapping

### Authentication
```typescript
// OAuth Start
https://oropendola.ai/api/method/frappe.integrations.oauth2.authorize

// OAuth Token Exchange
https://oropendola.ai/api/method/frappe.integrations.oauth2.get_token

// User Profile
https://oropendola.ai/api/method/oropendola_ai.oropendola_ai.api.user_api.get_my_profile
```

### Subscription
```typescript
// Get Subscription
https://oropendola.ai/api/method/oropendola_ai.oropendola_ai.api.user_api.get_my_subscription
```

### AI Requests
```typescript
// Agent Mode (streaming SSE)
https://oropendola.ai/api/method/oropendola_ai.oropendola_ai.api.vscode_extension.agent
```

---

## Data Migration Paths

### Session Cookies
```typescript
OLD: context.secrets.get('oropendola.sessionCookies')
NEW: context.secrets.get('oropendola-session-cookies')
```

### Settings
```typescript
OLD: vscode.workspace.getConfiguration('oropendola')
NEW: vscode.workspace.getConfiguration('roo-code')
     + set apiProvider = 'oropendola'
```

### Chat History
```typescript
OLD: ~/.vscode/extensions/oropendola.oropendola-ai-assistant-3.14.0/globalStorage/tasks/
NEW: ~/.vscode/extensions/oropendola.oropendola-ai-assistant-4.0.0/globalStorage/tasks/
```

---

## Key Code Patterns

### Provider Pattern
```typescript
export class OropendolaHandler extends BaseProvider {
    async *createMessage(systemPrompt, messages, metadata): ApiStream {
        // 1. Get session cookies from CloudService
        const cookies = this.sessionCookies

        // 2. Call Oropendola API
        const response = await axios.post('/agent', {
            prompt: convertMessagesToPrompt(systemPrompt, messages),
            context: extractContext(messages)
        }, {
            headers: { 'Cookie': cookies }
        })

        // 3. Parse SSE stream
        yield* parseSSEStream(response.data)
    }
}
```

### Auth Service Pattern
```typescript
export class OropendolaAuthService implements AuthService {
    async initialize() {
        const stored = await context.secrets.get(SESSION_COOKIES_KEY)
        if (stored) {
            this.sessionCookies = stored
            await this.validateSession()
        }
    }

    async signIn() {
        // Open OAuth URL
        const authUrl = `${baseUrl}/api/method/frappe.integrations.oauth2.authorize...`
        await vscode.env.openExternal(Uri.parse(authUrl))
    }

    async handleOAuthCallback(code: string) {
        // Exchange code for session
        const response = await axios.post('/get_token', { code })
        this.sessionCookies = response.headers['set-cookie'].join('; ')
        await context.secrets.store(SESSION_COOKIES_KEY, this.sessionCookies)
    }
}
```

### Settings Service Pattern
```typescript
export class OropendolaSettingsService implements SettingsService {
    async fetchSubscription() {
        const response = await axios.post('/get_my_subscription', {}, {
            headers: { 'Cookie': this.authService.getSessionToken() }
        })

        this.subscription = response.data.message.subscription
        this.emit('settings-updated', this.convertToUserSettings())
    }
}
```

---

## Environment Variables

**Development**:
```bash
export OROPENDOLA_API_URL="https://oropendola.ai"
export USE_OROPENDOLA_AUTH="true"
```

**Production** (set in .env or package.json):
```json
{
  "extensionKind": ["workspace"],
  "contributes": {
    "configuration": {
      "properties": {
        "oropendola.apiUrl": {
          "type": "string",
          "default": "https://oropendola.ai"
        }
      }
    }
  }
}
```

---

## Build & Test Commands

```bash
# Install dependencies
pnpm install

# Type check
pnpm run typecheck

# Build extension
pnpm run build

# Watch mode (development)
pnpm run watch

# Package for deployment
pnpm run package

# Install locally
code --install-extension ./releases/*.vsix --force

# Run tests
pnpm test
```

---

## Common Issues & Solutions

### Issue: "Cannot find module '@roo-code/types'"
**Solution**:
```bash
pnpm install
cd packages/types && pnpm build
```

### Issue: "Session expired" error
**Solution**: Check that:
1. Session cookies are being passed to axios
2. Cookie header is set correctly
3. withCredentials: true is set
4. Backend accepts cookies

### Issue: "Provider not found"
**Solution**: Ensure:
1. OropendolaHandler added to buildApiHandler switch
2. 'oropendola' added to ApiProvider type
3. Extension rebuilt after changes

### Issue: Migration doesn't run
**Solution**: Check:
1. Old extension ID matches in detection
2. Migration flag not already set
3. Context.globalState accessible

---

## Testing Checklist

**Quick Test** (5 minutes):
- [ ] Build extension: `pnpm run build`
- [ ] Install: `code --install-extension ./releases/*.vsix --force`
- [ ] Sign in: Click "Sign In" button
- [ ] Send message: Type "Hello" and press Enter
- [ ] Check quota: Verify "200/200" shows

**Full Test** (30 minutes):
- [ ] Fresh install on clean VSCode
- [ ] Sign in with OAuth
- [ ] Send 3 different messages
- [ ] Check subscription status
- [ ] Test provider switching (Oropendola ↔ Anthropic)
- [ ] Reload window (Cmd+R) - verify session persists
- [ ] Sign out and back in
- [ ] Verify chat history preserved

**Migration Test** (15 minutes):
- [ ] Install old Oropendola extension
- [ ] Create some chat history
- [ ] Install new extension
- [ ] Verify migration prompt appears
- [ ] Accept migration
- [ ] Verify all data preserved

---

## Release Checklist

### Pre-Release
- [ ] All tests passing
- [ ] Version bumped in package.json
- [ ] CHANGELOG.md updated
- [ ] README.md updated
- [ ] Migration guide published

### Release
- [ ] Build production: `pnpm run build`
- [ ] Package: `pnpm run package`
- [ ] Test installation locally
- [ ] Create GitHub release
- [ ] Publish to marketplace: `vsce publish`

### Post-Release
- [ ] Monitor for errors (GitHub issues, logs)
- [ ] Update documentation site
- [ ] Announce on social media
- [ ] Support users migrating

---

## Quick Commands Reference

```bash
# Development
pnpm run watch              # Watch mode
pnpm run typecheck          # Check types
pnpm run build             # Build once

# Testing
pnpm test                   # Run tests
pnpm run test:watch         # Watch tests

# Deployment
pnpm run package            # Create .vsix
vsce publish               # Publish to marketplace

# Debugging
code --inspect-extensions=9229    # Debug extension
code --disable-extensions         # Start without extensions
code --verbose                    # Verbose logging
```

---

## Important File Locations

**Roo-Code Fork**:
- Provider: `src/api/providers/oropendola.ts`
- Auth Service: `packages/cloud/src/OropendolaAuthService.ts`
- Settings Service: `packages/cloud/src/OropendolaSettingsService.ts`
- Extension Entry: `src/extension.ts`
- Types: `packages/types/src/`

**Original Oropendola** (for reference):
- Agent Client: `src/api/agent-client.js`
- OAuth Flow: `src/sidebar/sidebar-provider.js`
- Subscription: `src/api/user-api-client.js`
- UI Components: `webview-ui/src/components/`

---

## Timeline at a Glance

| Day | Task | Hours | Deliverable |
|-----|------|-------|-------------|
| **W1D1** | Fork & setup | 2h | Working dev environment |
| **W1D2** | Provider skeleton | 4h | OropendolaHandler created |
| **W1D3** | Provider implementation | 6h | Agent Mode API working |
| **W1D4** | Provider testing | 4h | Streaming works |
| **W1D5** | Provider polish | 4h | Error handling complete |
| **W2D1** | Auth service skeleton | 4h | OropendolaAuthService created |
| **W2D2** | OAuth implementation | 6h | OAuth flow working |
| **W2D3** | CloudService integration | 4h | Auth integrated |
| **W2D4** | URI handler | 3h | Callback works |
| **W2D5** | Auth testing | 3h | Sign-in/out works |
| **W3D1** | Settings service | 4h | OropendolaSettingsService created |
| **W3D2** | Subscription API | 4h | Subscription fetching works |
| **W3D3** | UI components | 6h | Banner/quota display |
| **W3D4** | Settings testing | 3h | All settings work |
| **W3D5** | Buffer/polish | 3h | Edge cases handled |
| **W4D1** | Branding | 4h | All strings/icons updated |
| **W4D2** | Migration script | 5h | Auto-migration works |
| **W4D3** | E2E testing | 6h | Full flow tested |
| **W4D4** | Documentation | 4h | Guides complete |
| **W4D5** | Deployment | 3h | Published! |

**Total**: ~84 hours (~2 weeks full-time, or 4 weeks part-time)

---

## Success Criteria

✅ **Migration Complete When**:

1. OropendolaHandler provider works
2. OAuth sign-in works
3. Session persists across reloads
4. Subscription data displays
5. AI requests stream correctly
6. All user data migrated
7. Can switch between providers
8. Old extension users migrated successfully
9. Extension published to marketplace
10. Documentation complete

---

## Need Help?

**Stuck on something?** Check:

1. This quick reference
2. Full migration guide (MIGRATION_GUIDE_ROO_CODE_FORK.md)
3. Analysis document (ANALYSIS_OROPENDOLA_VS_ROO_CODE.md)
4. Roo-Code source code in /tmp/Roo-Code
5. Original Oropendola code in /Users/sammishthundiyil/oropendola

**Still stuck?** Ask Claude! I'm here to help with:
- Implementation details
- Debugging issues
- Code review
- Testing strategies
- Deployment problems

---

**Ready to start?**

Week 1, Day 1, Step 1:
```bash
cd /tmp
git clone https://github.com/RooVetGit/Roo-Code.git
```

Let's do this! 🚀
