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
    this.video.pause();
    this.update({
      ...initialPlayback,
      status: 'loading',
      volume: this.video.volume,
      muted: this.video.muted,
      rate: this.video.playbackRate,
    });
    this.video.src = source.url;
    this.video.load();
  }
  closeMedia() {
    this.generation++;
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
    try {
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
    this.video.pause();
  }
  stop() {
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
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
    this.listeners.clear();
    this.video.pause();
    this.video.removeAttribute('src');
    this.video.load();
  }
}
