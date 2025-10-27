/**
 * Frontend Reasoning UI Test Script
 * 
 * This script tests the frontend reasoning components independently
 * by simulating ai_progress events without requiring backend.
 * 
 * Usage in Browser Console:
 * 1. Open VSCode with Oropendola extension
 * 2. Open browser DevTools console
 * 3. Copy and paste this entire script
 * 4. Run: testReasoningFrontend()
 */

function testReasoningFrontend() {
    console.log('🧪 [Test] Starting Frontend Reasoning UI Test...');
    
    // Check if we can access the webview
    const webview = document.querySelector('webview, iframe');
    if (!webview) {
        console.error('❌ [Test] No webview/iframe found. Make sure Oropendola sidebar is open.');
        return;
    }
    
    console.log('✅ [Test] Webview found:', webview);
    
    // Simulate ai_progress events
    const taskId = 'test_task_' + Date.now();
    
    const testEvents = [
        {
            type: 'reasoning',
            text: 'Analyzing the user request...',
            partial: true,
            task_id: taskId,
            timestamp: new Date().toISOString()
        },
        {
            type: 'reasoning',
            text: 'Analyzing the user request...\nConsidering REST API principles...',
            partial: true,
            task_id: taskId,
            timestamp: new Date().toISOString()
        },
        {
            type: 'reasoning',
            text: 'Analyzing the user request...\nConsidering REST API principles...\nPlanning architecture layers...',
            partial: true,
            task_id: taskId,
            timestamp: new Date().toISOString()
        },
        {
            type: 'completion',
            text: 'Analysis complete',
            reasoning: 'Analyzed REST API requirements and planned architecture.',
            partial: false,
            task_id: taskId,
            timestamp: new Date().toISOString()
        }
    ];
    
    console.log('📊 [Test] Emitting test events...');
    
    // Emit events with delays
    testEvents.forEach((event, index) => {
        setTimeout(() => {
            console.log(`📤 [Test] Emitting event ${index + 1}/${testEvents.length}:`, event);
            
            // Try to trigger the event through window
            if (window.postMessage) {
                window.postMessage({
                    type: 'ai_progress',
                    data: event
                }, '*');
            }
            
            // Also try custom event
            const customEvent = new CustomEvent('ai_progress', {
                detail: event
            });
            document.dispatchEvent(customEvent);
            
            console.log('✅ [Test] Event emitted');
        }, index * 2000); // 2 second delay between events
    });
    
    console.log('✅ [Test] Test events scheduled');
    console.log('⏱️  [Test] Watch for thinking indicator to appear in VSCode');
    console.log('👀 [Test] Expected: 💡 Thinking indicator with timer');
}

/**
 * Alternative: Manual event emission
 * Use this to send individual test events
 */
function emitTestReasoning(text, partial = true) {
    const event = {
        type: 'reasoning',
        text: text,
        partial: partial,
        task_id: 'manual_test_' + Date.now(),
        timestamp: new Date().toISOString()
    };
    
    console.log('📤 [Manual Test] Emitting reasoning event:', event);
    
    window.postMessage({
        type: 'ai_progress',
        data: event
    }, '*');
    
    const customEvent = new CustomEvent('ai_progress', {
        detail: event
    });
    document.dispatchEvent(customEvent);
    
    console.log('✅ [Manual Test] Event emitted');
}

/**
 * Check if RealtimeManager is connected
 */
function checkRealtimeConnection() {
    console.log('🔍 [Check] Looking for RealtimeManager connection status...');
    
    // This will be visible in the extension's console, not browser console
    console.log('📋 [Check] Expected logs in extension console:');
    console.log('  ✅ [RealtimeManager] Connected to realtime server');
    console.log('  🆔 [RealtimeManager] Socket ID: ...');
    console.log('');
    console.log('💡 [Check] If you see those logs, WebSocket is connected!');
}

// Export functions for browser console
window.testReasoningFrontend = testReasoningFrontend;
window.emitTestReasoning = emitTestReasoning;
window.checkRealtimeConnection = checkRealtimeConnection;

console.log('✅ Test script loaded!');
console.log('📋 Available commands:');
console.log('  testReasoningFrontend() - Run full test sequence');
console.log('  emitTestReasoning("text", partial) - Emit single reasoning event');
console.log('  checkRealtimeConnection() - Check WebSocket status');
