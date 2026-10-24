import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import { SettingsPanel } from '../apps/web/src/components/SettingsPanel';
import { useSettings } from '../apps/web/src/state/settings';
import { defaults, SETTINGS_KEY } from '../packages/settings';
afterEach(() => {
  cleanup();
  useSettings.getState().replace({ ...defaults });
});
it('changes a theme through the accessible control and persists it', async () => {
  render(<SettingsPanel />);
  await userEvent.selectOptions(screen.getByLabelText('Theme'), 'light');
  expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!).theme).toBe('light');
});
it('restores defaults through the UI', async () => {
  useSettings.getState().replace({ ...defaults, theme: 'light' });
  render(<SettingsPanel />);
  await userEvent.click(screen.getByRole('button', { name: 'Restore defaults' }));
  expect(screen.getByLabelText('Theme')).toHaveValue('dark');
  expect(screen.getByRole('status')).toHaveTextContent('Default settings restored');
});
