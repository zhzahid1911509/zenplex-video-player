import { Sparkles } from 'lucide-react';
export function AboutPage() {
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">CALM. PRECISE. YOURS.</span>
          <h1>Meet ZenPlex.</h1>
          <p className="muted">Version 0.3.0 · Windows native preview</p>
        </div>
        <Sparkles size={32} />
      </div>
      <div className="card">
        <h2>A player built in honest steps.</h2>
        <p>
          This build adds a Windows native helper and libmpv adapter. Windows runtime acceptance
          tests remain required before a production release.
        </p>
        <h3>Privacy</h3>
        <p>
          Local files are played on-device using browser object URLs or the native helper. No media
          is uploaded. Only validated preferences are persisted. Network media is requested directly
          from its host.
        </p>
        <h3>Open-source foundations</h3>
        <p>
          React, Zustand, Vite, Electron, and Zod use MIT licenses; Lucide uses ISC. Exact versions
          are recorded in package-lock.json. See THIRD_PARTY_NOTICES.md for links and release audit
          requirements.
        </p>
        <h3>What comes next</h3>
        <p>
          Verify native rendering, tracks, fullscreen, DPI changes and cleanup on Windows before
          moving to Phase 4 streaming and playlists.
        </p>
      </div>
    </>
  );
}
