# VS Code Development Environment Setup - Complete

This document provides a complete guide to the properly configured VS Code development environment for the Oropendola AI extension with backend API v2.0 integration.

---

## ✅ What Has Been Configured

All workspace configuration files have been created and optimized for extension development:

### 1. **Workspace Settings** ([.vscode/settings.json](.vscode/settings.json))

**Features:**
- ✅ Auto-format on save (Prettier)
- ✅ Auto-fix ESLint issues on save
- ✅ 2-space indentation (consistent with Prettier)
- ✅ File exclusions for cleaner workspace
- ✅ JavaScript auto-imports enabled
- ✅ Node.js debugging auto-attach
- ✅ Mocha test integration
- ✅ Git auto-fetch and smart commit
- ✅ Custom spell checker dictionary

### 2. **Recommended Extensions** ([.vscode/extensions.json](.vscode/extensions.json))

**Essential Extensions (25 total):**
- ESLint - Code quality checking
- Prettier - Code formatting
- Mocha Test Adapter - Test explorer integration
- GitLens - Enhanced Git features
- Thunder Client - API testing
- Error Lens - Inline error display
- Code Spell Checker - Typo detection
- Path Intellisense - Auto-complete paths
- npm Intellisense - Package import suggestions

**Installation:**
VS Code will automatically prompt you to install recommended extensions when you open the workspace.

### 3. **Debug Configurations** ([.vscode/launch.json](.vscode/launch.json))

**7 Debug Configurations:**
1. **Run Extension** - Launch extension in development mode
2. **Extension Tests** - Debug test suite
3. **Integration Tests** - Debug backend API tests
4. **Run Current File (Node)** - Debug single file
5. **Attach to Node Process** - Attach to running process
6. **Debug Mocha Tests** - Debug all Mocha tests
7. **Debug Backend Integration Tests** - Debug backend-specific tests

**Compound Configuration:**
- **Extension + Tests** - Run extension and tests simultaneously

### 4. **Build Tasks** ([.vscode/tasks.json](.vscode/tasks.json))

**11 Pre-Configured Tasks:**
- `npm: install` - Install dependencies
- `npm: watch` - Auto-compile on changes
- `npm: test` - Run test suite
- `npm: lint` - Check code quality
- `npm: lint-fix` - Auto-fix linting issues
- `Package Extension (VSIX)` - Create installable package
- `Clean Build Artifacts` - Remove build files
- `Run Integration Tests` - Test backend API
- `Check Code Quality` - Run lint + tests
- `Build and Package` - Full build pipeline
- `Full Clean Build` - Clean, install, test, package

### 5. **ESLint Configuration** ([.eslintrc.js](.eslintrc.js))

**Features:**
- Modern ES2021 syntax support
- Mocha test environment
- Consistent 2-space indentation
- Single quotes enforcement
- Best practices for async/await
- Special rules for test files
- Error handling guidelines

### 6. **Prettier Configuration** ([.prettierrc](.prettierrc))

**Settings:**
- Single quotes
- No trailing commas
- Semicolons required
- 2-space tabs
- 100-character line width
- Arrow parens avoided when possible
- Special overrides for JSON (80 chars) and Markdown (auto-wrap)

### 7. **Editor Config** ([.editorconfig](.editorconfig))

**Cross-Editor Consistency:**
- UTF-8 encoding
- LF line endings
- Trim trailing whitespace
- Insert final newline
- 2-space indentation for all files
- Special rules for Markdown, YAML, Makefiles

---

## 🚀 Quick Start Guide

### Step 1: Install Recommended Extensions

When you open the workspace, VS Code will show:

```
"This workspace has extension recommendations"
[Show Recommendations] [Install All]
```

Click **"Install All"** to install all 25 recommended extensions.

**Manual Installation:**
```bash
# View recommended extensions
code --list-extensions

# Install specific extension
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Backend Credentials

Open VS Code Settings (`Cmd+,` or `Ctrl+,`) and add:

**Preferred: API Key/Secret**
```json
{
  "oropendola.api.url": "https://oropendola.ai",
  "oropendola.api.key": "YOUR_API_KEY",
  "oropendola.api.secret": "YOUR_API_SECRET"
}
```

**Get API Keys:**
1. Log in to https://oropendola.ai
2. Navigate to **User → API Access**
3. Click **Generate Keys**
4. Copy and paste into settings

### Step 4: Start Development

**Option A: Quick Start**
```bash
# Press F5 in VS Code
# This will:
# 1. Run pre-launch build task
# 2. Launch extension in new window
# 3. Attach debugger
```

**Option B: Watch Mode**
```bash
# Terminal 1: Start watch mode
npm run watch

# Then press F5 to launch extension
```

**Option C: Manual Build**
```bash
npm run build
# Then press F5
```

---

## 🔧 Development Workflow

### Daily Development Cycle

1. **Pull Latest Changes**
   ```bash
   git pull origin main
   npm install  # Update dependencies if needed
   ```

2. **Start Watch Mode** (Optional but recommended)
   ```bash
   npm run watch
   ```

3. **Launch Extension**
   - Press `F5`
   - Or use **Run → Start Debugging**
   - Extension opens in new window labeled `[Extension Development Host]`

4. **Make Code Changes**
   - Edit files in your main VS Code window
   - Watch mode auto-compiles changes

5. **Reload Extension**
   - In Extension Development Host window:
   - Press `Cmd+R` (Mac) or `Ctrl+R` (Windows/Linux)
   - Or use Command Palette: **"Developer: Reload Window"**

6. **Test Changes**
   - Use extension features
   - Check console for logs: **Developer Tools → Console**
   - Verify expected behavior

7. **Run Tests**
   ```bash
   npm run test              # Unit tests
   npm run test:integration  # Backend integration tests
   npm run lint              # Check code quality
   ```

8. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push origin feature-branch
   ```

---

## 🐛 Debugging

### Setting Breakpoints

1. **Add Breakpoint:**
   - Click left margin in code editor (red dot appears)
   - Or press `F9` on line

2. **Start Debugging:**
   - Press `F5`
   - Extension pauses at breakpoints

3. **Debug Controls:**
   - `F10` - Step Over
   - `F11` - Step Into
   - `Shift+F11` - Step Out
   - `F5` - Continue
   - `Shift+F5` - Stop Debugging

### Debug Console

Access via **View → Debug Console** or `Cmd+Shift+Y`

**Useful Commands:**
```javascript
// Evaluate expressions
variableName
JSON.stringify(object, null, 2)

// Check types
typeof value
Array.isArray(value)

// Call functions
myFunction('test')
```

### Common Debug Scenarios

**Debug Extension Activation:**
```javascript
// extension.js
function activate(context) {
    debugger; // Execution will pause here
    console.log('Extension activating...');
    // ...
}
```

**Debug API Calls:**
```javascript
// src/api/client.js
async chatCompletion(params) {
    console.log('📤 Request:', params);
    debugger; // Pause before API call
    const result = await this.post(endpoint, params);
    console.log('📥 Response:', result);
    return result;
}
```

**Debug Tests:**
- Select **"Debug Mocha Tests"** configuration
- Press `F5`
- Tests will pause at breakpoints

---

## 🧪 Testing

### Run All Tests
```bash
npm run test
```

### Run Specific Tests
```bash
# Run tests matching pattern
npm run test -- --grep "API Client"

# Run specific test file
npm run test -- test/suite/mytest.test.js
```

### Run Integration Tests
```bash
npm run test:integration
```

### Debug Tests in VS Code

1. Open test file
2. Set breakpoints
3. Select **"Debug Mocha Tests"** from debug dropdown
4. Press `F5`

### Test Coverage
```bash
npm run test:coverage
```

### Writing New Tests

**Unit Test Template:**
```javascript
// test/suite/myfeature.test.js
const assert = require('assert');
const { MyClass } = require('../../src/myfeature');

describe('MyFeature', () => {
    let instance;

    beforeEach(() => {
        instance = new MyClass();
    });

    afterEach(() => {
        // Cleanup
    });

    it('should do something', () => {
        const result = instance.doSomething();
        assert.strictEqual(result, 'expected');
    });

    it('should handle errors', async () => {
        await assert.rejects(
            async () => await instance.willFail(),
            { message: /error/i }
        );
    });
});
```

---

## 📦 Building and Packaging

### Development Build
```bash
npm run build
```

### Watch Mode (Auto-Rebuild)
```bash
npm run watch
```

### Create VSIX Package
```bash
# Via npm script
npm run package

# Or via VS Code task
# Cmd+Shift+P → "Tasks: Run Task" → "Package Extension (VSIX)"

# Or directly with vsce
vsce package
```

**Output:** `oropendola-ai-assistant-X.X.X.vsix`

### Install Packaged Extension
```bash
# Command line
code --install-extension oropendola-ai-assistant-2.5.1.vsix

# Or via VS Code UI:
# Extensions panel → ... menu → Install from VSIX
```

### Version Bump
```bash
# Update package.json version
npm version patch  # 2.5.1 → 2.5.2
npm version minor  # 2.5.1 → 2.6.0
npm version major  # 2.5.1 → 3.0.0
```

---

## 🔍 Code Quality

### Automatic Formatting

Files are automatically formatted on save using Prettier.

**Manual Format:**
```bash
# Format all files
npm run format

# Format specific file
npx prettier --write src/api/client.js
```

### Linting

**Auto-Fix on Save:**
ESLint auto-fixes issues when you save files.

**Manual Lint:**
```bash
# Check all files
npm run lint

# Auto-fix issues
npm run lint:fix

# Lint specific file
npx eslint src/api/client.js
```

### Pre-Commit Checks

Before committing, run:
```bash
npm run lint        # Check code quality
npm run test        # Run tests
npm run format      # Format code
```

---

## 🌐 Backend API Testing

### Test Backend Connection

**Via Extension Command:**
```
Cmd+Shift+P → "Oropendola: Test Backend Connection"
```

**Via Code:**
```javascript
const { apiClient } = require('./src/api/client');

async function test() {
    const result = await apiClient.chatCompletion({
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'auto',
        max_tokens: 50
    });
    console.log('✅ Success:', result.model, result.response);
}
```

### Test API with Thunder Client

1. Install **Thunder Client** extension
2. Create new request
3. Configure:
   - **Method:** POST
   - **URL:** `https://oropendola.ai/api/method/ai_assistant.api.chat.chat_completion`
   - **Headers:**
     ```
     Authorization: token YOUR_KEY:YOUR_SECRET
     Content-Type: application/json
     ```
   - **Body:**
     ```json
     {
       "messages": [{"role": "user", "content": "Hello"}],
       "mode": "chat",
       "model": "auto"
     }
     ```
4. Send request

### Run Integration Tests

```bash
npm run test:integration
```

**Test Categories:**
- Authentication (API Key, Session Cookies)
- Chat Modes (chat, agent, code)
- Model Selection (auto, claude, deepseek, gemini)
- Response Format
- Conversation Management
- Todo Management
- Analytics
- Error Handling

---

## 📁 Workspace File Reference

| File | Purpose | When to Edit |
|------|---------|--------------|
| `.vscode/settings.json` | Workspace settings | Customize editor behavior |
| `.vscode/extensions.json` | Recommended extensions | Add/remove extension recommendations |
| `.vscode/launch.json` | Debug configurations | Add new debug targets |
| `.vscode/tasks.json` | Build/test tasks | Add new build steps |
| `.eslintrc.js` | ESLint rules | Customize linting rules |
| `.prettierrc` | Prettier config | Customize formatting |
| `.editorconfig` | Editor settings | Cross-editor consistency |
| `.prettierignore` | Prettier exclusions | Exclude files from formatting |

---

## 🛠️ Troubleshooting

### Extension Won't Load

**Symptoms:**
- Extension doesn't appear in Command Palette
- No commands available

**Solutions:**
1. Check console for errors:
   - **Help → Toggle Developer Tools**
   - Look for red errors in Console tab
2. Verify `package.json` syntax is valid
3. Reload window: `Cmd+R`
4. Reinstall dependencies:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### Backend API Errors

**Symptoms:**
- `401 Unauthorized`
- `Network Error`
- `ECONNREFUSED`

**Solutions:**
1. Verify credentials in settings
2. Test API directly:
   ```bash
   curl -X POST https://oropendola.ai/api/method/ai_assistant.api.chat.chat_completion \
     -H "Authorization: token YOUR_KEY:YOUR_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"messages":[{"role":"user","content":"Hi"}],"model":"auto"}'
   ```
3. Check backend status at https://oropendola.ai
4. Review error logs in Developer Console

### Tests Failing

**Symptoms:**
- `npm run test` shows failures
- Integration tests timeout

**Solutions:**
1. Ensure backend credentials are configured
2. Check network connectivity
3. Run specific test for debugging:
   ```bash
   npm run test -- --grep "specific test"
   ```
4. Check test output for specific errors
5. Verify backend API is accessible

### Auto-Format Not Working

**Symptoms:**
- Files don't format on save
- Prettier/ESLint not running

**Solutions:**
1. Ensure extensions are installed:
   - ESLint (`dbaeumer.vscode-eslint`)
   - Prettier (`esbenp.prettier-vscode`)
2. Check settings:
   ```json
   {
     "editor.formatOnSave": true,
     "editor.defaultFormatter": "esbenp.prettier-vscode"
   }
   ```
3. Reload VS Code window
4. Check Output panel for errors:
   - **View → Output**
   - Select "ESLint" or "Prettier" from dropdown

### Debugger Won't Attach

**Symptoms:**
- Breakpoints don't hit
- Debugger shows "paused" but doesn't stop

**Solutions:**
1. Ensure source maps are enabled
2. Check `outFiles` in launch.json matches build output
3. Rebuild extension: `npm run build`
4. Restart debug session: `Shift+F5` then `F5`

---

## 📚 Additional Resources

- **Backend Integration:** [BACKEND_INTEGRATION_v2.0_COMPLETE.md](BACKEND_INTEGRATION_v2.0_COMPLETE.md)
- **Testing Guide:** [FRONTEND_TESTING_CHECKLIST.md](FRONTEND_TESTING_CHECKLIST.md)
- **VS Code Extension API:** https://code.visualstudio.com/api
- **Oropendola Backend:** https://oropendola.ai

---

## ✅ Setup Checklist

Before starting development, ensure:

- [ ] Node.js 16+ installed
- [ ] VS Code 1.75+ installed
- [ ] Recommended extensions installed
- [ ] Dependencies installed (`npm install`)
- [ ] Backend credentials configured
- [ ] Extension launches successfully (`F5`)
- [ ] Tests pass (`npm run test`)
- [ ] Linter passes (`npm run lint`)
- [ ] Can package extension (`npm run package`)

---

## 🎉 You're Ready!

Your VS Code development environment is now fully configured and optimized for Oropendola AI extension development.

**Next Steps:**
1. Press `F5` to launch the extension
2. Test the backend connection: `Cmd+Shift+P` → "Oropendola: Test Backend Connection"
3. Try the chat interface: `Cmd+L`
4. Explore the codebase in [src/](src/)

**Happy Coding!** 🚀
