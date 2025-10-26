# @Mentions System - API Documentation

## Overview

This document provides comprehensive API documentation for developers working with or extending the @Mentions system.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Input Layer                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Chat Input Box  →  @trigger  →  Autocomplete UI    │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Core Parsing Layer                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  MentionParser                                        │  │
│  │  - parseMentions(text): MentionMatch[]              │  │
│  │  - Uses pre-compiled regex patterns                 │  │
│  │  - Returns mention type, value, position            │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Service Layer                              │
│  ┌────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ FileSearch     │  │ Diagnostics     │  │  Terminal   │ │
│  │ Service        │  │ Service         │  │  Service    │ │
│  └────────────────┘  └─────────────────┘  └─────────────┘ │
│  ┌────────────────┐  ┌─────────────────┐                  │
│  │ Git Service    │  │ MentionExtractor│                  │
│  └────────────────┘  └─────────────────┘                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                 Context Extraction Layer                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  MentionExtractor                                     │  │
│  │  - extractContext(mentions): MentionContext[]        │  │
│  │  - Parallel extraction (Promise.all)                │  │
│  │  - Limits to 50 mentions                            │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      AI Integration                          │
│  Formatted contexts injected into AI prompt                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Types

### MentionType

Enum defining all supported mention types.

```typescript
export enum MentionType {
    FILE = 'file',
    FOLDER = 'folder',
    PROBLEMS = 'problems',
    TERMINAL = 'terminal',
    GIT = 'git',
    URL = 'url'
}
```

---

### MentionMatch

Represents a parsed mention from text.

```typescript
export interface MentionMatch {
    type: MentionType          // Type of mention
    raw: string                // Original text including @ symbol
    value: string              // Parsed value (path, URL, etc.)
    startIndex: number         // Start position in text
    endIndex: number           // End position in text
}
```

**Example:**
```typescript
{
    type: MentionType.FILE,
    raw: '@/src/App.tsx',
    value: '/src/App.tsx',
    startIndex: 10,
    endIndex: 24
}
```

---

### MentionContext

Represents extracted context for a mention.

```typescript
export interface MentionContext {
    type: MentionType              // Type of mention
    content: string                // Formatted content for AI
    metadata?: Record<string, any> // Additional metadata
}
```

**Example:**
```typescript
{
    type: MentionType.FILE,
    content: '## File: /src/App.tsx\n\n```typescript\n...\n```',
    metadata: {
        path: '/workspace/src/App.tsx',
        size: 1234,
        modified: '2024-01-01T00:00:00.000Z'
    }
}
```

---

### FileSearchResult

Result from file/folder search operations.

```typescript
export interface FileSearchResult {
    path: string           // Absolute path
    relativePath: string   // Relative to workspace
    type: 'file' | 'folder'
    icon?: string          // Emoji icon
    score?: number         // Fuzzy search score (0-100)
}
```

---

### AutocompleteItem

Item in autocomplete suggestions list.

```typescript
export interface AutocompleteItem {
    label: string          // Display text
    value: string          // Value to insert
    type: MentionType      // Mention type
    icon?: string          // Display icon
    description?: string   // Additional info
    score?: number         // Ranking score
}
```

---

## MentionParser API

### Constructor

```typescript
constructor(options?: Partial<MentionParserOptions>)
```

**Options:**
```typescript
interface MentionParserOptions {
    enableFiles?: boolean      // Default: true
    enableFolders?: boolean    // Default: true
    enableProblems?: boolean   // Default: true
    enableTerminal?: boolean   // Default: true
    enableGit?: boolean        // Default: true
    enableUrls?: boolean       // Default: true
}
```

**Example:**
```typescript
const parser = new MentionParser({
    enableFiles: true,
    enableFolders: false // Disable folder mentions
})
```

---

### parseMentions()

Parse all mentions from text.

```typescript
public parseMentions(text: string): MentionMatch[]
```

**Parameters:**
- `text` - Input text to parse

**Returns:**
- Array of `MentionMatch` objects, sorted by position

**Performance:**
- Pre-compiled regex patterns
- ~0.8ms for 100 mentions

**Example:**
```typescript
const parser = new MentionParser()
const mentions = parser.parseMentions(
    'Check @/src/App.tsx and @/tests/ for issues'
)
// Returns: [
//   { type: FILE, value: '/src/App.tsx', ... },
//   { type: FOLDER, value: '/tests/', ... }
// ]
```

---

### hasMentions()

Quick check if text contains mentions.

```typescript
public hasMentions(text: string): boolean
```

**Example:**
```typescript
if (parser.hasMentions(userInput)) {
    const mentions = parser.parseMentions(userInput)
    // Process mentions...
}
```

---

### validateMention()

Validate mention syntax.

```typescript
public validateMention(mention: string): {
    valid: boolean
    type?: MentionType
    error?: string
}
```

**Example:**
```typescript
const result = parser.validateMention('@/src/App.tsx')
// { valid: true, type: MentionType.FILE }

const invalid = parser.validateMention('@invalid')
// { valid: false, error: 'No matching pattern' }
```

---

## MentionExtractor API

### Constructor

```typescript
constructor()
```

Creates a new MentionExtractor instance. Services are auto-injected.

---

### extractContext()

Extract context for all mentions (parallel).

```typescript
public async extractContext(
    mentions: MentionMatch[]
): Promise<MentionContext[]>
```

**Parameters:**
- `mentions` - Array of parsed mentions

**Returns:**
- Array of `MentionContext` objects with formatted content

**Performance:**
- Parallel extraction via `Promise.all()`
- 3-5x faster than sequential
- Auto-limits to 50 mentions (logs warning)

**Example:**
```typescript
const extractor = new MentionExtractor()
const mentions = parser.parseMentions(text)
const contexts = await extractor.extractContext(mentions)

contexts.forEach(ctx => {
    console.log(`${ctx.type}: ${ctx.content.length} chars`)
})
```

**Error Handling:**
```typescript
// Failed extractions return error context
{
    type: MentionType.FILE,
    content: '⚠️ Failed to extract context: ENOENT',
    metadata: { error: true, mention: '@/missing.ts' }
}
```

---

## FileSearchService API

### Constructor

```typescript
constructor()
```

Creates service with LRU cache (max 100 file searches, 50 folder searches).

---

### searchFiles()

Search for files in workspace.

```typescript
public async searchFiles(
    query: string,
    maxResults?: number
): Promise<FileSearchResult[]>
```

**Parameters:**
- `query` - Search query (filename or pattern)
- `maxResults` - Max results (default: 50)

**Returns:**
- Array of matching files with metadata

**Example:**
```typescript
const service = new FileSearchService()
const results = await service.searchFiles('App.tsx')
// [{ path: '/workspace/src/App.tsx', type: 'file', ... }]
```

---

### searchFolders()

Search for folders in workspace.

```typescript
public async searchFolders(
    query: string,
    maxResults?: number
): Promise<FileSearchResult[]>
```

**Example:**
```typescript
const folders = await service.searchFolders('components')
// [{ path: '/workspace/src/components', type: 'folder', ... }]
```

---

### fuzzySearchFiles()

Fuzzy search with scoring.

```typescript
public async fuzzySearchFiles(
    query: string,
    maxResults?: number
): Promise<FileSearchResult[]>
```

**Scoring Algorithm:**
- Exact match: +100 points
- Filename match: +50 points
- Consecutive chars: +10 points per char
- Case match: +5 points

**Example:**
```typescript
const results = await service.fuzzySearchFiles('cmp')
// Matches: 'components/Button.tsx', 'comp.ts', etc.
// Sorted by score (highest first)
```

---

### getAllFiles()

Get all workspace files (cached).

```typescript
public async getAllFiles(): Promise<FileSearchResult[]>
```

**Cache:**
- 30-second TTL
- LRU eviction
- Limits to 10,000 files

**Example:**
```typescript
const allFiles = await service.getAllFiles()
console.log(`Workspace has ${allFiles.length} files`)
```

---

### getCacheMetrics()

Get cache performance metrics.

```typescript
public getCacheMetrics(): CacheMetrics

interface CacheMetrics {
    hits: number
    misses: number
    hitRate: number
    filesCacheSize: number
    foldersCacheSize: number
}
```

**Example:**
```typescript
const metrics = service.getCacheMetrics()
console.log(`Cache hit rate: ${(metrics.hitRate * 100).toFixed(2)}%`)
```

---

### clearCache()

Manually clear cache.

```typescript
public clearCache(): void
```

---

### dispose()

Cleanup resources (implements `vscode.Disposable`).

```typescript
public dispose(): void
```

**Example:**
```typescript
// Register for automatic disposal
context.subscriptions.push(fileSearchService)
```

---

## Regex Patterns

### Pattern Reference

Located in `src/core/mentions/mention-regex.ts`:

```typescript
export const MENTION_PATTERNS = {
    // File: @/path/to/file.ext
    file: /@(?:\.?\.?\/)?(?:[^\s@]|\\ )+\.[a-zA-Z0-9]+(?!\/)/g,
    
    // Folder: @/path/to/folder/ (must end with /)
    folder: /@(?:\.?\.?\/)?(?:[^\s@]|\\ )*\/(?=\s|$)/g,
    
    // Problems: @problems
    problems: /@problems\b/gi,
    
    // Terminal: @terminal [id]
    terminal: /@terminal(?:\s+(\d+))?(?=\s|$)/gi,
    
    // Git: @git [ref]
    git: /@git\b(?:\s+([\w\/-]+))?(?=\s|$)/gi,
    
    // URL: @https://...
    url: /@(https?:\/\/[^\s]+)/gi
}
```

---

### Utility Functions

```typescript
// Escape spaces in paths
export function escapeSpaces(path: string): string

// Unescape spaces from parsed values
export function unescapeSpaces(value: string): string
```

**Example:**
```typescript
const escaped = escapeSpaces('/path/my file.ts')
// '/path/my\ file.ts'

const unescaped = unescapeSpaces('/path/my\\ file.ts')
// '/path/my file.ts'
```

---

## Performance Optimizations

### Pre-Compiled Regexes

```typescript
// Static compilation (one-time cost)
private static readonly FILE_REGEX = new RegExp(MENTION_PATTERNS.file)
private static readonly FOLDER_REGEX = new RegExp(MENTION_PATTERNS.folder)
// ... etc
```

**Benefit:** 10-20% faster parsing

---

### LRU Cache

```typescript
import { LRUCache } from 'lru-cache'

private fileCache = new LRUCache<string, FileSearchResult[]>({
    max: 100,              // Max entries
    ttl: 30000,            // 30 second TTL
    updateAgeOnGet: true   // Refresh on access
})
```

**Benefits:**
- Bounded memory usage
- Automatic eviction
- TTL refresh on access
- ~90% cache hit rate

---

### Parallel Extraction

```typescript
// Old (sequential):
for (const mention of mentions) {
    const context = await extractSingle(mention)
}

// New (parallel):
const promises = mentions.map(m => extractSingle(m))
const contexts = await Promise.all(promises)
```

**Benefit:** 3-5x faster for multiple mentions

---

## Extension Points

### Adding New Mention Types

1. **Add to MentionType enum:**
```typescript
export enum MentionType {
    // ... existing types
    CUSTOM = 'custom'
}
```

2. **Add regex pattern:**
```typescript
export const MENTION_PATTERNS = {
    // ... existing patterns
    custom: /@custom:(\w+)/gi
}
```

3. **Add parser method:**
```typescript
private parseCustomMentions(text: string): MentionMatch[] {
    const matches: MentionMatch[] = []
    const regex = MentionParser.CUSTOM_REGEX
    // ... parse logic
    return matches
}
```

4. **Add extractor method:**
```typescript
private async extractCustomContext(value: string): Promise<MentionContext> {
    // ... extraction logic
    return { type: MentionType.CUSTOM, content: '...' }
}
```

5. **Register in extractSingleContext:**
```typescript
case MentionType.CUSTOM:
    return this.extractCustomContext(mention.value)
```

---

### Custom File Icons

Extend the icon map in `FileSearchService`:

```typescript
private getFileIcon(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase()
    const iconMap: Record<string, string> = {
        // ... existing icons
        rs: '🦀',      // Rust
        go: '🐹',      // Go
        swift: '🐦'    // Swift
    }
    return iconMap[ext] || '📄'
}
```

---

## Testing

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest'
import { MentionParser } from './MentionParser'

describe('MentionParser', () => {
    it('should parse file mentions', () => {
        const parser = new MentionParser()
        const mentions = parser.parseMentions('@/src/App.tsx')
        
        expect(mentions).toHaveLength(1)
        expect(mentions[0].type).toBe(MentionType.FILE)
        expect(mentions[0].value).toBe('/src/App.tsx')
    })
})
```

---

### Integration Tests

```typescript
import { MentionParser, MentionExtractor } from '../'

it('should handle complete FILE mention flow', async () => {
    const parser = new MentionParser()
    const extractor = new MentionExtractor()
    
    const mentions = parser.parseMentions('@/src/App.tsx')
    const contexts = await extractor.extractContext(mentions)
    
    expect(contexts[0].type).toBe(MentionType.FILE)
    expect(contexts[0].content).toContain('```')
})
```

---

## Error Handling

### Parser Errors

```typescript
try {
    const mentions = parser.parseMentions(text)
} catch (error) {
    // Parser should never throw
    // Returns empty array for invalid input
}
```

---

### Extractor Errors

```typescript
const contexts = await extractor.extractContext(mentions)

contexts.forEach(ctx => {
    if (ctx.metadata?.error) {
        console.error(`Failed to extract: ${ctx.content}`)
    }
})
```

---

### File Not Found

```typescript
{
    type: MentionType.FILE,
    content: '⚠️ Failed to extract context: Cannot read file "/path"...',
    metadata: { error: true, mention: '@/path/file.ts' }
}
```

---

## Best Practices

### 1. Always Use Singleton Services

```typescript
// ✅ Good
import { fileSearchService } from './services/FileSearchService'
const results = await fileSearchService.searchFiles(query)

// ❌ Bad
const service = new FileSearchService() // Creates new cache
```

---

### 2. Limit Mention Count

```typescript
const MAX_MENTIONS = 50
if (mentions.length > MAX_MENTIONS) {
    console.warn(`Too many mentions: ${mentions.length}`)
    mentions = mentions.slice(0, MAX_MENTIONS)
}
```

---

### 3. Check Cache Hit Rate

```typescript
const metrics = fileSearchService.getCacheMetrics()
if (metrics.hitRate < 0.5) {
    console.warn('Low cache hit rate - consider increasing TTL')
}
```

---

### 4. Dispose Services

```typescript
export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        fileSearchService,
        // ... other disposables
    )
}
```

---

### 5. Handle Large Workspaces

```typescript
const allFiles = await fileSearchService.getAllFiles()
if (allFiles.length > 5000) {
    // Consider pagination or limiting scope
}
```

---

## Migration Guide

### From v3.5.0 to v3.6.0

**Breaking Changes:** None

**New Features:**
- @mentions system (new)

**Deprecated:** None

**Migration:**
```typescript
// No changes required
// @mentions is additive feature
```

---

## Performance Benchmarks

| Operation | Target | Actual | Status |
|-----------|--------|--------|--------|
| Parse 100 mentions | <10ms | ~0.8ms | ✅ 12x faster |
| Extract 50 contexts | <3s | ~1s | ✅ 3x faster |
| Fuzzy search 5000 files | <1s | ~400ms | ✅ 2.5x faster |
| Cache retrieval | <10ms | Instant | ✅ Excellent |

---

## API Version

**Current:** v3.6.0  
**Stability:** Stable  
**Breaking Changes:** None planned

---

## Resources

- **User Guide:** `docs/MENTIONS_USER_GUIDE.md`
- **Performance:** `docs/PERFORMANCE_OPTIMIZATION_WEEK6.1.md`
- **Tests:** `src/core/mentions/__tests__/`
- **Source:** `src/core/mentions/`, `src/services/`

---

## Support

- GitHub Issues: [oropendola/issues](https://github.com/codfatherlogic/oropendola/issues)
- Documentation: `docs/`
- Examples: `src/core/mentions/__tests__/integration.test.ts`
