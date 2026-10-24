import { create } from 'zustand';
import {
  defaults,
  loadSettings,
  saveSettings,
  settingsSchema,
  type Settings,
} from '../../../../packages/settings';
const storage = {
  getItem: (key: string) => window.localStorage.getItem(key),
  setItem: (key: string, value: string) => window.localStorage.setItem(key, value),
};
const loaded = loadSettings(storage);
export const useSettings = create<{
  settings: Settings;
  warning: string | null;
  update: (patch: Partial<Settings>) => void;
  replace: (value: Settings) => void;
  reset: () => void;
}>((set, get) => ({
  settings: loaded.settings,
  warning: loaded.warning ?? null,
  update: (patch) => get().replace({ ...get().settings, ...patch }),
  replace: (value) => {
    const settings = settingsSchema.parse(value);
    try {
      saveSettings(storage, settings);
      set({ settings, warning: null });
    } catch {
      set({
        settings,
        warning:
          'Changes work for this session but could not be saved. Check browser storage permissions.',
      });
    }
  },
  reset: () => get().replace({ ...defaults }),
}));
