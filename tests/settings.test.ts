import { describe, it, expect } from 'vitest';
import {
  defaults,
  loadSettings,
  parseSettings,
  saveSettings,
  SETTINGS_KEY,
} from '../packages/settings';
describe('settings persistence and validation', () => {
  it('round-trips settings without losing appearance preferences', () => {
    const storage = new Map<string, string>();
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    };
    saveSettings(adapter, { ...defaults, theme: 'light', volume: 0.3 });
    expect(loadSettings(adapter).settings).toEqual({ ...defaults, theme: 'light', volume: 0.3 });
  });
  it('does not persist a session volume when disabled', () => {
    let raw = '';
    saveSettings(
      {
        getItem: () => null,
        setItem: (_key, value) => {
          raw = value;
        },
      },
      { ...defaults, volume: 0.1, rememberVolume: false },
    );
    expect(JSON.parse(raw).volume).toBe(defaults.volume);
  });
  it('preserves corrupted storage and warns', () => {
    const storage = {
      getItem: () => '{bad',
      setItem: () => {
        throw Error('must not write');
      },
    };
    expect(loadSettings(storage)).toEqual({
      settings: defaults,
      warning: expect.stringContaining('not been overwritten'),
    });
  });
  it('handles denied storage access', () => {
    expect(
      loadSettings({
        getItem: () => {
          throw Error('denied');
        },
        setItem: () => {},
      }).warning,
    ).toBeTruthy();
  });
  it('migrates v0 appearance preferences', () => {
    expect(parseSettings('{"version":0,"theme":"light"}')).toEqual({ ...defaults, theme: 'light' });
  });
  it.each([
    { ...defaults, volume: 2 },
    { ...defaults, version: 99 },
    { ...defaults, apiKey: 'secret' },
    { ...defaults, theme: 'invalid' },
    { ...defaults, playbackRate: -1 },
  ])('rejects invalid or unrecognized fields', (value) =>
    expect(() => parseSettings(JSON.stringify(value))).toThrow(),
  );
  it('rejects oversized imports', () =>
    expect(() => parseSettings(' '.repeat(65537))).toThrow('64 KiB'));
  it('uses a versioned storage key', () => expect(SETTINGS_KEY).toBe('zenplex.settings.v1'));
});
