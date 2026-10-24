import { Check } from 'lucide-react';
import type { PlaybackState } from '../../../../packages/core/media';
export function DiagnosticsPage({ state }: { state: PlaybackState }) {
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">CLEAR, NOT COMPLICATED</span>
          <h1>Playback diagnostics</h1>
          <p className="muted">
            Live values from the active engine. Media URLs are not shown or logged.
          </p>
        </div>
      </div>
      <div className="settings-grid">
        <div className="card">
          <h2>Session</h2>
          <dl>
            <dt>Engine</dt>
            <dd>HTML media</dd>
            <dt>State</dt>
            <dd>{state.status}</dd>
            <dt>Resolution</dt>
            <dd>{state.width ? `${state.width} × ${state.height}` : 'Not available'}</dd>
            <dt>Buffered ahead</dt>
            <dd>{Math.max(0, state.buffered - state.position).toFixed(1)} s</dd>
            <dt>Speed</dt>
            <dd>{state.rate}×</dd>
            <dt>Native mpv integration</dt>
            <dd>Not installed in Phase 2</dd>
          </dl>
        </div>
        <div className="card">
          <h2>Capabilities</h2>
          <ul className="capabilities">
            <li>
              <Check size={17} />
              Compatible local media
            </li>
            <li>
              <Check size={17} />
              Direct HTTPS playback
            </li>
            <li>
              <Check size={17} />
              Seek, volume, speed, fullscreen
            </li>
          </ul>
          <p className="muted">
            HLS/DASH adapters, track selection, automatic recovery, and FFmpeg inspection are not
            implemented yet.
          </p>
          {state.error && <p className="error-text">{state.error}</p>}
        </div>
      </div>
    </>
  );
}
