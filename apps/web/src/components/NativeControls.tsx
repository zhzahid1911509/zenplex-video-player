import { useEffect, useState } from 'react';
import type { PlaybackState } from '../../../../packages/core/media';
import type { NativePlaybackAdapter } from '../player/native-adapter';
export function NativeControls({
  engine,
  state,
  onDialog,
}: {
  engine: NativePlaybackAdapter;
  state: PlaybackState;
  onDialog: (value: boolean) => void;
}) {
  const [message, setMessage] = useState('');
  const tracks = state.tracks ?? [];
  const audio = tracks.filter((t) => t.type === 'audio'),
    subtitles = tracks.filter((t) => t.type === 'sub');
  const currentAudio = audio.find((t) => t.selected)?.id ?? '';
  const currentSubtitle = subtitles.find((t) => t.selected)?.id ?? 0;
  const [audioId, setAudioId] = useState<number | string>(currentAudio);
  const [subtitleId, setSubtitleId] = useState(currentSubtitle);
  useEffect(() => setAudioId(currentAudio), [currentAudio]);
  useEffect(() => setSubtitleId(currentSubtitle), [currentSubtitle]);
  return (
    <section className="native-controls card" aria-label="Native playback controls">
      <div className="native-controls-grid">
        <label>
          Audio track
          <select
            aria-label="Audio track"
            disabled={!audio.length}
            value={audioId}
            onChange={(e) => {
              const value = Number(e.target.value);
              setAudioId(value);
              void engine.command({ op: 'audio', value });
            }}
          >
            {!audio.length && <option value="">No audio track</option>}
            {audio.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title || `Track ${t.id}`} {t.lang && `(${t.lang})`} {t.codec}
              </option>
            ))}
          </select>
        </label>
        <label>
          Subtitle track
          <select
            aria-label="Subtitle track"
            value={subtitleId}
            onChange={(e) => {
              const value = Number(e.target.value);
              setSubtitleId(value);
              void engine.command({ op: 'subtitle', value });
            }}
          >
            <option value={0}>Off</option>
            {subtitles.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title || `Subtitle ${t.id}`} {t.lang && `(${t.lang})`}
              </option>
            ))}
          </select>
        </label>
        <DelayField
          label="Audio delay"
          value={state.audioDelay ?? 0}
          limit={10}
          apply={(value) => void engine.command({ op: 'audioDelay', value })}
        />
        <DelayField
          label="Subtitle delay"
          value={state.subtitleDelay ?? 0}
          limit={60}
          apply={(value) => void engine.command({ op: 'subtitleDelay', value })}
        />
      </div>
      <p className="muted small">Delay edits apply when you leave the field or press Enter.</p>
      <div className="actions">
        <button
          onClick={async () => {
            onDialog(true);
            try {
              const loaded = await engine.loadSubtitle();
              if (loaded) setMessage('Subtitle added to the native player.');
            } finally {
              onDialog(false);
            }
          }}
        >
          Load subtitle file
        </button>
        <button onClick={() => void engine.command({ op: 'frameStep' })}>Step one frame</button>
        <span className="muted small">
          {state.videoCodec || 'Audio-only / awaiting metadata'} · {state.engineVersion || 'libmpv'}
        </span>
      </div>
      <p role="status" className="small">
        {message}
      </p>
    </section>
  );
}

function DelayField({
  label,
  value,
  limit,
  apply,
}: {
  label: string;
  value: number;
  limit: number;
  apply: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return (
    <label>
      {label} (seconds)
      <input
        aria-label={label}
        type="number"
        min={-limit}
        max={limit}
        step={0.1}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        onBlur={() => {
          const parsed = Number(draft);
          if (draft.trim() && Number.isFinite(parsed)) {
            const next = Math.max(-limit, Math.min(limit, parsed));
            setDraft(String(next));
            apply(next);
          } else setDraft(String(value));
        }}
      />
    </label>
  );
}
