import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HtmlMediaAdapter } from '../apps/web/src/player/html-adapter';
let video: HTMLVideoElement;
beforeEach(() => {
  video = document.createElement('video');
  video.load = vi.fn();
  video.pause = vi.fn();
  video.play = vi.fn().mockResolvedValue(undefined);
});
describe('HTML playback adapter', () => {
  it('waits for engine events before reporting playing', async () => {
    const adapter = new HtmlMediaAdapter(video);
    adapter.openMedia({ id: '1', url: 'blob:test', title: 'Test', kind: 'file' });
    await adapter.play();
    expect(adapter.getPlaybackState().status).toBe('loading');
    video.dispatchEvent(new Event('playing'));
    expect(adapter.getPlaybackState().status).toBe('playing');
    adapter.dispose();
  });
  it('reports decoding errors without exposing source URLs', () => {
    const adapter = new HtmlMediaAdapter(video);
    Object.defineProperty(video, 'error', { value: { code: 3 } });
    video.dispatchEvent(new Event('error'));
    expect(adapter.getPlaybackState().error).toContain('decoder');
    adapter.dispose();
  });
  it('clamps seeking and ignores non-finite input', () => {
    const adapter = new HtmlMediaAdapter(video);
    Object.defineProperty(video, 'duration', { value: 100 });
    video.dispatchEvent(new Event('durationchange'));
    adapter.seek(120);
    expect(video.currentTime).toBe(100);
    adapter.seek(-10);
    expect(video.currentTime).toBe(0);
    adapter.seek(NaN);
    expect(video.currentTime).toBe(0);
    adapter.dispose();
  });
  it('clears duration and errors between sources', () => {
    const adapter = new HtmlMediaAdapter(video);
    Object.defineProperty(video, 'duration', { value: 100 });
    video.dispatchEvent(new Event('durationchange'));
    adapter.openMedia({ id: '2', title: 'Second', kind: 'file', url: 'blob:next' });
    expect(adapter.getPlaybackState().duration).toBe(0);
    adapter.dispose();
  });
  it('releases resources and stops delivering events after disposal', () => {
    const adapter = new HtmlMediaAdapter(video);
    const listener = vi.fn();
    adapter.subscribe(listener);
    adapter.dispose();
    const calls = listener.mock.calls.length;
    video.dispatchEvent(new Event('playing'));
    expect(listener).toHaveBeenCalledTimes(calls);
    expect(video.hasAttribute('src')).toBe(false);
    expect(video.load).toHaveBeenCalled();
  });
  it('explains play rejection', async () => {
    video.play = vi.fn().mockRejectedValue(new DOMException('blocked', 'NotAllowedError'));
    const adapter = new HtmlMediaAdapter(video);
    await adapter.play();
    expect(adapter.getPlaybackState().status).toBe('error');
    adapter.dispose();
  });
});
it('ignores a late play rejection from a replaced source', async () => {
  video = document.createElement('video');
  video.pause = vi.fn();
  video.load = vi.fn();
  let reject!: (error: Error) => void;
  video.play = vi.fn().mockImplementation(
    () =>
      new Promise<void>((_resolve, rejectPromise) => {
        reject = rejectPromise;
      }),
  );
  const adapter = new HtmlMediaAdapter(video);
  adapter.openMedia({ id: 'old', title: 'Old', url: 'blob:old', kind: 'file' });
  const pending = adapter.play();
  await Promise.resolve();
  adapter.openMedia({ id: 'new', title: 'New', url: 'blob:new', kind: 'file' });
  reject(new Error('old source failed'));
  await pending;
  expect(adapter.getPlaybackState().status).toBe('loading');
  expect(adapter.getPlaybackState().error).toBeNull();
  adapter.dispose();
});
it('does not start delayed playback after an explicit pause', async () => {
  const adapter = new HtmlMediaAdapter(video);
  adapter.openMedia({ id: '1', url: 'blob:test', title: 'Test', kind: 'file' });
  const pending = adapter.play();
  adapter.pause();
  await pending;
  expect(video.play).not.toHaveBeenCalled();
  adapter.dispose();
});
