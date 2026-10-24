import { contextBridge, ipcRenderer } from 'electron';
// Each method has one fixed channel. Never expose ipcRenderer, arbitrary commands or file paths.
contextBridge.exposeInMainWorld(
  'zenplex',
  Object.freeze({
    runtime: () => ipcRenderer.invoke('zenplex:runtime'),
    pickFiles: () => ipcRenderer.invoke('zenplex:pick-files'),
    releaseFile: (token: string) => ipcRenderer.invoke('zenplex:release-file', token),
    open: (input: unknown) => ipcRenderer.invoke('zenplex:open', input),
    command: (input: unknown) => ipcRenderer.invoke('zenplex:command', input),
    viewport: (input: unknown) => ipcRenderer.invoke('zenplex:viewport', input),
    pickSubtitle: () => ipcRenderer.invoke('zenplex:subtitle'),
    fullscreen: (value: boolean) => ipcRenderer.invoke('zenplex:fullscreen', value),
    onNativeEvent: (callback: (value: unknown) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, value: unknown) => callback(value);
      ipcRenderer.on('zenplex:native-event', listener);
      return () => ipcRenderer.removeListener('zenplex:native-event', listener);
    },
    onFullscreen: (callback: (value: boolean) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, value: boolean) => callback(value);
      ipcRenderer.on('zenplex:fullscreen', listener);
      return () => ipcRenderer.removeListener('zenplex:fullscreen', listener);
    },
  }),
);
