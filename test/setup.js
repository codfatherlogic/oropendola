/**
 * Vitest setup file
 * Mocks VS Code API for testing
 */

import { vi } from 'vitest';

// Mock VS Code API
global.vscode = {
    workspace: {
        getConfiguration: vi.fn(() => ({
            get: vi.fn((key, defaultValue) => {
                // Return test defaults
                const testConfig = {
                    'allowedCommands': ['git log', 'git diff', 'ls'],
                    'deniedCommands': ['rm -rf', 'sudo'],
                    'commandExecutionTimeout': 120,
                    'commandRequireConfirmation': true,
                    'maxReconnectAttempts': 10,
                    'reconnectInterval': 1000,
                    'serverUrl': 'https://oropendola.ai'
                };
                return testConfig[key] !== undefined ? testConfig[key] : defaultValue;
            }),
            update: vi.fn()
        })),
        onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() }))
    },
    window: {
        showWarningMessage: vi.fn(),
        showInformationMessage: vi.fn(),
        showErrorMessage: vi.fn(),
        withProgress: vi.fn((options, task) => {
            // Execute the task with a mock progress reporter
            return task({ report: vi.fn() });
        })
    },
    ProgressLocation: {
        Notification: 15,
        SourceControl: 1,
        Window: 10
    },
    ConfigurationTarget: {
        Global: 1,
        Workspace: 2,
        WorkspaceFolder: 3
    }
};

// Make vscode available globally
global.require = module => {
    if (module === 'vscode') {
        return global.vscode;
    }
    // Fallback to actual require for other modules
    return require(module);
};

console.log('[Test Setup] VS Code API mocked');
