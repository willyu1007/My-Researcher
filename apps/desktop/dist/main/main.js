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
let mainWindow = null;
function focusAndCenterWindow(window) {
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
function createWindow() {
    const window = new BrowserWindow({
        width: 1360,
        height: 880,
        minWidth: 1080,
        minHeight: 720,
        center: true,
        show: false,
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
        if (shouldOpenDevTools) {
            window.webContents.openDevTools({ mode: 'detach' });
        }
    }
    else {
        const rendererHtml = path.join(__dirname, '../renderer/index.html');
        void window.loadFile(rendererHtml);
    }
    window.once('closed', () => {
        if (mainWindow === window) {
            mainWindow = null;
        }
    });
    return window;
}
function normalizeGovernancePath(input) {
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
ipcMain.handle('desktop:governance-request', async (_event, request) => {
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
    const headers = {
        Accept: 'application/json',
    };
    const init = { method, headers };
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
    }
    catch (error) {
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
});
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
//# sourceMappingURL=main.js.map