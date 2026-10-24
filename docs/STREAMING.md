# Phase 4 — Streaming and playlists (0.4.0)

## Use it

1. Run `npm ci`, then `npm run desktop` (Windows) or `npm run dev` (browser).
2. Open **Play queue** and use **Import channels**. Choose an extended M3U file or enter a public HTTPS playlist URL. Remote lists require CORS and cannot redirect; import times out after 15 seconds.
3. Filter by group or search title, group, or channel ID. Star channels and enable **Favorites only**. Click a channel to play. Previous/next use the full queue; ordering and transitions remain manual.
4. For a single HLS/DASH stream, use **Open URL** with its `.m3u8`/`.mpd` address. Use direct media for other URLs. Extensionless adaptive endpoints are not auto-sniffed; obtain the manifest URL.
5. Watch **Buffered ahead** and **Recovery** in Player, or open Diagnostics for engine state and buffer information.

Only HTTPS port 443 inputs without embedded credentials/IP literals/local hostnames are accepted. Website pages, DRM license configuration, custom headers/cookies and local/LAN IPTV are not implemented. HLS/DASH format support depends on the actual engine and codecs. No channel catalog or third-party subscription is bundled.

## Playlist behavior

The parser supports UTF-8/BOM, CRLF, `#EXTINF`, quoted `group-title`/`tvg-id`, `#EXTGRP`, Unicode titles and relative entries in remote lists. Local lists must contain absolute HTTPS URLs. It rejects HLS manifests as channel lists (use Open URL), nested `.m3u` entries, unsupported URL schemes, duplicates and excess entries. Channel logos and arbitrary playlist directives are ignored. No playlist URL is executed as a shell command.

Maximum import is 2 MiB, maximum accepted entries is 200, and maximum combined queue is 200. Existing queue items win when URLs duplicate. Parsing reports accepted/skipped counts; the queue shows its actual retained count. A full queue accepts no further entries. Imports never start playback automatically.

URLs, imported channels and favorites are intentionally session-only. Refresh/exit clears them; no signed URLs are written to settings. Persistent channel libraries are not part of this preview.

## Engines and recovery

Browser mode uses native HLS where available, otherwise lazy-loads hls.js; DASH lazy-loads dash.js. Both libraries are bundled locally. Closing/switching media destroys streaming resources, and async import/play results are guarded by source generation. Pausing while initialization is pending cancels that play intent.

Windows native mode uses libmpv. Main-process preflight still checks the initial public IPv4 destination. The helper enables adaptive references only for a main-process-classified HTTPS `.m3u8` or `.mpd` source; ordinary files retain reference-following disabled. This helper was cross-compiled, not run on Windows.

Recovery applies only to URL sources. Errors schedule reconnects after 2/4/8 seconds; loading/buffering has a 20-second stall deadline. Three reconnects maximum are allowed per source selection, even if a reconnect briefly succeeds. The libraries also have their own finite segment retry behavior. Pause, stop, removal, source changes and unmount cancel application recovery. Manual Retry resets the budget. Finite-duration VOD reconnects attempt to restore the previous position; live streams reconnect at the engine's live position. Seekability/DVR windows remain engine-dependent.

## Network boundary

Remote channel-list fetches omit credentials/referrer, reject redirects, apply a byte limit and remain subject to CORS. Imported entries are inert until selected. There is no proxy or backend fetcher.

Media manifests and their segment/key/redirect requests are engine-managed. The native initial DNS check does not pin downstream IPs, and enabling adaptive references is not a network sandbox. Browser CSP permits HTTPS connections for streaming and browser policy still applies. Do not assume every downstream URL is public or every native segment uses HTTPS. Use sources you trust; do not deploy this desktop client as an unattended network-fetching service. No DRM circumvention is provided.

## Verification and Windows acceptance

Automated Chromium tests decode real synthetic HLS/H.264 MPEG-TS and DASH/VP9 WebM segments through intercepted HTTPS requests. These verify adapter integration without depending on public servers. They do not establish live-provider, encryption, live-window, DRM, or Windows compatibility.

On Windows, install libmpv and run `npm run native:doctor`, `npm run desktop`, and `npm run test:native`. Then use authorized HLS and DASH sources and confirm progress, audio, pause, switching, removal and recovery after disconnecting/reconnecting your network. Repeat DPI/fullscreen checks from WINDOWS_NATIVE.md. Those native acceptance checks are still pending.

## Main changed files

- `packages/streaming/playlist.ts`, `recovery.ts`: parsing, fetch bounds, classification and recovery.
- `apps/web/src/components/PlaylistPanel.tsx`, `QueuePanel.tsx`, `UrlDialog.tsx`: imports, filters, favorites, stream entry.
- `apps/web/src/App.tsx`, `player/html-adapter.ts`: workflow wiring and adaptive lifecycle.
- `apps/desktop/native/network.ts`, `service.ts`, `native/player-host/main.cpp`: native adaptive input and reference settings.
- `tests/streaming.test.ts`, `tests/e2e/streaming.spec.ts`, `tests/fixtures/streaming/`: regression tests and synthetic media.
- `apps/desktop/main.ts`: retains the prior startup fix.

Next implementation phase: **AI Subtitle Studio (Phase 5)**. Windows acceptance is not implied by this implementation milestone.
