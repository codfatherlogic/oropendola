const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const minimatch = require('minimatch');

class WorkspaceIndexer {
    constructor(serverUrl) {
        this.indexedFiles = new Map();
        this.fileWatcher = undefined;
        this.indexingInProgress = false;
        this.serverUrl = serverUrl;
    }

    async indexWorkspace(workspaceFolder) {
        if (this.indexingInProgress) {return;}
        this.indexingInProgress = true;
        try {
            await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Indexing workspace for AI context...', cancellable: true }, async (progress, token) => {
                const files = await this.findAllFiles(workspaceFolder.uri.fsPath);
                const total = files.length;
                for (let i = 0; i < files.length; i++) {
                    if (token.isCancellationRequested) {break;}
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

    async findAllFiles(workspacePath) {
        const files = [];
        const includePatterns = ['**/*.py','**/*.js','**/*.ts','**/*.jsx','**/*.tsx','**/*.java','**/*.go','**/*.rs'];
        const excludePatterns = ['**/node_modules/**','**/.git/**','**/__pycache__/**','**/dist/**','**/build/**','**/.venv/**','**/venv/**'];
        const scanDirectory = dir => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                const relativePath = path.relative(workspacePath, fullPath);
                if (excludePatterns.some(pattern => minimatch(relativePath, pattern))) {continue;}
                if (entry.isDirectory()) {scanDirectory(fullPath);} else if (entry.isFile()) {
                    if (includePatterns.some(pattern => minimatch(relativePath, pattern))) {files.push(fullPath);}
                }
            }
        };
        scanDirectory(workspacePath);
        return files;
    }

    async indexFile(filePath) {
        try {
            const stats = fs.statSync(filePath);
            const language = this.detectLanguage(filePath);
            if (stats.size > 1024 * 1024) {return;}
            const content = fs.readFileSync(filePath, 'utf-8');
            const symbols = await this.extractSymbols(content, language);
            this.indexedFiles.set(filePath, { path: filePath, language, size: stats.size, lastModified: stats.mtimeMs, symbols });
        } catch (error) { console.error(`Failed to index ${filePath}:`, error); }
    }

    async extractSymbols(content, language) {
        const symbols = [];

        if (language === 'python') {
            // Functions (including async, decorators)
            const functionRegex = /(?:@\w+\s+)*(?:async\s+)?def\s+(\w+)\s*\([^)]*\)/g;
            const classRegex = /class\s+(\w+)(?:\([^)]*\))?:/g;
            const importRegex = /(?:from\s+[\w.]+\s+)?import\s+([\w, ]+)/g;

            let match;
            while ((match = functionRegex.exec(content)) !== null) {
                const line = content.substring(0, match.index).split('\n').length;
                symbols.push({ name: match[1], kind: 'function', line, endLine: line });
            }
            while ((match = classRegex.exec(content)) !== null) {
                const line = content.substring(0, match.index).split('\n').length;
                symbols.push({ name: match[1], kind: 'class', line, endLine: line });
            }
            while ((match = importRegex.exec(content)) !== null) {
                const imports = match[1].split(',').map(s => s.trim());
                imports.forEach(imp => {
                    const line = content.substring(0, match.index).split('\n').length;
                    symbols.push({ name: imp, kind: 'import', line, endLine: line });
                });
            }
        } else if (language === 'javascript' || language === 'typescript') {
            // Functions, classes, exports for JS/TS
            const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g;
            const arrowFuncRegex = /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g;
            const classRegex = /(?:export\s+)?class\s+(\w+)/g;
            const importRegex = /import\s+(?:{([^}]+)}|(\w+))\s+from/g;
            const constRegex = /(?:export\s+)?const\s+(\w+)\s*=/g;

            let match;
            while ((match = functionRegex.exec(content)) !== null) {
                const line = content.substring(0, match.index).split('\n').length;
                symbols.push({ name: match[1], kind: 'function', line, endLine: line });
            }
            while ((match = arrowFuncRegex.exec(content)) !== null) {
                const line = content.substring(0, match.index).split('\n').length;
                symbols.push({ name: match[1], kind: 'function', line, endLine: line });
            }
            while ((match = classRegex.exec(content)) !== null) {
                const line = content.substring(0, match.index).split('\n').length;
                symbols.push({ name: match[1], kind: 'class', line, endLine: line });
            }
            while ((match = importRegex.exec(content)) !== null) {
                const imports = (match[1] || match[2] || '').split(',').map(s => s.trim()).filter(Boolean);
                imports.forEach(imp => {
                    const line = content.substring(0, match.index).split('\n').length;
                    symbols.push({ name: imp, kind: 'import', line, endLine: line });
                });
            }
            while ((match = constRegex.exec(content)) !== null) {
                const line = content.substring(0, match.index).split('\n').length;
                symbols.push({ name: match[1], kind: 'constant', line, endLine: line });
            }
        } else if (language === 'java') {
            // Java classes, methods, interfaces
            const classRegex = /(?:public|private|protected)?\s*class\s+(\w+)/g;
            const methodRegex = /(?:public|private|protected|static)?\s+\w+\s+(\w+)\s*\([^)]*\)\s*{/g;
            const interfaceRegex = /interface\s+(\w+)/g;

            let match;
            while ((match = classRegex.exec(content)) !== null) {
                const line = content.substring(0, match.index).split('\n').length;
                symbols.push({ name: match[1], kind: 'class', line, endLine: line });
            }
            while ((match = methodRegex.exec(content)) !== null) {
                const line = content.substring(0, match.index).split('\n').length;
                symbols.push({ name: match[1], kind: 'method', line, endLine: line });
            }
            while ((match = interfaceRegex.exec(content)) !== null) {
                const line = content.substring(0, match.index).split('\n').length;
                symbols.push({ name: match[1], kind: 'interface', line, endLine: line });
            }
        } else if (language === 'go') {
            // Go functions, structs, interfaces
            const funcRegex = /func\s+(?:\([^)]*\)\s*)?(\w+)\s*\(/g;
            const structRegex = /type\s+(\w+)\s+struct/g;
            const interfaceRegex = /type\s+(\w+)\s+interface/g;

            let match;
            while ((match = funcRegex.exec(content)) !== null) {
                const line = content.substring(0, match.index).split('\n').length;
                symbols.push({ name: match[1], kind: 'function', line, endLine: line });
            }
            while ((match = structRegex.exec(content)) !== null) {
                const line = content.substring(0, match.index).split('\n').length;
                symbols.push({ name: match[1], kind: 'struct', line, endLine: line });
            }
            while ((match = interfaceRegex.exec(content)) !== null) {
                const line = content.substring(0, match.index).split('\n').length;
                symbols.push({ name: match[1], kind: 'interface', line, endLine: line });
            }
        } else if (language === 'rust') {
            // Rust functions, structs, enums, traits
            const funcRegex = /(?:pub\s+)?fn\s+(\w+)/g;
            const structRegex = /(?:pub\s+)?struct\s+(\w+)/g;
            const enumRegex = /(?:pub\s+)?enum\s+(\w+)/g;
            const traitRegex = /(?:pub\s+)?trait\s+(\w+)/g;

            let match;
            while ((match = funcRegex.exec(content)) !== null) {
                const line = content.substring(0, match.index).split('\n').length;
                symbols.push({ name: match[1], kind: 'function', line, endLine: line });
            }
            while ((match = structRegex.exec(content)) !== null) {
                const line = content.substring(0, match.index).split('\n').length;
                symbols.push({ name: match[1], kind: 'struct', line, endLine: line });
            }
            while ((match = enumRegex.exec(content)) !== null) {
                const line = content.substring(0, match.index).split('\n').length;
                symbols.push({ name: match[1], kind: 'enum', line, endLine: line });
            }
            while ((match = traitRegex.exec(content)) !== null) {
                const line = content.substring(0, match.index).split('\n').length;
                symbols.push({ name: match[1], kind: 'trait', line, endLine: line });
            }
        }

        return symbols;
    }

    async uploadIndexToBackend(workspacePath) {
        try {
            const indexData = Array.from(this.indexedFiles.values()).map(file => ({ path: path.relative(workspacePath, file.path), language: file.language, symbols: file.symbols || [] }));
            await axios.post(`${this.serverUrl}/api/method/ai_assistant.api.endpoints.index_codebase`, { workspace_path: workspacePath, files: indexData, force_rebuild: false }, { timeout: 60000 });
        } catch (error) { console.error('Failed to upload index to backend:', error); }
    }

    async getRelevantContext(query, activeFile) {
        const keywords = query.toLowerCase().split(/\s+/);
        const scored = [];
        for (const file of this.indexedFiles.values()) {
            let score = 0;
            if (activeFile && file.path === activeFile) {score += 100;}
            const fileName = path.basename(file.path).toLowerCase();
            for (const keyword of keywords) { if (fileName.includes(keyword)) {score += 10;} }
            for (const symbol of file.symbols || []) { for (const keyword of keywords) { if (symbol.name.toLowerCase().includes(keyword)) {score += 5;} } }
            if (score > 0) {scored.push({ file, score });}
        }
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, 5).map(item => item.file);
    }

    /**
     * Find files related to the given file path
     * Based on imports, shared symbols, and directory proximity
     */
    async findRelatedFiles(filePath) {
        const relatedFiles = [];
        const activeFileData = this.indexedFiles.get(filePath);

        if (!activeFileData) {
            return relatedFiles;
        }

        const activeSymbols = activeFileData.symbols || [];
        const activeImports = activeSymbols.filter(s => s.kind === 'import').map(s => s.name);
        const activeDir = path.dirname(filePath);
        const activeBasename = path.basename(filePath, path.extname(filePath));

        for (const [candidatePath, candidateData] of this.indexedFiles.entries()) {
            if (candidatePath === filePath) {continue;} // Skip self

            let score = 0;
            const candidateSymbols = candidateData.symbols || [];
            const candidateDir = path.dirname(candidatePath);
            const candidateBasename = path.basename(candidatePath, path.extname(candidatePath));

            // Same directory = high relevance
            if (candidateDir === activeDir) {
                score += 30;
            }

            // Parent or child directory
            if (candidateDir.startsWith(activeDir) || activeDir.startsWith(candidateDir)) {
                score += 15;
            }

            // Same or similar filename (e.g., index.js + index.test.js)
            if (candidateBasename.includes(activeBasename) || activeBasename.includes(candidateBasename)) {
                score += 20;
            }

            // Check if active file imports from candidate
            const candidateExports = candidateSymbols.filter(s =>
                s.kind === 'class' || s.kind === 'function' || s.kind === 'constant'
            ).map(s => s.name);

            for (const imp of activeImports) {
                if (candidateExports.includes(imp)) {
                    score += 50; // Strong connection: active imports from candidate
                }
            }

            // Check if candidate imports from active
            const candidateImports = candidateSymbols.filter(s => s.kind === 'import').map(s => s.name);
            const activeExports = activeSymbols.filter(s =>
                s.kind === 'class' || s.kind === 'function' || s.kind === 'constant'
            ).map(s => s.name);

            for (const imp of candidateImports) {
                if (activeExports.includes(imp)) {
                    score += 40; // Candidate imports from active
                }
            }

            // Shared symbol names (might indicate related functionality)
            const sharedSymbols = activeSymbols.filter(a =>
                candidateSymbols.some(c => c.name === a.name && c.kind === a.kind)
            );
            score += sharedSymbols.length * 10;

            // Test files are related to source files
            if (
                (filePath.includes('.test.') || filePath.includes('.spec.')) !==
                (candidatePath.includes('.test.') || candidatePath.includes('.spec.'))
            ) {
                const testFile = filePath.includes('.test.') || filePath.includes('.spec.') ? activeBasename : candidateBasename;
                const sourceFile = filePath.includes('.test.') || filePath.includes('.spec.') ? candidateBasename : activeBasename;
                if (testFile.replace(/\.(test|spec)/, '') === sourceFile) {
                    score += 60; // Test-source pair
                }
            }

            if (score > 0) {
                relatedFiles.push({
                    path: candidatePath,
                    score,
                    type: this._getRelationType(score),
                    language: candidateData.language,
                    symbolCount: candidateSymbols.length
                });
            }
        }

        // Sort by score descending
        relatedFiles.sort((a, b) => b.score - a.score);

        return relatedFiles;
    }

    /**
     * Determine relation type based on score
     */
    _getRelationType(score) {
        if (score >= 50) {return 'strong';}
        if (score >= 20) {return 'moderate';}
        return 'weak';
    }

    setupFileWatcher(workspaceFolder) {
        this.fileWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(workspaceFolder, '**/*.{py,js,ts,jsx,tsx}'));
        this.fileWatcher.onDidCreate(uri => this.indexFile(uri.fsPath));
        this.fileWatcher.onDidChange(uri => this.indexFile(uri.fsPath));
        this.fileWatcher.onDidDelete(uri => this.indexedFiles.delete(uri.fsPath));
    }

    detectLanguage(filePath) {
        const ext = path.extname(filePath);
        const langMap = { '.py': 'python', '.js': 'javascript', '.ts': 'typescript', '.jsx': 'javascript', '.tsx': 'typescript', '.java': 'java', '.go': 'go', '.rs': 'rust' };
        return langMap[ext] || 'unknown';
    }

    dispose() { if (this.fileWatcher) {this.fileWatcher.dispose();} }
}

module.exports = { WorkspaceIndexer };
