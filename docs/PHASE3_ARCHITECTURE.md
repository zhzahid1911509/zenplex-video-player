# Phase 3 implementation decisions

## Native process boundary

Electron owns the main window and file permissions. The renderer requests file selection and receives opaque UUID tokens; only the main process maps tokens to absolute paths. Inputs pass through strict schemas before any native call. The preload has fixed methods rather than arbitrary IPC or filesystem access.

`NativeService` starts `zenplex-player-host.exe` without a shell and passes only the parent HWND on the command line. Media paths/URLs travel over private inherited stdin/stdout pipes. The helper loads `mpv-2.dll` beside itself using restricted DLL search flags, checks the libmpv API major version, creates a Win32 child surface, and supplies its handle to mpv's `wid` option. Video output is explicitly configured as `gpu` with the Windows `d3d11` context; no libmpv render-callback API is assumed.

The helper is one source per process. Switching sources disposes the old channel, closes stdin, and kills a non-exiting helper after 1.5 seconds. Each UI open uses a unique session ID, so late events cannot update a new source. Startup and commands have deadlines; queues/message sizes are bounded. Helper stderr is drained and not retained because decoder logs may contain media URLs/paths.

## Rendering and input

The renderer reports its video rectangle in CSS pixels. Zoom is fixed to 1; the helper converts coordinates with the parent window's current DPI. The child is visible only on the active Player page, with no dialog, and when the whole rectangle is onscreen. A ResizeObserver and scroll/visibility listeners update geometry. Native fullscreen uses the Electron window, with a layout that retains the transport controls below the video.

mpv renders subtitles in its own video output. No HTML subtitle overlay is claimed. Native input.conf contains only fixed script-message mappings; those become typed shortcut events handled by the UI. User mpv configs, scripts, default input bindings, yt-dlp integration, automatic companion-file loading and reference traversal are disabled. C++ uses argument-array `mpv_command`, never an interpolated command string.

This follows the documented Windows embedding approach, but cross-process rendering, focus, keyboard input, DPI and fullscreen still need real Windows acceptance. Cross-compiling does not verify those behaviors.

## State and controls

Playback snapshots come from libmpv properties at 8 Hz. Track metadata is refreshed after track events or selection. The UI enables native-only controls only for the native adapter. Local UI drafts keep asynchronous slider/selection acknowledgments from restoring old control values; time/progress labels remain derived from engine state.

Volume, mute, speed and fit preferences are applied before loading each new source. Per-file sync offsets are not persisted yet. Stop pauses and seeks to the beginning; removing media closes its native session.

## Network boundary

Native URL input is restricted to public-looking HTTPS on port 443, with a bounded public-IPv4 DNS preflight. No cookies, custom headers, yt-dlp, proxy or DRM handling is provided. **This is not a comprehensive SSRF prevention layer:** libmpv performs its own DNS resolution and redirects, and the preflight does not pin subsequent connections or police every demuxer. Treat direct native URLs as user-authorized client requests. Do not expose this client as a remote playback service. For current Phase 4 behavior and remaining client network limitations, see STREAMING.md and SECURITY.md.

## Files added

- `native/player-host/main.cpp`: native host, libmpv calls, window/message lifecycle.
- `native/player-host/vendor/`: pinned ISC mpv client header and MIT JSON header/license.
- `native/player-host/out/`: compiled Windows x64 helper and input bindings; no libmpv binary.
- `apps/desktop/native/`: process transport/service, file grants, URL preflight.
- `packages/native/protocol.ts`: typed bridge and runtime schemas.
- `apps/web/src/player/native-adapter.ts`: UI adapter and event/session isolation.
- `apps/web/src/player/use-native-viewport.ts`: native surface visibility/geometry.
- `apps/web/src/components/NativeControls.tsx`: tracks, delays and frame stepping.
- `scripts/`: native runtime installation, checks and Windows build commands.
- `tests/windows/native-smoke.mjs`: actual Windows integration test, not run in Linux.

## Sources

- https://mpv.io/manual/stable/ — `wid`, libmpv commands/properties, input bindings and options.
- https://github.com/mpv-player/mpv/blob/v0.41.0/include/mpv/client.h — pinned client API.
- https://github.com/nlohmann/json/tree/v3.12.0 — pinned JSON implementation.
- https://www.electronjs.org/docs/latest/api/base-window — native handle and fullscreen.
- https://mpv.io/installation/ — Windows runtime distribution guidance.
