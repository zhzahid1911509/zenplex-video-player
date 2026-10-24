// @vitest-environment node
import { PassThrough } from 'node:stream';
import { describe, it, expect, vi } from 'vitest';
import { HostChannel } from '../apps/desktop/native/channel';
describe('private helper protocol', () => {
  it('correlates responses and decodes split UTF-8 events', async () => {
    const input = new PassThrough(),
      output = new PassThrough();
    const channel = new HostChannel(input, output);
    const request = channel.request('pause');
    const sent = JSON.parse(input.read().toString());
    output.write(JSON.stringify({ id: sent.id, ok: true }) + '\n');
    await request;
    const listener = vi.fn();
    channel.on('message', listener);
    const bytes = Buffer.from(JSON.stringify({ event: 'state', name: 'বাংলা' }) + '\n');
    output.write(bytes.subarray(0, 32));
    output.write(bytes.subarray(32));
    expect(listener).toHaveBeenCalledWith({ event: 'state', name: 'বাংলা' });
    channel.dispose();
  });
  it('rejects pending requests on disconnect without exposing engine error text', async () => {
    const input = new PassThrough(),
      output = new PassThrough();
    const channel = new HostChannel(input, output);
    const promise = channel.request('open', { source: 'https://example.com/?secret=x' });
    const result = expect(promise).rejects.toThrow('closed');
    channel.dispose();
    await result;
  });
  it('bounds outstanding requests', async () => {
    const c = new HostChannel(new PassThrough(), new PassThrough());
    const pending = Array.from({ length: 32 }, () => c.request('pause').catch(() => null));
    await expect(c.request('pause')).rejects.toThrow('full');
    c.dispose();
    await Promise.all(pending);
  });
  it('rejects malformed helper output', async () => {
    const output = new PassThrough(),
      c = new HostChannel(new PassThrough(), output);
    const p = expect(c.request('play')).rejects.toThrow('protocol');
    output.write('{bad}\n');
    await p;
  });
  it('times out stalled requests', async () => {
    const c = new HostChannel(new PassThrough(), new PassThrough(), 10);
    await expect(c.request('pause')).rejects.toThrow('timed out');
    c.dispose();
  });
  it('rejects oversized helper output', async () => {
    const output = new PassThrough(),
      c = new HostChannel(new PassThrough(), output);
    const p = expect(c.request('play')).rejects.toThrow('oversized');
    output.write('x'.repeat(1048577));
    await p;
  });
});
