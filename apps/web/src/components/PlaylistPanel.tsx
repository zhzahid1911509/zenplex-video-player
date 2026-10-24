import { useEffect, useRef, useState } from 'react';
import type { MediaSource } from '../../../../packages/core/media';
import {
  fetchPlaylist,
  MAX_PLAYLIST_BYTES,
  parseM3u,
} from '../../../../packages/streaming/playlist';
export function PlaylistPanel({ onImport }: { onImport: (items: MediaSource[]) => void }) {
  const [url, setUrl] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);
  useEffect(
    () => () => {
      ++generation.current;
      request.current?.abort();
    },
    [],
  );
  async function run(file?: File) {
    const epoch = ++generation.current;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const timer = setTimeout(() => controller.abort(), 15000);
    setBusy(true);
    setMessage('');
    try {
      if (file && file.size > MAX_PLAYLIST_BYTES)
        throw new Error('Playlist exceeds the 2 MiB limit.');
      const result = file
        ? parseM3u(await file.text())
        : await fetchPlaylist(url, controller.signal);
      if (epoch !== generation.current) return;
      if (controller.signal.aborted) throw new Error('Import cancelled or timed out.');
      onImport(result.items);
      setMessage(
        `Parsed ${result.items.length} channels; ${result.skipped} duplicate, invalid, or excess entries skipped.`,
      );
    } catch (error) {
      if (epoch === generation.current)
        setMessage(
          error instanceof Error && !controller.signal.aborted
            ? file
              ? error.message
              : 'Could not import the URL. Check HTTPS access, CORS, format, and the 2 MiB limit.'
            : 'Import cancelled or timed out.',
        );
    } finally {
      clearTimeout(timer);
      if (epoch === generation.current) setBusy(false);
    }
  }
  return (
    <div className="card playlist-import">
      <h2>Import channels</h2>
      <p className="muted">
        Extended M3U · Up to 200 channels · 2 MiB maximum. URLs and favorites stay in this session.
      </p>
      <label>
        Playlist file
        <input
          type="file"
          accept=".m3u,.m3u8"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void run(file);
            e.target.value = '';
          }}
        />
      </label>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
      >
        <label>
          Playlist URL
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/channels.m3u"
          />
        </label>
        <button type="submit" disabled={busy}>
          Import playlist URL
        </button>
        {busy && (
          <button type="button" onClick={() => request.current?.abort()}>
            Cancel import
          </button>
        )}
      </form>
      <p className="muted small">
        Remote lists must permit CORS; redirects are rejected. Local lists require absolute HTTPS
        entries. Import does not start playback or load channel logos.
      </p>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
