import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        // Test environment
        environment: 'node',

        // Global test timeout
        testTimeout: 10000,

        // Coverage configuration
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/**',
                'dist/**',
                'out/**',
                'webview-ui/**',
                '**/*.config.js',
                '**/*.config.ts',
                'test/**',
                '**/__tests__/**'
            ],
            include: ['src/**/*.js', 'src/**/*.ts'],
            all: true,
            lines: 30,
            functions: 30,
            branches: 30,
            statements: 30
        },

        // Test file patterns
        include: ['src/**/__tests__/**/*.{test,spec}.{js,ts}', 'src/**/*.{test,spec}.{js,ts}'],
        exclude: ['node_modules', 'dist', 'out', 'webview-ui'],

        // Mock VS Code API
        globals: true,
        setupFiles: ['./test/setup.js']
    },

    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            'vscode': path.resolve(__dirname, './test/vscode-mock.js')
        }
    }
});
