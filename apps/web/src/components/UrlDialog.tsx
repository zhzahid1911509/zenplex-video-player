import { useEffect, useRef, useState } from 'react';
import { classifyUrl } from '../../../../packages/streaming/playlist';
import { X, Link } from 'lucide-react';
import { validateMediaUrl } from '../../../../packages/core/media';
export function UrlDialog({
  onClose,
  onOpen,
}: {
  onClose: () => void;
  onOpen: (url: string, title: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="url-title"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            const media = validateMediaUrl(value);
            if (classifyUrl(media.url) === 'playlist')
              throw new Error('Use Import channels in the Play queue to open an M3U channel list.');
            onOpen(media.url, media.title);
            onClose();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Invalid URL.');
          }
        }}
      >
        <div className="row between">
          <span className="badge">
            <Link size={14} />
            NETWORK MEDIA
          </span>
          <button type="button" className="icon" onClick={onClose} aria-label="Close URL dialog">
            <X size={20} />
          </button>
        </div>
        <h2 id="url-title">Open network media</h2>
        <p className="muted">
          Use public HTTPS media, HLS (.m3u8), or DASH (.mpd). Website pages and protected service
          links are not direct media.
        </p>
        <label>
          Media URL
          <input
            autoFocus
            type="url"
            required
            value={value}
            placeholder="https://example.com/video.mp4"
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
        <p className="muted small">
          Signed URLs stay in memory for this session. Server access and codec support are checked
          by actual playback. No proxy is used.
        </p>
        {error && (
          <p role="alert" className="error-text">
            {error}
          </p>
        )}
        <button className="primary" type="submit">
          Open media
        </button>
      </form>
    </dialog>
  );
}
