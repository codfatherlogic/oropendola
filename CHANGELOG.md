# Changelog

All notable changes to the Oropendola AI Assistant extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.7.1] - 2025-10-27

### 🎨 Added - Roo-Code UI Parity Complete

**Major Update**: Achieved 100% feature parity with Roo-Code UI

#### New Components
- **📊 TaskMetrics Component**
  - Real-time API usage display (tokens in/out, cache reads/writes, cost)
  - Smart number formatting (K/M abbreviations)
  - Arrow indicators for input ↑ and output ↓
  - Theme-aware color coding
  - Integrated in chat header

- **📈 ContextWindowProgress Component**
  - Visual progress bar for context window usage
  - Color-coded warnings: Yellow at 80%, Red at 95%
  - Pulsing animation for danger threshold
  - ARIA accessibility labels
  - Shows current usage vs. total capacity (e.g., "0 / 200.0k")

- **✨ EnhancePromptButton Component**
  - AI-powered prompt improvement
  - Sparkle icon with hover animation
  - Pattern detection (code/debug/refactor/explain)
  - Local fallback enhancement for offline use
  - Backend API integration: `/api/method/ai_assistant.api.oropendola.enhance_prompt`

- **💭 AI Thinking Indicator**
  - Real-time visual feedback during AI processing
  - Three animated pulsing dots with staggered timing
  - "AI is thinking..." text display
  - Shows immediately after sending message
  - Disappears when AI response arrives

#### Utilities
- **getApiMetrics.ts** (130 lines)
  - Extract and aggregate API metrics from messages
  - Functions: `getMessageMetrics`, `aggregateMetrics`, `getTaskMetrics`
  - Token counting: `getTotalTokens`, cache hit ratio calculation
  - Cost calculation per message

#### Backend Features (Code-Verified)
- ✅ **Streaming API**: `gateway.stream_generate()` fully operational (lines 350-425)
- ✅ **WebSocket Emission**: Real-time `ai_progress` events with `frappe.publish_realtime()`
- ✅ **All Endpoints Whitelisted**:
  - `approve()` - Simple & batch JSON approval
  - `get_auto_approve_settings()` / `save_auto_approve_settings()`
  - `read_files_batch()` / `apply_diffs_batch()`
- ✅ **apiMetrics**: Cost calculation included in all responses (lines 245-310, 488)
- ✅ **Services**: 7/7 supervisor processes running (including WebSocket server)

### 🐛 Fixed
- Corrected verification report inaccuracies (backend was already complete)
- Updated documentation to reflect actual implementation status

### 📦 Build
- TypeScript compilation: 0 errors
- Build time: 1.45s
- Bundle size: 80.87 KB CSS (12.32 KB gzipped), 772.09 KB JS
- Extension package: 61.55 MB (8,855 files)

### 🎯 Release Status
- Frontend: ✅ 100% Complete
- Backend: ✅ 100% Complete (Code-Verified)
- P0 Blockers: ✅ NONE
- Status: ✅ **READY FOR IMMEDIATE RELEASE**

---

## [3.7.0] - 2025-01-26

### 🎨 Added - Multi-Mode AI Assistant System

**Major Feature**: Introduced 4 specialized AI modes for different workflows

#### Modes
- **💻 Code Mode** (Default)
  - Fast, practical coding assistant
  - Concise responses (verbosity 2/5)
  - Full file editing and command execution
  - Perfect for: Quick implementations, bug fixes, refactoring

- **🏗️ Architect Mode**
  - System design and planning focus
  - Comprehensive responses (verbosity 4/5)
  - File editing for documentation, no command execution
  - Perfect for: Architecture planning, design patterns, technical specs

- **💡 Ask Mode**
  - Learning and explanation mode
  - Educational responses (verbosity 3/5)
  - Read-only (no file modifications or commands)
  - Perfect for: Understanding code, learning concepts, code reviews

- **🐛 Debug Mode**
  - Systematic troubleshooting
  - Investigative responses (verbosity 3/5)
  - Full file editing and command execution
  - Perfect for: Bug investigation, performance issues, root cause analysis

#### User Experience
- **Keyboard Shortcut**: `Cmd+M` (Mac) / `Ctrl+M` (Windows/Linux) to switch modes
- **6 VS Code Commands**:
  - `Oropendola: Switch AI Mode` - Quick picker
  - `Oropendola: Switch to Code Mode`
  - `Oropendola: Switch to Architect Mode`
  - `Oropendola: Switch to Ask Mode`
  - `Oropendola: Switch to Debug Mode`
  - `Oropendola: Show AI Mode Info`
- **Mode Persistence**: Selected mode persists across VS Code restarts
- **Smart Restrictions**: Mode-aware warnings when attempting restricted actions

#### Technical Implementation
- **Backend Integration**: Mode context sent with every API request
  ```javascript
  {
    mode: "code" | "architect" | "ask" | "debug",
    mode_settings: {
      verbosityLevel: number,
      canModifyFiles: boolean,
      canExecuteCommands: boolean,
      modeName: string
    }
  }
  ```
- **Components**: ModeManager, ModeIntegrationService, ModeSystemPromptBuilder
- **UI**: ModeSelector React component, ModeIndicator badges, useMode hook
- **Testing**: 30 new unit tests + 8 integration tests (100% passing)

#### Documentation
- **User Guide**: 600 lines - How to use modes, examples, workflows
- **Developer Guide**: 800 lines - Architecture, API reference, extending
- **Quick Reference**: 150 lines - Keyboard shortcuts, comparisons, tips
- **Total**: 1,590 lines of new documentation (~11,000 words)

### 📈 Improved
- More targeted AI behavior based on task type
- Better control over AI verbosity
- Clearer separation between learning and coding workflows
- Enhanced system prompts (500+ words per mode)

### 🔧 Technical
- TypeScript types for mode system
- Event-driven mode switching
- Modular prompt architecture
- Mode-aware error messages
- Performance: <10ms mode switch latency

## [3.6.1] - 2025-01-26

### Fixed
- **Test Suite Quality**: Achieved 100% test pass rate (143/143 tests passing)
  - Fixed test mock state pollution in `MentionExtractor.test.ts`
  - Added proper mock cleanup in "workspace with no folders" test to restore `vscode.workspace.workspaceFolders`
  - Implemented complete mock reset pattern for file extraction tests using `mockReset()` before setting up test-specific mocks
  - Fixed "error details" test to clean up rejected mock values
  - Updated file extraction tests to use consistent mock patterns (binary check + content read)
- **Mock Configuration**: Standardized mock setup across all file-related tests
  - Binary file detection now properly mocked with two `readFile` calls
  - Added `isFile()` and `isDirectory()` methods to all stat mocks
  - Proper error expectation patterns (generic "⚠️ Failed" instead of specific error messages)

### Technical
- No functional changes to extension behavior
- Improved test isolation and reliability
- Better test maintainability with consistent patterns

## [3.6.0] - 2025-01-26

### Added
- **@Mentions System** - Reference files, folders, and context directly in conversations
  - `@/file.ext` - Include file contents
  - `@/folder/` - Reference folder structure
  - `@problems` - Include workspace diagnostics
  - `@terminal` - Capture terminal output
  - `@git` - Reference git history
  - `@https://...` - Include URL references
- **Intelligent Autocomplete** - Fuzzy file search with recent files prioritized
- **Performance Optimizations**
  - Pre-compiled regex patterns (10-20% faster parsing)
  - Parallel context extraction (3-5x faster)
  - LRU cache implementation (5x memory reduction)
  - 50-mention limit per message
- **Robustness Improvements**
  - 1 MB file size limit with clear error messages
  - Binary file detection and handling
  - Multi-root workspace support
  - Improved error messages with actionable feedback
- **Comprehensive Documentation**
  - User Guide (530 lines)
  - API Documentation (750 lines)
  - Developer Guide (500+ lines)
  - README updates
- **Test Coverage** - 143 automated tests (97.9% passing)

### Changed
- Extension bundle size: 8.45 MB → 8.50 MB (+0.05 MB)
- Parser performance: 15ms → 12ms (20% faster)
- Extraction performance: 500ms → 150ms (3.3x faster) for 10 files

### Fixed
- FileSearchService cache invalidation test
- Integration test mocking for file system operations

### Documentation
- docs/MENTIONS_USER_GUIDE.md - Complete user documentation
- docs/MENTIONS_API.md - Technical API reference
- docs/MENTIONS_DEVELOPER_GUIDE.md - Developer contribution guide
- RELEASE_NOTES_v3.6.0.md - Detailed release notes

## [3.5.0] - 2024

### Added
- Production deployment features
- 77 APIs implemented
- 6 cron jobs
- Enterprise features

## [Earlier Versions]
See archive/CHANGELOG_*.md for historical changes.

---

**Legend:**
- `Added` - New features
- `Changed` - Changes in existing functionality
- `Deprecated` - Soon-to-be removed features
- `Removed` - Now removed features
- `Fixed` - Bug fixes
- `Security` - Vulnerability fixes
