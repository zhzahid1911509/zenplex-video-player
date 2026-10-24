import { test, expect } from '@playwright/test';
import path from 'node:path';
test('M3U import, group filter, search and favorites', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play queue', exact: true }).click();
  await page.getByLabel('Playlist file').setInputFiles({
    name: 'channels.m3u',
    mimeType: 'audio/x-mpegurl',
    buffer: Buffer.from(
      '#EXTM3U\n#EXTINF:-1 group-title="News",বাংলা News\nhttps://media.example.test/news.m3u8\n#EXTINF:-1 group-title="Sports",Sport\nhttps://media.example.test/sport.mpd\nfile:///bad',
    ),
  });
  await expect(page.locator('main > .queue-list .queue-item')).toHaveCount(2);
  await page.screenshot({ path: 'test-results/phase4-channels.png', fullPage: true });
  await page.getByRole('button', { name: 'Favorite বাংলা News', exact: true }).click();
  await page.getByLabel('Favorites only').check();
  await expect(page.locator('main > .queue-list .queue-item')).toHaveCount(1);
  await page.getByLabel('Favorites only').uncheck();
  await page.getByLabel('Channel group').selectOption('Sports');
  await expect(page.locator('main > .queue-list')).toContainText('Sport');
  await page.getByLabel('Search queue').fill('missing');
  await expect(page.locator('main > .queue-list .queue-item')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
for (const format of ['m3u8', 'mpd'])
  test(`actual ${format} manifest and segment playback`, async ({ page }) => {
    await page.route('https://stream.example.test/**', (route) => {
      const name = new URL(route.request().url()).pathname.split('/').pop()!;
      const type = name.endsWith('.m3u8')
        ? 'application/vnd.apple.mpegurl'
        : name.endsWith('.mpd')
          ? 'application/dash+xml'
          : name.endsWith('.mpegts')
            ? 'video/mp2t'
            : 'video/webm';
      return route.fulfill({
        path: path.resolve('tests/fixtures/streaming', name),
        contentType: type,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'Open URL', exact: true }).click();
    await page.getByLabel('Media URL').fill(`https://stream.example.test/sample.${format}`);
    await page.getByRole('button', { name: 'Open media', exact: true }).click();
    await expect
      .poll(() => page.locator('video').evaluate((v: HTMLVideoElement) => v.currentTime), {
        timeout: 20000,
      })
      .toBeGreaterThan(0.2);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect
      .poll(() => page.locator('video').evaluate((v: HTMLVideoElement) => v.paused))
      .toBe(true);
    await page.getByRole('button', { name: `Remove sample.${format}`, exact: true }).click();
    await expect(page.locator('video')).not.toHaveAttribute('src');
  });
test('remote list import resolves relative channels without autoplay', async ({ page }) => {
  await page.route('https://list.example.test/channels.m3u', (route) =>
    route.fulfill({
      body: '#EXTM3U\n#EXTINF:-1 group-title="Demo",Remote demo\nvideo.webm',
      contentType: 'audio/x-mpegurl',
      headers: { 'Access-Control-Allow-Origin': '*' },
    }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Play queue', exact: true }).click();
  await page
    .getByLabel('Playlist URL', { exact: true })
    .fill('https://list.example.test/channels.m3u');
  await page.getByRole('button', { name: 'Import playlist URL', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play Remote demo', exact: true })).toBeVisible();
  await expect(page.locator('video')).not.toHaveAttribute('src');
});
test('network failure reconnects and resumes actual playback', async ({ page }) => {
  let requests = 0;
  await page.route('https://retry.example.test/video.webm', (route) => {
    requests++;
    if (requests === 1) return route.fulfill({ status: 503, body: 'Unavailable' });
    return route.fulfill({
      path: path.resolve('tests/fixtures/sample.webm'),
      contentType: 'video/webm',
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open URL', exact: true }).click();
  await page.getByLabel('Media URL', { exact: true }).fill('https://retry.example.test/video.webm');
  await page.getByRole('button', { name: 'Open media', exact: true }).click();
  await expect
    .poll(() => page.locator('video').evaluate((v: HTMLVideoElement) => v.currentTime), {
      timeout: 15000,
    })
    .toBeGreaterThan(0.2);
  expect(requests).toBeGreaterThanOrEqual(2);
  await expect(page.locator('main')).toContainText('Recovery 1/3');
});
