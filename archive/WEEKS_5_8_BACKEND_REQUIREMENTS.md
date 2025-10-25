# Weeks 5-8: Backend API Requirements Analysis

**Date**: 2025-10-24
**Backend**: https://oropendola.ai/
**Framework**: Frappe Framework + MariaDB

---

## Executive Summary

This document outlines all backend API requirements for Weeks 5-8 features:
- ~~Week 5: Multi-LLM Providers~~ (SKIPPED per user request)
- **Week 6: Browser Automation** (Requires NEW backend development)
- **Week 7: Enhanced Terminal** (Requires MINIMAL backend development)
- **Week 8: Marketplace & Plugins** (Requires EXTENSIVE backend development)

**Recommendation**: Implement in order: Week 7 → Week 6 → Week 8

---

## Week 6: Browser Automation - Backend Requirements

### Overview
Browser automation allows AI to interact with web pages: navigate, click, fill forms, extract data, take screenshots.

### Backend Needs: ⚠️ EXTENSIVE (NEW Infrastructure Required)

#### 1. Browser Automation Engine (Server-Side)
**Why Backend?**: Running browsers client-side has limitations (security, resources, headless mode)

**Requirements**:
- Install Puppeteer or Playwright on backend server
- Chromium/Chrome installation on server
- Session management (multiple concurrent browser sessions)
- Resource limits (memory, CPU per session)

#### 2. Required Backend APIs

##### A. Session Management APIs

```
POST /api/method/ai_assistant.api.browser.create_session
Description: Create new browser session
Request:
{
  "user_id": "string",
  "session_name": "string (optional)",
  "headless": true,
  "viewport": {"width": 1920, "height": 1080}
}
Response:
{
  "session_id": "uuid",
  "status": "active",
  "created_at": "timestamp"
}
```

```
DELETE /api/method/ai_assistant.api.browser.close_session
Description: Close browser session
Request:
{
  "session_id": "uuid"
}
Response:
{
  "success": true
}
```

```
GET /api/method/ai_assistant.api.browser.list_sessions
Description: List all active sessions for user
Response:
{
  "sessions": [
    {
      "session_id": "uuid",
      "session_name": "string",
      "status": "active",
      "created_at": "timestamp",
      "last_activity": "timestamp"
    }
  ]
}
```

##### B. Navigation APIs

```
POST /api/method/ai_assistant.api.browser.navigate
Description: Navigate to URL
Request:
{
  "session_id": "uuid",
  "url": "string",
  "wait_until": "load|domcontentloaded|networkidle" (default: "load")
}
Response:
{
  "success": true,
  "final_url": "string",
  "title": "string",
  "status_code": 200
}
```

```
POST /api/method/ai_assistant.api.browser.go_back
POST /api/method/ai_assistant.api.browser.go_forward
POST /api/method/ai_assistant.api.browser.reload
Description: Browser navigation controls
Request:
{
  "session_id": "uuid"
}
Response:
{
  "success": true,
  "current_url": "string"
}
```

##### C. Interaction APIs

```
POST /api/method/ai_assistant.api.browser.click
Description: Click element
Request:
{
  "session_id": "uuid",
  "selector": "string (CSS selector)",
  "wait_for_selector": true,
  "timeout": 5000
}
Response:
{
  "success": true,
  "element_found": true
}
```

```
POST /api/method/ai_assistant.api.browser.type
Description: Type text into input
Request:
{
  "session_id": "uuid",
  "selector": "string",
  "text": "string",
  "delay": 100 (ms between keystrokes)
}
Response:
{
  "success": true
}
```

```
POST /api/method/ai_assistant.api.browser.select
Description: Select dropdown option
Request:
{
  "session_id": "uuid",
  "selector": "string",
  "value": "string|string[]"
}
Response:
{
  "success": true,
  "selected_values": ["string"]
}
```

##### D. Data Extraction APIs

```
POST /api/method/ai_assistant.api.browser.get_content
Description: Get page content (HTML, text, or specific elements)
Request:
{
  "session_id": "uuid",
  "type": "html|text|innerText",
  "selector": "string (optional, for specific elements)"
}
Response:
{
  "content": "string",
  "length": 12345
}
```

```
POST /api/method/ai_assistant.api.browser.evaluate
Description: Execute JavaScript in browser context
Request:
{
  "session_id": "uuid",
  "script": "string (JavaScript code)",
  "args": [] (optional arguments)
}
Response:
{
  "result": "any (JSON serializable)",
  "type": "string|number|boolean|object|array"
}
```

```
POST /api/method/ai_assistant.api.browser.extract_data
Description: Extract structured data using selectors
Request:
{
  "session_id": "uuid",
  "selectors": {
    "title": "h1.title",
    "price": ".price-value",
    "images": "img.product-image@src[]"
  }
}
Response:
{
  "data": {
    "title": "Product Name",
    "price": "$99.99",
    "images": ["url1", "url2"]
  }
}
```

##### E. Screenshot & PDF APIs

```
POST /api/method/ai_assistant.api.browser.screenshot
Description: Take screenshot
Request:
{
  "session_id": "uuid",
  "full_page": false,
  "selector": "string (optional, screenshot specific element)",
  "format": "png|jpeg",
  "quality": 80 (for jpeg)
}
Response:
{
  "file_id": "uuid",
  "file_url": "/api/method/ai_assistant.api.browser.get_file?file_id=uuid",
  "size_bytes": 123456,
  "dimensions": {"width": 1920, "height": 1080}
}
```

```
POST /api/method/ai_assistant.api.browser.generate_pdf
Description: Generate PDF of page
Request:
{
  "session_id": "uuid",
  "format": "A4|Letter",
  "print_background": true,
  "margin": {"top": "1cm", "right": "1cm", "bottom": "1cm", "left": "1cm"}
}
Response:
{
  "file_id": "uuid",
  "file_url": "/api/method/ai_assistant.api.browser.get_file?file_id=uuid",
  "size_bytes": 234567
}
```

```
GET /api/method/ai_assistant.api.browser.get_file
Description: Download screenshot/PDF
Query Params:
{
  "file_id": "uuid"
}
Response: Binary file (image/png, image/jpeg, or application/pdf)
```

##### F. Advanced Features APIs

```
POST /api/method/ai_assistant.api.browser.wait_for
Description: Wait for condition
Request:
{
  "session_id": "uuid",
  "type": "selector|function|timeout|navigation",
  "value": "string|number",
  "timeout": 30000
}
Response:
{
  "success": true,
  "waited_ms": 1234
}
```

```
POST /api/method/ai_assistant.api.browser.set_cookies
GET /api/method/ai_assistant.api.browser.get_cookies
DELETE /api/method/ai_assistant.api.browser.clear_cookies
Description: Cookie management
```

```
POST /api/method/ai_assistant.api.browser.set_headers
Description: Set custom HTTP headers
```

```
POST /api/method/ai_assistant.api.browser.intercept_requests
Description: Intercept and modify network requests
```

#### 3. Backend Infrastructure Requirements

**Server Requirements**:
- Install Node.js (for Puppeteer/Playwright)
- Install Chromium/Chrome browser
- Sufficient RAM (500MB-1GB per browser session)
- CPU resources for rendering

**Python Implementation** (Frappe backend):
```python
# Option 1: Use pyppeteer (Python port of Puppeteer)
# pip install pyppeteer

# Option 2: Use playwright-python
# pip install playwright
# playwright install chromium

# Option 3: Call Node.js Puppeteer via subprocess (hybrid approach)
```

**Frappe DocTypes Needed**:
1. **Browser Session** DocType
   - session_id (unique)
   - user_id
   - session_name
   - status (active, closed, timeout)
   - created_at
   - last_activity
   - browser_context (JSON)

2. **Browser File** DocType
   - file_id (unique)
   - session_id
   - file_type (screenshot, pdf)
   - file_path
   - file_size
   - created_at

**Storage**:
- Store screenshots/PDFs temporarily (24-48 hour retention)
- File size limits (10MB per screenshot, 50MB per PDF)

**Security**:
- Rate limiting (prevent abuse)
- Session timeout (30 minutes idle)
- Max sessions per user (5 concurrent)
- URL whitelist/blacklist (optional)
- Sandbox execution environment

#### 4. Implementation Complexity: HIGH

**Estimated Backend Development Time**: 2-3 weeks
- Puppeteer/Playwright setup: 2-3 days
- API endpoints: 1 week
- Session management: 3-4 days
- File storage/cleanup: 2 days
- Testing & security: 3-4 days

---

## Week 7: Enhanced Terminal - Backend Requirements

### Overview
Enhanced terminal provides AI-powered command suggestions, history management, output parsing.

### Backend Needs: ✅ MINIMAL (Mostly Client-Side)

#### 1. Optional Backend APIs (Recommended but not required)

##### A. Command History APIs (Cloud Sync)

```
POST /api/method/ai_assistant.api.terminal.save_command
Description: Save command to cloud history
Request:
{
  "user_id": "string",
  "workspace_id": "string",
  "command": "string",
  "exit_code": 0,
  "duration_ms": 1234,
  "timestamp": "ISO datetime"
}
Response:
{
  "id": "uuid",
  "saved": true
}
```

```
GET /api/method/ai_assistant.api.terminal.get_history
Description: Get command history
Query Params:
{
  "user_id": "string",
  "workspace_id": "string (optional)",
  "limit": 100,
  "offset": 0
}
Response:
{
  "commands": [
    {
      "id": "uuid",
      "command": "git commit -m 'fix'",
      "exit_code": 0,
      "duration_ms": 1234,
      "timestamp": "ISO datetime"
    }
  ],
  "total": 500
}
```

```
DELETE /api/method/ai_assistant.api.terminal.clear_history
Description: Clear command history
Request:
{
  "user_id": "string",
  "workspace_id": "string (optional)"
}
Response:
{
  "deleted_count": 123
}
```

##### B. Command Suggestion APIs (AI-Powered)

```
POST /api/method/ai_assistant.api.terminal.suggest_command
Description: Get AI command suggestions based on natural language
Request:
{
  "user_id": "string",
  "prompt": "string (e.g., 'find all JavaScript files modified today')",
  "context": {
    "cwd": "/path/to/dir",
    "shell": "bash|zsh|powershell",
    "os": "linux|darwin|win32"
  },
  "recent_commands": ["git status", "npm test"]
}
Response:
{
  "suggestions": [
    {
      "command": "find . -name '*.js' -mtime -1",
      "explanation": "Find all .js files modified in the last 24 hours",
      "confidence": 0.95
    }
  ]
}
```

```
POST /api/method/ai_assistant.api.terminal.explain_command
Description: Explain what a command does
Request:
{
  "command": "string (e.g., 'tar -xzvf file.tar.gz')"
}
Response:
{
  "explanation": "Extract (x) a gzipped (z) tarball (f) with verbose output (v)",
  "breakdown": [
    {"flag": "-x", "meaning": "extract"},
    {"flag": "-z", "meaning": "decompress with gzip"},
    {"flag": "-v", "meaning": "verbose output"},
    {"flag": "-f", "meaning": "specify filename"}
  ]
}
```

```
POST /api/method/ai_assistant.api.terminal.fix_command
Description: Fix command errors
Request:
{
  "command": "string (command that failed)",
  "error": "string (error message)",
  "exit_code": 1
}
Response:
{
  "fixed_command": "string",
  "explanation": "string (what was wrong and how it's fixed)"
}
```

##### C. Output Analysis APIs (Optional)

```
POST /api/method/ai_assistant.api.terminal.analyze_output
Description: Analyze command output with AI
Request:
{
  "command": "string",
  "output": "string (stdout + stderr)",
  "exit_code": 0
}
Response:
{
  "summary": "Command succeeded. Installed 23 packages.",
  "warnings": ["peer dependency warning"],
  "errors": [],
  "suggestions": ["Run 'npm audit' to check for vulnerabilities"]
}
```

#### 2. Backend Infrastructure Requirements

**Frappe DocTypes Needed** (Optional):
1. **Terminal Command History** DocType
   - user_id
   - workspace_id
   - command
   - exit_code
   - duration_ms
   - timestamp

**AI Integration**:
- Use existing LLM backend at https://oropendola.ai/
- No new AI infrastructure needed
- Reuse existing chat/completion endpoints

**Storage**:
- Command history: ~100 bytes per command
- Retention: 90 days (configurable)

#### 3. Implementation Complexity: LOW

**Estimated Backend Development Time**: 3-5 days
- Command history APIs: 2 days
- AI suggestion endpoints: 2 days
- Testing: 1 day

**Note**: Enhanced terminal can work 100% client-side without backend. Backend APIs are optional for:
- Cloud sync across devices
- AI-powered suggestions (if client-side AI is not feasible)
- Analytics

---

## Week 8: Marketplace & Plugins - Backend Requirements

### Overview
Plugin marketplace for discovering, installing, and managing extensions/themes/snippets.

### Backend Needs: 🚨 EXTENSIVE (New Infrastructure Required)

#### 1. Core Marketplace APIs

##### A. Plugin Management APIs

```
POST /api/method/ai_assistant.api.marketplace.publish_plugin
Description: Publish new plugin or update existing
Request:
{
  "name": "string",
  "display_name": "string",
  "version": "string (semver)",
  "description": "string",
  "author": "string",
  "repository": "string (git URL)",
  "homepage": "string",
  "license": "string",
  "keywords": ["string"],
  "categories": ["theme", "snippet", "extension"],
  "readme": "string (markdown)",
  "changelog": "string (markdown)",
  "icon_url": "string",
  "screenshots": ["string (URLs)"],
  "main": "string (entry point file)",
  "contributes": {
    "commands": [],
    "themes": [],
    "snippets": []
  },
  "engines": {
    "vscode": "^1.80.0",
    "oropendola": "^3.0.0"
  },
  "dependencies": {},
  "file_data": "base64 encoded .vsix file or zip"
}
Response:
{
  "plugin_id": "uuid",
  "name": "string",
  "version": "string",
  "status": "published|pending_review",
  "download_url": "string"
}
```

```
GET /api/method/ai_assistant.api.marketplace.get_plugin
Description: Get plugin details
Query Params:
{
  "plugin_id": "uuid"
  OR
  "name": "string"
}
Response:
{
  "plugin_id": "uuid",
  "name": "string",
  "display_name": "string",
  "version": "string",
  "description": "string",
  "author": {
    "name": "string",
    "email": "string",
    "avatar_url": "string"
  },
  "downloads": 12345,
  "rating": 4.7,
  "rating_count": 234,
  "versions": [
    {"version": "1.2.0", "published_at": "timestamp"},
    {"version": "1.1.0", "published_at": "timestamp"}
  ],
  "readme": "string (markdown)",
  "changelog": "string (markdown)",
  "icon_url": "string",
  "screenshots": ["string"],
  "tags": ["string"],
  "categories": ["string"],
  "license": "MIT",
  "repository": "github.com/user/repo",
  "homepage": "https://...",
  "dependencies": {},
  "file_size": 123456,
  "published_at": "timestamp",
  "updated_at": "timestamp"
}
```

```
GET /api/method/ai_assistant.api.marketplace.search_plugins
Description: Search plugins
Query Params:
{
  "query": "string (optional)",
  "category": "theme|snippet|extension (optional)",
  "tags": "tag1,tag2 (optional)",
  "sort": "downloads|rating|recent|name",
  "limit": 20,
  "offset": 0
}
Response:
{
  "plugins": [
    {
      "plugin_id": "uuid",
      "name": "string",
      "display_name": "string",
      "version": "string",
      "description": "string",
      "author": "string",
      "downloads": 12345,
      "rating": 4.7,
      "icon_url": "string",
      "categories": ["string"],
      "tags": ["string"]
    }
  ],
  "total": 567,
  "limit": 20,
  "offset": 0
}
```

```
GET /api/method/ai_assistant.api.marketplace.get_featured
Description: Get featured/trending plugins
Response:
{
  "featured": [...plugins...],
  "trending": [...plugins...],
  "new": [...plugins...]
}
```

```
DELETE /api/method/ai_assistant.api.marketplace.unpublish_plugin
Description: Unpublish plugin (author only)
Request:
{
  "plugin_id": "uuid"
}
Response:
{
  "success": true
}
```

##### B. Plugin Download APIs

```
GET /api/method/ai_assistant.api.marketplace.download_plugin
Description: Download plugin file
Query Params:
{
  "plugin_id": "uuid",
  "version": "string (optional, defaults to latest)"
}
Response: Binary file (.vsix or .zip)
Headers:
  Content-Type: application/octet-stream
  Content-Disposition: attachment; filename="plugin-name-1.2.0.vsix"
```

```
POST /api/method/ai_assistant.api.marketplace.increment_download
Description: Track download count
Request:
{
  "plugin_id": "uuid",
  "version": "string"
}
Response:
{
  "success": true,
  "total_downloads": 12346
}
```

##### C. Reviews & Ratings APIs

```
POST /api/method/ai_assistant.api.marketplace.submit_review
Description: Submit plugin review
Request:
{
  "plugin_id": "uuid",
  "rating": 5,
  "title": "string",
  "comment": "string",
  "version": "string (version being reviewed)"
}
Response:
{
  "review_id": "uuid",
  "created_at": "timestamp"
}
```

```
GET /api/method/ai_assistant.api.marketplace.get_reviews
Description: Get plugin reviews
Query Params:
{
  "plugin_id": "uuid",
  "sort": "helpful|recent|rating",
  "limit": 10,
  "offset": 0
}
Response:
{
  "reviews": [
    {
      "review_id": "uuid",
      "user": {
        "name": "string",
        "avatar_url": "string"
      },
      "rating": 5,
      "title": "string",
      "comment": "string",
      "version": "string",
      "helpful_count": 23,
      "created_at": "timestamp",
      "updated_at": "timestamp"
    }
  ],
  "total": 234,
  "average_rating": 4.7
}
```

```
POST /api/method/ai_assistant.api.marketplace.mark_review_helpful
Description: Mark review as helpful
Request:
{
  "review_id": "uuid"
}
Response:
{
  "success": true,
  "helpful_count": 24
}
```

```
PUT /api/method/ai_assistant.api.marketplace.update_review
DELETE /api/method/ai_assistant.api.marketplace.delete_review
Description: Update/delete own review
```

##### D. User Library APIs

```
POST /api/method/ai_assistant.api.marketplace.install_plugin
Description: Track installed plugins for user
Request:
{
  "plugin_id": "uuid",
  "version": "string"
}
Response:
{
  "success": true
}
```

```
GET /api/method/ai_assistant.api.marketplace.get_installed
Description: Get user's installed plugins (for sync)
Response:
{
  "plugins": [
    {
      "plugin_id": "uuid",
      "name": "string",
      "version": "string",
      "installed_at": "timestamp",
      "enabled": true
    }
  ]
}
```

```
POST /api/method/ai_assistant.api.marketplace.sync_plugins
Description: Sync installed plugins across devices
Request:
{
  "plugins": [
    {
      "plugin_id": "uuid",
      "version": "string",
      "enabled": true
    }
  ]
}
Response:
{
  "synced": true
}
```

##### E. Plugin Analytics APIs

```
POST /api/method/ai_assistant.api.marketplace.track_event
Description: Track plugin usage events
Request:
{
  "plugin_id": "uuid",
  "event_type": "activated|deactivated|command_used|error",
  "metadata": {}
}
Response:
{
  "success": true
}
```

```
GET /api/method/ai_assistant.api.marketplace.get_analytics
Description: Get plugin analytics (author only)
Query Params:
{
  "plugin_id": "uuid",
  "start_date": "ISO date",
  "end_date": "ISO date"
}
Response:
{
  "downloads": {"2025-10-01": 123, "2025-10-02": 145, ...},
  "active_users": 5678,
  "ratings_distribution": {"5": 100, "4": 50, "3": 20, "2": 5, "1": 2},
  "top_commands": [{"command": "foo", "uses": 1234}]
}
```

#### 2. Backend Infrastructure Requirements

**Frappe DocTypes Needed**:

1. **Plugin** DocType
   - plugin_id (unique)
   - name (unique)
   - display_name
   - version (current)
   - description
   - author (Link to User)
   - status (published, pending, rejected, unpublished)
   - downloads
   - rating_average
   - rating_count
   - readme (Text)
   - changelog (Text)
   - icon (Attach)
   - categories (Table MultiSelect)
   - tags (Table)
   - license
   - repository
   - homepage
   - file_path (path to .vsix file)
   - file_size
   - file_hash (SHA256)
   - metadata (JSON)
   - published_at
   - updated_at

2. **Plugin Version** DocType (Child of Plugin)
   - version (semver)
   - file_path
   - file_size
   - file_hash
   - changelog
   - downloads
   - published_at

3. **Plugin Review** DocType
   - review_id (unique)
   - plugin_id (Link to Plugin)
   - user (Link to User)
   - rating (1-5)
   - title
   - comment (Text)
   - version
   - helpful_count
   - created_at
   - updated_at

4. **Plugin Install** DocType (User's installed plugins)
   - user (Link to User)
   - plugin_id (Link to Plugin)
   - version
   - enabled
   - installed_at
   - last_used_at

5. **Plugin Analytics Event** DocType
   - plugin_id (Link to Plugin)
   - user (Link to User - optional, anonymous)
   - event_type
   - metadata (JSON)
   - timestamp

**Storage Requirements**:
- Plugin files (.vsix): 1-50MB per plugin
- Retention: Permanent (all versions)
- Total estimate: 10-100GB (for 1000 plugins)

**File System Structure**:
```
/files/marketplace/
  /{plugin_name}/
    /1.0.0/
      plugin-name-1.0.0.vsix
      icon.png
      screenshots/
    /1.1.0/
      plugin-name-1.1.0.vsix
```

**Search & Indexing**:
- Full-text search on plugin name, description, tags
- Elasticsearch integration (optional for better search)
- Filtering by category, tags, ratings, downloads

**Security**:
- Plugin validation (scan for malicious code)
- Author verification
- Review moderation
- Rate limiting on uploads
- File size limits (50MB per plugin)
- Version control (prevent downgrade attacks)

**CDN Integration** (Optional but recommended):
- Serve plugin files via CDN for faster downloads
- Cache plugin metadata
- Geographic distribution

#### 3. Implementation Complexity: VERY HIGH

**Estimated Backend Development Time**: 4-6 weeks
- Frappe DocTypes & schemas: 1 week
- Plugin publishing APIs: 1 week
- Search & discovery: 1 week
- Reviews & ratings: 3-4 days
- Analytics: 3-4 days
- File storage & CDN: 3-4 days
- Security & validation: 1 week
- Testing: 1 week

---

## Summary: Backend Development Requirements

| Feature | Backend Complexity | APIs Needed | Infrastructure | Dev Time |
|---------|-------------------|-------------|----------------|----------|
| **Week 5: Multi-LLM** | N/A | N/A | N/A | SKIPPED |
| **Week 6: Browser Automation** | ⚠️ HIGH | 20+ endpoints | Puppeteer/Playwright, Session mgmt, File storage | 2-3 weeks |
| **Week 7: Enhanced Terminal** | ✅ LOW | 5-8 endpoints (optional) | Command history storage | 3-5 days |
| **Week 8: Marketplace** | 🚨 VERY HIGH | 25+ endpoints | DocTypes, File storage, Search, CDN | 4-6 weeks |

---

## Recommended Implementation Order

### Priority 1: Week 7 - Enhanced Terminal ✅
**Why First?**
- Minimal backend requirements
- Can work 100% client-side
- Quick win (3-5 days backend work)
- High user value

**Backend Needs**:
- Optional command history sync (3 days)
- Optional AI command suggestions (2 days)
- Can use existing LLM backend

### Priority 2: Week 6 - Browser Automation ⚠️
**Why Second?**
- Moderate complexity
- Requires new infrastructure (Puppeteer)
- High user value for web scraping/testing
- Independent feature (doesn't depend on others)

**Backend Needs**:
- Puppeteer/Playwright setup (3-4 days)
- Session management (3-4 days)
- 20+ API endpoints (1 week)
- File storage for screenshots (2 days)

### Priority 3: Week 8 - Marketplace & Plugins 🚨
**Why Last?**
- Most complex backend work
- Requires extensive infrastructure
- Can be phased (MVP → Full features)
- Less urgent than automation features

**Backend Needs**:
- 5 new DocTypes
- 25+ API endpoints
- File storage & CDN
- Search infrastructure
- Security & validation
- 4-6 weeks development time

**Alternative**: Consider using existing VS Code Marketplace initially, then build custom marketplace in future.

---

## Backend Development Checklist

### Week 6: Browser Automation
- [ ] Install Puppeteer/Playwright on backend server
- [ ] Install Chromium/Chrome browser
- [ ] Create Browser Session DocType
- [ ] Create Browser File DocType
- [ ] Implement session management (create, close, list, cleanup)
- [ ] Implement navigation APIs (navigate, back, forward, reload)
- [ ] Implement interaction APIs (click, type, select)
- [ ] Implement extraction APIs (get_content, evaluate, extract_data)
- [ ] Implement screenshot API with file storage
- [ ] Implement PDF generation API
- [ ] Implement wait/cookie/header APIs
- [ ] Add rate limiting & security
- [ ] Add session timeout & cleanup (cron job)
- [ ] Add file cleanup (24-hour retention)
- [ ] Write tests for all endpoints
- [ ] Deploy to production server

### Week 7: Enhanced Terminal (Optional Backend)
- [ ] Create Terminal Command History DocType
- [ ] Implement save_command API
- [ ] Implement get_history API with pagination
- [ ] Implement clear_history API
- [ ] Implement suggest_command API (AI-powered)
- [ ] Implement explain_command API
- [ ] Implement fix_command API
- [ ] Add retention policy (90 days)
- [ ] Write tests
- [ ] Deploy to production

### Week 8: Marketplace & Plugins
- [ ] Create Plugin DocType
- [ ] Create Plugin Version DocType
- [ ] Create Plugin Review DocType
- [ ] Create Plugin Install DocType
- [ ] Create Plugin Analytics Event DocType
- [ ] Set up file storage for .vsix files
- [ ] Implement publish_plugin API with validation
- [ ] Implement get_plugin API
- [ ] Implement search_plugins API with full-text search
- [ ] Implement get_featured API
- [ ] Implement download_plugin API
- [ ] Implement review submission APIs
- [ ] Implement get_reviews API with sorting
- [ ] Implement install tracking APIs
- [ ] Implement sync_plugins API
- [ ] Implement analytics APIs
- [ ] Add plugin validation (security scanning)
- [ ] Add review moderation
- [ ] Set up CDN (optional)
- [ ] Add rate limiting
- [ ] Write comprehensive tests
- [ ] Deploy to production

---

## Questions for Backend Team

1. **Browser Automation**:
   - Do you prefer Puppeteer (Node.js) or Playwright-Python?
   - What are server resource limits (RAM/CPU for browser sessions)?
   - Should we implement request interception?
   - What's the preferred screenshot storage solution?

2. **Enhanced Terminal**:
   - Should command history be stored on backend or client-side?
   - Can we reuse existing LLM endpoints for command suggestions?
   - What's the command history retention policy?

3. **Marketplace**:
   - Should we build custom marketplace or integrate with VS Code Marketplace?
   - Do we need plugin approval/moderation workflow?
   - What's the file storage budget for plugins?
   - Should we use CDN for plugin downloads?
   - Do we need Elasticsearch for search, or is MariaDB full-text search sufficient?

4. **General**:
   - What's the priority order? (I recommend: Week 7 → Week 6 → Week 8)
   - What's the timeline for backend development?
   - Who will handle backend implementation?

---

## Next Steps

1. **Review this document** and confirm backend development scope
2. **Prioritize features** (recommend Week 7 → Week 6 → Week 8)
3. **Assign backend development** resources/timeline
4. **Start with Week 7** (minimal backend work, can be done in parallel with frontend)
5. **Proceed to Week 6** after Week 7 backend is ready
6. **Consider phased approach for Week 8**:
   - Phase 1: Basic plugin publishing & installation
   - Phase 2: Search & discovery
   - Phase 3: Reviews & ratings
   - Phase 4: Analytics & advanced features

---

**Document Status**: Ready for Review
**Last Updated**: 2025-10-24
**Contact**: Backend team for questions/clarifications
