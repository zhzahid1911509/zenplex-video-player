import { Sparkles } from 'lucide-react';
export function AboutPage() {
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">CALM. PRECISE. YOURS.</span>
          <h1>Meet ZenPlex.</h1>
          <p className="muted">Version 0.2.0 · Phase 2 foundation</p>
        </div>
        <Sparkles size={32} />
      </div>
      <div className="card">
        <h2>A player built in honest steps.</h2>
        <p>
          This build provides the application shell, preferences, session queue, and
          browser-compatible playback. It is not the production native Windows player.
        </p>
        <h3>Privacy</h3>
        <p>
          Local files are played using device-local object URLs. No media is uploaded. Only
          validated preferences are persisted. Network media is requested directly from its host.
        </p>
        <h3>Open-source foundations</h3>
        <p>
          React, Zustand, Vite, Electron, and Zod use MIT licenses; Lucide uses ISC. Exact versions
          are recorded in package-lock.json. See THIRD_PARTY_NOTICES.md for links and release audit
          requirements.
        </p>
        <h3>What comes next</h3>
        <p>
          Phase 3 integrates native Windows playback and verifies rendering, track controls,
          fullscreen, and cleanup on real Windows hardware.
        </p>
      </div>
    </>
  );
}
