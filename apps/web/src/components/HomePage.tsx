import type { ReactNode } from 'react';
import { ArrowRight, ChevronRight, FolderOpen, Layers, Link, Settings } from 'lucide-react';
export function HomePage({
  onFiles,
  onUrl,
  onSettings,
  onQueue,
  queueView,
}: {
  onFiles: () => void;
  onUrl: () => void;
  onSettings: () => void;
  onQueue: () => void;
  queueView: ReactNode;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">PRESS PLAY. FIND YOUR FOCUS.</span>
          <h1>Your screen. Your pace.</h1>
          <p className="muted">A quieter space for everything you want to watch.</p>
        </div>
        <span className="badge">
          <span className="status-dot" />
          ON YOUR DEVICE
        </span>
      </div>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">WELCOME TO ZENPLEX</span>
          <h2>
            Good stories.
            <br />
            Nothing in the way.
          </h2>
          <p>
            Bring a video, settle in, and make this space yours. Start with a local file or a direct
            media link.
          </p>
          <button className="primary" onClick={onFiles}>
            <FolderOpen size={18} />
            Choose your media
            <ArrowRight size={17} />
          </button>
          <small>Or drag files anywhere into this window</small>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit orbit-three" />
          <div className="play-emblem">
            <img src="./zenplex.svg" alt="" />
          </div>
          <span className="art-caption">A MOMENT, UNINTERRUPTED.</span>
        </div>
      </section>
      <div className="quick-grid">
        <button className="quick-card" onClick={onFiles}>
          <span className="tile-icon">
            <FolderOpen />
          </span>
          <span>
            <strong>Open a local file</strong>
            <small>Video or audio, straight from your device</small>
          </span>
          <ChevronRight size={18} />
        </button>
        <button className="quick-card" onClick={onUrl}>
          <span className="tile-icon teal">
            <Link />
          </span>
          <span>
            <strong>Play from a link</strong>
            <small>A direct HTTPS media URL</small>
          </span>
          <ChevronRight size={18} />
        </button>
        <button className="quick-card" onClick={onSettings}>
          <span className="tile-icon">
            <Settings />
          </span>
          <span>
            <strong>Make it yours</strong>
            <small>Themes, fit, speed, and preferences</small>
          </span>
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="section-heading">
        <h2>Your session</h2>
        <button className="text-button" onClick={onQueue}>
          View queue <ArrowRight size={15} />
        </button>
      </div>
      {queueView}
      <div className="foundation-note">
        <Layers size={18} />
        <p>
          <strong>A foundation with real playback.</strong> This release uses browser media
          capabilities. Native Windows codecs, streaming playlists, and Subtitle Studio are planned
          phases.
        </p>
      </div>
    </>
  );
}
