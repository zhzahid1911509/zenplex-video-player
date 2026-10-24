# Security and privacy — 0.3.0 native preview

## Implemented boundaries

- Sandboxed Electron renderer, context isolation, disabled Node integration, blocked navigation/new windows/webviews, denied browser permissions and a restrictive CSP.
- Fixed preload methods only; main-process sender/frame/URL checks and strict Zod input validation.
- Native file picker issues opaque UUID grants. The renderer cannot turn an arbitrary path into a native open request. Grant count is limited; removal, reload and shutdown release grants.
- Native media file grants require existing local regular files with allowed extensions. UNC paths are not allowed. External subtitle files must be SRT/VTT/ASS/SSA and below 20 MiB.
- Native helper is spawned with `shell:false`, no media paths/URLs on its command line, and private inherited pipes instead of a listening IPC socket.
- Helper request/response sizes, pending request count and command deadlines are bounded. Session/epoch IDs discard obsolete events.
- DLL loading uses the app-owned native runtime directory plus Windows system dependencies, not an arbitrary PATH/current-directory search.
- mpv uses no user config, scripts, yt-dlp, default bindings or automatic companion files. Reference-following is disabled. Commands use typed argument arrays, not string interpolation.
- Helper decoder stderr is drained without retaining it. Diagnostic errors do not echo URL tokens or paths.
- Closing the player ends the helper input pipe; a helper that does not exit is killed after a short deadline.
- Browser object URLs and native queue grants are session-only. Only non-secret validated preferences are persisted. No audio upload or AI provider exists yet.

## Scope of network validation

The native direct-URL path accepts HTTPS on port 443 and performs an initial public-IPv4 DNS check with a timeout. It rejects obvious local/IP-literal/auth-in-URL inputs and known playlist/manifest filename candidates. The browser path retains its HTTPS input validation and browser networking behavior.

**This is not a complete network sandbox or SSRF firewall.** Native libmpv resolves hosts itself and can follow redirects after the preflight; DNS changes, IPv6 choices, nested demuxer requests and redirection are not pinned/centrally intercepted. The mpv manual also documents limitations of `access-references=no`. Native links in this preview are explicitly user-initiated client requests. Do not expose the app as an unattended remote URL-processing backend. Phase 4 network/playlist handling must strengthen this boundary before broad untrusted playlist import.

Signed URLs remain visible to the device owner in memory/network inspection. Servers receive connection metadata. No attempt is made to hide this fact or bypass authentication, DRM or CORS.

## Native isolation limitations

The helper is a separate process, **not a restricted Windows security sandbox**. A decoder exploit could act with the user's permissions. Keep the native runtime current, accept media from appropriate sources, and complete OS sandbox/job/process-mitigation work before production claims. Main/preload isolation and command allowlisting do not eliminate vulnerabilities in decoders or GPU drivers.

Runtime installation is explicit: the user selects a libmpv distribution directory. The installer validates architecture and records hashes, but does not authenticate a publisher, scan for malware or establish redistribution rights. No third-party DLL is bundled or silently downloaded.

## Release gates

Actual Windows IPC/rendering tests, DPI/fullscreen/focus, dependency and binary audits, license/source compliance, signing and installer lifecycle remain required. No production security certification or automatic updater is claimed.
