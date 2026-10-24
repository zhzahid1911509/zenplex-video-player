export type PlaybackStatus =
  'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'buffering' | 'ended' | 'error';
export type MediaSource = {
  id: string;
  title: string;
  url: string;
  kind: 'file' | 'url';
  nativeToken?: string;
  streamType?: 'direct' | 'hls' | 'dash';
  group?: string;
  channelId?: string;
  favorite?: boolean;
};
export type PlaybackState = {
  status: PlaybackStatus;
  position: number;
  duration: number;
  volume: number;
  muted: boolean;
  rate: number;
  buffered: number;
  error: string | null;
  width: number;
  height: number;
  tracks?: {
    id: number;
    type: 'audio' | 'sub';
    title: string;
    lang: string;
    codec: string;
    selected: boolean;
  }[];
  videoCodec?: string;
  audioCodec?: string;
  engineVersion?: string;
  audioDelay?: number;
  subtitleDelay?: number;
};
export type PlaybackCapabilities = {
  engine: string;
  localFiles: boolean;
  directHttps: boolean;
  nativeCodecs: boolean;
  audioTracks: boolean;
  frameStep: boolean;
  externalSubtitles: boolean;
};
export interface PlaybackAdapter {
  readonly capabilities: PlaybackCapabilities;
  openMedia(source: MediaSource): void;
  closeMedia(): void;
  play(): Promise<void>;
  pause(): void;
  stop(): void;
  seek(seconds: number): void;
  setVolume(value: number): void;
  setMuted(value: boolean): void;
  setPlaybackRate(value: number): void;
  subscribe(listener: (state: PlaybackState) => void): () => void;
  getPlaybackState(): PlaybackState;
  dispose(): void;
}
export const initialPlayback: PlaybackState = {
  status: 'idle',
  position: 0,
  duration: 0,
  volume: 0.8,
  muted: false,
  rate: 1,
  buffered: 0,
  error: null,
  width: 0,
  height: 0,
};
export function validateMediaUrl(input: string): {
  url: string;
  title: string;
  kind: 'direct' | 'manifest';
} {
  if (input.length > 8192) throw new Error('The URL is too long.');
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new Error('Enter a complete HTTPS media URL.');
  }
  if (url.protocol !== 'https:') throw new Error('Only HTTPS media URLs are supported.');
  if (url.port && url.port !== '443') throw new Error('HTTPS media must use port 443.');
  if (url.username || url.password)
    throw new Error('URLs containing credentials are not accepted.');
  const host = url.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host === '[::1]' ||
    host.startsWith('[') ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host)
  )
    throw new Error('Local-network and IP-literal URLs are not enabled in this build.');
  let title = 'Network media';
  try {
    title = decodeURIComponent(url.pathname.split('/').pop() || title);
  } catch {
    /* Keep a safe generic label. */
  }
  return {
    url: url.href,
    title: title.slice(0, 160),
    kind: /\.(m3u8?|mpd)$/i.test(url.pathname) ? 'manifest' : 'direct',
  };
}
export function timeLabel(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const total = Math.floor(seconds),
    hours = Math.floor(total / 3600),
    minutes = Math.floor(total / 60) % 60;
  return `${hours ? `${hours}:` : ''}${minutes.toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
}
