# Windows native playback — ZenPlex 0.4.0

This release contains a cross-compiled Windows x64 helper and its complete source. **It has not been run on Windows in the development environment.** Treat it as a native integration preview until the acceptance checks below pass on your machine.

## 1. Prepare the application

Install Node.js 24 LTS on Windows 10/11 x64. Extract the source ZIP into a normal writable folder, then open PowerShell inside `zenplex`:

```powershell
npm ci
```

Do not copy the new release over an older folder containing old `node_modules` or build outputs. Extract separately; source changes from 0.2.0 are included.

## 2. Obtain libmpv

1. Visit https://mpv.io/installation/ and follow one of its Windows build links. The page distinguishes third-party binary builds from first-party testing builds.
2. Obtain a **Windows x64 libmpv/development/shared-library** distribution. The command-line `mpv.exe` alone is insufficient.
3. Use a baseline x86_64 build supported by your CPU. Do not choose an ARM64, 32-bit or x86_64-v3 package unless the architecture/CPU requirement matches your system.
4. Extract the downloaded archive. Locate `mpv-2.dll` or `libmpv-2.dll`. Keep its companion DLLs together. Verify the publisher's integrity information where supplied.
5. Use libmpv client API major 2; this helper was compiled against the official mpv **v0.41.0** header. Its options follow the stable manual. Exact newer binary compatibility is not certified here.
6. Preserve the package's licenses, build information and corresponding-source information. Installing a DLL for personal testing is not permission to redistribute it inside your own release.

ZenPlex does not download or execute third-party binaries automatically, and no libmpv DLL is included in this ZIP.

## 3. Install the runtime into ZenPlex

Pass the directory containing the extracted DLL, not the archive or the DLL filename:

```powershell
npm run native:install -- "C:\Tools\libmpv"
npm run native:doctor
```

The installer copies DLL files into `native/player-host/out/`, checks the main DLL's x64 PE header, accepts either common libmpv filename and normalizes it to `mpv-2.dll`. It records SHA-256 hashes. Hashes identify the files; they do not prove publisher trust.

The expected directory is:

- `native/player-host/out/zenplex-player-host.exe` — included in the ZIP.
- `native/player-host/out/input.conf` — included, with only ZenPlex shortcuts.
- `native/player-host/out/mpv-2.dll` — supplied by you.
- Additional DLLs required by that libmpv build.
- `native/player-host/out/runtime-manifest.json` — created by the install command.

`native:doctor` must find all three required files. It checks file presence/architecture; it cannot prove the DLL will initialize or decode your video.

## 4. Launch and try playback

```powershell
npm run desktop
```

- Use **Open files** to select a local file through Windows. Native mode deliberately does not convert drag/drop input into arbitrary paths.
- Try `tests/fixtures/native-multitrack.mkv` first. It has a synthetic video, two audio tracks with different tones, and an embedded subtitle.
- The Player should identify the **libmpv** engine.
- Audio/subtitle selectors, external SRT/VTT/ASS/SSA loading, audio/subtitle delay, and frame stepping appear below the player.
- Delay fields apply on blur or Enter. Positive delays shift audio/subtitles later.
- Space toggles playback; arrows seek; M mutes; F toggles fullscreen; Escape exits native fullscreen; double-clicking the native video requests fullscreen.
- Controls remain outside the native rendering rectangle. The native surface is hidden on other pages and while dialogs are open. Audio continues when navigating away from Player.

If native files are missing or the platform is not Windows x64, the application announces the limitation and uses browser-compatible playback. If the helper/DLL is present but initialization fails, the player shows an error; it does not silently pretend native playback succeeded. Use `npm run dev` for the browser path independently.

## 5. Run the Windows integration test

```powershell
npm run test:native
```

This starts an Electron test window with the actual helper and actual libmpv DLL. It checks initialization, time progression, pause, seeking, audio switching, embedded subtitle selection, subtitle delay, volume and a viewport update. On success it writes `test-results/native-windows.json` with the detected engine version.

That test is provided but **was not executed here**. Its assertions are not a substitute for visually checking image placement or hearing the selected audio tone.

## 6. Complete manual acceptance

| Check              | Expected outcome                                                       | Current status  |
| ------------------ | ---------------------------------------------------------------------- | --------------- |
| Initial video      | Embedded inside ZenPlex, no separate player window                     | Pending Windows |
| Resize             | Video stays inside its allocated rectangle                             | Pending Windows |
| DPI                | 100%, 125%, 150%, 200%; move between monitors                          | Pending Windows |
| Fullscreen         | Controls visible, F/Escape/double-click work                           | Pending Windows |
| Focus              | Keyboard still works after clicking the native video                   | Pending Windows |
| Dialogs/navigation | Native surface cannot cover a modal or another screen                  | Pending Windows |
| Minimize/restore   | Video returns correctly without an orphaned window                     | Pending Windows |
| Tracks             | Audio selection changes the heard tone; captions toggle correctly      | Pending Windows |
| External subtitles | SRT/VTT/ASS/SSA load without changing original media                   | Pending Windows |
| Source changes     | Previous media/audio stops, stale events do not overwrite the new item | Pending Windows |
| Crash/exit         | Useful error on helper failure; helper exits with the app              | Pending Windows |
| Real media corpus  | H.264, HEVC, AV1, VP9, MKV, MP4, etc. individually recorded            | Pending Windows |

The video surface hides if its rectangle is partially outside the viewport. This avoids painting native video over DOM controls while scrolling. It is a deliberate preview limitation.

## 7. Build the helper yourself (optional)

The included executable avoids requiring a compiler for first testing. To rebuild on Windows, install Visual Studio 2022 Build Tools with **Desktop development with C++**, a Windows SDK, and CMake. In a Developer PowerShell:

```powershell
npm run native:build
npm run native:doctor
npm run test:native
```

The helper dynamically loads libmpv; no import library or native Node addon is required. CMake uses the vendored API and JSON headers, so building the helper does not download dependencies.

## Packaging

```powershell
npm run package:win
```

The build refuses to proceed if native runtime files are missing. It copies the helper and DLLs outside the ASAR archive. Before redistribution, add all runtime license/source-compliance materials, complete the Windows checks, audit dependencies and configure signing. **No NSIS installer was generated or signed here.**

## Troubleshooting

- **Missing mpv-2.dll:** install the extracted libmpv directory, not an mpv.exe-only package.
- **Initialization failed:** check x64 architecture, companion DLLs, Windows runtime prerequisites and compatibility with the supported client API/options. Reopen media after correcting the runtime.
- **Black/incorrectly positioned video:** record Windows version, display scaling, GPU/driver and the exact DLL build. Do not mark the native acceptance gate complete.
- **Network source fails:** use a public HTTPS direct media URL on port 443. HLS/DASH extension URLs are supported by compatible libmpv builds; import M3U lists through Play queue. Website pages, authenticated service pages, local networks and DRM bypass are not supported.
- **Unsupported format:** record the container plus codecs. The file extension alone does not establish support.
- **API/AI settings:** not part of this phase; there is no API key required for playback.
