import { EventEmitter } from 'node:events';
import { StringDecoder } from 'node:string_decoder';
import type { Readable, Writable } from 'node:stream';
/** A private stdin/stdout RPC channel. No listening socket or shell command surface. */
export class HostChannel extends EventEmitter {
  private sequence = 0;
  private decoder = new StringDecoder('utf8');
  private buffer = '';
  private pending = new Map<
    number,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  private closed = false;
  private readonly onData = (chunk: Buffer) => this.receive(chunk);
  private readonly onEnd = () => this.dispose(new Error('Native helper disconnected.'));
  constructor(
    private input: Writable,
    private output: Readable,
    private timeout = 10000,
  ) {
    super();
    output.on('data', this.onData);
    output.on('end', this.onEnd);
    output.on('error', this.onEnd);
    input.on('error', this.onEnd);
  }
  request(op: string, args: Record<string, unknown> = {}): Promise<unknown> {
    if (this.closed) return Promise.reject(new Error('Native helper is unavailable.'));
    if (this.pending.size >= 32) return Promise.reject(new Error('Native command queue is full.'));
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('Native command timed out.'));
      }, this.timeout);
      this.pending.set(id, { resolve, reject, timer });
      const line = JSON.stringify({ id, op, ...args }) + '\n';
      if (Buffer.byteLength(line) > 65536) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(new Error('Native request too large.'));
        return;
      }
      this.input.write(line, (error) => {
        if (error) this.dispose(new Error('Native helper disconnected.'));
      });
    });
  }
  private receive(chunk: Buffer) {
    this.buffer += this.decoder.write(chunk);
    if (Buffer.byteLength(this.buffer) > 1048576) {
      this.dispose(new Error('Native helper sent an oversized message.'));
      return;
    }
    let end: number;
    while ((end = this.buffer.indexOf('\n')) >= 0) {
      const line = this.buffer.slice(0, end);
      this.buffer = this.buffer.slice(end + 1);
      let message: Record<string, unknown>;
      try {
        const parsed: unknown = JSON.parse(line);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error();
        message = parsed as Record<string, unknown>;
      } catch {
        this.dispose(new Error('Native protocol error.'));
        return;
      }
      if (typeof message.id === 'number') {
        const waiter = this.pending.get(message.id);
        if (!waiter) continue;
        clearTimeout(waiter.timer);
        this.pending.delete(message.id);
        if (message.ok === true) waiter.resolve(message.data);
        else waiter.reject(new Error('The native engine rejected the operation.'));
      } else if (typeof message.event === 'string') this.emit('message', message);
    }
  }
  dispose(error = new Error('Native helper closed.')) {
    if (this.closed) return;
    this.closed = true;
    this.output.off('data', this.onData);
    this.output.off('end', this.onEnd);
    this.output.off('error', this.onEnd);
    this.input.off('error', this.onEnd);
    for (const waiter of this.pending.values()) {
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
    this.pending.clear();
    this.emit('disconnect', error);
    this.removeAllListeners();
  }
}
