import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E testing
 * Tests VS Code extension functionality end-to-end
 */
export default defineConfig({
  testDir: './tests/e2e',

  // Maximum time one test can run
  timeout: 60 * 1000,

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'test-results/html' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list']
  ],

  use: {
    // Base URL for the tests
    baseURL: 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Take screenshot on failure
    screenshot: 'only-on-failure',

    // Record video on failure
    video: 'retain-on-failure',

    // Maximum time each action can take
    actionTimeout: 10 * 1000,
  },

  // Configure projects for major browsers and VS Code scenarios
  projects: [
    {
      name: 'vscode-stable',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'vscode-insiders',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  // Run local dev server before starting the tests
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev:webview',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
