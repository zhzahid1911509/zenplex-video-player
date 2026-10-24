# Building ZenPlex 0.4.0

Use Node.js 24 LTS and npm. Dependencies are pinned in package-lock.json.

```powershell
npm ci
npm run check
npm run dev
```

`npm run build` compiles the web renderer into `dist/` and desktop/main/shared protocol code into `dist-desktop/`. `npm run preview` serves the production browser build. Do not open the browser build by double-clicking index.html.

## Desktop/native

Follow [WINDOWS_NATIVE.md](WINDOWS_NATIVE.md) to install the libmpv DLL. The source ZIP includes the cross-compiled x64 helper, not libmpv.

```powershell
npm run native:install -- "C:\Tools\libmpv"
npm run native:doctor
npm run desktop
npm run test:native
```

The Electron postinstall downloads its runtime during `npm ci`. If binary download was deliberately skipped, run `node node_modules/electron/install.js` before desktop launch.

To rebuild the helper, install Visual Studio Build Tools with C++ and CMake and run `npm run native:build` in Developer PowerShell. CMake uses the checked-in header dependencies. The provided helper was built on Linux using Zig 0.17.0:

```bash
zig c++ -target x86_64-windows-gnu -std=c++17 -O2 native/player-host/main.cpp -luser32 -lgdi32 -o native/player-host/out/zenplex-player-host.exe
```

The helper uses Windows APIs and the OS Universal CRT. Its actual startup must be tested on the target Windows machine.

## Browser tests

```powershell
npx playwright install chromium
npm run test:e2e
```

On a restricted test host, `ZENPLEX_TEST_CHROMIUM` can identify an existing Chromium executable. One E2E test uses a simulated desktop bridge to verify UI command routing; it is not a native engine test. The other playback tests decode actual synthetic WebM bytes.

## Distribution

`npm run package:win` first checks required native files, then builds the app and invokes electron-builder for NSIS x64. Native resources are copied outside ASAR. Before shipping, include the exact libmpv distribution's licenses/source-compliance materials and configure code signing. No installer was built here.

## Mobile

Android/iOS native applications are not implemented in this phase. A responsive web UI is not a mobile native package.
