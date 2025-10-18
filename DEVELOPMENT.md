# Oropendola AI Extension - Development Guide

## Project Structure

```
oropendola/
├── extension.js                 # Main extension entry point
├── package.json                 # Extension manifest
├── README.md                    # User documentation
├── .eslintrc.js                 # ESLint configuration
├── .gitignore                   # Git ignore rules
├── .vscode/
│   └── launch.json             # Debug configurations
├── src/
│   ├── github/                 # GitHub integration
│   │   └── api.js             # GitHub API manager
│   ├── ai/                    # AI functionality
│   │   ├── chat-manager.js    # Chat interface manager
│   │   └── providers/         # AI provider implementations
│   │       ├── oropendola-provider.js  # Main Oropendola API
│   │       ├── openai-provider.js      # OpenAI integration
│   │       ├── anthropic-provider.js   # Anthropic Claude
│   │       ├── custom-provider.js      # Custom endpoints
│   │       └── local-provider.js       # Local models
│   └── analysis/              # Code analysis
│       └── repository-analyzer.js  # Repository insights
└── media/                     # Icons and assets
```

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Visual Studio Code 1.74.0+
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/oropendola-extension.git
cd oropendola-extension

# Install dependencies
npm install

# Open in VS Code
code .
```

### Running the Extension

1. Press `F5` to open a new VS Code window with the extension loaded
2. Or use "Run > Start Debugging" from the menu
3. The extension will be activated in the Extension Development Host

### Testing

```bash
# Run linter
npm run lint

# Run tests
npm test
```

## Development Workflow

### 1. Making Changes

1. Make your code changes
2. Press `F5` to test in a new window
3. Reload the extension window (`Ctrl+R`) to see changes

### 2. Debugging

- Set breakpoints in your code
- Use the Debug Console to inspect variables
- Check the Output panel for extension logs

### 3. Building for Production

```bash
# Install vsce if you haven't
npm install -g @vscode/vsce

# Package the extension
vsce package

# This creates oropendola-ai-assistant-X.X.X.vsix
```

## Key Components

### Extension.js

Main entry point with:
- `activate()` - Called when extension is activated
- `deactivate()` - Called when extension is deactivated
- Command registration
- Service initialization

### ChatManager

Manages AI chat interface:
- WebView panel creation
- Message handling
- Context building
- Provider communication

### OropendolaProvider

Handles Oropendola API:
- Streaming requests
- Authentication
- Subscription management
- Error handling

### GitHubManager

GitHub operations:
- Repository forking
- Cloning
- Authentication
- API calls

### RepositoryAnalyzer

Code analysis:
- Language detection
- Dependency analysis
- Structure analysis
- Metrics calculation

## Configuration

### API Configuration

Users configure through:
1. `Oropendola: Setup` command (recommended)
2. VS Code Settings UI
3. `settings.json` directly:

```json
{
  "oropendola.api.url": "https://oropendola.ai",
  "oropendola.api.key": "your-key",
  "oropendola.api.secret": "your-secret",
  "oropendola.ai.model": "auto",
  "oropendola.ai.temperature": 0.7,
  "oropendola.ai.maxTokens": 4096
}
```

## Adding New Features

### Adding a New Command

1. **Register in package.json:**
```json
{
  "command": "oropendola.myCommand",
  "title": "My Command",
  "category": "Oropendola"
}
```

2. **Implement in extension.js:**
```javascript
context.subscriptions.push(
  vscode.commands.registerCommand('oropendola.myCommand', async () => {
    // Your implementation
  })
);
```

### Adding a New AI Provider

1. Create `src/ai/providers/my-provider.js`:
```javascript
class MyProvider {
  async chat(message, context) {
    // Implementation
  }
  
  get supportsStreaming() {
    return true;
  }
  
  get modelInfo() {
    return { provider: 'my-provider' };
  }
}

module.exports = MyProvider;
```

2. Update ChatManager to support it

### Adding Configuration Options

1. **Add to package.json:**
```json
{
  "oropendola.myFeature.enabled": {
    "type": "boolean",
    "default": true,
    "description": "Enable my feature"
  }
}
```

2. **Access in code:**
```javascript
const config = vscode.workspace.getConfiguration('oropendola');
const enabled = config.get('myFeature.enabled');
```

## API Integration

### Streaming Requests

The Oropendola provider supports real-time streaming:

```javascript
await oropendolaProvider.chat(
  message,
  context,
  (token) => {
    // Handle each token as it arrives
    console.log('Token:', token);
  }
);
```

### Non-Streaming Requests

```javascript
const response = await oropendolaProvider.chat(message, context);
console.log('Full response:', response);
```

### Error Handling

```javascript
try {
  const response = await oropendolaProvider.chat(message, context);
} catch (error) {
  if (error.message.includes('402')) {
    // Subscription expired
  } else if (error.message.includes('429')) {
    // Rate limit
  }
}
```

## Best Practices

### Code Style

- Use 4-space indentation
- Single quotes for strings
- Semicolons required
- Document all public methods
- Add JSDoc comments

### Error Handling

- Always catch async errors
- Provide user-friendly error messages
- Log errors to console for debugging
- Show actionable error messages

### Performance

- Cache analysis results when possible
- Limit context size in API calls
- Use streaming for better UX
- Debounce frequent operations

### Security

- Never log API keys
- Use VS Code's secret storage for sensitive data
- Validate all user inputs
- Sanitize file paths

## Testing

### Manual Testing Checklist

- [ ] Extension activates successfully
- [ ] Setup command works
- [ ] Chat interface opens
- [ ] AI responses work
- [ ] Streaming works correctly
- [ ] Status bar updates
- [ ] Code operations (explain, fix, improve) work
- [ ] GitHub operations work
- [ ] Repository analysis works
- [ ] Error handling works

### Automated Tests

```javascript
// test/suite/extension.test.js
const assert = require('assert');
const vscode = require('vscode');

suite('Extension Test Suite', () => {
  test('Extension loads', async () => {
    const ext = vscode.extensions.getExtension('oropendola.oropendola-ai-assistant');
    assert.ok(ext);
  });
  
  test('Commands registered', async () => {
    const commands = await vscode.commands.getCommands();
    assert.ok(commands.includes('oropendola.setup'));
    assert.ok(commands.includes('oropendola.openChat'));
  });
});
```

## Publishing

### Prepare for Publishing

1. Update version in `package.json`
2. Update `README.md` and `CHANGELOG.md`
3. Test thoroughly
4. Build the package: `vsce package`

### Publish to Marketplace

```bash
# Login to marketplace
vsce login your-publisher-name

# Publish
vsce publish
```

### Version Bump

```bash
# Patch version (1.0.0 → 1.0.1)
vsce publish patch

# Minor version (1.0.0 → 1.1.0)
vsce publish minor

# Major version (1.0.0 → 2.0.0)
vsce publish major
```

## Troubleshooting

### Extension Won't Activate

- Check console for errors
- Verify `package.json` syntax
- Check activation events

### Commands Not Showing

- Verify command registration in `package.json`
- Check `contributes.commands` section
- Reload VS Code

### WebView Not Loading

- Check Content Security Policy
- Verify resource URIs
- Check browser console in DevTools

### API Errors

- Verify credentials
- Check network connection
- Test API endpoint directly
- Review error messages

## Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [VS Code Extension Samples](https://github.com/microsoft/vscode-extension-samples)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)

## Support

- 📧 Email: dev@oropendola.ai
- 💬 Discord: [discord.gg/oropendola](https://discord.gg/oropendola)
- 🐛 Issues: [GitHub Issues](https://github.com/your-org/oropendola-extension/issues)

---

Happy coding! 🐦
