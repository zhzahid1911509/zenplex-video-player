# ZenPlex architecture — current release 0.4.0

The browser and Windows native player implement a shared typed playback interface. The UI owns navigation and preferences; engine events own observed playback state.

- `apps/web/src/player/html-adapter.ts`: actual HTML media playback, retained from Phase 2.
- `apps/web/src/player/native-adapter.ts`: native session events and validated desktop commands.
- `apps/desktop/native/`: file permissions, runtime supervision, pipe framing and URL input preflight.
- `native/player-host/`: Windows child-surface host and libmpv C API integration.
- `packages/core/`: shared playback types and browser URL classification.
- `packages/native/`: native bridge types and runtime schemas.
- `packages/settings/`: validated local preferences, migration/import/export.

See [Phase 3 architecture](PHASE3_ARCHITECTURE.md) for rendering, lifecycle, security limits and official references, and [feature status](FEATURES.md) for verification boundaries.

Streaming modules now provide M3U parsing, channel metadata, browser HLS/DASH and finite recovery. See STREAMING.md. SQLite library indexing, FFmpeg audio processing, AI adapters and React Native apps remain later phases. No placeholders pretend those features work.
