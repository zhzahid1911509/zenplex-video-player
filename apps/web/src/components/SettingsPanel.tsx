import { useRef, useState } from 'react';
import { Download, Upload, RotateCcw } from 'lucide-react';
import { defaults, parseSettings, type Settings } from '../../../../packages/settings';
import { useSettings } from '../state/settings';
export function SettingsPanel() {
  const { settings, update, replace, reset } = useSettings();
  const [message, setMessage] = useState('');
  const input = useRef<HTMLInputElement>(null);
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 65536) throw new Error();
      replace(parseSettings(await file.text()));
      setMessage('Settings imported.');
    } catch {
      setMessage('Import failed: choose a valid ZenPlex settings JSON file under 64 KiB.');
    }
  }
  function exportSettings() {
    const data = {
      ...settings,
      volume: settings.rememberVolume ? settings.volume : defaults.volume,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'zenplex-settings.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('Settings exported. No credentials or media URLs are included.');
  }
  return (
    <section className="settings-grid" aria-label="Settings">
      <div className="card">
        <span className="eyebrow">MAKE IT YOURS</span>
        <h2>Appearance</h2>
        <label>
          Theme
          <select
            value={settings.theme}
            onChange={(e) => update({ theme: e.target.value as Settings['theme'] })}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">Follow system</option>
          </select>
        </label>
        <label>
          Accent
          <select
            value={settings.accent}
            onChange={(e) => update({ accent: e.target.value as Settings['accent'] })}
          >
            <option value="violet">Violet</option>
            <option value="teal">Teal</option>
          </select>
        </label>
        <label>
          Density
          <select
            value={settings.density}
            onChange={(e) => update({ density: e.target.value as Settings['density'] })}
          >
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
          </select>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={settings.reducedMotion}
            onChange={(e) => update({ reducedMotion: e.target.checked })}
          />
          Reduce animation
        </label>
      </div>
      <div className="card">
        <span className="eyebrow">YOUR DEFAULTS</span>
        <h2>Playback</h2>
        <label>
          Default speed
          <select
            value={settings.playbackRate}
            onChange={(e) => update({ playbackRate: Number(e.target.value) })}
          >
            {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3].map((rate) => (
              <option key={rate} value={rate}>
                {rate}×
              </option>
            ))}
          </select>
        </label>
        <label>
          Video fit
          <select
            value={settings.fit}
            onChange={(e) => update({ fit: e.target.value as Settings['fit'] })}
          >
            <option value="contain">Fit — preserve the full image</option>
            <option value="cover">Fill — crop to the frame</option>
            <option value="fill">Stretch — match the frame</option>
          </select>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={settings.rememberVolume}
            onChange={(e) => update({ rememberVolume: e.target.checked })}
          />
          Remember volume between sessions
        </label>
        <p className="muted">
          Native audio tracks, filters, and AI provider settings arrive in later phases. This build
          stores no API credentials.
        </p>
      </div>
      <div className="card wide">
        <h2>Settings backup</h2>
        <p className="muted">
          Export your preferences, move them to another installation, or restore the defaults.
        </p>
        <div className="actions">
          <button onClick={exportSettings}>
            <Download size={17} />
            Export JSON
          </button>
          <button onClick={() => input.current?.click()}>
            <Upload size={17} />
            Import JSON
          </button>
          <button
            onClick={() => {
              reset();
              setMessage('Default settings restored.');
            }}
          >
            <RotateCcw size={17} />
            Restore defaults
          </button>
        </div>
        <input
          hidden
          ref={input}
          type="file"
          accept=".json,application/json"
          onChange={(e) => {
            void importFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <p role="status">{message}</p>
      </div>
    </section>
  );
}
