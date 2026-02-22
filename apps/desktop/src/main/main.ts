import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const preloadPath = path.join(__dirname, 'preload.js');

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: '#f3f5f8',
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    void window.loadURL(process.env.VITE_DEV_SERVER_URL);
    window.webContents.openDevTools({ mode: 'detach' });
  } else {
    const rendererHtml = path.join(__dirname, '../renderer/index.html');
    void window.loadFile(rendererHtml);
  }

  return window;
}

ipcMain.handle('desktop:get-app-meta', () => ({
  appName: 'Morethan Research Desktop',
  appVersion: app.getVersion(),
  platform: process.platform,
}));

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
