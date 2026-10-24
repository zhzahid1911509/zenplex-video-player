# Build and packaging

## Requirements

Use Node.js 24 LTS and npm. The package engine permits Node >=22.12; this environment used Node 24.19.0. Dependencies are pinned in package.json and package-lock.json. Package downloads require registry access. Electron's postinstall additionally downloads its platform runtime.

## Windows PowerShell

```powershell
cd .\zenplex
npm ci
npm run check
npm run desktop
```

`npm run desktop` builds both renderer and main/preload code, then opens Electron. It uses the HTML media adapter in 0.2.0, not mpv. If the Electron runtime was deliberately skipped during installation, restore it with `node node_modules/electron/install.js` before launching.

For a shell installer, on Windows:

```powershell
npm run package:win
```

Output is configured under `release/`. This command is provided but has not been verified on Windows here. It does not bundle mpv or FFmpeg. It will be an unsigned foundation installer unless appropriate signing is configured. Native engine packaging, file associations and command-line open-with handling arrive in later phases.

## Browser development

```powershell
npm run dev
```

Open http://127.0.0.1:5173. For a production build and local preview:

```powershell
npm run build
npm run preview
```

Use an HTTP server for the browser build; do not double-click dist/index.html. Electron loads its packaged file itself. The app does not need environment variables or API keys in this phase.

## Tests

```powershell
npm test
npx playwright install chromium
npm run test:e2e
npm audit
```

The E2E suite uses `tests/fixtures/sample.webm`, generated from FFmpeg's synthetic test pattern and sine wave. It tests actual decoding/progress, not a fake player timer. The unit media-element tests intentionally mock the browser's native methods to exercise adapter lifecycle/error logic independently.

On a restricted test host only, `ZENPLEX_TEST_CHROMIUM` may specify an existing Chromium executable. This is not required for ordinary installations.

## Mobile

There is no mobile native project in Phase 2. Phase 7 must create Android and iOS build configurations and document compatible toolchains. Android SDK/JDK and macOS/Xcode/signing will be required, but no APK, AAB or IPA is claimed here.
