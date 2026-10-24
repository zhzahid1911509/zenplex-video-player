import { app, BrowserWindow, dialog, ipcMain, Menu, session } from 'electron';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { z } from 'zod';
import { FileGrants, validateSubtitle } from './native/files.js';
import { NativeService } from './native/service.js';
import { validateNativeUrl } from './native/network.js';
import {
  nativeCommandSchema,
  nativeOpenSchema,
  viewportSchema,
} from '../../packages/native/protocol.js';
const dirname = path.dirname(fileURLToPath(import.meta.url));
const rendererPath = path.join(dirname, '../../../dist/index.html');
let window: BrowserWindow | null = null;
let native: NativeService | null = null;
let openEpoch = 0;
const grants = new FileGrants();
const runtimeDirectory = app.isPackaged
  ? path.join(process.resourcesPath, 'native')
  : path.join(app.getAppPath(), 'native/player-host/out');
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
  native = new NativeService(window, runtimeDirectory);
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => event.preventDefault());
  window.webContents.on('will-attach-webview', (event) => event.preventDefault());
  window.webContents.setZoomFactor(1);
  // Visual zoom is disabled by default. Do not access a render frame before load.
  window.webContents.on('before-input-event', (event, input) => {
    if ((input.control || input.meta) && ['+', '=', '-', '0'].includes(input.key))
      event.preventDefault();
  });
  window.webContents.on('zoom-changed', () => window?.webContents.setZoomFactor(1));
  window.webContents.on('did-start-loading', () => {
    ++openEpoch;
    native?.dispose();
    grants.clear();
  });
  window.webContents.on('render-process-gone', () => {
    ++openEpoch;
    native?.dispose();
    grants.clear();
  });
  const reportFullscreen = () =>
    window?.webContents.send('zenplex:fullscreen', window.isFullScreen());
  window.on('enter-full-screen', reportFullscreen);
  window.on('leave-full-screen', reportFullscreen);
  const createdWindow = window;
  void createdWindow.loadFile(rendererPath).catch((error: unknown) => {
    if (createdWindow.isDestroyed()) return;
    console.error('ZenPlex renderer failed to load:', error);
    dialog.showErrorBox(
      'ZenPlex could not start',
      'The player interface could not load. Run npm run build and restart the application.',
    );
    createdWindow.destroy();
  });
  window.on('closed', () => {
    ++openEpoch;
    native?.dispose();
    native = null;
    grants.clear();
    window = null;
  });
}
app
  .whenReady()
  .then(() => {
    Menu.setApplicationMenu(null);
    session.defaultSession.setPermissionRequestHandler((_c, _p, callback) => callback(false));
    session.defaultSession.setPermissionCheckHandler(() => false);
    function handle(name: string, operation: (input: unknown) => unknown) {
      ipcMain.handle(name, (event, input: unknown) => {
        if (
          !window ||
          event.sender !== window.webContents ||
          event.senderFrame !== window.webContents.mainFrame ||
          event.senderFrame.url !== pathToFileURL(rendererPath).href
        )
          throw new Error('Unauthorized IPC sender');
        return operation(input);
      });
    }
    handle('zenplex:runtime', async () => {
      const nativeAvailable = (await native?.available()) ?? false;
      return {
        platform: process.platform,
        version: app.getVersion(),
        nativeAvailable,
        engine: nativeAvailable ? 'libmpv' : 'HTML media',
        reason: nativeAvailable
          ? 'Native runtime files found; decoder initializes when media opens.'
          : 'Native playback requires Windows x64, the helper, and mpv-2.dll. See docs/WINDOWS_NATIVE.md. Browser playback remains available.',
      };
    });
    handle('zenplex:pick-files', async () => {
      const result = await dialog.showOpenDialog(window!, {
        title: 'Open media in ZenPlex',
        properties: ['openFile', 'multiSelections'],
        filters: [
          {
            name: 'Media',
            extensions: [
              'mp4',
              'mkv',
              'webm',
              'mov',
              'avi',
              'wmv',
              'flv',
              'mpeg',
              'mpg',
              'ts',
              'm2ts',
              '3gp',
              'ogv',
              'vob',
              'm4v',
              'mp3',
              'wav',
              'ogg',
              'flac',
              'aac',
              'm4a',
              'opus',
            ],
          },
        ],
      });
      if (result.canceled) return [];
      const added = [];
      try {
        for (const file of result.filePaths.slice(0, 200)) added.push(await grants.grant(file));
        return added;
      } catch {
        added.forEach((item) => grants.release(item.token));
        throw new Error(
          'Files could not be opened. Choose existing local media files, with no more than 200 queue entries.',
        );
      }
    });
    handle('zenplex:release-file', (token) => grants.release(z.string().uuid().parse(token)));
    handle('zenplex:open', async (input) => {
      const request = nativeOpenSchema.parse(input);
      const epoch = ++openEpoch;
      await native?.command({ op: 'close' });
      const source =
        request.kind === 'file'
          ? grants.resolve(request.token)
          : await validateNativeUrl(request.url);
      if (epoch !== openEpoch) return;
      await native?.open(source, request.session);
    });
    handle('zenplex:command', (input) => {
      const command = nativeCommandSchema.parse(input);
      if (command.op === 'close') ++openEpoch;
      return native?.command(command);
    });
    handle('zenplex:viewport', (input) => native?.viewport(viewportSchema.parse(input)));
    handle('zenplex:subtitle', async () => {
      const result = await dialog.showOpenDialog(window!, {
        title: 'Load subtitle',
        properties: ['openFile'],
        filters: [{ name: 'Subtitles', extensions: ['srt', 'vtt', 'ass', 'ssa'] }],
      });
      if (result.canceled || !result.filePaths[0]) return false;
      await native?.subtitle(await validateSubtitle(result.filePaths[0]));
      return true;
    });
    handle('zenplex:fullscreen', (input) => {
      const value = z.boolean().parse(input);
      window?.setFullScreen(value);
    });
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  })
  .catch((error: unknown) => {
    console.error('ZenPlex startup failed:', error);
    dialog.showErrorBox(
      'ZenPlex could not start',
      'Window initialization failed. See the terminal output for details.',
    );
    app.quit();
  });
app.on('before-quit', () => {
  ++openEpoch;
  native?.dispose();
  grants.clear();
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
