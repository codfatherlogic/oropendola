# VS Code Workspace Configuration

This directory contains VS Code workspace configuration for the Oropendola AI extension.

---

## 📁 Files in This Directory

| File | Purpose |
|------|---------|
| `settings.json` | Workspace settings (auto-format, linting, etc.) |
| `extensions.json` | Recommended VS Code extensions (25 total) |
| `launch.json` | Debug configurations (7 configs) |
| `tasks.json` | Build and test tasks (11 tasks) |

---

## 🚀 Quick Start

### First Time Setup

1. **Install Recommended Extensions**
   - VS Code will prompt: "This workspace has extension recommendations"
   - Click **"Install All"**

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Launch Extension**
   - Press `F5`
   - Extension opens in new window

---

## ⌨️ Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Launch extension | `F5` |
| Reload extension window | `Cmd+R` (Mac) / `Ctrl+R` (Win) |
| Stop debugging | `Shift+F5` |
| Command Palette | `Cmd+Shift+P` (Mac) / `Ctrl+Shift+P` (Win) |
| Run Task | `Cmd+Shift+B` (Mac) / `Ctrl+Shift+B` (Win) |
| Toggle Terminal | `` Ctrl+` `` |
| Toggle Debug Console | `Cmd+Shift+Y` (Mac) / `Ctrl+Shift+Y` (Win) |

---

## 🐛 Debug Configurations

Available in Run and Debug panel (Cmd+Shift+D):

1. **Run Extension** - Launch extension (use this most often)
2. **Extension Tests** - Debug test suite
3. **Integration Tests** - Debug backend API tests
4. **Run Current File** - Debug single JavaScript file
5. **Attach to Node** - Attach to running process
6. **Debug Mocha Tests** - Debug all Mocha tests
7. **Debug Backend Integration** - Debug backend-specific tests

**Usage:** Select configuration from dropdown, press `F5`

---

## 🔨 Build Tasks

Run tasks via `Cmd+Shift+P` → "Tasks: Run Task":

**Most Common:**
- `npm: watch` - Auto-compile on save
- `npm: test` - Run tests
- `npm: lint` - Check code quality
- `Package Extension (VSIX)` - Create installable package

**All Tasks:**
- npm: install
- npm: watch (default build)
- npm: test (default test)
- npm: lint
- npm: lint-fix
- Package Extension (VSIX)
- Clean Build Artifacts
- Run Integration Tests
- Check Code Quality (lint + test)
- Build and Package (lint → test → package)
- Full Clean Build (clean → install → test → package)

---

## 🎨 Code Formatting

### Automatic (On Save)
Files are automatically formatted when you save.

**Powered by:**
- Prettier (formatting)
- ESLint (auto-fix)

### Manual
```bash
npm run format      # Format all files
npm run lint:fix    # Fix linting issues
```

---

## 🧪 Testing

### Run Tests
```bash
npm run test                # All tests
npm run test:integration    # Backend API tests
```

### Debug Tests
1. Select "Debug Mocha Tests" from debug dropdown
2. Press `F5`
3. Tests pause at breakpoints

---

## 📦 Packaging

### Create VSIX Package
```bash
npm run package
# Or via task: Cmd+Shift+P → "Tasks: Run Task" → "Package Extension (VSIX)"
```

**Output:** `oropendola-ai-assistant-X.X.X.vsix`

### Install Package
```bash
code --install-extension oropendola-ai-assistant-X.X.X.vsix
```

---

## 🔧 Recommended Extensions (25 Total)

### Essential (Always Install)
- ✅ ESLint
- ✅ Prettier
- ✅ Mocha Test Explorer
- ✅ GitLens
- ✅ Error Lens

### Optional (But Helpful)
- Thunder Client (API testing)
- Code Spell Checker
- Path Intellisense
- npm Intellisense
- Todo Tree

**Install All:** VS Code will prompt when you open workspace

---

## 📚 Documentation

- **Complete Setup Guide:** [../DEVELOPMENT_ENVIRONMENT_SETUP.md](../DEVELOPMENT_ENVIRONMENT_SETUP.md)
- **Workspace Summary:** [../WORKSPACE_SETUP_COMPLETE.md](../WORKSPACE_SETUP_COMPLETE.md)
- **Backend Integration:** [../BACKEND_INTEGRATION_v2.0_COMPLETE.md](../BACKEND_INTEGRATION_v2.0_COMPLETE.md)
- **Testing Guide:** [../FRONTEND_TESTING_CHECKLIST.md](../FRONTEND_TESTING_CHECKLIST.md)

---

## ✅ Quick Verification

Ensure your workspace is properly configured:

```bash
# Check all configuration files exist
ls -la .vscode/
# Should show: settings.json, extensions.json, launch.json, tasks.json

# Verify dependencies installed
npm list --depth=0

# Check linting works
npm run lint

# Check tests work
npm run test

# Launch extension
# Press F5 in VS Code
```

---

## 🆘 Troubleshooting

### Extensions Not Installing
- `Cmd+Shift+P` → "Extensions: Show Recommended Extensions"
- Manually install missing extensions

### Auto-Format Not Working
- Ensure Prettier extension is installed
- Check: `settings.json` has `"editor.formatOnSave": true`
- Reload window: `Cmd+Shift+P` → "Developer: Reload Window"

### Debugger Not Working
- Rebuild: `npm run build`
- Check `launch.json` is valid JSON
- Try: `Shift+F5` (stop) then `F5` (start)

### Tasks Not Showing
- `Cmd+Shift+P` → "Tasks: Run Task"
- If empty, check `tasks.json` is valid JSON
- Reload window

---

## 💡 Pro Tips

1. **Always use watch mode during development:**
   ```bash
   npm run watch
   # Then press F5 to launch
   ```

2. **Use keyboard shortcuts:**
   - `F5` to launch/debug
   - `Cmd+R` to reload extension window
   - `Cmd+Shift+P` for Command Palette

3. **Set breakpoints for debugging:**
   - Click left margin to add red dot
   - Press `F5` to debug
   - Code pauses at breakpoint

4. **Use tasks for common operations:**
   - `Cmd+Shift+B` to run default build task (watch)
   - `Cmd+Shift+P` → "Tasks: Run Task" for other tasks

5. **Keep extensions updated:**
   - Extensions panel → Show Outdated Extensions
   - Update All

---

**Need Help?** See [DEVELOPMENT_ENVIRONMENT_SETUP.md](../DEVELOPMENT_ENVIRONMENT_SETUP.md)
