// Generate and save the HTML to test in browser
const fs = require('fs');

// Mock VS Code API
const mockWebview = {
    asWebviewUri: (uri) => 'https://file%2B.vscode-resource.vscode-cdn.net' + uri.path,
    cspSource: 'https://*.vscode-cdn.net'
};

// Read and execute just the _getChatHtml method
const providerCode = fs.readFileSync('./src/sidebar/sidebar-provider.js', 'utf8');

// Extract the _getChatHtml method body
const methodMatch = providerCode.match(/_getChatHtml\(webview\) \{([\s\S]*?)^\s{4}\}/m);

if (!methodMatch) {
    console.error('Could not find _getChatHtml method');
    process.exit(1);
}

// Create a function to execute the method
const getFn = new Function('webview', 'vscode', methodMatch[1] + '\nreturn html;');

try {
    const html = getFn(mockWebview, {});
    fs.writeFileSync('./test-generated.html', html);
    console.log('✅ HTML generated successfully!');
    console.log('📄 Saved to test-generated.html');
    console.log('📊 Size:', html.length, 'characters');
    
    // Try to validate JavaScript
    const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
    if (scriptMatch) {
        const jsCode = scriptMatch[1];
        try {
            new Function(jsCode);
            console.log('✅ JavaScript syntax is VALID!');
        } catch (e) {
            console.error('❌ JavaScript syntax error:', e.message);
            console.error('Error at:', e.stack);
        }
    }
} catch (e) {
    console.error('❌ Error generating HTML:', e.message);
    console.error(e.stack);
}
