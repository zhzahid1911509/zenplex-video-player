import type { DesktopBridge } from '../../../packages/native/protocol';
declare global {
  interface Window {
    zenplex?: DesktopBridge;
  }
}
