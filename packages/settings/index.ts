import { z } from 'zod';
export const settingsSchema = z
  .object({
    version: z.literal(1),
    theme: z.enum(['dark', 'light', 'system']),
    accent: z.enum(['violet', 'teal']),
    density: z.enum(['comfortable', 'compact']),
    reducedMotion: z.boolean(),
    playbackRate: z.number().min(0.25).max(3),
    volume: z.number().min(0).max(1),
    rememberVolume: z.boolean(),
    fit: z.enum(['contain', 'cover', 'fill']),
  })
  .strict();
export type Settings = z.infer<typeof settingsSchema>;
export const defaults: Settings = {
  version: 1,
  theme: 'dark',
  accent: 'violet',
  density: 'comfortable',
  reducedMotion: false,
  playbackRate: 1,
  volume: 0.8,
  rememberVolume: true,
  fit: 'contain',
};
export const SETTINGS_KEY = 'zenplex.settings.v1';
export function parseSettings(text: string): Settings {
  if (text.length > 65536) throw new Error('Settings file exceeds 64 KiB.');
  const value: unknown = JSON.parse(text);
  if (value && typeof value === 'object' && 'version' in value && value.version === 0) {
    const legacy = z
      .object({ version: z.literal(0), theme: z.enum(['dark', 'light', 'system']) })
      .strict()
      .parse(value);
    return { ...defaults, theme: legacy.theme };
  }
  return settingsSchema.parse(value);
}
export interface SettingsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export function loadSettings(storage: SettingsStorage): { settings: Settings; warning?: string } {
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    return { settings: raw ? parseSettings(raw) : { ...defaults } };
  } catch {
    return {
      settings: { ...defaults },
      warning:
        'Saved settings could not be read. Defaults are active; your saved data has not been overwritten.',
    };
  }
}
export function saveSettings(storage: SettingsStorage, settings: Settings) {
  const validated = settingsSchema.parse(settings);
  storage.setItem(
    SETTINGS_KEY,
    JSON.stringify({
      ...validated,
      volume: validated.rememberVolume ? validated.volume : defaults.volume,
    }),
  );
}
