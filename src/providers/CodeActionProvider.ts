import * as vscode from 'vscode';
import axios from 'axios';

export class OropendolaCodeActionProvider implements vscode.CodeActionProvider {
    private serverUrl: string;

    constructor(serverUrl: string) {
        this.serverUrl = serverUrl;
    }

    async provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.CodeAction[] | undefined> {
        const actions: vscode.CodeAction[] = [];

        // Quick fix for diagnostics
        for (const diagnostic of context.diagnostics) {
            if (diagnostic.source === 'Oropendola AI') {
                const fixAction = new vscode.CodeAction(
                    `🤖 AI: Fix ${diagnostic.message}`,
                    vscode.CodeActionKind.QuickFix
                );
                fixAction.diagnostics = [diagnostic];
                fixAction.command = {
                    title: 'Apply AI Fix',
                    command: 'oropendola.applyAIFix',
                    arguments: [document, diagnostic]
                };
                actions.push(fixAction);
            }
        }

        // Refactor actions
        if (!range.isEmpty) {
            const refactorAction = new vscode.CodeAction(
                '🤖 AI: Refactor selection',
                vscode.CodeActionKind.Refactor
            );
            refactorAction.command = {
                title: 'Refactor with AI',
                command: 'oropendola.refactorCode',
                arguments: [document, range]
            };
            actions.push(refactorAction);

            const explainAction = new vscode.CodeAction(
                '🤖 AI: Explain code',
                vscode.CodeActionKind.Empty
            );
            explainAction.command = {
                title: 'Explain code',
                command: 'oropendola.explainCode',
                arguments: [document, range]
            };
            actions.push(explainAction);

            const optimizeAction = new vscode.CodeAction(
                '🤖 AI: Optimize code',
                vscode.CodeActionKind.RefactorRewrite
            );
            optimizeAction.command = {
                title: 'Optimize with AI',
                command: 'oropendola.optimizeCode',
                arguments: [document, range]
            };
            actions.push(optimizeAction);
        }

        // Add documentation
        const addDocsAction = new vscode.CodeAction(
            '🤖 AI: Generate documentation',
            vscode.CodeActionKind.Source
        );
        addDocsAction.command = {
            title: 'Generate docs',
            command: 'oropendola.generateDocs',
            arguments: [document, range]
        };
        actions.push(addDocsAction);

        return actions;
    }

    async applyAIFix(document: vscode.TextDocument, diagnostic: vscode.Diagnostic): Promise<void> {
        try {
            const code = document.getText(diagnostic.range);
            const response = await axios.post(
                `${this.serverUrl}/api/method/ai_assistant.api.endpoints.suggest_fix`,
                {
                    code,
                    issue: diagnostic.message,
                    language: document.languageId,
                    line: diagnostic.range.start.line
                },
                { timeout: 10000 }
            );

            if (response.data?.message?.fixed_code) {
                const edit = new vscode.WorkspaceEdit();
                edit.replace(document.uri, diagnostic.range, response.data.message.fixed_code);
                await vscode.workspace.applyEdit(edit);
                vscode.window.showInformationMessage('✅ AI fix applied');
            }
        } catch (error) {
            vscode.window.showErrorMessage('Failed to apply AI fix');
            console.error('Apply fix error:', error);
        }
    }

    async refactorCode(document: vscode.TextDocument, range: vscode.Range): Promise<void> {
        try {
            const code = document.getText(range);
            const response = await axios.post(
                `${this.serverUrl}/api/method/ai_assistant.api.endpoints.refactor_code`,
                {
                    code,
                    language: document.languageId,
                    refactor_type: 'improve'
                },
                { timeout: 15000 }
            );

            if (response.data?.message?.refactored_code) {
                const edit = new vscode.WorkspaceEdit();
                edit.replace(document.uri, range, response.data.message.refactored_code);
                await vscode.workspace.applyEdit(edit);
                vscode.window.showInformationMessage('✅ Code refactored');
            }
        } catch (error) {
            vscode.window.showErrorMessage('Failed to refactor code');
            console.error('Refactor error:', error);
        }
    }

    dispose() {
        // Cleanup if needed
    }
}
