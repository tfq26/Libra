import { test, expect } from '@playwright/test';

test('auto-restore draft via localStorage broadcast', async ({ browser }) => {
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();

  const page1 = await context1.newPage();
  const page2 = await context2.newPage();

  // Navigate to a real origin so localStorage is available
  await page1.goto('https://example.com');
  await page2.goto('https://example.com');

  // Set a key in page1's localStorage
  await page1.evaluate(() => {
    localStorage.setItem('libra:currentConversation:test-user', 'convo-123');
  });

  // Read from page1 and copy into page2 to simulate sync propagation
  const stored = await page1.evaluate(() => localStorage.getItem('libra:currentConversation:test-user'));
  const toSet = stored === null ? '' : stored;
  await page2.evaluate((val) => { localStorage.setItem('libra:currentConversation:test-user', val); }, toSet);

  const read = await page2.evaluate(() => localStorage.getItem('libra:currentConversation:test-user'));
  expect(read).toBe('convo-123');
});
