# Oropendola AI v2.0.11 - Build Instructions

## 📦 Building the Extension

### Prerequisites

1. **Node.js** - v16 or higher
2. **npm** - v8 or higher
3. **vsce** - VS Code Extension Manager

```bash
# Install vsce globally if not already installed
npm install -g @vscode/vsce
```

---

## 🚀 Quick Build

### Step 1: Install Dependencies
```bash
cd /Users/sammishthundiyil/oropendola
npm install
```

### Step 2: Package Extension
```bash
npm run package
```

This creates: `oropendola-ai-assistant-2.0.11.vsix`

---

## 🔨 Detailed Build Process

### 1. Clone & Setup
```bash
# If starting fresh
git clone https://github.com/codfatherlogic/oropendola-ai
cd oropendola-ai

# Install dependencies
npm install
```

### 2. Verify Version
```bash
# Check package.json
grep '"version"' package.json
# Should show: "version": "2.0.11"
```

### 3. Run Tests (Optional)
```bash
# Lint code
npm run lint

# Run tests
npm test
```

### 4. Build Package
```bash
# Create VSIX file
vsce package

# Or via npm script
npm run package
```

**Output:** `oropendola-ai-assistant-2.0.11.vsix`

---

## 📋 Build Checklist

Before building, ensure:

- [ ] `package.json` version is `2.0.11`
- [ ] All dependencies installed (`node_modules/` exists)
- [ ] No uncommitted changes (optional)
- [ ] All new features tested
- [ ] Documentation updated
- [ ] CHANGELOG updated

---

## 🧪 Testing the Build

### Install Locally
```bash
# Install from VSIX
code --install-extension oropendola-ai-assistant-2.0.11.vsix

# Or via VS Code UI:
# Extensions > ... menu > Install from VSIX
```

### Verify Installation
```bash
# Check installed version
code --list-extensions --show-versions | grep oropendola

# Should show:
# oropendola.oropendola-ai-assistant@2.0.11
```

### Test Features
1. Open VS Code
2. Open Oropendola AI sidebar
3. Test deep context: Check console logs
4. Test TODOs: Ask AI to create tasks
5. Test symbol extraction: Open JS/Python file
6. Test project detection: Check console for project type

---

## 📤 Publishing (For Maintainers Only)

### Publish to VS Code Marketplace
```bash
# Login to publisher account
vsce login oropendola

# Publish
vsce publish

# Or specify version
vsce publish 2.0.11
```

### Publish to GitHub Releases
```bash
# Create Git tag
git tag v2.0.11
git push origin v2.0.11

# Upload VSIX to GitHub Releases
# Go to: https://github.com/codfatherlogic/oropendola-ai/releases/new
# Attach: oropendola-ai-assistant-2.0.11.vsix
```

---

## 🐛 Troubleshooting Build Issues

### Issue: `vsce not found`
```bash
# Install vsce globally
npm install -g @vscode/vsce
```

### Issue: `Package failed - missing dependencies`
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Issue: `VSIX file too large`
```bash
# Check .vscodeignore
cat .vscodeignore

# Should exclude:
# - node_modules (except runtime deps)
# - .git
# - test/
# - *.md (development docs)
```

### Issue: `Version already exists`
```bash
# Increment version
npm version patch  # 2.0.11 -> 2.0.12

# Or manually edit package.json
```

---

## 📦 What's Included in Build

### Included Files
- `extension.js` - Main extension entry
- `src/**/*.js` - All source code
- `media/**` - Icons, CSS, JS for webview
- `package.json` - Manifest
- `README.md` - User documentation
- `LICENSE` - MIT license
- `node_modules/` - Runtime dependencies only

### Excluded Files (via .vscodeignore)
- `.git/` - Git history
- `.github/` - CI/CD configs
- `test/` - Test files
- `*.test.js` - Unit tests
- `BUILD_*.md` - Build documentation
- `node_modules/**/test/` - Dependency tests
- `.eslintrc` - Linting config

---

## 🔍 Build Output Analysis

### Expected File Size
- **VSIX Size:** ~2-5 MB (compressed)
- **Uncompressed:** ~10-15 MB
- **Main Dependencies:**
  - axios: ~500 KB
  - socket.io-client: ~200 KB
  - @octokit/rest: ~1 MB
  - simple-git: ~100 KB

### Verify Package Contents
```bash
# Extract and inspect
unzip -l oropendola-ai-assistant-2.0.11.vsix

# Should contain:
# extension/
#   ├── extension.js
#   ├── src/
#   ├── media/
#   ├── package.json
#   └── node_modules/
```

---

## 🚀 Continuous Integration

### GitHub Actions (Future)
```yaml
# .github/workflows/build.yml
name: Build Extension
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run lint
      - run: npm test
      - run: npm run package
      - uses: actions/upload-artifact@v3
        with:
          name: vsix
          path: '*.vsix'
```

---

## 📝 Build Metadata

### v2.0.11 Build Info
- **Build Date:** 2025-01-20
- **Node Version:** 16+
- **VS Code Min Version:** 1.74.0
- **Total Files Modified:** 3
- **Lines Added:** ~400
- **Dependencies:** 5 runtime, 4 dev
- **Build Time:** ~30 seconds
- **Package Size:** ~3 MB

---

## 🎯 Build Verification Checklist

After building, verify:

- [ ] VSIX file created
- [ ] File size reasonable (~2-5 MB)
- [ ] Version number correct in VSIX
- [ ] Extension installs without errors
- [ ] All commands registered
- [ ] Sidebar view loads
- [ ] Deep context logging works
- [ ] TODO panel functional
- [ ] Symbol extraction operational
- [ ] No console errors on activation

---

## 📞 Build Support

### Getting Help
- **Issues:** https://github.com/codfatherlogic/oropendola-ai/issues
- **Discussions:** https://github.com/codfatherlogic/oropendola-ai/discussions
- **Discord:** https://discord.gg/oropendola

### Reporting Build Issues
Include:
1. Node version: `node --version`
2. npm version: `npm --version`
3. OS: `uname -a` (Linux/Mac) or `ver` (Windows)
4. Build command output
5. Error logs

---

## 🔐 Security Considerations

### Before Building
- [ ] No hardcoded credentials
- [ ] No API keys in code
- [ ] `.env` files excluded
- [ ] Secrets in environment variables
- [ ] Dependencies audited: `npm audit`

### Dependency Security
```bash
# Audit dependencies
npm audit

# Fix vulnerabilities
npm audit fix

# Check outdated packages
npm outdated
```

---

## 🎉 Success!

If build completes successfully:
```
✅ oropendola-ai-assistant-2.0.11.vsix created
✅ Package size: ~3 MB
✅ All checks passed
✅ Ready for distribution
```

**Next Steps:**
1. Test installation locally
2. Verify all features work
3. Share with beta testers
4. Publish to marketplace
5. Announce release

---

**Version:** 2.0.11
**Build System:** VS Code Extension (vsce)
**Status:** ✅ Ready to Build

**Happy Building!** 🚀
