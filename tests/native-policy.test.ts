// @vitest-environment node
import { it, expect } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { nativeCommandSchema, nativeOpenSchema, viewportSchema } from '../packages/native/protocol';
import { FileGrants, validateSubtitle } from '../apps/desktop/native/files';
import { publicV4, validateNativeUrl } from '../apps/desktop/native/network';
it.each([
  { op: 'run', value: 'cmd.exe' },
  { op: 'seek', value: NaN },
  { op: 'volume', value: 10 },
  { op: 'audio', value: -1 },
  { op: 'pause', script: 'evil' },
  { op: 'subtitleFile', path: 'C:/secrets' },
])('rejects unrestricted or malformed renderer command', (value) =>
  expect(nativeCommandSchema.safeParse(value).success).toBe(false),
);
it('rejects arbitrary renderer file paths', () =>
  expect(
    nativeOpenSchema.safeParse({ kind: 'file', path: 'C:/secrets', session: crypto.randomUUID() })
      .success,
  ).toBe(false));
it('bounds the child surface', () =>
  expect(
    viewportSchema.safeParse({ x: -1, y: 0, width: Infinity, height: 1, visible: true }).success,
  ).toBe(false));
it.each([
  '127.0.0.1',
  '10.1.2.3',
  '192.168.1.1',
  '172.16.0.1',
  '169.254.169.254',
  '100.64.0.1',
  '0.0.0.0',
  '224.0.0.1',
  '198.18.0.1',
  '203.0.113.1',
  '::1',
])('rejects private/reserved address %s', (address) => expect(publicV4(address)).toBe(false));
it('accepts public IPv4 candidates', () => expect(publicV4('8.8.8.8')).toBe(true));
it.each([
  'http://example.com/a.mp4',
  'https://user:pass@example.com/a.mp4',
  'https://example.com:8443/a.mp4',
  'https://localhost/a',
  'https://example.com/list.m3u',
])(
  'rejects unsupported native URL %s',
  async (url) => await expect(validateNativeUrl(url)).rejects.toThrow(),
);
it('only releases paths that the main process previously granted', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'zenplex-grants-'));
  try {
    const file = path.join(dir, 'বাংলা.mp4');
    await writeFile(file, 'fixture');
    const grants = new FileGrants();
    const result = await grants.grant(file);
    expect(result.title).toBe('বাংলা.mp4');
    expect(grants.resolve(result.token)).toBe(file);
    grants.release(result.token);
    expect(() => grants.resolve(result.token)).toThrow('expired');
    await expect(grants.grant(path.join(dir, 'missing.mp4'))).rejects.toThrow();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
it('limits external subtitle size and format', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'zenplex-subs-'));
  try {
    const file = path.join(dir, 'sub.exe');
    await writeFile(file, 'bad');
    await expect(validateSubtitle(file)).rejects.toThrow('SRT');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
it.each(['https://example.com/live.m3u8?key=private', 'https://example.com/movie.mpd'])(
  'accepts adaptive input after public DNS preflight',
  async (url) => {
    const resolve = async () => [{ address: '8.8.8.8', family: 4 }];
    await expect(validateNativeUrl(url, resolve)).resolves.toBe(url);
  },
);
