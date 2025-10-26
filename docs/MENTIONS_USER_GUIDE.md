# @Mentions System - User Guide

## Overview

The **@Mentions** system allows you to reference files, folders, and project context directly in your conversations with the AI assistant. Simply type `@` and select from intelligent suggestions to inject relevant context into your prompts.

---

## Quick Start

### Basic Usage

1. **Start typing** `@` in the chat input
2. **See suggestions** appear automatically
3. **Select** with arrow keys or mouse
4. **Press Enter** or Tab to insert

**Example:**
```
@/src/App.tsx help me refactor this component
```

The AI will receive the full file content and can provide specific, contextual help.

---

## Mention Types

### 📄 File Mentions

Reference specific files in your workspace.

**Syntax:** `@/path/to/file.ext`

**Examples:**
```
@/src/components/Button.tsx
@./relative/path/utils.ts
@../parent/file.js
```

**What gets included:**
- Full file content
- File path and extension
- File size metadata
- Last modified timestamp

**Use cases:**
- Code review: `Review @/src/UserService.ts for security issues`
- Debugging: `Why is @/src/Calculator.test.ts failing?`
- Refactoring: `Optimize @/src/utils/parser.ts for performance`

---

### 📁 Folder Mentions

Reference entire folders to get structure and file listings.

**Syntax:** `@/path/to/folder/` (must end with `/`)

**Examples:**
```
@/src/components/
@./tests/
@/
```

**What gets included:**
- List of all files in folder
- Folder structure
- File count and organization

**Use cases:**
- Architecture review: `Analyze the structure of @/src/api/`
- Organization: `How should I reorganize @/src/components/?`
- Discovery: `What's in @/tests/integration/?`

---

### ⚠️ Problems Mentions

Include current workspace diagnostics and errors.

**Syntax:** `@problems`

**Examples:**
```
@problems help me fix these errors
Check @problems before merging
```

**What gets included:**
- All errors and warnings in workspace
- File locations
- Severity levels
- Error messages

**Use cases:**
- Bug fixing: `Fix all @problems in the project`
- Pre-commit check: `Are there any critical @problems?`
- Code quality: `Explain @problems and how to resolve them`

---

### 💻 Terminal Mentions

Include recent terminal output in context.

**Syntax:** `@terminal`

**Examples:**
```
@terminal what does this error mean?
Check @terminal for the test results
```

**What gets included:**
- Recent terminal output
- Command history
- Error messages from terminal

**Use cases:**
- Debugging: `@terminal shows an error, what's wrong?`
- Test analysis: `@terminal has test failures, help fix them`
- Build errors: `@terminal build failed, what's the issue?`

---

### 🔀 Git Mentions

Include git history and changes.

**Syntax:** `@git [ref]`

**Examples:**
```
@git show recent changes
@git main compare with current branch
```

**What gets included:**
- Git commit history
- Branch information
- Recent changes

**Use cases:**
- Code review: `Review changes in @git`
- History: `What changed in @git last week?`
- Branching: `Compare @git main with my branch`

---

### 🌐 URL Mentions

Reference external documentation or resources.

**Syntax:** `@https://example.com`

**Examples:**
```
@https://docs.npmjs.com/cli/v9/commands/npm-install
@https://react.dev/reference/react/useState
```

**What gets included:**
- URL reference
- Link for AI to consider

**Use cases:**
- Documentation: `Implement @https://docs.example.com/api feature`
- Standards: `Follow @https://style-guide.com conventions`

---

## Autocomplete Features

### Fuzzy Search

Type partial names to find files quickly:

```
@comp        → matches components/Button.tsx
@util/par    → matches utils/parser.ts
@test.js     → matches any test.js file
```

### Recent Files

Recently opened files appear first in suggestions.

### Path Navigation

Use relative paths from current file:
- `@./` - current directory
- `@../` - parent directory
- `@../../` - two levels up

---

## Multiple Mentions

Combine multiple mentions in a single prompt:

**Example:**
```
Compare @/src/old/Parser.ts with @/src/new/Parser.ts 
and check if @problems are resolved
```

**Limit:** Maximum 50 mentions per message (for performance)

---

## Tips & Best Practices

### ✅ Do's

1. **Be specific:** `@/src/components/Button.tsx` not `@Button`
2. **Use folders for overview:** `@/src/` to understand structure
3. **Combine with questions:** `@/config.json what does this setting mean?`
4. **Check problems first:** `@problems` before asking for help
5. **Include test files:** `@/tests/user.test.ts` when debugging

### ❌ Don'ts

1. **Don't overload:** Avoid 50+ mentions (system limits to 50)
2. **Don't mention binaries:** Skip images, PDFs, executables
3. **Don't mention node_modules:** System automatically excludes
4. **Don't forget trailing slash:** `@/src/` for folder, `@/src/file.ts` for file

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `@` | Trigger autocomplete |
| `↑` `↓` | Navigate suggestions |
| `Enter` | Insert selected mention |
| `Tab` | Insert and continue |
| `Esc` | Close autocomplete |
| `Backspace` | Remove mention text to cancel |

---

## Performance

### Fast Operations
- ✅ File search: <100ms
- ✅ Fuzzy matching: <50ms
- ✅ Cache hits: Instant

### Optimizations
- **Cache:** 30-second TTL for file searches
- **Parallel:** Multiple mentions loaded concurrently
- **Limit:** Auto-limits to 50 mentions
- **LRU Cache:** Bounded memory usage

---

## Troubleshooting

### Autocomplete Not Showing

**Problem:** Typing `@` doesn't show suggestions

**Solutions:**
1. Ensure cursor is in chat input
2. Type at least one character after `@`
3. Check workspace is opened
4. Try `@/` to force file search

### File Not Found

**Problem:** Mention shows "file not found"

**Solutions:**
1. Check file path is correct
2. Verify file exists in workspace
3. Use absolute path from workspace root
4. Check for typos in filename

### Slow Performance

**Problem:** Autocomplete is sluggish

**Solutions:**
1. Reduce workspace size (exclude large folders)
2. Clear cache: Reload VS Code window
3. Limit mentions to <20 per message
4. Check system resources

### Mention Not Including Content

**Problem:** AI doesn't seem to receive file content

**Solutions:**
1. Check file size (<1MB works best)
2. Ensure file is readable (permissions)
3. Verify mention syntax is correct
4. Check AI response for context confirmation

---

## Examples by Use Case

### Code Review
```
Review @/src/services/AuthService.ts for:
- Security vulnerabilities
- Best practices
- Performance issues
```

### Debugging
```
@/src/App.tsx is crashing when user logs in.
@problems shows some errors.
@terminal has this stack trace.
What's wrong?
```

### Refactoring
```
Refactor @/src/components/UserProfile.tsx to:
- Use TypeScript
- Follow @/src/components/Button.tsx patterns
- Fix any @problems
```

### Learning
```
Explain how @/src/utils/validator.ts works
and how it's used in @/src/forms/
```

### Architecture
```
Analyze the structure of @/src/api/
and suggest improvements based on @/docs/architecture.md
```

### Testing
```
@/tests/unit/user.test.ts is failing
@terminal shows "TypeError: Cannot read property..."
Help fix the test
```

---

## Advanced Features

### Escape Spaces

For files with spaces in names:

```
@/path/to/my\ file.ts
@/folder\ name/file.ts
```

### Pattern Matching

Use file extensions for filtering:

```
@*.test.ts     → all test files
@components/*.tsx → all TSX in components
```

### Context Chaining

Reference outputs in follow-ups:

```
First: "What's in @/src/config.json?"
Then: "Apply those settings to @/src/app.ts"
```

---

## Supported File Types

### Fully Supported ✅
- JavaScript/TypeScript (`.js`, `.ts`, `.jsx`, `.tsx`)
- Python (`.py`)
- JSON/YAML (`.json`, `.yml`, `.yaml`)
- Markdown (`.md`)
- HTML/CSS (`.html`, `.css`)
- Configuration files

### Limited Support ⚠️
- Very large files (>1MB) may be truncated
- Binary files are excluded
- Images are referenced but not embedded

### Not Supported ❌
- Files in `node_modules/`
- `.git/` directory
- Build outputs (`dist/`, `build/`)
- Binary executables

---

## Privacy & Security

### What Gets Sent to AI
- ✅ File contents you mention
- ✅ File paths relative to workspace
- ✅ Diagnostics and errors
- ❌ **Never** files you don't mention
- ❌ **Never** credentials or API keys (filtered)

### Security Best Practices
1. Review mentions before sending
2. Avoid mentioning sensitive files
3. Use `.gitignore` patterns
4. Check file contents are appropriate

---

## FAQ

**Q: How many files can I mention?**  
A: Up to 50 per message (auto-limited for performance)

**Q: Do mentions work offline?**  
A: File search works offline, but AI requires internet

**Q: Can I mention files from other workspaces?**  
A: No, only files in current workspace

**Q: Are mentions cached?**  
A: Yes, 30-second cache with LRU eviction

**Q: Can I mention the same file twice?**  
A: Yes, but context is only included once

**Q: Do folders include all nested files?**  
A: No, only direct children (one level deep)

**Q: Can I customize mention shortcuts?**  
A: Not yet (planned for future release)

---

## Getting Help

### Report Issues
- GitHub: [oropendola/issues](https://github.com/codfatherlogic/oropendola/issues)
- Use `@problems` to include diagnostics

### Feature Requests
- Request new mention types
- Suggest autocomplete improvements
- Share use cases

### Community
- Share tips and tricks
- Post example workflows
- Help others troubleshoot

---

## Version History

### v3.6.0 (Current)
- ✨ Initial @mentions release
- 📄 File mentions
- 📁 Folder mentions
- ⚠️ Problems mentions
- 💻 Terminal mentions
- 🔀 Git mentions
- 🌐 URL mentions
- ⚡ Fuzzy search
- 🚀 Performance optimizations

---

**Happy mentioning! 🎯**
