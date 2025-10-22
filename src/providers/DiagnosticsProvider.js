const vscode = require('vscode');
const axios = require('axios');

class OropendolaDiagnosticsProvider {
    constructor(serverUrl) {
        this.serverUrl = serverUrl;
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('oropendola-ai');
        this.analysisCache = new Map();
        this.cacheTTL = 60000; // 1 minute
    }

    async analyzeDiagnostics(document) {
        const cacheKey = document.uri.toString();
        const cached = this.analysisCache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
            this.diagnosticCollection.set(document.uri, cached.diagnostics);
            return;
        }

        try {
            const response = await axios.post(
                `${this.serverUrl}/api/method/ai_assistant.api.endpoints.analyze_code`,
                {
                    file_path: document.uri.fsPath,
                    content: document.getText(),
                    language: document.languageId
                },
                { timeout: 10000 }
            );

            const diagnostics = [];
            
            if (response.data?.message?.issues && Array.isArray(response.data.message.issues)) {
                for (const issue of response.data.message.issues) {
                    const line = Math.max(0, (issue.line || 1) - 1);
                    const range = new vscode.Range(line, 0, line, 999);
                    
                    const severity = this.mapSeverity(issue.severity);
                    const diagnostic = new vscode.Diagnostic(
                        range,
                        issue.message || 'Code issue detected',
                        severity
                    );
                    
                    diagnostic.source = 'Oropendola AI';
                    diagnostic.code = issue.code;
                    
                    if (issue.suggestions && issue.suggestions.length > 0) {
                        diagnostic.relatedInformation = issue.suggestions.map((suggestion) => 
                            new vscode.DiagnosticRelatedInformation(
                                new vscode.Location(document.uri, range),
                                suggestion
                            )
                        );
                    }
                    
                    diagnostics.push(diagnostic);
                }
            }

            this.diagnosticCollection.set(document.uri, diagnostics);
            this.analysisCache.set(cacheKey, { diagnostics, timestamp: Date.now() });
        } catch (error) {
            console.error('Diagnostics analysis failed:', error);
        }
    }

    mapSeverity(severity) {
        switch (severity?.toLowerCase()) {
            case 'error':
                return vscode.DiagnosticSeverity.Error;
            case 'warning':
                return vscode.DiagnosticSeverity.Warning;
            case 'info':
                return vscode.DiagnosticSeverity.Information;
            case 'hint':
                return vscode.DiagnosticSeverity.Hint;
            default:
                return vscode.DiagnosticSeverity.Warning;
        }
    }

    clear(document) {
        this.diagnosticCollection.delete(document.uri);
        this.analysisCache.delete(document.uri.toString());
    }

    dispose() {
        this.diagnosticCollection.dispose();
        this.analysisCache.clear();
    }
}

module.exports = { OropendolaDiagnosticsProvider };
