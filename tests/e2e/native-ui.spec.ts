import { test, expect } from '@playwright/test';
/** Bridge contract/UI test only. This does not execute libmpv or claim Windows playback. */
test('native UI routes track controls, hides surfaces for dialogs, and toggles fullscreen', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const calls: unknown[] = [];
    let listener: (event: unknown) => void = () => {};
    let fullscreen: (value: boolean) => void = () => {};
    let session = '';
    const state = {
      status: 'paused',
      position: 1,
      duration: 6,
      volume: 0.8,
      muted: false,
      rate: 1,
      buffered: 6,
      error: null,
      width: 320,
      height: 180,
      tracks: [
        { id: 1, type: 'audio', title: 'English', lang: 'eng', codec: 'opus', selected: true },
        { id: 2, type: 'audio', title: 'Bangla', lang: 'ben', codec: 'opus', selected: false },
        { id: 1, type: 'sub', title: 'Captions', lang: 'eng', codec: 'srt', selected: true },
      ],
      videoCodec: 'vp9',
      audioCodec: 'opus',
      engineVersion: 'contract-test',
      audioDelay: 0,
      subtitleDelay: 0,
    };
    const bridge = {
      runtime: async () => ({
        platform: 'win32',
        version: '0.3.0',
        nativeAvailable: true,
        reason: 'test',
        engine: 'libmpv',
      }),
      pickFiles: async () => [
        { token: '11111111-1111-4111-8111-111111111111', title: 'Native fixture.mkv' },
      ],
      releaseFile: async () => {},
      open: async (input: { session: string }) => {
        session = input.session;
        listener({ session, state });
      },
      command: async (command: { op: string; value?: number }) => {
        calls.push(command);
        if (command.op === 'audio')
          state.tracks = state.tracks.map((t) => ({
            ...t,
            selected: t.type === 'audio' ? t.id === command.value : t.selected,
          }));
        listener({ session, state });
      },
      viewport: async (value: unknown) => {
        calls.push({ viewport: value });
      },
      pickSubtitle: async () => true,
      fullscreen: async (value: boolean) => fullscreen(value),
      onNativeEvent: (fn: (event: unknown) => void) => {
        listener = fn;
        return () => {};
      },
      onFullscreen: (fn: (value: boolean) => void) => {
        fullscreen = fn;
        return () => {};
      },
    };
    Object.assign(window, { zenplex: bridge, __nativeCalls: calls });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open files', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Native fixture.mkv', exact: true }),
  ).toBeVisible();
  await page.getByRole('combobox', { name: 'Audio track', exact: true }).selectOption('2');
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { __nativeCalls: unknown[] }).__nativeCalls),
    )
    .toContainEqual({ op: 'audio', value: 2 });
  await page.getByRole('button', { name: 'Open URL', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as unknown as { __nativeCalls: { viewport?: { visible: boolean } }[] }
          ).__nativeCalls
            .filter((x) => x.viewport)
            .at(-1)?.viewport?.visible,
      ),
    )
    .toBe(false);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Fullscreen', exact: true }).click();
  await expect(page.locator('.app')).toHaveClass(/native-fullscreen/);
  await page.getByRole('button', { name: 'Fullscreen', exact: true }).focus();
  await page.keyboard.press('Escape');
  await expect(page.locator('.app')).not.toHaveClass(/native-fullscreen/);
});
