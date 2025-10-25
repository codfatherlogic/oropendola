# WebView-UI Enhancement Plan - Roo-Code Integration

**Date**: October 24, 2025
**Current Version**: Basic React with react-markdown
**Target**: Enhanced chat experience with Roo-Code components

---

## Executive Summary

Our current webview-ui is **functional but basic**, while Roo-Code has a **production-grade, feature-rich implementation** with:
- Advanced code syntax highlighting (Shiki)
- Virtualized message list (react-virtuoso)
- Rich markdown rendering with math/diagrams
- Copy-to-clipboard with visual feedback
- Auto-expanding textarea (react-textarea-autosize)
- Accessible UI components (Radix UI)
- Image attachment support
- Multi-language support (19 languages)

**Recommendation**: Selectively integrate Roo-Code components to enhance our chat experience while maintaining Oropendola AI exclusivity.

---

## Current State Analysis

### Our Current Implementation (Oropendola)

**Dependencies** (4 production):
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-markdown": "^9.0.1",
  "rehype-highlight": "^7.0.0"
}
```

**Components** (13 files):
- `App.tsx` - Main container
- `ChatMessage.tsx` - Basic message display with rehype-highlight
- `InputArea.tsx` - Manual auto-resize textarea
- `MessageList.tsx` - Simple array map (no virtualization)
- `Header.tsx` - Header bar
- `TodoPanel.tsx` - Todo list display
- `EnhancedTodoPanel.tsx` - Enhanced todo display
- `FileChangesPanel.tsx` - File changes panel
- `CollapsibleTodoItem.tsx` - Collapsible todo items

**Features**:
- ✅ Basic markdown rendering
- ✅ Basic code syntax highlighting
- ✅ Copy button (simple)
- ✅ Manual textarea resize
- ✅ Todo list display
- ✅ File changes panel
- ❌ No virtualization (performance issues with >100 messages)
- ❌ No advanced code features (copy feedback, language detection, word wrap)
- ❌ No image attachments
- ❌ No math rendering
- ❌ No diagram support
- ❌ No internationalization
- ❌ No keyboard shortcuts
- ❌ No accessibility features

### Roo-Code Implementation

**Dependencies** (79 production):
- React 18, TypeScript, Vite
- Radix UI (11 component libraries)
- Shiki (modern syntax highlighter)
- React-virtuoso (virtualized list)
- React-textarea-autosize
- Mermaid (diagram rendering)
- KaTeX (math rendering)
- i18next (19 languages)
- PostHog (analytics)

**Components** (262 files):
- 43 chat-specific components
- 21 common components
- 24 UI primitives
- 94 settings components
- Plus: history, marketplace, MCP, cloud, etc.

**Features**:
- ✅ Advanced code highlighting with Shiki
- ✅ Virtualized message list (handles 4K+ messages)
- ✅ Copy with visual feedback
- ✅ Auto-expanding textarea (react-textarea-autosize)
- ✅ Image attachments (up to 20 per message)
- ✅ Math rendering (KaTeX)
- ✅ Diagram rendering (Mermaid)
- ✅ 19 language translations
- ✅ Keyboard shortcuts
- ✅ Accessibility (Radix UI)
- ✅ Command validation and highlighting
- ✅ @-mention system
- ✅ Tool call visualization
- ✅ Reasoning block display

---

## Gap Analysis

### Critical Gaps (Impact: High)

| Feature | Our Status | Roo-Code | Impact | Priority |
|---------|------------|----------|--------|----------|
| **Virtualized List** | ❌ None | ✅ react-virtuoso | Performance degrades with >100 messages | **HIGH** |
| **Advanced Code Block** | ❌ Basic | ✅ Shiki + copy + wrap + collapse | Poor code readability | **HIGH** |
| **Auto-resize Textarea** | ⚠️ Manual | ✅ react-textarea-autosize | Janky UX | **MEDIUM** |
| **Copy Feedback** | ❌ None | ✅ Visual confirmation | Users unsure if copy worked | **MEDIUM** |
| **Code Language Detection** | ❌ None | ✅ Auto-detect | Code blocks show without language labels | **LOW** |

### Nice-to-Have Gaps (Impact: Medium)

| Feature | Our Status | Roo-Code | Benefit |
|---------|------------|----------|---------|
| **Image Attachments** | ❌ None | ✅ Up to 20 images | Multi-modal AI support |
| **Math Rendering** | ❌ None | ✅ KaTeX | Scientific/math conversations |
| **Diagram Rendering** | ❌ None | ✅ Mermaid | Visual architecture discussions |
| **Internationalization** | ❌ English only | ✅ 19 languages | Global reach |
| **Accessible Components** | ❌ None | ✅ Radix UI | WCAG compliance |
| **Keyboard Shortcuts** | ❌ None | ✅ Multiple | Power user efficiency |

### Oropendola-Specific (Not Needed)

| Feature | Roo-Code | Our Need |
|---------|----------|----------|
| **PostHog Analytics** | ✅ Yes | ❌ No (privacy concern) |
| **Cloud Integration** | ✅ Yes | ❌ No (we have our own backend) |
| **MCP Support** | ✅ Yes | ❌ No (not using Model Context Protocol) |
| **Checkpoint System** | ✅ Yes | ⚠️ Maybe (consider for v3.5) |
| **Marketplace** | ✅ Yes | ❌ No (not needed) |

---

## Recommended Integration Plan

### Phase 1: Core Performance & UX (v3.5.0)

**Goal**: Improve performance and user experience with minimal dependencies.

**Components to Integrate**:

1. **CodeBlock.tsx** (24KB component)
   - **Source**: `/tmp/Roo-Code/src/components/common/CodeBlock.tsx`
   - **Dependencies**: Shiki, styled-components
   - **Features**:
     - Syntax highlighting with 200+ languages
     - Copy button with visual feedback
     - Word wrap toggle
     - Window shade (collapse/expand)
     - Language auto-detection
   - **Effort**: 2-3 hours
   - **Impact**: 🔥 **HIGH** - Dramatically improves code readability

2. **React-virtuoso** (virtualized list)
   - **Source**: Replace `MessageList.tsx` with react-virtuoso
   - **Dependencies**: `react-virtuoso@^4.7.13`
   - **Features**:
     - Efficiently handle 4K+ messages
     - Smooth scrolling
     - Auto-scroll to bottom
   - **Effort**: 1-2 hours
   - **Impact**: 🔥 **HIGH** - Fixes performance issues

3. **React-textarea-autosize** (auto-expanding input)
   - **Source**: Replace manual resize logic in `InputArea.tsx`
   - **Dependencies**: `react-textarea-autosize@^8.5.3`
   - **Features**:
     - Smooth auto-resize
     - No janky jumps
   - **Effort**: 30 minutes
   - **Impact**: 🔥 **MEDIUM** - Better UX

4. **Clipboard utilities** with feedback
   - **Source**: `/tmp/Roo-Code/src/utils/clipboard.ts`
   - **Dependencies**: None (pure JS)
   - **Features**:
     - Visual copy confirmation
     - Error handling
   - **Effort**: 15 minutes
   - **Impact**: 🔥 **MEDIUM** - User confidence

**New Dependencies**:
```json
{
  "shiki": "^3.2.1",
  "styled-components": "^6.1.13",
  "react-virtuoso": "^4.7.13",
  "react-textarea-autosize": "^8.5.3"
}
```

**Estimated Effort**: 4-6 hours
**Package Size Increase**: +1.5 MB (Shiki WASM)

---

### Phase 2: Rich Content Support (v3.6.0)

**Goal**: Add support for images, math, and diagrams.

**Components to Integrate**:

1. **MarkdownBlock.tsx** (Enhanced markdown)
   - **Source**: `/tmp/Roo-Code/src/components/common/MarkdownBlock.tsx`
   - **Dependencies**: remark-math, rehype-katex
   - **Features**:
     - GitHub Flavored Markdown
     - LaTeX math rendering
   - **Effort**: 1-2 hours
   - **Impact**: 🔥 **MEDIUM** - Better markdown support

2. **MermaidBlock.tsx** (Diagrams)
   - **Source**: `/tmp/Roo-Code/src/components/common/MermaidBlock.tsx`
   - **Dependencies**: mermaid@^11.4.1
   - **Features**:
     - 12+ diagram types
     - Copy/save diagram
   - **Effort**: 2 hours
   - **Impact**: 🔥 **LOW** - Nice visual aid

3. **ImageBlock.tsx** + **ImageViewer.tsx**
   - **Source**: `/tmp/Roo-Code/src/components/common/ImageBlock.tsx`
   - **Dependencies**: None
   - **Features**:
     - Image display in chat
     - Full-screen viewer with zoom
   - **Effort**: 2 hours
   - **Impact**: 🔥 **MEDIUM** - Multi-modal AI support

4. **Image Attachment Support** in InputArea
   - **Source**: ChatTextArea.tsx image handling logic
   - **Dependencies**: None
   - **Features**:
     - Drag-and-drop images
     - Up to 20 images per message
     - Thumbnail preview
   - **Effort**: 3-4 hours
   - **Impact**: 🔥 **HIGH** - Multi-modal input

**New Dependencies**:
```json
{
  "remark-math": "^6.0.0",
  "rehype-katex": "^7.0.1",
  "katex": "^0.16.11",
  "mermaid": "^11.4.1"
}
```

**Estimated Effort**: 8-10 hours
**Package Size Increase**: +800 KB

---

### Phase 3: Accessibility & Polish (v3.7.0)

**Goal**: Improve accessibility and add power-user features.

**Components to Integrate**:

1. **Radix UI Components**
   - **Source**: `/tmp/Roo-Code/src/components/ui/`
   - **Dependencies**: 11 Radix packages
   - **Features**:
     - Accessible button, dialog, tooltip, dropdown
     - WCAG compliant
   - **Effort**: 6-8 hours (refactor existing components)
   - **Impact**: 🔥 **MEDIUM** - Accessibility compliance

2. **Keyboard Shortcuts**
   - **Source**: useEscapeKey, ChatView shortcuts
   - **Dependencies**: None
   - **Features**:
     - Mode switching (Cmd+.)
     - Escape key handling
   - **Effort**: 2 hours
   - **Impact**: 🔥 **LOW** - Power user efficiency

3. **Internationalization** (i18next)
   - **Source**: `/tmp/Roo-Code/src/i18n/`
   - **Dependencies**: i18next, react-i18next
   - **Features**:
     - 19 language translations
     - Dynamic language switching
   - **Effort**: 10-12 hours (translation work)
   - **Impact**: 🔥 **LOW** - Global reach (if needed)

**New Dependencies**:
```json
{
  "@radix-ui/react-alert-dialog": "^1.1.5",
  "@radix-ui/react-dropdown-menu": "^2.1.11",
  "@radix-ui/react-tooltip": "^1.1.14",
  "i18next": "^25.0.0",
  "react-i18next": "^15.4.1"
}
```

**Estimated Effort**: 18-22 hours
**Package Size Increase**: +500 KB

---

## Detailed Component Integration Guide

### 1. CodeBlock Component Integration

**File to Copy**: `/tmp/Roo-Code/src/components/common/CodeBlock.tsx`

**Steps**:

1. **Install dependencies**:
   ```bash
   cd webview-ui
   npm install shiki@^3.2.1 styled-components@^6.1.13
   ```

2. **Copy component**:
   ```bash
   cp /tmp/Roo-Code/src/components/common/CodeBlock.tsx \
      src/components/CodeBlock.tsx
   ```

3. **Copy Shiki initializer**:
   ```bash
   cp /tmp/Roo-Code/src/utils/highlighter.ts \
      src/utils/highlighter.ts
   ```

4. **Copy clipboard util**:
   ```bash
   cp /tmp/Roo-Code/src/utils/clipboard.ts \
      src/utils/clipboard.ts
   ```

5. **Initialize Shiki in main.tsx**:
   ```typescript
   import { loadHighlighter } from './utils/highlighter'

   async function initApp() {
     await loadHighlighter()
     ReactDOM.createRoot(document.getElementById('root')!).render(
       <React.StrictMode>
         <App />
       </React.StrictMode>
     )
   }

   initApp()
   ```

6. **Replace in ChatMessage.tsx**:
   ```typescript
   // Before:
   <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
     {message.content}
   </ReactMarkdown>

   // After:
   import { CodeBlock } from './CodeBlock'

   <ReactMarkdown
     components={{
       code({ node, inline, className, children, ...props }) {
         const match = /language-(\w+)/.exec(className || '')
         const language = match ? match[1] : 'plaintext'
         const code = String(children).replace(/\n$/, '')

         return !inline ? (
           <CodeBlock
             code={code}
             language={language}
             showLineNumbers={true}
           />
         ) : (
           <code className={className} {...props}>
             {children}
           </code>
         )
       }
     }}
   >
     {message.content}
   </ReactMarkdown>
   ```

7. **Remove old dependency**:
   ```bash
   npm uninstall rehype-highlight
   ```

**Expected Result**:
- Code blocks with syntax highlighting
- Copy button with visual feedback
- Word wrap toggle
- Language labels

---

### 2. React-Virtuoso Integration

**Steps**:

1. **Install dependency**:
   ```bash
   npm install react-virtuoso@^4.7.13
   ```

2. **Replace MessageList.tsx**:
   ```typescript
   import { Virtuoso } from 'react-virtuoso'
   import { ChatMessage } from './ChatMessage'

   interface MessageListProps {
     messages: Message[]
     isGenerating: boolean
   }

   export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
     return (
       <Virtuoso
         data={messages}
         style={{ height: '100%' }}
         itemContent={(index, message) => (
           <ChatMessage key={message.id || index} message={message} />
         )}
         followOutput="smooth"
         alignToBottom
         increaseViewportBy={{ top: 200, bottom: 200 }}
       />
     )
   }
   ```

3. **Update App.tsx** to use full height container:
   ```css
   .message-list-container {
     flex: 1;
     overflow: hidden;
   }
   ```

**Expected Result**:
- Smooth scrolling with 1000+ messages
- Auto-scroll to bottom on new messages
- No performance degradation

---

### 3. React-Textarea-Autosize Integration

**Steps**:

1. **Install dependency**:
   ```bash
   npm install react-textarea-autosize@^8.5.3
   ```

2. **Replace textarea in InputArea.tsx**:
   ```typescript
   import TextareaAutosize from 'react-textarea-autosize'

   // Remove:
   // - textareaRef
   // - handleInput function
   // - manual height calculation

   // Replace textarea with:
   <TextareaAutosize
     className="input-field-large"
     placeholder="Plan and build autonomously..."
     minRows={3}
     maxRows={10}
     value={message}
     onChange={(e) => setMessage(e.target.value)}
     onKeyDown={handleKeyDown}
     disabled={isGenerating}
   />
   ```

**Expected Result**:
- Smooth auto-resize without janky jumps
- Max height constraint (10 rows)
- Better UX

---

### 4. Clipboard Utilities Integration

**Steps**:

1. **Copy utility file**:
   ```bash
   cp /tmp/Roo-Code/src/utils/clipboard.ts \
      src/utils/clipboard.ts
   ```

2. **Update ChatMessage.tsx**:
   ```typescript
   import { copyToClipboard } from '../utils/clipboard'

   const [copySuccess, setCopySuccess] = useState(false)

   const handleCopy = async () => {
     const success = await copyToClipboard(message.content)
     if (success) {
       setCopySuccess(true)
       setTimeout(() => setCopySuccess(false), 2000)
     }
   }

   // Update button:
   <button className="copy-btn" onClick={handleCopy} title="Copy message">
     {copySuccess ? '✓' : '📋'}
   </button>
   ```

**Expected Result**:
- Visual confirmation when copy succeeds
- Better error handling

---

## Compatibility Matrix

### What We Can Use Directly (No Modification)

| Component | Source | Dependencies | Compatibility |
|-----------|--------|--------------|---------------|
| **CodeBlock.tsx** | `/components/common/` | Shiki, styled-components | ✅ 100% |
| **clipboard.ts** | `/utils/` | None | ✅ 100% |
| **highlighter.ts** | `/utils/` | Shiki | ✅ 100% |
| **MermaidBlock.tsx** | `/components/common/` | Mermaid | ✅ 100% |
| **ImageBlock.tsx** | `/components/common/` | None | ✅ 100% |
| **ImageViewer.tsx** | `/components/common/` | None | ✅ 100% |

### What Needs Adaptation

| Component | Source | Modification Needed |
|-----------|--------|---------------------|
| **ChatView.tsx** | `/components/chat/` | Remove ExtensionStateContext dependency |
| **ChatRow.tsx** | `/components/chat/` | Adapt to our message format |
| **ChatTextArea.tsx** | `/components/chat/` | Remove VSCode-specific mention logic |
| **MarkdownBlock.tsx** | `/components/common/` | Minor - adjust styling |
| **UI primitives** | `/components/ui/` | Minor - remove VSCode theme variables |

### What We Should NOT Use

| Component | Reason |
|-----------|--------|
| **TelemetryClient.ts** | Privacy concern (PostHog analytics) |
| **ExtensionStateContext.tsx** | VSCode extension-specific |
| **Cloud components** | We have our own backend |
| **MCP components** | Not using Model Context Protocol |
| **CommandExecution.tsx** | Terminal integration too specific |
| **Checkpoint system** | Consider for future, not urgent |

---

## Implementation Timeline

### Week 1: Phase 1 - Core Performance (v3.5.0)

**Day 1-2**: CodeBlock Integration
- Install Shiki + styled-components
- Copy CodeBlock, highlighter, clipboard utils
- Update ChatMessage component
- Test code highlighting with 10+ languages

**Day 3**: Virtuoso Integration
- Install react-virtuoso
- Replace MessageList component
- Test with 1000+ messages
- Verify smooth scrolling

**Day 4**: TextareaAutosize + Clipboard
- Install react-textarea-autosize
- Replace manual resize logic
- Add copy feedback to all copy buttons
- Test UX improvements

**Day 5**: Testing & Polish
- Cross-browser testing (Chrome, Firefox, Safari)
- Performance testing with large conversations
- Fix bugs and edge cases
- Build and package extension

**Deliverable**: v3.5.0 with improved performance and code blocks

---

### Week 2-3: Phase 2 - Rich Content (v3.6.0)

**Week 2**:
- Day 1-2: MarkdownBlock with math support
- Day 3-4: Image attachment in InputArea
- Day 5: MermaidBlock integration

**Week 3**:
- Day 1-2: ImageViewer with zoom
- Day 3-4: Testing and polish
- Day 5: Build and package

**Deliverable**: v3.6.0 with images, math, diagrams

---

### Week 4-5: Phase 3 - Accessibility (v3.7.0)

**Week 4**:
- Day 1-3: Radix UI component migration
- Day 4-5: Keyboard shortcuts

**Week 5**:
- Day 1-3: i18next setup + English translations
- Day 4: Testing
- Day 5: Build and package

**Deliverable**: v3.7.0 with accessibility and keyboard shortcuts

---

## Package Size Impact

| Phase | New Dependencies | Size Increase | Total Package Size |
|-------|------------------|---------------|--------------------|
| **Current** | 4 deps | - | 11.38 MB |
| **Phase 1** | +4 deps (Shiki, virtuoso, etc.) | +1.5 MB | 12.88 MB |
| **Phase 2** | +4 deps (KaTeX, Mermaid, etc.) | +0.8 MB | 13.68 MB |
| **Phase 3** | +14 deps (Radix UI, i18next) | +0.5 MB | 14.18 MB |

**Final Total**: ~14.2 MB (vs. current 11.4 MB = **+2.8 MB / +24%**)

**Benefit**: Significantly improved UX, performance, and features for <3 MB increase.

---

## Testing Strategy

### Performance Testing

**Metrics to Track**:
- Message list scroll performance (60 FPS target)
- Time to render 100 messages
- Time to render 1000 messages
- Memory usage with large conversations
- Code block render time

**Test Cases**:
1. Load conversation with 100 messages
2. Load conversation with 1000 messages
3. Stream 50 messages rapidly
4. Render 20 code blocks simultaneously
5. Attach 20 images to a single message

### Visual Regression Testing

**Screenshots to Compare**:
- Code block rendering (10 languages)
- Markdown with math equations
- Mermaid diagrams (5 types)
- Image gallery (multiple images)
- Copy button states (normal, hover, success)

### Accessibility Testing

**Tools**:
- Chrome DevTools Lighthouse (Accessibility score >90)
- WAVE browser extension
- Keyboard navigation testing
- Screen reader testing (NVDA/JAWS)

### Cross-browser Testing

**Browsers**:
- Chrome 120+ (primary)
- Firefox 120+
- Safari 17+ (macOS)
- Edge 120+

---

## Risk Assessment

### High Risk Areas

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Bundle size bloat** | Medium | Medium | Use code splitting, lazy loading |
| **Breaking existing UI** | Low | High | Comprehensive testing, feature flags |
| **Performance regression** | Low | High | Benchmark before/after, virtualization |
| **Dependency conflicts** | Low | Medium | Lock versions, test thoroughly |

### Rollback Plan

If critical issues arise:

1. **Quick rollback**: Git revert to previous version
2. **Feature flags**: Disable new components via config
3. **Graceful degradation**: Fallback to basic components

---

## Success Metrics

### Phase 1 Success Criteria

- ✅ Message list handles 1000+ messages at 60 FPS
- ✅ Code blocks render with syntax highlighting
- ✅ Copy button shows visual feedback
- ✅ Textarea auto-resizes smoothly
- ✅ No console errors or warnings
- ✅ Package size increase <2 MB

### Phase 2 Success Criteria

- ✅ Images display in chat and can be zoomed
- ✅ Users can attach images to messages
- ✅ Math equations render correctly
- ✅ Mermaid diagrams display (at least flowcharts)
- ✅ Package size increase <1 MB from Phase 1

### Phase 3 Success Criteria

- ✅ Lighthouse accessibility score >90
- ✅ All interactive elements keyboard-accessible
- ✅ UI components meet WCAG 2.1 AA standards
- ✅ Keyboard shortcuts work as expected

---

## Conclusion

**Recommendation**: **PROCEED with Phase 1 integration immediately**.

**Rationale**:
1. **High impact**: CodeBlock + Virtuoso + TextareaAutosize will dramatically improve UX
2. **Low risk**: Components are well-tested in Roo-Code
3. **Small effort**: 4-6 hours for Phase 1
4. **Minimal size increase**: Only +1.5 MB

**Next Steps**:
1. Create feature branch: `git checkout -b feature/webview-ui-enhancements`
2. Start with CodeBlock integration (Day 1-2)
3. Add Virtuoso (Day 3)
4. Add TextareaAutosize + Clipboard (Day 4)
5. Test and package (Day 5)

**Expected Delivery**: v3.5.0 within 5 days

---

**Author**: Claude (Sonnet 4.5)
**Date**: October 24, 2025
**Status**: ✅ Ready for implementation
