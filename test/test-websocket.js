#!/usr/bin/env node

/**
 * WebSocket Connection Test
 *
 * Tests RealtimeManager connection to oropendola.ai
 *
 * Usage:
 *   1. Get your session cookie from browser (oropendola.ai)
 *   2. Run: SID=your_session_id node test/test-websocket.js
 */

const RealtimeManager = require('../src/core/RealtimeManager');

console.log('🧪 WebSocket Connection Test\n');
console.log('═'.repeat(60));

// Get session ID from environment or use placeholder
const sessionId = process.env.SID || 'test_session_id';
const sessionCookies = `sid=${sessionId}; system_user=yes`;

console.log('\n📋 Configuration:');
console.log('  API URL: https://oropendola.ai');
console.log(`  Session ID: ${sessionId.substring(0, 10)}...`);
console.log('');

// Create RealtimeManager instance
const rtm = new RealtimeManager('https://oropendola.ai', sessionCookies);

// Track connection state
let isConnected = false;
const startTime = Date.now();

// Connection successful
rtm.on('connected', () => {
    const connectTime = Date.now() - startTime;
    console.log('✅ TEST PASSED: WebSocket connected successfully!');
    console.log(`   Connection time: ${connectTime}ms`);
    console.log(`   Socket ID: ${rtm.socket.id}`);
    console.log('');

    const status = rtm.getStatus();
    console.log('📊 Connection Status:');
    console.log(`   Connected: ${status.connected}`);
    console.log(`   Socket ID: ${status.socketId}`);
    console.log(`   Reconnect Attempts: ${status.reconnectAttempts}`);
    console.log(`   API URL: ${status.apiUrl}`);
    console.log('');

    isConnected = true;
});

// Connection lost
rtm.on('disconnected', reason => {
    console.log(`⚠️  WebSocket disconnected: ${reason}`);
    isConnected = false;
});

// Connection error
rtm.on('error', error => {
    console.error('❌ TEST FAILED: Connection error');
    console.error(`   Error: ${error.message}`);
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('   1. Check your session ID is valid');
    console.error('   2. Make sure you are logged in to oropendola.ai');
    console.error('   3. Verify Socket.IO server is running on server');
    console.error('   4. Check firewall/network settings');
    console.error('');
    process.exit(1);
});

// AI Progress events
rtm.on('ai_progress', data => {
    console.log('📊 AI Progress Event Received:');
    console.log(`   Type: ${data.type}`);
    console.log(`   Message: ${data.message || '(no message)'}`);
    if (data.step && data.total) {
        console.log(`   Progress: ${data.step}/${data.total}`);
    }
    console.log('');
});

// Frappe msgprint events
rtm.on('msgprint', data => {
    console.log('📢 Msgprint Event:', data);
});

// Custom events
rtm.on('custom_event', ({ eventName, args }) => {
    console.log(`🔔 Custom Event: ${eventName}`, args);
});

// Start connection
console.log('🔌 Connecting to WebSocket server...');
console.log('');
rtm.connect();

// Test duration
const testDuration = 30000; // 30 seconds

console.log(`⏱️  Test will run for ${testDuration / 1000} seconds`);
console.log('   Waiting for AI progress events...');
console.log('   (Send a message in VS Code to trigger events)');
console.log('');

// Disconnect after test duration
setTimeout(() => {
    console.log('═'.repeat(60));
    console.log('\n⏱️  Test duration complete\n');

    if (isConnected) {
        console.log('✅ Connection Status: CONNECTED');
        console.log('✅ Test Result: PASSED');
        console.log('');
        console.log('💡 WebSocket integration is working correctly!');
        console.log('   Your extension can now receive real-time progress updates.');
    } else {
        console.log('❌ Connection Status: DISCONNECTED');
        console.log('⚠️  Test Result: WARNING');
        console.log('');
        console.log('💡 WebSocket connection failed or lost.');
        console.log('   Check your session cookies and server configuration.');
    }

    console.log('');
    console.log('🔌 Disconnecting...');
    rtm.disconnect();

    console.log('✅ Test complete!');
    console.log('');

    process.exit(isConnected ? 0 : 1);
}, testDuration);

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n\n⏹️  Test interrupted by user\n');
    rtm.disconnect();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n\n⏹️  Test terminated\n');
    rtm.disconnect();
    process.exit(0);
});
