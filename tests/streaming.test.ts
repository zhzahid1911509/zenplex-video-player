import { afterEach, expect, it, vi } from 'vitest';
import {
  classifyUrl,
  parseM3u,
  MAX_PLAYLIST_BYTES,
  fetchPlaylist,
} from '../packages/streaming/playlist';
import { PlaybackRecovery } from '../packages/streaming/recovery';
import { initialPlayback, type PlaybackAdapter, type PlaybackState } from '../packages/core/media';
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it.each([
  ['https://example.com/a.M3U8?token=x', 'hls'],
  ['https://example.com/a.mpd', 'dash'],
  ['https://example.com/a.m3u', 'playlist'],
  ['https://example.com/watch?format=m3u8', 'direct'],
])('classifies %s without reading query secrets', (url, kind) =>
  expect(classifyUrl(url!)).toBe(kind),
);
it('parses Unicode labels, quoted commas, groups and relative URLs', () => {
  const { items } = parseM3u(
    '\uFEFF#EXTM3U\r\n#EXTINF:-1 tvg-id="bd1" group-title="News, BD",বাংলা সংবাদ\r\nlive.m3u8?key=a',
    'https://example.com/channels/list.m3u',
  );
  expect(items[0]).toMatchObject({
    title: 'বাংলা সংবাদ',
    group: 'News, BD',
    channelId: 'bd1',
    streamType: 'hls',
    url: 'https://example.com/channels/live.m3u8?key=a',
  });
});
it('rejects unsafe entries, nested lists and duplicates without leaking metadata', () => {
  const result = parseM3u(
    '#EXTM3U\n#EXTINF:-1 group-title="Bad",Secret\nfile:///secret\nhttp://example.com/a\nhttps://127.0.0.1/a\nhttps://example.com/a.m3u\nhttps://example.com/a.mp4\nhttps://example.com/a.mp4',
  );
  expect(result.items).toHaveLength(1);
  expect(result.skipped).toBe(5);
  expect(result.items[0]?.title).toBe('a.mp4');
  expect(result.items[0]?.group).toBe('Ungrouped');
});
it('bounds entries and input bytes and rejects HLS as a channel list', () => {
  expect(
    parseM3u(
      '#EXTM3U\n' + Array.from({ length: 205 }, (_, i) => `https://example.com/${i}`).join('\n'),
    ).items,
  ).toHaveLength(200);
  expect(() => parseM3u('a'.repeat(MAX_PLAYLIST_BYTES + 1))).toThrow('2 MiB');
  expect(() => parseM3u('#EXTM3U\n#EXT-X-TARGETDURATION:6\na.ts')).toThrow('HLS');
  expect(() => parseM3u('<html>')).toThrow('extended M3U');
});
it('fetches lists without credentials or redirects and resolves relative entries', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response('#EXTM3U\nmedia.mp4'));
  vi.stubGlobal('fetch', fetcher);
  const result = await fetchPlaylist('https://example.com/list.m3u', new AbortController().signal);
  expect(result.items[0]?.url).toBe('https://example.com/media.mp4');
  expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ credentials: 'omit', redirect: 'error' });
});
function fakeEngine() {
  let state: PlaybackState = { ...initialPlayback };
  const listeners = new Set<(s: PlaybackState) => void>();
  const emit = (patch: Partial<PlaybackState>) => {
    state = { ...state, ...patch };
    listeners.forEach((f) => f(state));
  };
  const engine = {
    openMedia: vi.fn(() => emit({ status: 'loading' })),
    play: vi.fn(async () => {}),
    pause: vi.fn(),
    stop: vi.fn(),
    seek: vi.fn(),
    getPlaybackState: () => state,
    subscribe: (f: (s: PlaybackState) => void) => {
      listeners.add(f);
      f(state);
      return () => {
        listeners.delete(f);
      };
    },
  } as unknown as PlaybackAdapter;
  return { engine, emit };
}
it('caps reconnects and cancels pending work on disposal', () => {
  vi.useFakeTimers();
  const { engine, emit } = fakeEngine();
  const recovery = new PlaybackRecovery(
    engine,
    { id: 'x', title: 'x', kind: 'url', url: 'https://example.com/a' },
    vi.fn(),
  );
  recovery.start();
  emit({ status: 'error' });
  vi.advanceTimersByTime(80000);
  expect(engine.openMedia).toHaveBeenCalledTimes(4);
  recovery.dispose();
  vi.advanceTimersByTime(100000);
  expect(engine.openMedia).toHaveBeenCalledTimes(4);
});
it('does not retry local files or explicitly paused playback', () => {
  vi.useFakeTimers();
  const { engine, emit } = fakeEngine();
  const recovery = new PlaybackRecovery(
    engine,
    { id: 'x', title: 'x', kind: 'url', url: 'https://example.com/a' },
    vi.fn(),
  );
  recovery.start();
  emit({ status: 'buffering' });
  recovery.pause();
  vi.advanceTimersByTime(100000);
  expect(engine.openMedia).toHaveBeenCalledTimes(1);
  recovery.dispose();
  const local = new PlaybackRecovery(
    engine,
    { id: 'x', title: 'x', kind: 'file', url: 'blob:a' },
    vi.fn(),
  );
  local.start();
  emit({ status: 'error' });
  vi.advanceTimersByTime(100000);
  expect(engine.openMedia).toHaveBeenCalledTimes(2);
  local.dispose();
});
it('resumes VOD position after reconnect and cancels the stall timer when playing', () => {
  vi.useFakeTimers();
  const { engine, emit } = fakeEngine();
  const recovery = new PlaybackRecovery(
    engine,
    { id: 'x', title: 'x', kind: 'url', url: 'https://example.com/a' },
    vi.fn(),
  );
  recovery.start();
  emit({ status: 'buffering', position: 42, duration: 100 });
  vi.advanceTimersByTime(20000);
  emit({ status: 'ready', duration: 100 });
  expect(engine.seek).toHaveBeenCalledWith(42);
  emit({ status: 'playing' });
  vi.advanceTimersByTime(100000);
  expect(engine.openMedia).toHaveBeenCalledTimes(2);
  recovery.dispose();
});
