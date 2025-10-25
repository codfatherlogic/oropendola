/**
 * VS Code API mock for testing
 */

import { vi } from 'vitest';

export const workspace = {
    getConfiguration: vi.fn(() => ({
        get: vi.fn((key, defaultValue) => {
            const testConfig = {
                'allowedCommands': ['git log', 'git diff', 'ls'],
                'deniedCommands': ['rm -rf', 'sudo'],
                'commandExecutionTimeout': 120,
                'commandRequireConfirmation': true,
                'maxReconnectAttempts': 10,
                'reconnectInterval': 1000,
                'serverUrl': 'https://oropendola.ai',
                'authToken': 'test-token'
            };
            return testConfig[key] !== undefined ? testConfig[key] : defaultValue;
        }),
        update: vi.fn()
    })),
    onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
    openTextDocument: vi.fn(),
    workspaceFolders: []
};

export const window = {
    showWarningMessage: vi.fn(),
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    withProgress: vi.fn((options, task) => {
        return task({ report: vi.fn() });
    }),
    showOpenDialog: vi.fn(),
    showTextDocument: vi.fn()
};

export const ProgressLocation = {
    Notification: 15,
    SourceControl: 1,
    Window: 10
};

export const ConfigurationTarget = {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3
};

export const Uri = {
    file: (path) => ({ fsPath: path, path }),
    parse: (path) => ({ fsPath: path, path })
};

export const commands = {
    executeCommand: vi.fn()
};

// Default export for require() style imports
export default {
    workspace,
    window,
    ProgressLocation,
    ConfigurationTarget,
    Uri,
    commands
};
