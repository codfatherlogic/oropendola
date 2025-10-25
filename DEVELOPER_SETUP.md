# Oropendola AI Assistant - Developer Setup Guide

**Version:** 3.5.0+
**Last Updated:** 2025-10-26
**For:** Developers contributing to Oropendola

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Project Structure](#project-structure)
4. [Development Environment](#development-environment)
5. [Building the Extension](#building-the-extension)
6. [Running in Development](#running-in-development)
7. [Testing](#testing)
8. [Debugging](#debugging)
9. [Adding New Features](#adding-new-features)
10. [Code Style Guide](#code-style-guide)
11. [Contributing](#contributing)
12. [Deployment](#deployment)
13. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js** 18+ (LTS recommended)
- **npm** 9+ or **yarn** 1.22+
- **VS Code** 1.80+ (latest stable recommended)
- **Git** 2.30+
- **TypeScript** 5.0+ (included in devDependencies)

### Recommended Tools

- **VS Code Extensions:**
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features
  - Debugger for Chrome (for webview debugging)

### System Requirements

- **OS:** Windows 10+, macOS 12+, or Linux (Ubuntu 20.04+)
- **RAM:** 8GB minimum, 16GB recommended
- **Disk Space:** 2GB free space

---

## Quick Start

### Clone Repository

```bash
git clone https://github.com/anthropics/oropendola.git
cd oropendola
```

### Install Dependencies

```bash
# Install extension dependencies
npm install

# Install webview dependencies
cd webview-ui
npm install
cd ..
```

### Build Extension

```bash
npm run build
```

### Run in Development

```bash
# Press F5 in VS Code
# Or use the command palette:
# Run > Start Debugging
```

A new VS Code window opens with the extension loaded.

---

## Project Structure

```
oropendola/
├── dist/                      # Compiled output
│   ├── extension.js          # Main extension bundle
│   └── extension.js.map      # Source map
│
├── webview-ui/               # React frontend
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── Chat/         # Chat view
│   │   │   ├── History/      # History view
│   │   │   ├── Terminal/     # Terminal view
│   │   │   ├── Browser/      # Browser automation view
│   │   │   ├── Marketplace/  # Marketplace view
│   │   │   ├── Vector/       # Vector search view
│   │   │   ├── Settings/     # Settings view
│   │   │   └── Navigation/   # Navigation component
│   │   ├── hooks/            # Custom React hooks
│   │   ├── context/          # React context
│   │   ├── utils/            # Utility functions
│   │   ├── App.tsx           # Main app component
│   │   └── main.tsx          # Entry point
│   ├── dist/                 # Built webview assets
│   ├── package.json
│   └── vite.config.ts
│
├── src/                      # Extension source code
│   ├── browser/              # Browser automation
│   │   └── BrowserAutomationClient.ts
│   ├── marketplace/          # Marketplace client
│   │   └── MarketplaceClient.ts
│   ├── vector/               # Vector database client
│   │   └── VectorDBClient.ts
│   ├── i18n/                 # Internationalization
│   │   └── I18nManager.ts
│   ├── terminal/             # Terminal manager
│   │   └── TerminalManager.ts
│   ├── services/             # Business logic services
│   │   ├── tasks/            # Task management
│   │   └── terminal/         # Terminal capture
│   ├── sidebar/              # Sidebar webview provider
│   │   └── sidebar-provider.js
│   ├── config/               # Configuration
│   │   └── BackendConfig.ts
│   ├── types/                # TypeScript types
│   │   └── index.ts
│   └── extension.js          # Extension entry point
│
├── backend/                  # Backend server (optional)
│   └── README.md
│
├── scripts/                  # Build and utility scripts
│   ├── verify-backend.sh
│   └── package.sh
│
├── test/                     # Tests
│   ├── setup.js
│   └── vscode-mock.js
│
├── .vscode/                  # VS Code settings
│   ├── launch.json           # Debug configurations
│   ├── tasks.json            # Build tasks
│   └── settings.json         # Editor settings
│
├── esbuild.config.js         # esbuild configuration
├── tsconfig.json             # TypeScript configuration
├── vitest.config.js          # Test configuration
├── package.json              # Extension manifest
├── package-lock.json
│
├── USER_GUIDE.md             # End-user documentation
├── API_DOCUMENTATION.md      # API reference
├── DEVELOPER_SETUP.md        # This file
│
└── README.md                 # Project overview
```

---

## Development Environment

### VS Code Setup

1. **Open Project in VS Code**
   ```bash
   code .
   ```

2. **Install Recommended Extensions**
   - VS Code will prompt to install recommended extensions
   - Or manually install from `.vscode/extensions.json`

3. **Configure Settings**
   - Settings are pre-configured in `.vscode/settings.json`
   - Customize as needed for your workflow

### Environment Variables

Create `.env` file in project root (optional):

```env
# Backend URL (defaults to https://oropendola.ai)
BACKEND_URL=https://oropendola.ai

# Development mode
NODE_ENV=development

# Debug logging
DEBUG=true
```

### NPM Scripts

```json
{
  "scripts": {
    "build": "npm run typecheck && node esbuild.config.js",
    "typecheck": "tsc --noEmit",
    "watch": "node esbuild.config.js --watch",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "lint": "eslint src --ext ts,js",
    "format": "prettier --write \"src/**/*.{ts,js,json}\"",
    "package": "vsce package",
    "vscode:prepublish": "npm run build"
  }
}
```

---

## Building the Extension

### Development Build

```bash
npm run build
```

Output: `dist/extension.js` (8.13 MB)

### Production Build

```bash
NODE_ENV=production npm run build
```

Output: Minified bundle

### Watch Mode

```bash
npm run watch
```

Rebuilds automatically on file changes.

### Webview Build

```bash
cd webview-ui
npm run build
cd ..
```

Output: `webview-ui/dist/`

### Webview Development Server

```bash
cd webview-ui
npm run dev
cd ..
```

Hot reload at http://localhost:5173

---

## Running in Development

### Method 1: F5 (Recommended)

1. Open project in VS Code
2. Press `F5`
3. Extension Development Host window opens
4. Extension is loaded and running

### Method 2: Debug Panel

1. Open Debug panel (`Ctrl+Shift+D`)
2. Select "Run Extension" configuration
3. Click green play button

### Method 3: Command Palette

1. Press `Ctrl+Shift+P`
2. Type "Debug: Start Debugging"
3. Select "Run Extension"

### Testing in Development Host

1. Click Oropendola icon in activity bar
2. Login with test credentials
3. Test all 7 views
4. Check console for errors (`Ctrl+Shift+I`)

---

## Testing

### Unit Tests

```bash
npm test
```

### Watch Mode

```bash
npm run test:watch
```

### UI Tests

```bash
npm run test:ui
```

Opens Vitest UI at http://localhost:51204

### Test Coverage

```bash
npm run test:coverage
```

Output: `coverage/` directory

### Writing Tests

Example test file `src/services/example.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from './example';

describe('myFunction', () => {
    it('should return expected value', () => {
        const result = myFunction('input');
        expect(result).toBe('expected');
    });

    it('should handle errors', () => {
        expect(() => myFunction(null)).toThrow();
    });
});
```

### Running Specific Tests

```bash
npm test -- path/to/test.ts
```

---

## Debugging

### Extension Debugging

1. Set breakpoints in `src/` files
2. Press `F5` to start debugging
3. Trigger functionality that hits breakpoint
4. Inspect variables in Debug panel

### Webview Debugging

1. Open Extension Development Host
2. Open Oropendola panel
3. Right-click webview → "Inspect"
4. Chrome DevTools opens
5. Debug React components, network calls, etc.

### Console Logging

**Extension (Node.js):**
```javascript
console.log('Extension log');
console.error('Extension error');
```

View in Output panel → "Oropendola AI"

**Webview (Browser):**
```typescript
console.log('Webview log');
```

View in webview DevTools console

### Debug Configurations

Located in `.vscode/launch.json`:

**Run Extension:**
```json
{
    "name": "Run Extension",
    "type": "extensionHost",
    "request": "launch",
    "args": ["--extensionDevelopmentPath=${workspaceFolder}"],
    "outFiles": ["${workspaceFolder}/dist/**/*.js"],
    "preLaunchTask": "${defaultBuildTask}"
}
```

**Run Tests:**
```json
{
    "name": "Extension Tests",
    "type": "extensionHost",
    "request": "launch",
    "args": [
        "--extensionDevelopmentPath=${workspaceFolder}",
        "--extensionTestsPath=${workspaceFolder}/out/test/suite/index"
    ]
}
```

---

## Adding New Features

### Adding a New View

1. **Create Component Files**
   ```bash
   mkdir webview-ui/src/components/MyView
   touch webview-ui/src/components/MyView/MyView.tsx
   touch webview-ui/src/components/MyView/MyView.css
   ```

2. **Implement Component**
   ```typescript
   // MyView.tsx
   import React from 'react';
   import './MyView.css';

   export const MyView: React.FC = () => {
       return (
           <div className="my-view">
               <h1>My View</h1>
           </div>
       );
   };
   ```

3. **Update ViewType**
   ```typescript
   // ViewNavigation.tsx
   export type ViewType = 'chat' | 'history' | '...' | 'myview';
   ```

4. **Add to Navigation**
   ```typescript
   // ViewNavigation.tsx
   <button onClick={() => onViewChange('myview')}>
       My View <span className="shortcut">Ctrl+8</span>
   </button>
   ```

5. **Add to App.tsx**
   ```typescript
   import { MyView } from './components/MyView/MyView';

   {currentView === 'myview' && <MyView />}
   ```

6. **Add Keyboard Shortcut**
   ```typescript
   // App.tsx
   const shortcuts = [
       // ...existing shortcuts
       {
           key: '8',
           ctrl: true,
           description: 'Switch to My View',
           handler: () => setCurrentView('myview')
       }
   ];
   ```

### Adding a Message Handler

1. **Define Message Type**
   ```typescript
   // In React component
   vscode.postMessage({
       type: 'myNewAction',
       data: { foo: 'bar' }
   });
   ```

2. **Add Case to Switch**
   ```javascript
   // sidebar-provider.js
   case 'myNewAction':
       await this._handleMyNewAction(message.data);
       break;
   ```

3. **Implement Handler**
   ```javascript
   async _handleMyNewAction(data) {
       try {
           // Your logic
           const result = await processData(data);

           if (this._view) {
               this._view.webview.postMessage({
                   type: 'myNewActionResult',
                   result
               });
           }
       } catch (error) {
           console.error('❌ Error:', error);
       }
   }
   ```

4. **Handle Response in Frontend**
   ```typescript
   useEffect(() => {
       const handleMessage = (event: MessageEvent) => {
           if (event.data.type === 'myNewActionResult') {
               setResult(event.data.result);
           }
       };

       window.addEventListener('message', handleMessage);
       return () => window.removeEventListener('message', handleMessage);
   }, []);
   ```

### Adding a Backend Client

1. **Create Client File**
   ```bash
   touch src/myfeature/MyClient.ts
   ```

2. **Implement Client**
   ```typescript
   import { BackendConfig, getInstance as getBackendConfig } from '../config/BackendConfig';

   export class MyClient {
       private static instance: MyClient;
       private backendConfig: BackendConfig;

       private constructor() {
           this.backendConfig = getBackendConfig();
       }

       public static getInstance(): MyClient {
           if (!MyClient.instance) {
               MyClient.instance = new MyClient();
           }
           return MyClient.instance;
       }

       async myMethod(params: any) {
           const response = await fetch(
               this.backendConfig.getApiUrl('/api/method/ai_assistant.api.my_endpoint'),
               {
                   method: 'POST',
                   headers: {
                       'Content-Type': 'application/json',
                       'X-Frappe-CSRF-Token': await this.getCsrfToken()
                   },
                   credentials: 'include',
                   body: JSON.stringify(params)
               }
           );

           if (!response.ok) {
               throw new Error(`HTTP ${response.status}`);
           }

           const data = await response.json();
           return data.message || data;
       }

       private async getCsrfToken(): Promise<string> {
           // Implementation
           return '';
       }
   }

   export function getInstance(): MyClient {
       return MyClient.getInstance();
   }
   ```

3. **Use in Handler**
   ```javascript
   async _handleMyAction() {
       const { MyClient } = await import('../myfeature/MyClient.ts');
       const client = MyClient.getInstance();
       const result = await client.myMethod({...});
   }
   ```

---

## Code Style Guide

### TypeScript/JavaScript

- Use ES6+ features
- Prefer `const` over `let`
- Use arrow functions
- Use async/await over promises
- Use template literals for strings

**Good:**
```typescript
const result = await fetchData();
const message = `Hello, ${name}!`;
```

**Bad:**
```typescript
var result;
fetchData().then(data => { result = data; });
var message = "Hello, " + name + "!";
```

### React

- Use functional components
- Use hooks (useState, useEffect, etc.)
- Use TypeScript for type safety
- Prefer named exports
- Use CSS Modules or styled-components

**Good:**
```typescript
export const MyComponent: React.FC<Props> = ({ prop }) => {
    const [state, setState] = useState<Type>(initial);

    useEffect(() => {
        // Effect
    }, [dependencies]);

    return <div>{/* JSX */}</div>;
};
```

### Naming Conventions

- **Components:** PascalCase (`MyComponent`)
- **Files:** PascalCase for components (`MyComponent.tsx`)
- **Variables/Functions:** camelCase (`myVariable`, `myFunction`)
- **Constants:** UPPER_SNAKE_CASE (`MY_CONSTANT`)
- **Interfaces/Types:** PascalCase (`MyInterface`)
- **CSS Classes:** kebab-case (`my-class`)

### File Organization

- One component per file
- Co-locate styles with components
- Group related files in directories
- Use index files for exports

```
MyComponent/
├── MyComponent.tsx       # Component
├── MyComponent.css       # Styles
├── MyComponent.test.tsx  # Tests
└── index.ts              # Export
```

### Comments

- Use JSDoc for functions and classes
- Explain "why", not "what"
- Keep comments up-to-date
- Use TODO/FIXME/NOTE tags

```typescript
/**
 * Fetch data from the API
 * @param id - Resource ID
 * @returns Promise with resource data
 */
async function fetchData(id: string): Promise<Data> {
    // TODO: Add caching
    // FIXME: Handle rate limiting
    return await api.fetch(id);
}
```

### Formatting

Use Prettier with these settings:

```json
{
    "semi": true,
    "trailingComma": "es5",
    "singleQuote": true,
    "printWidth": 100,
    "tabWidth": 4
}
```

---

## Contributing

### Contribution Workflow

1. **Fork the Repository**
   ```bash
   # Click "Fork" on GitHub
   git clone https://github.com/YOUR_USERNAME/oropendola.git
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/my-feature
   ```

3. **Make Changes**
   - Write code
   - Add tests
   - Update documentation

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: Add my feature"
   ```

   Use conventional commits:
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation
   - `style:` Formatting
   - `refactor:` Code refactoring
   - `test:` Tests
   - `chore:` Maintenance

5. **Push to Fork**
   ```bash
   git push origin feature/my-feature
   ```

6. **Create Pull Request**
   - Go to GitHub
   - Click "New Pull Request"
   - Fill in template
   - Request review

### Pull Request Guidelines

- **Title:** Clear, descriptive (`Add browser automation AI feature`)
- **Description:** What, why, how
- **Tests:** Include tests for new features
- **Documentation:** Update relevant docs
- **Screenshots:** For UI changes
- **Changelog:** Update CHANGELOG.md

### Code Review Process

1. Automated checks run (build, tests, lint)
2. Maintainers review code
3. Request changes if needed
4. Approve and merge when ready

---

## Deployment

### Packaging Extension

```bash
npm run package
```

Output: `oropendola-ai-assistant-3.5.0.vsix`

### Installing VSIX Locally

```bash
code --install-extension oropendola-ai-assistant-3.5.0.vsix --force
```

### Publishing to Marketplace

1. **Get Publisher Token**
   - Go to https://marketplace.visualstudio.com/manage
   - Create Personal Access Token

2. **Login to vsce**
   ```bash
   vsce login YOUR_PUBLISHER_NAME
   ```

3. **Publish**
   ```bash
   vsce publish
   ```

   Or with version bump:
   ```bash
   vsce publish minor  # 3.5.0 → 3.6.0
   vsce publish patch  # 3.5.0 → 3.5.1
   vsce publish major  # 3.5.0 → 4.0.0
   ```

### Version Management

Update version in `package.json`:

```json
{
    "version": "3.5.0"
}
```

Create git tag:

```bash
git tag v3.5.0
git push origin v3.5.0
```

---

## Troubleshooting

### Build Errors

**Problem:** TypeScript errors

```bash
npm run typecheck
```

Fix errors shown, then rebuild.

**Problem:** Missing dependencies

```bash
rm -rf node_modules package-lock.json
npm install
```

**Problem:** Cache issues

```bash
rm -rf dist webview-ui/dist
npm run build
```

### Runtime Errors

**Problem:** Extension doesn't load

- Check Output panel for errors
- Verify extension.js exists in dist/
- Check package.json activation events

**Problem:** Webview blank screen

- Check webview-ui/dist/ exists
- Rebuild webview: `cd webview-ui && npm run build`
- Check browser console in webview DevTools

**Problem:** Backend connection fails

- Verify backend URL in settings
- Check internet connection
- Test backend at https://oropendola.ai/api/method/ping

### Development Issues

**Problem:** Hot reload not working

```bash
npm run watch  # Restart watch mode
```

**Problem:** Breakpoints not hitting

- Verify source maps exist (`dist/*.map`)
- Check outFiles in launch.json
- Rebuild with source maps enabled

**Problem:** Tests failing

```bash
npm run test -- --reporter=verbose
```

Check detailed error messages.

---

## Resources

### Documentation

- [User Guide](USER_GUIDE.md)
- [API Documentation](API_DOCUMENTATION.md)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [React Documentation](https://react.dev)

### Community

- **GitHub:** https://github.com/anthropics/oropendola
- **Discord:** https://discord.gg/oropendola-dev
- **Stack Overflow:** Tag `oropendola`
- **Email:** dev@oropendola.ai

### Tools

- **esbuild:** https://esbuild.github.io
- **Vite:** https://vitejs.dev
- **Vitest:** https://vitest.dev
- **Prettier:** https://prettier.io
- **ESLint:** https://eslint.org

---

## Conclusion

You now have everything needed to develop for Oropendola AI Assistant:

✅ Development environment set up
✅ Build and run the extension
✅ Debug and test code
✅ Add new features
✅ Contribute to the project

**Next Steps:**

1. Explore the codebase
2. Run the extension in development
3. Try making a small change
4. Write a test
5. Submit your first PR!

**Need Help?**

- Read the docs
- Ask in Discord
- Open a GitHub issue
- Email dev@oropendola.ai

**Happy coding!** 🚀

---

*Oropendola AI Assistant - Developer Setup Guide v3.5.0+*
*Last Updated: 2025-10-26*
