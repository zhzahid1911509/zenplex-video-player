# ZenPlex 0.2.0

A calm multimedia workspace. **Phase 2 foundation**, with real browser-compatible playback and a prepared Electron shell.

## Run on Windows

Install Node.js 24 LTS, extract this package, and open PowerShell inside the `zenplex` folder:

```powershell
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**. Choose a compatible local file, or add a direct HTTPS media URL. Drag/drop and multi-file selection are supported. For the desktop shell:

```powershell
npm run desktop
```

The desktop shell currently uses Chromium media playback. Native mpv support is the next phase and is not bundled.

## What works

- Functional Home, Player, Play queue, Settings, Diagnostics and About views.
- Local compatible video/audio, direct HTTPS input, play/pause, stop, seeking, volume/mute, speed, fullscreen and keyboard controls.
- Session queue with remove, reorder, search and previous/next selection.
- Dark/light/system themes, accent colors, density, reduced motion and video fit.
- Validated preferences with persistence, legacy migration, JSON backup/import and reset.
- Live engine state, resolution and buffered-duration diagnostics.
- Secure Electron shell configuration and typed playback adapter foundation.

## Limits worth understanding

- A recognized filename does not prove codec support. Try `tests/fixtures/sample.webm` for a deterministic playable sample.
- HLS/DASH/M3U imports, native tracks, subtitles, AI, library indexing, automatic recovery and mobile native apps are future phases.
- Queue URLs and selected files are session-only. Settings persist; sensitive media URLs do not.
- HTTPS-only remote sources. CORS, server authentication and unsupported codecs may prevent playback; no proxy bypass is provided.
- Windows launch, installer and native rendering still require Windows verification. No Windows installer is included.

## Validation

```powershell
npm run check
npx playwright install chromium
npm run test:e2e
```

See [validation results](docs/VALIDATION.md) for what was actually run, [build instructions](docs/BUILDING.md) for packaging, [architecture](docs/ARCHITECTURE.md), [security](docs/SECURITY.md), and the [feature matrix](docs/FEATURES.md).

## Layout

- `apps/web/`: React interface and HTML playback adapter.
- `apps/desktop/`: Electron main/preload.
- `packages/core/`: playback contract, media validation and formatting.
- `packages/settings/`: schemas, migration, persistence.
- `assets/`: original SVG/PNG/ICO branding.
- `tests/`: unit, component, browser tests and synthetic media.
- `docs/`: scope, engineering decisions, limitations and next gates.

## Next phase

Phase 3: implement and test the native Windows playback helper. Start with embedded rendering, DPI/resize/fullscreen/focus and resource cleanup before expanding codec claims or advanced controls.
