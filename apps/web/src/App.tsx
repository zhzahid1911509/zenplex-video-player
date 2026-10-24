import { AboutPage } from './components/AboutPage';
import { DiagnosticsPage } from './components/DiagnosticsPage';
import { HomePage } from './components/HomePage';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  ChevronRight,
  CircleHelp,
  Film,
  FolderOpen,
  Home,
  Link,
  ListVideo,
  MonitorPlay,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import {
  initialPlayback,
  type MediaSource,
  type PlaybackState,
  type PlaybackAdapter,
} from '../../../packages/core/media';
import { NativePlaybackAdapter } from './player/native-adapter';
import { useNativeViewport } from './player/use-native-viewport';
import { NativeControls } from './components/NativeControls';
import { HtmlMediaAdapter } from './player/html-adapter';
import { useSettings } from './state/settings';
import { QueuePanel } from './components/QueuePanel';
import { Transport } from './components/Transport';
import { UrlDialog } from './components/UrlDialog';
const SettingsPanel = lazy(() =>
  import('./components/SettingsPanel').then((module) => ({ default: module.SettingsPanel })),
);
type Page = 'home' | 'player' | 'queue' | 'settings' | 'diagnostics' | 'about';
const navigation = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'player', label: 'Player', icon: MonitorPlay },
  { id: 'queue', label: 'Play queue', icon: ListVideo },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'diagnostics', label: 'Diagnostics', icon: Activity },
  { id: 'about', label: 'About', icon: CircleHelp },
] as const;
export function App() {
  const [page, setPage] = useState<Page>('home');
  const [queue, setQueue] = useState<MediaSource[]>([]);
  const [active, setActive] = useState<MediaSource | null>(null);
  const [state, setState] = useState<PlaybackState>({ ...initialPlayback });
  const [adapter, setAdapter] = useState<PlaybackAdapter | null>(null);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const [nativeDialog, setNativeDialog] = useState(false);
  const [runtimeNotice, setRuntimeNotice] = useState('');
  const viewport = useRef<HTMLDivElement>(null);
  const shortcutHandler = useRef<(key: string) => void>(() => {});
  const [urlOpen, setUrlOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const video = useRef<HTMLVideoElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const objectUrls = useRef(new Set<string>());
  const { settings, update, warning } = useSettings();
  useEffect(() => {
    let disposed = false;
    let engine: PlaybackAdapter | undefined;
    let unsubscribe: (() => void) | undefined;
    const urls = objectUrls.current;
    async function initialize() {
      if (!video.current) return;
      if (window.zenplex) {
        try {
          const runtime = await window.zenplex.runtime();
          if (disposed) return;
          if (runtime.nativeAvailable)
            engine = new NativePlaybackAdapter(window.zenplex, (key) =>
              shortcutHandler.current(key),
            );
          else setRuntimeNotice(runtime.reason);
        } catch {
          if (!disposed)
            setRuntimeNotice('Desktop bridge unavailable. Browser playback is active.');
        }
      }
      if (disposed || !video.current) return;
      engine ??= new HtmlMediaAdapter(video.current);
      unsubscribe = engine.subscribe(setState);
      setAdapter(engine);
    }
    void initialize();
    return () => {
      disposed = true;
      unsubscribe?.();
      engine?.dispose();
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);
  useNativeViewport(
    adapter,
    viewport,
    page === 'player' && !!active && !urlOpen && !nativeDialog && state.status !== 'error',
  );
  useEffect(() => window.zenplex?.onFullscreen(setNativeFullscreen), []);
  useEffect(() => {
    if (adapter instanceof NativePlaybackAdapter)
      void adapter.command({ op: 'fit', value: settings.fit });
  }, [adapter, settings.fit]);
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: light)');
    const apply = () => {
      document.documentElement.dataset.theme =
        settings.theme === 'system' ? (query.matches ? 'light' : 'dark') : settings.theme;
    };
    apply();
    query.addEventListener('change', apply);
    document.documentElement.dataset.accent = settings.accent;
    document.documentElement.dataset.density = settings.density;
    document.documentElement.dataset.motion = settings.reducedMotion ? 'reduced' : 'normal';
    return () => query.removeEventListener('change', apply);
  }, [settings.theme, settings.accent, settings.density, settings.reducedMotion]);
  useEffect(() => {
    adapter?.setVolume(settings.volume);
  }, [adapter, settings.volume]);
  useEffect(() => {
    adapter?.setPlaybackRate(settings.playbackRate);
  }, [adapter, settings.playbackRate]);
  useEffect(() => {
    if (adapter && active) {
      adapter.openMedia(active);
      void adapter.play();
    } else adapter?.closeMedia();
  }, [adapter, active]);
  const toggle = useCallback(() => {
    if (!adapter || !active) return;
    if (adapter.getPlaybackState().status === 'playing') adapter.pause();
    else void adapter.play();
  }, [adapter, active]);
  const fullscreen = useCallback(async () => {
    try {
      if (adapter instanceof NativePlaybackAdapter && window.zenplex) {
        await window.zenplex.fullscreen(!nativeFullscreen);
        return;
      }
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (stage.current?.requestFullscreen) await stage.current.requestFullscreen();
      else setNotice('Fullscreen is unavailable in this browser.');
    } catch {
      setNotice('Fullscreen was blocked. Try the fullscreen button after selecting media.');
    }
  }, [adapter, nativeFullscreen]);
  useEffect(() => {
    shortcutHandler.current = (key) => {
      if (key === 'fullscreen') void fullscreen();
      else if (key === 'escape' && nativeFullscreen) void window.zenplex?.fullscreen(false);
      else if (key === 'toggle') toggle();
      else if (key === 'back') adapter?.seek(adapter.getPlaybackState().position - 5);
      else if (key === 'forward') adapter?.seek(adapter.getPlaybackState().position + 5);
      else if (key === 'mute') adapter?.setMuted(!adapter.getPlaybackState().muted);
    };
  }, [adapter, fullscreen, toggle, nativeFullscreen]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === 'Escape' && nativeFullscreen && !urlOpen) {
        event.preventDefault();
        void window.zenplex?.fullscreen(false);
        return;
      }
      const target = event.target as HTMLElement;
      if (
        urlOpen ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        target.closest('input, textarea, select, button, [contenteditable="true"], dialog')
      )
        return;
      if (event.code === 'KeyO') {
        event.preventDefault();
        if (adapter instanceof NativePlaybackAdapter)
          document.getElementById('open-files')?.click();
        else fileInput.current?.click();
        return;
      }
      if (page !== 'player' || !active || !adapter) return;
      const current = adapter.getPlaybackState();
      switch (event.code) {
        case 'Escape':
          if (nativeFullscreen) void window.zenplex?.fullscreen(false);
          break;
        case 'Space':
          event.preventDefault();
          toggle();
          break;
        case 'ArrowRight':
          event.preventDefault();
          adapter.seek(current.position + 5);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          adapter.seek(current.position - 5);
          break;
        case 'ArrowUp':
          event.preventDefault();
          update({ volume: Math.min(1, current.volume + 0.05) });
          break;
        case 'ArrowDown':
          event.preventDefault();
          update({ volume: Math.max(0, current.volume - 0.05) });
          break;
        case 'KeyM':
          event.preventDefault();
          adapter.setMuted(!current.muted);
          break;
        case 'KeyF':
          event.preventDefault();
          void fullscreen();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [page, active, adapter, toggle, fullscreen, update, urlOpen, nativeFullscreen]);
  const select = (item: MediaSource) => {
    setActive(item);
    setPage('player');
    setNotice('');
  };
  async function chooseFiles() {
    if (!(adapter instanceof NativePlaybackAdapter) || !window.zenplex) {
      fileInput.current?.click();
      return;
    }
    setNativeDialog(true);
    try {
      const files = await window.zenplex.pickFiles();
      const remaining = Math.max(0, 200 - queue.length);
      const added = files.slice(0, remaining).map((file) => ({
        id: crypto.randomUUID(),
        title: file.title,
        url: '',
        kind: 'file' as const,
        nativeToken: file.token,
      }));
      for (const file of files.slice(remaining)) await window.zenplex.releaseFile(file.token);
      if (added.length) {
        setQueue((current) => [...current, ...added]);
        select(added[0]!);
      }
    } catch {
      setNotice(
        'Could not open native files. Choose local media files and check the 200-item queue limit.',
      );
    } finally {
      setNativeDialog(false);
    }
  }
  function openFiles(files: FileList | File[]) {
    if (adapter instanceof NativePlaybackAdapter) {
      setNotice(
        'Use Open files for native playback so ZenPlex can grant access through the Windows file picker.',
      );
      return;
    }
    const candidates = Array.from(files);
    const remaining = Math.max(0, 200 - queue.length);
    const added: MediaSource[] = [];
    let rejected = 0;
    for (const file of candidates.slice(0, remaining)) {
      if (
        /\.(m3u8?|mpd|srt|vtt|ass|ssa)$/i.test(file.name) ||
        !(
          file.type.startsWith('video/') ||
          file.type.startsWith('audio/') ||
          /\.(mp4|m4v|webm|mov|mkv|avi|mp3|wav|ogg|flac)$/i.test(file.name)
        )
      ) {
        rejected++;
        continue;
      }
      const url = URL.createObjectURL(file);
      objectUrls.current.add(url);
      added.push({ id: crypto.randomUUID(), title: file.name, url, kind: 'file' });
    }
    if (added.length) {
      setQueue((current) => [...current, ...added]);
      select(added[0]!);
    }
    if (rejected || candidates.length > remaining)
      setNotice(
        'Some files were skipped. This build accepts up to 200 media files per session; playlist and subtitle imports are not yet enabled.',
      );
  }
  function remove(id: string) {
    const item = queue.find((entry) => entry.id === id);
    if (!item) return;
    if (active?.id === id) {
      adapter?.closeMedia();
      setActive(null);
    }
    if (item.nativeToken)
      void window.zenplex
        ?.releaseFile(item.nativeToken)
        .catch(() =>
          setNotice('File access could not be released. Restart ZenPlex to clear grants.'),
        );
    if (item.kind === 'file' && !item.nativeToken) {
      URL.revokeObjectURL(item.url);
      objectUrls.current.delete(item.url);
    }
    setQueue((current) => current.filter((entry) => entry.id !== id));
  }
  function move(index: number) {
    setQueue((current) => {
      const copy = [...current];
      if (index > 0 && copy[index] && copy[index - 1])
        [copy[index - 1], copy[index]] = [copy[index]!, copy[index - 1]!];
      return copy;
    });
  }
  const activeIndex = queue.findIndex((item) => item.id === active?.id);
  const queueView = (
    <QueuePanel
      items={queue.filter((item) => item.title.toLowerCase().includes(search.toLowerCase()))}
      activeId={active?.id}
      onPlay={select}
      onRemove={remove}
      onMove={(index) => {
        const filtered = queue.filter((item) =>
          item.title.toLowerCase().includes(search.toLowerCase()),
        );
        const item = filtered[index];
        if (item) move(queue.indexOf(item));
      }}
    />
  );
  return (
    <div
      className={`app ${nativeFullscreen ? 'native-fullscreen' : ''}`}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes('Files')) event.preventDefault();
      }}
      onDrop={(event) => {
        event.preventDefault();
        if (event.dataTransfer.files.length) openFiles(event.dataTransfer.files);
      }}
    >
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <a
          href="#home"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            setPage('home');
          }}
          aria-label="ZenPlex home"
        >
          <img src="./zenplex.svg" alt="" />
          <span>
            ZenPlex<span className="brand-dot">.</span>
          </span>
        </a>
        <span className="sidebar-label">YOUR WATCHING SPACE</span>
        <nav aria-label="Main navigation">
          {navigation.map((item) => (
            <button
              key={item.id}
              aria-label={item.label}
              aria-current={page === item.id ? 'page' : undefined}
              onClick={() => setPage(item.id)}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
              {item.id === 'queue' && <span className="count">{queue.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-note">
            <ShieldCheck size={20} />
            <div>
              <strong>Local by default</strong>
              <p>Your files stay on your device.</p>
            </div>
          </div>
          <span className="version">v0.3.0 · Native preview</span>
        </div>
      </aside>
      <div className="content">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace
            <ChevronRight size={15} />
            <strong>{navigation.find((item) => item.id === page)?.label}</strong>
          </div>
          <div className="actions">
            <button onClick={() => setUrlOpen(true)}>
              <Link size={16} />
              <span>Open URL</span>
            </button>
            <button id="open-files" className="primary" onClick={() => void chooseFiles()}>
              <FolderOpen size={17} />
              <span>Open files</span>
            </button>
          </div>
        </header>
        <input
          ref={fileInput}
          type="file"
          hidden
          multiple
          accept="video/*,audio/*,.mkv,.avi,.flac"
          onChange={(event) => {
            if (event.target.files) openFiles(event.target.files);
            event.target.value = '';
          }}
        />
        <main id="main" tabIndex={-1}>
          {runtimeNotice && (
            <p className="notice" role="status">
              {runtimeNotice}
            </p>
          )}
          {(warning || notice) && (
            <div className="notice" role="status">
              {warning || notice}
              {notice && !warning && <button onClick={() => setNotice('')}>Dismiss</button>}
            </div>
          )}
          {page === 'home' && (
            <HomePage
              onFiles={() => void chooseFiles()}
              onUrl={() => setUrlOpen(true)}
              onSettings={() => setPage('settings')}
              onQueue={() => setPage('queue')}
              queueView={queueView}
            />
          )}
          <section hidden={page !== 'player'} aria-label="Player workspace">
            <div className="page-heading">
              <div>
                <span className="eyebrow">NOW PLAYING</span>
                <h1>{active?.title ?? 'Ready when you are.'}</h1>
                <p className="muted">
                  {active
                    ? `${active.kind === 'file' ? 'Local media' : 'HTTPS source'} · ${adapter?.capabilities.engine ?? 'Initializing'} engine`
                    : 'Open a file to begin. Playback reflects actual media events.'}
                </p>
              </div>
              <span className="badge">{state.status.toUpperCase()}</span>
            </div>
            <div className="player-frame" ref={stage}>
              <div
                className="video-stage"
                ref={viewport}
                onDoubleClick={() => {
                  if (active) void fullscreen();
                }}
              >
                <video
                  ref={video}
                  hidden={adapter instanceof NativePlaybackAdapter}
                  playsInline
                  style={{ objectFit: settings.fit }}
                  aria-label="Media playback"
                />
                {!active && (
                  <div className="video-empty">
                    <img src="./zenplex.svg" alt="" />
                    <h2>Space for your next story.</h2>
                    <button onClick={() => void chooseFiles()}>
                      <FolderOpen size={18} />
                      Open media
                    </button>
                  </div>
                )}
                {state.status === 'error' && (
                  <div className="playback-error" role="alert">
                    <h3>We couldn’t play this media.</h3>
                    <p>{state.error}</p>
                    <button
                      onClick={() => {
                        if (active) {
                          adapter?.openMedia(active);
                          void adapter?.play();
                        }
                      }}
                    >
                      Retry playback
                    </button>
                  </div>
                )}
              </div>
              <Transport
                state={state}
                enabled={!!active}
                onToggle={toggle}
                onStop={() => adapter?.stop()}
                onSeek={(value) => adapter?.seek(value)}
                onVolume={(value) => {
                  adapter?.setMuted(false);
                  adapter?.setVolume(value);
                  update({ volume: value });
                }}
                onMute={() => adapter?.setMuted(!state.muted)}
                onRate={(value) => {
                  adapter?.setPlaybackRate(value);
                  update({ playbackRate: value });
                }}
                onFullscreen={() => void fullscreen()}
                hasPrevious={activeIndex > 0}
                hasNext={activeIndex >= 0 && activeIndex < queue.length - 1}
                onPrevious={() => {
                  const item = queue[activeIndex - 1];
                  if (item) select(item);
                }}
                onNext={() => {
                  const item = queue[activeIndex + 1];
                  if (item) select(item);
                }}
              />
            </div>
            {adapter instanceof NativePlaybackAdapter && active && (
              <NativeControls engine={adapter} state={state} onDialog={setNativeDialog} />
            )}
            <p className="shortcuts">
              <kbd>Space</kbd> Play / pause <kbd>← →</kbd> Seek 5s <kbd>M</kbd> Mute <kbd>F</kbd>{' '}
              Fullscreen <kbd>O</kbd> Open
            </p>
            <div className="section-heading">
              <h2>Up next</h2>
              <span className="muted">Manual queue · {queue.length} items</span>
            </div>
            {queueView}
          </section>
          {page === 'queue' && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">ONE THING AFTER ANOTHER</span>
                  <h1>Your play queue</h1>
                  <p className="muted">
                    Reorder, play, or remove items. Removing an item never deletes the original
                    file.
                  </p>
                </div>
              </div>
              <label className="search-label">
                Search queue
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Find a file in this session…"
                />
              </label>
              {queueView}
              <p className="muted small">
                The queue is session-only. Refreshing or closing ZenPlex releases local file access
                and clears URLs.
              </p>
            </>
          )}
          {page === 'settings' && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">A SPACE THAT FITS YOU</span>
                  <h1>Settings</h1>
                  <p className="muted">
                    Preferences apply immediately and are saved on this device.
                  </p>
                </div>
              </div>
              <Suspense fallback={<p>Loading settings…</p>}>
                <SettingsPanel />
              </Suspense>
            </>
          )}
          {page === 'diagnostics' && (
            <DiagnosticsPage
              state={state}
              engine={adapter?.capabilities.engine ?? 'Initializing'}
            />
          )}
          {page === 'about' && <AboutPage />}
        </main>
        <footer>
          <span>
            <Film size={14} />
            ZenPlex · A quieter way to watch
          </span>
          <span>Local files never leave your device</span>
        </footer>
      </div>
      {urlOpen && (
        <UrlDialog
          onClose={() => setUrlOpen(false)}
          onOpen={(url, title) => {
            if (queue.length >= 200) {
              setNotice('The queue is full. Remove an item before adding another.');
              return;
            }
            const item: MediaSource = { id: crypto.randomUUID(), url, title, kind: 'url' };
            setQueue((current) => [...current, item]);
            select(item);
          }}
        />
      )}
    </div>
  );
}
