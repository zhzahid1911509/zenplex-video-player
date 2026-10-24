import { Play, X, ArrowUp, Film } from 'lucide-react';
import type { MediaSource } from '../../../../packages/core/media';
export function QueuePanel({
  items,
  activeId,
  onPlay,
  onRemove,
  onMove,
}: {
  items: MediaSource[];
  activeId?: string;
  onPlay: (item: MediaSource) => void;
  onRemove: (id: string) => void;
  onMove: (index: number) => void;
}) {
  return (
    <div className="queue-list">
      {items.length === 0 ? (
        <div className="empty-small">
          <Film size={28} />
          <h3>A little room for your next watch.</h3>
          <p>Open files or add a direct URL to build your session queue.</p>
        </div>
      ) : (
        items.map((item, index) => (
          <div key={item.id} className={`queue-item ${activeId === item.id ? 'active' : ''}`}>
            <button
              className="queue-play"
              onClick={() => onPlay(item)}
              aria-label={`Play ${item.title}`}
            >
              <span className="queue-number">
                {activeId === item.id ? <Play size={16} /> : String(index + 1).padStart(2, '0')}
              </span>
              <span>
                <strong>{item.title}</strong>
                <small>
                  {item.kind === 'file' ? 'Local file' : 'HTTPS media'}
                  {activeId === item.id ? ' · Selected' : ''}
                </small>
              </span>
            </button>
            <button
              className="icon"
              disabled={index === 0}
              onClick={() => onMove(index)}
              aria-label={`Move ${item.title} up`}
            >
              <ArrowUp size={16} />
            </button>
            <button
              className="icon"
              onClick={() => onRemove(item.id)}
              aria-label={`Remove ${item.title}`}
            >
              <X size={16} />
            </button>
          </div>
        ))
      )}
    </div>
  );
}
