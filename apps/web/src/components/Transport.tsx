import { RangeControl } from './RangeControl';
import { useEffect, useState } from 'react';
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
} from 'lucide-react';
import { timeLabel, type PlaybackState } from '../../../../packages/core/media';
export function Transport({
  state,
  enabled,
  onToggle,
  onStop,
  onSeek,
  onVolume,
  onMute,
  onRate,
  onFullscreen,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}: {
  state: PlaybackState;
  enabled: boolean;
  onToggle: () => void;
  onStop: () => void;
  onSeek: (value: number) => void;
  onVolume: (value: number) => void;
  onMute: () => void;
  onRate: (value: number) => void;
  onFullscreen: () => void;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}) {
  const [rate, setRate] = useState(state.rate);
  useEffect(() => setRate(state.rate), [state.rate]);
  return (
    <div className="transport">
      <div className="timeline">
        <span>{timeLabel(state.position)}</span>
        <RangeControl
          aria-label="Seek"
          type="range"
          min="0"
          max={state.duration || 1}
          step="0.1"
          value={Math.min(state.position, state.duration || 1)}
          disabled={!enabled || !state.duration}
          onValue={onSeek}
        />
        <span>{timeLabel(state.duration)}</span>
      </div>
      <div className="transport-row">
        <div className="row">
          <button
            className="icon"
            aria-label="Previous media"
            disabled={!hasPrevious}
            onClick={onPrevious}
          >
            <SkipBack size={19} />
          </button>
          <button
            className="play-button"
            aria-label={state.status === 'playing' ? 'Pause' : 'Play'}
            disabled={!enabled}
            onClick={onToggle}
          >
            {state.status === 'playing' ? <Pause size={23} /> : <Play size={23} />}
          </button>
          <button className="icon" aria-label="Next media" disabled={!hasNext} onClick={onNext}>
            <SkipForward size={19} />
          </button>
          <button className="icon" aria-label="Stop" disabled={!enabled} onClick={onStop}>
            <Square size={17} />
          </button>
          <span className="divider" />
          <button className="icon" aria-label={state.muted ? 'Unmute' : 'Mute'} onClick={onMute}>
            {state.muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          <RangeControl
            className="volume"
            aria-label="Volume"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={state.muted ? 0 : state.volume}
            onValue={onVolume}
          />
        </div>
        <div className="row">
          <select
            aria-label="Playback speed"
            value={rate}
            onChange={(e) => {
              const value = Number(e.target.value);
              setRate(value);
              onRate(value);
            }}
          >
            {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3].map((rate) => (
              <option key={rate} value={rate}>
                {rate}×
              </option>
            ))}
          </select>
          <button
            className="icon"
            aria-label="Fullscreen"
            onClick={onFullscreen}
            disabled={!enabled}
          >
            <Maximize size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
