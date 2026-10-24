import type { MediaSource, PlaybackAdapter, PlaybackState } from '../core/media';
export type RecoveryState = { attempts: number; pending: boolean; exhausted: boolean };
/** Finite per-source retry budget. Explicit pause/stop cancels recovery. */
export class PlaybackRecovery {
  private timer?: ReturnType<typeof setTimeout>;
  private unsubscribe: () => void;
  private wanted = true;
  private disposed = false;
  private attempts = 0;
  private resumePosition = 0;
  private restoring = false;
  private pending = false;
  private timerKind: 'error' | 'stall' | null = null;
  constructor(
    private engine: PlaybackAdapter,
    private source: MediaSource,
    private report: (value: RecoveryState) => void,
  ) {
    this.unsubscribe = engine.subscribe((state) => this.observe(state));
  }
  start() {
    this.cancel();
    this.reportState();
    this.engine.openMedia(this.source);
    void this.engine.play();
  }
  private reportState() {
    this.report({
      attempts: this.attempts,
      pending: this.pending,
      exhausted: this.attempts >= 3 && !this.pending,
    });
  }
  private cancel() {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.pending = false;
    this.timerKind = null;
  }
  private observe(state: PlaybackState) {
    if (this.disposed || !this.wanted) return;
    if (
      this.restoring &&
      state.duration > 0 &&
      ['ready', 'playing', 'paused'].includes(state.status)
    ) {
      this.restoring = false;
      this.engine.seek(Math.min(this.resumePosition, Math.max(0, state.duration - 1)));
    }
    if (['playing', 'ended'].includes(state.status)) {
      this.cancel();
      this.reportState();
    }
    if (state.status === 'error' && this.timerKind === 'stall') this.cancel();
    if (this.source.kind !== 'url' || this.attempts >= 3 || this.timer) return;
    if (!['error', 'buffering', 'loading'].includes(state.status)) return;
    this.pending = true;
    this.timerKind = state.status === 'error' ? 'error' : 'stall';
    this.reportState();
    this.timer = setTimeout(
      () => {
        this.timer = undefined;
        this.timerKind = null;
        this.pending = false;
        if (this.disposed || !this.wanted) return;
        this.resumePosition = this.engine.getPlaybackState().position;
        this.restoring = this.resumePosition > 0;
        ++this.attempts;
        this.reportState();
        this.engine.openMedia(this.source);
        void this.engine.play();
      },
      state.status === 'error' ? 2000 * 2 ** this.attempts : 20000,
    );
  }
  pause() {
    this.wanted = false;
    this.cancel();
    this.reportState();
    this.engine.pause();
  }
  stop() {
    this.wanted = false;
    this.cancel();
    this.reportState();
    this.engine.stop();
  }
  play() {
    this.wanted = true;
    void this.engine.play();
  }
  retry() {
    this.cancel();
    this.attempts = 0;
    this.wanted = true;
    this.start();
  }
  dispose() {
    this.disposed = true;
    this.cancel();
    this.unsubscribe();
  }
}
