import { contextBridge, ipcRenderer } from 'electron';
const desktopApi = {
    getAppMeta: () => ipcRenderer.invoke('desktop:get-app-meta'),
};
contextBridge.exposeInMainWorld('desktopApi', desktopApi);
//# sourceMappingURL=preload.js.map