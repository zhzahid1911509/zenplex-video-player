import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld(
  'zenplex',
  Object.freeze({ runtime: () => ipcRenderer.invoke('zenplex:runtime') }),
);
