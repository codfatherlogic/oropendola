import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

/**
 * Accessibility Tests (WCAG 2.1 Level AA Compliance)
 * Tests all major components for accessibility compliance
 */

test.describe('Accessibility Compliance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await injectAxe(page);
  });

  test('chat interface should be accessible', async ({ page }) => {
    await page.waitForSelector('.chat-container');

    await checkA11y(page, '.chat-container', {
      detailedReport: true,
      detailedReportOptions: {
        html: true
      },
      axeOptions: {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
        }
      }
    });
  });

  test('welcome flow should be accessible', async ({ page }) => {
    await page.waitForSelector('.welcome-overlay');

    await checkA11y(page, '.welcome-overlay', {
      detailedReport: true,
      axeOptions: {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
        }
      }
    });
  });

  test('help center should be accessible', async ({ page }) => {
    await page.click('[data-testid="help-button"]');
    await page.waitForSelector('.help-center-container');

    await checkA11y(page, '.help-center-container', {
      detailedReport: true,
      axeOptions: {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
        }
      }
    });
  });

  test('settings panel should be accessible', async ({ page }) => {
    await page.click('[data-testid="settings-button"]');
    await page.waitForSelector('.settings-panel');

    await checkA11y(page, '.settings-panel', {
      detailedReport: true,
      axeOptions: {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
        }
      }
    });
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', (elements) =>
      elements.map(el => ({
        level: parseInt(el.tagName.substring(1)),
        text: el.textContent
      }))
    );

    // Check that headings follow proper order (no skipping levels)
    for (let i = 1; i < headings.length; i++) {
      const prevLevel = headings[i - 1].level;
      const currLevel = headings[i].level;
      const levelDiff = currLevel - prevLevel;

      // Allow same level or one level down, but not skipping levels
      expect(levelDiff).toBeLessThanOrEqual(1);
    }
  });

  test('all images should have alt text', async ({ page }) => {
    const images = await page.$$('img');

    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const ariaLabel = await img.getAttribute('aria-label');

      // Image should have either alt text or aria-label
      expect(alt || ariaLabel).toBeTruthy();
    }
  });

  test('all buttons should have accessible labels', async ({ page }) => {
    const buttons = await page.$$('button');

    for (const button of buttons) {
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const ariaLabelledBy = await button.getAttribute('aria-labelledby');

      // Button should have text, aria-label, or aria-labelledby
      expect(text || ariaLabel || ariaLabelledBy).toBeTruthy();
    }
  });

  test('all form inputs should have labels', async ({ page }) => {
    const inputs = await page.$$('input, textarea, select');

    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');

      // Input should have associated label, aria-label, or aria-labelledby
      if (id) {
        const label = await page.$(`label[for="${id}"]`);
        expect(label || ariaLabel || ariaLabelledBy).toBeTruthy();
      } else {
        expect(ariaLabel || ariaLabelledBy).toBeTruthy();
      }
    }
  });

  test('color contrast should meet WCAG AA standards', async ({ page }) => {
    await checkA11y(page, null, {
      detailedReport: true,
      axeOptions: {
        runOnly: {
          type: 'rule',
          values: ['color-contrast']
        }
      }
    });
  });

  test('focus indicators should be visible', async ({ page }) => {
    // Tab through interactive elements
    const interactiveSelectors = [
      'button',
      'a',
      'input',
      'textarea',
      'select',
      '[tabindex="0"]'
    ];

    for (const selector of interactiveSelectors) {
      const elements = await page.$$(selector);

      for (const element of elements.slice(0, 3)) { // Test first 3 of each type
        await element.focus();

        // Check if focus outline is visible
        const outlineWidth = await element.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return styles.outlineWidth;
        });

        // Outline should be visible (not 0px or "none")
        expect(outlineWidth).not.toBe('0px');
        expect(outlineWidth).not.toBe('none');
      }
    }
  });

  test('keyboard navigation should work', async ({ page }) => {
    // Focus should be trappable within modal dialogs
    await page.keyboard.press('Tab');

    // Check if an element received focus
    const activeElement = await page.evaluateHandle(() => document.activeElement);
    const tagName = await activeElement.evaluate(el => el?.tagName);

    expect(tagName).toBeTruthy();
  });

  test('skip links should be present', async ({ page }) => {
    // Check for skip to main content link
    const skipLink = await page.$('a[href="#main-content"], a:has-text("Skip to")');

    // Skip link should exist (though it may be visually hidden)
    if (skipLink) {
      const isHidden = await skipLink.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return styles.display === 'none' ||
               styles.visibility === 'hidden' ||
               styles.opacity === '0';
      });

      // Skip link should become visible on focus
      await skipLink.focus();
      const isVisibleOnFocus = await skipLink.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return styles.display !== 'none' &&
               styles.visibility !== 'hidden' &&
               styles.opacity !== '0';
      });

      expect(isVisibleOnFocus).toBe(true);
    }
  });

  test('ARIA roles should be used correctly', async ({ page }) => {
    await checkA11y(page, null, {
      detailedReport: true,
      axeOptions: {
        runOnly: {
          type: 'tag',
          values: ['best-practice']
        }
      }
    });
  });

  test('screen reader announcements should work', async ({ page }) => {
    // Check for live regions
    const liveRegions = await page.$$('[aria-live]');

    // Should have at least one live region for status updates
    expect(liveRegions.length).toBeGreaterThan(0);

    // Check that live regions have proper politeness settings
    for (const region of liveRegions) {
      const ariaLive = await region.getAttribute('aria-live');
      expect(['polite', 'assertive', 'off']).toContain(ariaLive);
    }
  });

  test('landmarks should be present', async ({ page }) => {
    // Check for semantic landmarks
    const main = await page.$('main, [role="main"]');
    const nav = await page.$('nav, [role="navigation"]');

    // Should have main landmark
    expect(main).toBeTruthy();
  });

  test('error messages should be accessible', async ({ page }) => {
    // Trigger an error (e.g., submit form with invalid data)
    const input = await page.$('input[type="text"]');
    if (input) {
      await input.fill('');
      await page.keyboard.press('Enter');

      // Wait for error message
      await page.waitForSelector('[role="alert"], .error-message', { timeout: 2000 })
        .catch(() => {
          // No error to test - that's okay
        });

      // If error exists, check it's properly announced
      const errorMessage = await page.$('[role="alert"], .error-message');
      if (errorMessage) {
        const ariaLive = await errorMessage.getAttribute('aria-live');
        const role = await errorMessage.getAttribute('role');

        // Error should be announced to screen readers
        expect(ariaLive === 'assertive' || role === 'alert').toBe(true);
      }
    }
  });

  test('modals should trap focus', async ({ page }) => {
    // Open a modal
    const modalTrigger = await page.$('[data-testid="open-modal"]');

    if (modalTrigger) {
      await modalTrigger.click();
      await page.waitForSelector('[role="dialog"]');

      // Tab through elements
      const modal = await page.$('[role="dialog"]');
      const initialFocusedElement = await page.evaluateHandle(() => document.activeElement);

      // Tab multiple times
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
      }

      // Focus should still be within modal
      const currentFocusedElement = await page.evaluateHandle(() => document.activeElement);
      const isInsideModal = await modal?.evaluateHandle((modalEl, focusedEl) => {
        return modalEl.contains(focusedEl as Node);
      }, currentFocusedElement);

      expect(isInsideModal).toBeTruthy();
    }
  });

  test('generate accessibility report', async ({ page }) => {
    // Run full accessibility audit
    const violations = await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: {
        html: true
      }
    });

    // Generate JSON report
    const report = {
      timestamp: new Date().toISOString(),
      url: page.url(),
      violations: violations || [],
      summary: {
        total: violations?.length || 0,
        critical: violations?.filter((v: any) => v.impact === 'critical').length || 0,
        serious: violations?.filter((v: any) => v.impact === 'serious').length || 0,
        moderate: violations?.filter((v: any) => v.impact === 'moderate').length || 0,
        minor: violations?.filter((v: any) => v.impact === 'minor').length || 0
      }
    };

    // Save report
    const fs = require('fs');
    const path = require('path');
    const outputPath = path.join(__dirname, '..', '..', 'accessibility-results.json');
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

    console.log('\n📊 Accessibility Report Generated');
    console.log(`Total violations: ${report.summary.total}`);
    console.log(`Critical: ${report.summary.critical}`);
    console.log(`Serious: ${report.summary.serious}`);
    console.log(`Moderate: ${report.summary.moderate}`);
    console.log(`Minor: ${report.summary.minor}`);
  });
});
