import { app, BrowserWindow, ipcMain } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const shouldOpenDevTools = process.env.DESKTOP_OPEN_DEVTOOLS === '1';
const preloadCandidates = [
  path.join(__dirname, 'preload.cjs'),
  path.resolve(__dirname, '../../src/main/preload.cjs'),
  path.join(__dirname, 'preload.js'),
];
const preloadPath = preloadCandidates.find((candidate) => fs.existsSync(candidate)) ?? preloadCandidates[0];
const backendBaseUrl = process.env.DESKTOP_BACKEND_BASE_URL ?? 'http://127.0.0.1:3000';
const allowedGovernanceMethods = new Set(['GET', 'POST']);
const isMacOS = process.platform === 'darwin';
let mainWindow: BrowserWindow | null = null;

type GovernanceBridgeRequest = {
  method: string;
  path: string;
  body?: unknown;
};

type GovernanceBridgeResponse = {
  ok: boolean;
  status: number;
  payload: unknown;
};

function focusAndCenterWindow(window: BrowserWindow) {
  if (window.isMinimized()) {
    window.restore();
  }
  app.focus({ steal: true });
  window.center();
  window.show();
  window.moveTop();
  window.focus();
  window.webContents.focus();
}

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 1080,
    minHeight: 720,
    center: true,
    show: false,
    backgroundColor: isMacOS ? '#00000000' : '#f3f5f8',
    transparent: isMacOS,
    autoHideMenuBar: true,
    ...(isMacOS
      ? {
          titleBarStyle: 'hidden' as const,
          trafficLightPosition: { x: 16, y: 15 },
          vibrancy: 'under-window' as const,
          visualEffectState: 'active' as const,
          title: '',
        }
      : {}),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    void window.loadURL(process.env.VITE_DEV_SERVER_URL);
    if (shouldOpenDevTools) {
      window.webContents.openDevTools({ mode: 'detach' });
    }
  } else {
    const rendererHtml = path.join(__dirname, '../renderer/index.html');
    void window.loadFile(rendererHtml);
  }

  window.once('closed', () => {
    if (mainWindow === window) {
      mainWindow = null;
    }
  });

  // Keep native title text hidden so the chrome is toolbar-only.
  window.on('page-title-updated', (event) => {
    event.preventDefault();
    window.setTitle('');
  });

  return window;
}

function normalizeGovernancePath(input: string): string {
  if (!input.startsWith('/paper-projects/')) {
    throw new Error('Unsupported governance path.');
  }

  return input;
}

ipcMain.handle('desktop:get-app-meta', () => ({
  appName: 'Morethan Research Desktop',
  appVersion: app.getVersion(),
  platform: process.platform,
}));

ipcMain.handle(
  'desktop:governance-request',
  async (_event, request: GovernanceBridgeRequest): Promise<GovernanceBridgeResponse> => {
    const method = String(request.method ?? '').toUpperCase();
    const targetPath = normalizeGovernancePath(request.path);

    if (!allowedGovernanceMethods.has(method)) {
      return {
        ok: false,
        status: 405,
        payload: {
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: `Unsupported method ${method}.`,
          },
        },
      };
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    const init: RequestInit = { method, headers };

    if (request.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(request.body);
    }

    try {
      const response = await fetch(new URL(targetPath, backendBaseUrl), init);
      const contentType = response.headers.get('content-type') ?? '';
      const payload = contentType.includes('application/json')
        ? await response.json()
        : { message: await response.text() };

      return {
        ok: response.ok,
        status: response.status,
        payload,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Desktop governance request failed.';
      return {
        ok: false,
        status: 500,
        payload: {
          error: {
            code: 'DESKTOP_PROXY_ERROR',
            message,
          },
        },
      };
    }
  },
);

app.whenReady().then(() => {
  mainWindow = createWindow();

  app.on('activate', () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      mainWindow = createWindow();
    }

    focusAndCenterWindow(mainWindow);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
