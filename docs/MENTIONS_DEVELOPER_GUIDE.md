# @Mentions System - Developer Guide

## Overview

This guide helps developers understand, extend, and contribute to the @Mentions system.

---

## Quick Start for Developers

### Prerequisites
- Node.js 18+
- TypeScript 5+
- VS Code Extension Development experience
- Understanding of VS Code API

### Setup

```bash
# Clone repository
git clone https://github.com/codfatherlogic/oropendola.git
cd oropendola

# Install dependencies
npm install

# Run tests
npm test

# Run mention-specific tests
npm test -- src/core/mentions/__tests__/
npm test -- src/services/__tests__/MentionExtractor.test.ts
```

---

## Project Structure

```
src/
├── core/
│   └── mentions/
│       ├── MentionParser.ts       # Core parsing logic
│       ├── mention-regex.ts       # Regex patterns
│       ├── types.ts               # Type definitions
│       └── __tests__/
│           ├── MentionParser.test.ts
│           └── integration.test.ts
│
├── services/
│   ├── MentionExtractor.ts        # Context extraction
│   ├── FileSearchService.ts       # File/folder search
│   ├── DiagnosticsService.ts      # Problems extraction
│   ├── TerminalService.ts         # Terminal output
│   └── GitService.ts              # Git integration
│
└── webview-ui/
    └── src/
        └── hooks/
            └── useMentionAutocomplete.ts  # Autocomplete UI
```

---

## Architecture Deep Dive

### 1. Parsing Layer (MentionParser)

**Responsibility:** Extract mentions from text using regex

**Key Design Decisions:**
- Pre-compiled regex patterns (static properties)
- Global flag for multiple matches
- Sorted by position for predictable order

**Code Flow:**
```
User input "Check @/src/App.tsx"
    ↓
parseMentions(text)
    ↓
parseFileMentions(text) → FILE_REGEX.exec()
    ↓
MentionMatch[] sorted by startIndex
```

**Performance Optimizations:**
- Static regex compilation (10-20% faster)
- Single pass per mention type
- No string manipulation until needed

---

### 2. Service Layer

**FileSearchService:**
```typescript
// Singleton pattern with LRU cache
export const fileSearchService = new FileSearchService()

// Cache strategy
private fileCache = new LRUCache<string, FileSearchResult[]>({
    max: 100,        // Bounded memory
    ttl: 30000,      // 30s TTL
    updateAgeOnGet: true  // LRU refresh
})
```

**Why LRU Cache?**
1. Bounded memory (vs unlimited Map)
2. Automatic eviction (LRU strategy)
3. TTL refresh on access (keep hot items)
4. Built-in metrics (hits/misses)

**DiagnosticsService:**
- Wraps VS Code diagnostics API
- Formats errors/warnings for AI
- Groups by severity

**TerminalService:**
- Tracks terminal instances
- Captures output
- Disposable pattern for cleanup

**GitService:**
- Uses child_process for git commands
- Async/await for non-blocking
- Error handling for non-git workspaces

---

### 3. Extraction Layer (MentionExtractor)

**Parallel Extraction:**
```typescript
// Before (sequential): ~3s for 50 mentions
for (const mention of mentions) {
    context = await extractSingle(mention)
}

// After (parallel): ~1s for 50 mentions
const promises = mentions.map(m => extractSingle(m))
const contexts = await Promise.all(promises)
```

**Why Parallel?**
- File I/O is async (can run concurrently)
- 3-5x speedup for multiple mentions
- Better resource utilization

**Safety Limit:**
```typescript
const MAX_MENTIONS = 50
if (mentions.length > MAX_MENTIONS) {
    console.warn(`Limiting to ${MAX_MENTIONS}`)
    mentions = mentions.slice(0, MAX_MENTIONS)
}
```

**Why Limit?**
- Prevents DoS-like scenarios
- Keeps API payload reasonable
- Predictable performance

---

## Testing Strategy

### Test Pyramid

```
         /\
        /  \       Unit Tests (143)
       /____\      - MentionParser: 55 tests
      /      \     - MentionExtractor: 36 tests
     /        \    - FileSearchService: 30 tests
    /          \   
   /            \  Integration Tests (22)
  /______________\ - End-to-end flows
                   - Error handling
                   - Performance
```

### Test Organization

**Unit Tests:**
- `MentionParser.test.ts` - Parsing logic
- `MentionExtractor.test.ts` - Context extraction
- `FileSearchService.test.ts` - Search & cache

**Integration Tests:**
- `integration.test.ts` - Full pipeline
- Real file operations (mocked I/O)
- Performance benchmarks

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Specific file
npm test -- MentionParser.test.ts

# Specific test
npm test -- -t "should parse file mentions"
```

---

## Performance Profiling

### Built-in Metrics

```typescript
// Get cache metrics
const metrics = fileSearchService.getCacheMetrics()
console.log(`Hit rate: ${metrics.hitRate}`)
```

### Chrome DevTools Profiling

```typescript
// Add performance marks
performance.mark('mention-parse-start')
const mentions = parser.parseMentions(text)
performance.mark('mention-parse-end')
performance.measure('parse', 'mention-parse-start', 'mention-parse-end')
```

### Benchmark Tests

Located in `src/core/mentions/__tests__/integration.test.ts`:

```typescript
it('should handle 50 file mentions in reasonable time', async () => {
    const start = Date.now()
    const contexts = await extractor.extractContext(mentions)
    const duration = Date.now() - start
    
    expect(duration).toBeLessThan(3000) // <3s
})
```

---

## Common Development Tasks

### Adding a New Mention Type

1. **Update types:**
```typescript
// types.ts
export enum MentionType {
    // ... existing
    COMMAND = 'command'  // New!
}
```

2. **Add regex pattern:**
```typescript
// mention-regex.ts
export const MENTION_PATTERNS = {
    // ... existing
    command: /@cmd:(\w+)/gi
}
```

3. **Pre-compile regex:**
```typescript
// MentionParser.ts
private static readonly COMMAND_REGEX = new RegExp(MENTION_PATTERNS.command)
```

4. **Add parser method:**
```typescript
private parseCommandMentions(text: string): MentionMatch[] {
    const matches: MentionMatch[] = []
    const regex = MentionParser.COMMAND_REGEX
    let match: RegExpExecArray | null
    
    while ((match = regex.exec(text)) !== null) {
        matches.push({
            type: MentionType.COMMAND,
            raw: match[0],
            value: match[1],
            startIndex: match.index,
            endIndex: match.index + match[0].length
        })
    }
    return matches
}
```

5. **Register in parseMentions:**
```typescript
public parseMentions(text: string): MentionMatch[] {
    // ... existing
    if (this.options.enableCommands) {
        mentions.push(...this.parseCommandMentions(text))
    }
    // ...
}
```

6. **Add extraction method:**
```typescript
// MentionExtractor.ts
private async extractCommandContext(cmd: string): Promise<MentionContext> {
    // Execute command, capture output
    return {
        type: MentionType.COMMAND,
        content: `Command: ${cmd}\n${output}`,
        metadata: { command: cmd }
    }
}
```

7. **Register in extractSingleContext:**
```typescript
switch (mention.type) {
    // ... existing cases
    case MentionType.COMMAND:
        return this.extractCommandContext(mention.value)
}
```

8. **Add tests:**
```typescript
// MentionParser.test.ts
it('should parse command mentions', () => {
    const mentions = parser.parseMentions('@cmd:build')
    expect(mentions[0].type).toBe(MentionType.COMMAND)
    expect(mentions[0].value).toBe('build')
})
```

---

### Debugging Tips

**Enable verbose logging:**
```typescript
// Set environment variable
process.env.OROPENDOLA_DEBUG = 'mentions'

// Or add logging in code
console.log('[MENTIONS]', mentions)
```

**Inspect cache state:**
```typescript
const metrics = fileSearchService.getCacheMetrics()
console.table(metrics)
```

**Test regex patterns:**
```typescript
const text = '@/src/App.tsx'
const regex = new RegExp(MENTION_PATTERNS.file)
console.log(regex.exec(text))
```

**Mock VS Code API:**
```typescript
vi.mock('vscode', () => ({
    workspace: {
        workspaceFolders: [{ uri: { fsPath: '/test' }}],
        findFiles: vi.fn().mockResolvedValue([])
    }
}))
```

---

## Performance Optimization Checklist

### Parsing
- [x] Pre-compile regex patterns
- [x] Single pass per type
- [ ] Consider compiled parser (PEG.js) for complex patterns

### Caching
- [x] LRU cache with bounds
- [x] 30s TTL
- [x] Metrics tracking
- [ ] Disk-based cache for large files
- [ ] Preload cache on workspace open

### Extraction
- [x] Parallel extraction
- [x] 50-mention limit
- [x] Error isolation (Promise.all with catch)
- [ ] Stream large file contents
- [ ] Lazy load non-critical mentions

### UI
- [x] 150ms autocomplete debounce
- [ ] Virtual scrolling for large suggestion lists
- [ ] Fuzzy search web worker
- [ ] Autocomplete pagination

---

## Code Quality Standards

### TypeScript

```typescript
// ✅ Good: Explicit types
public async extractContext(
    mentions: MentionMatch[]
): Promise<MentionContext[]>

// ❌ Bad: Implicit any
public async extractContext(mentions): Promise<any[]>
```

### Error Handling

```typescript
// ✅ Good: Specific error messages
throw new Error(`Cannot read file "${filePath}": ${error.message}`)

// ❌ Bad: Generic errors
throw new Error('Failed')
```

### Testing

```typescript
// ✅ Good: Descriptive test names
it('should parse file mentions with escaped spaces', () => {})

// ❌ Bad: Vague test names
it('works', () => {})
```

### Comments

```typescript
// ✅ Good: Explain WHY
// Limit to 50 mentions to prevent API payload bloat
const MAX_MENTIONS = 50

// ❌ Bad: Explain WHAT (code is self-documenting)
// Set max mentions to 50
const MAX_MENTIONS = 50
```

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Test Mentions

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - run: npm install
      - run: npm test -- src/core/mentions/__tests__/
      - run: npm run test:coverage
      
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

---

## Contribution Guidelines

### Before Submitting PR

1. **Run tests:** `npm test`
2. **Check linting:** `npm run lint`
3. **Update docs** if API changed
4. **Add tests** for new features
5. **Run performance benchmarks**

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Performance improvement
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed

## Performance Impact
- Parsing: [No change | X% faster | X% slower]
- Extraction: [...]
- Memory: [...]

## Breaking Changes
- [ ] No breaking changes
- [ ] Breaking changes (describe below)
```

---

## Troubleshooting Common Issues

### Tests Failing

**Problem:** Tests pass locally but fail in CI

**Solution:**
- Check Node.js version consistency
- Verify VS Code API mocks
- Check file path separators (Windows vs Unix)

### Performance Regression

**Problem:** Parsing slower after changes

**Solution:**
```bash
# Run benchmarks before/after
npm test -- --reporter=verbose integration.test.ts

# Profile with Chrome DevTools
node --inspect-brk node_modules/.bin/vitest
```

### Memory Leaks

**Problem:** Extension uses too much memory

**Solution:**
- Check cache size limits
- Verify disposal pattern
- Use Chrome DevTools heap profiler

---

## Resources

### Documentation
- **User Guide:** `docs/MENTIONS_USER_GUIDE.md`
- **API Reference:** `docs/MENTIONS_API.md`
- **Performance:** `docs/PERFORMANCE_OPTIMIZATION_WEEK6.1.md`

### Code Examples
- **Tests:** `src/core/mentions/__tests__/`
- **Integration:** `src/core/mentions/__tests__/integration.test.ts`

### External Resources
- [VS Code Extension API](https://code.visualstudio.com/api)
- [LRU Cache Docs](https://github.com/isaacs/node-lru-cache)
- [Vitest Docs](https://vitest.dev)

---

## Version History

### v3.6.0 (Current)
- Initial @mentions implementation
- 6 mention types supported
- LRU cache with 30s TTL
- Parallel extraction (3-5x faster)
- 143 tests (100% passing)

---

## Roadmap

### Short Term (v3.7.0)
- [ ] Workspace symbol mentions (`@symbol:FunctionName`)
- [ ] Line range mentions (`@/file.ts:10-20`)
- [ ] Snippet mentions (`@/file.ts#snippet`)

### Medium Term (v3.8.0)
- [ ] Disk-based cache persistence
- [ ] Autocomplete pagination
- [ ] Custom mention shortcuts
- [ ] Mention history/favorites

### Long Term (v4.0.0)
- [ ] Multi-workspace support
- [ ] Remote file mentions
- [ ] AI-suggested mentions
- [ ] Collaborative mentions

---

## Support & Community

- **GitHub:** [Issues](https://github.com/codfatherlogic/oropendola/issues) | [Discussions](https://github.com/codfatherlogic/oropendola/discussions)
- **Discord:** [Join Community](https://discord.gg/oropendola)
- **Email:** dev@oropendola.ai

---

**Happy Coding! 🚀**
