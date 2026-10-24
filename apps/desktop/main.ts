import { app, BrowserWindow, ipcMain, session } from 'electron';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const dirname = path.dirname(fileURLToPath(import.meta.url));
const rendererPath = path.join(dirname, '../../../dist/index.html');
let window: BrowserWindow | null = null;
function createWindow() {
  window = new BrowserWindow({
    width: 1380,
    height: 900,
    minWidth: 760,
    minHeight: 560,
    title: 'ZenPlex',
    backgroundColor: '#10121c',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => event.preventDefault());
  window.webContents.on('will-attach-webview', (event) => event.preventDefault());
  void window.loadFile(rendererPath);
  window.on('closed', () => {
    window = null;
  });
}
app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) =>
    callback(false),
  );
  session.defaultSession.setPermissionCheckHandler(() => false);
  ipcMain.handle('zenplex:runtime', (event) => {
    if (
      !window ||
      event.sender !== window.webContents ||
      event.senderFrame !== window.webContents.mainFrame ||
      event.senderFrame.url !== pathToFileURL(rendererPath).href
    )
      throw new Error('Unauthorized IPC sender');
    return {
      platform: process.platform,
      version: app.getVersion(),
      engine: 'html-media',
      nativePlayback: false,
    };
  });
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
