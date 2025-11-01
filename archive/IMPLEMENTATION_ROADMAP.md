# Oropendola AI - Roo-Code Feature Parity Implementation Roadmap

## Project Overview
**Goal:** Achieve 95%+ feature parity with Roo-Code
**Timeline:** 20-27 weeks (5-7 months)
**Current Status:** ~60-70% feature parity
**Team Size:** 1-2 developers

---

## Phase 1: Core Functionality Enhancement (8-10 weeks)

### 1.1 Tool System Enhancements

#### 1.1.1 read_file Tool Enhancement (Week 1-2)
**Current:** Basic file reading (25 lines)
**Target:** Roo-Code level (750 lines)

**Priority Features:**
- [x] **P0 - Multi-file support** - Read multiple files in one call (HIGHEST VALUE)
  - Parse XML args format: `<args><file><path>...</path></file></args>`
  - Batch approval for multiple files
  - Individual file approval with checkboxes

- [x] **P0 - Line range support** - Read specific line ranges
  - Support `start_line` and `end_line` parameters
  - Support multiple ranges per file
  - Format: `<line_range>10-50</line_range>`

- [x] **P0 - Token budget validation** - Prevent context overflow
  - Calculate file size vs available context window
  - Auto-truncate large files with notice
  - Show first N lines + definitions when truncated

- [x] **P1 - Binary file handling**
  - Detect binary files (isBinaryFile)
  - Support images (PNG, JPG, GIF, WebP)
  - Support PDFs, DOCX, IPYNB extraction
  - Return data URLs for images (base64)

- [x] **P1 - Code definitions** - Show structure for large files
  - Extract functions/classes/methods using tree-sitter
  - Show definitions when file exceeds maxReadFileLine
  - Truncate definitions to match truncated content

- [x] **P2 - Streaming/partial support**
  - Real-time UI updates as file is being read
  - Show filename immediately, content streams in

- [x] **P2 - File context tracking**
  - Track which files were read (for context management)
  - Record source: read_tool, auto_context, etc.

- [x] **P2 - RooIgnore validation**
  - Respect .rooignore patterns
  - Block access to ignored files
  - Show helpful error message

**Implementation Steps:**
1. Create `/src/core/tools/readFileTool.js` (new architecture)
2. Implement multi-file XML parsing
3. Add line range support
4. Add token budget calculation (using tiktoken)
5. Add binary file detection
6. Add image processing (data URL encoding)
7. Integrate tree-sitter for code definitions
8. Add batch approval flow
9. Add file context tracking
10. Test with various file types

**Dependencies:**
- `isbinaryfile` - Binary file detection
- `tiktoken` or equivalent - Token counting
- Tree-sitter - Code parsing (already have?)
- Image libraries for encoding

**Estimated Time:** 1-2 weeks

---

#### 1.1.2 write_to_file Tool Enhancement (Week 2-3)
**Current:** Basic file writing
**Target:** Roo-Code level with diff view, streaming, validation

**Priority Features:**
- [x] **P0 - Diff view before saving**
  - Show side-by-side diff in VS Code
  - Scroll to first difference
  - Approve/reject from diff view

- [x] **P0 - Code omission detection**
  - Detect comments like "// rest of code unchanged"
  - Warn user about truncation
  - Suggest using apply_diff instead

- [x] **P0 - Streaming content updates**
  - Real-time content preview as AI generates
  - Progressive diff updates

- [x] **P1 - Line count validation**
  - Require `line_count` parameter
  - Validate actual vs predicted line count
  - Error if significantly different (truncation)

- [x] **P1 - Protected files**
  - Mark certain files as write-protected
  - Require force approval for protected files
  - Examples: package.json, tsconfig.json

- [x] **P2 - Line number stripping**
  - Auto-detect if content has line numbers
  - Strip line numbers before saving
  - Handle various line number formats

**Estimated Time:** 1 week

---

#### 1.1.3 execute_command Tool Enhancement (Week 3-4)
**Current:** Basic terminal command execution
**Target:** Shell integration, timeout, background execution

**Priority Features:**
- [x] **P0 - Shell integration**
  - Use VS Code's shell integration API
  - Get accurate exit codes
  - Capture full output reliably
  - Fallback to execa if shell integration unavailable

- [x] **P0 - Command timeout**
  - Configurable timeout per command
  - Allowlist for commands that should never timeout
  - Kill process on timeout with clear message

- [x] **P0 - Background execution**
  - Allow long-running commands in background
  - Provide PID for monitoring
  - Update UI when command completes
  - User can provide feedback while command runs

- [x] **P1 - Output compression**
  - Compress large terminal output
  - Configurable line limit (default: 500)
  - Configurable character limit
  - Smart truncation (keep beginning + end)

- [x] **P2 - Working directory support**
  - Custom `cwd` parameter
  - Validate cwd exists
  - Show cwd in command output

**Dependencies:**
- Terminal integration API
- Process management

**Estimated Time:** 1 week

---

#### 1.1.4 list_files Tool Implementation (Week 4-5)
**Current:** Not implemented
**Target:** Recursive file listing with filtering

**Features:**
- List files in directory
- Recursive option
- Respect .gitignore and .rooignore
- Filter by pattern
- Show file sizes
- Sort options

**Estimated Time:** 2-3 days

---

#### 1.1.5 search_files Tool Implementation (Week 5)
**Current:** Not implemented
**Target:** Regex/glob search across files

**Features:**
- Search file contents with regex
- Glob pattern matching
- Context lines (before/after)
- File type filtering
- Case-insensitive option
- Output modes: matches only, files only, count

**Estimated Time:** 2-3 days

---

#### 1.1.6 browser_action Tool Implementation (Week 6-7)
**Current:** Not implemented
**Target:** Browser automation using Playwright/Puppeteer

**Features:**
- Launch browser
- Navigate to URL
- Click elements (by coordinate or selector)
- Type text
- Screenshot capture
- Console log capture
- Network request monitoring

**Dependencies:**
- Playwright or Puppeteer
- Browser binaries

**Estimated Time:** 1 week

---

#### 1.1.7 generate_image Tool Implementation (Week 7)
**Current:** Not implemented
**Target:** Image generation using AI

**Features:**
- Generate images from text prompts
- Support multiple backends (DALL-E, Stable Diffusion, etc.)
- Save to file or return data URL
- Size options
- Style options

**Dependencies:**
- Image generation API access

**Estimated Time:** 2-3 days

---

#### 1.1.8 run_slash_command Tool Implementation (Week 7)
**Current:** May be partially implemented
**Target:** Execute custom slash commands

**Features:**
- Parse slash command syntax
- Load command from .claude/commands/
- Execute with arguments
- Return results

**Estimated Time:** 1-2 days

---

#### 1.1.9 Add Streaming/Partial Support to All Tools (Week 8)
**Goal:** Every tool supports real-time UI updates

**Tools to update:**
- apply_diff
- insert_content
- list_code_definition_names
- codebase_search
- update_todo_list
- All others

**Estimated Time:** 3-4 days

---

#### 1.1.10 Add File Context Tracking to All Tools (Week 8)
**Goal:** Track all file accesses for context management

**Implementation:**
- Create FileContextTracker class
- Track: file path, operation, timestamp, source
- Store in task storage
- Use for:
  - Showing relevant files in UI
  - Auto-including context in prompts
  - Analytics

**Estimated Time:** 2-3 days

---

### 1.2 Complete MCP (Model Context Protocol) Integration (Week 9-10)

**Current Status:** Partially implemented (use_mcp_tool, access_mcp_resource exist)

**Remaining Work:**
- [ ] MCP server discovery
- [ ] MCP server lifecycle management (start/stop/restart)
- [ ] MCP tool listing and documentation
- [ ] MCP resource listing
- [ ] MCP prompts support
- [ ] MCP sampling support
- [ ] Error handling and reconnection
- [ ] Configuration UI
- [ ] Built-in MCP servers (filesystem, git, database, etc.)

**Estimated Time:** 2 weeks

---

### 1.3 Implement Checkpoints/Time Travel Feature (Week 10-11)

**Current Status:** Tools exist (save_checkpoint, restore_checkpoint, list_checkpoints) but need full implementation

**Features:**
- [ ] Save conversation state to checkpoint
- [ ] Save file states (git commit or file copies)
- [ ] Restore conversation from checkpoint
- [ ] Restore file states
- [ ] List all checkpoints with metadata
- [ ] Auto-checkpoint before risky operations
- [ ] Checkpoint expiration/cleanup
- [ ] Checkpoint diff view

**Storage Options:**
- Option A: Git commits + metadata JSON
- Option B: Custom snapshot system

**Estimated Time:** 1 week

---

## Phase 2: Enhanced UX (6-8 weeks)

### 2.1 Build 35+ Settings UI Components (Week 12-15)

**Categories:**

#### Model Settings (8 components)
- [ ] Model selection dropdown
- [ ] API key input (with validation)
- [ ] Temperature slider
- [ ] Max tokens input
- [ ] Context window display
- [ ] Streaming toggle
- [ ] Cache control settings
- [ ] Cost tracking display

#### Tool Settings (10 components)
- [ ] Tool enable/disable toggles for each tool
- [ ] Auto-approval settings per tool
- [ ] Tool-specific configurations
- [ ] File size limits
- [ ] Line count limits
- [ ] Command timeout settings
- [ ] Command allowlist editor
- [ ] Browser automation settings
- [ ] Image generation settings
- [ ] MCP server configuration

#### UI/UX Settings (8 components)
- [ ] Theme selector
- [ ] Font size slider
- [ ] Syntax highlighting toggle
- [ ] Diff view preferences
- [ ] Notification preferences
- [ ] Sound effects toggle
- [ ] Panel position preferences
- [ ] Keyboard shortcuts editor

#### Workspace Settings (5 components)
- [ ] .rooignore editor
- [ ] Protected files list
- [ ] Auto-save preferences
- [ ] Git integration settings
- [ ] Workspace indexing settings

#### Advanced Settings (4+ components)
- [ ] Debug mode toggle
- [ ] Logging level selector
- [ ] Performance monitoring
- [ ] Experimental features
- [ ] Reset to defaults button

**Estimated Time:** 4 weeks

---

### 2.2 Implement Custom Prompts and Modes System (Week 16-18)

**Features:**
- [ ] Define custom modes (beyond default code/architect/ask/debug)
- [ ] Custom system prompts per mode
- [ ] Mode-specific tool availability
- [ ] Mode-specific settings
- [ ] Mode templates library
- [ ] Import/export modes
- [ ] Mode marketplace integration?

**UI:**
- [ ] Mode editor interface
- [ ] Prompt template editor with variables
- [ ] Mode selector in chat
- [ ] Quick mode switching

**Estimated Time:** 2-3 weeks

---

### 2.3 Add Advanced Code Indexing with Qdrant (Week 19-21)

**Current:** Basic semantic search may exist

**Target:**
- [ ] Vector database integration (Qdrant)
- [ ] Auto-index workspace on startup
- [ ] Incremental indexing on file changes
- [ ] Semantic code search with embeddings
- [ ] Search by functionality/concept, not just keywords
- [ ] Show similar code snippets
- [ ] Code deduplication detection
- [ ] Usage examples finding

**Dependencies:**
- Qdrant (vector database)
- Embedding model (OpenAI, local, or Anthropic)
- Chunking strategy for code files

**Estimated Time:** 3 weeks

---

## Phase 3: Advanced Features (4-6 weeks)

### 3.1 Implement Human Relay and Batch Operations (Week 22-23)

#### Human Relay
- [ ] Forward complex questions to human expert
- [ ] Wait for human response
- [ ] Continue task with human input
- [ ] Show relay status in UI

#### Batch Operations
- [ ] Execute multiple operations in parallel
- [ ] Progress tracking for batch
- [ ] Partial success handling
- [ ] Rollback on batch failure

**Estimated Time:** 1-2 weeks

---

### 3.2 Add Advanced Browser Automation (Week 24)

**Beyond basic browser_action:**
- [ ] Multi-page workflows
- [ ] Form filling automation
- [ ] Authentication handling
- [ ] Download management
- [ ] Screenshot comparison
- [ ] Visual regression testing
- [ ] Browser state persistence
- [ ] Headless vs headed mode

**Estimated Time:** 1 week

---

### 3.3 Implement Cloud Sync and Organizations (Week 25-27)

**Features:**
- [ ] Cloud storage for conversations
- [ ] Cross-device sync
- [ ] Team workspaces
- [ ] Shared conversation history
- [ ] Role-based access control
- [ ] Organization settings
- [ ] Usage analytics per org
- [ ] Billing integration

**Backend Requirements:**
- Database schema for organizations
- Authentication & authorization
- Sync protocol
- Conflict resolution

**Estimated Time:** 3 weeks

---

## Phase 4: Polish (2-3 weeks)

### 4.1 Build Welcome Flow (Week 27)
- [ ] First-time setup wizard
- [ ] API key configuration
- [ ] Model selection
- [ ] Tool preferences
- [ ] Example tasks
- [ ] Onboarding tutorial

**Estimated Time:** 3-4 days

---

### 4.2 Add Image Generation Support (Week 28)
- [ ] Integrate with DALL-E / Stable Diffusion
- [ ] Image editing support
- [ ] Inpainting/outpainting
- [ ] Style transfer
- [ ] Image-to-image

**Estimated Time:** 4-5 days

---

### 4.3 Implement Sound Notifications (Week 28)
- [ ] Sound on task completion
- [ ] Sound on approval required
- [ ] Sound on error
- [ ] Customizable sound pack
- [ ] Volume control
- [ ] Mute option

**Estimated Time:** 1-2 days

---

## Implementation Strategy

### Week-by-Week Breakdown

**Weeks 1-2:** Enhanced read_file tool
**Week 3:** Enhanced write_to_file tool
**Week 4:** Enhanced execute_command tool
**Week 5:** list_files + search_files tools
**Weeks 6-7:** browser_action + generate_image + run_slash_command
**Week 8:** Streaming support + file context tracking across all tools
**Weeks 9-10:** Complete MCP integration
**Weeks 10-11:** Checkpoints/Time Travel
**Weeks 12-15:** Settings UI (35+ components)
**Weeks 16-18:** Custom prompts and modes
**Weeks 19-21:** Advanced code indexing with Qdrant
**Weeks 22-23:** Human relay + batch operations
**Week 24:** Advanced browser automation
**Weeks 25-27:** Cloud sync + organizations
**Week 27-28:** Polish (welcome flow, image generation, sound)

---

## Risk Mitigation

### Technical Risks
1. **Complexity of tool enhancements** - Start with P0 features, iterate
2. **Qdrant integration challenges** - Use established libraries, test early
3. **Browser automation reliability** - Implement retry logic, error recovery
4. **Cloud sync conflicts** - Use proven conflict resolution algorithms

### Resource Risks
1. **Single developer bottleneck** - Prioritize ruthlessly, automate testing
2. **Dependencies on external services** - Have fallbacks (e.g., local vs cloud embeddings)

---

## Success Metrics

- **Feature Parity:** 95%+ of Roo-Code features implemented
- **Code Quality:** 80%+ test coverage on new code
- **Performance:** Tools respond within 200ms (excluding I/O)
- **User Satisfaction:** Positive feedback from beta testers
- **Stability:** <1% crash rate

---

## Next Steps

1. ✅ Create this roadmap document
2. 🔄 Start Phase 1.1.1 - Enhanced read_file tool
3. Set up automated testing framework
4. Create PR template with checklist
5. Weekly progress reviews

---

*Last Updated: 2025-11-01*
*Status: In Progress - Phase 1.1.1*
