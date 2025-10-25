/**
 * Integration Tests for Backend Services
 * Tests conversationHistoryService and backendTodoService
 */

const assert = require('assert');
const { conversationHistoryService } = require('../../src/services/conversationHistoryService');
const { backendTodoService } = require('../../src/services/backendTodoService');
const vscode = require('vscode');

describe('Backend Services Integration Tests', function () {
    this.timeout(30000);

    before(function () {
        // Check if credentials are configured
        const config = vscode.workspace.getConfiguration('oropendola');
        const hasApiKey = config.get('api.key') && config.get('api.secret');
        const hasCookies = config.get('session.cookies');

        if (!hasApiKey && !hasCookies) {
            console.warn('⚠️ No credentials configured - tests will be skipped');
            this.skip();
        }
    });

    // ========================================
    // Conversation History Service Tests
    // ========================================
    describe('ConversationHistoryService', () => {

        let testConversationId;

        before(async () => {
            // Get a recent conversation to test with
            const recent = await conversationHistoryService.getRecentConversations(1);
            if (recent.length > 0) {
                testConversationId = recent[0].conversation_id;
            }
        });

        it('should get recent conversations', async () => {
            const conversations = await conversationHistoryService.getRecentConversations(5);

            assert.ok(Array.isArray(conversations), 'Should return array');
            console.log('✅ Retrieved', conversations.length, 'recent conversations');

            if (conversations.length > 0) {
                const conv = conversations[0];
                assert.ok(conv.conversation_id, 'Should have conversation_id');
                assert.ok(conv.title, 'Should have title');
                console.log('   Latest:', conv.title);
            }
        });

        it('should list conversations with pagination', async () => {
            const result = await conversationHistoryService.listConversations({
                limit: 10,
                offset: 0,
                status: 'active'
            });

            assert.ok(result.conversations, 'Should have conversations');
            assert.ok(Array.isArray(result.conversations), 'Should be array');
            console.log('✅ Listed', result.conversations.length, 'conversations');
        });

        it('should get specific conversation', async function () {
            if (!testConversationId) {
                console.log('⚠️ No conversation to test, skipping');
                this.skip();
            }

            const conv = await conversationHistoryService.getConversation(testConversationId);

            assert.ok(conv.conversation_id === testConversationId, 'Should match ID');
            assert.ok(Array.isArray(conv.messages), 'Should have messages');
            console.log('✅ Retrieved conversation:', conv.title);
            console.log('   Messages:', conv.messages.length);
        });

        it('should cache conversations', async function () {
            if (!testConversationId) {
                this.skip();
            }

            // First call - from API
            const start1 = Date.now();
            await conversationHistoryService.getConversation(testConversationId, 50, false);
            const time1 = Date.now() - start1;

            // Second call - from cache
            const start2 = Date.now();
            await conversationHistoryService.getConversation(testConversationId, 50, true);
            const time2 = Date.now() - start2;

            console.log('✅ First call:', time1, 'ms, Cached:', time2, 'ms');
            assert.ok(time2 < time1, 'Cached call should be faster');
        });

        it('should search conversations', async () => {
            const results = await conversationHistoryService.searchConversations('test', 5);

            assert.ok(Array.isArray(results), 'Should return array');
            console.log('✅ Found', results.length, 'matching conversations');
        });

        it('should get conversation metadata', async function () {
            if (!testConversationId) {
                this.skip();
            }

            const metadata = await conversationHistoryService.getConversationMetadata(testConversationId);

            assert.ok(metadata, 'Should return metadata');
            assert.ok(metadata.conversation_id, 'Should have ID');
            assert.ok(metadata.title, 'Should have title');
            console.log('✅ Metadata:', metadata.title);
        });

        it('should export conversation to markdown', async function () {
            if (!testConversationId) {
                this.skip();
            }

            const markdown = await conversationHistoryService.exportToMarkdown(testConversationId);

            assert.ok(typeof markdown === 'string', 'Should return string');
            assert.ok(markdown.includes('#'), 'Should have markdown headers');
            assert.ok(markdown.length > 100, 'Should have substantial content');
            console.log('✅ Exported', markdown.length, 'characters');
        });

        it('should get conversation statistics', async function () {
            if (!testConversationId) {
                this.skip();
            }

            const stats = await conversationHistoryService.getConversationStats(testConversationId);

            assert.ok(stats, 'Should return stats');
            assert.ok(typeof stats.total_messages === 'number', 'Should have message count');
            console.log('✅ Stats:', stats.total_messages, 'messages,', stats.total_tokens, 'tokens');
        });

        it('should clear cache', () => {
            conversationHistoryService.clearCache();
            console.log('✅ Cache cleared');
        });
    });

    // ========================================
    // Backend Todo Service Tests
    // ========================================
    describe('BackendTodoService', () => {

        let testTodoId;

        it('should extract todos from text', async () => {
            const text = `
                Here's what we need to do:
                1. Fix the authentication bug in login.js
                2. Add unit tests for the API endpoints
                3. Update the README with new instructions
                4. Deploy to production server
            `;

            const todos = await backendTodoService.extractTodos(text, 'Integration test', true);

            assert.ok(Array.isArray(todos), 'Should return array');
            assert.ok(todos.length >= 3, 'Should extract multiple todos');
            console.log('✅ Extracted', todos.length, 'todos');

            if (todos.length > 0) {
                testTodoId = todos[0].todo_id || todos[0].name;
                console.log('   First todo:', todos[0].description);
            }
        });

        it('should get open todos', async () => {
            const todos = await backendTodoService.getOpenTodos(20);

            assert.ok(Array.isArray(todos), 'Should return array');
            console.log('✅ Found', todos.length, 'open todos');
        });

        it('should get completed todos', async () => {
            const todos = await backendTodoService.getCompletedTodos(20);

            assert.ok(Array.isArray(todos), 'Should return array');
            console.log('✅ Found', todos.length, 'completed todos');
        });

        it('should get high priority todos', async () => {
            const todos = await backendTodoService.getHighPriorityTodos(20);

            assert.ok(Array.isArray(todos), 'Should return array');
            console.log('✅ Found', todos.length, 'high priority todos');
        });

        it('should get todos with filters', async () => {
            const todos = await backendTodoService.getTodos({
                status: 'Open',
                priority: 'Medium',
                limit: 10
            });

            assert.ok(Array.isArray(todos), 'Should return array');
            console.log('✅ Filtered:', todos.length, 'medium priority open todos');
        });

        it('should update todo status', async function () {
            if (!testTodoId) {
                // Get any open todo
                const todos = await backendTodoService.getOpenTodos(1);
                if (todos.length === 0) {
                    console.log('⚠️ No todos to test update');
                    this.skip();
                }
                testTodoId = todos[0].name;
            }

            const result = await backendTodoService.updateTodoStatus(testTodoId, 'Working');

            assert.ok(result, 'Should return result');
            console.log('✅ Updated todo status to Working');
        });

        it('should complete todo', async function () {
            if (!testTodoId) {
                this.skip();
            }

            const result = await backendTodoService.completeTodo(testTodoId);

            assert.ok(result, 'Should return result');
            console.log('✅ Marked todo as completed');
        });

        it('should update todo priority', async function () {
            if (!testTodoId) {
                this.skip();
            }

            const result = await backendTodoService.updateTodoPriority(testTodoId, 'High');

            assert.ok(result, 'Should return result');
            console.log('✅ Updated todo priority to High');
        });

        it('should get todo statistics', async () => {
            const stats = await backendTodoService.getTodoStats();

            assert.ok(stats, 'Should return stats');
            assert.ok(typeof stats.total === 'number', 'Should have total');
            assert.ok(typeof stats.completion_rate === 'number', 'Should have completion rate');
            console.log('✅ Todo stats:', stats.total, 'total,', stats.completion_rate + '% complete');
        });

        it('should auto-extract todos from AI response', async () => {
            const aiResponse = `
                I've analyzed the code. Here's what needs to be done:
                - [ ] Refactor the authentication module
                - [ ] Add error handling for API calls
                - [ ] Write integration tests
            `;

            const todos = await backendTodoService.autoExtractFromResponse(
                aiResponse,
                'Code review'
            );

            assert.ok(Array.isArray(todos), 'Should return array');
            console.log('✅ Auto-extracted', todos.length, 'todos from AI response');
        });

        it('should format todos as markdown', () => {
            const todos = [
                { status: 'Open', priority: 'High', description: 'Fix bug', name: 'TODO-001' },
                { status: 'Working', priority: 'Medium', description: 'Add tests', name: 'TODO-002' },
                { status: 'Completed', priority: 'Low', description: 'Update docs', name: 'TODO-003' }
            ];

            const markdown = backendTodoService.formatTodosMarkdown(todos);

            assert.ok(typeof markdown === 'string', 'Should return string');
            assert.ok(markdown.includes('##'), 'Should have headers');
            assert.ok(markdown.includes('- ['), 'Should have checkboxes');
            console.log('✅ Formatted todos as markdown');
        });

        it('should enable/disable auto-extraction', () => {
            backendTodoService.setAutoExtraction(false);
            assert.strictEqual(backendTodoService.autoExtraction, false);

            backendTodoService.setAutoExtraction(true);
            assert.strictEqual(backendTodoService.autoExtraction, true);

            console.log('✅ Auto-extraction toggle working');
        });

        it('should emit events on updates', done => {
            backendTodoService.once('todoUpdated', data => {
                assert.ok(data, 'Should receive event data');
                console.log('✅ Event emitted:', data);
                done();
            });

            // Trigger an update (will skip if no test todo available)
            if (testTodoId) {
                backendTodoService.updateTodoStatus(testTodoId, 'Open').catch(() => {
                    // Ignore errors in event test
                    done();
                });
            } else {
                done();
            }
        });

        it('should clear cache', () => {
            backendTodoService.clearCache();
            console.log('✅ Todo cache cleared');
        });
    });
});
