import { test, expect } from '@playwright/test';

/**
 * E2E tests for AI Conversations
 * Tests the core conversation functionality
 */

test.describe('AI Conversations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Wait for extension to load
    await page.waitForSelector('.chat-container', { timeout: 10000 });
  });

  test('should display chat interface', async ({ page }) => {
    const chatContainer = page.locator('.chat-container');
    await expect(chatContainer).toBeVisible();

    // Should have message input
    const messageInput = page.locator('textarea[placeholder*="Type a message"]');
    await expect(messageInput).toBeVisible();

    // Should have send button
    const sendButton = page.locator('button[aria-label="Send message"]');
    await expect(sendButton).toBeVisible();
  });

  test('should send a message', async ({ page }) => {
    const messageInput = page.locator('textarea[placeholder*="Type a message"]');
    await messageInput.fill('Hello, test message');

    const sendButton = page.locator('button[aria-label="Send message"]');
    await sendButton.click();

    // Message should appear in chat
    const userMessage = page.locator('.message.user:has-text("Hello, test message")');
    await expect(userMessage).toBeVisible({ timeout: 5000 });
  });

  test('should receive AI response', async ({ page }) => {
    const messageInput = page.locator('textarea[placeholder*="Type a message"]');
    await messageInput.fill('What is 2+2?');

    const sendButton = page.locator('button[aria-label="Send message"]');
    await sendButton.click();

    // Wait for AI response
    const aiMessage = page.locator('.message.assistant').first();
    await expect(aiMessage).toBeVisible({ timeout: 30000 });

    // AI message should have content
    const messageContent = aiMessage.locator('.message-content');
    await expect(messageContent).not.toBeEmpty();
  });

  test('should display typing indicator during response', async ({ page }) => {
    const messageInput = page.locator('textarea[placeholder*="Type a message"]');
    await messageInput.fill('Tell me a story');

    const sendButton = page.locator('button[aria-label="Send message"]');
    await sendButton.click();

    // Typing indicator should appear
    const typingIndicator = page.locator('.typing-indicator');
    await expect(typingIndicator).toBeVisible({ timeout: 5000 });

    // Wait for response to complete
    await expect(typingIndicator).not.toBeVisible({ timeout: 30000 });
  });

  test('should create new conversation', async ({ page }) => {
    // Click new conversation button
    const newConvButton = page.locator('button[aria-label="New conversation"]');
    await newConvButton.click();

    // Message history should be empty
    const messages = page.locator('.message');
    await expect(messages).toHaveCount(0);
  });

  test('should switch AI modes', async ({ page }) => {
    // Open mode selector
    const modeSelector = page.locator('[data-testid="mode-selector"]');
    await modeSelector.click();

    // Select a different mode
    await page.click('.mode-option:has-text("Architect")');

    // Mode should be updated in UI
    await expect(page.locator('.current-mode')).toContainText('Architect');
  });

  test('should display code blocks with syntax highlighting', async ({ page }) => {
    const messageInput = page.locator('textarea[placeholder*="Type a message"]');
    await messageInput.fill('Write a hello world function in Python');

    const sendButton = page.locator('button[aria-label="Send message"]');
    await sendButton.click();

    // Wait for response with code block
    const codeBlock = page.locator('.message.assistant code');
    await expect(codeBlock).toBeVisible({ timeout: 30000 });

    // Should have syntax highlighting classes
    await expect(codeBlock).toHaveClass(/language-python/);
  });

  test('should copy code from code blocks', async ({ page }) => {
    const messageInput = page.locator('textarea[placeholder*="Type a message"]');
    await messageInput.fill('Show me a JavaScript function');

    const sendButton = page.locator('button[aria-label="Send message"]');
    await sendButton.click();

    // Wait for code block
    await page.waitForSelector('.code-block', { timeout: 30000 });

    // Click copy button
    const copyButton = page.locator('.code-block button[aria-label="Copy code"]');
    await copyButton.click();

    // Should show copied feedback
    await expect(copyButton).toContainText('Copied!', { timeout: 2000 });
  });

  test('should stop generation', async ({ page }) => {
    const messageInput = page.locator('textarea[placeholder*="Type a message"]');
    await messageInput.fill('Write a very long story about space');

    const sendButton = page.locator('button[aria-label="Send message"]');
    await sendButton.click();

    // Wait for generation to start
    await page.waitForSelector('.typing-indicator', { timeout: 5000 });

    // Click stop button
    const stopButton = page.locator('button[aria-label="Stop generation"]');
    await stopButton.click();

    // Typing indicator should disappear
    await expect(page.locator('.typing-indicator')).not.toBeVisible({ timeout: 2000 });
  });

  test('should delete a message', async ({ page }) => {
    // Send a message
    const messageInput = page.locator('textarea[placeholder*="Type a message"]');
    await messageInput.fill('Test message to delete');
    await page.click('button[aria-label="Send message"]');

    // Wait for message
    const userMessage = page.locator('.message.user:has-text("Test message to delete")');
    await expect(userMessage).toBeVisible();

    // Hover over message to show actions
    await userMessage.hover();

    // Click delete button
    await page.click('.message-actions button[aria-label="Delete message"]');

    // Confirm deletion
    await page.click('button:has-text("Delete")');

    // Message should be removed
    await expect(userMessage).not.toBeVisible();
  });

  test('should regenerate AI response', async ({ page }) => {
    // Send a message
    const messageInput = page.locator('textarea[placeholder*="Type a message"]');
    await messageInput.fill('What is AI?');
    await page.click('button[aria-label="Send message"]');

    // Wait for AI response
    const aiMessage = page.locator('.message.assistant').first();
    await expect(aiMessage).toBeVisible({ timeout: 30000 });

    // Get original response text
    const originalText = await aiMessage.locator('.message-content').textContent();

    // Hover and click regenerate
    await aiMessage.hover();
    await page.click('.message-actions button[aria-label="Regenerate"]');

    // Should show typing indicator
    await expect(page.locator('.typing-indicator')).toBeVisible();

    // Wait for new response
    await expect(page.locator('.typing-indicator')).not.toBeVisible({ timeout: 30000 });

    // Response might be different (though not guaranteed)
    const newMessage = page.locator('.message.assistant').first();
    await expect(newMessage).toBeVisible();
  });

  test('should scroll to bottom on new message', async ({ page }) => {
    // Send multiple messages to create scroll
    for (let i = 0; i < 10; i++) {
      await page.fill('textarea[placeholder*="Type a message"]', `Message ${i}`);
      await page.click('button[aria-label="Send message"]');
      await page.waitForTimeout(500);
    }

    // Last message should be visible
    const lastMessage = page.locator('.message.user').last();
    await expect(lastMessage).toBeVisible();

    // Should be scrolled to bottom
    const scrollContainer = page.locator('.messages-container');
    const isAtBottom = await scrollContainer.evaluate((el) => {
      return Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) < 10;
    });
    expect(isAtBottom).toBe(true);
  });

  test('should be keyboard accessible', async ({ page }) => {
    const messageInput = page.locator('textarea[placeholder*="Type a message"]');

    // Focus should move to input
    await page.keyboard.press('Tab');
    await expect(messageInput).toBeFocused();

    // Type message
    await page.keyboard.type('Hello from keyboard');

    // Cmd+Enter or Ctrl+Enter should send
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+Enter`);

    // Message should be sent
    const userMessage = page.locator('.message.user:has-text("Hello from keyboard")');
    await expect(userMessage).toBeVisible({ timeout: 5000 });
  });
});
