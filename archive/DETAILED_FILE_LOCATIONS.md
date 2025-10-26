# Roo Code: Detailed File Locations & Implementation Reference

## TASK MANAGEMENT FEATURES

### Task Header & Actions
**File**: `/tmp/Roo-Code/webview-ui/src/components/chat/TaskHeader.tsx` (336 lines)
**Features**:
- Expandable/collapsible task display
- Context window progress visualization
- Token tracking (input/output/cache)
- Cost calculation and display
- Task metadata display (size, duration)
- Task actions (export, copy, delete, share, cloud)

**Key Functions**:
- `isTaskComplete()` - Determines if task is finished
- `TokenDistribution` calculation - Allocates tokens to context vs. reserved vs. available
- Expands to show: tokens used, cost, cache metrics, file size

**Oropendola Gap**: No task header display, no token tracking, no action buttons

---

### Task Actions
**File**: `/tmp/Roo-Code/webview-ui/src/components/chat/TaskActions.tsx` (70 lines)
**Features**:
- Export current task (downloads task data)
- Copy task prompt to clipboard
- Delete task with confirmation
- Share task (cloud integration)
- Upload to cloud

**Implementation Pattern**:
```typescript
const handleExport = () => vscode.postMessage({ type: "exportCurrentTask" })
const handleDelete = () => vscode.postMessage({ type: "deleteTaskWithId", text: item.id })
```

**Oropendola Gap**: Only basic copy functionality, no export/delete/share

---

### Todo List Display
**File**: `/tmp/Roo-Code/webview-ui/src/components/chat/TodoListDisplay.tsx` (355 lines)
**Features**:
- Collapsible todo panel
- Status indicators (completed/in_progress/pending)
- Progress tracking (3/10 todos completed)
- Auto-scroll to most important todo
- Floating panel on expansion
- Color-coded status dots

**Status Indicators**:
```
Green dot     = Completed
Yellow dot    = In Progress
Transparent   = Not started
```

**Oropendola Gap**: Has basic collapsible todos but missing status indicators and auto-scroll

---

## CONTEXT MANAGEMENT & TOKEN TRACKING

### Context Window Progress
**File**: `/tmp/Roo-Code/webview-ui/src/components/chat/ContextWindowProgress.tsx` (98 lines)
**Features**:
- Three-segment progress bar:
  1. Current tokens used (dark)
  2. Reserved for output (medium gray)
  3. Available space (light/transparent)
- Token count display
- Context window size display
- Tooltip with detailed breakdown
- Real-time updates

**Token Distribution Calculation**:
```typescript
const currentPercent = (contextTokens / contextWindow) * 100
const reservedPercent = (reservedForOutput / contextWindow) * 100
const availablePercent = ((contextWindow - contextTokens - reservedForOutput) / contextWindow) * 100
```

**Oropendola Gap**: Shows hardcoded "44.0%" value with no real tracking

---

### Context Condensing UI
**File**: `/tmp/Roo-Code/webview-ui/src/components/chat/ContextCondenseRow.tsx` (82 lines)
**Features**:
- Displays context condensing operations
- Shows token reduction (e.g., "5000 → 2000 tokens")
- Displays cost of condensing operation
- Expandable summary view
- Status icon (checkmark, in-progress, error)

**States**:
```typescript
ContextCondenseRow       // Completed condensing with summary
CondensingContextRow     // In-progress indicator
CondenseContextErrorRow  // Error display
```

**Oropendola Gap**: No context condensing feature

---

## INPUT AREA FEATURES

### ChatTextArea Advanced Implementation
**File**: `/tmp/Roo-Code/webview-ui/src/components/chat/ChatTextArea.tsx` (600+ lines)

#### Feature 1: Context Mentions System
```typescript
// Supported mentions:
@file      - File autocomplete (from workspace)
@folder    - Folder autocomplete (from workspace)
@problems  - VS Code problems/warnings
@terminal  - Terminal output reference
@git       - Git commit history
```

**Implementation**:
```typescript
const queryItems = useMemo(() => {
  return [
    { type: ContextMenuOptionType.Problems, value: "problems" },
    { type: ContextMenuOptionType.Terminal, value: "terminal" },
    ...gitCommits,
    ...openedTabs.map(tab => ({
      type: ContextMenuOptionType.OpenedFile,
      value: "/" + tab.path,
    })),
    ...filePaths.map(file => ({
      type: file.endsWith("/") ? ContextMenuOptionType.Folder : ContextMenuOptionType.File,
      value: "/" + file,
    })),
  ]
}, [filePaths, gitCommits, openedTabs])
```

#### Feature 2: Keyboard Shortcuts
```
Cmd/Ctrl + Enter           → Send message
Cmd/Ctrl + .               → Next mode
Cmd/Ctrl + Shift + .       → Previous mode
Arrow Up/Down              → Prompt history navigation
Tab                        → Autocomplete selection
Escape                     → Close menus
```

**Implementation** (lines 217-235):
```typescript
const { handleHistoryNavigation, resetHistoryNavigation } = usePromptHistory({
  clineMessages,
  taskHistory,
  cwd,
  inputValue,
  setInputValue,
})
```

#### Feature 3: Image Support
```typescript
const MAX_IMAGES_PER_MESSAGE = 20  // Anthropic limit

// Drag-and-drop handling:
const [isDraggingOver, setIsDraggingOver] = useState(false)

// Image validation:
if (selectedImages.length >= MAX_IMAGES_PER_MESSAGE) {
  // Show warning
}
```

#### Feature 4: Prompt Enhancement
```typescript
const handleEnhancePrompt = useCallback(() => {
  const trimmedInput = inputValue.trim()
  if (trimmedInput) {
    setIsEnhancingPrompt(true)
    vscode.postMessage({ type: "enhancePrompt", text: trimmedInput })
  }
}, [inputValue, setInputValue, t])
```

**Oropendola Gap**: Basic textarea, only Shift+Enter for newline, no mentions/shortcuts/enhancement

---

## AUTO-APPROVAL SYSTEM

### AutoApproveDropdown Component
**File**: `/tmp/Roo-Code/webview-ui/src/components/chat/AutoApproveDropdown.tsx` (320 lines)

**10 Granular Approval Toggles**:
```typescript
alwaysAllowReadOnly           // File read operations
alwaysAllowWrite              // File write operations
alwaysAllowBrowser            // Browser automation
alwaysAllowExecute            // Command execution
alwaysAllowMcp                // MCP tool usage
alwaysAllowModeSwitch         // Mode switching without confirmation
alwaysAllowSubtasks           // Subtask creation
alwaysApproveResubmit         // Retry on failure
alwaysAllowFollowupQuestions  // Follow-up auto-approval
alwaysAllowUpdateTodoList     // Todo list updates
```

**UI Features**:
```
+------ Auto-Approval Dropdown ------+
|  Enabled/Disabled Switch            |
|                                     |
| [✓] Read-Only     [✓] Write         |
| [✓] Browser       [✓] Execute      |
| [✓] MCP           [✓] Mode Switch  |
| [✓] Subtasks      [✓] Resubmit     |
|                                     |
| [Select All] [Select None]         |
+-------------------------------------+
```

**Implementation Pattern** (lines 111-128):
```typescript
const handleSelectAll = React.useCallback(() => {
  Object.keys(autoApproveSettingsConfig).forEach((key) => {
    onAutoApproveToggle(key as AutoApproveSetting, true)
  })
}, [onAutoApproveToggle, autoApprovalEnabled, setAutoApprovalEnabled])
```

**Oropendola Gap**: No auto-approval system at all

---

## SETTINGS & CONFIGURATION

### Auto-Approve Settings Configuration
**File**: `/tmp/Roo-Code/webview-ui/src/components/settings/AutoApproveToggle.tsx` (133 lines)

**Settings Config Map**:
```typescript
autoApproveSettingsConfig = {
  alwaysAllowReadOnly: {
    key: "alwaysAllowReadOnly",
    labelKey: "settings:autoApprove.readOnly.label",
    descriptionKey: "settings:autoApprove.readOnly.description",
    icon: "eye",
    testId: "always-allow-readonly-toggle",
  },
  alwaysAllowWrite: {
    key: "alwaysAllowWrite",
    labelKey: "settings:autoApprove.write.label",
    descriptionKey: "settings:autoApprove.write.description",
    icon: "edit",
    testId: "always-allow-write-toggle",
  },
  // ... 8 more
}
```

**Oropendola Gap**: Minimal settings, no structured configuration

---

### Checkpoint Settings
**File**: `/tmp/Roo-Code/webview-ui/src/components/settings/CheckpointSettings.tsx` (90 lines)

**Configuration Options**:
```typescript
enableCheckpoints: boolean  // Enable/disable feature
checkpointTimeout: number   // Timeout in seconds (30-300)

DEFAULT: 120 seconds
MIN: 30 seconds
MAX: 300 seconds
```

**UI**:
```
[✓] Enable Checkpoints

Timeout Slider: [===●========] 120 seconds
```

**Oropendola Gap**: No checkpoint system

---

### API Configuration Selector
**File**: `/tmp/Roo-Code/webview-ui/src/components/chat/ApiConfigSelector.tsx` (150+ lines)

**Features**:
- Fuzzy search filtering
- Pinning favorite configs
- Multiple providers (30+)
- Config editing
- Model selection per config

**Implementation**:
```typescript
// Pinned and unpinned separation:
const { pinnedConfigs, unpinnedConfigs } = useMemo(() => {
  const pinned = filteredConfigs.filter((config) => pinnedApiConfigs?.[config.id])
  const unpinned = filteredConfigs.filter((config) => !pinnedApiConfigs?.[config.id])
  return { pinnedConfigs: pinned, unpinnedConfigs: unpinned }
}, [filteredConfigs, pinnedApiConfigs])
```

**Oropendola Gap**: Basic API key input only, no multiple configs

---

## ADVANCED FEATURES

### Browser Automation UI
**File**: `/tmp/Roo-Code/webview-ui/src/components/chat/BrowserSessionRow.tsx` (570 lines)

**Features**:
1. **Screenshot Display**
   - Maintains aspect ratio dynamically
   - Clickable to expand in image viewer
   - Aspect ratio calculation: `aspectRatio = (viewportHeight / viewportWidth) * 100`

2. **Click Tracking**
   - Shows cursor at click coordinates
   - Updates in real-time as actions occur
   - Smooth transitions (CSS: `transition: top 0.3s ease-out, left 0.3s ease-out`)

3. **Console Logs Viewer**
   - Collapsible accordion
   - Code-block styled display
   - Terminal-friendly format

4. **Multi-Page Navigation**
   ```typescript
   // Pages organized as:
   {
     currentState: {
       url,
       screenshot,
       mousePosition,
       consoleLogs,
       messages,
     },
     nextAction: {
       messages,  // Leading to next result
     }
   }
   ```

5. **Action History**
   - Expandable action descriptions
   - Color-coded by action type
   - Timestamp tracking

**Oropendola Gap**: No browser automation UI

---

### Checkpoint System
**File**: `/tmp/Roo-Code/webview-ui/src/components/chat/checkpoints/`

**Files**:
- `CheckpointMenu.tsx` - Save/load menu
- `CheckpointSaved.tsx` - Confirmation UI
- `CheckpointRestoreDialog.tsx` - Restore dialog

**Features**:
```typescript
// On edit/delete, ask:
"Restore to checkpoint?" 
  [Cancel] [Edit Only] [Restore to Checkpoint]
```

**Auto-Checkpointing**:
- Automatic on timeout
- Manual via menu
- Full conversation state saved
- Restore with one click

**Oropendola Gap**: No checkpoint system

---

### Cloud Integration
**File**: `/tmp/Roo-Code/webview-ui/src/components/cloud/`

**Components**:
- `CloudView.tsx` - Main cloud UI
- `OrganizationSwitcher.tsx` - Team switching
- `CloudTaskButton.tsx` - Task upload
- `CloudAccountSwitcher.tsx` - Account switching
- `CloudUpsellDialog.tsx` - Feature upsell

**Features**:
1. Authentication
2. Organization/Team management
3. Task sync to cloud
4. Remote control capability
5. Organization membership

**Oropendola Gap**: No cloud integration

---

### Marketplace
**File**: `/tmp/Roo-Code/webview-ui/src/components/marketplace/`

**Features**:
- Browse custom modes
- Browse custom commands
- Browse custom models
- Install/uninstall
- Search and filtering
- Ratings and popularity
- Screenshots and details

**Oropendola Gap**: No marketplace

---

### MCP (Model Context Protocol)
**File**: `/tmp/Roo-Code/webview-ui/src/components/mcp/`

**Components**:
- `McpView.tsx` - Server management
- `McpToolRow.tsx` - Tool listing
- `McpResourceRow.tsx` - Resource listing
- `McpErrorRow.tsx` - Error handling
- `McpEnabledToggle.tsx` - Enable/disable

**Features**:
- Server management
- Tool execution
- Resource access
- Error handling
- Integration with mentions

**Oropendola Gap**: No MCP support

---

### Reasoning/Thinking Block
**File**: `/tmp/Roo-Code/webview-ui/src/components/chat/ReasoningBlock.tsx` (78 lines)

**Features**:
```typescript
// Display format:
[💡 Thinking] [00:15]
  [Collapsible content with reasoning text]

// Timing:
- Tracks elapsed time during streaming
- Updates every 1 second
- Shows in seconds format

// State:
- Collapsed by default
- Remembers user preference
- Markdown content rendering
```

**Oropendola Gap**: No reasoning block display

---

### Follow-up Suggestions
**File**: `/tmp/Roo-Code/webview-ui/src/components/chat/FollowUpSuggest.tsx` (80+ lines)

**Features**:
```typescript
// Auto-approval countdown:
suggestions.map(suggestion => (
  <Button onClick={() => handleSuggestionClick(suggestion)}>
    {suggestion.text} [{countdownSeconds}s]
  </Button>
))

// Configurable timeout:
followupAutoApproveTimeoutMs (default: 60000ms)
```

**Oropendola Gap**: No follow-up suggestions

---

## MODE SELECTOR

**File**: `/tmp/Roo-Code/webview-ui/src/components/chat/ModeSelector.tsx` (332 lines)

**Features**:
1. **Fuzzy Search**
   - Search both name and description
   - Priority on name matches
   - FZF library integration

2. **Custom Modes**
   - User-created modes
   - Custom prompts per mode
   - Mode-specific descriptions

3. **Keyboard Shortcuts**
   ```
   Cmd/Ctrl + .         → Next mode
   Cmd/Ctrl + Shift + . → Previous mode
   ```

4. **UI Features**:
   - Search input with clear button
   - Selected item highlighting
   - Auto-scroll to selected mode
   - Marketplace and Settings buttons
   - Info icon with instructions

**Oropendola Gap**: Only ask/agent toggle, no mode management

---

## KEYBOARD SHORTCUTS & INTERACTIONS

### Supported Shortcuts in Roo Code
```
Input Area:
  Cmd/Ctrl + Enter           → Send message
  Cmd/Ctrl + .               → Next mode
  Cmd/Ctrl + Shift + .       → Previous mode
  Arrow Up/Down              → Prompt history navigation
  Tab                        → Autocomplete selection
  Escape                     → Close menus

Message Management:
  Shift + Click Delete       → Skip confirmation
  Click Task Header          → Toggle expand/collapse
  Click Message              → Toggle content expand

History:
  Arrow Up/Down              → Navigate history

Auto-Approval:
  Select All / Select None   → Bulk toggle toggles
```

### Supported Shortcuts in Oropendola
```
Input Area:
  Enter                      → Send message
  Shift + Enter              → New line
```

**Gap**: 18 fewer shortcuts

---

## FILE STRUCTURE & ORGANIZATION

### Roo Code Component Hierarchy
```
webview-ui/src/components/
│
├── chat/                           (48 files)
│   ├── TaskHeader.tsx              (336 lines)
│   ├── TaskActions.tsx             (70 lines)
│   ├── ChatTextArea.tsx            (600+ lines)
│   ├── ChatView.tsx                (1000+ lines)
│   ├── ChatRow.tsx                 (message display)
│   ├── BrowserSessionRow.tsx       (570 lines)
│   ├── AutoApproveDropdown.tsx     (320 lines)
│   ├── ModeSelector.tsx            (332 lines)
│   ├── ApiConfigSelector.tsx       (150+ lines)
│   ├── ContextWindowProgress.tsx   (98 lines)
│   ├── ContextCondenseRow.tsx      (82 lines)
│   ├── TodoListDisplay.tsx         (355 lines)
│   ├── ReasoningBlock.tsx          (78 lines)
│   ├── FollowUpSuggest.tsx         (80+ lines)
│   ├── CommandExecution.tsx
│   ├── McpExecution.tsx
│   ├── Markdown.tsx
│   ├── Mention.tsx
│   ├── CheckpointRestoreDialog.tsx (84 lines)
│   ├── CheckpointWarning.tsx
│   ├── checkpoints/                (3 files)
│   └── __tests__/                  (15+ test files)
│
├── common/                         (25 files)
│   ├── CodeBlock.tsx
│   ├── ImageBlock.tsx
│   ├── ImageViewer.tsx
│   ├── MermaidBlock.tsx
│   ├── MarkdownBlock.tsx
│   ├── CodeAccordian.tsx
│   ├── Tab.tsx
│   ├── Modal.tsx
│   └── ...
│
├── history/                        (18 files)
│   ├── HistoryView.tsx
│   ├── HistoryPreview.tsx
│   ├── TaskItem.tsx
│   ├── TaskItemFooter.tsx
│   ├── ExportButton.tsx
│   ├── DeleteButton.tsx
│   └── ...
│
├── settings/                       (50+ files)
│   ├── SettingsView.tsx
│   ├── AutoApproveToggle.tsx
│   ├── CheckpointSettings.tsx
│   ├── ApiOptions.tsx
│   ├── ModelPicker.tsx
│   ├── TemperatureControl.tsx
│   ├── MaxCostInput.tsx
│   ├── PromptsSettings.tsx
│   ├── SlashCommandsSettings.tsx
│   ├── providers/                  (30+ provider components)
│   └── ...
│
├── cloud/                          (6 files)
│   ├── CloudView.tsx
│   ├── OrganizationSwitcher.tsx
│   ├── CloudTaskButton.tsx
│   ├── CloudAccountSwitcher.tsx
│   ├── CloudUpsellDialog.tsx
│   └── ...
│
├── marketplace/                    (8 files)
│   ├── MarketplaceView.tsx
│   ├── MarketplaceListView.tsx
│   ├── MarketplaceItemCard.tsx
│   ├── MarketplaceInstallModal.tsx
│   └── ...
│
├── mcp/                            (6 files)
│   ├── McpView.tsx
│   ├── McpToolRow.tsx
│   ├── McpResourceRow.tsx
│   ├── McpErrorRow.tsx
│   ├── McpEnabledToggle.tsx
│   └── ...
│
├── ui/                             (30+ files)
│   ├── button.tsx
│   ├── input.tsx
│   ├── select.tsx
│   ├── popover.tsx
│   ├── dialog.tsx
│   ├── tooltip.tsx
│   ├── slider.tsx
│   ├── alert-dialog.tsx
│   └── ...
│
└── welcome/                        (2 files)
    └── RooHero.tsx
    └── RooTips.tsx
```

### Oropendola Component Hierarchy
```
webview-ui/src/components/
├── Chat/                           (subfolders)
├── AutoApprove/                    (subfolders)
├── ChatMessage.tsx                 (150 lines)
├── InputArea.tsx                   (150 lines)
├── Header.tsx                      (51 lines)
├── MessageList.tsx                 (87 lines)
├── CodeBlock.tsx
├── ImageBlock.tsx
├── ImageViewer.tsx
├── MermaidBlock.tsx
├── CollapsibleTodoItem.tsx
├── EnhancedTodoPanel.tsx
├── FileChangesPanel.tsx
└── ui/                             (basic components)
```

---

## IMPLEMENTATION PRIORITIES FOR OROPENDOLA

### Phase 1 (Most Important)
1. Task management system (400 hours)
2. Context window tracking UI (300 hours)
3. Input area mentions/commands (250 hours)
4. Auto-approval dropdowns (150 hours)
5. Checkpoint system (200 hours)

### Phase 2
6. Comprehensive settings panel (200 hours)
7. Task history/persistence (150 hours)
8. Keyboard shortcuts (100 hours)
9. Cloud integration (300 hours)
10. Marketplace (250 hours)

### Phase 3
11. Browser automation UI (200 hours)
12. MCP integration (200 hours)
13. Reasoning blocks (50 hours)
14. Follow-up suggestions (50 hours)
15. i18n/localization (200 hours)

---

## SUMMARY

**Roo Code** has:
- 100+ dedicated components
- 5000+ lines of component code
- 20+ file categories
- Sophisticated state management
- Enterprise-grade features

**Oropendola** has:
- 12 components
- 600-700 lines of code
- Single directory structure
- Basic local state
- Chat-only functionality

**Gap**: Oropendola requires 2,700+ hours of development to reach feature parity.

