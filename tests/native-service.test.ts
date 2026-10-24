// @vitest-environment node
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { it, expect, vi, afterEach } from 'vitest';
import type { BrowserWindow } from 'electron';
const fake = vi.hoisted(() => ({ spawn: vi.fn() }));
vi.mock('node:child_process', () => ({ spawn: fake.spawn }));
import { NativeService } from '../apps/desktop/native/service';
const services: NativeService[] = [];
afterEach(() => {
  services.forEach((s) => s.dispose());
  services.length = 0;
  vi.restoreAllMocks();
});
function fixture(ready = true) {
  const received: Record<string, unknown>[] = [];
  const child = Object.assign(new EventEmitter(), {
    stdin: new PassThrough(),
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    kill: vi.fn(),
  });
  child.stdin.on('data', (chunk) => {
    for (const line of chunk.toString().trim().split('\n')) {
      const msg = JSON.parse(line);
      received.push(msg);
      child.stdout.write(JSON.stringify({ id: msg.id, ok: true }) + '\n');
    }
  });
  child.stdin.on('finish', () => child.emit('exit', 0));
  fake.spawn.mockImplementation(() => {
    if (ready) setTimeout(() => child.stdout.write('{"event":"ready","protocol":1}\n'), 0);
    return child;
  });
  const send = vi.fn();
  const window = {
    isDestroyed: () => false,
    getNativeWindowHandle: () => Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]),
    webContents: { send },
  } as unknown as BrowserWindow;
  const service = new NativeService(window, '/runtime');
  vi.spyOn(service, 'available').mockResolvedValue(true);
  services.push(service);
  return { service, received, child, send };
}
it('starts the helper without shell or source arguments and applies preferences before loading', async () => {
  const f = fixture();
  await f.service.command({ op: 'volume', value: 0.4 });
  await f.service.open('/private/media.mp4', 'session');
  expect(fake.spawn).toHaveBeenCalledWith(
    expect.stringContaining('zenplex-player-host.exe'),
    ['1'],
    expect.objectContaining({ shell: false, windowsHide: true }),
  );
  expect(f.received.find((m) => m.op === 'volume')?.value).toBe(0.4);
  expect(f.received.map((m) => m.op).indexOf('volume')).toBeLessThan(
    f.received.map((m) => m.op).indexOf('open'),
  );
  expect(f.received.at(-1)?.op).toBe('play');
});
it('tears down a pending startup when the player is closed', async () => {
  const f = fixture(false);
  const pending = f.service.open('/media.mp4', 'first');
  await new Promise((r) => setTimeout(r, 0));
  f.service.dispose();
  await pending;
  expect(f.received.some((m) => m.op === 'open')).toBe(false);
});
it('converts helper disconnect into an actionable failure', async () => {
  const f = fixture();
  await f.service.open('/media.mp4', 'session');
  f.child.stdout.end();
  await new Promise((r) => setTimeout(r, 0));
  expect(f.send).toHaveBeenCalledWith(
    'zenplex:native-event',
    expect.objectContaining({
      state: expect.objectContaining({
        status: 'error',
        error: expect.stringContaining('unexpectedly'),
      }),
    }),
  );
});
it('rejects malformed native state and releases the helper', async () => {
  const f = fixture();
  await f.service.open('/media.mp4', 'session');
  f.child.stdout.write('{"event":"state","state":{"position":"bad"}}\n');
  expect(f.send).toHaveBeenCalledWith(
    'zenplex:native-event',
    expect.objectContaining({
      state: expect.objectContaining({
        status: 'error',
        error: expect.stringContaining('invalid'),
      }),
    }),
  );
});
it('does not write settings into a helper before its readiness handshake', async () => {
  const f = fixture(false);
  const pending = f.service.open('/media.mp4', 'session');
  await new Promise((r) => setTimeout(r, 0));
  await f.service.command({ op: 'volume', value: 0.2 });
  expect(f.received).toHaveLength(0);
  f.child.stdout.write('{"event":"ready","protocol":1}\n');
  await pending;
  expect(f.received.find((m) => m.op === 'volume')?.value).toBe(0.2);
});
it('enables adaptive references only for HTTPS HLS/DASH sources', async () => {
  const f = fixture();
  await f.service.open('https://example.com/live.m3u8?key=secret', 'adaptive');
  expect(f.received.find((m) => m.op === 'open')).toMatchObject({ adaptive: true });
});
