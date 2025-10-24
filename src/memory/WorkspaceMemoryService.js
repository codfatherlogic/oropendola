// v3.4.3: Workspace Memory Service
// Stores workspace-specific preferences, entity tracking, and report history
const fs = require('fs').promises;
const path = require('path');

class WorkspaceMemoryService {
    constructor(workspacePath) {
        this.workspacePath = workspacePath;
        this.memoryFile = path.join(workspacePath, '.vscode', 'oropendola-memory.json');
        this.memory = null;
        this.loaded = false;
    }

    async load() {
        if (this.loaded && this.memory) {
            return this.memory;
        }

        try {
            const data = await fs.readFile(this.memoryFile, 'utf8');
            this.memory = JSON.parse(data);
            this.loaded = true;
            console.log('✅ Workspace memory loaded');
        } catch (error) {
            // Initialize default memory structure
            console.log('📝 Initializing new workspace memory');
            this.memory = {
                version: '1.0',
                created: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                workspace: {
                    preferredApp: null,
                    preferredModule: null,
                    frameworkDefaults: {},
                    customPatterns: []
                },
                reports: [],
                entities: {
                    lastCreated: [],
                    frequent: {}
                },
                preferences: {
                    defaultMode: 'agent',
                    autoApprove: false
                },
                statistics: {
                    totalTasks: 0,
                    totalFiles: 0,
                    lastTaskDate: null
                }
            };
            this.loaded = true;
        }
        return this.memory;
    }

    async save() {
        try {
            const vscodeDir = path.join(this.workspacePath, '.vscode');
            await fs.mkdir(vscodeDir, { recursive: true });

            this.memory.lastUpdated = new Date().toISOString();

            await fs.writeFile(
                this.memoryFile,
                JSON.stringify(this.memory, null, 2),
                'utf8'
            );
            console.log('💾 Workspace memory saved');
        } catch (error) {
            console.error('❌ Failed to save workspace memory:', error);
            throw error;
        }
    }

    // ============================================
    // Preferred App/Module Management (Frappe)
    // ============================================

    async getPreferredApp() {
        await this.load();
        return this.memory.workspace.preferredApp;
    }

    async setPreferredApp(appName) {
        await this.load();
        this.memory.workspace.preferredApp = appName;
        await this.save();
        console.log(`✅ Preferred app set to: ${appName}`);
    }

    async getPreferredModule() {
        await this.load();
        return this.memory.workspace.preferredModule;
    }

    async setPreferredModule(moduleName) {
        await this.load();
        this.memory.workspace.preferredModule = moduleName;
        await this.save();
        console.log(`✅ Preferred module set to: ${moduleName}`);
    }

    // ============================================
    // Framework Defaults
    // ============================================

    async getFrameworkDefaults(framework) {
        await this.load();
        return this.memory.workspace.frameworkDefaults[framework] || {};
    }

    async setFrameworkDefaults(framework, defaults) {
        await this.load();
        this.memory.workspace.frameworkDefaults[framework] = {
            ...this.memory.workspace.frameworkDefaults[framework],
            ...defaults
        };
        await this.save();
        console.log(`✅ Framework defaults updated for: ${framework}`);
    }

    // ============================================
    // Task Reports Storage
    // ============================================

    async saveReport(report) {
        await this.load();

        const reportSummary = {
            id: report.taskId || `task-${Date.now()}`,
            timestamp: report.timestamp?.completed || new Date().toISOString(),
            framework: report.framework?.name || null,
            confidence: report.framework?.confidence || 0,
            summary: this._generateReportSummary(report),
            filesChanged: report.fileChanges?.length || 0,
            commandsRun: report.commands?.length || 0,
            todosCompleted: report.todos?.filter(t => t.status === 'completed').length || 0,
            riskLevel: report.riskLevel || 'unknown',
            filepath: report.filepath || null
        };

        this.memory.reports.unshift(reportSummary);

        // Keep last 20 reports
        if (this.memory.reports.length > 20) {
            this.memory.reports = this.memory.reports.slice(0, 20);
        }

        // Update statistics
        this.memory.statistics.totalTasks++;
        this.memory.statistics.totalFiles += reportSummary.filesChanged;
        this.memory.statistics.lastTaskDate = reportSummary.timestamp;

        await this.save();
        console.log(`📊 Report saved: ${reportSummary.id}`);
    }

    _generateReportSummary(report) {
        const filesCreated = report.fileChanges?.filter(c => c.action === 'create').length || 0;
        const filesModified = report.fileChanges?.filter(c => c.action === 'modify').length || 0;
        const todosCompleted = report.todos?.filter(t => t.status === 'completed').length || 0;
        const totalTodos = report.todos?.length || 0;

        return `${filesCreated} files created, ${filesModified} modified, ${todosCompleted}/${totalTodos} todos completed`;
    }

    async getLastReports(count = 10) {
        await this.load();
        return this.memory.reports.slice(0, count);
    }

    async getReportById(id) {
        await this.load();
        return this.memory.reports.find(r => r.id === id);
    }

    async getReportsByFramework(framework, count = 10) {
        await this.load();
        return this.memory.reports
            .filter(r => r.framework?.toLowerCase() === framework.toLowerCase())
            .slice(0, count);
    }

    // ============================================
    // Entity Tracking
    // ============================================

    async trackEntity(entityType, entityName, metadata = {}) {
        await this.load();

        // Add to last created
        this.memory.entities.lastCreated.unshift({
            type: entityType,
            name: entityName,
            timestamp: new Date().toISOString(),
            metadata
        });

        // Keep last 50
        if (this.memory.entities.lastCreated.length > 50) {
            this.memory.entities.lastCreated = this.memory.entities.lastCreated.slice(0, 50);
        }

        // Track frequency
        const key = `${entityType}:${entityName}`;
        this.memory.entities.frequent[key] = (this.memory.entities.frequent[key] || 0) + 1;

        await this.save();
        console.log(`🔖 Entity tracked: ${entityType}/${entityName}`);
    }

    async getLastEntity(entityType) {
        await this.load();
        const entity = this.memory.entities.lastCreated.find(e => e.type === entityType);
        return entity ? entity.name : null;
    }

    async getLastEntities(entityType, count = 10) {
        await this.load();
        return this.memory.entities.lastCreated
            .filter(e => e.type === entityType)
            .slice(0, count);
    }

    async getFrequentEntities(entityType, count = 5) {
        await this.load();
        const filtered = Object.entries(this.memory.entities.frequent)
            .filter(([key]) => key.startsWith(`${entityType}:`))
            .sort((a, b) => b[1] - a[1])
            .slice(0, count)
            .map(([key, freq]) => ({
                name: key.split(':')[1],
                frequency: freq,
                type: entityType
            }));
        return filtered;
    }

    // ============================================
    // Preferences
    // ============================================

    async getPreference(key, defaultValue = null) {
        await this.load();
        return this.memory.preferences[key] !== undefined
            ? this.memory.preferences[key]
            : defaultValue;
    }

    async setPreference(key, value) {
        await this.load();
        this.memory.preferences[key] = value;
        await this.save();
    }

    // ============================================
    // Statistics
    // ============================================

    async getStatistics() {
        await this.load();
        return { ...this.memory.statistics };
    }

    // ============================================
    // Memory Management
    // ============================================

    async clear() {
        this.memory = null;
        this.loaded = false;
        try {
            await fs.unlink(this.memoryFile);
            console.log('🗑️  Workspace memory cleared');
        } catch (error) {
            // File doesn't exist, that's fine
            console.log('ℹ️  No workspace memory to clear');
        }
    }

    async export() {
        await this.load();
        return JSON.parse(JSON.stringify(this.memory));
    }

    async import(memoryData) {
        this.memory = memoryData;
        this.loaded = true;
        await this.save();
        console.log('📥 Workspace memory imported');
    }

    // ============================================
    // Utility Methods
    // ============================================

    async exists() {
        try {
            await fs.access(this.memoryFile);
            return true;
        } catch {
            return false;
        }
    }

    async getMemorySize() {
        try {
            const stats = await fs.stat(this.memoryFile);
            return stats.size;
        } catch {
            return 0;
        }
    }

    getMemoryFilePath() {
        return this.memoryFile;
    }
}

module.exports = WorkspaceMemoryService;
