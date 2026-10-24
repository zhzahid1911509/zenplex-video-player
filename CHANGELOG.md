# Changelog

## 0.2.0 — Phase 2 foundation

- Added React/TypeScript application with original ZenPlex branding and responsive navigation.
- Added theme, accent, density, reduced-motion, speed, fit and volume preferences with validation, migration and persistence.
- Added settings JSON import/export/reset and visible storage failure handling.
- Added actual HTML media playback through a typed adapter, session queue, keyboard controls and diagnostics.
- Added isolated Electron shell/preload and NSIS build configuration.
- Added deterministic media fixture, 41 unit/component tests and six browser tests.
- Added architecture, security, feature status, packaging and validation documentation.
- Native Windows engine, streaming playlists, subtitles, AI and mobile builds remain scheduled phases.

## 0.3.0 — Phase 3 native playback preview

- Added a Windows x64 child-window helper that dynamically loads libmpv, plus the helper's complete C++/CMake source and pinned dependency headers.
- Added validated desktop commands, native file picker grants, bounded private pipe transport, source/session isolation, startup timeouts and helper cleanup.
- Added native track selection, external subtitles, audio/subtitle delay, frame stepping, native fullscreen and geometry updates.
- Added runtime installation/doctor/build scripts, multitrack test media and a real Windows integration harness.
- Preserved and regression-tested the browser player.
- Windows runtime/rendering, live native URLs, native codec coverage and installer verification remain pending. No libmpv DLL is bundled.

## 0.4.0 — Phase 4 streaming preview

- Extended M3U file/URL import with bounds, deduplication, group metadata and rejected-entry counts.
- Channel group/search/favorite filters; favorites intentionally remain session-only.
- Lazy-loaded hls.js 1.7.3 and dash.js 5.2.1, with generation guards and cleanup.
- HLS/DASH native source allowance with per-helper adaptive reference handling.
- Finite reconnection, stall deadlines, pause/stop cancellation, VOD position restoration and buffering counters.
- Includes the Phase 3 render-frame startup correction and startup/load rejection handling.
- Synthetic HLS/DASH media and browser tests; Windows execution remains unverified.
