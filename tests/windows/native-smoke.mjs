import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { NativeService } from '../../dist-desktop/apps/desktop/native/service.js';
if (process.platform !== 'win32' || process.arch !== 'x64') {
  console.error('This integration test requires Windows x64.');
  app.exit(1);
} else {
  await app.whenReady();
  const window = new BrowserWindow({
    width: 900,
    height: 650,
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
  });
  await window.loadURL(
    'data:text/html,<title>ZenPlex native integration test</title><body style="background:%2310121c;color:white">Native rendering test. Watch the test pattern in the embedded area.</body>',
  );
  const service = new NativeService(window, path.resolve('native/player-host/out'));
  let latest = null;
  const send = window.webContents.send.bind(window.webContents);
  window.webContents.send = (channel, event) => {
    if (channel === 'zenplex:native-event' && event.state) latest = event.state;
    send(channel, event);
  };
  const wait = async (predicate) => {
    const until = Date.now() + 15000;
    while (Date.now() < until) {
      if (latest?.status === 'error') throw Error(latest.error);
      if (predicate()) return;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw Error('Native state assertion timed out.');
  };
  let code = 0;
  try {
    if (!(await service.available()))
      throw Error('Native runtime missing. Run npm run native:doctor.');
    await service.viewport({ x: 20, y: 40, width: 820, height: 450, visible: true });
    await service.open(path.resolve('tests/fixtures/native-multitrack.mkv'), crypto.randomUUID());
    await wait(() => latest?.position > 0.2 && latest?.status === 'playing');
    await service.command({ op: 'pause' });
    await wait(() => latest?.status === 'paused');
    await service.command({ op: 'seek', value: 2 });
    await wait(() => latest?.position >= 1.9);
    const audio = latest.tracks.filter((t) => t.type === 'audio');
    if (audio.length < 2) throw Error('Expected two audio tracks.');
    await service.command({ op: 'audio', value: audio[1].id });
    await wait(() =>
      latest.tracks.some((t) => t.type === 'audio' && t.id === audio[1].id && t.selected),
    );
    const sub = latest.tracks.find((t) => t.type === 'sub');
    if (!sub) throw Error('Expected embedded subtitles.');
    await service.command({ op: 'subtitle', value: sub.id });
    await wait(() => latest.tracks.some((t) => t.type === 'sub' && t.selected));
    await service.command({ op: 'subtitleDelay', value: 0.5 });
    await wait(() => latest.subtitleDelay === 0.5);
    await service.command({ op: 'volume', value: 0.3 });
    await wait(() => Math.abs(latest.volume - 0.3) < 0.01);
    await service.viewport({ x: 30, y: 50, width: 600, height: 340, visible: true });
    await fs.mkdir('test-results', { recursive: true });
    await fs.writeFile(
      'test-results/native-windows.json',
      JSON.stringify(
        {
          passed: true,
          platform: process.platform,
          engine: latest.engineVersion,
          checks: [
            'startup',
            'decode',
            'pause',
            'seek',
            'audio track',
            'subtitle track',
            'subtitle delay',
            'volume',
            'viewport command',
          ],
        },
        null,
        2,
      ),
    );
    console.log(
      'Native integration passed. Manually verify DPI, fullscreen, focus, minimize and image placement before release.',
    );
  } catch (error) {
    console.error(error.message);
    code = 1;
  } finally {
    service.dispose();
    await new Promise((r) => setTimeout(r, 1700));
    window.destroy();
    app.exit(code);
  }
}
