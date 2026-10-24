import { describe, it, expect } from 'vitest';
import { timeLabel, validateMediaUrl } from '../packages/core/media';
describe('media URL validation', () => {
  it('trims and classifies without discarding signed query parameters', () => {
    const result = validateMediaUrl(' https://example.com/video.mp4?token=abc ');
    expect(result.url).toContain('?token=abc');
    expect(result.title).toBe('video.mp4');
    expect(result.kind).toBe('direct');
  });
  it.each([
    'https://example.com/channel.m3u8?key=x',
    'https://example.com/test.MPD',
    'https://example.com/list.m3u',
  ])('identifies manifest candidates', (url) =>
    expect(validateMediaUrl(url).kind).toBe('manifest'),
  );
  it.each([
    'javascript:alert(1)',
    'file:///etc/passwd',
    'http://example.com/a',
    'https://user:secret@example.com/video',
    'https://127.0.0.1/a',
    'https://localhost/a',
    'https://[::1]/a',
    'https://camera.local/a',
    'not a URL',
  ])('rejects unsafe or unsupported input %s', (url) =>
    expect(() => validateMediaUrl(url)).toThrow(),
  );
  it('does not put query tokens into display titles', () =>
    expect(validateMediaUrl('https://example.com/?token=secret').title).toBe('Network media'));
  it('handles malformed URL encoding', () =>
    expect(validateMediaUrl('https://example.com/%ZZ').title).toBe('Network media'));
});
describe('time display', () => {
  it.each([
    [0, '00:00'],
    [65, '01:05'],
    [3661, '1:01:01'],
    [Infinity, '00:00'],
    [-1, '00:00'],
  ])('formats %s', (value, label) => expect(timeLabel(Number(value))).toBe(label));
});
