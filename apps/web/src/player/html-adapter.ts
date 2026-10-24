import { classifyUrl } from '../../../../packages/streaming/playlist';
import {
  initialPlayback,
  type MediaSource,
  type PlaybackAdapter,
  type PlaybackState,
  type PlaybackStatus,
} from '../../../../packages/core/media';
export class HtmlMediaAdapter implements PlaybackAdapter {
  readonly capabilities = {
    engine: 'HTML media',
    localFiles: true,
    directHttps: true,
    nativeCodecs: false,
    audioTracks: false,
    frameStep: false,
    externalSubtitles: false,
  };
  private state = { ...initialPlayback };
  private listeners = new Set<(state: PlaybackState) => void>();
  private cleanups: (() => void)[] = [];
  private disposed = false;
  private generation = 0;
  private playIntent = 0;
  private streamCleanup?: () => void;
  private streamReady: Promise<void> = Promise.resolve();
  constructor(private video: HTMLVideoElement) {
    const statuses: Partial<Record<keyof HTMLMediaElementEventMap, PlaybackStatus>> = {
      loadstart: 'loading',
      loadedmetadata: 'ready',
      playing: 'playing',
      pause: 'paused',
      waiting: 'buffering',
      ended: 'ended',
    };
    for (const [event, status] of Object.entries(statuses))
      this.on(event, () => {
        if (this.state.status !== 'idle' && this.state.status !== 'error') this.update({ status });
      });
    for (const event of [
      'timeupdate',
      'durationchange',
      'progress',
      'volumechange',
      'ratechange',
      'seeked',
      'loadedmetadata',
    ])
      this.on(event, () => this.sync());
    this.on('error', () => {
      const messages: Record<number, string> = {
        1: 'Playback was interrupted.',
        2: 'Media could not be loaded. Check the connection, server access, and URL expiry.',
        3: 'The media decoder failed. This file may be damaged or use an unsupported codec.',
        4: 'This media source or codec is not supported by this browser engine.',
      };
      this.update({
        status: 'error',
        error: messages[video.error?.code ?? 4] ?? 'Playback failed.',
      });
    });
  }
  private on(event: string, listener: () => void) {
    this.video.addEventListener(event, listener);
    this.cleanups.push(() => this.video.removeEventListener(event, listener));
  }
  private update(patch: Partial<PlaybackState>) {
    if (this.disposed) return;
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener({ ...this.state }));
  }
  private sync() {
    const v = this.video;
    let buffered = 0;
    for (let i = 0; i < v.buffered.length; i++)
      if (v.buffered.start(i) <= v.currentTime && v.buffered.end(i) >= v.currentTime)
        buffered = v.buffered.end(i);
    this.update({
      position: v.currentTime,
      duration: Number.isFinite(v.duration) ? v.duration : 0,
      volume: v.volume,
      muted: v.muted,
      rate: v.playbackRate,
      buffered,
      width: v.videoWidth,
      height: v.videoHeight,
    });
  }
  openMedia(source: MediaSource) {
    this.generation++;
    this.streamCleanup?.();
    this.streamCleanup = undefined;
    this.video.pause();
    this.update({
      ...initialPlayback,
      status: 'loading',
      volume: this.video.volume,
      muted: this.video.muted,
      rate: this.video.playbackRate,
    });
    const kind = source.kind === 'url' ? (source.streamType ?? classifyUrl(source.url)) : 'direct';
    if (kind === 'hls' || kind === 'dash') {
      const generation = this.generation;
      this.video.removeAttribute('src');
      this.video.load();
      this.streamReady = this.attachStream(kind, source.url, generation).catch(() => {
        if (generation === this.generation && !this.disposed)
          this.update({
            status: 'error',
            error:
              'Streaming could not initialize. Check browser codec support, HTTPS access, and CORS permissions.',
          });
      });
    } else {
      this.streamReady = Promise.resolve();
      this.video.src = source.url;
      this.video.load();
    }
  }
  private async attachStream(kind: 'hls' | 'dash', url: string, generation: number) {
    const current = () => !this.disposed && generation === this.generation;
    const fail = () => {
      if (current())
        this.update({
          status: 'error',
          error:
            'Stream loading failed. Check network access, URL expiry, CORS, and supported codecs.',
        });
    };
    if (kind === 'hls') {
      if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
        this.video.src = url;
        this.video.load();
        return;
      }
      const { default: Hls } = await import('hls.js');
      if (!current()) return;
      if (!Hls.isSupported()) throw new Error('HLS unsupported');
      const hls = new Hls({ enableWorker: false, maxBufferLength: 30, backBufferLength: 30 });
      this.streamCleanup = () => hls.destroy();
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) fail();
      });
      hls.attachMedia(this.video);
      hls.loadSource(url);
    } else {
      const { MediaPlayer } = await import('dashjs');
      if (!current()) return;
      const player = MediaPlayer().create();
      this.streamCleanup = () => player.reset();
      player.updateSettings({
        debug: { logLevel: 0 },
        streaming: {
          retryAttempts: { MPD: 1, MediaSegment: 2 },
          buffer: { bufferTimeDefault: 20, bufferToKeep: 20 },
        },
      });
      player.on(MediaPlayer.events.ERROR, fail);
      player.initialize(this.video, url, false);
    }
  }
  closeMedia() {
    this.generation++;
    this.streamCleanup?.();
    this.streamCleanup = undefined;
    this.video.pause();
    this.video.removeAttribute('src');
    this.video.load();
    this.update({
      ...initialPlayback,
      volume: this.video.volume,
      rate: this.video.playbackRate,
      muted: this.video.muted,
    });
  }
  async play() {
    const generation = this.generation;
    const intent = ++this.playIntent;
    try {
      await this.streamReady;
      if (
        intent !== this.playIntent ||
        generation !== this.generation ||
        this.disposed ||
        this.state.status === 'error'
      )
        return;
      await this.video.play();
    } catch (error) {
      if (generation !== this.generation || this.disposed) return;
      if (error instanceof DOMException && error.name === 'AbortError') return;
      this.update({
        status: 'error',
        error: 'Playback could not start. Press Play again, or open a compatible file.',
      });
    }
  }
  pause() {
    ++this.playIntent;
    this.video.pause();
  }
  stop() {
    ++this.playIntent;
    this.video.pause();
    if (this.video.readyState > 0) this.video.currentTime = 0;
    this.update({ status: 'paused', position: 0 });
  }
  seek(seconds: number) {
    if (Number.isFinite(seconds) && this.state.duration > 0) {
      this.video.currentTime = Math.max(0, Math.min(seconds, this.state.duration));
      this.sync();
    }
  }
  setVolume(value: number) {
    if (Number.isFinite(value)) {
      this.video.volume = Math.max(0, Math.min(1, value));
      this.sync();
    }
  }
  setMuted(value: boolean) {
    this.video.muted = value;
    this.sync();
  }
  setPlaybackRate(value: number) {
    if (Number.isFinite(value)) {
      this.video.playbackRate = Math.max(0.25, Math.min(3, value));
      this.sync();
    }
  }
  getPlaybackState() {
    return { ...this.state };
  }
  subscribe(listener: (state: PlaybackState) => void) {
    this.listeners.add(listener);
    listener(this.getPlaybackState());
    return () => {
      this.listeners.delete(listener);
    };
  }
  dispose() {
    this.generation++;
    this.disposed = true;
    this.streamCleanup?.();
    this.streamCleanup = undefined;
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
    this.listeners.clear();
    this.video.pause();
    this.video.removeAttribute('src');
    this.video.load();
  }
}
