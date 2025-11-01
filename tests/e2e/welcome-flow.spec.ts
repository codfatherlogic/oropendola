import { test, expect } from '@playwright/test';

/**
 * E2E tests for Welcome Flow
 * Tests the onboarding experience for new users
 */

test.describe('Welcome Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to extension webview
    await page.goto('/');

    // Wait for extension to load
    await page.waitForSelector('.welcome-overlay', { timeout: 10000 });
  });

  test('should display welcome overlay on first launch', async ({ page }) => {
    const welcomeOverlay = page.locator('.welcome-overlay');
    await expect(welcomeOverlay).toBeVisible();

    const title = page.locator('.step-title');
    await expect(title).toContainText('Welcome to Oropendola AI Assistant');
  });

  test('should navigate through all 8 onboarding steps', async ({ page }) => {
    // Step 1: Welcome
    await expect(page.locator('.step-title')).toContainText('Welcome');
    await page.click('button:has-text("Next")');

    // Step 2: AI Conversations
    await expect(page.locator('.step-title')).toContainText('AI Conversations');
    await page.click('button:has-text("Next")');

    // Step 3: AI Modes
    await expect(page.locator('.step-title')).toContainText('AI Modes');
    await page.click('button:has-text("Next")');

    // Step 4: Enhanced Tools
    await expect(page.locator('.step-title')).toContainText('Enhanced Tools');
    await page.click('button:has-text("Next")');

    // Step 5: Settings
    await expect(page.locator('.step-title')).toContainText('Settings');
    await page.click('button:has-text("Next")');

    // Step 6: Advanced Features
    await expect(page.locator('.step-title')).toContainText('Advanced Features');
    await page.click('button:has-text("Next")');

    // Step 7: Collaboration
    await expect(page.locator('.step-title')).toContainText('Collaboration');
    await page.click('button:has-text("Next")');

    // Step 8: Get Started
    await expect(page.locator('.step-title')).toContainText('Get Started');
    await page.click('button:has-text("Get Started")');

    // Welcome overlay should close
    await expect(page.locator('.welcome-overlay')).not.toBeVisible();
  });

  test('should allow skipping onboarding', async ({ page }) => {
    await page.click('button:has-text("Skip")');

    // Welcome overlay should close
    await expect(page.locator('.welcome-overlay')).not.toBeVisible();
  });

  test('should show progress dots for all steps', async ({ page }) => {
    const progressDots = page.locator('.progress-dot');
    await expect(progressDots).toHaveCount(8);

    // First dot should be active
    const firstDot = progressDots.first();
    await expect(firstDot).toHaveClass(/active/);
  });

  test('should update progress dot on navigation', async ({ page }) => {
    await page.click('button:has-text("Next")');

    // Second dot should now be active
    const secondDot = page.locator('.progress-dot').nth(1);
    await expect(secondDot).toHaveClass(/active/);
  });

  test('should display feature cards correctly', async ({ page }) => {
    // Navigate to features step
    await page.click('button:has-text("Next")');

    const featureCards = page.locator('.feature-card');
    await expect(featureCards).toHaveCount(6);
  });

  test('should display mode chips correctly', async ({ page }) => {
    // Navigate to AI Modes step
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Next")');

    const modeChips = page.locator('.mode-chip');
    await expect(modeChips).toHaveCount(8);
  });

  test('should not show welcome flow if already completed', async ({ page, context }) => {
    // Complete the onboarding
    for (let i = 0; i < 7; i++) {
      await page.click('button:has-text("Next")');
    }
    await page.click('button:has-text("Get Started")');

    // Reload page
    await page.reload();

    // Welcome overlay should not appear
    await expect(page.locator('.welcome-overlay')).not.toBeVisible({ timeout: 2000 });
  });

  test('should be keyboard accessible', async ({ page }) => {
    // Focus should be on the overlay
    await page.keyboard.press('Tab');

    // Next button should be focused
    const nextButton = page.locator('button:has-text("Next")');
    await expect(nextButton).toBeFocused();

    // Press Enter to advance
    await page.keyboard.press('Enter');

    // Should move to next step
    await expect(page.locator('.step-title')).toContainText('AI Conversations');
  });
});
