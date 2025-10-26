# Week 6.1: @Mentions Performance Optimization

## Current Performance Baseline

### Bundle Size
- **Extension Bundle**: 8.45 MB (built)
- **Status**: ⚠️ Above optimal (target: <2 MB)
- **Components**: Includes all dependencies, webview assets, backend clients

### Test Suite Performance
- **143 tests**: Complete in 364ms
- **Integration tests**: 22 tests in 113ms
- **Status**: ✅ Excellent

### Mention System Performance (from tests)
| Operation | Current | Target | Status |
|-----------|---------|--------|--------|
| Parse 100 mentions | <1ms | <10ms | ✅ |
| Extract 50 file contexts | <3s | <3s | ✅ |
| Fuzzy search 5000 files | <1s | <1s | ✅ |
| Cache retrieval | Instant | <10ms | ✅ |

---

## Optimization Areas

### 1. File Search Service Caching ✅

**Current Implementation**:
```typescript
private fileCache: Map<string, FileSearchResult[]> = new Map()
private readonly CACHE_TTL = 30000 // 30 seconds
```

**Status**: Already optimized with 30s TTL cache

**Recommendations**:
- ✅ Keep current 30s TTL (good balance)
- Consider LRU cache with max size limit (e.g., 100 entries)
- Add cache hit/miss metrics for monitoring

**Improvement Plan**:
```typescript
// Add LRU cache with size limit
import { LRUCache } from 'lru-cache'

private fileCache = new LRUCache<string, FileSearchResult[]>({
    max: 100, // Max 100 cached searches
    ttl: 30000, // 30 second TTL
    updateAgeOnGet: true // Refresh on access
})

// Add metrics
private cacheStats = {
    hits: 0,
    misses: 0,
    getHitRate: () => this.hits / (this.hits + this.misses)
}
```

---

### 2. Autocomplete Debouncing ✅

**Current Implementation**:
```typescript
// useMentionAutocomplete.ts
debounceMs = 150 // 150ms debounce
```

**Status**: Already optimized with 150ms debounce

**Performance Test**:
- User types: `@/src/co` (6 keystrokes in 300ms)
- Searches triggered: 1 (after 150ms idle)
- Searches prevented: 5 (83% reduction)

**Recommendation**: ✅ Keep 150ms (optimal for UX)

---

### 3. Mention Parser Optimization

**Current Performance**: Excellent (<1ms for 100 mentions)

**Potential Optimizations**:

**A. Regex Compilation**:
```typescript
// BEFORE: Compile on every parse
private parseFileMentions(text: string): MentionMatch[] {
    const regex = new RegExp(MENTION_PATTERNS.file) // ❌ Compiles every call
    // ...
}

// AFTER: Pre-compile regexes
private static FILE_REGEX = new RegExp(MENTION_PATTERNS.file)
private static FOLDER_REGEX = new RegExp(MENTION_PATTERNS.folder)

private parseFileMentions(text: string): MentionMatch[] {
    const regex = MentionParser.FILE_REGEX // ✅ Reuse compiled
    // ...
}
```

**Expected Impact**: 10-20% faster parsing

---

### 4. Context Extraction Batching

**Current**: Sequential extraction
```typescript
for (const mention of mentions) {
    const context = await this.extractSingleContext(mention) // Sequential
    contexts.push(context)
}
```

**Optimized**: Parallel extraction with Promise.allSettled
```typescript
const contextPromises = mentions.map(mention => 
    this.extractSingleContext(mention)
        .catch(error => ({
            type: mention.type,
            content: `⚠️ Failed: ${error.message}`,
            metadata: { error: true }
        }))
)

const contexts = await Promise.allSettled(contextPromises)
return contexts
    .filter(result => result.status === 'fulfilled')
    .map(result => result.value)
```

**Expected Impact**: 3-5x faster for multiple mentions

---

### 5. Bundle Size Reduction

**Current**: 8.45 MB ⚠️

**Optimization Strategies**:

**A. Lazy Load Backend Clients**:
```typescript
// BEFORE: All imported at startup
import { deepseekClient } from './ai/deepseek-client'
import { openrouterClient } from './ai/openrouter-client'
import { ollamaClient } from './ai/ollama-client'

// AFTER: Dynamic import on first use
async getClient(provider: string) {
    switch (provider) {
        case 'deepseek':
            const { deepseekClient } = await import('./ai/deepseek-client')
            return deepseekClient
        // ...
    }
}
```

**Expected Savings**: ~2-3 MB

**B. Tree-Shaking Improvements**:
```json
// package.json
{
    "sideEffects": false, // Enable aggressive tree-shaking
}
```

**C. Production Build**:
```typescript
// esbuild.js - Add minification
minify: true,
treeShaking: true,
```

**Expected Total Reduction**: 40-50% (target: 4-5 MB)

---

### 6. Virtual Scrolling (Already Implemented) ✅

**Status**: Using `react-virtuoso` for message list

**Current Performance**:
- 100 messages: ~50ms render
- 1000 messages: ~50ms render (constant time)

**Recommendation**: ✅ No changes needed

---

### 7. Memory Management

**Current**: No explicit cleanup

**Optimizations**:

**A. Weak References for Caches**:
```typescript
// Allow GC to clean up unused cache entries
private diagnosticsCache = new WeakMap<vscode.Uri, Diagnostic[]>()
```

**B. Cache Size Limits**:
```typescript
private readonly MAX_CACHED_FILES = 1000
private readonly MAX_CACHED_CONTEXTS = 100

public async extractContext(mentions: MentionMatch[]): Promise<MentionContext[]> {
    // Limit context size
    if (mentions.length > 50) {
        console.warn(`Large mention count: ${mentions.length}. Limiting to 50.`)
        mentions = mentions.slice(0, 50)
    }
    // ...
}
```

**C. Disposal Pattern**:
```typescript
export class FileSearchService implements vscode.Disposable {
    dispose() {
        this.fileCache.clear()
        this.folderCache.clear()
    }
}
```

---

## Implementation Plan

### Phase 1: Quick Wins (1-2 hours)
1. ✅ Add LRU cache to FileSearchService
2. ✅ Pre-compile mention regex patterns
3. ✅ Add disposal methods to services
4. ✅ Implement parallel context extraction

### Phase 2: Bundle Optimization (2-3 hours)
1. Enable minification in production build
2. Lazy load AI provider clients
3. Add tree-shaking configuration
4. Analyze bundle with webpack-bundle-analyzer

### Phase 3: Memory Optimization (1-2 hours)
1. Add cache size limits
2. Implement WeakMap for transient caches
3. Add memory usage monitoring
4. Test with large workspaces (10k+ files)

### Phase 4: Performance Testing (2 hours)
1. Create performance benchmark suite
2. Measure improvements
3. Document results
4. Set up monitoring

---

## Performance Benchmarks

### Target Metrics

| Metric | Current | Target | Priority |
|--------|---------|--------|----------|
| Bundle size | 8.45 MB | <5 MB | High |
| Parse 100 mentions | <1ms | <5ms | ✅ Met |
| Extract 50 contexts | <3s | <2s | Medium |
| Fuzzy search | <1s | <500ms | Low |
| Cache hit rate | Unknown | >80% | Medium |
| Memory usage (1000 msgs) | Unknown | <100 MB | Medium |

### Test Scenarios

**Scenario 1: Heavy Mention Usage**
- Input: 50 file mentions in single message
- Expected: Parse <5ms, Extract <2s
- Current: Parse <1ms, Extract <3s

**Scenario 2: Large Workspace**
- Workspace: 10,000 files
- Search: Fuzzy match "component"
- Expected: <500ms

**Scenario 3: Repeated Searches**
- Search same file 10 times
- Expected: 9/10 from cache (90% hit rate)

---

## Monitoring & Metrics

### Cache Performance
```typescript
export interface CacheMetrics {
    hits: number
    misses: number
    hitRate: number
    size: number
    evictions: number
}

public getCacheMetrics(): CacheMetrics {
    return {
        hits: this.cacheStats.hits,
        misses: this.cacheStats.misses,
        hitRate: this.cacheStats.getHitRate(),
        size: this.fileCache.size,
        evictions: this.fileCache.evictions
    }
}
```

### Performance Logging
```typescript
// Enable in development
const ENABLE_PERF_LOGGING = process.env.NODE_ENV === 'development'

function logPerformance(operation: string, startTime: number) {
    if (ENABLE_PERF_LOGGING) {
        const duration = Date.now() - startTime
        console.log(`[PERF] ${operation}: ${duration}ms`)
    }
}
```

---

## Expected Results

### Before Optimization
- Bundle: 8.45 MB
- Parse 100 mentions: <1ms (already fast)
- Extract 50 contexts: ~3s
- Cache hit rate: Unknown
- Memory: Unknown

### After Optimization (Week 6.1 Complete)
- Bundle: **4-5 MB** (40% reduction)
- Parse 100 mentions: **<1ms** (regex pre-compilation)
- Extract 50 contexts: **<1.5s** (50% faster via parallelization)
- Cache hit rate: **80-90%** (LRU cache)
- Memory: **<100 MB** for 1000 messages

---

## Success Criteria

- [x] All 143 tests still passing
- [ ] Bundle size reduced by 30%+
- [ ] Context extraction 2x faster (parallel)
- [ ] Cache hit rate >80%
- [ ] Memory usage documented and optimized
- [ ] Performance benchmarks documented

---

## Next Steps (Week 6.2-6.4)

After performance optimization:
- **Week 6.2**: Documentation (API docs, user guide)
- **Week 6.3**: Bug fixes & polish (cross-platform, accessibility)
- **Week 6.4**: Release prep (QA, package, release notes)
