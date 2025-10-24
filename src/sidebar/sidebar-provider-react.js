// This file shows the NEW _getChatHtml method for React
// Copy this to replace the old _getChatHtml method in sidebar-provider.js (lines 3268-3782)

/**
 * Generate HTML for React-based webview
 * Loads the built React app from webview-ui/dist
 */
_getChatHtml(webview) {
    console.log('🔧 Loading React webview...');

    // Get URIs for React build files
    const scriptUri = webview.asWebviewUri(
        vscode.Uri.joinPath(this._context.extensionUri, 'webview-ui', 'dist', 'assets', 'index.js')
    );
    const styleUri = webview.asWebviewUri(
        vscode.Uri.joinPath(this._context.extensionUri, 'webview-ui', 'dist', 'assets', 'index.css')
    );

    const cspSource = webview.cspSource;
    console.log('🔒 CSP Source:', cspSource);
    console.log('📦 Script URI:', scriptUri.toString());
    console.log('🎨 Style URI:', styleUri.toString());

    // Simple HTML that loads the React app
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="
        default-src 'none';
        style-src ${cspSource} 'unsafe-inline';
        script-src ${cspSource} 'unsafe-inline';
        img-src ${cspSource} data: https:;
        font-src ${cspSource};
        connect-src ${cspSource};
    ">
    <title>Oropendola AI Assistant</title>
    <link rel="stylesheet" href="${styleUri}">
</head>
<body>
    <div id="root"></div>
    <script type="module" src="${scriptUri}"></script>
</body>
</html>`;

    console.log('📄 React HTML loaded');
    return html;
}
