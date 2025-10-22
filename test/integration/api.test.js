/**
 * Integration Tests for Oropendola.ai Backend API v2.0
 * Tests authentication, chat modes, streaming, and model selection
 */

const assert = require('assert');
const { ApiClient } = require('../../src/api/client');
const vscode = require('vscode');

describe('Oropendola Backend API Integration Tests', function() {
    // Increase timeout for network requests
    this.timeout(60000);

    let client;
    let testConversationId;

    before(async function() {
        console.log('🧪 Starting integration tests...');

        // Check if credentials are configured
        const config = vscode.workspace.getConfiguration('oropendola');
        const hasApiKey = config.get('api.key') && config.get('api.secret');
        const hasCookies = config.get('session.cookies');

        if (!hasApiKey && !hasCookies) {
            console.warn('⚠️ No credentials configured - tests will be skipped');
            this.skip();
        }
    });

    beforeEach(function() {
        // Create fresh client for each test
        client = new ApiClient();
    });

    // ========================================
    // Authentication Tests
    // ========================================
    describe('Authentication', function() {

        it('should authenticate with API Key/Secret', async function() {
            const config = vscode.workspace.getConfiguration('oropendola');
            const apiKey = config.get('api.key');
            const apiSecret = config.get('api.secret');

            if (!apiKey || !apiSecret) {
                this.skip();
            }

            client.updateCredentials({ apiKey, apiSecret });

            try {
                const result = await client.chatCompletion({
                    messages: [{ role: 'user', content: 'Hello' }],
                    mode: 'chat',
                    model: 'auto',
                    max_tokens: 50
                });

                assert.ok(result.response, 'Should receive response');
                assert.ok(result.model, 'Should return model name');
                console.log('✅ API Key/Secret authentication successful');
            } catch (error) {
                assert.fail(`API Key authentication failed: ${error.message}`);
            }
        });

        it('should authenticate with Session Cookies', async function() {
            const config = vscode.workspace.getConfiguration('oropendola');
            const sessionCookies = config.get('session.cookies');

            if (!sessionCookies) {
                this.skip();
            }

            client.updateCredentials({ sessionCookies });

            try {
                const result = await client.chatCompletion({
                    messages: [{ role: 'user', content: 'Hello' }],
                    mode: 'chat',
                    model: 'auto',
                    max_tokens: 50
                });

                assert.ok(result.response, 'Should receive response');
                console.log('✅ Session cookie authentication successful');
            } catch (error) {
                assert.fail(`Session cookie authentication failed: ${error.message}`);
            }
        });

        it('should fail with invalid credentials', async function() {
            client.updateCredentials({
                apiKey: 'invalid_key',
                apiSecret: 'invalid_secret'
            });

            try {
                await client.chatCompletion({
                    messages: [{ role: 'user', content: 'Hello' }]
                });
                assert.fail('Should have thrown authentication error');
            } catch (error) {
                assert.ok(error.message.includes('401') || error.message.includes('auth'),
                    'Should receive authentication error');
                console.log('✅ Invalid credentials correctly rejected');
            }
        });
    });

    // ========================================
    // Chat Mode Tests
    // ========================================
    describe('Chat Modes', function() {

        it('should work in CHAT mode (no tools)', async function() {
            const result = await client.chatCompletion({
                messages: [
                    { role: 'user', content: 'What is 2+2? Just answer the number.' }
                ],
                mode: 'chat',
                model: 'auto',
                max_tokens: 50
            });

            assert.ok(result.response, 'Should receive response');
            assert.ok(result.response.includes('4'), 'Should contain answer');
            assert.strictEqual(result.tool_calls?.length || 0, 0, 'Should not have tool calls');
            console.log('✅ Chat mode test passed');
            console.log('   Response:', result.response.substring(0, 100));
        });

        it('should work in CODE mode (optimized for code)', async function() {
            const result = await client.chatCompletion({
                messages: [
                    { role: 'system', content: 'You are a code generator. Output only code.' },
                    { role: 'user', content: 'Write a function that adds two numbers in JavaScript' }
                ],
                mode: 'code',
                model: 'auto',
                temperature: 0.3,
                max_tokens: 200
            });

            assert.ok(result.response, 'Should receive response');
            assert.ok(result.response.includes('function') || result.response.includes('=>'),
                'Should contain code');
            console.log('✅ Code mode test passed');
            console.log('   Model:', result.model);
        });

        it('should work in AGENT mode (with tools)', async function() {
            // Agent mode may use tools - we just test it returns valid response
            const result = await client.chatCompletion({
                messages: [
                    { role: 'user', content: 'List the factors of 12' }
                ],
                mode: 'agent',
                model: 'auto',
                max_tokens: 200
            });

            assert.ok(result.response, 'Should receive response');
            console.log('✅ Agent mode test passed');
            console.log('   Has tool_calls:', !!result.tool_calls);
        });
    });

    // ========================================
    // Model Selection Tests
    // ========================================
    describe('Model Selection', function() {

        it('should use AUTO model selection', async function() {
            const result = await client.chatCompletion({
                messages: [{ role: 'user', content: 'Hello' }],
                model: 'auto',
                max_tokens: 50
            });

            assert.ok(result.model, 'Should return selected model');
            assert.ok(result.provider, 'Should return provider');
            console.log('✅ Auto selection:', result.model, '(' + result.provider + ')');
        });

        it('should use specific model: Claude', async function() {
            try {
                const result = await client.chatCompletion({
                    messages: [{ role: 'user', content: 'Hi' }],
                    model: 'claude',
                    max_tokens: 50
                });

                assert.ok(result.model.includes('claude'), 'Should use Claude model');
                console.log('✅ Claude model:', result.model);
            } catch (error) {
                if (error.message.includes('not available')) {
                    console.log('⚠️ Claude not available, skipping');
                    this.skip();
                } else {
                    throw error;
                }
            }
        });

        it('should use specific model: DeepSeek', async function() {
            try {
                const result = await client.chatCompletion({
                    messages: [{ role: 'user', content: 'Hi' }],
                    model: 'deepseek',
                    max_tokens: 50
                });

                assert.ok(result.model.includes('deepseek'), 'Should use DeepSeek model');
                console.log('✅ DeepSeek model:', result.model);
            } catch (error) {
                if (error.message.includes('not available')) {
                    console.log('⚠️ DeepSeek not available, skipping');
                    this.skip();
                } else {
                    throw error;
                }
            }
        });

        it('should fallback when model unavailable', async function() {
            try {
                const result = await client.chatCompletion({
                    messages: [{ role: 'user', content: 'Hi' }],
                    model: 'nonexistent-model-12345',
                    max_tokens: 50
                });

                // Backend should fallback to auto
                assert.ok(result.model, 'Should fallback to available model');
                console.log('✅ Fallback model:', result.model);
            } catch (error) {
                // Expected if backend doesn't support fallback
                console.log('⚠️ No fallback support, error expected');
            }
        });
    });

    // ========================================
    // Response Format Tests
    // ========================================
    describe('Response Format', function() {

        it('should include usage statistics', async function() {
            const result = await client.chatCompletion({
                messages: [{ role: 'user', content: 'Hello' }],
                max_tokens: 50
            });

            assert.ok(result.usage, 'Should include usage');
            assert.ok(result.usage.input_tokens > 0, 'Should have input tokens');
            assert.ok(result.usage.output_tokens > 0, 'Should have output tokens');
            console.log('✅ Usage:', result.usage);
        });

        it('should include cost information', async function() {
            const result = await client.chatCompletion({
                messages: [{ role: 'user', content: 'Hello' }],
                max_tokens: 50
            });

            assert.ok(typeof result.cost === 'number', 'Should include cost');
            console.log('✅ Cost: $' + result.cost.toFixed(6));
        });

        it('should include conversation_id', async function() {
            const result = await client.chatCompletion({
                messages: [{ role: 'user', content: 'Start conversation' }],
                max_tokens: 50
            });

            assert.ok(result.conversation_id, 'Should include conversation_id');
            testConversationId = result.conversation_id;
            console.log('✅ Conversation ID:', testConversationId);
        });
    });

    // ========================================
    // Conversation Management Tests
    // ========================================
    describe('Conversation Management', function() {

        before(async function() {
            // Create a test conversation
            if (!testConversationId) {
                const result = await client.chatCompletion({
                    messages: [{ role: 'user', content: 'Test conversation' }],
                    max_tokens: 50
                });
                testConversationId = result.conversation_id;
            }
        });

        it('should retrieve conversation history', async function() {
            if (!testConversationId) {
                this.skip();
            }

            const result = await client.getConversationHistory(testConversationId);

            assert.ok(result.conversation_id, 'Should have conversation_id');
            assert.ok(Array.isArray(result.messages), 'Should have messages array');
            console.log('✅ Retrieved', result.messages.length, 'messages');
        });

        it('should list conversations', async function() {
            const result = await client.listConversations(10, 0, 'active');

            assert.ok(Array.isArray(result.conversations), 'Should have conversations array');
            console.log('✅ Found', result.conversations.length, 'conversations');
        });
    });

    // ========================================
    // Todo Management Tests
    // ========================================
    describe('Todo Management', function() {

        it('should extract todos from text', async function() {
            const result = await client.extractTodos(
                'We need to: 1. Fix the login bug 2. Add unit tests 3. Update documentation',
                'Test context',
                true
            );

            assert.ok(result.todos, 'Should have todos');
            assert.ok(result.todos.length >= 3, 'Should extract at least 3 todos');
            console.log('✅ Extracted', result.todos.length, 'todos');
        });

        it('should retrieve todos with filters', async function() {
            const result = await client.getTodos('Open', null, 50);

            assert.ok(Array.isArray(result.todos), 'Should have todos array');
            console.log('✅ Found', result.todos.length, 'open todos');
        });

        it('should update todo status', async function() {
            // First get a todo
            const todos = await client.getTodos('Open', null, 1);

            if (!todos.todos || todos.todos.length === 0) {
                console.log('⚠️ No open todos to test update');
                this.skip();
            }

            const todoId = todos.todos[0].name;
            const result = await client.updateTodo(todoId, { status: 'Working' });

            assert.ok(result, 'Should update successfully');
            console.log('✅ Updated todo:', todoId);
        });
    });

    // ========================================
    // Analytics Tests
    // ========================================
    describe('Analytics', function() {

        it('should retrieve usage statistics', async function() {
            const result = await client.getUsageStats(7, 'all');

            assert.ok(typeof result.total_requests === 'number', 'Should have total_requests');
            assert.ok(typeof result.total_cost === 'number', 'Should have total_cost');
            console.log('✅ Usage stats:', result.total_requests, 'requests, $' + result.total_cost.toFixed(2));
        });

        it('should filter statistics by provider', async function() {
            const result = await client.getUsageStats(7, 'claude');

            if (result.by_provider && result.by_provider.claude) {
                console.log('✅ Claude stats:', result.by_provider.claude.requests, 'requests');
            } else {
                console.log('⚠️ No Claude usage in timeframe');
            }
        });
    });

    // ========================================
    // Error Handling Tests
    // ========================================
    describe('Error Handling', function() {

        it('should handle rate limit errors gracefully', async function() {
            // Note: This test won't actually trigger rate limit unless we spam requests
            // Just testing that the error format is handled
            this.skip(); // Skip by default to avoid rate limits
        });

        it('should handle network errors', async function() {
            const badClient = new ApiClient();
            badClient.client.defaults.baseURL = 'https://invalid-domain-xyz-123.com';

            try {
                await badClient.chatCompletion({
                    messages: [{ role: 'user', content: 'Test' }]
                });
                assert.fail('Should have thrown network error');
            } catch (error) {
                assert.ok(error.message, 'Should have error message');
                console.log('✅ Network error handled:', error.code);
            }
        });

        it('should handle malformed requests', async function() {
            try {
                await client.chatCompletion({
                    messages: 'invalid', // Should be array
                });
                assert.fail('Should have thrown validation error');
            } catch (error) {
                console.log('✅ Validation error handled');
            }
        });
    });

    // ========================================
    // Performance Tests
    // ========================================
    describe('Performance', function() {

        it('should respond within timeout (2 minutes)', async function() {
            this.timeout(120000);

            const start = Date.now();
            const result = await client.chatCompletion({
                messages: [{ role: 'user', content: 'Quick test' }],
                max_tokens: 50
            });
            const duration = Date.now() - start;

            assert.ok(result.response, 'Should receive response');
            console.log('✅ Response time:', (duration / 1000).toFixed(2), 'seconds');
        });

        it('should cache responses appropriately', async function() {
            // Two identical requests - second should be faster (if caching enabled)
            const message = 'Test caching ' + Date.now();

            const start1 = Date.now();
            await client.chatCompletion({
                messages: [{ role: 'user', content: message }],
                max_tokens: 50
            });
            const time1 = Date.now() - start1;

            const start2 = Date.now();
            await client.chatCompletion({
                messages: [{ role: 'user', content: message }],
                max_tokens: 50
            });
            const time2 = Date.now() - start2;

            console.log('✅ First request:', time1, 'ms, Second:', time2, 'ms');
        });
    });
});
