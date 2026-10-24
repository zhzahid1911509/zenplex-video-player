import { it, expect, vi } from 'vitest';
import { NativePlaybackAdapter } from '../apps/web/src/player/native-adapter';
import { initialPlayback } from '../packages/core/media';
import type { DesktopBridge, NativeEvent } from '../packages/native/protocol';
function fixture() {
  let listener: (event: NativeEvent) => void = () => {};
  const bridge = {
    open: vi.fn().mockResolvedValue(undefined),
    command: vi.fn().mockResolvedValue(undefined),
    onNativeEvent: vi.fn((fn) => {
      listener = fn;
      return vi.fn();
    }),
    viewport: vi.fn().mockResolvedValue(undefined),
    pickSubtitle: vi.fn().mockResolvedValue(true),
  } as unknown as DesktopBridge;
  return { bridge, emit: (event: NativeEvent) => listener(event) };
}
it('keeps stale native session events out of the new source', () => {
  const f = fixture(),
    engine = new NativePlaybackAdapter(f.bridge, () => {});
  engine.openMedia({
    id: '1',
    kind: 'file',
    nativeToken: crypto.randomUUID(),
    title: 'A',
    url: '',
  });
  const first = vi.mocked(f.bridge.open).mock.calls[0]![0].session;
  engine.openMedia({
    id: '2',
    kind: 'file',
    nativeToken: crypto.randomUUID(),
    title: 'B',
    url: '',
  });
  f.emit({
    session: first,
    state: {
      ...initialPlayback,
      status: 'error',
      error: 'old',
      tracks: [],
      videoCodec: '',
      audioCodec: '',
      engineVersion: '',
      audioDelay: 0,
      subtitleDelay: 0,
    },
  });
  expect(engine.getPlaybackState().status).toBe('loading');
  engine.dispose();
});
it('uses file tokens instead of exposing arbitrary paths', () => {
  const f = fixture(),
    engine = new NativePlaybackAdapter(f.bridge, () => {});
  const token = crypto.randomUUID();
  engine.openMedia({ id: '1', kind: 'file', nativeToken: token, title: 'A', url: '' });
  expect(f.bridge.open).toHaveBeenCalledWith({ kind: 'file', token, session: expect.any(String) });
  engine.dispose();
});
it('disposes the native session and subscriptions', () => {
  const f = fixture(),
    engine = new NativePlaybackAdapter(f.bridge, () => {});
  engine.dispose();
  expect(f.bridge.command).toHaveBeenCalledWith({ op: 'close' });
});
it('does not report playing merely because the command was accepted', async () => {
  const f = fixture(),
    engine = new NativePlaybackAdapter(f.bridge, () => {});
  await engine.play();
  expect(engine.getPlaybackState().status).toBe('idle');
  engine.dispose();
});
