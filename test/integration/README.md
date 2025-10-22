# Integration Tests - Oropendola Backend API v2.0

Comprehensive integration tests for the Oropendola.ai backend API.

## 📋 Test Coverage

### API Client Tests ([api.test.js](api.test.js))
- ✅ **Authentication**
  - API Key/Secret authentication
  - Session cookie authentication
  - Invalid credentials handling
- ✅ **Chat Modes**
  - Chat mode (no tools)
  - Code mode (optimized for code)
  - Agent mode (with tools)
- ✅ **Model Selection**
  - Auto selection
  - Specific models (Claude, DeepSeek, Gemini, GPT)
  - Fallback handling
- ✅ **Response Format**
  - Usage statistics
  - Cost tracking
  - Conversation ID
- ✅ **Conversation Management**
  - Get conversation history
  - List conversations
- ✅ **Todo Management**
  - Extract todos
  - Get/update todos
- ✅ **Analytics**
  - Usage statistics
  - Provider filtering
- ✅ **Error Handling**
  - Network errors
  - Validation errors
- ✅ **Performance**
  - Response time
  - Caching

### Service Tests ([services.test.js](services.test.js))
- ✅ **Conversation History Service**
  - Get recent conversations
  - List with pagination
  - Get specific conversation
  - Caching behavior
  - Search functionality
  - Export to Markdown
  - Statistics
- ✅ **Backend Todo Service**
  - Extract todos from text
  - Get todos with filters
  - Update status/priority
  - Auto-extraction
  - Event emissions
  - Markdown formatting

## 🚀 Running Tests

### Prerequisites
1. Configure API credentials in VS Code settings:
   ```json
   {
     "oropendola.api.url": "https://oropendola.ai",
     "oropendola.api.key": "YOUR_API_KEY",
     "oropendola.api.secret": "YOUR_API_SECRET"
   }
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Run All Tests
```bash
npm test
```

### Run Integration Tests Only
```bash
npm run test:integration
```

### Run Specific Test File
```bash
npx mocha test/integration/api.test.js
npx mocha test/integration/services.test.js
```

### Run Specific Test Suite
```bash
npx mocha test/integration/api.test.js --grep "Authentication"
npx mocha test/integration/services.test.js --grep "Todo"
```

### Watch Mode
```bash
npm run test:watch
```

## 📊 Expected Output

```
  Oropendola Backend API Integration Tests
    Authentication
      ✓ should authenticate with API Key/Secret (1234ms)
      ✓ should authenticate with Session Cookies (987ms)
      ✓ should fail with invalid credentials (234ms)
    Chat Modes
      ✓ should work in CHAT mode (no tools) (2345ms)
      ✓ should work in CODE mode (optimized for code) (1876ms)
      ✓ should work in AGENT mode (with tools) (2156ms)
    Model Selection
      ✓ should use AUTO model selection (1543ms)
      ✓ should use specific model: Claude (2987ms)
      ✓ should use specific model: DeepSeek (1234ms)
    ...

  Backend Services Integration Tests
    ConversationHistoryService
      ✓ should get recent conversations (543ms)
      ✓ should list conversations with pagination (678ms)
      ✓ should get specific conversation (892ms)
      ...
    BackendTodoService
      ✓ should extract todos from text (1234ms)
      ✓ should get open todos (456ms)
      ✓ should update todo status (789ms)
      ...

  52 passing (45s)
  3 skipped
```

## ⚙️ Configuration

### Environment Variables
You can also use environment variables instead of VS Code settings:

```bash
export OROPENDOLA_API_KEY="your_api_key"
export OROPENDOLA_API_SECRET="your_api_secret"
export OROPENDOLA_API_URL="https://oropendola.ai"
```

### Test Timeouts
Default timeout is 30 seconds for most tests, 60 seconds for authentication tests, and 120 seconds for performance tests.

To change timeout:
```javascript
describe('My Tests', function() {
  this.timeout(60000); // 60 seconds

  it('should...', function() {
    // test
  });
});
```

## 🐛 Troubleshooting

### Tests Skipped
**Reason**: No credentials configured
**Solution**: Add API credentials to VS Code settings

### Authentication Failures
**Reason**: Invalid or expired credentials
**Solution**: Generate new API keys at https://oropendola.ai

### Network Errors
**Reason**: Cannot reach backend
**Solution**: Check internet connection, verify backend URL

### Rate Limit Errors
**Reason**: Too many requests
**Solution**: Wait and retry, or upgrade tier

### Timeout Errors
**Reason**: Slow network or backend processing
**Solution**: Increase timeout or optimize requests

## 📝 Writing New Tests

### Template
```javascript
describe('My Feature', function() {
  this.timeout(30000);

  before(async function() {
    // Setup
  });

  it('should do something', async function() {
    const result = await myFunction();

    assert.ok(result, 'Should have result');
    console.log('✅ Test passed');
  });

  after(function() {
    // Cleanup
  });
});
```

### Best Practices
1. Use descriptive test names
2. Test one thing per test
3. Clean up after tests
4. Handle errors gracefully
5. Use appropriate timeouts
6. Log useful information
7. Skip tests when prerequisites missing

## 🔍 Debugging Tests

### Enable Verbose Logging
```bash
DEBUG=* npm test
```

### Run Single Test
```bash
npx mocha test/integration/api.test.js --grep "should authenticate"
```

### Inspect Test Data
Add console.log statements:
```javascript
it('should test', async function() {
  const result = await myFunction();
  console.log('Result:', JSON.stringify(result, null, 2));
  assert.ok(result);
});
```

## 📚 References

- [Mocha Documentation](https://mochajs.org/)
- [Node Assert API](https://nodejs.org/api/assert.html)
- [Oropendola Backend API Guide](../../BACKEND_INTEGRATION_v2.0_COMPLETE.md)
- [VS Code Extension Testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
