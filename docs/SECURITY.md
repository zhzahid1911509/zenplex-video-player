# Security and privacy — foundation build

## Implemented

- Sandboxed, isolated Electron renderer, disabled Node integration and webviews.
- New windows and navigations blocked; permissions denied.
- One read-only IPC method, with sender/frame/URL validation.
- CSP restricts scripts to packaged resources; no remote scripts, object embedding or form submission. Inline styles remain permitted for React's video-fit property.
- Explicit user file selection or drag/drop; files become object URLs, not arbitrary filesystem paths exposed to the renderer.
- HTTPS-only direct media input; credentials in URLs, IP literals and obvious local hostnames rejected.
- Signed query strings never appear in application labels or diagnostic messages.
- Strict settings schema, 64 KiB import cap, no credential settings.
- Session queue limited to 200 entries. File bytes are not copied into JS memory.
- No analytics, upload, remote API, proxy, or automatic remote code loading.

## Boundaries and known gaps

URL validation is an input policy, not complete SSRF protection. DNS rebinding, DNS resolution to private addresses, redirects and nested streaming requests are not centrally controlled by this browser-only engine. There is no privileged fetch proxy/backend in this phase. A privileged native network integration must introduce a comprehensive network policy before accepting playlists or API endpoints. Do not reuse this validator as a server-side SSRF defense.

Direct media connections reveal network information to the media server. Signed URLs remain visible in browser developer/network tools and process memory. ZenPlex does not log or persist them, but cannot hide them from the device owner.

Chromium media parsing still processes untrusted bytes. Electron sandboxing is not a substitute for current engine/security updates. The Windows shell is prepared but has not been certified on Windows in this environment.

Settings localStorage is not encrypted and must never hold secrets. Credential storage, consent, audio upload, cache deletion and provider endpoint validation belong to Phase 5. There is no AI upload functionality in this build.

## Release gates

Run npm audit, inspect transitive licenses, test CSP in the packaged app, validate IPC rejection, verify update/signing policies, and test native engine isolation on Windows. No self-update service is implemented.
