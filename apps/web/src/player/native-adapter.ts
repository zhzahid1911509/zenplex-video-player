import {
  initialPlayback,
  type MediaSource,
  type PlaybackAdapter,
  type PlaybackState,
} from '../../../../packages/core/media';
import type { DesktopBridge, NativeCommand, Viewport } from '../../../../packages/native/protocol';
export class NativePlaybackAdapter implements PlaybackAdapter {
  readonly capabilities = {
    engine: 'libmpv',
    localFiles: true,
    directHttps: true,
    nativeCodecs: true,
    audioTracks: true,
    frameStep: true,
    externalSubtitles: true,
  };
  private state: PlaybackState = { ...initialPlayback, tracks: [] };
  private listeners = new Set<(state: PlaybackState) => void>();
  private session = '';
  private disposed = false;
  private unsubscribe: () => void;
  constructor(
    private bridge: DesktopBridge,
    private shortcut: (key: string) => void,
  ) {
    this.unsubscribe = bridge.onNativeEvent((event) => {
      if (this.disposed || event.session !== this.session) return;
      if ('state' in event) this.update(event.state);
      else this.shortcut(event.shortcut);
    });
  }
  private update(patch: Partial<PlaybackState>) {
    if (this.disposed) return;
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener({ ...this.state }));
  }
  private error() {
    this.update({
      status: 'error',
      error:
        'Native playback operation failed. Check Diagnostics or reopen the media. No source URL was logged.',
    });
  }
  private async send(command: NativeCommand) {
    const session = this.session;
    try {
      await this.bridge.command(command);
      return true;
    } catch {
      if (session === this.session) this.error();
      return false;
    }
  }
  openMedia(source: MediaSource) {
    this.session = crypto.randomUUID();
    const session = this.session;
    this.update({
      ...initialPlayback,
      volume: this.state.volume,
      rate: this.state.rate,
      muted: this.state.muted,
      status: 'loading',
      tracks: [],
    });
    if (source.kind === 'file' && !source.nativeToken) {
      this.error();
      return;
    }
    const input =
      source.kind === 'file'
        ? { kind: 'file' as const, token: source.nativeToken!, session }
        : { kind: 'url' as const, url: source.url, session };
    void this.bridge.open(input).catch(() => {
      if (session === this.session) this.error();
    });
  }
  closeMedia() {
    this.session = '';
    void this.send({ op: 'close' });
    this.update({
      ...initialPlayback,
      tracks: [],
      volume: this.state.volume,
      rate: this.state.rate,
      muted: this.state.muted,
    });
  }
  async play() {
    await this.send({ op: 'play' });
  }
  pause() {
    void this.send({ op: 'pause' });
  }
  stop() {
    void this.send({ op: 'stop' });
  }
  seek(value: number) {
    if (Number.isFinite(value))
      void this.send({
        op: 'seek',
        value: Math.max(0, Math.min(value, this.state.duration || value)),
      });
  }
  setVolume(value: number) {
    if (!Number.isFinite(value)) return;
    const target = Math.max(0, Math.min(1, value));
    void this.send({ op: 'volume', value: target }).then((ok) => {
      if (ok) this.update({ volume: target });
    });
  }
  setMuted(value: boolean) {
    void this.send({ op: 'mute', value }).then((ok) => {
      if (ok) this.update({ muted: value });
    });
  }
  setPlaybackRate(value: number) {
    if (!Number.isFinite(value)) return;
    const target = Math.max(0.25, Math.min(3, value));
    void this.send({ op: 'rate', value: target }).then((ok) => {
      if (ok) this.update({ rate: target });
    });
  }
  command(command: NativeCommand) {
    return this.send(command);
  }
  async viewport(value: Viewport) {
    try {
      await this.bridge.viewport(value);
    } catch {
      this.error();
    }
  }
  async loadSubtitle() {
    try {
      return await this.bridge.pickSubtitle();
    } catch {
      this.error();
      return false;
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
    this.disposed = true;
    this.session = '';
    this.unsubscribe();
    this.listeners.clear();
    void this.bridge.command({ op: 'close' }).catch(() => {});
  }
}
