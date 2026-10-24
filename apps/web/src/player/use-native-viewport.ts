import { useEffect, type RefObject } from 'react';
import { NativePlaybackAdapter } from './native-adapter';
import type { PlaybackAdapter } from '../../../../packages/core/media';
/** A native child paints above the DOM: hide it for dialogs/other pages and offscreen rectangles. */
export function useNativeViewport(
  adapter: PlaybackAdapter | null,
  target: RefObject<HTMLDivElement | null>,
  visible: boolean,
) {
  useEffect(() => {
    if (!(adapter instanceof NativePlaybackAdapter) || !target.current) return;
    const element = target.current;
    let frame = 0,
      busy = false,
      dirty = false,
      disposed = false;
    const apply = async () => {
      if (disposed) return;
      if (busy) {
        dirty = true;
        return;
      }
      busy = true;
      const box = element.getBoundingClientRect();
      const inView =
        box.top >= 0 && box.left >= 0 && box.bottom <= innerHeight && box.right <= innerWidth;
      await adapter.viewport({
        x: Math.max(0, box.left),
        y: Math.max(0, box.top),
        width: Math.max(0, box.width),
        height: Math.max(0, box.height),
        visible: visible && inView && document.visibilityState === 'visible',
      });
      busy = false;
      if (dirty) {
        dirty = false;
        schedule();
      }
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => void apply());
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    document.addEventListener('visibilitychange', schedule);
    schedule();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      document.removeEventListener('visibilitychange', schedule);
      void adapter.viewport({ x: 0, y: 0, width: 0, height: 0, visible: false });
    };
  }, [adapter, target, visible]);
}
