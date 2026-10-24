# ZenPlex architecture — Phase 2

Version: 0.2.0. The application foundation is implemented. Native playback is not.

## Boundaries

- `apps/web/src/App.tsx` coordinates navigation and session ownership.
- `apps/web/src/player/html-adapter.ts` owns media event listeners and media-element operations. It implements the typed contract in `packages/core/media.ts`.
- `packages/settings/index.ts` validates, migrates and serializes non-secret preferences. The Zustand store exposes preference changes to React, not privileged engine operations.
- `apps/desktop/main.ts` loads the built local UI with context isolation, renderer sandboxing, no Node integration, denied permission requests, and blocked navigation/new windows. The sole preload method returns runtime metadata after validating the sender and main frame.
- `SettingsPanel` is lazy loaded. The video element remains mounted while navigating, so navigation does not destroy the playback session.

Source files are organized as modules in one npm package. Separate package publishing and workspace linking are deferred until a second consumer needs them. This avoids premature build complexity. Mobile will share pure models/parsers, not DOM components.

## Phase 1 decisions retained

Windows: Electron + React + TypeScript, followed by a controlled libmpv helper.
Browser: HTML media now; evaluate Shaka for HLS/DASH in Phase 4.
Mobile: React Native native playback in Phase 7.
Processing: FFmpeg/ffprobe in bounded workers in Phase 5.
Desktop library metadata: SQLite when library management is implemented.

Phase 2 preferences use validated localStorage, which Electron persists in its application profile. No credentials, URLs, file paths, transcripts, or library database are stored. This is intentionally smaller than the later database layer. Corrupt data is not overwritten until a deliberate preference edit/reset/import. Storage failure is reported while session changes remain usable.

## Media lifetime

A file selected by the user becomes a browser object URL. Removing an item revokes its URL; unmount disposes the engine and revokes all remaining URLs. Queue entries and remote URLs are memory-only. Direct HTTPS input is syntax-validated; it is not described as playable until the engine plays it. Playlist/manifest filename candidates are rejected with a phase-specific message. Extension-less manifests may still fail at the engine. No manifest parser or automatic retry exists yet.

## Native integration gate — Phase 3

Do not replace the current adapter with an unverified npm native wrapper. Build a small helper with a constrained typed command channel and an owned rendering surface. Acceptance on Windows x64:

1. Native video embedded in the ZenPlex window, not a separate unrelated player.
2. Correct resize, focus, minimize/restore, DPI changes and monitor transitions.
3. Fullscreen enters/exits with controls accessible.
4. Native subtitle rendering and future dual-subtitle composition verified.
5. Audio/subtitle track changes and time events reflect actual engine state.
6. Helper crash yields a useful error; commands cannot invoke arbitrary scripts, shell operations or unrestricted engine properties.
7. Engine listeners, decoder resources and native handles released after source changes and exit.
8. Exact native build flags, dependencies, hashes and licenses recorded.

The narrow adapter will grow typed unsupported-operation errors and engine-specific capabilities as features are actually added. No fake track, EQ, filter or native-engine toggles are present.

## Research links

- https://mpv.io/manual/stable/
- https://github.com/mpv-player/mpv/blob/master/Copyright
- https://videolan.videolan.me/vlc/master/libvlc.html
- https://ffmpeg.org/legal.html
- https://www.electronjs.org/docs/latest/tutorial/security
- https://www.electronjs.org/docs/latest/tutorial/context-isolation
- https://github.com/shaka-project/shaka-player
- https://github.com/TheWidlarzGroup/react-native-video

These justify direction, not compatibility guarantees. Recheck and pin native dependency versions during their implementation phase.
