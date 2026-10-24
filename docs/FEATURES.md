# Feature completion matrix

| Feature                                                          | Status in 0.2.0                            | Evidence / limitation                                         |
| ---------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------- |
| React/TypeScript app shell                                       | Implemented                                | Vite production build and typecheck                           |
| Home/player/queue/settings/diagnostics/about navigation          | Implemented                                | Browser E2E suite                                             |
| Original branding and responsive themes                          | Implemented                                | SVG/PNG/ICO; dark/light/system, violet/teal                   |
| Settings persistence, validation, migration, import/export/reset | Implemented                                | Unit/UI tests and E2E persistence                             |
| Local compatible media                                           | Implemented browser path                   | HTML media; test corpus is a small WebM fixture               |
| Direct HTTPS media                                               | Implemented, limited                       | HTML media; no guarantee of remote availability/codec support |
| Play/pause/stop/seek/volume/mute/speed/fullscreen                | Implemented browser path                   | Adapter tests and selected real browser checks                |
| Keyboard controls                                                | Implemented                                | Space, arrows, M, F, O; ignores form controls and modal       |
| Session queue add/remove/reorder/search/previous/next            | Implemented                                | No persistence or automatic next/repeat/shuffle               |
| Engine abstraction and cleanup                                   | Implemented foundation                     | Native adapter not present                                    |
| Electron secure shell                                            | Implemented, platform verification pending | Compiled main/preload; Windows runtime not tested             |
| Windows installer configuration                                  | Prepared, unverified                       | No installer generated                                        |
| mpv/libVLC native rendering                                      | Planned Phase 3                            | Native integration gate in ARCHITECTURE.md                    |
| Audio/subtitle tracks, synchronization                           | Planned Phase 3+                           | No inactive imitation controls                                |
| M3U/HLS/DASH                                                     | Planned Phase 4                            | Manifest candidates explicitly rejected                       |
| Network recovery                                                 | Planned Phase 4                            | Manual retry only                                             |
| AI transcription/translation                                     | Planned Phase 5                            | No provider/API code or credentials                           |
| Media library/history/resume                                     | Planned Phase 6                            | Session queue only                                            |
| Mobile native apps                                               | Planned Phase 7                            | Responsive browser UI is not an Android/iOS app               |
| Production signing and distribution                              | Planned Phase 9                            | Release gates pending                                         |

The production milestone in the supplied specification remains unmet. This is a tested foundation release, not a claim of native codec coverage or production readiness.
