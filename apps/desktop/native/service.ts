import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import type { BrowserWindow } from 'electron';
import { HostChannel } from './channel.js';
import {
  nativeStateSchema,
  type NativeCommand,
  type NativeEvent,
  type Viewport,
} from '../../../packages/native/protocol.js';
const empty = {
  status: 'loading' as const,
  position: 0,
  duration: 0,
  volume: 0.8,
  muted: false,
  rate: 1,
  buffered: 0,
  error: null,
  width: 0,
  height: 0,
  tracks: [],
  videoCodec: '',
  audioCodec: '',
  engineVersion: '',
  audioDelay: 0,
  subtitleDelay: 0,
};
export class NativeService {
  private child: ChildProcessWithoutNullStreams | null = null;
  private channel: HostChannel | null = null;
  private epoch = 0;
  private ready = false;
  private paused = false;
  private session = '';
  private viewportValue: Viewport = { x: 0, y: 0, width: 1, height: 1, visible: false };
  private preferences: NativeCommand[] = [
    { op: 'volume', value: 0.8 },
    { op: 'rate', value: 1 },
    { op: 'mute', value: false },
    { op: 'fit', value: 'contain' },
  ];
  constructor(
    private window: BrowserWindow,
    readonly directory: string,
  ) {}
  async available(): Promise<boolean> {
    if (process.platform !== 'win32' || process.arch !== 'x64') return false;
    try {
      await Promise.all(
        ['zenplex-player-host.exe', 'mpv-2.dll', 'input.conf'].map((name) =>
          access(path.join(this.directory, name), constants.R_OK),
        ),
      );
      return true;
    } catch {
      return false;
    }
  }
  private publish(event: NativeEvent) {
    if (!this.window.isDestroyed()) this.window.webContents.send('zenplex:native-event', event);
  }
  private fail(message: string, epoch: number) {
    if (epoch !== this.epoch) return;
    this.publish({ session: this.session, state: { ...empty, status: 'error', error: message } });
  }
  private terminate() {
    const channel = this.channel,
      child = this.child;
    this.channel = null;
    this.child = null;
    this.ready = false;
    channel?.dispose();
    if (child) {
      child.stdin.end();
      const timer = setTimeout(() => child.kill(), 1500);
      timer.unref();
      child.once('exit', () => clearTimeout(timer));
    }
  }
  async open(source: string, session: string) {
    const epoch = ++this.epoch;
    this.terminate();
    this.session = session;
    this.paused = false;
    this.publish({ session, state: { ...empty } });
    if (!(await this.available())) {
      this.fail(
        'Native runtime is missing. Follow docs/WINDOWS_NATIVE.md, then restart ZenPlex.',
        epoch,
      );
      return;
    }
    if (epoch !== this.epoch) return;
    const handle = this.window.getNativeWindowHandle();
    const parent =
      handle.length >= 8 ? handle.readBigUInt64LE().toString() : handle.readUInt32LE().toString();
    const child = spawn(path.join(this.directory, 'zenplex-player-host.exe'), [parent], {
      cwd: this.directory,
      windowsHide: true,
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.child = child;
    // Decoder stderr can contain signed URLs or local paths. Drain it without retaining/logging it.
    child.stderr.resume();
    // Keep pipe error listeners installed through teardown; active failures are also handled by HostChannel.
    child.stdin.on('error', () => {
      if (epoch === this.epoch) this.fail('Native input pipe closed.', epoch);
    });
    child.stdout.on('error', () => {
      if (epoch === this.epoch) this.fail('Native output pipe closed.', epoch);
    });
    const channel = new HostChannel(child.stdin, child.stdout);
    this.channel = channel;
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => finish(new Error('Native engine initialization timed out.')),
          10000,
        );
        const finish = (error?: Error) => {
          clearTimeout(timer);
          channel.off('message', ready);
          channel.off('disconnect', lost);
          child.off('error', lost);
          child.off('exit', exit);
          if (error) reject(error);
          else resolve();
        };
        const lost = () =>
          finish(
            new Error(
              'Native helper could not start. Check its DLL dependencies and architecture.',
            ),
          );
        const exit = () => lost();
        const ready = (message: Record<string, unknown>) => {
          if (message.event === 'ready' && message.protocol === 1) finish();
          else if (message.event === 'fatal')
            finish(
              new Error(
                'Native engine initialization failed. Check mpv-2.dll and runtime dependencies.',
              ),
            );
        };
        channel.on('message', ready);
        channel.once('disconnect', lost);
        child.once('error', lost);
        child.once('exit', exit);
      });
      if (epoch !== this.epoch) return;
      this.ready = true;
      channel.on('message', (message) => {
        if (epoch !== this.epoch) return;
        if (message.event === 'state') {
          const parsed = nativeStateSchema.safeParse(message.state);
          if (parsed.success) this.publish({ session, state: parsed.data });
          else {
            this.fail('Native engine returned invalid state data.', epoch);
            ++this.epoch;
            this.terminate();
          }
        } else if (
          message.event === 'shortcut' &&
          ['fullscreen', 'toggle', 'back', 'forward', 'mute', 'escape'].includes(
            String(message.shortcut),
          )
        )
          this.publish({ session, shortcut: message.shortcut as 'fullscreen' });
      });
      channel.once('disconnect', () => {
        if (epoch === this.epoch) {
          this.fail(
            'Native playback stopped unexpectedly. Reopen the media to restart the engine.',
            epoch,
          );
          ++this.epoch;
          this.terminate();
        }
      });
      child.once('error', () => this.fail('Native helper failed.', epoch));
      child.once('exit', () => {
        if (epoch === this.epoch) {
          this.fail(
            'Native playback stopped unexpectedly. Reopen the media to restart the engine.',
            epoch,
          );
          ++this.epoch;
          this.terminate();
        }
      });
      await channel.request('viewport', this.viewportValue);
      for (const preference of this.preferences) {
        const { op, ...args } = preference;
        await channel.request(op, args);
      }
      await channel.request('open', {
        source,
        adaptive: /^https:\/\//i.test(source) && /\.(m3u8|mpd)(?:[?#]|$)/i.test(source),
      });
      await channel.request(this.paused ? 'pause' : 'play');
    } catch (error) {
      if (epoch === this.epoch) {
        this.fail(error instanceof Error ? error.message : 'Native playback failed.', epoch);
        ++this.epoch;
        this.terminate();
      }
    }
  }
  async command(command: NativeCommand) {
    if (command.op === 'close') {
      ++this.epoch;
      this.terminate();
      return;
    }
    if (['volume', 'rate', 'mute', 'fit'].includes(command.op)) {
      this.preferences = [...this.preferences.filter((item) => item.op !== command.op), command];
      // Apply preferences during startup in open(); do not send before libmpv initialization.
    }
    if (command.op === 'play') this.paused = false;
    if (command.op === 'pause' || command.op === 'stop') this.paused = true;
    if (!this.channel || !this.ready) return;
    const { op, ...args } = command;
    await this.channel.request(op, args);
  }
  async viewport(value: Viewport) {
    this.viewportValue = value;
    if (this.channel && this.ready) await this.channel.request('viewport', value);
  }
  async subtitle(file: string) {
    if (!this.channel) throw new Error('Open media before adding subtitles.');
    await this.channel.request('subtitleFile', { path: file });
  }
  dispose() {
    ++this.epoch;
    this.terminate();
  }
}
