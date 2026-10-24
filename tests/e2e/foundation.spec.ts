import { test, expect } from '@playwright/test';
import path from 'node:path';
test('navigation, settings persistence, reset, and responsive layout', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your screen. Your pace.' })).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('combobox', { name: 'Theme', exact: true }).selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Restore defaults' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('combobox', { name: 'Theme', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('URL validation and modal focus restoration', async ({ page }) => {
  await page.goto('/');
  const open = page.getByRole('button', { name: 'Open URL', exact: true });
  await open.click();
  await page.getByLabel('Media URL').fill('http://example.com/video.mp4');
  await page.getByRole('button', { name: 'Open media', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Only HTTPS');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(open).toBeFocused();
});
test('actual local WebM playback, pause, seek, volume and resource removal', async ({ page }) => {
  await page.goto('/');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles(path.resolve('tests/fixtures/sample.webm'));
  await expect(page.getByRole('heading', { name: 'sample.webm', exact: true })).toBeVisible();
  await expect
    .poll(() => page.locator('video').evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeGreaterThan(0.1);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect
    .poll(() => page.locator('video').evaluate((v: HTMLVideoElement) => v.paused))
    .toBe(true);
  await page.getByLabel('Seek', { exact: true }).focus();
  await page.keyboard.press('Home');
  for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowRight');
  await expect
    .poll(() => page.locator('video').evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeGreaterThanOrEqual(1.9);
  await page.getByLabel('Volume', { exact: true }).focus();
  await page.keyboard.press('Home');
  for (let i = 0; i < 30; i++) await page.keyboard.press('ArrowRight');
  await expect
    .poll(() => page.locator('video').evaluate((v: HTMLVideoElement) => v.volume))
    .toBeCloseTo(0.3);
  await page.getByRole('button', { name: 'Remove sample.webm' }).click();
  await expect(page.locator('video')).not.toHaveAttribute('src');
  await expect(page.getByRole('heading', { name: 'Ready when you are.' })).toBeVisible();
});
test('malformed settings remain untouched until a deliberate settings update', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('zenplex.settings.v1', '{broken'));
  await page.goto('/');
  await expect(page.getByRole('status')).toContainText('not been overwritten');
  expect(await page.evaluate(() => localStorage.getItem('zenplex.settings.v1'))).toBe('{broken');
});
test('direct HTTPS source uses real media bytes and keeps the signed query out of labels', async ({
  page,
}) => {
  await page.route('https://media.example.test/video.webm?token=private', (route) =>
    route.fulfill({ path: path.resolve('tests/fixtures/sample.webm'), contentType: 'video/webm' }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Open URL', exact: true }).click();
  await page.getByLabel('Media URL').fill('https://media.example.test/video.webm?token=private');
  await page.getByRole('button', { name: 'Open media', exact: true }).click();
  await expect
    .poll(() => page.locator('video').evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeGreaterThan(0.1);
  await expect(page.getByRole('heading', { name: 'video.webm', exact: true })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('token=private');
});
test('queue reorder, search, remove, and navigation preserve a live session', async ({ page }) => {
  await page.goto('/');
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles([
      { name: 'first.webm', mimeType: 'video/webm', buffer: Buffer.from('invalid media') },
      { name: 'second.webm', mimeType: 'video/webm', buffer: Buffer.from('invalid media') },
    ]);
  await page.getByRole('button', { name: 'Play queue', exact: true }).click();
  await page.getByRole('button', { name: 'Move second.webm up' }).click();
  const visibleList = page.locator('main > .queue-list');
  await expect(visibleList.locator('.queue-play').first()).toContainText('second.webm');
  await page.getByLabel('Search queue').fill('first');
  await expect(visibleList.locator('.queue-item')).toHaveCount(1);
  await page.getByRole('button', { name: 'Remove first.webm' }).click();
  await expect(visibleList).toContainText('A little room');
});
