/**
 * Integration Test: Multi-Mode System
 * 
 * This script verifies the mode system is properly bundled
 */

console.log('🧪 Multi-Mode System Bundle Verification\n');

// Check if extension.js exists and contains mode system code
const fs = require('fs');
const path = require('path');

const extensionPath = path.join(__dirname, 'dist', 'extension.js');

if (!fs.existsSync(extensionPath)) {
    console.error('❌ extension.js not found in dist/');
    process.exit(1);
}

const extensionCode = fs.readFileSync(extensionPath, 'utf8');

// Check for mode system components
const checks = [
    { name: 'Mode Manager functionality', pattern: /getCurrentMode|switchMode/ },
    { name: 'Mode Commands registration', pattern: /oropendola\.switchMode|oropendola\.switchToCodeMode/ },
    { name: 'Mode Integration Service', pattern: /prepareApiContext|validateAction/ },
    { name: 'AssistantMode enum', pattern: /AssistantMode|CODE|ARCHITECT|ASK|DEBUG/ },
    { name: 'MODE_CONFIGS object', pattern: /CODE.*mode|ARCHITECT.*mode|ASK.*mode|DEBUG.*mode/ },
    { name: 'Mode context in API requests', pattern: /mode_settings|modeSettings/ },
    { name: 'Mode Message Handler', pattern: /ModeMessageHandler|handleMessage/ },
    { name: 'Mode system initialization', pattern: /Multi-Mode System|Mode Manager initialized/ }
];

console.log('📦 Checking bundle contents:\n');

let allPassed = true;
checks.forEach((check, i) => {
    const found = check.pattern.test(extensionCode);
    const status = found ? '✅' : '❌';
    console.log(`${status} ${i + 1}. ${check.name}`);
    if (!found) allPassed = false;
});

console.log('');

if (allPassed) {
    console.log('🎉 All components found in bundle!');
    console.log('');
    console.log('Bundle Stats:');
    const stats = fs.statSync(extensionPath);
    console.log(`  Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Components: ${checks.length} verified`);
    console.log('');
    console.log('🚀 Multi-Mode System is properly bundled and ready!');
    process.exit(0);
} else {
    console.error('❌ Some components missing from bundle');
    process.exit(1);
}

