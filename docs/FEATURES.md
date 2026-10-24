# Feature completion — 0.4.0

| Capability                                               | Implementation                       | Verification                                                   |
| -------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------- |
| Phase 2 navigation/themes/settings/browser player        | Preserved                            | Unit/UI/browser tests                                          |
| Typed native playback adapter                            | Implemented                          | Unit and bridge-contract tests                                 |
| Windows embedded libmpv helper                           | Implemented; x64 executable included | Cross-compiled; Windows runtime pending                        |
| Native file picker and opaque file grants                | Implemented                          | File-grant tests; Windows dialog pending                       |
| Native direct HTTPS playback path                        | Implemented with restricted input    | URL policy/bridge tests; live native URL pending               |
| Native play/pause/stop/seek/volume/mute/speed            | Implemented                          | Command tests; Windows playback pending                        |
| Native audio/subtitle selection                          | Implemented                          | UI/contract tests; actual switching pending                    |
| External SRT/VTT/ASS/SSA subtitle loading                | Implemented                          | Input validation; rendering pending                            |
| Audio/subtitle delay, frame step, fit/fill/stretch       | Implemented                          | Command validation; Windows media behavior pending             |
| Native fullscreen, DPI geometry, shortcuts               | Implemented                          | UI geometry/fullscreen contract; Windows visual checks pending |
| Cleanup, deadlines, bounded transport, session isolation | Implemented                          | Automated transport/lifecycle tests                            |
| Native setup/doctor/Windows test harness                 | Implemented                          | Doctor correctly detects missing DLL; Windows test not run     |
| Windows NSIS installer                                   | Configuration updated                | No installer generated                                         |
| M3U import, groups/search/session favorites | Implemented | Parser and browser workflow tests |
| HLS/DASH and bounded network recovery | Implemented | Actual browser manifest/segment playback; native Windows pending |
| AI Subtitle Studio                                       | Planned Phase 5                      | Not implemented                                                |
| Advanced library and per-file persistence                | Planned Phase 6                      | Session queue only                                             |
| Android/iOS native applications                          | Planned Phase 7                      | Not implemented                                                |

Phase 3's source implementation is delivered as a preview. The phase's Windows acceptance gate remains open. Do not label the native release production-ready before executing the supplied test and manual matrix.
