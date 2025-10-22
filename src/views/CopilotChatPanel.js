const vscode = require('vscode');
const path = require('path');
const axios = require('axios');

class CopilotChatPanel {
    static currentPanel = undefined;

    static createOrShow(extensionUri, serverUrl) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (CopilotChatPanel.currentPanel) {
            CopilotChatPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'oropendolaChat',
            '🤖 Oropendola AI Chat',
            column || vscode.ViewColumn.Two,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media'),
                    vscode.Uri.joinPath(extensionUri, 'out')
                ],
                retainContextWhenHidden: true
            }
        );

        CopilotChatPanel.currentPanel = new CopilotChatPanel(panel, extensionUri, serverUrl);
    }

    constructor(panel, extensionUri, serverUrl) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this.serverUrl = serverUrl;
        this._disposables = [];

        this._update();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'sendMessage':
                        this.handleChatMessage(message.text);
                        break;
                    case 'insertCode':
                        this.insertCodeAtCursor(message.code);
                        break;
                    case 'copyCode':
                        vscode.env.clipboard.writeText(message.code);
                        vscode.window.showInformationMessage('Code copied to clipboard');
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    async handleChatMessage(userMessage) {
        try {
            // Show loading indicator
            this._panel.webview.postMessage({
                command: 'showLoading'
            });

            // Get current editor context
            const editor = vscode.window.activeTextEditor;
            const context = editor ? {
                fileName: path.basename(editor.document.fileName),
                language: editor.document.languageId,
                selection: editor.document.getText(editor.selection)
            } : {};

            const response = await axios.post(
                `${this.serverUrl}/api/method/ai_assistant.api.endpoints.chat`,
                {
                    message: userMessage,
                    context
                },
                { timeout: 30000 }
            );

            // Send response back to webview
            this._panel.webview.postMessage({
                command: 'addMessage',
                message: {
                    role: 'assistant',
                    content: response.data?.message?.response || 'No response received',
                    timestamp: Date.now()
                }
            });
        } catch (error) {
            this._panel.webview.postMessage({
                command: 'addMessage',
                message: {
                    role: 'error',
                    content: 'Failed to get response from AI',
                    timestamp: Date.now()
                }
            });
        }
    }

    insertCodeAtCursor(code) {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            editor.edit(editBuilder => {
                editBuilder.insert(editor.selection.active, code);
            });
        }
    }

    _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    _getHtmlForWebview(webview) {
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'chat.css')
        );
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'chat.js')
        );

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline';">
    <link href="${styleUri}" rel="stylesheet">
    <title>Oropendola AI Chat</title>
</head>
<body>
    <div id="chat-container">
        <div id="messages"></div>
        <div id="input-container">
            <textarea id="message-input" placeholder="Ask AI anything..." rows="3"></textarea>
            <button id="send-button">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M15.854 7.646l-14-7a.5.5 0 0 0-.708.708l3.147 3.146L1.146 7.646a.5.5 0 0 0 0 .708l3.147 3.146-3.147 3.146a.5.5 0 0 0 .708.708l14-7a.5.5 0 0 0 0-.708z"/>
                </svg>
            </button>
        </div>
    </div>
    <script src="${scriptUri}"></script>
</body>
</html>`;
    }

    dispose() {
        CopilotChatPanel.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}

module.exports = { CopilotChatPanel };
