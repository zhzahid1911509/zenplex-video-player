# Validation — 0.2.0

Validated on 24 October 2026 in a Linux environment with Node 24.19.0 and npm 11.9.0.

| Check                                   | Result                                                                        |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| ESLint                                  | Passed                                                                        |
| Strict TypeScript, renderer and desktop | Passed                                                                        |
| Vitest unit/component tests             | 41 passed in 4 files                                                          |
| Vite production renderer build          | Passed                                                                        |
| Electron main/preload compilation       | Passed                                                                        |
| Playwright browser tests                | 6 passed                                                                      |
| Production build browser smoke          | Passed: startup, lazy settings, light theme, mobile width, no page exceptions |
| Dependency audit                        | See audit.json; zero known vulnerabilities at verification time               |
| Visual inspection                       | Desktop home at 1440px, phone home at 390px, light settings at 1440px         |
| Windows Electron launch                 | Not run — Windows unavailable                                                 |
| Windows NSIS installer                  | Configuration supplied; not generated or tested                               |
| Native mpv integration                  | Not implemented in this phase                                                 |
| Live external media service             | Not tested; deterministic URL route used                                      |
| AI API integration                      | Not implemented in this phase                                                 |
| Android/iOS native builds               | Not implemented in this phase                                                 |

## Browser test details

1. Navigation, theme changes, persistence after reload, reset and mobile width.
2. Invalid URL feedback, modal Escape handling and focus restoration.
3. Actual local WebM decoding/progress, pause, seeking, volume and source removal.
4. Invalid persisted JSON falls back with a warning and is not silently overwritten.
5. Direct HTTPS source workflow with intercepted deterministic WebM bytes; signed query omitted from labels. This is not a live server/network access test.
6. Queue reordering, search and removal with intentionally invalid media fixtures.

The normal Playwright browser download failed in this restricted environment with invalid archive responses. Tests ran with an alternate Chromium 153.0.8010.0 executable from @sparticuz/chromium 153.0.0, installed outside the project solely for testing. The optional ZENPLEX_TEST_CHROMIUM setting supports that substitution. No testing browser binary is bundled in the deliverable.

The first browser runs found control synchronization issues: seeking and volume changes could be overwritten by stale controlled-input values before the media events arrived. The adapter now reads back the actual element state synchronously after setters, and transport changes update the engine before preferences. The affected real-playback test passes. A separate regression test verifies that a rejected play promise from an obsolete source cannot change the new source's state.

Tests use a synthetic six-second VP9/Opus WebM fixture. They do not establish broad codec coverage, long-session stability, hardware acceleration performance, mobile Safari support or Windows rendering behavior.

## Reproduce

```powershell
npm ci
npm run check
npx playwright install chromium
npm run test:e2e
npm audit
```

Use standard Playwright Chromium on an unrestricted development machine. Manual Windows verification remains a release gate.
