import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';
import { minimatch } from 'minimatch';

interface FileMetadata {
    path: string;
    language: string;
    size: number;
    lastModified: number;
    symbols?: Symbol[];
}

interface Symbol {
    name: string;
    kind: string;
    line: number;
    endLine: number;
}

export class WorkspaceIndexer {
    private indexedFiles: Map<string, FileMetadata> = new Map();
    private fileWatcher?: vscode.FileSystemWatcher;
    private indexingInProgress: boolean = false;
    private serverUrl: string;

    constructor(serverUrl: string) {
        this.serverUrl = serverUrl;
    }

    async indexWorkspace(workspaceFolder: vscode.WorkspaceFolder): Promise<void> {
        if (this.indexingInProgress) return;
        this.indexingInProgress = true;

        try {
            await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Indexing workspace for AI context...', cancellable: true }, async (progress, token) => {
                const files = await this.findAllFiles(workspaceFolder.uri.fsPath);
                const total = files.length;

                for (let i = 0; i < files.length; i++) {
                    if (token.isCancellationRequested) break;
                    const file = files[i];
                    progress.report({ message: `${i + 1}/${total} files`, increment: (100 / total) });
                    await this.indexFile(file);
                }
            });

            await this.uploadIndexToBackend(workspaceFolder.uri.fsPath);
            vscode.window.showInformationMessage(`✅ Indexed ${this.indexedFiles.size} files`);
        } finally {
            this.indexingInProgress = false;
        }
    }

    private async findAllFiles(workspacePath: string): Promise<string[]> {
        const files: string[] = [];
        const includePatterns = ['**/*.py','**/*.js','**/*.ts','**/*.jsx','**/*.tsx','**/*.java','**/*.go','**/*.rs'];
        const excludePatterns = ['**/node_modules/**','**/.git/**','**/__pycache__/**','**/dist/**','**/build/**','**/.venv/**','**/venv/**'];

        const scanDirectory = (dir: string) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                const relativePath = path.relative(workspacePath, fullPath);
                if (excludePatterns.some(pattern => minimatch(relativePath, pattern))) continue;
                if (entry.isDirectory()) { scanDirectory(fullPath); }
                else if (entry.isFile()) {
                    if (includePatterns.some(pattern => minimatch(relativePath, pattern))) files.push(fullPath);
                }
            }
        };

        scanDirectory(workspacePath);
        return files;
    }

    private async indexFile(filePath: string): Promise<void> {
        try {
            const stats = fs.statSync(filePath);
            const language = this.detectLanguage(filePath);
            if (stats.size > 1024 * 1024) return;
            const content = fs.readFileSync(filePath, 'utf-8');
            const symbols = await this.extractSymbols(content, language);
            this.indexedFiles.set(filePath, { path: filePath, language, size: stats.size, lastModified: stats.mtimeMs, symbols });
        } catch (error) {
            console.error(`Failed to index ${filePath}:`, error);
        }
    }

    private async extractSymbols(content: string, language: string): Promise<Symbol[]> {
        const symbols: Symbol[] = [];
        if (language === 'python') {
            const functionRegex = /def\s+(\w+)\s*\(/g;
            const classRegex = /class\s+(\w+)/g;
            let match;
            while ((match = functionRegex.exec(content)) !== null) {
                const line = content.substring(0, match.index).split('\n').length;
                symbols.push({ name: match[1], kind: 'function', line, endLine: line });
            }
            while ((match = classRegex.exec(content)) !== null) {
                const line = content.substring(0, match.index).split('\n').length;
                symbols.push({ name: match[1], kind: 'class', line, endLine: line });
            }
        }
        return symbols;
    }

    private async uploadIndexToBackend(workspacePath: string): Promise<void> {
        try {
            const indexData = Array.from(this.indexedFiles.values()).map(file => ({ path: path.relative(workspacePath, file.path), language: file.language, symbols: file.symbols || [] }));
            await axios.post(`${this.serverUrl}/api/method/ai_assistant.api.endpoints.index_codebase`, { workspace_path: workspacePath, files: indexData, force_rebuild: false }, { timeout: 60000 });
        } catch (error) {
            console.error('Failed to upload index to backend:', error);
        }
    }

    async getRelevantContext(query: string, activeFile?: string): Promise<FileMetadata[]> {
        const keywords = query.toLowerCase().split(/\s+/);
        const scored: Array<{ file: FileMetadata; score: number }> = [];
        for (const file of this.indexedFiles.values()) {
            let score = 0;
            if (activeFile && file.path === activeFile) score += 100;
            const fileName = path.basename(file.path).toLowerCase();
            for (const keyword of keywords) { if (fileName.includes(keyword)) score += 10; }
            for (const symbol of file.symbols || []) {
                for (const keyword of keywords) { if (symbol.name.toLowerCase().includes(keyword)) score += 5; }
            }
            if (score > 0) scored.push({ file, score });
        }
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, 5).map(item => item.file);
    }

    setupFileWatcher(workspaceFolder: vscode.WorkspaceFolder): void {
        this.fileWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(workspaceFolder, '**/*.{py,js,ts,jsx,tsx}'));
        this.fileWatcher.onDidCreate(uri => this.indexFile(uri.fsPath));
        this.fileWatcher.onDidChange(uri => this.indexFile(uri.fsPath));
        this.fileWatcher.onDidDelete(uri => this.indexedFiles.delete(uri.fsPath));
    }

    private detectLanguage(filePath: string): string {
        const ext = path.extname(filePath);
        const langMap: Record<string, string> = { '.py': 'python', '.js': 'javascript', '.ts': 'typescript', '.jsx': 'javascript', '.tsx': 'typescript', '.java': 'java', '.go': 'go', '.rs': 'rust' };
        return langMap[ext] || 'unknown';
    }

    dispose(): void { this.fileWatcher?.dispose(); }
}
