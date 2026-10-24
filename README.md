# ZenPlex 0.4.0 — Phase 4 streaming and playlists

ZenPlex adds M3U channel imports, groups, search, session favorites, HLS/DASH playback, buffering information and bounded reconnects. The Phase 3 Windows player and startup fix are included.

**Windows rendering/playback has not been verified in this Linux development environment.** The helper was cross-compiled, and the TypeScript/bridge/browser paths were tested. No libmpv DLL or Windows installer is bundled.

## Quick start on Windows

Install Node.js 24 LTS. Extract the archive separately from your previous release and open PowerShell inside `zenplex`:

```powershell
npm ci
```

Obtain and extract a Windows x64 libmpv distribution through the links on https://mpv.io/installation/. You need `mpv-2.dll` or `libmpv-2.dll` and its companion DLLs, not just `mpv.exe`.

```powershell
npm run native:install -- "C:\Tools\libmpv"
npm run native:doctor
npm run desktop
```

Use **Open files**, choose `tests/fixtures/native-multitrack.mkv`, and confirm the Player identifies **libmpv**. Full setup, troubleshooting and the acceptance checklist are in [WINDOWS_NATIVE.md](docs/WINDOWS_NATIVE.md).

## Browser playback remains available

```powershell
npm run dev
```

Open http://127.0.0.1:5173. This uses the HTML media adapter and browser codec support, not libmpv. Existing themes, settings, queue, keyboard controls and local playback are preserved.

## Streaming and channels

- **Play queue → Import channels:** choose an extended `.m3u` file or a CORS-enabled HTTPS playlist URL.
- Use **Channel group**, **Search queue**, stars and **Favorites only** to find channels.
- **Open URL:** open direct media, `.m3u8` HLS or `.mpd` DASH. Browser playback uses bundled, lazy-loaded hls.js/dash.js where needed; Windows native mode uses libmpv.
- Lists are capped at 2 MiB and 200 queue entries. Imports do not autoplay.
- Channels, favorite flags and signed URLs are session-only. Closing the app clears them.
- Recovery waits at most 20 seconds for a stalled attempt and makes up to three reconnects; explicit pause/stop cancels it. See [STREAMING.md](docs/STREAMING.md).

## Preserved native features

- Embedded Win32 video surface owned by a separate helper process.
- Local-file permissions represented by opaque tokens in the UI.
- Direct HTTPS playback path, track metadata, audio/subtitle selection.
- External SRT/VTT/ASS/SSA subtitles, audio/subtitle delay and frame stepping.
- Fit/fill/stretch, playback speed, volume, mute, seek, stop and pause.
- Native fullscreen and fixed shortcut forwarding.
- Bounded IPC, initialization/command deadlines, crash feedback and cleanup.
- Runtime installation/check scripts, CMake source build and a Windows integration harness.

These native implementations require Windows runtime verification. Broad codec coverage is not inferred from the presence of libmpv.

## Tests and builds

```powershell
npm run check
npx playwright install chromium
npm run test:e2e
npm run test:native
```

`test:native` requires Windows x64 and the installed native runtime. See [validation](docs/VALIDATION.md) for actual results and pending checks.

To rebuild the included helper with Visual Studio Build Tools/CMake: `npm run native:build`.
To prepare an unsigned installer after installing/auditing the runtime: `npm run package:win`. Installer execution and signing remain unverified here.

## Documentation

- [Windows native setup and acceptance](docs/WINDOWS_NATIVE.md)
- [Phase 3 architecture](docs/PHASE3_ARCHITECTURE.md)
- [Feature matrix](docs/FEATURES.md)
- [Security and privacy](docs/SECURITY.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)
- [Changed/source files](docs/FILES.md)

**Next implementation:** Phase 5 AI Subtitle Studio. Windows/native streaming acceptance remains open; continuing development does not certify that platform. See docs/STREAMING.md for workflows, supported inputs, network constraints and test coverage.
