import { validateMediaUrl, type MediaSource } from '../core/media';
export type UrlKind = 'direct' | 'hls' | 'dash' | 'playlist';
export function classifyUrl(value: string): UrlKind {
  const url = new URL(validateMediaUrl(value).url);
  if (/\.m3u$/i.test(url.pathname)) return 'playlist';
  if (/\.m3u8$/i.test(url.pathname)) return 'hls';
  if (/\.mpd$/i.test(url.pathname)) return 'dash';
  return 'direct';
}
export const MAX_PLAYLIST_BYTES = 2 * 1024 * 1024;
export function parseM3u(text: string, baseUrl?: string) {
  if (new TextEncoder().encode(text).length > MAX_PLAYLIST_BYTES)
    throw new Error('Playlist exceeds the 2 MiB limit.');
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  if (lines[0]?.trim() !== '#EXTM3U')
    throw new Error('Expected an extended M3U playlist (#EXTM3U).');
  if (lines.some((line) => /^#EXT-X-/i.test(line.trim())))
    throw new Error(
      'This is an HLS stream. Open its HTTPS URL instead of importing it as channels.',
    );
  const items: MediaSource[] = [];
  const seen = new Set<string>();
  let title = '',
    group = '',
    channelId = '',
    skipped = 0;
  for (const raw of lines.slice(1)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#EXTINF:')) {
      // Find the title separator outside quoted attributes (commas are legal inside quotes).
      let quoted = false,
        comma = -1;
      for (let i = 8; i < line.length; i++) {
        if (line[i] === '"') quoted = !quoted;
        if (line[i] === ',' && !quoted) {
          comma = i;
          break;
        }
      }
      const attrs = comma < 0 ? line : line.slice(0, comma);
      title =
        comma < 0
          ? ''
          : line
              .slice(comma + 1)
              .trim()
              .slice(0, 160);
      group = /group-title="([^"]*)"/i.exec(attrs)?.[1]?.slice(0, 100) ?? '';
      channelId = /tvg-id="([^"]*)"/i.exec(attrs)?.[1]?.slice(0, 160) ?? '';
      continue;
    }
    if (line.startsWith('#EXTGRP:')) {
      group = line.slice(8).trim().slice(0, 100);
      continue;
    }
    if (line.startsWith('#')) continue;
    try {
      const media = validateMediaUrl(baseUrl ? new URL(line, baseUrl).href : line);
      if (classifyUrl(media.url) === 'playlist') throw new Error('Nested playlist');
      if (seen.has(media.url) || items.length >= 200) skipped++;
      else {
        seen.add(media.url);
        items.push({
          id: crypto.randomUUID(),
          title: title || media.title,
          url: media.url,
          kind: 'url',
          streamType: classifyUrl(media.url) as 'direct' | 'hls' | 'dash',
          group: group || 'Ungrouped',
          channelId,
        });
      }
    } catch {
      skipped++;
    }
    title = '';
    group = '';
    channelId = '';
  }
  if (!items.length) throw new Error('No playable public HTTPS channel URLs were found.');
  return { items, skipped };
}
export async function fetchPlaylist(value: string, signal: AbortSignal) {
  const url = validateMediaUrl(value).url;
  const response = await fetch(url, {
    signal,
    credentials: 'omit',
    redirect: 'error',
    referrerPolicy: 'no-referrer',
  });
  if (!response.ok || !response.body)
    throw new Error('Playlist request failed. Check access and CORS permissions.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let text = '',
    bytes = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_PLAYLIST_BYTES) throw new Error('Playlist exceeds the 2 MiB limit.');
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  return parseM3u(text, url);
}
