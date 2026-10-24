# Validation — ZenPlex 0.3.0

Validation date: 24 October 2026. Development host: Linux, Node 24.19.0, npm 11.9.0.

| Check                                               | Actual result                                                  |
| --------------------------------------------------- | -------------------------------------------------------------- |
| ESLint                                              | Passed                                                         |
| Strict TypeScript, renderer/desktop/shared protocol | Passed                                                         |
| Vitest unit/component tests                         | **83 passed**, 8 files                                         |
| Browser E2E tests                                   | **7 passed**                                                   |
| Production renderer build                           | Passed                                                         |
| Electron main/preload/service compilation           | Passed                                                         |
| Windows x64 helper cross-compilation                | Passed using Zig 0.17.0                                        |
| PE architecture inspection                          | Windows x86-64 executable; Windows system/UCRT imports         |
| Native runtime doctor                               | Correctly reports missing mpv-2.dll; helper/input.conf present |
| npm audit                                           | See audit.json; report captured for this release               |
| Actual Windows helper/libmpv execution              | **Not run** — Windows/libmpv runtime unavailable               |
| Windows visual/DPI/focus/fullscreen acceptance      | **Pending**                                                    |
| Live native HTTPS media                             | **Not tested**                                                 |
| Native codec compatibility corpus                   | **Not tested**                                                 |
| Windows installer/signing                           | **Not produced**                                               |

## What the automated tests establish

The tests cover settings migration/persistence, browser URL classification, media-element lifecycle, native command schemas, file-token authorization, subtitle restrictions, public-IPv4 checks, line framing including split Unicode, request correlation, timeouts, oversized/malformed messages, pending queue limits, native startup readiness, disconnect handling, disposal and stale-session filtering.

Six browser tests preserve the previous workflows. Actual HTML media decoding is tested with the synthetic WebM fixture; a direct HTTPS URL test intercepts the network request and returns deterministic real media bytes. It is not a live public-server test.

The seventh browser test **simulates the desktop bridge** to verify native UI command routing, track selection, dialog surface hiding and fullscreen layout. It does not execute libmpv and does not count as native playback verification. Native service tests similarly use fake child streams to exercise protocol/lifecycle logic.

The helper's Windows binary was built from the supplied source and inspected as PE x64. This proves compilation/linking only. It does not prove successful DLL loading, decoding, audio output, focus, scaling or embedded rendering on Windows.

## Browser runtime used

The restricted host used Chromium 153.0.8010.0 from an external @sparticuz/chromium test installation via ZENPLEX_TEST_CHROMIUM. That browser and the cross-compiler are not bundled with ZenPlex. A first attempt referred to an expired temporary browser path; after restoring the test runtime, all seven tests passed.

## Windows acceptance

Run the supplied `npm run test:native` on Windows x64 after installing the libmpv runtime. It opens a real Electron window and native helper with `native-multitrack.mkv`, checks decoder time progress and track/control operations, and writes `test-results/native-windows.json` on success. That test was authored but not executed on this host.

Complete the manual matrix in [WINDOWS_NATIVE.md](WINDOWS_NATIVE.md). Phase 3's Windows acceptance gate remains open. No fabricated native test result or installer is included.
