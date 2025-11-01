import { test, expect } from '@playwright/test';

/**
 * E2E tests for Help Center
 * Tests the searchable help and documentation system
 */

test.describe('Help Center', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Open help center (assuming there's a help button)
    await page.click('[data-testid="help-button"]', { timeout: 10000 });
    await page.waitForSelector('.help-center-container');
  });

  test('should display help center with categories', async ({ page }) => {
    const helpCenter = page.locator('.help-center-container');
    await expect(helpCenter).toBeVisible();

    // Should show 5 categories
    const categories = page.locator('.category-card');
    await expect(categories).toHaveCount(5);
  });

  test('should display all category names', async ({ page }) => {
    await expect(page.locator('.category-name:has-text("Getting Started")')).toBeVisible();
    await expect(page.locator('.category-name:has-text("Features")')).toBeVisible();
    await expect(page.locator('.category-name:has-text("Settings")')).toBeVisible();
    await expect(page.locator('.category-name:has-text("Advanced")')).toBeVisible();
    await expect(page.locator('.category-name:has-text("Troubleshooting")')).toBeVisible();
  });

  test('should open category and show articles', async ({ page }) => {
    // Click on Getting Started category
    await page.click('.category-card:has-text("Getting Started")');

    // Should show articles list
    const articlesList = page.locator('.articles-list');
    await expect(articlesList).toBeVisible();

    // Should have at least 2 articles
    const articles = page.locator('.article-item');
    await expect(articles).toHaveCount(2);
  });

  test('should display article content', async ({ page }) => {
    // Navigate to article
    await page.click('.category-card:has-text("Getting Started")');
    await page.click('.article-item:has-text("Quick Start Guide")');

    // Should show article content
    const articleContent = page.locator('.article-content');
    await expect(articleContent).toBeVisible();

    // Should have title
    const articleTitle = page.locator('.article-header h2');
    await expect(articleTitle).toContainText('Quick Start Guide');
  });

  test('should navigate back from article to category', async ({ page }) => {
    // Navigate to article
    await page.click('.category-card:has-text("Getting Started")');
    await page.click('.article-item:has-text("Quick Start Guide")');

    // Click back button
    await page.click('button:has-text("Back")');

    // Should show articles list again
    const articlesList = page.locator('.articles-list');
    await expect(articlesList).toBeVisible();
  });

  test('should search for articles', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('API key');

    // Should show search results
    await page.waitForSelector('.search-results');
    const searchResults = page.locator('.search-result-item');

    // Should have at least 1 result
    await expect(searchResults.first()).toBeVisible();
  });

  test('should highlight search terms in results', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('settings');

    // Should show highlighted text
    const highlights = page.locator('.search-highlight');
    await expect(highlights.first()).toBeVisible();
  });

  test('should show no results message for non-existent query', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('xyznonexistentquery123');

    // Should show no results message
    const noResults = page.locator('.no-results');
    await expect(noResults).toBeVisible();
    await expect(noResults).toContainText('No articles found');
  });

  test('should clear search results', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('API');

    // Wait for results
    await page.waitForSelector('.search-results');

    // Clear search
    await searchInput.clear();

    // Should show categories again
    const categories = page.locator('.category-card');
    await expect(categories.first()).toBeVisible();
  });

  test('should close help center', async ({ page }) => {
    const closeButton = page.locator('[data-testid="close-help-center"]');
    await closeButton.click();

    // Help center should not be visible
    await expect(page.locator('.help-center-container')).not.toBeVisible();
  });

  test('should be keyboard navigable', async ({ page }) => {
    // Tab through categories
    await page.keyboard.press('Tab');

    // First category should be focused
    const firstCategory = page.locator('.category-card').first();
    await expect(firstCategory).toBeFocused();

    // Enter to open category
    await page.keyboard.press('Enter');

    // Should show articles
    const articlesList = page.locator('.articles-list');
    await expect(articlesList).toBeVisible();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    // Search input should have label
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toHaveAttribute('aria-label');

    // Categories should have roles
    const categories = page.locator('.category-card');
    await expect(categories.first()).toHaveAttribute('role', 'button');
  });
});
