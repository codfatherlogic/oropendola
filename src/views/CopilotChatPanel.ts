import * as vscode from 'vscode';
import * as path from 'path';
import { TaskManager } from '../core/TaskManager';
import { fileSearchService } from '../services/FileSearchService';
import { mentionParser, mentionExtractor } from '../core/mentions';

export class CopilotChatPanel {
    public static currentPanel: CopilotChatPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private serverUrl: string;
    private taskManager?: TaskManager;

    public static createOrShow(extensionUri: vscode.Uri, serverUrl: string, taskManager?: TaskManager) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (CopilotChatPanel.currentPanel) {
            CopilotChatPanel.currentPanel._panel.reveal(column);
            if (taskManager) {
                CopilotChatPanel.currentPanel.taskManager = taskManager;
            }
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

        CopilotChatPanel.currentPanel = new CopilotChatPanel(panel, extensionUri, serverUrl, taskManager);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, serverUrl: string, taskManager?: TaskManager) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this.serverUrl = serverUrl;
        this.taskManager = taskManager;

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
                    case 'getTaskCost':
                        this.handleGetTaskCost(message.taskId);
                        break;
                    case 'getCostSummary':
                        this.handleGetCostSummary();
                        break;
                    case 'condenseContext':
                        this.handleCondenseContext(message.taskId);
                        break;
                    case 'getContextStatus':
                        this.handleGetContextStatus(message.taskId);
                        break;
                    // @mentions system handlers
                    case 'searchFiles':
                        this.handleSearchFiles(message.query, message.maxResults);
                        break;
                    case 'extractMentions':
                        this.handleExtractMentions(message.text);
                        break;
                    case 'validateMention':
                        this.handleValidateMention(message.mention);
                        break;
                }
            },
            null,
            this._disposables
        );
    }

    private async handleChatMessage(userMessage: string) {
        const axios = require('axios');
        
        try {
            // Show loading indicator
            this._panel.webview.postMessage({
                command: 'showLoading'
            });

            // Extract @mention contexts from user message
            const mentions = mentionParser.parseMentions(userMessage);
            const mentionContexts = await mentionExtractor.extractContext(mentions);

            // Send context extraction indicator to webview
            if (mentionContexts.length > 0) {
                this._panel.webview.postMessage({
                    type: 'mentionContexts',
                    mentions,
                    contexts: mentionContexts
                });
            }

            // Get current editor context
            const editor = vscode.window.activeTextEditor;
            const editorContext = editor ? {
                fileName: path.basename(editor.document.fileName),
                language: editor.document.languageId,
                selection: editor.document.getText(editor.selection)
            } : {};

            // Combine editor context with mention contexts
            const context = {
                ...editorContext,
                mentions: mentionContexts.map(mc => ({
                    type: mc.type,
                    content: mc.content,
                    metadata: mc.metadata
                }))
            };

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

    private insertCodeAtCursor(code: string) {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            editor.edit(editBuilder => {
                editBuilder.insert(editor.selection.active, code);
            });
        }
    }

    private handleGetTaskCost(taskId: string) {
        if (!this.taskManager) {
            this._panel.webview.postMessage({
                command: 'taskCost',
                error: 'TaskManager not available'
            });
            return;
        }

        const cost = this.taskManager.getTaskCost(taskId);
        this._panel.webview.postMessage({
            command: 'taskCost',
            taskId,
            cost
        });
    }

    private handleGetCostSummary() {
        if (!this.taskManager) {
            this._panel.webview.postMessage({
                command: 'costSummary',
                error: 'TaskManager not available'
            });
            return;
        }

        const summary = this.taskManager.getCostSummary();
        this._panel.webview.postMessage({
            command: 'costSummary',
            summary
        });
    }

    private async handleCondenseContext(taskId: string) {
        if (!this.taskManager) {
            this._panel.webview.postMessage({
                command: 'condenseResult',
                error: 'TaskManager not available'
            });
            return;
        }

        try {
            const result = await this.taskManager.manualCondense(taskId);
            this._panel.webview.postMessage({
                command: 'condenseResult',
                taskId,
                result
            });
        } catch (error) {
            this._panel.webview.postMessage({
                command: 'condenseResult',
                error: error instanceof Error ? error.message : 'Failed to condense context'
            });
        }
    }

    private async handleGetContextStatus(taskId: string) {
        if (!this.taskManager) {
            this._panel.webview.postMessage({
                command: 'contextStatus',
                error: 'TaskManager not available'
            });
            return;
        }

        try {
            const status = await this.taskManager.getContextStatus(taskId);
            this._panel.webview.postMessage({
                command: 'contextStatus',
                taskId,
                status
            });
        } catch (error) {
            this._panel.webview.postMessage({
                command: 'contextStatus',
                error: error instanceof Error ? error.message : 'Failed to get context status'
            });
        }
    }

    /**
     * Handle file search request from webview
     * Used for @mention autocomplete
     */
    private async handleSearchFiles(query: string, maxResults: number = 50) {
        try {
            const results = await fileSearchService.fuzzySearchFiles(query, maxResults);
            this._panel.webview.postMessage({
                type: 'fileSearchResults',
                query, // Include query for caching
                results
            });
        } catch (error) {
            console.error('File search failed:', error);
            this._panel.webview.postMessage({
                type: 'fileSearchResults',
                query,
                results: [],
                error: error instanceof Error ? error.message : 'File search failed'
            });
        }
    }

    /**
     * Extract mention contexts from text
     * Returns parsed mentions with their extracted content
     */
    private async handleExtractMentions(text: string) {
        try {
            const mentions = mentionParser.parseMentions(text);
            const contexts = await mentionExtractor.extractContext(mentions);

            this._panel.webview.postMessage({
                type: 'mentionContexts',
                mentions,
                contexts
            });
        } catch (error) {
            console.error('Mention extraction failed:', error);
            this._panel.webview.postMessage({
                type: 'mentionContexts',
                mentions: [],
                contexts: [],
                error: error instanceof Error ? error.message : 'Mention extraction failed'
            });
        }
    }

    /**
     * Validate a mention (check if file/folder exists)
     */
    private async handleValidateMention(mention: string) {
        try {
            const fs = require('fs').promises;
            const workspaceFolders = vscode.workspace.workspaceFolders;

            if (!workspaceFolders || workspaceFolders.length === 0) {
                this._panel.webview.postMessage({
                    type: 'mentionValidation',
                    mention,
                    valid: false,
                    error: 'No workspace folder open'
                });
                return;
            }

            // Remove @ symbol and unescape spaces
            const cleanPath = mention.replace(/^@/, '').replace(/\\ /g, ' ');
            const workspaceRoot = workspaceFolders[0].uri.fsPath;
            const absolutePath = path.isAbsolute(cleanPath)
                ? cleanPath
                : path.join(workspaceRoot, cleanPath);

            // Check if path exists
            try {
                await fs.access(absolutePath);
                this._panel.webview.postMessage({
                    type: 'mentionValidation',
                    mention,
                    valid: true,
                    path: absolutePath
                });
            } catch {
                this._panel.webview.postMessage({
                    type: 'mentionValidation',
                    mention,
                    valid: false,
                    error: 'File or folder not found'
                });
            }
        } catch (error) {
            this._panel.webview.postMessage({
                type: 'mentionValidation',
                mention,
                valid: false,
                error: error instanceof Error ? error.message : 'Validation failed'
            });
        }
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
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

    public dispose() {
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
