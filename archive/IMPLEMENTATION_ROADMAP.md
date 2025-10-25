# Implementation Roadmap - Oropendola AI Assistant
**Version:** v3.4.2 → v3.5.0
**Goal:** Complete remaining 9% to reach 100% feature parity with frontend checklist

---

## 🎯 IMMEDIATE PRIORITIES (Complete 91% → 95%)

### Priority 1: Workspace Memory Service
**Est. Time:** 2-3 hours
**Impact:** Medium
**Version:** v3.4.3

#### Implementation Steps:

1. **Create WorkspaceMemoryService.js**
```javascript
// src/memory/WorkspaceMemoryService.js
const fs = require('fs').promises;
const path = require('path');

class WorkspaceMemoryService {
    constructor(workspacePath) {
        this.workspacePath = workspacePath;
        this.memoryFile = path.join(workspacePath, '.vscode', 'oropendola-memory.json');
        this.memory = null;
    }

    async load() {
        try {
            const data = await fs.readFile(this.memoryFile, 'utf8');
            this.memory = JSON.parse(data);
        } catch (error) {
            // Initialize default memory
            this.memory = {
                version: '1.0',
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
                }
            };
        }
        return this.memory;
    }

    async save() {
        const vscodeDir = path.join(this.workspacePath, '.vscode');
        await fs.mkdir(vscodeDir, { recursive: true });
        await fs.writeFile(
            this.memoryFile,
            JSON.stringify(this.memory, null, 2),
            'utf8'
        );
    }

    // Preferred App/Module
    async getPreferredApp() {
        await this.load();
        return this.memory.workspace.preferredApp;
    }

    async setPreferredApp(appName) {
        await this.load();
        this.memory.workspace.preferredApp = appName;
        this.memory.lastUpdated = new Date().toISOString();
        await this.save();
    }

    async getPreferredModule() {
        await this.load();
        return this.memory.workspace.preferredModule;
    }

    async setPreferredModule(moduleName) {
        await this.load();
        this.memory.workspace.preferredModule = moduleName;
        this.memory.lastUpdated = new Date().toISOString();
        await this.save();
    }

    // Framework Defaults
    async getFrameworkDefaults(framework) {
        await this.load();
        return this.memory.workspace.frameworkDefaults[framework] || {};
    }

    async setFrameworkDefaults(framework, defaults) {
        await this.load();
        this.memory.workspace.frameworkDefaults[framework] = defaults;
        this.memory.lastUpdated = new Date().toISOString();
        await this.save();
    }

    // Reports Storage
    async saveReport(report) {
        await this.load();
        this.memory.reports.unshift({
            id: report.taskId,
            timestamp: report.timestamp.completed,
            framework: report.framework?.name,
            summary: report.overview,
            filepath: report.filepath // Path where .md was saved
        });

        // Keep last 20 reports
        if (this.memory.reports.length > 20) {
            this.memory.reports = this.memory.reports.slice(0, 20);
        }

        await this.save();
    }

    async getLastReports(count = 10) {
        await this.load();
        return this.memory.reports.slice(0, count);
    }

    // Entity Tracking
    async trackEntity(entityType, entityName) {
        await this.load();

        // Add to last created
        this.memory.entities.lastCreated.unshift({
            type: entityType,
            name: entityName,
            timestamp: new Date().toISOString()
        });

        // Keep last 50
        if (this.memory.entities.lastCreated.length > 50) {
            this.memory.entities.lastCreated = this.memory.entities.lastCreated.slice(0, 50);
        }

        // Track frequency
        const key = `${entityType}:${entityName}`;
        this.memory.entities.frequent[key] = (this.memory.entities.frequent[key] || 0) + 1;

        await this.save();
    }

    async getLastEntity(entityType) {
        await this.load();
        const entity = this.memory.entities.lastCreated.find(e => e.type === entityType);
        return entity ? entity.name : null;
    }

    async getFrequentEntities(entityType, count = 5) {
        await this.load();
        const filtered = Object.entries(this.memory.entities.frequent)
            .filter(([key]) => key.startsWith(`${entityType}:`))
            .sort((a, b) => b[1] - a[1])
            .slice(0, count)
            .map(([key, freq]) => ({
                name: key.split(':')[1],
                frequency: freq
            }));
        return filtered;
    }

    // Clear Memory
    async clear() {
        this.memory = null;
        try {
            await fs.unlink(this.memoryFile);
        } catch (error) {
            // File doesn't exist, that's fine
        }
    }

    // Export Memory
    async export() {
        await this.load();
        return { ...this.memory };
    }
}

module.exports = WorkspaceMemoryService;
```

2. **Integrate into ConversationTask.js**
```javascript
// In ConversationTask.js constructor
const WorkspaceMemoryService = require('../memory/WorkspaceMemoryService');
this.workspaceMemory = new WorkspaceMemoryService(workspacePath);

// When detecting framework
const preferredApp = await this.workspaceMemory.getPreferredApp();
if (!preferredApp && detectedFramework === 'frappe') {
    // Prompt user to set preferred app
}

// When creating entities
await this.workspaceMemory.trackEntity('doctype', doctypeName);
```

3. **Add Commands to package.json**
```json
{
  "command": "oropendola.setPreferredApp",
  "title": "Set Preferred Frappe App",
  "category": "Oropendola"
},
{
  "command": "oropendola.clearWorkspaceMemory",
  "title": "Clear Workspace Memory",
  "category": "Oropendola"
},
{
  "command": "oropendola.showWorkspaceMemory",
  "title": "Show Workspace Memory",
  "category": "Oropendola"
}
```

4. **Implement Command Handlers in extension.js**

**Testing:**
- Create workspace memory file
- Set preferred app
- Verify persistence across sessions
- Test entity tracking
- Test report storage

---

### Priority 2: Automatic Task Report Generation
**Est. Time:** 1-2 hours
**Impact:** Medium
**Version:** v3.4.3

#### Implementation Steps:

1. **Add Tracking to ConversationTask.js**
```javascript
// In ConversationTask constructor
this.executedCommands = [];
this.memoryReferences = [];

// In _executeSingleTool method (terminal commands)
case 'run_terminal':
    const command = toolCall.command;
    this.executedCommands.push({
        command,
        timestamp: new Date().toISOString(),
        status: 'pending'
    });
    const result = await this._executeTerminalCommand(toolCall);
    // Update status
    const lastCmd = this.executedCommands[this.executedCommands.length - 1];
    lastCmd.status = result.success ? 'success' : 'failed';
    return result;

// Track memory references when using workspace memory
async _useMemoryReference(reference) {
    this.memoryReferences.push({
        type: reference.type,
        value: reference.value,
        timestamp: new Date().toISOString()
    });
}
```

2. **Add Task Completion with Report Generation**
```javascript
// In ConversationTask.js
const TaskSummaryGenerator = require('../utils/task-summary-generator');

async completeTask(status = 'completed') {
    const endTime = Date.now();

    try {
        // Generate comprehensive task report
        const report = TaskSummaryGenerator.generate({
            taskId: this.taskId || `task-${Date.now()}`,
            taskDescription: this.initialPrompt || 'No description',
            framework: this.detectedFramework ? {
                name: this.detectedFramework,
                confidence: this.frameworkConfidence || 0
            } : null,
            commands: this.executedCommands || [],
            messages: this.messages || [],
            memoryRefs: this.memoryReferences || [],
            riskLevel: this._calculateRiskLevel(),
            fileChanges: this.fileChanges || [],
            todos: this.todos || [],
            toolResults: this.toolResults || [],
            errors: this.errors || [],
            mode: this.mode || 'agent',
            startTime: this.startTime || endTime,
            endTime
        });

        // Generate markdown
        const markdown = TaskSummaryGenerator.generateMarkdown(report, {
            includeTimestamp: true,
            includeContext: true
        });

        // Save report to .vscode/
        const filepath = TaskSummaryGenerator.saveReport(
            markdown,
            'md',
            this.workspacePath
        );

        console.log(`✅ Task report saved: ${filepath}`);

        // Save to workspace memory
        if (this.workspaceMemory) {
            report.filepath = filepath;
            await this.workspaceMemory.saveReport(report);
        }

        // Also save JSON version for programmatic access
        const jsonFilepath = filepath.replace('.md', '.json');
        const json = TaskSummaryGenerator.generateJSON(report);
        TaskSummaryGenerator.saveReport(json, 'json', this.workspacePath);

        return {
            status,
            report,
            filepath,
            jsonFilepath
        };
    } catch (error) {
        console.error('❌ Failed to generate task report:', error);
        return { status, error: error.message };
    }
}

_calculateRiskLevel() {
    const riskFactors = [];

    // Check file changes for security-sensitive patterns
    const sensitivePatterns = [
        'package.json',
        'package-lock.json',
        '.env',
        '*.key',
        '*.pem',
        'Dockerfile',
        'docker-compose.yml'
    ];

    const hasSecurityFiles = this.fileChanges.some(change => {
        return sensitivePatterns.some(pattern => {
            return change.path.includes(pattern.replace('*', ''));
        });
    });

    if (hasSecurityFiles) riskFactors.push('security-sensitive-files');

    // Check for errors
    if (this.errors.length > 0) riskFactors.push('errors-encountered');

    // Check command executions
    const dangerousCommands = ['rm -rf', 'sudo', 'chmod 777', 'git push --force'];
    const hasDangerousCmd = this.executedCommands.some(cmd => {
        return dangerousCommands.some(danger => cmd.command.includes(danger));
    });

    if (hasDangerousCmd) riskFactors.push('dangerous-commands');

    // Calculate risk level
    if (riskFactors.length === 0) return 'low';
    if (riskFactors.length <= 2) return 'medium';
    return 'high';
}
```

3. **Call completeTask Appropriately**
```javascript
// In sidebar message handler
case 'stopTask':
    if (this.currentTask) {
        await this.currentTask.stop();
        await this.currentTask.completeTask('stopped');
        this.currentTask = null;
    }
    break;

// After task finishes naturally
async _handleTaskCompletion(task) {
    const result = await task.completeTask('completed');

    // Notify user
    this._postMessage({
        type: 'taskCompleted',
        report: result.report,
        filepath: result.filepath
    });
}
```

4. **Add Report Viewer Command**
```javascript
// In extension.js
vscode.commands.registerCommand('oropendola.viewLastReport', async () => {
    const workspaceMemory = new WorkspaceMemoryService(workspaceFolders[0].uri.fsPath);
    const reports = await workspaceMemory.getLastReports(1);

    if (reports.length === 0) {
        vscode.window.showInformationMessage('No task reports found');
        return;
    }

    const report = reports[0];
    const doc = await vscode.workspace.openTextDocument(report.filepath);
    await vscode.window.showTextDocument(doc, { preview: false });
});
```

**Testing:**
- Run task that creates files
- Verify report auto-generated in .vscode/
- Check report contains all sections (framework, commands, chat, conclusion)
- Test JSON export
- Test risk level calculation

---

### Priority 3: Status Bar Indicators
**Est. Time:** 1 hour
**Impact:** Low (UX improvement)
**Version:** v3.4.3

#### Implementation Steps:

1. **Create StatusBarManager.js**
```javascript
// src/ui/StatusBarManager.js
const vscode = require('vscode');

class StatusBarManager {
    constructor() {
        // Framework indicator
        this.frameworkItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
        this.frameworkItem.command = 'oropendola.showFrameworkInfo';

        // Mode indicator
        this.modeItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            99
        );
        this.modeItem.command = 'oropendola.toggleMode';

        // Connection status
        this.connectionItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            98
        );
        this.connectionItem.command = 'oropendola.testBackend';
    }

    updateFramework(framework, confidence) {
        if (!framework) {
            this.frameworkItem.text = "$(question) No Framework";
            this.frameworkItem.tooltip = "Click to detect framework";
            this.frameworkItem.backgroundColor = undefined;
        } else {
            const icon = this._getFrameworkIcon(framework);
            const percent = Math.round(confidence * 100);
            this.frameworkItem.text = `${icon} ${framework} ${percent}%`;
            this.frameworkItem.tooltip = `Detected: ${framework} (${percent}% confidence)\\nClick for details`;

            // Color code by confidence
            if (confidence >= 0.8) {
                this.frameworkItem.backgroundColor = undefined; // Green (default)
            } else if (confidence >= 0.5) {
                this.frameworkItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            } else {
                this.frameworkItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
            }
        }
        this.frameworkItem.show();
    }

    updateMode(mode) {
        const modeIcons = {
            'chat': '$(comment-discussion)',
            'agent': '$(robot)',
            'code': '$(code)'
        };
        const icon = modeIcons[mode] || '$(question)';
        this.modeItem.text = `${icon} ${mode.toUpperCase()}`;
        this.modeItem.tooltip = `Current mode: ${mode}\\nClick to change`;
        this.modeItem.show();
    }

    updateConnection(connected) {
        if (connected) {
            this.connectionItem.text = "$(check) Connected";
            this.connectionItem.tooltip = "Backend connected";
            this.connectionItem.backgroundColor = undefined;
        } else {
            this.connectionItem.text = "$(x) Disconnected";
            this.connectionItem.tooltip = "Backend disconnected\\nClick to test connection";
            this.connectionItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        }
        this.connectionItem.show();
    }

    _getFrameworkIcon(framework) {
        const icons = {
            'frappe': '$(database)',
            'django': '$(symbol-method)',
            'react': '$(symbol-class)',
            'nextjs': '$(rocket)',
            'flask': '$(beaker)',
            'express': '$(server)'
        };
        return icons[framework.toLowerCase()] || '$(code)';
    }

    hide() {
        this.frameworkItem.hide();
        this.modeItem.hide();
        this.connectionItem.hide();
    }

    dispose() {
        this.frameworkItem.dispose();
        this.modeItem.dispose();
        this.connectionItem.dispose();
    }
}

module.exports = StatusBarManager;
```

2. **Integrate into extension.js**
```javascript
// In activate()
const StatusBarManager = require('./src/ui/StatusBarManager');
context.subscriptions.push(statusBarManager = new StatusBarManager());

// Update when framework detected
frameworkDetector.on('detected', (framework, confidence) => {
    statusBarManager.updateFramework(framework, confidence);
});

// Update mode from config
const mode = vscode.workspace.getConfiguration('oropendola').get('chat.mode');
statusBarManager.updateMode(mode);

// Update connection status
realtimeManager.on('connected', () => {
    statusBarManager.updateConnection(true);
});
realtimeManager.on('disconnected', () => {
    statusBarManager.updateConnection(false);
});
```

3. **Add Commands**
```javascript
// Show framework info command
vscode.commands.registerCommand('oropendola.showFrameworkInfo', async () => {
    // Show QuickPick with framework details
});

// Toggle mode command
vscode.commands.registerCommand('oropendola.toggleMode', async () => {
    const modes = ['chat', 'agent', 'code'];
    const currentMode = vscode.workspace.getConfiguration('oropendola').get('chat.mode');
    const nextMode = modes[(modes.indexOf(currentMode) + 1) % modes.length];

    await vscode.workspace.getConfiguration('oropendola').update(
        'chat.mode',
        nextMode,
        vscode.ConfigurationTarget.Workspace
    );

    statusBarManager.updateMode(nextMode);
    vscode.window.showInformationMessage(`Mode changed to: ${nextMode}`);
});
```

**Testing:**
- Verify status bar items appear
- Click framework item to show details
- Click mode item to toggle
- Click connection item to test backend

---

## 🚀 FUTURE ENHANCEMENTS (95% → 100%)

### Priority 4: Git Automation
**Est. Time:** 4-6 hours
**Impact:** Medium
**Version:** v3.5.0

**Implementation:**
- Create src/git/GitAutomation.js
- Auto-branch creation based on task description
- AI-generated commit messages
- Integration with approval workflow
- Pre-commit hooks support

---

### Priority 5: Memory Management UI
**Est. Time:** 2-3 hours
**Impact:** Low
**Version:** v3.5.0

**Implementation:**
- WebView panel for memory viewer
- Visual representation of frequent entities
- Clear memory button
- Export/import memory

---

### Priority 6: Risk Visual Indicators
**Est. Time:** 2-3 hours
**Impact:** Low
**Version:** v3.5.0

**Implementation:**
- Color-coded message badges in chat
- File risk indicators in diff view
- Security warning icons
- Risk summary in task reports

---

### Priority 7: Rollback UI
**Est. Time:** 4-6 hours
**Impact:** Medium
**Version:** v3.5.0

**Implementation:**
- Task history viewer WebView
- File-level rollback from reports
- Git-based rollback (requires Git Automation)
- "Undo Last AI Change" command

---

## 📋 VERSION RELEASE PLAN

### v3.4.3 (Immediate - Complete 91% → 95%)
**Target Date:** 1 week
**Focus:** Core functionality completion

- ✅ WorkspaceMemoryService implementation
- ✅ Automatic task report generation
- ✅ Status bar indicators
- ✅ Commands for memory management
- ✅ Report viewer integration

**Breaking Changes:** None
**Migration:** Automatic

---

### v3.5.0 (Future - Complete 95% → 100%)
**Target Date:** 2-4 weeks
**Focus:** UX enhancements and advanced features

- Git automation
- Memory management UI
- Risk visual indicators
- Rollback UI
- Advanced task history

**Breaking Changes:** None
**Migration:** Automatic

---

## 🧪 TESTING STRATEGY

### Unit Tests Needed:
- [ ] WorkspaceMemoryService methods
- [ ] TaskSummaryGenerator integration
- [ ] Risk level calculation
- [ ] Status bar updates

### Integration Tests Needed:
- [ ] End-to-end task with report generation
- [ ] Memory persistence across sessions
- [ ] Status bar synchronization
- [ ] Command execution tracking

### Manual Testing Checklist:
- [ ] Create Frappe DocType → verify memory tracks app
- [ ] Complete task → verify report auto-generated
- [ ] Check status bar shows framework
- [ ] Toggle mode via status bar
- [ ] Clear workspace memory
- [ ] View last report command
- [ ] Multi-file changes with risk calculation

---

## 📊 SUCCESS METRICS

### v3.4.3 Success Criteria:
- ✅ Workspace memory persists across sessions
- ✅ Reports auto-generated after every task
- ✅ Status bar shows accurate framework + mode
- ✅ Commands work: set preferred app, clear memory, view reports
- ✅ No regressions in existing features
- ✅ Extension completion: **95%**

### v3.5.0 Success Criteria:
- ✅ Git automation working (branch + commit)
- ✅ Memory UI allows easy management
- ✅ Risk indicators visible in UI
- ✅ Rollback functionality tested
- ✅ Extension completion: **100%**

---

## 🔄 MAINTENANCE

### Regular Tasks:
- Weekly: Review and update framework detection rules
- Monthly: Analyze task reports for common patterns
- Quarterly: User feedback review and prioritization

### Performance Monitoring:
- Track report generation time
- Monitor memory file size growth
- Status bar update latency
- WebSocket connection stability

---

## 📚 DOCUMENTATION UPDATES NEEDED

### For v3.4.3:
- [ ] Update README with memory features
- [ ] Document workspace memory file format
- [ ] Add task report examples
- [ ] Status bar usage guide

### For v3.5.0:
- [ ] Git automation guide
- [ ] Memory UI screenshots
- [ ] Risk level explanation
- [ ] Rollback procedures

---

## 🎯 PRIORITY EXECUTION ORDER

1. **This Week:** WorkspaceMemoryService + Auto Reports + Status Bar (v3.4.3)
2. **Next 2-4 Weeks:** Git Automation + Memory UI (v3.5.0 prep)
3. **Month 2:** Risk UI + Rollback UI (v3.5.0 release)
4. **Ongoing:** Bug fixes, performance, user feedback

---

**Last Updated:** 2025-10-24
**Next Review:** After v3.4.3 release
