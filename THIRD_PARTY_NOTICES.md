# Third-party notice inventory — 0.3.0

ZenPlex UI and branding are original. This package does not include proprietary player code or a libmpv/FFmpeg runtime binary.

## Vendored native headers

- **mpv client API header**, v0.41.0, ISC license. Source: https://github.com/mpv-player/mpv/blob/v0.41.0/include/mpv/client.h . The complete copyright/permission notice is retained in `native/player-host/vendor/mpv/client.h`.
- **nlohmann/json**, v3.12.0, MIT license. Source: https://github.com/nlohmann/json/tree/v3.12.0 . Header: `native/player-host/vendor/json.hpp`; full license: `native/player-host/vendor/JSON-LICENSE.MIT`.

The ISC client header is distinct from the mpv core's licensing. The helper dynamically loads a user-supplied libmpv. Default mpv core builds are GPL; appropriately configured builds may be LGPL. Actual flags and dependencies determine obligations. Do not infer redistribution permission from the header license or from the fact that loading is dynamic.

## JavaScript/runtime dependencies

- React / React DOM — MIT — https://github.com/facebook/react
- Zustand — MIT — https://github.com/pmndrs/zustand
- Zod — MIT — https://github.com/colinhacks/zod
- Lucide — ISC — https://github.com/lucide-icons/lucide
- Electron — MIT plus bundled component notices — https://github.com/electron/electron

Exact versions are pinned in package-lock.json. Preserve installed dependency notices and Electron/Chromium component notices in distributions. This inventory is not a full transitive audit.

## Distribution requirements

The ZIP contains the source-built ZenPlex helper but no libmpv DLL. Before distributing an installer with a supplied native runtime, preserve that distribution's licenses, build flags, source correspondence and other required materials. The runtime install script records hashes but does not audit licensing. FFmpeg optional GPL/nonfree components and codec patent issues must be evaluated for the actual binaries/markets.

ZenPlex's own public distribution license remains undecided by the owner. The package is private; this inventory does not grant a new public license to the application.
