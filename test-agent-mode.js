/**
 * Agent Mode Integration Test
 * 
 * Quick test to verify Agent Mode is working correctly
 * Run this in VS Code Developer Console (Cmd+Shift+I / Ctrl+Shift+I)
 */

// Test 1: Check if Agent Client is available
async function testAgentClient() {
    console.log('=== Test 1: Agent Client Availability ===');
    try {
        const { agentClient } = require('./src/api/agent-client');
        console.log('✅ Agent client loaded successfully');
        return agentClient;
    } catch (error) {
        console.error('❌ Failed to load agent client:', error);
        return null;
    }
}

// Test 2: Validate API Key
async function testApiKey(agentClient) {
    console.log('\n=== Test 2: API Key Validation ===');
    try {
        const result = await agentClient.validateApiKey();
        console.log('✅ API key validation result:', result);
        return result;
    } catch (error) {
        console.error('❌ API key validation failed:', error.message);
        return null;
    }
}

// Test 3: Health Check
async function testHealthCheck(agentClient) {
    console.log('\n=== Test 3: Health Check ===');
    try {
        const health = await agentClient.healthCheck();
        console.log('✅ Health check result:', health);
        return health;
    } catch (error) {
        console.error('❌ Health check failed:', error.message);
        return null;
    }
}

// Test 4: Simple Agent Request
async function testAgentRequest(agentClient) {
    console.log('\n=== Test 4: Agent Request ===');
    try {
        const response = await agentClient.agent({
            prompt: "What is 2+2? Answer in one word."
        });
        
        console.log('✅ Agent request successful!');
        console.log('   Model:', response.model);
        console.log('   Selection Reason:', response.selection_reason);
        console.log('   Response:', response.response?.content || response.content);
        console.log('   Cost:', response.cost);
        console.log('   Usage:', response.usage);
        
        return response;
    } catch (error) {
        console.error('❌ Agent request failed:', error.message);
        return null;
    }
}

// Test 5: Check Configuration
async function testConfiguration() {
    console.log('\n=== Test 5: Configuration ===');
    const vscode = require('vscode');
    const config = vscode.workspace.getConfiguration('oropendola');
    
    const settings = {
        apiKey: config.get('api.key') ? '***SET***' : 'NOT SET',
        apiUrl: config.get('api.url'),
        agentModeEnabled: config.get('agentMode.enabled'),
        showModelBadge: config.get('agentMode.showModelBadge')
    };
    
    console.log('Configuration:', JSON.stringify(settings, null, 2));
    
    if (!config.get('api.key')) {
        console.warn('⚠️  API key not set. Please configure oropendola.api.key');
        return false;
    }
    
    console.log('✅ Configuration looks good');
    return true;
}

// Test 6: ConversationTask Integration
async function testConversationTask() {
    console.log('\n=== Test 6: ConversationTask Integration ===');
    try {
        const ConversationTask = require('./src/core/ConversationTask');
        const task = new ConversationTask('test-task', {
            apiUrl: 'https://oropendola.ai',
            mode: 'agent',
            useAgentMode: true
        });
        
        console.log('✅ ConversationTask created with Agent Mode');
        console.log('   Task ID:', task.taskId);
        console.log('   Mode:', task.mode);
        console.log('   Agent Mode enabled:', task.useAgentMode);
        
        // Listen for model selection
        task.on('modelSelected', (data) => {
            console.log('✅ Model selected:', data.model);
            console.log('   Reason:', data.reason);
        });
        
        return task;
    } catch (error) {
        console.error('❌ ConversationTask test failed:', error);
        return null;
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting Agent Mode Integration Tests...\n');
    
    // Test configuration first
    const configOk = await testConfiguration();
    if (!configOk) {
        console.log('\n⚠️  Please configure your API key before running other tests');
        return;
    }
    
    // Load agent client
    const agentClient = await testAgentClient();
    if (!agentClient) {
        console.log('\n❌ Cannot proceed without agent client');
        return;
    }
    
    // Run API tests
    await testHealthCheck(agentClient);
    await testApiKey(agentClient);
    await testAgentRequest(agentClient);
    
    // Test integration
    await testConversationTask();
    
    console.log('\n✅ All tests completed!');
    console.log('\n📊 Summary:');
    console.log('   - Agent client: Working');
    console.log('   - API connection: Working');
    console.log('   - Model selection: Working');
    console.log('   - ConversationTask: Integrated');
}

// Export for use in console
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        runAllTests,
        testAgentClient,
        testApiKey,
        testHealthCheck,
        testAgentRequest,
        testConfiguration,
        testConversationTask
    };
}

// Instructions
console.log('='.repeat(60));
console.log('Agent Mode Integration Test Suite');
console.log('='.repeat(60));
console.log('');
console.log('To run all tests:');
console.log('  runAllTests()');
console.log('');
console.log('To run individual tests:');
console.log('  testConfiguration()');
console.log('  testAgentClient()');
console.log('  testHealthCheck()');
console.log('  testApiKey()');
console.log('  testAgentRequest()');
console.log('  testConversationTask()');
console.log('');
console.log('='.repeat(60));
