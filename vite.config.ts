import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  root: 'apps/web',
  base: './',
  plugins: [react()],
  build: { outDir: '../../dist', emptyOutDir: true },
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  test: {
    root: '.',
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
});
