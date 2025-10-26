# Week 6.3: Bug Fixes & Polish Plan

## Overview
Comprehensive bug fixes, edge case handling, and polish for @Mentions system v3.6.0

**Timeline:** 2-3 days
**Status:** In Progress
**Date:** October 26, 2025

---

## Critical Bug Fixes

### 1. ✅ FileSearchService TTL Cache Test
**Issue:** Test expects manual TTL checking, but we use LRU cache with automatic TTL
**Status:** ✅ FIXED
**Solution:** Updated test to verify cache behavior, not implementation details

---

## Edge Cases to Address

### 1. Large File Handling

**Current State:**
- No file size limit in MentionExtractor
- Could cause memory issues with very large files

**Risk:** ⚠️ HIGH
**Proposed Fix:**
```typescript
// In extractFileContext()
const MAX_FILE_SIZE = 1024 * 1024 // 1 MB
const stats = await fs.stat(absolutePath)

if (stats.size > MAX_FILE_SIZE) {
    // Return truncated content with warning
    const content = await fs.readFile(absolutePath, 'utf-8')
    const truncated = content.substring(0, MAX_FILE_SIZE)
    return {
        type: MentionType.FILE,
        content: `## File: ${filePath} (Truncated - ${stats.size} bytes)\n\n\`\`\`\n${truncated}\n...\n[File truncated]\n\`\`\``,
        metadata: { path: absolutePath, size: stats.size, truncated: true }
    }
}
```

### 2. Binary File Detection

**Current State:**
- No binary file detection
- Could try to read binary files as UTF-8

**Risk:** ⚠️ MEDIUM
**Proposed Fix:**
```typescript
private async isBinaryFile(filePath: string): Promise<boolean> {
    const buffer = await fs.readFile(filePath)
    // Check for null bytes (common in binary files)
    for (let i = 0; i < Math.min(buffer.length, 8000); i++) {
        if (buffer[i] === 0) return true
    }
    return false
}

// In extractFileContext()
if (await this.isBinaryFile(absolutePath)) {
    return {
        type: MentionType.FILE,
        content: `## File: ${filePath}\n\n⚠️ Binary file (${stats.size} bytes)`,
        metadata: { path: absolutePath, binary: true, size: stats.size }
    }
}
```

### 3. Special Characters in Paths

**Current State:**
- Basic escaping with backslash
- May not handle all special characters

**Risk:** ⚠️ LOW
**Status:** ✅ ALREADY HANDLED (unescapeSpaces function exists)

**Additional Test Cases:**
- Paths with spaces: `@/my\ folder/file.ts`
- Paths with unicode: `@/文件夹/文件.ts`
- Paths with special chars: `@/my-folder/file(1).ts`

### 4. Empty/Missing Files

**Current State:**
- Throws error, caught by Promise wrapper
- Returns error message in context

**Risk:** ✅ LOW (already handled gracefully)

**Test Cases:**
- File doesn't exist
- Folder doesn't exist
- Empty file
- Empty folder

### 5. Workspace Root Edge Cases

**Current State:**
- Assumes workspace folder exists
- May fail in multi-root workspaces

**Risk:** ⚠️ MEDIUM
**Proposed Fix:**
```typescript
private async resolveFilePath(filePath: string): Promise<string> {
    const workspaceFolders = vscode.workspace.workspaceFolders
    
    if (!workspaceFolders || workspaceFolders.length === 0) {
        throw new Error('No workspace folder open')
    }
    
    // If absolute path, use as-is
    if (path.isAbsolute(filePath)) {
        return filePath
    }
    
    // Try each workspace folder (multi-root support)
    for (const folder of workspaceFolders) {
        const absolutePath = path.join(folder.uri.fsPath, filePath)
        try {
            await fs.access(absolutePath)
            return absolutePath
        } catch {
            // Try next workspace folder
        }
    }
    
    // Fall back to first workspace folder
    return path.join(workspaceFolders[0].uri.fsPath, filePath)
}
```

### 6. Circular Folder References

**Current State:**
- Recursively lists folder contents
- Could hit symbolic links creating cycles

**Risk:** ⚠️ MEDIUM
**Proposed Fix:**
```typescript
private async extractFolderContext(
    folderPath: string,
    maxDepth: number = 3,
    currentDepth: number = 0,
    visited: Set<string> = new Set()
): Promise<MentionContext> {
    const absolutePath = await this.resolveFilePath(folderPath)
    
    // Check for cycles
    const realPath = await fs.realpath(absolutePath)
    if (visited.has(realPath)) {
        return {
            type: MentionType.FOLDER,
            content: `## Folder: ${folderPath}\n\n⚠️ Circular reference detected`,
            metadata: { path: absolutePath, cycle: true }
        }
    }
    visited.add(realPath)
    
    // Check depth limit
    if (currentDepth >= maxDepth) {
        return {
            type: MentionType.FOLDER,
            content: `## Folder: ${folderPath}\n\n... [Max depth ${maxDepth} reached]`,
            metadata: { path: absolutePath, depthLimitReached: true }
        }
    }
    
    // Continue with normal folder listing
    ...
}
```

### 7. Terminal Output Limits

**Current State:**
- May return entire terminal buffer
- Could be very large

**Risk:** ⚠️ MEDIUM
**Proposed Fix:**
```typescript
private extractTerminalContext(terminalId?: string): MentionContext {
    const MAX_OUTPUT_LINES = 1000
    const output = terminalService.getOutput(terminalId)
    const lines = output.split('\n')
    
    if (lines.length > MAX_OUTPUT_LINES) {
        const truncated = lines.slice(-MAX_OUTPUT_LINES).join('\n')
        return {
            type: MentionType.TERMINAL,
            content: `## Terminal Output (Last ${MAX_OUTPUT_LINES} lines)\n\n\`\`\`\n${truncated}\n\`\`\``,
            metadata: { truncated: true, totalLines: lines.length }
        }
    }
    
    return {
        type: MentionType.TERMINAL,
        content: `## Terminal Output\n\n\`\`\`\n${output}\n\`\`\``,
        metadata: { lines: lines.length }
    }
}
```

### 8. Git Command Failures

**Current State:**
- gitService.getLog() may throw errors
- Non-git workspaces, uncommitted files

**Risk:** ✅ ALREADY HANDLED (try/catch in extractGitContext)

**Additional Tests:**
- Non-git workspace
- File not in git
- Invalid git ref
- Git not installed

---

## Cross-Platform Issues

### 1. Path Separators

**Risk:** ⚠️ LOW
**Status:** ✅ ALREADY HANDLED (path.join, path.normalize)

**Test Matrix:**
- [x] macOS: `/Users/...`
- [ ] Windows: `C:\Users\...`
- [ ] Linux: `/home/...`
- [ ] WSL: `/mnt/c/...`

### 2. File Encoding

**Risk:** ⚠️ MEDIUM
**Current:** Always reads as UTF-8
**Proposed:**
```typescript
// Add encoding detection
import chardet from 'chardet'

const buffer = await fs.readFile(absolutePath)
const encoding = chardet.detect(buffer)

if (encoding && encoding !== 'UTF-8') {
    return {
        type: MentionType.FILE,
        content: `## File: ${filePath}\n\n⚠️ Non-UTF-8 encoding detected: ${encoding}`,
        metadata: { path: absolutePath, encoding }
    }
}
```

---

## UI/UX Polish

### 1. Error Messages

**Current State:**
- Generic error messages
- No user-friendly explanations

**Improvements:**

```typescript
// Instead of: "Cannot read file"
// Use: "File not found: src/App.tsx. Did you mean src/app.tsx?"

// Instead of: "Validation failed"
// Use: "This file doesn't exist in your workspace"

// Instead of: "Failed to extract context"
// Use: "This file is too large (5 MB). Maximum supported size is 1 MB."
```

### 2. Loading States

**Current State:**
- No progress indication during extraction
- User doesn't know if system is working

**Proposed:**
```typescript
// Add progress tracking
interface ExtractionProgress {
    total: number
    completed: number
    current: string
}

// Emit progress events
this._onProgress.fire({
    total: mentions.length,
    completed: index,
    current: mention.raw
})
```

### 3. Autocomplete Performance

**Current State:**
- 150ms debounce
- May still lag on large workspaces

**Improvements:**
- Virtual scrolling for >100 results
- Cache recent searches
- Prioritize recently used files
- Show "Loading..." state

---

## Validation Improvements

### 1. Real-time Validation

**Current State:**
- Validation on submit only
- No visual feedback during typing

**Proposed:**
```typescript
// Add validation decorator
interface MentionValidationResult {
    valid: boolean
    error?: string
    suggestion?: string
}

// Show inline errors
@/src/Appp.tsx ❌ File not found. Did you mean @/src/App.tsx?
@/very-large-file.bin ⚠️ Binary file (will show metadata only)
@/docs/ ✓ Valid folder
```

### 2. Fuzzy Path Matching

**Current State:**
- Exact path match required
- No suggestions for typos

**Proposed:**
```typescript
// Use fuzzy search to suggest corrections
import * as fuzzysearch from 'fuzzysearch'

if (fileNotFound) {
    const allFiles = await fileSearchService.getAllFiles()
    const suggestions = allFiles
        .filter(f => fuzzysearch(filePath, f.path))
        .slice(0, 3)
    
    return {
        valid: false,
        error: 'File not found',
        suggestions: suggestions.map(s => s.path)
    }
}
```

---

## Accessibility Improvements

### 1. Keyboard Navigation

**Current State:**
- Basic arrow key support
- No keyboard shortcuts

**Improvements:**
- `Ctrl+Space`: Trigger autocomplete
- `Tab`: Accept suggestion
- `Esc`: Close autocomplete
- `↑/↓`: Navigate suggestions
- `Enter`: Select suggestion

### 2. Screen Reader Support

**Current State:**
- No ARIA labels
- No announcements

**Proposed:**
```tsx
<div
    role="listbox"
    aria-label="File suggestions"
    aria-activedescendant={`suggestion-${selectedIndex}`}
>
    {suggestions.map((item, i) => (
        <div
            key={i}
            id={`suggestion-${i}`}
            role="option"
            aria-selected={i === selectedIndex}
        >
            {item.label}
        </div>
    ))}
</div>
```

### 3. High Contrast Theme Support

**Current State:**
- Custom mention colors
- May not respect theme

**Proposed:**
```css
.mention {
    /* Use theme variables */
    color: var(--vscode-textLink-foreground);
    background: var(--vscode-textLink-activeForeground);
}

@media (prefers-contrast: high) {
    .mention {
        border: 2px solid var(--vscode-contrastBorder);
    }
}
```

---

## Performance Monitoring

### 1. Add Performance Metrics

```typescript
interface MentionPerformanceMetrics {
    parseTime: number
    extractTime: number
    mentionCount: number
    cacheHitRate: number
    errors: number
}

// Track metrics
const startParse = performance.now()
const mentions = parser.parseMentions(text)
const parseTime = performance.now() - startParse

const startExtract = performance.now()
const contexts = await extractor.extractContext(mentions)
const extractTime = performance.now() - startExtract

// Log slow operations
if (extractTime > 1000) {
    console.warn(`Slow mention extraction: ${extractTime}ms for ${mentions.length} mentions`)
}
```

### 2. Add Telemetry

```typescript
// Track usage patterns (opt-in only)
interface MentionUsageTelemetry {
    mostUsedType: MentionType
    avgMentionsPerMessage: number
    autocompleteAcceptRate: number
    errorRate: number
}
```

---

## Implementation Priority

### Phase 1: Critical Fixes (Day 1)
- [x] ✅ Fix FileSearchService TTL test
- [ ] 🔧 Add large file handling (1 MB limit)
- [ ] 🔧 Add binary file detection
- [ ] 🔧 Improve error messages

### Phase 2: Edge Cases (Day 2)
- [ ] Multi-root workspace support
- [ ] Circular folder reference detection
- [ ] Terminal output limits
- [ ] Path encoding issues

### Phase 3: Polish (Day 3)
- [ ] Better error messages
- [ ] Validation improvements
- [ ] Accessibility enhancements
- [ ] Performance monitoring

### Phase 4: Cross-Platform Testing
- [ ] Test on Windows
- [ ] Test on Linux
- [ ] Test on WSL
- [ ] Document platform-specific issues

---

## Success Criteria

### Must Have (v3.6.0)
- [x] All mention tests passing (143/143)
- [ ] No crashes on edge cases
- [ ] Graceful error handling
- [ ] Clear error messages

### Should Have (v3.6.0)
- [ ] Binary file detection
- [ ] Large file handling
- [ ] Multi-root workspace support
- [ ] Better validation feedback

### Nice to Have (v3.7.0)
- [ ] Fuzzy path suggestions
- [ ] Performance telemetry
- [ ] Advanced accessibility
- [ ] Loading progress UI

---

## Testing Checklist

### Edge Cases
- [ ] Very large files (>1 MB, >10 MB)
- [ ] Binary files (.jpg, .pdf, .exe)
- [ ] Empty files and folders
- [ ] Non-existent paths
- [ ] Circular symbolic links
- [ ] Unicode paths (中文, 日本語, emoji)
- [ ] Special characters (spaces, #, $, &)
- [ ] Multi-root workspaces
- [ ] No workspace open

### Performance
- [ ] 50+ mentions in one message
- [ ] Large workspace (1000+ files)
- [ ] Deep folder structures (10+ levels)
- [ ] Multiple concurrent extractions

### Cross-Platform
- [ ] macOS path separators
- [ ] Windows path separators
- [ ] Linux path separators
- [ ] WSL paths (/mnt/c/...)

### Accessibility
- [ ] Keyboard-only navigation
- [ ] Screen reader compatibility
- [ ] High contrast theme support
- [ ] Focus indicators

---

## Next Steps

1. ✅ Fix FileSearchService test
2. 🔧 Implement large file handling
3. 🔧 Add binary file detection
4. 🔧 Improve error messages
5. Test on Windows/Linux
6. Update documentation
7. Create release notes

**Status:** Phase 1 in progress
**ETA:** October 28, 2025
